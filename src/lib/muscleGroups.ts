// src/lib/muscleGroups.ts
// Gemeinsame Muskelgruppen-Auswahl (Label + Kürzel) für Editor und Statistik.

import type { MuscleGroup } from '../types';

export interface MuscleGroupOption {
  value: MuscleGroup;
  label: string;
}

export const MUSCLE_GROUP_OPTIONS: MuscleGroupOption[] = [
  { value: 'chest', label: 'Brust' },
  { value: 'back', label: 'Rücken' },
  { value: 'shoulders', label: 'Schultern' },
  { value: 'biceps', label: 'Bizeps' },
  { value: 'triceps', label: 'Trizeps' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Beinbeuger' },
  { value: 'glutes', label: 'Gesäß' },
  { value: 'calves', label: 'Waden' },
  { value: 'core', label: 'Rumpf / Core' },
];

/** Liefert das lesbare Label zu einer Gruppe (Schlüssel oder „Sonstige“). */
export function muscleGroupLabel(group: string): string {
  if (group === 'Sonstige') return 'Sonstige';
  return MUSCLE_GROUP_OPTIONS.find((o) => o.value === group)?.label ?? group;
}