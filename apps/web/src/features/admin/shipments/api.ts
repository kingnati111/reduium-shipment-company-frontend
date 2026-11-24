import type {
  AdminActivityEntry,
  AdminShipmentDetail,
  AdminShipmentList,
  AdminShipmentStats,
  ShipmentCreateInput,
  TrackingEventCreateInput,
} from '@reduium/shared';
import { useCallback, useEffect, useMemo, useState, type DependencyList } from 'react';
import { AdminApiError, adminRequest } from '../api';
import { useAuth } from '../auth-context';

type Detail = { shipment: AdminShipmentDetail };

/**
 * Shipment API calls, bound to the signed-in session: every change carries
 * the CSRF token, and a 401 (session ended) sends the user back to sign-in.
 */
export function useShipmentsApi() {
  const { state, sessionEnded } = useAuth();
  const csrfToken = state.status === 'authenticated' ? state.info.csrfToken : undefined;

  return useMemo(() => {
    async function send<T>(
      path: string,
      method = 'GET',
      body?: unknown,
      signal?: AbortSignal,
    ): Promise<T> {
      try {
        return await adminRequest<T>(`/shipments${path}`, { method, body, csrfToken, signal });
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) sessionEnded();
        throw error;
      }
    }
    return {
      list: (query: URLSearchParams, signal?: AbortSignal) =>
        send<AdminShipmentList>(`?${query}`, 'GET', undefined, signal),
      stats: (signal?: AbortSignal) => send<AdminShipmentStats>('/stats', 'GET', undefined, signal),
      get: (id: string, signal?: AbortSignal) =>
        send<Detail>(`/${id}`, 'GET', undefined, signal).then((r) => r.shipment),
      activity: (id: string, signal?: AbortSignal) =>
        send<{ activity: AdminActivityEntry[] }>(`/${id}/activity`, 'GET', undefined, signal).then(
          (r) => r.activity,
        ),
      create: (input: ShipmentCreateInput) =>
        send<Detail>('', 'POST', input).then((r) => r.shipment),
      update: (id: string, input: ShipmentCreateInput & { expectedUpdatedAt: string }) =>
        send<Detail>(`/${id}`, 'PUT', input).then((r) => r.shipment),
      addEvent: (id: string, input: TrackingEventCreateInput) =>
        send<Detail>(`/${id}/events`, 'POST', input).then((r) => r.shipment),
      updateEvent: (id: string, eventId: string, input: TrackingEventCreateInput) =>
        send<Detail>(`/${id}/events/${eventId}`, 'PUT', input).then((r) => r.shipment),
      deleteEvent: (id: string, eventId: string) =>
        send<Detail>(`/${id}/events/${eventId}`, 'DELETE').then((r) => r.shipment),
      archive: (id: string) => send<Detail>(`/${id}/archive`, 'POST').then((r) => r.shipment),
      unarchive: (id: string) => send<Detail>(`/${id}/unarchive`, 'POST').then((r) => r.shipment),
      remove: (id: string, confirmTrackingNumber: string) =>
        send<void>(`/${id}`, 'DELETE', { confirmTrackingNumber }),
    };
  }, [csrfToken, sessionEnded]);
}

export type LoadState<T> =
  | { kind: 'loading' }
  | { kind: 'ok'; data: T }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string };

/**
 * Load data for a page: loading → ok / not-found / forbidden / error, with
 * reload(). A newer request always wins over an older, slower one.
 */
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: LoadState<T> } | null>(null);
  const [override, setOverride] = useState<{ key: string; data: T } | null>(null);
  const key = JSON.stringify([attempt, ...deps]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setResult({ key, state: { kind: 'ok', data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const e = error instanceof AdminApiError ? error : null;
        const state: LoadState<T> =
          e?.status === 404
            ? { kind: 'not-found' }
            : e?.status === 403
              ? { kind: 'forbidden' }
              : { kind: 'error', message: e?.message ?? 'Something went wrong.' };
        if (e?.status !== 401) setResult({ key, state });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers deps + attempt
  }, [key]);

  const state: LoadState<T> =
    override?.key === key
      ? { kind: 'ok', data: override.data }
      : result?.key === key
        ? result.state
        : { kind: 'loading' };

  return {
    state,
    reload: useCallback(() => setAttempt((n) => n + 1), []),
    /** Replace the data with a fresher copy (e.g. the API's answer after a change). */
    replace: useCallback((data: T) => setOverride({ key, data }), [key]),
  };
}
