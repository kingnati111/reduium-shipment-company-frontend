/**
 * The single source of truth for shipment statuses.
 *
 * The database, the API and the website all read from this list, so a status
 * can never exist in one place but not another.
 */

export const SHIPMENT_STATUSES = [
  'REGISTERED',
  'RECEIVED',
  'PROCESSING_AT_ORIGIN',
  'IN_TRANSIT',
  'ARRIVED_AT_SORTING_FACILITY',
  'CUSTOMS_CLEARANCE',
  'DEPARTED_FACILITY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_ATTEMPTED',
  'DELAYED',
  'ON_HOLD',
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/**
 * Visual tone of a status. The website maps each tone to a colour + icon.
 * - neutral:  paperwork stage, nothing has physically moved yet
 * - progress: the package is moving through the network normally
 * - success:  delivered
 * - caution:  needs attention but is not stopped (attempted, delayed)
 * - critical: stopped until someone acts (on hold)
 */
export type StatusTone = 'neutral' | 'progress' | 'success' | 'caution' | 'critical';

/**
 * Journey phase, used for the progress bar on the tracking page.
 * Exception statuses (delayed, on hold…) have no phase of their own. The
 * progress bar keeps showing the last normal phase the shipment reached.
 */
export const JOURNEY_PHASES = ['registered', 'origin', 'transit', 'delivery', 'delivered'] as const;
export type JourneyPhase = (typeof JOURNEY_PHASES)[number];

export interface StatusInfo {
  label: string;
  description: string;
  tone: StatusTone;
  phase: JourneyPhase | null;
  /** True when the shipment is finished and no longer "active". */
  terminal: boolean;
}

export const STATUS_INFO: Record<ShipmentStatus, StatusInfo> = {
  REGISTERED: {
    label: 'Shipment Registered',
    description: 'Shipment details have been recorded. Awaiting the package.',
    tone: 'neutral',
    phase: 'registered',
    terminal: false,
  },
  RECEIVED: {
    label: 'Package Received',
    description: 'The package has been received by Reduium.',
    tone: 'progress',
    phase: 'origin',
    terminal: false,
  },
  PROCESSING_AT_ORIGIN: {
    label: 'Processing at Origin Facility',
    description: 'The package is being sorted and prepared for dispatch.',
    tone: 'progress',
    phase: 'origin',
    terminal: false,
  },
  IN_TRANSIT: {
    label: 'In Transit',
    description: 'The package is moving through the Reduium network.',
    tone: 'progress',
    phase: 'transit',
    terminal: false,
  },
  ARRIVED_AT_SORTING_FACILITY: {
    label: 'Arrived at Sorting Facility',
    description: 'The package has arrived at a sorting facility.',
    tone: 'progress',
    phase: 'transit',
    terminal: false,
  },
  CUSTOMS_CLEARANCE: {
    label: 'Customs Clearance',
    description: 'The package is being processed by customs authorities.',
    tone: 'progress',
    phase: 'transit',
    terminal: false,
  },
  DEPARTED_FACILITY: {
    label: 'Departed Facility',
    description: 'The package has left the facility for its next stop.',
    tone: 'progress',
    phase: 'transit',
    terminal: false,
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    description: 'The package is with a courier and will be delivered today.',
    tone: 'progress',
    phase: 'delivery',
    terminal: false,
  },
  DELIVERED: {
    label: 'Successfully Delivered',
    description: 'The package has been delivered.',
    tone: 'success',
    phase: 'delivered',
    terminal: true,
  },
  DELIVERY_ATTEMPTED: {
    label: 'Delivery Attempted',
    description: 'A delivery was attempted but could not be completed.',
    tone: 'caution',
    phase: null,
    terminal: false,
  },
  DELAYED: {
    label: 'Shipment Delayed',
    description: 'The shipment is delayed. A new estimate will follow.',
    tone: 'caution',
    phase: null,
    terminal: false,
  },
  ON_HOLD: {
    label: 'On Hold',
    description: 'The shipment is on hold. Contact support for details.',
    tone: 'critical',
    phase: null,
    terminal: false,
  },
};

export function isShipmentStatus(value: unknown): value is ShipmentStatus {
  return typeof value === 'string' && (SHIPMENT_STATUSES as readonly string[]).includes(value);
}
