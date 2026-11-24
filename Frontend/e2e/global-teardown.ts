import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const apiDir = resolve(import.meta.dirname, '../../Backend');

/** After the browser tests: switch the test account off and end its sessions. */
export default function globalTeardown() {
  if (!existsSync(resolve(apiDir, '.env')) || process.env.E2E_NO_DB === '1') return;
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/e2e-account.ts', 'disable'], {
    cwd: apiDir,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
