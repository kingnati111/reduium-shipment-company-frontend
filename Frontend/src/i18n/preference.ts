import { canonicalLocaleCode, matchBrowserLanguages } from '@reduium/shared';
import { AUTO_LOCALES, DEFAULT_LOCALE_INFO, SELECTABLE_LOCALES } from './locales';

/**
 * The visitor's chosen language, remembered on this device. Only the language
 * code is stored (nothing personal). Storage can be unavailable (private
 * browsing, blocked site data); everything still works without it.
 */
const KEY = 'reduium.language';

export function readSavedLocale(): string | null {
  try {
    return canonicalLocaleCode(window.localStorage.getItem(KEY), SELECTABLE_LOCALES);
  } catch {
    return null;
  }
}

export function saveLocale(code: string) {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    // Not remembered on this device; the URL still carries the language.
  }
}

/**
 * The language for a visitor arriving without one in the address:
 * 1. the language they chose before on this device, else
 * 2. the best English-or-REVIEWED match for their browser languages, else
 * 3. English.
 */
export function preferredLocale(): string {
  const saved = readSavedLocale();
  if (saved) return saved;
  const browser =
    typeof navigator === 'undefined'
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  return matchBrowserLanguages(browser, AUTO_LOCALES)?.code ?? DEFAULT_LOCALE_INFO.code;
}
