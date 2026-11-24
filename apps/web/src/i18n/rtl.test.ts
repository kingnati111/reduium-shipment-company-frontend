import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Right-to-left guard for the CUSTOMER-FACING website (Arabic, Hebrew…).
 *
 * Layout must use "logical" Tailwind classes that follow the reading
 * direction: ms-/me- (margin start/end), ps-/pe-, start-/end-, border-s/-e,
 * rounded-s/-e, text-start/-end. Physical ones (ml-, pl-, left-, border-l,
 * text-left…) stay put when the page flips, so they're flagged here.
 *
 * A physical class that is genuinely direction-independent (e.g. something
 * centred, or off-screen on purpose) can be kept by writing `rtl-ok` in a
 * comment on the same line, with the reason.
 *
 * The admin dashboard is English-only for now and isn't checked.
 */
const SRC = join(import.meta.dirname, '..');
const PUBLIC_ROOTS = [
  'pages/HomePage.tsx',
  'pages/TrackPage.tsx',
  'pages/SupportPage.tsx',
  'pages/NotFoundPage.tsx',
  'features/home',
  'features/tracking',
  'features/support',
  'components',
  'i18n',
  'App.tsx',
];

function files(path: string): string[] {
  const full = join(SRC, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

/** One Tailwind class, with any variants (sm:, hover:, group-hover:…) in front. */
const PHYSICAL =
  /^(?:[\w-]+:|\[[^\]]+\]:)*-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|text-left|text-right|float-left|float-right|origin-left|origin-right|scroll-ml|scroll-mr|scroll-pl|scroll-pr|bg-linear-to-l|bg-linear-to-r|translate-x|space-x|divide-x)(?:-|$)/;

function physicalClasses() {
  const found: string[] = [];
  const sources = PUBLIC_ROOTS.flatMap(files).filter(
    (f) => /\.(tsx?|ts)$/.test(f) && !f.endsWith('.test.ts'),
  );
  for (const file of sources) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('rtl-ok')) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments
      // Class lists live in string literals: '…', "…", `…`.
      for (const m of line.matchAll(/(['"`])((?:(?!\1).)*)\1/g)) {
        for (const token of m[2]!.split(/\s+/)) {
          if (PHYSICAL.test(token)) {
            found.push(`${relative(SRC, file).replace(/\\/g, '/')}:${i + 1}  ${token}`);
          }
        }
      }
    });
  }
  return found;
}

describe('right-to-left layout', () => {
  it('customer-facing layout uses direction-aware (logical) classes only', () => {
    expect(physicalClasses()).toEqual([]);
  });
});
