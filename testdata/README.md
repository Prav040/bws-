# Testdaten (Seed) — BWS+ Fitness

Deterministisch generierte Probendaten für den **Mock-/Offline-Betrieb** (ohne
Supabase). Sie passen exakt in die lokale Speicherstruktur des `WorkoutStore`
(`bwsplus:workouts:<userId>`, erwartet `workouts` + `history` +
`exerciseHistory`). Kein Eingriff in `src/`.

## Enthalten

Datei: `public/testdata/seed-workouts.json` (Vite serviert sie unter
`/testdata/seed-workouts.json`).

- 3 Workout-Vorlagen (Push, Pull, Beine) — konsistent zu den Defaults.
- 25 abgeschlossene Workouts über die letzten ~8 Wochen (Spanne ~26.07 → 18.09).
- 142 Übungs-Einträge mit **progressiv steigenden Gewichten** (Progressive
  Overload), z. B. Bankdrücken 62.5 → 80.0 kg. Dadurch sind in der
  Statistik-Ansicht PR-Balken, Verlauf und „letzte Leistung" sichtbar.
- Die letzten 3 Sessions liegen dicht beieinander (gestern, vorgestern, …),
  damit auch die „Streak"-KPI im Profil einen Wert zeigt.

## So einspielen (Dev, Mock-Modus)

1. `npm run dev` starten und die App im Browser öffnen.
2. Als Demo-Nutzer anmelden: `demo@bws.app` / `demo1234`
   (erzeugt die lokale Session, damit die Nutzer-ID bekannt ist).
3. DevTools → Console öffnen und folgendes einfügen:

```js
(async () => {
  const uid = localStorage.getItem('bwsplus:mock:session');
  if (!uid) {
    console.error('❌ Erst als Demo-User einloggen (demo@bws.app / demo1234).');
    return;
  }
  const res = await fetch('/testdata/seed-workouts.json');
  if (!res.ok) throw new Error('Seed nicht gefunden: ' + res.status);
  const seed = await res.json();
  localStorage.setItem('bwsplus:workouts:' + uid, JSON.stringify(seed));
  console.log(
    '✅ Testdaten geladen:',
    seed.history.length, 'Workouts,',
    seed.exerciseHistory.length, 'Übungs-Einträge.',
  );
  location.reload();
})();
```

4. Nach dem Reload: „📊 Statistik" und das Profil zeigen echte Testdaten.

## Zurücksetzen / Entfernen

```js
const uid = localStorage.getItem('bwsplus:mock:session');
if (uid) localStorage.removeItem('bwsplus:workouts:' + uid);
location.reload();
```