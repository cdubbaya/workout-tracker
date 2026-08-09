/**
 * Events are the only way into the core.
 *
 * Every event carries its own `at` timestamp. The core never reads a clock —
 * that rule is what lets a test advance 200 days in milliseconds, gives the
 * Daily Budget's day-keying one unambiguous definition (ADR-0011), and confines
 * the trusted-client-clock exposure ADR-0010 accepts to a single driver.
 *
 * Later specs extend this union rather than replacing it. Adding an event must
 * not require touching an existing reducer branch.
 */

/** Milliseconds since the Unix epoch, supplied by a driver. */
export type Timestamp = number;

/** A local calendar day, `YYYY-MM-DD`. Local, not UTC: the Daily Budget is a
 * claim about the user's day, not Greenwich's. */
export type LocalDate = string;

/** Supabase's user id. Opaque to the core — it never parses or generates one. */
export type UserId = string;

export type Identity = {
  userId: UserId;
  email: string;
};

export type SignedIn = {
  type: 'SignedIn';
  at: Timestamp;
  identity: Identity;
  /** The day the sign-in happened, per the client's clock. */
  today: LocalDate;
};

export type SignedOut = {
  type: 'SignedOut';
  at: Timestamp;
};

/**
 * A day boundary crossed. Raised by the clock driver rather than derived from a
 * timestamp inside the core, so that "what day is it" has exactly one answer
 * and one place it can be wrong.
 *
 * Its first real consumer is the Daily Budget in spec #3; it ships here because
 * the rule it encodes is established here.
 */
export type DayRolled = {
  type: 'DayRolled';
  at: Timestamp;
  today: LocalDate;
};

/**
 * The user acknowledged the medical disclaimer.
 *
 * The disclaimer is load-bearing rather than ceremonial (ADR-0007): the program
 * schedules no rest, so this is where the user is told the recovery decision is
 * theirs. `at` is the acknowledgement's audit trail, which is why the event
 * carries a timestamp and not merely a flag.
 */
export type OnboardingAcknowledged = {
  type: 'OnboardingAcknowledged';
  at: Timestamp;
};

/**
 * What the profile says about onboarding, reported on cold start.
 *
 * Raised by the profile driver rather than inferred from the session, because
 * "has this user acknowledged" is a fact the server holds and the client cannot
 * derive. `acknowledgedAt` is `null` for a user who genuinely has not.
 */
export type OnboardingLoaded = {
  type: 'OnboardingLoaded';
  at: Timestamp;
  acknowledgedAt: Timestamp | null;
};

export type CoreEvent =
  | SignedIn
  | SignedOut
  | DayRolled
  | OnboardingAcknowledged
  | OnboardingLoaded;
