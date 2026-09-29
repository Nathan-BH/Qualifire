# virgin-cycle17 — 3 briefs landed (2026-09-29)

Nathan reviewed cycle16's landed work the same session and gave three follow-up pieces of
feedback about the DEMO tab not reflecting reality, fed mid-turn while a coordinator agent
was already digesting the first two. Each went through the full Digest -> Fable Plan
pipeline (not chores — each required real investigation into what the DEMO mock data does
versus what the real RECORD flow does), then one Sonnet executor pass covering all three,
then one Opus Inspect pass, per Nathan's now-standing instruction to minimize agent
spawning.

## Brief index

| # | file | idea | status |
| --- | --- | --- | --- |
| 01 | `01-demo-end-mark-forward.md` | DEMO's post-ride mark still played reversed (cycle15 brief 15 only fixed RECORD's copy) | **landed** |
| 02 | `02-demo-tenth-ride-no-card.md` | DEMO's TENTH ride always showed the "new way?" card; real app shows no card for a well-established route | **landed** |
| 03 | `03-naming-card-skip-copy.md` | "no — it was Home->Work" skip-button copy replaced with "keep it as Home->Work" | **landed** |

## How it was run

Two Haiku Digest passes (one covering feedback 1+2, one covering the mid-turn skip-copy
feedback once it arrived) read the current DEMO code, the real RECORD-flow equivalents, and
every prior brief these ideas referenced (cycle15's "logo forward on stop", cycle11's
"demo tenth-ride reveal", cycle15's "route confirm redesign"). One Fable Plan pass designed
all three fixes and wrote all three briefs to this folder in one dispatch. One Sonnet
executor implemented all three in one pass — 01 before 02 since both touch
`DemoScreen.tsx` — with zero stop-on-ambiguity escalations. One Opus Inspect pass then
adversarially checked brief 02 in particular (a real behavioral change, not a mechanical
edit) against the actual RECORD-screen flow it claims to mirror. Landed as `1eca811`.

## What changed

**Brief 01** deleted the stray `reverse` prop on DEMO's own `LaunchAnimation` render
(`DemoScreen.tsx`) — RecordScreen.tsx already drew its end-of-ride mark forward since
cycle15 brief 15, but that brief's edit never reached DEMO's separate render site.

**Brief 02** is the substantive one: DEMO's SECOND and TENTH ride scenarios both
unconditionally showed the WP-G "new way on this route?" card after the ranking reveal,
using fixed mock data. In the real app, that card only appears when a ride's path didn't
match any of a route's known ways — a ride that simply repeats a well-established route
gets no card at all, just a dim `not <way>?` link during the reveal and the end mark
playing on its own after a hold. TENTH now mirrors that quiet-offer flow, ported by value
from `RecordScreen.tsx`'s `postRevealRef`/`onRevealPlayed`/`onNotThisWay`. SECOND keeps
showing the card (still plausible that early, and cycle11's original Fable ruling wanted at
least one no-tap route to ADD WAY in the demo for instructional value).

**Brief 03** changed one string in `routeNamingCard.tsx`: the WP-G card's skip button read
`no — it was ${matchedWayLabel}` (Nathan: "bullshit" copy); it's now
`keep it as ${matchedWayLabel}` — truthful to what skip actually does (nothing new is
saved; the ride was already scored as that way before the card appeared) while landing
close to Nathan's own suggested "save as X" shape. The other two skip-text branches
(`skip — keep it as a plain ride`) were untouched, since Nathan didn't complain about those.

## Opus Inspect findings, in full

- **Defect, blocking (fixed, `1eca811`):** DEMO uniquely allows hardware back during the
  ending screen (RecordScreen blocks it). The tower's `onPlayed` callback can still fire
  after `exitToIdle` unmounts it — React Native detaches the Animated value rather than
  dropping the callback, so it completes with `finished: false` instead of not firing at
  all. Combined with brief 02's new 1.5s post-reveal hold timer, backing out of a TENTH run
  during the reveal could leave a stale timer that fires the end mark while the screen was
  already idle — hiding the tab bar and corrupting the next demo run. Fixed with a
  `phaseRef` guard checked both where `onRevealPlayed` is called and again inside its
  `setTimeout`, plus a defensive `postRevealRef` reset in `exitToIdle`.
- **Non-blocking (logged, `OPEN-ITEMS.md`):** TENTH's no-tap path never actually shows the
  cycle14 RESULTS-plot preview brief 02's own Decision 4 called "invisible in practice" —
  it flashes briefly during the end mark's fade-out before being swept away. Nathan's call:
  hide it fully to match the real screen exactly, or add a short hold to make it genuinely
  visible.
- **Non-blocking (logged, `OPEN-ITEMS.md`):** the new `demoPostReveal` test only pins the
  trivial mode-to-outcome mapping, not the actual link/card/mark ordering logic (which
  lives untested in component code) — a follow-up could have DEMO's slot choice reuse
  `recordFlow.ts`'s already-tested `endingSlotFor` instead of parallel logic. Also flagged:
  ~14 pre-existing stale "reversed"-mark comments in `RecordScreen.tsx`, predating this
  cycle (that file's diff here is empty) — cosmetic, unrelated to cycle17's own scope.

## Test/type-check trend

734 pass / 0 fail / 3 skip (end of cycle16) -> 735 pass / 0 fail / 3 skip (brief 02 adds
one test to `demo_suite.ts`). `tsc --noEmit` stayed clean (exit 0) throughout, including
after the Inspect-driven fix.
