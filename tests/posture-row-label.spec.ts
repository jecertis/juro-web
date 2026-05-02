/**
 * Posture row label rendering — companion to juro#39 (server side renames
 * derivePosture's success status from "pass" to "clear"). The frontend
 * mirrors that with a "Clear" pill (replacing the older "No issue
 * detected"), keeping the success label parallel in length and tone with
 * the failure pill ("Gap found").
 */

import { test, expect, SAMPLE_FINDINGS_RESPONSE, EMPTY_FINDINGS_RESPONSE } from './fixtures';

test.describe('posture row labels', () => {
  test('clear status renders a green "Clear" pill', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(EMPTY_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'abhyaas.org');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#postureRows .posture-row', { timeout: 10_000 });

    const pills = page.locator('#postureRows .status-pill');
    await expect(pills).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(pills.nth(i)).toHaveText('Clear');
      await expect(pills.nth(i)).toHaveClass(/pill-green/);
    }
  });

  test('fail status renders a red "Gap found" pill', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#postureRows .posture-row', { timeout: 10_000 });

    const failPills = page.locator('#postureRows .pill-red');
    await expect(failPills).toHaveCount(2);
    await expect(failPills.first()).toHaveText('Gap found');
  });

  test('mixed posture row renders 2 fail + 1 clear in correct order', async ({
    page,
    siteUrl,
    mockApi,
  }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.fill('#urlInput', 'example.com');
    await page.check('#consentBox');
    await page.click('#scanBtn');
    await page.waitForSelector('#postureRows .posture-row', { timeout: 10_000 });

    const rows = page.locator('#postureRows .posture-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('.status-pill')).toHaveText('Gap found');
    await expect(rows.nth(1).locator('.status-pill')).toHaveText('Gap found');
    await expect(rows.nth(2).locator('.status-pill')).toHaveText('Clear');
  });
});
