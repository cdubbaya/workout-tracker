import { StatusBar, Ring } from '../Frame'
import { summary, sessionReps, uncountedReasons, REP_VALUE, type RepKind } from '../data'

const mins = Math.floor(summary.durationSec / 60)
const secs = summary.durationSec % 60
const duration = `${mins}:${String(secs).padStart(2, '0')}`

const lines: { kind: RepKind; count: number }[] = [
  { kind: 'standard-full', count: sessionReps.filter((r) => r === 'standard-full').length },
  { kind: 'standard-half', count: sessionReps.filter((r) => r === 'standard-half').length },
  { kind: 'knee-full', count: sessionReps.filter((r) => r === 'knee-full').length },
  { kind: 'uncounted', count: summary.uncounted },
]

const COLOR: Record<RepKind, string> = {
  'standard-full': 'var(--color-full)',
  'standard-half': 'var(--color-half)',
  'knee-full': 'var(--color-social)',
  'knee-half': '#9fd4c0',
  uncounted: 'var(--color-line)',
}

/* ========================================================================
   A — Receipt. Itemised, honest, no celebration. Shows its working.
   ======================================================================== */

export function SummaryA() {
  return (
    <div className="min-h-full bg-paper pb-12">
      <StatusBar />

      <div className="px-7 pt-4 pb-6">
        <p className="font-sans text-[12px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          Session complete · {duration}
        </p>
        <p className="mt-2 font-display text-[64px] leading-none text-ink tnum">
          {summary.earned}
          <span className="ml-2 font-display text-[22px] text-ink-faint">XP</span>
        </p>
        <p className="mt-1.5 font-sans text-[15px] font-semibold text-full-deep">
          Goal met — {summary.goal} of {summary.goal}
        </p>
      </div>

      <div className="mx-5 rounded-[26px] bg-white p-5 shadow-[0_1px_0_0_var(--color-line)]">
        <p className="font-sans text-[11.5px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          What you earned
        </p>
        <div className="mt-3.5 space-y-0">
          {lines.map((l) => (
            <div
              key={l.kind}
              className="flex items-center gap-3 border-b border-line py-3 last:border-0"
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ background: COLOR[l.kind] }}
              />
              <span className="flex-1 font-sans text-[14.5px] font-semibold text-ink">
                {l.kind === 'uncounted' ? "Didn't count" : REP_LABEL_SHORT[l.kind]}
              </span>
              <span className="font-sans text-[13px] text-ink-faint tnum">
                {l.count} × {REP_VALUE[l.kind]}
              </span>
              <span className="w-12 text-right font-display text-[17px] text-ink tnum">
                {l.count * REP_VALUE[l.kind]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between border-t-2 border-ink pt-3">
          <span className="font-display text-[17px] text-ink">Total</span>
          <span className="font-display text-[24px] text-ink tnum">{summary.earned}</span>
        </div>
      </div>

      <div className="mx-5 mt-3.5 rounded-[26px] border-2 border-dashed border-half bg-half-wash p-5">
        <div className="flex items-start gap-3">
          <span className="text-[22px]">◑</span>
          <div>
            <p className="font-display text-[17px] text-ink">Perfect Form missed</p>
            <p className="mt-1 font-sans text-[13.5px] leading-snug text-ink-soft">
              {summary.half} reps stopped short of depth. Reach your goal with none and it pays a
              bonus on top of your budget.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-3.5 rounded-[26px] bg-white p-5 shadow-[0_1px_0_0_var(--color-line)]">
        <p className="font-sans text-[11.5px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          The 3 that didn't count
        </p>
        <div className="mt-3 space-y-2.5">
          {uncountedReasons.map((u) => (
            <div key={u.reason} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-paper font-display text-[13px] text-ink-soft">
                {u.count}
              </span>
              <div>
                <p className="font-sans text-[14px] font-bold text-ink">{u.reason}</p>
                <p className="font-sans text-[12.5px] text-ink-soft">{u.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 px-5">
        <button className="w-full rounded-[24px] bg-gradient-to-b from-full to-full-deep py-4.5 font-display text-[20px] text-white shadow-[0_6px_0_0_#07704f]">
          Done
        </button>
        <button className="mt-2.5 w-full py-2 font-sans text-[14px] font-bold text-ink-faint underline decoration-line underline-offset-4">
          That count was wrong
        </button>
      </div>
    </div>
  )
}
SummaryA.variantName = 'Receipt'

const REP_LABEL_SHORT: Record<string, string> = {
  'standard-full': 'Standard, full depth',
  'standard-half': 'Standard, half depth',
  'knee-full': 'Knee, full depth',
  'knee-half': 'Knee, half depth',
}

/* ========================================================================
   B — Celebration. Reward screen first, detail on demand.
   ======================================================================== */

export function SummaryB() {
  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-b from-full via-full-deep to-[#06584080] pb-12">
      <StatusBar dark />

      {/* Ambient confetti */}
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

      <div className="relative z-10 px-7 pt-10 text-center">
        <p className="a-rise font-sans text-[13px] font-bold tracking-[0.2em] text-white/70 uppercase">
          Day {summary.streakDays} · streak alive
        </p>
        <div className="a-pop mt-5">
          <p className="font-display text-[104px] leading-[0.82] text-white tnum">
            {summary.earned}
          </p>
          <p className="font-display text-[26px] text-white/80">XP earned</p>
        </div>
        <p className="a-rise mt-4 font-sans text-[16px] font-semibold text-white/85">
          You filled your whole budget in {duration}
        </p>
      </div>

      <div className="relative z-10 mt-8 flex justify-center gap-3 px-6">
        <Medal big value={summary.counted} label="reps counted" />
        <Medal big value={summary.full} label="full depth" />
        <Medal big value={`+${summary.streakDays}`} label="day streak" />
      </div>

      <div className="relative z-10 mt-8 rounded-t-[36px] bg-white px-6 pt-6 pb-8">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line" />

        <div className="flex items-center gap-4 rounded-[24px] bg-half-wash p-4">
          <Ring pct={82} size={58} stroke={8} color="var(--color-half)">
            <span className="font-display text-[16px] text-ink tnum">82%</span>
          </Ring>
          <div className="flex-1">
            <p className="font-display text-[17px] text-ink">So close to Perfect Form</p>
            <p className="mt-0.5 font-sans text-[13px] leading-snug text-ink-soft">
              {summary.half} of your {summary.counted} reps went shallow. None next time and the
              bonus is yours.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {lines.slice(0, 3).map((l) => (
            <div key={l.kind} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[l.kind] }} />
              <span className="flex-1 font-sans text-[14px] font-semibold text-ink-soft">
                {REP_LABEL_SHORT[l.kind]}
              </span>
              <span className="font-display text-[16px] text-ink tnum">{l.count}</span>
            </div>
          ))}
        </div>

        <button className="mt-6 w-full rounded-[24px] bg-gradient-to-b from-streak to-[#e0602c] py-4.5 font-display text-[20px] text-white shadow-[0_6px_0_0_#c14f21]">
          Claim and continue
        </button>
        <button className="mt-2 w-full py-2 font-sans text-[13.5px] font-bold text-ink-faint">
          See every rep
        </button>
      </div>
    </div>
  )
}
SummaryB.variantName = 'Celebration'

const CONFETTI = [
  { x: 8, y: 12, s: 9, r: 20, c: '#ffc145' },
  { x: 88, y: 8, s: 7, r: -30, c: '#ffffff' },
  { x: 22, y: 30, s: 6, r: 55, c: '#ff7a45' },
  { x: 78, y: 26, s: 10, r: 12, c: '#ffc145' },
  { x: 50, y: 5, s: 6, r: -15, c: '#ffffff' },
  { x: 92, y: 40, s: 8, r: 40, c: '#ff7a45' },
  { x: 5, y: 44, s: 7, r: -50, c: '#ffffff' },
]

function Medal({ value, label, big }: { value: number | string; label: string; big?: boolean }) {
  return (
    <div className="flex-1 rounded-[22px] bg-white/15 px-2 py-3.5 text-center backdrop-blur-sm">
      <p className={`font-display ${big ? 'text-[30px]' : 'text-[22px]'} leading-none text-white tnum`}>
        {value}
      </p>
      <p className="mt-1 font-sans text-[11px] font-semibold text-white/70">{label}</p>
    </div>
  )
}

/* ========================================================================
   C — Time strip. THE RISK. Every rep of the set plotted in order, so the
   Fatigue Point (ADR-0008) and the moment you dropped to knees are visible
   as shape rather than as numbers.
   ======================================================================== */

export function SummaryC() {
  return (
    <div className="min-h-full bg-paper pb-12">
      <StatusBar />

      <div className="px-6 pt-4">
        <p className="font-sans text-[12px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          Session complete · {duration}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-[58px] leading-none text-ink tnum">
            {summary.earned}
          </span>
          <span className="font-display text-[20px] text-ink-faint">XP · goal met</span>
        </div>
      </div>

      {/* The strip */}
      <div className="mt-7 rounded-[28px] bg-white px-5 pt-5 pb-4 shadow-[0_1px_0_0_var(--color-line)] mx-4">
        <p className="font-sans text-[11.5px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          Your set, rep by rep
        </p>

        <div className="mt-5 flex h-[96px] items-end gap-[1.5px]">
          {sessionReps.map((r, i) => {
            const h = r.endsWith('-full') ? 96 : r.endsWith('-half') ? 48 : 13
            return (
              <div
                key={i}
                className="a-block flex-1 rounded-[2px]"
                style={{
                  height: h,
                  background: COLOR[r],
                  animationDelay: `${Math.min(i * 9, 620)}ms`,
                  opacity: r === 'uncounted' ? 0.55 : 1,
                }}
              />
            )
          })}
        </div>

        {/* Markers under the strip */}
        <div className="relative mt-2 h-11">
          <Marker
            leftPct={(summary.fatiguePointIndex / sessionReps.length) * 100}
            color="var(--color-half)"
            title="Depth started slipping"
            sub={`rep ${summary.fatiguePointIndex + 1}`}
          />
          <Marker
            leftPct={(summary.variantSwitchIndex / sessionReps.length) * 100}
            color="var(--color-social)"
            title="Dropped to knees"
            sub={`rep ${summary.variantSwitchIndex + 1}`}
            align="right"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
          <Key color="var(--color-full)" label={`${summary.full} full depth`} />
          <Key color="var(--color-half)" label={`${summary.half} half depth`} />
          <Key color="var(--color-social)" label="12 on knees" />
          <Key color="var(--color-line)" label={`${summary.uncounted} didn't count`} />
        </div>
      </div>

      <div className="mx-4 mt-3.5 rounded-[28px] bg-gradient-to-br from-full-wash to-social-wash p-5">
        <p className="font-display text-[18px] text-ink">You held full depth for 34 reps</p>
        <p className="mt-1.5 font-sans text-[13.5px] leading-snug text-ink-soft">
          That's 6 more than last Thursday. Depth slipped at rep 35 and you switched to knees at 47 —
          which is why you finished. Perfect Form needs all {summary.counted} at full depth.
        </p>
      </div>

      <div className="mt-6 px-4">
        <button className="w-full rounded-[24px] bg-gradient-to-b from-full to-full-deep py-4.5 font-display text-[20px] text-white shadow-[0_6px_0_0_#07704f]">
          Done
        </button>
        <button className="mt-2.5 w-full py-2 font-sans text-[14px] font-bold text-ink-faint underline decoration-line underline-offset-4">
          That count was wrong
        </button>
      </div>
    </div>
  )
}
SummaryC.variantName = 'Time strip'

function Marker({
  leftPct,
  color,
  title,
  sub,
  align = 'left',
}: {
  leftPct: number
  color: string
  title: string
  sub: string
  align?: 'left' | 'right'
}) {
  return (
    <div
      className="absolute top-0"
      style={{
        left: `${leftPct}%`,
        transform: align === 'right' ? 'translateX(-100%)' : undefined,
      }}
    >
      <div className="h-3 w-px" style={{ background: color }} />
      <div className={align === 'right' ? 'text-right' : ''}>
        <p className="font-sans text-[11.5px] font-bold whitespace-nowrap" style={{ color }}>
          {title}
        </p>
        <p className="font-sans text-[10.5px] whitespace-nowrap text-ink-faint">{sub}</p>
      </div>
    </div>
  )
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="font-sans text-[12px] font-semibold text-ink-soft">{label}</span>
    </span>
  )
}
