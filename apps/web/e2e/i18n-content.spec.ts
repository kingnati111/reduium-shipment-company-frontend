import { expect, test, type Page } from '@playwright/test';

/**
 * Localization Milestone 2: ALL customer-facing text comes from the
 * dictionaries. Checked with the development pseudo-language en-XA, which
 * accents every translated string: anything still plain English is text that
 * was missed.
 *
 * Shipment data is not interface text and is skipped: tracking numbers,
 * service codes, brand and company details (marked translate="no"), places
 * and notes written by staff (data-shipment-data), and dates/times (these
 * are formatted per language; en-XA formats like English).
 *
 * Read-only: development sample shipments are only looked at.
 */

const ACCENTED = /[ŤŕåçķþĝéîöûšñĥðļɱǫƀƒĵŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŤÛṼŴẊÝŽ]/;
const DATE_OR_TIME =
  /^([A-Z][a-z]{2}, )?[A-Z][a-z]{2} \d{1,2}, \d{4}(, \d{2}:\d{2} (AM|PM) [A-Z]{2,5})?$|^\d{2}:\d{2} (AM|PM) [A-Z]{2,5}$/;

/** Visible text and accessibility labels that are plain English (i.e. untranslated). */
async function untranslated(page: Page) {
  return page.evaluate(
    ({ accented, dateOrTime }) => {
      const ACC = new RegExp(accented);
      const DT = new RegExp(dateOrTime);
      // Accented, or ending with the pseudo-language marker "~]": went through translation.
      const plain = (s: string) =>
        /[A-Za-z]{3,}/.test(s) && !ACC.test(s) && !/~+]$/.test(s.trim()) && !DT.test(s.trim());
      const skip = (el: Element | null) =>
        !el ||
        Boolean(
          el.closest(
            'script,style,time,[translate="no"],[data-shipment-data],[aria-hidden="true"]',
          ),
        );
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent?.trim() ?? '';
        if (text && !skip(node.parentElement) && plain(text)) out.push(text);
      }
      for (const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
        if (skip(el)) continue;
        for (const attr of ['aria-label', 'title']) {
          const v = el.getAttribute(attr);
          if (v && plain(v)) out.push(`${attr}="${v}"`);
        }
      }
      if (plain(document.title)) out.push(`<title> ${document.title}`);
      return [...new Set(out)];
    },
    { accented: ACCENTED.source, dateOrTime: DATE_OR_TIME.source },
  );
}

test.describe('Localization: every customer-facing text is translatable', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'Same text on every device');
  });

  const PAGES: [string, string, ((page: Page) => Promise<void>)?][] = [
    [
      'home, with every FAQ answer open',
      '/en-XA/',
      async (page) => {
        for (const d of await page.locator('details').all()) {
          await d.evaluate((el) => ((el as HTMLDetailsElement).open = true));
        }
      },
    ],
    ['tracking: start', '/en-XA/track'],
    ['tracking: shipment in customs', '/en-XA/track/RDM-VGYD-H7Q5-V'],
    ['tracking: delivered shipment', '/en-XA/track/RDM-46EH-YBRW-8'],
    ['tracking: delayed shipment', '/en-XA/track/RDM-PFBP-R2CQ-B'],
    ['tracking: not found', '/en-XA/track/RDM-7K4P-9X2Q-R'],
    ['tracking: invalid number', '/en-XA/track/XYZ'],
    [
      'support: form with every field error showing',
      '/en-XA/support',
      async (page) => {
        await page.locator('input[name="trackingNumber"]').fill('RDM-1');
        await page.locator('form button[type="submit"]').click();
      },
    ],
    ['page not found', '/en-XA/no-such-page'],
  ];

  for (const [name, path, act] of PAGES) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('main')).not.toBeEmpty();
      await page.waitForLoadState('networkidle');
      if (act) await act(page);
      await page.waitForTimeout(300);
      expect(await untranslated(page)).toEqual([]);
    });
  }
});

/* ── Behaviour with simulated API answers (nothing is sent or stored) ──────── */

test.describe('Localization: messages from the server are shown in the visitor’s language', () => {
  async function fillValid(page: Page) {
    await page.locator('input[name="name"]').fill('Mock Person');
    await page.locator('input[name="email"]').fill('mock@example.com');
    await page.locator('select[name="topic"]').selectOption('OTHER');
    await page.locator('input[name="subject"]').fill('Mock subject');
    await page.locator('textarea[name="message"]').fill('A mock message long enough.');
  }

  test('field errors found by the server are translated by field, not shown in English', async ({
    page,
  }) => {
    await page.route('**/api/support', (r) =>
      r.fulfill({
        status: 400,
        json: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check the highlighted fields.',
            details: { issues: [{ field: 'email', message: 'Enter a valid email address.' }] },
          },
        },
      }),
    );
    await page.goto('/en-XA/support');
    await fillValid(page);
    await page.locator('form button[type="submit"]').click();
    const email = page.locator('input[name="email"]');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();
    await expect(page.getByText('[Éñťéŕ å ṽåļîð éɱåîļ åððŕéšš.', { exact: false })).toBeVisible();
    await expect(page.getByText('Enter a valid email address.', { exact: true })).toHaveCount(0);
  });

  test('refused, rate-limited and unavailable answers are translated', async ({ page }) => {
    const answers: [number, string, RegExp][] = [
      [400, 'SUBMISSION_REJECTED', /^\[Ýöûŕ ɱéššåĝé çöûļð ñöť ƀé šéñť/],
      [429, 'RATE_LIMITED', /^\[Ŵé ĥåṽé ŕéçéîṽéð šéṽéŕåļ ɱéššåĝéš/],
      [503, 'UNAVAILABLE', /^\[Ťĥé çöñťåçť ƒöŕɱ îš ťéɱþöŕåŕîļý ûñåṽåîļåƀļé/],
    ];
    await page.goto('/en-XA/support');
    await fillValid(page);
    for (const [status, code, expected] of answers) {
      await page.unroute('**/api/support');
      await page.route('**/api/support', (r) =>
        r.fulfill({ status, json: { error: { code, message: 'English server text' } } }),
      );
      await page.locator('form button[type="submit"]').click();
      await expect(page.locator('form [role="alert"]').first()).toHaveText(expected);
      await expect(page.getByText('English server text')).toHaveCount(0);
    }
  });

  test('a tracking number the server rejects shows the translated explanation', async ({
    page,
  }) => {
    await page.route('**/api/tracking/**', (r) =>
      r.fulfill({
        status: 400,
        json: { error: { code: 'INVALID_TRACKING_NUMBER', message: 'English server text' } },
      }),
    );
    await page.goto('/en-XA/track/RDM-VGYD-H7Q5-V');
    await expect(page.getByRole('heading', { name: /^\[Ťĥåť îšñ'ť å ṽåļîð/ })).toBeVisible();
    await expect(page.getByText('English server text')).toHaveCount(0);
  });
});

test.describe('Localization: formatting and switching', () => {
  test('dates are formatted for the page language; status codes stay the same', async ({
    page,
  }) => {
    const delivered = (p: Page) =>
      p.locator('dt', { hasText: /Delivered|Ðéļîṽéŕéð/ }).locator('xpath=following-sibling::dd');
    await page.goto('/en/track/RDM-46EH-YBRW-8');
    await expect(page.locator('#shipment-status')).toHaveText('Successfully Delivered');
    const english = await delivered(page).innerText();

    await page.goto('/ar-XB/track/RDM-46EH-YBRW-8');
    await expect(page.locator('#shipment-status')).toHaveText(/^\[Šûççéššƒûļļý Ðéļîṽéŕéð/);
    const arabic = await delivered(page).innerText();
    expect(arabic).not.toBe(english); // Arabic date words/digits
    // The status itself is translated by code: the same shipment, the same status.
    await expect(page.getByText('RDM-46EH-YBRW-8').first()).toBeVisible();
  });

  test('switching language keeps what the visitor typed', async ({ page }) => {
    await page.goto('/en/support');
    await page.locator('input[name="name"]').fill('Typed Name');
    await page.locator('textarea[name="message"]').fill('Typed before switching language.');
    await page.getByRole('combobox', { name: /Language/ }).selectOption('en-XA');
    await expect(page).toHaveURL('/en-XA/support');
    await expect(page.locator('#support-form-title')).toHaveText(/^\[Šéñð ûš/);
    await expect(page.locator('input[name="name"]')).toHaveValue('Typed Name');
    await expect(page.locator('textarea[name="message"]')).toHaveValue(
      'Typed before switching language.',
    );
  });

  test('the shown error follows a language switch while it is on screen', async ({ page }) => {
    await page.goto('/en/support');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Name is required.')).toBeVisible();
    await page.getByRole('combobox', { name: /Language/ }).selectOption('en-XA');
    await expect(page.getByText(/^\[Ñåɱé îš ŕéǫûîŕéð\./)).toBeVisible();
  });
});
