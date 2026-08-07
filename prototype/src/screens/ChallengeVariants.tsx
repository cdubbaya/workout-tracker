import { useState } from 'react'
import { StatusBar } from '../Frame'
import { challenge, players, chat } from '../data'

/**
 * Single surviving challenge design: standings are the screen, the group thread
 * is a drawer over them. Tap the drawer to open the full chat.
 */
export function ChallengeA() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="relative min-h-full bg-paper pb-28">
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
              className={`h-2 flex-1 rounded-full ${i < challenge.dayNow ? 'bg-white' : 'bg-white/30'}`}
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
              className={`rounded-[22px] bg-white p-3.5 shadow-[0_1px_0_0_var(--color-line)] ${
                p.you ? 'ring-2 ring-streak' : ''
              }`}
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
                  <div
                    key={`e${n}`}
                    className="h-6 flex-1 rounded-md border border-dashed border-line"
                  />
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

      {chatOpen && (
        <button
          aria-label="Close chat"
          onClick={() => setChatOpen(false)}
          className="absolute inset-0 z-20 bg-ink/35 backdrop-blur-[2px]"
        />
      )}

      {/* Group thread — collapsed preview, tap to open */}
      <div
        className={`absolute bottom-0 left-0 z-30 w-full rounded-t-[26px] bg-ink shadow-[0_-10px_30px_-10px_rgba(12,51,46,0.5)] transition-all duration-300 ${
          chatOpen ? 'h-[74%]' : 'h-auto'
        }`}
      >
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="w-full px-5 pt-3.5 pb-3 text-left"
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/25" />
          {chatOpen ? (
            <div className="flex items-center justify-between">
              <p className="font-display text-[18px] text-white">Group chat</p>
              <span className="font-sans text-[12.5px] font-bold text-white/50">Close</span>
            </div>
          ) : (
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
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-streak font-sans text-[11px] font-bold text-white">
                4
              </span>
            </div>
          )}
        </button>

        {chatOpen && (
          <>
            <div className="no-bar h-[calc(100%-124px)] space-y-3.5 overflow-y-auto px-4 py-3">
              {chat.map((m, i) =>
                m.event ? (
                  <div key={i} className="flex justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-full/25 px-3.5 py-2">
                      <span className="text-[13px]">✦</span>
                      <p className="font-sans text-[12.5px] font-bold text-white">
                        {m.from} · {m.text}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className={`flex gap-2.5 ${m.you ? 'flex-row-reverse' : ''}`}>
                    {!m.you && (
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center self-end rounded-full font-sans text-[10.5px] font-bold text-white"
                        style={{ background: players.find((p) => p.name === m.from)?.tint ?? '#8aa39c' }}
                      >
                        {m.initials}
                      </span>
                    )}
                    <div className="max-w-[74%]">
                      {!m.you && (
                        <p className="mb-1 font-sans text-[11px] font-bold text-white/45">{m.from}</p>
                      )}
                      <div
                        className={`rounded-[20px] px-3.5 py-2.5 font-sans text-[14.5px] leading-snug ${
                          m.you
                            ? 'rounded-br-md bg-gradient-to-br from-full to-full-deep text-white'
                            : 'rounded-bl-md bg-white/12 text-white'
                        }`}
                      >
                        {m.text}
                      </div>
                      <p
                        className={`mt-1 font-sans text-[10.5px] text-white/35 ${m.you ? 'text-right' : ''}`}
                      >
                        {m.at}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="absolute right-0 bottom-0 left-0 px-4 pb-5">
              <div className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-3">
                <input
                  className="flex-1 bg-transparent font-sans text-[14.5px] text-white outline-none placeholder:text-white/40"
                  placeholder="Say something"
                />
                <button className="grid h-8 w-8 place-items-center rounded-full bg-full font-sans text-[15px] text-white">
                  ↑
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
ChallengeA.variantName = 'Standings first'
