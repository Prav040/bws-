# TASKS — BWS+ Fitness

Dieses Dokument wird vom Technical Lead / Architect gepflegt. Es enthält
**genau eine** aktive Aufgabe unter `## ACTIVE_TASK`. Der Entwickler arbeitet
ausschließlich an dieser Aufgabe, bis sie abgeschlossen ist, und meldet das
Ergebnis (Erfolg oder Fehler) in `DEV_FEEDBACK.md`.

---

## Erledigt

- [x] **W1 — Supabase-Auth über eine Service-Factory verdrahten (ADR-3)**
      Factory `src/services/serviceFactory.ts` wählt real vs. mock über die
      Env-Variablen; `main.ts` nutzt `createAuthService()`. typecheck + build grün.
- [x] **W2 — Profil-KPIs füllen: echte Workout-Statistiken statt Platzhalter**
      `getProfileStats()` im Store, `createProfileService()`-Factory,
      `ProfileScreen` zeigt echte KPIs, Profil-Einstieg + Navigation. typecheck +
      build grün.

---

## ACTIVE_TASK

### Titel
W3 — Verlauf als eigene Ansicht + Muskelgruppen-/Zeitfilter in der Statistik

### Ziel
Zwei zusammenhängende Ausbauten der Analytik (nicht-destruktiv):

1. **Verlauf** soll **nicht mehr inline** auf der Workout-Liste erscheinen,
   sondern in eine eigene, **detailliertere Verlaufs-Ansicht** wandern, in der
   man sich ein einzelnes abgeschlossenes Workout genauer ansehen kann.
2. **Statistik** um einen **Zeitraum-Filter** und eine **Muskelgruppen-
   Aufschlüsselung** erweitern: pro Muskelgruppe werden **Gesamtvolumen (kg)**
   und **Anzahl Sätze** im gewählten Zeitraum angezeigt.

### Referenzen
- Anforderungen: T-03 (Verlauf/Historie), T-05 (30-/90-Tage-Fenster), T-06
  (Tonnage/Volumen pro Muskelgruppe & Woche), NFR-MAINT-01.
- Datenbasis: `src/services/workoutStore.ts` (`getHistory()` →
  `WorkoutSnapshot[]`, `getExerciseHistory()` → `ExerciseHistoryEntry[]`).

### Voraussetzung: Muskelgruppen einführen (fehlt heute komplett)
`Exercise` und `ExerciseHistoryEntry` kennen keine Muskelgruppe. Erforderlich,
bevor die Statistik aggregieren kann:

- Neuer Union-Typ in `src/types.ts`:
  `type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';`
- `Exercise` bekommt `muscleGroup: MuscleGroup | null` (null = nicht zugeordnet /
  „Sonstige“).
- **Statisches Mapping** (Name → primäre Gruppe) für die eingebauten Übungen:
  - `chest`: Bankdrücken, Schrägbankdrücken
  - `shoulders`: Schulterdrücken, Seitheben, Face Pulls
  - `triceps`: Trizepsdrücken (Seil), Trizeps Overhead Ext.
  - `back`: Kreuzheben, Klimmzüge / Latzug, Langhantel-Rudern, Kabel-Rudern
  - `biceps`: Bizeps-Curls
  - `quads`: Kniebeugen, Beinpresse
  - `hamstrings`: Rumänisches Kreuzheben, Beinbeuger
  - `calves`: Wadenheben
  (Verbundübungen werden einer primären Gruppe zugeordnet — keine Mehrfach-Zuordnung.)
- `normalize()` im Store zieht `muscleGroup` **nach** (Default-Übungen über das
  Mapping; benutzerdefinierte/leere → `null`). So funktionieren auch bestehende
  History-Einträge ohne Datenmigration.
- `ExerciseEditor` bekommt ein Auswahlfeld für die Muskelgruppe (Dropdown, inkl.
  „keine“) — damit der Nutzer eigene Übungen korrekt zuordnen kann.

### Teil 1 — Verlauf als eigene, detaillierte Ansicht
- **Workout-Liste:** die Inline-„Verlauf“-Sektion entfernen. Stattdessen einen
  „Verlauf“-Einstieg (Header-Button neben Statistik/Profil), der eine neue
  `HistoryScreen`-Ansicht öffnet.
- **Neue `src/screens/HistoryScreen.ts`:** listet alle abgeschlossenen Workouts
  chronologisch (Datum, Name, Sätze erledigt/gesamt, Volumen) mit klarem
  Empty-State.
- **Drill-down je Workout:** damit man die Details eines Eintrags ansehen kann,
  wird `WorkoutSnapshot` um die Übungs-Einzelleistungen erweitert (z. B.
  `exercises: ExerciseHistoryEntry[]`). `completeWorkout()` schreibt sie mit.
  Für alte Snapshots ohne Details → Hinweis „keine Detaildaten“ anzeigen
  (nicht-destruktiv, kein Datenverlust).
- `main.ts`: `showHistory()` + Navigation (zurück zur Workout-Liste).

### Teil 2 — Statistik: Zeitraum- & Muskelgruppen-Filter
- **Zeitraum-Filter:** Auswahl oben (Presets: 7 / 30 / 90 Tage / Gesamt,
  Default 30 Tage).
- **Muskelgruppen-Filter:** Chips oder Dropdown („Alle“ + einzelne Gruppe).
- **Aggregation je Muskelgruppe** über `exerciseHistory` im gewählten Zeitraum:
  - `totalVolume` = Σ `volume` (kg) — Tonnage der Muskelgruppe,
  - `totalSets` = Σ `sets`,
  - optional `sessions` (Anzahl Trainingseinheiten in der Gruppe).
- **Anzeige:** neue Karten-Block je Muskelgruppe mit „X kg · Y Sätze“ im
  Zeitraum. Die **bestehende Übungs-/PR-Ansicht bleibt erhalten** (nicht löschen)
  — die Muskelgruppen-Aggregation kommt ergänzend (z. B. als Abschnitt oberhalb).

### Betroffene Dateien
- `src/types.ts` (`MuscleGroup`, `Exercise.muscleGroup`, `WorkoutSnapshot.exercises`)
- `src/services/workoutStore.ts` (Mapping, `normalize`, `completeWorkout`,
  neue Aggregations-Methode `getMuscleVolume(from, to)` o. ä.)
- `src/screens/HistoryScreen.ts` (neu)
- `src/screens/WorkoutListScreen.ts` (Verlauf entfernen, Verlauf-Einstieg)
- `src/screens/StatsScreen.ts` (Zeit-/Muskelgruppen-Filter + Aggregation)
- `src/screens/ExerciseEditor.ts` (Muskelgruppen-Auswahl)
- `src/main.ts` (Navigation/Navigation)

### Abgrenzung (Out of Scope)
- RPE/RIR (W-11), 1RM (W-12), Fail-Markierung (W-13), PO-Signal (W-15).
- Recovery-Meter (T-07), Deload-Erkennung (PLAN-05), Mesocycles (PLAN-06).
- CSV/PDF-Export (T-08), Fortschrittsfotos (T-04).
- `IWorkoutService` / Supabase-Workout-Persistenz.

### Definition of Done
- [ ] Verlauf erscheint nicht mehr inline auf der Workout-Liste; eigener Verlaufs-Einstieg öffnet `HistoryScreen`.
- [ ] Verlauf zeigt alle Workouts chronologisch; ein Eintrag ist auf Drill-down zu seinen Übungs-Details öffnenbar.
- [ ] Neue abgeschlossene Workouts speichern ihre Übungs-Details; alte Einträge bleiben lesbar (Hinweis statt Crash).
- [ ] `MuscleGroup` existiert; Default-Übungen sind über das Mapping zugeordnet, bestehende History wird nachgezogen; Auswahl im `ExerciseEditor`.
- [ ] Statistik bietet Zeitraum- (7/30/90/Gesamt) und Muskelgruppen-Filter.
- [ ] Pro Muskelgruppe werden Gesamtvolumen (kg) und Sätze im Zeitraum korrekt angezeigt (Übungs-PR-Ansicht bleibt erhalten).
- [ ] `npm run typecheck` und `npm run build` laufen fehlerfrei durch.
- [ ] Ergebnis in `DEV_FEEDBACK.md` dokumentiert (Erfolg mit Bestätigung der
      beiden obigen Läufe ODER Fehler mit konkreter Beschreibung).

---

## Anforderungs-Abgleich & Feature-Roadmap

Abgleich der übergebenen Pro-Level-Anforderungsliste (Security, mobile UX,
evidenzbasierte Leistungssportler-Features) gegen den aktuellen Ist-Stand.
Status: ✅ implementiert · ⚠️ teilweise · ❌ fehlt.
Neue IDs folgen dem Schema aus `docs/02-anforderungsliste.md`. Dieser Abschnitt
ist Referenz/Roadmap und **keine** zweite aktive Aufgabe — nur `ACTIVE_TASK`
ist in Arbeit.

### A. Leitprinzipien & Prozess (als feste Regeln übernommen)
| Prinzip | Status |
|--------|--------|
| Nicht-destruktiv: Bestehendes/Datenstrukturen nie löschen, nur modular ergänzen | ✅ Regel |
| Backup von Code + Daten vor jeder Änderung | ✅ Regel |
| Rolle QA/UX-Auditor vor dem Codieren | ✅ Regel |

### B. Security & Datenschutz (Priorität: Hoch)
| ID | Anforderung | Status |
|----|-------------|--------|
| NFR-SEC-01 | Passwörter nie im Klartext (BaaS-Hash) | ✅ |
| NFR-SEC-02 | Row Level Security (nur Besitzer) | ⚠️ nur `profiles`; Workout-Tabellen fehlen |
| NFR-SEC-03 | JWT-Session + Refresh (Supabase-Standard) | ✅ |
| NFR-SEC-04 | 2FA-Option (TOTP / Magic-Link) | ❌ |
| NFR-SEC-05 | Biometrie-Support | ❌ Won't (Web-PWA, geringe Prio) |
| NFR-DATA-01 | DSGVO: Datenminimierung, Löschbarkeit | ✅ Prozess vorhanden |
| NFR-DATA-02 | E2E-Verschlüsselung sensibler Gesundheitsdaten | ❌ |
| DEL-01 | OWASP-Pen-Test (Mobile Top 10) + Security-Report (Critical/High/Medium/Low) | ❌ |

### C. Mobile UI/UX
| ID | Anforderung | Status |
|----|-------------|--------|
| NFR-USAB-01 | Mobile-first (max-w-md ~448 px) | ✅ |
| — | Dark Mode als Default | ✅ (`dark` in `index.html`) |
| NFR-USAB-02 | Touch-Targets ≥ 44×44 px (ideal 48×48) | ⚠️ begonnen (`min-h-[44px]` auf Header-Buttons) |
| NFR-USAB-03 | One-Hand-Bedienung (kritische Aktionen erreichbar) | ❌ |
| NFR-USAB-04 | Haptisches Feedback (Vibration bei Log / Timer-Ende) | ❌ |
| NFR-USAB-05 | < 3 Klicks pro Satz-Log | ⚠️ nicht gemessen |
| NFR-USAB-06 | Material 3 / HIG statt Eigen-Theme | ❌ (aktuell eigenes Tailwind-Theme) |
| NFR-A11Y-01 | Labels, Fokus, verständliche Fehler (WCAG-AA) | ✅ angestrebt |

### D. Evidenzbasierte Leistungssportler-Features
| ID | Anforderung | Status |
|----|-------------|--------|
| W-08 | Volumen je Workout (Σ Gewicht × Wdh) | ✅ |
| W-07 | Gewichts-Prefill aus letztem Satz | ⚠️ Prefill da, PO-Signal fehlt |
| W-06 | Satz-Typen (Normal/Warm-up/Drop-Set/Deload) | ✅ |
| W-11 | RPE/RIR-Logging je Satz (Pflichtfeld-Intensität) | ❌ |
| W-12 | 1RM-Schätzung (z. B. Epley) | ❌ |
| W-13 | Fail-/Technical-Failure-Markierung je Satz | ❌ |
| W-15 | Progressive-Overload-Signal + Visualisierung „letzte Leistung“ im Eingabefeld | ❌ |
| T-06 | Tonnage/Volumen pro Muskelgruppe & Woche | 🔄 in Arbeit (W3) |
| T-03 | Verlauf/Historie mit Detail-Ansicht | 🔄 in Arbeit (W3) |
| T-07 | Recovery-Meter je Muskelgruppe (Volumen/Intensität → bereit) | ❌ |
| PLAN-05 | Deload-Erkennung bei Plateau + Vorschlag | ❌ |
| PLAN-06 | Periodisierung / Mesocycle-Blöcke (z. B. 6-Wochen) | ❌ |
| T-08 | CSV/PDF-Export der Trainingsdaten | ❌ |

### E. Deliverables & Reports
| ID | Deliverable | Status |
|----|-------------|--------|
| DEL-01 | Security-Report (OWASP, priorisierte Lücken) | ❌ |
| DEL-02 | UX-Audit-Report (Screenshots/Annotations) | ❌ |
| DEL-03 | Feature-Gap-Analyse (vs. Hevy/Strong/Alpha Progression) | ❌ |
| DEL-04 | Umsetzungsplan / Roadmap | ⚠️ begonnen (dieser Abschnitt) |

### F. Priorisierte Roadmap (Quelle der Folge-Aufgaben W4 …)
1. **Security-Basis (Hoch):** DEL-01 Pen-Test-Audit, NFR-SEC-04 2FA,
   NFR-DATA-02 E2E — teils abhängig vom echten Supabase-Projekt + RLS-Ausbau.
2. **Core Performance Tracking (höchster Nutzwert):** W-11 RIR, W-12 1RM,
   W-13 Fail-Markierung, W-15 PO-Signal.
3. **Recovery & Periodisierung:** T-07 Recovery-Meter, PLAN-05 Deload,
   PLAN-06 Mesocycle.
4. **Mobile UX:** NFR-USAB-02..05 (Touch-Targets, One-Hand, Haptik, Klicks),
   NFR-USAB-06 Material 3.
5. **Export & Reports:** T-08 CSV/PDF, DEL-02 UX-Audit.