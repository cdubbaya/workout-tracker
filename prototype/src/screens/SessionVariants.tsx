import { useState, type ReactNode } from 'react'
import { RepBlocks } from '../Frame'
import { live, liveTotal, liveRemaining } from '../data'

type Phase = 'framing' | 'counting' | 'resting'

/* Prototype-only chrome so the whole flow is walkable. Not part of any design. */
function PhaseBar({ phase, set }: { phase: Phase; set: (p: Phase) => void }) {
  return (
    <div className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-black/55 p-1 backdrop-blur-md">
      {(['framing', 'counting', 'resting'] as Phase[]).map((p) => (
        <button
          key={p}
          onClick={() => set(p)}
          className={`rounded-full px-3 py-1.5 font-sans text-[11px] font-bold capitalize transition ${
            p === phase ? 'bg-white text-ink' : 'text-white/60'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

/* A stylised head-on pose read, used wherever the camera is shown. */
function PoseFigure({ tint = '#ffffff', dim = false }: { tint?: string; dim?: boolean }) {
  return (
    <svg viewBox="0 0 240 200" className="w-full" style={{ opacity: dim ? 0.5 : 1 }}>
      <g stroke={tint} strokeWidth="3.5" strokeLinecap="round" fill="none">
        <line x1="60" y1="150" x2="70" y2="96" />
        <line x1="180" y1="150" x2="170" y2="96" />
        <line x1="70" y1="96" x2="98" y2="74" />
        <line x1="170" y1="96" x2="142" y2="74" />
        <line x1="98" y1="74" x2="142" y2="74" />
        <line x1="120" y1="74" x2="120" y2="92" />
        <line x1="98" y1="74" x2="112" y2="128" strokeOpacity="0.35" />
        <line x1="142" y1="74" x2="128" y2="128" strokeOpacity="0.35" />
      </g>
      <circle cx="120" cy="60" r="15" fill={tint} />
      {[
        [60, 150],
        [180, 150],
        [70, 96],
        [170, 96],
        [98, 74],
        [142, 74],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.5" fill={tint} />
      ))}
      {/* Hand Plane — the datum every depth measurement is taken against */}
      <line
        x1="34"
        y1="150"
        x2="206"
        y2="150"
        stroke={tint}
        strokeWidth="2"
        strokeDasharray="5 6"
        strokeOpacity="0.55"
      />
    </svg>
  )
}

function Framing({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <div
      className={`flex h-full flex-col ${
        tone === 'dark' ? 'bg-ink' : 'bg-gradient-to-b from-ink to-[#123f39]'
      }`}
    >
      <div className="px-7 pt-16 text-center">
        <p className="font-display text-[30px] leading-tight text-white">You're in frame</p>
        <p className="mt-2 font-sans text-[15px] font-medium text-white/60">
          Stand the phone against a wall at floor level, then get into position.
        </p>
      </div>

      <div className="relative mx-7 mt-8 flex-1 rounded-[28px] border-[3px] border-dashed border-full/60 bg-white/5">
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
          <PoseFigure tint="#16c088" />
        </div>
        <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-full px-3 py-1.5 font-sans text-[11.5px] font-bold text-white">
          Shoulders and wrists visible
        </span>
      </div>

      <div className="px-7 pt-6 pb-24">
        <button className="w-full rounded-[26px] bg-gradient-to-b from-full to-full-deep py-5 font-display text-[22px] text-white shadow-[0_7px_0_0_#07704f]">
          Start counting
        </button>
        <p className="mt-3 text-center font-sans text-[13px] font-medium text-white/45">
          Listen for the ding — you don't need to watch the screen
        </p>
      </div>
    </div>
  )
}

function Resting({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-white to-full-wash">
      <div className="px-7 pt-14 text-center">
        <p className="font-sans text-[12px] font-bold tracking-[0.18em] text-ink-faint uppercase">
          Set {live.setNumber} done · resting
        </p>
        <p className="mt-3 font-display text-[76px] leading-none text-ink tnum">
          {live.repsThisSet}
        </p>
        <p className="font-display text-[20px] text-ink-faint">reps this set</p>
      </div>

      <div className="mx-7 mt-7 rounded-[26px] bg-white p-5 shadow-[0_10px_28px_-16px_rgba(12,51,46,0.45)]">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[13px] font-bold text-ink-soft">Today's budget</span>
          <span className="font-display text-[19px] text-ink tnum">
            {liveTotal} / {live.dailyBudget}
          </span>
        </div>
        <div className="mt-3">
          <RepBlocks full={26} half={2} remainingSlots={17} height={38} width={5.5} gap={2.5} />
        </div>
        <p className="mt-2.5 font-sans text-[12.5px] text-ink-soft">
          {liveRemaining} XP left — about {Math.round(liveRemaining / 10)} more standard reps
        </p>
      </div>

      {children}

      <div className="mt-auto px-7 pb-24">
        <button className="w-full rounded-[26px] bg-gradient-to-b from-full to-full-deep py-5 font-display text-[22px] text-white shadow-[0_7px_0_0_#07704f]">
          Next set
        </button>
        <button className="mt-2.5 w-full py-2.5 font-sans text-[15px] font-bold text-ink-faint">
          End session
        </button>
      </div>
    </div>
  )
}

/* ========================================================================
   A — Peripheral. One enormous numeral on a field that floods with colour as
   the budget fills. No text, nothing to read, legible from four feet in the
   corner of your eye.
   ======================================================================== */

export function SessionA() {
  const [phase, setPhase] = useState<Phase>('counting')
  const fill = (liveTotal / live.dailyBudget) * 100

  return (
    <div className="relative h-full">
      {phase === 'framing' && <Framing />}
      {phase === 'resting' && <Resting />}
      {phase === 'counting' && (
        <div className="relative h-full overflow-hidden bg-ink">
          {/* Budget floods upward */}
          <div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-full-deep to-full transition-all duration-700"
            style={{ height: `${fill}%` }}
          />
          <div className="relative flex h-full flex-col items-center justify-center">
            <p
              key={live.repsThisSet}
              className="a-pop font-display text-[210px] leading-[0.8] text-white tnum"
            >
              {live.repsThisSet}
            </p>
            <div className="mt-6 flex gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5 rounded-full"
                  style={{
                    background: i === 4 ? 'var(--color-half)' : '#ffffff',
                    opacity: i === 4 ? 1 : 0.9,
                  }}
                />
              ))}
            </div>
          </div>
          <PhaseBar phase={phase} set={setPhase} />
        </div>
      )}
      {phase !== 'counting' && <PhaseBar phase={phase} set={setPhase} />}
    </div>
  )
}
SessionA.variantName = 'Peripheral'

/* ========================================================================
   B — Live meter. The rep-block signature at full size: each rep lands as a
   block, so the texture of the set builds in front of you.
   ======================================================================== */

export function SessionB() {
  const [phase, setPhase] = useState<Phase>('counting')

  return (
    <div className="relative h-full">
      {phase === 'framing' && <Framing />}
      {phase === 'resting' && <Resting />}
      {phase === 'counting' && (
        <div className="flex h-full flex-col bg-ink px-6 pt-16 pb-24">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[96px] leading-none text-white tnum">
              {live.repsThisSet}
            </p>
            <p className="font-display text-[30px] text-white/40 tnum">
              {liveTotal}
              <span className="text-[17px]">/{live.dailyBudget}</span>
            </p>
          </div>

          {/* Blocks accumulate left to right, newest at the leading edge */}
          <div className="mt-8 flex-1">
            <div className="flex h-full items-end gap-[3px]">
              {Array.from({ length: 45 }).map((_, i) => {
                const landed = i < live.repsThisSet
                const isHalf = i === 12
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-[3px] ${landed ? 'a-block' : ''}`}
                    style={{
                      height: !landed ? '14%' : isHalf ? '50%' : '100%',
                      background: !landed
                        ? 'rgba(255,255,255,0.09)'
                        : isHalf
                          ? 'var(--color-half)'
                          : 'linear-gradient(180deg,#ffffff,#9df0d0)',
                      animationDelay: `${Math.min(i * 25, 500)}ms`,
                    }}
                  />
                )
              })}
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <span className="rounded-full bg-white/10 px-3.5 py-2 font-sans text-[12.5px] font-bold text-white/70">
              {live.currentVariant}
            </span>
            <span className="font-sans text-[12.5px] font-bold text-white/40 tnum">
              {live.elapsed}
            </span>
          </div>
          <PhaseBar phase={phase} set={setPhase} />
        </div>
      )}
      {phase !== 'counting' && <PhaseBar phase={phase} set={setPhase} />}
    </div>
  )
}
SessionB.variantName = 'Live meter'

/* ========================================================================
   C — Mirror. Shows the camera and the pose read. The most reassuring and the
   most dangerous: §4 argues an app that rewards screen-watching corrupts what
   it measures, and this is the variant that rewards it.
   ======================================================================== */

export function SessionC() {
  const [phase, setPhase] = useState<Phase>('counting')

  return (
    <div className="relative h-full">
      {phase === 'framing' && <Framing tone="light" />}
      {phase === 'resting' && <Resting />}
      {phase === 'counting' && (
        <div className="relative h-full overflow-hidden bg-gradient-to-b from-[#0e3c36] to-ink">
          {/* Stand-in for the camera feed */}
          <div className="absolute inset-0 grid place-items-center px-6">
            <PoseFigure tint="#7fdcbb" dim />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/85 to-transparent" />

          <div className="absolute top-14 right-6 left-6 flex items-start justify-between">
            <span className="rounded-full bg-full/25 px-3.5 py-2 font-sans text-[12px] font-bold text-full backdrop-blur-sm">
              ● Counting
            </span>
            <span className="rounded-full bg-white/10 px-3.5 py-2 font-sans text-[12px] font-bold text-white/70 backdrop-blur-sm">
              {live.currentVariant}
            </span>
          </div>

          <div className="absolute right-6 bottom-28 left-6">
            <p className="font-display text-[128px] leading-[0.82] text-white tnum">
              {live.repsThisSet}
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-full to-[#9df0d0]"
                style={{ width: `${(liveTotal / live.dailyBudget) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-sans text-[12.5px] font-bold text-white/50 tnum">
              <span>{liveTotal} XP today</span>
              <span>{liveRemaining} left</span>
            </div>
          </div>
          <PhaseBar phase={phase} set={setPhase} />
        </div>
      )}
      {phase !== 'counting' && <PhaseBar phase={phase} set={setPhase} />}
    </div>
  )
}
SessionC.variantName = 'Mirror'
