# One daily rep-XP budget, shared by prescribed and free-form work

Rep XP is bounded per *day*, not per session. The day's budget equals the user's Session Goal and is spent across every session they do — prescribed or free-form, one session or five. This supersedes the per-session framing in ADR-0004; the mechanism and the reasoning are unchanged, only the window is.

Free-form logging needed a defined score and neither obvious answer worked. Paying free-form reps on their own budget makes free-form a second earning channel bounded only by the Daily Cap, which reopens volume-pays through the exact door ADR-0007 identified as the sharpest remaining edge. Paying nothing makes free-form decorative, and tells a user who just did real work that it didn't count — the demoralising pattern this design has avoided everywhere else.

A shared daily budget gives free-form everything that matters. The reps count, they appear in history, they hold the Streak, and they pay — right up until the day's budget is spent, at which point nothing pays, which is the correct answer under the fourth design principle.

## Consequences

- "Session Cap" is retired as a term; the glossary calls it the Daily Budget. The distinction matters in code, because the ledger is keyed on the day rather than the session.
- A user who does a hard free-form session in the morning will find their prescribed session pays nothing that evening. That needs to be visible before they start, not discovered afterwards — the budget's remaining balance belongs on the pre-session screen.
- Bonuses (ADR-0006) still sit outside the budget, so a Perfect Form or Milestone bonus pays even on a day the budget is spent.
- The separate Daily Cap from ADR-0004 is retired. It existed as a backstop over free-form logging, and the Daily Budget subsumes it at a tighter bound — the user's own Session Goal rather than a flat 1,000 XP. ADR-0007's observation that "the Daily Cap is the only thing watching free-form" no longer holds; free-form is now bounded by the same number as everything else.
