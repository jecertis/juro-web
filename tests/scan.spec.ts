import { test, expect, SAMPLE_FINDINGS_RESPONSE, EMPTY_FINDINGS_RESPONSE } from './fixtures';

test.describe('A — pre-scan validation', () => {
  test('A1: click Scan without consent → themed notice, no API call', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('kapiva.in');
    // consent NOT checked
    await page.locator('#scanBtn').click();

    const dialog = page.locator('#noticeDialog');
    await expect(dialog).toHaveClass(/is-open/);
    await expect(dialog.locator('#noticeMessage')).toContainText('authorised');
    expect(mockApi.requests()).toHaveLength(0);
  });
});

test.describe('B — scan happy path', () => {
  test('B4: progress visible + stakes-strip hidden during scan', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();

    // Slow the API so we can observe in-flight state.
    await page.route('**/api/scan', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAMPLE_FINDINGS_RESPONSE),
      });
    });

    await page.locator('#scanBtn').click();

    await expect(page.locator('#progressWrap')).toBeVisible();
    await expect(page.locator('#stakesStrip')).toBeHidden();
    await expect(page.locator('#scanBtn')).toBeDisabled();
    await expect(page.locator('#scanBtn')).toHaveText(/Scanning/);
  });

  test('B5: findings render, counts match, CTA visible', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#cCount')).toHaveText('1');
    await expect(page.locator('#hCount')).toHaveText('2');
    await expect(page.locator('#mCount')).toHaveText('0');
    await expect(page.locator('#tCount')).toHaveText('3');

    const cards = page.locator('#findingsList .finding-card');
    await expect(cards).toHaveCount(3);

    await expect(page.locator('#ctaBlock')).toBeVisible();
  });

  test('B6: findings:[] renders zero-findings explainer, email modal does NOT open', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(EMPTY_FINDINGS_RESPONSE);
    // Do NOT pre-mark email provided — this test asserts the modal still doesn't open.

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('abhyaas.org');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#findingsList .zero-findings')).toBeVisible();
    await expect(page.locator('#findingsList .zero-findings-title')).toContainText("isn't a clean bill");
    await expect(page.locator('#ctaBlock')).toBeVisible();

    // ctaDelay = 80 + 0*160 + 500 = 580ms; email modal would open at 2580ms. Wait past that.
    await page.waitForTimeout(3_000);
    await expect(page.locator('#emailModal')).toBeHidden();
    await expect(page.locator('#findingsList .finding-card')).toHaveCount(0);
  });
});

test.describe('C — scan errors', () => {
  test('C7: API returns {error} → red notice, progress hidden, strip re-shown', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith({ error: 'Scan target unreachable' });
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    const dialog = page.locator('#noticeDialog');
    await expect(dialog).toHaveClass(/is-open/);
    await expect(page.locator('#noticeCard')).toHaveClass(/is-error/);
    await expect(page.locator('#noticeMessage')).toContainText('Scan target unreachable');
    await expect(page.locator('#progressWrap')).toBeHidden();
    await expect(page.locator('#stakesStrip')).toBeVisible();
  });

  test('C8: network failure → connection-failed notice, strip re-shown', async ({ page, siteUrl, mockApi }) => {
    mockApi.fail();
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    const dialog = page.locator('#noticeDialog');
    await expect(dialog).toHaveClass(/is-open/);
    await expect(page.locator('#noticeCard')).toHaveClass(/is-error/);
    await expect(page.locator('#noticeMessage')).toContainText('Failed to connect');
    await expect(page.locator('#progressWrap')).toBeHidden();
    await expect(page.locator('#stakesStrip')).toBeVisible();
  });
});

test.describe('H — progress and stakes-strip DOM order', () => {
  test('H31: progressWrap appears before stakesStrip in DOM', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const order = await page.evaluate(() => {
      const p = document.getElementById('progressWrap');
      const s = document.getElementById('stakesStrip');
      if (!p || !s) return null;
      return p.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING ? 'progress-first' : 'strip-first';
    });
    expect(order).toBe('progress-first');
  });

  test('H29: stakes-strip visible on initial page load', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await expect(page.locator('#stakesStrip')).toBeVisible();
    await expect(page.locator('#progressWrap')).toBeHidden();
  });
});
