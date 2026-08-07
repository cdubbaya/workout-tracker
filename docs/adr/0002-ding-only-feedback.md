# Ding-only feedback: silence means uncounted

The vision doc specified three audio signals — ding for a valid rep, buzzer for a rep that missed depth, silence for incomplete motion. We are collapsing that to one: a ding when a Rep counts, and nothing otherwise. The absence of a ding is the feedback. The user's target is a ding on every rep, and the gap between the reps they did and the dings they heard is the whole message.

The buzzer was doing two jobs badly. It punished, which is the wrong tone for a product whose users include people who cannot yet do one push-up, and it forced the detector to take a public position on *why* a Rep failed at the moment of failure — a judgement it is least confident about mid-set.

## Consequences

- Half Reps score (ADR-0003), so they ding too — at a lower pitch. Two notes, one meaning each: full value, half value. A lower note is information rather than reproach, so it does not smuggle the buzzer back in.
- Mid-set, the user learns that a Rep did not count *at all* but not why. That diagnostic moves to the post-set summary, which is the only place the user should be looking at the screen anyway.
- The detector must still classify the failure reason internally — for the summary, and for the detector-agreement instrumentation that is the product's health metric.
- The vision doc's rationale for silence-on-incomplete-motion ("so a user shifting their weight does not get scolded") is now moot. Nothing scolds.
