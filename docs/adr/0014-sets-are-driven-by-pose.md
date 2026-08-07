# Sets and rest are driven by pose, not by touch

A Set ends when the user leaves the push-up position — shoulders rise clear of the Hand Plane and stay there — and the next one begins when they get back into it and do a rep. Nothing is tapped. The only control that requires touching the phone is ending the whole session.

The constraint that forces this is physical and was easy to miss: **the phone is three or four feet away.** Every mid-session control the vision doc implied — a rest button, a set boundary, a pause — would require crawling to the phone and back. A button nobody can reach is not an affordance.

Pose is the channel that is already open. The camera is watching continuously, and leaving the push-up position is one of the least ambiguous things it will ever see: it is a large, sustained, whole-body change, not a subtle threshold. It is also simply what people do at the end of a set, so the app is reading an existing behaviour rather than teaching a new one.

A rep timeout was the obvious alternative and was rejected. It would cut off a user grinding out slow reps near failure — the exact moment the product is trying to reward — and it would have to be tuned against a rep cadence that varies by a factor of three between users.

## Consequences

- The rest screen instructs rather than offers. There is no "Next set" button to press because pressing it would require walking over, and the instruction is "get back into position."
- A whole multi-set session runs at zero touches from "Start counting" to the walk over at the end.
- Ending the session keeps its explicit tap, because ending is the one moment the user genuinely wants the screen — the claim screen is there, and walking over is natural once the work is done. A prolonged absence of any detected pose ends and banks the session anyway, so a forgotten session cannot leave the camera running.
- "Leaving the push-up position" needs a definition tight enough not to fire when someone shakes out a wrist mid-set, and loose enough to fire when they collapse onto their forearms. That threshold is tuning work alongside the depth thresholds.
- Set boundaries become detector output rather than user input, which means the per-set breakdown in the summary is only as good as this classification.
