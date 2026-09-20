// src/screens/ProfileScreen.ts
// Profil-Screen: Header, Premium-Karte, KPI-Dashboard, Körpermaße,
// Einstellungen (inkl. CSV-Export) und Abmelden — Mockup-konform mit Tab-Bar.

import type { User, UserProfile, IAuthService, IProfileService } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { escapeHtml, formatNumber } from '../lib/utils';
import { exportWorkoutData } from '../lib/export';
import { DEMO_USER } from '../lib/demoUser';
import { tabBarHtml, bindTabBar, type TabBarActions } from '../components/TabBar';

export interface ProfileTabs {
  onWorkouts: () => void;
  onHistory: () => void;
  onStats: () => void;
}

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
    private tabs: ProfileTabs,
    private onLoggedOut: () => void,
  ) {}

  private tabActions(): TabBarActions {
    return {
      onWorkouts: () => this.tabs.onWorkouts(),
      onHistory: () => this.tabs.onHistory(),
      onStats: () => this.tabs.onStats(),
      onProfile: () => {},
    };
  }

  /** Einstiegspunkt: lädt das Profil und rendert den Screen. */
  async mount(user: User): Promise<void> {
    this.renderLoading();

    let profile: UserProfile | null = null;
    try {
      profile = await this.profileService.getProfile(user.id);
    } catch {
      profile = null; // z. B. Tabelle fehlt noch – unten behandeln
    }

    // Demo-Account: lokale Profil-Daten als Fallback, sobald das Backend
    // (noch) kein Profil liefert; Upsert heilt sich selbst, sobald die
    // profiles-Tabelle existiert.
    if (!profile && user.email.trim().toLowerCase() === DEMO_USER.email) {
      const demoProfile = this.demoFallbackProfile(user);
      try {
        await this.profileService.upsertOwnProfile(user.id, demoProfile);
      } catch {
        /* Tabelle fehlt noch – lokale Ansicht reicht */
      }
      this.render(demoProfile, true);
      return;
    }

    if (!profile) {
      this.renderError('Profil nicht gefunden.');
      return;
    }
    this.render(profile, false);
  }

  /** Demo-Profilwerte (sichtbar als „Testdaten“, sobald der Fallback greift). */
  private demoFallbackProfile(user: User): UserProfile {
    return {
      user_id: user.id,
      username: 'Demo User',
      target_goal: 'Muscle Gain',
      starting_weight: 82.5,
      current_weight: 80.2,
      height: 178,
      created_at: new Date().toISOString(),
    };
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  private render(profile: UserProfile, fallback = false): void {
    const diff = formatWeightDiff(profile.current_weight, profile.starting_weight);
    const trendClass = weightTrend(profile);
    const stats = this.store.getProfileStats();

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-4 pb-32 fade-in">

        <!-- Header: Avatar, Name, Ziel -->
        <header class="flex items-center gap-4 py-4">
          <div class="avatar-placeholder">${initials(profile.username)}</div>
          <div>
            <h1 class="text-xl font-bold text-white">${escapeHtml(profile.username)}</h1>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/20 text-accent-hi">
                ${escapeHtml(profile.target_goal)}
              </span>
              ${fallback ? '<span class="chip chip-accent">Testdaten</span>' : ''}
            </div>
          </div>
        </header>

        <!-- Premium-Karte (Status im Demo-/Testbetrieb) -->
        <div class="rounded-2xl border border-line bg-panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-white text-sm">BWS+ Premium Abonnement</p>
              <p class="text-xs text-slate-400 mt-0.5">Status</p>
            </div>
            <span class="chip chip-accent">Demo</span>
          </div>
        </div>

        <!-- KPI-Dashboard -->
        <section class="grid grid-cols-2 gap-3 mt-3">
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

        <!-- Körpermaße -->
        <h2 class="text-sm font-semibold text-slate-300 mt-5 mb-2">Körpermaße</h2>
        <div class="rounded-2xl border border-line bg-panel divide-y divide-lineSoft">
          <div class="flex justify-between px-4 py-3 text-sm">
            <span class="text-slate-400">Startgewicht</span>
            <span class="text-white font-semibold tabular-nums">${formatNumber(profile.starting_weight, 1)} kg</span>
          </div>
          <div class="flex justify-between px-4 py-3 text-sm">
            <span class="text-slate-400">Aktuelles Gewicht</span>
            <span class="text-white font-semibold tabular-nums">${formatNumber(profile.current_weight, 1)} kg</span>
          </div>
          <div class="flex justify-between px-4 py-3 text-sm">
            <span class="text-slate-400">Größe</span>
            <span class="text-white font-semibold tabular-nums">${formatNumber(profile.height, 0)} cm</span>
          </div>
        </div>

        <!-- Einstellungen -->
        <h2 class="text-sm font-semibold text-slate-300 mt-5 mb-2">Einstellungen</h2>
        <div class="space-y-2">
          <div class="settings-row">
            <span>Sprache</span>
            <span class="text-slate-400 text-xs">Deutsch <span class="chip">Demnächst</span></span>
          </div>
          <div class="settings-row">
            <span>Einheiten</span>
            <span class="text-slate-400 text-xs">kg · metrisch <span class="chip">Demnächst</span></span>
          </div>
          <div class="settings-row">
            <span>Gerätesynchronisation</span>
            <span class="text-slate-400 text-xs">Aus <span class="chip">Demnächst</span></span>
          </div>
          <button id="export-btn" class="settings-row">
            <span>Daten exportieren (CSV)</span>
            <span class="text-accent-400 text-xs font-semibold">Herunterladen</span>
          </button>
          <button id="logout-btn" class="settings-row settings-row-danger">
            <span>Abmelden</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      ${tabBarHtml('profile', this.tabActions())}
    `;

    this.bind();
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-4">
        <p class="text-center text-slate-400 pt-16">Profil wird geladen…</p>
      </div>
    `;
  }

  private renderError(message: string): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-4 pb-32">
        <p class="text-center text-slate-400 pt-16">${escapeHtml(message)}</p>
      </div>
      ${tabBarHtml('profile', this.tabActions())}
    `;
    bindTabBar(this.container, this.tabActions());
  }

  private bind(): void {
    this.container.querySelector('#logout-btn')?.addEventListener('click', () => this.handleLogout());
    this.container.querySelector('#export-btn')?.addEventListener('click', () => exportWorkoutData(this.store));
    bindTabBar(this.container, this.tabActions());
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
