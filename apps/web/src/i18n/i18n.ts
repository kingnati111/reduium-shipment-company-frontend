import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../locales/en/common.json';
import enHome from '../locales/en/home.json';
import enShipment from '../locales/en/shipment.json';
import enSupport from '../locales/en/support.json';
import enTracking from '../locales/en/tracking.json';
import { isPseudoLocale } from './locales';
import { fillPluralForms, pseudoDictionary } from './pseudo';

/**
 * Dictionary "namespaces": one JSON file per area, per language
 * (src/locales/<code>/<namespace>.json). English is built into the main
 * bundle (it's the fallback); every other language is downloaded only when a
 * visitor opens it. An area the admin dashboard needs later becomes another
 * namespace here; nothing else changes.
 */
export const NAMESPACES = ['common', 'home', 'shipment', 'support', 'tracking'] as const;
export type Namespace = (typeof NAMESPACES)[number];

const ENGLISH = {
  common: enCommon,
  home: enHome,
  shipment: enShipment,
  support: enSupport,
  tracking: enTracking,
} satisfies Record<Namespace, unknown>;

// Every non-English dictionary file, each as its own small download.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>([
  '../locales/*/*.json',
  '!../locales/en/*.json',
]);

void i18n.use(initReactI18next).init({
  resources: { en: ENGLISH },
  lng: 'en',
  // A missing translation shows the English text, never a raw key.
  fallbackLng: 'en',
  ns: [...NAMESPACES],
  defaultNS: 'common',
  partialBundledLanguages: true,
  initAsync: false,
  // React already escapes everything it renders: translated text is never HTML.
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

/** Make sure a language's dictionaries are loaded (downloads them once). */
export async function ensureLocaleLoaded(code: string): Promise<void> {
  if (code === 'en') return;
  if (isPseudoLocale(code)) {
    for (const ns of NAMESPACES) {
      if (!i18n.hasResourceBundle(code, ns)) {
        const dictionary = fillPluralForms(pseudoDictionary(ENGLISH[ns]), code);
        i18n.addResourceBundle(code, ns, dictionary, true, true);
      }
    }
    return;
  }
  await Promise.all(
    NAMESPACES.map(async (ns) => {
      if (i18n.hasResourceBundle(code, ns)) return;
      const load = loaders[`../locales/${code}/${ns}.json`];
      if (!load) return; // not translated yet: English is shown for this area
      const { default: dictionary } = await load();
      i18n.addResourceBundle(code, ns, dictionary, true, true);
    }),
  );
}

export { i18n };
