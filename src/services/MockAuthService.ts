import { IAuthService, LoginResponse, User } from '../types';

export class MockAuthService implements IAuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    if (email === 'demo@fitness.com' && password === '123456') {
      const user: User = {
        id: 'demo-user-id',
        email: 'demo@fitness.com',
        name: 'Demo User',
      };

      // Speichere Benutzerdaten im Local Storage
      localStorage.setItem('user', JSON.stringify(user));

      return {
        success: true,
        user,
      };
    } else {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }
  }

  async logout(): Promise<void> {
    // Entferne Benutzerdaten aus dem Local Storage
    localStorage.removeItem('user');
  }

  async getCurrentUser(): Promise<User | null> {
    // Abrufen der Benutzerdaten aus dem Local Storage
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
