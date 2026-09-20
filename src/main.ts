// src/main.ts
// Haupteinstiegspunkt: Auth-Gate + Navigation (Login/Registrieren vs. Workout-App).

import { createAuthService, createProfileService } from './services/serviceFactory';
import { WorkoutStore, type WorkoutState } from './services/workoutStore';
import { DEMO_USER } from './lib/demoUser';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { WorkoutListScreen } from './screens/WorkoutListScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { StatsScreen } from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const authRoot = document.getElementById('auth-root') as HTMLElement;
const dashboard = document.getElementById('dashboard') as HTMLElement;

async function bootstrap(): Promise<void> {
  // Factory wählt anhand der Env-Variablen echte Supabase-Services oder Mock.
  const authService = createAuthService();
  const profileService = createProfileService();

  let store: WorkoutStore | null = null;

  function showLogin(): void {
    dashboard.classList.add('hidden');
    authRoot.classList.remove('hidden');
    new LoginScreen(authRoot, authService, () => void showApp(), showRegister).mount();
  }

  function showRegister(): void {
    dashboard.classList.add('hidden');
    authRoot.classList.remove('hidden');
    new RegisterScreen(authRoot, authService, () => void showApp(), showLogin).mount();
  }

  function showWorkoutList(): void {
    new WorkoutListScreen(dashboard, store!, {
      onOpenWorkout: (id) => showWorkout(id),
      onOpenStats: () => showStats(),
      onOpenHistory: () => showHistory(),
      onOpenProfile: () => void showProfile(),
    }).mount();
  }

  function showWorkout(id: string): void {
    new WorkoutScreen(dashboard, store!, id, { onBack: showWorkoutList }).mount();
  }

  function showStats(): void {
    new StatsScreen(dashboard, store!, {
      onWorkouts: showWorkoutList,
      onHistory: showHistory,
      onProfile: () => void showProfile(),
    }).mount();
  }

  function showHistory(): void {
    new HistoryScreen(dashboard, store!, {
      onWorkouts: showWorkoutList,
      onStats: showStats,
      onProfile: () => void showProfile(),
    }).mount();
  }

  async function showProfile(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      showLogin();
      return;
    }
    new ProfileScreen(
      dashboard,
      authService,
      profileService,
      store!,
      {
        onWorkouts: showWorkoutList,
        onHistory: showHistory,
        onStats: showStats,
      },
      () => {
        store = null;
        showLogin();
      },
    ).mount(user);
  }

  /**
   * Lädt die Testdaten (public/testdata/seed-workouts.json) automatisch in den
   * Demo-Account, sobald dieser noch keine eigenen Daten hat (nicht-destruktiv).
   * Schlägt das Laden fehl, bleiben die Defaults erhalten.
   */
  async function seedDemoAccount(store: WorkoutStore): Promise<void> {
    try {
      const res = await fetch('/testdata/seed-workouts.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Partial<WorkoutState>;
      if (
        Array.isArray(data.workouts) &&
        Array.isArray(data.history) &&
        Array.isArray(data.exerciseHistory)
      ) {
        store.seedDemoData(data as WorkoutState);
      } else {
        throw new Error('Unerwartetes Seed-Format');
      }
    } catch (err) {
      console.warn('[demo] Testdaten konnten nicht geladen werden:', err);
    }
  }

  async function showApp(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      showLogin();
      return;
    }
    store = new WorkoutStore(user.id);
    // Demo-Account: beim ersten Login automatisch mit Testdaten befüllen.
    if (user.email.trim().toLowerCase() === DEMO_USER.email && !store.hasPersistedData()) {
      await seedDemoAccount(store);
    }
    authRoot.classList.add('hidden');
    dashboard.classList.remove('hidden');
    showWorkoutList();
  }

  // Auth-State prüfen: eingeloggt -> App, sonst -> Login.
  try {
    const user = await authService.getCurrentUser();
    if (user) await showApp();
    else showLogin();
  } catch {
    showLogin();
  }
}

void bootstrap();