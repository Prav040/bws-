// src/screens/StatsScreen.ts
// Statistik: Zeitraum-Filter (Presets + dynamischer Datumsbereich) und
// Muskelgruppen-Mehrfachauswahl wirken auf ALLE Statistiken (Volumen-Karte,
// Donut, Muskelgruppen-Karten, Kraftentwicklungs-Chart, Übungs-/PR-Liste).

import type { ExerciseHistoryEntry, MuscleGroup, MuscleGroupStat } from '../types';
import type { WorkoutStore } from '../services/workoutStore';
import { muscleGroupLabel, MUSCLE_GROUP_OPTIONS } from '../lib/muscleGroups';
import { escapeHtml, formatNumber } from '../lib/utils';
import { donutChart, lineChart, CHART_COLORS, type ChartSeries } from '../lib/charts';
import { tabBarHtml, bindTabBar, type TabBarActions } from '../components/TabBar';

export interface StatsCallbacks {
  onWorkouts: () => void;
  onHistory: () => void;
  onProfile: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateInputValue(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface ExerciseStat {
  name: string;
  entries: ExerciseHistoryEntry[];
  pr: number;
  prDate: string;
  last: ExerciseHistoryEntry;
  sessions: number;
}

const PERIOD_LABELS: Record<string, string> = {
  '7': '7 Tage',
  '30': '30 Tage',
  '90': '90 Tage',
  all: 'Gesamt',
  custom: 'Eigener Zeitraum',
};

const KEY_EXERCISES = ['Kniebeugen', 'Bankdrücken', 'Kreuzheben'];

export class StatsScreen {
  private periodDays: number | null = 30; // 7 | 30 | 90 | null (gesamt)
  private customMode = false;
  private customFrom: string;
  private customTo: string;
  private muscleFilters = new Set<MuscleGroup>();
  private chartBucket: 'week' | 'month' | 'year' = 'month';

  constructor(
    private container: HTMLElement,
    private store: WorkoutStore,
    private callbacks: StatsCallbacks,
  ) {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
    this.customFrom = toDateInputValue(monthAgo);
    this.customTo = toDateInputValue(now);
  }

  mount(): void {
    this.render();
  }

  private tabActions(): TabBarActions {
    return {
      onWorkouts: () => this.callbacks.onWorkouts(),
      onHistory: () => this.callbacks.onHistory(),
      onStats: () => {},
      onProfile: () => this.callbacks.onProfile(),
    };
  }

  /* ------------------------------------------------------------------
     Filter-Pipeline: eine Quelle für alle Statistiken
     ------------------------------------------------------------------ */

  /** Aktiver Zeitraum in Epoche-ms (from undefined = gesamt). */
  private range(): { from?: number; to: number } {
    if (this.customMode) {
      const from = new Date(`${this.customFrom}T00:00:00`).getTime();
      const to = new Date(`${this.customTo}T23:59:59.999`).getTime();
      return { from: Math.min(from, to), to: Math.max(from, to) };
    }
    const now = Date.now();
    return { from: this.periodDays ? now - this.periodDays * 86_400_000 : undefined, to: now };
  }

  /** Übungs-Einträge im Zeitraum UND in den gewählten Muskelgruppen. */
  private filteredEntries(): ExerciseHistoryEntry[] {
    const { from, to } = this.range();
    return this.store.getExerciseHistory().filter((e) => {
      const ts = new Date(e.date).getTime();
      if (from !== undefined && ts < from) return false;
      if (ts > to) return false;
      if (this.muscleFilters.size > 0) {
        if (!e.muscleGroup || !this.muscleFilters.has(e.muscleGroup)) return false;
      }
      return true;
    });
  }

  /** Muskelgruppen-Aggregation im Zeitraum, gefiltert auf die Auswahl. */
  private muscleStats(): MuscleGroupStat[] {
    const { from, to } = this.range();
    const raw = this.store.getMuscleVolume(from, to);
    if (this.muscleFilters.size === 0) return raw;
    return raw.filter((m) => this.muscleFilters.has(m.group as MuscleGroup));
  }

  private periodLabel(): string {
    if (this.customMode) {
      return `${formatDateInputValue(this.customFrom)} – ${formatDateInputValue(this.customTo)}`;
    }
    return PERIOD_LABELS[this.periodDays === null ? 'all' : String(this.periodDays)];
  }

  /* ------------------------------------------------------------------
     Berechnungen
     ------------------------------------------------------------------ */

  /** Gruppiert die gefilterte Übungs-Historie nach Übungsname (für PR-Ansicht). */
  private buildStats(): ExerciseStat[] {
    const byName = new Map<string, ExerciseHistoryEntry[]>();
    for (const e of this.filteredEntries()) {
      const arr = byName.get(e.exerciseName) ?? [];
      arr.push(e);
      byName.set(e.exerciseName, arr);
    }

    const stats: ExerciseStat[] = [];
    byName.forEach((entries, name) => {
      entries.sort((a, b) => (a.date < b.date ? -1 : 1));
      let pr = 0;
      let prDate = entries[0]?.date ?? '';
      entries.forEach((e) => {
        if (e.topWeight > pr) {
          pr = e.topWeight;
          prDate = e.date;
        }
      });
      stats.push({
        name,
        entries,
        pr,
        prDate,
        last: entries[entries.length - 1],
        sessions: entries.length,
      });
    });

    stats.sort((a, b) => (a.last.date < b.last.date ? 1 : -1));
    return stats;
  }

  /** Buckets für den Kraftentwicklungs-Chart (Woche/Monat/Jahr). */
  private chartSeries(): { series: ChartSeries[]; labels: string[] } {
    const entries = this.filteredEntries().filter((e) => KEY_EXERCISES.includes(e.exerciseName));
    if (entries.length === 0) return { series: [], labels: [] };

    const timestamps = entries.map((e) => new Date(e.date).getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    if (maxTs - minTs < 86_400_000) return { series: [], labels: [] };

    const bucketMs =
      this.chartBucket === 'week' ? 7 * 86_400_000 : this.chartBucket === 'month' ? 30 * 86_400_000 : 365 * 86_400_000;

    const bucketStart = (ts: number): number => minTs + Math.floor((ts - minTs) / bucketMs) * bucketMs;
    const starts = [...new Set(entries.map((e) => bucketStart(new Date(e.date).getTime())))].sort((a, b) => a - b);
    if (starts.length === 0) return { series: [], labels: [] };

    const labels = starts.map((s) => {
      const d = new Date(s + bucketMs / 2);
      if (this.chartBucket === 'year') return String(d.getFullYear());
      if (this.chartBucket === 'month') return d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    });

    const series = KEY_EXERCISES.map((name, i) => {
      const values = starts.map((start) => {
        const inBucket = entries.filter(
          (e) => e.exerciseName === name && bucketStart(new Date(e.date).getTime()) === start,
        );
        if (inBucket.length === 0) return null;
        return Math.max(...inBucket.map((e) => e.topWeight));
      });
      return { label: name, color: CHART_COLORS[i % CHART_COLORS.length], values };
    }).filter((s) => s.values.some((v) => v != null));

    return { series, labels };
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  private render(): void {
    const stats = this.buildStats();
    const { from, to } = this.range();
    const muscle = this.muscleStats();
    const label = this.periodLabel();

    // Gesamtvolumen-Karte mit Vergleich zur Vorperiode (gleicher Gruppen-Filter).
    const volumeNow = muscle.reduce((s, m) => s + m.volume, 0);
    const prevTo = from !== undefined ? from - 1 : to;
    const prevFrom = from !== undefined ? from - (to - from) : undefined;
    const volumePrev =
      from !== undefined
        ? this.store
            .getMuscleVolume(prevFrom, prevTo)
            .filter((m) => this.muscleFilters.size === 0 || this.muscleFilters.has(m.group as MuscleGroup))
            .reduce((s, m) => s + m.volume, 0)
        : volumeNow;
    const delta = from !== undefined ? volumeNow - volumePrev : 0;
    const trendLabel =
      from === undefined
        ? 'gesamter Zeitraum'
        : delta > 0
          ? `↑ +${formatNumber(delta, 0)} kg vs. Vorperiode`
          : delta < 0
            ? `↓ ${formatNumber(delta, 0)} kg vs. Vorperiode`
            : '±0 kg vs. Vorperiode';
    const trendClass = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-flat';

    // Donut: Anteil je Muskelgruppe am Zeitraum-Volumen.
    const donutSlices = muscle.map((m, i) => ({
      label: muscleGroupLabel(m.group),
      value: m.volume,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    const donutTotal = muscle.reduce((s, m) => s + m.volume, 0);

    // Kraftentwicklungs-Chart (Schlüsselübungen, Bucket-Toggle).
    const { series, labels } = this.chartSeries();

    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pb-32 pt-4 fade-in">
        <header class="flex items-center justify-between py-4">
          <div>
            <h1 class="text-xl font-bold text-white">Statistiken</h1>
            <p class="text-xs text-slate-400 mt-0.5">Fortschrittsübersicht</p>
          </div>
        </header>

        <!-- Zeitraum-Filter -->
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${['7', '30', '90', 'all', 'custom']
            .map((k) => {
              const active = this.customMode ? k === 'custom' : this.periodDays === null ? k === 'all' : k === String(this.periodDays);
              return `<button data-period="${k}" class="chip ${active ? 'chip-accent' : ''}">${PERIOD_LABELS[k]}</button>`;
            })
            .join('')}
        </div>

        <!-- Dynamischer Datumsbereich -->
        ${
          this.customMode
            ? `
          <div class="grid grid-cols-2 gap-2 mt-3">
            <label class="block">
              <span class="text-[11px] uppercase tracking-wider text-slate-500">Von</span>
              <input type="date" id="date-from" value="${this.customFrom}"
                class="w-full mt-1 bg-panel2 border border-line rounded-xl px-3 py-3 text-white outline-none focus:border-accent-400" />
            </label>
            <label class="block">
              <span class="text-[11px] uppercase tracking-wider text-slate-500">Bis</span>
              <input type="date" id="date-to" value="${this.customTo}"
                class="w-full mt-1 bg-panel2 border border-line rounded-xl px-3 py-3 text-white outline-none focus:border-accent-400" />
            </label>
          </div>`
            : ''
        }

        <!-- Muskelgruppen-Mehrfachauswahl -->
        <div class="flex flex-wrap gap-1.5 mt-3">
          <button data-muscle="all" class="chip ${this.muscleFilters.size === 0 ? 'chip-accent' : ''}">Alle</button>
          ${MUSCLE_GROUP_OPTIONS.map(
            (g) => `
              <button data-muscle="${g.value}" class="chip ${this.muscleFilters.has(g.value) ? 'chip-accent' : ''}"
                aria-pressed="${this.muscleFilters.has(g.value)}">${g.label}</button>`,
          ).join('')}
        </div>

        <!-- Gesamtvolumen-Karte -->
        <div class="kpi-card mt-3">
          <p class="kpi-label">Gesamtvolumen · ${label}</p>
          <p class="kpi-value">${formatNumber(volumeNow, 0)}<span class="kpi-unit"> kg</span></p>
          <span class="trend ${trendClass}">${trendLabel}</span>
        </div>

        <!-- Muskelgruppen: Donut + Legende -->
        <h2 class="text-sm font-semibold text-slate-300 mt-5 mb-2">Muskelgruppen · ${label}</h2>
        <div class="rounded-2xl border border-line bg-panel p-4">
          <div class="flex items-center gap-4">
            ${donutChart(donutSlices, 110)}
            <div class="flex-1 space-y-1.5 min-w-0">
              ${
                donutTotal > 0
                  ? donutSlices
                      .map(
                        (s) => `
                        <div class="flex items-center gap-2 text-xs">
                          <span class="legend-dot" style="background:${s.color}"></span>
                          <span class="text-slate-300 truncate">${escapeHtml(s.label)}</span>
                          <span class="ml-auto text-slate-400 tabular-nums">${formatNumber(s.value, 0)} kg</span>
                        </div>`,
                      )
                      .join('')
                  : '<p class="text-xs text-slate-500">Keine Daten im gewählten Zeitraum.</p>'
              }
            </div>
          </div>
        </div>

        <!-- Muskelgruppen-Karten (Detail) -->
        ${
          muscle.length
            ? `<div class="grid grid-cols-2 gap-3 mt-3">${muscle.map((m) => this.muscleCard(m)).join('')}</div>`
            : ''
        }

        <!-- Kraftentwicklung -->
        <h2 class="text-sm font-semibold text-slate-300 mt-6 mb-2">Kraftentwicklung bei Schlüsselübungen</h2>
        <div class="rounded-2xl border border-line bg-panel p-4">
          <div class="flex gap-1.5 mb-3">
            ${(['week', 'month', 'year'] as const)
              .map(
                (b) => `
                  <button data-bucket="${b}" class="chip ${this.chartBucket === b ? 'chip-accent' : ''}">
                    ${b === 'week' ? 'Woche' : b === 'month' ? 'Monat' : 'Jahr'}
                  </button>`,
              )
              .join('')}
          </div>
          ${lineChart(series, labels, 150)}
          <div class="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            ${series
              .map(
                (s) => `
                <span class="flex items-center gap-1.5 text-xs text-slate-400">
                  <span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(s.label)}
                </span>`,
              )
              .join('')}
          </div>
        </div>

        <!-- Übungen / PR (folgt Zeitraum- & Muskelgruppen-Filter) -->
        <h2 class="text-sm font-semibold text-slate-300 mt-6 mb-2">Übungen / PR · ${label}</h2>
        ${
          stats.length
            ? `<div class="space-y-3">${stats.map((s) => this.statCard(s)).join('')}</div>`
            : `<div class="rounded-xl border border-line bg-panel px-4 py-6 text-center text-sm text-slate-400">
                Keine Übungen mit den gewählten Filtern.
              </div>`
        }
      </div>

      ${tabBarHtml('stats', this.tabActions())}
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

        <p class="text-xs text-slate-400 mt-1">
          Letztes: ${this.perf(s.last)}${s.pr > 0 ? ` · PR am ${formatDate(s.prDate)}` : ''}
        </p>

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
    this.container.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-period')!;
        if (v === 'custom') {
          this.customMode = true;
        } else {
          this.customMode = false;
          this.periodDays = v === 'all' ? null : Number(v);
        }
        this.render();
      });
    });

    this.container.querySelectorAll('[data-muscle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-muscle')!;
        if (v === 'all') {
          this.muscleFilters.clear();
        } else {
          const group = v as MuscleGroup;
          if (this.muscleFilters.has(group)) this.muscleFilters.delete(group);
          else this.muscleFilters.add(group);
        }
        this.render();
      });
    });

    this.container.querySelector('#date-from')?.addEventListener('change', (e) => {
      this.customFrom = (e.target as HTMLInputElement).value;
      this.customMode = true;
      this.render();
    });

    this.container.querySelector('#date-to')?.addEventListener('change', (e) => {
      this.customTo = (e.target as HTMLInputElement).value;
      this.customMode = true;
      this.render();
    });

    this.container.querySelectorAll('[data-bucket]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.chartBucket = btn.getAttribute('data-bucket') as 'week' | 'month' | 'year';
        this.render();
      });
    });

    bindTabBar(this.container, this.tabActions());
  }
}
