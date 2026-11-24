import {
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_INFO,
  SUPPORT_TOPICS,
  SUPPORT_TOPIC_LABELS,
  SUPPORT_VIEWS,
  SUPPORT_VIEW_LABELS,
  type AdminSupportSummary,
  type SupportView,
} from '@reduium/shared';
import { FlaskConical, Search, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { buttonClasses } from '../../components/ui/button-styles';
import { inputClasses } from '../../components/ui/Field';
import { formatDateTime } from '../../features/admin/format';
import { useLoad } from '../../features/admin/shipments/api';
import { useSupportApi } from '../../features/admin/support/api';
import { SupportStatusBadge, UrgentBadge } from '../../features/admin/support/badges';
import { LoadProblem, Loading, Notice, PageHeader, Pager } from '../../features/admin/ui';
import { cn } from '../../lib/cn';

const selectClasses = cn(inputClasses, 'h-10 pr-8 text-sm');

function Assignee({ r }: { r: AdminSupportSummary }) {
  if (!r.assignee) return <span className="text-ink-400">Unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <UserRound aria-hidden className="size-3.5 text-ink-400" />
      {r.assignee.name}
      {r.assignee.disabled && (
        <span className="text-xs font-medium text-tone-caution">(assignee disabled)</span>
      )}
    </span>
  );
}

function TestFlag({ r }: { r: AdminSupportSummary }) {
  if (!r.isTestData) return null;
  return (
    <span
      title="Development sample data"
      className="type-label inline-flex items-center gap-1 rounded-xs border border-tone-caution/40 px-1.5 py-0.5 text-[0.625rem] text-tone-caution"
    >
      <FlaskConical aria-hidden className="size-3" /> Test
    </span>
  );
}

/** /admin/support: the support inbox. Filters live in the URL, so a view can be bookmarked. */
export function SupportListPage() {
  const api = useSupportApi();
  const [params, setParams] = useSearchParams();
  const view = (SUPPORT_VIEWS as readonly string[]).includes(params.get('view') ?? '')
    ? (params.get('view') as SupportView)
    : 'open';
  const query = new URLSearchParams({
    view,
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    topic: params.get('topic') ?? '',
    priority: params.get('priority') ?? '',
    sort: params.get('sort') ?? 'newest',
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
      <title>Support | Reduium Admin</title>
      <PageHeader
        eyebrow="Customer support"
        title="Support requests"
        description="Messages sent through the contact form on the Support page."
      />

      {flash && (
        <div className="mt-6">
          <Notice>{flash}</Notice>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Support views"
        className="mt-8 flex gap-1 overflow-x-auto border-b border-fog"
      >
        {SUPPORT_VIEWS.map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={v === view}
            onClick={() => update({ view: v === 'open' ? '' : v })}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              v === view
                ? 'border-signal text-ink'
                : 'border-transparent text-ink-600 hover:text-ink',
            )}
          >
            {SUPPORT_VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-end">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="support-search" className="sr-only">
            Search support requests
          </label>
          <input
            id="support-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, name, email, subject, message or tracking number"
            className={cn(inputClasses, 'h-10 text-sm')}
            maxLength={100}
          />
          <button type="submit" className={buttonClasses('secondary', 'md', 'h-10')}>
            <Search aria-hidden className="size-4" /> Search
          </button>
        </form>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex">
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Status</span>
            <select
              value={params.get('status') ?? ''}
              onChange={(e) => update({ status: e.target.value })}
              className={selectClasses}
            >
              <option value="">Any status</option>
              {SUPPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SUPPORT_STATUS_INFO[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Topic</span>
            <select
              value={params.get('topic') ?? ''}
              onChange={(e) => update({ topic: e.target.value })}
              className={selectClasses}
            >
              <option value="">Any topic</option>
              {SUPPORT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {SUPPORT_TOPIC_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Priority</span>
            <select
              value={params.get('priority') ?? ''}
              onChange={(e) => update({ priority: e.target.value })}
              className={selectClasses}
            >
              <option value="">Any priority</option>
              {SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {SUPPORT_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="type-label text-[0.625rem] text-ink-400">Sort</span>
            <select
              value={params.get('sort') ?? 'newest'}
              onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
              className={selectClasses}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="activity">Recent activity</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6">
        {state.kind !== 'ok' ? (
          state.kind === 'loading' ? (
            <Loading label="Loading support requests…" />
          ) : (
            <LoadProblem
              state={state}
              onRetry={reload}
              back={{ to: '/admin/support', label: 'Back to support' }}
            />
          )
        ) : state.data.items.length === 0 ? (
          <div className="rounded-md border border-dashed border-fog p-10 text-center">
            <p className="font-medium text-ink">No support requests match.</p>
            <p className="mt-1 text-sm text-ink-600">
              Try another view, clear the filters, or check the spelling.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-md border border-fog bg-paper-50 shadow-card lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">Support requests</caption>
                <thead className="border-b border-fog bg-fog-200/50">
                  <tr className="type-label text-[0.625rem] text-ink-400">
                    <th scope="col" className="w-40 px-4 py-3 font-medium">
                      Reference
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Request
                    </th>
                    <th scope="col" className="w-44 px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="w-44 px-4 py-3 font-medium">
                      Assigned to
                    </th>
                    <th scope="col" className="w-40 px-4 py-3 font-medium">
                      Received
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fog">
                  {state.data.items.map((r) => (
                    <tr key={r.id} className="hover:bg-fog-200/40">
                      <td className="px-4 py-3 align-top">
                        <Link
                          to={`/admin/support/${r.id}`}
                          className="type-data font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {r.reference}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <UrgentBadge priority={r.priority} />
                          <TestFlag r={r} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="truncate font-medium text-ink">{r.subject}</p>
                        <p className="truncate text-ink-600">
                          {r.name} · {r.email}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-ink-400">
                          {SUPPORT_TOPIC_LABELS[r.topic]}
                          {r.trackingNumber && ` · ${r.trackingNumber}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <SupportStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 align-top text-ink">
                        <Assignee r={r} />
                      </td>
                      <td className="px-4 py-3 align-top text-ink-400">
                        {formatDateTime(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones and tablets: cards */}
            <ul className="space-y-3 lg:hidden">
              {state.data.items.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/admin/support/${r.id}`}
                    className="block rounded-md border border-fog bg-paper-50 p-4 shadow-card hover:border-ink/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="type-data font-medium text-ink">{r.reference}</span>
                      <SupportStatusBadge status={r.status} />
                    </div>
                    <p className="mt-2 font-medium break-words text-ink">{r.subject}</p>
                    <p className="text-sm break-words text-ink-600">{r.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                      <Assignee r={r} />
                      <span className="text-ink-400">· {formatDateTime(r.createdAt)}</span>
                      <UrgentBadge priority={r.priority} />
                      <TestFlag r={r} />
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
