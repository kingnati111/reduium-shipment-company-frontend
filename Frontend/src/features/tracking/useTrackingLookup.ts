import { useEffect, useState } from 'react';
import { fetchTracking, type TrackingOutcome } from './api';

/**
 * Looks up a tracking number and keeps the latest answer.
 *
 * - Searching for a new number cancels the previous request, so a slow
 *   answer for an old number can never replace the current one.
 * - `retry()` repeats the lookup (used by the "Try again" button).
 * - `loading` is derived rather than stored: we're loading whenever the
 *   stored answer isn't for the current number and attempt.
 */
export function useTrackingLookup(trackingNumber: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ key: string; outcome: TrackingOutcome } | null>(null);
  const key = `${trackingNumber}#${attempt}`;

  useEffect(() => {
    if (!trackingNumber) return;
    const controller = new AbortController();
    // Start on the next tick. If the effect is cleaned up straight away (React
    // StrictMode's development double-run, or the number changing again
    // immediately), the request is never sent at all, so it doesn't waste the
    // visitor's rate-limit allowance.
    const timer = setTimeout(() => {
      fetchTracking(trackingNumber, controller.signal)
        .then((outcome) => {
          if (!controller.signal.aborted) setAnswer({ key, outcome });
        })
        .catch(() => {
          // Aborted because the number changed or the page closed: nothing to do.
        });
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trackingNumber, key]);

  const current = answer?.key === key ? answer.outcome : null;
  return {
    outcome: current,
    loading: Boolean(trackingNumber) && !current,
    retry: () => setAttempt((n) => n + 1),
  };
}
