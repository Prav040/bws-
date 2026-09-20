// src/services/workoutStore.ts
// Persistenz + Logik für Workouts, Übungen und Sätze (LocalStorage, pro Nutzer).

import type { Workout, Exercise, WorkoutSet, WorkoutSnapshot, SetType } from '../types';
import type { ExerciseHistoryEntry, MuscleGroup, ProfileStats, MuscleGroupStat } from '../types';

export interface WorkoutState {
  workouts: Workout[];
  history: WorkoutSnapshot[];
  exerciseHistory: ExerciseHistoryEntry[];
}

/** Statisches Mapping Übungsname → primäre Muskelgruppe (eingebaute Übungen). */
const MUSCLE_GROUP_BY_NAME: Record<string, MuscleGroup> = {
  'Bankdrücken': 'chest',
  'Schrägbankdrücken': 'chest',
  'Schulterdrücken': 'shoulders',
  'Seitheben': 'shoulders',
  'Face Pulls': 'shoulders',
  'Trizepsdrücken (Seil)': 'triceps',
  'Trizeps Overhead Ext.': 'triceps',
  'Kreuzheben': 'back',
  'Klimmzüge / Latzug': 'back',
  'Langhantel-Rudern': 'back',
  'Kabel-Rudern': 'back',
  'Bizeps-Curls': 'biceps',
  'Kniebeugen': 'quads',
  'Beinpresse': 'quads',
  'Rumänisches Kreuzheben': 'hamstrings',
  'Beinbeuger': 'hamstrings',
  'Wadenheben': 'calves',
};

function ex(
  id: string,
  name: string,
  targetReps: number,
  restSec: number,
): Exercise {
  return {
    id,
    name,
    targetReps,
    restSec,
    notes: '',
    image: null,
    muscleGroup: MUSCLE_GROUP_BY_NAME[name] ?? null,
    sets: [],
  };
}

const DEFAULT_WORKOUTS: Workout[] = [
  {
    id: 'default-push',
    name: 'Push-Tag',
    exercises: [
      ex('push-1', 'Bankdrücken', 8, 180),
      ex('push-2', 'Schrägbankdrücken', 8, 150),
      ex('push-3', 'Schulterdrücken', 10, 120),
      ex('push-4', 'Seitheben', 12, 60),
      ex('push-5', 'Trizepsdrücken (Seil)', 12, 60),
      ex('push-6', 'Trizeps Overhead Ext.', 12, 60),
    ],
  },
  {
    id: 'default-pull',
    name: 'Pull-Tag',
    exercises: [
      ex('pull-1', 'Kreuzheben', 5, 240),
      ex('pull-2', 'Klimmzüge / Latzug', 8, 150),
      ex('pull-3', 'Langhantel-Rudern', 8, 120),
      ex('pull-4', 'Kabel-Rudern', 10, 90),
      ex('pull-5', 'Face Pulls', 15, 60),
      ex('pull-6', 'Bizeps-Curls', 12, 60),
    ],
  },
  {
    id: 'default-legs',
    name: 'Beine',
    exercises: [
      ex('legs-1', 'Kniebeugen', 6, 240),
      ex('legs-2', 'Rumänisches Kreuzheben', 8, 150),
      ex('legs-3', 'Beinpresse', 10, 120),
      ex('legs-4', 'Beinbeuger', 12, 90),
      ex('legs-5', 'Wadenheben', 15, 60),
    ],
  },
  {
    id: 'default-upper',
    name: 'Oberkörper',
    exercises: [
      ex('upper-1', 'Bankdrücken', 8, 180),
      ex('upper-2', 'Langhantel-Rudern', 8, 120),
      ex('upper-3', 'Schulterdrücken', 10, 120),
      ex('upper-4', 'Klimmzüge / Latzug', 8, 150),
      ex('upper-5', 'Bizeps-Curls', 12, 60),
      ex('upper-6', 'Trizepsdrücken (Seil)', 12, 60),
    ],
  },
  {
    id: 'default-core',
    name: 'Core & Cardio',
    exercises: [
      ex('core-1', 'Plank', 0, 60),
      ex('core-2', 'Russian Twists', 20, 30),
      ex('core-3', 'Hanging Leg Raises', 12, 45),
      ex('core-4', 'Laufen', 0, 60),
    ],
  },
];

const DEFAULT_HISTORY: WorkoutSnapshot[] = [
  {
    id: 'snapshot-1',
    workoutId: 'default-pull',
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    exercises: [
      { id: 'pull-1', name: 'Kreuzheben', sets: [{ reps: 5, weight: 120, type: 'normal' }, { reps: 5, weight: 140, type: 'normal' }] },
      { id: 'pull-2', name: 'Klimmzüge / Latzug', sets: [{ reps: 8, weight: 80, type: 'normal' }] },
    ],
  },
  {
    id: 'snapshot-2',
    workoutId: 'default-push',
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    exercises: [
      { id: 'push-1', name: 'Bankdrücken', sets: [{ reps: 8, weight: 100, type: 'normal' }, { reps: 8, weight: 110, type: 'normal' }] },
      { id: 'push-3', name: 'Schulterdrücken', sets: [{ reps: 10, weight: 60, type: 'normal' }] },
    ],
  },
];

const DEFAULT_EXERCISE_HISTORY: ExerciseHistoryEntry[] = [
  {
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    exerciseId: 'pull-1',
    exerciseName: 'Kreuzheben',
    reps: 5,
    weight: 140,
    muscleGroup: 'back',
  },
  {
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    exerciseId: 'pull-2',
    exerciseName: 'Klimmzüge / Latzug',
    reps: 8,
    weight: 80,
    muscleGroup: 'back',
  },
  {
    date: new Date(Date.now() - 86400000).toISOString(),
    exerciseId: 'push-1',
    exerciseName: 'Bankdrücken',
    reps: 8,
    weight: 110,
    muscleGroup: 'chest',
  },
  {
    date: new Date(Date.now() - 86400000).toISOString(),
    exerciseId: 'push-3',
    exerciseName: 'Schulterdrücken',
    reps: 10,
    weight: 60,
    muscleGroup: 'shoulders',
  },
];

export class WorkoutStore {
  private key: string;
  private state: WorkoutState;

  constructor(userId: string) {
    this.key = `bwsplus:workouts:${userId}`;
    this.state = this.load();
  }

  private load(): WorkoutState {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return this.normalize(JSON.parse(raw) as WorkoutState);
    } catch {
      /* ignore – fallback auf Defaults */
    }
    return { workouts: structuredClone(DEFAULT_WORKOUTS), history: DEFAULT_HISTORY, exerciseHistory: DEFAULT_EXERCISE_HISTORY };
  }

  /** Stellt sicher, dass ältere Daten vollständig sind (Satz-Typ, Muskelgruppe, Historie). */
  private normalize(state: WorkoutState): WorkoutState {
    if (!state.workouts) state.workouts = structuredClone(DEFAULT_WORKOUTS);
    if (!state.history) state.history = [];
    if (!state.exerciseHistory) state.exerciseHistory = [];
    state.workouts.forEach((w) =>
      w.exercises.forEach((e) => {
        if (!e.sets) e.sets = [];
        if (e.muscleGroup === undefined) {
          e.muscleGroup = MUSCLE_GROUP_BY_NAME[e.name] ?? null;
        }
        e.sets.forEach((s) => {
          if (!s.type) s.type = 'normal';
        });
      }),
    );
    // Muskelgruppe in bestehenden Historie-Einträgen nachziehen.
    state.exerciseHistory.forEach((h) => {
      if (h.muscleGroup === undefined) {
        h.muscleGroup = MUSCLE_GROUP_BY_NAME[h.exerciseName] ?? null;
      }
    });
    return state;
  }

  private save(): void {
    localStorage.setItem(this.key, JSON.stringify(this.state));
  }

  /* ---------- Lesen ---------- */

  getWorkouts(): Workout[] {
    return this.state.workouts;
  }

  getWorkout(id: string): Workout | null {
    return this.state.workouts.find((w) => w.id === id) ?? null;
  }

  getHistory(): WorkoutSnapshot[] {
    return this.state.history;
  }

  getExerciseHistory(exerciseId?: string): ExerciseHistoryEntry[] {
    if (!exerciseId) return this.state.exerciseHistory;
    return this.state.exerciseHistory.filter((e) => e.exerciseId === exerciseId);
  }

  getProfileStats(): ProfileStats {
    const totalWorkouts = this.state.history.length;
    const historyDates = this.state.history.map((h) => new Date(h.completedAt).toISOString().slice(0, 10));
    const uniqueDates = [...new Set(historyDates)];

    let currentStreak = 0;
    const today = new Date().toISOString().slice(0, 10);
    if (uniqueDates.includes(today)) {
      currentStreak = 1;
      for (let i = 1; i <= 30; i++) {
        const date = new Date(Date.now() - 86400000 * i).toISOString().slice(0, 10);
        if (uniqueDates.includes(date)) currentStreak++;
        else break;
      }
    }

    const totalVolume = this.state.exerciseHistory.reduce((sum, e) => sum + (e.reps * e.weight), 0);
    return { totalWorkouts, currentStreak, totalVolume };
  }

  getMuscleVolume(from?: string, to?: string, muscleGroup?: MuscleGroup | null): MuscleGroupStat[] {
    const stats: Record<string, { volume: number; sets: number; sessions: Set<string> }> = {};

    this.state.exerciseHistory.forEach((e) => {
      if (e.muscleGroup === null) return;
      if (muscleGroup && e.muscleGroup !== muscleGroup) return;

      const date = e.date.slice(0, 10);
      if (from && date < from) return;
      if (to && date > to) return;

      const key = e.muscleGroup;
      if (!stats[key]) stats[key] = { volume: 0, sets: 0, sessions: new Set() };

      stats[key].volume += e.reps * e.weight;
      stats[key].sets += 1;
      stats[key].sessions.add(e.date.slice(0, 10));
    });

    return Object.entries(stats).map(([group, { volume, sets, sessions }]) => ({
      muscleGroup: group as MuscleGroup,
      volume,
      sets,
      sessions: sessions.size,
    }));
  }

  /* ---------- Mutieren ---------- */

  saveWorkout(workout: Workout): void {
    const existing = this.state.workouts.findIndex((w) => w.id === workout.id);
    if (existing >= 0) this.state.workouts[existing] = workout;
    else this.state.workouts.push(workout);
    this.save();
  }

  deleteWorkout(id: string): void {
    this.state.workouts = this.state.workouts.filter((w) => w.id !== id);
    this.save();
  }

  completeWorkout(workoutId: string, exercises: Array<{ id: string; name: string; sets: WorkoutSet[] }>): void {
    const workout = this.state.workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    // Einträge in der Historie speichern.
    const snapshot: WorkoutSnapshot = {
      id: `snapshot-${Date.now()}`,
      workoutId,
      completedAt: new Date().toISOString(),
      exercises: exercises.map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroup: workout.exercises.find((ex) => ex.id === e.id)?.muscleGroup ?? null,
        sets: e.sets,
      })),
    };
    this.state.history.unshift(snapshot);

    // Übungs-Historie aktualisieren.
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.type === 'warmup') return;

        const muscleGroup = workout.exercises.find((e) => e.id === ex.id)?.muscleGroup ?? null;
        this.state.exerciseHistory.unshift({
          date: snapshot.completedAt,
          exerciseId: ex.id,
          exerciseName: ex.name,
          reps: s.reps,
          weight: s.weight,
          muscleGroup,
        });
      });
    });

    // Workout zurücksetzen (als bekannt markieren).
    workout.exercises.forEach((ex) => (ex.sets = []));
    this.save();
  }
}
