# Bonuses sit outside the Session Cap, and Perfect Form is what makes priced half reps safe

XP earned from reps is capped at the user's Session Goal (ADR-0004). Bonuses are not: they are awarded for something other than reps, so there is nothing for the cap to bound. Two exist — the Milestone bonus on a named streak day, and the Perfect Form bonus for meeting the Session Goal without a single Half Rep.

A cap with exceptions is a suspicious shape, so the reason matters. The cap exists to stop volume paying. A bonus that pays for *doing the same work on a particular day*, or for *doing the same work better*, adds no volume — in the Perfect Form case it subtracts it.

## Perfect Form is the counterweight ADR-0003 was missing

Pricing Half Reps at 5 re-opened the pulsing exploit: shallow reps reach any XP target faster than real ones. The Session Cap bounds that exploit but does not discourage it.

Perfect Form does. Full Reps pay 10 and Half Reps pay 5, so a 500-point goal costs 50 full reps or 100 half ones — **perfect form is fewer, better reps** — and a session containing any Half Rep forfeits the bonus. Pulsing now costs money. The two decisions are load-bearing on each other and should be reversed together if either is reversed.

## Perfect Form is defined on depth, never on Variant

A session of knee reps at full depth qualifies. A session of standard reps that goes shallow does not. Defining it on Variant instead would make the bonus unearnable for users who don't do standard push-ups, which reintroduces exactly the mixed-ability gap ADR-0004 exists to close — through a side door, which is how that gap will keep trying to get back in.
