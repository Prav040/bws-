// src/types.ts
// Zentrale Typdefinitionen für Auth, Profil und Workout-Domain.

/** Trainingsziel des Nutzers (erweiterbarer Union-Typ). */
export type TargetGoal = 'Muscle Gain' | 'Fat Loss' | 'Recomposition';

/** Authentifizierter Nutzer (Abbild des Auth-Backends). */
export interface User {
  id: string;
  email: string;
}

/** Persönliches Profil, 1:1 mit dem Auth-Nutzer verknüpft. */
export interface UserProfile {
  user_id: string;          // FK auf die Auth-Nutzer-ID
  username: string;
  target_goal: TargetGoal;
  starting_weight: number;  // kg
  current_weight: number;   // kg
  height: number;           // cm
  created_at: string;       // ISO-8601
}

/** Eingabedaten für die Registrierung. */
export interface SignUpInput {
  email: string;
  password: string;
  username: string;
}

/** Schnittstelle des Auth-Service (real + mock). */
export interface IAuthService {
  signUp(input: SignUpInput): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

/** Schnittstelle des Profil-Service (real + mock). */
export interface IProfileService {
  getProfile(userId: string): Promise<UserProfile | null>;
  /** Legt das eigene Profil an/aktualisiert es (RLS: nur eigene Zeile). */
  upsertOwnProfile(userId: string, profile: UserProfile): Promise<void>;
}

/* ------------------------------------------------------------------
   Workout-Domain
   ------------------------------------------------------------------ */

/** Satz-Typ (analog BWS): Normal, Warm-up, Drop-Set oder Deload. */
export type SetType = 'normal' | 'warmup' | 'dropset' | 'deload';

/** Primäre Muskelgruppe einer Übung (einfache Zuordnung, keine Mehrfach-Zuordnung). */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

/** Ein einzelner Satz innerhalb einer Übung. */
export interface WorkoutSet {
  weight: string; // kg (String, da direkt aus dem Eingabefeld)
  reps: string;
  done: boolean;
  type: SetType;  // per Satznummer umschaltbar
}

/** Eine Übung innerhalb eines Workouts. */
export interface Exercise {
  id: string;
  name: string;
  targetReps: number;
  restSec: number;      // Pause nach jedem Satz (Sekunden)
  notes: string;        // z. B. Geräteeinstellung / Hinweise
  image: string | null; // Data-URL (Base64)
  muscleGroup: MuscleGroup | null; // null = nicht zugeordnet / „Sonstige“
  sets: WorkoutSet[];
}

/** Ein Workout (Sammlung von Übungen). */
export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
}

/** Abgeschlossenes Workout (für Verlauf/Statistik). */
export interface WorkoutSnapshot {
  date: string;
  name: string;
  totalSets: number;
  doneSets: number;
  volume: number;
  /** Trainingsdauer in Sekunden (fehlt bei Altdaten). */
  durationSec?: number;
  /** Übungs-Einzelleistungen (fehlt bei Altdaten → „keine Detaildaten“). */
  exercises?: ExerciseHistoryEntry[];
}

/** Ein statistikfähiger Übungs-Eintrag, geschrieben beim Workout-Abschluss. */
export interface ExerciseHistoryEntry {
  date: string;       // ISO-8601
  exerciseId: string;
  exerciseName: string;
  topWeight: number;  // schwerstes Gewicht in diesem Durchgang (kg)
  topReps: number;    // Wiederholungen beim schwersten Satz
  volume: number;     // Σ Gewicht × Wdh
  sets: number;
  muscleGroup: MuscleGroup | null;
}

/** Aggregierte Profil-Statistiken aus der abgeschlossenen Workout-Historie. */
export interface ProfileStats {
  totalWorkouts: number; // Anzahl abgeschlossener Workouts
  currentStreak: number; // Tage in Folge (rückwärts ab heute)
  totalVolume: number;   // Summe Volumen (kg)
}

/** Aggregierte Muskelgruppen-Statistik (Tonnage + Sätze + Einheiten je Gruppe). */
export interface MuscleGroupStat {
  group: string;        // MuscleGroup-Schlüssel oder „Sonstige“
  volume: number;       // Σ Volume (kg) im Zeitraum
  sets: number;         // Σ Sätze im Zeitraum
  sessions: number;     // Anzahl Trainingseinheiten im Zeitraum
}