import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the PRODUCTION BUILD, served by `vite preview` with the
 * production security headers (strict Content-Security-Policy).
 *
 *   npm run test:e2e:preview -w @reduium/web
 *
 * Read-only: these tests open pages and look up a development sample
 * shipment; they never sign in, send forms or change data.
 */
export default defineConfig({
  testDir: './e2e-preview',
  outputDir: './test-results/preview',
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  expect: { timeout: 15_000 },
  timeout: 60_000,
  workers: 2,
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // The API (for the tracking lookup the production build makes).
      command: 'npm run dev -w @reduium/api',
      cwd: '../..',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run build && npm run preview',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
