// Mock-Store für LocalStorage-basierte Auth-Daten (Mock-Umgebung)

import type { TargetGoal } from '../types';
import { DEMO_USER } from '../lib/demoUser';

export type StoredUser = {
  id: string;
  email: string;
  password: string;
  username: string;
  profile: {
    user_id: string;
    username: string;
    target_goal: TargetGoal;
    starting_weight: number;
    current_weight: number;
    height: number;
    created_at: string;
  };
};

export const mockStore = {
  _usersKey: 'mockUsers',
  _sessionUserIdKey: 'mockSessionUserId',

  getUsers(): StoredUser[] {
    const stored = localStorage.getItem(this._usersKey);
    return stored ? JSON.parse(stored) : [];
  },

  saveUsers(users: StoredUser[]) {
    localStorage.setItem(this._usersKey, JSON.stringify(users));
  },

  getSessionUserId(): string | null {
    return localStorage.getItem(this._sessionUserIdKey);
  },

  setSessionUserId(id: string | null) {
    if (id === null) {
      localStorage.removeItem(this._sessionUserIdKey);
    } else {
      localStorage.setItem(this._sessionUserIdKey, id);
    }
  },

  seedDemoUser() {
    const users = this.getUsers();
    if (!users.some((u) => u.email === DEMO_USER.email)) {
      users.push({
        id: 'demo-user-id',
        email: DEMO_USER.email,
        password: DEMO_USER.password,
        username: 'Demo User',
        profile: {
          user_id: 'demo-user-id',
          username: 'Demo User',
          target_goal: 'Muscle Gain',
          starting_weight: 82.5,
          current_weight: 80.2,
          height: 178,
          created_at: new Date().toISOString(),
        },
      });
      this.saveUsers(users);
    }
  },
};
