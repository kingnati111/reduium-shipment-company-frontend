import { useMemo } from 'react';
import { useLocale } from '../../i18n/locale-context';

/**
 * Date, number and place formatting for the tracking page, in the language
 * of the page (e.g. "1 Dec 2026" in English, "1 déc. 2026" in French,
 * "2026年12月1日" in Japanese).
 *
 * Event times are shown in the VISITOR'S time zone, with the zone named, so
 * "14:05 GMT" can't be misread. Estimated delivery is a calendar date with no
 * time, so it's shown exactly as stored, never shifted by a time zone.
 */
export function makeFormatters(locale: string) {
  const eventDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const eventTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const eventDateTime = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const calendarDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames([locale, 'en'], { type: 'region' });
  } catch {
    regionNames = null;
  }
  const countryName = (code: string) => {
    try {
      return regionNames?.of(code) ?? code;
    } catch {
      return code;
    }
  };

  return {
    eventDate: (iso: string) => eventDate.format(new Date(iso)),
    eventTime: (iso: string) => eventTime.format(new Date(iso)),
    eventDateTime: (iso: string) => eventDateTime.format(new Date(iso)),
    /** "2026-12-01" → "Tue, 1 Dec 2026" (never shifted by time zone). */
    calendarDate: (isoDate: string) => calendarDate.format(new Date(`${isoDate}T00:00:00Z`)),
    /** "FR" → "France" / "Frankreich" / "法国" (the city stays as entered). */
    countryName,
    placeLabel: (place: { city: string; countryCode: string }) =>
      `${place.city}, ${countryName(place.countryCode)}`,
  };
}

export type Formatters = ReturnType<typeof makeFormatters>;

/** The formatters for the language of the page being shown. */
export function useFormatters(): Formatters {
  const { htmlLang } = useLocale();
  return useMemo(() => makeFormatters(htmlLang), [htmlLang]);
}

/** The visitor's time zone name, e.g. "Europe/London". */
export function visitorTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
