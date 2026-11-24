import { expect, test, type Page } from '@playwright/test';

/** Scroll through the page so scroll-triggered reveals run before a screenshot. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
}

const isDesktop = (name: string) => name === 'desktop';

test.describe('Stage 2: homepage', () => {
  test('renders every required section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Reduium Shipment Company/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every shipment');

    for (const name of [
      'A logistics partner that keeps the record straight.',
      'Four ways to move it.',
      'Built around the record.',
      'Three steps to the full picture.',
      'Questions about a shipment?',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
    }
    for (const service of ['Express Parcel', 'Air Freight', 'Ocean Freight', 'Road & Ground']) {
      await expect(page.getByRole('heading', { level: 3, name: service })).toBeAttached();
    }
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('tracking field is prominent: visible without scrolling', async ({ page }) => {
    await page.goto('/');
    const input = page.getByLabel('Tracking number', { exact: true });
    await expect(input).toBeInViewport();
    await expect(
      page.locator('#track').getByRole('button', { name: 'Track package' }),
    ).toBeInViewport();
  });

  test('invalid tracking number shows a clear error; valid one goes to the track page', async ({
    page,
  }) => {
    await page.goto('/');
    const input = page.getByLabel('Tracking number', { exact: true });
    const submit = page.locator('#track').getByRole('button', { name: 'Track package' });

    await input.fill('ABC123');
    await submit.click();
    await expect(page.locator('#track').getByRole('alert')).toContainText('RDM-XXXX-XXXX-X');
    await expect(page).toHaveURL('/en/');

    // Loosely typed number of a development sample shipment (see npm run db:seed).
    await input.fill('rdm vgyd h7q5 v');
    await submit.click();
    await expect(page).toHaveURL('/en/track/RDM-VGYD-H7Q5-V');
    await expect(page.getByRole('heading', { level: 2, name: 'Customs Clearance' })).toBeVisible();
  });

  test('real contact details are shown; remaining placeholders are visibly marked', async ({
    page,
  }) => {
    await page.goto('/#support');
    const support = page.locator('#support');
    for (const value of [
      'info@reduiumshipment.com',
      '+44 113 320 7332',
      '115 Crown Street, London, United Kingdom',
    ]) {
      await expect(support.getByText(value, { exact: true })).toBeVisible();
    }
    // Only the support hours are still a placeholder in this section.
    await expect(support.getByText('Placeholder', { exact: true })).toHaveCount(1);
    // The footer shows the same real details on every page.
    const footer = page.locator('footer');
    await expect(footer.getByText('info@reduiumshipment.com', { exact: true })).toBeVisible();
    await expect(footer.getByText('+44 113 320 7332', { exact: true })).toBeVisible();
  });

  test('FAQ items expand', async ({ page }) => {
    await page.goto('/#support');
    const q = page.getByText('Where do I find my tracking number?');
    await q.click();
    await expect(page.getByText(/On the receipt you were given/)).toBeVisible();
  });

  test('navigation works (desktop links or mobile menu)', async ({ page }, info) => {
    await page.goto('/');
    if (isDesktop(info.project.name)) {
      await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'Services' })
        .click();
    } else {
      const toggle = page.locator('button[aria-controls="mobile-menu"]');
      await expect(toggle).toHaveAccessibleName('Open menu');
      await toggle.click();
      const menu = page.locator('#mobile-menu');
      await expect(menu).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle).toHaveAccessibleName('Close menu');
      await expect(menu.getByRole('link').first()).toBeFocused();

      // Escape closes it and returns focus to the button.
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(toggle).toBeFocused();

      await toggle.click();
      await menu.getByRole('link', { name: /Services/ }).click();
      await expect(menu).toBeHidden();
    }
    await expect(page).toHaveURL('/en/#services');
    await expect(page.locator('#services')).toBeInViewport();
  });

  test('unknown pages show a helpful 404', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "This page isn't on our route.",
    );
  });

  test('no horizontal scroll; full-page screenshot', async ({ page }, info) => {
    for (const path of ['/', '/track/RDM-VGYD-H7Q5-V', '/support', '/nope']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
    await page.goto('/');
    await scrollThrough(page);
    await page.screenshot({ path: `test-results/home-${info.project.name}.png`, fullPage: true });
    await page.screenshot({ path: `test-results/home-${info.project.name}-first-screen.png` });
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `test-results/home-${info.project.name}-services.png` });
  });
});
