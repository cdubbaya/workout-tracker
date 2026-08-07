# Half reps score

A Rep that completes a full cycle but fails the depth threshold — a half rep — is worth 5 points, against 10 for a standard-Variant Rep at full depth. The vision doc treated depth as a gate: reps that missed it did not count at all. We are pricing it instead.

The reasoning is the same one behind ADR-0001. A user grinding out shallow reps at the end of a set is training, not cheating, and a product that zeroes them out is demoralising at the exact moment the user is working hardest. The point of the app is to keep people moving, not to referee them.

## The trade-off we are accepting

A half rep costs well under half the effort and well under half the time of a full one, so on raw rate it dominates: pulsing shallow reps reaches any point target faster than real reps do. This was the exploit the tempo floor was introduced to prevent, and pricing half reps re-opens it.

What makes it acceptable is the per-session cap (ADR-0004). Pulsing gets a user to their own goal sooner and earns nothing beyond it, so the exploit is bounded and self-defeating — the only person shortchanged is the one doing it. That is the same posture as the vision doc's client-authoritative scoring decision: at friends-only stakes, an exploit that costs the exploiter more than it gains is not worth engineering against.

Revisit if the stakes widen — global leaderboards would make bounded self-cheating profitable in a way it isn't now.
