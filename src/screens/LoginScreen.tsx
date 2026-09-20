import { Component } from '../lib/Component';
import type { IAuthService } from '../types';
import { AuthError } from '../services/validation';

interface LoginProps {
  parent: HTMLElement;
  authService: IAuthService;
  onSuccess: () => void;
}

export class LoginScreen extends Component<LoginProps> {
  private loginForm: HTMLFormElement;
  private emailInput: HTMLInputElement;
  private passwordInput: HTMLInputElement;
  private loginButton: HTMLButtonElement;
  private demoButton: HTMLButtonElement;
  private errorMessage: HTMLElement;

  constructor(props: LoginProps) {
    super(props);
    this.emailInput = this.createElement('input', {
      type: 'email',
      placeholder: 'E-Mail',
      class: 'p-2 border rounded',
    });
    this.passwordInput = this.createElement('input', {
      type: 'password',
      placeholder: 'Passwort',
      class: 'p-2 border rounded',
    });
    this.loginButton = this.createElement('button', {
      type: 'submit',
      class: 'bg-blue-500 text-white p-2 rounded',
      textContent: 'Anmelden',
    });
    this.demoButton = this.createElement('button', {
      type: 'button',
      class: 'bg-gray-500 text-white p-2 rounded',
      textContent: 'Als Demo-User anmelden',
      onclick: () => this.handleSubmit('demo@example.com', 'Demo1234'),
    });
    this.errorMessage = this.createElement('div', { class: 'text-red-500' });
    this.loginForm = this.createElement('form', {
      class: 'space-y-4',
      onsubmit: (event) => {
        event.preventDefault();
        this.handleSubmit(this.emailInput.value, this.passwordInput.value);
      },
    });
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
    this.props.parent.appendChild(
      this.createElement('h2', { class: 'text-2xl font-bold', textContent: 'Anmelden' })
    );
    this.loginForm.appendChild(this.emailInput);
    this.loginForm.appendChild(this.passwordInput);
    this.loginForm.appendChild(this.loginButton);
    this.props.parent.appendChild(this.loginForm);
    this.props.parent.appendChild(this.demoButton);
    this.props.parent.appendChild(this.errorMessage);
  }
}
