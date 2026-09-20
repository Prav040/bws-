import { Component } from '../lib/Component';
import type { IAuthService } from '../types';
import { AuthError } from '../services/validation';

interface LoginProps {
  parent: HTMLElement;
  authService: IAuthService;
  onSuccess: () => void;
  onRegister: () => void;
}

export class LoginScreen extends Component<LoginProps> {
  private form: HTMLFormElement;
  private errorMessage: HTMLElement;

  constructor(props: LoginProps) {
    super(props);
    this.errorMessage = this.createElement('div', { class: 'text-red-500' });
    this.form = this.createLoginForm();
  }

  private createLoginForm(): HTMLFormElement {
    const form = this.createElement('form', {
      class: 'flex flex-col gap-4',
    });

    const emailInput = this.createElement('input', {
      type: 'email',
      placeholder: 'E-Mail',
      class: 'p-2 border rounded',
      value: 'demo@example.com', // Demo-Login-Daten voreingestellt
    });

    const passwordInput = this.createElement('input', {
      type: 'password',
      placeholder: 'Passwort',
      class: 'p-2 border rounded',
      value: 'Demo1234', // Demo-Login-Daten voreingestellt
    });

    const submitButton = this.createElement('button', {
      type: 'submit',
      class: 'bg-blue-500 text-white p-2 rounded',
      textContent: 'Anmelden',
    });

    const demoButton = this.createElement('button', {
      type: 'button',
      class: 'bg-gray-500 text-white p-2 rounded mt-4',
      textContent: 'Als Demo-User anmelden',
      onclick: () => {
        this.handleSubmit('demo@example.com', 'Demo1234');
      },
    });

    const registerLink = this.createElement('button', {
      type: 'button',
      class: 'text-blue-500 underline mt-2',
      textContent: 'Noch kein Account? Registrieren',
      onclick: () => this.props.onRegister(),
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput.value;
      const password = passwordInput.value;
      this.handleSubmit(email, password);
    });

    form.append(
      this.createElement('h2', { class: 'text-2xl font-bold', textContent: 'Anmelden' }),
      emailInput,
      passwordInput,
      submitButton,
      demoButton,
      registerLink,
      this.errorMessage
    );

    return form;
  }

  private async handleSubmit(email: string, password: string): Promise<void> {
    try {
      await this.props.authService.signIn(email, password);
      this.props.onSuccess();
    } catch (error) {
      if (error instanceof AuthError) {
        this.errorMessage.textContent = error.message;
      } else {
        this.errorMessage.textContent = 'Ein unbekannter Fehler ist aufgetreten.';
      }
    }
  }

  mount(): void {
    this.props.parent.innerHTML = '';
    this.props.parent.appendChild(this.form);
  }
}
