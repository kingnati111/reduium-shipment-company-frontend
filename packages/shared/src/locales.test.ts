import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  canonicalLocaleCode,
  isAutoSelectable,
  matchBrowserLanguages,
  type LocaleInfo,
} from './locales.js';

/** The registry with every language marked reviewed, to test matching itself. */
const allReviewed: LocaleInfo[] = LOCALES.map((l) => ({ ...l, status: 'reviewed' }));
const pick = (tags: string[], list: readonly LocaleInfo[] = allReviewed) =>
  matchBrowserLanguages(tags, list)?.code ?? null;

describe('language registry', () => {
  it('has the eight launch languages plus the two prepared ones, with unique codes', () => {
    expect(LOCALES.map((l) => l.code)).toEqual([
      'en',
      'es',
      'fr',
      'de',
      'pt-BR',
      'zh-CN',
      'ar',
      'ja',
      'zh-TW',
      'he',
    ]);
    expect(new Set(LOCALES.map((l) => l.code.toLowerCase())).size).toBe(LOCALES.length);
    expect(LOCALES.find((l) => l.code === DEFAULT_LOCALE)?.status).toBe('source');
  });

  it('marks Arabic and Hebrew right-to-left, the rest left-to-right', () => {
    expect(LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['ar', 'he']);
  });

  it('every htmlLang is a valid language tag', () => {
    for (const l of LOCALES) expect(() => new Intl.Locale(l.htmlLang), l.code).not.toThrow();
  });

  it('nothing unreviewed is ever chosen automatically', () => {
    const auto = LOCALES.filter(isAutoSelectable).map((l) => l.code);
    expect(auto).toEqual(['en']); // today: only English, the source language
    for (const status of ['draft', 'planned'] as const) {
      expect(isAutoSelectable({ ...LOCALES[1]!, status })).toBe(false);
    }
  });
});

describe('matching the browser language', () => {
  it('maps regional variants to the supported language', () => {
    expect(pick(['es-MX'])).toBe('es');
    expect(pick(['es-ES'])).toBe('es');
    expect(pick(['pt-PT'])).toBe('pt-BR');
    expect(pick(['de-AT'])).toBe('de');
    expect(pick(['fr-CA'])).toBe('fr');
    expect(pick(['ar-EG'])).toBe('ar');
    expect(pick(['ja-JP'])).toBe('ja');
    expect(pick(['en-GB'])).toBe('en');
  });

  it('keeps Simplified and Traditional Chinese apart', () => {
    expect(pick(['zh-CN'])).toBe('zh-CN');
    expect(pick(['zh-SG'])).toBe('zh-CN');
    expect(pick(['zh-TW'])).toBe('zh-TW');
    expect(pick(['zh-HK'])).toBe('zh-TW');
    expect(pick(['zh'])).toBe('zh-CN'); // plain "zh" means Simplified
    const withoutTraditional = allReviewed.filter((l) => l.code !== 'zh-TW');
    expect(pick(['zh-TW'], withoutTraditional)).toBeNull(); // never Simplified instead
  });

  it('understands the old Hebrew code and walks the preference list in order', () => {
    expect(pick(['iw'])).toBe('he');
    expect(pick(['xx', 'not a tag!', 'fr-BE', 'de'])).toBe('fr');
    expect(pick(['ko-KR', 'ru'])).toBeNull(); // unsupported → caller uses English
  });

  it('only ever picks among the candidates given (e.g. reviewed languages)', () => {
    const auto = LOCALES.filter(isAutoSelectable);
    expect(pick(['ja-JP', 'en-US'], auto)).toBe('en');
    expect(pick(['ja-JP'], auto)).toBeNull();
  });

  it('accepts URL codes in any letter case, and nothing else', () => {
    expect(canonicalLocaleCode('pt-br')).toBe('pt-BR');
    expect(canonicalLocaleCode('ZH-cn')).toBe('zh-CN');
    expect(canonicalLocaleCode('track')).toBeNull();
    expect(canonicalLocaleCode('')).toBeNull();
  });
});
