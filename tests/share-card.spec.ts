/**
 * Share card tests — BL-MKT-061 (self-serve post-scan shareable findings
 * card).
 *
 * Scope constraint under test: the card must show FINDINGS-COUNT FRAMING
 * ONLY. It must never surface a verdict, grade, or percentage (the posture
 * score panel elsewhere on the page is out of scope and must not leak into
 * this card's copy).
 *
 * Copy is currently a Tara-authored draft pending Katha's review and the
 * Samiksha content gate (see js/share-card.js header comment).
 */

import { test, expect, SAMPLE_FINDINGS_RESPONSE, EMPTY_FINDINGS_RESPONSE } from './fixtures';

async function runScan(page: any, siteUrl: string, mockApi: any, response = SAMPLE_FINDINGS_RESPONSE) {
  mockApi.respondWith(response);
  await page.goto(siteUrl);
  await page.fill('#urlInput', 'example.com');
  await page.check('#consentBox');
  await page.click('#scanBtn');
  await page.waitForSelector('#scanTargetBar[style*="display: flex"]', { timeout: 15_000 });
}

test.describe('Share findings card — visibility', () => {
  test('S1: share button not visible before any scan', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await expect(page.locator('#shareCardBtn')).not.toBeVisible();
  });

  test('S2: share button visible after scan completes', async ({ page, siteUrl, mockApi }) => {
    await runScan(page, siteUrl, mockApi);
    await expect(page.locator('#shareCardBtn')).toBeVisible();
  });

  test('S3: modal hidden until the share button is clicked', async ({ page, siteUrl, mockApi }) => {
    await runScan(page, siteUrl, mockApi);
    await expect(page.locator('#shareCardModal')).toBeHidden();
    await page.locator('#shareCardBtn').click();
    await expect(page.locator('#shareCardModal')).toBeVisible();
  });

  test('S4: close button dismisses the modal', async ({ page, siteUrl, mockApi }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('#shareCardBtn').click();
    await expect(page.locator('#shareCardModal')).toBeVisible();
    await page.locator('#shareCardModal .modal-dismiss').click();
    await expect(page.locator('#shareCardModal')).toBeHidden();
  });

  test('S5: clicking the backdrop dismisses the modal', async ({ page, siteUrl, mockApi }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('#shareCardBtn').click();
    await expect(page.locator('#shareCardModal')).toBeVisible();
    await page.locator('#shareCardModal').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#shareCardModal')).toBeHidden();
  });
});

test.describe('Share findings card — findings-count-only framing', () => {
  test('S6: headline shows a findings count, domain, and severity breakdown', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('#shareCardBtn').click();

    const total = SAMPLE_FINDINGS_RESPONSE.findings!.length;
    await expect(page.locator('#shareCardHeadline')).toContainText(String(total));
    await expect(page.locator('#shareCardHeadline')).toContainText('finding');
    await expect(page.locator('#shareCardDomain')).toHaveText('example.com');
    await expect(page.locator('#shareCardTotal')).toHaveText(String(total));
    await expect(page.locator('#shareCardCritical')).toHaveText('1');
    await expect(page.locator('#shareCardHigh')).toHaveText('2');
    await expect(page.locator('#shareCardMedium')).toHaveText('0');
  });

  test('S7: card never renders a percentage, "grade", or "score" (verdict leakage guard)', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    // SAMPLE_FINDINGS_RESPONSE carries a posture_score (score: 20) that renders
    // elsewhere on the page — this test guards against that verdict leaking
    // into the findings-count-only share card.
    await runScan(page, siteUrl, mockApi);
    await page.locator('#shareCardBtn').click();

    const cardText = await page.locator('#shareCardPreview').innerText();
    expect(cardText).not.toMatch(/%/);
    expect(cardText.toLowerCase()).not.toMatch(/\bgrade\b/);
    expect(cardText.toLowerCase()).not.toMatch(/\bscore\b/);
    expect(cardText).not.toContain('20'); // the posture_score.score value
  });

  test('S8: footer carries an explicit "not a compliance verdict" disclaimer', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('#shareCardBtn').click();
    await expect(page.locator('#shareCardFooter')).toContainText('not a compliance verdict');
  });

  test('S9: zero-findings scan renders a "0 findings" headline, not a clean-bill claim', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi, EMPTY_FINDINGS_RESPONSE);
    await page.locator('#shareCardBtn').click();
    await expect(page.locator('#shareCardHeadline')).toContainText('0 findings');
    const cardText = await page.locator('#shareCardPreview').innerText();
    expect(cardText.toLowerCase()).not.toMatch(/\bcompliant\b/);
    expect(cardText.toLowerCase()).not.toMatch(/\bpassed\b/);
  });
});

test.describe('Share findings card — download', () => {
  test('S10: download button triggers a PNG download with a domain-scoped filename', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('#shareCardBtn').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#shareCardDownloadBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^juro-findings-example\.com\.png$/);
  });
});

test.describe('Share findings card — pure data builder (window.__juroShareCard)', () => {
  test('S11: buildShareCardData pluralizes "finding" correctly and excludes verdict fields', async ({
    page,
    siteUrl,
  }) => {
    await page.goto(siteUrl);
    const single = await page.evaluate(() =>
      (window as any).__juroShareCard.buildShareCardData({
        domain: 'example.com',
        critical: 1,
        high: 0,
        medium: 0,
        total: 1,
        categoriesCount: 3,
        elapsedLabel: 'Completed in 5.0s',
      }),
    );
    expect(single.headline).toBe('1 finding identified');
    expect(single).not.toHaveProperty('score');
    expect(single).not.toHaveProperty('grade');
    expect(single).not.toHaveProperty('verdict');

    const plural = await page.evaluate(() =>
      (window as any).__juroShareCard.buildShareCardData({
        domain: 'example.com',
        critical: 2,
        high: 3,
        medium: 1,
        total: 6,
        categoriesCount: 3,
        elapsedLabel: 'Completed in 5.0s',
      }),
    );
    expect(plural.headline).toBe('6 findings identified');
  });
});
