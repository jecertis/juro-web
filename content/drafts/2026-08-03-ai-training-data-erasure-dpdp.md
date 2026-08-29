# You can delete the record. You cannot un-train the model.

**Status: DRAFT, pending Samiksha gate. Written to fill the deep-dive gap Tara flagged while building the DPDP AI Data Flow Mapper (PR #140, unmerged).**
**Author:** Lekhni (drafting), 2026-08-03. Backlog: unfiled (companion to PR #140).
**Suggested slug:** dpdp-ai-training-data-erasure
**Suggested regulation tag:** DPDP (cross-references GDPR)

> **Note on scope, per Axiom 2.** This post describes where erasure is technically easy and where it is technically hard in an AI system. It is not a legal opinion, not a verdict on any company's compliance position, and not a claim that any particular design satisfies any regulation. Nothing here says that a difficult erasure path means you are in violation of anything. Where a question is legal rather than engineering, this post says so and stops.

A deleted database row and a deleted person are not the same thing. If a model was trained or fine-tuned on someone's data, dropping their record from the source table leaves the weights exactly as they were. The model still carries whatever it learned. That gap, between the delete you can execute and the delete a person actually asked for, is the hardest part of the right to erasure under India's DPDP Act 2023 for any team shipping AI.

Juro (JeCertis) is a non-custodial compliance scanner: it runs inside a company's own cloud, checks configuration against GDPR, DORA, and DPDP, and produces signed, verifiable evidence of what it found, not a compliance certificate. [Not to be confused with juro.com](/which-juro), an unrelated contract-management tool. We wrote this because our [DPDP AI Data Flow Mapper](/dpdp-data-flow-mapper) keeps landing engineers on the same red box, and they deserve more than a red box.

> Erasure is a data-lifecycle problem, not a database problem. The lifecycle stage where the data landed decides how hard the delete is.

## Can you delete a person from a trained model?

Usually not directly, and that is the honest answer rather than a pessimistic one.

During training, personal data does not sit in a row you can find. It is absorbed into the parameters. Some of it is generalised beyond recovery, which is the intended behaviour. Some of it is memorised close to verbatim, which is not intended: rare, high-entropy strings such as a phone number, an account identifier, or an unusual name in a small dataset are exactly the values a model is most likely to retain and, under the right prompt, reproduce. You cannot query the weights to find out which is which.

That leaves three practical responses, none of them a one-click delete.

**Delete the source and log it.** Removing the record from the training set, the intermediate shards, and the backups is real work and it is worth doing. It stops the data being re-learned by the next training run. It does not touch the current model, and saying otherwise to a person exercising a right is the mistake to avoid.

**Retrain or fine-tune without the record.** Technically clean, financially painful. For a small fine-tune this is often genuinely viable, and the cost of that retrain is a number your team should know before a request arrives rather than after. For a large from-scratch model it is usually out of reach, which is why the design decisions upstream matter so much.

**Machine unlearning.** An active research area with methods that approximate the effect of removing a training example. Treat it as promising, not proven. If you rely on it, you are relying on a technique whose guarantees are still being argued about in the literature, and you should be able to say precisely what it does and does not remove.

The uncomfortable summary: for training and fine-tuning, erasure is a design decision you make months before the request, not an operation you perform after it.

## Why RAG and on-device systems are different

The mapper marks retrieval and on-device stages differently from training for a reason. They are deletable when they are designed to be.

In a retrieval system, personal data sits in a vector store and is fetched at query time. That is live personal data, not training data, and it has an address. Deleting a person means deleting their entries from the vector store, plus the retrieval cache, plus any derived summaries, plus the source documents. That is a real delete path with a real test you can run: query for the person after deletion and confirm nothing comes back.

Two traps sit under this. The first is the delete path that only covers the source database while the embeddings survive in the index, which is the most common version of this bug we would expect a team to find. The second is the team that also fine-tuned on the same corpus, which quietly puts a weights problem behind the retrieval problem and turns an easy answer into a hard one.

On-device and federated designs push the exposure further down. Raw data stays on the user's device and only model updates or noised signals leave it. Centrally there is often little or nothing identifiable to delete, which is a strong position provided you have confirmed that nothing identifiable is aggregated server-side. Confirm that rather than assume it.

## Mitigations that actually change the erasure picture

Everything below is an engineering choice that changes how hard a future request will be. None of it makes anyone compliant, and none of it removes the need for a lawyer to look at your specific facts.

**Prefer retrieval over fine-tuning when the data must stay deletable.** This is the decision that changes the most. If the personal data is there so the system can answer questions about it, retrieval usually does the job, and retrieval keeps the data addressable. Fine-tuning on personal data buys you fluency and costs you the delete path.

**Design so the model never learns identifiable data.** Pseudonymise or tokenise before the data reaches the training pipeline. Strip direct identifiers. If the model only ever saw a token, there is far less to memorise and the erasure question mostly dissolves. A problem you designed out is one you never have to answer for.

**Use differential privacy to bound memorisation.** DP-SGD and similar approaches add calibrated noise so that no single training example measurably shapes the result. It costs accuracy and it needs a privacy budget you can state and defend. The reason to do it is that it converts "we hope nothing was memorised" into a parameter you wrote down.

**Isolate and minimise fine-tuning datasets.** One tenant per adapter, the least data that gets the result, raw datasets deleted on completion with the deletion logged. Isolation means a single erasure request touches one artefact rather than a shared model that serves everyone.

**Keep the evidence.** Whatever you do, the part that survives scrutiny later is the record: what was deleted, when, from which store, and by which job. An assertion that a delete ran is worth much less than an artefact showing it ran. That is the whole reason our scanner emits signed output rather than a summary email.

## Who owns erasure when a fine-tuned model changes hands?

This is where an engineering problem becomes a contract problem, and the answer is almost never written down until it is needed.

A vendor fine-tunes a model on a client's data and delivers the model. Six months later an individual asks the client to erase everything about them. The raw dataset was deleted by the vendor on delivery. Whatever the weights memorised travelled with the model and now sits with the client. Who runs the erasure? Who pays for the retrain if a retrain is the answer? Who answers the individual within the statutory timeline?

Under DPDP the fiduciary and processor roles turn on who determines the purpose of the processing, not on who wrote the code, and a team can be fiduciary for some flows and processor for others at the same time. That framing tells you who owes the duty. It does not tell you who holds the technical capability to discharge it, and those two are frequently different people. Note also that DPDP places a duty on the fiduciary to have processing carried out by a processor only under a valid contract, which makes this an item you are expected to have settled in writing rather than negotiated in the moment.

Settle four things in the contract before delivery:

1. Which party executes an erasure request against the delivered model, and within what window.
2. What "erasure" means concretely here: source deletion only, or a retrain, and who bears that cost.
3. What the vendor retains after delivery, including checkpoints, evaluation sets, and logs, and for how long.
4. What evidence of deletion gets produced and handed over, in what form.

A clause that reads "the parties will cooperate in good faith on data subject requests" is a decision deferred, not a decision made. The specific version of that clause is what makes the difference at the moment a request lands.

## How to check your own system

Ask one question at the next design review: if a person asked us tomorrow to delete every trace of them, what exactly would we run?

If the answer is a DELETE against a table and nothing else, walk the lifecycle and find every place the data went after that table. Training set. Fine-tune shards. Vector index. Retrieval cache. Backups. Logs. Model checkpoints. A third-party model provider's retention window. Each of those is either in your delete path or it is a gap you now know about.

The [DPDP AI Data Flow Mapper](/dpdp-data-flow-mapper) walks that lifecycle for you in about two minutes. Three questions about one system, and it returns a stage-by-stage map showing where the data lives, your likely fiduciary or processor role, and how hard erasure is at each stage. It runs entirely in your browser and nothing you enter is sent anywhere. It will not tell you whether you are compliant, because no tool honestly can. It will tell you which stage is going to be the difficult conversation.

For the safeguard-by-safeguard layer underneath, access control, encryption, retention, and how each maps to specific DPDP provisions, see the [DPDP Technical Evidence Handbook](/dpdp-technical-evidence-handbook).

## Frequently asked questions

**Can personal data be deleted from a trained AI model?**
Not by deleting the record it came from. Training absorbs personal data into the model's parameters, and you cannot query those parameters to separate what was generalised from what was memorised close to verbatim. Three responses exist, none of them one-click: remove the source data so the next training run does not re-learn it, retrain or re-fine-tune without the record at a cost your team should price before a request arrives, or apply machine unlearning, which approximates removal and is still an active research area.

**Is a RAG system easier to handle an erasure request on than a fine-tuned model?**
Typically yes. In a retrieval system the personal data sits in a vector store with an address, so deleting the person's entries from the store, the retrieval cache, and the source documents is usually enough. The exception is when the same data was also used to fine-tune the model, which puts a weights problem behind the retrieval one.

**Does differential privacy solve the erasure problem?**
No, it bounds it. Differential privacy limits how much any single training example can influence the model, which reduces the chance that a specific person's data was memorised. It is a mitigation with a measurable budget, not a delete mechanism, and it costs some accuracy.

**Who is responsible for erasure after a fine-tuned model is handed to a client?**
That is a contract question and should be settled before delivery. Under DPDP the duty follows whoever determines the purpose of the processing, but the technical ability to act often sits with whoever holds the model and the training data. Name the party, the window, the cost, and the evidence produced, in writing.

**Do I have to delete the model if I cannot delete one person from it?**
Not a question anyone can answer generically, and any tool or vendor that answers it for you is overreaching. It depends on the data, the lawful basis, the system design, and facts a lawyer needs to see. What an engineering team can do is establish exactly what is technically removable, document it, and put that in front of counsel rather than guessing.

**Where does Juro fit into this?**
Our scanner checks configuration inside your own cloud and produces signed, verifiable evidence of what it found. It does not make erasure decisions for you and it never receives your data. For the erasure question specifically, the mapper is the starting point: it shows you which lifecycle stage the difficulty lives in.

---

**CTA (for Tara at build):** Eyebrow "Check your own system". Headline "Map where erasure gets hard, in two minutes." Body: short line pointing at the mapper, with the scanner as the secondary action. Button link must carry UTM params, for example `https://jurocompliant.com/dpdp-data-flow-mapper?utm_source=blog&utm_medium=organic&utm_campaign=dpdp-ai-training-data-erasure`.

---

## Pre-publish blockers checklist (for Samiksha and founder)

- [ ] **Samiksha editorial + SEO/AEO gate** not yet run. Pre-empted from the 2026-07-28 review findings: early product definition present (paragraph 2), one question-phrased H2 present ("Can you delete a person from a trained model?"), three internal links present (`/which-juro`, `/dpdp-data-flow-mapper`, `/dpdp-technical-evidence-handbook`).
- [ ] **PR #140 merged (mapper is live).** Internal links in this post now use the extensionless canonical form (`/dpdp-data-flow-mapper`), matching BL-ENG-155's fix — do not reintroduce `.html`-suffixed links on publish.
- [ ] **Loop closure:** once this post is live, repoint the mapper's result-screen `blog-cta` (currently `/dpdp-technical-evidence-handbook`) to this post. That link gap is the reason this draft exists.
- [ ] **Verify the handbook page is live and confirm its URL form** at publish time. This draft links it extension-less (`/dpdp-technical-evidence-handbook`) to match the prior draft and the checklist's canonical convention, while the mapper page links it with `.html`. Settle one form site-wide, or cut the link rather than shipping a 404.
- [x] **No DPDP section numbers asserted anywhere in this draft, deliberately.** The processor-contract duty is described in plain words only. Resolved 2026-08-29 (Samiksha round-2 warning): verification of the section number was attempted and could not be completed with the sources available (no primary DPDP Act text in-repo, no access to the official Act text at drafting time). Per the no-citation-without-verification rule the number stays out and the substance-only phrasing at the processor-contract paragraph is unchanged. Do not add a plausible-looking number. If a primary source is confirmed later, a citation may be added at build, not before.
- [ ] **No enforcement-deadline framing.** The mapper's "before May 2027" line is deliberately not carried over. Statutory scope only, per the GTM rule.
- [ ] **No "free" as a lead hook**, per BL-MKT-094 (founder-directed, site-wide). This draft avoids it. Do not reintroduce it in the CTA copy at build.
- [ ] **Axiom 2 scrub:** no line asserts or implies any design is compliant or non-compliant. The "do I have to delete the model" FAQ deliberately refuses to answer and routes to counsel. Keep it that way.
- [ ] **Axiom 4 scrub:** no customer names, pilot details, or prospect data. The vendor/client scenario is generic and hypothetical by construction.
- [x] **Research claims:** resolved 2026-08-29 (Samiksha round-2 warning). The unsupported "well documented across the research literature" clause has been cut; the memorisation paragraph now states the behaviour directly without appealing to literature consensus. No paper is named and no citation was fabricated. If a primary source is added later, cite it with a link or leave the general phrasing.
- [ ] Banned-phrase scan clean, including the adjective forms ("leverage" was caught and removed in review). No em-dashes anywhere, including anything lifted from the mapper HTML, which is full of them. Sweep for `—`, `–`, and `&middot;` before build.
- [ ] Word count is above the 1,200 threshold with margin, but re-run `node scripts/blog-audit.js` after the HTML build: the audit script drops all tokens of three characters or fewer before counting.
- [ ] Build-time meta: `article:author` and `meta name="author"` both set to `JuroCompliant`, not to Lekhni or any person.
- [ ] FAQ section has 6 Q&A pairs, above the 5 minimum. FAQPage JSON-LD must match the visible text word-for-word. The "Can personal data be deleted from a trained AI model?" answer was rewritten 2026-08-03 to remove the verbatim overlap with the mapper's FAQ schema; the RAG answer below it still paraphrases the second half of that same mapper answer, founder call whether to vary that one too.
- [ ] OG image `og/dpdp-ai-training-data-erasure.png` needs generating. Sitemap, `llms.txt`, `blog/index.html`, and the homepage feature strip all need updating per the publishing checklist.
- [ ] UTM params present on every jurocompliant.com link at build.
