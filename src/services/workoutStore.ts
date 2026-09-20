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
  'Plank': 'core',
  'Russian Twists': 'core',
  'Hanging Leg Raises': 'core',
  'Laufen': 'core',
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

  /** True, wenn für diesen Nutzer bereits Daten im LocalStorage liegen. */
  hasPersistedData(): boolean {
    try {
      return localStorage.getItem(this.key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Spielt externe Testdaten ein (z. B. `public/testdata/seed-workouts.json`).
   * Überschreibt den lokalen Zustand NUR, wenn dieser vorher leer war
   * (Aufrufer prüft `hasPersistedData()` – nicht-destruktiv).
   */
  seedDemoData(data: WorkoutState): void {
    const normalized = this.normalize(structuredClone(data));
    this.shiftDatesToRecent(normalized);
    this.state = normalized;
    this.save();
  }

  /** Verschiebt alle Einträge so, dass der jüngste heute liegt (Demo bleibt aktuell). */
  private shiftDatesToRecent(state: WorkoutState): void {
    const timestamps = [
      ...state.history.map((h) => Date.parse(h.date)),
      ...state.exerciseHistory.map((e) => Date.parse(e.date)),
    ].filter((t) => !Number.isNaN(t));
    if (timestamps.length === 0) return;

    const target = new Date();
    target.setUTCHours(9, 0, 0, 0); // heute, 09:00 UTC → Kalendertag heute, Zeit plausibel
    const delta = target.getTime() - Math.max(...timestamps);
    if (delta === 0) return;

    const shift = (d: string): string => new Date(Date.parse(d) + delta).toISOString();
    state.history.forEach((h) => {
      h.date = shift(h.date);
    });
    state.exerciseHistory.forEach((e) => {
      e.date = shift(e.date);
    });
  }

  /** Stellt sicher, dass ältere Daten vollständig sind (Satz-Typ, Muskelgruppe, Migration). */
  private normalize(state: WorkoutState): WorkoutState {
    if (!state.workouts || !Array.isArray(state.workouts)) {
      state.workouts = structuredClone(DEFAULT_WORKOUTS);
    }
    if (!state.history || !Array.isArray(state.history)) state.history = [];
    if (!state.exerciseHistory || !Array.isArray(state.exerciseHistory)) state.exerciseHistory = [];

    state.workouts.forEach((w) => {
      if (!Array.isArray(w.exercises)) w.exercises = [];
      w.exercises.forEach((e) => {
        if (!Array.isArray(e.sets)) e.sets = [];
        if (e.muscleGroup === undefined) {
          e.muscleGroup = MUSCLE_GROUP_BY_NAME[e.name] ?? null;
        }
        e.sets.forEach((s) => {
          if (!s.type) s.type = 'normal';
        });
      });
    });

    state.history = state.history.map((h) => this.migrateLegacySnapshot(h));
    state.exerciseHistory = state.exerciseHistory.map((e) => this.migrateLegacyEntry(e));
    return state;
  }

  /**
   * Migration: Alte Snapshots nutzten id/workoutId/completedAt und
   * Übungs-Details mit reps/weight statt date/name/topWeight/….
   */
  private migrateLegacySnapshot(h: WorkoutSnapshot): WorkoutSnapshot {
    if (typeof h.date === 'string') return h;

    const legacy = h as unknown as {
      workoutId?: string;
      completedAt?: string;
      name?: string;
      totalSets?: number;
      doneSets?: number;
      volume?: number;
      durationSec?: number;
      exercises?: Array<{
        id?: string;
        name?: string;
        sets?: Array<{ reps?: number | string; weight?: number | string }>;
      }>;
    };

    const date = legacy.completedAt ?? new Date().toISOString();
    const details: ExerciseHistoryEntry[] = (legacy.exercises ?? [])
      .filter((e) => e && Array.isArray(e.sets) && e.sets.length > 0)
      .map((e) => {
        const sets = e.sets ?? [];
        let topWeight = 0;
        let topReps = 0;
        let volume = 0;
        sets.forEach((s) => {
          const wt = Number(s.weight) || 0;
          const rp = Number(s.reps) || 0;
          volume += wt * rp;
          if (wt > topWeight) {
            topWeight = wt;
            topReps = rp;
          }
        });
        return {
          date,
          exerciseId: e.id ?? '',
          exerciseName: e.name ?? 'Übung',
          topWeight,
          topReps,
          volume,
          sets: sets.length,
          muscleGroup: MUSCLE_GROUP_BY_NAME[e.name ?? ''] ?? null,
        };
      });

    return {
      date,
      name: legacy.name ?? 'Workout',
      totalSets: legacy.totalSets ?? details.reduce((n, d) => n + d.sets, 0),
      doneSets: legacy.doneSets ?? 0,
      volume: legacy.volume ?? details.reduce((n, d) => n + d.volume, 0),
      ...(legacy.durationSec !== undefined ? { durationSec: legacy.durationSec } : {}),
      ...(details.length ? { exercises: details } : {}),
    };
  }

  /** Migration: Alte Übungs-Einträge nutzten reps/weight statt topReps/topWeight. */
  private migrateLegacyEntry(entry: ExerciseHistoryEntry): ExerciseHistoryEntry {
    const legacy = entry as ExerciseHistoryEntry & {
      reps?: number | string;
      weight?: number | string;
    };
    if (legacy.topWeight === undefined && (legacy.reps !== undefined || legacy.weight !== undefined)) {
      const weight = Number(legacy.weight) || 0;
      const reps = Number(legacy.reps) || 0;
      return {
        date: entry.date,
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        topWeight: weight,
        topReps: reps,
        volume: legacy.volume ?? weight * reps,
        sets: legacy.sets ?? 1,
        muscleGroup:
          entry.muscleGroup === undefined
            ? MUSCLE_GROUP_BY_NAME[entry.exerciseName] ?? null
            : entry.muscleGroup,
      };
    }
    if (entry.muscleGroup === undefined) {
      entry.muscleGroup = MUSCLE_GROUP_BY_NAME[entry.exerciseName] ?? null;
    }
    return entry;
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
    const byGroup = new Map<string, { volume: number; sets: number; sessions: Set<string> }>();
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
      agg.sessions.add(h.date); // dedupliziert über den gemeinsamen Abschluss-Zeitstempel
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
    const e = this.findExercise(workoutId, exerciseId);
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

  /** Hakt einen Satz an/ab. Liefert den neuen done-Zustand (true = gerade abgehakt). */
  toggleSet(workoutId: string, exerciseId: string, index: number): boolean {
    const e = this.findExercise(workoutId, exerciseId);
    if (!e || !e.sets[index]) return false;
    e.sets[index].done = !e.sets[index].done;
    this.save();
    return e.sets[index].done;
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
    const doneSets = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    const volume = w.exercises.reduce(
      (sum, e) => sum + e.sets.reduce((s, set) => s + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0),
      0,
    );

    // Pro Übung einen Statistik-Eintrag schreiben (Warm-up-Sätze zählen nicht).
    const now = new Date().toISOString();
    const exercises: ExerciseHistoryEntry[] = [];
    for (const e of w.exercises) {
      const work = e.sets.filter((s) => s.type !== 'warmup');
      if (work.length === 0) continue;
      let topWeight = 0;
      let topReps = 0;
      let exVolume = 0;
      for (const s of work) {
        const wt = Number(s.weight) || 0;
        const rp = Number(s.reps) || 0;
        exVolume += wt * rp;
        if (wt > topWeight) {
          topWeight = wt;
          topReps = rp;
        }
      }
      exercises.push({
        date: now,
        exerciseId: e.id,
        exerciseName: e.name,
        topWeight,
        topReps,
        volume: exVolume,
        sets: work.length,
        muscleGroup: e.muscleGroup ?? null,
      });
    }

    const snapshot: WorkoutSnapshot = {
      date: now,
      name: w.name,
      totalSets,
      doneSets,
      volume,
      ...(durationSec !== undefined ? { durationSec } : {}),
      exercises,
    };

    this.state.history.unshift(snapshot);
    this.state.exerciseHistory.unshift(...exercises);

    // Workout für den nächsten Durchgang zurücksetzen (Gewichte/Wdh als Referenz behalten).
    w.exercises.forEach((e) => e.sets.forEach((s) => (s.done = false)));
    this.save();

    return snapshot;
  }
}
