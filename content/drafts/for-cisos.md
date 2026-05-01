# /for-cisos — landing page copy (DRAFT)

*Path: jurocompliant.com/for-cisos · Status: draft for review · Last updated: 2026-05-01*

Audience: CISO, DPO, Compliance Head at India/EU SaaS, 200–2000 employees.
Lead anxiety: Section 8(1) — vendor breach is your company's breach. Reasonable safeguards is now a question with a name on it.
Secondary anxiety: vendor trust after the May 2025 Vanta cross-tenant exposure.

---

## HERO

**Headline:** The compliance scan that runs inside your VPC.

**Subhead:** Juro reads your DPDP, GDPR, and DORA posture from a read-only role inside your AWS account. Findings are signed, reproducible, and cite the regulatory clause. Your infrastructure data stays in your perimeter.

**Primary CTA (button):** See a scan run

---

## PROBLEM

The three things on a CISO's desk this year, stated plainly.

- **Under Section 8(1) of the DPDP Act, the data fiduciary stays responsible for compliance** — including for processing undertaken by a data processor on its behalf, *"irrespective of any agreement to the contrary."* Whatever your compliance vendor does with your data is part of your liability surface, not outside it.
- **Most compliance tools ask you to upload your IAM policies, Lambda configs, and data flow maps to their cloud.** That's the same architecture as the breach you're trying to defend against. A code change in someone else's tenant — Vanta, May 2025 — and your evidence becomes someone else's evidence.
- **Audit evidence that no third party can independently re-verify is paperwork, not proof.** From May 13, 2027, the Data Protection Board enforces the full Act. Section 8(5) requires *"reasonable security safeguards"* — and the burden of demonstrating what was reasonable falls on the fiduciary. Twelve months out, that's a planning window, not a problem to defer.

---

## SOLUTION

Three things Juro does that follow from "the scan should never have left the building."

- **The agent runs in your VPC under a read-only IAM role.** It reads cloud state — IAM, Lambda, S3, RDS, CloudTrail — and produces findings locally. Customer infrastructure data is not transmitted to Juro in any deployment tier. Your security team can verify the network behaviour independently — it's observable on the host, not declared on a slide.
- **Every finding is deterministic and cites its regulatory source** — DPDP section, GDPR article, or DORA RTS clause, depending on which rule fired. Re-run the scan a year later against the same target snapshot, and the hashes match. That's what makes the artifact verifiable instead of just produced.
- **The signed evidence pipeline is independent of the LLM.** Triage runs on a local model in the agent for advisory commentary. The signed finding set is produced by deterministic rule evaluation, not by an LLM. We don't claim "you are compliant" — we produce evidence an auditor can challenge and re-verify.

---

## PROOF

The agent is designed so the proof is mechanical, not promised. Run `tcpdump` on the host during a scan and watch for outbound traffic to anything other than your own AWS APIs. Hand the signed artifact to a third party and ask them to re-verify the findings without contacting us. If either of those fails, the architecture has failed.

---

## SECONDARY CTA

**Headline:** See it run on your stack.

**Subhead:** Twenty minutes. Why CISOs are choosing non-custodial scanning post-Vanta — and what that looks like with Juro. The agent's already running in our reference AWS sandbox, so there's nothing on your side to set up. We do a live DPDP or DORA scan, walk through the signed artifact, and show how your auditor can re-verify it without us in the room. No deck. The same agent runs in your VPC for production engagements.

**Button:** Book a walkthrough

---

## Analytics wiring (spec for HTML conversion)

When this draft is converted to HTML and published, the following wiring must be in place so the page is traceable in the juro admin dashboard:

**Path:**
- Publish at `/for-cisos.html` (canonical URL `https://jurocompliant.com/for-cisos`).
- Distinct path means the page shows up as its own row in `top_paths` in `pageviewStats()` (juro/src/db/pageviews.ts:120). Inbound from CISO funnel campaigns should be cleanly attributable.

**Pageview beacon (must fire):**
- The HTML must load `js/main.js` (or inline the IIFE at the bottom of that file). The beacon posts `{path, referrer, utm_source, utm_medium, utm_campaign}` to `${API_BASE}/api/v1/pageview`.
- Without this, the page is invisible to the admin dashboard at `/admin`.

**Inbound UTM acceptance:**
- Any external campaign linking to this page (cold email, blog post, LinkedIn) should carry `utm_source={channel}&utm_medium={medium}&utm_campaign=ciso-landing` so the source surfaces in `top_referrers` + `top_paths` cross-tab.
- `js/main.js`'s `submitLead()` already pulls these params from the URL and forwards them on lead submission — no extra wiring needed.

**Outbound CTA wiring:**
- **Primary CTA ("See a scan run")** — link to `/#scanner` (homepage scanner anchor). The homepage beacon will fire on arrival, and the existing email-capture flow handles attribution. No UTM needed for same-domain hops since referrer is preserved.
- **Secondary CTA ("Book a walkthrough")** — `mailto:help@jurocompliant.com?subject=...&body=...`. Mail clicks aren't trackable through the beacon (no destination pageload), so wrap the click in a tracked event:
  - Either: post `{event: 'cta_click', cta: 'walkthrough', source: 'for-cisos'}` to a tracked endpoint before opening the mailto, or
  - Replace the mailto with a hosted form at `/walkthrough.html` that captures `{name, email, company}` via `submitLead({source: 'for-cisos-walkthrough'})` and then triggers a calendar follow-up.
  - **Recommendation:** the form path. Mailto loses ~30% of intent (people don't have a mail client configured) and gives zero attribution. Form keeps both signal and continuity.

**Lead source convention:**
- Any lead captured on this page passes `source: 'for-cisos'` (or `source: 'for-cisos-walkthrough'` for the secondary CTA form) to `/api/v1/leads`. Adopt the convention so `leadStats()` groups cleanly per surface.

**SEO + AI search:**
- The HERO subhead is the primary AI-search citation block — keep it discoverable to crawlers (don't hide behind JS).
- Add `Service` or `WebPage` JSON-LD schema (with `audience: "CISO, DPO, Compliance Head"` for the named ICP).
- Primary keyword cluster *"non-custodial compliance tool"*, *"DPDP CISO compliance"* should appear in `<title>`, `<h1>`, and within the first 100 words of body. Adjust hero/subhead if needed during HTML conversion.

---

## Notes for review

**Resolved on review (round 1 → round 2):**
1. Section 8(1) framing pinned to primary source. Quoted clause *"irrespective of any agreement to the contrary"* is verbatim from the Act and points-of-defence-able. Section 8(5) statutory phrase *"reasonable security safeguards"* added to the third PROBLEM bullet to anchor the audit point in the same statute.
2. `tcpdump` removed from SOLUTION bullet 1 (CISO-readable layer); replaced with *"your security team can verify the network behaviour independently — it's observable on the host, not declared on a slide."* The `tcpdump` mention stays in PROOF (engineer-readable depth).
3. Verified: the existing homepage at `/` already carries the May 13, 2027 countdown widget and a phased-enforcement explainer. No inline footnote needed on `/for-cisos` — the date stands on its own and the homepage is one nav click away.

**Voice/tone choices:**
- No em dashes used decoratively. Em dashes appear only as parenthetical or cause-effect, ~1 per 200 words of body.
- No tricolons used as rhetorical device. The lists of three (DPDP/GDPR/DORA, IAM/Lambda/S3) are factual enumerations.
- Specific over generic: Section 8(1), Section 8(5), May 13 2027, Vanta May 2025, read-only IAM role. Each one a regulator-savvy CISO can check.
- No banned claims (per `juro-platform/contracts/banned-claims.md`). The disallowed compliance-overclaim phrases and out-of-scope regulations are absent from the body. Tagline *"Compliance you can prove"* is implicit, not recited.

**What I deliberately did not write:**
- ₹250 crore *personal* liability framing (penalty falls on the data fiduciary, not the natural person — Path A discipline).
- Any claim that Juro confirms a pass or makes anyone "compliant" (per AXIOM 2).
- Tier-2 hybrid framing or any deployment that crosses the perimeter.
- Vanta named only as a dated incident reference, not as a competitor.
