# Product Vision: AI Push-Up Counter

**Status:** Draft v1
**Date:** August 5, 2026
**Source:** Structured design interview, 13 resolved decisions
**Supersedes:** the broad gamified fitness platform doc, for this scope

---

## 1. What this is

A single-exercise app. The phone's front camera watches you do push-ups, counts valid reps using on-device pose estimation, and refuses to count the ones that miss depth. Completed sessions earn XP. XP feeds a streak, a movement ladder, and friend challenges.

The scope is deliberately narrow. One movement, one camera, one loop.

### What carried over from the platform doc

- Nothing purchasable moves XP, streaks, or rank
- Rest is a rewarded state, never a failure
- Weekly consistency streaks instead of daily
- Progression that cannot be rushed by training harder

### What got dropped

MET-minutes scoring, HealthKit session ingestion, step-based streak eligibility, multi-source deduplication, seasons, Trophy Road. The camera replaced the OS as the sensor, which made most of the prior architecture irrelevant.

---

## 2. Design principles

1. **The rep detector is the product.** Every other feature depends on users trusting the count.
2. **Claim only what the camera can see.** This build measures depth, symmetry, tempo, and lockout. It does not measure body line.
3. **Video never leaves the device and never touches disk.**
4. **The program governs volume.** Grinding extra reps earns nothing extra.
5. **Meet beginners where they are.** Someone who cannot do one push-up still has a rung to stand on.

---

## 3. Camera and detection

### Placement

Phone at floor level, head-on, front-facing camera, user facing the lens.

Head-on beats a side view for one reason that outweighs the rest: **a side view grades one arm and assumes the other matches.** Uneven push is common, and head-on catches it.

Floor level over elevated placement trades detection capability for zero setup friction. Propping the phone on a chair at waist height would recover the hip line. Telling users to find a chair loses more of them than it helps.

### What this placement costs

The torso and legs recede along the optical axis and hide behind the shoulders. **Hip sag and piking are undetectable.** Those are the two most common push-up faults.

Position the product accordingly. This is a rep verifier, not a form analyzer. Marketing that promises form analysis will get contradicted the first time a user sags through fifty reps and scores perfect. Sag detection arrives with elevated placement or a second angle, and it can be sold as a real upgrade rather than a fix.

### What this placement gains

The rep signal needs only shoulders and wrists, both of which sit high in a head-on frame. Full-body framing is not required, so the phone can sit three or four feet away instead of eight. In a bedroom or a hotel room, that difference decides whether the app gets used.

### Model and pipeline

**Google ML Kit Pose Detection**, cross-platform, 33 landmarks, running on-device.

- Sample at **15fps**, not 30. A push-up cycle runs 0.6 to 2 seconds, so 15fps yields 9 to 30 frames per rep. That is far more than the state machine needs and it roughly halves compute and heat.
- Downscale input frames before inference.
- Run through `react-native-vision-camera` frame processors under an Expo development build.
- Register a **thermal state listener.** Sustained capture plus inference on a phone lying face-up on the floor will throttle. Throttling drops the frame rate mid-set and quietly degrades accuracy at the exact moment the user is most tired and least forgiving. Warn the user rather than miscounting in silence.

---

## 4. Rep validation

### The signal

Track **vertical shoulder travel measured against the wrists.**

Elbow angle is the textbook criterion and the wrong one here. Head-on, the upper arms point partly toward and away from the lens, so the angle is foreshortened and the error shifts as the user rotates.

The wrists solve the calibration problem for free. The user's hands are on the floor and clearly visible, so wrist y-position supplies the floor plane with no setup step and no assumption about camera height. Depth then becomes a ratio of the user's own geometry, which self-calibrates across a 5'2" user and a 6'4" user.

This ratio also survives the incline variant unchanged, because it measures shoulder travel relative to the **hand plane** rather than the floor.

### Thresholds

| Criterion | Value |
|---|---|
| Depth | Shoulder descends to ~70% of top-position shoulder-to-wrist gap |
| Lockout | Return to ≥90% of that gap |
| Tempo | Minimum ~0.6s per complete cycle |
| Sequence | Descent, bottom, ascent, lockout. Reps fire only on a complete cycle |

Tempo matters more than it looks. Any pure position threshold can be satisfied by pulsing at the bottom, and without a floor on cycle time the leaderboard belongs to whoever vibrates fastest.

### Audio feedback

Feedback runs through sound, not the screen. Looking at a phone mid-push-up introduces cervical rotation and degrades the body line, so an app that rewards screen-watching corrupts what it measures.

- **Ding** on a valid rep
- **Buzzer** on a rep that meets tempo and misses depth, since that is the correctable error
- **Silence** on incomplete motion, so a user shifting their weight does not get scolded

Tune the thresholds against a real range of body types, camera distances, lighting conditions, and clothing before launch. This is the part of the build that can fail outright.

---

## 5. The movement ladder

A meaningful share of adults cannot complete one standard push-up. Without a lower rung, those users open the app, trigger the buzzer repeatedly, and delete it inside two minutes.

**v1 ladder:** incline → knee → standard

- **Incline** (hands on a chair, counter, or step) scales continuously. Lower the surface as strength improves. The wrist-datum ratio handles it with no change.
- **Knee** needs one additional check on knee position to distinguish it from standard.
- **Wall** is a standing pose with a different camera setup. Deferred.

**Deferred harder variants:** diamond, wide, one-arm. Each likely needs its own camera placement, since hand spacing is the distinguishing feature and it is invisible head-on at floor level.

### Ladder economics

XP scales with difficulty, so a standard rep pays more than a knee rep. That prevents beginners from out-earning advanced users through sheer volume on an easier movement.

**Advancing the ladder is the headline reward.** Moving from knee to standard is worth more than any XP total, and it is the milestone a beginner will screenshot. Paying a beginner less XP would demoralize if XP were the only progression. It is not.

---

## 6. Program

The app prescribes daily work by default. Free-form logging sits one tap away.

A bare counter has no reason to be opened on any given day. It gets used only after the user has already decided to train, which makes it a stopwatch. The program supplies the daily unit that streaks, XP, and challenges attach to.

It also answers the beginner's real question. Someone who can do six push-ups does not know whether to do six today, three sets of four, or nothing. Push-up progression is arithmetic: test a max, prescribe sets at percentages of it, ladder up weekly, deload when reps stall. Cheap to generate, valuable to receive.

The program also moves users up the movement ladder, which makes it the engine behind the headline reward.

**Requirements:**
- Max test at onboarding to calibrate
- Rest days built into the schedule
- Weekly progression with a deload trigger when reps stall
- Medical disclaimer visible during onboarding, not buried in terms

---

## 7. XP economy

### Earning

| Event | XP |
|---|---|
| Attendance (session attempted) | 25 |
| Session goal met | 100 |
| Milestone day | 2x multiplier |

A failed session still pays attendance. Someone whose arms give out at rep 7 of 10 did the training that actually builds strength, and paying zero for it would reward setting goals low enough to guarantee the payout.

**Session XP is binary.** Meeting the goal pays 100 or it pays nothing, so completion means something. Free-form reps outside a session do not earn session XP.

### Why volume does not pay

Push-ups carry a specific hazard the platform product did not. High-volume push-up challenges cause rhabdomyolysis in untrained people, and daily max-effort pressing produces elbow tendinopathy and shoulder impingement. There is no variety here to spread the load. It is the same joint, every day.

Tying XP to session completion rather than rep count means the program controls volume. Doing 300 push-ups on a day the program called for 40 earns nothing extra, which is correct, because it was not better training.

### Milestones

2x XP on milestone days: day 7, day 30, day 90, and beyond. Additional bonuses can land at other points in a period.

A continuous escalating multiplier would break two things. A 5x bonus at a five-day streak means breaking it costs 80% of your earning rate, and that pressure lands hardest on the day someone should rest. It also makes the economy unbalanceable, since a 30-day streak at 30x renders the first month's XP worthless.

Milestone spikes deliver the anticipation without either problem.

**Unit reconciliation:** milestones count **elapsed days of an unbroken weekly streak**, not consecutive sessions. Day 30 means a month of consistent weeks. This keeps rest days from breaking a milestone run.

---

## 8. Streaks

**Weekly consistency streak**, carried over from the platform doc. The streak counts weeks in which the user hit N active days out of 7, with N user-adjustable.

Rest days are scheduled by the program and never break anything. A daily streak in a strength app tells users that recovery is failure, and someone deep into a streak will train through a sore shoulder to protect the number.

---

## 9. Friend challenges

Friends only. No global leaderboards.

**Templates:**

| Type | Duration |
|---|---|
| Head to head | One session |
| 7-day challenge | One week |
| 30-day challenge | One month |
| Custom | User-set end date |

Each challenge runs an XP leaderboard among participants.

### Verification

**Client-authoritative. No attestation, no server-side recount.**

The count on the device is the count. A friends-only app with a dozen people who know each other does not need a fortress: getting caught is socially expensive and the prize is bragging rights.

Two things worth knowing about the exposure. Filming a video of someone else doing push-ups requires real effort per session and is not worth engineering against. Sending a fabricated score straight to the API takes effort once and then costs a keystroke, so that is the version that shows up if it ever does.

The upgrade path is short. Adding App Attest and Play Integrity is roughly a day of work and blocks the trivial attack. Keep the pose landmark stream structured on-device so that server-side recomputation stays available if global leaderboards ever ship.

---

## 10. Privacy

**Video never leaves the device and is never written to disk.**

Inference runs locally, so no frame needs to travel. Nothing gets stored for replay. For an app that asks people to point a lens at themselves on their bedroom floor, that sentence carries as much weight as any feature, and it should appear in the App Store listing rather than only in the privacy policy.

Camera permission requires a clear purpose string. Apple's rules on health data still apply to anything written back to HealthKit: no advertising use, no sale to data brokers, published privacy policy.

---

## 11. HealthKit and Health Connect

Write completed sessions back as workouts. Write-only permission, small build, disproportionate goodwill. Users' rings close and their push-ups live alongside the rest of their training history.

No read integration. The camera is the only sensor this product needs.

---

## 12. Roadmap

### v1, iOS first

- Camera setup and framing check
- ML Kit pose pipeline at 15fps with thermal handling
- Rep state machine: ratio depth, lockout, tempo
- Audio feedback: ding, buzzer, silence
- Movement ladder: incline, knee, standard
- Program generation from a max test, with rest days and deloads
- Free-form logging
- XP: 25 attendance, 100 goal, 2x milestones
- Weekly consistency streak
- Friend challenges: head to head, 7-day, 30-day, custom
- HealthKit write-back

### v1.1

- Android and Health Connect
- Wall push-ups
- Elevated camera placement option with hip-sag detection

### v2

- Hard variants: diamond, wide, one-arm, each with its own camera setup
- Trophy Road, if the program alone proves insufficient for retention
- Device attestation, if the trust model changes

**Why iOS first:** camera framing UX, thermal behavior, and depth thresholds all need tuning against real bodies in real rooms. That tuning runs faster against one platform, and the rep detector is the part of this build that can fail outright.

**Why no Trophy Road at launch:** this product already has a progression spine. Incline to knee to standard, with prescribed sets climbing weekly, is a real narrative the platform product had to manufacture. Adding a second progression system means balancing both before knowing whether either works.

---

## 13. Instrumentation

The question v1 answers: does a verified rep counter with a program bring people back?

- D1, D7, D30 retention
- Weekly streak survival, and which week users break
- **Rep detector agreement rate.** Sample sessions where users manually correct the count. This is the health metric for the whole product.
- Setup abandonment: users who open the camera and never complete a session
- Ladder advancement rate, incline to knee to standard
- Session completion rate versus attendance-only rate
- Challenge participation and completion among invited friends
- Thermal throttle frequency and session length at throttle

---

## 14. Risks

| Risk | Detail |
|---|---|
| Detector accuracy | The entire product rests on it. Miscounts in either direction destroy trust immediately and permanently. |
| Lighting and clothing | Pose estimation degrades in dim rooms and against low-contrast backgrounds. People work out in dim rooms. |
| No hip-sag detection | Limits the honest form claim. A user who sags through a set scores perfect and will eventually learn why. |
| Thermal throttling | Longer sessions on older devices may drop frame rate and accuracy together. |
| Client-authoritative scoring | Friend challenge scores are fakeable with minimal effort. Acceptable at current stakes, revisit if the audience widens. |
| Single-exercise ceiling | Push-ups alone may not sustain long-term engagement regardless of how good the loop is. |
| Volume injury | The program governs volume, but free-form use is unbounded. Watch for users logging extreme daily totals. |
| Setup friction | Floor placement minimizes it. Framing failures on the first session remain the most likely churn point. |

---

## Appendix: Decision log

| # | Question | Decision |
|---|---|---|
| 1 | Camera setup and variants | Front-facing camera, variants deferred |
| 2 | Placement and feedback | Head-on, user faces camera, audio ding/buzzer |
| 3 | Phone height | Floor level, no body-line detection |
| 4 | Rep signal | Composite state machine: ratio depth, lockout, tempo |
| 5 | Beginner accessibility | Full ladder (incline, knee, standard), scaled XP, ladder progression as headline reward |
| 6 | Social layer | Friend challenges from the start, nothing global |
| 7 | Anti-cheat | None. Client-authoritative |
| 8 | Prescribed vs free-form | Both, program is the default |
| 9 | XP source | Session goal met earns XP |
| 10 | Failed sessions | Goal pays 100, attendance pays 25 |
| 11 | Streak effect on XP | 2x on milestone days (7, 30, 90) |
| 12 | Pose stack | Google ML Kit, cross-platform, 15fps |
| 13 | v1 scope | Solo climb + friend challenges with XP leaderboards, iOS first |
