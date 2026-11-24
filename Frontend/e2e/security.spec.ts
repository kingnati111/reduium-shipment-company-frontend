import { expect, test } from '@playwright/test';

/**
 * Stage 8: security headers on the website's pages (dev server).
 * Headers don't depend on the device, so this runs on desktop only.
 * The strict production policy is tested against the production build in
 * e2e-preview/ (npm run test:e2e:preview).
 */
test.describe('Stage 8: website security headers (development server)', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'Headers are device-independent');
  });

  for (const path of ['/', '/support', '/admin/login', '/admin/support']) {
    test(`${path} forbids framing and browser guessing`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const h = res.headers();
      expect(h['x-frame-options']).toBe('DENY');
      expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['permissions-policy']).toContain('camera=()');
      expect(h['cross-origin-opener-policy']).toBe('same-origin');
    });
  }

  test('another website cannot show the admin sign-in page in a frame (clickjacking)', async ({
    page,
    baseURL,
  }) => {
    // A page on a different origin (about:blank) that tries to frame the admin page.
    await page.setContent(
      `<iframe id="victim" src="${baseURL}/admin/login" width="800" height="600"></iframe>`,
    );
    await page.waitForTimeout(1500);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    const framedText = frame
      ? await frame
          .locator('body')
          .innerText({ timeout: 2000 })
          .catch(() => '')
      : '';
    expect(framedText).not.toContain('Sign in');
  });
});
