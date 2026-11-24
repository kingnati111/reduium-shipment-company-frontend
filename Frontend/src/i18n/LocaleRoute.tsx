import { canonicalLocaleCode, type LocaleInfo } from '@reduium/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ensureLocaleLoaded, i18n } from './i18n';
import { LocaleContext, localizePath, switchLocaleHref } from './locale-context';
import { DEFAULT_LOCALE_INFO, SELECTABLE_LOCALES, localeInfo } from './locales';
import { preferredLocale } from './preference';

/**
 * An address without a language (old links such as /track/RDM-…, or the
 * bare domain): send the visitor to the same page, query and #anchor in
 * their language. The tracking number is never lost.
 */
export function RedirectToLocale() {
  const { pathname, search, hash } = useLocation();
  return <Navigate replace to={`${localizePath(preferredLocale(), pathname)}${search}${hash}`} />;
}

/**
 * Wraps every public page. The language is the first part of the address
 * (/es/track/…), which the router only accepts for supported languages, so
 * /admin/… can never be mistaken for one. Checks the letter case, loads the
 * language's dictionaries, sets the page's language and direction
 * (right-to-left for Arabic), then shows the page. This layout stays in place
 * when the language changes, so the header (and keyboard focus) don't jump.
 */
export function LocaleLayout() {
  const location = useLocation();
  const segment = location.pathname.split('/')[1] ?? '';
  const code = canonicalLocaleCode(segment, SELECTABLE_LOCALES);

  if (!code) return <RedirectToLocale />; // (not reachable through the router; defensive)
  // Right language, wrong letter case (/PT-br/…): use the canonical address.
  if (code !== segment) return <Navigate replace to={switchLocaleHref(location, code)} />;
  return <LocaleReady locale={localeInfo(code)} />;
}

function LocaleReady({ locale }: { locale: LocaleInfo }) {
  const [shown, setShown] = useState<LocaleInfo | null>(
    locale.code === 'en' ? DEFAULT_LOCALE_INFO : null,
  );

  useEffect(() => {
    let current = true;
    void ensureLocaleLoaded(locale.code)
      .then(() => i18n.changeLanguage(locale.code))
      .then(() => {
        if (current) setShown(locale);
      });
    return () => {
      current = false;
    };
  }, [locale]);

  useEffect(() => {
    if (!shown) return;
    document.documentElement.lang = shown.htmlLang;
    document.documentElement.dir = shown.dir;
  }, [shown]);

  // Before the first language is ready, show nothing (a fraction of a second,
  // only for non-English). When switching, the old text stays until the new
  // dictionary has arrived, so the page (and keyboard focus) never jumps.
  if (!shown) return null;
  return (
    <LocaleContext.Provider value={shown}>
      <Outlet />
    </LocaleContext.Provider>
  );
}

/** The admin dashboard is English (for now): make sure the page says so. */
export function EnglishDocument({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    void i18n.changeLanguage('en');
  }, []);
  return <>{children}</>;
}
