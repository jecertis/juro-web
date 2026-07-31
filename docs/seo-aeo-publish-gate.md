# Website SEO + AEO Publish Gate (v2.0)

Founder-provided framework, adopted 2026-07-31. A page is not published until it clears every **Critical** phase at 100% and every **High** phase at its threshold. This is the standing checklist for any new or materially-edited page in this repo (homepage, blog posts, landing pages) — apply it as part of the existing Samiksha editorial/AEO/SEO gate, not as a separate step.

| Phase | Category        | Weight   | Pass Criteria  |
| ----- | --------------- | -------- | -------------- |
| 1     | Crawlability    | Critical | 100%           |
| 2     | Technical SEO   | Critical | 100%           |
| 3     | Performance     | Critical | Lighthouse ≥90 |
| 4     | Content SEO     | High     | ≥90%           |
| 5     | AEO             | High     | ≥90%           |
| 6     | Accessibility   | High     | WCAG AA        |
| 7     | Trust (E-E-A-T) | High     | ≥85%           |
| 8     | UX & Conversion | Medium   | ≥85%           |
| 9     | Security        | Critical | 100% of achievable set † |
| 10    | Analytics       | Medium   | ≥90%           |

† **Phase 9 is scored against what static hosting can actually control.** See Phase 9 for the achievable set and the tracked known-gap list. The gate never blocks on infrastructure this repo does not control.

---

## Phase 1 — Crawlability

- [ ] Page is indexable
- [ ] No accidental `noindex`
- [ ] Robots.txt allows crawling
- [ ] XML sitemap contains page
- [ ] Canonical exists
- [ ] HTTPS enabled
- [ ] Correct status code (200)
- [ ] No redirect chains
- [ ] No orphan pages
- [ ] Breadcrumb exists

## Phase 2 — Technical SEO

**Metadata**
- [ ] Unique title
- [ ] Keyword near beginning
- [ ] Meta description
- [ ] Canonical
- [ ] OpenGraph
- [ ] Twitter Card
- [ ] Proper favicon
- [ ] Manifest
- [ ] Structured URL
- [ ] Clean slug

**HTML**
- [ ] Single H1
- [ ] Logical heading hierarchy
- [ ] Semantic HTML
- [ ] Image ALT tags
- [ ] Language defined
- [ ] Viewport configured
- [ ] Charset declared

**Schema**
- [ ] Organization
- [ ] WebPage
- [ ] Product
- [ ] FAQ
- [ ] Breadcrumb
- [ ] Article
- [ ] SoftwareApplication
- [ ] Review (if applicable)

## Phase 3 — Performance

**Core Web Vitals**

| Metric | Target   |
| ------ | -------- |
| LCP    | <2.5 sec |
| CLS    | <0.1     |
| INP    | <200 ms  |
| FCP    | <1.8 sec |
| TTFB   | <800 ms  |

**Assets**
- [ ] WebP / AVIF
- [ ] Lazy loading
- [ ] Font preloading
- [ ] CSS minified
- [ ] JS minified
- [ ] Tree shaking
- [ ] Compression (Brotli/Gzip)
- [ ] HTTP/2 or HTTP/3
- [ ] CDN

## Phase 4 — Content SEO

**Intent**
- [ ] One search intent
- [ ] One primary keyword
- [ ] Five secondary keywords
- [ ] Search intent satisfied

**Structure**
- [ ] H1
- [ ] Intro answers query
- [ ] H2 sections
- [ ] Images
- [ ] Internal links
- [ ] External references
- [ ] CTA
- [ ] Summary

**Readability**
- [ ] Short paragraphs
- [ ] Bullets
- [ ] Tables
- [ ] Definitions
- [ ] Comparison
- [ ] Examples

## Phase 5 — AEO (Answer Engine Optimization)

The most overlooked area — weighted 20/130, tied with Technical SEO for the highest single weight.

**Direct answers**
- [ ] First paragraph answers the query
- [ ] 40–80 word answer block
- [ ] FAQ section
- [ ] "What is..."
- [ ] "How does..."
- [ ] "Why..."
- [ ] "Benefits"
- [ ] "Limitations"

**AI-friendly formatting**
- [ ] Bullet lists
- [ ] Numbered lists
- [ ] Comparison tables
- [ ] Definitions
- [ ] TL;DR summary
- [ ] Key takeaways

**Entity optimization** — mention related entities naturally: GDPR, DPDP, ISO 27001, SOC2, DORA, Privacy Policy, Cookie Banner, Consent, Personal Data, Processor, Controller.

**Citations**
- [ ] Government links
- [ ] Official regulations
- [ ] Standards
- [ ] RFCs
- [ ] OWASP

## Phase 6 — Accessibility

- [ ] WCAG AA
- [ ] Keyboard navigation
- [ ] Contrast
- [ ] Screen reader
- [ ] Focus indicators
- [ ] Skip links
- [ ] Labels
- [ ] Form validation
- [ ] ARIA

## Phase 7 — Trust (E-E-A-T)

**Experience**
- [ ] Real screenshots
- [ ] Product demo
- [ ] Examples
- [ ] Use cases

**Expertise**
- [ ] Author
- [ ] Credentials
- [ ] Technical depth

**Authority**
- [ ] Company details
- [ ] Contact
- [ ] Social links
- [ ] GitHub (if applicable)
- [ ] Documentation

**Trust**
- [ ] Privacy Policy
- [ ] Terms
- [ ] Cookies
- [ ] Security page
- [ ] Last updated
- [ ] HTTPS
- [ ] Responsible disclosure
- [ ] Compliance badges (only if earned — see Axiom 2 / banned-claims discipline)

## Phase 8 — UX & Conversion

**Navigation**
- [ ] Sticky navigation
- [ ] Breadcrumbs
- [ ] Search
- [ ] Footer links

**Conversion**
- [ ] Hero CTA
- [ ] Secondary CTA
- [ ] Demo
- [ ] Contact
- [ ] Pricing
- [ ] Testimonials
- [ ] Customer logos
- [ ] FAQ

## Phase 9 — Security

Scoped to static hosting (GitHub Pages + Fastly) by founder ruling 2026-07-31. The site is served from a host that does not expose response-header configuration, so this phase scores **what this repo can actually control**, at 100%. Controls that are response-header-only are recorded as a tracked known gap, not as a permanent failure. Rationale: a publish gate must not block on infrastructure we do not control.

**Achievable set — scored, 100% required**
- [ ] HTTPS everywhere
- [ ] HSTS present (provided by GitHub Pages with Enforce HTTPS on)
- [ ] CSP via `<meta http-equiv="content-security-policy">`, where applicable
- [ ] No mixed content (no `http://` subresources)
- [ ] No exposed secrets (covered by `secret-scan.yml` / gitleaks)
- [ ] No vulnerable JS libraries (covered by `sca.yml` / `sbom.yml` + Lighthouse)

**Tracked known gaps — recorded, not scored, not blocking**

These cannot be set as response headers on GitHub Pages. They would require putting a CDN/proxy (e.g. Cloudflare Transform Rules) in front of the Pages origin — a DNS-level decision, deliberately out of scope for a page-level gate.

- X-Frame-Options — *no meta-tag equivalent; ignored in meta form*
- Referrer-Policy — meta form works, but is not a response-header control
- Permissions-Policy — no meta-tag equivalent
- Header-based CSP — the meta fallback above covers most directives, but `frame-ancestors` is ignored in meta form, so clickjacking protection specifically remains open

Revisit if the site ever moves behind a CDN/proxy or off GitHub Pages.

## Phase 10 — Analytics

Redefined around first-party measurement by founder ruling 2026-07-31. This site carries no third-party analytics **by design** — Axiom 4 (non-custodial) and the public position that follows from it. Measurement runs through the first-party `/api/v1/pageview` beacon in `js/main.js` and the event calls alongside it, reporting to the Juro admin API.

**Scored**
- [ ] First-party pageview beacon fires on the page
- [ ] Search Console — property verified and page submitted (tracked at ops level, not per-page)
- [ ] Event tracking — declared events fire (`scan_started`, `scan_success`, `zero_findings`, `api_error`)
- [ ] Form submissions tracked (leads posted with `consent_version`)
- [ ] CTA clicks tracked
- [ ] Downloads tracked
- [ ] Conversion goals defined (server-side, in the admin API)

**Inapplicable by design — not failures, do not score**
- Google Analytics 4 (or any third-party analytics) — excluded under Axiom 4
- Scroll tracking — behavioural telemetry the product position rejects
- Search tracking — no site search on a 24-page site

A page that omits GA4 is doing the right thing. The scanner must distinguish *inapplicable-by-design* from *failed*, or the site permanently scores down for living its own thesis.

---

## Scoring rubric

| Category      | Max Score |
| ------------- | --------: |
| Crawlability  |        10 |
| Technical SEO |        20 |
| Performance   |        15 |
| Content SEO   |        15 |
| AEO           |        20 |
| Accessibility |        10 |
| Trust         |        10 |
| UX            |        10 |
| Security      |        10 |
| Analytics     |        10 |
| **Total**     |   **130** |

The v2.0 draft stated a 120 total, but the category weights above sum to 130. Founder ruling 2026-07-31: **130 is authoritative and all category weights stay as written** (Technical SEO 20, AEO 20, etc.). Grade bands below are rescaled proportionally from the original /120 bands — same percentage thresholds, new denominator.

| Score   | Grade                 | (% of 130) |
| ------- | --------------------- | ---------- |
| 125–130 | A+                    | ≥96%       |
| 114–124 | A (Excellent)         | ≥87.5%     |
| 103–113 | B (Good)              | ≥79%       |
| 87–102  | C (Needs improvement) | ≥67%       |
| <87     | F (Major issues)      | <67%       |

Phase 9's tracked known gaps and Phase 10's inapplicable-by-design items are excluded from both numerator and denominator on a per-page basis, so a page is never scored down for a control the repo cannot exercise.

## Automation note

This checklist is a candidate for a per-page CI scanner (SEO/AEO/Performance/Accessibility/Security/Trust sub-scores → weighted overall score, prioritized issue list, remediation suggestions, HTML/JSON/Markdown/PDF export, GitHub Actions gate on mandatory-Critical phases). Not built yet — scope/build is a separate backlog decision, not implied by adopting the checklist.

Scoped under BL-ENG-146: see `docs/seo-aeo-scanner-scoping-2026-07-31.md` (juro-web PR #139) for the architecture, the phase-by-phase automatability call (~83% of the weighted points are mechanically checkable), the phased build plan and effort estimate. The Phase 9, Phase 10 and denominator changes in this revision are the founder rulings that came out of that scoping.
