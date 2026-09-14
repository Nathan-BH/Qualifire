# virgin-cycle6 — Live self-racing (your past rides as dots on the live map)

**Status:** planning only. `BRIEF-live-self-racing.md` is written and execution-ready;
nothing has been executed, no code has changed, no commit exists for this cycle yet.
`QUESTIONS.md` holds three non-blocking calls Nathan can make after he has seen the
feature on a phone — none of them gates execution.

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

## Parts

| Part | File | Status |
|---|---|---|
| Design rulings + implementation brief | `BRIEF-live-self-racing.md` | Written 2026-09-14, execution-ready |
| Open calls for Nathan (non-blocking) | `QUESTIONS.md` | Written 2026-09-14, unanswered |
| Execution (Sonnet Execute → fresh Fable Inspect) | — | Not started |
| Outcomes table, commits, token readout | this file | Filled in when work lands |

## Headline design decisions (full reasoning in the brief's Rulings)

- A **self** = one specific past ride of this exact way, drawn from the ride's own stored
  GPS fixes, positioned by **elapsed time since its START-gate crossing** matched to the
  live ride's elapsed time since *its* START-gate crossing. Time, not distance: a dot
  ahead of you means that day's you was faster to here — the only reading that matches
  the sector colours.
- **Which rides:** exactly `ghostsFor(wayId)` — the same window, same `ranks()` filter,
  same cap of 9. No new counter, no new selection rule. Archive-seeded results (no ride
  file) can never be selfs; on `virgin` there are none anyway.
- **Not called "ghost".** In this codebase "ghost" already means an archive-seeded result
  (`TowerRow.ghost`, `source: 'archive'`). Everything new is named *self*.
- **Visual starting point (adjustable by eye):** small translucent dots for selfs, the
  window-best self in purple ("the one to beat"), rider dot unchanged and always on top.
  No labels, no gap text — the live pane's "no benchmark near the clock" rule stands.
- **Ground-rule change:** STATE.md's "reference line + own position only" becomes
  "+ self dots"; the brief updates STATE.md and GLOSSARY.md accordingly.
- **Settings toggle** `selfDots` (default on), beside the existing `liveMap` /
  `sectorColours` toggles.

## Outcomes (filled in once landed)

| Item | Outcome |
|---|---|
| `app/src/ui/selfRaceModel.ts` (pure) + `tests/selfrace_suite.ts` | — |
| Self-track loader (ride file → START/FINISH crossing + decimated fixes) | — |
| `LiveEngineState.startGateT` (additive) | — |
| `WayMapView` `selfs` prop, MapLibre rung | — |
| `RecordScreen` wiring + `selfDots` setting | — |
| STATE.md / GLOSSARY.md / OPEN-ITEMS.md updates | — |
| On-device 0 → 1 → 2 … → 9 progression (Nathan) | — |

## Commits (filled in once landed)

_None yet._

## Verification (to be recorded)

- `cd app && node --experimental-strip-types tests/run.ts` → must be zero FAIL (baseline
  at cycle open: 560 tests, 557 pass, 0 fail, 3 skip per STATE.md — the executor records
  the actual number at start).
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0.

## Known limits accepted for v1 (so nobody re-litigates them mid-execution)

- Selfs are positioned by **raw wall-clock elapsed** even when SETTINGS → Timing is set
  to moving time. A dot is where past-you physically was at that elapsed time; pausing
  nine dots whenever the live rider stops is a later refinement (see `QUESTIONS.md` Q3).
- No off-screen indicator. The live map is a tight heading-up crop; a self far ahead or
  behind is simply off-screen. Revisit after Nathan has seen it.
- The PNG map rung does not draw selfs (same accepted degradation as `sectorColours`).
- No GPS simulator exists in the app and this cycle does not build one: the headless
  suite proves the model, the on-device progression is Nathan's to ride.
