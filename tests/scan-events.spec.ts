/**
 * Scan-event and client-error beacon tests.
 *
 * Verifies that the frontend fires the correct structured events to
 * /api/v1/scan-event and /api/v1/client-error at the right points in
 * the scanner lifecycle. All API calls are intercepted via the mockApi
 * fixture — nothing hits the real backend.
 */
import { test, expect, SAMPLE_FINDINGS_RESPONSE, EMPTY_FINDINGS_RESPONSE } from './fixtures';

test.describe('scan-event beacon', () => {

  test('SE1: scan_started fires when a valid scan is submitted', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'scan_started');
    expect(events).toHaveLength(1);
    expect(events[0].body.path).toBe('/');
  });

  test('SE2: scan_success fires with finding count when scan returns findings', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'scan_success');
    expect(events).toHaveLength(1);
    const detail = JSON.parse(events[0].body.detail);
    expect(detail.count).toBe(SAMPLE_FINDINGS_RESPONSE.findings!.length);
  });

  test('SE3: zero_findings fires when scan returns empty findings', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(EMPTY_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'zero_findings');
    expect(events).toHaveLength(1);
  });

  test('SE4: validation_failed (invalid_domain) fires for a bad URL', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('not a domain!!');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    // Wait briefly for the beacon to fire (fire-and-forget)
    await page.waitForTimeout(200);

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'validation_failed');
    expect(events).toHaveLength(1);
    const detail = JSON.parse(events[0].body.detail);
    expect(detail.reason).toBe('invalid_domain');
    // No scan API call should have gone out
    expect(mockApi.requests()).toHaveLength(0);
  });

  test('SE5: validation_failed (no_consent) fires when consent unchecked', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    // consent box deliberately left unchecked
    await page.locator('#scanBtn').click();

    await page.waitForTimeout(200);

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'validation_failed');
    expect(events).toHaveLength(1);
    const detail = JSON.parse(events[0].body.detail);
    expect(detail.reason).toBe('no_consent');
    expect(mockApi.requests()).toHaveLength(0);
  });

  test('SE6: gate_shown fires when second scan triggers email gate', async ({ page, siteUrl, mockApi }) => {
    await page.addInitScript(() => {
      localStorage.setItem('juro_has_scanned', '1');
      // juro_email_provided intentionally NOT set
    });
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#gateModal')).toBeVisible();
    await page.waitForTimeout(200);

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'gate_shown');
    expect(events).toHaveLength(1);
  });

  test('SE7: api_error fires when the scan API returns an error', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondError(500, JSON.stringify({ error: 'internal server error' }));
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);
    await page.waitForTimeout(200);

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'api_error');
    expect(events).toHaveLength(1);
  });

  test('SE8: api_error fires with connection_failed on network failure', async ({ page, siteUrl, mockApi }) => {
    mockApi.fail();
    await page.addInitScript(() => localStorage.setItem('juro_email_provided', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);
    await page.waitForTimeout(200);

    const events = mockApi.scanEventRequests().filter(r => r.body?.event === 'api_error');
    expect(events).toHaveLength(1);
    const detail = JSON.parse(events[0].body.detail);
    expect(detail.msg).toBe('connection_failed');
  });
});

test.describe('client-error beacon', () => {

  test('CE1: window.onerror triggers a client-error beacon', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    // Trigger a synthetic JS error after the page + main.js have loaded
    await page.evaluate(() => {
      window.onerror('Test error message', 'https://jurocompliant.com/js/main.js', 10, 5, new Error('Test error message'));
    });

    await page.waitForTimeout(300);

    const errors = mockApi.clientErrorRequests();
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const last = errors[errors.length - 1];
    expect(last.body.message).toContain('Test error message');
    expect(last.body.path).toBe('/');
  });

  test('CE2: unhandledrejection triggers a client-error beacon', async ({ page, siteUrl, mockApi }) => {
    await page.goto(siteUrl);
    await page.evaluate(() => {
      window.dispatchEvent(
        Object.assign(new Event('unhandledrejection'), {
          reason: new Error('Unhandled rejection test'),
          promise: Promise.reject(new Error('Unhandled rejection test')),
        })
      );
    });

    await page.waitForTimeout(300);

    const errors = mockApi.clientErrorRequests();
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const last = errors[errors.length - 1];
    expect(last.body.message).toContain('Unhandled rejection test');
  });
});
