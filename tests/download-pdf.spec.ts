import { test, expect, SAMPLE_FINDINGS_RESPONSE } from './fixtures';

async function runScan(page: any, siteUrl: string, mockApi: any) {
  mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
  await page.goto(siteUrl);
  await page.fill('#urlInput', 'example.com');
  await page.check('#consentBox');
  await page.click('#scanBtn');
  await page.waitForSelector('#scanTargetBar[style*="display: flex"]', { timeout: 15_000 });
  await page.waitForSelector('.finding-card.visible', { timeout: 10_000 });
}

test.describe('PDF download — email already provided', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('juro_email_provided', '1');
      (window as any).__printCalled = 0;
      (window as any).print = () => { (window as any).__printCalled++; };
    });
  });

  test('D1: download button not visible before any scan', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await expect(page.locator('#scanTargetBar')).not.toBeVisible();
    await expect(page.locator('.download-pdf-btn')).not.toBeVisible();
  });

  test('D2: download button visible after scan completes', async ({ page, siteUrl, mockApi }) => {
    await runScan(page, siteUrl, mockApi);
    await expect(page.locator('.download-pdf-btn')).toBeVisible();
  });

  test('D3: fills print header with domain and current date', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('.download-pdf-btn').click();

    await expect(page.locator('#prDomain')).toHaveText('example.com');
    const dateText = await page.locator('#prDate').textContent();
    expect(dateText).toMatch(/\d{4}/);
  });

  test('D4: clears severity filter so all finding cards are unmasked', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await expect(page.locator('#findingsList .finding-card')).toHaveCount(
      SAMPLE_FINDINGS_RESPONSE.findings!.length,
    );

    await page.locator('[data-filter="critical"]').click();
    const hiddenBefore = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#findingsList .finding-card')).filter(
        (c) => (c as HTMLElement).style.display === 'none',
      ).length,
    );
    expect(hiddenBefore).toBeGreaterThan(0);

    await page.locator('.download-pdf-btn').click();

    const hiddenAfter = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#findingsList .finding-card')).filter(
        (c) => (c as HTMLElement).style.display === 'none',
      ).length,
    );
    expect(hiddenAfter).toBe(0);
  });

  test('D5: triggers HTML file download with correct filename', async ({ page, siteUrl, mockApi }) => {
    await runScan(page, siteUrl, mockApi);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.download-pdf-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^juro-scan-.*\.html$/);
  });

  test('D6: auto email modal suppressed when email already provided', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    // Wait well past the auto-popup delay (ctaDelay + 2s)
    await page.waitForTimeout(4_000);
    await expect(page.locator('#emailModal')).toBeHidden();
  });
});

test.describe('PDF download — email not yet provided (gate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // No email and no prior scan — first scan runs freely, PDF download is gated
      localStorage.removeItem('juro_email_provided');
      localStorage.removeItem('juro_has_scanned');
      (window as any).__printCalled = 0;
      (window as any).print = () => { (window as any).__printCalled++; };
    });
  });

  test('D7: clicking download opens email modal instead of printing', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('.download-pdf-btn').click();

    await expect(page.locator('#emailModal')).toBeVisible();
    const printCalled = await page.evaluate(() => (window as any).__printCalled);
    expect(printCalled).toBe(0);
  });

  test('D8: submitting email triggers download and closes modal', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('.download-pdf-btn').click();
    await expect(page.locator('#emailModal')).toBeVisible();

    await page.fill('#modalEmail', 'demo@evergent.com');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#emailForm .modal-submit').click();

    await expect(page.locator('#emailModal')).toBeHidden({ timeout: 5_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^juro-scan-.*\.html$/);
  });

  test('D9: closing modal without submitting does not print', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await page.locator('.download-pdf-btn').click();
    await expect(page.locator('#emailModal')).toBeVisible();

    // Dismiss by clicking the backdrop
    await page.locator('#emailModal').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#emailModal')).toBeHidden();

    const printCalled = await page.evaluate(() => (window as any).__printCalled);
    expect(printCalled).toBe(0);
  });
});
