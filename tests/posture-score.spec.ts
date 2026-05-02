/**
 * Posture Score panel render tests.
 *
 * The panel is the headline metric on the results page. Per the contract
 * (juro-platform/contracts/posture-score.md §"Anti-overclaim discipline"),
 * every render MUST surface scope, denominator, rule pack id+sha, and the
 * scanned-at timestamp. These tests guard that discipline.
 */

import { test, expect, SAMPLE_FINDINGS_RESPONSE, EMPTY_FINDINGS_RESPONSE } from './fixtures';

const FAILING_SCORE = SAMPLE_FINDINGS_RESPONSE.posture_score!;
const PASSING_SCORE = EMPTY_FINDINGS_RESPONSE.posture_score!;

test.describe('Posture Score panel', () => {
  test('renders with score, scope, denominator, rule-pack id+sha, and scanned-at', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#postureScorePanel:not([style*="display: none"])', {
      timeout: 10_000,
    });

    await expect(page.locator('#psScore')).toHaveText(String(FAILING_SCORE.score));
    await expect(page.locator('#psScope')).toContainText('Tier 1 surface scan');
    await expect(page.locator('#psDenom')).toContainText(
      `${FAILING_SCORE.weighted_passed} of ${FAILING_SCORE.weighted_total} weighted points`,
    );
    await expect(page.locator('#psDenom')).toContainText(
      `${FAILING_SCORE.rules_passed} of ${FAILING_SCORE.rules_total} rules passed`,
    );
    await expect(page.locator('#psPack')).toContainText(FAILING_SCORE.rule_pack_id);
    await expect(page.locator('#psPack')).toContainText('sha 0123456789ab');
    await expect(page.locator('#psPack')).toContainText('2026-05-02 12:00:00');
    await expect(page.locator('#psBrand')).toHaveText('Surface Posture · DPDP');
  });

  test('applies ps-fail class when score < 50', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE); // score: 20
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#postureScorePanel.ps-fail', { timeout: 10_000 });
  });

  test('applies ps-pass class when score >= 80', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(EMPTY_FINDINGS_RESPONSE); // score: 100
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'abhyaas.org');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#postureScorePanel.ps-pass', { timeout: 10_000 });
  });

  test('panel stays hidden when posture_score is null (e.g. SCANNER_BLOCKED)', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith({
      ...SAMPLE_FINDINGS_RESPONSE,
      posture_score: null,
    });
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#findingsList .finding-card', { timeout: 10_000 });

    // Score panel must remain display:none when no score is supplied.
    const display = await page.locator('#postureScorePanel').evaluate(
      (el) => getComputedStyle(el).display,
    );
    expect(display).toBe('none');
  });

  test('panel stays hidden when the API response omits posture_score entirely (legacy cache rows)', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    const { posture_score: _ignored, ...legacy } = SAMPLE_FINDINGS_RESPONSE;
    mockApi.respondWith(legacy);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#findingsList .finding-card', { timeout: 10_000 });

    const display = await page.locator('#postureScorePanel').evaluate(
      (el) => getComputedStyle(el).display,
    );
    expect(display).toBe('none');
  });
});
