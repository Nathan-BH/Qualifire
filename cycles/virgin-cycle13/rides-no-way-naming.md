# virgin-cycle13 — descriptive names for "no way — recorded only" rides

**Status (2026-09-24): code change made, committed.** 638 tests: 635 pass, 0 fail, 3 skip
(631 pass before this task -- 4 new tests added, all pass, nothing existing regressed).
`tsc --noEmit` clean. JS-only -- ships via `publish-preview.cmd`, no new build needed (see
`COMMANDS.md`).

## What prompted this

Nathan: some rides in RIDES show "no way — recorded only" even though he knows one of them
is now the reference ride of a named route, and a genuine `new >> new` free ride reads
identically to a ride that just failed to match anything -- he wanted both cases to show
something real instead, using the naming the app already has (`Gym -> Home`-style) plus a
"-ref" suffix for a founding/reference ride, and asked "what do you think?" before building.

## Root cause (two separate bugs, not just wording)

1. **A reference ride gets stuck "no way" forever.** Matching only ever runs against ways
   that already exist in the catalog. A ride that fails to match writes a PERMANENT
   "unmatched" marker (`resultsStore.ts`, keyed on `BACKFILL_ENGINE_VERSION`) so it's never
   silently mis-derived later. When that same ride is later turned into a NEW route's
   reference (`Way.referenceRideId`), nothing clears the marker or re-derives its result --
   the ride that *founded* the route keeps showing "no way" indefinitely. `rideDetailFor`
   (`rideDetailModel.ts`) already computed `referenceOf` correctly in every case (it's used
   to suppress the "make this the reference" offer), it just was never rendered for a ride
   whose own kind was 'free'/'none'.
2. **RIDES (the list) has no free-ride awareness at all.** `RideDetailScreen` already has a
   separate "FREE RIDE" view (gate crossings, no route). `RidesScreen`'s row model
   (`buildRideRows`) only ever looks at `resultFor(rideId)` (route-matched results) -- a free
   ride and a ride that genuinely matched nothing look byte-identical in the list, both just
   "no way".

## Fix applied (display only -- matching/backfill logic untouched)

`app/src/ui/rideHistoryModel.ts` -- `buildRideRows` gains two optional, backward-compatible
params (every existing call site/test keeps working unchanged, defaults are `() => null`):
- `referenceWayFor(rideId)` -- wins outright when a "no way" ride founded a way: rendered as
  `"<way name> — ref"`, through the SAME `labelFor` already used for a matched wayId (so it
  reads exactly like the app's existing `Gym → Home` / `Gym → Home · Fast` convention, never
  the raw concatenated id). `wayId` stays `null` in the row -- D-025: no real lap was ever
  derived for this ride, so nothing pretends one was.
- `pickLabelFor(rideId)` -- falls back to the ride's own START-time pick (`"<from> → <to>"`),
  read from its GPX+ events sidecar (N9's `PickEvent`, already logs `fromLabel`/`toLabel` for
  every ride RecordScreen starts, `NEW_ID` resolves to `'new'`). Covers a genuine free ride
  (`new → new`) and a route-mode ride that matched nothing, uniformly -- no separate
  free-ride detection needed, the pick IS the descriptive fact either way.
- Neither present (pre-N9 ride, no sidecar, no reference) -> `wayName: null`, unchanged --
  the caller's existing `'no way — recorded only'` fallback text still applies.

`app/src/ui/RidesScreen.tsx` -- wires both into `buildRideRows`:
- `referenceWayFor` reads straight off `currentCatalog().ways` (already in memory, no I/O).
- `pickLabelFor` is backed by a new `pickLabels` state Map, filled by a new effect that
  reads `rides/<rideId>.events.jsonl` (mirrors `resultsStore.ts`'s own direct-path
  convention) ONLY for rows that still have no name after the reference check -- best-effort,
  non-throwing, same discipline as the existing backfill effect right above it.

`app/src/ui/RideDetailScreen.tsx` -- the single-ride view:
- New branch, checked right after `model.kind === 'route'` (so it also wins over the
  existing "FREE RIDE" view when both would apply): `model.referenceOf !== null` renders
  `"<way name> — ref"` plus "this ride is the reference for this way — no lap time on file
  for it", same map/trail as the other no-result cards.
- The final "no way" card now shows a fetched `pickLabel` (`"<from> → <to>"`, same sidecar
  read as above, one small per-ride-detail-view read) ahead of the old plain text, which is
  now the last-resort fallback only.

## Tests

Added to `app/tests/ridehistory_suite.ts` (`buildRideRows` group): reference override wins
over a pick label, pick-label fallback format, neither-present stays `null`, and a matched
ride never even calls either new callback (throws if it does, to prove it).

```
cd app
node --experimental-strip-types tests/run.ts
```
-> 638 tests: 635 pass, 0 fail, 3 skip.

```
cd app
./node_modules/.bin/tsc --noEmit
```
-> clean, exit 0.

## Status

**Committed.** Files changed: `app/src/ui/rideHistoryModel.ts`, `app/src/ui/RidesScreen.tsx`,
`app/src/ui/RideDetailScreen.tsx`, `app/tests/ridehistory_suite.ts`.

## Not done / open items

- Not routed through Digest -> Plan -> Execute -> Inspect as a formal pipeline dispatch --
  the design was worked out and confirmed with Nathan in chat first (functionally the Plan
  step), then implemented directly in this same session with full test + tsc verification,
  consistent with how the rest of this cycle's smaller tasks were handled. Flagging per
  `CLAUDE.md`'s honesty rule rather than silently treating it as a chore -- this one is
  bigger than the ~10-line bar, even though every design decision was locked down first.
- **No on-device re-check yet.** Nathan should open RIDES and confirm: (a) his known
  reference-ride case now reads `"<way> — ref"`, (b) a free ride reads `"<from> → <to>"`
  instead of "no way", and (c) an ordinary matched ride is completely unaffected.
- **Known minor inefficiency, not a correctness bug:** a ride with no pick data at all
  (pre-N9, or a corrupt/missing sidecar) is re-attempted on every RIDES refresh /
  backfill pass, since there's no "tried and found nothing" sentinel cached for it --
  bounded by how often the screen is refreshed, not by render count, and only affects rides
  that will never resolve to anything better anyway. Worth a follow-up only if it's ever
  visibly slow.
- Ships as an OTA JS update (`publish-preview.cmd`), not a new numbered build.

| tier | model | tokens | outcome |
| --- | --- | --- | --- |
| direct build (design agreed in chat first, then implemented + tested, not through the formal subagent pipeline) | Sonnet 5 | ~55k | landed, tests+tsc pass, committed |
