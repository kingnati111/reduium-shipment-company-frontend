import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The API lives in the separate Backend repository. Set REDUIUM_BACKEND_DIR to
// its folder, or keep it next to this repository as "reduium-backend".
const backendRepo = process.env.REDUIUM_BACKEND_DIR
  ? resolve(process.env.REDUIUM_BACKEND_DIR)
  : resolve(import.meta.dirname, '../../../reduium-backend');
const apiDir = resolve(backendRepo, 'Backend');

/** After the browser tests: switch the test account off and end its sessions. */
export default function globalTeardown() {
  if (!existsSync(resolve(apiDir, '.env')) || process.env.E2E_NO_DB === '1') return;
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/e2e-account.ts', 'disable'], {
    cwd: apiDir,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
