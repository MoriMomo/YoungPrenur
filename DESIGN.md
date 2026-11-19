---
name: MDIP
description: Manufacturing decision intelligence, set as an inspection certificate: cool security paper, print ink, one ink-pad stamp blue.
colors:
  paper: "#f3f5f1"
  sheet: "#fbfcfa"
  sheet-sunk: "#eceff0"
  ink: "#14181c"
  ink-2: "#3b434b"
  ink-3: "#5f6870"
  rule: "#d5ddd6"
  rule-soft: "#e6ebe6"
  rule-strong: "#aab6ac"
  guilloche: "#c9d5cb"
  stamp: "#2b3fbf"
  stamp-deep: "#1f2f95"
  stamp-wash: "#e7eaf8"
  stamp-line: "#c2c9ef"
  pass: "#2a7449"
  pass-wash: "#e3f0e8"
  pass-line: "#b8d8c5"
  hold: "#c0302a"
  hold-wash: "#f8e5e3"
  hold-line: "#ecbfba"
  warn: "#82500a"
  warn-wash: "#f6edd9"
  warn-line: "#e6d0a1"
typography:
  display-hero:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "4.75rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  display-section:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.1
  page-title:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  panel-title:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  body-lead:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  verdict:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "18px"
    letterSpacing: "0.04em"
  measure:
    fontFamily: "Red Hat Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "'tnum' 1, 'zero' 1"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "4px"
  2xl: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.sheet}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.stamp-deep}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.sheet-sunk}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-danger:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.hold}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  verdict-pass:
    backgroundColor: "{colors.pass-wash}"
    textColor: "{colors.pass}"
    typography: "{typography.verdict}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  verdict-hold:
    backgroundColor: "{colors.hold-wash}"
    textColor: "{colors.hold}"
    typography: "{typography.verdict}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  verdict-warn:
    backgroundColor: "{colors.warn-wash}"
    textColor: "{colors.warn}"
    typography: "{typography.verdict}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  verdict-info:
    backgroundColor: "{colors.stamp-wash}"
    textColor: "{colors.stamp}"
    typography: "{typography.verdict}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  page-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.page-title}"
    padding: "0 0 20px"
  kpi-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.measure}"
    padding: "16px 20px"
  sidebar-rail:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    width: "240px"
  sidebar-item-active:
    backgroundColor: "{colors.stamp-wash}"
    textColor: "{colors.stamp-deep}"
    rounded: "{rounded.md}"
    height: "36px"
  ink-layer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.lg}"
    padding: "12px"
  topbar:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    height: "56px"
---

# Design System: MDIP

## Overview

**Creative North Star: "The Mill Test Certificate"**

MDIP looks like the certificate that ships with a batch of certified steel: cool security paper, print ink, ruled fields, one round ink-pad stamp. Decisions about delay risk are presented as inspected findings with a verdict, not as a glowing analytics feed. The tone is institutional and exact: dense but calm, every value in a ruled box, every status a stamped word.

Depth is printed, not lit. Surfaces are flat sheets separated by rules (hairline and double-rule), corners are crisp, and the single accent is stamp blue, the colour an inspector's pad would leave. The dashboard keeps the same paper: a light sheet rail with a ruled edge, a sticky topbar, and no dark surfaces beyond small floating layers.

Brand constraints carried from the product record: no partner, university or company names appear in the interface, no TRL label is shown, and any sample data is labelled as sample.

**Key Characteristics:**
- Cool paper ground, print-ink text, ruled (not carded) structure.
- One accent: stamp blue. Verdict colours exist only to say pass, hold or warn.
- Condensed display face for titles; monospace only for measured values.
- Crisp 2 to 4px corners; shadows only on floating layers.
- One authored motion: the inspector's stamp landing on the landing page.

## Colors

A restrained paper-and-ink palette with one saturated accent; verdict hues are functional and never decorative.

### Primary
- **Ink-Pad Stamp Blue** (`colors.stamp`): the only accent. Primary buttons, links, selection, focus ring (2px, 2px offset), caret, and the stamp itself.
- **Deep Stamp** (`colors.stamp-deep`): primary hover/pressed.
- **Stamp Wash / Stamp Line** (`colors.stamp-wash`, `colors.stamp-line`): the quiet "info" verdict fill and border.

### Secondary
- **Pass Green** (`colors.pass`), **Hold Red** (`colors.hold`), **Warn Ochre** (`colors.warn`, darkened for text contrast), each with `-wash` fill and `-line` border: status only (within tolerance, out of tolerance, near tolerance; approved, critical, pending).

### Neutral
- **Security Paper** (`colors.paper`): page ground. **Sheet** (`colors.sheet`): certificate faces, cards, inputs, topbar. **Sheet Sunk** (`colors.sheet-sunk`): hover and neutral-chip fill.
- **Print Ink** (`colors.ink`), **Ink 2**, **Ink 3**: primary, secondary and tertiary text; Ink 3 is the floor for captions.
- **Rule / Rule Soft / Rule Strong**: hairlines, row dividers, and structural frames and headers. **Guilloche** (`colors.guilloche`): the engraved wave band stroke.

### Named Rules
**The One Token Source Rule.** Every colour comes from the `@theme` block in `globals.css` as a generated utility (`bg-paper`, `text-ink`, `border-rule`). No hex literals in components.

**The One Accent Rule.** Stamp blue is the only accent. Do not introduce a second brand hue.

**The Verdict Rule.** Pass, hold and warn colour mean status and nothing else. Never use them for decoration, category, or emphasis.

**The Ink Layer Rule.** `bg-ink` with light text is for floating overlays only (the toast and the chart tooltip). Rails, pages, cards and panels stay on paper and sheet; there is no dark navy surface family.

## Typography

**Display Font:** Sofia Sans Condensed (`--font-display`, 500 to 800; fallback Arial Narrow)
**Body Font:** Public Sans (`--font-body`, fallback system-ui)
**Data Font:** Red Hat Mono (`--font-data`, fallback ui-monospace), tabular figures and slashed zero

**Character:** An institutional workhorse face for reading, a tall condensed face for the stamped headings, and a mono face reserved for readings.

### Hierarchy
- **Display hero** (800, 44px to 76px, 0.95, uppercase): the landing H1 only.
- **Section display** (700, 34px, 1.1): landing section titles; **page title** (700, 30 to 34px, 1.05) in `PageHeader`.
- **Panel title** (700, 20 to 24px): dashboard and landing panel headings.
- **Body** (400, 14px, 1.625; lead 16px): running text, max width 32 to 36rem (about 70 characters).
- **Label** (500, 12px): field and KPI captions; 12px is the minimum text size anywhere.
- **Verdict** (600, 12px, 0.04em, uppercase condensed): status marks.
- **Measure** (500, 30px, tabular): KPI values and readings.

### Named Rules
**The Titles Only Rule.** The condensed face is for page and section titles (and verdict marks, stamp text, the wordmark). Eyebrow labels above headings are banned.

**The Readings Only Rule.** Monospace is for measured values and codes (`font-mono-numbers`). Never for prose, nav or buttons.

**The Pretty Wrap Rule.** Paragraphs, list items and definitions use `text-wrap: pretty`; headings use `balance`.

**The Seventy Rule.** Line length stays near 70 characters, set with rem-based max widths (`max-w-[36rem]`), not px.

## Layout

A certificate sheet on paper: the landing page is one framed sheet (max 1240px) with ruled divisions. The dashboard is a 240px light sheet rail (`border-r` in `rule-strong`) plus a sticky 56px topbar and a paper content area led by `PageHeader`. KPIs are one ruled grid (1 / 2 / 4 columns), not floating cards. Spacing runs on a 4px base with 16, 20 and 24px as the common steps. The rail becomes an off-canvas drawer below the `lg` breakpoint. Structure comes from rules and alignment; avoid nesting boxes in boxes. The landing inspection table (with a Main driver column) turns into stacked records below `md`; the Stamp sits over the table's top-right edge on `md` and up and beside the signature line on phones. Data tables (scheduler deviations, inspection table) scroll horizontally inside their own box with a min-width on small screens; the page itself never scrolls sideways.

## Elevation & Depth

Flat by default, tonal layering (paper, sheet, sheet-sunk) and rules carry depth. Print has no glow.

### Shadow Vocabulary
- **Hairline** (`box-shadow: 0 1px 1px rgb(20 24 28 / 0.04)`, `0 1px 2px / 0.06`): at-rest lift, rarely used.
- **Raised** (`0 2px 6px rgb(20 24 28 / 0.07)`): small popovers.
- **Floating** (`0 8px 20px / 0.10`, `0 12px 28px / 0.12`, `0 18px 40px / 0.16`): drawers, modals, menus only.

### Named Rules
**The Certificate Frame Rule.** A sheet gets a double rule (`cert-frame`: 1px border plus 1px outline at 4px offset in `rule-strong`), not a shadow.

**The Narrow Band Rule.** Guilloche is an authored SVG sine-wave pattern (four interlaced, phase-shifted waves in `guilloche` stroke on sheet, not gradients). It appears only in narrow header bands such as the landing navbar, never behind body text.

## Shapes

Crisp, never pill-soft: 2px (verdicts, scrollbar thumbs), 3px (buttons, inputs, rail items), 4px (panels), 6px at most. `rounded-full` is reserved for status dots. Borders are 1px rules; the signature silhouette is the round double-ringed stamp.

## Components

### Buttons
- **Shape:** 3px corners; heights 32 / 36 / 44px (sm, md, lg).
- **Primary:** stamp fill, sheet text, deep-stamp hover and border.
- **Secondary:** sheet with `rule-strong` border; hover sunk. **Ghost:** transparent, ink-2 text. **Danger:** sheet with hold text and hold-line border, hover hold wash.
- **Focus:** global 2px stamp outline at 2px offset. Disabled: 50% opacity.

### Verdict
Condensed uppercase 12px mark in a ruled 2px-corner box, filled with the wash and bordered with the line of its tone (pass, hold, warn, info = stamp, neutral). Every status, category and result label uses it; `toneFor()` maps free-text statuses.

### PageHeader
Condensed page title, one line of purpose (max 36rem), actions at right, `rule-strong` base border. One per dashboard route.

### KPI field
Ruled grid cell: 12px caption, mono 30px value, tone dot (8px, tolerance label in title), deviation line with arrow and context in ink-3.

### Navigation
Landing: guilloche header band with the condensed wordmark. Dashboard: light sheet rail with ink text, 36px items, 16px stroke-1.6 icons, active item on `stamp-wash` with `stamp-deep` text, hover on `sheet-sunk`, warn counts in mono, live/sample data note at the foot. Topbar: sheet, 56px, plain text route title.

### Ink layer
Toast and chart tooltip: `ink` fill with light text and a floating shadow. The only dark surfaces in the system; never used for panels or navigation.

### Model card strip
Leads with the single validated claim (what the model was validated on), then the supporting measurements in ruled cells.

### Landing inspection table
Ruled table with a Main driver column, stacked records below `md`; the roles section lists measurement names with no figures.

### Stamp
Double-ringed round mark in stamp blue (rings 4px and 1.5px, curved condensed caps, centred value), rotated -9deg. At most one per page, and only certifying a real, verifiable fact. Lands with `animate-stamp` (520ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 380ms delay); under `prefers-reduced-motion` it appears static.

## Do's and Don'ts

### Do:
- **Do** pull every colour from the `@theme` tokens in `globals.css`.
- **Do** use stamp blue for the primary action, links, selection and focus, and nothing else.
- **Do** label sample data as sample wherever it appears.
- **Do** keep text at 12px minimum and prose near 70 characters wide.
- **Do** use `Verdict` for every status and `font-mono-numbers` for every measured value.

### Don't:
- **Don't** put eyebrow labels above headings.
- **Don't** use verdict colours for decoration or a second accent.
- **Don't** use pill buttons or radii above 6px (dots excepted).
- **Don't** put guilloche behind body text or place more than one stamp on a page.
- **Don't** use dark `bg-ink` surfaces for anything except toasts and tooltips.
- **Don't** name partners, universities or companies, or show a TRL label.
- **Don't** add motion beyond the landing stamp.
