import { m } from 'motion/react';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Fades content up gently the first time it scrolls into view.
 * Turned off automatically for visitors who prefer reduced motion
 * (see <MotionConfig reducedMotion="user"> in App).
 * Uses the lightweight `m` component; animation features load via <LazyMotion>.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </m.div>
  );
}
