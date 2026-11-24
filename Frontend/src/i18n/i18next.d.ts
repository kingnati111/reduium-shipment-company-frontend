import 'i18next';
import type common from '../locales/en/common.json';
import type home from '../locales/en/home.json';
import type shipment from '../locales/en/shipment.json';
import type support from '../locales/en/support.json';
import type tracking from '../locales/en/tracking.json';

/**
 * Type-checks every t('…') call against the English dictionaries, so a
 * misspelled or missing key fails `npm run typecheck` instead of showing a
 * raw key to customers.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      home: typeof home;
      shipment: typeof shipment;
      support: typeof support;
      tracking: typeof tracking;
    };
  }
}
