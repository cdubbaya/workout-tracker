# Push-Up Counter

A single-exercise app. The phone's front camera watches a user do push-ups, scores the reps it can verify, and gives nothing for the ones it can't. This glossary is the project's shared vocabulary.

## Movement

**Rep**:
One complete cycle of the shoulders descending toward the Hand Plane and returning to Top. A Rep exists whether or not it scores.
_Avoid_: repetition, push-up (as a countable noun)

**Full Rep**:
A Rep that reached the depth threshold.
_Avoid_: valid rep, good rep, clean rep, deep rep

**Half Rep**:
A Rep that completed the cycle but stopped short of the depth threshold. Scores, at a discount. See ADR-0003.
_Avoid_: partial, failed rep, bad rep, no-rep

**Counted Rep**:
Any Rep that scored — Full or Half. The user hears a ding.
_Avoid_: successful rep

**Uncounted Rep**:
Motion the detector rejected outright: a cycle faster than the tempo floor, or an incomplete one. Silent, and worth nothing.
_Avoid_: invalid rep, rejected rep

**Hand Plane**:
The horizontal line through the user's wrists. Every depth measurement is taken against it, which is what makes the signal self-calibrating across body sizes and across incline heights.
_Avoid_: floor, ground, floor plane, baseline

**Top**:
The highest shoulder position in a Rep, with the elbows near full extension but deliberately short of it. Resting on locked elbows removes tension from the muscle and loads the joint, so the app does not ask for it and does not reward it.
_Avoid_: lockout, full extension, straight arms

**Depth**:
How far the shoulders descend toward the Hand Plane in a Rep. Measured against the user's own shoulder width, which is invariant to fatigue — a rolling measurement against the previous Top would let the threshold sink as the user tires.
_Avoid_: range of motion, ROM, dip

**Tempo**:
The elapsed time of a complete Rep cycle. A floor exists so that pulsing at the bottom cannot manufacture Counted Reps.
_Avoid_: speed, cadence, pace

**Rep Log**:
The small derived record kept for each Rep — depth ratio, tempo, Variant, Full or Half, detector confidence. It is what persists after a session; the landmarks themselves never do.
_Avoid_: pose data, landmark stream, session recording

**Miscount Flag**:
A user's assertion that the app's count was wrong. It changes nothing — not the count, not XP, not a challenge standing — and exists solely to feed the detector agreement rate, which is the product's health metric.
_Avoid_: correction, override, dispute

**Set**:
An unbroken run of Reps. It begins when the user gets into the push-up position and ends when they leave it — a boundary the detector reads from pose rather than one the user declares, because the phone is out of reach.
_Avoid_: round, block, bout

**Session**:
Everything between starting the camera and ending it, however many Sets that contains. The unit that Attendance, the Streak, and the summary attach to.
_Avoid_: workout, training

**Variant**:
Which form a Rep was performed in — incline, knee, or standard. A property of each individual Rep, not of the session or the user, because a user is expected to change Variant mid-set as they fatigue. Variant sets a Rep's value and nothing else; it is not a progression the user climbs.
_Avoid_: exercise, movement type, mode, level, ladder

## Scoring

**XP**:
The single currency. Earned per Counted Rep, spent on nothing — it feeds the Level track, the weekly streak, and friend challenges.
_Avoid_: points, score, credits

**Rep Value**:
What one Counted Rep is worth, determined by its Variant and whether it was Full or Half.
_Avoid_: weight, multiplier

**Max Test**:
The onboarding capability test that calibrates a user's Session Goal. Variant-agnostic, and measured at the Fatigue Point rather than at failure.
_Avoid_: benchmark, assessment, fitness test

**Fatigue Point**:
The moment in a set where a user's Full Reps begin turning into Half Reps. Depth degrades before motion stops, so this is visible several reps before failure — which is what lets the Max Test find a working number without anyone grinding to exhaustion.
_Avoid_: failure, burnout, exhaustion

**Session Goal**:
The XP target for one session, derived from the user's own Max Test and escalating as they build endurance. Because it is calibrated per person, hitting it means the same thing for a beginner doing knee reps as for an athlete doing standard ones.
_Avoid_: target, quota, daily goal

**Daily Budget**:
The rep XP a user can earn in a day, equal to their Session Goal and shared across every session — prescribed or Free-form. Spending it all means further reps pay nothing, which is what keeps volume from paying and what makes mixed-ability challenges fair.
_Avoid_: session cap, limit, max

**Free-form Session**:
A session the user starts outside the program's prescription. Scores from the same Daily Budget as a prescribed one, counts in history, and holds the Streak.
_Avoid_: freestyle, ad-hoc, unstructured

**Level**:
The escalating XP threshold track a user advances along. Thresholds get progressively harder to clear; a seasoned athlete may clear several early.
_Avoid_: ladder, tier, rank, rung

## Social

**Challenge**:
A time-boxed contest among friends. Never global — the whole trust model rests on the participants knowing each other.
_Avoid_: competition, contest, league

**Challenge Point**:
The unit challenges are scored in. Earning a full Daily Budget on a day is worth 100 of them, whatever that budget happens to be, so a challenge measures effort rather than capacity.
_Avoid_: challenge XP, score

## Consistency

**Streak**:
Consecutive days on which the user completed a session containing at least one Counted Rep. It measures showing up, not effort — a self-chosen light day holds it, and how hard any given day is remains the user's call.
_Avoid_: chain, run

**Week**:
A seven-day slate that starts fresh every Monday, shown alongside the running Streak. It is a display and motivation device only — it gates nothing, breaks nothing, and pays nothing. Emphatically **not** the N-active-days-out-of-7 weekly streak that was retired in ADR-0005; that one could be lost, this one cannot.
_Avoid_: weekly streak, week goal

**Attendance**:
The flat XP paid for completing a session with at least one Counted Rep, regardless of how far short of the Session Goal it fell. Recovery is a rewarded state here, not merely an unpunished one.
_Avoid_: check-in, participation

**Milestone**:
A named day in an unbroken Streak — day 7, 30, 90 and beyond — that pays a flat Bonus. Deliberately spaced rather than continuously escalating: a multiplier that grows every day makes breaking a streak catastrophic, and that pressure lands hardest on the day a user should be taking it easy.
_Avoid_: achievement, badge

**Bonus**:
XP awarded for something other than reps, and therefore not subject to the Session Cap. Milestones pay one; so does Perfect Form.
_Avoid_: reward, multiplier

**Perfect Form**:
A session that reached its Session Goal without a single Half Rep. Defined on depth and never on Variant, so a knee-only user can earn it and a shallow standard-only user cannot.
_Avoid_: clean session, flawless

**Freeze**:
A held credit that covers a day with no session at all, without breaking the Streak. Earned by streak length, consumed automatically and retroactively. Generous by design, because a frozen day earns no XP — a user who freezes constantly keeps a number and gains nothing. Since a single Counted Rep holds the Streak, a Freeze covers total absence rather than a light day.
_Avoid_: streak saver, skip, pass
