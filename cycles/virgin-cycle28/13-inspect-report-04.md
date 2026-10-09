# Inspect report: brief 04 (RECORD `new` pill + "Original"), virgin-cycle28

Inspector: fresh-context Opus, 2026-10-09. Static only (no device). Read-only on app code; scratch logs in `safe_to_delete/insp04-*.log`.

## Verdict: PASS WITH NOTES

Safe to ship OTA (JS only)? Yes: no hunk under app/modules, app.json, app.config.js, package.json, eas.json.

## Commands run (results)

- `GIT_OPTIONAL_LOCKS=0 git status --short` / `git diff --stat`: 19 modified files; brief 04's six are routeCreation.ts (+13/-1), waySpecs.ts (+7), recordFlow.ts (+17), RecordScreen.tsx (+40/-?), recordflow_suite.ts, routecreation_suite.ts. The other 13 belong to 01-02 / 03 (their executor reports' file lists); brief 01-02 and 03 did not touch any brief-04 file.
- `cd app && node --experimental-strip-types tests/run.ts`: exit 0, **980 tests: 977 pass, 0 fail, 3 skip** (= executor's baseline 975 + 2). Both new tests PASS (log lines 350, 872). No UNLISTED/STALE lines.
- `cd app && ./node_modules/.bin/tsc --noEmit`: **exit 0**, empty output.
- `git diff -- app/tests/ui-strings.allow.json`: only brief 03's entry `src/ui/CatalogDetailScreen.tsx | text | "rename way"` (since 2026-10-09, by "Sonnet execute, virgin-cycle28 brief 03"). Nothing added/edited/removed by brief 04: matches ledger.
- `git diff --stat -- app/src/live app/src/location app/src/ui/routeNamingCard.tsx app/src/store/routeFromRide.ts app/modules app/app.json app/app.config.js app/package.json app/eas.json`: empty. `git diff app/src/store/defaultWay.ts`: empty (defaultWayFor untouched).
- `grep -rn "'Original'\|\"Original\"" app/src`: only `src/store/waySpecs.ts:22` (ORIGINAL_SPEC_LABEL).
- `git diff -U0` on both suites: only removed line is the recordflow import line it extends; no assertion loosened. WP-G 2 (seed-owned way) unchanged and passing.

## Behaviour checks (against Nathan 4, 4b-4e and brief)

1. Every brief anchor/replacement present verbatim (RecordScreen.tsx:39, 307-308, 317-321, 833-834, 1065-1066, 1186-1189, 1206-1213, 1656-1683; recordFlow.ts:178-193; waySpecs.ts:17-22; routeCreation.ts:39, 433-447).
2. Never auto-selected: `newWayRouteId` starts null (RecordScreen.tsx:321); the only non-null setter is the pill's `toggleNewWay` (1209); 5 `setNewWayRouteId(null)` (sport switch 308, ride end 834, discard 1066, both way-pill taps 1664/1675). Mount, sport switch: off. A different pair: `newWayOn` keyed on route id, so reads off (recordFlow.ts:191-193).
3. Toggle: second tap returns null (`toggleNewWay`); both on and off clear `wayPick`, so off = `defaultWayFor(routeWays)` (most-ridden), not the last tapped way. Selecting a way pill clears `new`.
4. One-way route: `showWhichWay(1)` true; `hasSpecs && length > 1` false, so flat row `<way> | new` even with specs. Spec layout: pill in row 0 only, deeper rows filtered while on, option pills not lit while on (`o.on && !newOn`).
5. Free ride: `pickedWay` null when on (1189) -> `startTracking({ wayPick: null })` (731) -> engine.ts:271-290 builds NO candidate (no route detection since cycle21), `setRideWayHint(null)` -> `liveMapOverlayFor` showTrail true (recordFlow.ts:81-83). pickSource logs 'none'. Armed title has no variant (1301). A picked known way reaches startTracking byte-identically (lines 726/731 unchanged). Consistent with cycle21: START pick stays the absolute reference.
6. Save: both RECORD card (RecordScreen.tsx:951) and ride-detail offer (RideDetailScreen.tsx:279) go through `createRouteFromDraft` -> `buildRouteCreationCatalog(userCatalog(), ...)` (routeFromRide.ts:243), so the relabel applies to both. existingRouteId comes from the ride's start/end discs (routeCreation.ts:281, 291); matchedWayId null -> `namingOfferMode` 'card'. New way needs its own specifier: with the old way plain, empty specs hit `findWayWithSpecs` (card disables ADD; RecordScreen.tsx:940 / RideDetailScreen.tsx:273 refuse). Relabel only when own route + exactly one sibling + plain + new specs not sameSpecs(['Original']) (case-insensitive); only `specs` changes on the old way (test asserts refLineId/gateSetVersion/routeId). Ride records keep wayId only, nothing rewritten. Merged catalog validates (tested).
7. Brief 03 interaction: a renamed sole way (has specs) is not relabelled (test 'named sole way keeps its name'). After relabel, renameWay can rename "Original" (non-empty), and cannot empty it while there are 2 ways (03's sole-way rule). This is consistent.
8. Mutate-check (reasoned, tree not modified): revert routeCreation.ts relabel -> `old specs` assert fails (routecreation new test) and the WP-G 1 added assert fails. Seed `useState<string|null>('x')` or drop a reset -> recordflow test's exact-string / count-of-5 asserts fail. Revert to `routeWays.length > 1` -> 'one-way routes show the block' fails. The pure helpers' asserts fail on any logic flip.
9. Text: rider-visible strings are `new` (already allow-listed for RecordScreen.tsx|text) and `Original` (src/store, outside the scanner). Both <=40 chars, no em dash, no banner.
10. JSX: `newOn` (1188) declared before `newWayPill` (1208) and the JSX; `newWayPill` is a plain function, not a hook; no new hook added after an early return; keys unique (`~new` vs `${depth}:${label}` / `r.id`).

## Findings

1. MINOR (behaviour, ask Nathan): `new` is remembered per pair within one setup session. Tap `new` on Home>Station, switch GOING TO to Work, then back to Station: `new` is lit again without a fresh tap (RecordScreen.tsx:291 `pickTo` and :284 `pickFrom` do not clear it; same in auto mode if GPS from-detection drifts away and back). It is not a default (only the rider's earlier tap), and it mirrors how `wayPick` already persists, but it could surprise against "never selected unless I tap it". Minimal fix if Nathan wants it: add `setNewWayRouteId(null)` to `pickFrom`/`pickTo` (and update the count-of-5 assert to 7).
2. MINOR (test strength): the RecordScreen half of the recordflow test is source-string pinning (exact literals and call counts). It catches reverts but cannot catch a render-level regression (for example a pill lit wrongly in spec layout). It is acceptable under this repo's no-render test setup. Just noting it.
3. NIT: routecreation_suite.ts:41 the new import sits after a blank line, directly above `const LAT0`, apart from the import block. Cosmetic.
4. NOTE (no defect): if the new way's specs are `Original`, the old way stays plain and the route then reads `plain | Original`. This is per brief, and validation passes.

## Needs a device

- One-way route shows `WHICH WAY TODAY?` with `<way> | new`; `new` toggles on/off and off restores the most-ridden way; on a 2+ way spec route, `new` sits at the end of row 0 and deeper rows hide.
- A `new` ride on Home>Station: no reference line, live trail drawn, no off-route marks; after STOP, the card offers "New way on Home → Station" with ADD disabled until a specifier is typed. Starting outside the start disc gives a brand-new-route card instead (existing draft logic).
- After saving, the old plain way reads "Original" in RECORD pills, CatalogDetail and ride history. Check that "Original" fits in pills (Nathan 4e: "a bit long").
