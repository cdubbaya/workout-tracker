# Product Vision: AI Push-Up Counter

**Status:** Draft v2
**Date:** August 7, 2026
**Source:** Design grilling against Draft v1, 12 recorded decisions in `docs/adr/`
**Supersedes:** Draft v1 (August 5, 2026), most of whose decision log did not survive

Vocabulary in this document is defined in [CONTEXT.md](./CONTEXT.md). Where this document and an ADR disagree, the ADR is current.

---

## 1. What this is

A single-exercise app. The phone's front camera watches you do push-ups, scores the reps it can verify, and gives nothing for the ones it can't. Reps earn XP against a daily budget calibrated to you. XP feeds a streak, a level track, and friend challenges.

The scope is deliberately narrow. One movement, one camera, one loop.

### The one idea everything else hangs off

**Every comparison between users is denominated in that user's own capacity.** Absolute quantities of work are never comparable across people in this product.

This started as a fairness requirement — a co-ed friend challenge must not systematically reward the participants who can do standard push-ups — and turned out to solve three other problems for free: it removes the incentive to grind volume, it lets beginners and athletes share a leaderboard honestly, and it makes the movement-difficulty question disappear rather than needing a constant tuned into it.

It is also the thing that keeps trying to break. It failed three separate times during design — as movement-difficulty weighting, as a form bonus defined on Variant, and as absolute challenge targets — so new features should be checked against it explicitly.

---

## 2. Design principles

1. **The rep detector is the product.** Every other feature depends on users trusting the count.
2. **Claim only what the camera can see.** This build measures depth, symmetry, tempo, and body angle. It does not measure body line.
3. **Video and pose landmarks never leave the device and never touch disk.**
4. **The daily budget governs volume.** Grinding extra reps earns nothing extra.
5. **Meet beginners where they are.** Someone who cannot do one push-up still has a real number to work against.
6. **Never punish.** Degrading form, dropping to knees, quitting early, and taking it easy are all training decisions, not failures. The app pays less for them; it does not scold.

---

## 3. Camera and detection

### Placement

Phone at floor level, head-on, front-facing camera, user facing the lens.

Head-on beats a side view for one reason that outweighs the rest: **a side view grades one arm and assumes the other matches.** Uneven push is common, and head-on catches it.

Floor level over elevated placement trades detection capability for zero setup friction. Propping the phone on a chair at waist height would recover the hip line. Telling users to find a chair loses more of them than it helps.

### What this placement costs

The torso and legs recede along the optical axis and hide behind the shoulders. **Hip sag and piking are undetectable.** Those are the two most common push-up faults.

Position the product accordingly. This is a rep verifier, not a form analyzer. Marketing that promises form analysis will get contradicted the first time a user sags through fifty reps and scores perfect. Sag detection arrives with elevated placement or a second angle, and it can be sold as a real upgrade rather than a fix.

Knee Variant classification is also degraded by this placement, for the same reason — the knees are behind the shoulders. That is acceptable here because Variant no longer gates anything (§5).

### What this placement gains

The rep signal needs only shoulders and wrists, both of which sit high in a head-on frame. Full-body framing is not required, so the phone can sit three or four feet away instead of eight. In a bedroom or a hotel room, that difference decides whether the app gets used.

### Model and pipeline

**Google ML Kit Pose Detection**, cross-platform, 33 landmarks, running on-device, through `react-native-vision-camera` frame processors under an Expo development build.

Apple Vision was reconsidered for the iOS-first release and rejected. Its 19 joints cover everything this design needs, and native would likely behave better under sustained capture — but `react-native-vision-camera` has maintained ML Kit pose plugins and no equivalent for Vision, so choosing it means writing a native module in the release that can least afford one. The threshold work ports either way, because the thresholds are ratios between landmarks rather than absolute coordinates.

- Sample at **15fps**, not 30. A push-up cycle runs 0.6 to 2 seconds, so 15fps yields 9 to 30 frames per rep. That is far more than the state machine needs and it roughly halves compute and heat.
- Downscale input frames before inference.

### Thermal degradation

Sustained capture plus inference on a phone lying face-up on the floor will throttle. Register a thermal state listener and shed load **in this order**, because the two costs are not equal:

1. **Downscale further.** Resolution costs landmark precision, which shoulder-width normalization tolerates well.
2. **Then reduce frame rate, with a floor around 10fps.** Frame rate costs tempo resolution, which is what stands between the product and the pulsing exploit. A 0.6s rep is 9 frames at 15fps and 6 at 10fps; below that the state machine loses the cycle.
3. **Interpolate threshold crossings between frames**, so tempo resolution isn't bounded by the frame interval. This buys back most of what step 2 costs.
4. **Below the floor, warn and flag the session** as thermally degraded in the Rep Log, and keep counting. Never take a user's work away mid-effort.

A session must also stop the camera after a prolonged absence of any detected pose. A user who walks off without ending the session would otherwise leave the camera running on a face-up phone, which is the thermal scenario in its worst form.

---

## 4. Rep validation

### The signal

Track **vertical shoulder travel against the wrists, scaled by shoulder width.**

Elbow angle is the textbook criterion and the wrong one here. Head-on, the upper arms point partly toward and away from the lens, so the angle is foreshortened and the error shifts as the user rotates.

The wrists solve the calibration problem for free. The user's hands are on the floor and clearly visible, so wrist y-position supplies the Hand Plane with no setup step and no assumption about camera height.

**Shoulder width supplies the scale.** This is the correction that Draft v1 got wrong. Measuring depth as a fraction of the previous Top's shoulder-to-wrist gap looks self-calibrating and isn't: as a user tires their Top sinks, so the threshold sinks with them, and the set gets easier exactly as the user gets more tired. Inter-shoulder distance scales with distance from the lens but does not change when someone gets tired, so it anchors the measurement without ratcheting.

The same ratio pays a second dividend. **Shoulder-to-wrist gap ÷ shoulder width is a continuous read on body angle** — how far your shoulders sit above your hands, relative to your own build. That is what lets the detector tell a steep incline from a standard push-up, and it means incline is a continuous quantity rather than an undifferentiated bucket.

### Criteria

| Criterion | Definition |
|---|---|
| Depth | Shoulder descends far enough toward the Hand Plane, scaled by shoulder width and adjusted for measured body angle |
| Top | Return to near-extension — deliberately short of locked elbows |
| Tempo | Minimum ~0.6s per complete cycle |
| Sequence | Descent, bottom, ascent, Top. Reps fire only on a complete cycle |

**Top is not lockout.** Resting on locked elbows removes tension from the muscle and loads the joint, so the app neither asks for it nor rewards it. This is why the glossary avoids the word — terminology that prescribes the position we're discouraging will leak into the code.

Exact threshold values are tuning work, and Draft v1's "70% of the top gap" does not transfer directly to a shoulder-width-scaled measurement. Tune against a real range of body types, camera distances, lighting conditions, and clothing before launch. **This is the part of the build that can fail outright.**

### What each outcome pays

| Outcome | Value | Sound |
|---|---|---|
| Full Rep | Full Rep Value | Ding |
| Half Rep — complete cycle, short of depth | Half | Lower ding |
| Uncounted — too fast, or incomplete | Nothing | Silence |

Feedback runs through sound, not the screen. Looking at a phone mid-push-up introduces cervical rotation and degrades the body line, so an app that rewards screen-watching corrupts what it measures.

Draft v1's buzzer is gone. It punished, which is wrong for a product whose audience includes people who cannot yet do one push-up, and it forced the detector to publish *why* a rep failed at the moment it was least confident. The absence of a ding is the feedback; the user's target is a ding on every rep. Why a rep fell short moves to the post-set summary, which is the only place the user should be looking at the screen anyway.

**Half reps score, and that needs a counterweight.** Pricing depth instead of gating it means a shallow rep still pays — which reopens the pulsing exploit, since half reps reach any target faster than real ones. Two things contain it: the daily budget bounds the exploit, and the Perfect Form bonus makes it cost money (§7).

### Miscounts

The app's count is final. The user cannot override it.

They can flag it. A "that count was wrong" control changes nothing — not the count, not XP, not a challenge standing — and exists solely to feed the detector agreement rate, which is the product's health metric. Without it there is no production signal on the one thing §2 says everything rests on.

---

## 5. Variant

Incline, knee, standard. **Variant is a property of each Rep, not of the user or the session.**

Draft v1 modelled this as a ladder the user stands on and climbs. That was wrong. Pressing standard reps to failure and then finishing the work on your knees is how the movement is actually trained, and an app that logs the second half as a demotion teaches the wrong lesson at the exact moment the user is doing the right thing. Mixed sets are correct sets.

Variant sets a Rep's value and nothing else. It gates nothing, prescribes nothing, and is never a requirement.

- **Incline** scales continuously with surface height, and body angle is measurable, so its value can scale continuously too.
- **Knee** is poorly separable from standard at this camera placement. Since nothing gates on it, the classification degrades gracefully rather than blocking.
- **Wall** is a standing pose with a different camera setup. Deferred.
- **Diamond, wide, one-arm** each likely need their own placement, since hand spacing is the distinguishing feature and it is invisible head-on at floor level. Deferred.

**Progression is not a Variant ladder.** It is the Level track (§9) and the escalating Session Goal (§6). A user who only ever does knee push-ups still progresses through both, which is deliberate.

---

## 6. Program

The app prescribes daily work by default. Free-form logging sits one tap away and scores from the same budget.

A bare counter has no reason to be opened on any given day. It gets used only after the user has already decided to train, which makes it a stopwatch. The program supplies the daily unit that streaks, XP, and challenges attach to.

It also answers the beginner's real question. Someone who can do six push-ups does not know whether to do six today, three sets of four, or nothing.

### Calibration

**The Max Test measures the Fatigue Point, not failure.** The user works at a comfortable pace and the test ends when their Full Reps start becoming Half Reps.

This matters more than it did in Draft v1, because the Session Goal is now the dose: a bad calibration is a bad prescription, every day, until it is redone. Testing to failure fails three ways. It asks an untrained person for a max-effort set within two minutes of installing the app. It has no floor, so a user who cannot complete one push-up tests at zero and calibrates to nothing. And it measures a one-off ceiling when what the program needs is a sustainable working number.

Depth degrades before motion stops, so the Fatigue Point is visible several reps before failure — no extra machinery, no extra risk, and a real number even for a user whose first two reps are their last good ones.

The test needs a re-run trigger. A user who gets stronger and never retests is silently capped below their ability.

### Recovery

**The user decides.** The program sets a Session Goal each day; how much of it to do is the user's call. A light day pays Attendance XP plus whatever reps were managed, and holds the Streak.

Draft v1 built rest days into the schedule. Removing them is a deliberate trade of a safety rail for a better daily experience, and it is the least comfortable decision in this document — programs schedule rest precisely because motivated users don't choose it. What remains is incentive-level rather than load-level: the budget removes the *reward* for extra volume without preventing it, holding the Streak costs one rep, and a bad day still pays. Those remove most reasons a rational user would overreach. They do nothing about an irrational one.

The medical disclaimer required at onboarding is therefore load-bearing rather than ceremonial, and should say that the user manages their own recovery.

### Requirements

- Max Test at onboarding, measured at the Fatigue Point
- Session Goal escalating with demonstrated endurance, with a deload trigger when performance stalls
- Re-test trigger when the goal goes stale
- Medical disclaimer visible during onboarding, not buried in terms

---

## 7. XP economy

### Earning

XP is earned per Counted Rep, valued by Variant and by whether the rep was Full or Half.

| | Value |
|---|---|
| Standard, full | 10 |
| Standard, half | 5 |
| Knee, full | 5 |
| Incline | Scales with measured body angle — **value not yet set** |
| Attendance — a session with at least one Counted Rep | Flat, small — **value not yet set** |

### The Daily Budget

**Rep XP is capped per day at the user's Session Goal**, spent across every session — prescribed or free-form, one or five.

This single mechanism does three jobs. It makes mixed-ability challenges fair, because everyone tops out at their own calibrated number and a beginner hitting their goal in knee reps earns exactly what an athlete hitting theirs in standard reps earns. It stops volume paying, which is the fourth principle. And it closes free-form as a loophole without making free-form worthless.

A consequence that needs surfacing in the UI: a hard free-form session in the morning means the prescribed session that evening pays nothing. The remaining balance belongs on the pre-session screen, not discovered afterwards.

### Why volume does not pay

Push-ups carry a specific hazard. High-volume push-up challenges cause rhabdomyolysis in untrained people, and daily max-effort pressing produces elbow tendinopathy and shoulder impingement. There is no variety here to spread the load. It is the same joint, every day.

Note what the budget does and does not do. It removes the *reward* for extra volume. It does not prevent it — a user can still do three hundred push-ups, the app simply won't pay for them.

### Bonuses

Bonuses are awarded for something other than reps and therefore **sit outside the Daily Budget**. A cap with exceptions is a suspicious shape, so the reason matters: a bonus that pays for doing the same work on a particular day, or for doing the same work better, adds no volume.

| Bonus | Condition |
|---|---|
| Perfect Form | Session Goal reached with no Half Reps |
| Milestone | Day 7, 30, 90 and beyond of an unbroken Streak — flat, not a multiplier |

**Perfect Form is defined on depth, never on Variant.** A session of knee reps at full depth qualifies; a session of shallow standard reps does not. Defining it on Variant would make it unearnable for users who don't do standard push-ups, which is the fairness gap returning through a side door.

It is also the counterweight that makes priced half reps safe. Full reps pay double, so a 500-point goal costs 50 full reps or 100 half ones — **perfect form is fewer, better reps** — and any Half Rep forfeits the bonus. Pulsing now costs money. Reverse one of these and you must reverse the other.

Milestones are flat rather than escalating. A continuously growing multiplier makes breaking a streak catastrophic, and that pressure lands hardest on the day someone should be taking it easy.

---

## 8. Streak

**Daily**, counting days with at least one Counted Rep. It measures showing up, not effort.

Draft v1 used a weekly streak on the grounds that a daily streak in a strength app tells users recovery is failure. That was written for an uncapped economy. The injury argument concerns max-effort daily pressing and unbounded volume, not daily pressing as such; submaximal daily work is a well-established protocol, and the budget now controls the daily dose. Weekly also had an unsolved unit problem — milestones were specified in elapsed days while the streak counted weeks, and a week's survival isn't known until it ends.

What blunts the original objection is that **holding the streak costs one rep.** Protecting the number never requires a hard session, so the streak and recovery never compete.

**Freezes** cover days with no session at all. Earned by streak length, consumed automatically and retroactively. They can be generous, because a frozen day earns no XP — a user who freezes constantly keeps a number and gains nothing.

**Two layers, deliberately.** The running total only ends when the Streak breaks. Alongside it sits a **Week** — a seven-day slate that starts fresh every Monday. The week gates nothing, breaks nothing, and pays nothing; it exists so that a user who is 4 days into a 200-day run still has something short enough to finish this week. It is not the N-of-7 weekly streak retired in §8's own history, and the glossary keeps them apart deliberately.

---

## 9. Level

An escalating XP threshold track. Thresholds get progressively harder to clear; a seasoned athlete may clear several early.

This is the progression spine, replacing Draft v1's movement ladder. It is also what carries late-game motivation once the novelty of the counter has worn off. Threshold values are not yet set.

---

## 10. Friend challenges

Friends only. No global leaderboards.

| Type | Duration |
|---|---|
| Head to head | One session |
| 7-day | One week |
| 30-day | One month |
| Custom | User-set end date |

Each runs on either a **daily** target ("80% of your goal, 5 of 7 days") or a **cumulative** one ("first to 1,000"). The creator chooses.

### Scoring

**Challenge Points, denominated in share of your own Daily Budget.** A full day is worth 100 to everyone, whatever their budget.

Absolute XP targets are not offered, and not because they're unfair — because they're unsatisfiable. Rep XP is capped at the user's Session Goal, so a challenge demanding 500 XP a day *cannot be completed* by a participant whose goal is 300, however many push-ups they do. Cumulative absolute targets fail the same way more slowly: "first to 10,000" is 33 days at a 300 budget and 17 at 600, so the winner is chosen by calibration rather than effort.

**Perfect Form counts toward standings. Milestone does not.** Perfect Form is earned inside the challenge window by holding depth. Milestone bonuses fire on streak history predating the challenge, so a participant crossing day 30 mid-challenge would bank a lead nobody could answer. Leaving the choice to the creator was rejected for the same reason — a creator near a milestone would be choosing their own advantage.

### Verification

**Client-authoritative. No attestation, no server-side recount.**

The count on the device is the count. A friends-only app with a dozen people who know each other does not need a fortress: getting caught is socially expensive and the prize is bragging rights.

Two exposures worth knowing. Filming someone else doing push-ups requires real effort per session and is not worth engineering against. The attacks that show up are the ones that take effort once and then cost a keystroke — a fabricated API call, or **rolling the device clock forward to farm Streak days and Milestone bonuses**, which the current sync design accepts.

The upgrade path is short. App Attest and Play Integrity are roughly a day of work. Server-authoritative time is one Edge Function. Per-rep metrics are retained (§11), so server-side recomputation stays available if global leaderboards ever ship. Widening the audience is the trigger for all three.

---

## 11. Privacy

**Video and pose landmarks never leave the device and are never written to disk.**

Landmarks live in memory for the duration of a Rep and are discarded. What persists is the **Rep Log** — depth ratio, tempo, Variant, Full or Half, detector confidence. That is enough to recompute whether a rep should have counted, which was the entire point of Draft v1's "keep the landmark stream" requirement, at a fraction of the size and with no reconstructable body, room, or person.

The claim must be stated precisely rather than expansively, because a server now holds identity, a friend graph, an XP ledger, and Rep Logs. The App Store listing should say what it means: **video and pose landmarks never leave your device; workout results and your friends list do.** For an app that asks people to point a lens at themselves on their bedroom floor, that sentence carries as much weight as any feature.

Camera permission requires a clear purpose string. Apple's rules on health data still apply to anything written back to HealthKit: no advertising use, no sale to data brokers, published privacy policy.

**Cost of this decision:** threshold tuning loses its richest debugging material, since a session's landmarks can't be replayed to see why a rep was misjudged. Tuning runs against instrumented builds and consented test sessions during development, not against production data.

---

## 12. Architecture

**Supabase is the backend.** The app talks to it directly, with row-level security as the access layer and Edge Functions for anything that must run server-side. There is no API tier in between — writing the API is the work a BaaS exists to remove, and for a React Native client with no web frontend it buys an extra hop and an extra deploy target.

Neon was considered and is a different category: serverless Postgres without auth, a client SDK, or realtime, so choosing it would mean building a custom backend under a different name.

**Vercel hosts the web surface only** — friend-invite landing pages for people who don't have the app yet, marketing, and the privacy policy.

**Sessions queue locally when offline** and sync with the client's timestamp, which the server accepts. Offline capture is a requirement rather than a nicety: floor placement was chosen specifically to make hotel rooms and basements viable.

---

## 13. HealthKit and Health Connect

Write completed sessions back as workouts. Write-only permission, small build, disproportionate goodwill. Users' rings close and their push-ups live alongside the rest of their training history.

No read integration. The camera is the only sensor this product needs.

---

## 14. Roadmap

### v1, iOS first

- Camera setup and framing check
- ML Kit pose pipeline at 15fps with the thermal degradation ladder
- Rep state machine: shoulder-width-scaled depth, Top, tempo, Variant classification
- Audio: ding, lower ding, silence
- Post-set summary with miscount flag
- Max Test at the Fatigue Point, with re-test trigger
- Program: escalating Session Goal, deload on stall
- Free-form logging against the same Daily Budget
- XP, Daily Budget, Attendance, Perfect Form and Milestone bonuses
- Daily Streak with Freezes
- Level track
- Supabase: identity, friend graph, XP ledger, push
- Friend challenges: head to head, 7-day, 30-day, custom, scored in Challenge Points
- Vercel: invite landing pages, marketing, privacy policy
- HealthKit write-back

### v1.1

- **Challenge group chat.** Designed during prototyping and deferred deliberately: a group thread carries a messages store, realtime delivery, moderation, reporting, and its own push category. v1 challenges ship with standings and no thread.
- Android and Health Connect
- Wall push-ups
- Elevated camera placement option with hip-sag detection

### v2

- Hard variants: diamond, wide, one-arm, each with its own camera setup
- Device attestation and server-authoritative time, if the trust model changes
- Server-side recount from Rep Logs, if global leaderboards ship

**Why iOS first:** camera framing UX, thermal behavior, and depth thresholds all need tuning against real bodies in real rooms. That tuning runs faster against one platform, and the rep detector is the part of this build that can fail outright.

**Note on v1 size.** The backend is not a line item next to twelve others — identity, friend graph, invites, XP ledger, push, and sync are plausibly comparable in effort to the detector. The alternative of shipping a solo v1 and deferring challenges was considered and rejected; the social layer stays in v1. Plan the release accordingly rather than discovering it.

---

## 15. Instrumentation

The question v1 answers: does a verified rep counter with a program bring people back?

- D1, D7, D30 retention
- Streak survival, and which day users break
- **Rep detector agreement rate**, from miscount flags. This is the health metric for the whole product.
- Setup abandonment: users who open the camera and never complete a session
- Session Goal attainment rate versus attendance-only rate
- Variant mix over time, and whether it shifts toward standard
- Perfect Form rate — a proxy for whether the depth threshold is tuned correctly
- Free-form share of the Daily Budget
- Challenge participation and completion among invited friends
- Thermal throttle frequency and session length at throttle
- **Consecutive full-budget days**, as the early warning for the risk taken in §6

---

## 16. Risks

| Risk | Detail |
|---|---|
| Detector accuracy | The entire product rests on it. Miscounts in either direction destroy trust immediately and permanently. |
| Calibration is now the dose | The Session Goal sets both the target and the cap. A bad Max Test is a bad prescription every day until it is redone. |
| No scheduled rest | Recovery is the user's call, stacked against a daily streak, friend challenges, and social visibility. Nothing in the system lowers the dose. Autoregulation — dropping tomorrow's goal after consecutive full days — remains implementable and changes one number. |
| Lighting and clothing | Pose estimation degrades in dim rooms and against low-contrast backgrounds. People work out in dim rooms. |
| No hip-sag detection | Limits the honest form claim. A user who sags through a set scores perfect and will eventually learn why. |
| Thermal throttling | Longer sessions on older devices degrade the detector. The degradation ladder bounds it; it does not eliminate it. |
| Half reps priced | Pulsing reaches a target faster than real reps. Bounded by the budget and penalised by Perfect Form, not prevented. |
| Client clock trusted | Rolling the device date farms Streak days and Milestone bonuses at zero ongoing cost. Accepted at friends-only stakes. |
| Backend scope in v1 | The social layer is real infrastructure landing in the release that can least afford distraction. |
| Single-exercise ceiling | Push-ups alone may not sustain long-term engagement regardless of how good the loop is. |
| Setup friction | Floor placement minimizes it. Framing failures on the first session remain the most likely churn point. |

---

## 17. Open questions

These are unresolved and blocking nothing yet.

- **Incline Rep Value.** Body angle is continuously measurable, so incline could scale continuously rather than being a bucket. No value set.
- **Attendance XP amount.** Draft v1's 25 is a starting point, unconfirmed.
- **Freeze accrual rate**, and the maximum balance a user can hold.
- **Level threshold values.**
- **Session Goal escalation and deload algorithm** — the rate of climb, and what counts as stalling.
- **Onboarding framing check** — how the user knows they're in frame before starting.
- **Notification strategy** — the streak reminder is the obvious one and the easiest to get wrong.

---

## Appendix: Decision log

Recorded decisions live in [docs/adr/](./docs/adr/). This table maps them against Draft v1.

| # | Decision | Status |
|---|---|---|
| 1 | Front-facing camera, hard variants deferred | Carried over |
| 2 | Head-on, user faces camera | Carried over |
| 3 | Floor level, no body-line detection | Carried over |
| 4 | Composite state machine: depth, Top, tempo | Carried over, scaling reworked |
| 5 | Friends only, nothing global | Carried over |
| 6 | Client-authoritative, no anti-cheat | Carried over |
| 7 | Program plus free-form, program default | Carried over |
| 8 | ML Kit, cross-platform, 15fps | Carried over, reconsidered and confirmed |
| 9 | iOS first, challenges in v1 | Carried over |
| — | | |
| ADR-0001 | Variant is a property of a Rep, not a ladder position | Reverses v1 #5 |
| ADR-0002 | Ding-only feedback; silence means uncounted | Reverses v1 #2 |
| ADR-0003 | Half reps score | Reverses v1 #4 |
| ADR-0004 | Scoring is relative to the individual | Reverses v1 #9, #10, #11 |
| ADR-0005 | Daily streak, not weekly | Reverses v1 #11 |
| ADR-0006 | Bonuses sit outside the budget; Perfect Form on depth | Reverses v1 #11 |
| ADR-0007 | Recovery is the user's call | Reverses v1 §6 |
| ADR-0008 | Max Test measures the Fatigue Point | Reverses v1 §6 |
| ADR-0009 | Persist per-rep metrics, never landmarks | Refines v1 §9, §10 |
| ADR-0010 | Supabase direct; Vercel for web only | New |
| ADR-0011 | One daily rep-XP budget | Refines ADR-0004 |
| ADR-0012 | Challenges score in budget share | New |
