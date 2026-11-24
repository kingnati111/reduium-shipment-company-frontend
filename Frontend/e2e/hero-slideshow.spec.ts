import { expect, test, type Locator, type Page } from '@playwright/test';

const slideshow = (page: Page) => page.getByTestId('hero-slideshow');

/** True once an <img> has actually decoded pixels. */
async function expectLoaded(img: Locator) {
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true);
}

/**
 * Make matching image downloads fail. Only real image requests are blocked: in
 * development Vite also requests '...webp?import' as a JS module, which must load.
 */
async function blockImages(page: Page, pattern: RegExp) {
  await page.route(pattern, (route) =>
    route.request().resourceType() === 'image' ? route.abort() : route.fallback(),
  );
}

test.describe('Homepage hero photo slideshow', () => {
  test('first photo loads behind the hero and never blocks the tracking form', async ({ page }) => {
    await page.goto('/');
    const first = slideshow(page).locator('img[data-slide="port-terminal"]');
    await expectLoaded(first);
    await expect(first).toHaveAttribute('alt', '');
    await expect(first).toHaveCSS('opacity', '1');
    await expect(slideshow(page)).toHaveAttribute('aria-hidden', 'true');

    // The element under the centre of the tracking field must be the field itself.
    const input = page.getByLabel('Tracking number', { exact: true });
    const onTop = await input.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
    });
    expect(onTop).toBe(true);
    await input.click();
    await expect(input).toBeFocused();
  });

  test('rotates to the next photo with a fade, and the Pause button stops it', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    const show = slideshow(page);
    await expectLoaded(show.locator('img[data-slide="port-terminal"]'));
    // The second photo is only fetched after the first has loaded.
    await expectLoaded(show.locator('img[data-slide="warehouse-aisle"]'));
    await expect(show).toHaveAttribute('data-active-slide', '0');

    const second = show.locator('img[data-slide="warehouse-aisle"]');
    await expect(second).toHaveCSS('transition-property', 'opacity');
    await page.clock.runFor(7_100);
    await expect(show).toHaveAttribute('data-active-slide', '1');

    await page.getByRole('button', { name: 'Pause background photos' }).click();
    await expect(page.getByRole('button', { name: 'Play background photos' })).toBeVisible();
    await page.clock.runFor(30_000);
    await expect(show).toHaveAttribute('data-active-slide', '1');

    await page.getByRole('button', { name: 'Play background photos' }).click();
    await expectLoaded(show.locator('img[data-slide="fulfilment-floor"]'));
    await page.clock.runFor(7_100);
    await expect(show).toHaveAttribute('data-active-slide', '2');
  });

  test('reduced motion: one still photo, no rotation, no pause control', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('/');
    const show = slideshow(page);
    await expectLoaded(show.locator('img[data-slide="port-terminal"]'));
    await page.clock.runFor(30_000);
    await expect(show.locator('img')).toHaveCount(1);
    await expect(show).toHaveAttribute('data-active-slide', '0');
    await expect(page.getByRole('button', { name: /background photos/ })).toHaveCount(0);
  });

  test('a photo that fails to load is replaced by the fallback image', async ({ page }) => {
    await blockImages(page, /port-terminal-\d+\.webp/);
    await page.goto('/');
    const first = slideshow(page).locator('img[data-slide="port-terminal"]');
    await expect(first).toHaveAttribute('src', /fallback-port-terminal/);
    await expectLoaded(first);
  });

  test('if every photo fails, the hero still works on the plain brand background', async ({
    page,
  }) => {
    await blockImages(page, /assets\/hero\//);
    await page.goto('/');
    await expect(slideshow(page).locator('img')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /background photos/ })).toHaveCount(0);
    await expect(page.getByLabel('Tracking number', { exact: true })).toBeVisible();
  });
});
