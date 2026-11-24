import { normalizeTrackingNumber } from '@reduium/shared';
import { ArrowRight, ScanLine } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '../../components/ui/button-styles';
import { cn } from '../../lib/cn';

interface TrackingFormProps {
  /** Called with the canonical tracking number (e.g. "RDM-7K4P-9X2Q-R"). */
  onTrack: (trackingNumber: string) => void;
  defaultValue?: string;
  /** "hero" is the large version used on the homepage. */
  size?: 'hero' | 'compact';
  /** Use "dark" when the form sits on an Ink background. */
  surface?: 'light' | 'dark';
  className?: string;
  /** Fixed id for the input, so other controls can focus it. */
  inputId?: string;
}

/**
 * The tracking-number input. It checks the format and check character in the
 * browser for instant feedback. The server always re-validates, because
 * browser checks can be bypassed.
 */
export function TrackingForm({
  onTrack,
  defaultValue = '',
  size = 'compact',
  surface = 'light',
  className,
  inputId: fixedInputId,
}: TrackingFormProps) {
  const { t } = useTranslation('tracking');
  const [value, setValue] = useState(defaultValue);
  // The KIND of problem is stored, not its text, so it re-translates if the
  // visitor switches language while the message is showing.
  const [error, setError] = useState<'required' | 'invalid' | null>(null);
  const generatedId = useId();
  const inputId = fixedInputId ?? generatedId;
  const errorId = `${inputId}-error`;
  const hero = size === 'hero';
  const dark = surface === 'dark';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setError('required');
      return;
    }
    const normalized = normalizeTrackingNumber(value.trim());
    if (!normalized) {
      setError('invalid');
      return;
    }
    setError(null);
    setValue(normalized);
    onTrack(normalized);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={cn('w-full', className)} role="search">
      <label
        htmlFor={inputId}
        className={cn('type-label mb-2 block', dark ? 'text-fog' : 'text-ink-600')}
      >
        {t('form.label')}
      </label>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-md border p-1.5 sm:flex-row sm:items-stretch',
          dark ? 'border-paper/20 bg-paper/[0.06]' : 'border-fog bg-paper-50 shadow-card',
          error && 'border-tone-critical',
        )}
      >
        {/* Always left-to-right, even on Arabic pages: tracking numbers read that way. */}
        <div className="relative flex flex-1 items-center" dir="ltr">
          <ScanLine
            aria-hidden
            className={cn(
              'pointer-events-none absolute start-3.5 size-5',
              dark ? 'text-fog' : 'text-ink-400',
            )}
          />
          <input
            id={inputId}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="RDM-XXXX-XXXX-X"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={32}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'type-data w-full rounded-sm bg-transparent ps-11 pe-3 uppercase focus:outline-none',
              'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal',
              hero ? 'h-14 text-lg tracking-[0.08em]' : 'h-11 text-base',
              dark
                ? 'text-paper placeholder:text-paper/40'
                : 'text-ink placeholder:text-ink-400/70',
            )}
          />
        </div>
        <button type="submit" className={buttonClasses('primary', hero ? 'lg' : 'md')}>
          {t('form.submit')}
          <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
        </button>
      </div>
      <p
        id={errorId}
        role="alert"
        className={cn(
          'mt-2 min-h-5 text-sm font-medium',
          dark ? 'text-[#ff9b7a]' : 'text-tone-critical',
        )}
      >
        {error && t(`form.${error}`)}
      </p>
    </form>
  );
}
