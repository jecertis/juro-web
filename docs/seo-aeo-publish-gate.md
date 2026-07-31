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
| 9     | Security        | Critical | 100%           |
| 10    | Analytics       | Medium   | ≥90%           |

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

The most overlooked area — weighted 20/120, tied with Technical SEO for the highest single weight.

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

**Headers**
- [ ] CSP
- [ ] HSTS
- [ ] X-Frame-Options
- [ ] Referrer-Policy
- [ ] Permissions-Policy

**Security**
- [ ] No mixed content
- [ ] No exposed secrets
- [ ] No vulnerable JS libraries
- [ ] CSP passes
- [ ] HTTPS everywhere

## Phase 10 — Analytics

- [ ] Google Analytics 4 (or equivalent)
- [ ] Search Console
- [ ] Event tracking
- [ ] Scroll tracking
- [ ] Form submissions
- [ ] CTA clicks
- [ ] Downloads
- [ ] Search tracking
- [ ] Conversion goals

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
| **Total**     |   **120** |

| Score   | Grade                 |
| ------- | --------------------- |
| 115–120 | A+ (Enterprise-ready) |
| 105–114 | A (Excellent)         |
| 95–104  | B (Good)              |
| 80–94   | C (Needs improvement) |
| <80     | F (Major issues)      |

## Automation note

This checklist is a candidate for a per-page CI scanner (SEO/AEO/Performance/Accessibility/Security/Trust sub-scores → weighted overall score, prioritized issue list, remediation suggestions, HTML/JSON/Markdown/PDF export, GitHub Actions gate on mandatory-Critical phases). Not built yet — scope/build is a separate backlog decision, not implied by adopting the checklist.
