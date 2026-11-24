import { ChevronLeft, ChevronRight, RotateCw, SearchX, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/button-styles';
import { cn } from '../../lib/cn';
import { AccessDenied } from './guards';
import type { LoadState } from './shipments/api';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="type-label text-ink-400">{eyebrow}</p>
        <h1 className="type-display mt-2 text-3xl break-words text-ink sm:text-4xl">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-ink-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-ink-600">
      {label}
    </p>
  );
}

/** The non-success states of a LoadState, shown consistently everywhere. */
export function LoadProblem({
  state,
  onRetry,
  notFound = 'This shipment doesn’t exist, or it has been deleted.',
  back = { to: '/admin/shipments', label: 'Back to shipments' },
}: {
  state: Exclude<LoadState<unknown>, { kind: 'ok' }>;
  onRetry: () => void;
  notFound?: string;
  back?: { to: string; label: string };
}) {
  if (state.kind === 'loading') return <Loading />;
  if (state.kind === 'forbidden') return <AccessDenied />;
  if (state.kind === 'not-found') {
    return (
      <section className="rounded-md border border-fog bg-paper-50 p-6">
        <SearchX aria-hidden className="size-6 text-ink-400" />
        <h2 className="type-display mt-3 text-xl text-ink">Not found</h2>
        <p className="mt-1 text-ink-600">{notFound}</p>
        <ButtonLink to={back.to} variant="outline" className="mt-5">
          {back.label}
        </ButtonLink>
      </section>
    );
  }
  return (
    <section
      role="alert"
      className="rounded-md border border-tone-critical/40 bg-tone-critical-bg p-6"
    >
      <TriangleAlert aria-hidden className="size-6 text-tone-critical" />
      <h2 className="type-display mt-3 text-xl text-ink">Couldn&apos;t load this</h2>
      <p className="mt-1 text-ink-600">{state.message}</p>
      <Button variant="secondary" className="mt-5" onClick={onRetry}>
        <RotateCw aria-hidden className="size-4" /> Try again
      </Button>
    </section>
  );
}

export function Notice({
  tone = 'success',
  children,
}: {
  tone?: 'success' | 'critical' | 'caution';
  children: ReactNode;
}) {
  return (
    <p
      role={tone === 'critical' ? 'alert' : 'status'}
      className={cn(
        'rounded-sm border px-4 py-3 text-sm',
        tone === 'success' && 'border-tone-success/40 bg-tone-success-bg text-tone-success',
        tone === 'critical' && 'border-tone-critical/40 bg-tone-critical-bg text-tone-critical',
        tone === 'caution' && 'border-tone-caution/40 bg-tone-caution-bg text-tone-caution',
      )}
    >
      {children}
    </p>
  );
}

/**
 * Confirmation dialog on the native <dialog> element: it traps focus, closes
 * with Escape and is announced as a dialog by screen readers.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unique per dialog: several dialogs can be on one page.
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-md border border-fog bg-paper-50 p-0 text-ink shadow-lift backdrop:bg-ink/60"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && !confirmDisabled) onConfirm();
        }}
        className="p-6"
      >
        <h2 id={titleId} className="type-display text-xl">
          {title}
        </h2>
        <div className="mt-3 space-y-3 text-ink-600">{children}</div>
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-tone-critical">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={buttonClasses('ghost')}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || confirmDisabled}
            className={cn(
              buttonClasses(danger ? 'secondary' : 'primary'),
              danger && 'bg-tone-critical text-paper hover:bg-tone-critical/90',
            )}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-ink-600">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden className="size-4" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
