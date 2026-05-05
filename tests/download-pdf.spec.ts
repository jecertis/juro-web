import { test, expect, SAMPLE_FINDINGS_RESPONSE } from './fixtures';

async function runScan(page: any, siteUrl: string, mockApi: any) {
  mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
  await page.goto(siteUrl);
  await page.fill('#urlInput', 'example.com');
  await page.check('#consentBox');
  await page.click('#scanBtn');
  await page.waitForSelector('#scanTargetBar[style*="display: flex"]', { timeout: 15_000 });
  // wait for all finding cards to animate in
  await page.waitForSelector('.finding-card.visible', { timeout: 10_000 });
}

test.describe('PDF download', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('juro_email_provided', '1');
      (window as any).print = () => {};
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

  test('D3: downloadReport fills print header with scanned domain', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await expect(page.locator('#printHeader')).toBeHidden();

    await page.locator('.download-pdf-btn').click();

    await expect(page.locator('#phDomain')).toHaveText('example.com');
    const dateText = await page.locator('#phDate').textContent();
    expect(dateText).toMatch(/\d{4}/);
  });

  test('D4: downloadReport clears severity filter so all finding cards are unmasked', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi);
    await expect(page.locator('#findingsList .finding-card')).toHaveCount(
      SAMPLE_FINDINGS_RESPONSE.findings!.length,
    );

    // apply a filter that hides non-critical cards
    await page.locator('[data-filter="critical"]').click();
    const hiddenBefore = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#findingsList .finding-card')).filter(
        (c) => (c as HTMLElement).style.display === 'none',
      ).length;
    });
    expect(hiddenBefore).toBeGreaterThan(0);

    await page.locator('.download-pdf-btn').click();

    const hiddenAfter = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#findingsList .finding-card')).filter(
        (c) => (c as HTMLElement).style.display === 'none',
      ).length;
    });
    expect(hiddenAfter).toBe(0);
  });

  test('D5: window.print is called when download button is clicked', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await page.addInitScript(() => {
      (window as any).__printCalled = 0;
      (window as any).print = () => { (window as any).__printCalled++; };
    });

    await runScan(page, siteUrl, mockApi);
    await page.locator('.download-pdf-btn').click();

    const printCalled = await page.evaluate(() => (window as any).__printCalled);
    expect(printCalled).toBe(1);
  });
});
