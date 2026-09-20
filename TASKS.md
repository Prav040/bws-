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
- [x] **W3 — Verlauf als eigene Ansicht + Muskelgruppen-/Zeitfilter in der Statistik**
      `HistoryScreen` mit Kalender + Drill-down, `MuscleGroup`-Union + Mapping,
      Zeitraum-/Muskelgruppen-Filter, `getMuscleVolume()`. typecheck + build grün.
- [x] **W4 — UI an das Mockup angleichen (design/mockup.png)**
      Bottom-Tab-Bar (Workouts/Verlauf/Statistik/Profil) statt Header-Buttons;
      Verlauf mit Tages-Zusammenfassung (Volumen, Sätze, PRs, Einheiten);
      Statistik mit Gesamtvolumen-Trendkarte, Muskelgruppen-Donut,
      Kraftentwicklungs-Chart (Woche/Monat/Jahr) und PR-Datum;
      Profil mit Premium-Karte, Körpermaßen, Einstellungen und CSV-Export.
      typecheck + build grün, im Browser verifiziert (siehe DEV_FEEDBACK).

---

## ACTIVE_TASK

### Titel
Keine offene Aufgabe — W4 + W5 abgeschlossen (Ergebnisse in `DEV_FEEDBACK.md`).
Nächste Kandidaten aus der Roadmap (Abschnitt F): Core Performance Tracking
(W-11 RIR, W-12 1RM, W-13 Fail-Markierung, W-15 PO-Signal) oder
Recovery & Periodisierung (T-07, PLAN-05, PLAN-06).

### Hinweis
Die Detailbeschreibungen der abgeschlossenen Aufgaben W3–W5 wurden hier entfernt
und sind vollständig in `DEV_FEEDBACK.md` dokumentiert.

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