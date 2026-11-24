import type {
  AdminParty,
  AdminShipmentDetail,
  ShipmentCreateInput,
  ShippingMethod,
} from '@reduium/shared';

/** The form's state: everything as strings, exactly as typed. */
export interface PartyForm {
  name: string;
  company: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

export interface ShipmentForm {
  shippingMethod: ShippingMethod;
  sender: PartyForm;
  recipient: PartyForm;
  origin: { city: string; countryCode: string };
  destination: { city: string; countryCode: string };
  pieceCount: string;
  weightKg: string;
  contentsDescription: string;
  estimatedDeliveryDate: string;
  internalNotes: string;
}

const emptyParty = (): PartyForm => ({
  name: '',
  company: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  countryCode: '',
});

export const emptyShipmentForm = (): ShipmentForm => ({
  shippingMethod: 'EXPRESS',
  sender: emptyParty(),
  recipient: emptyParty(),
  origin: { city: '', countryCode: '' },
  destination: { city: '', countryCode: '' },
  pieceCount: '1',
  weightKg: '',
  contentsDescription: '',
  estimatedDeliveryDate: '',
  internalNotes: '',
});

const partyToForm = (p: AdminParty): PartyForm => ({
  name: p.name,
  company: p.company ?? '',
  email: p.email ?? '',
  phone: p.phone ?? '',
  addressLine1: p.addressLine1,
  addressLine2: p.addressLine2 ?? '',
  city: p.city,
  region: p.region ?? '',
  postalCode: p.postalCode ?? '',
  countryCode: p.countryCode,
});

export const shipmentToForm = (s: AdminShipmentDetail): ShipmentForm => ({
  shippingMethod: s.shippingMethod,
  sender: partyToForm(s.sender),
  recipient: partyToForm(s.recipient),
  origin: { ...s.origin },
  destination: { ...s.destination },
  pieceCount: String(s.pieceCount),
  weightKg: s.weightKg === null ? '' : String(s.weightKg),
  contentsDescription: s.contentsDescription ?? '',
  estimatedDeliveryDate: s.estimatedDeliveryDate ?? '',
  internalNotes: s.internalNotes ?? '',
});

/** Form → API input. The server validates everything again. */
export const formToInput = (f: ShipmentForm): ShipmentCreateInput => ({
  shippingMethod: f.shippingMethod,
  sender: { ...f.sender },
  recipient: { ...f.recipient },
  origin: { ...f.origin },
  destination: { ...f.destination },
  pieceCount: f.pieceCount.trim() === '' ? 1 : Number(f.pieceCount),
  weightKg: f.weightKg.trim() === '' ? null : Number(f.weightKg),
  contentsDescription: f.contentsDescription,
  estimatedDeliveryDate: f.estimatedDeliveryDate || null,
  internalNotes: f.internalNotes,
});

const REQUIRED: [string, string][] = [
  ['sender.name', 'Name'],
  ['sender.addressLine1', 'Address line 1'],
  ['sender.city', 'City'],
  ['sender.countryCode', 'Country'],
  ['recipient.name', 'Name'],
  ['recipient.addressLine1', 'Address line 1'],
  ['recipient.city', 'City'],
  ['recipient.countryCode', 'Country'],
  ['origin.city', 'Origin city'],
  ['origin.countryCode', 'Origin country'],
  ['destination.city', 'Destination city'],
  ['destination.countryCode', 'Destination country'],
];

export function getField(f: ShipmentForm, path: string): string {
  return path
    .split('.')
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], f) as string;
}

/** Quick checks for obvious gaps, before a round trip to the server. */
export function quickCheck(f: ShipmentForm): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [path, label] of REQUIRED) {
    if (!getField(f, path).trim()) errors[path] = `${label} is required.`;
  }
  for (const path of [
    'sender.countryCode',
    'recipient.countryCode',
    'origin.countryCode',
    'destination.countryCode',
  ]) {
    const v = getField(f, path).trim();
    if (v && !/^[A-Za-z]{2}$/.test(v)) errors[path] = 'Use a 2-letter country code, e.g. GB or US.';
  }
  return errors;
}

/** Field id in the page, from a path like "sender.name". */
export const fieldId = (path: string) => `field-${path.replace(/\./g, '-')}`;
