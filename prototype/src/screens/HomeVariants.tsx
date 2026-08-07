import { StatusBar, RepBlocks, Ring } from '../Frame'
import { home, budgetRemaining } from '../data'

const pctSpent = Math.round((home.spentToday / home.sessionGoal) * 100)
const repsLeft = Math.round(budgetRemaining / 10)

const WEEK = [
  { d: 'M', state: 'perfect' },
  { d: 'T', state: 'done' },
  { d: 'W', state: 'freeze' },
  { d: 'T', state: 'done' },
  { d: 'F', state: 'today' },
  { d: 'S', state: 'future' },
  { d: 'S', state: 'future' },
] as const

const daysThisWeek = WEEK.filter((w) => w.state === 'done' || w.state === 'perfect').length

/**
 * Single surviving home design.
 *
 * Two motivational layers, deliberately: the running total that only ends when
 * the Streak breaks, and a seven-day slate that starts fresh every Monday. The
 * week gates nothing and pays nothing — it is not the N-of-7 weekly streak that
 * ADR-0005 retired.
 */
export function HomeA() {
  return (
    <div className="min-h-full bg-gradient-to-b from-full-wash via-paper to-social-wash/60 pb-12">
      <StatusBar />

      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <p className="font-display text-[27px] leading-none text-ink">Hi, {home.name}</p>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-half to-streak text-[19px] shadow-[0_6px_16px_-6px_rgba(255,122,69,0.9)]">
          🔥
        </div>
      </div>

      {/* Streak — running total up top, resetting week below the rule */}
      <div className="mx-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-streak to-[#ff9d3d] shadow-[0_16px_32px_-16px_rgba(255,122,69,0.95)]">
        <div className="relative px-5 pt-5 pb-4">
          <span className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/12" />
          <div className="relative flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="a-pop font-display text-[52px] leading-none text-white tnum">
                  {home.streakDays}
                </span>
                <span className="font-display text-[18px] text-white/85">day streak</span>
              </div>
              <p className="mt-1 font-sans text-[12.5px] font-semibold text-white/75">
                7 days to your day-30 bonus
              </p>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1.5 font-sans text-[11.5px] font-bold text-white backdrop-blur-sm">
              ❄ {home.freezes} saved
            </span>
          </div>
        </div>

        <div className="border-t border-white/20 px-5 pt-3.5 pb-4">
          <div className="flex items-baseline justify-between">
            <p className="font-sans text-[11px] font-bold tracking-[0.18em] text-white/70 uppercase">
              This week
            </p>
            <p className="font-sans text-[12px] font-bold text-white/85 tnum">
              {daysThisWeek} of 7
            </p>
          </div>

          <div className="mt-3 flex justify-between">
            {WEEK.map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="font-sans text-[10.5px] font-bold text-white/55">{w.d}</span>
                <div className="relative grid h-9 w-9 place-items-center">
                  {w.state === 'today' && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-white/50" />
                  )}
                  <span
                    className={`relative grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold ${
                      w.state === 'perfect'
                        ? 'bg-white text-streak'
                        : w.state === 'done'
                          ? 'bg-white/85 text-streak'
                          : w.state === 'freeze'
                            ? 'bg-social text-white'
                            : w.state === 'today'
                              ? 'bg-white text-streak ring-[3px] ring-white/50'
                              : 'border-2 border-dashed border-white/45'
                    }`}
                  >
                    {w.state === 'perfect' && '✦'}
                    {w.state === 'done' && '●'}
                    {w.state === 'freeze' && '❄'}
                    {w.state === 'today' && '◎'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 font-sans text-[11.5px] font-semibold text-white/65">
            Fresh slate every Monday — the run above keeps counting
          </p>
        </div>
      </div>

      {/* Today's session */}
      <div className="mx-5 mt-3.5 rounded-[30px] bg-white p-5 shadow-[0_14px_34px_-18px_rgba(12,51,46,0.45)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans text-[12px] font-bold tracking-[0.16em] text-ink-faint uppercase">
              Today's session
            </p>
            <p className="mt-1.5 font-display text-[50px] leading-none text-ink tnum">
              {budgetRemaining}
              <span className="ml-2 font-display text-[18px] text-ink-faint">XP left</span>
            </p>
          </div>
          <Ring pct={pctSpent} size={64} stroke={8}>
            <span className="font-display text-[15px] text-ink tnum">{pctSpent}%</span>
          </Ring>
        </div>

        <div className="mt-4">
          <RepBlocks full={13} half={0} remainingSlots={32} height={42} width={5.5} gap={2.5} />
        </div>
        <p className="mt-2.5 font-sans text-[12.5px] font-medium text-ink-soft">
          {home.spentToday} XP banked at 8:12am · about {repsLeft} standard reps to go
        </p>

        <button className="mt-4 w-full rounded-2xl bg-gradient-to-b from-full to-full-deep py-4 font-display text-[19px] text-white shadow-[0_5px_0_0_#07704f] transition active:translate-y-0.5 active:shadow-[0_2px_0_0_#07704f]">
          Start session
        </button>
        <button className="mt-2 w-full py-1.5 font-sans text-[14px] font-bold text-ink-faint">
          Free-form set instead
        </button>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-3.5 px-5">
        <div className="rounded-[26px] bg-gradient-to-br from-social to-[#5bb8ef] p-4 shadow-[0_12px_26px_-14px_rgba(58,163,227,0.9)]">
          <p className="font-sans text-[11px] font-bold tracking-widest text-white/70 uppercase">
            Level
          </p>
          <p className="mt-1 font-display text-[38px] leading-none text-white tnum">{home.level}</p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(home.levelXp / home.levelTarget) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 font-sans text-[11px] font-semibold text-white/75 tnum">
            {home.levelTarget - home.levelXp} XP to {home.level + 1}
          </p>
        </div>
        <div className="rounded-[26px] bg-gradient-to-br from-half to-[#ffd47a] p-4 shadow-[0_12px_26px_-14px_rgba(255,193,69,0.9)]">
          <p className="font-sans text-[11px] font-bold tracking-widest text-ink/50 uppercase">
            Perfect form
          </p>
          <p className="mt-1 font-display text-[38px] leading-none text-ink tnum">12</p>
          <p className="mt-2 font-sans text-[12px] font-semibold text-ink/65">
            sessions with no half reps
          </p>
        </div>
      </div>

      <div className="mx-5 mt-3.5 rounded-[28px] bg-ink p-5 shadow-[0_14px_30px_-18px_rgba(12,51,46,0.9)]">
        <div className="flex items-center justify-between">
          <p className="font-display text-[19px] text-white">{home.challenge.name}</p>
          <span className="rounded-full bg-streak px-2.5 py-1 font-sans text-[11px] font-bold text-white">
            {home.challenge.unread} new
          </span>
        </div>
        <p className="mt-1 font-sans text-[13px] font-semibold text-white/60">
          3rd of 5 · {home.challenge.daysLeft} days left
        </p>
        <div className="mt-3.5 flex -space-x-2">
          {['SR', 'PN', 'CW', 'DA', 'MK'].map((i, n) => (
            <div
              key={i}
              className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-ink font-sans text-[11.5px] font-bold text-white"
              style={{ background: ['#16c088', '#3aa3e3', '#ff7a45', '#ffc145', '#8aa39c'][n] }}
            >
              {i}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
HomeA.variantName = 'Week dots'
