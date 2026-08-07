# The Max Test measures the fatigue point, not failure

Onboarding calibrates a user by having them work at a comfortable pace until their Full Reps start becoming Half Reps, and stopping there. It does not ask anyone to press to failure.

ADR-0004 made this test safety-critical: the Session Goal is derived from it and the Session Cap equals the Session Goal, so the Max Test now sets the dose. A test that produces a bad number produces a bad prescription, every day, until it is redone.

Testing to failure would have been the obvious approach and it fails on three counts. It asks an untrained person to perform a max-effort set within two minutes of installing the app, which is the specific exposure the vision doc warns about. It has no floor — a user who cannot complete one push-up tests at zero, and zero calibrates to nothing, which strands exactly the audience the beginner-accessibility argument exists to serve. And it measures the wrong thing anyway: what the program needs is a sustainable working number, not a one-off ceiling.

The fatigue point is a better signal and the detector already produces it. Depth degrades before motion stops, so the transition from Full Reps to Half Reps is visible several reps before failure — no extra machinery, no extra risk, and a real number even for a user whose first two reps are their last good ones.

## Consequences

- Half Rep classification is now load-bearing for calibration as well as for scoring. Its accuracy affects the prescribed dose, not just the payout.
- The test needs a re-run trigger. A user who gets stronger and never retests keeps a stale Session Goal, and because the goal is also the cap, they are silently capped below their ability.
