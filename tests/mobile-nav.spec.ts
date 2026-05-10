/**
 * Mobile navigation — hamburger toggle tests.
 *
 * Verifies the hamburger button and slide-down drawer work correctly at mobile
 * viewports, and are absent at desktop width. Runs against both homepage and
 * checklist to confirm consistent behaviour across pages.
 */
import { test, expect } from './fixtures';

const MOBILE  = { width: 375, height: 667 };
const DESKTOP = { width: 1280, height: 800 };

const PAGES = [
  { label: 'homepage',  path: '/' },
  { label: 'checklist', path: '/checklist.html' },
] as const;

for (const { label, path } of PAGES) {
  test.describe(`mobile nav — ${label}`, () => {

    test('MN1: hamburger visible at mobile viewport', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await expect(page.locator('#navHamburger')).toBeVisible();
    });

    test('MN2: drawer hidden by default', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await expect(page.locator('#mobileNavDrawer')).not.toBeVisible();
    });

    test('MN3: click hamburger opens drawer', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await page.locator('#navHamburger').click();
      await expect(page.locator('#mobileNavDrawer')).toBeVisible();
    });

    test('MN4: second click closes drawer', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await page.locator('#navHamburger').click();
      await expect(page.locator('#mobileNavDrawer')).toBeVisible();
      await page.locator('#navHamburger').click();
      await expect(page.locator('#mobileNavDrawer')).not.toBeVisible();
    });

    test('MN5: Escape closes open drawer', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await page.locator('#navHamburger').click();
      await page.keyboard.press('Escape');
      await expect(page.locator('#mobileNavDrawer')).not.toBeVisible();
    });

    test('MN6: click outside drawer closes it', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await page.locator('#navHamburger').click();
      await expect(page.locator('#mobileNavDrawer')).toBeVisible();
      // Click the body well below the drawer
      await page.mouse.click(MOBILE.width / 2, MOBILE.height - 50);
      await expect(page.locator('#mobileNavDrawer')).not.toBeVisible();
    });

    test('MN7: drawer contains a link to /checklist.html', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await page.locator('#navHamburger').click();
      await expect(
        page.locator('#mobileNavDrawer a[href="/checklist.html"]')
      ).toBeVisible();
    });

    test('MN8: hamburger not visible at desktop viewport', async ({ page, siteUrl }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(`${siteUrl}${path}`);
      await expect(page.locator('#navHamburger')).not.toBeVisible();
    });

    test('MN9: aria-expanded reflects drawer state', async ({ page, siteUrl }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`${siteUrl}${path}`);
      await expect(page.locator('#navHamburger')).toHaveAttribute('aria-expanded', 'false');
      await page.locator('#navHamburger').click();
      await expect(page.locator('#navHamburger')).toHaveAttribute('aria-expanded', 'true');
      await page.locator('#navHamburger').click();
      await expect(page.locator('#navHamburger')).toHaveAttribute('aria-expanded', 'false');
    });
  });
}
