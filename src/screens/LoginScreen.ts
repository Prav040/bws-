// src/screens/LoginScreen.ts
// Login-Screen: E-Mail + Passwort, Validierung, Wechsel zu Registrieren.

import type { IAuthService } from '../types';

export class LoginScreen {
  constructor(
    private container: HTMLElement,
    private authService: IAuthService,
    private onAuthenticated: () => void,
    private onSwitchToRegister: () => void,
  ) {}

  mount(): void {
    this.container.innerHTML = `
      <div class="max-w-md mx-auto px-4 pt-12 fade-in">
        <h1 class="text-2xl font-bold text-white">Anmelden</h1>
        <p class="text-sm text-slate-400 mt-1">Willkommen zurück.</p>

        <form id="login-form" class="mt-6 space-y-4" novalidate>
          <div>
            <label class="block text-sm text-slate-300 mb-1" for="login-email">E-Mail</label>
            <input id="login-email" type="email" autocomplete="email" placeholder="du@beispiel.de"
              class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            <p id="login-email-error" class="text-red-400 text-xs mt-1 hidden"></p>
          </div>

          <div>
            <label class="block text-sm text-slate-300 mb-1" for="login-password">Passwort</label>
            <input id="login-password" type="password" autocomplete="current-password" placeholder="••••••••"
              class="w-full bg-panel2 border border-line rounded-xl px-4 py-3 text-white outline-none focus:border-accent-400" />
            <p id="login-password-error" class="text-red-400 text-xs mt-1 hidden"></p>
          </div>

          <div class="text-right">
            <button type="button" id="login-forgot" class="text-sm text-accent-400 hover:underline">
              Passwort vergessen?
            </button>
          </div>

          <p id="login-info" class="text-slate-400 text-xs hidden"></p>
          <p id="login-form-error" class="text-red-400 text-sm hidden"></p>

          <button type="submit" id="login-submit"
            class="w-full py-3.5 rounded-xl font-semibold text-white bg-accent-500 hover:bg-accent-600 transition">
            Anmelden
          </button>
        </form>

        <p class="text-sm text-slate-400 text-center mt-6">
          Noch kein Konto?
          <button id="login-to-register" class="text-accent-400 hover:underline">Registrieren</button>
        </p>
      </div>
    `;

    this.bind();
  }

  private bind(): void {
    this.container.querySelector('#login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.submit();
    });
    this.container
      .querySelector('#login-to-register')
      ?.addEventListener('click', () => this.onSwitchToRegister());
    this.container
      .querySelector('#login-forgot')
      ?.addEventListener('click', () => this.forgotPassword());
  }

  private async submit(): Promise<void> {
    const email = (this.container.querySelector('#login-email') as HTMLInputElement).value;
    const password = (this.container.querySelector('#login-password') as HTMLInputElement).value;

    this.clearErrors();

    let valid = true;
    if (!email.trim()) {
      this.showError('login-email-error', 'E-Mail ist erforderlich.');
      valid = false;
    }
    if (!password) {
      this.showError('login-password-error', 'Passwort ist erforderlich.');
      valid = false;
    }
    if (!valid) return;

    const submitBtn = this.container.querySelector('#login-submit') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Anmelden…';

    try {
      await this.authService.signIn(email, password);
      this.onAuthenticated();
    } catch (err) {
      this.showError(
        'login-form-error',
        err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.',
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Anmelden';
    }
  }

  private forgotPassword(): void {
    // Hinweis inline statt nativem alert() – kein blockierender Dialog.
    const el = this.container.querySelector('#login-info');
    if (el) {
      el.textContent = 'Passwort-Reset ist bald verfügbar.';
      el.classList.remove('hidden');
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
    const info = this.container.querySelector('#login-info');
    if (info) info.classList.add('hidden');
  }
}