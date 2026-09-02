import { test, expect } from './fixtures';

// BL-MKT-106 — the free-text badge generator (`#badgeFirmName`, previously B01-B04)
// let any visitor mint a Juro-branded "DPDP Readiness Badge" embed snippet for
// an arbitrary, unvalidated firm name — an Axiom 2 compliance-verdict overclaim.
// Fixed by unshipping the self-serve generator entirely (BL-MKT-101's original
// scope). The page is now informational only: badge preview, disclaimer, and
// FAQ. Badges are issued directly to a firm once its listing is confirmed —
// no generator, no per-firm mint capability, on this page.

test.describe('B — directory badge', () => {
  test('B01: page loads with both badge previews present and no self-serve generator', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');

    await expect(page.locator('img[src="/badge/v1/dpdp-readiness-badge-flat.svg"]')).toBeVisible();
    await expect(page.locator('img[src="/badge/v1/dpdp-readiness-badge-card.svg"]')).toBeVisible();

    // The mint capability is gone: no free-text input, no generated snippet output.
    await expect(page.locator('#badgeFirmName')).toHaveCount(0);
    await expect(page.locator('#snippetFlat')).toHaveCount(0);
    await expect(page.locator('#snippetCard')).toHaveCount(0);
  });

  test('B02: badge <img> alt text reads the full sentence (accessible / graceful when the image fails to load)', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');
    const alt = await page.locator('img[src="/badge/v1/dpdp-readiness-badge-flat.svg"]').getAttribute('alt');
    expect(alt).toBe('Listed in the DPDP & GDPR Compliance Partner Directory');
  });

  test('B03: page states badge embeds are not currently available and links back to the directory', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/directory-badge.html');
    await expect(page.locator('.post-body')).toContainText('not currently available');
    await expect(page.locator('a[href="/directory"]').first()).toBeVisible();
  });

  test('B04: pageview beacon on directory-badge.html forwards utm_content from the query string', async ({ page, siteUrl, mockApi }) => {
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

  test('B05: pageview beacon on directory.html also forwards utm_content (badge click-through attribution)', async ({ page, siteUrl, mockApi }) => {
    await page.goto(`${siteUrl}/directory.html?utm_source=badge&utm_medium=referral&utm_campaign=dpdp_readiness_badge&utm_content=acme-data-advisors`);
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons.length).toBeGreaterThanOrEqual(1);
    expect(beacons[0].body).toMatchObject({
      utm_content: 'acme-data-advisors',
    });
  });

  test('B06: badge asset SVGs are served with the correct content type and carry the full-sentence <title> for accessibility', async ({ page, siteUrl, request }) => {
    for (const file of ['dpdp-readiness-badge-flat.svg', 'dpdp-readiness-badge-card.svg']) {
      const res = await request.get(`${siteUrl}/badge/v1/${file}`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/svg+xml');
      const body = await res.text();
      expect(body).toContain('Listed in the DPDP &amp; GDPR Compliance Partner Directory');
    }
  });
});
