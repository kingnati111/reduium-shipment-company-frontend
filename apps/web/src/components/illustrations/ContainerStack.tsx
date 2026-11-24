/**
 * Decorative illustration: a stack of shipping containers in brand colours.
 */
const CONTAINERS = [
  // bottom row
  { x: 20, y: 262, fill: 'var(--color-ink)' },
  { x: 172, y: 262, fill: 'var(--color-harbor)' },
  { x: 324, y: 262, fill: 'var(--color-fog)' },
  // middle row
  { x: 96, y: 196, fill: 'var(--color-signal)', brand: true },
  { x: 248, y: 196, fill: 'var(--color-ink-800)' },
  // top
  { x: 172, y: 130, fill: 'var(--color-harbor-700)' },
];

export function ContainerStack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" className={className} aria-hidden>
      <defs>
        <pattern id="ribs" width="9" height="62" patternUnits="userSpaceOnUse">
          <rect width="4.5" height="62" fill="black" fillOpacity="0.14" />
        </pattern>
      </defs>
      <ellipse cx="240" cy="334" rx="225" ry="10" fill="var(--color-ink)" fillOpacity="0.12" />
      {CONTAINERS.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          <rect width="144" height="62" rx="2" fill={c.fill} />
          <rect x="6" y="6" width="132" height="50" fill="url(#ribs)" />
          {/* corner castings */}
          {[
            [0, 0],
            [136, 0],
            [0, 54],
            [136, 54],
          ].map(([cx, cy]) => (
            <rect
              key={`${cx}-${cy}`}
              x={cx}
              y={cy}
              width="8"
              height="8"
              fill="black"
              fillOpacity="0.28"
            />
          ))}
          <rect width="144" height="3" fill="white" fillOpacity="0.12" />
          {c.brand && (
            <text
              x="72"
              y="38"
              textAnchor="middle"
              fill="var(--color-ink)"
              style={{
                font: '800 17px var(--font-sans)',
                fontStretch: '125%',
                letterSpacing: '0.18em',
              }}
            >
              REDUIUM
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
