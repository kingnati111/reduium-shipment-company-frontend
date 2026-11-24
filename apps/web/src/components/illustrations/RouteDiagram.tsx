import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';

/**
 * Hero illustration: the stages every shipment passes through, drawn as a
 * route. It shows how the network works and is NOT a real shipment.
 */
const ROUTE = 'M70 330 C 180 120, 380 80, 500 150';

const STOPS = [
  { x: 70, y: 330, key: 'origin' as const, anchor: 'start' as const, dx: -6, dy: 34 },
  { x: 202, y: 175.5, key: 'sortingHub' as const, anchor: 'middle' as const, dx: 0, dy: 34 },
  { x: 356.5, y: 119, key: 'customs' as const, anchor: 'middle' as const, dx: 0, dy: -22 },
  { x: 500, y: 150, key: 'destination' as const, anchor: 'end' as const, dx: 22, dy: 40 },
];

export function RouteDiagram({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation('home');

  return (
    <svg viewBox="0 0 560 420" className={className} role="img" aria-labelledby="route-title">
      <title id="route-title">{t('routeDiagram.title')}</title>
      <defs>
        <pattern id="route-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--color-paper)" strokeOpacity="0.06" />
        </pattern>
        <radialGradient id="route-fade" cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </radialGradient>
        <mask id="route-mask">
          <rect width="560" height="420" fill="url(#route-fade)" />
        </mask>
      </defs>

      {/* Chart grid & globe curvature */}
      <g mask="url(#route-mask)">
        <rect width="560" height="420" fill="url(#route-grid)" />
        {[260, 340, 420].map((r) => (
          <circle
            key={r}
            cx="280"
            cy={240 + r}
            r={r}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity="0.07"
          />
        ))}
      </g>

      {/* Planned route */}
      <path
        d={ROUTE}
        fill="none"
        stroke="var(--color-paper)"
        strokeOpacity="0.28"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      {/* Travelled route (draws in once) */}
      <path
        d={ROUTE}
        fill="none"
        stroke="var(--color-signal)"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={reduceMotion ? 0 : 1}
        style={
          reduceMotion
            ? undefined
            : { animation: 'route-draw 2.4s 0.4s cubic-bezier(0.25,1,0.5,1) forwards' }
        }
      />

      {STOPS.map((s, i) => {
        const last = i === STOPS.length - 1;
        return (
          <g key={s.key}>
            {last && !reduceMotion && (
              <circle
                cx={s.x}
                cy={s.y}
                r="10"
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth="1.5"
                className="route-pulse"
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={last ? 7 : 5.5}
              fill={last ? 'var(--color-signal)' : 'var(--color-ink)'}
              stroke={last ? 'none' : 'var(--color-paper)'}
              strokeWidth="2"
            />
            <text
              x={s.x + s.dx}
              y={s.y + s.dy}
              textAnchor={s.anchor}
              fill="var(--color-paper)"
              fillOpacity="0.75"
              style={{
                font: '500 15px var(--font-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {t(`routeDiagram.${s.key}`)}
            </text>
          </g>
        );
      })}

      {/* Moving parcel */}
      {!reduceMotion && (
        <g>
          <rect x="-7" y="-7" width="14" height="14" rx="2" fill="var(--color-paper)" />
          <path d="M-7 -2H7" stroke="var(--color-ink)" strokeWidth="1.5" />
          <animateMotion
            dur="7s"
            repeatCount="indefinite"
            path={ROUTE}
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="spline"
            keySplines="0.45 0 0.55 1"
          />
        </g>
      )}
    </svg>
  );
}
