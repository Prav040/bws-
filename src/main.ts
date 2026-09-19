// src/main.ts
// Haupteinstiegspunkt: Auth-Gate + Navigation (Login/Registrieren vs. Workout-App).

import { createAuthService, createProfileService } from './services/serviceFactory';
import { WorkoutStore } from './services/workoutStore';
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
      onLogout: () => void handleLogout(),
    }).mount();
  }

  function showWorkout(id: string): void {
    new WorkoutScreen(dashboard, store!, id, { onBack: showWorkoutList }).mount();
  }

  function showStats(): void {
    new StatsScreen(dashboard, store!, { onBack: showWorkoutList }).mount();
  }

  function showHistory(): void {
    new HistoryScreen(dashboard, store!, { onBack: showWorkoutList }).mount();
  }

  async function showProfile(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      showLogin();
      return;
    }
    new ProfileScreen(dashboard, authService, profileService, store!, showWorkoutList, () => {
      store = null;
      showLogin();
    }).mount(user);
  }

  async function handleLogout(): Promise<void> {
    await authService.signOut();
    store = null;
    showLogin();
  }

  async function showApp(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      showLogin();
      return;
    }
    store = new WorkoutStore(user.id);
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