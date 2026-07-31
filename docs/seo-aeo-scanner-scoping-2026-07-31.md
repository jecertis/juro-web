# BL-ENG-146 — CI-integrated page-quality scanner: scoping

**Status:** scoping only. No scanner code is proposed for merge by this document.
**Date:** 2026-07-31
**Companion to:** `docs/seo-aeo-publish-gate.md` (the 10-phase framework, juro-web PR #137 — **not yet merged to main**, so the relative link above resolves only once #137 lands).
**Backlog:** BL-ENG-146 (juro-workspace `BACKLOG.md`).

---

## 0. Summary for the founder

Three findings change the shape of the build before a line of code is written:

1. **~83% of the checklist is mechanically checkable.** Of the framework's weighted points, roughly 108 are pure automation, 12 are LLM-advisory candidates, and 10 are permanently human. The "we need an LLM to grade AEO" intuition is mostly wrong — most AEO items as literally written are word counts, heading regexes, DOM node counts, and host allowlists.
2. **This is two runners, not one.** Source-time checks (metadata, schema, headings, AEO formatting) run pre-merge on files on disk. Deployed-URL checks (status codes, redirect chains, response headers, TTFB, HTTP/2) structurally cannot run pre-merge against a static checkout. The publish gate therefore splits into a blocking pre-merge gate and a post-deploy monitor.
3. **Two phases cannot meet their stated gate on current infrastructure and need a founder decision** — Phase 9 (Security) at Critical-100% is unachievable on GitHub Pages, and Phase 10 (Analytics) as written would penalise the site for living Axiom 4. Details in §4.

Recommended v1 scope is roughly **10 engineer-days**, sequenced so the first meaningful gate lands on day 2.

### Defect in the framework's own arithmetic (needs a founder ruling)

The scoring rubric in `seo-aeo-publish-gate.md` sums to **130**, not 120:

```
10 + 20 + 15 + 15 + 20 + 10 + 10 + 10 + 10 + 10 = 130
```

The grade bands (`115–120 = A+`, `<80 = F`) are written against a 120 denominator. A scanner cannot emit a score until this is resolved. Two options: (a) keep the weights, restate the denominator as 130 and rescale the bands; (b) keep 120 and drop 10 points of weight somewhere. **Recommendation: (a)** — the weights encode real editorial priority; the bands are arbitrary. This document uses /130 throughout and flags it wherever it matters.

Separately: the band label "A+ (Enterprise-ready)" should not propagate into scanner output. "enterprise-grade" is on the banned-claims list and "enterprise-ready" is close enough to invite the same objection. Proposed grade vocabulary for the scanner: `A+ / A / B / C / F` with no marketing sub-label.

---

## 1. What already exists (do not rebuild)

| Asset | Location | Covers |
| --- | --- | --- |
| Lighthouse CI | `lighthouserc.json` + `lighthouse` job in `.github/workflows/test.yml` | Phase 3 entirely, parts of 2 and 6 |
| HTMLHint | `.htmlhintrc` + `lint-html` job in `test.yml` | `title-require`, `alt-require`, `doctype-html5`, `id-unique`, `html-has-lang` — slivers of Phase 2 |
| Playwright | `playwright.config.ts`, 17 specs in `tests/` | Functional behaviour; the DOM harness the new checks should reuse |
| Visual regression | `playwright.visual.config.ts`, `tests/__screenshots__/` | Layout stability; adjacent to Phase 8, not a substitute |
| Banned-claims | `.github/workflows/banned-claims.yml` | Axiom-2 language discipline on `*.html` at maxdepth 2 |
| Sitemap + robots | `sitemap.xml`, `robots.txt` (AI crawlers explicitly allowed) | Phase 1 inputs |
| JSON-LD | Already rich: 17 `FAQPage`, 16 `WebPage`, 12 `Article`, 11 `BreadcrumbList`, 8 `Organization`, 1 `SoftwareApplication` across 24 HTML pages | Phase 2 schema block is mostly *already satisfied* — the scanner's job is to keep it that way |

**The Lighthouse job is the extension point.** Do not add a second Lighthouse invocation.

Three concrete gaps in the existing Lighthouse setup, all of which are calibration decisions rather than code:

- `collect.url` covers **3 of 24** HTML pages (`index`, `checklist`, `install`). Blog posts, `partners`, `about`, `privacy`, `dora-soc2-gap`, the handbook — all unmeasured.
- `categories:performance` asserts `["error", { minScore: 0.85 }]`. The framework says **≥90, Critical**. Mismatch.
- `categories:seo` asserts `["warn", { minScore: 0.95 }]`. Technical SEO is **Critical-100%**. Promoting `warn` → `error` is a real behaviour change and **will likely turn CI red on pages that pass today**.

Because `staticDistDir` serves from `localhost`, the config deliberately skips `canonical`, `is-on-https`, `uses-http2`, `redirects-http`. Those four are Phase 1/2/3 requirements. They are the seed of the two-runner split in §2.

**Incidental observation, not in scope for this work:** `.github/workflows/ci.yml` and `.github/workflows/test.yml` carry a near-identical duplicated `playwright` job with the same spec-resolution logic, so every HTML PR runs the functional suite twice. Worth a separate backlog item; explicitly **not** to be fixed inside the scanner build.

---

## 2. Architecture — the two-runner split

```
                    ┌─────────────────────────────────────────┐
   PR opened  ──▶   │  RUNNER A — source-time (blocking)      │
                    │  reads HTML files on disk               │
                    │  • page-quality static analyzer (new)   │
                    │  • Lighthouse CI (existing, extended)   │
                    │  • axe-core via Playwright (new)        │
                    │  • HTMLHint (existing)                  │
                    └──────────────┬──────────────────────────┘
                                   │ emits report.json
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │  scorer + reporter (new)                │
                    │  weighted score, issue list, exit code  │
                    └──────────────┬──────────────────────────┘
                                   │
              PR comment (Markdown) + HTML dashboard artifact
                                   │
   merge ──▶ deploy.yml ──▶  ┌─────────────────────────────────┐
                             │  RUNNER B — deployed-URL        │
                             │  (post-deploy, non-blocking)    │
                             │  • header/status/redirect probe │
                             │  • TTFB, HTTP/2, CDN, HSTS      │
                             └─────────────────────────────────┘
```

**Why B cannot be folded into A:** response headers, status codes, redirect chains, TTFB, HTTP/2 and CDN behaviour are properties of GitHub Pages + Fastly, not of the HTML in the repo. No pre-merge check can observe them. Runner B therefore reports on what *is deployed*, one merge behind — it detects regressions, it cannot prevent them. That is a structural property of hosting a static site on Pages, not a design shortcut.

### Proposed layout

```
tools/page-quality/
  ├── collectors/
  │   ├── crawl.ts        # sitemap membership, internal link graph, orphan detect
  │   ├── metadata.ts     # title/desc/canonical/OG/Twitter/favicon/manifest/lang/viewport/charset
  │   ├── structure.ts    # H1 count, heading hierarchy, alt coverage, semantic elements
  │   ├── schema.ts       # JSON-LD extract + validate against required @type set
  │   ├── aeo.ts          # answer-block word count, question headings, lists/tables,
  │   │                   #   TL;DR, entity mentions, citation host allowlist
  │   ├── trust.ts        # author/contact/policy/last-updated/disclosure presence
  │   ├── ux.ts           # nav, CTA, footer, FAQ presence
  │   └── analytics.ts    # beacon presence + event-name coverage (see §4, Phase 10)
  ├── probe/
  │   └── headers.ts      # RUNNER B — live fetch, headers/status/redirects/TTFB
  ├── score.ts            # weights → sub-scores → total, Critical/High/Med/Low triage
  ├── report/
  │   ├── json.ts  markdown.ts  html.ts
  └── page-quality.config.json   # per-page declared intent/keywords, waivers
```

### Tool-to-phase map

Every checklist item, mapped. `A` = source-time runner, `B` = deployed-URL runner, `M` = manual/Samiksha, `L` = LLM-advisory candidate.

#### Phase 1 — Crawlability (10)

| Item | Tool | Runner |
| --- | --- | --- |
| Page is indexable / no accidental `noindex` | `metadata.ts` — parse `<meta name="robots">` + `X-Robots-Tag` | A + B |
| Robots.txt allows crawling | `crawl.ts` — parse `robots.txt`, match path | A |
| XML sitemap contains page | `crawl.ts` — diff `sitemap.xml` against `**/*.html` on disk. **Highest-value single check in Phase 1** — a new page silently missing from the sitemap is the classic failure and is trivially detectable | A |
| Canonical exists | `metadata.ts` (Lighthouse skips `canonical` under `staticDistDir`) | A |
| HTTPS enabled | `probe/headers.ts` | B |
| Correct status code (200) | `probe/headers.ts` | B |
| No redirect chains | `probe/headers.ts` — `curl -L`, assert `num_redirects <= 1` | B |
| No orphan pages | `crawl.ts` — build internal link graph, flag unreachable-from-`index.html` | A |
| Breadcrumb exists | `schema.ts` — `BreadcrumbList` JSON-LD + visible nav element | A |

#### Phase 2 — Technical SEO (20)

| Item | Tool | Runner |
| --- | --- | --- |
| Unique title | `metadata.ts` — cross-page uniqueness set. Needs *all* pages parsed, not just changed ones | A |
| Keyword near beginning | `metadata.ts` — requires the page to declare a primary keyword in `page-quality.config.json`. Mechanical **once declared**; the declaration itself is editorial | A (+M for declaration) |
| Meta description | `metadata.ts` — presence + 120–160 char length | A |
| Canonical / OpenGraph / Twitter Card / favicon / manifest | `metadata.ts` — presence + well-formedness. **Note: no `site.webmanifest` exists in the repo today** | A |
| Structured URL / clean slug | `crawl.ts` — regex on path: lowercase, hyphens, no query, depth ≤ 2 | A |
| Single H1 | `structure.ts` | A |
| Logical heading hierarchy | `structure.ts` — no level skips (h2 → h4) | A |
| Semantic HTML | `structure.ts` — presence of `main`/`nav`/`header`/`footer`/`article`/`section`. Presence is mechanical; *appropriateness* is not | A (+L) |
| Image ALT tags | HTMLHint `alt-require` (existing) + `structure.ts` for empty-string alts on non-decorative images | A |
| Language / viewport / charset | Lighthouse `html-has-lang`, `viewport` (existing) + HTMLHint | A |
| Schema: Organization, WebPage, Product, FAQ, Breadcrumb, Article, SoftwareApplication, Review | `schema.ts` — extract every `<script type="application/ld+json">`, `JSON.parse` (catches malformed blocks, which HTMLHint does not), assert required `@type` set **per page class** (blog post ≠ landing page ≠ policy page). `Product` and `Review` are marked N/A-by-design unless a page opts in | A |

`Product` and `Review` deserve a ruling: Juro sells a scanner, not a listed product, and `Review` schema without genuine reviews is exactly the kind of unearned signal Axiom 2 exists to prevent. **Recommend marking both inapplicable-by-design at the config level rather than scoring them as failures.**

#### Phase 3 — Performance (15)

| Item | Tool | Runner |
| --- | --- | --- |
| LCP / CLS / INP / FCP | Lighthouse CI (existing) | A |
| TTFB < 800ms | `probe/headers.ts` — measured live at **275ms** today | B |
| WebP/AVIF, lazy loading, font preloading, CSS/JS minified, tree shaking | Lighthouse audits `modern-image-formats`, `offscreen-images`, `font-display`, `unminified-css`, `unminified-javascript`, `unused-javascript` | A |
| Compression (Brotli/Gzip), HTTP/2 or HTTP/3, CDN | `probe/headers.ts`. Confirmed live: **HTTP/2 ✓, Fastly CDN ✓** (`via: 1.1 varnish`, `x-served-by: cache-maa10226-MAA`), `vary: Accept-Encoding` present. These are Pages/Fastly properties — pass permanently, not our achievement | B |

#### Phase 4 — Content SEO (15)

| Item | Tool | Runner |
| --- | --- | --- |
| One search intent / search intent satisfied | — | **M/L** |
| One primary keyword / five secondary keywords | `page-quality.config.json` declaration + occurrence count in body | A (+M) |
| H1, H2 sections, images, internal links, external references, CTA, summary | `structure.ts` — presence + minimum counts | A |
| Intro answers query | — | **L** (shared with Phase 5) |
| Short paragraphs | `structure.ts` — flag `<p>` over ~90 words | A |
| Bullets, tables, definitions, comparison, examples | `structure.ts` — `ul`/`ol`/`table`/`dl` counts, plus heading-text regex for "vs", "compared", "example" | A |

#### Phase 5 — AEO (20) — the surprise

The framework calls AEO "the most overlooked area" and gives it the joint-highest weight. It is also, read literally, **mostly mechanical**:

| Item | Tool | Runner |
| --- | --- | --- |
| First paragraph answers the query | — | **L** — the single genuinely hard item in the phase |
| 40–80 word answer block | `aeo.ts` — word-count the first `<p>` after `<h1>`. Pure arithmetic | A |
| FAQ section | `schema.ts` — `FAQPage` JSON-LD (17 already present) + visible `<details>`/heading block | A |
| "What is…" / "How does…" / "Why…" / "Benefits" / "Limitations" | `aeo.ts` — regex over `h2`/`h3` text. Five checks, one regex table | A |
| Bullet lists / numbered lists / comparison tables / definitions / TL;DR / key takeaways | `aeo.ts` — DOM counts + a marked `.tldr` / `.key-takeaways` convention the templates adopt | A |
| Entity optimization (GDPR, DPDP, ISO 27001, SOC2, DORA, Privacy Policy, Cookie Banner, Consent, Personal Data, Processor, Controller) | `aeo.ts` — case-insensitive string match against the fixed 11-entity list, report coverage as *n*/11. **Caveat:** counting mentions cannot tell you whether they read naturally; a keyword-stuffed page scores identically to a well-written one. Score it, but cap the weight and let Samiksha veto | A (+L) |
| Citations: government links, official regulations, standards, RFCs, OWASP | `aeo.ts` — host allowlist over outbound `href`: `*.gov`, `*.gov.in`, `eur-lex.europa.eu`, `meity.gov.in`, `iso.org`, `ietf.org`/`rfc-editor.org`, `owasp.org`, `nist.gov`, `edpb.europa.eu`. Report count per category | A |

**Net: ~15 of 20 AEO points are automatable today with string and DOM operations.** The LLM-shaped residue is "does the intro actually answer the query" and "do the entity mentions read naturally."

#### Phase 6 — Accessibility (10)

| Item | Tool | Runner |
| --- | --- | --- |
| WCAG AA, contrast, ARIA, labels, focus indicators, skip links | `@axe-core/playwright` — full ruleset at `wcag2a`, `wcag2aa`, `wcag21aa` tags | A |
| Keyboard navigation, form validation | Playwright — explicit tab-order and focus-trap assertions | A |
| Screen reader | — | **M** — no automated tool substitutes for an actual NVDA/VoiceOver pass |

**Why axe-core is not duplicate coverage of the existing Lighthouse a11y category.** Lighthouse runs an automated axe *subset* against one static page load. This site's accessibility risk is concentrated in states Lighthouse never reaches: `gateModal`, `emailModal`, `noticeDialog`, `scanModal`, and the severity-filter tiles in `js/main.js`, which carry hand-rolled `keydown` handlers and `aria-pressed` toggling. Focus trapping inside an open modal, focus restoration on close, and ARIA state on a custom widget are precisely the WCAG-AA items the framework lists and precisely what a single-load audit cannot see. Running axe *inside* existing Playwright specs, after the modal is opened, is the only way to cover them.

Also note the existing `categories:accessibility` assertion is already `["error", { minScore: 0.95 }]` — a11y is the one phase where the current bar is close to the framework's.

#### Phase 7 — Trust / E-E-A-T (10)

| Item | Tool | Runner |
| --- | --- | --- |
| Author, credentials | `trust.ts` — `Article.author` JSON-LD + visible byline. A `chore/byline-standardize-jurocompliant` branch already exists, so a convention is forming | A |
| Company details, contact, social links, GitHub, documentation | `trust.ts` — `Organization` JSON-LD (`ContactPoint` already present) + footer link presence | A |
| Privacy Policy, Terms, Cookies, Security page | `trust.ts` — footer link presence + target-page-exists check. **`privacy.html` exists; no terms or cookies page currently does** | A |
| Last updated | `trust.ts` — `dateModified` in JSON-LD + visible date, cross-checked against `git log` for the file. Detects stale "Last updated" strings, a common silent rot | A |
| HTTPS | `probe/headers.ts` | B |
| Responsible disclosure | `trust.ts` — `.well-known/security.txt` (RFC 9116). **Not present today**; only `.well-known/agent.json` exists. Cheap gap to close | A |
| Compliance badges (only if earned) | `trust.ts` — **inverted check**: flag any badge-like image or claim that is not on an allowlist of earned credentials. Runs alongside `banned-claims.yml`, not instead of it | A |
| Real screenshots, product demo, examples, use cases | `trust.ts` can assert an `<img>` exists in a demo region; it cannot assert it is a *real* screenshot | A-partial + **M** |
| Technical depth | — | **L** |

#### Phase 8 — UX & Conversion (10)

| Item | Tool | Runner |
| --- | --- | --- |
| Sticky navigation, breadcrumbs, footer links | `ux.ts` + existing `mobile-nav.spec.ts` | A |
| Search | `ux.ts` — presence. **Site has no search; recommend marking N/A-by-design for a 24-page site** | A |
| Hero CTA, secondary CTA, demo, contact, pricing, FAQ | `ux.ts` — presence + `href` resolves | A |
| Testimonials, customer logos | `ux.ts` — presence. **Presence is checkable; whether we may publish them is a legal/consent question, not a scanner question.** Do not let a scanner score nudge the site toward publishing unconsented logos | A + **M** |
| Does the funnel actually convert | — | **M** — that is analytics, not a page scan |

#### Phase 9 — Security (10) — cannot meet its gate on GitHub Pages

Live measurement of `https://jurocompliant.com/` on 2026-07-31:

| Header | Framework requires | Actually served | Settable on GH Pages? |
| --- | --- | --- | --- |
| `strict-transport-security` | ✔ | `max-age=31556952` (no `includeSubDomains`, no `preload`) | Provided by Pages |
| `content-security-policy` | ✔ | **absent** | Not as a response header |
| `x-frame-options` | ✔ | **absent** | **No** |
| `referrer-policy` | ✔ | **absent** | **No** |
| `permissions-policy` | ✔ | **absent** | **No** |

GitHub Pages does not expose response-header configuration. The `<meta http-equiv>` fallback is only a partial substitute: a meta CSP works for most directives but `frame-ancestors` is **ignored** in meta form, and `X-Frame-Options` via meta is ignored entirely. So clickjacking protection specifically cannot be achieved on Pages by any in-repo change.

**Phase 9 at Critical-100% is therefore unachievable on current hosting.** Three options, founder decision required:

- **(a)** Put Cloudflare (free tier) in front of the Pages origin and set headers via Transform Rules. Closes all four gaps. Cost: DNS cutover, a new party in the request path, ~0.5d.
- **(b)** Ship meta-CSP + `Referrer-Policy` meta, accept that `frame-ancestors`/XFO stay open, and downgrade Phase 9 from Critical-100% to Critical-with-documented-exceptions.
- **(c)** Leave as-is; scanner reports the gap permanently as a known, waived posture gap.

**Recommendation: (b) now, (a) when there is a reason to touch DNS anyway.** Option (c) is defensible for a marketing site with no authenticated surface, but "we sell verifiable evidence and our own site has no CSP" is an avoidable line in a prospect's vendor-risk questionnaire.

The remaining Phase 9 items are cleanly automatable: no mixed content (`structure.ts` — flag `http://` subresources), no exposed secrets (`gitleaks` already runs via `secret-scan.yml`), no vulnerable JS libraries (Lighthouse `no-vulnerable-libraries` + existing `sca.yml`/`sbom.yml`), CSP passes (Lighthouse `csp-xss`).

#### Phase 10 — Analytics (10) — conflicts with Axiom 4 as written

The framework asks for Google Analytics 4, Search Console, event tracking, scroll tracking, form submissions, CTA clicks, downloads, search tracking, conversion goals.

The site has **no GA4 and no third-party analytics of any kind**. It has a first-party beacon in `js/main.js` posting `{path, referrer, utm_*}` to `/api/v1/pageview` on the Juro API, plus `fireScanEvent` calls for `scan_started` / `scan_success` / `zero_findings` / `api_error`, and lead submissions to `/api/v1/leads` carrying `consent_version`. That is a deliberate Axiom-4 architecture, and there is an active `content/turned-off-analytics-headline-2026-07-28` branch making it a public position.

**A scanner that scores "GA4 present" as a pass would grade the site down for living its own published thesis.** Phase 10 must be redefined before it is implemented:

| Original item | Redefined |
| --- | --- |
| Google Analytics 4 | First-party pageview beacon fires on every page (`analytics.ts` — assert the beacon IIFE is present; extend `pageview-beacon.spec.ts` to run per-page rather than on `index`/`checklist` only) |
| Search Console | **Struck as inapplicable-by-design** — verification is an account-level property, not a page property. Track separately in ops. |
| Event tracking, CTA clicks, downloads, form submissions | Assert declared events fire — extends existing `scan-events.spec.ts` and `download-pdf.spec.ts` |
| Scroll tracking, search tracking | **Struck as inapplicable-by-design** — scroll depth is behavioural telemetry the product position rejects; there is no site search |
| Conversion goals | Server-side in the Juro admin API. Reported, not page-scanned. **M** |

These are struck as **inapplicable-by-design, not failed**. The scanner config must distinguish the two, or the site permanently scores C on a phase it is deliberately choosing to fail.

---

## 3. Automatability — the numbers

Weighted points, classified. (Denominator 130 — see §0.)

| Phase | Weight | Mechanical | LLM-advisory | Human-only |
| --- | ---: | ---: | ---: | ---: |
| 1 Crawlability | 10 | 10 | 0 | 0 |
| 2 Technical SEO | 20 | 18 | 2 | 0 |
| 3 Performance | 15 | 15 | 0 | 0 |
| 4 Content SEO | 15 | 10 | 4 | 1 |
| 5 AEO | 20 | 15 | 4 | 1 |
| 6 Accessibility | 10 | 7 | 0 | 3 |
| 7 Trust (E-E-A-T) | 10 | 7 | 2 | 1 |
| 8 UX & Conversion | 10 | 8 | 0 | 2 |
| 9 Security | 10 | 10 | 0 | 0 |
| 10 Analytics | 10 | 8 | 0 | 2 |
| **Total** | **130** | **108 (83%)** | **12 (9%)** | **10 (8%)** |

Read that top-line carefully: **83% of the framework is buildable with parsers, Lighthouse, and axe — no model in the loop.** The remaining 17% splits into a thin LLM-advisory band and a genuinely irreducible human residue.

### The genuinely hard items

1. **"First paragraph answers the query"** (Phase 5) — requires knowing the query, then judging whether the paragraph answers it. Mechanically we can only check that a 40–80 word paragraph exists in the right position.
2. **"Search intent satisfied"** (Phase 4) — the same problem at page scale.
3. **"Technical depth" / E-E-A-T convincingness** (Phase 7) — irreducibly a reader's judgment.
4. **Entity mentions reading naturally** (Phase 5) — a keyword-stuffed page and a well-written one score identically on mention count.
5. **Screen-reader experience** (Phase 6) — no automated tool substitutes for an assistive-technology pass.

### Recommendation on the LLM grader: build it, but never let it gate

Worth building as an **advisory, comment-only** step. Not worth wiring to an exit code, for three reasons:

- **Determinism is the product.** Juro sells deterministic, verifiable, reproducible artifacts. A publish gate whose pass/fail depends on a sampled model output is the exact failure mode the product exists to argue against. Shipping a non-deterministic gate in our own CI is a self-inflicted contradiction we would have to explain in every technical conversation.
- **Flaky gates get disabled.** A blocking check that fails intermittently on unchanged content will be bypassed within two sprints, taking its advisory value with it.
- **The judgment items are already gated.** Samiksha's editorial/AEO/SEO review is the existing human gate for exactly these five items. An LLM grader adds a second opinion in the PR comment; it does not need veto power to be useful.

Proposed shape: one call per changed page, structured output `{item, verdict, one_line_reason}` for the five hard items, rendered into the PR comment under an "Advisory — not blocking" heading, with the model and prompt version recorded in the JSON report so a verdict is at least attributable. Cost is negligible at this page volume.

**Consequence the founder should see explicitly:** AEO carries the joint-highest weight (20), and it is the phase whose hardest item stays human. The gate on our highest-priority quality dimension will never be fully mechanical. That is correct — it is not a gap to close.

---

## 4. Phased build plan

| Stage | Scope | Effort | Blocking? |
| --- | --- | ---: | --- |
| **0. Baseline + calibration** | Run current Lighthouse across all 24 pages; record real scores; resolve the 130-vs-120 denominator; rule on `Product`/`Review`/`search`/GA4 inapplicability; decide Phase 9 option (a)/(b)/(c). Produces a calibration memo, no code. | **0.5d** | — |
| **1. Lighthouse extension** | Expand `collect.url` to all pages (or changed-page-only for CI minutes); raise `performance` 0.85 → 0.90; promote `seo` `warn` → `error`; add `modern-image-formats`, `unminified-*`, `csp-xss`, `no-vulnerable-libraries` assertions. **Pure config.** | **1d** | Yes |
| **2. Static analyzer core** | `tools/page-quality/` skeleton + `metadata.ts`, `structure.ts`, `schema.ts`, `crawl.ts`. Covers Phases 1 (source-side), 2, and most of 4-structure. Reuses Playwright's DOM — no new parser dependency. | **3d** | Yes |
| **3. AEO + Trust + UX collectors** | `aeo.ts`, `trust.ts`, `ux.ts`, `analytics.ts`. The mechanical 15/20 of AEO, 7/10 of Trust, 8/10 of UX, redefined Phase 10. Cheap once stage 2's harness exists. | **1.5d** | Yes |
| **4. axe-core accessibility** | `@axe-core/playwright`; run in default state **and** in each open-modal state; wire into existing specs. | **1.5d** | Yes |
| **5. Scoring + reporting** | `score.ts` (weights, thresholds, inapplicable-vs-failed, waiver file), JSON artifact, Markdown PR comment, static HTML dashboard. | **2d** | — |
| **6. Gate wiring** | Exit codes; Critical phases block, High phases warn; `page-quality` job in `test.yml`; waiver mechanism with expiry. | **0.5d** | Yes |
| **7. Deployed-URL runner** | `probe/headers.ts` as a post-deploy job on `deploy.yml`; reports to a job summary, opens an issue on regression. Non-blocking by construction. | **1d** | No |
| **8. LLM advisory grader** *(optional)* | Five judgment items, structured output, PR comment only, never an exit code. | **2d** | No |

**v1 (stages 0–7): ~11 engineer-days.** Excluding stage 8, which is genuinely optional.

### Recommended order

**0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → (8)**

Rationale for the front of the sequence:

- **Stage 0 first, always.** Raising `seo` from `warn` to `error` on a site never measured at that bar is how you land a red main branch and a demoralised team. Measure, then decide which of the failures are "fix now" and which get a dated waiver.
- **Stage 1 before stage 2** even though the static analyzer is the bigger prize. Stage 1 is config-only, extends infrastructure that already runs on every PR, and delivers a real tightened gate on day 2. Stage 2 is three days before it produces anything a reviewer sees.
- **Stage 4 (axe) before stage 5 (reporting)** because a11y findings are the ones most likely to require *content* changes with lead time; surfacing them early gives Tara runway.
- **Stage 7 last among the blocking-adjacent work** — it is the only stage that cannot prevent a regression, only detect one, so it has the lowest marginal value per day.

Stages 1 and 2 can run in parallel if two people are available; stages 3–6 are a chain.

---

## 5. CI integration

Extend `.github/workflows/test.yml`. Do not create a new workflow file — a fourth HTML-triggered workflow makes the PR check list unreadable.

```yaml
  page-quality:
    runs-on: ubuntu-latest
    needs: [lighthouse]          # consume the LH report, don't re-run Lighthouse
    steps:
      - checkout / setup-node / npm ci
      - run: npx playwright install --with-deps chromium
      - name: Resolve changed pages
        # reuse the existing origin/${{ github.base_ref }}...HEAD diff pattern
      - name: Run page-quality scan
        run: node tools/page-quality/cli.js --pages "$CHANGED" --lh-report .lighthouseci/
      - name: Comment score on PR
        # sticky comment, updated in place, not appended
      - uses: actions/upload-artifact@v7
        with: { name: page-quality-report, path: page-quality-report/ }
```

Design points:

- **Changed-pages-only by default**, full-site sweep on `push: main` and on `workflow_dispatch`. The cross-page checks (title uniqueness, orphan detection, sitemap membership) still need to *parse* every page — cheap, since it is file reads — but only *report* on changed ones.
- **`needs: [lighthouse]`** so Lighthouse runs exactly once and the scorer consumes `.lighthouseci/` output. Re-running Lighthouse inside the scanner would double the slowest job in CI.
- **Sticky PR comment** keyed by a marker string, edited in place. A per-push comment on a redesign branch is noise.
- **Waiver file** — `page-quality.waivers.json`, each entry requiring a rule id, page, reason, and expiry date. Expired waivers fail the build. Without this, the first red gate gets fixed by weakening the gate.
- **Post-deploy job** on `deploy.yml` for the stage-7 probe, writing to the job summary and opening an issue on regression.

New devDependencies (juro-web CI only, not a Juro runtime dependency — no founder gate triggered, listed for completeness): `@axe-core/playwright`. The static analyzer should reuse Playwright's DOM rather than pull in `cheerio`/`jsdom`, keeping the addition to exactly one package.

---

## 6. Output format

### v1

- **`report.json`** — the canonical artifact. Per-page sub-scores, total, grade, and a flat issue array (`{id, phase, severity, page, selector, message, remediation, waived}`). Everything else renders from this. Stable schema, so scores can be diffed across commits later.
- **Markdown PR comment** — the primary human surface. Score line, per-phase table, Critical/High issues inline with remediation, Medium/Low collapsed behind `<details>`, link to the full artifact.
- **Static HTML dashboard** — single self-contained file in the artifact bundle. Per-page score cards, sortable/filterable issue list. No external assets; opens from a downloaded artifact.

### Deferred past v1

- **PDF export.** Adds a headless-print dependency and a rendering pipeline to serve a use case (emailing a score to someone outside the repo) that has no current demand. The HTML dashboard prints to PDF from a browser if anyone actually needs it.
- **Historical trend / score-over-time.** Requires storage, a schema decision, and a place to host it. Defer until there are enough runs for a trend to mean anything.
- **Auto-fix / auto-PR for mechanical issues.** Tempting for missing meta descriptions and sitemap entries. Real risk of a bot writing marketing copy. Explicitly out of scope.
- **Cross-repo reuse** (pointing this at customer sites). Interesting, and adjacent to the actual product — but it is a product decision, not a CI decision, and it would change every design assumption here.

### Language discipline in the output

This scanner becomes a Juro surface, so its vocabulary is governed by the same rules as everything else we ship. Issues are **"posture gaps"** or **"surface findings"** — never "violations," never "non-compliance." Grade bands carry no marketing sub-label ("A+", not "A+ (Enterprise-ready)"). Remediation text describes what to change, not what the change proves.

---

## 7. Open decisions for the founder

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Rubric denominator: 130 (rescale bands) or 120 (drop 10 points of weight)? | **130, rescale** |
| 2 | Phase 9 security headers: Cloudflare proxy / meta-tag partial / accept-and-waive? | **Meta partial now, proxy later** |
| 3 | Phase 10: ratify the first-party-beacon redefinition and the struck items? | **Ratify** — as written it contradicts Axiom 4 |
| 4 | Mark `Product`, `Review`, and site-`search` inapplicable-by-design? | **Yes** |
| 5 | Build the LLM advisory grader (stage 8) at all? | **Yes, later, advisory-only, never gating** |
| 6 | Greenlight stages 0–1 (1.5d) as a standalone slice before committing to the full ~11d? | **Yes** — stage 0's baseline may change the plan |

---

*Scoping only. No scanner code is proposed for merge by this document.*
