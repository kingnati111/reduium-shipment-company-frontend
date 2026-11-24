// Prints a fingerprint of the Shared/ folder (its package.json, tsconfig.json
// and every file under src/). Shared/ is copied identically into both the
// Frontend and the Backend repository: after changing it in one, copy the
// change to the other and check that `npm run shared:hash` prints the same
// value in both.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../Shared');

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const files = [
  join(root, 'package.json'),
  join(root, 'tsconfig.json'),
  ...listFiles(join(root, 'src')),
]
  .map((path) => relative(root, path).split('\\').join('/'))
  .sort();

const hash = createHash('sha256');
for (const file of files) {
  // Line endings are normalised so a Windows checkout gives the same value.
  const text = readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n');
  hash.update(`${file}\n${text.length}\n${text}\n`);
}
console.log(`Shared fingerprint: ${hash.digest('hex').slice(0, 16)} (${files.length} files)`);
