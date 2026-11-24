import { isShipmentStatus, type PublicTrackingResult } from '@reduium/shared';

/**
 * Every way a tracking lookup can end. The page renders one state per kind,
 * so nothing falls through to a blank screen or a raw error message.
 */
export type TrackingOutcome =
  | { kind: 'found'; shipment: PublicTrackingResult }
  | { kind: 'not-found'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'rate-limited'; retryAfterSeconds: number }
  | { kind: 'error' };

/** Same origin in development (Vite proxies /api). Set VITE_API_BASE_URL if the API lives elsewhere. */
const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Check the response really has the shape we expect before showing it, so a
 * proxy error page or a half-broken response becomes a clean error state
 * instead of a crashed or misleading page.
 */
function isPublicTracking(value: unknown): value is PublicTrackingResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<PublicTrackingResult>;
  return (
    typeof v.trackingNumber === 'string' &&
    isShipmentStatus(v.status) &&
    typeof v.origin?.city === 'string' &&
    typeof v.destination?.city === 'string' &&
    typeof v.lastUpdatedAt === 'string' &&
    Array.isArray(v.events) &&
    v.events.every(
      (e) =>
        isShipmentStatus(e?.status) &&
        typeof e.occurredAt === 'string' &&
        typeof e.location === 'string',
    )
  );
}

export async function fetchTracking(
  trackingNumber: string,
  signal: AbortSignal,
): Promise<TrackingOutcome> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/tracking/${encodeURIComponent(trackingNumber)}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return { kind: 'error' }; // offline, DNS failure, server down…
  }

  const body = (await res.json().catch(() => null)) as {
    shipment?: unknown;
    error?: { message?: string; details?: { retryAfterSeconds?: number } };
  } | null;

  if (res.ok && isPublicTracking(body?.shipment)) {
    return { kind: 'found', shipment: body.shipment };
  }
  const message = body?.error?.message ?? '';
  if (res.status === 404 && message) return { kind: 'not-found', message };
  if (res.status === 400 && message) return { kind: 'invalid', message };
  if (res.status === 429) {
    const header = Number(res.headers.get('Retry-After'));
    const seconds = body?.error?.details?.retryAfterSeconds ?? (header > 0 ? header : 60);
    return { kind: 'rate-limited', retryAfterSeconds: seconds };
  }
  return { kind: 'error' };
}
