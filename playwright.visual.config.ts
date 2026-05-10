import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/visual.spec.ts'],
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
      name: 'mobile-hd',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
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
