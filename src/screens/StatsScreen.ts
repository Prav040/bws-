// src/screens/StatsScreen.ts
// Statistik: Muskelgruppen-Aggregation (Zeitraum-/Gruppen-Filter) + Übungs-PR-Ansicht.

import type { ExerciseHistoryEntry, MuscleGroup, MuscleGroupStat } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { muscleGroupLabel } from '../lib/muscleGroups';
import { escapeHtml, formatNumber } from '../lib/utils';

export interface StatsCallbacks {
  onBack: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

interface ExerciseStat {
  name: string;
  entries: ExerciseHistoryEntry[];
  pr: number;
  last: ExerciseHistoryEntry;
  sessions: number;
}

const PERIOD_LABELS: Record<string, string> = {
  '7': '7 Tage',
  '30': '30 Tage',
  '90': '90 Tage',
  all: 'Gesamt',
};

export class StatsScreen {
  private periodDays: number | null = 30; // 7 | 30 | 90 | null (gesamt)
  private muscleFilter: MuscleGroup | 'all' = 'all';

  constructor(
    private container: HTMLElement,
    private store: WorkoutStore,
    private callbacks: StatsCallbacks,
  ) {}

  mount(): void {
    this.render();
  }

  /** Gruppiert die Übungs-Historie nach Übungsname (gesamt, für die PR-Ansicht). */
  private buildStats(): ExerciseStat[] {
    const byName = new Map<string, ExerciseHistoryEntry[]>();
    for (const e of this.store.getExerciseHistory()) {
      const arr = byName.get(e.exerciseName) ?? [];
      arr.push(e);
      byName.set(e.exerciseName, arr);
    }

    const stats: ExerciseStat[] = [];
    byName.forEach((entries, name) => {
      entries.sort((a, b) => (a.date < b.date ? -1 : 1));
      let pr = 0;
      entries.forEach((e) => {
        if (e.topWeight > pr) pr = e.topWeight;
      });
      stats.push({
        name,
        entries,
        pr,
        last: entries[entries.length - 1],
        sessions: entries.length,
      });
    });

    stats.sort((a, b) => (a.last.date < b.last.date ? 1 : -1));
    return stats;
  }

  private render(): void {
    const stats = this.buildStats();

    const now = Date.now();
    const from = this.periodDays ? now - this.periodDays * 86_400_000 : undefined;
    const muscleStats = this.store.getMuscleVolume(from, now);
    const filtered =
      this.muscleFilter === 'all'
        ? muscleStats
        : muscleStats.filter((m) => m.group === this.muscleFilter);

    const periodKey = this.periodDays === null ? 'all' : String(this.periodDays);

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pb-32 pt-4 fade-in">
        <header class="flex items-center justify-between py-4">
          <button id="back-btn" class="min-h-[44px] text-slate-400 hover:text-white text-sm">‹ Zurück</button>
          <h1 class="text-lg font-bold text-white">Statistiken</h1>
          <span class="w-10"></span>
        </header>

        <!-- Filter -->
        <div class="flex gap-1.5 mt-2">
          ${['7', '30', '90', 'all']
            .map(
              (k) => `
                <button data-period="${k}"
                  class="chip ${periodKey === k ? 'chip-accent' : ''}">
                  ${PERIOD_LABELS[k]}
                </button>`,
            )
            .join('')}
        </div>

        <select id="muscle-filter"
          class="w-full mt-3 bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400">
          <option value="all">Alle Muskelgruppen</option>
          ${['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core']
            .map(
              (g) =>
                `<option value="${g}" ${this.muscleFilter === g ? 'selected' : ''}>${escapeHtml(muscleGroupLabel(g))}</option>`,
            )
            .join('')}
        </select>

        <!-- Muskelgruppen-Aggregation -->
        <h2 class="text-sm font-semibold text-slate-300 mt-5 mb-2">Muskelgruppen · ${PERIOD_LABELS[periodKey]}</h2>
        ${
          filtered.length
            ? `<div class="grid grid-cols-2 gap-3">${filtered.map((m) => this.muscleCard(m)).join('')}</div>`
            : `<div class="rounded-xl border border-line bg-panel px-4 py-6 text-center text-sm text-slate-400">Keine Daten im gewählten Zeitraum.</div>`
        }

        <!-- Übungen / PR -->
        <h2 class="text-sm font-semibold text-slate-300 mt-6 mb-2">Übungen / PR (gesamt)</h2>
        ${
          stats.length
            ? `<div class="space-y-3">${stats.map((s) => this.statCard(s)).join('')}</div>`
            : `<div class="rounded-xl border border-line bg-panel px-4 py-6 text-center text-sm text-slate-400">
                Noch keine Workouts abgeschlossen. Starte dein erstes Training!
              </div>`
        }
      </div>
    `;

    this.bind();
  }

  private muscleCard(m: MuscleGroupStat): string {
    return `
      <div class="kpi-card">
        <p class="kpi-label">${escapeHtml(muscleGroupLabel(m.group))}</p>
        <p class="kpi-value">${formatNumber(m.volume, 0)}<span class="kpi-unit"> kg</span></p>
        <span class="trend trend-flat">${m.sets} Sätze · ${m.sessions}×</span>
      </div>
    `;
  }

  private statCard(s: ExerciseStat): string {
    const recent = s.entries.slice(-8);
    const maxW = Math.max(...s.entries.map((e) => e.topWeight), 1);

    const bars =
      s.pr > 0
        ? `<div class="flex items-end gap-1 h-14 mt-4">
            ${recent
              .map((e) => {
                const h = Math.round((e.topWeight / maxW) * 100);
                return `<div class="flex-1 rounded-t-sm bg-accent-500/50 hover:bg-accent-400/70 transition" style="height:${Math.max(h, 2)}%" title="${formatNumber(e.topWeight, 1)} kg"></div>`;
              })
              .join('')}
          </div>`
        : '';

    const recentRows = s.entries
      .slice(-3)
      .reverse()
      .map(
        (e) => `
        <div class="flex justify-between text-xs text-slate-400">
          <span>${formatDate(e.date)}</span>
          <span>${this.perf(e)}</span>
        </div>
      `,
      )
      .join('');

    return `
      <div class="exercise-card px-4 py-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-white">${escapeHtml(s.name)}</h3>
          <div class="flex gap-1.5">
            ${
              s.pr > 0
                ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-500/20 text-accent-400">PR ${formatNumber(s.pr, 1)} kg</span>`
                : ''
            }
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-panel2 text-slate-400">${s.sessions}×</span>
          </div>
        </div>

        <p class="text-xs text-slate-400 mt-1">Letztes: ${this.perf(s.last)}</p>

        ${bars}

        <div class="space-y-1 mt-3 pt-2 border-t border-line">
          ${recentRows}
        </div>
      </div>
    `;
  }

  /** Formatiert die Leistung eines Eintrags verständlich. */
  private perf(e: ExerciseHistoryEntry): string {
    return e.topWeight > 0
      ? `${formatNumber(e.topWeight, 1)} kg × ${e.topReps}`
      : `${e.topReps} Wdh`;
  }

  private bind(): void {
    this.container
      .querySelector('#back-btn')
      ?.addEventListener('click', () => this.callbacks.onBack());

    this.container.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-period')!;
        this.periodDays = v === 'all' ? null : Number(v);
        this.render();
      });
    });

    this.container.querySelector('#muscle-filter')?.addEventListener('change', (e) => {
      this.muscleFilter = (e.target as HTMLSelectElement).value as MuscleGroup | 'all';
      this.render();
    });
  }
}