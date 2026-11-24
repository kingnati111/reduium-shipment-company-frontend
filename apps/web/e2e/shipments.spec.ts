import type { AdminShipmentDetail, AuthSessionInfo } from '@reduium/shared';
import { expect, test, type Page } from '@playwright/test';

/**
 * Stage 6: shipment management.
 *
 * Real tests sign in as the browser-test OPERATOR account and work against
 * the real API and dev database. Shipments they create are removed again by
 * the global teardown (apps/api/scripts/e2e-account.ts). The development
 * sample shipments are only READ, never changed.
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const hasAccount = Boolean(email && password);

async function signIn(page: Page, next = '/admin') {
  await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email address').fill(email!);
  await page.getByLabel('Password', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(next);
}

const field = (page: Page, path: string) => page.locator(`#field-${path.replace(/\./g, '-')}`);

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('Stage 6: shipment management (real API)', () => {
  test.skip(!hasAccount, 'No database configured for browser tests');

  test('dashboard, search, and a full shipment workflow ending on the public tracking page', async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    await signIn(page);

    // Dashboard: live figures and lists.
    await expect(
      page.getByRole('region', { name: 'Key figures' }).getByText('In progress'),
    ).toBeVisible();
    await expect(page.getByText('Needs attention').first()).toBeVisible();
    await page.screenshot({
      path: `test-results/admin-dashboard-${info.project.name}.png`,
      fullPage: true,
    });

    // Find a development sample shipment by part of its number; staff see private details.
    await page.getByRole('link', { name: 'Shipments', exact: true }).first().click();
    await page.getByLabel('Search shipments').fill('vgyd');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/q=vgyd/);
    await page.getByRole('link', { name: 'RDM-VGYD-H7Q5-V' }).first().click();
    await expect(page.getByRole('heading', { name: 'RDM-VGYD-H7Q5-V' })).toBeVisible();
    await expect(page.getByText('Sample Recipient Two (TEST DATA)').first()).toBeVisible();
    await expect(page.getByText('Test data').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete permanently/ })).toHaveCount(0); // operators can't

    // Create a shipment.
    await page.goto('/admin/shipments/new');
    await page.getByRole('radio', { name: /Air Freight/ }).check();
    await field(page, 'sender.name').fill(`E2E Sender ${info.project.name}`);
    await field(page, 'sender.email').fill('e2e.sender@example.invalid');
    await field(page, 'sender.addressLine1').fill('1 Browser Test Road');
    await field(page, 'sender.city').fill('Leeds');
    await field(page, 'sender.countryCode').fill('GB');
    await field(page, 'recipient.name').fill(`E2E Recipient ${info.project.name}`);
    await field(page, 'recipient.addressLine1').fill('2 Browser Test Avenue');
    await field(page, 'recipient.city').fill('Lyon');
    await field(page, 'recipient.countryCode').fill('FR');
    await page.getByRole('button', { name: "Same as sender's city" }).click();
    await page.getByRole('button', { name: "Same as recipient's city" }).click();
    await expect(field(page, 'origin.city')).toHaveValue('Leeds');
    await field(page, 'weightKg').fill('2.5');
    await page.getByRole('button', { name: 'Create shipment' }).click();

    await expect(page.getByText(/Shipment RDM-.+ created\./)).toBeVisible();
    const trackingNumber = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    expect(trackingNumber).toMatch(/^RDM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]$/);
    await expect(page.getByText('Shipment Registered').first()).toBeVisible();

    // Add a tracking update: status and location change.
    await page.locator('#add-event-status').selectOption('IN_TRANSIT');
    await expect(page.locator('#add-event-description')).toHaveValue(
      /moving through the Reduium network/,
    );
    await page.locator('#add-event-location').fill('Leeds air hub, GB');
    await page.getByRole('button', { name: 'Add update' }).click();
    await expect(page.getByText('Update added: In Transit.')).toBeVisible();
    const history = page
      .getByRole('list', { name: 'Tracking history, newest first' })
      .locator('> li');
    await expect(history).toHaveCount(2);
    await expect(history.first()).toContainText('In Transit');
    await expect(history.first()).toContainText('Current');
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/admin-shipment-${info.project.name}.png`,
      fullPage: true,
    });

    // Edit details.
    await page.getByRole('link', { name: 'Edit details' }).click();
    await field(page, 'pieceCount').fill('3');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();

    // Customers see the update, and none of the private details.
    const pub = await page.context().newPage();
    await pub.goto(`/track/${trackingNumber}`);
    await expect(pub.locator('#shipment-status')).toHaveText('In Transit');
    await expect(pub.getByText('Leeds air hub, GB').first()).toBeVisible();
    await expect(pub.locator('main')).not.toContainText(
      /E2E Sender|E2E Recipient|Browser Test Road|example\.invalid/,
    );
    await pub.close();

    // Archive: read-only, but restorable.
    await page.getByRole('button', { name: 'Archive' }).click();
    await page
      .getByRole('dialog', { name: 'Archive this shipment?' })
      .getByRole('button', { name: 'Archive' })
      .click();
    await expect(page.getByText('Shipment archived. Customers can still track it.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add update' })).toHaveCount(0);
  });

  test('the new-shipment form explains what is missing', async ({ page }) => {
    await signIn(page, '/admin/shipments/new');
    await field(page, 'sender.countryCode').fill('B1'); // fits the 2-character box, but isn't letters
    await page.getByRole('button', { name: 'Create shipment' }).click();
    await expect(page.getByText(/Please fix the \d+ highlighted fields below\./)).toBeVisible();
    await expect(field(page, 'sender.name')).toBeFocused();
    await expect(field(page, 'sender.name')).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText('Use a 2-letter country code, e.g. GB or US.').first(),
    ).toBeVisible();
    await expect(page).toHaveURL('/admin/shipments/new'); // nothing was created
  });
});

/* ── Simulated responses ───────────────────────────────────────────────────── */

const ADMIN_SESSION: AuthSessionInfo = {
  admin: {
    id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    name: 'Ada Example',
    email: 'ada@example.com',
    role: 'ADMIN',
    permissions: [
      'shipments:read',
      'shipments:write',
      'shipments:delete',
      'support:read',
      'support:write',
      'support:delete',
      'admins:read',
      'admins:manage',
      'audit:read',
    ],
  },
  csrfToken: 'test-csrf-token',
  session: { expiresAt: new Date(Date.now() + 3_600_000).toISOString(), idleTimeoutSeconds: 7200 },
};

const party = {
  name: 'Mock Person',
  company: null,
  email: null,
  phone: null,
  addressLine1: '1 Mock St',
  addressLine2: null,
  city: 'Leeds',
  region: null,
  postalCode: null,
  countryCode: 'GB',
};
const SHIPMENT: AdminShipmentDetail = {
  id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c',
  trackingNumber: 'RDM-ABCD-2345-R',
  status: 'IN_TRANSIT',
  shippingMethod: 'ROAD',
  sender: party,
  recipient: party,
  origin: { city: 'Leeds', countryCode: 'GB' },
  destination: { city: 'York', countryCode: 'GB' },
  currentLocation: 'M1 motorway',
  pieceCount: 1,
  weightKg: null,
  contentsDescription: null,
  estimatedDeliveryDate: null,
  deliveredAt: null,
  internalNotes: null,
  archivedAt: null,
  isTestData: false,
  overdue: false,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  createdBy: null,
  updatedBy: null,
  events: [
    {
      id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5d',
      status: 'IN_TRANSIT',
      location: 'M1 motorway',
      description: 'On the road.',
      occurredAt: '2026-11-20T10:00:00.000Z',
      createdAt: '2026-11-20T10:00:00.000Z',
      createdBy: null,
    },
  ],
};

test.describe('Stage 6: management screens (simulated responses)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: ADMIN_SESSION }));
    await page.route('**/api/admin/shipments/*/activity', (r) =>
      r.fulfill({ json: { activity: [] } }),
    );
  });

  test('a conflicting edit is refused with a clear way to reload', async ({ page }) => {
    await page.route(`**/api/admin/shipments/${SHIPMENT.id}`, (r) =>
      r.request().method() === 'PUT'
        ? r.fulfill({
            status: 409,
            json: {
              error: {
                code: 'CONFLICT',
                message:
                  'This shipment was changed by someone else after you opened it. Reload to see the latest version, then make your changes again.',
              },
            },
          })
        : r.fulfill({ json: { shipment: SHIPMENT } }),
    );
    await page.goto(`/admin/shipments/${SHIPMENT.id}/edit`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('alert')).toContainText('changed by someone else');
    await expect(page.getByRole('button', { name: 'Load the latest version' })).toBeVisible();
  });

  test('administrators delete archived shipments only after typing the tracking number', async ({
    page,
  }) => {
    let deletedWith: unknown = null;
    await page.route(`**/api/admin/shipments/${SHIPMENT.id}`, async (r) => {
      if (r.request().method() === 'DELETE') {
        deletedWith = r.request().postDataJSON();
        expect(r.request().headers()['x-csrf-token']).toBe('test-csrf-token');
        return r.fulfill({ status: 204 });
      }
      return r.fulfill({
        json: { shipment: { ...SHIPMENT, archivedAt: '2026-11-21T10:00:00.000Z' } },
      });
    });
    await page.route('**/api/admin/shipments?*', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 25 } }),
    );

    await page.goto(`/admin/shipments/${SHIPMENT.id}`);
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete this shipment permanently?' });
    const confirm = dialog.getByRole('button', { name: 'Delete permanently' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Type RDM-ABCD-2345-R to confirm/).fill('rdm-abcd-2345-r');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL('/admin/shipments?view=archived');
    await expect(page.getByText('Shipment RDM-ABCD-2345-R was permanently deleted.')).toBeVisible();
    expect(deletedWith).toEqual({ confirmTrackingNumber: 'rdm-abcd-2345-r' });
  });
});
