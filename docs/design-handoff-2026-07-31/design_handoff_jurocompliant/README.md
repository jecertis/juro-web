# Handoff: Jurocompliant Visual Redesign

## Overview
Redesign of two connected surfaces for Jurocompliant, a compliance-scanning product (GDPR/DORA/DPDP): (1) the public marketing site and (2) the customer-facing scan-results dashboard/report. Both share one visual system so a user moving from the marketing site into a live report recognizes the brand.

## About the Design Files
The two `.dc.html` files in this bundle are **design references built in HTML** — high-fidelity prototypes of look, layout, and interaction, not production code to copy verbatim. Recreate them in the target codebase's existing framework (React, Vue, etc.) using its established component patterns, data layer, and routing — or choose the most suitable framework if none exists yet. Inline styles in the source were an authoring constraint of the design tool; the production build should use the codebase's normal styling approach (CSS-in-JS, Tailwind, CSS modules, whatever is standard there).

## Fidelity
**High-fidelity.** Exact colors, type, spacing, and interaction states are final-intent. Recreate pixel-close using the codebase's component library/styling system.

## Design Tokens

**Colors**
- Background (near-black): `#0A0A0A` (primary), `#111111` (raised panels/cards on dark)
- Panel borders on dark: `#1F1F1F` / `#262626` (lighter)
- Accent (electric yellow): `#F5C400`, hover `#D4A800`
- White content cards (on dark surfaces): `#FFFFFF` background, `#E5E5E5` border, `10px` corner radius
- Text on dark: `#FFFFFF` primary, `#A3A3A3` secondary, `#737373` tertiary/meta, `#525252` quaternary
- Text on white cards: `#0A0A0A` primary, `#525252` secondary, `#737373` meta
- Status: critical/red `#DC2626`, high/amber `#D97706`, medium/neutral `#A3A3A3`/`#525252`, good/verified green `#059669`
- Status tints (light backgrounds for badges/callouts): red tint `#FEF2F2`, amber tint `#FFFBEB`, green tint `#ECFDF5`

**Typography**
- Body/UI: IBM Plex Sans (400/500/600/700)
- Mono (timestamps, eyebrows/tags, code, data values, logo wordmark): IBM Plex Mono (400/500/600)
- Mono-as-eyebrow pattern: uppercase, `letter-spacing: .14em–.18em`, `font-size: 9.5–11px`, usually accent-colored
- Headings: tight letter-spacing (-0.02em to -0.035em), font-weight 600
- Logo wordmark: "juro" (white) + "compliant" (yellow `#F5C400`), IBM Plex Mono 600

**Cards / Surfaces**
- White cards: `#FFFFFF` bg, `1px solid #E5E5E5` border, `10px` radius, used for all data/report content even on dark pages
- Dark panels: `#111111` bg, `1px solid #1F1F1F` or `#262626` border, `10–12px` radius
- Severity accent: 3–4px colored left border or top border strip on cards (red/amber/gray/green)

**Motion**
- Scan-line sweep (translateY + opacity fade, ~2.4s linear loop) on the hero report-preview mock
- Pulse (opacity 1↔0.3–0.35, 2s ease-in-out) on "live" status dots
- Drawer slide-in from right (translateX 24px→0, opacity fade, ~0.22s ease) for detail panels
- Hover: subtle background lighten on dark rows/panels, border-color shift to yellow/white on buttons, no large transforms

## Screens / Views

### 1. Marketing Site (`Marketing Site.dc.html`)
Single scrolling page, dark (`#0A0A0A`) background throughout.

- **Header** (sticky, blurred glass on scroll): logo left, nav (How it works / Regulatory risk / Evidence / Pricing / Partners), sign-in link + yellow "Run a scan" button right.
- **Hero**: two-column. Left: eyebrow tag ("Non-custodial · GDPR · DORA · DPDP" with pulsing green dot), H1 "Compliance you can **prove.**" (prove. in yellow), supporting paragraph, a functional URL input + "Scan now" CTA (mono-font input, yellow button), trust row (No agent / No data retention / ~90s), stat row (sealed reports / regimes covered / bytes retained). Right: a live report-preview mock (white card) showing a scan running: 4 KPI tiles (Critical/High/Medium/Verified), a progress bar with phase text that advances through canned states, two sample finding rows, a hash + "Verify" footer. Background: faint grid pattern + radial yellow glow.
  - **Interaction**: typing a URL and pressing Enter/clicking "Scan now" animates the progress bar (~0–100% over ~3s via interval ticks), updates a phase-status line, and on completion flips the card header dot/label to "Sealed."
- **How it works** (id `how`): 4-column grid (numbered 01–04) on `#111111`: Point at the surface / Scan non-custodially / Map to obligations / Seal the result.
- **Regulatory risk** (id `risk`): two-column — left: stakes copy + a customer quote; right: a white "exposure table" card listing GDPR/DORA/DPDP with description and max penalty (€20M, 1% daily turnover, ₹250cr), footer strip with median EU enforcement figure.
- **Verifiable evidence** (id `evidence`): two-column — left: copy + 3 bullet features (Ed25519 signature, pinned rule versions, transparency log); right: a dark terminal-style "verify" card showing a mock CLI output (`$ jc verify report-8841.jcz` → OK).
- **Pricing** (id `pricing`): 3-tier card grid (Single scan €390/report, Continuous €1,850/mo — highlighted "Most adopted", Assurance/Custom — dark card). Each lists inclusions + CTA button.
- **Partners** (id `partners`): eyebrow + link, 5-up placeholder logo strip (striped SVG-pattern placeholders — replace with real partner logos).
- **About** section: eyebrow "Who we are" + heading, 2×2 grid of value props (non-custodial by design, rules with authors, evidence over dashboards, independent verification).
- **Final CTA band**: centered headline + URL input/CTA (same functional pattern as hero).
- **Footer**: logo + description, 3 link columns (Product/Coverage/Company incl. a link to the sample report dashboard), bottom bar with copyright + signing-key fingerprint.

### 2. Reports Dashboard (`Reports Dashboard.dc.html`)
App-shell layout: fixed left sidebar (232px) + scrollable main content, dark background, white content cards.

- **Sidebar**: logo, "Report" section nav (Posture at a glance / Posture gaps [count badge] / Resources in scope / Suggested rules / Artifact verification [status dot]), "History" section (past scan dates + gap counts), "Next scheduled scan" callout card at the bottom.
- **Top bar** (sticky): report id, sealed/unsigned status pill (dot + label, color-coded), spacer, "toggle seal state" debug/demo button, "Share with auditor" button, primary yellow "Export bundle" button.
- **Report header card**: target domain as H1, regime version tags (GDPR/DORA/DPDP + rule-pack versions), scan metadata row (completed timestamp, runtime, non-custodial), a posture-score donut (conic-gradient ring, e.g. 68/100), a "vs. last scan" delta block + obligations-evaluated count.
- **Posture at a glance** (id via KPI section): 4 KPI cards — Critical / High / Medium (white cards, colored left-edge bar, count, sub-detail line) + a 4th dark "Total gaps" card with a stacked severity bar and verified count.
- **Run summary**: white card, 6-column metadata strip — Target, Started, Completed, Assets scanned, Rules executed, Data retained (0 bytes, green).
- **Posture gaps by severity** (id `gaps`): white card. Header with count + severity filter tabs (All/Critical/High/Medium — pill toggle group). Table: Severity badge, Rule reference (mono), Finding title, Asset (mono), Owner, chevron. Rows are clickable.
  - **Interaction**: clicking a tab filters the table (state-driven, no page reload); clicking a row opens a right-side detail drawer.
- **Detail drawer** (slide-in panel, ~520px wide, right-anchored, overlay backdrop): severity badge + rule id header, close button, finding title, 3-up meta grid (Asset/Owner/Effort), "What we observed" description, a yellow-accented "Remediation guidance" callout box, reference/authority chips, action buttons (Assign to owner / Evidence excerpt).
- **Resources in scope by regulation** (id `matrix`): white card, heatmap/matrix — rows are resource classes (Public web surface, Payments API, CRM & customer data, Log & object storage, Third-party processors, Legacy endpoints), columns are regulation clauses (GDPR 32/44/30, DORA 11/28, DPDP 8); each cell is a colored status chip (✓ verified green / ! gap amber / ✕ critical red / – n/a gray) with a legend above.
- **Suggested rules** (id `rules`, sits beside the matrix): dark card listing 3 not-yet-enabled rules with rule-pack/version/cadence metadata and an "Enable" button each.
- **Artifact verification** (id `seal`): full-width dark panel, split into two halves by a vertical divider — left: large seal glyph/badge (✓ or !), headline ("Sealed evidence" / "Draft — not sealed"), status subline, descriptive copy, primary CTA ("Download signed bundle" / "Re-run with signing") + secondary ("Verification instructions"); right: signing-bundle detail key/value list (bundle name+size, canonical digest, algorithm, signer, timestamp authority, transparency log, rule digest count) plus a mock terminal verify-output block. All values and colors swap based on signed/unsigned state.

## State Management
- **Marketing site**: `url` (input text), `scanning` (bool), `pct` (0–100 progress), `done` (bool) — driven by a `setInterval` demo simulation; on real integration, replace with actual scan-job polling/websocket state.
- **Dashboard**: `signed` (bool, toggles the whole Artifact Verification panel + top-bar pill between sealed/unsigned states — in production this reflects the real signature-verification result, not a toggle), `filter` (severity tab: all/critical/high/medium), `open` (currently-selected finding id, drives the detail drawer). Findings dataset: 22 items (3 critical / 7 high / 12 medium) — counts across the KPI cards, tab labels, and table must stay reconciled to the same source list in production (they were a launch bug here: KPI copy claimed 22 but the list only had 10 until fixed).

## Assets
No raster images. Partner-logo tiles on the marketing site are striped placeholder rectangles labeled "partner logo" — swap for real partner logos before ship. No icons beyond inline unicode glyphs (✓, ✕, !, →, ▸) and CSS-drawn shapes (dots, conic-gradient ring, bar chips) — no external icon library used; pick one in the target codebase if richer iconography is wanted.

## Files
- `Marketing Site.dc.html` — public site (hero, how-it-works, risk, evidence, pricing, partners, about, footer)
- `Reports Dashboard.dc.html` — customer report/dashboard (sidebar, KPIs, findings table + drawer, matrix, suggested rules, seal panel)

Both files are self-contained and open directly in a browser for reference. Google Fonts (IBM Plex Sans/Mono) are loaded via `<link>` in each file's `<head>`.
