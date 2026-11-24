import type { AuthSessionInfo } from '@reduium/shared';
import { expect, test, type Page } from '@playwright/test';

/**
 * Stage 5: staff sign-in and protected admin access.
 *
 * "Real" tests sign in through the real API with the dedicated browser-test
 * account (an OPERATOR, enabled with a random password for each run; see
 * global-setup.ts). Login attempts are rate-limited per visitor, so the real
 * flows are few and combined, and failure states use simulated responses.
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const hasAccount = Boolean(email && password);

const emailField = (page: Page) => page.getByLabel('Email address');
const passwordField = (page: Page) => page.getByLabel('Password', { exact: true });
const signInButton = (page: Page) => page.getByRole('button', { name: 'Sign in' });

async function signIn(page: Page, user: string, pass: string) {
  await emailField(page).fill(user);
  await passwordField(page).fill(pass);
  await signInButton(page).click();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('Stage 5: protected admin area (real API)', () => {
  test('signed-out visitors are sent to sign-in, for every admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
    await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();

    await page.goto('/admin/team');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fteam$/);

    // The API refuses too: hiding pages is not the protection.
    const res = await page.request.get('/api/admin/admins');
    expect(res.status()).toBe(401);
  });

  test('operator: sign in, stay signed in, roles enforced, secure cookie, sign out', async ({
    page,
    context,
  }, info) => {
    test.skip(!hasAccount, 'No database configured for browser tests');

    // Arrive via a deep link: after signing in you land where you were going.
    await page.goto('/admin/login?next=%2Fadmin%2Fnowhere');
    await signIn(page, email!, password!);
    await expect(page).toHaveURL('/admin/nowhere');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

    await page.getByRole('link', { name: 'Back to overview' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome, Automated' })).toBeVisible();
    await expect(page.getByTestId('admin-role')).toHaveText('Operator');

    // Cookie: httpOnly (invisible to page scripts), SameSite=Strict.
    const cookie = (await context.cookies()).find((c) => c.name === 'reduium_session');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' });
    expect(cookie!.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await page.evaluate(() => document.cookie)).not.toContain('reduium_session');

    // Stays signed in across reloads and navigation.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Welcome, Automated' })).toBeVisible();

    // Operators don't see the Team page, can't open it, and the API refuses it.
    await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0);
    await page.goto('/admin/team');
    await expect(
      page.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();
    const forbidden = await page.request.get('/api/admin/admins');
    expect(forbidden.status()).toBe(403);

    // A state-changing request without the CSRF token is refused.
    const noCsrf = await page.request.post('/api/auth/logout', {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(noCsrf.status()).toBe(403);

    await expectNoHorizontalScroll(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Welcome, Automated' })).toBeVisible();
    await page.screenshot({
      path: `test-results/admin-overview-${info.project.name}.png`,
      fullPage: true,
    });

    // Sign out ends the session on the server and returns to sign-in.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText('You have been signed out.')).toBeVisible();
    expect((await context.cookies()).find((c) => c.name === 'reduium_session')).toBeUndefined();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('a session that ends on the server sends the admin back to sign-in', async ({
    page,
    context,
  }) => {
    test.skip(!hasAccount, 'No database configured for browser tests');
    await page.goto('/admin/login');
    await signIn(page, email!, password!);
    await expect(page.getByRole('heading', { name: 'Welcome, Automated' })).toBeVisible();

    // The session disappears (as when it expires), then the admin comes back to the tab.
    await context.clearCookies();
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page).toHaveURL(/\/admin\/login\?.*expired=1/);
    await expect(page.getByText('Your session has ended. Please sign in again.')).toBeVisible();
  });

  test('wrong password: generic message, password cleared, focus returned', async ({
    page,
  }, info) => {
    test.skip(!hasAccount, 'No database configured for browser tests');
    // One real failed attempt per run (desktop), to stay inside the login limits.
    test.skip(info.project.name !== 'desktop', 'Real failed login runs on desktop only');
    await page.goto('/admin/login');
    await signIn(page, email!, 'definitely not the password');
    await expect(page.getByRole('alert')).toContainText('Email or password is incorrect.');
    await expect(passwordField(page)).toHaveValue('');
    await expect(passwordField(page)).toBeFocused();
    await expect(page).toHaveURL('/admin/login');
  });
});

/* ── Simulated responses: no real login attempts are used ─────────────────── */

const sessionFor = (role: 'ADMIN' | 'OPERATOR'): AuthSessionInfo => ({
  admin: {
    id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    name: role === 'ADMIN' ? 'Ada Example' : 'Otto Example',
    email: 'someone@example.com',
    role,
    permissions:
      role === 'ADMIN'
        ? [
            'shipments:read',
            'shipments:write',
            'support:read',
            'support:write',
            'support:delete',
            'admins:read',
            'admins:manage',
            'audit:read',
          ]
        : ['shipments:read', 'shipments:write', 'support:read', 'support:write'],
  },
  csrfToken: 'test-csrf-token',
  session: {
    expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    idleTimeoutSeconds: 7200,
  },
});

async function mockSignedOut(page: Page) {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'UNAUTHENTICATED', message: 'Not signed in.' } },
    }),
  );
}

test.describe('Stage 5: sign-in page behaviour (simulated responses)', () => {
  test('checks for missing and malformed input before sending anything', async ({ page }) => {
    await mockSignedOut(page);
    const loginCalls: string[] = [];
    page.on('request', (r) => r.url().includes('/api/auth/login') && loginCalls.push(r.url()));
    await page.goto('/admin/login');

    await signInButton(page).click();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText('Enter your password.')).toBeVisible();
    await expect(emailField(page)).toBeFocused();
    await expect(emailField(page)).toHaveAttribute('aria-invalid', 'true');

    await emailField(page).fill('not-an-email');
    await passwordField(page).fill('something');
    await signInButton(page).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    expect(loginCalls).toEqual([]);
  });

  test('show/hide password toggle', async ({ page }) => {
    await mockSignedOut(page);
    await page.goto('/admin/login');
    await passwordField(page).fill('secret passphrase');
    await expect(passwordField(page)).toHaveAttribute('type', 'password');
    await expect(passwordField(page)).toHaveAttribute('autocomplete', 'current-password');
    await expect(emailField(page)).toHaveAttribute('autocomplete', 'username');

    const toggle = page.getByRole('button', { name: 'Show password' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(passwordField(page)).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(passwordField(page)).toHaveAttribute('type', 'password');
  });

  test('shows a busy state while signing in', async ({ page }) => {
    await mockSignedOut(page);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route('**/api/auth/login', async (route) => {
      await gate;
      await route.fulfill({
        status: 401,
        json: {
          error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
        },
      });
    });
    await page.goto('/admin/login');
    await signIn(page, 'someone@example.com', 'a password');
    const busy = page.getByRole('button', { name: 'Signing in…' });
    await expect(busy).toBeVisible();
    await expect(busy).toBeDisabled();
    await expect(emailField(page)).toBeDisabled();
    release();
    await expect(page.getByRole('alert')).toContainText('Email or password is incorrect.');
  });

  test('explains rate limiting and connection problems', async ({ page }) => {
    await mockSignedOut(page);
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '840' },
        json: {
          error: { code: 'RATE_LIMITED', message: 'x', details: { retryAfterSeconds: 840 } },
        },
      }),
    );
    await page.goto('/admin/login');
    await signIn(page, 'someone@example.com', 'a password');
    await expect(page.getByRole('alert')).toContainText('Too many sign-in attempts');
    await expect(page.getByRole('alert')).toContainText('about 14 minutes');

    await page.unroute('**/api/auth/login');
    await page.route('**/api/auth/login', (route) => route.abort('internetdisconnected'));
    await signInButton(page).click();
    await expect(page.getByRole('alert')).toContainText("couldn't reach the server");
  });

  test('never redirects to another website after sign-in', async ({ page }) => {
    let signedIn = false;
    await page.route('**/api/auth/session', (route) =>
      signedIn
        ? route.fulfill({ json: sessionFor('OPERATOR') })
        : route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
    );
    await page.route('**/api/auth/login', (route) => {
      signedIn = true;
      return route.fulfill({ json: sessionFor('OPERATOR') });
    });
    await page.goto('/admin/login?next=https%3A%2F%2Fevil.example%2Fphish');
    await signIn(page, 'someone@example.com', 'a password');
    await expect(page).toHaveURL('/admin');
  });

  test('administrators see the Team page with staff accounts', async ({ page }, info) => {
    // The overview also loads dashboard data: simulate that too.
    await page.route('**/api/admin/support/stats', (route) =>
      route.fulfill({
        json: { open: 0, new: 0, unassigned: 0, mine: 0, waiting: 0, urgent: 0, oldestOpen: [] },
      }),
    );
    await page.route('**/api/admin/shipments**', (route) =>
      route.fulfill({
        json: route.request().url().includes('/stats')
          ? {
              inProgress: 0,
              attention: 0,
              overdue: 0,
              deliveredLast7Days: 0,
              archived: 0,
              byStatus: {},
            }
          : { items: [], total: 0, page: 1, pageSize: 6 },
      }),
    );
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({ json: sessionFor('ADMIN') }),
    );
    await page.route('**/api/admin/admins', (route) =>
      route.fulfill({
        json: {
          admins: [
            {
              id: '1',
              name: 'Ada Example',
              email: 'ada@example.com',
              role: 'ADMIN',
              status: 'ACTIVE',
              lastLoginAt: '2026-11-20T09:00:00.000Z',
              createdAt: '2026-11-01T09:00:00.000Z',
            },
            {
              id: '2',
              name: 'Otto Example',
              email: 'otto@example.com',
              role: 'OPERATOR',
              status: 'DISABLED',
              lastLoginAt: null,
              createdAt: '2026-11-02T09:00:00.000Z',
            },
          ],
        },
      }),
    );
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Welcome, Ada' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Your permissions' })).toContainText(
      'Manage staff accounts',
    );
    await page.getByRole('link', { name: 'Team' }).first().click();
    await expect(page.getByRole('heading', { name: 'Staff accounts' })).toBeVisible();
    await expect(page.getByText('otto@example.com')).toBeVisible();
    await expect(page.getByText('Never signed in')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/admin-team-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('sign-in page is responsive', async ({ page }, info) => {
    await mockSignedOut(page);
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
    await expect(page.getByText(/register/i)).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/admin-login-${info.project.name}.png`,
      fullPage: true,
    });
  });
});
