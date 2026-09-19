// src/services/profileService.ts
// Supabase-Profile-Service – Zugriff auf die profiles-Tabelle.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, IProfileService } from '../types';

export class ProfileService implements IProfileService {
  constructor(private client: SupabaseClient) {}

  /**
   * Lädt das Profil eines Nutzers anhand seiner Auth-ID.
   * Liefert `null`, wenn (noch) kein Profil existiert.
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = keine Zeile gefunden -> kein Profil vorhanden
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as UserProfile;
  }
}
