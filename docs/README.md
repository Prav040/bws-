# BWS+ Fitness — Dokumentation

Dieser Ordner enthält die Analyse und die Architektur-Dokumentation für das
Projekt **BWS+ Fitness** (eine an „Build With Science" angelehnte Fitness-App).

## Inhalt

| Datei | Inhalt |
|-------|--------|
| [01-analyse-build-with-science.md](./01-analyse-build-with-science.md) | Tiefen-Analyse des Original-Produkts „Built With Science+": Feature-Inventar, Geschäftsmodell, Domänenmodell, Abgleich mit dem aktuellen Code-Stand. |
| [02-anforderungsliste.md](./02-anforderungsliste.md) | Vollständige Anforderungsliste: funktionale (FR) + nicht-funktionale (NFR) Anforderungen, User Stories, Priorisierung, MVP-Abgrenzung. |
| [03-software-architektur.md](./03-software-architektur.md) | Software-Architektur: Systemkontext (C4), Schichten/Komponenten, Datenmodell/ER, Service-Schnittstellen, Sicherheit (RLS), Architekturentscheidungen (ADRs), Deployment, Gap-Analyse & Roadmap. |

## Konventionen

- Dokumente sind auf Deutsch (UI-Texte & Fachsprache), Code-/Typennamen in Englisch.
- Diagramme in Mermaid (rendern auf GitHub / VS Code / Obsidian).
- Anforderungs-IDs sind stabil und werden in Architektur & Code referenziert
  (z. B. `FR-W-01`, `NFR-SEC-03`).