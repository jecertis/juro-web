/**
 * EU AI Act posture card render tests.
 *
 * The card (#aiactScorePanel) mirrors the DPDP posture panel but only renders
 * when posture_scores[] contains an entry with regulation === "EU AI Act".
 * It must NOT appear on scans where no AI surface was detected.
 */

import {
  test,
  expect,
  SAMPLE_FINDINGS_RESPONSE,
  AIACT_FINDINGS_RESPONSE,
} from './fixtures';

const AIACT_SCORE = AIACT_FINDINGS_RESPONSE.posture_scores![0];

test.describe('EU AI Act posture card', () => {
  test('card renders when posture_scores contains an EU AI Act entry', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(AIACT_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#aiactScorePanel:not([style*="display: none"])', {
      timeout: 10_000,
    });

    await expect(page.locator('#aiactScore')).toHaveText(String(AIACT_SCORE.score));
    await expect(page.locator('#aiactScope')).toContainText('EU AI Act Art. 50');
    await expect(page.locator('#aiactDenom')).toContainText(
      `${AIACT_SCORE.weighted_passed} of ${AIACT_SCORE.weighted_total} weighted points`,
    );
    await expect(page.locator('#aiactDenom')).toContainText(
      `${AIACT_SCORE.rules_passed} of ${AIACT_SCORE.rules_total} rules passed`,
    );
    await expect(page.locator('#aiactPack')).toContainText(AIACT_SCORE.rule_pack_id);
    await expect(page.locator('#aiactPack')).toContainText('sha abcdef012345');
    await expect(page.locator('#aiactPack')).toContainText('2026-05-02 12:00:00');
    await expect(page.locator('#aiactBrand')).toHaveText('Surface Posture · EU AI Act');
  });

  test('applies ps-fail class when EU AI Act score is 0', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(AIACT_FINDINGS_RESPONSE); // score: 0
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#aiactScorePanel.ps-fail', { timeout: 10_000 });
  });

  test('shows AIACT-50-001 finding label when score is 0', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(AIACT_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#aiactScorePanel:not([style*="display: none"])', {
      timeout: 10_000,
    });

    await expect(page.locator('#aiactFinding')).toBeVisible();
    await expect(page.locator('#aiactFinding')).toContainText('AIACT-50-001');
  });

  test('card stays hidden when posture_scores has no EU AI Act entry', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE); // no posture_scores at all
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#findingsList .finding-card', { timeout: 10_000 });

    const display = await page.locator('#aiactScorePanel').evaluate(
      (el) => getComputedStyle(el).display,
    );
    expect(display).toBe('none');
  });

  test('card stays hidden when posture_scores is an empty array', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith({ ...SAMPLE_FINDINGS_RESPONSE, posture_scores: [] });
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#findingsList .finding-card', { timeout: 10_000 });

    const display = await page.locator('#aiactScorePanel').evaluate(
      (el) => getComputedStyle(el).display,
    );
    expect(display).toBe('none');
  });

  test('existing DPDP panel still renders correctly when EU AI Act card also shows', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(AIACT_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');

    await page.waitForSelector('#postureScorePanel:not([style*="display: none"])', {
      timeout: 10_000,
    });
    await page.waitForSelector('#aiactScorePanel:not([style*="display: none"])', {
      timeout: 10_000,
    });

    // DPDP card shows its own score unchanged
    await expect(page.locator('#psScore')).toHaveText(
      String(AIACT_FINDINGS_RESPONSE.posture_score!.score),
    );
    await expect(page.locator('#psBrand')).toHaveText('Surface Posture · DPDP');
  });
});
