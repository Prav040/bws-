# DEV_FEEDBACK

## Aufgabe: W1 — Supabase-Auth über Service-Factory verdrahten (ADR-3)

**Status: Erfolg**

### Umgesetzt
- `src/services/serviceFactory.ts` neu angelegt. `createAuthService(): IAuthService`
  liefert bei gesetztem `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (→ gültiger
  Client) die echte `AuthService`-Implementierung, sonst den `MockAuthService`
  (Fallback, Demo-Nutzer `demo@bws.app`).
- `src/main.ts` nutzt jetzt `const authService = createAuthService();` statt des
  hartkodierten `new MockAuthService()`. Restlicher Ablauf unverändert.

### Verifikation
- `npm run typecheck` → OK (Exit 0)
- `vite build` → OK (62 Module, dist erzeugt)

### Hinweise
- Die Env-Prüfung auf „beide Variablen gesetzt“ liegt zentral in
  `createSupabaseClient()` (`src/lib/supabase.ts`); die Factory hält sie bewusst
  nicht doppelt vor, sondern fällt bei `null` auf den Mock zurück.
- Bundle wächst leicht (Jetzt wird `@supabase/supabase-js` über den echten
  `AuthService` tatsächlich importiert, vorher per Mock nie geladen).
- Live-Supabase-Flow braucht echte `VITE_SUPABASE_URL`/`ANON_KEY` in `.env`
  (hier nicht hinterlegt) — ohne `.env` greift weiterhin der Mock-Login.

---

## Aufgabe: W2 — Profil-KPIs füllen: echte Workout-Statistiken statt Platzhalter

**Status: Erfolg**

### Umgesetzt
- `src/types.ts`: neuer Typ `ProfileStats` (`totalWorkouts`, `currentStreak`, `totalVolume`).
- `src/services/workoutStore.ts`: `getProfileStats()` — Anzahl abgeschlossener
  Workouts, Streak (Kalendertage rückwärts ab heute mit ≥1 Workout) und
  Gesamtvolumen. Leere Historie → `0/0/0` (kein NaN).
- `src/services/serviceFactory.ts`: `createProfileService()` ergänzt — real
  (`ProfileService`) bei gültigem Client, sonst `MockProfileService`.
- `src/screens/ProfileScreen.ts`: Konstruktor um `WorkoutStore` erweitert; die
  Platzhalter-KPIs „Workouts“ und „Streak“ zeigen echte Werte.
- `src/screens/WorkoutListScreen.ts`: „👤 Profil“-Button im Header + Callback.
- `src/main.ts`: `showProfile()` mountet `ProfileScreen` mit `authService`,
  `profileService` und `store`; Logout wird korrekt weitergereicht (Single-SignOut).

### Verifikation
- `npm run typecheck` → OK (Exit 0)
- `vite build` → OK (65 Module, dist erzeugt)

### Hinweise
- Streak zählt ab heute rückwärts: ohne heutiges Workout steht die Anzeige auf 0
  (laut Task-Definition „ab heute“).
- Profil-Ansicht hat einen „‹ Zurück“-Button (zurück zur Workout-Liste) und den
  Abmelden-Button (zum Login) — kein toter Endpunkt mehr.
- Ohne `.env` läuft der komplette Mock-Flow: Login (Demo) → Workout abschließen →
  Profil zeigt korrekte KPIs.

---

## Aufgabe: W3 — Verlauf als eigene Ansicht + Muskelgruppen-/Zeitfilter in der Statistik

**Status: Erfolg**

### Voraussetzung: Muskelgruppen
- `src/types.ts`: neuer Union-Typ `MuscleGroup` (10 Gruppen), `Exercise.muscleGroup`,
  `ExerciseHistoryEntry.muscleGroup`, `WorkoutSnapshot.exercises?` sowie
  `MuscleGroupStat`.
- `src/lib/muscleGroups.ts` (neu): gemeinsame Label-/Options-Liste (Brust, Rücken, …)
  für Editor und Statistik.
- `src/services/workoutStore.ts`: statisches Mapping Name→Gruppe; `ex()` weist die
  Gruppe direkt zu; `normalize()` zieht `muscleGroup` bei Alt-Daten (Workouts wie
  History) nach; `completeWorkout()` schreibt die Gruppe in die Einträge.

### Teil 1 — Verlauf
- `src/screens/HistoryScreen.ts` (neu): chronologische Liste aller Abschlüsse mit
  Drill-down in die Übungs-Einzelleistungen; Empty-State „Noch keine Workouts …“;
  alte Einträge ohne Details → Hinweis „Keine Detaildaten“.
- `WorkoutListScreen`: Inline-Verlaub entfernt, „📋 Verlauf“-Einstieg im Header.
- `main.ts`: `showHistory()` + Navigation (zurück zur Liste).

### Teil 2 — Statistik
- `src/screens/StatsScreen.ts`: Zeitraum-Filter (7/30/90 Tage/Gesamt, Default 30)
  und Muskelgruppen-Filter („Alle“ + 10 Gruppen) oberhalb; neue Karten-Block je
  Muskelgruppe („X kg · Y Sätze · Z×“) über `getMuscleVolume(from, to)`; bestehende
  Übungs-/PR-Ansicht bleibt erhalten.

### Verifikation
- `npm run typecheck` → OK (Exit 0)
- `vite build` → OK (67 Module, dist erzeugt)

### Hinweise
- „Sessions“ = Anzahl abgeschlossener Workouts, in denen die Gruppe trainiert wurde
  (dedupliziert über den gemeinsamen Abschluss-Zeitstempel).
- `WorkoutSnapshot.exercises` ist optional, damit alte LocalStorage-Einträge ohne
  Details weiterhin lesbar bleiben (kein Crash, kein Datenverlust).