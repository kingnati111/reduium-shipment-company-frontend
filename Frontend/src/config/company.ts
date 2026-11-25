/**
 * Company details shown across the website.
 *
 * ⚠ PLACEHOLDERS: every field marked `placeholder: true` must be replaced
 * with real business information before launch. Edit only this file and the
 * whole site updates. The site shows a visible "placeholder" marker next to
 * any value still flagged here.
 */

export interface CompanyField {
  value: string;
  placeholder: boolean;
  /**
   * For details that are a phrase rather than data (e.g. opening hours): the
   * common.json key holding the text in each language. `value` is the English
   * reference. Names, numbers and addresses have no key and are never translated.
   */
  translationKey?: 'company.supportHours';
}

export const company = {
  name: 'Reduium Shipment Company',
  shortName: 'Reduium',
  tagline: 'Every shipment, accounted for.',

  contact: {
    email: { value: 'info@reduiumshipment.com', placeholder: false },
    phone: { value: '+44 113 320 7332', placeholder: false },
    address: { value: '115 Crown Street, London, United Kingdom', placeholder: false },
    hours: {
      value: '24 hours a day, 7 days a week',
      placeholder: false,
      translationKey: 'company.supportHours',
    },
  } satisfies Record<string, CompanyField>,

  // Shown in the footer. A detail set to null isn't available yet and is
  // simply not shown (no placeholder marker on the public site).
  legal: {
    registeredName: { value: 'Reduium Shipment Ltd', placeholder: false },
    // Companies House registration number: add it here once available.
    registrationNumber: null,
  } satisfies Record<string, CompanyField | null>,
} as const;
