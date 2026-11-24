/**
 * Shipment data as the ADMIN API returns it (staff only, behind sign-in).
 * Unlike PublicTrackingResult, this includes private sender/recipient
 * details, because staff need them to do their job.
 */
import type { ShippingMethod } from './shipping-methods.js';
import type { ShipmentStatus } from './statuses.js';

/** List views on the shipments page. */
export const SHIPMENT_VIEWS = ['in_progress', 'attention', 'delivered', 'archived', 'all'] as const;
export type ShipmentView = (typeof SHIPMENT_VIEWS)[number];

export const SHIPMENT_VIEW_LABELS: Record<ShipmentView, string> = {
  in_progress: 'In progress',
  attention: 'Needs attention',
  delivered: 'Delivered',
  archived: 'Archived',
  all: 'All',
};

/** Statuses that need a person to look at the shipment. */
export const ATTENTION_STATUSES = [
  'DELAYED',
  'ON_HOLD',
  'DELIVERY_ATTEMPTED',
] as const satisfies readonly ShipmentStatus[];

export const SHIPMENT_SORTS = ['updated', 'created', 'eta'] as const;
export type ShipmentSort = (typeof SHIPMENT_SORTS)[number];

export interface Place {
  city: string;
  countryCode: string;
}

export interface AdminParty {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
}

/** One row in the shipments list. */
export interface AdminShipmentSummary {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  shippingMethod: ShippingMethod;
  origin: Place;
  destination: Place;
  currentLocation: string | null;
  senderName: string;
  recipientName: string;
  /** YYYY-MM-DD */
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  archivedAt: string | null;
  isTestData: boolean;
  /** Estimated delivery date has passed and it isn't delivered. */
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminShipmentList {
  items: AdminShipmentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminShipmentStats {
  /** Not archived and not delivered. */
  inProgress: number;
  /** In progress with a status that needs attention (delayed, on hold, attempted). */
  attention: number;
  /** In progress and past the estimated delivery date. */
  overdue: number;
  deliveredLast7Days: number;
  archived: number;
  /** In-progress shipments per status. */
  byStatus: Record<ShipmentStatus, number>;
}

export interface AdminTrackingEvent {
  id: string;
  status: ShipmentStatus;
  location: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  createdBy: { name: string } | null;
}

export interface AdminShipmentDetail {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  shippingMethod: ShippingMethod;
  sender: AdminParty;
  recipient: AdminParty;
  origin: Place;
  destination: Place;
  currentLocation: string | null;
  pieceCount: number;
  weightKg: number | null;
  contentsDescription: string | null;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  internalNotes: string | null;
  archivedAt: string | null;
  isTestData: boolean;
  overdue: boolean;
  createdAt: string;
  /** Send back as expectedUpdatedAt when saving edits (detects conflicting edits). */
  updatedAt: string;
  createdBy: { name: string } | null;
  updatedBy: { name: string } | null;
  /** Oldest first. */
  events: AdminTrackingEvent[];
}

export interface AdminActivityEntry {
  id: string;
  action: string;
  summary: string | null;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
  before: unknown;
  after: unknown;
}
