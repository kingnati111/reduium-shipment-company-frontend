import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PanelProps {
  /** Small mono label in the panel's header strip, like a form section on a waybill. */
  label?: string;
  /** Optional reference shown on the right of the header strip. */
  reference?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ label, reference, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn('rounded-md border border-fog bg-paper-50 shadow-card', className)}>
      {(label || reference) && (
        <header className="flex items-center justify-between gap-4 border-b border-fog px-5 py-2.5">
          {label && <span className="type-label text-ink-400">{label}</span>}
          {reference && <span className="type-data text-xs text-ink-400">{reference}</span>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
