import { test, expect } from './fixtures';

// The beacon is fired inline at the bottom of each page's <body>, during
// the initial page load. By the time `page.goto` returns we're past the
// firing — so we wait for networkidle (all requests settled) and then
// assert on what the mock captured.

test.describe('P — pageview beacon', () => {
  test('P40: fires exactly one beacon on homepage load with path "/"', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl + '/');
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].url).toMatch(/\/api\/v1\/pageview$/);
    expect(beacons[0].body).toMatchObject({ path: '/' });
  });

  test('P41: beacon on /checklist.html carries path + UTM values from query string', async ({ page, siteUrl, mockApi }) => {
    await page.goto(`${siteUrl}/checklist.html?utm_source=newsletter&utm_medium=email&utm_campaign=q2-launch`);
    await page.waitForLoadState('networkidle');

    const beacons = mockApi.pageviewRequests();
    expect(beacons.length).toBeGreaterThanOrEqual(1);
    expect(beacons[0].body).toMatchObject({
      path: '/checklist.html',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'q2-launch',
    });
  });

  test('P42: beacon payload omits referrer when there is none', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl + '/');
    await page.waitForLoadState('networkidle');

    const [beacon] = mockApi.pageviewRequests();
    expect(beacon.body).toHaveProperty('path', '/');
    // document.referrer is '' on direct navigation → the client omits the field
    // (JSON.stringify drops undefined values).
    expect(beacon.body.referrer).toBeUndefined();
  });

  test('P43: beacon does not leak any cookie or localStorage value (nothing stored client-side)', async ({ page, siteUrl }) => {
    await page.goto(siteUrl + '/');
    await page.waitForLoadState('networkidle');

    const cookies = await page.context().cookies();
    const localStorageKeys = await page.evaluate(() => Object.keys(window.localStorage));
    const sessionStorageKeys = await page.evaluate(() => Object.keys(window.sessionStorage));

    // No analytics-shaped cookies should appear.
    const analyticsCookies = cookies
      .map((c) => c.name)
      .filter((n) => /^(_ga|_gid|_fbp|_gcl|ajs_|mp_|amplitude|ph_)/i.test(n));
    expect(analyticsCookies).toEqual([]);

    // A fresh homepage load (no gate flow, no scan) leaves storage empty.
    expect(localStorageKeys).toEqual([]);
    expect(sessionStorageKeys).toEqual([]);
  });
});
