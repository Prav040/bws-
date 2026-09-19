// src/screens/WorkoutListScreen.ts
// Übersicht aller Workouts + Erstellen + Verlauf/Statistik/Profil + Logout.

import type { Workout } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { escapeHtml } from '../lib/utils';

export interface WorkoutListCallbacks {
  onOpenWorkout: (workoutId: string) => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export class WorkoutListScreen {
  constructor(
    private container: HTMLElement,
    private store: WorkoutStore,
    private callbacks: WorkoutListCallbacks,
  ) {}

  mount(): void {
    this.render();
  }

  private render(): void {
    const workouts = this.store.getWorkouts();

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pb-32 pt-4 fade-in">
        <header class="flex items-center justify-between py-4">
          <div>
            <h1 class="text-xl font-bold text-white">BWS+ <span class="text-accent-400">Fitness</span></h1>
            <p class="text-xs text-slate-400 mt-0.5">Meine Workouts</p>
          </div>
          <div class="flex items-center gap-1">
            <button id="history-btn" class="min-h-[44px] text-slate-400 hover:text-accent-400 text-sm px-1.5 rounded-lg transition">📋 Verlauf</button>
            <button id="stats-btn" class="min-h-[44px] text-slate-400 hover:text-accent-400 text-sm px-1.5 rounded-lg transition">📊 Statistik</button>
            <button id="profile-btn" class="min-h-[44px] text-slate-400 hover:text-accent-400 text-sm px-1.5 rounded-lg transition">👤 Profil</button>
            <button id="logout-btn" class="min-h-[44px] text-slate-400 hover:text-red-400 text-sm px-1.5 rounded-lg transition">Abmelden</button>
          </div>
        </header>

        <div class="space-y-3 mt-2">
          ${workouts.map((w) => this.workoutCard(w)).join('')}
        </div>

        <button id="add-workout-btn" class="w-full mt-4 py-3.5 rounded-xl font-semibold text-accent-400 border border-dashed border-line hover:border-accent-400 transition">
          + Neues Workout
        </button>
      </div>
    `;

    this.bind();
  }

  private workoutCard(w: Workout): string {
    const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    const doneSets = w.exercises.reduce(
      (n, e) => n + e.sets.filter((s) => s.done).length,
      0,
    );
    return `
      <div class="exercise-card cursor-pointer" data-id="${w.id}">
        <div class="flex items-center justify-between px-4 py-4">
          <div>
            <h3 class="font-semibold text-white">${escapeHtml(w.name)}</h3>
            <p class="text-xs text-slate-400 mt-0.5">${w.exercises.length} Übungen${
              totalSets ? ` · ${doneSets}/${totalSets} Sätze` : ''
            }</p>
          </div>
          <span class="text-slate-500 text-xl">›</span>
        </div>
      </div>
    `;
  }

  private bind(): void {
    this.container.querySelectorAll('[data-id]').forEach((el) => {
      el.addEventListener('click', () =>
        this.callbacks.onOpenWorkout(el.getAttribute('data-id')!),
      );
    });
    this.container
      .querySelector('#add-workout-btn')
      ?.addEventListener('click', () => this.promptAddWorkout());
    this.container
      .querySelector('#profile-btn')
      ?.addEventListener('click', () => this.callbacks.onOpenProfile());
    this.container
      .querySelector('#stats-btn')
      ?.addEventListener('click', () => this.callbacks.onOpenStats());
    this.container
      .querySelector('#history-btn')
      ?.addEventListener('click', () => this.callbacks.onOpenHistory());
    this.container
      .querySelector('#logout-btn')
      ?.addEventListener('click', () => this.callbacks.onLogout());
  }

  private promptAddWorkout(): void {
    const name = prompt('Name des neuen Workouts:');
    if (name && name.trim()) {
      const w = this.store.addWorkout(name.trim());
      this.callbacks.onOpenWorkout(w.id);
    }
  }
}