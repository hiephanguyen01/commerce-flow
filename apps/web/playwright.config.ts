import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  fullyParallel: false,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:3000',

    trace: 'retain-on-failure',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',
  },

  webServer: [
    {
      command: 'pnpm --filter @commerce-flow/api start:test',

      url: 'http://localhost:4000/api/v1/health',

      reuseExistingServer: !process.env.CI,

      timeout: 120_000,
    },

    {
      command: 'pnpm --filter @commerce-flow/web start:test',

      url: 'http://localhost:3000/vi/products',

      reuseExistingServer: !process.env.CI,

      timeout: 120_000,
    },
  ],

  projects: [
    {
      name: 'chromium',

      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
