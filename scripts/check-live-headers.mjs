// Checks that the LIVE website sends the security headers defined in
// Frontend/security-headers.ts. The headers are configured by hand in the
// hosting dashboard (Render), so they can drift from the code unnoticed; this
// makes the difference visible. Read-only: it only fetches pages.
//
//   npm run check:live                         (checks https://www.reduiumshipment.com)
//   npm run check:live -- https://example.com  (another address)
//
// Exit code 0 = everything matches, 1 = something is missing or different.
import { productionSecurityHeaders } from '../Frontend/security-headers.ts';

const site = (process.argv[2] ?? 'https://www.reduiumshipment.com').replace(/\/+$/, '');
const apiOrigin = 'https://api.reduiumshipment.com';
const expected = {
  ...productionSecurityHeaders(apiOrigin),
  // Not part of security-headers.ts (only meaningful over HTTPS); set on the host.
  'Strict-Transport-Security': 'max-age=31536000',
};

// A normal page, a deep link (served through the rewrite) and a static file.
const paths = ['/en/', '/en/track/RDM-ABCD-2345-R', '/favicon-32.png'];
let problems = 0;

for (const path of paths) {
  const res = await fetch(site + path, { redirect: 'manual' });
  console.log(`\n${path}  →  HTTP ${res.status}`);
  if (res.status !== 200) {
    console.log('  ✗ expected HTTP 200');
    problems++;
  }
  for (const [name, value] of Object.entries(expected)) {
    const actual = res.headers.get(name);
    if (actual === null) {
      console.log(`  ✗ ${name}: missing (expected "${value}")`);
      problems++;
    } else if (name === 'Strict-Transport-Security') {
      // Hosts may send a stronger policy; require at least one year.
      const maxAge = Number(/max-age=(\d+)/i.exec(actual)?.[1] ?? 0);
      const ok = maxAge >= 31536000;
      if (!ok) problems++;
      console.log(`  ${ok ? '✓' : '✗'} ${name}: ${actual}`);
    } else if (actual.trim() !== value) {
      console.log(`  ✗ ${name}: "${actual}" (expected "${value}")`);
      problems++;
    } else {
      console.log(`  ✓ ${name}`);
    }
  }
}

console.log(
  problems === 0
    ? '\nAll security headers match the code.'
    : `\n${problems} problem(s). Fix them in the hosting dashboard (Render → Headers).`,
);
process.exitCode = problems === 0 ? 0 : 1;
