import { expect, test, type Page } from '@playwright/test';

/**
 * Stage 4: tracking, end to end against the real API and the development
 * sample data from `npm run db:seed` (all flagged as test data):
 *   RDM-46EH-YBRW-8  delivered
 *   RDM-VGYD-H7Q5-V  at customs
 *   RDM-PFBP-R2CQ-B  delayed
 *
 * The API rate-limits lookups per visitor, and these tests use the real dev
 * server. So failure states (errors, 429, slow responses) are simulated with
 * mocked responses that never reach the server, and only a handful of real
 * lookups are made per run.
 */
const DELIVERED = 'RDM-46EH-YBRW-8';
const CUSTOMS = 'RDM-VGYD-H7Q5-V';
const DELAYED = 'RDM-PFBP-R2CQ-B';

const statusHeading = (page: Page) => page.locator('#shipment-status');
const history = (page: Page) =>
  page.getByRole('list', { name: /Tracking history/ }).locator('> li');
const steps = (page: Page) => page.getByRole('list', { name: 'Journey progress' }).locator('> li');

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectChronological(page: Page) {
  const times = await history(page)
    .locator('time')
    .evaluateAll((els) => els.map((el) => new Date(el.getAttribute('datetime') ?? '').getTime()));
  expect(times.length).toBeGreaterThan(0);
  expect([...times].sort((a, b) => a - b)).toEqual(times);
}

test.describe('Stage 4: tracking results', () => {
  test('delivered shipment: complete journey, delivery time, full history; then search another', async ({
    page,
  }, info) => {
    await page.goto(`/track/${DELIVERED}`);
    await expect(statusHeading(page)).toHaveText('Successfully Delivered');
    await expect(page.getByRole('note').filter({ hasText: 'Test data.' })).toBeVisible();

    await expect(steps(page)).toHaveCount(5);
    for (const state of await steps(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-state')),
    )) {
      expect(state).toBe('complete');
    }
    await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Estimated delivery')).toHaveCount(0);
    await expect(page.getByText('London, United Kingdom')).toBeVisible();
    await expect(page.getByText('Paris, France')).toBeVisible();

    await expect(history(page)).toHaveCount(7);
    await expectChronological(page);
    await expect(history(page).last()).toHaveAttribute('aria-current', 'step');
    await expect(history(page).last()).toContainText('Latest update');
    await expect(history(page).last()).toContainText('Successfully Delivered');
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/track-delivered-${info.project.name}.png`,
      fullPage: true,
    });

    // "Track another shipment" takes you back to the search box, ready to type.
    await page.getByRole('button', { name: 'Track another shipment' }).click();
    const input = page.getByLabel('Tracking number', { exact: true });
    await expect(input).toBeFocused();
    await input.fill(CUSTOMS);
    await page.getByRole('button', { name: 'Track package' }).click();
    await expect(page).toHaveURL(`/en/track/${CUSTOMS}`);
    await expect(statusHeading(page)).toHaveText('Customs Clearance');
  });

  test('shipment at customs: current stage, upcoming stages, estimate; API returns public fields only', async ({
    page,
  }, info) => {
    const response = page.waitForResponse((r) => r.url().includes(`/api/tracking/${CUSTOMS}`));
    await page.goto(`/track/${CUSTOMS}`);
    const body = await (await response).json();

    // Privacy: the API response holds exactly the public fields.
    expect(Object.keys(body.shipment).sort()).toEqual(
      [
        'currentLocation',
        'deliveredAt',
        'destination',
        'estimatedDeliveryDate',
        'events',
        'isTestData',
        'lastUpdatedAt',
        'origin',
        'shippingMethod',
        'status',
        'trackingNumber',
      ].sort(),
    );
    const raw = JSON.stringify(body);
    for (const privateValue of [
      'Sample Sender Two',
      'Sample Recipient Two',
      'example.com',
      'Example Street',
      '+00 000',
      'machine parts',
      'Development sample record',
    ]) {
      expect(raw).not.toContain(privateValue);
    }
    await expect(page.locator('main')).not.toContainText(
      /Sample Sender|Sample Recipient|example\.com|Example Street/,
    );

    await expect(statusHeading(page)).toHaveText('Customs Clearance');
    await expect(steps(page).nth(2)).toHaveAttribute('aria-current', 'step');
    await expect(steps(page).nth(2)).toContainText('In transit');
    await expect(steps(page).nth(3)).toHaveAttribute('data-state', 'upcoming');
    await expect(steps(page).nth(4)).toHaveAttribute('data-state', 'upcoming');
    await expect(page.getByText('Estimated delivery')).toBeVisible();
    await expect(page.getByText('Manchester, United Kingdom')).toBeVisible();
    await expect(page.getByText('New York, United States')).toBeVisible();
    await expect(page.locator('dl').getByText('Air Freight')).toBeVisible();
    await expect(history(page)).toHaveCount(5);
    await expectChronological(page);
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/track-customs-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('delayed shipment: exception explained, journey holds at the last real stage', async ({
    page,
  }, info) => {
    await page.goto(`/track/${DELAYED}`);
    await expect(statusHeading(page)).toHaveText('Shipment Delayed');
    await expect(page.getByText(/running late/)).toBeVisible();
    await expect(steps(page).nth(2)).toHaveAttribute('aria-current', 'step');
    await expect(steps(page).nth(2)).toContainText('Shipment Delayed');
    await expect(page.getByText('May change: shipment delayed')).toBeVisible();
    await expect(history(page).last()).toContainText('Shipment Delayed');
    await expectChronological(page);
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/track-delayed-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('an invalid number in the address shows the format error without calling the API', async ({
    page,
  }) => {
    const apiCalls: string[] = [];
    page.on('request', (r) => r.url().includes('/api/tracking') && apiCalls.push(r.url()));
    await page.goto('/track/hello');
    await expect(
      page.getByRole('heading', { name: "That isn't a valid tracking number" }),
    ).toBeVisible();
    await expect(page.getByText(/RDM-XXXX-XXXX-X/).first()).toBeVisible();
    expect(apiCalls).toEqual([]);
  });

  test('a valid number that does not exist shows "No shipment found" (real API)', async ({
    page,
  }, info) => {
    // One real failed lookup per run (desktop only), to stay well inside the
    // anti-enumeration limit. The other sizes get the same page via a mock.
    if (info.project.name !== 'desktop') {
      await page.route('**/api/tracking/**', (route) =>
        route.fulfill({
          status: 404,
          json: { error: { code: 'SHIPMENT_NOT_FOUND', message: "We couldn't find a shipment." } },
        }),
      );
    }
    await page.goto('/track/RDM-ABCD-2345-R');
    await expect(page.getByRole('heading', { name: 'No shipment found' })).toBeVisible();
    await expect(page.getByText('RDM-ABCD-2345-R').last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact support' }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe('Stage 4: tracking failure states (simulated responses)', () => {
  test('server error shows a retry button that works', async ({ page }) => {
    await page.route('**/api/tracking/**', (route) =>
      route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'x' } } }),
    );
    await page.goto(`/track/${CUSTOMS}`);
    await expect(
      page.getByRole('heading', { name: "We couldn't load tracking right now" }),
    ).toBeVisible();

    await page.unroute('**/api/tracking/**'); // the "server" recovers
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(statusHeading(page)).toHaveText('Customs Clearance');
  });

  test('network failure shows the error state', async ({ page }) => {
    await page.route('**/api/tracking/**', (route) => route.abort('internetdisconnected'));
    await page.goto(`/track/${CUSTOMS}`);
    await expect(
      page.getByRole('heading', { name: "We couldn't load tracking right now" }),
    ).toBeVisible();
  });

  test('an unexpected response shape is treated as an error, not shown', async ({ page }) => {
    await page.route('**/api/tracking/**', (route) =>
      route.fulfill({
        status: 200,
        json: { shipment: { trackingNumber: CUSTOMS, status: 'TELEPORTED' } },
      }),
    );
    await page.goto(`/track/${CUSTOMS}`);
    await expect(
      page.getByRole('heading', { name: "We couldn't load tracking right now" }),
    ).toBeVisible();
  });

  test('rate limiting explains how long to wait', async ({ page }) => {
    await page.route('**/api/tracking/**', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '120' },
        json: {
          error: { code: 'RATE_LIMITED', message: 'x', details: { retryAfterSeconds: 120 } },
        },
      }),
    );
    await page.goto(`/track/${CUSTOMS}`);
    await expect(page.getByRole('heading', { name: 'Too many lookups' })).toBeVisible();
    await expect(page.getByText(/about 2 minutes/)).toBeVisible();
  });

  test('shows a loading state while the lookup is in progress', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route('**/api/tracking/**', async (route) => {
      await gate;
      await route.fulfill({
        status: 404,
        json: { error: { code: 'SHIPMENT_NOT_FOUND', message: 'x' } },
      });
    });
    await page.goto(`/track/${CUSTOMS}`);
    await expect(
      page.locator('[aria-busy="true"]').getByText(`Looking up ${CUSTOMS}`),
    ).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: 'No shipment found' })).toBeVisible();
  });

  test('a shipment with no history yet says so instead of inventing events', async ({ page }) => {
    await page.route('**/api/tracking/**', (route) =>
      route.fulfill({
        status: 200,
        json: {
          shipment: {
            trackingNumber: CUSTOMS,
            status: 'REGISTERED',
            shippingMethod: 'ROAD',
            origin: { city: 'Leeds', countryCode: 'GB' },
            destination: { city: 'York', countryCode: 'GB' },
            currentLocation: null,
            estimatedDeliveryDate: null,
            deliveredAt: null,
            lastUpdatedAt: '2026-11-20T10:00:00.000Z',
            isTestData: false,
            events: [],
          },
        },
      }),
    );
    await page.goto(`/track/${CUSTOMS}`);
    await expect(statusHeading(page)).toHaveText('Shipment Registered');
    await expect(page.getByText('No tracking updates have been recorded')).toBeVisible();
    await expect(page.getByText('Not available yet')).toHaveCount(2); // location + estimate
    await expect(page.getByRole('note').filter({ hasText: 'Test data.' })).toHaveCount(0);
  });
});
