// src/services/authService.ts
// Supabase-Auth-Service – kapselt alle Auth-Aufrufe.
// Implementiert IAuthService (gleiche Schnittstelle wie der Mock).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { User, SignUpInput, IAuthService } from '../types';
import {
  AuthError,
  validateEmail,
  validatePassword,
  validateUsername,
} from './validation';

// Re-Export für Abwärtskompatibilität
export { AuthError };
export type { AuthErrorCode } from './validation';

export class AuthService implements IAuthService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Registriert einen neuen Nutzer.
   * Der Username wird in den user_metadata abgelegt; das Profil
   * (profiles-Tabelle) wird serverseitig per DB-Trigger erzeugt.
   */
  async signUp(input: SignUpInput): Promise<User> {
    validateEmail(input.email);
    validatePassword(input.password);
    validateUsername(input.username);

    try {
      const { data, error } = await this.client.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: { data: { username: input.username.trim() } },
      });

      if (error) throw error;

      // Supabase meldet bei bereits registrierter E-Mail keinen Fehler,
      // sondern liefert eine leere Session + keine Identities zurück.
      if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
        throw new AuthError('EMAIL_IN_USE', 'Diese E-Mail-Adresse ist bereits registriert.');
      }

      return this.toUser(data.user);
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  /** Meldet einen Nutzer mit E-Mail + Passwort an. */
  async signIn(email: string, password: string): Promise<User> {
    validateEmail(email);

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = (error.message ?? '').toLowerCase();
        // Nicht bestätigte E-Mail ist kein Problem falscher Zugangsdaten.
        if (msg.includes('not confirmed') || msg.includes('confirm')) {
          throw new AuthError(
            'EMAIL_NOT_CONFIRMED',
            'Diese E-Mail-Adresse ist noch nicht bestätigt. Bitte bestätige sie zuerst (Supabase-Dashboard → Authentication → Users → Confirm user).',
          );
        }
        // Supabase wirft bei falschen Zugangsdaten einen generischen Fehler.
        if (error.status === 400 || msg.includes('invalid')) {
          throw new AuthError('INVALID_CREDENTIALS', 'E-Mail oder Passwort ist falsch.');
        }
        throw error;
      }

      if (!data.user) {
        throw new AuthError('INVALID_CREDENTIALS', 'E-Mail oder Passwort ist falsch.');
      }

      return this.toUser(data.user);
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  /** Meldet den Nutzer ab und beendet die Session sauber. */
  async signOut(): Promise<void> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  /**
   * Liefert den aktuell eingeloggten Nutzer oder `null`,
   * wenn keine gültige Session existiert.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error) return null; // keine Session -> kein Nutzer
      return data.user ? this.toUser(data.user) : null;
    } catch {
      return null;
    }
  }

  /* ------------------------------------------------------------------
     Interne Helfer
     ------------------------------------------------------------------ */

  /** Mappt das Supabase-User-Objekt auf unser schlankes `User`-Interface. */
  private toUser(user: { id: string; email?: string | null }): User {
    return { id: user.id, email: user.email ?? '' };
  }

  /** Wandelt beliebige Fehler in unseren typisierten `AuthError` um. */
  private normalizeError(err: unknown): AuthError {
    if (err instanceof AuthError) return err;

    if (err && typeof err === 'object' && 'message' in err) {
      const msg = String((err as { message: unknown }).message).toLowerCase();

      if (msg.includes('already registered') || msg.includes('already been registered')) {
        return new AuthError('EMAIL_IN_USE', 'Diese E-Mail-Adresse ist bereits registriert.');
      }
      if (msg.includes('not confirmed') || msg.includes('confirm')) {
        return new AuthError(
          'EMAIL_NOT_CONFIRMED',
          'Diese E-Mail-Adresse ist noch nicht bestätigt. Bitte bestätige sie zuerst (Supabase-Dashboard → Authentication → Users → Confirm user).',
        );
      }
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return new AuthError('INVALID_CREDENTIALS', 'E-Mail oder Passwort ist falsch.');
      }
      if (msg.includes('password')) {
        return new AuthError('WEAK_PASSWORD', 'Das Passwort erfüllt die Anforderungen nicht.');
      }
      return new AuthError('UNKNOWN', (err as { message: string }).message);
    }

    return new AuthError('UNKNOWN', 'Ein unerwarteter Fehler ist aufgetreten.');
  }
}
