/**
 * Tier 1 triage/citation pipeline — frontend consumption.
 *
 * The backend (jecertis/juro src/routes/scans.ts) folds a RAG-generated
 * legal citation into each finding's `rule` field when triage has
 * completed (mapFindingForWeb: `rule: f.legal_basis || f.rule_id`). Raw
 * rule IDs are SCREAMING_SNAKE_CASE (e.g. DPDP_NO_CONSENT_BANNER);
 * citations contain spaces/section marks (e.g. "DPDP § 5", "GDPR Art. 7").
 * The frontend uses that shape difference (isRawRuleId helper) to decide
 * whether to render a citation line — there is no separate boolean flag
 * on the finding.
 *
 * `triage_pending` on the top-level response signals the background RAG
 * job hasn't finished yet; the frontend shows a chip and does exactly one
 * re-poll ~15s later to pick up the upgraded (cached) response.
 */
import { test, expect, SAMPLE_FINDINGS_RESPONSE } from './fixtures';

test.describe('triage citation rendering', () => {
  test('T1: citation-shaped rule renders a ⚖ citation line; raw rule_id does not', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Cited finding', desc: 'desc', rule: 'DPDP § 5', location: 'x', remediation: 'fix' },
        { id: 'F-002', sev: 'high', title: 'Raw finding', desc: 'desc', rule: 'DPDP_NO_CONSENT_BANNER', location: 'x', remediation: 'fix' },
      ],
    });
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();

    const citedCard = page.locator('.finding-card[data-fid="F-001"] .finding-citation');
    await expect(citedCard).toBeVisible();
    await expect(citedCard).toContainText('DPDP § 5');
    await expect(citedCard).toContainText('⚖');

    const rawCard = page.locator('.finding-card[data-fid="F-002"] .finding-citation');
    await expect(rawCard).toBeHidden();
  });

  test('T2: isRawRuleId helper classifies raw IDs vs citations', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const verdicts = await page.evaluate(() => {
      const h = (window as any).__juroTriageHelpers;
      return {
        rawId: h.isRawRuleId('DPDP_NO_CONSENT_BANNER'),
        rawIdWithDigits: h.isRawRuleId('AIACT_50_001'),
        citationSection: h.isRawRuleId('DPDP § 5'),
        citationArt: h.isRawRuleId('GDPR Art. 7'),
        empty: h.isRawRuleId(''),
        undef: h.isRawRuleId(undefined as any),
      };
    });
    expect(verdicts).toEqual({
      rawId: true,
      rawIdWithDigits: true,
      citationSection: false,
      citationArt: false,
      empty: false,
      undef: false,
    });
  });
});

test.describe('triage pending chip', () => {
  test('T3: triage_pending:true shows the chip', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith({ ...SAMPLE_FINDINGS_RESPONSE, triage_pending: true });
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toContainText('Adding legal citations');
  });

  test('T4: triage_pending absent (legacy/pre-PR#190 prod shape) → no chip', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE); // no triage_pending field at all
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeHidden();
  });

  test('T5: triage_pending:false explicitly → no chip', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith({ ...SAMPLE_FINDINGS_RESPONSE, triage_pending: false });
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeHidden();
  });
});

test.describe('one re-poll upgrades citations and drops the chip', () => {
  test('T6: after ~15s, a cache-hit re-poll swaps in citations and removes the chip', async ({ page, siteUrl, mockApi }) => {
    test.slow();
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      triage_pending: true,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP_NO_CONSENT_ANALYTICS', location: 'x', remediation: 'fix' },
      ],
    });
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeVisible();
    const citation = page.locator('.finding-card[data-fid="F-001"] .finding-citation');
    await expect(citation).toBeHidden();

    // Cache row upgraded server-side — the re-poll should see the cited version.
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      cached: true,
      triage_pending: false,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP § 6(1)', location: 'x', remediation: 'fix' },
      ],
    });

    // Re-poll fires once ~15s after the initial render; wait past it.
    await expect(page.locator('#triagePendingChip')).toBeHidden({ timeout: 20_000 });
    await expect(citation).toBeVisible();
    await expect(citation).toContainText('DPDP § 6(1)');

    // Exactly one re-poll: two /api/scan calls total (initial + repoll).
    expect(mockApi.requests()).toHaveLength(2);
  });
});
