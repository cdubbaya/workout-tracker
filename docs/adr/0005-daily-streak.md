# Daily streak, not weekly

The vision doc carried a weekly consistency streak over from its predecessor — N active days out of 7, with N user-adjustable — on the grounds that a daily streak in a strength app tells users recovery is failure. We are replacing it with a daily streak.

The weekly streak was designed for an uncapped economy. The injury argument behind it concerns max-effort daily pressing and unbounded volume challenges, not daily pressing as such; submaximal daily work is a well-established protocol. Since ADR-0004 caps a session at the user's own calibrated Session Goal, the program now controls the daily dose, and doing some form of push-up every day is a prescription rather than a hazard.

Weekly also brought a unit problem it never solved. Milestones were specified in elapsed days (7, 30, 90) while the streak counted weeks, and a week's survival isn't known until it ends — so there was no coherent moment at which a day-30 bonus could fire. Daily removes the mismatch entirely.

## Consequences

- The Streak counts days containing at least one Counted Rep, not days the Session Goal was met. It measures showing up. A self-chosen light day holds it (see ADR-0007), so the streak never fights recovery.
- N — active days out of 7 — is deleted, along with the exploit where a user set it to 1 and became unbreakable.
- The Freeze's job shrinks accordingly: since one rep holds the Streak, a Freeze covers days with no session at all rather than days of rest.
- The psychological half of the original argument survives untouched: a user deep into a streak will train through a sore shoulder to protect the number, and the cap does nothing about that. What blunts it is that holding the streak costs one rep, so protecting the number never requires a hard session.
- Beginners are the exposed case. Seven days a week of pressing from a standing start is more aggressive than conventional programming, so the ramp belongs in the dose, not in the frequency.
