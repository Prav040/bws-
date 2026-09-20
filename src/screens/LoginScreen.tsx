import { Component } from '../lib/Component';
import type { IAuthService } from '../types';
import { AuthError } from '../services/validation';

interface LoginProps {
  parent: HTMLElement;
  authService: IAuthService;
  onSuccess: () => void;
}

export class LoginScreen extends Component<LoginProps> {
  private demoButton: HTMLButtonElement;
  private errorMessage: HTMLElement;

  constructor(props: LoginProps) {
    super(props);
    this.errorMessage = this.createElement('div', { class: 'text-red-500' });
    this.demoButton = this.createDemoButton();
  }

  private createDemoButton(): HTMLButtonElement {
    const demoButton = this.createElement('button', {
      type: 'button',
      class: 'bg-blue-500 text-white p-2 rounded',
      textContent: 'Als Demo-User anmelden',
      onclick: () => {
        this.handleSubmit('demo@example.com', 'Demo1234');
      },
    });

    return demoButton;
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
    this.props.parent.appendChild(this.demoButton);
    this.props.parent.appendChild(this.errorMessage);
  }
}
