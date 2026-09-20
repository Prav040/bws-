# DESIGN_SYSTEM.md — BWS+ Fitness

Visuelle Identität und Ergonomie, ausgerichtet an **Built With Science** und **RP Strength / Perform**.

Dieses Dokument ist die verbindliche Spezifikation für alle UI-Komponenten. Es liefert exakte HTML-Struktur, Tailwind-Klassen, Abstände und CSS-Klassen für die drei Kernkomponenten: `ExerciseCard`/`SetRow`, den schwebenden `RestTimer` und die `KPIDashboard`-Cards.

---

## 1. Design-DNA

**Grundsatz:** „Gym-Ergonomie vor Ästhetik." Jedes interaktive Element muss mit nassen Händen, am Handy, im Stehen bedienbar sein. Ziffern für Gewicht/Wiederholungen sind groß und fett; Bedienelemente sind kompakte Taps, keine standardmäßigen `<input>`-Felder.

**Stil-Regeln:**
- Hintergrund tiefes Charcoal/Slate, Typografie weiß und knackig (hoher Kontrast).
- Ein einziger Akzent (Electric Cyan `#0EA5E9`) für Aktion/Progress. Sekundärfarben nur für Semantik (Success, Warnung, Drop-Set).
- Feine Konturen statt harter Schatten. Flächen „aufgehoben" über dem Hintergrund durch `backdrop-blur` + transparenter Panel-Fläche.
- Feedback bei Antippen unmissverständlich (Satz erledigt = satte, gefüllte Farbfläche).

---

## 2. Farbwelt (Design Tokens)

Grundlage: Tailwind-Slate-Skala (+ eigene Alpha-Akzente). Alle Werte sind die einzige erlaubte Farbquelle — keine Inline-Hex-Werte in Komponenten.

| Token            | Wert        | Verwendung                                        |
|------------------|-------------|---------------------------------------------------|
| `surface`        | `#020617`   | App-Hintergrund (neben `bg-slate-950`)            |
| `panel`          | `#0F172A`   | Karten-/Panel-Grund (`bg-slate-900`)              |
| `panel-2`        | `#1E293B`   | Eingabefelder, Hover-Flächen (`bg-slate-800`)     |
| `line`           | `#334155`   | Konturen / `border` (`border-slate-700`)          |
| `line-soft`      | `#1E293B`   | sehr feine Trennlinien (`border-slate-800`)       |
| `text-hi`        | `#F8FAFC`   | Primärtext (`text-slate-50`)                      |
| `text-mid`       | `#94A3B8`   | Sekundärtext (`text-slate-400`)                   |
| `text-low`       | `#64748B`   | dezent/Hinweise (`text-slate-500`)                |
| `accent`         | `#0EA5E9`   | Primär-Aktion, Progress (`sky-500`)               |
| `accent-hi`      | `#38BDF8`   | Hover/fokussierte Akzente (`sky-400`)             |
| `success`        | `#10B981`   | Satz erledigt, positiver Trend (`emerald-500`)    |
| `success-ink`    | `#022C22`   | Text auf `success`-Fläche (dunkel, für Kontrast)  |
| `warn`           | `#F59E0B`   | Warm-up-Sätze, Hinweise (`amber-500`)             |
| `drop`           | `#A78BFA`   | Drop-Set-Sätze (`violet-400`)                     |
| `danger`         | `#F87171`   | Löschen / negativer Trend (`red-400`)             |

> **Anpassung `tailwind.config`** (im `<head>` von `index.html`):
> ```js
> tailwind.config = {
>   darkMode: 'class',
>   theme: { extend: { colors: {
>     surface: '#020617', panel: '#0F172A', panel2: '#1E293B',
>     line: '#334155', lineSoft: '#1E293B',
>     accent: { DEFAULT: '#0ea5e9', hi: '#38bdf8' },
>     success: '#10b981', successInk: '#022c22',
>   } } },
> };
> ```

**Optionaler BWS-Orange-Akzent** (Alternative zu Cyan, eine davon wählen, nie beide gleichzeitig):
`accent` = `#F97316` (`orange-500`), `accent-hi` = `#FB923C` (`orange-400`).

---

## 3. Typografie

| Rolle            | Klasse / Stil                                          |
|------------------|---------------------------------------------------------|
| Primärzahl (kg / Wdh) | `font-bold` + `tabular-nums`, min. `text-lg`, so groß wie die Fläche zulässt |
| Übungsname       | `font-semibold text-white` (`text-hi`), `text-sm`–`text-base` |
| Meta / Label     | `text-[11px]`–`text-xs uppercase tracking-wider text-slate-500` |
| Countdown        | `text-3xl font-bold tabular-nums`                       |
| KPI-Kennzahl     | `text-2xl font-bold tabular-nums text-white`            |

Grundsatz: Alle numerischen Werte (`tabular-nums`), damit Ziffern beim Ticken/Ändern nicht springen.

---

## 4. Maßsystem (Spacing, Radius, Touch-Targets)

- **Touch-Target-Minimum:** `44×44px`. Für den primären „Satz erledigt"-Button: **`48×48px`** (massiv, fett, unverwechselbar).
- **Grundabstände:** `p-4` (16px) Karteninnere, `gap-2`/`space-y-3` zwischen Karten, `gap-1.5` zwischen Chips.
- **Radius:** Karten `rounded-xl`/`rounded-2xl` (16px), Eingaben & Buttons `rounded-lg` (8px), Chips `rounded-full`.
- **Border:** `border border-line`, 1px. KPI-Karten: `border border-slate-800` mit `bg-slate-900/60 backdrop-blur`.
- **Fokus:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60`.

---

## 5. Komponenten

### 5.1 `ExerciseCard`

Karten-Container pro Übung. Header (Name + Meta + Badges), optional Bild/Notizen, Spalten-Header, dann `SetRow`-Liste, Abschluss-Button „+ Satz".

```html
<div class="exercise-card" data-exercise="ID">
  <!-- Header -->
  <div class="flex items-start justify-between px-4 py-3">
    <div class="min-w-0">
      <h3 class="font-semibold text-white truncate">Bankdrücken</h3>
      <p class="text-xs text-slate-400 mt-0.5">
        Ziel 8 Wdh · Pause 2 Min. · Letztes 80 kg
      </p>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <span class="chip">3/4</span>
      <button class="icon-btn" data-edit="ID" aria-label="Bearbeiten">✎</button>
      <button class="icon-btn icon-btn-danger" data-delete="ID" aria-label="Löschen">🗑</button>
    </div>
  </div>

  <!-- optional Bild / Notizen -->
  <img src="…" class="w-full h-40 object-cover" alt="Bankdrücken" />
  <div class="px-4 py-2 text-xs text-slate-400 bg-panel2/50 border-t border-lineSoft">📝 …</div>

  <!-- Spalten-Header -->
  <div class="set-row set-grid-label">
    <span>Set</span><span>✓</span><span>kg</span><span>Wdh</span><span></span>
  </div>

  <!-- Set-Rows -->
  <div class="set-row">…</div>  <!-- via SetRow -->

  <button data-addset="ID" class="w-full py-3 min-h-[44px] text-sm text-accent hover:bg-accent/10 font-medium">
    + Satz hinzufügen
  </button>
</div>
```

**CSS (`style.css`):**

```css
.exercise-card {
  background: linear-gradient(180deg, #0F172A 0%, #0B1120 100%);
  border: 1px solid #334155;        /* line */
  border-radius: 1rem;              /* 16px */
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(0,0,0,.25), 0 8px 24px rgba(0,0,0,.35);
  transition: border-color .15s ease, transform .05s ease;
}
.exercise-card:active { transform: scale(.995); }
.exercise-card.ring-accent { border-color: transparent; }

/* Chip (Status-Badge, z. B. "3/4" oder "PR 80 kg") */
.chip {
  font-size: .75rem; font-weight: 600;
  padding: .25rem .625rem;
  border-radius: 9999px;
  background: #1E293B; color: #94A3B8;
}
.chip.chip-accent { background: rgba(14,165,233,.2); color: #38bdf8; }
.chip.chip-success{ background: rgba(16,185,129,.2); color: #34d399; }

/* Icon-Button (48px für den erledigt-Check, sonst 44px) */
.icon-btn {
  min-width: 44px; min-height: 44px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #64748B; border-radius: .75rem;
  transition: color .15s ease, background .15s ease;
}
.icon-btn:hover { color: #38bdf8; }
.icon-btn-danger:hover { color: #f87171; background: rgba(248,113,113,.1); }
```

---

### 5.2 `SetRow` — Gym-Ergonomie

Eine Zeile pro Satz. Grid mit festen Spalten (Satznummer, Check, Stepper Gewicht, Quick-Tap Wdh, Entfernen). **Keine Standard-`<input>`** — statt dessen Stepper (`-`/`+2.5kg`) und Quick-Tap-Felder.

```html
<div class="set-row" data-set="EX:IDX">
  <!-- 1. Satznummer + Typ-Umschalter -->
  <button class="set-num set-num-normal" data-settype="EX:IDX" title="Typ: Normal">
    <span class="set-num-idx">1</span>
  </button>

  <!-- 2. Check-Button: massiver, runder Satz-Button (48px) -->
  <button class="set-check" data-toggle="EX:IDX" aria-pressed="false" aria-label="Satz erledigt"></button>

  <!-- 3. Gewicht-Stepper: - / +2.5kg -->
  <div class="stepper" data-weight="EX:IDX">
    <button class="stepper-btn" data-step="-2.5" aria-label="Gewicht verringern">−</button>
    <span class="stepper-val">80</span>
    <button class="stepper-btn" data-step="+2.5" aria-label="Gewicht erhöhen">+2.5</button>
  </div>

  <!-- 4. Reps Quick-Tap-Feld -->
  <button class="quick-tap" data-reps="EX:IDX" aria-label="Wiederholungen">
    <span class="quick-tap-val">8</span>
  </button>

  <!-- 5. Entfernen -->
  <button class="set-remove" data-removeset="EX:IDX" aria-label="Satz entfernen">×</button>
</div>
```

**CSS:**

```css
/* Grid: Satz | Check | Gewicht | Reps | Entfernen */
.set-row {
  display: grid;
  grid-template-columns: 3rem 3rem 1fr 4.5rem 3rem;
  gap: .5rem;
  align-items: center;
  padding: .5rem .75rem;
  border-top: 1px solid #1E293B;   /* lineSoft */
}
.set-row.set-row-done { background: rgba(16,185,129,.08); }
.set-row.set-row-done .stepper-val,
.set-row.set-row-done .quick-tap-val { opacity: .5; text-decoration: line-through; }

/* Satznummer (Typ-Umschalter, analog BWS) */
.set-num {
  position: relative;
  display: grid; place-items: center;
  width: 3rem; height: 3rem; justify-self: center;
  border-radius: .75rem;
  background: #1E293B; border: 1px solid #334155;
  color: #94A3B8; font-size: .85rem; font-weight: 700;
  cursor: pointer; transition: all .15s ease;
}
.set-num:hover { border-color: #38bdf8; color: #fff; }
.set-num.set-num-warmup { border-color: rgba(245,158,11,.45); color: #f59e0b; }
.set-num.set-num-dropset{ border-color: rgba(167,139,250,.45); color: #a78bfa; }
.set-num.set-num-deload { border-color: rgba(148,163,184,.35); color: #94a3b8; }
.set-num-abbr { /* Badge oben rechts: W / D / L */
  position: absolute; top: -.4rem; right: -.5rem;
  background: #38bdf8; color: #06121a;
  font-size: .55rem; font-weight: 800;
  padding: .05rem .25rem; border-radius: 999px; line-height: 1;
}

/* Check-Button: massiv, rund/pill, 48px min — satte Füllung bei erledigt */
.set-check {
  width: 3rem; height: 3rem;          /* 48px */
  min-width: 48px; min-height: 48px;
  justify-self: center;
  border: 2px solid #334155;
  border-radius: 9999px;              /* pill/rund, unverwechselbar */
  background: transparent;
  cursor: pointer;
  display: grid; place-items: center;
  transition: all .15s ease;
}
.set-check::after {
  content: ""; font-weight: 800; font-size: 1.25rem; line-height: 1;
  opacity: 0; transform: scale(.4);
  transition: all .15s ease;
}
.set-check[aria-pressed="true"] {
  background: #10b981; border-color: #10b981;   /* Success Green */
  box-shadow: 0 0 0 4px rgba(16,185,129,.18);
}
.set-check[aria-pressed="true"]::after {
  content: "✓"; color: #022c22; opacity: 1; transform: scale(1);
}

/* Gewicht-Stepper */
.stepper {
  display: grid; grid-template-columns: 2.25rem 1fr 2.5rem;
  align-items: center;
  background: #1E293B; border: 1px solid #334155; border-radius: .75rem;
  overflow: hidden; min-height: 3rem;
}
.stepper-btn {
  min-height: 3rem; font-weight: 700; color: #94a3b8;
  background: transparent; transition: all .15s ease;
}
.stepper-btn:hover { color: #38bdf8; background: rgba(14,165,233,.1); }
.stepper-val {
  text-align: center; font-weight: 700; font-size: 1.15rem;
  color: #f8fafc; font-variant-numeric: tabular-nums;
  border-left: 1px solid #334155; border-right: 1px solid #334155;
}

/* Quick-Tap-Feld (Reps) — großes Target, zeigt Zahl, tippen öffnet Auswahl */
.quick-tap {
  min-height: 3rem; width: 100%;
  background: #1E293B; border: 1px solid #334155; border-radius: .75rem;
  color: #f8fafc; font-weight: 700; font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer; transition: all .15s ease;
}
.quick-tap:hover, .quick-tap:focus-visible { border-color: #38bdf8; }

/* Entfernen */
.set-remove {
  display: grid; place-items: center;
  width: 3rem; height: 3rem; justify-self: center;
  border-radius: .75rem; color: #64748b;
  font-size: 1.35rem; line-height: 1; transition: all .15s ease;
}
.set-remove:hover { color: #f87171; background: rgba(248,113,113,.1); }
```

> **Interaktion:** `+2.5kg`-Step ist der Standard-Schritt bei Gewicht. `aria-pressed="true"` ersetzt den alten `:checked`-Zustand — der Satz-Button ist eine `:focus-visible`-fähige Schaltfläche mit klarem `✓`. Rechter Daumen erreicht den Check-Button ohne Umgreifen (rechtslastige Grid-Breite).

---

### 5.3 `RestTimer` — schwebende Leiste (Bottom Drawer)

Dezent schwebende Leiste am unteren Rand, mit **kreisförmigem Fortschrittsbalken** und Schnell-Buttons (`+30s`, `Überspringen`, `Abbrechen`).

```html
<div id="rest-bar" class="fixed bottom-0 inset-x-0 z-40 hidden">
  <div class="rest-drawer max-w-md mx-auto">
    <!-- Kreis-Fortschritt -->
    <div class="rest-ring" role="timer" aria-live="polite">
      <svg viewBox="0 0 64 64" class="rest-ring-svg">
        <circle class="rest-ring-bg"  cx="32" cy="32" r="28" />
        <circle class="rest-ring-fill" cx="32" cy="32" r="28"
                id="rest-ring-progress" stroke-dasharray="175.9" stroke-dashoffset="0" />
      </svg>
      <span id="rest-countdown" class="rest-countdown">2:00</span>
    </div>

    <!-- Text & Schnell-Buttons -->
    <div class="rest-info">
      <p class="text-xs text-slate-400">Pause</p>
      <div class="flex gap-2 mt-1">
        <button id="rest-plus30" class="timer-btn">+30s</button>
        <button id="rest-skip"   class="timer-btn timer-btn-accent">Überspringen</button>
        <button id="rest-cancel" class="timer-btn">Abbrechen</button>
      </div>
    </div>
  </div>
</div>
```

**CSS:**

```css
.rest-drawer {
  display: flex; align-items: center; gap: 1rem;
  background: rgba(15, 23, 42, .85);          /* panel, transluzent */
  backdrop-filter: blur(12px);
  border: 1px solid #334155;
  border-bottom: none;
  border-radius: 1rem 1rem 0 0;
  padding: .875rem 1.25rem calc(.875rem + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 24px rgba(0,0,0,.4);
}

/* Kreis-Ring (SVG) */
.rest-ring { position: relative; width: 4rem; height: 4rem; flex-shrink: 0; }
.rest-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.rest-ring-bg  { fill: none; stroke: #1E293B; stroke-width: 5; }
.rest-ring-fill{ fill: none; stroke: #38bdf8; stroke-width: 5; stroke-linecap: round;
                 transition: stroke-dashoffset .3s linear; }
.rest-countdown {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  color: #38bdf8; font-weight: 800; font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.timer-btn {
  min-height: 44px;
  background: #1E293B; border: 1px solid #334155; border-radius: .75rem;
  padding: .4rem .9rem; font-size: .8rem; color: #cbd5e1;
  transition: all .15s ease;
}
.timer-btn:hover { border-color: #38bdf8; color: #fff; }
.timer-btn-accent { background: rgba(14,165,233,.15); border-color: rgba(14,165,233,.4); color: #38bdf8; }
```

> **Fortschritt (JS):** `stroke-dashoffset = 175.9 × (1 − rest/total)`, wobei `175.9 ≈ 2π·28` (Umfang bei `r=28`). `stroke-dasharray="175.9"`. Bei Ablauf blinkt der Ring einmal grün (`.rest-ring-done` → `stroke: #10b981`).

---

### 5.4 `KPIDashboard` — Metrik-Karten (wissenschaftlicher Look)

Kompakte Metrik-Karten mit feiner Kontur, dezent-dunklem, geblurrtem Hintergrund und klaren Kennzahlen.

**Grid:** `grid grid-cols-2 gap-3` (mobil), `sm:grid-cols-4` (breiter).

```html
<div class="grid grid-cols-2 gap-3">
  <!-- KPI: Gesamtvolumen -->
  <div class="kpi-card">
    <p class="kpi-label">Gesamtvolumen</p>
    <p class="kpi-value">12.480 <span class="kpi-unit">kg</span></p>
    <span class="trend trend-up">↑ +650 kg vs. letzte Woche</span>
  </div>

  <!-- KPI: Absolvierte Sätze -->
  <div class="kpi-card">
    <p class="kpi-label">Sätze</p>
    <p class="kpi-value">24<span class="kpi-unit">/30</span></p>
    <span class="trend trend-flat">Ø 6 Sätze / Übung</span>
  </div>

  <!-- KPI: Intensität -->
  <div class="kpi-card">
    <p class="kpi-label">Intensität</p>
    <p class="kpi-value">RPE 8</p>
    <span class="trend trend-up">RIR 2</span>
  </div>

  <!-- KPI: PR / Trend -->
  <div class="kpi-card">
    <p class="kpi-label">Bankdrücken PR</p>
    <p class="kpi-value">80 <span class="kpi-unit">kg</span></p>
    <span class="trend trend-up">↑ +5 kg vs. letzte Woche</span>
  </div>
</div>
```

**CSS:**

```css
.kpi-card {
  background: rgba(15, 23, 42, .6);   /* bg-slate-900/60 */
  backdrop-filter: blur(8px);
  border: 1px solid #1E293B;          /* border-slate-800 */
  border-radius: 1rem;
  padding: 1rem;
  display: flex; flex-direction: column; gap: .25rem;
}
.kpi-label {
  font-size: .6875rem; text-transform: uppercase;
  letter-spacing: .08em; color: #64748b;
}
.kpi-value {
  font-size: 1.5rem; font-weight: 700;
  color: #f8fafc; font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.kpi-unit { font-size: .875rem; font-weight: 500; color: #94a3b8; }

/* Trend-Badges */
.trend {
  align-self: flex-start;
  font-size: .6875rem; font-weight: 600;
  padding: .15rem .5rem; border-radius: 9999px;
}
.trend-up   { color: #34d399; background: rgba(16,185,129,.15); }
.trend-down { color: #f87171; background: rgba(248,113,113,.12); }
.trend-flat { color: #94a3b8; background: rgba(51,65,85,.5); }
```

> **Regel:** Trend-Indikatoren zeigen **progressive Overload** — grüne Badges `↑ +X kg vs. letzte Woche` bei Steigerung, rot `↓` bei Rückgang, neutral bei gleich. Nie ohne Vergleichsbasis („vs. letzte Woche") einen Wert anzeigen.

### 5.5 `TabBar` — Bottom-Navigation (Mockup-konform)

Vier Tabs: Workouts / Verlauf / Statistik / Profil. Ersetzt die früheren
Header-Buttons; das aktive Tab trägt `tab-active` (Cyan + 2px-Top-Kante).
Touch-Targets ≥ 44px (`min-height: 56px`).

```html
<nav class="tab-bar" aria-label="Hauptnavigation">
  <div class="tab-bar-inner">
    <button data-tab="workouts" class="tab-btn tab-active" aria-current="page">
      <span class="tab-icon" aria-hidden="true">🏋️</span><span>Workouts</span>
    </button>
    <!-- … history / stats / profile analog -->
  </div>
</nav>
```

**CSS (`style.css`):**

```css
.tab-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
  background: rgba(2, 6, 23, .92);
  backdrop-filter: blur(12px);
  border-top: 1px solid #1E293B;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-bar-inner { max-width: 28rem; margin: 0 auto;
                 display: grid; grid-template-columns: repeat(4, 1fr); }
.tab-btn { min-height: 56px; display: flex; flex-direction: column;
           align-items: center; justify-content: center; gap: 2px;
           color: #64748b; font-size: .625rem; font-weight: 600; }
.tab-btn .tab-icon { font-size: 1.05rem; line-height: 1; opacity: .85; filter: grayscale(1); }
.tab-btn.tab-active { color: #38bdf8; box-shadow: inset 0 2px 0 #0ea5e9; }
.tab-btn.tab-active .tab-icon { opacity: 1; filter: none; }
```

> **Regel:** Die Tab-Bar erscheint auf Workouts/Verlauf/Statistik/Profil
> (`src/components/TabBar.ts`, `tabBarHtml()` + `bindTabBar()`). Nur die
> Workout-Logger-Ansicht behält ihren „‹ Zurück“-Button (kein Tab).

### 5.6 Diagramme (Donut + Linien, dependency-frei)

SVG-Diagramme aus `src/lib/charts.ts`, Farben ausschließlich aus der
Palette `CHART_COLORS` (Token-Ableitungen). Kein Chart-Framework.

- **Donut** (`donutChart(slices, size)`): Segmente als `stroke-dasharray`-Kreise,
  zentrale Anzeige „X kg gesamt“; Legende separat mit `.legend-dot`.
- **Linien-Chart** (`lineChart(series, xLabels, height)`): mehrere Serien,
  `null`-Werte erzeugen Lücken; horizontale Gridlines `line-chart-grid`,
  Achsenbeschriftung `line-chart-axis` (erste/letzte Bucket-Beschriftung).

> **Regel:** Charts zeigen ausschließlich reale Daten aus dem `WorkoutStore` —
> keine erfundenen Verläufe. Ohne Daten ein Hinweis-Text statt leerem SVG.

---

## 6. Abschluss & Umsetzung

**Vollständige Übereinstimmung mit den Anforderungen:**
1. **`ExerciseCard` + `SetRow`** — Abschnitt 5.1/5.2: Stepper `-`/`+2.5kg`, Quick-Tap-Felder, massiver 48px-Check-Button mit satter Grün-Füllung, Grid-Spalten, 44px-Touch-Targets.
2. **Schwebender `RestTimer`** — Abschnitt 5.3: Bottom Drawer mit kreisförmigem SVG-Fortschrittsring, `+30s` / `Überspringen` / `Abbrechen`.
3. **`KPIDashboard`-Cards** — Abschnitt 5.4: Metrik-Karten mit `border-slate-800`, `bg-slate-900/60 backdrop-blur`, KPI-Kennzahlen und Trend-Badges.

**Validierung vor Merge:** `npm run typecheck` + Produktions-Build. Keine Inline-Farben; alle Werte über die Tokens aus Abschnitt 2.