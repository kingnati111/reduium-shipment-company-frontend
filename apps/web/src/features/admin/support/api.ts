import type {
  AdminActivityEntry,
  AdminSupportDetail,
  AdminSupportList,
  AdminSupportStats,
  SupportAssigneeOption,
  SupportPriority,
  SupportStatus,
} from '@reduium/shared';
import { useMemo } from 'react';
import { AdminApiError, adminRequest } from '../api';
import { useAuth } from '../auth-context';

type Detail = { request: AdminSupportDetail };

export interface SupportChange {
  expectedUpdatedAt: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  assignedToId?: string | null;
}

/**
 * Support API calls, bound to the signed-in session: every change carries
 * the CSRF token, and a 401 (session ended) sends the user back to sign-in.
 */
export function useSupportApi() {
  const { state, sessionEnded } = useAuth();
  const csrfToken = state.status === 'authenticated' ? state.info.csrfToken : undefined;

  return useMemo(() => {
    async function send<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
      try {
        return await adminRequest<T>(`/support${path}`, { method, body, csrfToken, signal });
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) sessionEnded();
        throw error;
      }
    }
    return {
      list: (query: URLSearchParams, signal?: AbortSignal) =>
        send<AdminSupportList>(`?${query}`, 'GET', undefined, signal),
      stats: (signal?: AbortSignal) => send<AdminSupportStats>('/stats', 'GET', undefined, signal),
      assignees: (signal?: AbortSignal) =>
        send<{ assignees: SupportAssigneeOption[] }>('/assignees', 'GET', undefined, signal).then(
          (r) => r.assignees,
        ),
      get: (id: string, signal?: AbortSignal) =>
        send<Detail>(`/${id}`, 'GET', undefined, signal).then((r) => r.request),
      activity: (id: string, signal?: AbortSignal) =>
        send<{ activity: AdminActivityEntry[] }>(`/${id}/activity`, 'GET', undefined, signal).then(
          (r) => r.activity,
        ),
      update: (id: string, change: SupportChange) =>
        send<Detail>(`/${id}`, 'PATCH', change).then((r) => r.request),
      addNote: (id: string, body: string) =>
        send<Detail>(`/${id}/notes`, 'POST', { body }).then((r) => r.request),
      recordReply: (id: string, body: string, markWaiting: boolean) =>
        send<Detail>(`/${id}/replies`, 'POST', { body, markWaiting }).then((r) => r.request),
      remove: (id: string, confirmReference: string) =>
        send<void>(`/${id}`, 'DELETE', { confirmReference }),
    };
  }, [csrfToken, sessionEnded]);
}

/**
 * mailto: link that opens the staff member's own email program with the
 * customer's address, the reference in the subject and the reply text.
 * Very long replies are left out of the link (email programs cut long links
 * off); the page offers "Copy reply text" for those instead.
 */
export const MAILTO_BODY_LIMIT = 1500;

export function replyMailto(
  r: { email: string; reference: string; subject: string },
  body: string,
) {
  const subject = `Re: ${r.subject} [${r.reference}]`;
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body.length <= MAILTO_BODY_LIMIT) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${encodeURIComponent(r.email).replace(/%40/g, '@')}?${params.join('&')}`;
}
