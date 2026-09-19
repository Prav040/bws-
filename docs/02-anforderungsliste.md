# Anforderungsliste — BWS+ Fitness

## 1. Ziel & Scope

Ziel: ein evidenz-basierter **All-in-one-Fitness-Coach** (an BWS+ angelehnt):
personalisierter Trainingsplan aus einem Assessment-Quiz, Workout-Logging mit
Progressions-Anpassung, Ernährung, Fortschritts-Analytik, optional Education
und KI-Assistent.

Priorisierung nach **MoSCoW**:

- **Must** = unverzichtbar für den MVP
- **Should** = wichtig, 2. Ausbaustufe
- **Could** = wertvoll, aber kein Blocker
- **Won't (jetzt)** = bewusst out of scope der ersten Phasen

## 2. Stakeholder & Personas

| Rolle | Bedürfnis |
|-------|-----------|
| Trainierender (Persona „Max") | schnelles Logging im Gym, Zielvorgaben für den nächsten Satz, Fortschritt sehen |
| Anfänger (Persona „Lena") | geführte Übungsauswahl, Form-Hinweise, wenige Entscheidungen |
| Coach/Trainer (intern) | saubere Aggregation der Log-Daten für Analyse/Studien |
| Entwickler | service-zentrierte, testbare Architektur, Backend austauschbar |

## 3. Funktionale Anforderungen

ID-Präfixe: `AUTH` (Auth), `PLAN` (Plan/Quiz), `W` (Workout), `EX`
(Übungskatalog), `T` (Tracking/Analytik), `PROF` (Profil), `NUT` (Ernährung),
`AI`/`EDU` (Assistenz/Bildung), `INT` (Integrationen).

### 3.1 AUTH — Authentifizierung

| ID | Anforderung | Prio |
|----|-------------|------|
| AUTH-01 | Registrierung per E-Mail + Passwort + Benutzername | Must |
| AUTH-02 | Login per E-Mail + Passwort | Must |
| AUTH-03 | Session-Persistenz über Neustart (auto-refresh) | Must |
| AUTH-04 | Logout beendet die Session | Must |
| AUTH-05 | Passwort-Reset via E-Mail („Passwort vergessen") | Should |
| AUTH-06 | Verständliche deutsche Fehlermeldungen (E-Mail vergeben, falsche Daten) | Must |

### 3.2 PROF — Profil & Körperdaten

| ID | Anforderung | Prio |
|----|-------------|------|
| PROF-01 | Profil (Benutzername, Ziel, Gewicht, Größe) anlegen/laden | Must |
| PROF-02 | Ziel auswählbar: Muskelaufbau / Fettabbau / Recomposition | Must |
| PROF-03 | Start-/Aktualgewicht pflegen; Differenz anzeigen | Must |
| PROF-04 | Körpermaße (optional): Taille, Brust, Arme, Oberschenkel | Should |

### 3.3 PLAN — Assessment & Plan-Generierung

| ID | Anforderung | Prio |
|----|-------------|------|
| PLAN-01 | Quiz erfasst: Ziel, Erfahrung, Equipment, Tage/Woche, Körperdaten, Lifestyle | Should |
| PLAN-02 | Algorithmus generiert Split + Übungsvorlage + Sets/Reps + Wochenvolumen | Should |
| PLAN-03 | Wöchentliche Anpassung aus Log-Daten (Progressive Overload) | Should |
| PLAN-04 | Workout-Vorlagen: Push/Pull/Beine, Full-Body, Upper/Lower | Must |

### 3.4 W — Workout-Logging

| ID | Anforderung | Prio |
|----|-------------|------|
| W-01 | Workouts anlegen, benennen, löschen | Must |
| W-02 | Übungen anlegen/bearbeiten/löschen (Name, Ziel-Wdh., Pause, Notizen, Bild) | Must |
| W-03 | Sätze hinzufügen/entfernen (Gewicht + Wiederholung) | Must |
| W-04 | Satz als „erledigt" markieren (Toggle) | Must |
| W-05 | Rest-Timer: startet nach Satz, konfigurierbare Dauer, Fortschrittsbalken, Skip/Abbruch | Must |
| W-06 | Satz-Typen: Normal / Warm-up / Drop-Set / Deload | Should |
| W-07 | Gewichts-Vorschlag (Prefill aus letztem Satz; Progressive Overload) | Should |
| W-08 | Volumen-Berechnung (Σ Gewicht × Wdh.) | Must |
| W-09 | Workout-Abschluss: Schnappschuss in Verlauf | Must |
| W-10 | Offline-fähig: Logging ohne Netz, späterer Sync | Could |

### 3.5 EX — Übungskatalog

| ID | Anforderung | Prio |
|----|-------------|------|
| EX-01 | Übungs-Tutorials (Beschreibung, Form-Hinweise, Bild/Video) | Should |
| EX-02 | Übungen mit Quellenangabe (wissenschaftliche Basis) | Could |

### 3.6 T — Fortschritt & Analytik

| ID | Anforderung | Prio |
|----|-------------|------|
| T-01 | Gewichtsverlauf (tägliche Einträge → Wochendurchschnitt) | Should |
| T-02 | Strength-Verlauf pro Übung (Last über Wochen) | Should |
| T-03 | Verlauf/Historie abgeschlossener Workouts | Must |
| T-04 | Fortschrittsfotos (vorne/Seite/hinten), chronologisch | Could |
| T-05 | 30-/90-Tage-Charts (Gewicht, Strength) | Should |

### 3.7 NUT / AI / EDU — Ernährung, KI & Bildung

| ID | Anforderung | Prio |
|----|-------------|------|
| NUT-01 | Anzeige von Kalorien-/Makro-Zielen aus Körperdaten | Could |
| NUT-02 | AI-Meal-Scanner (Foto → Nährwerte) | Won't (jetzt) |
| AI-01 | Kontextueller Chat-Assistent mit Zugriff auf Log-Daten | Won't (jetzt) |
| EDU-01 | Tägliche Wissens-Lektionen | Won't (jetzt) |

### 3.8 INT — Integrationen

| ID | Anforderung | Prio |
|----|-------------|------|
| INT-01 | Apple Health / Google Fit: Schrittsynchronisation | Could |
| INT-02 | Push-Notifications (Workout-/Plan-Erinnerungen) | Could |

## 4. Nicht-funktionale Anforderungen (NFR)

| ID | Bereich | Anforderung | Zielwert |
|----|---------|-------------|----------|
| NFR-PERF-01 | Performance | Interaktionslatenz (UI) | < 100 ms lokal; Listen < 1 s |
| NFR-SEC-01 | Sicherheit | Passwörter niemals im Klartext (BaaS-Auth, Hash server-seitig) | erzwungen |
| NFR-SEC-02 | Sicherheit | Zugriffsschutz Row Level Security (nur Besitzer) | erzwungen |
| NFR-SEC-03 | Sicherheit | JWT-Sessions mit Ablauf + Refresh | Standard-Supabase |
| NFR-DATA-01 | Datenschutz | DSGVO: Datenminimierung, Löschbarkeit, Zweckbindung | konform |
| NFR-USAB-01 | Usability | Mobile-first (max-w-md ~448 px), Daumen-bedienbar | responsive |
| NFR-OFF-01 | Robustheit | Logging funktioniert offline | lokal persistiert |
| NFR-I18N-01 | Sprache | Deutsche UI-Texte durchgängig | vollständig |
| NFR-MAINT-01 | Wartbarkeit | UI/Services entkoppelt; Backend über Interfaces austauschbar | interface-basiert |
| NFR-A11Y-01 | Barrierefreiheit | Labels, Fokus, verständliche Fehlertexte (WCAG-AA angestrebt) | angestrebt |
| NFR-SCAL-01 | Skalierung | Backend-Dienste wachsen mit Nutzerzahl (BaaS) | n × Nutzer |

## 5. User Stories (repräsentativ)

- **US-01 (Login):** Als Nutzer will ich mich mit E-Mail/Passwort anmelden,
  damit nur ich meine Daten sehe.
  *AK:* gültige Daten → Dashboard; falsche → verständliche Meldung.
- **US-02 (Workout loggen):** Als Nutzer will ich während des Trainings Sätze
  erfassen und Pausen timern, damit mein Fortschritt lückenlos ist.
- **US-03 (Vorlagen):** Als Anfänger will ich fertige Push/Pull/Beine-Vorlagen,
  damit ich nichts selbst planen muss.
- **US-04 (Verlauf):** Als Nutzer will ich nach dem Training sehen, was ich
  geschafft habe (Sätze, Volumen).
- **US-05 (Ziel):** Als Nutzer will ich mein Ziel hinterlegen, damit die
  Auswertung zu meinem Ziel passt.

## 6. Geschäfts-/Datenregeln

- R-01: `target_goal ∈ {Muscle Gain, Fat Loss, Recomposition}`.
- R-02: Volumen = Σ (weight × reps) über alle Sätze (weight > 0, reps > 0).
- R-03: Workout-Abschluss nur mit mindestens einem erfassten Satz.
- R-04: Progressive Overload: letzte Session ist Basis für Last-Vorschlag.
- R-05: Wochen-Gewicht = Mittelwert der Tages-Einträge einer Woche.

## 7. MVP-Abgrenzung (Phase 1)

**In Scope (Must):** AUTH-01..04/06, PROF-01..03, W-01..05/08/09, PLAN-04,
T-03, NFR-SEC-01..03, NFR-DATA-01, NFR-MAINT-01.

**Out of Scope (jetzt):** Meal-Scanner (NUT-02), KI-Assistent (AI-01),
Education (EDU-01), Health-Integration (INT-01).

## 8. Nachverfolgbarkeit

Jede Änderung im Code wird über die IDs referenziert (z. B. `W-03`,
`NFR-SEC-02`). Die Architektur in `03-software-architektur.md` verweist auf
dieselben IDs.