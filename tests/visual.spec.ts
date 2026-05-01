/**
 * Visual regression tests — pixel-diff baseline screenshots for the public pages.
 *
 * Catches CSS/layout/contrast/structural changes that functional tests don't see.
 *
 * Baseline generation: see `.github/workflows/update-snapshots.yml`. Add the
 * `update-snapshots` label to a PR to (re)generate Linux-platform baselines
 * and commit them back to the branch.
 *
 * The 0.1% pixel-diff tolerance accommodates anti-aliasing / sub-pixel rounding
 * differences. Genuine layout/contrast regressions exceed it comfortably.
 */
import { test, expect } from './fixtures';

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'checklist', path: '/checklist.html' },
  { name: 'deploy-evergent', path: '/deploy-evergent.html' },
] as const;

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
] as const;

// Disable animations + transitions + caret blink so screenshots are stable.
const STABILISE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`;

for (const p of PAGES) {
  for (const v of VIEWPORTS) {
    test(`visual: ${p.name} (${v.name})`, async ({ page, siteUrl }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto(`${siteUrl}${p.path}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: STABILISE_CSS });

      // Mask dynamic content that legitimately changes between runs:
      // - countdown timer ticks every second
      // - any "scanned N min ago" relative-time labels
      const masks = [
        page.locator('.countdown-strip'),
        page.locator('.countdown-num'),
        page.locator('[data-dynamic-time]'),
      ];

      await expect(page).toHaveScreenshot(`${p.name}-${v.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.001, // 0.1% tolerance
        mask: masks,
        animations: 'disabled',
      });
    });
  }
}
