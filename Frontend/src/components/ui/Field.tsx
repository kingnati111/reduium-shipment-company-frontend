import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

export const inputClasses =
  'w-full rounded-sm border border-fog bg-paper-50 px-3.5 text-ink placeholder:text-ink-400 ' +
  'transition-colors duration-150 hover:border-ink/30 focus:border-ink focus:outline-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal ' +
  'aria-invalid:border-tone-critical disabled:opacity-60';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired up for screen readers. */
export function FieldShell({ label, hint, error, children, className }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="type-label text-ink-600">
        {label}
      </label>
      {children({ inputId, describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-tone-critical">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  mono?: boolean;
}

export function TextField({ label, hint, error, mono, className, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ inputId, describedBy }) => (
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(inputClasses, 'h-11', mono && 'type-data uppercase')}
          {...props}
        />
      )}
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function TextAreaField({ label, hint, error, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ inputId, describedBy }) => (
        <textarea
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(inputClasses, 'min-h-32 py-3 leading-relaxed')}
          {...props}
        />
      )}
    </FieldShell>
  );
}
