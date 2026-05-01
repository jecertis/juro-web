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
  ],
});
