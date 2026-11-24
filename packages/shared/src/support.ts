/**
 * Customer support (Stage 7): statuses, topics, priorities, the customer
 * reference format, and the shapes the API returns.
 *
 * No Zod here (see schemas.ts), so the public website can use these labels
 * without downloading the validation library.
 */
import type { StatusTone } from './statuses.js';
import { TRACKING_ALPHABET } from './tracking-number.js';

// ── Statuses ─────────────────────────────────────────────────────────────────

/**
 * Must match the SupportRequestStatus enum in apps/api/prisma/schema.prisma
 * AND the status list in the timeline CHECK constraint of migration
 * 20261123000000_support_management (a test checks both).
 */
export const SUPPORT_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_INFO: Record<
  SupportStatus,
  { label: string; description: string; tone: StatusTone }
> = {
  NEW: { label: 'New', description: 'Nobody has picked it up yet.', tone: 'caution' },
  IN_PROGRESS: { label: 'In progress', description: 'Someone is working on it.', tone: 'progress' },
  WAITING_ON_CUSTOMER: {
    label: 'Waiting on customer',
    description: 'We replied and need more from the customer.',
    tone: 'neutral',
  },
  RESOLVED: {
    label: 'Resolved',
    description: 'Answered or fixed. Can be reopened.',
    tone: 'success',
  },
  CLOSED: {
    label: 'Closed',
    description: 'Finished. Read-only until a staff member reopens it.',
    tone: 'neutral',
  },
};

/** Statuses that still need work. */
export const OPEN_SUPPORT_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
] as const satisfies readonly SupportStatus[];

export const isOpenSupportStatus = (s: SupportStatus) =>
  (OPEN_SUPPORT_STATUSES as readonly SupportStatus[]).includes(s);

// ── Topics and priorities ────────────────────────────────────────────────────

/** Must match the SupportTopic enum in the Prisma schema. */
export const SUPPORT_TOPICS = [
  'TRACKING',
  'DELIVERY_PROBLEM',
  'DAMAGED_OR_MISSING',
  'BILLING',
  'OTHER',
] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_TOPIC_LABELS: Record<SupportTopic, string> = {
  TRACKING: 'A tracking question',
  DELIVERY_PROBLEM: 'A delivery problem',
  DAMAGED_OR_MISSING: 'A damaged or missing item',
  BILLING: 'Billing',
  OTHER: 'Something else',
};

/** Must match the SupportPriority enum AND the priority list in the timeline CHECK constraint. */
export const SUPPORT_PRIORITIES = ['NORMAL', 'URGENT'] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
};

/** Must match the SupportActivityType enum in the Prisma schema. */
export const SUPPORT_ACTIVITY_TYPES = [
  'INTERNAL_NOTE',
  'REPLY_RECORDED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'ASSIGNMENT_CHANGED',
] as const;
export type SupportActivityType = (typeof SUPPORT_ACTIVITY_TYPES)[number];

// ── Inbox views ──────────────────────────────────────────────────────────────

export const SUPPORT_VIEWS = [
  'open',
  'unassigned',
  'mine',
  'waiting',
  'resolved',
  'closed',
  'all',
] as const;
export type SupportView = (typeof SUPPORT_VIEWS)[number];

export const SUPPORT_VIEW_LABELS: Record<SupportView, string> = {
  open: 'Open',
  unassigned: 'Unassigned',
  mine: 'Assigned to me',
  waiting: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
  all: 'All',
};

export const SUPPORT_SORTS = ['newest', 'oldest', 'activity'] as const;
export type SupportSort = (typeof SUPPORT_SORTS)[number];

// ── Customer reference ───────────────────────────────────────────────────────

/**
 * SUP-XXXX-XXXX, from the same no-look-alike alphabet as tracking numbers.
 * A label for the customer to quote, NOT a secret: knowing it gives no
 * access to anything (the request is only visible to signed-in staff).
 */
export const SUPPORT_REFERENCE_PREFIX = 'SUP';
const REFERENCE_BODY_LENGTH = 8;
const REFERENCE_PATTERN = /^SUP-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/;

/** `randomIndex(max)` must be a cryptographically secure integer in [0, max). */
export function generateSupportReference(randomIndex: (max: number) => number): string {
  let body = '';
  for (let i = 0; i < REFERENCE_BODY_LENGTH; i++) {
    body += TRACKING_ALPHABET[randomIndex(TRACKING_ALPHABET.length)]!;
  }
  return `${SUPPORT_REFERENCE_PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** "sup 7k3m qx9p" → "SUP-7K3M-QX9P", or null if it isn't a valid reference. */
export function normalizeSupportReference(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, '');
  if (!compact.startsWith(SUPPORT_REFERENCE_PREFIX)) return null;
  const body = compact.slice(SUPPORT_REFERENCE_PREFIX.length);
  const formatted = `${SUPPORT_REFERENCE_PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`;
  return body.length === REFERENCE_BODY_LENGTH && REFERENCE_PATTERN.test(formatted)
    ? formatted
    : null;
}

/**
 * Name of the hidden "spam trap" field on the public form. People never see
 * or fill it; simple bots fill every field. A submission with it filled is
 * refused with an honest error (never a fake success).
 */
export const SUPPORT_HONEYPOT_FIELD = 'website';

// ── API shapes ───────────────────────────────────────────────────────────────

/** What the public form gets back. Never the stored request itself. */
export interface SupportRequestReceipt {
  reference: string;
  receivedAt: string;
}

export interface SupportStaffRef {
  id: string;
  name: string;
  /** True when the account has since been disabled. */
  disabled: boolean;
}

/** One row in the inbox. */
export interface AdminSupportSummary {
  id: string;
  reference: string;
  name: string;
  email: string;
  subject: string;
  /** First ~160 characters of the message, for scanning the list. */
  preview: string;
  topic: SupportTopic;
  status: SupportStatus;
  priority: SupportPriority;
  trackingNumber: string | null;
  assignee: SupportStaffRef | null;
  isTestData: boolean;
  createdAt: string;
  lastActivityAt: string;
}

export interface AdminSupportList {
  items: AdminSupportSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSupportStats {
  /** NEW, IN_PROGRESS or WAITING_ON_CUSTOMER. */
  open: number;
  new: number;
  /** Open and nobody (active) is assigned. */
  unassigned: number;
  /** Open and assigned to the signed-in staff member. */
  mine: number;
  waiting: number;
  urgent: number;
  /** The open requests that have waited longest. */
  oldestOpen: AdminSupportSummary[];
}

/** A staff member who can be assigned support requests. */
export interface SupportAssigneeOption {
  id: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
}

/**
 * One entry in a request's timeline. INTERNAL_NOTE is staff-only.
 * REPLY_RECORDED means a staff member wrote a reply and sent it from their
 * OWN email program: Reduium did not send any email.
 */
export interface AdminSupportActivity {
  id: string;
  type: SupportActivityType;
  body: string | null;
  fromValue: string | null;
  toValue: string | null;
  assignee: SupportStaffRef | null;
  /** Null = recorded by the system (e.g. notes carried over by a migration). */
  actor: { name: string } | null;
  createdAt: string;
}

export interface AdminSupportDetail extends AdminSupportSummary {
  phone: string | null;
  message: string;
  resolvedAt: string | null;
  closedAt: string | null;
  /** Send back as expectedUpdatedAt when changing status, priority or assignee. */
  updatedAt: string;
  updatedBy: { name: string } | null;
  /** The shipment the tracking number belongs to, if it exists. */
  shipment: { id: string; trackingNumber: string; status: string; archived: boolean } | null;
  /** Oldest first. */
  activities: AdminSupportActivity[];
}
