import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  retries: 0,
  reporter: [['list']],
  fullyParallel: false,
  workers: 1,
  // Visual baselines live here. Playwright auto-suffixes with -chromium-linux,
  // so baselines must be generated on Linux (use update-snapshots.yml workflow).
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    actionTimeout: 5_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Visual-only: high-end phone viewport 393×852 (iPhone 15 Pro CSS px)
      // Uses Chromium — CI only installs Chromium, no WebKit
      name: 'mobile-hd',
      testMatch: '**/visual.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      // Visual-only: tablet viewport 834×1194 (iPad Pro CSS px)
      name: 'tablet',
      testMatch: '**/visual.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1194 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
