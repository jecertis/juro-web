/**
 * Visual regression tests — pixel-diff baseline screenshots for the public pages.
 *
 * Catches CSS/layout/contrast/structural changes that functional tests don't see.
 *
 * Baseline generation: see `.github/workflows/update-snapshots.yml`. Add the
 * `update-snapshots` label to a PR to (re)generate Linux-platform baselines
 * and commit them back to the branch.
 *
 * Last regen trigger: 2026-06-03 — stale after dpdp-processor-guide, a11y
 * contrast fixes, homepage OG tags, and AI Act posture card (feat/aiact-posture-card).
 * Baselines for ai-act-art50-explainer not yet generated — apply the
 * `update-snapshots` label after founder approves this PR (BL-ENG-023).
 *
 * 2026-07-17 (BL-MKT-064): added dpdp-technical-evidence-handbook. No baseline
 * PNGs generated for it yet in this environment (Docker unavailable) — apply
 * the `update-snapshots` PR label, or regen locally via
 * `mcr.microsoft.com/playwright:v1.59.1-noble`, before merge.
 *
 * 2026-07-29 (BL-MKT-075): dropped dpdp-processor-guide (root) — the page is
 * now a meta-refresh redirect stub to /blog/dpdp-processor-guide, which is
 * not itself covered by this spec.
 *
 * 2026-08-03: added dpdp-data-flow-mapper (new AI data-flow mapper tool). Also
 * touched the shared nav/drawer/footer on homepage, checklist, and
 * dpdp-technical-evidence-handbook to cross-link it — their existing
 * baselines will diff. No baseline PNGs generated for any of this yet in
 * this environment (Docker unavailable) — apply the `update-snapshots` PR
 * label, or regen locally via `mcr.microsoft.com/playwright:v1.59.1-noble`,
 * before merge.
 *
 * 2026-08-20 (compliance partner directory pilot page): added directory. New
 * page only, no shared nav/footer/CSS changes, so no other baselines should
 * diff. Baselines generated 2026-08-21 via the `update-snapshots` label.
 *
 * 2026-08-29 (BL-MKT-099 directory display feature): directory.html gained a
 * 4th archetype card (Legal / Advisory), the archetype grid went 3-across ->
 * 2x2, and an empty `.directory-grid` container (client-rendered from
 * /data/directory-listings.json, currently `[]`) sits next to the existing
 * empty-state placeholder. directory-desktop/mobile/mobile-hd baselines WILL
 * diff and need regenerating via the `update-snapshots` label -- page-local
 * CSS only, so no other page's baseline should move.
 *
 * The 0.1% pixel-diff tolerance accommodates anti-aliasing / sub-pixel rounding
 * differences. Genuine layout/contrast regressions exceed it comfortably.
 */
import { test, expect } from './fixtures';

const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'checklist', path: '/checklist.html' },
  { name: 'deploy-evergent', path: '/deploy-evergent.html' },
  { name: 'privacy', path: '/privacy.html' },
  { name: 'ai-act-art50-explainer', path: '/blog/ai-act-art50-transparency-explainer.html' },
  { name: 'dpdp-technical-evidence-handbook', path: '/dpdp-technical-evidence-handbook.html' },
  { name: 'dpdp-data-flow-mapper', path: '/dpdp-data-flow-mapper.html' },
  { name: 'directory', path: '/directory.html' },
] as const;

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
  { name: 'mobile-hd', width: 393, height: 852 }, // iPhone 15 Pro — dominant high-end phone
] as const;

// Disable animations + transitions + caret blink so screenshots are stable.
// Also clip horizontal overflow so full-page screenshots are exactly viewport-
// width wide, preventing ±1px sub-pixel rounding variation in overflow content.
const STABILISE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html, body { overflow-x: hidden !important; max-width: 100% !important; }
`;

for (const p of PAGES) {
  for (const v of VIEWPORTS) {
    test(`visual: ${p.name} (${v.name})`, async ({ page, siteUrl }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto(`${siteUrl}${p.path}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: STABILISE_CSS });

      // Lock countdown-strip to an integer pixel height so sub-pixel rounding
      // in font metrics doesn't cause ±1px height variation between CI runs.
      await page.evaluate(() => {
        const strip = document.querySelector('.countdown-strip') as HTMLElement | null;
        if (strip) {
          const h = Math.round(strip.getBoundingClientRect().height);
          strip.style.height = `${h}px`;
          strip.style.overflow = 'hidden';
        }
      });

      // Mask dynamic content that legitimately changes between runs:
      // - countdown timer ticks every second
      // - any "scanned N min ago" relative-time labels
      // - the sizzle-film video (homepage only): its IntersectionObserver can
      //   fire mid-scroll during Playwright's full-page screenshot stitching,
      //   so the captured frame/currentTime isn't deterministic across runs
      const masks = [
        page.locator('.countdown-strip'),
        page.locator('.countdown-num'),
        page.locator('[data-dynamic-time]'),
        page.locator('.sizzle-media'),
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
