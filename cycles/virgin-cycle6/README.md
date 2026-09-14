# virgin-cycle6 — Live self-racing, plus a second small app brief (gates render white)

**Status (2026-09-14, end of session): built and independently inspected twice; nothing
committed to git yet — `device_bash` (a real shell) was unreachable this entire session, so
`tsc`, the test suite and `git commit` all need Nathan to run them on his own PC.** See
`OPEN-ITEMS.md` in this folder for the exact PowerShell (one block, in order) and every
judgment call left for his eye. `QUESTIONS.md` has been answered and folded in
(`BRIEF-self-racing-followup.md`).

## Three briefs in this folder

| Brief | What | Status |
|---|---|---|
| `BRIEF-live-self-racing.md` | Live self-racing — past rides as dots on the map (this cycle's original scope) | **built + inspected** (4 real defects found and fixed by Inspect) |
| `BRIEF-self-racing-followup.md` | Answers QUESTIONS.md Q1–Q3: three-tier dot colours, stacking, opacity, live `P`-position readout | **built + inspected** (2 test-coverage gaps found and closed by Inspect; zero production defects) |
| `BRIEF-gates-white.md` | Gate markers render white instead of a tier/accent colour | **built directly by the coordinator** (small, fully-resolved after a Plan/Fable pass found the original brief's stop condition was based on a retired code path — see Judgment calls in `OPEN-ITEMS.md`) |

## What this cycle is for

Nathan (2026-09-14): "I remember in the main branch we had the idea of having all your
previous 'selfs' as a dot during the race mode so you could race them live on screen. I
would like to see this implemented in the virgin app as well. Since nothing is pre-seeded,
you can incrementally race against more selfs as you clock more rides on that route. For
example after the reference ride you have now one self to race against, then 2, etc; this
is also a great way to test this feature out without directly having 9 selfs dots racing at
the same time on the screen."

So: during a route ride, every ride in the way's existing comparison window (the same
"9 most recent previous rides" window that already drives sector colours and ranks —
`colourModel.ts`'s `ghostsFor`) is replayed as a small moving dot along the route,
positioned by elapsed lap time since the START gate, next to the rider's own blue dot.
Ride 1 (the reference) shows no selfs; ride 2 races one; ride 3 races two; from ride 11 on
it is always nine. The incremental unlock is not a separate feature — it falls out of
reusing the window as-is on a blank install, which is exactly why it doubles as the test
ramp Nathan describes.

## Headline design decisions (full reasoning in the briefs' Rulings)

- A **self** = one specific past ride of this exact way, drawn from the ride's own stored
  GPS fixes, positioned by **elapsed time since its START-gate crossing** matched to the
  live ride's elapsed time since *its* START-gate crossing. Time, not distance.
- **Which rides:** exactly `ghostsFor(wayId)` — the same window, same `ranks()` filter,
  same cap of 9. No new counter, no new selection rule.
- **Not called "ghost".** Everything new is named *self*.
- **Visual (final, post-follow-up):** three tiers by the app's own tier rule
  (`colourModel.ts` `tierFor`) — purple = window-best, green = below the window's mean lap
  time, yellow = at/above it. All selfs at 0.70 opacity (0.35 once finished), always under
  the rider's 1.0. Selfs stack P1-on-top via MapLibre `circle-sort-key`; the rider paints
  above all selfs (mount order). A live position `P4` renders on the map pane's context row
  once you cross START, counting selfs still ahead of you by route chainage — a fact, not a
  benchmark, so the "no target/delta near the clock" rule stands.
- **Ground-rule change:** STATE.md's "reference line + own position only" becomes
  "+ self dots, three tiers, live P".
- **Settings toggle** `selfDots` (default on).
- **Gates:** render plain `colors.white` (new structural-marker token) instead of the old
  neutral-yellow fallback — the per-gate tier-colour channel this would have collided with
  was already retired by Nathan's own rule in cycle2 (WP-E), so nothing is lost.

## Outcomes (landed, not yet committed)

| Item | Outcome |
|---|---|
| `app/src/ui/selfRaceModel.ts` (pure) + `tests/selfrace_suite.ts` | Built; tiers/rank/sortKey/chainage/live-position added in follow-up; 26 new test cases, all passing (measured: 583/586, 3 pre-existing skip) |
| Self-track loader (ride file → START/FINISH crossing + decimated fixes, now + per-fix chainage) | Built; alignment mutation-tested by Inspect |
| `LiveEngineState.startGateT` + `chainageM` (additive) | Built |
| `WayMapView` `selfs` layer — three-tier colour, `circle-sort-key` stacking, state-only opacity | Built |
| `RecordScreen` wiring + `selfDots` setting + `livePos` readout | Built |
| `LiveSectorPane` live `P` position on the context row | Built |
| Gate ticks render `colors.white` | Built directly (chore-sized, no subagent) |
| STATE.md / GLOSSARY.md / OPEN-ITEMS.md / this README updates | Done |
| On-device 0 → 1 → 2 … → 9 progression, colours, stacking, P-number (Nathan) | **Pending — needs his PC/phone** |
| Task 0 prior-art `git grep` against `main` | **Never ran — no shell this session; first thing in `OPEN-ITEMS.md`'s script** |

## Commits

_None yet — see `OPEN-ITEMS.md` for the exact commands and the prepared message
(`COMMIT-MSG-live-self-racing.txt`, already covers base + inspect fixes + follow-up +
gates-white in one)._

## Verification

Measured this session (fresh-Fable sandbox, not the PC — Nathan's `tsc`/test run on his own
machine is still the authority):
- Test suite: **586 tests, 583 pass, 0 fail, 3 skip** (cycle-open baseline 560/557/0/3; +26
  all in `selfrace_suite.ts`).
- `tsc --strict` over the full pure graph and the touched RN files (with RN/expo/maplibre
  typed as stubs): zero real type errors. The one thing this couldn't confirm is whether
  `circle-sort-key` type-checks against the real `@maplibre/maplibre-react-native` `Layer`
  prop types — high confidence (same pattern as 7 existing `layout={{...}}` uses in the same
  file) but not proven; Nathan's `tsc --noEmit` is the real check.

## Known limits accepted for v1

- Selfs are positioned by **raw wall-clock elapsed** even when SETTINGS → Timing is set to
  moving time. Q3 answered: no pause; PAUSE is not a pause (R11) — nothing needed building.
- No off-screen indicator; a self far ahead/behind is simply off-screen. Revisit after
  Nathan has seen it.
- The PNG map rung does not draw selfs (same accepted degradation as `sectorColours`); nor
  does it get the gates-white change (would be invisible against its light frame — left as
  the existing near-black casing colour, reported not fixed).
- No GPS simulator; the on-device progression is Nathan's to ride.
