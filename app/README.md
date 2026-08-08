# Push-up Counter — app

The React Native client. Expo, TypeScript, iOS-first.

## Why a development build rather than Expo Go

The rep detector runs Google ML Kit pose estimation through
`react-native-vision-camera` frame processors, which need native code Expo Go does not
ship. The detector arrives in spec #2; the development build is stood up here so that
work does not begin with a platform migration.

Practically: **Expo Go will not work for this project.** Use the steps below.

## Prerequisites

- Node 20 or newer (developed against 24)
- Xcode with the iOS platform installed, and its command line tools
- CocoaPods (`brew install cocoapods`)
- For a device build only: an Apple Developer account and a provisioned iPhone

## Running from a clean checkout

```bash
cd app
npm install
npx expo run:ios          # builds the native project and opens the simulator
```

The first run generates the native `ios/` directory, installs pods and compiles — several
minutes. Later runs reuse it. `ios/` is generated and gitignored: it is rebuilt from
`app.json` rather than edited by hand, so `npx expo prebuild --clean` is the way to reset
it after changing native configuration.

To pick a specific simulator:

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

## Running on a physical iPhone

```bash
npx expo run:ios --device
```

Choose your connected iPhone when prompted. The first build needs a signing team — open
`ios/Pushups.xcworkspace` in Xcode, select the target, and set **Signing & Capabilities
→ Team**. A free Apple ID works, with the caveat that the provisioning profile expires after
seven days.

## Tests

```bash
npm test          # jest, via the jest-expo preset
npm run typecheck # tsc --noEmit
```

Note that `render` from `@testing-library/react-native` v14 is **async** — await it, or the
queries come back on an unresolved Promise.

## Layout

```
src/
├── theme/
│   ├── tokens.ts   colour, spacing, radius and type — the single source
│   └── fonts.ts    the Baloo 2 and Figtree faces loaded at startup
└── screens/
    └── HomeScreen.tsx
```

`HOME_SLOTS` in `HomeScreen.tsx` declares the cards Home is laid out to hold, each naming
the spec that fills it. A ticket adding its card fills a slot rather than redesigning the
screen.

## Conventions

Screens consume `tokens.ts` rather than hard-coding colours or spacing. Colours are named
for their domain meaning — `full` is the Full Rep green, `half` the Half Rep amber — so a
screen asks for what it means rather than for a hue.

The app avoids `Platform.OS` and `Platform.select` outside modules whose job is the
platform difference; `src/__tests__/platform-neutrality.test.ts` enforces this and holds
the allowlist.
