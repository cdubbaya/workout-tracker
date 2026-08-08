/**
 * The single source of colour, spacing and type tokens.
 *
 * Every screen consumes these rather than hard-coding values. Ported from the
 * prototype's `index.css` @theme block, which is where the visual direction was
 * settled: light, gradient-forward, rounded, game-register. The palette holds to
 * white, grey, green, blue, yellow and orange — no purple.
 *
 * Colours are named for what they mean in the domain, not for the hue they are.
 * `full` is the Full Rep green because Full Reps are what the ding rewards; a
 * later screen wanting "the green one" should be asking for `full`.
 */

export const colors = {
  /** Ink is deep pine rather than black — keeps the neutrals out of grey-blue. */
  ink: '#0c332e',
  inkSoft: '#4a6b64',
  inkFaint: '#93aaa4',
  paper: '#f6faf8',
  line: '#e2ece8',
  white: '#ffffff',

  /** Full Rep. The ding. */
  full: '#16c088',
  fullDeep: '#0a8f65',
  fullWash: '#dcf7ec',

  /** Half Rep. Scores, but less (ADR-0003). */
  half: '#ffc145',
  halfWash: '#fff3d6',

  /** Challenges and the friend graph. */
  social: '#3aa3e3',
  socialWash: '#ddeffb',

  /** Streak, Week and Milestones. */
  streak: '#ff7a45',
  streakWash: '#ffe6db',
} as const;

/**
 * The page gradient. Two soft washes over a neutral base, matching the
 * prototype's radial-gradient body treatment as closely as a linear gradient
 * can — React Native has no radial gradient without a native dependency, and
 * the walking skeleton does not justify one.
 */
export const pageGradient = [colors.fullWash, colors.paper, colors.socialWash] as const;

/** A 4pt rhythm. Screens compose these rather than inventing one-off numbers. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Corner radii. Generous, because the direction is rounded and game-register. */
export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 30,
  pill: 999,
} as const;

/**
 * Type scale.
 *
 * `display` is Baloo 2 and carries display type and numerals — the streak count,
 * the XP figures, the headings. `sans` is Figtree and carries UI text. The split
 * is the one the issue names, and `fontFamily` values match the keys the font
 * loader registers in `fonts.ts`.
 */
export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayMedium: 'Baloo2_600SemiBold',
  sans: 'Figtree_600SemiBold',
  sansBold: 'Figtree_700Bold',
} as const;

export const type = {
  /** Large numerals — a streak count, an XP total. */
  hero: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56 },
  /** Card headline numerals. */
  numeral: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42 },
  /** Screen and card titles. */
  title: { fontFamily: fonts.display, fontSize: 27, lineHeight: 32 },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  /** UI body text. */
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18 },
  /** The uppercase label above a card's figure. */
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
} as const;

/**
 * Shadows read differently across platforms, so they are expressed once here
 * rather than per-card. iOS takes the shadow* family; Android takes elevation.
 * Both are set, and React Native ignores the irrelevant one per platform — no
 * Platform.select needed, which keeps this file free of platform branching.
 */
export const shadow = {
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
} as const;
