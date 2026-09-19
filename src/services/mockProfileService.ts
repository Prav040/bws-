// src/services/mockProfileService.ts
// Lokaler Mock-Profile-Service (LocalStorage).

import type { UserProfile, IProfileService } from '../types';
import { mockStore } from './mockStore';

export class MockProfileService implements IProfileService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = mockStore.getUsers().find((u) => u.id === userId);
    return user ? user.profile : null;
  }
}
