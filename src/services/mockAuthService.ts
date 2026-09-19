// src/services/mockAuthService.ts
// Lokaler Mock-Auth-Service (LocalStorage) – gleiche Schnittstelle wie AuthService.

import type { User, SignUpInput, IAuthService } from '../types';
import {
  AuthError,
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation';
import { mockStore, type StoredUser } from './mockStore';

const LATENCY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockAuthService implements IAuthService {
  constructor() {
    mockStore.seedDemoUser();
  }

  async signUp(input: SignUpInput): Promise<User> {
    validateEmail(input.email);
    validatePassword(input.password);
    validateUsername(input.username);

    await delay(LATENCY_MS);

    const email = input.email.trim().toLowerCase();
    const users = mockStore.getUsers();

    if (users.some((u) => u.email === email)) {
      throw new AuthError('EMAIL_IN_USE', 'Diese E-Mail-Adresse ist bereits registriert.');
    }

    const id = crypto.randomUUID();
    const username = input.username.trim();
    const user: StoredUser = {
      id,
      email,
      password: input.password,
      username,
      profile: {
        user_id: id,
        username,
        target_goal: 'Muscle Gain',
        starting_weight: 0,
        current_weight: 0,
        height: 0,
        created_at: new Date().toISOString(),
      },
    };

    users.push(user);
    mockStore.saveUsers(users);
    mockStore.setSessionUserId(id);

    return { id, email };
  }

  async signIn(email: string, password: string): Promise<User> {
    validateEmail(email);

    await delay(LATENCY_MS);

    const normalized = email.trim().toLowerCase();
    const user = mockStore.getUsers().find((u) => u.email === normalized);

    if (!user || user.password !== password) {
      throw new AuthError('INVALID_CREDENTIALS', 'E-Mail oder Passwort ist falsch.');
    }

    mockStore.setSessionUserId(user.id);
    return { id: user.id, email: user.email };
  }

  async signOut(): Promise<void> {
    await delay(LATENCY_MS);
    mockStore.setSessionUserId(null);
  }

  async getCurrentUser(): Promise<User | null> {
    await delay(LATENCY_MS);
    const id = mockStore.getSessionUserId();
    if (!id) return null;
    const user = mockStore.getUsers().find((u) => u.id === id);
    return user ? { id: user.id, email: user.email } : null;
  }
}
