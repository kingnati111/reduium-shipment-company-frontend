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
}

export const company = {
  name: 'Reduium Shipment Company',
  shortName: 'Reduium',
  tagline: 'Every shipment, accounted for.',

  contact: {
    email: { value: 'info@reduiumshipment.com', placeholder: false },
    phone: { value: '+44 113 320 7332', placeholder: false },
    address: { value: '115 Crown Street, London, United Kingdom', placeholder: false },
    hours: { value: '[Support hours: replace before launch]', placeholder: true },
  } satisfies Record<string, CompanyField>,

  legal: {
    registeredName: { value: '[Registered legal entity name]', placeholder: true },
    registrationNumber: { value: '[Company registration number]', placeholder: true },
  } satisfies Record<string, CompanyField>,
} as const;
