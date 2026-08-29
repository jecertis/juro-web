/**
 * Directory listing render tests (BL-MKT-099 display feature, 2026-08-29).
 *
 * The Directory section on /directory.html renders listings client-side from
 * /data/directory-listings.json. These tests cover both states: the real
 * shipped file (currently `[]`, zero approved listings) and a mocked
 * populated file, to prove the render path works before any real firm has
 * been approved.
 */
import { test, expect } from './fixtures';

const MOCK_LISTINGS = [
  {
    id: 'firm-with-logo',
    name: 'Firm With Logo LLP',
    category: 'legal',
    description: 'DPDP and GDPR advisory for mid-market Indian companies.',
    logoUrl: '/favicon.svg',
    website: 'https://example.com',
  },
  {
    id: 'firm-without-logo',
    name: 'Fallback Consultants',
    category: 'dpo',
    description: 'Fractional DPO coverage.',
  },
];

test.describe('Directory listing render', () => {
  test('shipped data file is valid JSON and an array (guards against a bad hand-edit)', async ({
    page,
    siteUrl,
  }) => {
    const res = await page.request.get(`${siteUrl}/data/directory-listings.json`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('empty state renders with the real shipped file (today\'s live behaviour)', async ({
    page,
    siteUrl,
  }) => {
    await page.goto(`${siteUrl}/directory.html`);
    await expect(page.locator('#directoryEmpty')).toBeVisible();
    await expect(page.locator('#directoryGrid')).toBeHidden();
    await expect(page.locator('#directoryPostSub')).toContainText('No listings yet.');
  });

  test('populated state renders cards, category labels, disclaimers, and logo/fallback', async ({
    page,
    siteUrl,
  }) => {
    await page.route('**/data/directory-listings.json', (route) =>
      route.fulfill({ json: MOCK_LISTINGS }),
    );
    await page.goto(`${siteUrl}/directory.html`);

    await expect(page.locator('#directoryEmpty')).toBeHidden();
    await expect(page.locator('#directoryGrid')).toBeVisible();

    const cards = page.locator('.directory-card');
    await expect(cards).toHaveCount(2);

    // Card 1: has a logo + website link + legal category.
    const card1 = cards.nth(0);
    await expect(card1.locator('.directory-card-name')).toContainText('Firm With Logo LLP');
    await expect(card1.locator('.directory-card-category')).toHaveText('Legal / Advisory');
    await expect(card1.locator('img.directory-card-logo')).toHaveAttribute('src', '/favicon.svg');
    await expect(card1.locator('.directory-card-name a')).toHaveAttribute(
      'rel',
      'noopener noreferrer nofollow',
    );
    await expect(card1.locator('.directory-card-disclaimer')).toContainText(
      'Not vetted, ranked, or endorsed by Juro',
    );

    // Card 2: no logo -> initials fallback, no website -> plain text name.
    const card2 = cards.nth(1);
    await expect(card2.locator('.directory-card-logo-fallback')).toHaveText('FC');
    await expect(card2.locator('.directory-card-category')).toHaveText('DPO-as-a-service');
    await expect(card2.locator('.directory-card-name a')).toHaveCount(0);

    // #directoryPostSub is rewritten away from the empty-state copy.
    await expect(page.locator('#directoryPostSub')).not.toContainText('No listings yet');
  });

  test('malformed data file fails closed to the empty state, not a broken page', async ({
    page,
    siteUrl,
  }) => {
    await page.route('**/data/directory-listings.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'not valid json' }),
    );
    await page.goto(`${siteUrl}/directory.html`);
    await expect(page.locator('#directoryEmpty')).toBeVisible();
    await expect(page.locator('#directoryGrid')).toBeHidden();
  });
});
