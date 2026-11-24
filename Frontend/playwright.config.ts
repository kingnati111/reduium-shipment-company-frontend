import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// The API lives in the separate Backend repository. Set REDUIUM_BACKEND_DIR to
// its folder, or keep it next to this repository as "reduium-backend".
const backendRepo = process.env.REDUIUM_BACKEND_DIR
  ? resolve(process.env.REDUIUM_BACKEND_DIR)
  : resolve(import.meta.dirname, '../../reduium-backend');

/**
 * Browser tests. They start the API (from the Backend repository) and the
 * website automatically (or reuse ones already running) and drive a real
 * Chromium browser.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  reporter: [['list']],
  // Switch the dedicated browser-test account on (fresh random password) and off again.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  // Real database writes go over the network to Neon: allow them time.
  expect: { timeout: 15_000 },
  timeout: 60_000,
  // The tests share ONE dev server and a remote database; a few at a time
  // keeps real sign-ins and queries from queueing behind each other.
  workers: 3,
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: backendRepo,
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      // Checked through the website's /api forwarding, so both are ready.
      command: 'npm run dev',
      cwd: '..',
      url: 'http://localhost:5173/api/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
