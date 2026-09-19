// src/screens/ProfileScreen.ts
// Profil-Screen: Header, KPI-Dashboard und Abmelden — mit „Zurück"-Button.

import type { User, UserProfile, IAuthService, IProfileService } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { escapeHtml, formatNumber } from '../lib/utils';

/* ------------------------------------------------------------------
   Helfer
   ------------------------------------------------------------------ */

/** Formatiert die Gewichtsdifferenz mit Vorzeichen, z. B. "-3.2 kg". */
function formatWeightDiff(current: number, starting: number): string {
  const diff = current - starting;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${formatNumber(diff, 1)} kg`;
}

/** Trend-Farbe je nach Zielrichtung (grün bei Fortschritt Richtung Ziel). */
function weightTrend(profile: UserProfile): string {
  const diff = profile.current_weight - profile.starting_weight;
  if (diff === 0) return 'trend-flat';
  const losingIsGood =
    profile.target_goal === 'Fat Loss' || profile.target_goal === 'Recomposition';
  const movingTowardGoal = losingIsGood ? diff < 0 : diff > 0;
  return movingTowardGoal ? 'trend-up' : 'trend-down';
}

/** Initiale für den Platzhalter-Avatar. */
function initials(username: string): string {
  return username.trim().charAt(0).toUpperCase() || '?';
}

/* ------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------ */

export class ProfileScreen {
  constructor(
    private container: HTMLElement,
    private authService: IAuthService,
    private profileService: IProfileService,
    private store: WorkoutStore,
    private onBack: () => void,
    private onLoggedOut: () => void,
  ) {}

  /** Einstiegspunkt: lädt das Profil und rendert den Screen. */
  async mount(user: User): Promise<void> {
    this.renderLoading();

    try {
      const profile = await this.profileService.getProfile(user.id);
      if (!profile) {
        this.renderError('Profil nicht gefunden.');
        return;
      }
      this.render(profile);
    } catch {
      this.renderError('Profil konnte nicht geladen werden.');
    }
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  private render(profile: UserProfile): void {
    const diff = formatWeightDiff(profile.current_weight, profile.starting_weight);
    const trendClass = weightTrend(profile);
    const stats = this.store.getProfileStats();

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-4 pb-32 fade-in">

        ${this.topBar()}

        <!-- Header: Avatar, Name, Ziel -->
        <header class="flex items-center gap-4 py-4">
          <div class="avatar-placeholder">${initials(profile.username)}</div>
          <div>
            <h1 class="text-xl font-bold text-white">${escapeHtml(profile.username)}</h1>
            <span class="inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/20 text-accent-hi">
              ${escapeHtml(profile.target_goal)}
            </span>
          </div>
        </header>

        <!-- KPI-Dashboard -->
        <section class="grid grid-cols-2 gap-3 mt-2">
          <div class="kpi-card">
            <p class="kpi-label">Gewicht</p>
            <p class="kpi-value">${formatNumber(profile.current_weight, 1)}<span class="kpi-unit"> kg</span></p>
            <span class="trend ${trendClass}">${diff}</span>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Workouts</p>
            <p class="kpi-value">${stats.totalWorkouts}</p>
            <span class="trend trend-flat">abgeschlossen</span>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Streak</p>
            <p class="kpi-value">${stats.currentStreak}<span class="kpi-unit"> Tage</span></p>
            <span class="trend trend-flat">in Folge</span>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Gesamtvolumen</p>
            <p class="kpi-value">${formatNumber(stats.totalVolume, 0)}<span class="kpi-unit"> kg</span></p>
            <span class="trend trend-flat">Σ Gewicht × Wdh</span>
          </div>
        </section>

        <!-- Aktionen -->
        <button id="logout-btn"
          class="w-full mt-6 py-3.5 rounded-xl font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition">
          Abmelden
        </button>
      </div>
    `;

    this.container
      .querySelector('#logout-btn')
      ?.addEventListener('click', () => this.handleLogout());
    this.bindBack();
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-4">
        ${this.topBar()}
        <p class="text-center text-slate-400 pt-16">Profil wird geladen…</p>
      </div>
    `;
    this.bindBack();
  }

  private renderError(message: string): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-4">
        ${this.topBar()}
        <p class="text-center text-slate-400 pt-16">${escapeHtml(message)}</p>
      </div>
    `;
    this.bindBack();
  }

  /** Obere Leiste mit „Zurück"-Button (in jedem Zustand vorhanden). */
  private topBar(): string {
    return `
      <div class="flex items-center gap-2 py-2">
        <button id="back-btn" class="min-h-[44px] text-slate-400 hover:text-white text-sm">‹ Zurück</button>
        <h1 class="text-sm font-semibold text-slate-300">Profil</h1>
      </div>
    `;
  }

  private bindBack(): void {
    this.container
      .querySelector('#back-btn')
      ?.addEventListener('click', () => this.onBack());
  }

  /* ------------------------------------------------------------------
     Aktionen
     ------------------------------------------------------------------ */

  /** Meldet den Nutzer ab und leitet zum Login zurück. */
  private async handleLogout(): Promise<void> {
    try {
      await this.authService.signOut();
    } finally {
      // Unabhängig vom Ergebnis der Abmeldung zurück zum Login.
      this.onLoggedOut();
    }
  }
}