import {
  DEFAULT_LOCALE,
  LOCALES,
  isAutoSelectable,
  isSelectable,
  type LocaleInfo,
} from '@reduium/shared';

/**
 * Development-only "pseudo-languages", used to test the localization
 * machinery before real translations exist. They never reach the production
 * build (import.meta.env.DEV is false there, so this list is empty).
 *
 * - en-XA: every translated string is accented and lengthened, so untranslated
 *   (still hard-coded) English and text that doesn't fit stand out.
 * - ar-XB: the same text, laid out right-to-left, to check RTL layout.
 *
 * Their `match.language` is a value no browser sends, so they are chosen
 * automatically only when a test's browser asks for that exact code.
 */
export const PSEUDO_LOCALES: readonly LocaleInfo[] = import.meta.env.DEV
  ? [
      {
        code: 'en-XA',
        htmlLang: 'en-XA',
        englishName: 'Pseudo-language (accented, longer)',
        nativeName: '[Ƥšéûðö-Éñĝļîšĥ]',
        dir: 'ltr',
        status: 'draft',
        match: { language: 'x-pseudo' },
      },
      {
        code: 'ar-XB',
        htmlLang: 'ar-XB',
        englishName: 'Pseudo-language (right-to-left)',
        nativeName: '[Ƥšéûðö-ŔŤĻ]',
        dir: 'rtl',
        status: 'draft',
        match: { language: 'x-pseudo' },
      },
    ]
  : [];

export const isPseudoLocale = (code: string) => PSEUDO_LOCALES.some((l) => l.code === code);

/** Languages a visitor can open or pick (they have dictionaries). */
export const SELECTABLE_LOCALES: readonly LocaleInfo[] = [
  ...LOCALES.filter(isSelectable),
  ...PSEUDO_LOCALES,
];

/**
 * Languages the site may choose by itself from the browser's settings:
 * English and REVIEWED translations only (drafts never become the default).
 */
export const AUTO_LOCALES: readonly LocaleInfo[] = [
  ...LOCALES.filter(isAutoSelectable),
  ...PSEUDO_LOCALES,
];

export const DEFAULT_LOCALE_INFO = LOCALES.find((l) => l.code === DEFAULT_LOCALE)!;

export const localeInfo = (code: string): LocaleInfo =>
  SELECTABLE_LOCALES.find((l) => l.code === code) ?? DEFAULT_LOCALE_INFO;
