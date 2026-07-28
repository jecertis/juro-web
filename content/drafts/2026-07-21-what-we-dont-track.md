# We sell compliance software. Here's the tracking we don't run on you.

**Status: DRAFT, pending Samiksha gate.**
**Author:** Lekhni (drafting), 2026-07-21. Backlog: BL-MKT-091.
**Suggested slug:** what-we-dont-track
**Suggested regulation tag:** DPDP (cross-references GDPR / DORA)

> **Note on scope, per Axiom 2.** This post describes one architectural choice we made about our own marketing site. It is not a verdict on any analytics product or on any company that runs one. Consent-based trackers are lawful when they are disclosed. Nothing here says a regulation requires the choice we made. It is a standard we decided to hold ourselves to.

We build tools that help companies prove what happens to personal data inside their own systems. So quietly running a session recorder on the people reading about that work would be a strange way to behave. We don't.

jurocompliant.com carries no Google Analytics, no session replay, and no Microsoft Clarity. There is no third-party analytics tag on the page you are reading. What runs instead is a single first-party pageview beacon we wrote, and it is deliberately close to blind.

> You can't leak what you never collected.

## What the beacon actually sends

When you open a page on jurocompliant.com, one small request goes back to our own server. You can read the code; it is in the page source. Here is every field it sends:

- **The page path** you landed on, for example `/blog/dpdp-processor-obligations`.
- **The referring URL**, if your browser provides one, so we can tell whether you arrived from a search result or a link.
- **The campaign tags** in the address bar if a link carried them (`utm_source`, `utm_medium`, `utm_campaign`).

That is the whole payload. There is no cookie. There is no persistent identifier, no fingerprint, no account, no mouse-movement capture, no scroll heatmap, no recording of anything you type. The request is sent with credentials switched off, so the browser attaches no stored identity to it. The beacon gives us no persistent identifier that would let us link your visit today to a visit tomorrow.

## Why this is the same idea as our scanner

If you have read our procurement pack, this will feel familiar. Our scanner is non-custodial: it runs inside the customer's own cloud, evaluates their configuration there, and the only thing that ever reaches us is a signed hash of the result. We do not hold a copy of the customer's infrastructure. The honest one-line answer to "what data does Juro receive" is: a hash.

The website is the consumer-scale version of the same decision. The honest answer to "what does the jurocompliant.com beacon send about a visitor" is: a page path and where you came from, and nothing that names you. Our server, receiving that request, also derives a coarse, daily-rotating hash of the connection, described further down, and nothing more. We would rather know less and be able to say so plainly than know more and have to manage it.

There is a quieter reason too. Data you never collected is data you cannot lose in a breach, cannot be compelled to hand over, and cannot have to explain to a regulator. A tracker you do not run is a risk you do not carry. Under GDPR, DORA, or India's DPDP Act, the smallest surface is the one that never has to be defended.

## What we give up, and why we are fine with it

This costs us something real. We cannot build a per-visitor funnel. We cannot see that one person read four posts and then requested a scan. We cannot retarget you across the web or track you from one day to the next: there is no cookie, and the identifiers the server derives are hashed with a salt that rotates every day, so nothing links today's visit to tomorrow's. We do keep enough to notice, within a single day, that traffic to a page came from one browsing IP rather than many, the same coarse signal any web server log gives for free. That is not a person, a name, or a cross-day trail. For a company that lives or dies on demand signal, that is not a free choice.

We take the trade because our whole argument is that evidence should be verifiable rather than asserted. It would be incoherent to make that argument on a page that watches you in ways you cannot see. The counting we do keep, the pseudonymous pageview and the campaign tag, is enough to tell whether an article was worth writing. It is not enough to profile the person who read it, and that ceiling is the point.

## If you want to check

You do not have to take our word for it. Open the developer tools in your browser, watch the network tab while you load any page here, and read the one request that leaves. Then open the page source and read the beacon script itself. The claim in this post is meant to survive that inspection. If it ever doesn't, that is a bug, and we want to hear about it.

## Frequently asked questions

**Does jurocompliant.com use Google Analytics?**
No. There is no Google Analytics tag on the site. Page counting is done by a first-party beacon we wrote, which sends a page path, a referrer, and any campaign tags, and nothing that identifies you.

**Does the site use session replay or a tool like Microsoft Clarity?**
No. There is no session-replay or heatmap script anywhere on the site. We do not record mouse movement, scrolling, clicks, or keystrokes.

**Do you set cookies to track visitors?**
No. The pageview request is sent with credentials switched off and sets no tracking cookie. The beacon gives us no persistent identifier that would let us link one visit to another.

**Does DPDP or GDPR require you to run your site this way?**
No, and we are careful not to claim that. Disclosed, consent-based analytics can be lawful. Running almost no analytics is a stricter standard we chose for ourselves, not a legal requirement we are passing on to you.

**What is the connection to your scanner?**
The same principle. The scanner runs inside your cloud and sends us only a signed hash of the result, never your data. The website collects a page path and a referrer, never your identity. In both cases we designed for the smallest thing we could receive.

---

**CTA (for Tara at build):** Eyebrow "See it for yourself". Headline "Scan your own environment, not your visitors." Body: a short line inviting a free scan. Button link must carry UTM params, for example `https://jurocompliant.com?utm_source=blog&utm_medium=organic&utm_campaign=what-we-dont-track`.

---

## Pre-publish blockers checklist (for Samiksha and founder)

- [ ] Samiksha editorial + SEO/AEO gate (title <=60 chars variant for the `<title>` tag; meta description <=155 chars; FAQPage JSON-LD must match the visible FAQ word-for-word).
- [ ] Re-confirm at publish time that the live site genuinely runs zero third-party analytics (no stray tag added since drafting) before the post names them.
- [ ] Verify the beacon payload against the "What the beacon actually sends" list one more time at publish (fields: path, referrer, and the three campaign tags; credentials omitted; no cookie). Source: blog/_template.html beacon script, verified 2026-07-21.
- [ ] Server-side IP handling: this draft describes the server-derived connection hash accurately (IP and UA hashed with a daily-rotating salt, same-day only, no cross-day link). Verify that language against the juro-api pageview route (`src/db/pageviews.ts`) before publish and re-verify if the salt-rotation behaviour ever changes.
- [ ] Legal-verdict scrub: no line implies any named analytics tool, or any company using one, is non-compliant.
- [ ] No regulation-mandate phrasing: the post must not say any regulation requires this choice. Regulation scope stays GDPR / DORA / DPDP.
- [ ] No em-dashes. Banned-phrase scan clean. Regulation scope stays GDPR / DORA / DPDP.
- [ ] UTM params present on the CTA link and any other jurocompliant.com link at build.
- [ ] Headline not yet founder-picked: this draft uses recommended hook #1. Alternatives (incl. pull-quote "You can't leak what you never collected") are in juro-bizops/data/runs/2026-07-21-no-tracking-blog-hooks.md.
