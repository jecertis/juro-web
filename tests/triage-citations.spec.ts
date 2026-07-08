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
 * job hasn't finished yet; the frontend polls /api/scan for the same
 * domain on an interval (prod: ~30s, capped ~8 attempts / ~4 min) until
 * the cached row is upgraded (`triage_pending: false`), swaps in the
 * citations, and drops the chip. Real prod triage (llama3.2:3b, 3 findings
 * at a time) takes ~90s-3min, well past a naive single 15s re-poll — this
 * is why the loop needs to keep going instead of firing once.
 *
 * Poll tests below override the interval/cap via
 * window.__JURO_TEST_TRIAGE_POLL_INTERVAL_MS / _MAX_ATTEMPTS (main.js
 * falls back to the real 30000ms/8-attempt values when unset) so tests
 * don't have to wait real minutes. This only changes timer cadence — the
 * mocked /api/scan responses and page.route interception are unaffected,
 * so it doesn't mask real cross-origin/network behavior.
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

test.describe('triage poll-until-done loop', () => {
  test('T6: polls until triage_pending flips false, then swaps citations and drops the chip', async ({ page, siteUrl, mockApi }) => {
    // Fast cadence for the test: poll every 150ms, up to 5 attempts.
    await page.addInitScript(() => {
      (window as any).__JURO_TEST_TRIAGE_POLL_INTERVAL_MS = 150;
      (window as any).__JURO_TEST_TRIAGE_POLL_MAX_ATTEMPTS = 5;
      localStorage.setItem('juro_email_provided', '1');
    });
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      triage_pending: true,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP_NO_CONSENT_ANALYTICS', location: 'x', remediation: 'fix' },
      ],
    });

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeVisible();
    const citation = page.locator('.finding-card[data-fid="F-001"] .finding-citation');
    await expect(citation).toBeHidden();

    // Still pending for the first couple of polls (mirrors real ~90s-3min
    // triage taking several 30s intervals before it's done).
    await page.waitForTimeout(320); // ~2 poll intervals
    await expect(page.locator('#triagePendingChip')).toBeVisible();
    await expect(citation).toBeHidden();

    // Cache row upgraded server-side — the next poll should see the cited version.
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      cached: true,
      triage_pending: false,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP § 6(1)', location: 'x', remediation: 'fix' },
      ],
    });

    await expect(page.locator('#triagePendingChip')).toBeHidden({ timeout: 5_000 });
    await expect(citation).toBeVisible();
    await expect(citation).toContainText('DPDP § 6(1)');
  });

  test('T7: still pending at the attempt cap → chip drops silently, no citation swap', async ({ page, siteUrl, mockApi }) => {
    await page.addInitScript(() => {
      (window as any).__JURO_TEST_TRIAGE_POLL_INTERVAL_MS = 400;
      (window as any).__JURO_TEST_TRIAGE_POLL_MAX_ATTEMPTS = 3;
      localStorage.setItem('juro_email_provided', '1');
    });
    // Every poll (initial + all retries) stays pending — triage never finishes.
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      triage_pending: true,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP_NO_CONSENT_ANALYTICS', location: 'x', remediation: 'fix' },
      ],
    });

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeVisible();

    // 3 attempts * 400ms + margin → the loop should give up and hide the chip.
    await expect(page.locator('#triagePendingChip')).toBeHidden({ timeout: 5_000 });
    const citation = page.locator('.finding-card[data-fid="F-001"] .finding-citation');
    await expect(citation).toBeHidden();

    // Initial scan + 3 poll attempts = 4 total /api/scan calls, then it stops
    // (no further growth after waiting past the cap).
    const countAtCap = mockApi.requests().length;
    expect(countAtCap).toBe(4);
    await page.waitForTimeout(600);
    expect(mockApi.requests().length).toBe(countAtCap);
  });

  test('T8: a stale poll (superseded scan generation) never writes into the DOM', async ({ page, siteUrl, mockApi }) => {
    // In production, currentScanGen advances at the top of every committed
    // runScan() call (a real second scan). The client-side SCAN_COOLDOWN_MS
    // makes triggering a genuine second scan within a fast test window
    // impractical, so this exercises the same guard the way runScan()
    // itself would trip it: bump the generation counter mid-flight via the
    // same accessor exposed for tests, then confirm the in-flight loop's
    // next tick is a no-op against the DOM.
    await page.addInitScript(() => {
      (window as any).__JURO_TEST_TRIAGE_POLL_INTERVAL_MS = 400;
      (window as any).__JURO_TEST_TRIAGE_POLL_MAX_ATTEMPTS = 3;
      localStorage.setItem('juro_email_provided', '1');
    });
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      triage_pending: true,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP_NO_CONSENT_ANALYTICS', location: 'x', remediation: 'fix' },
      ],
    });

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#triagePendingChip')).toBeVisible();

    // Supersede the running poll loop's generation token, exactly as a new
    // runScan() would.
    await page.evaluate(() => (window as any).__juroTriageHelpers.bumpScanGen());

    // The backend upgrades the cached row (as it would once triage finishes)
    // — but the stale loop must ignore it: its captured gen no longer
    // matches currentScanGen.
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      triage_pending: false,
      findings: [
        { id: 'F-001', sev: 'critical', title: 'Finding', desc: 'desc', rule: 'DPDP § 6(1)', location: 'x', remediation: 'fix' },
      ],
    });

    // Wait well past all remaining stale poll attempts.
    await page.waitForTimeout(1500);

    // Untouched: chip still visible, citation still hidden — the stale
    // loop never wrote into this generation's DOM.
    await expect(page.locator('#triagePendingChip')).toBeVisible();
    const citation = page.locator('.finding-card[data-fid="F-001"] .finding-citation');
    await expect(citation).toBeHidden();
  });
});
