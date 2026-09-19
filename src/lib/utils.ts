// src/lib/utils.ts
// Gemeinsame kleine Helfer für die UI.

/** Escaped nutzerkontrollierte Strings (Schutz vor HTML-Injection). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formatiert Sekunden als m:ss (z. B. 185 -> "3:05"). */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Formatiert eine Zahl lesbar (de-DE): Tausendertrennzeichen, max. Nachkommastellen. */
export function formatNumber(value: number, maxFractionDigits = 1): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: maxFractionDigits });
}
