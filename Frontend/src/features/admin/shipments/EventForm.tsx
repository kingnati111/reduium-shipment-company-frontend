import { SHIPMENT_STATUSES, STATUS_INFO, type ShipmentStatus } from '@reduium/shared';
import { useState, type FormEvent } from 'react';
import { buttonClasses } from '../../../components/ui/button-styles';
import { inputClasses } from '../../../components/ui/Field';
import { cn } from '../../../lib/cn';
import { fromLocalInputValue, toLocalInputValue } from '../format';

export interface EventValues {
  status: ShipmentStatus;
  location: string;
  description: string;
  /** ISO 8601 */
  occurredAt: string;
}

interface Props {
  initial: EventValues;
  submitLabel: string;
  onSubmit: (values: EventValues) => Promise<Record<string, string> | void>;
  onCancel?: () => void;
  /**
   * New updates: if the time is left untouched, use the moment of saving.
   * Corrections: if untouched, keep the exact original time.
   */
  liveTime?: boolean;
  /** Prefix for element ids, so two forms can be on one page. */
  idPrefix: string;
}

/**
 * Status, location, description and time of one tracking update. Location
 * and description are shown to CUSTOMERS on the tracking page, so they
 * must never contain a street address or private details.
 */
export function EventForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  idPrefix,
  liveTime = false,
}: Props) {
  const [values, setValues] = useState({
    ...initial,
    occurredAt: toLocalInputValue(new Date(initial.occurredAt)),
  });
  // While the description is still the automatic one, it follows the status.
  const [autoDescription, setAutoDescription] = useState(
    initial.description === STATUS_INFO[initial.status].description,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The time box only shows what the browser can display; until someone
  // changes it, the exact time is used (see liveTime) so ordering is precise.
  const [timeTouched, setTimeTouched] = useState(false);
  // A hint for the date picker only; the server rejects future times anyway.
  const [latestAllowed] = useState(() => toLocalInputValue(new Date(Date.now() + 5 * 60_000)));
  const [busy, setBusy] = useState(false);
  const id = (name: string) => `${idPrefix}-${name}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const quick: Record<string, string> = {};
    if (!values.location.trim()) quick.location = 'Location is required.';
    if (!values.description.trim()) quick.description = 'Description is required.';
    const iso = timeTouched
      ? fromLocalInputValue(values.occurredAt)
      : liveTime
        ? new Date().toISOString()
        : initial.occurredAt;
    if (!iso) quick.occurredAt = 'Enter when this happened.';
    setErrors(quick);
    if (Object.keys(quick).length) return;

    setBusy(true);
    const serverErrors = await onSubmit({ ...values, occurredAt: iso });
    setBusy(false);
    if (serverErrors) setErrors(serverErrors);
  }

  const err = (name: string) =>
    errors[name] && (
      <p id={id(`${name}-error`)} className="text-sm font-medium text-tone-critical">
        {errors[name]}
      </p>
    );
  const a11y = (name: string) => ({
    id: id(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? id(`${name}-error`) : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id('status')} className="type-label text-ink-600">
          Status
        </label>
        <select
          {...a11y('status')}
          value={values.status}
          onChange={(e) => {
            const status = e.target.value as ShipmentStatus;
            setValues((v) => ({
              ...v,
              status,
              description: autoDescription ? STATUS_INFO[status].description : v.description,
            }));
          }}
          className={cn(inputClasses, 'h-11')}
        >
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_INFO[s].label}
            </option>
          ))}
        </select>
        {err('status')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={id('occurredAt')} className="type-label text-ink-600">
          When it happened
        </label>
        <input
          {...a11y('occurredAt')}
          type="datetime-local"
          value={values.occurredAt}
          max={latestAllowed}
          step={1}
          onChange={(e) => {
            setTimeTouched(true);
            setValues((v) => ({ ...v, occurredAt: e.target.value }));
          }}
          className={cn(inputClasses, 'h-11')}
        />
        {err('occurredAt')}
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={id('location')} className="type-label text-ink-600">
          Location{' '}
          <span className="normal-case tracking-normal text-ink-400">(shown to customers)</span>
        </label>
        <input
          {...a11y('location')}
          value={values.location}
          maxLength={160}
          placeholder="e.g. Rotterdam sorting hub, NL"
          onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
          className={cn(inputClasses, 'h-11')}
        />
        {err('location')}
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={id('description')} className="type-label text-ink-600">
          Description{' '}
          <span className="normal-case tracking-normal text-ink-400">(shown to customers)</span>
        </label>
        <textarea
          {...a11y('description')}
          value={values.description}
          maxLength={500}
          onChange={(e) => {
            setAutoDescription(false);
            setValues((v) => ({ ...v, description: e.target.value }));
          }}
          className={cn(inputClasses, 'min-h-20 py-2.5')}
        />
        {err('description')}
      </div>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className={buttonClasses('primary')}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClasses('ghost')}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
