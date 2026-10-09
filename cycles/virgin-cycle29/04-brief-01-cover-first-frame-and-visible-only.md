# Brief 01 — map cover lifts on the first frame; ACTIVITIES mounts only visible cards (virgin-cycle29)

Written 2026-10-09 by the Plan tier (Fable) from the tree at HEAD `c93f406` (clean except `?? cycles/virgin-cycle28/`,
`?? cycles/virgin-cycle29/`). Baseline: `971 tests: 968 pass, 0 fail, 3 skip`, tsc clean.
Read `cycles/virgin-cycle29/EXECUTOR-RULES.md` first, then `/CLAUDE.md`, then this brief. Ruling: `03-fable-ruling.md` Q1, Q5, Q6.5.

## 0. Rules for this brief (binding)
- JS-only. No change under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`. No new dependency. OTA-safe.
- No `git add/commit/push`, no EAS build, no OTA publish. Delete nothing (`mv` into `safe_to_delete/`).
- STOP-ON-AMBIGUITY: any anchor that does not match by content, any undecided call, any check failing for a reason not
  anticipated here -> write the question verbatim to `cycles/virgin-cycle29/exec-report-01.md` and stop. Never guess.
- Rider-facing text: this brief adds, removes and moves NO visible string. `app/tests/ui-strings.allow.json` byte-identical.
  New literals in code must be single words (the scanner flags two-word literals).
- Nothing negative is ever shown to a rider. The cover stays a blank themed rectangle.
- Strip-only TypeScript (no `enum`, no parameter properties, no decorators).
- Do NOT touch: `GateAdjustScreen.tsx` (any text), `App.tsx` tab rendering, `mapStyleCache.ts`, `wayMapStyle.ts`, any engine/store file.

## 1. What Nathan sees and the verified cause
After c93f406 every map sits under a cover in `t.race.bg` (night: `colors.bg`, `theme.ts:115`) until
`onDidFinishLoadingStyle` AND `onDidFinishRenderingFrameFully` (every tile in view loaded) or 5000 ms. The "black screen"
on ACTIVITIES/RECORD IS that cover. Before c93f406 the same load time painted tiles progressively on the style's own
background, which Nathan never read as slow. The white flash was the native view's default clear colour BEFORE the style's
background layer painted; one rendered frame after `onDidFinishLoadingStyle` is enough to be past it.
Second cause: ACTIVITIES mounts 4-5 native maps at open (`itemVisiblePercentThreshold: 5` + `MAP_MOUNT_RADIUS = 1`).
Third (inspector minor 3): on a day/night flip with both styles cached, `wayMapView`/`catalogMapView` still mount the
native view twice (url rung, then patched) because the lazy `useState` runs only at mount and the `[styleUrl]` effect
sets the cached copy one render later.

## 2. Edits

### 2.1 `app/src/ui/mapCoverModel.ts` (whole file; keep the header comment, update it)
- Constant `MAP_COVER_TIMEOUT_MS = 5000` -> `2500`.
- Rename the input field `frameRendered` -> `firstFrame` in `MapCoverInput` and in `mapCoverLifts`:
  `return i.styleFailed || i.timedOut || (i.styleLoaded && i.firstFrame);`
- Header comment: replace the bullet "the style has loaded AND a frame has fully rendered (onDidFinishLoadingStyle +
  onDidFinishRenderingFrameFully)" with "the style has loaded AND one frame has rendered (onDidFinishLoadingStyle + the
  FIRST of onDidFinishRenderingFrame / onDidFinishRenderingFrameFully): after the style's own background layer has painted
  once there is no white left to hide, and the tiles then paint in progressively, as they did before the cover existed
  (virgin-cycle29 01, Nathan 2026-10-09: the cover waiting for all tiles read as a black screen)".

### 2.2 `app/src/ui/mapCover.tsx`
Current anchors (verify by content): line 36 `const seen = useMemo(() => ({ styleLoaded: false, frameRendered: false, lifted: false }), [key]);`,
line 39 `const [goneKey, setGoneKey] = useState<string | null>(null);`, lines 41-52 `lift`, 54-56 `decide`, 64-67 handlers + return.
- `seen` becomes `{ styleLoaded: false, firstFrame: false, lifted: false, gone: false }`.
- Inspector minor 1 fix (A->B->A missed cover): drop `goneKey` state; add `const [, bump] = useState(0);` and in `lift`
  replace both `setGoneKey(key)` with `seen.gone = true; bump((v) => v + 1);` (the reduce-motion branch sets it
  synchronously; the animation callback keeps its `if (keyRef.current === key)` guard). Return `covered: !seen.gone`.
  Because `seen` is re-created per key via `useMemo([key])`, an A->B->A flip gets a fresh opaque cover every time.
- `decide` passes `firstFrame: seen.firstFrame`.
- Handlers: keep `onStyleLoaded`; rename `onFrameFully` -> `onFirstFrame` (`seen.firstFrame = true; decide(false);`).
  `MapCoverState` field renamed accordingly. Header comment: "the caller wires `onFirstFrame` into BOTH
  onDidFinishRenderingFrame and onDidFinishRenderingFrameFully (whichever fires first lifts it; the handler is idempotent)".

### 2.3 `app/src/ui/wayMapView.tsx`
Anchors (verify by content; line numbers from HEAD):
- 769-770:
  `onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; cover.onStyleLoaded(); }}`
  `onDidFinishRenderingFrameFully={cover.onFrameFully}`
  -> keep the first line; replace the second with TWO props:
  `onDidFinishRenderingFrame={cover.onFirstFrame}`
  `onDidFinishRenderingFrameFully={cover.onFirstFrame}`
- 546-550 (fetch success): after `setPatchedStyles(rememberPatchedStyles({ ... }));` add `setStyleFailed(false);`
  (inspector minor 2: a recovered style gets a cover again instead of lifting at once on a stale `styleFailed`).
- 574-581 `mapStyleFor({ ... patched: patchedStyles?.url === styleUrl ? patchedStyles : null, ...})`:
  replace the `patched:` line with
  `patched: patchedStyles?.url === styleUrl ? patchedStyles : cachedPatchedStyles(styleUrl),`
  and update the comment above it: "...after a day/night flip the old one must not be used; the copies already cached
  for the NEW URL are used at once (virgin-cycle29 01: one native mount on a theme flip, not url -> patched)".
- Comment at 592-595 (`// virgin-cycle27 12: a cover ...until the style has loaded and a frame has fully rendered`):
  change "a frame has fully rendered" -> "one frame has rendered (virgin-cycle29 01)".

### 2.4 `app/src/ui/catalogMapView.tsx`
Same three edits at its anchors: 266-267 (events; add `onDidFinishRenderingFrame={cover.onFirstFrame}` and point
`...Fully` at `cover.onFirstFrame`), fetch success block ~143-148 (add `setStyleFailed(false);`), 162 `patched:` line
(-> `cachedPatchedStyles(styleUrl)` fallback), and the one-line comment at 177.

### 2.5 `app/src/ui/activityCard.tsx`
Line 39-40: `/** live maps = viewable blocks ± this many neighbours */ export const MAP_MOUNT_RADIUS = 1;` -> `= 0`, comment:
`/** live maps = exactly the viewable blocks (virgin-cycle29 01, Nathan 2026-10-09: a card map is a picture, nothing off-screen needs one) */`.

### 2.6 `app/src/ui/RidesScreen.tsx`
- Line 196 `const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 5, minimumViewTime: 0 }).current;` -> `40`.
- Lines 251-253: `windowSize={5}` -> `{3}`; `initialNumToRender={3}` -> `{2}`; `maxToRenderPerBatch={3}` unchanged.
- Add one comment line above `viewabilityConfig`: `// virgin-cycle29 01: 40 % visible before a card carries a live map; with 307 dp cards that is the two the rider sees, never a sliver.`

## 3. Tests
### 3.1 `app/tests/mapcover_suite.ts` (edit in place)
- Line 14 `frameRendered: false` -> `firstFrame: false`; line 17 and 18 likewise (`firstFrame: true`); message of 18:
  'style + first frame lifts'.
- Line 22: `assert(MAP_COVER_TIMEOUT_MS >= 1500 && MAP_COVER_TIMEOUT_MS <= 3000, 'bounded timeout, a safety net only');`
- Line 47: the stale-theme pin becomes
  `assert(s.includes('patched: patchedStyles?.url === styleUrl ? patchedStyles : cachedPatchedStyles(styleUrl),'), \`${f}: stale-theme guard intact, cached copies of the new URL used at once\`);`
- Line 57: replace with two asserts: `onDidFinishRenderingFrame={cover.onFirstFrame}` and `onDidFinishRenderingFrameFully={cover.onFirstFrame}` both present.
- Add to the same loop: `assert(/setPatchedStyles\(rememberPatchedStyles\(\{[\s\S]*?\}\)\);\s*setStyleFailed\(false\);/.test(s), \`${f}: a recovered style clears styleFailed\`);`
- Add a new test (A->B->A): source-pin that `mapCover.tsx` no longer contains `goneKey`, contains `gone: false` inside the
  `useMemo` object, and returns `covered: !seen.gone`.
### 3.2 `app/tests/waymap_suite.ts` line 425: same replacement of the `patched:` pin as 3.1 line 47.
### 3.3 `app/tests/feedmodel_suite.ts`: add to the `liveMapIndices` test (line 164-170) one source pin: `activityCard.tsx` contains
`export const MAP_MOUNT_RADIUS = 0;` and `RidesScreen.tsx` contains `itemVisiblePercentThreshold: 40`, `windowSize={3}`, `initialNumToRender={2}`.
(Use the suite's existing `src`/`fs` helper if present; otherwise `fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', f), 'utf8')`.)
Expected count: 972 tests (971 + 1 new), 0 fail.

## 4. Acceptance checks (all; report each)
1. `git status --short` before/after; `git diff --stat`. Touched: `mapCoverModel.ts`, `mapCover.tsx`, `wayMapView.tsx`,
   `catalogMapView.tsx`, `activityCard.tsx`, `RidesScreen.tsx`, `tests/mapcover_suite.ts`, `tests/waymap_suite.ts`,
   `tests/feedmodel_suite.ts`. Nothing else.
2. `cd app && node --experimental-strip-types tests/run.ts`: zero FAIL, 972 tests.
3. `cd app && ./node_modules/.bin/tsc --noEmit` exit 0 (`timeout_ms: 180000`, tee to `cycles/virgin-cycle29/exec-01-tsc.log`).
4. `grep -c "onFrameFully" app/src/ui/*.tsx` = 0; `grep -c "goneKey" app/src/ui/mapCover.tsx` = 0.
5. Allow-list byte-identical; no change outside `app/src/ui` + `app/tests`.
6. Say explicitly: native rendering not verifiable here.

## 5. On-device check (Nathan, after OTA; coordinator hands this as the OPEN-ITEMS line)
"virgin-cycle29 01: night + day: switching RECORD / ACTIVITIES / ROUTES shows the dark/light frame colour for a fraction of a
second, then the map with tiles filling in; no white flash; ACTIVITIES shows two cards with maps, a third gets its map when it
is 40 % on screen; a day/night flip restarts each map once. Re-rank the three tabs by speed and report."

## 6. Visible text
None added, removed or moved. Allow-list byte-identical.

## 7. Report
`cycles/virgin-cycle29/exec-report-01.md`: steps done, files touched, test counts before/after, each check, deviations
verbatim; for the inspector: (a) hook order unchanged in both views, (b) `seen.gone` is per-key, (c) `setStyleFailed(false)`
is inside the success branch only, (d) `cachedPatchedStyles(styleUrl)` fallback never hands a copy of a DIFFERENT URL.
