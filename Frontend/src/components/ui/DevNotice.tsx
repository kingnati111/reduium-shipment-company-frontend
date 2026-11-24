import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Clearly marks a feature that is not connected yet, so unfinished work is
 * never mistaken for real functionality. Remove once the stage is built.
 */
export function DevNotice({ stage, children }: { stage: number; children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex gap-4 rounded-md border border-dashed border-tone-caution/50 bg-tone-caution-bg p-5 text-tone-caution"
    >
      <Construction aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="type-label mb-1">Not connected yet · Stage {stage}</p>
        <div className="text-[0.9375rem] leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}
