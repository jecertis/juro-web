import { test, expect, SAMPLE_FINDINGS_RESPONSE, EMPTY_FINDINGS_RESPONSE, makeCachedResponse } from './fixtures';

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

  test('A2: empty URL → silent no-op, no notice, no API call', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    await page.locator('#consentBox').check();
    // urlInput intentionally left empty
    await page.locator('#scanBtn').click();

    await expect(page.locator('#noticeDialog')).not.toHaveClass(/is-open/);
    expect(mockApi.requests()).toHaveLength(0);
  });

  test('A3: malformed URL → "Check the URL" notice, no API call', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('not a domain');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    const dialog = page.locator('#noticeDialog');
    await expect(dialog).toHaveClass(/is-open/);
    await expect(dialog.locator('#noticeMessage')).toContainText('domain');
    expect(mockApi.requests()).toHaveLength(0);
  });

  test('A4: URL with protocol still passes validation (server normalises)', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('https://example.com/');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    // Validation passed → API was called. Body sent verbatim; server strips
    // protocol + trailing slash.
    await expect(page.locator('#progressWrap')).toBeVisible();
    expect(mockApi.requests()).toHaveLength(1);
    expect(mockApi.requests()[0].body).toEqual({ url: 'https://example.com/' });
  });

  test('A5: validator helpers exposed via window.__juroScanHelpers', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const verdicts = await page.evaluate(() => {
      const h = (window as any).__juroScanHelpers;
      return {
        bare: h.isValidScanDomain('example.com'),
        protocol: h.isValidScanDomain('https://example.com/'),
        subdomain: h.isValidScanDomain('app.example.co.uk'),
        empty: h.isValidScanDomain(''),
        spaces: h.isValidScanDomain('not a domain'),
        noTld: h.isValidScanDomain('localhost'),
        leadingDash: h.isValidScanDomain('-bad.com'),
      };
    });
    expect(verdicts).toEqual({
      bare: true,
      protocol: true,
      subdomain: true,
      empty: false,
      spaces: false,
      noTld: false,
      leadingDash: false,
    });
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

  test('B7: cached response renders "Scanned N min ago" badge instead of elapsed', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(makeCachedResponse(7));
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));

    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#resultsArea')).toBeVisible();
    // 7 minutes ago → "Scanned 7 min ago"; tolerate ±1 min for test execution drift.
    await expect(page.locator('#scanTimeLabel')).toHaveText(/Scanned [678] min ago/);
    await expect(page.locator('#scanTimeLabel')).not.toContainText('Completed in');
  });

  test('B8: formatScannedAgo helper covers boundary buckets', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const labels = await page.evaluate(() => {
      const h = (window as any).__juroScanHelpers;
      // Anchor "now" so the test is deterministic across runs.
      const now = Date.parse('2026-04-26T12:00:00Z');
      const at = (offsetSec: number) =>
        new Date(now - offsetSec * 1000).toISOString().slice(0, 19).replace('T', ' ');
      return {
        seconds: h.formatScannedAgo(at(30), now),
        oneMin: h.formatScannedAgo(at(75), now),
        minutes: h.formatScannedAgo(at(15 * 60), now),
        oneHour: h.formatScannedAgo(at(60 * 60), now),
        hours: h.formatScannedAgo(at(5 * 60 * 60), now),
        oneDay: h.formatScannedAgo(at(24 * 60 * 60), now),
        days: h.formatScannedAgo(at(3 * 24 * 60 * 60), now),
        missing: h.formatScannedAgo(undefined, now),
        garbage: h.formatScannedAgo('not-a-date', now),
      };
    });
    expect(labels).toEqual({
      seconds: 'Scanned moments ago',
      oneMin: 'Scanned 1 min ago',
      minutes: 'Scanned 15 min ago',
      oneHour: 'Scanned 1 hr ago',
      hours: 'Scanned 5 hr ago',
      oneDay: 'Scanned 1 day ago',
      days: 'Scanned 3 days ago',
      missing: '',
      garbage: '',
    });
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
