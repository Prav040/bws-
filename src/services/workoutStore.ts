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
    return { workouts: structuredClone(DEFAULT_WORKOUTS), history: [], exerciseHistory: [] };
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

  getWorkout(id: string): Workout | undefined {
    return this.state.workouts.find((w) => w.id === id);
  }

  getHistory(): WorkoutSnapshot[] {
    return this.state.history;
  }

  getExerciseHistory(): ExerciseHistoryEntry[] {
    return this.state.exerciseHistory;
  }

  /** Aggregierte Profil-Kennzahlen aus der abgeschlossenen Historie. */
  getProfileStats(): ProfileStats {
    const history = this.state.history;
    if (history.length === 0) {
      return { totalWorkouts: 0, currentStreak: 0, totalVolume: 0 };
    }

    const totalWorkouts = history.length;
    const totalVolume = history.reduce((sum, h) => sum + (h.volume || 0), 0);

    const days = new Set(history.map((h) => this.dayKey(new Date(h.date))));
    let currentStreak = 0;
    const cursor = new Date();
    while (days.has(this.dayKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { totalWorkouts, currentStreak, totalVolume };
  }

  /**
   * Aggregiert Tonnage (kg), Sätze und Trainingseinheiten je Muskelgruppe
   * im Zeitraum [from, to] (Epoche-ms). `from`/`to` optional (= gesamt).
   */
  getMuscleVolume(from?: number, to?: number): MuscleGroupStat[] {
    const byGroup = new Map<string, { volume: number; sets: number; sessions: Set<number> }>();
    for (const h of this.state.exerciseHistory) {
      const ts = new Date(h.date).getTime();
      if (from !== undefined && ts < from) continue;
      if (to !== undefined && ts > to) continue;

      const key = h.muscleGroup ?? 'Sonstige';
      let agg = byGroup.get(key);
      if (!agg) {
        agg = { volume: 0, sets: 0, sessions: new Set() };
        byGroup.set(key, agg);
      }
      agg.volume += h.volume || 0;
      agg.sets += h.sets || 0;
      agg.sessions.add(ts);
    }

    return [...byGroup.entries()]
      .map(([group, a]) => ({
        group,
        volume: a.volume,
        sets: a.sets,
        sessions: a.sessions.size,
      }))
      .sort((a, b) => b.volume - a.volume);
  }

  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  /* ---------- Workouts ---------- */

  addWorkout(name: string): Workout {
    const workout: Workout = { id: crypto.randomUUID(), name, exercises: [] };
    this.state.workouts.push(workout);
    this.save();
    return workout;
  }

  deleteWorkout(id: string): void {
    this.state.workouts = this.state.workouts.filter((w) => w.id !== id);
    this.save();
  }

  /* ---------- Übungen ---------- */

  addExercise(workoutId: string, exercise: Exercise): void {
    const w = this.getWorkout(workoutId);
    if (!w) return;
    w.exercises.push(exercise);
    this.save();
  }

  updateExercise(
    workoutId: string,
    exerciseId: string,
    patch: Partial<Pick<Exercise, 'name' | 'targetReps' | 'restSec' | 'notes' | 'image' | 'muscleGroup'>>,
  ): void {
    const w = this.getWorkout(workoutId);
    const e = w?.exercises.find((x) => x.id === exerciseId);
    if (!e) return;
    Object.assign(e, patch);
    this.save();
  }

  deleteExercise(workoutId: string, exerciseId: string): void {
    const w = this.getWorkout(workoutId);
    if (!w) return;
    w.exercises = w.exercises.filter((x) => x.id !== exerciseId);
    this.save();
  }

  /* ---------- Sätze ---------- */

  private findExercise(workoutId: string, exerciseId: string): Exercise | undefined {
    return this.getWorkout(workoutId)?.exercises.find((x) => x.id === exerciseId);
  }

  addSet(workoutId: string, exerciseId: string): void {
    const e = this.findExercise(workoutId, exerciseId);
    if (!e) return;
    const last = e.sets[e.sets.length - 1];
    e.sets.push({
      weight: last ? last.weight : '',
      reps: String(e.targetReps),
      done: false,
      type: 'normal',
    });
    this.save();
  }

  removeSet(workoutId: string, exerciseId: string, index: number): void {
    const e = this.findExercise(workoutId, exerciseId);
    if (!e) return;
    e.sets.splice(index, 1);
    this.save();
  }

  updateSet(
    workoutId: string,
    exerciseId: string,
    index: number,
    field: 'weight' | 'reps',
    value: string,
  ): void {
    const e = this.findExercise(workoutId, exerciseId);
    if (!e || !e.sets[index]) return;
    e.sets[index][field] = value;
    this.save();
  }

  toggleSet(workoutId: string, exerciseId: string, index: number): boolean {
    const e = this.findExercise(workoutId, exerciseId);
    if (!e || !e.sets[index]) return false;
    e.sets[index].done = !e.sets[index].done;
    this.save();
    return e.sets[index].done; // true = gerade abgehakt
  }

  setSetType(workoutId: string, exerciseId: string, index: number, type: SetType): void {
    const e = this.findExercise(workoutId, exerciseId);
    if (!e || !e.sets[index]) return;
    e.sets[index].type = type;
    this.save();
  }

  /* ---------- Abschluss ---------- */

  completeWorkout(workoutId: string, durationSec?: number): WorkoutSnapshot | null {
    const w = this.getWorkout(workoutId);
    if (!w) return null;

    const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    const doneSets = w.exercises.reduce(
      (n, e) => n + e.sets.filter((s) => s.done).length,
      0,
    );
    const volume = w.exercises.reduce(
      (sum, e) =>
        sum +
        e.sets.reduce(
          (s, set) => s + (Number(set.weight) || 0) * (Number(set.reps) || 0),
          0,
        ),
      0,
    );

    // Pro Übung einen Statistik-Eintrag schreiben (inkl. Muskelgruppe).
    const now = new Date().toISOString();
    const exerciseLogs: ExerciseHistoryEntry[] = [];
    w.exercises.forEach((e) => {
      if (e.sets.length === 0) return;
      let topWeight = 0;
      let topReps = 0;
      let exVolume = 0;
      e.sets.forEach((s) => {
        const wt = Number(s.weight) || 0;
        const rp = Number(s.reps) || 0;
        if (wt > topWeight) {
          topWeight = wt;
          topReps = rp;
        }
        exVolume += wt * rp;
      });
      exerciseLogs.push({
        date: now,
        exerciseId: e.id,
        exerciseName: e.name,
        topWeight,
        topReps,
        volume: exVolume,
        sets: e.sets.length,
        muscleGroup: e.muscleGroup ?? null,
      });
    });

    const snapshot: WorkoutSnapshot = {
      date: now,
      name: w.name,
      totalSets,
      doneSets,
      volume,
      durationSec,
      exercises: exerciseLogs,
    };

    this.state.history.unshift(snapshot);
    this.state.exerciseHistory.push(...exerciseLogs);

    // Sätze zurücksetzen (Gewichte/Wdh als Referenz behalten, Haken entfernen)
    w.exercises.forEach((e) => e.sets.forEach((s) => (s.done = false)));
    this.save();

    return snapshot;
  }
}