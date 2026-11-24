/**
 * Pseudo-localization (development only): turns "Track a package" into
 * "[Ťŕåçķ å þåçķåĝé ~~~~]". Accents show that the text went through the
 * translation system; the brackets show where a string starts and ends (so
 * clipped text is visible); the extra characters simulate languages that
 * run ~30–40% longer than English (e.g. German).
 */
const ACCENTED: Record<string, string> = {
  a: 'å',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'î',
  j: 'ĵ',
  k: 'ķ',
  l: 'ļ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ö',
  p: 'þ',
  q: 'ǫ',
  r: 'ŕ',
  s: 'š',
  t: 'ť',
  u: 'û',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Å',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Î',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ļ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ö',
  P: 'Þ',
  Q: 'Ǫ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ť',
  U: 'Û',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

/**
 * Pseudo-localize one string, leaving {{placeholders}} and <tags> (used to
 * place links, code and emphasis inside a sentence) untouched.
 */
export function pseudoString(text: string): string {
  const out = text
    .split(/(\{\{[^}]+\}\}|<\/?[a-zA-Z][a-zA-Z0-9]*\s*\/?>)/)
    .map((part) =>
      part.startsWith('{{') || part.startsWith('<')
        ? part
        : [...part].map((ch) => ACCENTED[ch] ?? ch).join(''),
    )
    .join('');
  // Padding in short groups with spaces, so it wraps like real text does.
  const extra = Math.max(1, Math.round(text.length * 0.35));
  const padding = Array.from({ length: Math.ceil(extra / 4) }, (_, i) =>
    '~'.repeat(Math.min(4, extra - i * 4)),
  ).join(' ');
  return `[${out} ${padding}]`;
}

/**
 * Give a pseudo-language every plural form its grammar needs (Arabic: zero,
 * one, two, few, many, other), copied from the "_other" text, so testing in it
 * behaves like a complete real translation instead of falling back to English.
 */
export function fillPluralForms<T>(dictionary: T, locale: string): T {
  if (!dictionary || typeof dictionary !== 'object') return dictionary;
  const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dictionary)) {
    out[key] = fillPluralForms(value, locale);
    if (key.endsWith('_other')) {
      const base = key.slice(0, -'_other'.length);
      for (const c of categories) {
        if (!(`${base}_${c}` in dictionary)) out[`${base}_${c}`] = out[key];
      }
    }
  }
  return out as T;
}

/** Pseudo-localize a whole dictionary (nested objects of strings). */
export function pseudoDictionary<T>(dictionary: T): T {
  if (typeof dictionary === 'string') return pseudoString(dictionary) as T;
  if (dictionary && typeof dictionary === 'object') {
    return Object.fromEntries(
      Object.entries(dictionary).map(([key, value]) => [key, pseudoDictionary(value)]),
    ) as T;
  }
  return dictionary;
}
