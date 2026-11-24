import {
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_INFO,
  SUPPORT_TOPIC_LABELS,
  STATUS_INFO,
  type AdminSupportActivity,
  type AdminSupportDetail,
  type ShipmentStatus,
  type SupportPriority,
  type SupportStatus,
} from '@reduium/shared';
import {
  ArrowRightLeft,
  Copy,
  FlaskConical,
  Inbox,
  Lock,
  Mail,
  MailWarning,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/button-styles';
import { FieldShell, TextAreaField, inputClasses } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { AdminApiError } from '../../features/admin/api';
import { useAuth } from '../../features/admin/auth-context';
import { formatDateTime } from '../../features/admin/format';
import { useLoad } from '../../features/admin/shipments/api';
import { MAILTO_BODY_LIMIT, replyMailto, useSupportApi } from '../../features/admin/support/api';
import { SupportStatusBadge, UrgentBadge } from '../../features/admin/support/badges';
import { ConfirmDialog, LoadProblem, Notice, PageHeader } from '../../features/admin/ui';
import { cn } from '../../lib/cn';

const messageOf = (error: unknown) =>
  error instanceof AdminApiError ? error.message : 'Something went wrong. Please try again.';
const fieldError = (error: unknown, field: string) =>
  error instanceof AdminApiError ? error.issues.find((i) => i.field === field)?.message : undefined;
const statusLabel = (v: string | null) =>
  v ? (SUPPORT_STATUS_INFO[v as SupportStatus]?.label ?? v) : '';
const priorityLabel = (v: string | null) =>
  v ? (SUPPORT_PRIORITY_LABELS[v as SupportPriority] ?? v) : '';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-ink-400">{label}</dt>
      <dd className="break-words text-ink">{children}</dd>
    </div>
  );
}

/** "Open in my email" + "Copy reply text": staff send the reply themselves. */
function SendYourself({ r, body }: { r: AdminSupportDetail; body: string }) {
  const [copied, setCopied] = useState(false);
  const tooLong = body.length > MAILTO_BODY_LIMIT;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={replyMailto(r, body)} className={buttonClasses('outline', 'sm')}>
        <Mail aria-hidden className="size-4" /> Open in my email
      </a>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void navigator.clipboard?.writeText(body).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        <Copy aria-hidden className="size-4" /> {copied ? 'Copied' : 'Copy reply text'}
      </Button>
      {tooLong && (
        <span className="text-xs text-ink-600">
          This reply is long, so paste it into the email yourself.
        </span>
      )}
    </div>
  );
}

function TimelineEntry({ a, r }: { a: AdminSupportActivity; r: AdminSupportDetail }) {
  const who = a.actor?.name ?? 'System';
  const when = formatDateTime(a.createdAt);
  if (a.type === 'INTERNAL_NOTE') {
    return (
      <div className="rounded-sm border border-tone-caution/40 bg-tone-caution-bg/60 p-4">
        <p className="type-label flex items-center gap-1.5 text-[0.625rem] text-tone-caution">
          <Lock aria-hidden className="size-3" /> Internal note · staff only
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-ink">{a.body}</p>
        <p className="mt-2 text-xs text-ink-400">
          {who} · {when}
        </p>
      </div>
    );
  }
  if (a.type === 'REPLY_RECORDED') {
    return (
      <div className="rounded-sm border border-tone-progress/35 bg-tone-progress-bg/60 p-4">
        <p className="type-label flex items-center gap-1.5 text-[0.625rem] text-tone-progress">
          <MailWarning aria-hidden className="size-3" /> Reply recorded · not sent by Reduium
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-ink">{a.body}</p>
        <p className="mt-2 text-xs text-ink-600">
          {who} recorded this reply on {when}. Reduium does not send email: it should be sent from
          the staff member&apos;s own email program.
        </p>
        <div className="mt-3">
          <SendYourself r={r} body={a.body ?? ''} />
        </div>
      </div>
    );
  }
  const text =
    a.type === 'STATUS_CHANGED'
      ? `${who} changed the status from ${statusLabel(a.fromValue)} to ${statusLabel(a.toValue)}.`
      : a.type === 'PRIORITY_CHANGED'
        ? `${who} changed the priority from ${priorityLabel(a.fromValue)} to ${priorityLabel(a.toValue)}.`
        : a.assignee
          ? `${who} assigned this to ${a.assignee.name}${a.assignee.disabled ? ' (account since disabled)' : ''}.`
          : `${who} unassigned this request.`;
  return (
    <p className="flex gap-2 text-sm text-ink-600">
      <ArrowRightLeft aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
      <span>
        {text} <span className="text-xs text-ink-400">{when}</span>
      </span>
    </p>
  );
}

const ACTION_LABELS: Record<string, string> = {
  'support_request.update': 'Status, priority or assignee changed',
  'support_request.note_add': 'Internal note added',
  'support_request.reply_record': 'Reply recorded',
  'support_request.delete': 'Deleted',
};

function AuditTrail({ id }: { id: string }) {
  const api = useSupportApi();
  const { state, reload } = useLoad((signal) => api.activity(id, signal), [id, api]);
  return (
    <Panel label="Activity (audit log)">
      {state.kind === 'ok' ? (
        state.data.length === 0 ? (
          <p className="text-sm text-ink-600">No staff actions yet.</p>
        ) : (
          <ol className="space-y-3 text-sm" aria-label="Audit log, newest first">
            {state.data.map((a) => (
              <li key={a.id}>
                <p className="font-medium text-ink">{ACTION_LABELS[a.action] ?? a.action}</p>
                <p className="text-ink-600">{a.summary}</p>
                <p className="text-xs text-ink-400">
                  {formatDateTime(a.createdAt)} · {a.actorName ?? a.actorEmail ?? 'System'}
                </p>
              </li>
            ))}
          </ol>
        )
      ) : state.kind === 'loading' ? (
        <p className="text-sm text-ink-600">Loading…</p>
      ) : (
        <button type="button" onClick={reload} className="text-sm underline">
          Couldn&apos;t load activity. Try again
        </button>
      )}
    </Panel>
  );
}

/** Status, priority and assignee. Saved together, with conflict detection. */
function ManagePanel({
  r,
  onSaved,
  onReload,
}: {
  r: AdminSupportDetail;
  onSaved: (updated: AdminSupportDetail, message: string) => void;
  onReload: () => void;
}) {
  const api = useSupportApi();
  const { state: auth } = useAuth();
  const meId = auth.status === 'authenticated' ? auth.info.admin.id : '';
  const assignees = useLoad((signal) => api.assignees(signal), [api]);
  const [status, setStatus] = useState<SupportStatus>(r.status);
  const [priority, setPriority] = useState<SupportPriority>(r.priority);
  const [assignedToId, setAssignedToId] = useState<string>(r.assignee?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; stale: boolean; field?: string } | null>(
    null,
  );
  const closed = r.status === 'CLOSED';
  const changed =
    status !== r.status || priority !== r.priority || assignedToId !== (r.assignee?.id ?? '');

  const options = assignees.state.kind === 'ok' ? assignees.state.data : [];
  const currentMissing = r.assignee && !options.some((o) => o.id === r.assignee!.id);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!changed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.update(r.id, {
        expectedUpdatedAt: r.updatedAt,
        ...(status !== r.status ? { status } : {}),
        ...(priority !== r.priority ? { priority } : {}),
        ...(assignedToId !== (r.assignee?.id ?? '') ? { assignedToId: assignedToId || null } : {}),
      });
      onSaved(updated, 'Changes saved.');
    } catch (err) {
      setError({
        message: fieldError(err, 'assignedToId') ?? messageOf(err),
        stale:
          err instanceof AdminApiError && err.status === 409 && /someone else/.test(err.message),
      });
    } finally {
      setBusy(false);
    }
  }

  const select = cn(inputClasses, 'h-10 pr-8 text-sm');
  return (
    <Panel label="Manage">
      <form onSubmit={save} className="space-y-4" aria-label="Manage this request">
        {closed && (
          <p className="text-sm text-ink-600">
            This request is closed and read-only. Change its status to reopen it.
          </p>
        )}
        <FieldShell label="Status">
          {({ inputId }) => (
            <select
              id={inputId}
              value={status}
              onChange={(e) => setStatus(e.target.value as SupportStatus)}
              className={select}
            >
              {SUPPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SUPPORT_STATUS_INFO[s].label}
                </option>
              ))}
            </select>
          )}
        </FieldShell>
        <FieldShell label="Priority">
          {({ inputId }) => (
            <select
              id={inputId}
              value={priority}
              disabled={closed && status === 'CLOSED'}
              onChange={(e) => setPriority(e.target.value as SupportPriority)}
              className={select}
            >
              {SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {SUPPORT_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          )}
        </FieldShell>
        <FieldShell
          label="Assigned to"
          hint={
            status === 'NEW' && r.status === 'NEW'
              ? 'Assigning a New request starts it (In progress).'
              : undefined
          }
        >
          {({ inputId, describedBy }) => (
            <div className="flex gap-2">
              <select
                id={inputId}
                aria-describedby={describedBy}
                value={assignedToId}
                disabled={closed && status === 'CLOSED'}
                onChange={(e) => setAssignedToId(e.target.value)}
                className={select}
              >
                <option value="">Unassigned</option>
                {currentMissing && (
                  <option value={r.assignee!.id}>{r.assignee!.name} (account disabled)</option>
                )}
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {meId &&
                assignedToId !== meId &&
                !(closed && status === 'CLOSED') &&
                options.some((o) => o.id === meId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => setAssignedToId(meId)}
                  >
                    Me
                  </Button>
                )}
            </div>
          )}
        </FieldShell>
        {error && (
          <div role="alert" className="space-y-2 text-sm font-medium text-tone-critical">
            <p>{error.message}</p>
            {error.stale && (
              <Button variant="secondary" size="sm" onClick={onReload}>
                Load the latest version
              </Button>
            )}
          </div>
        )}
        <Button type="submit" disabled={!changed || busy} className="w-full">
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Panel>
  );
}

/** Add an internal note: never shown to the customer. */
function NoteForm({
  r,
  onDone,
}: {
  r: AdminSupportDetail;
  onDone: (u: AdminSupportDetail) => void;
}) {
  const api = useSupportApi();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!body.trim()) return setError('Write the note first.');
    setBusy(true);
    setError(null);
    try {
      onDone(await api.addNote(r.id, body));
      setBody('');
    } catch (err) {
      setError(fieldError(err, 'body') ?? messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-label="Add an internal note" className="space-y-3">
      <TextAreaField
        label="Internal note (staff only)"
        name="note"
        rows={3}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        error={error}
        hint="Visible only to Reduium staff. Never sent to the customer."
      />
      <Button type="submit" variant="secondary" disabled={busy}>
        <Lock aria-hidden className="size-4" /> {busy ? 'Saving…' : 'Add note'}
      </Button>
    </form>
  );
}

/** Record a reply the staff member sends from their own email program. */
function ReplyForm({
  r,
  onDone,
}: {
  r: AdminSupportDetail;
  onDone: (u: AdminSupportDetail, reply: string) => void;
}) {
  const api = useSupportApi();
  const [body, setBody] = useState('');
  const [markWaiting, setMarkWaiting] = useState(r.status !== 'WAITING_ON_CUSTOMER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!body.trim()) return setError('Write the reply first.');
    setBusy(true);
    setError(null);
    try {
      const reply = body.trim();
      onDone(
        await api.recordReply(r.id, body, markWaiting && r.status !== 'WAITING_ON_CUSTOMER'),
        reply,
      );
      setBody('');
    } catch (err) {
      setError(fieldError(err, 'body') ?? messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-label="Record a reply" className="space-y-3">
      <TextAreaField
        label="Reply to the customer"
        name="reply"
        rows={5}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        error={error}
        hint="Reduium does not send email. Recording saves the reply here; you then send it from your own email program."
      />
      {r.status !== 'WAITING_ON_CUSTOMER' && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={markWaiting}
            onChange={(e) => setMarkWaiting(e.target.checked)}
            className="size-4 accent-ink"
          />
          Also set the status to Waiting on customer
        </label>
      )}
      <Button type="submit" disabled={busy}>
        <Mail aria-hidden className="size-4" /> {busy ? 'Saving…' : 'Record reply'}
      </Button>
    </form>
  );
}

/** /admin/support/:id: one support request, its timeline, and the daily actions on it. */
export function SupportDetailPage() {
  const { id = '' } = useParams();
  const api = useSupportApi();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { state, reload, replace } = useLoad((signal) => api.get(id, signal), [id, api]);
  const [flash, setFlash] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  if (state.kind !== 'ok') {
    return (
      <LoadProblem
        state={state}
        onRetry={reload}
        notFound="This support request doesn’t exist, or it has been deleted."
        back={{ to: '/admin/support', label: 'Back to support' }}
      />
    );
  }
  const r = state.data;
  const writable = can('support:write') && r.status !== 'CLOSED';

  const updated = (u: AdminSupportDetail, message: string, reply: string | null = null) => {
    replace(u);
    setFlash(message);
    setLastReply(reply);
  };

  async function confirmDelete() {
    setDialogBusy(true);
    setDialogError(null);
    try {
      await api.remove(r.id, confirmText);
      navigate('/admin/support?view=closed', {
        state: { flash: `Support request ${r.reference} was permanently deleted.` },
      });
    } catch (error) {
      setDialogError(fieldError(error, 'confirmReference') ?? messageOf(error));
    } finally {
      setDialogBusy(false);
    }
  }

  return (
    <>
      <title>{`${r.reference} | Support | Reduium Admin`}</title>
      <p className="mb-4 text-sm">
        <Link
          to="/admin/support"
          className="text-ink-600 underline underline-offset-4 hover:text-ink"
        >
          ← Support requests
        </Link>
      </p>
      <PageHeader
        eyebrow="Support request"
        title={<span className="type-data">{r.reference}</span>}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <SupportStatusBadge status={r.status} />
            <UrgentBadge priority={r.priority} />
            {r.isTestData && (
              <span className="type-label inline-flex items-center gap-1 rounded-xs border border-tone-caution/40 px-1.5 py-0.5 text-[0.625rem] text-tone-caution">
                <FlaskConical aria-hidden className="size-3" /> Test data
              </span>
            )}
          </div>
        }
        actions={
          can('support:delete') &&
          r.status === 'CLOSED' && (
            <Button variant="outline" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden className="size-4" /> Delete permanently
            </Button>
          )
        }
      />

      {flash && (
        <div className="mt-6 space-y-3">
          <Notice>{flash}</Notice>
          {lastReply && (
            <div className="rounded-sm border border-tone-caution/40 bg-tone-caution-bg px-4 py-3 text-sm text-ink">
              <p className="font-medium">
                This reply has NOT been sent. Reduium does not send email; send it from your own
                email program:
              </p>
              <div className="mt-2">
                <SendYourself r={r} body={lastReply} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Panel label="Customer message">
            <h2 className="type-display text-xl break-words text-ink">{r.subject}</h2>
            <p className="mt-1 text-sm text-ink-600">
              {SUPPORT_TOPIC_LABELS[r.topic]} · received {formatDateTime(r.createdAt)}
            </p>
            {/* Plain text only: customer input is never interpreted as HTML or links. */}
            <p className="mt-4 whitespace-pre-wrap break-words text-ink">{r.message}</p>
          </Panel>

          <section aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="type-label text-ink-400">
              Timeline
            </h2>
            <ol aria-label="Timeline, oldest first" className="mt-3 space-y-4">
              <li className="flex gap-2 text-sm text-ink-600">
                <Inbox aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                <span>
                  Message received through the contact form.{' '}
                  <span className="text-xs text-ink-400">{formatDateTime(r.createdAt)}</span>
                </span>
              </li>
              {r.activities.map((a) => (
                <li key={a.id}>
                  <TimelineEntry a={a} r={r} />
                </li>
              ))}
            </ol>
          </section>

          {writable ? (
            <div className="grid gap-6">
              <Panel label="Reply to the customer">
                <ReplyForm
                  key={`reply-${r.updatedAt}`}
                  r={r}
                  onDone={(u, reply) => updated(u, 'Reply recorded.', reply)}
                />
              </Panel>
              <Panel label="Internal note">
                <NoteForm
                  key={`note-${r.updatedAt}`}
                  r={r}
                  onDone={(u) => updated(u, 'Internal note added.')}
                />
              </Panel>
            </div>
          ) : (
            r.status === 'CLOSED' && (
              <p className="rounded-sm border border-fog bg-paper-50 px-4 py-3 text-sm text-ink-600">
                This request is closed. Notes and replies can be added again after reopening it.
              </p>
            )
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {can('support:write') && (
            <ManagePanel
              key={`manage-${r.updatedAt}`}
              r={r}
              onSaved={(u, m) => updated(u, m)}
              onReload={() => {
                setFlash(null);
                reload();
              }}
            />
          )}
          <Panel label="Customer">
            <dl>
              <Row label="Name">{r.name}</Row>
              <Row label="Email">
                <a href={`mailto:${r.email}`} className="underline underline-offset-2">
                  {r.email}
                </a>
              </Row>
              <Row label="Phone">
                {r.phone ? (
                  <a
                    href={`tel:${r.phone.replace(/\s/g, '')}`}
                    className="underline underline-offset-2"
                  >
                    {r.phone}
                  </a>
                ) : (
                  '—'
                )}
              </Row>
              <Row label="Tracking no.">
                {r.trackingNumber ? (
                  r.shipment ? (
                    <Link
                      to={`/admin/shipments/${r.shipment.id}`}
                      className="type-data underline underline-offset-2"
                    >
                      {r.trackingNumber}
                    </Link>
                  ) : (
                    <span className="type-data">
                      {r.trackingNumber}{' '}
                      <span className="font-sans text-xs text-ink-400">(no matching shipment)</span>
                    </span>
                  )
                ) : (
                  '—'
                )}
              </Row>
              {r.shipment && (
                <Row label="Shipment">
                  {STATUS_INFO[r.shipment.status as ShipmentStatus]?.label ?? r.shipment.status}
                  {r.shipment.archived && ' (archived)'}
                </Row>
              )}
            </dl>
          </Panel>
          <Panel label="Details">
            <dl>
              <Row label="Assigned to">
                {r.assignee ? (
                  <span className="inline-flex items-center gap-1">
                    <UserRound aria-hidden className="size-3.5 text-ink-400" />
                    {r.assignee.name}
                    {r.assignee.disabled && ' (account disabled)'}
                  </span>
                ) : (
                  'Unassigned'
                )}
              </Row>
              <Row label="Last activity">{formatDateTime(r.lastActivityAt)}</Row>
              {r.resolvedAt && <Row label="Resolved">{formatDateTime(r.resolvedAt)}</Row>}
              {r.closedAt && <Row label="Closed">{formatDateTime(r.closedAt)}</Row>}
              {r.updatedBy && <Row label="Last change by">{r.updatedBy.name}</Row>}
            </dl>
          </Panel>
          {can('audit:read') && <AuditTrail key={`audit-${r.updatedAt}`} id={r.id} />}
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Delete this support request permanently?"
        confirmLabel="Delete permanently"
        danger
        busy={dialogBusy}
        error={dialogError}
        confirmDisabled={confirmText.trim().toUpperCase() !== r.reference}
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleting(false);
          setDialogError(null);
          setConfirmText('');
        }}
      >
        <p>
          The request, the customer&apos;s details and its whole timeline (notes and recorded
          replies) will be removed and can&apos;t be recovered. The audit log keeps a record that it
          existed, without the customer&apos;s personal details.
        </p>
        <label htmlFor="confirm-ref" className="block text-sm font-medium text-ink">
          Type <span className="type-data">{r.reference}</span> to confirm
        </label>
        <input
          id="confirm-ref"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={cn(inputClasses, 'type-data h-11 uppercase')}
        />
      </ConfirmDialog>
    </>
  );
}
