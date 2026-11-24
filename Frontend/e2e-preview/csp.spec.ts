import { expect, test, type Page } from '@playwright/test';

/**
 * Stage 8: the PRODUCTION build works under the strict security policy.
 * Any resource the policy blocks (an inline script, a third-party font, an
 * image from elsewhere…) is reported by the browser as a
 * "securitypolicyviolation" event; there must be none.
 */
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`,
      );
    });
  });
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) {
      consoleErrors.push(m.text());
    }
  });
  return async () => {
    const events = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    return [...events, ...consoleErrors];
  };
}

const PAGES: [string, (page: Page) => Promise<void>][] = [
  [
    '/',
    async (p) => {
      await expect(p.getByRole('heading', { level: 1 })).toBeVisible();
      await p.mouse.wheel(0, 3000); // load below-the-fold sections and images
      await p.waitForTimeout(500);
    },
  ],
  [
    '/track/RDM-VGYD-H7Q5-V',
    async (p) => {
      await expect(p.locator('#shipment-status')).toBeVisible(); // API call allowed by connect-src
    },
  ],
  [
    '/support',
    async (p) => {
      await expect(p.getByRole('form', { name: 'Send us a message' })).toBeVisible();
    },
  ],
  [
    '/admin/login',
    async (p) => {
      await expect(p.getByRole('button', { name: 'Sign in' })).toBeVisible();
    },
  ],
  [
    '/design',
    async (p) => {
      await expect(p.getByRole('heading', { level: 1 })).toBeVisible();
    },
  ],
];

test.describe('Stage 8: production build under the strict security policy', () => {
  for (const [path, check] of PAGES) {
    test(`${path} renders with no blocked resources`, async ({ page }) => {
      const violations = await watchViolations(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      const csp = res?.headers()['content-security-policy'] ?? '';
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      await check(page);
      // Web fonts are self-hosted, so they load under font-src 'self'.
      // Wait for loading to finish, then check (a blocked font would also be a violation below).
      expect(
        await page.evaluate(async () => {
          await document.fonts.ready;
          return document.fonts.status;
        }),
      ).toBe('loaded');
      expect(await violations()).toEqual([]);
    });
  }

  test('an injected inline script is blocked (defence in depth)', async ({ page }) => {
    await page.goto('/support');
    const ran = await page.evaluate(() => {
      (window as unknown as { __injected?: boolean }).__injected = false;
      const s = document.createElement('script');
      s.textContent = 'window.__injected = true';
      document.body.appendChild(s);
      return (window as unknown as { __injected?: boolean }).__injected;
    });
    expect(ran).toBe(false);
  });
});
