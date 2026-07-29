# Our marketing guys are not happy! We don't know your contacts.

**Status: DRAFT, pending Samiksha gate.**
**Author:** Lekhni (drafting), 2026-07-28. Backlog: BL-MKT-092.
**Suggested slug:** marketing-doesnt-know-your-contacts
**Suggested regulation tag:** DPDP (cross-references GDPR / DORA)
**Companion piece:** ["We turned off our own analytics, for compliance."](/blog/what-we-dont-track) (BL-MKT-091). That post explains the choice. This one is the invoice for it.

> **Note on scope, per Axiom 2.** This post describes what our own marketing site gives up because of an architectural choice we made. It is not a verdict on any analytics or marketing product, or on any company that runs one. Consent-based trackers and marketing databases are lawful when they are disclosed. Nothing here says a regulation requires the choice we made. It is a standard we decided to hold ourselves to.

We run a marketing site that cannot tell us who you are. Our own marketing people would like that on the record as not their idea.

Juro (JeCertis) is a non-custodial compliance scanner: it checks a company's public surface or its own cloud configuration against GDPR, DORA, and India's DPDP Act, and produces signed, verifiable evidence of what it found, not a compliance certificate. [Not to be confused with juro.com](/which-juro), an unrelated contract-management tool. The same non-custodial rule we apply to a customer's cloud, where the only thing that reaches us is a signed hash of the result, we also apply to the people reading this page. It works. It also costs us things a normal B2B marketing team would consider basic.

## What exactly can't we see?

Four things, concretely.

**A per-visitor funnel.** We cannot follow one person from a search result to an article to a scan request. We see that pages were read and that scans were requested. We cannot join those two facts to a single reader.

**The four-posts-then-a-scan story.** We cannot see that one person read four posts and then requested a scan. That sequence is the single most useful thing a content team can know, and it is exactly the thing our own beacon is built not to record.

**Retargeting.** We cannot follow you across the web with an ad. There is no cookie and no cross-site identifier to follow you with.

**Day-to-day continuity.** We cannot link today's visit to tomorrow's. The identifiers our server derives are hashed with a salt that rotates every day, so nothing carries over. What we do keep is coarse and same-day only: enough to notice that traffic to a page came from one browsing IP rather than many, the same signal any web server log gives for free. That is not a person, a name, or a cross-day trail.

For a company that lives or dies on demand signal, none of that is free.

## Why are we fine with this?

Because our whole argument is that evidence should be verifiable rather than asserted, and that argument does not survive being made on a page that watches the reader in ways the reader cannot check.

The honest one-line answer to "what data does Juro receive from a customer's cloud" is: a hash. That is the claim in our procurement pack, and it is the claim a customer's security team is asked to believe. (For the longer version, including which DPDP-tagged rules produce that hash, see the [DPDP Technical Evidence Handbook](/dpdp-technical-evidence-handbook).) A company that answers that way about customer infrastructure and then quietly builds visitor profiles on its own blog is asking to be taken at its word in one room while behaving differently in another.

So the marketing team works with less. Pageview counts and campaign tags tell us whether an article was worth writing. They do not tell us who read it. That ceiling is deliberate, and it is the same ceiling we sell.

There is a second reason, less noble and more practical. A contact database we never built is a contact database we cannot lose in a breach, cannot be compelled to produce, and never have to explain to anyone. The cheapest data protection in the world is not collecting the data.

## What do we actually do instead?

We count. Pages, referrers, campaign tags. When a post gets read, we know the post got read. When a campaign link brings people in, we know the campaign worked. When someone requests a scan, we know a scan was requested.

Then we do the unfashionable part: we ask. If you want to talk to us, you tell us who you are, deliberately, in a form or an email. Consent as a lead-generation strategy is slower than a tracking pixel. It also means every contact in our pipeline is someone who chose to be there.

Our marketing guys are still not happy. They are, however, correct that this is the only version of the argument we are allowed to make.

## Frequently asked questions

**Does DPDP or GDPR require you to run your marketing site this way?**
No, and we are careful not to claim that. Disclosed, consent-based analytics and marketing tooling can be lawful. Running almost no analytics is a stricter standard we chose for ourselves, not a legal requirement we are passing on to you.

**Do you know who visits jurocompliant.com?**
No. The site sends a page path, a referrer, and any campaign tags to our own server. There is no cookie, no persistent identifier, and nothing that names you. We learn who you are only if you tell us.

**Can you retarget me with ads after I read this?**
No. There is no cross-site identifier to retarget with, and the identifiers our server derives are hashed with a daily-rotating salt, so nothing links today's visit to tomorrow's.

**Isn't this just bad marketing?**
By conventional measures, it costs us real capability: no per-visitor funnel, no cross-day trail, no retargeting. We take the trade because the product's core claim is that you should be able to check what we receive rather than trust us about it. That claim has to hold on our own site first.

**How does this relate to what your scanner does?**
Same principle, different scale. The scanner runs inside your cloud and sends us only a signed hash of the result, never your data. The website records a page path and a referrer, never your identity. In both cases we designed for the smallest thing we could receive.

---

**CTA (for Tara at build):** Eyebrow "Check it yourself". Headline "We would rather you verified than trusted us." Body: a short line inviting a free scan, plus a link to the companion post. Button link must carry UTM params, for example `https://jurocompliant.com?utm_source=blog&utm_medium=organic&utm_campaign=marketing-doesnt-know-your-contacts`.

---

## Pre-publish blockers checklist (for Samiksha and founder)

- [ ] Samiksha editorial + SEO/AEO gate: not yet run on this draft. Built to clear the three items BL-MKT-091 failed on first pass (early product definition present, question-phrased H2s present, three internal links present), but that is Lekhni's self-check, not a gate result.
- [ ] Headline is the founder's exact working title, including the exclamation mark. **Voice tension flagged, not silently fixed:** the house rule is dry understatement over exclamation. Founder confirms keep or drop the "!" before build.
- [ ] Title tag / meta description strings not yet drafted (need target keyword + confirmed final headline first).
- [ ] FAQPage JSON-LD to be generated at build, word-for-word matching the five Q&A pairs above.
- [ ] Verify every technical claim against the live beacon and the juro-api pageview route (`src/db/pageviews.ts`) at publish: no cookie, credentials omitted, daily-rotating salt, same-day coarse one-IP-vs-many signal only, no cross-day link. This draft reuses BL-MKT-091's verified language and adds no new technical claim. If the salt-rotation behaviour ever changes, both posts change.
- [ ] Re-confirm at publish time that the live site genuinely runs zero third-party analytics, since this post's premise depends on it.
- [ ] Legal-verdict scrub: no line implies any analytics tool, marketing platform, or company using one is non-compliant. No vendor is named in this post; keep it that way.
- [ ] No regulation-mandate phrasing: nothing here may say a regulation requires this choice. Regulation scope stays GDPR / DORA / DPDP.
- [ ] No em-dashes. Banned-phrase scan clean.
- [ ] UTM params present on the CTA link and any other jurocompliant.com link at build.
- [ ] Cross-links resolve: the companion-piece links to BL-MKT-091 must point at its final published URL, and BL-MKT-091's checklist carries the reciprocal item.
- [ ] Publish order: this post reads as a companion. Founder confirms whether it ships after BL-MKT-091 or as a same-day pair.
