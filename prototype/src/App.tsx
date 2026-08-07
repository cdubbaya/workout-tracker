import { useCallback, useEffect, useState } from 'react'
import { Phone } from './Frame'
import { PrototypeSwitcher, type ScreenKey } from './PrototypeSwitcher'
import { HomeA } from './screens/HomeVariants'
import { SummaryA } from './screens/SummaryVariants'
import { ChallengeA } from './screens/ChallengeVariants'

type VariantComponent = (() => React.JSX.Element) & { variantName: string }

const SCREENS: Record<ScreenKey, { title: string; variants: Record<string, VariantComponent> }> = {
  home: {
    title: 'Home / pre-session',
    variants: { A: HomeA },
  },
  summary: {
    title: 'Post-set summary',
    variants: { A: SummaryA },
  },
  challenge: {
    title: 'Challenge + group chat',
    variants: { A: ChallengeA },
  },
}

const SCREEN_KEYS = Object.keys(SCREENS) as ScreenKey[]

function readParams() {
  const p = new URLSearchParams(window.location.search)
  const screen = (p.get('screen') ?? 'home') as ScreenKey
  return {
    screen: SCREEN_KEYS.includes(screen) ? screen : 'home',
    variant: (p.get('variant') ?? 'A').toUpperCase(),
  }
}

export default function App() {
  const [{ screen, variant }, setState] = useState(readParams)

  const push = useCallback((next: { screen: ScreenKey; variant: string }) => {
    const p = new URLSearchParams()
    p.set('screen', next.screen)
    p.set('variant', next.variant)
    window.history.replaceState(null, '', `?${p.toString()}`)
    setState(next)
  }, [])

  useEffect(() => {
    push({ screen, variant })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const config = SCREENS[screen]
  const keys = Object.keys(config.variants)
  const active = keys.includes(variant) ? variant : keys[0]
  const Variant = config.variants[active]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 py-12">
      <div className="text-center">
        <p className="font-display text-[19px] text-ink">{config.title}</p>
        <p className="font-sans text-[12px] font-semibold text-ink-faint">
          PROTOTYPE — throwaway. ← → variants · ↑ ↓ screens
        </p>
      </div>

      <Phone label={`${screen} · variant ${active} — ${Variant.variantName}`}>
        <Variant key={`${screen}-${active}`} />
      </Phone>

      <PrototypeSwitcher
        screens={SCREEN_KEYS}
        screen={screen}
        onScreen={(s) => push({ screen: s, variant: 'A' })}
        variants={keys}
        variant={active}
        onVariant={(v) => push({ screen, variant: v })}
        variantName={Variant.variantName}
      />
    </div>
  )
}
