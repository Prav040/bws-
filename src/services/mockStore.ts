// Mock-Store für LocalStorage-basierte Auth-Daten (Mock-Umgebung)

type StoredUser = {
  id: string;
  email: string;
  password: string;
  username: string;
  profile: {
    user_id: string;
    username: string;
    target_goal: string;
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
    if (!users.some(u => u.email === 'demo@fitness.com')) {
      users.push({
        id: 'demo-user-id',
        email: 'demo@fitness.com',
        password: '123456',
        username: 'Demo User',
        profile: {
          user_id: 'demo-user-id',
          username: 'Demo User',
          target_goal: 'Muscle Gain',
          starting_weight: 0,
          current_weight: 0,
          height: 0,
          created_at: new Date().toISOString(),
        },
      });
      this.saveUsers(users);
    }
  },
};