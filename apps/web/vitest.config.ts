import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the website (src/**\/*.test.ts). Browser tests live in e2e/
 * and run with Playwright instead, so they're excluded here.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
