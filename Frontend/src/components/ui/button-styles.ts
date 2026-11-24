import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm font-semibold whitespace-nowrap ' +
  'transition-[background-color,color,border-color,transform] duration-150 ease-(--ease-out-quart) ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 select-none';

const variants: Record<ButtonVariant, string> = {
  // Signal orange is reserved for the main action on a screen.
  // Ink text on Signal passes WCAG AA contrast; white text would not.
  primary: 'bg-signal text-ink hover:bg-signal-600',
  secondary: 'bg-ink text-paper hover:bg-ink-800',
  outline: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.03]',
  ghost: 'text-ink hover:bg-ink/[0.06]',
  inverse: 'bg-paper text-ink hover:bg-white',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-14 px-7 text-base',
};

/** Button look as a class string, so links and buttons can share it. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}
