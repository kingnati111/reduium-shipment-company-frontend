import type { AuthSessionInfo } from '@reduium/shared';

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * The session cookie is httpOnly: this code never sees it. The browser
 * attaches it automatically: "same-origin" credentials when the API is on the
 * website's own address (development), "include" when VITE_API_BASE_URL points
 * to a separate API address (production: api.reduiumshipment.com). What this
 * code does handle is the CSRF token, which must accompany every
 * state-changing request.
 */
async function call(path: string, init: RequestInit & { csrfToken?: string } = {}) {
  const { csrfToken, headers, ...rest } = init;
  return fetch(`${API_BASE}${path}`, {
    credentials: API_BASE ? 'include' : 'same-origin',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...headers,
    },
  });
}

const json = async <T>(res: Response) => (await res.json().catch(() => null)) as T | null;

export type SessionCheck =
  { kind: 'authenticated'; info: AuthSessionInfo } | { kind: 'anonymous' } | { kind: 'error' };

export async function fetchSession(signal?: AbortSignal): Promise<SessionCheck> {
  try {
    const res = await call('/api/auth/session', { signal });
    if (res.status === 401) return { kind: 'anonymous' };
    const body = await json<AuthSessionInfo>(res);
    if (res.ok && body?.admin && body.csrfToken) return { kind: 'authenticated', info: body };
    return { kind: 'error' };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { kind: 'error' };
  }
}

export type LoginOutcome =
  | { kind: 'ok'; info: AuthSessionInfo }
  | { kind: 'invalid-credentials'; message: string }
  | { kind: 'validation'; fields: Partial<Record<'email' | 'password', string>> }
  | { kind: 'rate-limited'; retryAfterSeconds: number }
  | { kind: 'error' };

export async function login(email: string, password: string): Promise<LoginOutcome> {
  let res: Response;
  try {
    res = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { kind: 'error' };
  }
  const body = await json<
    AuthSessionInfo & {
      error?: {
        code?: string;
        message?: string;
        details?: { issues?: { field: string; message: string }[]; retryAfterSeconds?: number };
      };
    }
  >(res);

  if (res.ok && body?.admin && body.csrfToken) return { kind: 'ok', info: body };
  if (res.status === 401 && body?.error?.message) {
    return { kind: 'invalid-credentials', message: body.error.message };
  }
  if (res.status === 400 && body?.error?.details?.issues) {
    const fields: Partial<Record<'email' | 'password', string>> = {};
    for (const issue of body.error.details.issues) {
      if (issue.field === 'email' || issue.field === 'password')
        fields[issue.field] ??= issue.message;
    }
    return { kind: 'validation', fields };
  }
  if (res.status === 429) {
    const header = Number(res.headers.get('Retry-After'));
    return {
      kind: 'rate-limited',
      retryAfterSeconds: body?.error?.details?.retryAfterSeconds ?? (header > 0 ? header : 900),
    };
  }
  return { kind: 'error' };
}

export async function logout(csrfToken: string): Promise<void> {
  await call('/api/auth/logout', { method: 'POST', csrfToken }).catch(() => undefined);
}

export interface FieldIssue {
  field: string;
  message: string;
}

/** Thrown by adminRequest so pages can show the right state. */
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Safe, human-readable message from the API (status 0 = no connection). */
    message: string,
    readonly issues: FieldIssue[] = [],
  ) {
    super(message);
  }
}

/** Authenticated request to /api/admin/… . 401 means the session has ended. */
export async function adminRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; csrfToken?: string; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await call(`/api/admin${path}`, {
      method: options.method ?? 'GET',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      csrfToken: options.csrfToken,
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new AdminApiError(0, 'NETWORK', "We couldn't reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const body = await json<
    T & { error?: { code?: string; message?: string; details?: { issues?: FieldIssue[] } } }
  >(res);
  if (!res.ok) {
    throw new AdminApiError(
      res.status,
      body?.error?.code ?? 'ERROR',
      body?.error?.message ?? 'Something went wrong. Please try again.',
      body?.error?.details?.issues ?? [],
    );
  }
  return body as T;
}
