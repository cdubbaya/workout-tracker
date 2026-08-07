import { useState } from 'react'
import { RepBlocks } from '../Frame'
import { live, liveTotal, liveRemaining } from '../data'

type Phase = 'framing' | 'counting' | 'resting'

/* Prototype-only chrome so the whole flow is walkable. Not part of the design. */
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

/** Stand-in for the camera feed: a head-on pose read with the Hand Plane drawn. */
function PoseFigure({ tint = '#7fdcbb', dim = false }: { tint?: string; dim?: boolean }) {
  return (
    <svg viewBox="0 0 240 200" className="w-full" style={{ opacity: dim ? 0.55 : 1 }}>
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

function Framing() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-ink to-[#123f39]">
      <div className="px-7 pt-16 text-center">
        <p className="font-display text-[30px] leading-tight text-white">You're in frame</p>
        <p className="mt-2 font-sans text-[15px] font-medium text-white/60">
          Stand the phone upright in front of you, at floor level, three or four feet away.
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
          A ding means it counted. Rest whenever you like — just sit up.
        </p>
      </div>
    </div>
  )
}

/** Between sets. Reached by leaving the push-up position; left by getting back into it. */
function Resting() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-white to-full-wash">
      <div className="px-7 pt-14 text-center">
        <p className="font-sans text-[12px] font-bold tracking-[0.18em] text-ink-faint uppercase">
          Set {live.setNumber} · resting
        </p>
        <p className="a-pop mt-3 font-display text-[76px] leading-none text-ink tnum">
          {live.repsThisSet}
        </p>
        <p className="font-display text-[20px] text-ink-faint">reps that set</p>
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

      {/* Resuming needs no input, so the screen instructs rather than offers a button. */}
      <div className="mx-7 mt-4 flex items-center gap-3.5 rounded-[26px] bg-full-wash p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-full text-[19px] text-white">
          ↺
        </span>
        <p className="font-sans text-[14px] leading-snug font-semibold text-ink-soft">
          Get back into position when you're ready. Counting picks up on your first rep — nothing to
          press.
        </p>
      </div>

      <div className="mt-auto px-7 pb-24">
        <button className="w-full rounded-[26px] border-2 border-line bg-white py-4.5 font-display text-[19px] text-ink-soft">
          End session
        </button>
        <p className="mt-2.5 text-center font-sans text-[12.5px] font-medium text-ink-faint">
          Ends on its own if you don't come back
        </p>
      </div>
    </div>
  )
}

/**
 * Single surviving in-session design: a mirror.
 *
 * The camera stands in front of the user, so watching it is looking forward
 * rather than the cervical rotation the vision doc objected to (ADR-0013). Sets
 * and rest are driven entirely by pose (ADR-0014) — the only button that
 * matters is End session, and reaching it means walking over.
 */
export function SessionA() {
  const [phase, setPhase] = useState<Phase>('counting')

  return (
    <div className="relative h-full">
      {phase === 'framing' && <Framing />}
      {phase === 'resting' && <Resting />}
      {phase === 'counting' && (
        <div className="relative h-full overflow-hidden bg-gradient-to-b from-[#0e3c36] to-ink">
          <div className="absolute inset-0 grid place-items-center px-6">
            <PoseFigure dim />
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
            <p className="a-pop font-display text-[128px] leading-[0.82] text-white tnum">
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
SessionA.variantName = 'Mirror'
