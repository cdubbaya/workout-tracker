# Challenges score in share of your own daily budget

A challenge is scored in Challenge Points, where earning your full Daily Budget on a given day is worth 100 regardless of what that budget is. Daily-format challenges set a share to hit ("80% of your goal, 5 of 7 days"); cumulative ones set a total ("first to 1,000"). Absolute XP targets are not offered.

Absolute targets are not merely unfair here, they are unsatisfiable. Rep XP is capped at the user's own Session Goal (ADR-0004, ADR-0011), so a challenge demanding 500 XP a day cannot be completed by a participant whose goal is 300 — the budget declines to pay them however many push-ups they do. Cumulative targets fail the same way, more slowly and less visibly: "first to 10,000" is thirty-three days of work at a 300 budget and seventeen at 600, so the winner is chosen by calibration rather than by effort.

This is the third time the same failure has tried to enter the design — first as movement-difficulty weighting, then as a Variant-defined Perfect Form bonus, now as challenge configuration. The general rule is worth stating so it can be checked against future features: **any comparison between users must be denominated in each user's own capacity.** Absolute quantities of work are never comparable across people in this product.

## Bonuses in challenge standings

Perfect Form counts; Milestone does not.

Perfect Form is earned inside the challenge window by holding depth, so counting it rewards exactly the behaviour a challenge should reward. Milestone bonuses fire on day 7, 30, or 90 of a Streak — entirely determined by history predating the challenge — so a participant who happens to cross day 30 mid-challenge would bank a lead nobody else could answer. Leaving the choice to the challenge creator was considered and rejected for the same reason: a creator who knows they are near a milestone would be choosing their own advantage.
