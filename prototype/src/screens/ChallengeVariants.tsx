import { StatusBar } from '../Frame'
import { challenge, players, chat } from '../data'

const maxSoFar = challenge.dayNow * 100

/* ========================================================================
   A — Standings first. Chat lives behind a drawer at the bottom.
   ======================================================================== */

export function ChallengeA() {
  return (
    <div className="min-h-full bg-paper pb-28">
      <StatusBar />

      <div className="bg-gradient-to-br from-social to-full px-6 pt-3 pb-7">
        <p className="font-sans text-[12px] font-bold tracking-[0.16em] text-white/70 uppercase">
          {challenge.format}
        </p>
        <p className="mt-1 font-display text-[29px] leading-tight text-white">{challenge.name}</p>
        <div className="mt-4 flex items-center gap-2">
          {Array.from({ length: challenge.dayTotal }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < challenge.dayNow ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 font-sans text-[13px] font-semibold text-white/80">
          Day {challenge.dayNow} of {challenge.dayTotal} · 3 days left
        </p>
      </div>

      <div className="-mt-4 rounded-t-[28px] bg-paper px-4 pt-5">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="font-sans text-[11.5px] font-bold tracking-[0.16em] text-ink-faint uppercase">
            Standings
          </p>
          <p className="font-sans text-[11.5px] font-semibold text-ink-faint">
            100 pts = your whole goal
          </p>
        </div>

        <div className="space-y-2.5">
          {players.map((p, i) => (
            <div
              key={p.name}
              className={`rounded-[22px] p-3.5 ${
                p.you ? 'bg-white ring-2 ring-streak' : 'bg-white'
              } shadow-[0_1px_0_0_var(--color-line)]`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 font-display text-[17px] text-ink-faint tnum">{i + 1}</span>
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-sans text-[13px] font-bold text-white"
                  style={{ background: p.tint }}
                >
                  {p.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[17px] leading-tight text-ink">
                    {p.name}
                    {p.you && <span className="ml-1.5 text-[12px] text-streak">you</span>}
                  </p>
                  <p className="font-sans text-[12px] text-ink-faint tnum">
                    goal {p.budget} XP/day
                    {p.perfectForm > 0 && ` · ${p.perfectForm}× perfect form`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[22px] leading-none text-ink tnum">{p.points}</p>
                  <p className="font-sans text-[11px] text-ink-faint">pts</p>
                </div>
              </div>

              <div className="mt-3 flex gap-1.5 pl-8">
                {p.days.map((d, n) => (
                  <div key={n} className="flex-1">
                    <div className="h-6 overflow-hidden rounded-md bg-line">
                      <div
                        className="h-full rounded-md"
                        style={{ width: `${d}%`, background: p.tint }}
                      />
                    </div>
                    <p className="mt-0.5 text-center font-sans text-[9.5px] text-ink-faint tnum">
                      {d}
                    </p>
                  </div>
                ))}
                {Array.from({ length: challenge.dayTotal - p.days.length }).map((_, n) => (
                  <div key={`e${n}`} className="h-6 flex-1 rounded-md border border-dashed border-line" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] bg-social-wash p-4">
          <p className="font-sans text-[13px] leading-snug text-ink-soft">
            <span className="font-bold text-ink">Sam leads on the smallest goal.</span> Points are a
            share of your own daily budget, so finishing 180 XP counts the same as finishing 620.
          </p>
        </div>
      </div>

      {/* Chat drawer */}
      <div className="fixed bottom-0 left-1/2 w-[390px] -translate-x-1/2 rounded-t-[26px] bg-ink px-5 pt-3.5 pb-5 shadow-[0_-10px_30px_-10px_rgba(12,51,46,0.5)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/25" />
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {players.slice(0, 3).map((p) => (
              <span
                key={p.name}
                className="grid h-7 w-7 place-items-center rounded-full border-2 border-ink font-sans text-[9.5px] font-bold text-white"
                style={{ background: p.tint }}
              >
                {p.initials}
              </span>
            ))}
          </div>
          <p className="flex-1 truncate font-sans text-[13.5px] text-white/80">
            <span className="font-bold text-white">Dev:</span> you all get 100 for finishing…
          </p>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-streak font-sans text-[11px] font-bold text-white">
            4
          </span>
        </div>
      </div>
    </div>
  )
}
ChallengeA.variantName = 'Standings first'

/* ========================================================================
   B — Chat first. The group thread is the room; standings are a pinned strip.
   ======================================================================== */

export function ChallengeB() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <StatusBar />

      <div className="border-b border-line px-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[19px] leading-tight text-ink">{challenge.name}</p>
            <p className="font-sans text-[12px] font-semibold text-ink-faint">
              5 people · 3 days left
            </p>
          </div>
          <button className="rounded-xl bg-paper px-3 py-2 font-sans text-[12px] font-bold text-ink-soft">
            Standings
          </button>
        </div>

        {/* Pinned compact standings */}
        <div className="no-bar mt-3 flex gap-2 overflow-x-auto pb-1">
          {players.map((p, i) => (
            <div
              key={p.name}
              className={`shrink-0 rounded-2xl px-3 py-2 ${
                p.you ? 'bg-streak-wash ring-1 ring-streak' : 'bg-paper'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-[12px] text-ink-faint tnum">{i + 1}</span>
                <span
                  className="grid h-7 w-7 place-items-center rounded-full font-sans text-[10px] font-bold text-white"
                  style={{ background: p.tint }}
                >
                  {p.initials}
                </span>
                <div>
                  <p className="font-display text-[14px] leading-none text-ink tnum">{p.points}</p>
                  <p className="font-sans text-[9.5px] text-ink-faint">of {maxSoFar}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3.5 bg-paper px-4 py-5">
        {chat.map((m, i) =>
          m.event ? (
            <div key={i} className="flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-full-wash px-3.5 py-2">
                <span className="text-[13px]">✦</span>
                <p className="font-sans text-[12.5px] font-bold text-full-deep">
                  {m.from} · {m.text}
                </p>
              </div>
            </div>
          ) : (
            <div key={i} className={`flex gap-2.5 ${m.you ? 'flex-row-reverse' : ''}`}>
              {!m.you && (
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center self-end rounded-full font-sans text-[10.5px] font-bold text-white"
                  style={{
                    background: players.find((p) => p.name === m.from)?.tint ?? '#8aa39c',
                  }}
                >
                  {m.initials}
                </span>
              )}
              <div className={`max-w-[74%] ${m.you ? 'items-end' : ''}`}>
                {!m.you && (
                  <p className="mb-1 font-sans text-[11px] font-bold text-ink-faint">{m.from}</p>
                )}
                <div
                  className={`rounded-[20px] px-3.5 py-2.5 font-sans text-[14.5px] leading-snug ${
                    m.you
                      ? 'rounded-br-md bg-gradient-to-br from-full to-full-deep text-white'
                      : 'rounded-bl-md bg-white text-ink shadow-[0_1px_0_0_var(--color-line)]'
                  }`}
                >
                  {m.text}
                </div>
                <p
                  className={`mt-1 font-sans text-[10.5px] text-ink-faint ${m.you ? 'text-right' : ''}`}
                >
                  {m.at}
                </p>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="border-t border-line bg-white px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-paper px-4 py-3">
          <input
            className="flex-1 bg-transparent font-sans text-[14.5px] text-ink outline-none placeholder:text-ink-faint"
            placeholder="Say something"
          />
          <button className="grid h-8 w-8 place-items-center rounded-full bg-full font-sans text-[15px] text-white">
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
ChallengeB.variantName = 'Chat first'

/* ========================================================================
   C — Race track. Standings and chat merged into one activity surface.
   ======================================================================== */

export function ChallengeC() {
  const feed = [
    { kind: 'msg' as const, m: chat[2] },
    { kind: 'event' as const, who: 'Sam', text: 'finished their goal — 4 days straight', tint: 'var(--color-full)' },
    { kind: 'msg' as const, m: chat[5] },
    { kind: 'event' as const, who: 'Marcus', text: 'came up 47 XP short', tint: 'var(--color-half)' },
    { kind: 'msg' as const, m: chat[6] },
  ]

  return (
    <div className="min-h-full bg-paper pb-10">
      <StatusBar />

      <div className="px-6 pt-3">
        <p className="font-display text-[23px] leading-tight text-ink">{challenge.name}</p>
        <p className="mt-0.5 font-sans text-[13px] font-semibold text-ink-faint">
          First to {challenge.target} · day {challenge.dayNow} of {challenge.dayTotal}
        </p>
      </div>

      {/* The track */}
      <div className="mt-5 px-5">
        <div className="relative rounded-[28px] bg-white p-5 shadow-[0_1px_0_0_var(--color-line)]">
          <div className="mb-4 flex justify-between font-sans text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">
            <span>start</span>
            <span>{challenge.target} pts</span>
          </div>

          <div className="space-y-4">
            {players.map((p) => {
              const pct = (p.points / challenge.target) * 100
              return (
                <div key={p.name} className="relative">
                  <div className="h-9 rounded-full bg-paper">
                    <div
                      className="relative h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 13)}%`,
                        background: `linear-gradient(90deg, ${p.tint}22, ${p.tint})`,
                      }}
                    >
                      <span
                        className="absolute top-1/2 right-0.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-[2.5px] border-white font-sans text-[10.5px] font-bold text-white shadow-sm"
                        style={{ background: p.tint }}
                      >
                        {p.initials}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-sans text-[12px] font-bold text-ink">
                      {p.name}
                      {p.you && <span className="ml-1 text-streak">you</span>}
                      <span className="ml-1.5 font-normal text-ink-faint tnum">
                        goal {p.budget}/day
                      </span>
                    </span>
                    <span className="font-display text-[14px] text-ink tnum">{p.points}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-full-wash px-4 py-3">
            <p className="font-sans text-[12.5px] leading-snug text-ink-soft">
              Everyone's lane is the same length. Filling your own daily goal moves you 100,
              <span className="font-bold text-ink"> whether that goal is 180 or 620.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Merged feed */}
      <div className="mt-5 px-5">
        <p className="mb-3 font-sans text-[11.5px] font-bold tracking-[0.16em] text-ink-faint uppercase">
          Today
        </p>
        <div className="space-y-2.5">
          {feed.map((f, i) =>
            f.kind === 'event' ? (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[20px] border-l-4 bg-white px-4 py-3 shadow-[0_1px_0_0_var(--color-line)]"
                style={{ borderColor: f.tint }}
              >
                <span className="font-sans text-[13.5px] text-ink-soft">
                  <span className="font-bold text-ink">{f.who}</span> {f.text}
                </span>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5 rounded-[20px] bg-white px-4 py-3 shadow-[0_1px_0_0_var(--color-line)]">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-sans text-[10.5px] font-bold text-white"
                  style={{ background: players.find((p) => p.name === f.m.from)?.tint ?? '#8aa39c' }}
                >
                  {f.m.initials}
                </span>
                <div>
                  <p className="font-sans text-[11.5px] font-bold text-ink-faint">
                    {f.m.from} · {f.m.at}
                  </p>
                  <p className="font-sans text-[14px] leading-snug text-ink">{f.m.text}</p>
                </div>
              </div>
            ),
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-[0_1px_0_0_var(--color-line)]">
          <input
            className="flex-1 bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-faint"
            placeholder="Say something to the group"
          />
          <button className="grid h-8 w-8 place-items-center rounded-full bg-social font-sans text-[15px] text-white">
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
ChallengeC.variantName = 'Race track'
