// src/services/validation.ts
// Gemeinsame Validierung + Fehlermodell für Auth-Services (real & mock).

export type AuthErrorCode =
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'MISSING_USERNAME'
  | 'EMAIL_IN_USE'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NOT_AUTHENTICATED'
  | 'UNKNOWN';

/** Typisierter Auth-Fehler mit stabilem Code + nutzerfreundlicher Meldung. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): void {
  if (!email || !EMAIL_RE.test(email.trim())) {
    throw new AuthError('INVALID_EMAIL', 'Bitte eine gültige E-Mail-Adresse eingeben.');
  }
}

export function validatePassword(password: string): void {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(
      'WEAK_PASSWORD',
      `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    );
  }
}

export function validateUsername(username: string): void {
  if (!username || !username.trim()) {
    throw new AuthError('MISSING_USERNAME', 'Bitte einen Benutzernamen angeben.');
  }
}
