// PROTOTYPE mock data. In-memory only, no persistence, no API.
// Numbers are chosen to make the design decisions legible, not to be balanced.

export type RepKind = 'standard-full' | 'standard-half' | 'knee-full' | 'knee-half' | 'uncounted'

export const REP_VALUE: Record<RepKind, number> = {
  'standard-full': 10,
  'standard-half': 5,
  'knee-full': 5,
  'knee-half': 3,
  uncounted: 0,
}

export const REP_LABEL: Record<RepKind, string> = {
  'standard-full': 'Standard, full',
  'standard-half': 'Standard, half',
  'knee-full': 'Knee, full',
  'knee-half': 'Knee, half',
  uncounted: "Didn't count",
}

// ---------------------------------------------------------------------------
// Home / pre-session. The user did a short free-form set this morning, so part
// of today's budget is already spent — the ADR-0011 case the UI has to surface
// BEFORE they start, not after.
// ---------------------------------------------------------------------------

export const home = {
  name: 'Cory',
  sessionGoal: 450,
  spentToday: 130,
  spentSource: 'Free-form set, 8:12am',
  streakDays: 23,
  freezes: 2,
  level: 7,
  levelXp: 2340,
  levelTarget: 3000,
  lastSessionXp: 450,
  perfectFormStreak: 0,
  nextMilestone: 30,
  challenge: {
    name: 'Office Push-Up War',
    daysLeft: 3,
    yourRank: 3,
    of: 5,
    unread: 4,
  },
}

export const budgetRemaining = home.sessionGoal - home.spentToday

// ---------------------------------------------------------------------------
// Post-set summary. A different day: goal met exactly, Perfect Form missed
// because ten reps went shallow, and the user dropped to knees at rep 45.
// ---------------------------------------------------------------------------

function buildSet(): RepKind[] {
  const reps: RepKind[] = []
  for (let i = 0; i < 34; i++) reps.push('standard-full')
  for (let i = 0; i < 10; i++) reps.push('standard-half')
  for (let i = 0; i < 12; i++) reps.push('knee-full')
  // Three rejected reps, scattered where a tiring user shifts their weight.
  reps.splice(37, 0, 'uncounted')
  reps.splice(45, 0, 'uncounted')
  reps.splice(52, 0, 'uncounted')
  return reps
}

export const sessionReps = buildSet()

export const summary = {
  goal: 450,
  earned: sessionReps.reduce((sum, r) => sum + REP_VALUE[r], 0),
  durationSec: 6 * 60 + 41,
  counted: sessionReps.filter((r) => r !== 'uncounted').length,
  full: sessionReps.filter((r) => r.endsWith('-full')).length,
  half: sessionReps.filter((r) => r.endsWith('-half')).length,
  uncounted: sessionReps.filter((r) => r === 'uncounted').length,
  // Index of the first Half Rep — the Fatigue Point (ADR-0008).
  fatiguePointIndex: sessionReps.findIndex((r) => r === 'standard-half'),
  variantSwitchIndex: sessionReps.findIndex((r) => r === 'knee-full'),
  perfectForm: false,
  streakDays: 24,
  thermalFlag: false,
}

export const uncountedReasons = [
  { reason: 'Faster than 0.6s', count: 2, hint: 'Slow the turnaround at the bottom.' },
  { reason: 'Cycle never finished', count: 1, hint: 'Looked like a weight shift, not a rep.' },
]

// ---------------------------------------------------------------------------
// Challenge. Everyone has a different Daily Budget, and Challenge Points are a
// share of your own — so Sam, the smallest budget on the board, is winning.
// That is ADR-0012 working, and the leaderboard has to make it obvious.
// ---------------------------------------------------------------------------

export type Player = {
  name: string
  initials: string
  budget: number
  points: number
  days: number[] // percent of own budget earned, per day
  perfectForm: number
  you?: boolean
  tint: string
}

export const challenge = {
  name: 'Office Push-Up War',
  format: '7-day challenge',
  dayNow: 4,
  dayTotal: 7,
  target: 700,
}

export const players: Player[] = [
  {
    name: 'Sam',
    initials: 'SR',
    budget: 180,
    points: 400,
    days: [100, 100, 100, 100],
    perfectForm: 3,
    tint: 'var(--color-full)',
  },
  {
    name: 'Priya',
    initials: 'PN',
    budget: 300,
    points: 384,
    days: [100, 92, 100, 92],
    perfectForm: 2,
    tint: 'var(--color-social)',
  },
  {
    name: 'Cory',
    initials: 'CW',
    budget: 450,
    points: 368,
    days: [100, 84, 100, 84],
    perfectForm: 1,
    you: true,
    tint: 'var(--color-streak)',
  },
  {
    name: 'Dev',
    initials: 'DA',
    budget: 620,
    points: 352,
    days: [88, 96, 80, 88],
    perfectForm: 0,
    tint: 'var(--color-half)',
  },
  {
    name: 'Marcus',
    initials: 'MK',
    budget: 540,
    points: 284,
    days: [100, 71, 60, 53],
    perfectForm: 0,
    tint: '#8aa39c',
  },
]

export type ChatMessage = {
  from: string
  initials: string
  text: string
  at: string
  you?: boolean
  event?: 'perfect' | 'milestone' | 'joined'
}

export const chat: ChatMessage[] = [
  { from: 'Marcus', initials: 'MK', text: 'who set the target this high', at: '9:02am' },
  { from: 'Sam', initials: 'SR', text: 'you did', at: '9:03am' },
  { from: 'Priya', initials: 'PN', text: 'Sam is on knees and still beating all of us 😭', at: '11:40am' },
  {
    from: 'Sam',
    initials: 'SR',
    text: 'Perfect Form — 4 days running',
    at: '12:15pm',
    event: 'perfect',
  },
  { from: 'Cory', initials: 'CW', text: 'ok explain the scoring to me again', at: '1:20pm', you: true },
  {
    from: 'Dev',
    initials: 'DA',
    text: 'you all get 100 for finishing your own goal. mine is 620, Sam’s is 180. same 100.',
    at: '1:22pm',
  },
  { from: 'Cory', initials: 'CW', text: 'that is deeply annoying and also fair', at: '1:23pm', you: true },
]
