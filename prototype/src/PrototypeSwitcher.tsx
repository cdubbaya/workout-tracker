import { useEffect } from 'react'

export type ScreenKey = 'home' | 'session' | 'summary' | 'challenge'

const SCREEN_LABEL: Record<ScreenKey, string> = {
  home: 'Home',
  session: 'Session',
  summary: 'Summary',
  challenge: 'Challenge',
}

export function PrototypeSwitcher({
  screens,
  screen,
  onScreen,
  variants,
  variant,
  onVariant,
  variantName,
}: {
  screens: ScreenKey[]
  screen: ScreenKey
  onScreen: (s: ScreenKey) => void
  variants: string[]
  variant: string
  onVariant: (v: string) => void
  variantName: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      )
        return

      const vi = variants.indexOf(variant)
      const si = screens.indexOf(screen)
      if (e.key === 'ArrowRight') onVariant(variants[(vi + 1) % variants.length])
      if (e.key === 'ArrowLeft') onVariant(variants[(vi - 1 + variants.length) % variants.length])
      if (e.key === 'ArrowDown') onScreen(screens[(si + 1) % screens.length])
      if (e.key === 'ArrowUp') onScreen(screens[(si - 1 + screens.length) % screens.length])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screens, screen, onScreen, variants, variant, onVariant])

  if (import.meta.env.PROD) return null

  const vi = variants.indexOf(variant)
  const cycle = (d: number) => onVariant(variants[(vi + d + variants.length) % variants.length])

  return (
    <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-stretch gap-1 rounded-2xl bg-ink p-1.5 font-sans shadow-[0_16px_40px_-8px_rgba(12,51,46,0.6)]">
      <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
        {screens.map((s) => (
          <button
            key={s}
            onClick={() => onScreen(s)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition ${
              s === screen ? 'bg-white text-ink' : 'text-white/60 hover:text-white'
            }`}
          >
            {SCREEN_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mx-0.5 w-px bg-white/15" />

      <button
        onClick={() => cycle(-1)}
        aria-label="Previous variant"
        className="grid w-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        ←
      </button>
      <div className="grid min-w-[190px] place-items-center px-2 text-white">
        <span className="text-[13px] font-bold">
          {variant} — {variantName}
        </span>
      </div>
      <button
        onClick={() => cycle(1)}
        aria-label="Next variant"
        className="grid w-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        →
      </button>
    </div>
  )
}
