import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The API lives in the separate Backend repository. Set REDUIUM_BACKEND_DIR to
// its folder, or keep it next to this repository as "reduium-backend".
const backendRepo = process.env.REDUIUM_BACKEND_DIR
  ? resolve(process.env.REDUIUM_BACKEND_DIR)
  : resolve(import.meta.dirname, '../../../reduium-backend');
const apiDir = resolve(backendRepo, 'Backend');
export const E2E_ADMIN_EMAIL = 'e2e-browser-tests@example.invalid';

/**
 * Before the browser tests: switch on the dedicated test account with a
 * fresh random password. The password lives only in this test run's memory
 * (an environment variable the test workers inherit). It is never printed or
 * written to disk. See Backend/scripts/e2e-account.ts in the Backend repository.
 *
 * Without the Backend repository's Backend/.env (no database configured), the real sign-in tests are
 * skipped and the rest still run.
 */
export default function globalSetup() {
  if (!existsSync(resolve(apiDir, '.env'))) {
    console.warn(
      '\n⚠ Backend/.env (in the Backend repository) was not found: real sign-in browser tests will be skipped.\n',
    );
    return;
  }
  // E2E_NO_DB=1: run the browser tests without the test account, so nothing
  // is written to the database (e.g. before a pending migration has been
  // applied). Real sign-in tests skip; public tracking tests still READ the
  // sample shipments through the dev server.
  if (process.env.E2E_NO_DB === '1') {
    console.warn(
      '\n⚠ E2E_NO_DB=1: the test account is not switched on; real sign-in tests skip.\n',
    );
    return;
  }
  const password = randomBytes(32).toString('base64url');
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/e2e-account.ts', 'enable'], {
    cwd: apiDir,
    env: { ...process.env, E2E_ADMIN_PASSWORD: password },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  process.env.E2E_ADMIN_EMAIL = E2E_ADMIN_EMAIL;
  process.env.E2E_ADMIN_PASSWORD = password;
}
