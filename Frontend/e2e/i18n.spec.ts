import { expect, test, type Page } from '@playwright/test';

/**
 * Localization Milestone 1: language addresses, detection, selector, memory.
 *
 * Real translations arrive in Milestone 4. Until then these tests use the
 * development-only pseudo-languages: en-XA (accented, longer text) and
 * ar-XB (right-to-left). They exist only on the dev server.
 *
 * Tracking uses a development sample shipment (read-only).
 */
const SAMPLE = 'RDM-VGYD-H7Q5-V';
const html = (page: Page) => page.locator('html');
const selector = (page: Page) => page.getByRole('combobox', { name: 'Language' });

test.describe('Localization: addresses and language choice', () => {
  test('old addresses still work: they gain a language and keep everything else', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/en/');
    await page.goto(`/track/${SAMPLE}`);
    await expect(page).toHaveURL(`/en/track/${SAMPLE}`);
    await expect(page.locator('#shipment-status')).toBeVisible();
    await page.goto('/support?from=email#contact-form');
    await expect(page).toHaveURL('/en/support?from=email#contact-form');
    await expect(html(page)).toHaveAttribute('lang', 'en');
    await expect(html(page)).toHaveAttribute('dir', 'ltr');
  });

  test('the selector is visible, keeps the page and tracking number, and is remembered', async ({
    page,
  }) => {
    await page.goto(`/en/track/${SAMPLE}?x=1#history`);
    await expect(selector(page)).toBeVisible();
    await expect(selector(page)).toHaveValue('en');

    await selector(page).selectOption('en-XA');
    await expect(page).toHaveURL(`/en-XA/track/${SAMPLE}?x=1#history`);
    await expect(page.locator('#shipment-status')).toBeVisible(); // same shipment
    await expect(html(page)).toHaveAttribute('lang', 'en-XA');
    // Translated text is now the pseudo-language (footer links: visible on every device).
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: /^\[Ťŕåçķ ~+\]$/ }),
    ).toHaveAttribute('href', '/en-XA/#track');

    // Remembered: an address without a language now opens in the chosen one.
    await page.goto('/support');
    await expect(page).toHaveURL('/en-XA/support');
    await page.reload();
    await expect(selector(page)).toHaveValue('en-XA');

    // And it can be changed back at any time.
    await selector(page).selectOption('en');
    await expect(page).toHaveURL('/en/support');
    await page.goto('/');
    await expect(page).toHaveURL('/en/');
  });

  test('a right-to-left language sets dir="rtl"; tracking numbers stay readable', async ({
    page,
  }) => {
    await page.goto(`/ar-XB/track/${SAMPLE}`);
    await expect(html(page)).toHaveAttribute('dir', 'rtl');
    await expect(html(page)).toHaveAttribute('lang', 'ar-XB');
    await expect(page.locator('#shipment-status')).toBeVisible();
    await expect(page.getByText(SAMPLE).first()).toBeVisible();
    // Back to English: the direction resets.
    await selector(page).selectOption('en');
    await expect(html(page)).toHaveAttribute('dir', 'ltr');
  });

  test('language codes are case-insensitive; unknown ones fall back safely', async ({ page }) => {
    await page.goto('/EN/support');
    await expect(page).toHaveURL('/en/support');
    await page.goto('/xx/somewhere');
    await expect(page).toHaveURL('/en/xx/somewhere');
    await expect(
      page.getByRole('heading', { name: "This page isn't on our route." }),
    ).toBeVisible();
  });

  test('the header fits: language selector and menu button are fully on screen', async ({
    page,
    isMobile,
  }) => {
    // Regression: the selector once pushed the phone menu button off-screen.
    for (const path of ['/en/', '/en-XA/', '/ar-XB/']) {
      await page.goto(path);
      await expect(selector(page)).toBeInViewport({ ratio: 1 });
      if (isMobile) {
        await expect(page.locator('button[aria-controls="mobile-menu"]')).toBeInViewport({
          ratio: 1,
        });
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('links inside the site keep the current language', async ({ page }) => {
    await page.goto('/en-XA/support');
    const home = page.getByRole('link', { name: /Ŕéðûîûɱ Šĥîþɱéñť Çöɱþåñý ĥöɱé/ });
    await expect(home).toHaveAttribute('href', '/en-XA/');
  });

  test('the admin dashboard is not affected: no language prefix, always English', async ({
    page,
  }) => {
    await page.goto('/en-XA/');
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(html(page)).toHaveAttribute('lang', 'en');
    await expect(html(page)).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Admin addresses are never taken for a language (regression: /admin/support
    // was once redirected to /en/admin/support). Not signed in → sign-in page.
    for (const path of ['/admin/support', '/admin/shipments', '/admin/team']) {
      await page.goto(path);
      await expect(page).toHaveURL(`/admin/login?next=${encodeURIComponent(path)}`);
    }
  });
});

test.describe('Localization: first visit, Japanese browser', () => {
  test.use({ locale: 'ja-JP' });
  test('uses English, because Japanese is not yet translated and reviewed', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/en/');
  });
});

test.describe('Localization: first visit, browser asking for an available language', () => {
  test.use({ locale: 'en-XA' });
  test('opens that language, keeping the page', async ({ page }) => {
    await page.goto(`/track/${SAMPLE}`);
    await expect(page).toHaveURL(`/en-XA/track/${SAMPLE}`);
  });
});
