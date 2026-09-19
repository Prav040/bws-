// src/screens/RegisterScreen.ts
// Registrierungs-Screen: Username, E-Mail, Passwort + Validierung.

import type { IAuthService } from '../types';

const MIN_PASSWORD_LENGTH = 8;

export class RegisterScreen {
  constructor(
    private container: HTMLElement,
    private authService: IAuthService,
    private onAuthenticated: () => void,
    private onSwitchToLogin: () => void,
  ) {}

  mount(): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-12 fade-in">
        <h1 class="text-2xl font-bold text-white">Registrieren</h1>
        <p class="text-sm text-slate-400 mt-1">Erstelle dein Konto.</p>

        <form id="register-form" class="mt-6 space-y-4" novalidate>
          <div>
            <label class="block text-sm text-slate-300 mb-1" for="reg-username">Benutzername</label>
            <input id="reg-username" type="text" autocomplete="username" placeholder="Max"
              class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            <p id="reg-username-error" class="text-red-400 text-xs mt-1 hidden"></p>
          </div>

          <div>
            <label class="block text-sm text-slate-300 mb-1" for="reg-email">E-Mail</label>
            <input id="reg-email" type="email" autocomplete="email" placeholder="du@beispiel.de"
              class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            <p id="reg-email-error" class="text-red-400 text-xs mt-1 hidden"></p>
          </div>

          <div>
            <label class="block text-sm text-slate-300 mb-1" for="reg-password">Passwort</label>
            <input id="reg-password" type="password" autocomplete="new-password" placeholder="Mind. ${MIN_PASSWORD_LENGTH} Zeichen"
              class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            <p id="reg-password-error" class="text-red-400 text-xs mt-1 hidden"></p>
          </div>

          <div>
            <label class="block text-sm text-slate-300 mb-1" for="reg-confirm">Passwort bestätigen</label>
            <input id="reg-confirm" type="password" autocomplete="new-password" placeholder="••••••••"
              class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            <p id="reg-confirm-error" class="text-red-400 text-xs mt-1 hidden"></p>
          </div>

          <p id="reg-form-error" class="text-red-400 text-sm hidden"></p>

          <button type="submit" id="reg-submit"
            class="w-full py-3.5 rounded-xl font-semibold text-white bg-accent-500 hover:bg-accent-600 transition">
            Konto erstellen
          </button>
        </form>

        <p class="text-sm text-slate-400 text-center mt-6">
          Schon ein Konto?
          <button id="reg-to-login" class="text-accent-400 hover:underline">Anmelden</button>
        </p>
      </div>
    `;

    this.bind();
  }

  private bind(): void {
    this.container.querySelector('#register-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.submit();
    });
    this.container
      .querySelector('#reg-to-login')
      ?.addEventListener('click', () => this.onSwitchToLogin());
  }

  private async submit(): Promise<void> {
    const username = (this.container.querySelector('#reg-username') as HTMLInputElement).value;
    const email = (this.container.querySelector('#reg-email') as HTMLInputElement).value;
    const password = (this.container.querySelector('#reg-password') as HTMLInputElement).value;
    const confirm = (this.container.querySelector('#reg-confirm') as HTMLInputElement).value;

    this.clearErrors();

    let valid = true;
    if (!username.trim()) {
      this.showError('reg-username-error', 'Benutzername ist erforderlich.');
      valid = false;
    }
    if (!email.trim()) {
      this.showError('reg-email-error', 'E-Mail ist erforderlich.');
      valid = false;
    }
    if (!password) {
      this.showError('reg-password-error', 'Passwort ist erforderlich.');
      valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      this.showError(
        'reg-password-error',
        `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
      );
      valid = false;
    }
    if (confirm !== password) {
      this.showError('reg-confirm-error', 'Passwörter stimmen nicht überein.');
      valid = false;
    }
    if (!valid) return;

    const submitBtn = this.container.querySelector('#reg-submit') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Konto wird erstellt…';

    try {
      await this.authService.signUp({ email, password, username });
      this.onAuthenticated();
    } catch (err) {
      this.showError(
        'reg-form-error',
        err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.',
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Konto erstellen';
    }
  }

  private showError(id: string, message: string): void {
    const el = this.container.querySelector('#' + id);
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
    }
  }

  private clearErrors(): void {
    this.container
      .querySelectorAll('.text-red-400.text-xs.mt-1, .text-red-400.text-sm')
      .forEach((el) => el.classList.add('hidden'));
  }
}
