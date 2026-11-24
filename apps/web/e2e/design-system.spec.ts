import { expect, test } from '@playwright/test';

test.describe('Stage 1: design system', () => {
  test('renders brand, statuses and fonts without horizontal scroll', async ({ page }, info) => {
    await page.goto('/design');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Every shipment, accounted for.',
    );

    // All 12 status stamps are present.
    for (const label of [
      'Shipment Registered',
      'Customs Clearance',
      'Successfully Delivered',
      'On Hold',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // Self-hosted brand fonts actually loaded.
    await page.evaluate(() => document.fonts.ready);
    const fontsLoaded = await page.evaluate(() => ({
      archivo: document.fonts.check('750 16px "Archivo Variable"'),
      plex: document.fonts.check('400 16px "IBM Plex Mono"'),
    }));
    expect(fontsLoaded).toEqual({ archivo: true, plex: true });

    // No sideways scrolling on any screen size.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.screenshot({ path: `test-results/design-${info.project.name}.png`, fullPage: true });
  });

  test('tracking form validates format and check character', async ({ page }) => {
    await page.goto('/design');
    const input = page.getByLabel('Tracking number', { exact: true });
    const submit = page.getByRole('button', { name: 'Track package' }).first();

    await submit.click();
    await expect(page.getByRole('alert').first()).toHaveText('Please enter a tracking number.');

    await input.fill('RDM-ABCD-2345-Z'); // wrong check character
    await submit.click();
    await expect(page.getByRole('alert').first()).toContainText('RDM-XXXX-XXXX-X');

    await input.fill('RDM-ABCD-2345'); // incomplete
    await submit.click();
    await expect(page.getByRole('alert').first()).toContainText('RDM-XXXX-XXXX-X');

    await input.fill('rdm abcd 2345 r'); // valid, loosely typed
    await submit.click();
    await expect(input).toHaveValue('RDM-ABCD-2345-R');
    await expect(page.getByText('Format and check character valid')).toBeVisible();
  });
});
