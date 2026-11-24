/**
 * Languages of the customer-facing website: the single list to edit when a
 * language is added or its translation is reviewed.
 *
 * Adding a language = one entry here + its dictionary files in
 * apps/web/src/locales/<code>/. Nothing else needs to change.
 *
 * Translation status (internal; never shown to visitors as a quality claim):
 * - 'source'   English, the language the text is written in.
 * - 'reviewed' translated AND checked by a native speaker.
 * - 'draft'    translated, NOT yet reviewed by a native speaker.
 * - 'planned'  no dictionary yet; not offered to visitors.
 *
 * Only 'source' and 'reviewed' languages are ever chosen AUTOMATICALLY (from
 * the visitor's browser). A 'draft' language is shown only when a visitor
 * picks it, or follows a link to it.
 */
export type TranslationStatus = 'source' | 'reviewed' | 'draft' | 'planned';

export interface LocaleInfo {
  /** URL prefix, e.g. /pt-BR/track/…; also the dictionary folder name. */
  code: string;
  /** BCP 47 tag for <html lang> and for date/number formatting. */
  htmlLang: string;
  /** English name, for staff and code. */
  englishName: string;
  /** Name in the language itself, shown in the language selector. */
  nativeName: string;
  dir: 'ltr' | 'rtl';
  status: TranslationStatus;
  /**
   * Which browser languages this covers: the language subtag, and (where it
   * matters) the writing system. Chinese Simplified (Hans) and Traditional
   * (Hant) are different audiences, so neither is offered for the other.
   */
  match: { language: string; script?: string };
}

export const LOCALES: readonly LocaleInfo[] = [
  {
    code: 'en',
    htmlLang: 'en',
    englishName: 'English',
    nativeName: 'English',
    dir: 'ltr',
    status: 'source',
    match: { language: 'en' },
  },
  {
    code: 'es',
    htmlLang: 'es-419',
    englishName: 'Spanish (Latin America)',
    nativeName: 'Español (Latinoamérica)',
    dir: 'ltr',
    status: 'draft',
    match: { language: 'es' },
  },
  {
    code: 'fr',
    htmlLang: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    dir: 'ltr',
    status: 'draft',
    match: { language: 'fr' },
  },
  {
    code: 'de',
    htmlLang: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    dir: 'ltr',
    status: 'draft',
    match: { language: 'de' },
  },
  {
    code: 'pt-BR',
    htmlLang: 'pt-BR',
    englishName: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    dir: 'ltr',
    status: 'draft',
    match: { language: 'pt' },
  },
  {
    code: 'zh-CN',
    htmlLang: 'zh-Hans-CN',
    englishName: 'Chinese (Simplified)',
    nativeName: '简体中文',
    dir: 'ltr',
    status: 'draft',
    match: { language: 'zh', script: 'Hans' },
  },
  {
    code: 'ar',
    htmlLang: 'ar',
    englishName: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl',
    status: 'draft',
    match: { language: 'ar' },
  },
  {
    code: 'ja',
    htmlLang: 'ja',
    englishName: 'Japanese',
    nativeName: '日本語',
    dir: 'ltr',
    status: 'draft',
    match: { language: 'ja' },
  },
  // Ready to add: give each a dictionary, then change its status.
  {
    code: 'zh-TW',
    htmlLang: 'zh-Hant-TW',
    englishName: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    dir: 'ltr',
    status: 'planned',
    match: { language: 'zh', script: 'Hant' },
  },
  {
    code: 'he',
    htmlLang: 'he',
    englishName: 'Hebrew',
    nativeName: 'עברית',
    dir: 'rtl',
    status: 'planned',
    match: { language: 'he' },
  },
];

export const DEFAULT_LOCALE = 'en';

/** Languages a visitor can choose (they have dictionaries). */
export const isSelectable = (l: LocaleInfo) => l.status !== 'planned';
/** Languages that may be chosen automatically from the browser's settings. */
export const isAutoSelectable = (l: LocaleInfo) => l.status === 'source' || l.status === 'reviewed';

/** "pt-br" or "PT-BR" → the registered code "pt-BR"; null if not a known language. */
export function canonicalLocaleCode(
  value: string | null | undefined,
  locales: readonly LocaleInfo[] = LOCALES,
): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return locales.find((l) => l.code.toLowerCase() === lower)?.code ?? null;
}

function parseTag(tag: string): { language: string; script?: string; tag: string } | null {
  try {
    // maximize() fills in the usual script: zh-TW → zh-Hant-TW, zh-CN → zh-Hans-CN.
    const locale = new Intl.Locale(tag).maximize();
    return { language: locale.language, script: locale.script, tag: locale.baseName };
  } catch {
    return null; // not a valid language tag
  }
}

/**
 * The best language for a visitor's browser settings (navigator.languages, in
 * order of preference), among `candidates`. An exact code match wins (en-XA →
 * en-XA); otherwise the first candidate with the same language (and writing
 * system, where one is specified) wins: es-MX → es, pt-PT → pt-BR, de-AT → de.
 * Returns null when nothing fits; the caller then uses English.
 */
export function matchBrowserLanguages(
  browserTags: readonly string[],
  candidates: readonly LocaleInfo[],
): LocaleInfo | null {
  for (const raw of browserTags) {
    const exact = canonicalLocaleCode(raw, candidates);
    if (exact) return candidates.find((l) => l.code === exact)!;
    const parsed = parseTag(raw);
    if (!parsed) continue;
    const found = candidates.find(
      (l) =>
        l.match.language === parsed.language &&
        (!l.match.script || l.match.script === parsed.script),
    );
    if (found) return found;
  }
  return null;
}
