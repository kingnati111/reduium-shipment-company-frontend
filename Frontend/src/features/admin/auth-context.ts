import type { AuthSessionInfo, Permission } from '@reduium/shared';
import { createContext, useContext } from 'react';
import type { LoginOutcome } from './api';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; reason?: 'expired' | 'signed-out' }
  | { status: 'authenticated'; info: AuthSessionInfo }
  | { status: 'error' };

export interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<LoginOutcome>;
  signOut: () => Promise<void>;
  /** Call when an admin API request returns 401: the session has ended. */
  sessionEnded: () => void;
  recheck: () => void;
  can: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
