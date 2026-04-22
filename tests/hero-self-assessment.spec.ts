import { test, expect } from './fixtures';

test.describe('Hero — two options (scan or self-assessment)', () => {
  test('nav link renamed to "Self Assessment →"', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const navLink = page.locator('.header-right a.nav-link');
    await expect(navLink).toContainText('Self Assessment');
    await expect(navLink).not.toContainText('Gap Assessment');
    await expect(navLink).toHaveAttribute('href', '/checklist.html');
  });

  test('hero shows "or" divider between the two options', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const or = page.locator('#heroOr');
    await expect(or).toBeVisible();
    await expect(or).toHaveText(/or/i);
  });

  test('hero self-assessment card is visible and links to /checklist.html', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    await expect(page.locator('#altOption')).toBeVisible();
    await expect(page.locator('#altOption .alt-option-title')).toContainText('self-assessment');
    const btn = page.locator('#altOptionBtn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/checklist.html');
  });

  test('DOM order: scan input → consent → or → alt-option', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const order = await page.evaluate(() => {
      const ids = ['urlInput', 'consentLabel', 'heroOr', 'altOption'];
      const positions = ids.map((id) => {
        const el = document.getElementById(id);
        return el ? (el.compareDocumentPosition(document.body) & Node.DOCUMENT_POSITION_CONTAINS ? 0 : 0) + (document.body.innerHTML.indexOf(el.outerHTML) || 0) : -1;
      });
      // Use getBoundingClientRect Y as a stable order proxy.
      const tops = ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1);
      return tops;
    });
    // Each element should appear strictly below the previous one.
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1]);
    }
  });

  test('footer link also renamed to "Self Assessment"', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const footerLink = page.locator('footer a[href="/checklist.html"]');
    await expect(footerLink).toContainText('Self Assessment');
    await expect(footerLink).not.toContainText('Gap Assessment');
  });
});
