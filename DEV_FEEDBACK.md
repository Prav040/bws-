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

---

## Aufgabe W5 — Statistik-Filter-Überholung + Demo-Profil (2026-09-20)

**Status: Erfolg**

### Auftrag
1. Profil ist im Demo-Account leer — beheben.
2. Statistik: Zeitraum- und Muskelgruppen-Filter auf ALLE Statistiken anwenden.
3. Muskelgruppen: Mehrfachauswahl an besserer Stelle.
4. Zusätzlich dynamischer Datumsfilter (Von/Bis).

### Umgesetzt
- `StatsScreen` komplett überholt: einheitliche Filter-Pipeline
  (`range()` + `filteredEntries()` + `muscleStats()`) speist jetzt ALLE Blöcke
  (Gesamtvolumen-Karte, Donut, Muskelgruppen-Karten, Kraftentwicklungs-Chart,
  Übungs-/PR-Liste). PR-Berechnung folgt damit ebenfalls dem Zeitraum.
- Muskelgruppen-Filter als Chip-Mehrfachauswahl direkt unter dem Zeitraum-Filter
  (mit „Alle“-Reset) statt Select im Donut-Block; „Sonstige“-Einträge werden bei
  aktiver Auswahl ausgeblendet.
- Dynamischer Datumsbereich: Presets 7/30/90/Gesamt + „Eigener Zeitraum“ mit
  Von/Bis-Datumsfeldern (type=date); der Vorperioden-Vergleich funktioniert
  auch im Custom-Modus (vorheriges Fenster gleicher Länge).
- `ProfileScreen`: Fallback für den Demo-Account, wenn das Backend kein Profil
  liefert (aktuell: profiles-Tabelle fehlt in Supabase) — zeigt lokale
  Demo-Werte (82,5 → 80,2 kg, 178 cm) mit Chip „Testdaten“ und versucht bei
  jedem Aufruf ein Selbstheilungs-Upsert. Sobald die Tabelle existiert, wird
  das Profil persistiert und der Chip verschwindet.
- `IProfileService.upsertOwnProfile()` neu (real + mock); Mock-Demo-Profil hat
  jetzt echte Körpermaß-Werte statt 0.

### Verifikation
- `npm run typecheck` → OK, `npm run build` → OK.
- Browser (Real-Modus, Demo-Account): Profil zeigt Name/Ziel/„Testdaten“/
  Körpermaße; Statistik zeigt Mehrfach-Chips aktiv (Rücken+Brust → Donut-
  Legende nur diese Gruppen), Custom-Datumsbereich mit korrektem Zeitraum-
  Label und Trendzeile.

### Hinweise
- `sb_publishable_...`-Key niemals im Chat/Code veröffentlichen (gilt auch für
  `service_role` — niemals verwenden).
- Offen: profiles-Tabelle in Supabase weiterhin nicht angelegt (PGRST205) —
  SQL-Block ausführen, dann persistiert der Fallback das Profil automatisch.

---

## Aufgabe: Wartung — Demo-Account: Dummy-Daten automatisch laden + WorkoutStore reparieren

**Status: Erfolg**

### Ausgangslage
- `npm run typecheck` lief auf ~30 Fehler: der letzte Commit hatte
  `workoutStore.ts` auf alte Schemas (`completedAt`, `reps`/`weight`) zurückgebaut
  und die Mutations-Methoden (toggleSet, updateSet, addSet, …) entfernt, die
  `WorkoutScreen` benötigt.
- Demo-Zugangsdaten waren dreifach inkonsistent (Code: `demo@fitness.com`/`123456`,
  Doku: `demo@bws.app`/`demo1234`), und das Testdaten-Einspielen lief nur über einen
  fehlerhaften Console-Snippet (falscher LocalStorage-Key).

### Umgesetzt
- `workoutStore.ts` neu aufgebaut: volle Mutations-API wiederhergestellt,
  durchgängig aktuelles Schema (`WorkoutSnapshot.date/name/totalSets/doneSets/
  volume/durationSec/exercises`, `ExerciseHistoryEntry.topWeight/topReps/volume/
  sets/muscleGroup`), Warm-up-Sätze zählen nicht in die Statistik; zusätzlich
  Migration alter LocalStorage-Snapshots (kein Datenverlust) und Methoden
  `hasPersistedData()` + `seedDemoData()` (Datums-Shift auf heute).
- Neues `src/lib/demoUser.ts` als **eine** Quelle für den Demo-Account
  (`demo@bws.app` / `demo1234`); `mockStore`, `LoginScreen` und `main.ts` nutzen sie.
- `main.ts`: beim ersten Login des Demo-Accounts (E-Mail-Match) wird
  `public/testdata/seed-workouts.json` automatisch geladen — nur wenn der Account
  noch keine Daten hat (nicht-destruktiv); bei Fehler nur `console.warn`.
- Tote Duplikat-Datei `src/services/MockAuthService.ts` entfernt (brach den Build,
  nichts importierte sie; echte Implementierung ist `mockAuthService.ts`).
- Doku: `testdata/README.md` neu (automatisches Laden, Mock-/Real-Modus, Reset),
  `public/testdata/load.html` als Reset-Helfer, `docs/01`-Statuszeilen und
  `docs/03` (Strukturbaum, Demo-Seed-Leitlinie, Gap „Supabase verdrahtet“) angepasst.

### Verifikation
- `npm run typecheck` → OK (Exit 0)
- `vite build` → OK (68 Module, dist erzeugt)
- End-to-End im Browser (Mock-Modus, Port 5174): 1-Klick-Demo-Login → 3
  Seed-Vorlagen, Verlauf mit 25 Workouts, Statistik mit Muskelgruppen-Karten,
  Profil mit 25 Workouts / 3-Tage-Streak / 222.603 kg. Seed-Daten wurden
  automatisch auf das heutige Datum verschoben (142/142 Einträge mit Muskelgruppe).

### Hinweise
- Im Real-Modus (`.env` gesetzt) existiert der Demo-Nutzer bereits in Supabase,
  muss dort aber noch **bestätigt** werden (Authentication → Users → Confirm),
  damit der 1-Klick-Login funktioniert; außerdem `supabase/schema.sql` im SQL
  Editor ausführen (profiles-Tabelle + RLS + Trigger), sonst zeigt das Profil
  „Profil konnte nicht geladen werden.“.
- Der Demo-Seed greift nur bei leerem Store: hat der Demo-Account einmal eigene
  Daten, wird nichts überschrieben (Reset: siehe `testdata/README.md`).

---

## Aufgabe: W4 — UI an das Mockup angleichen (design/mockup.png)

**Status: Erfolg**

### Umgesetzt
- `src/components/TabBar.ts` (neu): Bottom-Tab-Bar (Workouts / Verlauf /
  Statistik / Profil) mit aktivem Zustand; ersetzt die Header-Buttons auf
  WorkoutList, History, Stats und Profile. Nur der Workout-Logger behält „‹ Zurück“.
- `src/lib/charts.ts` (neu): dependency-freie SVG-Diagramme (Donut + Mehr-Serien-
  Linien-Chart) in Design-Token-Farben.
- `src/lib/export.ts` (neu): CSV-Export (deutsches Excel-Format, Semikolon,
  UTF-8-BOM) — zwei Dateien: Übungs-Historie + abgeschlossene Workouts.
- `WorkoutListScreen`: Header aufgeräumt (Pläne-Chip), Navigation über Tabs.
- `HistoryScreen`: Tages-Zusammenfassung als KPI-Grid (Gesamtvolumen, Sätze
  erledigt/gesamt, Neue PRs, Trainingseinheiten); „Neue PRs“ wird aus der
  Übungs-Historie berechnet (besser als alle früheren Tage).
- `StatsScreen`: Gesamtvolumen-Karte mit Vorperioden-Vergleich (↑/↓-Badge),
  Muskelgruppen-Donut + Legende, Kraftentwicklungs-Linien-Chart
  (Kniebeugen/Bankdrücken/Kreuzheben) mit Woche/Monat/Jahr-Toggle, PR-Datum in
  den Übungs-Karten. Bestehende Filter, Muskelgruppen-Karten und PR-Ansicht
  bleiben erhalten.
- `ProfileScreen`: Premium-Karte (Status „Demo“ — ehrlich, kein Fake-Abo),
  Körpermaße-Block, Einstellungs-Menü (Sprache/Einheiten/Synchronisation als
  „Demnächst“, CSV-Export aktiv, Abmelden). Tabs statt Zurück-Button.
- `main.ts`: Navigation auf Tab-Callbacks umgestellt; Logout läuft jetzt
  ausschließlich über das Profil.
- Doku: `DESIGN_SYSTEM.md` um 5.5 TabBar + 5.6 Diagramme ergänzt;
  `TASKS.md` (W3/W4 erledigt, kein ACTIVE_TASK offen).

### Verifikation
- `npm run typecheck` → OK (Exit 0)
- `vite build` → OK (68 Module, dist erzeugt)
- Browser-End-to-End (Real-Modus, Demo-Account mit Seed-Daten): Tab-Bar auf
  allen 4 Ansichten, Statistik zeigt Gesamtvolumen-Karte (130.366 kg,
  „↑ +38.129 kg vs. Vorperiode“), Donut mit Legende, Kraftentwicklungs-Chart
  (Woche/Monat/Jahr umschaltbar), PR-Datumsangaben („PR am 18. Sept.“);
  Verlauf zeigt Tages-Grid mit realen Werten; Profil zeigt im Fehlerzustand
  weiterhin die Tab-Bar (keine Sackgasse).

### Hinweise / offen
- RPE/Intensität ist laut Roadmap W-11 weiterhin out of scope — die Mockup-Zeile
  „Avg. Intensity (RPE)“ wird daher als „Neue PRs“ abgebildet (reale Daten).
- Premium-Status ist bewusst „Demo“ statt „Aktiv“ (kein echtes Abo-Backend).
- „Sprache/Einheiten/Gerätesynchronisation“ sind Platzhalter mit „Demnächst“.
- Das Profil im Real-Modus braucht die profiles-Tabelle (SQL-Block beim Lead);
  bis dahin erscheint der bestehende Hinweis „Profil konnte nicht geladen werden.“.

---

## Aufgabe: Statistik — Muskelgruppen-Filter als Dropdown statt Chip-Reihe

**Status: Erfolg**

### Umgesetzt
- Die 10 Muskelgruppen-Chips + „Alle“-Chip in der Statistik sind durch ein
  kompaktes Dropdown mit Mehrfachauswahl ersetzt (`src/screens/StatsScreen.ts`).
- Trigger zeigt die aktuelle Auswahl gekürzt: „Alle Muskelgruppen“, bei genau
  einer Gruppe deren Name, sonst „N Muskelgruppen“. Optionen mit ✓-Häkchen bei
  aktiven Gruppen; „Alle Muskelgruppen“ setzt den Filter zurück.
- Panel bleibt bei Gruppen-Auswahl offen (mehrere Gruppen in einem Zug wählbar),
  schließt bei „Alle“, Klick außerhalb, Fokusverlust oder Escape.
  Touch-Targets ≥ 44px, Fokus-Ring, `aria-expanded`/`role="menuitemcheckbox"`.
- CSS zentral in `style.css` (Design-Token-Farben, keine Inline-Hex-Werte),
  Klassen `.filter-trigger`/`.filter-panel`/`.filter-option`/`.filter-check`.
- Filterlogik unverändert: Dropdown speist weiterhin dieselbe Pipeline
  (`filteredEntries()`/`muscleStats()`), keine zweite Datenquelle.

### Verifikation
- `npm run typecheck` → OK (Exit 0)
- `vite build` → OK (71 Module, dist erzeugt)
- Browser (Mock-Modus, Demo-Account mit Seed-Daten): Dropdown öffnet/schließt
  korrekt; „Brust“ → Trigger „Brust“, Donut-Legende schrumpft von 11 auf 2
  Einträge; „Rücken“ zusätzlich → „2 Muskelgruppen“, beide aktiv; Klick
  außerhalb schließt das Panel; „Alle Muskelgruppen“ → Trigger/Legende zurück
  auf Ausgangszustand.

### Hinweise
- Der Dokument-Klick-Listener wird nur bei offenem Panel registriert und beim
  Schließen entfernt (kein kumulatives Leak über re-renders).