import logoOnDark from '../../assets/brand/reduium-logo-on-dark.png';
import logoOnLight from '../../assets/brand/reduium-logo-on-light.png';
import markOnDark from '../../assets/brand/reduium-mark-on-dark.png';
import markOnLight from '../../assets/brand/reduium-mark-on-light.png';
import { cn } from '../../lib/cn';

/**
 * The Reduium logo: a shield framing a globe and an "R", with a Signal-orange
 * arrow, next to the REDUIUM SHIPMENT wordmark. Supplied by the owner
 * (2026-11-24); the original is kept in docs/brand/.
 *
 * Two colourways, generated from the original:
 * - tone "ink": navy artwork, for light backgrounds (the original colours);
 * - tone "paper": off-white artwork, for the dark header, footer and panels.
 * The arrow is orange in both.
 */
type Tone = 'ink' | 'paper';

interface LogoMarkProps {
  className?: string;
  /** "ink" for light backgrounds, "paper" for dark ones. */
  tone?: Tone;
  /** Accessible name. Without it the mark is decorative (hidden from screen readers). */
  title?: string;
}

/** The shield symbol on its own, for small spaces (admin bar, loading screen). */
export function LogoMark({ className, tone = 'ink', title }: LogoMarkProps) {
  return (
    <img
      src={tone === 'ink' ? markOnLight : markOnDark}
      width={168}
      height={193}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      decoding="async"
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

interface LogoProps {
  className?: string;
  /** "ink" for light backgrounds, "paper" for dark ones. */
  tone?: Tone;
}

/**
 * The full logo: shield + REDUIUM SHIPMENT wordmark. The wrapper takes any
 * stretching a parent layout applies (e.g. a vertical flex column), so the
 * image itself always keeps its proportions.
 */
export function Logo({ className, tone = 'ink' }: LogoProps) {
  return (
    <span className={cn('inline-flex shrink-0', className)}>
      <img
        src={tone === 'ink' ? logoOnLight : logoOnDark}
        width={600}
        height={198}
        alt="Reduium Shipment Company"
        translate="no"
        decoding="async"
        className="h-10 w-auto"
      />
    </span>
  );
}
