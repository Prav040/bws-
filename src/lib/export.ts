// src/lib/export.ts
// CSV-Export der Trainingsdaten (deutsches Excel-Format, Semikolon-getrennt, UTF-8 BOM).

import type { WorkoutStore } from '../services/workoutStore';

function toCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\n');
}

function download(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exportiert Übungs-Historie und abgeschlossene Workouts als zwei CSV-Dateien. */
export function exportWorkoutData(store: WorkoutStore): void {
  const exerciseRows: Array<Array<string | number>> = [
    ['Datum', 'Übung', 'Top-Gewicht (kg)', 'Top-Wdh', 'Volumen (kg)', 'Sätze', 'Muskelgruppe'],
  ];
  store.getExerciseHistory().forEach((e) => {
    exerciseRows.push([e.date, e.exerciseName, e.topWeight, e.topReps, e.volume, e.sets, e.muscleGroup ?? 'Sonstige']);
  });

  const workoutRows: Array<Array<string | number>> = [
    ['Datum', 'Workout', 'Sätze erledigt', 'Sätze gesamt', 'Volumen (kg)'],
  ];
  store.getHistory().forEach((h) => {
    workoutRows.push([h.date, h.name, h.doneSets, h.totalSets, h.volume]);
  });

  download('bwsplus-uebungen.csv', toCsv(exerciseRows));
  download('bwsplus-workouts.csv', toCsv(workoutRows));
}
