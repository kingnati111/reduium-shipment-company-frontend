import { ROLE_LABELS, type AdminRole } from '@reduium/shared';
import { RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { AdminApiError, adminRequest } from '../../features/admin/api';
import { useAuth } from '../../features/admin/auth-context';
import { AccessDenied } from '../../features/admin/guards';
import { cn } from '../../lib/cn';

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt: string | null;
  createdAt: string;
}

type Load =
  | { kind: 'loading' }
  | { kind: 'ok'; admins: StaffAccount[] }
  | { kind: 'forbidden' }
  | { kind: 'error' };

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Staff accounts (administrators only). Read-only for now. */
export function AdminTeamPage() {
  const { sessionEnded } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<{ attempt: number; value: Load } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    adminRequest<{ admins: StaffAccount[] }>('/admins', { signal: controller.signal })
      .then((body) => setLoad({ attempt, value: { kind: 'ok', admins: body.admins } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AdminApiError && error.status === 401) return sessionEnded();
        const forbidden = error instanceof AdminApiError && error.status === 403;
        setLoad({ attempt, value: { kind: forbidden ? 'forbidden' : 'error' } });
      });
    return () => controller.abort();
  }, [attempt, sessionEnded]);

  const state: Load = load?.attempt === attempt ? load.value : { kind: 'loading' };
  if (state.kind === 'forbidden') return <AccessDenied />;

  return (
    <>
      <title>Team | Reduium Admin</title>
      <p className="type-label text-ink-400">Team</p>
      <h1 className="type-display mt-2 text-3xl text-ink sm:text-4xl">Staff accounts</h1>
      <p className="mt-2 max-w-2xl text-ink-600">
        Everyone who can sign in to the operations console. New accounts are created with{' '}
        <code className="type-data text-sm">npm run admin:create</code>.
      </p>

      <div className="mt-8">
        {state.kind === 'loading' && (
          <p role="status" className="text-ink-600">
            Loading staff accounts…
          </p>
        )}
        {state.kind === 'error' && (
          <div role="alert" className="space-y-4">
            <p className="text-tone-critical">We couldn&apos;t load staff accounts.</p>
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCw aria-hidden className="size-4" /> Try again
            </Button>
          </div>
        )}
        {state.kind === 'ok' && (
          <ul className="divide-y divide-fog rounded-md border border-fog bg-paper-50 shadow-card">
            {state.admins.map((a) => (
              <li
                key={a.id}
                className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{a.name}</p>
                  <p className="truncate text-sm text-ink-600">{a.email}</p>
                </div>
                <p className="text-sm">
                  <span className="text-ink">{ROLE_LABELS[a.role]}</span>
                  <span
                    className={cn(
                      'type-label ml-2 text-[0.625rem]',
                      a.status === 'ACTIVE' ? 'text-tone-success' : 'text-tone-critical',
                    )}
                  >
                    {a.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                  </span>
                </p>
                <p className="text-sm text-ink-400">
                  {a.lastLoginAt
                    ? `Last sign-in ${dateTime.format(new Date(a.lastLoginAt))}`
                    : 'Never signed in'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
