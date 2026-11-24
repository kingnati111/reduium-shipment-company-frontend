import { JOURNEY_PHASES, STATUS_INFO, type JourneyPhase, type ShipmentStatus } from './statuses.js';

export const JOURNEY_PHASE_LABELS: Record<JourneyPhase, string> = {
  registered: 'Registered',
  origin: 'At origin',
  transit: 'In transit',
  delivery: 'Out for delivery',
  delivered: 'Delivered',
};

export type JourneyStepState = 'complete' | 'current' | 'upcoming';

export interface JourneyStep {
  phase: JourneyPhase;
  label: string;
  state: JourneyStepState;
}

export interface JourneyProgress {
  steps: JourneyStep[];
  /** The phase the shipment is in now (or was in when an exception happened). */
  currentPhase: JourneyPhase;
  /** Set when the current status is an exception (delayed, on hold, attempted). */
  exception: ShipmentStatus | null;
}

/**
 * Where a shipment is in its journey, for the progress bar.
 *
 * - Normal statuses map straight to a phase.
 * - Exception statuses (DELAYED, ON_HOLD, DELIVERY_ATTEMPTED) have no phase
 *   of their own. The bar stays at the last normal phase the shipment
 *   actually reached (from its history), with the exception flagged there.
 *   It never jumps forward or back because of an exception.
 * - A delivery attempt means the parcel reached the delivery stage.
 * - Delivered marks every step complete.
 *
 * @param status the shipment's current status (already the newest event's
 *   status: a late-entered older event can't change it, see the API).
 * @param events the history, oldest first.
 */
export function getJourneyProgress(
  status: ShipmentStatus,
  events: readonly { status: ShipmentStatus }[],
): JourneyProgress {
  const ownPhase = STATUS_INFO[status].phase;
  let phase: JourneyPhase | null = ownPhase;

  if (!phase) {
    for (let i = events.length - 1; i >= 0; i--) {
      const p = STATUS_INFO[events[i]!.status].phase;
      if (p) {
        phase = p;
        break;
      }
    }
  }
  phase ??= 'registered';
  if (
    status === 'DELIVERY_ATTEMPTED' &&
    JOURNEY_PHASES.indexOf(phase) < JOURNEY_PHASES.indexOf('delivery')
  ) {
    phase = 'delivery';
  }

  const currentIndex = JOURNEY_PHASES.indexOf(phase);
  const delivered = status === 'DELIVERED';
  return {
    currentPhase: phase,
    exception: ownPhase ? null : status,
    steps: JOURNEY_PHASES.map((p, i) => ({
      phase: p,
      label: JOURNEY_PHASE_LABELS[p],
      state:
        delivered || i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'upcoming',
    })),
  };
}
