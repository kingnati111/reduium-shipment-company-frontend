import type { ShipmentStatus, StatusTone } from '@reduium/shared';
import {
  ArrowRightFromLine,
  CircleCheck,
  ClipboardList,
  Clock,
  DoorClosed,
  type LucideIcon,
  Navigation,
  OctagonPause,
  PackageCheck,
  Settings2,
  Stamp,
  Truck,
  Warehouse,
} from 'lucide-react';

/** Icon for each status, used by badges, the timeline and the admin dashboard. */
export const STATUS_ICONS: Record<ShipmentStatus, LucideIcon> = {
  REGISTERED: ClipboardList,
  RECEIVED: PackageCheck,
  PROCESSING_AT_ORIGIN: Settings2,
  IN_TRANSIT: Truck,
  ARRIVED_AT_SORTING_FACILITY: Warehouse,
  CUSTOMS_CLEARANCE: Stamp,
  DEPARTED_FACILITY: ArrowRightFromLine,
  OUT_FOR_DELIVERY: Navigation,
  DELIVERED: CircleCheck,
  DELIVERY_ATTEMPTED: DoorClosed,
  DELAYED: Clock,
  ON_HOLD: OctagonPause,
};

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'text-tone-neutral bg-tone-neutral-bg border-tone-neutral/35',
  progress: 'text-tone-progress bg-tone-progress-bg border-tone-progress/35',
  success: 'text-tone-success bg-tone-success-bg border-tone-success/40',
  caution: 'text-tone-caution bg-tone-caution-bg border-tone-caution/40',
  critical: 'text-tone-critical bg-tone-critical-bg border-tone-critical/40',
};
