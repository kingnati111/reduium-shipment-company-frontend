import { cn } from '../../lib/cn';

interface LogoMarkProps {
  className?: string;
  /** Colour of the route line. The waypoint dot is always Signal orange. */
  tone?: 'ink' | 'paper';
  title?: string;
}

/**
 * The Reduium mark: a route line that turns a corner to form an "R",
 * ending in a Signal-orange waypoint (the delivery point).
 */
export function LogoMark({ className, tone = 'ink', title }: LogoMarkProps) {
  const stroke = tone === 'ink' ? 'var(--color-ink)' : 'var(--color-paper)';
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M9 25V7h8.5a5.25 5.25 0 0 1 0 10.5H13l7 7.5"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <circle cx="22" cy="25" r="3" fill="var(--color-signal)" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  tone?: 'ink' | 'paper';
  /** Show the "Shipment Company" descriptor under the wordmark. */
  descriptor?: boolean;
}

/** Full lock-up: mark + REDUIUM wordmark (+ optional descriptor). */
export function Logo({ className, tone = 'ink', descriptor = true }: LogoProps) {
  return (
    <span
      translate="no"
      className={cn(
        'inline-flex items-center gap-2.5',
        tone === 'ink' ? 'text-ink' : 'text-paper',
        className,
      )}
    >
      <LogoMark tone={tone} className="size-8" />
      <span className="flex flex-col leading-none">
        <span className="text-[1.125rem] font-[780] tracking-[0.14em] [font-stretch:125%]">
          REDUIUM
        </span>
        {descriptor && (
          <span
            className={cn(
              'type-label mt-1 text-[0.5625rem] tracking-[0.28em]',
              tone === 'ink' ? 'text-ink-400' : 'text-fog',
            )}
          >
            Shipment Company
          </span>
        )}
      </span>
      <span className="sr-only">Reduium Shipment Company</span>
    </span>
  );
}
