import type { AdminSupportDetail, AuthSessionInfo } from '@reduium/shared';
import { expect, test, type Page } from '@playwright/test';

/**
 * Stage 7: customer support.
 *
 * Real tests send the public contact form for real (no sign-in), then sign
 * in as the browser-test OPERATOR and handle that request in the inbox.
 * Requests they create use e2e.support.<project>@example.invalid and are
 * removed again by the global teardown (Backend/scripts/e2e-account.ts).
 * The development sample request is never changed.
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

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const form = (page: Page) => page.getByRole('form', { name: 'Send us a message' });

test.describe('Stage 7: contact form and support inbox (real API)', () => {
  test.skip(!hasAccount, 'No database configured for browser tests');

  test('a customer sends a message; an operator assigns, notes, records a reply and resolves it', async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const tag = `${info.project.name}-${Date.now().toString(36)}`;

    // 1. The customer (not signed in) sends the form.
    await page.goto('/support');
    const f = form(page);
    await f.getByLabel('Your name *').fill(`E2E Customer ${tag}`);
    await f.getByLabel('Email address *').fill(`e2e.support.${tag}@example.invalid`);
    await f.getByLabel('What is it about? *').selectOption('DELIVERY_PROBLEM');
    await f.getByLabel('Subject *').fill(`E2E support test ${tag}`);
    await f.getByLabel('Message *').fill('Automated browser test message. Please ignore.');
    await expectNoHorizontalScroll(page);
    await f.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('heading', { name: 'Message received' })).toBeFocused();
    const reference = (
      await page.locator('#support-done-title ~ div .type-data').first().innerText()
    ).trim();
    expect(reference).toMatch(/^SUP-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await expect(page.getByText("We don't send a confirmation email")).toBeVisible();
    await page.screenshot({
      path: `test-results/support-sent-${info.project.name}.png`,
      fullPage: true,
    });

    // 2. An operator finds it in the inbox by its reference.
    await signIn(page, '/admin/support');
    await page.getByLabel('Search support requests').fill(reference.toLowerCase());
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: reference }).first().click();
    await expect(page.getByRole('heading', { name: reference })).toBeVisible();
    await expect(page.getByText(`E2E support test ${tag}`)).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete permanently/ })).toHaveCount(0);

    // 3. Assign to me: a New request becomes In progress.
    const manage = page.getByRole('form', { name: 'Manage this request' });
    await manage.getByRole('button', { name: 'Me', exact: true }).click();
    await manage.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    await expect(manage.getByLabel('Status')).toHaveValue('IN_PROGRESS');

    // 4. Internal note: clearly staff-only.
    await page.getByLabel('Internal note (staff only)').fill('E2E note: checked with the depot.');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('Internal note added.')).toBeVisible();
    await expect(page.getByText('Internal note · staff only')).toBeVisible();

    // 5. Recorded reply: never presented as sent.
    await page.getByLabel('Reply to the customer').fill('E2E reply: it will arrive tomorrow.');
    await page.getByRole('button', { name: 'Record reply' }).click();
    await expect(page.getByText('Reply recorded.')).toBeVisible();
    await expect(page.getByText('This reply has NOT been sent.', { exact: false })).toBeVisible();
    await expect(page.getByText('Reply recorded · not sent by Reduium')).toBeVisible();
    await expect(page.getByText(/email sent/i)).toHaveCount(0);
    const mail = page.getByRole('link', { name: 'Open in my email' }).first();
    await expect(mail).toHaveAttribute(
      'href',
      new RegExp(`^mailto:e2e\\.support\\.${tag}@example\\.invalid\\?subject=`),
    );
    await expect(manage.getByLabel('Status')).toHaveValue('WAITING_ON_CUSTOMER');
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/support-request-${info.project.name}.png`,
      fullPage: true,
    });

    // 6. Resolve.
    await manage.getByLabel('Status').selectOption('RESOLVED');
    await manage.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    await expect(
      page
        .getByRole('list', { name: 'Timeline, oldest first' })
        .getByText(/changed the status from Waiting on customer to Resolved/),
    ).toBeVisible();
  });
});

/** Checked in the browser before anything is sent: no account or database needed. */
test.describe('Stage 7: contact form validation', () => {
  test('the form explains what is missing and moves focus to it', async ({ page }) => {
    let sent = false;
    await page.route('**/api/support', (r) => {
      sent = true;
      return r.abort();
    });
    await page.goto('/support');
    const f = form(page);
    await f.getByLabel('Tracking number (optional)').fill('RDM-1234');
    await f.getByRole('button', { name: 'Send message' }).click();
    await expect(f.getByRole('alert').first()).toContainText(
      /Please fix the \d+ highlighted fields/,
    );
    await expect(f.getByLabel('Your name *')).toBeFocused();
    await expect(f.getByLabel('Your name *')).toHaveAttribute('aria-invalid', 'true');
    await expect(f.getByText(/does not look like a Reduium tracking number/)).toBeVisible();
    await expect(page).toHaveURL('/en/support');
    expect(sent).toBe(false); // nothing was sent

    // Fixing a field clears its error without moving focus away from it.
    await f.getByLabel('Your name *').fill('Casey');
    await expect(f.getByLabel('Your name *')).toBeFocused();
    await expect(f.getByLabel('Your name *')).not.toHaveAttribute('aria-invalid', 'true');
  });
});

/* ── Simulated responses ───────────────────────────────────────────────────── */

async function fillValid(page: Page) {
  const f = form(page);
  await f.getByLabel('Your name *').fill('Mock Person');
  await f.getByLabel('Email address *').fill('mock@example.com');
  await f.getByLabel('What is it about? *').selectOption('OTHER');
  await f.getByLabel('Subject *').fill('Mock subject');
  await f.getByLabel('Message *').fill('A mock message long enough.');
}

test.describe('Stage 7: contact form states (simulated responses)', () => {
  test('rate limiting and connection problems are explained, never shown as sent', async ({
    page,
  }) => {
    await page.route('**/api/support', (r) =>
      r.fulfill({
        status: 429,
        json: {
          error: {
            code: 'RATE_LIMITED',
            message:
              'We have received several messages from you recently. Please wait a while before sending another, or contact us by email or phone.',
          },
        },
      }),
    );
    await page.goto('/support');
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(form(page).getByRole('alert')).toContainText('received several messages');
    await expect(page.getByText('Message received')).toHaveCount(0);

    await page.unroute('**/api/support');
    await page.route('**/api/support', (r) => r.abort('internetdisconnected'));
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(form(page).getByRole('alert')).toContainText("couldn't send your message");
    await expect(page.getByText('Message received')).toHaveCount(0);
  });

  test('the spam-trap field is hidden from people and assistive technology', async ({ page }) => {
    let sent: Record<string, unknown> | null = null;
    await page.route('**/api/support', (r) => {
      sent = r.request().postDataJSON();
      return r.fulfill({
        status: 201,
        json: { reference: 'SUP-ABCD-2345', receivedAt: '2026-11-23T10:00:00.000Z' },
      });
    });
    await page.goto('/support');
    await expect(page.locator('input[name="website"]')).not.toBeInViewport();
    // Present in the page, but not in the accessibility tree (aria-hidden),
    // so screen readers never announce it.
    await expect(page.locator('input[name="website"]')).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'Leave this field empty' })).toHaveCount(0);
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Message received' })).toBeVisible();
    await expect(page.getByText('SUP-ABCD-2345')).toBeVisible();
    expect(sent).toMatchObject({ website: '', topic: 'OTHER', email: 'mock@example.com' });
  });
});

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

const REQUEST: AdminSupportDetail = {
  id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a60',
  reference: 'SUP-ABCD-2345',
  name: 'Mock Customer',
  email: 'mock.customer@example.com',
  phone: null,
  subject: 'Mock subject',
  preview: 'Mock message.',
  message: 'Mock message.',
  topic: 'OTHER',
  status: 'IN_PROGRESS',
  priority: 'NORMAL',
  trackingNumber: null,
  assignee: null,
  isTestData: false,
  createdAt: '2026-11-20T10:00:00.000Z',
  lastActivityAt: '2026-11-20T10:00:00.000Z',
  resolvedAt: null,
  closedAt: null,
  updatedAt: '2026-11-20T10:00:00.000Z',
  updatedBy: null,
  shipment: null,
  activities: [],
};

test.describe('Stage 7: support screens (simulated responses)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: ADMIN_SESSION }));
    await page.route('**/api/admin/support/assignees', (r) =>
      r.fulfill({
        json: { assignees: [{ id: ADMIN_SESSION.admin.id, name: 'Ada Example', role: 'ADMIN' }] },
      }),
    );
    await page.route('**/api/admin/support/*/activity', (r) =>
      r.fulfill({ json: { activity: [] } }),
    );
  });

  test('a conflicting change is refused with a clear way to reload', async ({ page }) => {
    await page.route(`**/api/admin/support/${REQUEST.id}`, (r) =>
      r.request().method() === 'PATCH'
        ? r.fulfill({
            status: 409,
            json: {
              error: {
                code: 'CONFLICT',
                message:
                  'This request was changed by someone else after you opened it. Reload to see the latest version, then make your change again.',
              },
            },
          })
        : r.fulfill({ json: { request: REQUEST } }),
    );
    await page.goto(`/admin/support/${REQUEST.id}`);
    const manage = page.getByRole('form', { name: 'Manage this request' });
    await manage.getByLabel('Priority').selectOption('URGENT');
    await manage.getByRole('button', { name: 'Save changes' }).click();
    await expect(manage.getByRole('alert')).toContainText('changed by someone else');
    await expect(page.getByRole('button', { name: 'Load the latest version' })).toBeVisible();
  });

  test('administrators delete Closed requests only after typing the reference', async ({
    page,
  }) => {
    let deletedWith: unknown = null;
    await page.route(`**/api/admin/support/${REQUEST.id}`, (r) => {
      if (r.request().method() === 'DELETE') {
        deletedWith = r.request().postDataJSON();
        expect(r.request().headers()['x-csrf-token']).toBe('test-csrf-token');
        return r.fulfill({ status: 204 });
      }
      return r.fulfill({
        json: { request: { ...REQUEST, status: 'CLOSED', closedAt: '2026-11-21T10:00:00.000Z' } },
      });
    });
    await page.route('**/api/admin/support?*', (r) =>
      r.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 25 } }),
    );

    await page.goto(`/admin/support/${REQUEST.id}`);
    await expect(
      page.getByText('This request is closed. Notes and replies can be added again'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record reply' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete this support request permanently?' });
    const confirm = dialog.getByRole('button', { name: 'Delete permanently' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Type SUP-ABCD-2345 to confirm/).fill('sup-abcd-2345');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL('/admin/support?view=closed');
    await expect(
      page.getByText('Support request SUP-ABCD-2345 was permanently deleted.'),
    ).toBeVisible();
    expect(deletedWith).toEqual({ confirmReference: 'sup-abcd-2345' });
  });

  test('recorded replies are labelled as not sent, with a way to send them yourself', async ({
    page,
  }) => {
    const withReply: AdminSupportDetail = {
      ...REQUEST,
      status: 'WAITING_ON_CUSTOMER',
      activities: [
        {
          id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a61',
          type: 'INTERNAL_NOTE',
          body: 'Private note.',
          fromValue: null,
          toValue: null,
          assignee: null,
          actor: { name: 'Ada Example' },
          createdAt: '2026-11-20T11:00:00.000Z',
        },
        {
          id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a62',
          type: 'REPLY_RECORDED',
          body: 'Hello & thanks?',
          fromValue: null,
          toValue: null,
          assignee: null,
          actor: { name: 'Ada Example' },
          createdAt: '2026-11-20T12:00:00.000Z',
        },
      ],
    };
    await page.route(`**/api/admin/support/${REQUEST.id}`, (r) =>
      r.fulfill({ json: { request: withReply } }),
    );
    await page.goto(`/admin/support/${REQUEST.id}`);
    const timeline = page.getByRole('list', { name: 'Timeline, oldest first' });
    await expect(timeline.getByText('Internal note · staff only')).toBeVisible();
    await expect(timeline.getByText('Reply recorded · not sent by Reduium')).toBeVisible();
    await expect(timeline.getByRole('link', { name: 'Open in my email' })).toHaveAttribute(
      'href',
      'mailto:mock.customer@example.com?subject=Re%3A%20Mock%20subject%20%5BSUP-ABCD-2345%5D&body=Hello%20%26%20thanks%3F',
    );
  });
});
