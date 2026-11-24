import { SHIPPING_METHODS, SHIPPING_METHOD_INFO, type ShippingMethod } from '@reduium/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { buttonClasses } from '../../../components/ui/button-styles';
import { inputClasses } from '../../../components/ui/Field';
import { cn } from '../../../lib/cn';
import { Notice } from '../ui';
import {
  fieldId,
  getField,
  quickCheck,
  type PartyForm,
  type ShipmentForm as Form,
} from './form-model';

interface FieldProps {
  path: string;
  label: string;
  form: Form;
  errors: Record<string, string>;
  onChange: (path: string, value: string) => void;
  required?: boolean;
  type?: string;
  hint?: string;
  className?: string;
  multiline?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'decimal' | 'numeric';
  maxLength?: number;
}

function Field({
  path,
  label,
  form,
  errors,
  onChange,
  required,
  type = 'text',
  hint,
  className,
  multiline,
  autoComplete = 'off',
  inputMode,
  maxLength,
}: FieldProps) {
  const id = fieldId(path);
  const error = errors[path];
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    value: getField(form, path) ?? '',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    maxLength,
  };
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="type-label text-ink-600">
        {label}
        {required && (
          <span aria-hidden className="text-signal-600">
            {' '}
            *
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          {...common}
          onChange={(e) => onChange(path, e.target.value)}
          className={cn(inputClasses, 'min-h-24 py-2.5')}
        />
      ) : (
        <input
          {...common}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => onChange(path, e.target.value)}
          className={cn(inputClasses, 'h-11')}
        />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-tone-critical">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <fieldset className="rounded-md border border-fog bg-paper-50 p-5 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <legend className="type-label float-left text-ink-400">{title}</legend>
        {aside}
      </div>
      <div className="clear-both grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

interface Props {
  initial: Form;
  submitLabel: string;
  busyLabel: string;
  /** Returns server field errors (path → message), or nothing on success. */
  onSubmit: (form: Form) => Promise<Record<string, string> | void>;
  formError?: ReactNode;
  cancel: ReactNode;
}

/** The create/edit form for a shipment. */
export function ShipmentForm({
  initial,
  submitLabel,
  busyLabel,
  onSubmit,
  formError,
  cancel,
}: Props) {
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function setPath(path: string, value: string) {
    setForm((prev) => {
      const next = structuredClone(prev) as unknown as Record<
        string,
        Record<string, string> | string
      >;
      const [a, b] = path.split('.') as [string, string | undefined];
      if (b) (next[a] as Record<string, string>)[b] = value;
      else next[a] = value;
      return next as unknown as Form;
    });
    if (errors[path]) setErrors(({ [path]: _gone, ...rest }) => rest);
  }

  function focusFirst(errs: Record<string, string>) {
    const first = Object.keys(errs)[0];
    if (first) requestAnimationFrame(() => document.getElementById(fieldId(first))?.focus());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const quick = quickCheck(form);
    setErrors(quick);
    if (Object.keys(quick).length) return focusFirst(quick);
    setBusy(true);
    const serverErrors = await onSubmit(form);
    setBusy(false);
    if (serverErrors) {
      setErrors(serverErrors);
      focusFirst(serverErrors);
    }
  }

  const f = { form, errors, onChange: setPath };
  const party = (who: 'sender' | 'recipient') => {
    const p = (k: keyof PartyForm) => `${who}.${k}`;
    return (
      <>
        <Field {...f} path={p('name')} label="Name" required maxLength={120} />
        <Field {...f} path={p('company')} label="Company" maxLength={120} />
        <Field
          {...f}
          path={p('email')}
          label="Email"
          type="email"
          inputMode="email"
          maxLength={254}
        />
        <Field
          {...f}
          path={p('phone')}
          label="Phone"
          type="tel"
          inputMode="tel"
          hint="Include the country code, e.g. +44 20 7946 0000"
          maxLength={32}
        />
        <Field
          {...f}
          path={p('addressLine1')}
          label="Address line 1"
          required
          className="sm:col-span-2"
          maxLength={200}
        />
        <Field
          {...f}
          path={p('addressLine2')}
          label="Address line 2"
          className="sm:col-span-2"
          maxLength={200}
        />
        <Field {...f} path={p('city')} label="City" required maxLength={100} />
        <Field {...f} path={p('region')} label="Region / state" maxLength={100} />
        <Field {...f} path={p('postalCode')} label="Postal code" maxLength={20} />
        <Field
          {...f}
          path={p('countryCode')}
          label="Country"
          required
          hint="2-letter code, e.g. GB"
          maxLength={2}
        />
      </>
    );
  };

  const copyCity = (from: 'sender' | 'recipient', to: 'origin' | 'destination') => (
    <button
      type="button"
      className="text-sm font-medium text-ink-600 underline underline-offset-4 hover:text-ink"
      onClick={() => {
        setPath(`${to}.city`, form[from].city);
        setPath(`${to}.countryCode`, form[from].countryCode.toUpperCase());
      }}
    >
      Same as {from}&apos;s city
    </button>
  );

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="space-y-6">
      {formError}
      {errorCount > 0 && (
        <Notice tone="critical">
          Please fix{' '}
          {errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`}{' '}
          below.
        </Notice>
      )}

      <Section title="Service">
        <div className="sm:col-span-2">
          <p id="method-label" className="type-label mb-2 text-ink-600">
            Shipping method{' '}
            <span aria-hidden className="text-signal-600">
              *
            </span>
          </p>
          <div
            role="radiogroup"
            aria-labelledby="method-label"
            className="grid gap-2 sm:grid-cols-4"
          >
            {SHIPPING_METHODS.map((m: ShippingMethod) => (
              <label
                key={m}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2.5 text-sm',
                  form.shippingMethod === m
                    ? 'border-ink bg-ink/[0.04] font-medium'
                    : 'border-fog hover:border-ink/30',
                )}
              >
                <input
                  type="radio"
                  name="shippingMethod"
                  value={m}
                  checked={form.shippingMethod === m}
                  onChange={() => setPath('shippingMethod', m)}
                  className="accent-signal-600"
                />
                <span className="type-data text-xs text-signal-600">
                  {SHIPPING_METHOD_INFO[m].code}
                </span>
                {SHIPPING_METHOD_INFO[m].label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Sender (private)">{party('sender')}</Section>
        <Section title="Recipient (private)">{party('recipient')}</Section>
      </div>

      <Section title="Route (shown publicly, city level only)">
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field {...f} path="origin.city" label="Origin city" required maxLength={100} />
              <Field {...f} path="origin.countryCode" label="Country" required maxLength={2} />
            </div>
            {copyCity('sender', 'origin')}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field
                {...f}
                path="destination.city"
                label="Destination city"
                required
                maxLength={100}
              />
              <Field {...f} path="destination.countryCode" label="Country" required maxLength={2} />
            </div>
            {copyCity('recipient', 'destination')}
          </div>
        </div>
      </Section>

      <Section title="Package and delivery">
        <Field {...f} path="pieceCount" label="Pieces" type="number" inputMode="numeric" />
        <Field {...f} path="weightKg" label="Weight (kg)" inputMode="decimal" hint="Optional" />
        <Field
          {...f}
          path="contentsDescription"
          label="Contents"
          className="sm:col-span-2"
          maxLength={500}
          hint="Private: never shown to customers"
        />
        <Field
          {...f}
          path="estimatedDeliveryDate"
          label="Estimated delivery date"
          type="date"
          hint="Shown to customers. Leave empty if not known yet."
        />
        <Field
          {...f}
          path="internalNotes"
          label="Internal notes"
          multiline
          className="sm:col-span-2"
          maxLength={5000}
          hint="Staff only: never shown to customers"
        />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClasses('primary', 'lg')}>
          {busy ? busyLabel : submitLabel}
        </button>
        {cancel}
      </div>
    </form>
  );
}
