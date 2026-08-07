import type { ReactNode } from 'react'

/** Device chrome only — not part of any design being evaluated. */
export function Phone({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[46px] bg-white shadow-[0_30px_80px_-20px_rgba(12,51,46,0.35),0_0_0_10px_#0c332e,0_0_0_12px_#1d4f47]">
        <div className="pointer-events-none absolute top-0 left-1/2 z-50 h-7 w-32 -translate-x-1/2 rounded-b-2xl bg-ink" />
        <div className="no-bar h-full overflow-y-auto">{children}</div>
      </div>
      <span className="font-sans text-[11px] font-semibold tracking-widest text-ink-faint uppercase">
        {label}
      </span>
    </div>
  )
}

export function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`flex h-12 items-end justify-between px-7 pb-1 text-[13px] font-semibold ${
        dark ? 'text-white' : 'text-ink'
      }`}
    >
      <span className="tnum">9:41</span>
      <span className="flex items-center gap-1 opacity-80">
        <span className="text-[10px]">▮▮▮</span>
        <span className="text-[11px]">100%</span>
      </span>
    </div>
  )
}

/**
 * THE SIGNATURE ELEMENT.
 *
 * The Daily Budget fills in discrete rep-blocks rather than as a smooth bar,
 * because reps are discrete valued events. Full Reps are tall, Half Reps are
 * short — so the economics of ADR-0003 are visible at a glance: shallow reps
 * fill less of your day.
 */
export function RepBlocks({
  full,
  half,
  remainingSlots,
  height = 56,
  gap = 3,
  width = 7,
  animate = true,
}: {
  full: number
  half: number
  remainingSlots: number
  height?: number
  gap?: number
  width?: number
  animate?: boolean
}) {
  const blocks: ('full' | 'half' | 'empty')[] = [
    ...Array<'full'>(full).fill('full'),
    ...Array<'half'>(half).fill('half'),
    ...Array<'empty'>(remainingSlots).fill('empty'),
  ]
  return (
    <div className="flex items-end" style={{ gap, height }}>
      {blocks.map((b, i) => (
        <div
          key={i}
          className={animate ? 'a-block' : undefined}
          style={{
            width,
            height: b === 'full' ? height : b === 'half' ? height * 0.5 : height * 0.22,
            borderRadius: width / 2,
            background:
              b === 'full'
                ? 'linear-gradient(180deg, var(--color-full) 0%, var(--color-full-deep) 100%)'
                : b === 'half'
                  ? 'var(--color-half)'
                  : 'var(--color-line)',
            animationDelay: animate ? `${Math.min(i * 12, 700)}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}

export function Ring({
  pct,
  size = 84,
  stroke = 10,
  color = 'var(--color-full)',
  track = 'var(--color-line)',
  children,
}: {
  pct: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(pct, 100)) / 100}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute grid place-items-center">{children}</div>
    </div>
  )
}
