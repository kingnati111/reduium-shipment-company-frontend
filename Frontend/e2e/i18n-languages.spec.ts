import { expect, test, type Page } from '@playwright/test';

/**
 * Localization Milestone 4: the seven launch languages (DRAFT translations,
 * not yet reviewed by native speakers). Runs on desktop, tablet and mobile.
 *
 * Read-only: development sample shipments are only looked at. One tracking
 * lookup per language and device, to stay well inside the tracking limits.
 */
const LANGUAGES = [
  { code: 'es', htmlLang: 'es-419', dir: 'ltr', heading: 'Rastrear un paquete' },
  { code: 'fr', htmlLang: 'fr', dir: 'ltr', heading: 'Suivre un colis' },
  { code: 'de', htmlLang: 'de', dir: 'ltr', heading: 'Paket verfolgen' },
  { code: 'pt-BR', htmlLang: 'pt-BR', dir: 'ltr', heading: 'Rastrear um pacote' },
  {
    code: 'zh-CN',
    htmlLang: 'zh-Hans-CN',
    dir: 'ltr',
    heading: '查询包裹',
    font: /YaHei|PingFang|Noto Sans SC/,
  },
  {
    code: 'ar',
    htmlLang: 'ar',
    dir: 'rtl',
    heading: 'تتبّع شحنة',
    font: /Segoe UI|Geeza|Noto Sans Arabic/,
  },
  {
    code: 'ja',
    htmlLang: 'ja',
    dir: 'ltr',
    heading: '荷物を追跡',
    font: /Yu Gothic|Hiragino|Noto Sans JP/,
  },
] as const;

const DELAYED = 'RDM-PFBP-R2CQ-B'; // development sample: delayed, with an estimate

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
}

test.describe('Launch languages (draft translations)', () => {
  for (const lang of LANGUAGES) {
    test(`${lang.code}: pages are translated, fit the screen, and use the right fonts`, async ({
      page,
    }) => {
      for (const path of ['/', '/track', '/support', '/no-such-page']) {
        await page.goto(`/${lang.code}${path}`);
        await expect(page.locator('main')).not.toBeEmpty();
        await expect(page.locator('html')).toHaveAttribute('lang', lang.htmlLang);
        await expect(page.locator('html')).toHaveAttribute('dir', lang.dir);
        await noSidewaysScroll(page);
      }

      // Tracking result: translated, numbers left-to-right, dates in the language.
      await page.goto(`/${lang.code}/track/${DELAYED}`);
      await expect(page.locator('#shipment-status')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(lang.heading);
      await expect(page.locator('#shipment-status')).not.toHaveText('Shipment Delayed');
      await expect(page.locator('bdi', { hasText: DELAYED }).first()).toBeVisible();
      await noSidewaysScroll(page);

      if ('font' in lang) {
        const family = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
        expect(family).toMatch(lang.font);
      }
    });
  }

  test('dates follow the language: same shipment, different date text', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'Same formatting on every device');
    const estimate = (p: Page) => p.locator('dd', { hasText: /2026/ }).first();
    const seen = new Set<string>();
    for (const code of ['en', 'de', 'ja']) {
      await page.goto(`/${code}/track/${DELAYED}`);
      await expect(page.locator('#shipment-status')).toBeVisible();
      seen.add(await estimate(page).innerText());
    }
    expect(seen.size).toBe(3);
  });
});

test.describe('Draft languages are never chosen automatically', () => {
  test.use({ locale: 'es-MX' });
  test('a Spanish-speaking browser still starts in English, and can switch to Spanish', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'desktop', 'Same behaviour on every device');
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/$/);
    // …but Spanish is offered in the language selector.
    await page.getByRole('combobox', { name: /Language/ }).selectOption('es');
    await expect(page).toHaveURL(/\/es\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  });
});
