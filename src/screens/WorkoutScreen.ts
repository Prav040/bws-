// src/screens/WorkoutScreen.ts
// Workout-Logger: Übungen, Sätze (Stepper + Quick-Tap), Satz-Typen und Auto-Rest-Timer.

import type { Workout, Exercise, WorkoutSet, SetType } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { RestTimer } from '../services/restTimer';
import { ExerciseEditor } from './ExerciseEditor';
import { escapeHtml, formatDuration } from '../lib/utils';

export interface WorkoutCallbacks {
  onBack: () => void;
}

const SET_TYPES: SetType[] = ['normal', 'warmup', 'dropset', 'deload'];

const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  dropset: 'Drop-Set',
  deload: 'Deload',
};

const SET_TYPE_ABBR: Record<SetType, string> = {
  normal: '',
  warmup: 'W',
  dropset: 'D',
  deload: 'L',
};

export class WorkoutScreen {
  private timer = new RestTimer();
  private startTime = Date.now();

  constructor(
    private container: HTMLElement,
    private store: WorkoutStore,
    private workoutId: string,
    private callbacks: WorkoutCallbacks,
  ) {}

  mount(): void {
    this.render();
  }

  private render(): void {
    const w = this.store.getWorkout(this.workoutId);
    if (!w) {
      this.callbacks.onBack();
      return;
    }

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pb-48 pt-4 fade-in">
        <header class="flex items-center justify-between py-4">
          <button id="back-btn" class="min-h-[44px] text-slate-400 hover:text-white text-sm">‹ Zurück</button>
          <h1 class="text-lg font-bold text-white truncate px-2">${escapeHtml(w.name)}</h1>
          <button id="complete-btn" class="min-h-[44px] text-accent hover:text-accent-hi text-sm font-semibold">Fertig ✓</button>
        </header>

        <p class="px-1 -mt-1 mb-3 text-[11px] text-slate-500">
          Satznummer antippen = Typ ändern · W = Warm-up · D = Drop-Set · L = Deload
        </p>

        <div class="space-y-3">
          ${w.exercises.map((e) => this.exerciseCard(e)).join('')}
        </div>

        <button id="add-exercise-btn" class="w-full mt-4 py-3.5 rounded-xl font-semibold text-accent border border-dashed border-line hover:border-accent transition">
          + Übung hinzufügen
        </button>
      </div>

      <div id="rest-bar" class="fixed bottom-0 inset-x-0 z-40 hidden">
        <div class="rest-drawer max-w-md mx-auto">
          <div class="rest-ring" role="timer" aria-live="polite">
            <svg viewBox="0 0 64 64" class="rest-ring-svg">
              <circle class="rest-ring-bg" cx="32" cy="32" r="28" />
              <circle class="rest-ring-fill" cx="32" cy="32" r="28" id="rest-ring-progress"
                stroke-dasharray="175.9" stroke-dashoffset="0" />
            </svg>
            <span id="rest-countdown" class="rest-countdown">0:00</span>
          </div>
          <div class="rest-info">
            <p class="text-xs text-slate-400">Pause</p>
            <div class="flex gap-2 mt-1">
              <button id="rest-plus30" class="timer-btn">+30s</button>
              <button id="rest-skip" class="timer-btn timer-btn-accent">Überspringen</button>
              <button id="rest-cancel" class="timer-btn">Abbrechen</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bind(w);
    this.syncRestBar();
  }

  /* ------------------------------------------------------------------
     Karten
     ------------------------------------------------------------------ */

  private exerciseCard(e: Exercise): string {
    const doneSets = e.sets.filter((s) => s.done).length;
    const restMin = e.restSec / 60;
    const lastWeight = e.sets.find((s) => s.weight.trim() !== '')?.weight;
    const allDone = doneSets === e.sets.length && e.sets.length > 0;

    return `
      <div class="exercise-card" data-exercise="${e.id}">
        <div class="flex items-start justify-between px-4 py-3">
          <div class="min-w-0">
            <h3 class="font-semibold text-white">${escapeHtml(e.name)}</h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Ziel ${e.targetReps} Wdh · Pause ${restMin} Min.${lastWeight ? ` · Letztes ${escapeHtml(lastWeight)} kg` : ''}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="chip ${allDone ? 'chip-success' : ''}">${doneSets}/${e.sets.length}</span>
            <button class="icon-btn" data-edit="${e.id}" aria-label="Bearbeiten">✎</button>
            <button class="icon-btn icon-btn-danger" data-delete="${e.id}" aria-label="Löschen">🗑</button>
          </div>
        </div>

        ${e.image ? `<img src="${e.image}" class="w-full h-40 object-cover" alt="${escapeHtml(e.name)}" />` : ''}

        ${
          e.notes
            ? `<div class="px-4 py-2 text-xs text-slate-400 bg-panel2/50 border-t border-lineSoft">📝 ${escapeHtml(e.notes)}</div>`
            : ''
        }

        <div class="grid text-[10px] uppercase tracking-wider text-slate-500 px-4 pt-2 pb-1" style="grid-template-columns: 3rem 3rem 1fr 4.5rem 3rem; gap: .5rem;">
          <span class="text-center">Satz</span>
          <span class="text-center">✓</span>
          <span class="text-center">kg</span>
          <span class="text-center">Wdh</span>
          <span></span>
        </div>

        ${e.sets.map((s, i) => this.setRow(e.id, i, s)).join('')}

        <button data-addset="${e.id}" class="w-full py-3 min-h-[44px] text-sm text-accent hover:bg-accent/10 transition font-medium">+ Satz hinzufügen</button>
      </div>
    `;
  }

  private setRow(exId: string, idx: number, set: WorkoutSet): string {
    const type = set.type ?? 'normal';
    const abbr = SET_TYPE_ABBR[type];
    const label = SET_TYPE_LABEL[type];

    return `
      <div class="set-row ${set.done ? 'set-row-done' : ''}">
        <button class="set-num set-num-${type}" data-settype="${exId}:${idx}" title="${label}">
          <span class="set-num-idx">${idx + 1}</span>
          ${abbr ? `<span class="set-num-abbr">${abbr}</span>` : ''}
        </button>
        <button class="set-check" data-toggle="${exId}:${idx}" aria-pressed="${set.done}" aria-label="Satz erledigt"></button>
        <div class="stepper">
          <button class="stepper-btn" data-weight-step="${exId}:${idx}" data-delta="-2.5" aria-label="Gewicht verringern">−</button>
          <input type="number" inputmode="decimal" placeholder="kg" value="${escapeHtml(set.weight)}" data-weight="${exId}:${idx}" class="stepper-val" aria-label="Gewicht" />
          <button class="stepper-btn" data-weight-step="${exId}:${idx}" data-delta="2.5" aria-label="Gewicht erhöhen">+2.5</button>
        </div>
        <input type="number" inputmode="numeric" placeholder="Wdh" value="${escapeHtml(set.reps)}" data-reps="${exId}:${idx}" class="quick-tap" aria-label="Wiederholungen" />
        <button class="set-remove" data-removeset="${exId}:${idx}" aria-label="Satz entfernen">×</button>
      </div>
    `;
  }

  /* ------------------------------------------------------------------
     Events
     ------------------------------------------------------------------ */

  private bind(w: Workout): void {
    this.container.querySelector('#back-btn')?.addEventListener('click', () => {
      this.timer.stop();
      this.callbacks.onBack();
    });
    this.container
      .querySelector('#complete-btn')
      ?.addEventListener('click', () => this.complete(w));
    this.container
      .querySelector('#add-exercise-btn')
      ?.addEventListener('click', () => this.openEditor(null));

    this.container.querySelector('#rest-plus30')?.addEventListener('click', () => {
      this.timer.addTime(30);
      this.updateRestDisplay();
    });
    this.container.querySelector('#rest-skip')?.addEventListener('click', () => {
      this.timer.stop();
      this.syncRestBar();
    });
    this.container.querySelector('#rest-cancel')?.addEventListener('click', () => {
      this.timer.stop();
      this.syncRestBar();
    });

    this.container.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ex = w.exercises.find((e) => e.id === btn.getAttribute('data-edit'));
        if (ex) this.openEditor(ex);
      });
    });

    this.container.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => this.deleteExercise(btn.getAttribute('data-delete')!));
    });

    this.container.querySelectorAll('[data-addset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.addSet(this.workoutId, btn.getAttribute('data-addset')!);
        this.render();
      });
    });

    this.container.querySelectorAll('[data-settype]').forEach((btn) => {
      btn.addEventListener('click', () => this.onCycleSetType(btn.getAttribute('data-settype')!));
    });

    // Check-Button (Button statt Checkbox)
    this.container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => this.onToggle(btn));
    });

    // Gewicht/Wdh: Inhalt beim Antippen markieren (schnelles Überschreiben)
    this.container.querySelectorAll('[data-weight], [data-reps]').forEach((inp) => {
      inp.addEventListener('focus', () => (inp as HTMLInputElement).select());
    });

    // Gewicht-Stepper (− / +2.5)
    this.container.querySelectorAll('[data-weight-step]').forEach((btn) => {
      btn.addEventListener('click', () =>
        this.onStepWeight(btn.getAttribute('data-weight-step')!, Number(btn.getAttribute('data-delta'))),
      );
    });

    this.container.querySelectorAll('[data-weight]').forEach((inp) => {
      inp.addEventListener('input', () => this.onSetInput(inp as HTMLInputElement, 'weight'));
    });
    this.container.querySelectorAll('[data-reps]').forEach((inp) => {
      inp.addEventListener('input', () => this.onSetInput(inp as HTMLInputElement, 'reps'));
    });

    this.container.querySelectorAll('[data-removeset]').forEach((btn) => {
      btn.addEventListener('click', () => this.onRemoveSet(btn.getAttribute('data-removeset')!));
    });
  }

  private parseKey(key: string): { exId: string; idx: number } {
    const [exId, idx] = key.split(':');
    return { exId, idx: Number(idx) };
  }

  private onCycleSetType(key: string): void {
    const { exId, idx } = this.parseKey(key);
    const ex = this.store.getWorkout(this.workoutId)?.exercises.find((e) => e.id === exId);
    const current = ex?.sets[idx]?.type ?? 'normal';
    const next = SET_TYPES[(SET_TYPES.indexOf(current) + 1) % SET_TYPES.length];
    this.store.setSetType(this.workoutId, exId, idx, next);
    this.render();
  }

  private onToggle(btn: Element): void {
    const { exId, idx } = this.parseKey(btn.getAttribute('data-toggle')!);
    const becameDone = this.store.toggleSet(this.workoutId, exId, idx);
    if (becameDone) {
      const ex = this.store.getWorkout(this.workoutId)?.exercises.find((e) => e.id === exId);
      if (ex) this.startRest(ex);
    }
    this.render();
  }

  private onStepWeight(key: string, delta: number): void {
    const { exId, idx } = this.parseKey(key);
    const ex = this.store.getWorkout(this.workoutId)?.exercises.find((e) => e.id === exId);
    const set = ex?.sets[idx];
    if (!set) return;
    const current = Number(set.weight) || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    this.store.updateSet(this.workoutId, exId, idx, 'weight', String(next));
    this.render();
  }

  private onSetInput(inp: HTMLInputElement, field: 'weight' | 'reps'): void {
    const attr = field === 'weight' ? 'data-weight' : 'data-reps';
    const { exId, idx } = this.parseKey(inp.getAttribute(attr)!);
    this.store.updateSet(this.workoutId, exId, idx, field, inp.value);
  }

  private onRemoveSet(key: string): void {
    const { exId, idx } = this.parseKey(key);
    this.store.removeSet(this.workoutId, exId, idx);
    this.render();
  }

  private openEditor(exercise: Exercise | null): void {
    new ExerciseEditor(
      this.container,
      exercise,
      (data) => {
        if (exercise) {
          this.store.updateExercise(this.workoutId, exercise.id, data);
        } else {
          this.store.addExercise(this.workoutId, {
            id: crypto.randomUUID(),
            ...data,
            sets: [],
          });
        }
        this.render();
      },
      () => this.render(),
    ).mount();
  }

  private deleteExercise(exId: string): void {
    if (confirm('Übung wirklich löschen?')) {
      this.store.deleteExercise(this.workoutId, exId);
      this.render();
    }
  }

  private complete(w: Workout): void {
    const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    const doneSets = w.exercises.reduce(
      (n, e) => n + e.sets.filter((s) => s.done).length,
      0,
    );
    if (totalSets === 0) {
      alert('Noch keine Sätze eingetragen.');
      return;
    }
    if (doneSets < totalSets) {
      if (!confirm(`Nur ${doneSets}/${totalSets} Sätze abgeschlossen. Trotzdem beenden?`)) return;
    }
    this.timer.stop();
    const durationSec = Math.max(0, Math.round((Date.now() - this.startTime) / 1000));
    this.store.completeWorkout(this.workoutId, durationSec);
    this.callbacks.onBack();
  }

  /* ------------------------------------------------------------------
     Rest-Timer
     ------------------------------------------------------------------ */

  private startRest(exercise: Exercise): void {
    this.timer.start(exercise.restSec, {
      onTick: () => this.updateRestDisplay(),
      onDone: () => {
        this.flashRingDone();
        this.highlightExercise(exercise.id);
        setTimeout(() => this.syncRestBar(), 700);
      },
    });
    this.syncRestBar();
  }

  private updateRestDisplay(): void {
    const countdown = this.container.querySelector('#rest-countdown');
    const ring = this.container.querySelector('#rest-ring-progress');
    if (!countdown || !ring) return;

    const remaining = this.timer.getRemaining();
    const total = this.timer.getTotal();
    countdown.textContent = formatDuration(remaining);
    // Umfang bei r=28: 2π·28 ≈ 175.9
    const frac = total ? remaining / total : 0;
    ring.setAttribute('stroke-dashoffset', String(175.9 * (1 - frac)));
  }

  private flashRingDone(): void {
    const ring = this.container.querySelector('#rest-ring-progress');
    if (ring) ring.classList.add('rest-ring-done');
  }

  private syncRestBar(): void {
    const bar = this.container.querySelector('#rest-bar');
    if (!bar) return;
    if (this.timer.isRunning()) {
      bar.classList.remove('hidden');
      this.updateRestDisplay();
    } else {
      bar.classList.add('hidden');
    }
  }

  private highlightExercise(exId: string): void {
    const card = this.container.querySelector(`[data-exercise="${exId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-accent');
      setTimeout(() => card.classList.remove('ring-2', 'ring-accent'), 1500);
    }
  }
}