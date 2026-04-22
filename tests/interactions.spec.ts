import { test, expect, SAMPLE_FINDINGS_RESPONSE } from './fixtures';

async function runFullScan(page: any, siteUrl: string, mockApi: any) {
  mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
  await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
  await page.goto(siteUrl);
  await page.locator('#urlInput').fill('example.com');
  await page.locator('#consentBox').check();
  await page.locator('#scanBtn').click();
  await expect(page.locator('#resultsArea')).toBeVisible();
  await expect(page.locator('#findingsList .finding-card')).toHaveCount(3);
}

test.describe('D — rate limit and email gate', () => {
  test('D9: second scan within cooldown → "Please wait N seconds" notice', async ({ page, siteUrl, mockApi }) => {
    await runFullScan(page, siteUrl, mockApi);

    // Simulate a recent lastScanTime so the cooldown branch fires.
    await page.evaluate(() => { (window as any).lastScanTime = Date.now() - 1_000; });

    await page.locator('#scanBtn').click();

    const dialog = page.locator('#noticeDialog');
    await expect(dialog).toHaveClass(/is-open/);
    await expect(page.locator('#noticeMessage')).toContainText(/Please wait \d+ seconds/);
  });

  test('D10: second scan with no email provided → gate modal opens, no API call', async ({ page, siteUrl, mockApi }) => {
    await page.addInitScript(() => {
      localStorage.setItem('juro_has_scanned', '1');
      // juro_email_provided intentionally NOT set
    });
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#gateModal')).toBeVisible();
    expect(mockApi.requests()).toHaveLength(0);
  });
});

test.describe('E — severity filters', () => {
  test('E13: default active = Total; all cards visible', async ({ page, siteUrl, mockApi }) => {
    await runFullScan(page, siteUrl, mockApi);

    const total = page.locator('#severityFilters .metric-card[data-filter="all"]');
    await expect(total).toHaveClass(/is-active/);
    await expect(total).toHaveAttribute('aria-pressed', 'true');

    const cards = page.locator('#findingsList .finding-card');
    for (let i = 0; i < (await cards.count()); i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });

  test('E14: click Critical → only critical cards visible', async ({ page, siteUrl, mockApi }) => {
    await runFullScan(page, siteUrl, mockApi);

    await page.locator('#severityFilters .metric-card[data-filter="critical"]').click();

    const critTile = page.locator('#severityFilters .metric-card[data-filter="critical"]');
    await expect(critTile).toHaveClass(/is-active/);
    await expect(page.locator('#severityFilters .metric-card[data-filter="all"]')).not.toHaveClass(/is-active/);

    await expect(page.locator('#findingsList .finding-card.critical:visible')).toHaveCount(1);
    await expect(page.locator('#findingsList .finding-card.high:visible')).toHaveCount(0);
    await expect(page.locator('#findingsList .finding-card.medium:visible')).toHaveCount(0);
  });

  test('E16: click an empty-count tile → no-op, active filter unchanged', async ({ page, siteUrl, mockApi }) => {
    await runFullScan(page, siteUrl, mockApi);

    const medium = page.locator('#severityFilters .metric-card[data-filter="medium"]');
    await expect(medium).toHaveClass(/is-empty/);

    await medium.click({ force: true });

    await expect(medium).not.toHaveClass(/is-active/);
    await expect(page.locator('#severityFilters .metric-card[data-filter="all"]')).toHaveClass(/is-active/);
  });
});

test.describe('F — notice dialog behavior', () => {
  test('F19: showNotice opens overlay and focuses OK', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await page.evaluate(() => (window as any).showNotice('hello', { eyebrow: 'Test' }));

    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);
    await expect(page.locator('#noticeMessage')).toHaveText('hello');
    const focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('noticeOk');
  });

  test('F20: click OK closes the dialog', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await page.evaluate(() => (window as any).showNotice('bye'));
    await page.locator('#noticeOk').click();
    await expect(page.locator('#noticeDialog')).not.toHaveClass(/is-open/);
  });

  test('F21: Escape closes the dialog', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await page.evaluate(() => (window as any).showNotice('bye'));
    await page.keyboard.press('Escape');
    await expect(page.locator('#noticeDialog')).not.toHaveClass(/is-open/);
  });

  test('F22: backdrop click closes; card click does not', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await page.evaluate(() => (window as any).showNotice('stay'));

    // Click the card first — must not close.
    await page.locator('#noticeCard').click();
    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);

    // Click the overlay (outside the card) — must close.
    await page.locator('#noticeDialog').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#noticeDialog')).not.toHaveClass(/is-open/);
  });
});
