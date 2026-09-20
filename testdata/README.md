# Testdaten (Seed) — BWS+ Fitness

Deterministisch generierte Probendaten für den **Demo-Account**. Sie passen
exakt in die lokale Speicherstruktur des `WorkoutStore`
(`bwsplus:workouts:<userId>`, erwartet `workouts` + `history` +
`exerciseHistory`).

## Demo-Account

- E-Mail: `demo@bws.app`
- Passwort: `demo1234`

Einfach auf dem Login-Screen **„Mit Demo Account einloggen (1-Klick)“**
tippen — E-Mail und Passwort sind dort bereits hinterlegt.

## Laden der Testdaten (automatisch)

Kein manueller Schritt nötig. Beim **ersten Login** des Demo-Accounts lädt die
App (`main.ts` → `seedDemoAccount()`) die Datei
`public/testdata/seed-workouts.json` automatisch in den `WorkoutStore` des
Demo-Nutzers:

1. Login als Demo-Nutzer (`demo@bws.app` / `demo1234` oder 1-Klick-Button).
2. Die App erkennt den Demo-Account an der E-Mail-Adresse und prüft
   `hasPersistedData()`.
3. Nur wenn der Demo-Nutzer **noch keine eigenen Daten** hat, wird der Seed
   eingespielt (nicht-destruktiv: eigene Einträge werden nie überschrieben).
4. Die Einträge werden beim Laden **auf das aktuelle Datum verschoben**
   (jüngstes Workout = heute, Abstände bleiben erhalten), damit Streak,
   30-Tage-Fenster und Statistik immer gefüllt sind.

Anschließend sind Verlauf, Statistik und Profil-KPIs gefüllt. Schlägt das Laden
fehl (z. B. Datei fehlt), bleibt die App bei den Standard-Vorlagen — es gibt
nur eine Warnung in der Browser-Konsole.

## Inhalt

- 3 Workout-Vorlagen (Push, Pull, Beine) — konsistent zu den Defaults.
- 25 abgeschlossene Workouts über die letzten ~8 Wochen.
- 142 Übungs-Einträge mit **progressiv steigenden Gewichten** (Progressive
  Overload), z. B. Bankdrücken 62.5 → 80.0 kg. Dadurch sind in der
  Statistik-Ansicht PR-Balken, Verlauf und Muskelgruppen-Aggregation sichtbar.
- Die letzten Sessions liegen dicht beieinander, damit die **Streak-KPI** im
  Profil einen Wert zeigt.
- Muskelgruppen werden beim Laden über das statische Mapping im Store
  nachgezogen (die Seed-Datei selbst führt kein `muscleGroup`-Feld).

## Mock- vs. Real-Modus

- **Ohne Supabase-Konfiguration** (keine `VITE_SUPABASE_URL`/`ANON_KEY` in
  `.env`): Mock-Auth, Demo-Nutzer wird lokal angelegt (ID `demo-user-id`).
  Der Seed landet unter `bwsplus:workouts:demo-user-id`.
- **Mit Supabase** (`.env` gesetzt): echter Auth-Flow. Damit der Demo-Account
  funktioniert, muss der Nutzer `demo@bws.app` im Supabase-Projekt existieren
  (einmalig anlegen, E-Mail-Bestätigung im Dashboard setzen). Der Seed wird
  auch hier per E-Mail-Match geladen, dann unter der Supabase-User-ID.

## Zurücksetzen / Entfernen

Demo-Daten löschen (in der Browser-Konsole der laufenden App):

```js
localStorage.removeItem('bwsplus:workouts:demo-user-id'); // Mock-Modus
// Im Real-Modus stattdessen den Key mit der Supabase-UUID des Demo-Users löschen
location.reload();
```

Beim nächsten Login des Demo-Accounts wird der Seed automatisch neu geladen.
