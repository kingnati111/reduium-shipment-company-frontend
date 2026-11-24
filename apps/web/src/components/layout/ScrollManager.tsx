import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls to "#section" links (e.g. /#services) and resets to the top on
 * normal page changes. React Router doesn't do this on its own.
 */
export function ScrollManager() {
  const { pathname, hash, key, state } = useLocation();
  // Changing language swaps only the /xx/ prefix: stay where the visitor was.
  const keepScroll = Boolean((state as { keepScroll?: boolean } | null)?.keepScroll);

  useEffect(() => {
    if (keepScroll) return;
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        // Jumping to the tracking section puts the cursor straight in the input.
        if (hash === '#track') el.querySelector('input')?.focus({ preventScroll: true });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, key, keepScroll]);

  return null;
}
