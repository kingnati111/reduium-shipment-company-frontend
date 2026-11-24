import {
  SHIPMENT_STATUSES,
  STATUS_INFO,
  ROLE_LABELS,
  type AdminShipmentSummary,
  type Permission,
} from '@reduium/shared';
import { Check, Plus, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../features/admin/auth-context';
import { formatCalendarDate, formatDateTime, placeText } from '../../features/admin/format';
import { useLoad, useShipmentsApi } from '../../features/admin/shipments/api';
import { useSupportApi } from '../../features/admin/support/api';
import { SupportStatusBadge, UrgentBadge } from '../../features/admin/support/badges';
import { LoadProblem } from '../../features/admin/ui';
import { cn } from '../../lib/cn';

const PERMISSION_LABELS: Record<Permission, string> = {
  'shipments:read': 'View shipments',
  'shipments:write': 'Create and update shipments and tracking events',
  'shipments:delete': 'Permanently delete archived shipments',
  'support:read': 'Read support requests',
  'support:write': 'Handle support requests',
  'support:delete': 'Permanently delete closed support requests',
  'admins:read': 'View staff accounts',
  'admins:manage': 'Manage staff accounts',
  'audit:read': 'Read the audit log',
};

const sessionTime = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

function Stat({
  label,
  value,
  to,
  tone = 'ink',
  hint,
}: {
  label: string;
  value: number;
  to: string;
  tone?: 'ink' | 'caution' | 'critical' | 'success';
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-md border border-fog bg-paper-50 p-5 shadow-card transition-colors hover:border-ink/30"
    >
      <p className="type-label text-ink-400">{label}</p>
      <p
        className={cn(
          'type-display mt-2 text-4xl',
          tone === 'ink' && 'text-ink',
          tone === 'caution' && value > 0 && 'text-tone-caution',
          tone === 'critical' && value > 0 && 'text-tone-critical',
          tone === 'success' && 'text-tone-success',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-ink-600 group-hover:text-ink">{hint} →</p>
    </Link>
  );
}

function ShipmentLines({ items, empty }: { items: AdminShipmentSummary[]; empty: ReactNode }) {
  if (items.length === 0) return <p className="text-sm text-ink-600">{empty}</p>;
  return (
    <ul className="-my-2 divide-y divide-fog">
      {items.map((s) => (
        <li key={s.id}>
          <Link
            to={`/admin/shipments/${s.id}`}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-fog-200/30"
          >
            <span className="min-w-0">
              <span className="type-data block font-medium text-ink">{s.trackingNumber}</span>
              <span className="block truncate text-sm text-ink-600">
                {s.recipientName} · {placeText(s.destination)}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <StatusBadge status={s.status} size="sm" />
              <span
                className={cn(
                  'text-xs',
                  s.overdue ? 'font-semibold text-tone-critical' : 'text-ink-400',
                )}
              >
                {s.overdue && s.estimatedDeliveryDate
                  ? `Overdue since ${formatCalendarDate(s.estimatedDeliveryDate)}`
                  : `Updated ${formatDateTime(s.updatedAt)}`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Landing page after sign-in: today's operational picture. */
export function AdminHomePage() {
  const { state: auth, can } = useAuth();
  const api = useShipmentsApi();
  const stats = useLoad((signal) => api.stats(signal), [api]);
  const attention = useLoad(
    (signal) =>
      api.list(new URLSearchParams({ view: 'attention', sort: 'eta', pageSize: '6' }), signal),
    [api],
  );
  const recent = useLoad(
    (signal) =>
      api.list(
        new URLSearchParams({ view: 'in_progress', sort: 'updated', pageSize: '6' }),
        signal,
      ),
    [api],
  );
  if (auth.status !== 'authenticated') return null;
  const { admin, session } = auth.info;
  const firstName = admin.name.split(/\s+/)[0] ?? admin.name;

  return (
    <>
      <title>Overview | Reduium Admin</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-label text-ink-400">Overview</p>
          <h1 className="type-display mt-2 text-3xl text-ink sm:text-4xl">Welcome, {firstName}</h1>
          <p className="mt-2 text-ink-600">Here&apos;s where every shipment stands right now.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/admin/shipments" variant="outline">
            <Search aria-hidden className="size-4" /> Find a shipment
          </ButtonLink>
          {can('shipments:write') && (
            <ButtonLink to="/admin/shipments/new">
              <Plus aria-hidden className="size-4" /> New shipment
            </ButtonLink>
          )}
        </div>
      </div>

      <section aria-label="Key figures" className="mt-8">
        {stats.state.kind === 'ok' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="In progress"
              value={stats.state.data.inProgress}
              to="/admin/shipments"
              hint="Not yet delivered"
            />
            <Stat
              label="Needs attention"
              value={stats.state.data.attention}
              to="/admin/shipments?view=attention"
              tone="caution"
              hint="Delayed, on hold or attempted"
            />
            <Stat
              label="Overdue"
              value={stats.state.data.overdue}
              to="/admin/shipments?view=attention&sort=eta"
              tone="critical"
              hint="Past the estimated date"
            />
            <Stat
              label="Delivered"
              value={stats.state.data.deliveredLast7Days}
              to="/admin/shipments?view=delivered"
              tone="success"
              hint="In the last 7 days"
            />
          </div>
        ) : stats.state.kind === 'loading' ? (
          <p role="status" className="text-ink-600">
            Loading figures…
          </p>
        ) : (
          <LoadProblem state={stats.state} onRetry={stats.reload} />
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          label="Needs attention"
          reference={
            <Link to="/admin/shipments?view=attention" className="underline underline-offset-2">
              See all
            </Link>
          }
        >
          {attention.state.kind === 'ok' ? (
            <ShipmentLines
              items={attention.state.data.items}
              empty="Nothing needs attention right now."
            />
          ) : attention.state.kind === 'loading' ? (
            <p className="text-sm text-ink-600">Loading…</p>
          ) : (
            <LoadProblem state={attention.state} onRetry={attention.reload} />
          )}
        </Panel>
        <Panel
          label="Recently updated"
          reference={
            <Link to="/admin/shipments" className="underline underline-offset-2">
              See all
            </Link>
          }
        >
          {recent.state.kind === 'ok' ? (
            <ShipmentLines items={recent.state.data.items} empty="No shipments in progress." />
          ) : recent.state.kind === 'loading' ? (
            <p className="text-sm text-ink-600">Loading…</p>
          ) : (
            <LoadProblem state={recent.state} onRetry={recent.reload} />
          )}
        </Panel>
      </div>

      {stats.state.kind === 'ok' && stats.state.data.inProgress > 0 && (
        <Panel label="In progress by status" className="mt-6">
          <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {SHIPMENT_STATUSES.filter((st) => st !== 'DELIVERED').map((st) => (
              <li key={st}>
                <Link
                  to={`/admin/shipments?status=${st}`}
                  className="flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm hover:bg-fog-200/50"
                >
                  <span className="text-ink-600">{STATUS_INFO[st].label}</span>
                  <span className="type-data font-medium text-ink">
                    {stats.state.kind === 'ok' ? stats.state.data.byStatus[st] : 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel label="Your account">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="type-label text-ink-400">Name</dt>
              <dd className="mt-1 text-ink">{admin.name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="type-label text-ink-400">Email</dt>
              <dd className="mt-1 break-words text-ink">{admin.email}</dd>
            </div>
            <div>
              <dt className="type-label text-ink-400">Role</dt>
              <dd className="mt-1 text-ink" data-testid="admin-role">
                {ROLE_LABELS[admin.role]}
              </dd>
            </div>
          </dl>
          <p className="type-label mt-6 text-ink-400">What you can do</p>
          <ul className="mt-2 space-y-1.5" aria-label="Your permissions">
            {admin.permissions.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-ink-600">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-tone-success" />
                {PERMISSION_LABELS[p]}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel label="Session">
          <p className="text-ink">
            This session ends at{' '}
            <time dateTime={session.expiresAt} className="font-medium">
              {sessionTime.format(new Date(session.expiresAt))}
            </time>
            , or after {Math.round(session.idleTimeoutSeconds / 3600)} hours without activity,
            whichever comes first.
          </p>
          <p className="mt-3 text-sm text-ink-600">
            Signing out ends the session on the server straight away. Always sign out on a shared
            computer.
          </p>
        </Panel>
      </div>

      {can('support:read') && <SupportOverview />}
    </>
  );
}

/** Customer support figures and the requests that have waited longest. */
function SupportOverview() {
  const api = useSupportApi();
  const { state, reload } = useLoad((signal) => api.stats(signal), [api]);
  return (
    <section aria-labelledby="support-overview-title" className="mt-10">
      <h2 id="support-overview-title" className="type-display text-2xl text-ink">
        Customer support
      </h2>
      {state.kind === 'loading' ? (
        <p role="status" className="mt-3 text-sm text-ink-600">
          Loading support figures…
        </p>
      ) : state.kind !== 'ok' ? (
        <div className="mt-4">
          <LoadProblem
            state={state}
            onRetry={reload}
            back={{ to: '/admin/support', label: 'Open support' }}
          />
        </div>
      ) : (
        <>
          <div
            role="region"
            aria-label="Support figures"
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <Stat
              label="Open"
              value={state.data.open}
              to="/admin/support"
              hint="All open requests"
            />
            <Stat
              label="New"
              value={state.data.new}
              to="/admin/support?status=NEW"
              tone="caution"
              hint="Not picked up yet"
            />
            <Stat
              label="Unassigned"
              value={state.data.unassigned}
              to="/admin/support?view=unassigned"
              tone="caution"
              hint="Nobody is on it"
            />
            <Stat
              label="Assigned to me"
              value={state.data.mine}
              to="/admin/support?view=mine"
              hint="Your requests"
            />
            <Stat
              label="Waiting on customer"
              value={state.data.waiting}
              to="/admin/support?view=waiting"
              hint="We replied"
            />
          </div>
          <Panel label="Oldest open requests" className="mt-6">
            {state.data.oldestOpen.length === 0 ? (
              <p className="text-sm text-ink-600">No open support requests.</p>
            ) : (
              <ul className="-my-2 divide-y divide-fog">
                {state.data.oldestOpen.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/admin/support/${r.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-ink"
                    >
                      <span className="min-w-0">
                        <span className="type-data font-medium text-ink">{r.reference}</span>
                        <span className="ml-2 break-words text-sm text-ink-600">{r.subject}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
                        <UrgentBadge priority={r.priority} />
                        <SupportStatusBadge status={r.status} />
                        received {formatDateTime(r.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </section>
  );
}
