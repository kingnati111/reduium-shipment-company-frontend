import type { ShippingMethod } from './shipping-methods.js';
import type { ShipmentStatus } from './statuses.js';

/**
 * Everything the PUBLIC tracking page may know about a shipment.
 *
 * Deliberately excluded: sender and recipient names, companies, emails,
 * phone numbers and street addresses; package contents and weight; internal
 * notes; staff names; database IDs. The API builds this from an explicit
 * allow-list, so adding a private column later can't leak it.
 */
export interface PublicTrackingResult {
  trackingNumber: string;
  status: ShipmentStatus;
  shippingMethod: ShippingMethod;
  origin: { city: string; countryCode: string };
  destination: { city: string; countryCode: string };
  currentLocation: string | null;
  /** YYYY-MM-DD */
  estimatedDeliveryDate: string | null;
  /** ISO 8601 */
  deliveredAt: string | null;
  /** ISO 8601: time of the newest tracking event. */
  lastUpdatedAt: string;
  /** Development/sample record. The page must label it as test data. */
  isTestData: boolean;
  /** Oldest first. */
  events: PublicTrackingEvent[];
}

export interface PublicTrackingEvent {
  status: ShipmentStatus;
  location: string;
  description: string;
  /** ISO 8601 */
  occurredAt: string;
}
