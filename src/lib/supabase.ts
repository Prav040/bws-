// src/lib/supabase.ts
// Zentrale Supabase-Client-Factory – wird von Auth- und Profile-Service geteilt.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Erzeugt den Supabase-Client aus den Vite-Umgebungsvariablen.
 * Liefert `null`, wenn die Konfiguration fehlt (damit der Aufrufer
 * eine verständliche Fehlermeldung anzeigen kann).
 */
export function createSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,   // Token bleibt nach Neustart erhalten
      autoRefreshToken: true, // Session wird automatisch verlängert
    },
  });
}
