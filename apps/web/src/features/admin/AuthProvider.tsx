import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchSession, login, logout } from './api';
import { AuthContext, type AuthContextValue, type AuthState } from './auth-context';

/**
 * Knows whether a staff member is signed in, for the admin area only.
 *
 * The truth always lives on the server: this asks GET /api/auth/session when
 * the admin area opens, and again whenever the tab becomes visible (so a
 * session that expired while the laptop slept is noticed straight away).
 * Nothing about the session is stored in localStorage or readable by scripts.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSession(controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setState((prev) => {
            if (result.kind === 'authenticated')
              return { status: 'authenticated', info: result.info };
            if (result.kind === 'anonymous') {
              // Was signed in a moment ago → the session ended on the server.
              return {
                status: 'anonymous',
                reason: prev.status === 'authenticated' ? 'expired' : undefined,
              };
            }
            // Network or server hiccup: keep a signed-in admin signed in.
            return prev.status === 'authenticated' ? prev : { status: 'error' };
          });
        })
        .catch(() => {});
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [checkCount]);

  const recheck = useCallback(() => setCheckCount((n) => n + 1), []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [recheck]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      recheck,
      signIn: async (email, password) => {
        const outcome = await login(email, password);
        if (outcome.kind === 'ok') setState({ status: 'authenticated', info: outcome.info });
        return outcome;
      },
      signOut: async () => {
        if (state.status === 'authenticated') await logout(state.info.csrfToken);
        setState({ status: 'anonymous', reason: 'signed-out' });
      },
      sessionEnded: () => setState({ status: 'anonymous', reason: 'expired' }),
      can: (permission) =>
        state.status === 'authenticated' && state.info.admin.permissions.includes(permission),
    }),
    [state, recheck],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
