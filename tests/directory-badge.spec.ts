import { test, expect } from './fixtures';

// BL-MKT-101 — embeddable DPDP readiness badge for directory-listed firms.
// Covers: badge asset rendering, client-side slugify + snippet generation,
// per-firm UTM attribution on the generated link, copy-to-clipboard, and
// beacon forwarding of utm_content (the attribution field this feature adds).

test.describe('B — directory badge', () => {
  test('B01: page loads with default generic slug and both badge previews present', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');

    await expect(page.locator('#badgeSlugPreview')).toHaveText('your-firm-name');
    await expect(page.locator('img[src="/badge/v1/dpdp-readiness-badge-flat.svg"]')).toBeVisible();
    await expect(page.locator('img[src="/badge/v1/dpdp-readiness-badge-card.svg"]')).toBeVisible();

    const flatSnippet = await page.locator('#snippetFlat').textContent();
    expect(flatSnippet).toContain('utm_content=your-firm-name');
    expect(flatSnippet).toContain('utm_source=badge');
    expect(flatSnippet).toContain('utm_medium=referral');
    expect(flatSnippet).toContain('utm_campaign=dpdp_readiness_badge');
    expect(flatSnippet).toContain('/badge/v1/dpdp-readiness-badge-flat.svg');
    expect(flatSnippet).toContain('Listed in the DPDP & GDPR Compliance Partner Directory');

    const cardSnippet = await page.locator('#snippetCard').textContent();
    expect(cardSnippet).toContain('/badge/v1/dpdp-readiness-badge-card.svg');
    expect(cardSnippet).toContain('utm_content=your-firm-name');
  });

  test('B02: typing a firm name slugifies it into both the preview and the snippets', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');

    await page.locator('#badgeFirmName').fill('Acme Data & Advisors Pvt. Ltd.');

    await expect(page.locator('#badgeSlugPreview')).toHaveText('acme-data-advisors-pvt-ltd');
    await expect(page.locator('#snippetFlat')).toContainText('utm_content=acme-data-advisors-pvt-ltd');
    await expect(page.locator('#snippetCard')).toContainText('utm_content=acme-data-advisors-pvt-ltd');
  });

  test('B03: clearing the firm name falls back to the generic slug', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');

    await page.locator('#badgeFirmName').fill('Some Firm');
    await expect(page.locator('#badgeSlugPreview')).toHaveText('some-firm');

    await page.locator('#badgeFirmName').fill('');
    await expect(page.locator('#badgeSlugPreview')).toHaveText('your-firm-name');
  });

  test('B04: Copy button on the flat snippet copies the exact snippet text to the clipboard', async ({ page, siteUrl, context }) => {
    // navigator.clipboard requires a "secure context" as Chromium defines it —
    // the literal hostname must be localhost/127.0.0.1, not a DNS name that
    // merely resolves there (siteUrl uses *.nip.io to dodge the scan-cooldown
    // localhost special-case elsewhere, which breaks that literal-hostname
    // check). Use the plain loopback origin here so the real Clipboard API
    // (not the execCommand fallback) is exercised.
    const loopbackUrl = siteUrl.replace(/127\.0\.0\.1\.nip\.io/, '127.0.0.1');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: loopbackUrl });
    await page.goto(loopbackUrl + '/directory-badge.html');
    await page.locator('#badgeFirmName').fill('Test Firm');

    const expected = await page.locator('#snippetFlat').textContent();
    await page.locator('#copyFlatBtn').click();
    await expect(page.locator('#copyFlatBtn')).toHaveText('Copied');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(expected);
  });

  test('B05: badge <img> alt text reads the full sentence (accessible / graceful when the image fails to load)', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');
    const alt = await page.locator('img[src="/badge/v1/dpdp-readiness-badge-flat.svg"]').getAttribute('alt');
    expect(alt).toBe('Listed in the DPDP & GDPR Compliance Partner Directory');
  });

  test('B06: pageview beacon on directory-badge.html forwards utm_content from the query string', async ({ page, siteUrl, mockApi }) => {
    await page.goto(`${siteUrl}/directory-badge.html?utm_source=badge&utm_medium=referral&utm_campaign=dpdp_readiness_badge&utm_content=acme-data-advisors`);
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons.length).toBeGreaterThanOrEqual(1);
    expect(beacons[0].body).toMatchObject({
      path: '/directory-badge.html',
      utm_source: 'badge',
      utm_medium: 'referral',
      utm_campaign: 'dpdp_readiness_badge',
      utm_content: 'acme-data-advisors',
    });
  });

  test('B07: pageview beacon on directory.html also forwards utm_content (badge click-through attribution)', async ({ page, siteUrl, mockApi }) => {
    await page.goto(`${siteUrl}/directory.html?utm_source=badge&utm_medium=referral&utm_campaign=dpdp_readiness_badge&utm_content=acme-data-advisors`);
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons.length).toBeGreaterThanOrEqual(1);
    expect(beacons[0].body).toMatchObject({
      utm_content: 'acme-data-advisors',
    });
  });

  test('B08: badge asset SVGs are served with the correct content type and carry the full-sentence <title> for accessibility', async ({ page, siteUrl, request }) => {
    for (const file of ['dpdp-readiness-badge-flat.svg', 'dpdp-readiness-badge-card.svg']) {
      const res = await request.get(`${siteUrl}/badge/v1/${file}`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/svg+xml');
      const body = await res.text();
      expect(body).toContain('Listed in the DPDP &amp; GDPR Compliance Partner Directory');
    }
  });
});
