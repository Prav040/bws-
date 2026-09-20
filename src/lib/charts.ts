// src/lib/charts.ts
// Kleine, dependency-freie SVG-Diagramme (Donut + Linien) in Design-Token-Farben.

import { formatNumber } from './utils';

/** Farbpalette für Serien/Segmente (DESIGN_SYSTEM-Tokens + abgeleitete Töne). */
export const CHART_COLORS = [
  '#0ea5e9', // accent
  '#a78bfa', // drop
  '#10b981', // success
  '#f59e0b', // warn
  '#38bdf8', // accent-hi
  '#fb7185',
  '#2dd4bf',
  '#94a3b8',
  '#818cf8',
  '#a3e635',
];

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${formatNumber(value / 1000, 1)}k`;
  }
  return formatNumber(value, 0);
}

/**
 * Donut-Diagramm: Segmente als gestrichelte Kreise (stroke-dasharray),
 * zentrale Anzeige = Gesamtsumme.
 */
export function donutChart(slices: DonutSlice[], size = 120): string {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) {
    return '<p class="text-xs text-slate-500">Keine Daten im gewählten Zeitraum.</p>';
  }

  const r = 20;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = slices
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = s.value / total;
      const len = frac * circumference;
      const seg = `<circle cx="25" cy="25" r="${r}" fill="none" stroke="${s.color ?? CHART_COLORS[i % CHART_COLORS.length]}" stroke-width="7" stroke-dasharray="${len.toFixed(2)} ${(circumference - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 25 25)" />`;
      offset += len;
      return seg;
    })
    .join('');

  const center = `
    <text x="25" y="24" text-anchor="middle" fill="#f8fafc" font-size="8.5" font-weight="700">${formatCompact(total)}</text>
    <text x="25" y="31.5" text-anchor="middle" fill="#64748b" font-size="4">kg gesamt</text>
  `;

  return `<svg viewBox="0 0 50 50" style="width:${size}px;height:${size}px" role="img" aria-label="Muskelgruppen-Verteilung">${segments}${center}</svg>`;
}

export interface ChartSeries {
  label: string;
  color: string;
  values: Array<number | null>;
}

/**
 * Linien-Diagramm (mehrere Serien, Lücken über null-Werte).
 * `xLabels` beschriftet die Buckets; erste/letzte Beschriftung werden angezeigt.
 */
export function lineChart(series: ChartSeries[], xLabels: string[], height = 150): string {
  if (xLabels.length === 0 || series.length === 0) {
    return '<p class="text-xs text-slate-500">Keine Daten für diese Übungen.</p>';
  }

  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  if (all.length === 0) {
    return '<p class="text-xs text-slate-500">Keine Daten für diese Übungen.</p>';
  }

  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const span = max - min || 1;

  const padX = 6;
  const padTop = 5;
  const padBottom = 9;
  const W = 100;
  const H = 46;

  const x = (i: number): number => padX + (i / Math.max(xLabels.length - 1, 1)) * (W - 2 * padX);
  const y = (v: number): number => H - padBottom - ((v - min) / span) * (H - padTop - padBottom);

  const grid = [0, 0.5, 1]
    .map((f) => {
      const gy = (H - padTop - padBottom) * (1 - f) + padTop;
      return `<line x1="${padX}" x2="${W - padX}" y1="${gy.toFixed(2)}" y2="${gy.toFixed(2)}" class="line-chart-grid" />`;
    })
    .join('');

  const paths = series
    .map((s) => {
      const segments: string[] = [];
      let current: string[] = [];
      s.values.forEach((v, i) => {
        if (v == null) {
          if (current.length >= 2) segments.push(`M ${current.join(' L ')}`);
          current = [];
          return;
        }
        current.push(`${x(i).toFixed(2)} ${y(v).toFixed(2)}`);
      });
      if (current.length >= 2) segments.push(`M ${current.join(' L ')}`);
      return { s, d: segments.join(' ') };
    })
    .filter(({ d }) => d.length > 0);

  const pathElements = paths
    .map(
      ({ s, d }) =>
        `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" />`,
    )
    .join('');

  const lastDots = series
    .map((s) => {
      const idx = s.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
      if (idx === undefined) return '';
      const v = s.values[idx] as number;
      return `<circle cx="${x(idx).toFixed(2)}" cy="${y(v).toFixed(2)}" r="1.3" fill="${s.color}" />`;
    })
    .join('');

  const labels = `
    <text x="${padX}" y="${H - 2.5}" class="line-chart-axis">${xLabels[0]}</text>
    <text x="${W - padX}" y="${H - 2.5}" text-anchor="end" class="line-chart-axis">${xLabels[xLabels.length - 1]}</text>
  `;

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${height}px" role="img" aria-label="Kraftentwicklung">
    ${grid}${pathElements}${lastDots}${labels}
  </svg>`;
}
