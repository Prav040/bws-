// src/screens/WorkoutListScreen.ts
// Übersicht aller Workouts + Erstellen; Navigation über die Bottom-Tab-Bar.

import type { Workout } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { escapeHtml } from '../lib/utils';
import { tabBarHtml, bindTabBar, type TabBarActions } from '../components/TabBar';

export interface WorkoutListCallbacks {
  onOpenWorkout: (workoutId: string) => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
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
          <span class="chip">${workouts.length} Pläne</span>
        </header>

        <div class="space-y-3 mt-2">
          ${workouts.map((w) => this.workoutCard(w)).join('')}
        </div>

        <button id="add-workout-btn" class="w-full mt-4 py-3.5 rounded-xl font-semibold text-accent-400 border border-dashed border-line hover:border-accent-400 transition">
          + Neues Workout
        </button>
      </div>

      ${tabBarHtml('workouts', this.tabActions())}
    `;

    this.bind();
  }

  private tabActions(): TabBarActions {
    return {
      onWorkouts: () => {},
      onHistory: () => this.callbacks.onOpenHistory(),
      onStats: () => this.callbacks.onOpenStats(),
      onProfile: () => this.callbacks.onOpenProfile(),
    };
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
    bindTabBar(this.container, this.tabActions());
  }

  private promptAddWorkout(): void {
    const name = prompt('Name des neuen Workouts:');
    if (name && name.trim()) {
      const w = this.store.addWorkout(name.trim());
      this.callbacks.onOpenWorkout(w.id);
    }
  }
}
