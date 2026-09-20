// src/services/mockStore.ts
// Lokaler Datenspeicher für den Mock-Auth-Service (LocalStorage).
// ACHTUNG: Passwörter liegen hier im Klartext – NUR für den lokalen Mock.

import type { UserProfile } from '../types';

export interface StoredUser {
  id: string;
  email: string;
  password: string; // Klartext – niemals in Produktion!
  username: string;
  profile: UserProfile;
}

const USERS_KEY = 'bwsplus:mock:users';
const SESSION_KEY = 'bwsplus:mock:session';
const SEED_KEY = 'bwsplus:mock:seeded';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const mockStore = {
  getUsers(): StoredUser[] {
    return readJSON<StoredUser[]>(USERS_KEY, []);
  },

  saveUsers(users: StoredUser[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getSessionUserId(): string | null {
    return localStorage.getItem(SESSION_KEY);
  },

  setSessionUserId(id: string | null): void {
    if (id === null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, id);
  },

  /** Legt einmalig einen Demo-Nutzer an, damit Login sofort testbar ist. */
  seedDemoUser(): void {
    if (localStorage.getItem(SEED_KEY)) return;
    localStorage.setItem(SEED_KEY, '1');

    const id = crypto.randomUUID();
    const demo: StoredUser = {
      id,
      email: 'demo@example.com',
      password: 'Demo1234',
      username: 'Demo',
      profile: {
        user_id: id,
        username: 'Demo',
        target_goal: 'Muscle Gain',
        starting_weight: 80,
        current_weight: 76.8,
        height: 180,
        created_at: new Date().toISOString(),
      },
    };
    this.saveUsers([demo]);
  },
};
