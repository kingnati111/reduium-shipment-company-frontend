import { Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { cn } from '../../lib/cn';

// The three photographs supplied by the owner (see README → "Hero photographs").
// Each one was resized and re-encoded as WebP; the image itself is unchanged.
import port768 from '../../assets/hero/port-terminal-768.webp';
import port1280 from '../../assets/hero/port-terminal-1280.webp';
import port1920 from '../../assets/hero/port-terminal-1920.webp';
import aisle768 from '../../assets/hero/warehouse-aisle-768.webp';
import aisle1280 from '../../assets/hero/warehouse-aisle-1280.webp';
import aisle1920 from '../../assets/hero/warehouse-aisle-1920.webp';
import floor768 from '../../assets/hero/fulfilment-floor-768.webp';
import floor1280 from '../../assets/hero/fulfilment-floor-1280.webp';
import floor1920 from '../../assets/hero/fulfilment-floor-1920.webp';
// Used if a slide's WebP fails to load (a JPEG of image 1, a separate file).
import fallbackSrc from '../../assets/hero/fallback-port-terminal-1280.jpg';

interface Slide {
  id: string;
  srcSet: string;
  src: string;
  /** Which part of the photo stays in view when the screen crops it. */
  position: string;
}

const srcSet = (a: string, b: string, c: string) => `${a} 768w, ${b} 1280w, ${c} 1920w`;

const HERO_SLIDES: readonly Slide[] = [
  {
    id: 'port-terminal',
    srcSet: srcSet(port768, port1280, port1920),
    src: port1280,
    position: '62% 50%',
  },
  {
    id: 'warehouse-aisle',
    srcSet: srcSet(aisle768, aisle1280, aisle1920),
    src: aisle1280,
    position: '50% 55%',
  },
  {
    id: 'fulfilment-floor',
    srcSet: srcSet(floor768, floor1280, floor1920),
    src: floor1280,
    position: '50% 50%',
  },
];

/** How long each photo stays on screen, and how long the cross-fade takes. */
const HERO_SLIDE_INTERVAL_MS = 7000;
const FADE_MS = 1400;

type LoadState = 'pending' | 'loaded' | 'fallback' | 'failed';
const isReady = (s: LoadState) => s === 'loaded' || s === 'fallback';

/**
 * Decorative photo slideshow behind the hero. Performance and accessibility:
 * - Only the first photo loads up front. Each next photo is fetched only once
 *   the one before it has loaded, and a slide is shown only after it's ready.
 * - The browser picks the smallest size that fills the screen (srcset/sizes).
 * - Reduced-motion users get a single still photo, no rotation or fading.
 * - A visible Pause button stops the rotation (WCAG 2.2.2).
 * - Rotation pauses while the browser tab is hidden.
 * - A failed photo falls back to a JPEG; if that also fails the slide is
 *   skipped and the brand-ink background shows through.
 */
export function HeroBackground() {
  const reduceMotion = useReducedMotion() ?? false;
  const [chosen, setChosen] = useState(0);
  const [states, setStates] = useState<LoadState[]>(() => HERO_SLIDES.map(() => 'pending'));
  const [paused, setPaused] = useState(false);
  const { t } = useTranslation('home');

  const setState = (index: number, next: LoadState) =>
    setStates((prev) => prev.map((s, i) => (i === index ? next : s)));

  const rotates = !reduceMotion && HERO_SLIDES.length > 1;
  const usableCount = states.filter((s) => s !== 'failed').length;

  // Photos are fetched one after another: the next one is added to the page
  // only once the one before it has finished (loaded or failed).
  let mountedCount = 1;
  while (rotates && mountedCount < HERO_SLIDES.length && states[mountedCount - 1] !== 'pending') {
    mountedCount++;
  }

  // If the chosen photo failed completely, show the next ready one instead.
  const active = states[chosen] === 'failed' ? (nextReady(chosen, states) ?? chosen) : chosen;

  // The interval reads the latest values without restarting its timer.
  const latest = useRef({ active, states });
  useEffect(() => {
    latest.current = { active, states };
  }, [active, states]);

  useEffect(() => {
    if (!rotates || paused) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const { active: current, states: now } = latest.current;
      setChosen(nextReady(current, now) ?? current);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [rotates, paused]);

  return (
    <>
      <div
        aria-hidden
        data-testid="hero-slideshow"
        data-active-slide={active}
        className="pointer-events-none absolute inset-0 overflow-hidden bg-ink"
      >
        {HERO_SLIDES.slice(0, rotates ? mountedCount : 1).map((slide, i) => {
          const state = states[i];
          if (state === 'failed') return null;
          const useFallback = state === 'fallback';
          return (
            <img
              key={slide.id}
              data-slide={slide.id}
              alt=""
              src={useFallback ? fallbackSrc : slide.src}
              srcSet={useFallback ? undefined : slide.srcSet}
              sizes="100vw"
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'low'}
              draggable={false}
              onLoad={() => setState(i, useFallback ? 'fallback' : 'loaded')}
              onError={() => setState(i, useFallback ? 'failed' : 'fallback')}
              style={{ objectPosition: slide.position, transitionDuration: `${FADE_MS}ms` }}
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity ease-in-out motion-reduce:transition-none',
                i === active && isReady(state ?? 'pending') ? 'opacity-100' : 'opacity-0',
              )}
            />
          );
        })}

        {/* Overlay: brand tint plus darkening, strongest behind the text. */}
        <div className="absolute inset-0 bg-harbor/35 mix-blend-multiply" />
        <div
          className={cn(
            'absolute inset-0 bg-ink/80 lg:bg-transparent lg:from-ink/92 lg:via-ink/75 lg:to-ink/45',
            'lg:bg-linear-to-r lg:rtl:bg-linear-to-l', // rtl-ok: darkest behind the text, on the reading side
          )}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-ink to-transparent" />
      </div>

      {rotates && usableCount > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
          <Container className="flex justify-end pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t('hero.playPhotos') : t('hero.pausePhotos')}
              className="type-label pointer-events-auto flex items-center gap-2 rounded-full border border-paper/15 bg-ink/50 px-3 py-1.5 text-paper/75 transition-colors hover:border-paper/35 hover:text-paper"
            >
              {paused ? (
                <Play aria-hidden className="size-3" />
              ) : (
                <Pause aria-hidden className="size-3" />
              )}
              <span aria-hidden>
                {String(active + 1).padStart(2, '0')}/{String(HERO_SLIDES.length).padStart(2, '0')}
              </span>
            </button>
          </Container>
        </div>
      )}
    </>
  );
}

function nextReady(from: number, states: LoadState[]): number | null {
  for (let step = 1; step < states.length; step++) {
    const i = (from + step) % states.length;
    if (isReady(states[i] ?? 'pending')) return i;
  }
  return null;
}
