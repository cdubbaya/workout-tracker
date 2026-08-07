# Variant is a property of a Rep, not of a session

The vision doc treats the movement Ladder as a placement — the user is "on" incline, knee, or standard, and the program moves them up it. We are rejecting that. Variant is classified per Rep, and a set that starts standard and drops to knee at failure is a legitimate, well-executed set rather than a degraded one.

The reason is that dropping the Variant at failure is how the movement is actually trained. Someone who presses standard reps to failure and then finishes the prescribed work on their knees has trained harder than someone who stopped, and an app that logs the second half as cheating, or as a demotion, teaches the wrong lesson at the exact moment the user is doing the right thing.

## Consequences

- The detector must classify Variant continuously during a set, not read it from a setting. Confidence will be poor for the knee/standard distinction at floor-level head-on placement, so the classification has to degrade gracefully rather than block counting.
- A session's rep total is a mixed bag of Variants. Anything that consumes rep counts — XP, challenges, program progression — has to say what it does with a mixed set.
- "Advancing the Ladder," which the vision doc calls the headline reward, no longer has a definition, because the user is not standing on a single rung. It has been retired: the movement progression is no longer a user-facing concept, and Variant now sets a Rep's value and nothing else. The headline reward is instead the **Level** track — an escalating XP threshold. A user who only ever does knee reps still climbs it, which is deliberate.
