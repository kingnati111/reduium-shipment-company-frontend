import type { Permission } from '@reduium/shared';
import { RotateCw, ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { LogoMark } from '../../components/brand/Logo';
import { Button, ButtonLink } from '../../components/ui/Button';
import { useAuth } from './auth-context';

function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-4 text-center">
      <LogoMark className="size-10" />
      {children}
    </div>
  );
}

/**
 * Wraps every protected admin page. The real protection is on the server
 * (every /api/admin request checks the session); this decides what to SHOW.
 */
export function RequireAdmin() {
  const { state, recheck } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') {
    return (
      <FullScreenMessage>
        <p role="status" className="text-ink-600">
          Checking your session…
        </p>
      </FullScreenMessage>
    );
  }
  if (state.status === 'error') {
    return (
      <FullScreenMessage>
        <p role="alert" className="max-w-sm text-ink-600">
          We couldn&apos;t reach the server to check your session. Please try again.
        </p>
        <Button variant="secondary" onClick={recheck}>
          <RotateCw aria-hidden className="size-4" /> Try again
        </Button>
      </FullScreenMessage>
    );
  }
  if (state.status === 'anonymous') {
    const params = new URLSearchParams({ next: location.pathname + location.search });
    if (state.reason === 'expired') params.set('expired', '1');
    if (state.reason === 'signed-out') params.set('signedOut', '1');
    return <Navigate to={`/admin/login?${params}`} replace />;
  }
  return <Outlet />;
}

/** Shows the page only if the signed-in role has the permission. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (can(permission)) return <>{children}</>;
  return <AccessDenied />;
}

export function AccessDenied() {
  return (
    <section aria-labelledby="denied-title" className="max-w-xl">
      <ShieldX aria-hidden className="size-8 text-tone-critical" />
      <h1 id="denied-title" className="type-display mt-4 text-3xl text-ink">
        You don&apos;t have access to this page
      </h1>
      <p className="mt-3 text-ink-600">
        Your account&apos;s role doesn&apos;t include this area. If you need it, ask an
        administrator.
      </p>
      <ButtonLink to="/admin" variant="outline" className="mt-6">
        Back to overview
      </ButtonLink>
    </section>
  );
}
