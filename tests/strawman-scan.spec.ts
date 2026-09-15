import { test, expect } from './fixtures';

// BL-MKT-109 — card.html (the business-card QR redirect stub) correctly
// preserves utm_source=business_card&utm_medium=qr&utm_campaign=strawman_scan
// &utm_content=card_qr onto strawman-scan.html, but the page never read or
// logged those params anywhere — no beacon, no capture — so card-QR traffic
// was indistinguishable from any other business-card-sourced hit. Fixed by
// adding the same pageview beacon pattern used on directory-badge.html,
// install.html, about.html, etc. Scan-demo animation/logic is untouched.

test.describe('S — strawman-scan pageview beacon', () => {
  test('S01: pageview beacon on strawman-scan.html forwards the card-QR utm_content', async ({ page, siteUrl, mockApi }) => {
    await page.goto(`${siteUrl}/strawman-scan.html?utm_source=business_card&utm_medium=qr&utm_campaign=strawman_scan&utm_content=card_qr`);
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons.length).toBeGreaterThanOrEqual(1);
    expect(beacons[0].body).toMatchObject({
      path: '/strawman-scan.html',
      utm_source: 'business_card',
      utm_medium: 'qr',
      utm_campaign: 'strawman_scan',
      utm_content: 'card_qr',
    });
  });

  test('S02: pageview beacon still fires with no incoming utm params (direct visit)', async ({ page, siteUrl, mockApi }) => {
    await page.goto(`${siteUrl}/strawman-scan.html`);
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons.length).toBeGreaterThanOrEqual(1);
    expect(beacons[0].body.path).toBe('/strawman-scan.html');
    expect(beacons[0].body.utm_source).toBeUndefined();
  });
});
