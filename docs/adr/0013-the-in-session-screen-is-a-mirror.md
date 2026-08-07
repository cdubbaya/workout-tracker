# The in-session screen is a mirror

During a set the screen shows the camera feed with the pose read drawn over it — the tracked joints and the Hand Plane — plus the rep count and the Daily Budget filling. The vision doc argued the opposite: feedback should run through sound alone, because "looking at a phone mid-push-up introduces cervical rotation and degrades the body line, so an app that rewards screen-watching corrupts what it measures."

That argument turns out to depend on where the phone is, and the placement was ambiguous. The vision doc said "floor level, head-on, user facing the lens" in one section and "lying face-up on the floor" in another. Those cannot both hold — a phone lying flat films the ceiling and cannot see a push-up head-on. The resolved placement is **upright, in front of the user, at floor level, three or four feet away.**

With the phone in front, looking at it is looking forward. That is mild neck extension, not the cervical rotation the objection described, which is what you get from a phone beside or below you. The fault the vision doc was protecting against is not the one this placement produces.

What the mirror buys is trust, and trust is the product. Seeing the pose read track your body is the only direct evidence a user ever gets that the detector is working. Without it, a rep that doesn't count is indistinguishable from a bug, and the vision doc's own risk table puts detector trust above everything else.

## The trade-off we are accepting

Neutral neck position in a push-up is eyes down, not eyes forward. The mirror asks for slightly worse position than audio-only would, in exchange for legibility. Since this build does not measure body line anyway (§3), the cost is invisible to the scoring — which is an honest reason and also an uncomfortable one, because it means the app cannot detect the degradation it is encouraging.

Revisit if elevated placement and hip-sag detection ship, since at that point the app *can* see the body line it is affecting.

## Consequences

- The setup instruction changes from "put the phone on the floor" to "stand the phone upright in front of you." Framing guidance is now the highest-value onboarding screen — the vision doc already names first-session framing failure as the most likely churn point.
- The thermal model changes with it. A phone flat on carpet traps heat far worse than one leaned against a wall, so the degradation ladder should be re-tuned against the real placement rather than the assumed one.
- Audio feedback is unchanged and remains primary. The screen is confirmation, not instruction; a user who never looks at it loses nothing.
