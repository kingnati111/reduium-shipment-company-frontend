import {
  SUPPORT_HONEYPOT_FIELD,
  SUPPORT_TOPICS,
  isValidTrackingNumber,
  type SupportRequestReceipt,
} from '@reduium/shared';
import { CircleCheck, Copy, Send, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { FieldShell, TextAreaField, TextField, inputClasses } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import {
  SUPPORT_FIELDS,
  submitSupportRequest,
  type SupportField,
  type SupportFormValues,
} from './api';

const MESSAGE_MAX = 5000;

/** Keys of support.json → errors.* (the KIND of problem, translated when shown). */
type FieldErrorKey =
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'phoneInvalid'
  | 'trackingNumberInvalid'
  | 'topicRequired'
  | 'subjectRequired'
  | 'messageTooShort'
  | 'fieldInvalid';
type ProblemKey = 'checkForm' | 'rejected' | 'rateLimited' | 'unavailable' | 'network';
type FieldErrors = Partial<Record<SupportField, FieldErrorKey>>;

/**
 * What a field rejected BY THE SERVER means. The browser checks below stop
 * most problems first, and the input limits (maxLength) prevent "too long",
 * so each field has one likely cause.
 */
const SERVER_FIELD_ERROR: Record<SupportField, FieldErrorKey> = {
  name: 'nameRequired',
  email: 'emailInvalid',
  phone: 'phoneInvalid',
  trackingNumber: 'trackingNumberInvalid',
  topic: 'topicRequired',
  subject: 'subjectRequired',
  message: 'messageTooShort',
};

const empty = (trackingNumber = ''): SupportFormValues => ({
  name: '',
  email: '',
  phone: '',
  trackingNumber,
  topic: '',
  subject: '',
  message: '',
  website: '',
});

/** Instant checks in the browser. The server checks everything again. */
function quickCheck(v: SupportFormValues): FieldErrors {
  const e: FieldErrors = {};
  if (!v.name.trim()) e.name = 'nameRequired';
  if (!v.email.trim()) e.email = 'emailRequired';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'emailInvalid';
  if (v.trackingNumber.trim() && !isValidTrackingNumber(v.trackingNumber)) {
    e.trackingNumber = 'trackingNumberInvalid';
  }
  if (!v.topic) e.topic = 'topicRequired';
  if (!v.subject.trim()) e.subject = 'subjectRequired';
  if (v.message.trim().length < 10) e.message = 'messageTooShort';
  return e;
}

/**
 * Public contact form. Messages are saved and appear in the staff support
 * inbox. No email is sent (to the customer or to staff): the confirmation
 * screen says so, and gives the customer a reference to quote instead.
 */
export function SupportForm() {
  const { t } = useTranslation('support');
  const [params] = useSearchParams();
  const [values, setValues] = useState(() => empty(params.get('tracking') ?? ''));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<ProblemKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<SupportRequestReceipt | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const [focusFirstError, setFocusFirstError] = useState(0);
  // Read inside the effect below without making it re-run on every keystroke.
  const errorsRef = useRef(errors);
  useEffect(() => {
    errorsRef.current = errors;
  });

  useEffect(() => {
    if (receipt) doneRef.current?.focus();
  }, [receipt]);

  // After a failed attempt (only then), move focus to the first field with a problem.
  useEffect(() => {
    if (!focusFirstError) return;
    const first = SUPPORT_FIELDS.find((f) => errorsRef.current[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    else problemRef.current?.focus();
  }, [focusFirstError]);

  const set = (field: keyof SupportFormValues) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field in errors) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const fieldError = (field: SupportField) => {
    const key = errors[field];
    return key ? t(`errors.${key}`) : null;
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setProblem(null);
    const local = quickCheck(values);
    if (Object.keys(local).length) {
      setErrors(local);
      setFocusFirstError((n) => n + 1);
      return;
    }
    setBusy(true);
    const outcome = await submitSupportRequest(values);
    setBusy(false);
    switch (outcome.kind) {
      case 'sent':
        setReceipt(outcome.receipt);
        setErrors({});
        return;
      case 'invalid':
        setErrors(Object.fromEntries(outcome.fields.map((f) => [f, SERVER_FIELD_ERROR[f]])));
        if (!outcome.fields.length) setProblem('checkForm');
        break;
      case 'rejected':
        setProblem('rejected');
        break;
      case 'rate-limited':
        setProblem('rateLimited');
        break;
      case 'unavailable':
        setProblem('unavailable');
        break;
      case 'error':
        setProblem('network');
        break;
    }
    setFocusFirstError((n) => n + 1);
  }

  if (receipt) {
    return (
      <SupportReceipt
        receipt={receipt}
        headingRef={doneRef}
        onAnother={() => {
          setReceipt(null);
          setValues(empty());
        }}
      />
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      aria-labelledby="support-form-title"
      className="rounded-md border border-fog bg-paper-50 p-5 shadow-card sm:p-7"
    >
      <h2 id="support-form-title" className="type-display text-2xl text-ink">
        {t('form.title')}
      </h2>
      <p className="mt-2 text-sm text-ink-600">
        <Trans
          t={t}
          i18nKey="form.requiredNote"
          components={{ star: <span aria-hidden />, sr: <span className="sr-only" /> }}
        />
      </p>

      {(problem || errorCount > 0) && (
        <div
          ref={problemRef}
          tabIndex={-1}
          role="alert"
          className="mt-5 flex gap-2 rounded-sm border border-tone-critical/40 bg-tone-critical-bg px-4 py-3 text-sm text-tone-critical"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {problem ? t(`errors.${problem}`) : t('form.errorSummary', { count: errorCount })}
          </span>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('form.fields.name')}
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          value={values.name}
          onChange={(e) => set('name')(e.target.value)}
          error={fieldError('name')}
        />
        <TextField
          label={t('form.fields.email')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          value={values.email}
          onChange={(e) => set('email')(e.target.value)}
          error={fieldError('email')}
          hint={t('form.fields.emailHint')}
        />
        <TextField
          label={t('form.fields.phone')}
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={32}
          value={values.phone}
          onChange={(e) => set('phone')(e.target.value)}
          error={fieldError('phone')}
        />
        <TextField
          label={t('form.fields.trackingNumber')}
          name="trackingNumber"
          mono
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          placeholder="RDM-XXXX-XXXX-X"
          value={values.trackingNumber}
          onChange={(e) => set('trackingNumber')(e.target.value)}
          error={fieldError('trackingNumber')}
          hint={t('form.fields.trackingNumberHint')}
        />
        <FieldShell
          label={t('form.fields.topic')}
          error={fieldError('topic')}
          className="sm:col-span-2"
        >
          {({ inputId, describedBy }) => (
            <select
              id={inputId}
              name="topic"
              required
              aria-describedby={describedBy}
              aria-invalid={errors.topic ? true : undefined}
              value={values.topic}
              onChange={(e) => set('topic')(e.target.value)}
              className={cn(inputClasses, 'h-11 pe-8')}
            >
              <option value="">{t('form.fields.topicPlaceholder')}</option>
              {SUPPORT_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {t(`topics.${topic}`)}
                </option>
              ))}
            </select>
          )}
        </FieldShell>
        <TextField
          label={t('form.fields.subject')}
          name="subject"
          required
          maxLength={160}
          value={values.subject}
          onChange={(e) => set('subject')(e.target.value)}
          error={fieldError('subject')}
          className="sm:col-span-2"
        />
        <TextAreaField
          label={t('form.fields.message')}
          name="message"
          required
          rows={6}
          maxLength={MESSAGE_MAX}
          value={values.message}
          onChange={(e) => set('message')(e.target.value)}
          error={fieldError('message')}
          hint={t('form.fields.messageCount', {
            count: values.message.length,
            max: MESSAGE_MAX,
          })}
          className="sm:col-span-2"
        />
      </div>

      {/* Spam trap: hidden from people and screen readers; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          {t('form.honeypot')}
          <input
            type="text"
            name={SUPPORT_HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set('website')(e.target.value)}
          />
        </label>
      </div>

      <p className="mt-6 text-sm text-ink-600">{t('form.privacy')}</p>

      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={busy}>
        <Send aria-hidden className="size-4" /> {busy ? t('form.sending') : t('form.send')}
      </Button>
    </form>
  );
}

function SupportReceipt({
  receipt,
  headingRef,
  onAnother,
}: {
  receipt: SupportRequestReceipt;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAnother: () => void;
}) {
  const { t } = useTranslation('support');
  const [copied, setCopied] = useState(false);
  return (
    <section
      aria-labelledby="support-done-title"
      className="rounded-md border border-tone-success/40 bg-tone-success-bg p-5 sm:p-7"
    >
      <CircleCheck aria-hidden className="size-7 text-tone-success" />
      <h2
        id="support-done-title"
        ref={headingRef}
        tabIndex={-1}
        className="type-display mt-3 text-2xl text-ink focus:outline-none"
      >
        {t('receipt.title')}
      </h2>
      <p className="mt-2 text-ink-600">{t('receipt.body')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p
          dir="ltr"
          className="type-data rounded-sm border border-fog bg-paper-50 px-4 py-2 text-xl font-medium text-ink"
        >
          {receipt.reference}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(receipt.reference).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          <Copy aria-hidden className="size-4" /> {copied ? t('receipt.copied') : t('receipt.copy')}
        </Button>
      </div>
      <p className="mt-4 text-sm text-ink-600">{t('receipt.note')}</p>
      <Button variant="secondary" className="mt-5" onClick={onAnother}>
        {t('receipt.another')}
      </Button>
    </section>
  );
}
