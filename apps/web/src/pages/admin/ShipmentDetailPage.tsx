import {
  SHIPPING_METHOD_INFO,
  STATUS_INFO,
  type AdminParty,
  type AdminShipmentDetail,
} from '@reduium/shared';
import { Archive, ArchiveRestore, ExternalLink, FlaskConical, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '../../components/ui/Button';
import { inputClasses } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { STATUS_ICONS } from '../../components/ui/status-styles';
import { AdminApiError } from '../../features/admin/api';
import { useAuth } from '../../features/admin/auth-context';
import { formatCalendarDate, formatDateTime, placeText } from '../../features/admin/format';
import { EventForm, type EventValues } from '../../features/admin/shipments/EventForm';
import { useLoad, useShipmentsApi } from '../../features/admin/shipments/api';
import { ConfirmDialog, LoadProblem, Notice, PageHeader } from '../../features/admin/ui';
import { cn } from '../../lib/cn';

const fieldErrors = (error: unknown) =>
  error instanceof AdminApiError && error.issues.length
    ? Object.fromEntries(error.issues.map((i) => [i.field, i.message]))
    : null;
const messageOf = (error: unknown) =>
  error instanceof AdminApiError ? error.message : 'Something went wrong. Please try again.';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-ink-400">{label}</dt>
      <dd className="break-words text-ink">{children}</dd>
    </div>
  );
}

function PartyPanel({ label, p }: { label: string; p: AdminParty }) {
  return (
    <Panel label={label}>
      <address className="text-sm leading-relaxed text-ink not-italic">
        <span className="font-semibold">{p.name}</span>
        {p.company && <>, {p.company}</>}
        <br />
        {p.addressLine1}
        {p.addressLine2 && (
          <>
            <br />
            {p.addressLine2}
          </>
        )}
        <br />
        {[p.city, p.region, p.postalCode].filter(Boolean).join(', ')}
        <br />
        {p.countryCode}
      </address>
      <dl className="mt-3 border-t border-fog pt-2">
        <Row label="Email">
          {p.email ? (
            <a href={`mailto:${p.email}`} className="underline underline-offset-2">
              {p.email}
            </a>
          ) : (
            '—'
          )}
        </Row>
        <Row label="Phone">
          {p.phone ? (
            <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="underline underline-offset-2">
              {p.phone}
            </a>
          ) : (
            '—'
          )}
        </Row>
      </dl>
    </Panel>
  );
}

const ACTION_LABELS: Record<string, string> = {
  'shipment.create': 'Created',
  'shipment.update': 'Details edited',
  'shipment.archive': 'Archived',
  'shipment.unarchive': 'Restored',
  'tracking_event.create': 'Tracking update added',
  'tracking_event.update': 'Tracking update corrected',
  'tracking_event.delete': 'Tracking update removed',
};

function Activity({ id }: { id: string }) {
  const api = useShipmentsApi();
  const { state, reload } = useLoad((signal) => api.activity(id, signal), [id, api]);
  return (
    <Panel label="Activity (audit log)">
      {state.kind === 'ok' ? (
        <ol className="space-y-3 text-sm" aria-label="Activity, newest first">
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

/** /admin/shipments/:id: everything about one shipment, and the daily actions on it. */
export function ShipmentDetailPage() {
  const { id = '' } = useParams();
  const api = useShipmentsApi();
  const { can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, reload, replace } = useLoad((signal) => api.get(id, signal), [id, api]);

  const [flash, setFlash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    null | { kind: 'archive' } | { kind: 'delete' } | { kind: 'delete-event'; eventId: string }
  >(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [addFormKey, setAddFormKey] = useState(0);

  if (state.kind !== 'ok') return <LoadProblem state={state} onRetry={reload} />;
  const s: AdminShipmentDetail = state.data;
  const writable = can('shipments:write') && !s.archivedAt;
  const newestFirst = [...s.events].reverse();

  /** Run a change; show the result or the problem. */
  async function act(work: () => Promise<AdminShipmentDetail | void>, success: string) {
    setProblem(null);
    setFlash(null);
    try {
      const updated = await work();
      if (updated) replace(updated);
      setFlash(success);
      return true;
    } catch (error) {
      setProblem(messageOf(error));
      return false;
    }
  }

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
    setConfirmText('');
  }

  async function confirmDialog() {
    if (!dialog) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog.kind === 'archive') {
        replace(await api.archive(s.id));
        setFlash('Shipment archived. Customers can still track it.');
      } else if (dialog.kind === 'delete-event') {
        replace(await api.deleteEvent(s.id, dialog.eventId));
        setFlash('Tracking update removed.');
      } else {
        await api.remove(s.id, confirmText);
        navigate('/admin/shipments?view=archived', {
          state: { flash: `Shipment ${s.trackingNumber} was permanently deleted.` },
        });
        return;
      }
      closeDialog();
    } catch (error) {
      setDialogError(fieldErrors(error)?.confirmTrackingNumber ?? messageOf(error));
    } finally {
      setDialogBusy(false);
    }
  }

  const addUpdate = async (values: EventValues) => {
    setProblem(null);
    try {
      replace(await api.addEvent(s.id, values));
      setFlash(`Update added: ${STATUS_INFO[values.status].label}.`);
      setAddFormKey((k) => k + 1);
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields) return fields;
      setProblem(messageOf(error));
    }
  };

  return (
    <>
      <title>{`${s.trackingNumber} | Reduium Admin`}</title>
      <p className="mb-4 text-sm">
        <Link to="/admin/shipments" className="text-ink-600 underline-offset-4 hover:underline">
          ← All shipments
        </Link>
      </p>
      <PageHeader
        eyebrow="Shipment"
        title={<span className="type-data tracking-[0.04em]">{s.trackingNumber}</span>}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            {s.archivedAt && (
              <span className="type-label rounded-xs border border-fog px-2 py-1 text-[0.625rem] text-ink-600">
                Archived {formatDateTime(s.archivedAt)}
              </span>
            )}
            {s.overdue && (
              <span className="type-label rounded-xs border border-tone-critical/40 bg-tone-critical-bg px-2 py-1 text-[0.625rem] text-tone-critical">
                Overdue
              </span>
            )}
            {s.isTestData && (
              <span className="type-label inline-flex items-center gap-1 rounded-xs border border-tone-caution/40 bg-tone-caution-bg px-2 py-1 text-[0.625rem] text-tone-caution">
                <FlaskConical aria-hidden className="size-3" /> Test data
              </span>
            )}
          </div>
        }
        actions={
          <>
            <a
              href={`/track/${s.trackingNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-ink hover:bg-ink/[0.06]"
            >
              <ExternalLink aria-hidden className="size-4" /> Public page
            </a>
            {writable && (
              <ButtonLink to={`/admin/shipments/${s.id}/edit`} variant="outline" size="sm">
                <Pencil aria-hidden className="size-4" /> Edit details
              </ButtonLink>
            )}
            {can('shipments:write') &&
              (s.archivedAt ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => act(() => api.unarchive(s.id), 'Shipment restored.')}
                >
                  <ArchiveRestore aria-hidden className="size-4" /> Restore
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setDialog({ kind: 'archive' })}>
                  <Archive aria-hidden className="size-4" /> Archive
                </Button>
              ))}
            {can('shipments:delete') && s.archivedAt && (
              <Button
                variant="outline"
                size="sm"
                className="border-tone-critical/50 text-tone-critical hover:border-tone-critical"
                onClick={() => setDialog({ kind: 'delete' })}
              >
                <Trash2 aria-hidden className="size-4" /> Delete permanently
              </Button>
            )}
          </>
        }
      />

      <div className="mt-6 space-y-3">
        {flash && <Notice>{flash}</Notice>}
        {problem && <Notice tone="critical">{problem}</Notice>}
        {s.archivedAt && (
          <Notice tone="caution">
            This shipment is archived: it&apos;s read-only and hidden from the active lists. Restore
            it to make changes.
          </Notice>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {writable && (
            <Panel label="Add tracking update">
              <EventForm
                key={addFormKey}
                idPrefix="add-event"
                liveTime
                submitLabel="Add update"
                initial={{
                  status: s.status,
                  location: s.currentLocation ?? '',
                  description: STATUS_INFO[s.status].description,
                  occurredAt: new Date().toISOString(),
                }}
                onSubmit={addUpdate}
              />
            </Panel>
          )}

          <Panel
            label="Tracking history"
            reference={`${s.events.length} ${s.events.length === 1 ? 'update' : 'updates'} · newest first`}
            bodyClassName="p-0"
          >
            <ol aria-label="Tracking history, newest first" className="divide-y divide-fog">
              {newestFirst.map((e, i) => {
                const Icon = STATUS_ICONS[e.status];
                return (
                  <li key={e.id} className="px-5 py-4" data-current={i === 0 || undefined}>
                    {editingEvent === e.id ? (
                      <EventForm
                        idPrefix={`edit-${e.id}`}
                        submitLabel="Save correction"
                        initial={e}
                        onCancel={() => setEditingEvent(null)}
                        onSubmit={async (values) => {
                          try {
                            replace(await api.updateEvent(s.id, e.id, values));
                            setEditingEvent(null);
                            setFlash('Tracking update corrected.');
                          } catch (error) {
                            const fields = fieldErrors(error);
                            if (fields) return fields;
                            setProblem(messageOf(error));
                          }
                        }}
                      />
                    ) : (
                      <div className="flex gap-3">
                        <Icon
                          aria-hidden
                          className={cn(
                            'mt-0.5 size-5 shrink-0',
                            i === 0 ? 'text-signal-600' : 'text-ink-400',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <p className="font-semibold text-ink">{STATUS_INFO[e.status].label}</p>
                            {i === 0 && (
                              <span className="type-label text-[0.625rem] text-signal-600">
                                Current
                              </span>
                            )}
                            <time
                              dateTime={e.occurredAt}
                              className="type-data ml-auto text-xs text-ink-400"
                            >
                              {formatDateTime(e.occurredAt)}
                            </time>
                          </div>
                          <p className="mt-1 text-sm text-ink-600">{e.description}</p>
                          <p className="mt-1 text-sm text-ink-600">{e.location}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-400">
                            <span>
                              Entered {formatDateTime(e.createdAt)}
                              {e.createdBy ? ` by ${e.createdBy.name}` : ''}
                            </span>
                            {writable && (
                              <>
                                <button
                                  type="button"
                                  className="font-medium text-ink-600 underline underline-offset-2 hover:text-ink"
                                  onClick={() => setEditingEvent(e.id)}
                                >
                                  Edit
                                  <span className="sr-only">
                                    {' '}
                                    update “{STATUS_INFO[e.status].label}”
                                  </span>
                                </button>
                                {s.events.length > 1 && (
                                  <button
                                    type="button"
                                    className="font-medium text-tone-critical underline underline-offset-2"
                                    onClick={() =>
                                      setDialog({ kind: 'delete-event', eventId: e.id })
                                    }
                                  >
                                    Delete
                                    <span className="sr-only">
                                      {' '}
                                      update “{STATUS_INFO[e.status].label}”
                                    </span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel label="Summary">
            <dl>
              <Row label="Route">
                {placeText(s.origin)} → {placeText(s.destination)}
              </Row>
              <Row label="Now at">{s.currentLocation ?? '—'}</Row>
              <Row label="Service">{SHIPPING_METHOD_INFO[s.shippingMethod].label}</Row>
              <Row label={s.deliveredAt ? 'Delivered' : 'Estimated'}>
                {s.deliveredAt
                  ? formatDateTime(s.deliveredAt)
                  : s.estimatedDeliveryDate
                    ? formatCalendarDate(s.estimatedDeliveryDate)
                    : 'Not set'}
              </Row>
              <Row label="Pieces">{s.pieceCount}</Row>
              <Row label="Weight">{s.weightKg === null ? '—' : `${s.weightKg} kg`}</Row>
              <Row label="Contents">{s.contentsDescription ?? '—'}</Row>
              <Row label="Created">
                {formatDateTime(s.createdAt)}
                {s.createdBy ? ` by ${s.createdBy.name}` : ''}
              </Row>
              <Row label="Last change">
                {formatDateTime(s.updatedAt)}
                {s.updatedBy ? ` by ${s.updatedBy.name}` : ''}
              </Row>
            </dl>
          </Panel>
          <PartyPanel label="Recipient" p={s.recipient} />
          <PartyPanel label="Sender" p={s.sender} />
          <Panel label="Internal notes (staff only)">
            <p className="text-sm whitespace-pre-wrap text-ink">
              {s.internalNotes ?? <span className="text-ink-400">No notes.</span>}
            </p>
          </Panel>
          {can('audit:read') && <Activity key={s.updatedAt} id={s.id} />}
        </div>
      </div>

      <ConfirmDialog
        open={dialog?.kind === 'archive'}
        title="Archive this shipment?"
        confirmLabel="Archive"
        busy={dialogBusy}
        error={dialogError}
        onConfirm={confirmDialog}
        onClose={closeDialog}
      >
        <p>
          It will be hidden from the active lists and become read-only. Nothing is deleted,
          customers can still track it, and you can restore it at any time.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'delete-event'}
        title="Delete this tracking update?"
        confirmLabel="Delete update"
        danger
        busy={dialogBusy}
        error={dialogError}
        onConfirm={confirmDialog}
        onClose={closeDialog}
      >
        <p>
          It will disappear from the history customers see. If it was the newest update, the
          shipment&apos;s status goes back to the previous one. The audit log keeps a record.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title="Delete this shipment permanently?"
        confirmLabel="Delete permanently"
        danger
        busy={dialogBusy}
        error={dialogError}
        confirmDisabled={confirmText.trim().toUpperCase() !== s.trackingNumber}
        onConfirm={confirmDialog}
        onClose={closeDialog}
      >
        <p>
          The shipment, its customer details and its whole tracking history will be removed and
          can&apos;t be recovered. Customers will no longer be able to track it. The audit log keeps
          a record that it existed.
        </p>
        <label htmlFor="confirm-tn" className="block text-sm font-medium text-ink">
          Type <span className="type-data">{s.trackingNumber}</span> to confirm
        </label>
        <input
          id="confirm-tn"
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
