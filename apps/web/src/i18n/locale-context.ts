import type { LocaleInfo } from '@reduium/shared';
import { createContext, useContext } from 'react';
import type { Location } from 'react-router';
import { DEFAULT_LOCALE_INFO } from './locales';

export const LocaleContext = createContext<LocaleInfo>(DEFAULT_LOCALE_INFO);

/** The language of the page being shown. */
export const useLocale = () => useContext(LocaleContext);

/** "/track" → "/es/track"; "/" → "/es/"; "/#track" → "/es/#track". */
export function localizePath(code: string, path: string): string {
  if (path === '/' || path === '') return `/${code}/`;
  if (path.startsWith('/#') || path.startsWith('/?')) return `/${code}/${path.slice(1)}`;
  return `/${code}${path.startsWith('/') ? path : `/${path}`}`;
}

/** A function that puts the current language in front of a site path. */
export function useLocalePath() {
  const { code } = useLocale();
  return (path: string) => localizePath(code, path);
}

/** The same page, query and #anchor in another language. */
export function switchLocaleHref(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  code: string,
) {
  const segments = location.pathname.split('/');
  segments[1] = code;
  const pathname = segments.length > 2 ? segments.join('/') : `/${code}/`;
  return `${pathname}${location.search}${location.hash}`;
}
