import { StatusBar, RepBlocks, Ring } from '../Frame'
import { home, budgetRemaining } from '../data'

const pctSpent = Math.round((home.spentToday / home.sessionGoal) * 100)
const repsLeft = Math.round(budgetRemaining / 10)

/* Shared across variants: the Today card is the one thing that survived the
   first round intact, so every variant keeps it and argues about the rest. */
function TodaySession({ tone = 'light' }: { tone?: 'light' | 'bold' }) {
  const bold = tone === 'bold'
  return (
    <div
      className={
        bold
          ? 'a-rise overflow-hidden rounded-[30px] bg-gradient-to-br from-full via-[#13b591] to-social p-5 shadow-[0_18px_36px_-16px_rgba(10,143,101,0.85)]'
          : 'a-rise overflow-hidden rounded-[30px] bg-white p-5 shadow-[0_14px_34px_-18px_rgba(12,51,46,0.45)]'
      }
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`font-sans text-[12px] font-bold tracking-[0.16em] uppercase ${
              bold ? 'text-white/75' : 'text-ink-faint'
            }`}
          >
            Today's session
          </p>
          <p
            className={`mt-1.5 font-display text-[50px] leading-none tnum ${
              bold ? 'text-white' : 'text-ink'
            }`}
          >
            {budgetRemaining}
            <span
              className={`ml-2 font-display text-[18px] ${bold ? 'text-white/70' : 'text-ink-faint'}`}
            >
              XP left
            </span>
          </p>
        </div>
        <Ring
          pct={pctSpent}
          size={64}
          stroke={8}
          color={bold ? '#ffffff' : 'var(--color-full)'}
          track={bold ? 'rgba(255,255,255,0.25)' : 'var(--color-line)'}
        >
          <span
            className={`font-display text-[15px] tnum ${bold ? 'text-white' : 'text-ink'}`}
          >
            {pctSpent}%
          </span>
        </Ring>
      </div>

      <div className="mt-4">
        <RepBlocks full={13} half={0} remainingSlots={32} height={42} width={5.5} gap={2.5} />
      </div>
      <p
        className={`mt-2.5 font-sans text-[12.5px] font-medium ${
          bold ? 'text-white/80' : 'text-ink-soft'
        }`}
      >
        {home.spentToday} XP banked at 8:12am · about {repsLeft} standard reps to go
      </p>

      <button
        className={
          bold
            ? 'mt-4 w-full rounded-2xl bg-white py-4 font-display text-[19px] text-full-deep shadow-[0_5px_0_0_rgba(0,0,0,0.15)] transition active:translate-y-0.5'
            : 'mt-4 w-full rounded-2xl bg-gradient-to-b from-full to-full-deep py-4 font-display text-[19px] text-white shadow-[0_5px_0_0_#07704f] transition active:translate-y-0.5'
        }
      >
        Start session
      </button>
    </div>
  )
}

const WEEK = [
  { d: 'M', state: 'done' },
  { d: 'T', state: 'perfect' },
  { d: 'W', state: 'freeze' },
  { d: 'T', state: 'done' },
  { d: 'F', state: 'today' },
  { d: 'S', state: 'future' },
  { d: 'S', state: 'future' },
] as const

/* ========================================================================
   A — Week strip. Seven dots, this week, today pulsing.
   ======================================================================== */

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

      {/* Streak — the week as dots */}
      <div className="mx-5 rounded-[28px] bg-gradient-to-br from-streak to-[#ff9d3d] p-5 shadow-[0_16px_32px_-16px_rgba(255,122,69,0.95)]">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[44px] leading-none text-white tnum">
            {home.streakDays}
          </span>
          <span className="font-display text-[17px] text-white/80">day streak</span>
        </div>
        <div className="mt-4 flex justify-between">
          {WEEK.map((w, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="font-sans text-[10.5px] font-bold text-white/60">{w.d}</span>
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
                            ? 'bg-white ring-[3px] ring-white/50 text-streak'
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
        <p className="mt-3.5 font-sans text-[12.5px] font-semibold text-white/80">
          7 days to your day-30 milestone · ❄ {home.freezes} freezes saved
        </p>
      </div>

      <div className="mt-3.5 px-5">
        <TodaySession />
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
            {home.levelTarget - home.levelXp} XP to 8
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

      <div className="mt-3.5 px-5">
        <ChallengeCard />
      </div>
    </div>
  )
}
HomeA.variantName = 'Week dots'

/* ========================================================================
   B — Month grid. A month of dots, contribution-graph energy in game colour.
   ======================================================================== */

const MONTH: ('perfect' | 'done' | 'freeze' | 'miss' | 'today' | 'future')[] = [
  'miss', 'done', 'done', 'perfect', 'done', 'miss', 'done',
  'done', 'perfect', 'done', 'done', 'done', 'perfect', 'done',
  'done', 'done', 'freeze', 'done', 'perfect', 'done', 'done',
  'perfect', 'done', 'done', 'freeze', 'done', 'done', 'today',
  'future', 'future', 'future',
]

const DOT: Record<string, string> = {
  perfect: 'linear-gradient(180deg,#16c088,#0a8f65)',
  done: '#7fdcbb',
  freeze: '#3aa3e3',
  miss: '#e2ece8',
  today: 'linear-gradient(180deg,#ff7a45,#ff9d3d)',
  future: 'transparent',
}

export function HomeB() {
  return (
    <div className="min-h-full bg-paper pb-12">
      <StatusBar />

      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <p className="font-display text-[27px] leading-none text-ink">Hi, {home.name}</p>
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-streak to-[#ff9d3d] px-3.5 py-2 shadow-[0_6px_16px_-6px_rgba(255,122,69,0.9)]">
          <span className="text-[14px]">🔥</span>
          <span className="font-display text-[16px] text-white tnum">{home.streakDays}</span>
        </div>
      </div>

      <div className="px-5">
        <TodaySession tone="bold" />
      </div>

      {/* Streak — a month of dots */}
      <div className="mx-5 mt-3.5 rounded-[28px] bg-white p-5 shadow-[0_14px_34px_-20px_rgba(12,51,46,0.4)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-sans text-[11.5px] font-bold tracking-[0.16em] text-ink-faint uppercase">
              August
            </p>
            <p className="mt-1 font-display text-[34px] leading-none text-ink tnum">
              {home.streakDays}
              <span className="ml-1.5 font-display text-[15px] text-ink-faint">days unbroken</span>
            </p>
          </div>
          <span className="rounded-full bg-social-wash px-2.5 py-1.5 font-sans text-[11.5px] font-bold text-social">
            ❄ {home.freezes} saved
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-[7px]">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span
              key={i}
              className="text-center font-sans text-[10px] font-bold text-ink-faint uppercase"
            >
              {d}
            </span>
          ))}
          {MONTH.map((s, i) => (
            <div key={i} className="relative grid aspect-square place-items-center">
              {s === 'today' && (
                <span className="absolute inset-0 animate-ping rounded-[10px] bg-streak/30" />
              )}
              <span
                className="relative grid h-full w-full place-items-center rounded-[10px] text-[10px] font-bold text-white"
                style={{
                  background: DOT[s],
                  border: s === 'future' ? '1.5px dashed var(--color-line)' : undefined,
                }}
              >
                {s === 'freeze' && '❄'}
                {s === 'perfect' && '✦'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-line pt-3">
          <Legend c="linear-gradient(180deg,#16c088,#0a8f65)" t="Perfect form" />
          <Legend c="#7fdcbb" t="Goal met" />
          <Legend c="#3aa3e3" t="Freeze" />
          <Legend c="#e2ece8" t="Missed" />
        </div>
      </div>

      <div className="mt-3.5 px-5">
        <ChallengeCard />
      </div>

      <div className="mx-5 mt-3.5 flex items-center gap-4 rounded-[26px] bg-gradient-to-br from-social to-[#5bb8ef] p-5 shadow-[0_12px_26px_-16px_rgba(58,163,227,0.9)]">
        <Ring pct={(home.levelXp / home.levelTarget) * 100} size={62} stroke={9} color="#ffffff" track="rgba(255,255,255,0.3)">
          <span className="font-display text-[20px] text-white tnum">{home.level}</span>
        </Ring>
        <div>
          <p className="font-display text-[19px] leading-tight text-white">Level {home.level}</p>
          <p className="font-sans text-[12.5px] font-semibold text-white/80 tnum">
            {home.levelTarget - home.levelXp} XP to level {home.level + 1}
          </p>
        </div>
      </div>
    </div>
  )
}
HomeB.variantName = 'Month grid'

function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-[4px]" style={{ background: c }} />
      <span className="font-sans text-[11.5px] font-semibold text-ink-soft">{t}</span>
    </span>
  )
}

/* ========================================================================
   C — Counter badge. The streak as a trophy object, most game-like.
   ======================================================================== */

export function HomeC() {
  return (
    <div className="min-h-full bg-gradient-to-b from-streak-wash via-paper to-full-wash pb-12">
      <StatusBar />

      {/* Streak as an object you own */}
      <div className="relative px-5 pt-2 pb-1">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#ff9d3d] via-streak to-[#ff5f3d] px-5 pt-6 pb-5 shadow-[0_20px_40px_-18px_rgba(255,95,61,0.95)]">
          <span className="absolute -top-8 -right-6 h-32 w-32 rounded-full bg-white/12" />
          <span className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-5">
            <div className="a-pop relative grid h-[104px] w-[104px] shrink-0 place-items-center">
              <span className="absolute inset-0 rounded-[34px] bg-white/20" />
              <span className="absolute inset-[6px] grid place-items-center rounded-[28px] bg-white shadow-inner">
                <span className="font-display text-[42px] leading-none text-streak tnum">
                  {home.streakDays}
                </span>
              </span>
            </div>
            <div>
              <p className="font-display text-[24px] leading-tight text-white">Day streak</p>
              <p className="mt-1 font-sans text-[13px] font-semibold text-white/80">
                Longest yet. 7 days to the day-30 bonus.
              </p>
              <div className="mt-3 flex gap-1.5">
                {WEEK.map((w, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${
                      w.state === 'future'
                        ? 'bg-white/30'
                        : w.state === 'freeze'
                          ? 'bg-social'
                          : 'bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex gap-2">
            <Pill label={`❄ ${home.freezes} freezes`} />
            <Pill label="✦ 12 perfect" />
            <Pill label={`Level ${home.level}`} />
          </div>
        </div>
      </div>

      <div className="mt-3.5 px-5">
        <TodaySession />
      </div>

      <div className="mt-3.5 px-5">
        <ChallengeCard />
      </div>

      <div className="mx-5 mt-3.5 rounded-[26px] bg-white p-5 shadow-[0_1px_0_0_var(--color-line)]">
        <div className="flex items-center justify-between">
          <p className="font-display text-[17px] text-ink">Level {home.level}</p>
          <p className="font-sans text-[12.5px] font-semibold text-ink-faint tnum">
            {home.levelXp.toLocaleString()} / {home.levelTarget.toLocaleString()}
          </p>
        </div>
        <div className="mt-3 h-3.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-full to-social"
            style={{ width: `${(home.levelXp / home.levelTarget) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
HomeC.variantName = 'Streak badge'

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white/20 px-3 py-1.5 font-sans text-[11.5px] font-bold text-white backdrop-blur-sm">
      {label}
    </span>
  )
}

function ChallengeCard() {
  return (
    <div className="rounded-[28px] bg-ink p-5 shadow-[0_14px_30px_-18px_rgba(12,51,46,0.9)]">
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
  )
}
