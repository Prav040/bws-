// src/services/mockProfileService.ts
// Lokaler Mock-Profile-Service (LocalStorage).

import type { UserProfile, IProfileService } from '../types';
import { mockStore } from './mockStore';

export class MockProfileService implements IProfileService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = mockStore.getUsers().find((u) => u.id === userId);
    return user ? user.profile : null;
  }

  async upsertOwnProfile(userId: string, profile: UserProfile): Promise<void> {
    const users = mockStore.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    user.profile = { ...profile, user_id: userId };
    mockStore.saveUsers(users);
  }
}
