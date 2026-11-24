/**
 * Zod validation schemas: the server-side rules for everything stored in the
 * database. The API validates every input with these before touching it.
 *
 * Kept in their own file so the public website bundle (which only needs the
 * simple checks in tracking-number.ts) doesn't have to ship the Zod library.
 */
import { z } from 'zod';
import { SHIPMENT_SORTS, SHIPMENT_VIEWS } from './admin-shipments.js';
import { ADMIN_ROLES } from './permissions.js';
import { SHIPPING_METHODS } from './shipping-methods.js';
import { SHIPMENT_STATUSES } from './statuses.js';
import {
  SUPPORT_PRIORITIES,
  SUPPORT_SORTS,
  SUPPORT_STATUSES,
  SUPPORT_TOPICS,
  SUPPORT_VIEWS,
} from './support.js';
import { normalizeTrackingNumber, TRACKING_NUMBER_ERROR } from './tracking-number.js';

/** Treat "" (an empty query-string value) as "not given". */
function blankToUndefinedValue(v: unknown) {
  return v === '' || v === null ? undefined : v;
}

/** Accepts loose input, outputs the canonical tracking number. */
export const trackingNumberSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a tracking number.')
  .max(32, TRACKING_NUMBER_ERROR)
  .transform((value, ctx) => {
    const normalized = normalizeTrackingNumber(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: TRACKING_NUMBER_ERROR });
      return z.NEVER;
    }
    return normalized;
  });

// ── Building blocks ──────────────────────────────────────────────────────────

/** Required text: trimmed, not blank, length-capped to match the database column. */
const text = (max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

/** Optional text: blank becomes null, so "" is never stored. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((v) => (v === '' ? null : v))
    .nullish()
    .transform((v) => v ?? null);

export const emailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .max(254, 'Email must be 254 characters or fewer.')
  .pipe(z.email('Enter a valid email address.'));

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullish()
  .transform((v) => v ?? null)
  .pipe(emailSchema.nullable());

const optionalPhone = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullish()
  .transform((v) => v ?? null)
  .pipe(
    z
      .string()
      .regex(/^\+?[0-9][0-9 ().-]{4,30}$/, 'Enter a valid phone number, e.g. +44 20 7946 0000.')
      .nullable(),
  );

export const countryCodeSchema = z
  .string({ error: 'Country is required.' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Use a 2-letter country code, e.g. GB or US.');

/** Calendar date as YYYY-MM-DD (no time zone ambiguity). */
const isoDate = z.iso.date('Use the date format YYYY-MM-DD.');

// ── Shipments ────────────────────────────────────────────────────────────────

/** A sender or recipient. All of this is PRIVATE and never shown publicly. */
export const partySchema = z.object({
  name: text(120, 'Name'),
  company: optionalText(120, 'Company'),
  email: optionalEmail,
  phone: optionalPhone,
  addressLine1: text(200, 'Address line 1'),
  addressLine2: optionalText(200, 'Address line 2'),
  city: text(100, 'City'),
  region: optionalText(100, 'Region'),
  postalCode: optionalText(20, 'Postal code'),
  countryCode: countryCodeSchema,
});
export type PartyInput = z.input<typeof partySchema>;

/** A city-level place. PUBLIC: shown on the tracking page. */
export const placeSchema = z.object({
  city: text(100, 'City'),
  countryCode: countryCodeSchema,
});

export const shipmentCreateSchema = z.object({
  shippingMethod: z.enum(SHIPPING_METHODS, 'Choose a shipping method.'),
  sender: partySchema,
  recipient: partySchema,
  origin: placeSchema,
  destination: placeSchema,
  pieceCount: z.coerce
    .number()
    .int('Pieces must be a whole number.')
    .min(1, 'At least 1 piece.')
    .max(9999, 'At most 9,999 pieces.')
    .default(1),
  weightKg: z.coerce
    .number()
    .positive('Weight must be more than 0.')
    .max(1_000_000, 'Weight is too large.')
    .nullish()
    .transform((v) => v ?? null),
  contentsDescription: optionalText(500, 'Contents description'),
  estimatedDeliveryDate: isoDate.nullish().transform((v) => v ?? null),
  internalNotes: optionalText(5000, 'Internal notes'),
});
export type ShipmentCreateInput = z.input<typeof shipmentCreateSchema>;
export type ShipmentCreateData = z.output<typeof shipmentCreateSchema>;

export const trackingEventCreateSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES, 'Choose a status.'),
  /** PUBLIC. A facility or city, never a street address. */
  location: text(160, 'Location'),
  /** PUBLIC. */
  description: text(500, 'Description'),
  occurredAt: z.coerce.date('Enter when this happened.'),
});
export type TrackingEventCreateInput = z.input<typeof trackingEventCreateSchema>;

// ── Customer support ─────────────────────────────────────────────────────────

export const supportRequestCreateSchema = z.object({
  name: text(120, 'Name'),
  email: emailSchema,
  phone: optionalPhone,
  trackingNumber: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullish()
    .transform((v) => v ?? null)
    .pipe(trackingNumberSchema.nullable()),
  topic: z.enum(SUPPORT_TOPICS, { error: 'Choose what your message is about.' }),
  subject: text(160, 'Subject'),
  message: z
    .string({ error: 'Message is required.' })
    .trim()
    .min(10, 'Please write at least 10 characters.')
    .max(5000, 'Message must be 5,000 characters or fewer.'),
});
export type SupportRequestCreateInput = z.input<typeof supportRequestCreateSchema>;

// ── Admin: support management ────────────────────────────────────────────────

const uuid = z.uuid('Choose a staff member from the list.');

/** Query string of GET /api/admin/support. */
export const supportListQuerySchema = z.object({
  q: z.preprocess(blankToUndefinedValue, z.string().trim().max(100).optional()),
  status: z.preprocess(blankToUndefinedValue, z.enum(SUPPORT_STATUSES).optional()),
  topic: z.preprocess(blankToUndefinedValue, z.enum(SUPPORT_TOPICS).optional()),
  priority: z.preprocess(blankToUndefinedValue, z.enum(SUPPORT_PRIORITIES).optional()),
  view: z.preprocess(blankToUndefinedValue, z.enum(SUPPORT_VIEWS).default('open')),
  sort: z.preprocess(blankToUndefinedValue, z.enum(SUPPORT_SORTS).default('newest')),
  page: z.preprocess(blankToUndefinedValue, z.coerce.number().int().min(1).max(10_000).default(1)),
  pageSize: z.preprocess(
    blankToUndefinedValue,
    z.coerce.number().int().min(1).max(100).default(25),
  ),
});
export type SupportListQuery = z.output<typeof supportListQuerySchema>;

/**
 * Change status, priority and/or assignee. The editor sends back the
 * updatedAt it started from, so a change made by someone else in the
 * meantime is never silently overwritten.
 */
export const supportUpdateSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime({ offset: true, error: 'Reload the request and try again.' }),
    status: z.enum(SUPPORT_STATUSES).optional(),
    priority: z.enum(SUPPORT_PRIORITIES).optional(),
    /** A staff member's id, or null to unassign. */
    assignedToId: uuid.nullable().optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.priority !== undefined || v.assignedToId !== undefined,
    {
      message: 'Nothing to change.',
      path: ['status'],
    },
  );
export type SupportUpdateInput = z.input<typeof supportUpdateSchema>;

const supportText = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(5000, `${label} must be 5,000 characters or fewer.`);

/** Internal note: staff only, never shown to the customer. */
export const supportNoteSchema = z.object({ body: supportText('Note') });
export type SupportNoteInput = z.input<typeof supportNoteSchema>;

/**
 * A reply the staff member sends from their OWN email program. Reduium only
 * records it; it does not send email.
 */
export const supportReplySchema = z.object({
  body: supportText('Reply'),
  /** Also set the status to "Waiting on customer". */
  markWaiting: z.boolean().default(false),
});
export type SupportReplyInput = z.input<typeof supportReplySchema>;

/** Permanent deletion must be confirmed by typing the reference. */
export const supportDeleteSchema = z.object({
  confirmReference: z
    .string({ error: 'Type the reference to confirm.' })
    .trim()
    .toUpperCase()
    .max(32),
});

// ── Admin accounts ───────────────────────────────────────────────────────────

/**
 * Password rules: length matters, composition rules ("1 upper, 1 symbol")
 * don't (NIST SP 800-63B). The 6-character minimum was chosen by the owner
 * (2026-11-22); it is shorter than NIST's guidance, so the sign-in rate
 * limits and account lockout are what slow down guessing. 128 max so hashing
 * can't be used for DoS.
 */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string({ error: 'Password is required.' })
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`)
  .refine((p) => new Set(p).size >= 5, 'Password is too repetitive.')
  .refine(
    (p) => !/(password|reduium|qwerty|123456|letmein|admin)/i.test(p),
    'Password contains a common word or pattern. Try a longer passphrase.',
  );

export const adminCreateSchema = z
  .object({
    name: text(120, 'Name'),
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(ADMIN_ROLES).default('OPERATOR'),
  })
  .refine(
    (a) => {
      // Only meaningful for names of 4+ characters: a@x.com mustn't ban the letter "a".
      const local = a.email.split('@')[0] ?? '';
      return local.length < 4 || !a.password.toLowerCase().includes(local);
    },
    {
      path: ['password'],
      message: 'Password must not contain your email name.',
    },
  );
export type AdminCreateInput = z.input<typeof adminCreateSchema>;

/**
 * Login form. Only presence and a length cap are checked here. The password
 * POLICY applies when accounts are created, not at login, so the error for a
 * wrong password never hints at what the rules are.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'Enter your password.' })
    .min(1, 'Enter your password.')
    .max(PASSWORD_MAX_LENGTH, 'Enter your password.'),
});
export type LoginInput = z.input<typeof loginSchema>;

// ── Admin: shipment management ───────────────────────────────────────────────

/** Saving edits: the full editable form, plus the version the editor started from. */
export const shipmentUpdateSchema = shipmentCreateSchema.extend({
  expectedUpdatedAt: z.iso.datetime({ offset: true, error: 'Reload the shipment and try again.' }),
});
export type ShipmentUpdateInput = z.input<typeof shipmentUpdateSchema>;

export const trackingEventUpdateSchema = trackingEventCreateSchema;
export type TrackingEventUpdateInput = z.input<typeof trackingEventUpdateSchema>;

/** Permanent deletion must be confirmed by typing the tracking number. */
export const shipmentDeleteSchema = z.object({
  confirmTrackingNumber: z
    .string({ error: 'Type the tracking number to confirm.' })
    .trim()
    .toUpperCase()
    .max(32),
});

const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

/** Query string of GET /api/admin/shipments. */
export const shipmentListQuerySchema = z.object({
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  status: z.preprocess(blankToUndefined, z.enum(SHIPMENT_STATUSES).optional()),
  method: z.preprocess(blankToUndefined, z.enum(SHIPPING_METHODS).optional()),
  view: z.preprocess(blankToUndefined, z.enum(SHIPMENT_VIEWS).default('in_progress')),
  sort: z.preprocess(blankToUndefined, z.enum(SHIPMENT_SORTS).default('updated')),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(10_000).default(1)),
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(25)),
});
export type ShipmentListQuery = z.output<typeof shipmentListQuerySchema>;
