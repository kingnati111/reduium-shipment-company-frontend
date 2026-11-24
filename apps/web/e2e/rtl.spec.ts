import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Localization Milestone 3: right-to-left layout (Arabic, later Hebrew).
 *
 * Uses the development pseudo-language ar-XB (right-to-left, Latin letters),
 * because real Arabic text arrives in Milestone 4. These tests check
 * POSITIONS on screen, not just classes, on desktop, tablet and mobile.
 * Read-only: development sample shipments are only looked at.
 */
const box = async (l: Locator) => (await l.boundingBox())!;
const centre = (b: { x: number; width: number }) => b.x + b.width / 2;

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Is the text drawn left-to-right? (first character left of the last one) */
async function drawnLeftToRight(l: Locator) {
  return l.evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null = null;
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.trim()) {
        node = walker.currentNode;
        break;
      }
    }
    if (!node?.textContent) return false;
    const text = node.textContent;
    const first = text.search(/\S/);
    const last = text.length - 1 - [...text].reverse().join('').search(/\S/);
    const rect = (i: number) => {
      const r = document.createRange();
      r.setStart(node!, i);
      r.setEnd(node!, i + 1);
      return r.getBoundingClientRect();
    };
    return rect(first).left < rect(last).left;
  });
}

const isMirrored = (l: Locator) =>
  l.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.scale.startsWith('-1') || /matrix\(-1/.test(s.transform);
  });

test.describe('Right-to-left layout', () => {
  test('the page reads from the right: logo on the right, nothing scrolls sideways', async ({
    page,
  }) => {
    for (const path of ['/ar-XB/', '/ar-XB/track', '/ar-XB/support', '/ar-XB/nowhere']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      const viewport = page.viewportSize()!;
      const logo = await box(page.locator('header a[aria-label]').first());
      expect(centre(logo), `${path}: logo on the right`).toBeGreaterThan(viewport.width / 2);
      await noSidewaysScroll(page);
    }
  });

  test('tracking result: journey, timeline, arrows and advice follow the reading direction', async ({
    page,
  }) => {
    await page.goto('/ar-XB/track/RDM-PFBP-R2CQ-B'); // a delayed sample shipment
    await expect(page.locator('#shipment-status')).toBeVisible();

    // Journey: the first stage (Registered) is on the right, the last on the left.
    const steps = page.locator('ol[aria-label] > li[data-state]');
    await expect(steps).toHaveCount(5);
    expect(centre(await box(steps.first()))).toBeGreaterThan(centre(await box(steps.last())));

    // Advice for a delay: its accent border is on the reading-start (right) side.
    const advice = page.locator('p.border-s-4');
    const borders = await advice.evaluate((el) => {
      const s = getComputedStyle(el);
      return { right: s.borderRightWidth, left: s.borderLeftWidth };
    });
    expect(borders).toEqual({ right: '4px', left: '0px' });

    // Timeline: the status markers sit to the right of each entry's text.
    const entry = page.locator('li[data-latest]'); // the latest tracking-history entry
    const marker = await box(entry.locator('> span').last());
    const content = await box(entry.locator('> div'));
    expect(marker.x).toBeGreaterThan(content.x);

    // Route arrow and buttons' arrows point the reading direction.
    await expect
      .poll(() => isMirrored(page.locator('dd svg.lucide-arrow-right').first()))
      .toBe(true);
    await expect.poll(() => isMirrored(page.locator('form[role="search"] button svg'))).toBe(true);
    await noSidewaysScroll(page);
  });

  test('tracking numbers and references stay readable left-to-right', async ({ page }) => {
    await page.goto('/ar-XB/track/RDM-VGYD-H7Q5-V');
    const shown = page.locator('header bdi', { hasText: 'RDM-VGYD-H7Q5-V' });
    await expect(shown).toBeVisible();
    expect(await drawnLeftToRight(shown)).toBe(true);

    // The input is a left-to-right unit: icon on its left, number reading left-to-right.
    const input = page.locator('form[role="search"] input');
    await expect(input).toHaveValue('RDM-VGYD-H7Q5-V');
    expect(await input.evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
    const icon = await box(page.locator('form[role="search"] svg.lucide-scan-line'));
    expect(icon.x).toBeLessThan((await box(input)).x + 60);

    // Not-found message: the number inside the sentence still reads left-to-right.
    await page.goto('/ar-XB/track/RDM-7K4P-9X2Q-R');
    const inSentence = page.locator('bdi', { hasText: 'RDM-7K4P-9X2Q-R' }).last();
    await expect(inSentence).toBeVisible();
    expect(await drawnLeftToRight(inSentence)).toBe(true);
  });

  test('support form: labels on the right, hidden spam trap does not scroll the page', async ({
    page,
  }) => {
    await page.goto('/ar-XB/support');
    const form = page.getByRole('form', { name: /^\[/ });
    await expect(form).toBeVisible();
    const name = page.locator('input[name="name"]');
    const label = page.locator(`label[for="${await name.getAttribute('id')}"]`);
    const labelBox = await box(label);
    const inputBox = await box(name);
    // Label text starts at the right edge of its field.
    expect(Math.abs(labelBox.x + labelBox.width - (inputBox.x + inputBox.width))).toBeLessThan(4);
    // The tracking-number field types left-to-right.
    expect(
      await page
        .locator('input[name="trackingNumber"]')
        .evaluate((el) => getComputedStyle(el).direction),
    ).toBe('ltr');
    await noSidewaysScroll(page);
    // In right-to-left pages the browser lets you scroll to the LEFT if anything
    // sticks out there; the spam trap must not.
    const scrolledLeft = await page.evaluate(() => {
      window.scrollTo({ left: -10_000 });
      return window.scrollX;
    });
    expect(scrolledLeft).toBe(0);
  });

  test('English is unchanged: left-to-right, logo on the left', async ({ page }) => {
    await page.goto('/en/track/RDM-PFBP-R2CQ-B');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    const logo = await box(page.locator('header a[aria-label]').first());
    expect(centre(logo)).toBeLessThan(page.viewportSize()!.width / 2);
    const steps = page.locator('ol[aria-label] > li[data-state]');
    expect(centre(await box(steps.first()))).toBeLessThan(centre(await box(steps.last())));
    expect(await isMirrored(page.locator('dd svg.lucide-arrow-right').first())).toBe(false);
  });
});
