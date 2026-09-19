// src/services/serviceFactory.ts
// Zentrale Service-Factory: wählt Implementierungen anhand der
// Umgebungsvariablen (ADR-3: Interface + Mock/Real-Duo, Backend spät gebunden).

import type { IAuthService, IProfileService } from '../types';
import { createSupabaseClient } from '../lib/supabase';
import { AuthService } from './authService';
import { MockAuthService } from './mockAuthService';
import { ProfileService } from './profileService';
import { MockProfileService } from './mockProfileService';

/**
 * Liefert die passende `IAuthService`-Implementierung:
 * - Gültiger Supabase-Client (Envs gesetzt) → echte `AuthService`.
 * - Sonst → `MockAuthService` (LocalStorage, Demo-Nutzer `demo@bws.app`).
 */
export function createAuthService(): IAuthService {
  const client = createSupabaseClient(); // null, wenn Env-Variablen fehlen
  return client ? new AuthService(client) : new MockAuthService();
}

/**
 * Liefert die passende `IProfileService`-Implementierung:
 * - Gültiger Supabase-Client → echte `ProfileService`.
 * - Sonst → `MockProfileService`.
 */
export function createProfileService(): IProfileService {
  const client = createSupabaseClient(); // null, wenn Env-Variablen fehlen
  return client ? new ProfileService(client) : new MockProfileService();
}