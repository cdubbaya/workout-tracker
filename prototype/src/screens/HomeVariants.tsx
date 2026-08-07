import { useEffect, useRef } from 'react'
import { StatusBar, RepBlocks, Ring } from '../Frame'
import { home, budgetRemaining } from '../data'

const pctSpent = Math.round((home.spentToday / home.sessionGoal) * 100)
const repsLeft = Math.round(budgetRemaining / 10)

/* ========================================================================
   A — Budget first. The meter is the hero and everything else is a footnote.
   ======================================================================== */

export function HomeA() {
  return (
    <div className="min-h-full bg-gradient-to-b from-white via-white to-full-wash/50">
      <StatusBar />

      <div className="flex items-center justify-between px-7 pt-2">
        <span className="font-sans text-[13px] font-bold tracking-[0.14em] text-ink-faint uppercase">
          Thursday
        </span>
        <div className="flex items-center gap-1.5 rounded-full bg-streak-wash px-3 py-1.5">
          <span>🔥</span>
          <span className="font-display text-[15px] text-streak tnum">{home.streakDays}</span>
        </div>
      </div>

      <div className="px-7 pt-9">
        <div className="a-pop flex items-baseline gap-2">
          <span className="font-display text-[92px] leading-[0.8] text-ink tnum">
            {budgetRemaining}
          </span>
          <span className="font-display text-[26px] text-ink-faint">XP</span>
        </div>
        <p className="mt-3 font-sans text-[15px] font-semibold text-ink-soft">
          left to earn today — about {repsLeft} standard push-ups
        </p>
      </div>

      <div className="mt-8 px-7">
        <RepBlocks full={13} half={0} remainingSlots={32} height={90} width={8} gap={3.5} />
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <span className="font-sans text-[13px] font-semibold text-ink-soft">
            {home.spentToday} already earned
          </span>
          <span className="font-sans text-[13px] text-ink-faint">{home.spentSource}</span>
        </div>
      </div>

      <div className="mt-10 px-7">
        <button className="w-full rounded-[26px] bg-gradient-to-b from-full to-full-deep py-5 font-display text-[22px] text-white shadow-[0_8px_0_0_#07704f] transition active:translate-y-1 active:shadow-[0_4px_0_0_#07704f]">
          Start session
        </button>
        <button className="mt-3 w-full py-2 font-sans text-[15px] font-bold text-ink-soft">
          Free-form set instead
        </button>
      </div>

      <div className="mt-8 space-y-2.5 px-7 pb-10">
        <Row
          left="Level 7"
          right={`${home.levelXp.toLocaleString()} / ${home.levelTarget.toLocaleString()}`}
          pct={(home.levelXp / home.levelTarget) * 100}
          color="var(--color-social)"
        />
        <Row
          left="Office Push-Up War"
          right={`3rd of 5 · ${home.challenge.daysLeft}d left`}
          pct={57}
          color="var(--color-streak)"
        />
      </div>
    </div>
  )
}
HomeA.variantName = 'Budget first'

function Row({
  left,
  right,
  pct,
  color,
}: {
  left: string
  right: string
  pct: number
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_0_0_var(--color-line)]">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[14px] font-bold text-ink">{left}</span>
        <span className="font-sans text-[13px] text-ink-soft tnum">{right}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

/* ========================================================================
   B — Card deck. Scrollable stack, each concern in its own tile.
   ======================================================================== */

export function HomeB() {
  return (
    <div className="min-h-full bg-paper pb-12">
      <StatusBar />

      <div className="flex items-center justify-between px-5 pt-2 pb-5">
        <div>
          <p className="font-display text-[27px] leading-none text-ink">Hi, {home.name}</p>
          <p className="mt-1 font-sans text-[13px] font-semibold text-ink-faint">
            Day {home.streakDays} · 7 to your next milestone
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-streak-wash">
          <span className="text-[19px]">🔥</span>
        </div>
      </div>

      <div className="space-y-3.5 px-5">
        <div className="a-rise overflow-hidden rounded-[28px] bg-gradient-to-br from-full to-social p-[2px] shadow-[0_14px_30px_-14px_rgba(10,143,101,0.7)]">
          <div className="rounded-[26px] bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-sans text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase">
                  Today
                </p>
                <p className="mt-1.5 font-display text-[46px] leading-none text-ink tnum">
                  {budgetRemaining}
                  <span className="ml-1.5 font-display text-[18px] text-ink-faint">XP left</span>
                </p>
              </div>
              <Ring pct={pctSpent} size={62} stroke={8}>
                <span className="font-display text-[15px] text-ink tnum">{pctSpent}%</span>
              </Ring>
            </div>

            <div className="mt-4">
              <RepBlocks full={13} half={0} remainingSlots={32} height={40} width={5.5} gap={2.5} />
            </div>
            <p className="mt-2.5 font-sans text-[12.5px] text-ink-soft">
              {home.spentToday} XP banked this morning · {home.spentSource}
            </p>

            <button className="mt-4 w-full rounded-2xl bg-gradient-to-b from-full to-full-deep py-4 font-display text-[19px] text-white shadow-[0_5px_0_0_#07704f] transition active:translate-y-0.5">
              Start session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Tile tint="var(--color-streak-wash)">
            <p className="font-sans text-[11.5px] font-bold tracking-widest text-streak uppercase">
              Streak
            </p>
            <p className="mt-1 font-display text-[38px] leading-none text-ink tnum">
              {home.streakDays}
            </p>
            <p className="mt-1 font-sans text-[12.5px] font-semibold text-ink-soft">
              ❄ {home.freezes} freezes saved
            </p>
          </Tile>
          <Tile tint="var(--color-social-wash)">
            <p className="font-sans text-[11.5px] font-bold tracking-widest text-social uppercase">
              Level
            </p>
            <p className="mt-1 font-display text-[38px] leading-none text-ink tnum">{home.level}</p>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-social"
                style={{ width: `${(home.levelXp / home.levelTarget) * 100}%` }}
              />
            </div>
          </Tile>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-[0_1px_0_0_var(--color-line)]">
          <div className="flex items-center justify-between">
            <p className="font-display text-[19px] text-ink">{home.challenge.name}</p>
            <span className="rounded-full bg-social px-2.5 py-1 font-sans text-[11px] font-bold text-white">
              {home.challenge.unread} new
            </span>
          </div>
          <p className="mt-1 font-sans text-[13px] font-semibold text-ink-soft">
            3rd of 5 · {home.challenge.daysLeft} days left
          </p>
          <div className="mt-3.5 flex -space-x-2">
            {['SR', 'PN', 'CW', 'DA', 'MK'].map((i, n) => (
              <div
                key={i}
                className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-white font-sans text-[11.5px] font-bold text-white"
                style={{
                  background: ['#16c088', '#3aa3e3', '#ff7a45', '#ffc145', '#8aa39c'][n],
                }}
              >
                {i}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
HomeB.variantName = 'Card deck'

function Tile({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-[24px] p-4" style={{ background: tint }}>
      {children}
    </div>
  )
}

/* ========================================================================
   C — Path. The streak rendered as ground you've covered.
   ======================================================================== */

const pastDays = [
  { d: 22, pct: 100, perfect: true },
  { d: 21, pct: 84, perfect: false },
  { d: 20, pct: 100, perfect: false },
  { d: 19, pct: 100, perfect: true },
  { d: 18, pct: 0, frozen: true, perfect: false },
  { d: 17, pct: 92, perfect: false },
]

export function HomeC() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [])

  return (
    <div ref={ref} className="min-h-full bg-gradient-to-b from-social-wash via-white to-white pb-14">
      <StatusBar />

      <div className="sticky top-0 z-20 flex items-center justify-between bg-white/85 px-6 py-3 backdrop-blur">
        <span className="font-display text-[20px] text-ink">Level {home.level}</span>
        <div className="flex items-center gap-3 font-display text-[16px]">
          <span className="text-streak">🔥 {home.streakDays}</span>
          <span className="text-social">❄ {home.freezes}</span>
        </div>
      </div>

      <div className="relative px-6 pt-6">
        {/* Milestone ahead, locked */}
        <div className="a-drift relative mx-auto mb-1 w-fit">
          <div className="grid h-[86px] w-[86px] place-items-center rounded-[30px] bg-gradient-to-br from-half to-streak shadow-[0_12px_28px_-10px_rgba(255,122,69,0.8)]">
            <span className="text-[34px]">🏆</span>
          </div>
        </div>
        <p className="text-center font-display text-[17px] text-ink">Day 30</p>
        <p className="text-center font-sans text-[12.5px] font-semibold text-ink-faint">
          Milestone bonus · 7 days away
        </p>

        <Dots n={3} />

        {/* Today */}
        <div className="relative mx-auto w-fit">
          <span className="absolute -inset-3 animate-ping rounded-full bg-full/20" />
          <Ring pct={pctSpent} size={132} stroke={13} color="var(--color-full)">
            <div className="text-center">
              <p className="font-display text-[38px] leading-none text-ink tnum">
                {budgetRemaining}
              </p>
              <p className="font-sans text-[11.5px] font-bold tracking-wider text-ink-faint uppercase">
                XP left
              </p>
            </div>
          </Ring>
        </div>
        <p className="mt-3 text-center font-display text-[21px] text-ink">Today</p>
        <p className="text-center font-sans text-[13px] font-semibold text-ink-soft">
          {home.spentToday} XP banked · {repsLeft} standard reps to go
        </p>

        <button className="mx-auto mt-4 block w-[230px] rounded-[24px] bg-gradient-to-b from-full to-full-deep py-4 font-display text-[19px] text-white shadow-[0_7px_0_0_#07704f] transition active:translate-y-1 active:shadow-[0_3px_0_0_#07704f]">
          Start session
        </button>

        <Dots n={2} />

        {/* Behind you */}
        <div className="space-y-0">
          {pastDays.map((p, i) => (
            <div key={p.d}>
              <div
                className={`flex items-center gap-4 ${i % 2 === 0 ? 'ml-6' : 'ml-20'} transition`}
              >
                <div
                  className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl font-display text-[15px] text-white"
                  style={{
                    background: p.frozen
                      ? 'var(--color-social)'
                      : p.pct === 100
                        ? 'linear-gradient(180deg,var(--color-full),var(--color-full-deep))'
                        : 'var(--color-half)',
                  }}
                >
                  {p.frozen ? '❄' : `${p.pct}%`}
                </div>
                <div>
                  <p className="font-sans text-[13.5px] font-bold text-ink">Day {p.d}</p>
                  <p className="font-sans text-[12px] text-ink-faint">
                    {p.frozen ? 'Freeze used' : p.perfect ? 'Perfect form' : 'Goal met'}
                  </p>
                </div>
              </div>
              {i < pastDays.length - 1 && <Dots n={1} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
HomeC.variantName = 'Path'

function Dots({ n }: { n: number }) {
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {Array.from({ length: n * 3 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-line" />
      ))}
    </div>
  )
}
