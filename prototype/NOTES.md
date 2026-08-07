# Prototype — throwaway

**Question:** what should Home, the post-set summary, and the challenge screen look like, now that the economy from `docs/adr/` needs to be legible to a user?

**Run:** `cd prototype && npm run dev` → http://localhost:5173

`?screen=home|summary|challenge` and `?variant=A|B|C`. Arrow keys: ← → variants, ↑ ↓ screens. Nine variants in total.

Throwaway: no tests, no error handling, no persistence, mock data in `src/data.ts`. Delete once a direction is picked; rewrite the winner properly rather than promoting this code.

## Direction

Light, gradient-forward, rounded, game-register rather than fitness-register. Palette holds to white/grey/green/blue/yellow/orange with no purple. Baloo 2 for display and numerals, Figtree for UI.

**Signature element:** the Daily Budget renders as discrete **rep-blocks** rather than a smooth bar — tall for Full Reps, short for Half Reps. Reps are discrete valued events (ADR-0003), so the meter is too, and the half-rep economics become visible: shallow reps fill less of your day.

## Verdict — all three settled

**Home — A, Week dots.** Two motivational layers on one card: the running Streak total up top,
and a seven-day slate below the rule that starts fresh every Monday. The week gates nothing and
pays nothing; it exists so someone 4 days into a 200-day run still has a short thing to finish.
See the `Week` entry in `CONTEXT.md` — it is deliberately not the N-of-7 weekly streak that
ADR-0005 retired. Budget-first, card-deck, path, month-grid and streak-badge variants deleted.

**Summary — Celebration.** The rep-by-rep chart moved up into the hero, replacing the medal row;
the sheet below is purely a claim screen — Perfect Form indicator and the button, no rep data.
Receipt and standalone time-strip variants deleted.

**Challenge — Standings first.** Race track and chat-first deleted. The chat drawer opens over
the standings rather than teasing.

**Group chat is v1.1.** Kept in the prototype so the design exists when it's built, but out of the
v1 roadmap — a thread needs a messages store, realtime, moderation, reporting, and a push category.

## In-session — settled: Mirror

The camera feed with the pose read over it, plus the count and the budget filling. The vision doc
argued for audio-only, on the grounds that screen-watching causes cervical rotation — but that
assumed a phone beside or below the user. Standing in front, looking at it is looking forward.
Peripheral and live-meter variants deleted. See ADR-0013.

**The session runs at zero touches** (ADR-0014). Sets end when you leave the push-up position and
resume when you get back into it; the rest screen instructs rather than offering a button, because
the phone is four feet away and no mid-session button is reachable. Only ending the session needs a
tap, and by then walking over is natural.

Placement is now resolved and was genuinely ambiguous in Draft v1: **upright, in front, at floor
level, three to four feet away.** Flat on the floor films the ceiling.

## When to delete this

It has answered its question. It survives only as the visual reference for ticket-writing. Delete
it once the real Expo app has these screens, and rewrite them properly — this code was written
under prototype constraints.

## Superseded — round 1 variants

### Home / pre-session

| | Idea | The bet |
|---|---|---|
| A | **Budget first** | The number you have left is the whole screen. Everything else is a footnote. |
| B | **Card deck** | One tile per concern, scrollable. Most conventional, easiest to extend. |
| C | **Path** | The streak as ground covered, milestone visible ahead. Most game-like, least dense. |

All three surface the ADR-0011 case: 130 XP already spent on a morning free-form set, so only 320 is left before the user starts.

### Post-set summary

| | Idea | The bet |
|---|---|---|
| A | **Receipt** | Itemised and unglamorous. Shows its working, which is what a product built on trusting the count should do. |
| B | **Celebration** | Reward screen first, detail behind a tap. Most Duolingo, least honest. |
| C | **Time strip** | Every rep plotted in order. **The risk.** |

Variant C is the one to look at first. It plots all 59 reps of the set left to right, colour-coded, so the **Fatigue Point** (ADR-0008) and the moment the user dropped to knees (ADR-0001) are visible as *shape* rather than as numbers. It's the most product-specific screen here and the least like anything in a fitness app — the domain model made into a picture.

### Challenge + group chat

| | Idea | The bet |
|---|---|---|
| A | **Standings first** | Ranked list, per-day bars, chat behind a bottom drawer. |
| B | **Chat first** | The thread is the room; standings are a pinned scrollable strip. |
| C | **Race track** | Lanes toward the target, with chat and events merged into one feed. |

All three have to make ADR-0012 obvious: **Sam has the smallest budget on the board (180/day) and is winning.** Challenge Points are a share of your own budget, so finishing 180 counts the same as finishing 620. Each variant tries a different way of saying that — a footnote (A), the group explaining it in chat (B), or equal-length lanes (C).

## Open — decide before tickets

- **Group chat is not in the vision doc or any ADR.** It arrived with this prototype. It carries real scope: messages table, realtime, moderation, reporting, push. Decide v1 or v1.1.
- The in-session screen isn't prototyped. It's the strangest design problem in the product — a screen for someone who is not supposed to look at it — and it deserves its own pass.

## Verdict

_Not yet picked._ Fill in which variant won and why, then delete the losers and the switcher.
