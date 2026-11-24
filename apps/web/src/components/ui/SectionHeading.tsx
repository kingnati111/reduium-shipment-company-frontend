import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface SectionHeadingProps {
  /** Manifest-style section number, e.g. "02". */
  index: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
  id?: string;
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  intro,
  tone = 'light',
  className,
  id,
}: SectionHeadingProps) {
  const dark = tone === 'dark';
  return (
    <div className={cn('max-w-3xl', className)}>
      <p className="mb-5 flex items-center gap-3">
        <span className="type-data text-sm text-signal">{index}</span>
        <span className={cn('h-px w-8', dark ? 'bg-paper/25' : 'bg-ink/20')} aria-hidden />
        <span className={cn('type-label', dark ? 'text-fog' : 'text-ink-600')}>{eyebrow}</span>
      </p>
      <h2 id={id} className="type-display text-[2rem] sm:text-5xl">
        {title}
      </h2>
      {intro && (
        <p className={cn('mt-5 text-lg leading-relaxed', dark ? 'text-fog' : 'text-ink-600')}>
          {intro}
        </p>
      )}
    </div>
  );
}
