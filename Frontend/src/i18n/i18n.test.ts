import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  JOURNEY_PHASES,
  JOURNEY_PHASE_LABELS,
  LOCALES,
  SHIPMENT_STATUSES,
  SHIPPING_METHODS,
  SHIPPING_METHOD_INFO,
  STATUS_INFO,
  SUPPORT_TOPICS,
  SUPPORT_TOPIC_LABELS,
  isSelectable,
} from '@reduium/shared';
import { describe, expect, it } from 'vitest';
import { makeFormatters } from '../features/tracking/format';
import { NAMESPACES, i18n } from './i18n';
import { localizePath, switchLocaleHref } from './locale-context';
import { pseudoString } from './pseudo';

const LOCALES_DIR = join(import.meta.dirname, '..', 'locales');
const read = (code: string, ns: string) =>
  JSON.parse(readFileSync(join(LOCALES_DIR, code, `${ns}.json`), 'utf8')) as Record<
    string,
    unknown
  >;

/** Every "a.b.c" key with its text. */
function flatten(obj: Record<string, unknown>, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      for (const [kk, vv] of flatten(v as Record<string, unknown>, key)) out.set(kk, vv);
    } else out.set(key, v);
  }
  return out;
}

const PLURAL = /_(zero|one|two|few|many|other)$/;
/** "count_one" → "count"; other keys unchanged. */
const baseKey = (key: string) => key.replace(PLURAL, '');
/** {{name}} and {{name, number}} → "name". */
const placeholders = (text: string) =>
  [...text.matchAll(/\{\{\s*(\w+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1]).sort();
/** <code>, </code>, <link/> … (the markers that place elements inside a sentence). */
const tags = (text: string) =>
  [...text.matchAll(/<\/?[a-zA-Z][a-zA-Z0-9]*\s*\/?>/g)].map((m) => m[0]).sort();

describe('addresses with a language', () => {
  it('puts the language in front of site paths', () => {
    expect(localizePath('es', '/')).toBe('/es/');
    expect(localizePath('es', '/#track')).toBe('/es/#track');
    expect(localizePath('pt-BR', '/track/RDM-VGYD-H7Q5-V')).toBe('/pt-BR/track/RDM-VGYD-H7Q5-V');
    expect(localizePath('ar', '/support')).toBe('/ar/support');
  });

  it('switching language keeps the page, tracking number, query and #anchor', () => {
    expect(
      switchLocaleHref(
        { pathname: '/en/track/RDM-VGYD-H7Q5-V', search: '?x=1', hash: '#history' },
        'ja',
      ),
    ).toBe('/ja/track/RDM-VGYD-H7Q5-V?x=1#history');
    expect(switchLocaleHref({ pathname: '/en', search: '', hash: '' }, 'fr')).toBe('/fr/');
    expect(switchLocaleHref({ pathname: '/en/', search: '', hash: '#services' }, 'de')).toBe(
      '/de/#services',
    );
  });
});

describe('dictionaries', () => {
  const english = new Map(NAMESPACES.map((ns) => [ns, flatten(read('en', ns))]));

  it('English has every area, with no empty text', () => {
    for (const [ns, entries] of english) {
      expect(entries.size, ns).toBeGreaterThan(0);
      for (const [key, value] of entries) {
        expect(typeof value === 'string' && value.trim().length > 0, `${ns}:${key}`).toBe(true);
      }
    }
  });

  it('every translation folder belongs to a registered language', () => {
    const codes = new Set(LOCALES.map((l) => l.code));
    for (const folder of readdirSync(LOCALES_DIR)) expect(codes.has(folder), folder).toBe(true);
  });

  it('every language offered to visitors has every dictionary file', () => {
    for (const locale of LOCALES.filter(isSelectable)) {
      for (const ns of NAMESPACES) {
        expect(
          existsSync(join(LOCALES_DIR, locale.code, `${ns}.json`)),
          `${locale.code}/${ns}`,
        ).toBe(true);
      }
    }
  });

  it('translations cover every English key (with their own plural forms), and nothing else', () => {
    for (const folder of readdirSync(LOCALES_DIR).filter((f) => f !== 'en')) {
      // The plural forms this language's grammar needs (Arabic 6, Japanese 1…).
      const categories = new Intl.PluralRules(folder).resolvedOptions().pluralCategories;
      for (const ns of NAMESPACES) {
        if (!existsSync(join(LOCALES_DIR, folder, `${ns}.json`))) continue;
        const translated = flatten(read(folder, ns));
        const source = english.get(ns)!;
        const sourceBases = new Set([...source.keys()].map(baseKey));
        const translatedBases = new Set([...translated.keys()].map(baseKey));
        expect([...translatedBases].sort(), `${folder}/${ns} keys`).toEqual(
          [...sourceBases].sort(),
        );
        for (const base of sourceBases) {
          const isPlural = [...source.keys()].some((k) => PLURAL.test(k) && baseKey(k) === base);
          if (!isPlural) continue;
          for (const c of categories) {
            expect(translated.has(`${base}_${c}`), `${folder}/${ns}:${base}_${c}`).toBe(true);
          }
        }
      }
    }
  });

  it('translations keep the same {{placeholders}} and <tags> as English', () => {
    for (const folder of readdirSync(LOCALES_DIR).filter((f) => f !== 'en')) {
      for (const ns of NAMESPACES) {
        if (!existsSync(join(LOCALES_DIR, folder, `${ns}.json`))) continue;
        const source = english.get(ns)!;
        for (const [key, value] of flatten(read(folder, ns))) {
          // Compare with the English text of the same key (or its "_other" plural).
          const englishText = (source.get(key) ??
            source.get(`${baseKey(key)}_other`) ??
            source.get(baseKey(key))) as string | undefined;
          expect(
            typeof value === 'string' && value.trim().length > 0,
            `${folder}/${ns}:${key}`,
          ).toBe(true);
          if (!englishText) continue;
          // Plural forms like Arabic "one"/"two" are written as words
          // ("تحديث واحد", "تحديثان"), so they may leave out {{count}}. The
          // general "_other" form must still show it.
          const omitsCount = PLURAL.test(key) && !key.endsWith('_other');
          const withoutCount = (list: (string | undefined)[]) =>
            omitsCount ? list.filter((p) => p !== 'count') : list;
          expect(
            withoutCount(placeholders(value as string)),
            `${folder}/${ns}:${key} placeholders`,
          ).toEqual(withoutCount(placeholders(englishText)));
          expect(tags(value as string), `${folder}/${ns}:${key} tags`).toEqual(tags(englishText));
        }
      }
    }
  });

  it('English plurals have both forms English needs (one, other)', () => {
    for (const [ns, entries] of english) {
      const bases = new Set([...entries.keys()].filter((k) => PLURAL.test(k)).map(baseKey));
      for (const base of bases) {
        expect(entries.has(`${base}_one`) && entries.has(`${base}_other`), `${ns}:${base}`).toBe(
          true,
        );
      }
    }
  });
});

describe('shipment vocabulary: translated by code, English identical to the shared definitions', () => {
  const shipment = read('en', 'shipment') as {
    status: Record<string, { label: string; description: string }>;
    method: Record<string, { label: string; summary: string; bestFor: string }>;
    journey: Record<string, string>;
  };
  const support = read('en', 'support') as { topics: Record<string, string> };

  it('every status code has the same English label and description the admin area and API use', () => {
    expect(Object.keys(shipment.status).sort()).toEqual([...SHIPMENT_STATUSES].sort());
    for (const s of SHIPMENT_STATUSES) {
      expect(shipment.status[s], s).toEqual({
        label: STATUS_INFO[s].label,
        description: STATUS_INFO[s].description,
      });
    }
  });

  it('every shipping method, journey stage and support topic matches too', () => {
    for (const m of SHIPPING_METHODS) {
      const { label, summary, bestFor } = SHIPPING_METHOD_INFO[m];
      expect(shipment.method[m], m).toEqual({ label, summary, bestFor });
    }
    for (const p of JOURNEY_PHASES) expect(shipment.journey[p], p).toBe(JOURNEY_PHASE_LABELS[p]);
    for (const topic of SUPPORT_TOPICS) {
      expect(support.topics[topic], topic).toBe(SUPPORT_TOPIC_LABELS[topic]);
    }
  });
});

describe('text with counts and numbers', () => {
  const t = i18n.getFixedT('en', 'tracking');
  it('chooses singular or plural, and formats the number', () => {
    expect(t('history.count', { count: 1 })).toBe('1 update');
    expect(t('history.count', { count: 2 })).toBe('2 updates');
    expect(t('history.count', { count: 1234 })).toBe('1,234 updates');
    expect(t('states.rateLimited.body', { count: 1 })).toMatch(/about 1 minute\.$/);
    expect(t('states.rateLimited.body', { count: 5 })).toMatch(/about 5 minutes\.$/);
  });
  it('fills placeholders and falls back to English for anything untranslated', () => {
    expect(t('announce.found', { trackingNumber: 'RDM-X', status: 'In Transit' })).toBe(
      'Shipment RDM-X found. Status: In Transit.',
    );
    // Hebrew is planned (no translation yet): visitors would see English.
    expect(i18n.getFixedT('he', 'tracking')('heading')).toBe('Track a package');
  });
});

describe('draft translations', () => {
  /**
   * Text that may legitimately be the same as English: names, codes, symbols
   * and words that languages borrow unchanged. Anything else identical to
   * English is probably a forgotten translation.
   */
  const SAME_AS_ENGLISH = new Set([
    'common:footer.copyright', // "© {{year}} {{company}}"
    'common:footer.contact', // "Contact" (French)
    'common:nav.services', // "Services" (French)
    'common:footer.services',
    'home:hero.diagramBadge', // "Illustration" (German)
    'tracking:summary.route', // "Route" (German)
  ]);

  it('the seven launch languages are drafts: offered, never chosen automatically', async () => {
    const { isAutoSelectable } = await import('@reduium/shared');
    for (const code of ['es', 'fr', 'de', 'pt-BR', 'zh-CN', 'ar', 'ja']) {
      const locale = LOCALES.find((l) => l.code === code)!;
      expect(locale.status, code).toBe('draft');
      expect(isSelectable(locale), code).toBe(true);
      expect(isAutoSelectable(locale), code).toBe(false);
    }
  });

  it('no text is accidentally left in English', () => {
    const english = new Map(NAMESPACES.map((ns) => [ns, flatten(read('en', ns))]));
    const leftovers: string[] = [];
    for (const folder of readdirSync(LOCALES_DIR).filter((f) => f !== 'en')) {
      for (const ns of NAMESPACES) {
        if (!existsSync(join(LOCALES_DIR, folder, `${ns}.json`))) continue;
        for (const [key, value] of flatten(read(folder, ns))) {
          const id = `${ns}:${key}`;
          if (english.get(ns)!.get(key) === value && !SAME_AS_ENGLISH.has(id)) {
            leftovers.push(`${folder}/${id}`);
          }
        }
      }
    }
    expect(leftovers).toEqual([]);
  });

  it('chooses the right plural form in each language', () => {
    const ar = i18n.getFixedT('ar', 'tracking');
    const ja = i18n.getFixedT('ja', 'tracking');
    const fr = i18n.getFixedT('fr', 'tracking');
    return Promise.all(
      ['ar', 'ja', 'fr'].map((l) => import('./i18n').then((m) => m.ensureLocaleLoaded(l))),
    ).then(() => {
      expect(ar('history.count', { count: 1 })).toBe('تحديث واحد');
      expect(ar('history.count', { count: 2 })).toBe('تحديثان');
      expect(ar('history.count', { count: 5 })).toMatch(/تحديثات$/);
      expect(ar('history.count', { count: 11 })).toMatch(/تحديثًا$/);
      expect(ja('history.count', { count: 3 })).toBe('更新 3 件');
      expect(fr('history.count', { count: 1 })).toBe('1 mise à jour');
      expect(fr('history.count', { count: 2 })).toBe('2 mises à jour');
    });
  });
});

describe('dates, numbers and country names follow the page language', () => {
  it('formats calendar dates per language, never shifted by time zone', () => {
    expect(makeFormatters('en').calendarDate('2026-12-01')).toMatch(/Dec 1, 2026/);
    expect(makeFormatters('fr').calendarDate('2026-12-01')).toMatch(/1 déc\.? 2026/);
    expect(makeFormatters('de').calendarDate('2026-12-01')).toMatch(/1\. Dez\.? 2026/);
    expect(makeFormatters('ja').calendarDate('2026-12-01')).toMatch(/2026年12月1日/);
    expect(makeFormatters('zh-Hans-CN').calendarDate('2026-12-01')).toMatch(/2026年12月1日/);
  });

  it('names countries in the page language (cities stay as entered)', () => {
    const place = { city: 'Lyon', countryCode: 'FR' };
    expect(makeFormatters('en').placeLabel(place)).toBe('Lyon, France');
    expect(makeFormatters('de').placeLabel(place)).toBe('Lyon, Frankreich');
    expect(makeFormatters('es-419').placeLabel(place)).toBe('Lyon, Francia');
    expect(makeFormatters('ja').placeLabel(place)).toBe('Lyon, フランス');
    expect(makeFormatters('en').countryName('ZZ')).toBeTruthy(); // unknown code: no crash
  });

  it('uses each language’s own digits and date words', () => {
    const iso = '2026-11-20T10:00:00.000Z';
    expect(makeFormatters('en').eventDate(iso)).not.toBe(makeFormatters('ar').eventDate(iso));
    expect(makeFormatters('pt-BR').eventDate(iso)).toMatch(/nov/);
  });
});

describe('pseudo-language (development testing)', () => {
  it('changes the text but keeps {{placeholders}} and <tags> working', () => {
    const out = pseudoString('© {{year}} {{company}}');
    expect(out).not.toBe('© {{year}} {{company}}');
    expect(placeholders(out)).toEqual(['company', 'year']);
    expect(pseudoString('Track')).toMatch(/^\[Ťŕåçķ ~+\]$/);
    const tagged = pseudoString('Type it into the <link>tracking field</link>.');
    expect(tags(tagged)).toEqual(['</link>', '<link>']);
  });
});
