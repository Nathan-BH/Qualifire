# exec-report-02 (virgin-cycle29 brief 02, snapshot probe) - Status: DONE (after ruling-02-escalation.md)

Suite: 990 tests, 987 pass, 0 fail, 3 skip (before: 982 / 979 / 0 / 3; +7 cardsnapshot_suite, +1 storage_suite memory-adapter case). tsc --noEmit: exit 0, exec-02-tsc.log empty.
Snapshotter (StaticMapImageManager) cannot run here: static checks only.

## Ruling applied (ruling-02-escalation.md)
- STOP 1: 9 allow-list entries appended via one python read-modify-write (sorted, round-trips); diff vs HEAD = 72 insertions, 0 deletions. All kind "literal", since 2026-10-10, by "Sonnet execute, virgin-cycle29 brief 02":
  - src/ui/wayMapLayers.ts: "gate-ticks", "gate-ticks-casing", "route-casing", "route-core", "sector-spans", "sector-spans-core", "trail-casing", "trail-core" - reason: "virgin-cycle29 02: MapLibre layer/source id of the card layer stack (same id as wayMapView.tsx), never shown as text"
  - src/ui/cardSnapshotQueue.ts: "mapsnaps/index.json" - reason: "virgin-cycle29 02: relative path of the snapshot cache index under the storage root, never shown as text"
- STOP 2: inserted `importFile: async () => {},` and `fileUri: (relPath) => 'memory://' + relPath,` after `deleteFile: async () => {},` in the throwingFs literals of tests/replay_suite.ts and tests/selfrace_suite.ts.
- Extra pin line added (probe modules do not import expo-file-system); comment added above ROUTE_CASING_PAINT in wayMapLayers.ts.
- Deviations (expo-file-system pin narrowed to src/storage, five `as never` paints, export rideTrails, gateSetVersion null, +8 tests) all CONFIRMED by the ruling. Brief 04 input: gateSetVersion into FeedCardModel.
- Touched set = brief 8.1 plus tests/ui-strings.allow.json, tests/replay_suite.ts, tests/selfrace_suite.ts.

Original stop report (now resolved) follows.

# exec-report-02 (virgin-cycle29 brief 02, snapshot probe) - (superseded) Status: STOPPED (implementation complete, two undecided calls block green)

All of sections 2-7 are written. Two checks fail for reasons the brief did not anticipate; per EXECUTOR-RULES I did not rule on them.

## STOP 1 - ui-strings scanner flags the brief's own literals (allow-list must stay byte-identical)
Suite: 990 tests, 986 pass, 1 fail, 3 skip; the single failure is the ui-strings test with 9 UNLISTED [literal] (not in any Visible-text table; brief section 10 says none):
- src/ui/cardSnapshotQueue.ts:25  "mapsnaps/index.json"
- src/ui/wayMapLayers.ts:36-41   "route-casing", "route-core", "trail-casing", "trail-core", "sector-spans-core", "sector-spans", "gate-ticks-casing", "gate-ticks"
Cause: tests/ui_strings_extract.ts Tier B treats any hyphen/slash literal in a value position as prose (single words like 'route'/'trail' pass; console.* args, Error() args, ===/!== operands and property NAMES are excluded). The brief mandates these literals (layer ids in cardLayerSpecs(), the index path) AND says "Code literals single-word only" AND allow-list byte-identical: contradictory.
Options for Fable to rule on: (a) allow-list entries (Nathan owns the file), (b) build ids without hyphen literals, e.g. a table of single words joined with a dash char, or object-key form `{ 'route-casing': ... }` (property names are excluded) mapped to specs, (c) another construction.
Note: the view's `<M.Layer id="route-casing">` JSX attributes are not flagged (NON_VISIBLE_ATTRS).

## STOP 2 - FsAdapter interface growth breaks two test files outside the brief's touch list
tsc errors (only remaining ones): tests/replay_suite.ts(408) and tests/selfrace_suite.ts(129): object literals typed `FsAdapter` (throwingFs) lack `importFile`/`fileUri`. Brief acceptance 1 forbids touching other files. Options: add the two stubs to those literals, or make the members optional in FsAdapter.

## Brief premise mismatch (resolved by me conservatively, please confirm) 
Test 7 asks that `from 'expo-file-system'` under src/ occurs once. It occurs twice: storage/expoFsAdapter.ts AND src/ui/themeContext.tsx (pre-existing, untouched). I narrowed my pin to src/storage (matches section 4 "only importer ... in storage/"). 

## Other deviations (mine)
1. tsc: `as const` paints with expression arrays are not assignable to maplibre Layer props (readonly tuple). Typed ROUTE_CASING_PAINT, ROUTE_CORE_PAINT, SECTOR_SPANS_PAINT, GATE_TICKS_CASING_PAINT, GATE_TICKS_PAINT `as never` (the brief allows as-never only where existing code casts; it had none). Runtime objects identical to the old inline ones.
2. activityCard.tsx: `rideTrails` is now `export const` (needed so the probe can peek plain-card trails per brief section 6). 
3. gateSetVersion in the probe request is null (not available on FeedCardModel; brief 04 should supply it).
4. Test count: 982 -> 990 (+7 cardsnapshot_suite, +1 storage_suite memory-adapter case; brief expected +7). Zero FAIL only once STOP 1 is ruled.

## Files touched by me
Modified: app/src/ui/{wayMapView.tsx (extraction, exports assetFor/MAP_STYLE_NIGHT/MAP_STYLE_DAY, CASING now imported, FAINT_OPACITY import dropped), activityCard.tsx (snapshotUri prop, Image swap, export rideTrails), RidesScreen.tsx (probe)}, app/src/storage/{fsAdapter.ts, expoFsAdapter.ts}, app/tests/{run.ts, waymap_suite.ts (faint pin now reads wayMapLayers.ts), storage_suite.ts}.
New: app/src/ui/{wayMapLayers.ts, cardSnapshotModel.ts, cardSnapshotQueue.ts}, app/tests/cardsnapshot_suite.ts, cycles/virgin-cycle29/exec-02-tsc.log (contains only the 2 STOP 2 errors).
ui-strings.allow.json md5 unchanged (0959f79d5f9eacea385e53375ddcaaca). No native/config file touched. No git add/commit.
Snapshotter (StaticMapImageManager) cannot run here: static checks only.

## For the Opus inspector
(a) paint objects in wayMapLayers.ts vs the old inline ones (diff wayMapView.tsx), (b) the probe only reachable via the title long-press; snapshotUri defaults undefined, (c) one createImage in flight (chain), (d) expoFsAdapter the only storage/ expo-file-system importer, (e) fitZoomFor/paddedBoundsFor tests use hand values computed independently.
OPEN-ITEMS line (once green): the section 9 on-device probe text, verbatim from the brief.


## Fixes after inspect-02 (ruling-02-inspect-fixes.md) - 2026-10-10
- M1: cardSnapshotModel.ts gained SNAPSHOT_TIMEOUT_MS (10000) and withTimeout; cardSnapshotQueue.ts wraps the one createImage in withTimeout(..., SNAPSHOT_TIMEOUT_MS) and imports both.
- M2: activityCard.tsx imports Credit and renders `<Credit rung="maplibre" locked={false} />` after the Image inside a fragment in the snapshot branch.
- m1: queue logs `console.log('[snap] hit', key)` on a cache hit. m2: RidesScreen.tsx `setProbeUri(null)` at the start of each probe run. m3: `const widthDp = Math.floor(winW)` used for fitZoomFor, request widthDp and paddedBoundsFor (winW stays in deps). m4: gate pin strengthened (`if (!idle) throw new Error('gated')`).
- Tests (tests/cardsnapshot_suite.ts): imports extended; pins edited (Credit over Image, gate, createImage under withTimeout); new withTimeout test.
- Files: src/ui/{cardSnapshotModel.ts, cardSnapshotQueue.ts, activityCard.tsx, RidesScreen.tsx}, tests/cardsnapshot_suite.ts. No new file; touched set unchanged. Allow-list diff still 72 insertions / 0 deletions (the 9 ruled entries).
- Counts: 991 tests, 988 pass, 0 fail, 3 skip. tsc exit 0, exec-02-tsc.log empty. No deviations.
- The snapshotter, the timeout path and the Credit overlay cannot be exercised here (static checks only).
- Amended section 9 probe line (verbatim from the brief):

## 9. On-device probe (Nathan; the GATE for brief 04; coordinator hands this as the OPEN-ITEMS line)
"virgin-cycle29 02 probe: ACTIVITIES, long-press the title 'Activities' (0.6 s): the FIRST card's map is replaced by a
snapshot picture of the same card; long-press again to go back. Compare both in night and day, with SETTINGS sector colours
on and off: line, casing, gate ticks, sector colours, framing, text labels, crispness. The small 'i' map-credit button sits
in the bottom-right corner on BOTH sides (it is drawn over the picture too, and tapping it opens the same sources card):
it is part of the comparison, not a difference. A single-frame flash of the frame colour at the moment of the swap is not a
difference. Timing: only the FIRST long-press per state on this install makes a picture (`[snap] made … ms` in the dev log);
a repeat shows the cached file (`[snap] hit`) and its speed does not count. If nothing appears within ~10 s the log shows
`[snap] failed … timeout`: report that as FAIL (snapshotter broken), not as slow. PASS = you cannot tell them apart in all
four states and the first picture per state appears within ~1.5 s. FAIL = report what differs (brief 04 is then not
executed; brief 01's fixes stand)."
