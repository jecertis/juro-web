import { test, expect, SAMPLE_FINDINGS_RESPONSE } from './fixtures';

// The scan-target bar shows a small favicon thumbnail of the scanned site next
// to its domain. The icon is fetched from the scanned site itself (no
// third-party favicon service — that would be a third-party request on the very
// page whose report flags third-party requests).
//
// Test-harness note (observed, mechanism not established): in this Chromium, a
// request to a URL whose path is exactly `/favicon.ico` is never handed to a
// page.route() handler and errors immediately, while `/x.ico`, `/x.png` and
// `/favicon.svg` all intercept and load normally. Real `/favicon.ico` URLs do
// load in the same browser (verified against google.com and github.com), so the
// ico-first candidate works in production — it just can't be mocked here.
// These tests therefore drive the loader against the local static server, which
// really serves /favicon.svg and really 404s the earlier candidates.

async function runScan(page: any, siteUrl: string, mockApi: any, scannedUrl: string) {
  mockApi.respondWith({ ...SAMPLE_FINDINGS_RESPONSE, url: scannedUrl });
  await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
  await page.goto(siteUrl);
  await page.locator('#urlInput').fill('example.com');
  await page.locator('#consentBox').check();
  await page.locator('#scanBtn').click();
  await expect(page.locator('#scanTargetBar')).toBeVisible();
}

test.describe('scan-target favicon thumbnail', () => {
  test('F1: renders the scanned site\'s own favicon, keeping the domain text', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    await runScan(page, siteUrl, mockApi, siteUrl);

    const box = page.locator('#scanTargetFavicon');
    await expect(box).toBeVisible();
    await expect(box).toHaveClass(/is-loaded/);
    await expect(page.locator('#scanTargetFaviconImg')).toHaveAttribute('src', siteUrl + '/favicon.svg');
    // Domain text stays — the share card and Download Report both read it.
    await expect(page.locator('#scanTargetLabel')).toHaveText(siteUrl.replace(/^https?:\/\//, ''));
  });

  test('F2: falls through the icon candidates in order until one loads', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    const iconRequests: string[] = [];
    page.on('request', (r: any) => {
      const p = new URL(r.url()).pathname;
      if (/favicon|apple-touch-icon/.test(p)) iconRequests.push(p);
    });

    await runScan(page, siteUrl, mockApi, siteUrl);

    await expect(page.locator('#scanTargetFavicon')).toHaveClass(/is-loaded/);
    // /favicon.ico is tried first, but this Chromium does not surface that
    // request to the automation layer (see the note at the top of this file), so
    // the observable evidence of the fall-through is the order of the rest.
    expect(iconRequests).toEqual(['/favicon.png', '/favicon.svg']);
  });

  test('F3: no favicon anywhere → letter tile, no broken image', async ({ page, siteUrl, mockApi }) => {
    await page.route('https://example.com/**', (route: any) => route.fulfill({ status: 404, body: '' }));

    await runScan(page, siteUrl, mockApi, 'https://example.com');

    const box = page.locator('#scanTargetFavicon');
    await expect(box).toBeVisible();
    await expect(box).not.toHaveClass(/is-loaded/);
    await expect(page.locator('#scanTargetFaviconLetter')).toHaveText('e');
    // No src is ever set, so no broken-image glyph.
    expect(await page.locator('#scanTargetFaviconImg').getAttribute('src')).toBeNull();
  });

  test('F4: thumbnail requests send no referrer', async ({ page, siteUrl, mockApi }) => {
    const referers: (string | undefined)[] = [];
    page.on('request', async (r: any) => {
      if (/favicon\.svg$/.test(r.url())) referers.push((await r.allHeaders())['referer']);
    });

    await runScan(page, siteUrl, mockApi, siteUrl);

    await expect(page.locator('#scanTargetFavicon')).toHaveClass(/is-loaded/);
    expect(referers).toEqual([undefined]);
  });
});
