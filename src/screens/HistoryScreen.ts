// src/screens/HistoryScreen.ts
// Verlaufs-Ansicht: Kalender (Monat), Tagesliste mit Drill-down und
// Tages-Zusammenfassung (Volumen, Sätze, PRs, Einheiten) — Mockup-konform.

import type { WorkoutSnapshot, ExerciseHistoryEntry } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { escapeHtml, formatNumber } from '../lib/utils';
import { tabBarHtml, bindTabBar, type TabBarActions } from '../components/TabBar';

export interface HistoryCallbacks {
  onWorkouts: () => void;
  onStats: () => void;
  onProfile: () => void;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatDurationMin(sec: number | undefined): string {
  if (sec === undefined || sec <= 0) return '—';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} Min.` : `${h} h`;
}

export class HistoryScreen {
  private expanded: number | null = null;
  private viewYear: number;
  private viewMonth: number; // 0..11
  private selectedKey: string;

  constructor(
    private container: HTMLElement,
    private store: WorkoutStore,
    private callbacks: HistoryCallbacks,
  ) {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.selectedKey = dayKeyOf(now);
  }

  mount(): void {
    this.render();
  }

  private tabActions(): TabBarActions {
    return {
      onWorkouts: () => this.callbacks.onWorkouts(),
      onHistory: () => {},
      onStats: () => this.callbacks.onStats(),
      onProfile: () => this.callbacks.onProfile(),
    };
  }

  /** Gruppiert alle Abschlüsse nach Kalendertag (YYYY-MM-DD). */
  private byDay(): Map<string, WorkoutSnapshot[]> {
    const map = new Map<string, WorkoutSnapshot[]>();
    for (const h of this.store.getHistory()) {
      const k = dayKeyOf(new Date(h.date));
      const arr = map.get(k) ?? [];
      arr.push(h);
      map.set(k, arr);
    }
    return map;
  }

  /** Anzahl neuer PRs an diesem Tag (Übung besser als an allen früheren Tagen). */
  private prCountForDay(dayKey: string): number {
    const entries = this.store.getExerciseHistory();
    const bestBefore = new Map<string, number>();
    for (const e of entries) {
      if (dayKeyOf(new Date(e.date)) >= dayKey) continue; // nur strikt frühere Tage
      bestBefore.set(e.exerciseName, Math.max(bestBefore.get(e.exerciseName) ?? 0, e.topWeight));
    }
    let prs = 0;
    for (const e of entries) {
      if (dayKeyOf(new Date(e.date)) !== dayKey) continue;
      if (e.topWeight > 0 && e.topWeight > (bestBefore.get(e.exerciseName) ?? 0)) prs++;
    }
    return prs;
  }

  private daySummary(selected: WorkoutSnapshot[], dayKey: string): string {
    const volume = selected.reduce((s, h) => s + h.volume, 0);
    const doneSets = selected.reduce((s, h) => s + h.doneSets, 0);
    const totalSets = selected.reduce((s, h) => s + h.totalSets, 0);
    const prs = this.prCountForDay(dayKey);

    return `
      <div class="grid grid-cols-2 gap-3 mt-4">
        <div class="kpi-card">
          <p class="kpi-label">Gesamtvolumen</p>
          <p class="kpi-value">${formatNumber(volume, 0)}<span class="kpi-unit"> kg</span></p>
          <span class="trend trend-flat">an diesem Tag</span>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Sätze</p>
          <p class="kpi-value">${doneSets}<span class="kpi-unit">/${totalSets}</span></p>
          <span class="trend ${doneSets >= totalSets ? 'trend-up' : 'trend-flat'}">erledigt</span>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Neue PRs</p>
          <p class="kpi-value">${prs}</p>
          <span class="trend ${prs > 0 ? 'trend-up' : 'trend-flat'}">Bestwerte</span>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Trainingseinheiten</p>
          <p class="kpi-value">${selected.length}</p>
          <span class="trend trend-flat">Workouts</span>
        </div>
      </div>
    `;
  }

  private render(): void {
    const byDay = this.byDay();
    const hasAny = this.store.getHistory().length > 0;
    const selected = byDay.get(this.selectedKey) ?? [];

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pb-32 pt-4 fade-in">
        <header class="flex items-center justify-between py-4">
          <div>
            <h1 class="text-xl font-bold text-white">Verlauf</h1>
            <p class="text-xs text-slate-400 mt-0.5">${MONTHS[this.viewMonth]} ${this.viewYear}</p>
          </div>
          <span class="chip">${this.store.getHistory().length} Workouts</span>
        </header>

        ${
          hasAny
            ? `
              ${this.calendar(byDay)}
              <div class="mt-5">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-semibold text-slate-300 capitalize">${escapeHtml(formatDayLabel(this.selectedKey))}</p>
                  ${selected.length ? `<span class="text-xs text-slate-500">${selected.length} Workout${selected.length > 1 ? 's' : ''}</span>` : ''}
                </div>
                ${
                  selected.length
                    ? `<div class="space-y-2">${selected.map((h, i) => this.historyItem(h, i)).join('')}</div>`
                    : `<div class="rounded-xl border border-line bg-panel px-6 py-8 text-center">
                        <p class="text-slate-400 text-sm">Kein Training an diesem Tag.</p>
                      </div>`
                }
                ${selected.length ? this.daySummary(selected, this.selectedKey) : ''}
              </div>
            `
            : `<div class="rounded-xl border border-line bg-panel px-6 py-10 text-center mt-4">
                <p class="text-3xl">💪</p>
                <p class="text-slate-300 font-semibold mt-3">Noch keine Workouts abgeschlossen.</p>
                <p class="text-xs text-slate-500 mt-1">Starte dein erstes Training!</p>
              </div>`
        }
      </div>

      ${tabBarHtml('history', this.tabActions())}
    `;

    this.bind();
  }

  private calendar(byDay: Map<string, WorkoutSnapshot[]>): string {
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const firstOffset = (new Date(this.viewYear, this.viewMonth, 1).getDay() + 6) % 7; // Mo = 0
    const todayKey = dayKeyOf(new Date());

    const cells: string[] = [];
    for (let i = 0; i < firstOffset; i++) cells.push('<span></span>');
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${this.viewYear}-${pad(this.viewMonth + 1)}-${pad(d)}`;
      const has = byDay.has(key);
      const isSelected = key === this.selectedKey;
      const isToday = key === todayKey;

      const base = 'relative aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition';
      const tone = has
        ? 'font-semibold text-white bg-panel2'
        : isToday
          ? 'text-accent-400 hover:bg-panel2'
          : 'text-slate-400 hover:bg-panel2';
      const ring = isSelected ? ' ring-2 ring-accent-400' : '';

      cells.push(`
        <button data-day="${key}" class="${base} ${tone}${ring}">
          ${d}
          ${has ? '<span class="mt-0.5 w-1 h-1 rounded-full bg-accent-400"></span>' : ''}
        </button>
      `);
    }

    return `
      <div class="rounded-2xl border border-line bg-panel p-4">
        <div class="flex items-center justify-between mb-3">
          <button id="cal-prev" class="icon-btn" aria-label="Vorheriger Monat">‹</button>
          <span class="font-semibold text-white text-sm">${MONTHS[this.viewMonth]} ${this.viewYear}</span>
          <button id="cal-next" class="icon-btn" aria-label="Nächster Monat">›</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500 mb-1">
          ${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1">
          ${cells.join('')}
        </div>
      </div>
    `;
  }

  private historyItem(h: WorkoutSnapshot, index: number): string {
    const open = this.expanded === index;
    return `
      <div class="exercise-card">
        <button class="w-full text-left px-4 py-4 min-h-[44px]" data-hist="${index}">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-white">${escapeHtml(h.name)}</p>
              <p class="text-xs text-slate-400 mt-0.5">
                ${formatTime(h.date)} Uhr · Dauer ${formatDurationMin(h.durationSec)} · ${h.doneSets}/${h.totalSets} Sätze · ${formatNumber(h.volume, 0)} kg
              </p>
            </div>
            <span class="text-slate-500 text-lg ml-3">${open ? '⌃' : '›'}</span>
          </div>
        </button>
        ${open ? this.detailPanel(h) : ''}
      </div>
    `;
  }

  private detailPanel(h: WorkoutSnapshot): string {
    const exs = h.exercises;
    if (!exs || exs.length === 0) {
      return `<div class="px-4 pb-4 text-xs text-slate-500">Keine Detaildaten für diesen Eintrag.</div>`;
    }
    return `
      <div class="px-4 pb-4 pt-3 border-t border-lineSoft space-y-1.5">
        <p class="text-[11px] uppercase tracking-wider text-slate-500">Übungen</p>
        ${exs.map((e) => this.detailRow(e)).join('')}
      </div>
    `;
  }

  private detailRow(e: ExerciseHistoryEntry): string {
    const perf =
      e.topWeight > 0
        ? `${formatNumber(e.topWeight, 1)} kg × ${e.topReps}`
        : `${e.topReps} Wdh`;
    return `
      <div class="flex justify-between text-sm">
        <span class="text-slate-300">${escapeHtml(e.exerciseName)}</span>
        <span class="text-slate-400">${perf}</span>
      </div>
    `;
  }

  private bind(): void {
    this.container.querySelector('#cal-prev')?.addEventListener('click', () => {
      this.viewMonth -= 1;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear -= 1;
      }
      this.render();
    });

    this.container.querySelector('#cal-next')?.addEventListener('click', () => {
      this.viewMonth += 1;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear += 1;
      }
      this.render();
    });

    this.container.querySelectorAll('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedKey = btn.getAttribute('data-day') ?? this.selectedKey;
        this.expanded = null;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-hist]').forEach((el) => {
      el.addEventListener('click', () => {
        const i = Number(el.getAttribute('data-hist'));
        this.expanded = this.expanded === i ? null : i;
        this.render();
      });
    });

    bindTabBar(this.container, this.tabActions());
  }
}
