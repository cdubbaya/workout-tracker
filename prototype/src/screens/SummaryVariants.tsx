import { StatusBar, Ring } from '../Frame'
import { summary, sessionReps, type RepKind } from '../data'

const mins = Math.floor(summary.durationSec / 60)
const secs = summary.durationSec % 60
const duration = `${mins}:${String(secs).padStart(2, '0')}`

/* Chart colours are tuned for the dark hero, not the light sheet. */
const ON_DARK: Record<RepKind, string> = {
  'standard-full': '#ffffff',
  'standard-half': '#ffc145',
  'knee-full': '#9df0d0',
  'knee-half': '#ffe0a3',
  uncounted: 'rgba(255,255,255,0.22)',
}

const CONFETTI = [
  { x: 7, y: 9, s: 9, r: 20, c: '#ffc145' },
  { x: 89, y: 7, s: 7, r: -30, c: '#ffffff' },
  { x: 20, y: 22, s: 6, r: 55, c: '#ff7a45' },
  { x: 80, y: 19, s: 10, r: 12, c: '#ffc145' },
  { x: 49, y: 4, s: 6, r: -15, c: '#ffffff' },
  { x: 93, y: 31, s: 8, r: 40, c: '#ff7a45' },
  { x: 4, y: 34, s: 7, r: -50, c: '#ffffff' },
]

/**
 * Single surviving summary design.
 *
 * Hero: the celebration, with the rep-by-rep chart as its centrepiece — so the
 * Fatigue Point (ADR-0008) and the drop to knees (ADR-0001) read as shape.
 * Sheet: claiming only. Perfect Form and the button, no rep data.
 */
export function SummaryA() {
  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-b from-full via-full-deep to-[#065840]">
      <StatusBar dark />

      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="a-drift absolute rounded-sm"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: c.s,
            height: c.s * 1.7,
            background: c.c,
            opacity: 0.85,
            animationDelay: `${i * 180}ms`,
            transform: `rotate(${c.r}deg)`,
          }}
        />
      ))}

      {/* ---- Hero: the win, then the shape of how you got it ---- */}
      <div className="relative z-10 px-7 pt-8 text-center">
        <p className="a-rise font-sans text-[13px] font-bold tracking-[0.2em] text-white/70 uppercase">
          Day {summary.streakDays} · streak alive
        </p>
        <div className="a-pop mt-4">
          <p className="font-display text-[96px] leading-[0.82] text-white tnum">
            {summary.earned}
          </p>
          <p className="font-display text-[24px] text-white/80">XP earned</p>
        </div>
        <p className="a-rise mt-3 font-sans text-[15px] font-semibold text-white/80">
          Whole budget filled in {duration}
        </p>
      </div>

      <div className="relative z-10 mt-7 px-6">
        <p className="mb-3 font-sans text-[11px] font-bold tracking-[0.18em] text-white/50 uppercase">
          Your set, rep by rep
        </p>

        <div className="flex h-[92px] items-end gap-[1.5px]">
          {sessionReps.map((r, i) => (
            <div
              key={i}
              className="a-block flex-1 rounded-[2px]"
              style={{
                height: r.endsWith('-full') ? 92 : r.endsWith('-half') ? 46 : 12,
                background: ON_DARK[r],
                animationDelay: `${Math.min(i * 9, 620)}ms`,
              }}
            />
          ))}
        </div>

        <div className="relative mt-2 h-10">
          <Marker
            leftPct={(summary.fatiguePointIndex / sessionReps.length) * 100}
            title="Depth slipped"
            sub={`rep ${summary.fatiguePointIndex + 1}`}
          />
          <Marker
            leftPct={(summary.variantSwitchIndex / sessionReps.length) * 100}
            title="Knees"
            sub={`rep ${summary.variantSwitchIndex + 1}`}
            align="right"
          />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/15 pt-3">
          <Key c={ON_DARK['standard-full']} t={`${summary.full - 12} standard`} />
          <Key c={ON_DARK['knee-full']} t="12 knees" />
          <Key c={ON_DARK['standard-half']} t={`${summary.half} half depth`} />
          <Key c={ON_DARK.uncounted} t={`${summary.uncounted} didn't count`} />
        </div>
      </div>

      {/* ---- Sheet: claim only ---- */}
      <div className="relative z-10 mt-7 rounded-t-[36px] bg-white px-6 pt-6 pb-9">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />

        <div className="flex items-center gap-4 rounded-[24px] bg-half-wash p-4">
          <Ring pct={82} size={58} stroke={8} color="var(--color-half)">
            <span className="font-display text-[16px] text-ink tnum">82%</span>
          </Ring>
          <div className="flex-1">
            <p className="font-display text-[17px] text-ink">So close to Perfect Form</p>
            <p className="mt-0.5 font-sans text-[13px] leading-snug text-ink-soft">
              Reach your goal with every rep at full depth and the bonus pays on top of your budget.
            </p>
          </div>
        </div>

        <button className="mt-5 w-full rounded-[24px] bg-gradient-to-b from-streak to-[#e0602c] py-4.5 font-display text-[20px] text-white shadow-[0_6px_0_0_#c14f21] transition active:translate-y-1 active:shadow-[0_2px_0_0_#c14f21]">
          Claim {summary.earned} XP
        </button>
        <button className="mt-2 w-full py-2 font-sans text-[13.5px] font-bold text-ink-faint underline decoration-line underline-offset-4">
          That count was wrong
        </button>
      </div>
    </div>
  )
}
SummaryA.variantName = 'Celebration'

function Marker({
  leftPct,
  title,
  sub,
  align = 'left',
}: {
  leftPct: number
  title: string
  sub: string
  align?: 'left' | 'right'
}) {
  return (
    <div
      className="absolute top-0"
      style={{ left: `${leftPct}%`, transform: align === 'right' ? 'translateX(-100%)' : undefined }}
    >
      <div className="h-3 w-px bg-white/40" />
      <div className={align === 'right' ? 'text-right' : ''}>
        <p className="font-sans text-[11px] font-bold whitespace-nowrap text-white/90">{title}</p>
        <p className="font-sans text-[10px] whitespace-nowrap text-white/50">{sub}</p>
      </div>
    </div>
  )
}

function Key({ c, t }: { c: string; t: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
      <span className="font-sans text-[11.5px] font-semibold text-white/70">{t}</span>
    </span>
  )
}
