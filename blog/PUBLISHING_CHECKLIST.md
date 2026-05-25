# Blog Publishing Checklist — Tara

Run this before every publish. Every item must be checked before the PR is opened.
Template: `blog/_template.html` — start every post from it, not from a copy of a previous post.

---

## 1. Content (Katha hands off)

- [ ] Word count ≥ 1,200 words (use `wc -w` or the audit script below)
- [ ] Primary keyword appears in first paragraph
- [ ] One callout/blockquote with the key fact or deadline
- [ ] All external links point to official sources (MeitY, EUR-Lex, ICO, etc.)
- [ ] No banned phrases: "SOC 2 compliant", "enterprise-grade", "AI-powered compliance", "ISO 27001 compliant"

---

## 2. Head / Meta

- [ ] `<title>` ≤ 60 chars, primary keyword first, ends with `| Jurocompliant`
- [ ] `<meta name="description">` ≤ 155 chars, includes primary keyword + deadline/hook
- [ ] `<link rel="canonical">` set to the exact URL the post will be served at
- [ ] `<meta property="article:published_time">` set to actual publish date (ISO: `YYYY-MM-DD`)
- [ ] `<meta property="article:author" content="Arsh Makker">`

---

## 3. Open Graph + Twitter Card

- [ ] `og:title` — can differ from `<title>` but must include primary keyword
- [ ] `og:description` ≤ 155 chars (same as meta description is fine)
- [ ] `og:image` → `https://jurocompliant.com/og/<slug>.png`
- [ ] `og:image:width` = `1200`, `og:image:height` = `630`
- [ ] `twitter:card` = `summary_large_image`
- [ ] `twitter:site` = `@jurocompliant`
- [ ] `twitter:image` → same URL as `og:image`
- [ ] OG image PNG exists at `og/<slug>.png` (generate from SVG using: `node scripts/gen-og.js <slug>`)

---

## 4. Structured Data (JSON-LD)

- [ ] **Article schema** — `headline`, `datePublished`, `dateModified`, `author.name`, `publisher.name`, `url`, `mainEntityOfPage`
- [ ] **FAQPage schema** — minimum 5 Q&As; answers must match visible FAQ text word-for-word
- [ ] **HowTo schema** — add when the post has a "how to" or "N steps" section (optional but high-value)
- [ ] All schema blocks validated at [schema.org/validator](https://validator.schema.org/) before merge

---

## 5. On-Page Structure

- [ ] Exactly one `<h1>` — matches the post title
- [ ] H2s cover all major sections (4–6 headings)
- [ ] No skipped heading levels (H1 → H2 → H3, not H1 → H3)
- [ ] Visible FAQ section using `<details>/<summary>` — minimum 5 Q&As matching FAQPage schema
- [ ] `<time datetime="YYYY-MM-DD">` wrapping the visible publish date
- [ ] Breadcrumb nav with `aria-label="Breadcrumb"`

---

## 6. Accessibility

- [ ] `<a href="#post-content" class="skip-nav">Skip to content</a>` is first element after `<body>`
- [ ] `<main id="post-content">` — skip nav target exists
- [ ] All external links have `rel="noopener noreferrer"` and `target="_blank"`
- [ ] All `<img>` tags have descriptive `alt` text (or `alt=""` for decorative images)
- [ ] All interactive elements (buttons, summary) have visible focus style (`:focus-visible` — already in template CSS)
- [ ] `@media (prefers-reduced-motion: reduce)` — already in template CSS; don't remove it
- [ ] No colour-only information (don't rely on yellow alone to convey meaning)

---

## 7. Site-wide Updates (do these after the post HTML is ready)

- [ ] **`sitemap.xml`** — add `<loc>https://jurocompliant.com/blog/<slug></loc>` entry
- [ ] **`llms.txt`** — add one line under `### Published articles`:
  ```
  - [Post title](https://jurocompliant.com/blog/<slug>) — one-line summary. Published YYYY-MM-DD.
  ```
- [ ] **`blog/index.html`** — add post card at the top of the list (copy the card block from the template)
- [ ] **`index.html` blog feature strip** — update to the newest post (replace `href`, title, date, description)

---

## 8. Pre-merge Checks

Run from `juro-web/` root:

```bash
node scripts/blog-audit.js blog/<slug>.html
```

Expected output: all checks green. Fix any reds before opening the PR.

Manual checks that the script can't do:
- [ ] Read the first 150 words aloud — does the key term and deadline appear naturally?
- [ ] Open in a browser, tab through the page — every interactive element must show a focus ring
- [ ] Resize to 375px — post is readable, no horizontal scroll
- [ ] Check the OG image renders correctly: paste the URL into [opengraph.xyz](https://www.opengraph.xyz/)

---

## Quick reference — slug conventions

| Thing | Convention |
|-------|-----------|
| File | `blog/<regulation>-<topic>-<hook>.html` e.g. `dpdp-consent-manager-audit-log.html` |
| OG image | `og/<same-slug>.svg` + `og/<same-slug>.png` |
| Canonical URL | `https://jurocompliant.com/blog/<slug>` (no `.html`) |
| UTM on CTA link | `?utm_source=blog&utm_medium=organic&utm_campaign=<slug>` |
| Sitemap entry | `<slug>` without `.html` |

---

## Audit script (quick version)

```bash
# From juro-web/ root — paste and run
python3 - <<'EOF'
import re, sys

slug = sys.argv[1] if len(sys.argv) > 1 else "blog/dpdp-phase-ii-consent-managers.html"
with open(slug) as f: html = f.read()

checks = {
    "title ≤60 chars": lambda h: len(re.search(r'<title>(.*?)</title>', h).group(1)) <= 60 if re.search(r'<title>(.*?)</title>', h) else False,
    "meta desc ≤155 chars": lambda h: len(re.search(r'<meta name="description" content="([^"]*)"', h).group(1)) <= 155 if re.search(r'<meta name="description" content="([^"]*)"', h) else False,
    "canonical present": lambda h: bool(re.search(r'<link rel="canonical"', h)),
    "og:image present": lambda h: 'og:image' in h,
    "twitter:card present": lambda h: 'twitter:card' in h,
    "FAQPage schema": lambda h: '"FAQPage"' in h,
    "Article schema": lambda h: '"Article"' in h,
    "skip nav link": lambda h: 'skip-nav' in h,
    "skip nav target": lambda h: 'id="post-content"' in h,
    "focus-visible styles": lambda h: ':focus-visible' in h,
    "prefers-reduced-motion": lambda h: 'prefers-reduced-motion' in h,
    "<time datetime>": lambda h: bool(re.search(r'<time[^>]*datetime=', h)),
    "html lang attribute": lambda h: bool(re.search(r'<html[^>]*lang=', h)),
    "≥5 FAQ items": lambda h: len(re.findall(r'<details class="faq-item">', h)) >= 5,
    "noopener on externals": lambda h: 'rel="noopener noreferrer"' in h,
    "single H1": lambda h: len(re.findall(r'<h1', h)) == 1,
}

all_pass = True
for name, fn in checks.items():
    result = fn(html)
    status = "✅" if result else "❌"
    if not result: all_pass = False
    print(f"{status} {name}")

text = re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL))
wc = len([w for w in text.split() if len(w) > 2])
wc_ok = wc >= 1200
print(f"{'✅' if wc_ok else '⚠️'} word count: {wc} {'(ok)' if wc_ok else '(target: ≥1200)'}")
if not wc_ok: all_pass = False

print(f"\n{'All checks passed ✅' if all_pass else 'Fix the ❌ items before merging.'}")
EOF
```

---

_Last updated: 2026-05-25. Update this file when new checks are identified._
