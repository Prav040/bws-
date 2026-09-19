// src/screens/ExerciseEditor.ts
// Modal zum Anlegen/Bearbeiten einer Übung (Name, Muskelgruppe, Ziel, Pause, Notizen, Bild).

import type { Exercise, MuscleGroup } from '../types';
import { MUSCLE_GROUP_OPTIONS } from '../lib/muscleGroups';
import { escapeHtml } from '../lib/utils';

export interface ExerciseFormData {
  name: string;
  targetReps: number;
  restSec: number;
  notes: string;
  image: string | null;
  muscleGroup: MuscleGroup | null;
}

/** Liest eine Bilddatei, skaliert sie auf max. 800px und liefert eine JPEG-Data-URL. */
function fileToDataUrl(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

export class ExerciseEditor {
  private image: string | null;

  constructor(
    private container: HTMLElement,
    private initial: Exercise | null,
    private onSave: (data: ExerciseFormData) => void,
    private onClose: () => void,
  ) {
    this.image = initial?.image ?? null;
  }

  mount(): void {
    const ex = this.initial;
    const restMin = ex ? ex.restSec / 60 : 2;

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
        <div class="w-full max-w-md bg-panel border border-line rounded-t-2xl sm:rounded-2xl p-5 fade-in max-h-[90vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-white">${ex ? 'Übung bearbeiten' : 'Neue Übung'}</h2>

          <div class="mt-4 space-y-4">
            <div>
              <label class="block text-sm text-slate-300 mb-1">Name</label>
              <input id="ex-name" type="text" value="${escapeHtml(ex?.name ?? '')}" placeholder="z. B. Bankdrücken"
                class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            </div>

            <div>
              <label class="block text-sm text-slate-300 mb-1">Muskelgruppe</label>
              <select id="ex-muscle" class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400">
                <option value="">Keine / Sonstige</option>
                ${MUSCLE_GROUP_OPTIONS.map(
                  (g) =>
                    `<option value="${g.value}" ${ex?.muscleGroup === g.value ? 'selected' : ''}>${g.label}</option>`,
                ).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-slate-300 mb-1">Ziel-Wdh</label>
                <input id="ex-reps" type="number" min="1" value="${ex?.targetReps ?? 10}"
                  class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
              </div>
              <div>
                <label class="block text-sm text-slate-300 mb-1">Pause (Min.)</label>
                <input id="ex-rest" type="number" min="0" step="0.5" value="${restMin}"
                  class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
              </div>
            </div>

            <div>
              <label class="block text-sm text-slate-300 mb-1">Notizen (z. B. Geräteeinstellung)</label>
              <textarea id="ex-notes" rows="3" placeholder="Sitzhöhe, Griffweite, Maschinengewicht …"
                class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400 resize-none"></textarea>
            </div>

            <div>
              <label class="block text-sm text-slate-300 mb-1">Bild (Übung / Gerät)</label>
              <div id="ex-image-preview" class="mb-2 hidden">
                <img src="" class="w-full max-h-48 object-cover rounded-xl" alt="Vorschau" />
              </div>
              <div class="flex gap-2">
                <label id="ex-image-label" class="flex-1 text-center py-2.5 rounded-xl border border-line text-slate-300 cursor-pointer hover:border-accent-400 transition text-sm">
                  Bild hochladen
                  <input id="ex-image" type="file" accept="image/*" class="hidden" />
                </label>
                <button id="ex-image-remove" class="px-4 py-2.5 rounded-xl border border-line text-slate-400 hover:text-red-400 transition text-sm hidden">Entfernen</button>
              </div>
            </div>

            <p id="ex-error" class="text-red-400 text-sm hidden"></p>

            <div class="flex gap-3 pt-1">
              <button id="ex-cancel" class="flex-1 py-3 rounded-xl border border-line text-slate-300 hover:border-slate-500 transition">Abbrechen</button>
              <button id="ex-save" class="flex-1 py-3 rounded-xl font-semibold text-white bg-accent-500 hover:bg-accent-600 transition">Speichern</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Notizen sauber setzen (erhält Zeilenumbrüche)
    (this.container.querySelector('#ex-notes') as HTMLTextAreaElement).value = ex?.notes ?? '';
    this.updatePreview();
    this.bind();
  }

  private bind(): void {
    this.container.querySelector('#ex-cancel')?.addEventListener('click', () => this.onClose());
    this.container.querySelector('#ex-save')?.addEventListener('click', () => this.save());

    this.container.querySelector('#ex-image')?.addEventListener('change', async (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        this.image = await fileToDataUrl(file);
        input.value = '';
        this.updatePreview();
      } catch {
        this.showError('Bild konnte nicht gelesen werden.');
      }
    });

    this.container.querySelector('#ex-image-remove')?.addEventListener('click', () => {
      this.image = null;
      this.updatePreview();
    });
  }

  private updatePreview(): void {
    const preview = this.container.querySelector('#ex-image-preview') as HTMLElement;
    const img = preview.querySelector('img') as HTMLImageElement;
    const removeBtn = this.container.querySelector('#ex-image-remove') as HTMLElement;
    const label = this.container.querySelector('#ex-image-label') as HTMLElement;

    if (this.image) {
      img.src = this.image;
      preview.classList.remove('hidden');
      removeBtn.classList.remove('hidden');
      label.textContent = 'Bild ändern';
    } else {
      preview.classList.add('hidden');
      removeBtn.classList.add('hidden');
      label.textContent = 'Bild hochladen';
    }
  }

  private save(): void {
    const name = (this.container.querySelector('#ex-name') as HTMLInputElement).value.trim();
    const targetReps = Number((this.container.querySelector('#ex-reps') as HTMLInputElement).value);
    const restMin = Number((this.container.querySelector('#ex-rest') as HTMLInputElement).value);
    const notes = (this.container.querySelector('#ex-notes') as HTMLTextAreaElement).value;
    const groupValue = (this.container.querySelector('#ex-muscle') as HTMLSelectElement).value;
    const muscleGroup = (groupValue || null) as MuscleGroup | null;

    if (!name) {
      this.showError('Bitte einen Namen angeben.');
      return;
    }
    if (!targetReps || targetReps < 1) {
      this.showError('Bitte eine gültige Ziel-Wiederholung angeben.');
      return;
    }

    this.onSave({
      name,
      targetReps,
      restSec: Math.round(restMin * 60),
      notes,
      image: this.image,
      muscleGroup,
    });
  }

  private showError(message: string): void {
    const el = this.container.querySelector('#ex-error') as HTMLElement;
    el.textContent = message;
    el.classList.remove('hidden');
  }
}