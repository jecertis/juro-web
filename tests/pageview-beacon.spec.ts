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

  test('P43: beacon code path does not write to localStorage or sessionStorage during page load', async ({ page, siteUrl }) => {
    // Install a spy on Storage.prototype.setItem BEFORE any page script runs.
    // This is the real invariant — "the beacon doesn't call setItem" — not
    // "a blank page has blank storage" (which would be trivially true).
    await page.addInitScript(() => {
      (window as any).__storageWrites = [];
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        const which = this === window.localStorage ? 'local' : 'session';
        (window as any).__storageWrites.push({ storage: which, key });
        return orig.apply(this, [key, value] as any);
      };
    });

    await page.goto(siteUrl + '/');
    await page.waitForLoadState('networkidle');

    const writes = await page.evaluate(() => (window as any).__storageWrites);
    // No inline script (including the beacon) should write to storage on a
    // plain homepage load. If the gate/scan flow runs later, it may write
    // juro_email_provided / juro_has_scanned — that's a separate path.
    expect(writes).toEqual([]);

    // Sanity: also confirm no analytics cookies landed via nested requests.
    const cookies = await page.context().cookies();
    const analyticsCookies = cookies
      .map((c) => c.name)
      .filter((n) => /^(_ga|_gid|_fbp|_gcl|ajs_|mp_|amplitude|ph_)/i.test(n));
    expect(analyticsCookies).toEqual([]);
  });
});
