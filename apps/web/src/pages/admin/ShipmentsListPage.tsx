import {
  SHIPMENT_STATUSES,
  SHIPMENT_VIEWS,
  SHIPMENT_VIEW_LABELS,
  SHIPPING_METHODS,
  SHIPPING_METHOD_INFO,
  STATUS_INFO,
  type AdminShipmentSummary,
  type ShipmentView,
} from '@reduium/shared';
import { FlaskConical, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { ButtonLink } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/button-styles';
import { inputClasses } from '../../components/ui/Field';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../features/admin/auth-context';
import { formatCalendarDate, formatDateTime, placeText } from '../../features/admin/format';
import { useLoad, useShipmentsApi } from '../../features/admin/shipments/api';
import { LoadProblem, Loading, Notice, PageHeader, Pager } from '../../features/admin/ui';
import { cn } from '../../lib/cn';

const selectClasses = cn(inputClasses, 'h-10 pr-8 text-sm');

function Eta({ s }: { s: AdminShipmentSummary }) {
  if (s.status === 'DELIVERED' && s.deliveredAt) {
    return <span className="text-tone-success">Delivered {formatDateTime(s.deliveredAt)}</span>;
  }
  if (!s.estimatedDeliveryDate) return <span className="text-ink-400">No estimate</span>;
  return (
    <span className={cn(s.overdue && 'font-semibold text-tone-critical')}>
      {formatCalendarDate(s.estimatedDeliveryDate)}
      {s.overdue && ' · overdue'}
    </span>
  );
}

function Flags({ s }: { s: AdminShipmentSummary }) {
  return (
    <>
      {s.archivedAt && (
        <span className="type-label rounded-xs border border-fog px-1.5 py-0.5 text-[0.625rem] text-ink-400">
          Archived
        </span>
      )}
      {s.isTestData && (
        <span
          title="Development sample data"
          className="type-label inline-flex items-center gap-1 rounded-xs border border-tone-caution/40 px-1.5 py-0.5 text-[0.625rem] text-tone-caution"
        >
          <FlaskConical aria-hidden className="size-3" /> Test
        </span>
      )}
    </>
  );
}

/** /admin/shipments: find any shipment fast. Filters live in the URL, so a view can be bookmarked. */
export function ShipmentsListPage() {
  const api = useShipmentsApi();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = (SHIPMENT_VIEWS as readonly string[]).includes(params.get('view') ?? '')
    ? (params.get('view') as ShipmentView)
    : 'in_progress';
  const query = new URLSearchParams({
    view,
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    method: params.get('method') ?? '',
    sort: params.get('sort') ?? 'updated',
    page: params.get('page') ?? '1',
    pageSize: '25',
  });
  const { state, reload } = useLoad((signal) => api.list(query, signal), [query.toString(), api]);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const flash = (useLocation().state as { flash?: string } | null)?.flash;

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    update({ q: search.trim() });
  }

  return (
    <>
      <title>Shipments | Reduium Admin</title>
      <PageHeader
        eyebrow="Shipments"
        title="All shipments"
        actions={
          can('shipments:write') && (
            <ButtonLink to="/admin/shipments/new">
              <Plus aria-hidden className="size-4" /> New shipment
            </ButtonLink>
          )
        }
      />

      {flash && (
        <div className="mt-6">
          <Notice>{flash}</Notice>
        </div>
      )}

      {/* Views */}
      <div
        role="tablist"
        aria-label="Shipment views"
        className="mt-8 flex gap-1 overflow-x-auto border-b border-fog"
      >
        {SHIPMENT_VIEWS.map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={v === view}
            onClick={() => update({ view: v === 'in_progress' ? '' : v })}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              v === view
                ? 'border-signal text-ink'
                : 'border-transparent text-ink-600 hover:text-ink',
            )}
          >
            {SHIPMENT_VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="shipment-search" className="sr-only">
            Search shipments
          </label>
          <input
            id="shipment-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tracking number, name, email, company or city"
            className={cn(inputClasses, 'h-10 text-sm')}
            maxLength={100}
          />
          <button type="submit" className={buttonClasses('secondary', 'md', 'h-10')}>
            <Search aria-hidden className="size-4" /> Search
          </button>
        </form>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Status</span>
            <select
              value={params.get('status') ?? ''}
              onChange={(e) => update({ status: e.target.value })}
              className={selectClasses}
            >
              <option value="">Any status</option>
              {SHIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_INFO[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Method</span>
            <select
              value={params.get('method') ?? ''}
              onChange={(e) => update({ method: e.target.value })}
              className={selectClasses}
            >
              <option value="">Any method</option>
              {SHIPPING_METHODS.map((m) => (
                <option key={m} value={m}>
                  {SHIPPING_METHOD_INFO[m].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Sort</span>
            <select
              value={params.get('sort') ?? 'updated'}
              onChange={(e) => update({ sort: e.target.value === 'updated' ? '' : e.target.value })}
              className={selectClasses}
            >
              <option value="updated">Recently updated</option>
              <option value="created">Newest first</option>
              <option value="eta">Delivery date (soonest)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6">
        {state.kind !== 'ok' ? (
          state.kind === 'loading' ? (
            <Loading label="Loading shipments…" />
          ) : (
            <LoadProblem state={state} onRetry={reload} />
          )
        ) : state.data.items.length === 0 ? (
          <div className="rounded-md border border-dashed border-fog p-10 text-center">
            <p className="font-medium text-ink">No shipments match.</p>
            <p className="mt-1 text-sm text-ink-600">
              Try another view, clear the filters, or check the spelling.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-md border border-fog bg-paper-50 shadow-card lg:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Shipments</caption>
                <thead className="border-b border-fog bg-fog-200/50">
                  <tr className="type-label text-[0.625rem] text-ink-400">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tracking number
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Route
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Recipient
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Delivery
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fog">
                  {state.data.items.map((s) => (
                    <tr key={s.id} className="hover:bg-fog-200/40">
                      <td className="px-4 py-3 align-top">
                        <Link
                          to={`/admin/shipments/${s.id}`}
                          className="type-data font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {s.trackingNumber}
                        </Link>
                        <div className="mt-1 flex gap-1.5">
                          <Flags s={s} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={s.status} size="sm" />
                        {s.currentLocation && (
                          <p className="mt-1 text-xs text-ink-400">{s.currentLocation}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-ink-600">
                        {placeText(s.origin)} → {placeText(s.destination)}
                        <p className="type-data text-xs text-ink-400">
                          {SHIPPING_METHOD_INFO[s.shippingMethod].label}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-ink">{s.recipientName}</td>
                      <td className="px-4 py-3 align-top">
                        <Eta s={s} />
                      </td>
                      <td className="px-4 py-3 align-top text-ink-400">
                        {formatDateTime(s.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones and tablets: cards */}
            <ul className="space-y-3 lg:hidden">
              {state.data.items.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/admin/shipments/${s.id}`}
                    className="block rounded-md border border-fog bg-paper-50 p-4 shadow-card hover:border-ink/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="type-data font-medium text-ink">{s.trackingNumber}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <p className="mt-2 text-sm text-ink">{s.recipientName}</p>
                    <p className="text-sm text-ink-600">
                      {placeText(s.origin)} → {placeText(s.destination)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Eta s={s} />
                      <Flags s={s} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <Pager
                page={state.data.page}
                pageSize={state.data.pageSize}
                total={state.data.total}
                onPage={(p) => update({ page: String(p) })}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
