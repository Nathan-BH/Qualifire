# Brief 04 — ACTIVITIES cards are snapshot pictures; live map only as the failure fallback (virgin-cycle29)

Written 2026-10-09 by the Plan tier (Fable). PRECONDITIONS (coordinator confirms in the dispatch message, else STOP before
editing): brief 02 PASSED Nathan's on-device probe (identical in 4 states, make-time acceptable); brief 03 applied and
inspected; brief 01 applied. Baseline: 988 tests, 0 fail (972 + 7 + 9), tsc clean. Read `EXECUTOR-RULES.md`, `/CLAUDE.md`,
brief 02 (its modules are the base), then this brief. Ruling: `03-fable-ruling.md` Q2 b/c, Q4e, Q5 last bullet.

> **Amendment (inspect-02), 2026-10-10, Fable — ruled in `ruling-02-inspect-fixes.md`. Binding; everything below it stands
> unless this block says otherwise.**
> - **A1 Timeout (M1, hard requirement).** Keep brief 02's `withTimeout(createImage(...), SNAPSHOT_TIMEOUT_MS)` (cardSnapshotModel.ts)
>   around the ONE in-flight `createImage`. A `'timeout'` rejection is an ordinary failure in the §2 backoff ladder (1 s, 10 s,
>   60 s, then `failed` for the session); only `'gated'` is exempt. Never remove the wrapper: Android's MLRNStaticMapModule
>   never rejects on a snapshotter error, so without it one bad key would freeze every card on its placeholder.
> - **A2 Licence credit (M2, hard requirement).** Whenever an `<Image>` (or `Animated.Image`) of a snapshot is mounted in the
>   map slot, render `<Credit rung="maplibre" locked={false} />` (exported by wayMapView.tsx, as brief 02 does) as the LAST
>   child of `st.mapSlot`, outside the animated opacity (the control is crisp at once; only the picture fades). Not rendered
>   while the slot shows the placeholder only. The live fallback keeps its own Credit inside WayMapView. §4.5 pin: the
>   `<Credit` occurrence count in activityCard.tsx is exactly 1 and it follows the `<Image`/`Animated.Image`.
> - **A3 Queue testable by behaviour (m4).** Split the queue: new PURE module `app/src/ui/cardSnapshotQueueCore.ts` exporting
>   `createSnapshotQueue(deps: { createImage: (req) => Promise<string>; fs: FsAdapter; now: () => number; isIdle: () => boolean;
>   styleReady: (url) => boolean; timeoutMs: number; schedule?: (fn, ms) => unknown })` with the ordering, dedup, retry/backoff,
>   index, sweep and `onSnapshotReady` logic; `cardSnapshotQueue.ts` becomes the thin RN binding that builds the deps from
>   `ML.StaticMapImageManager`, `createExpoFsAdapter()`, `getStatus`, `cachedPatchedStyles`. §4.1-4.3 tests then import the
>   core with a fake `createImage` and the memory fs (no `setCreateImageForTests` seam needed; delete that idea). Add to §4.1:
>   a `createImage` that never settles → the key rejects with `'timeout'` after `timeoutMs` and the next key starts.
> - **A4 Layer parity pin (m4).** Extend brief 02's parity test: for each of the 7 ids, the `<M.Layer id="…" … layout={X}` in the
>   view names the same constant (`ROUND_LINE`/`ROUND_CAP`) as `cardLayerSpecs()[i].layout` (compare by identity against the
>   exported constants) and `sourceID`/`source` match per layer.
> - **A5 Width (m3).** `ctx.widthDp = Math.floor(useWindowDimensions().width)`; `buildSnapshotRequest` uses `ctx.widthDp` for
>   `fitZoomFor`, `paddedBoundsFor` and the key. Never pass a fractional width to the snapshotter.
> - **A6 Logging (m1).** `'[snap] hit'` from brief 02 stays; `peekSnapshot` itself stays silent (it runs per render).
> - **A7 Swap flash (m5).** Covered by §1.3/§1.5 fade and crossfade; no extra work. gateSetVersion into FeedCardModel
>   (ruling-02-escalation.md iv) stands.
> - **Counts.** Baseline = the suite count after brief 03 lands on top of brief 02's 991 (not 988). Expected after 04:
>   baseline + 8 (the §4 seven plus A3's timeout case). Allow-list byte-identical to the state after brief 02 (9 entries).

## 0. Rules (binding)
- JS-only, OTA-safe, no dependency, no native. No git/EAS/OTA. Delete nothing in the repo; the probe code from brief 02 is
  REMOVED from the app (its lines are deleted from `RidesScreen.tsx`; a copy of the removed block goes to
  `safe_to_delete/virgin-cycle29-probe-block.txt`).
- STOP-ON-AMBIGUITY -> `cycles/virgin-cycle29/exec-report-04.md`.
- Rider-facing text: NONE added/removed/moved; allow-list byte-identical. No spinner, no text, no trail-shape placeholder
  (Nathan rejected those): while a picture is pending the card shows the existing frame-colour placeholder, nothing else.
- Strip-only TypeScript. Pure modules stay pure.
- Do NOT touch: `GateAdjustScreen.tsx`, `App.tsx`, `wayMapView.tsx` (beyond what brief 02 did), `mapCover*`, `colourModel.ts`,
  any store file, `RideDetailScreen.tsx` (its maps stay live).

## 1. Behaviour (the contract)
Per card (both variants; a plain card needs its trail first - `useRideTrail` as today, then snapshot):
1. Compute `key = snapshotKey(...)` (brief 02 §3.1) from: variant, rideId, wayId, the way's current `gateSetVersion`
   (`currentCatalog().ways.find(w => w.id === wayId)?.gateSetVersion ?? null`), `styleUrl` (theme), `s.sectorColours` toggle,
   `card.sectorColours`, trail point count, window width, `CARD_MAP_HEIGHT`, `PixelRatio.get()`.
2. `peekSnapshot(key)` -> uri: render `<Image source={{uri}} style={absoluteFill} resizeMode="cover" fadeDuration={0}/>`
   over the placeholder. No cover, no fade: it is simply there.
3. Not on file: render the placeholder only; `requestSnapshot` with priority `visible` (the card is rendered, so it is at
   least near the viewport). When the promise resolves: `<Image>` mounted with opacity animated 0 -> 1 over
   `MAP_COVER_FADE_MS` (200 ms, import the constant; `useNativeDriver: true`; instant when reduce-motion is on, same
   `AccessibilityInfo` pattern as `mapCover.tsx`).
4. Request REJECTED for this key (after the queue's retries) -> the live `<WayMapView ...>` exactly as before this brief,
   gated by `live` as today (brief 01's `liveIdx`, radius 0). Pending is never a reason to mount a live map.
5. Key changes while a picture is shown (toggle flip, theme flip, own ignore/count, an earlier ride counted again): the old
   image stays until the new one resolves, then crossfades (new image fades in on top over 200 ms, old unmounts after).
   No placeholder in between.
6. The `live` prop keeps gating the live fallback only; the image path ignores it (a rendered card may show its picture
   even at 10 % visibility - that is the point).

## 2. Queue (extend `cardSnapshotQueue.ts` from brief 02)
- Priorities: `requestSnapshot(input, priority: 'visible' | 'feed' | 'warm')`. A single ordered list; `visible` jumps the queue
  (inserted before the first non-visible pending item), `feed` appends, `warm` appends after all `feed`. Still exactly one
  `createImage` in flight.
- Retry per key: on rejection, backoff 1 s, 10 s, 60 s, then mark the key `failed` for the session (`peekFailed(key): boolean`
  for the card's fallback). `Error('gated')` rejections do NOT count as failures: they re-queue at the same priority and the
  queue is re-kicked when the gate opens (subscribe to `location.subscribe` for `session === null`; re-check
  `cachedPatchedStyles(styleUrl)` every kick).
- Kicks: `warmFeed(cards, ctx)` called by RidesScreen (a) on mount after `cards` is built, (b) when `resultsTick`, theme or
  the toggle changes, (c) after `refresh()`. It enqueues, in feed order, for every card: its current key at `feed` priority;
  then for the first 10 cards the OTHER theme URL and the OTHER toggle state at `warm` (Nathan: "ready when I am in the app").
  Idempotent: keys already on file or pending are skipped.
- Index + eviction: `mapsnaps/index.json` `{ schemaVersion: 1, entries: [{ key, file, madeAtMs, lastUsedMs }] }`.
  `peekSnapshot` bumps `lastUsedMs` in memory (flushed with the next write). `sweep(knownRideIds: Set<string>)` at every
  `warmFeed`: remove entries whose `rideId` segment (field 4 of the key split on `|`) is not in `knownRideIds`, then LRU down to
  `SNAPSHOT_CAP = 80`; each removed entry's file is deleted with `fs.deleteFile` (own derived cache). A missing file on
  `peek` -> entry dropped, treated as not on file.
- Loading: `loadSnapshotIndex(fs)` once; entries whose file no longer exists (OS cleared cache) are dropped lazily.
- Logging stays `console.log('[snap] made' ...)`; add `'[snap] evict'` and `'[snap] failed'` (single-word literals only).

## 3. Edits
- `activityCard.tsx`: prop `snapshot: { uri: string | null; failed: boolean }` replaces brief 02's `snapshotUri`. Render per §1.
  Keep `CARD_MAP_GESTURES`, heights, `MenuButton`, strip untouched. The `<Image>` and the placeholder are both
  `position: absolute` fills inside `st.mapSlot`. Import `Image, Animated` from react-native.
- `RidesScreen.tsx`: remove the probe (long-press, `probe`, `probeUri`, its effect); the title line is byte-identical to brief 01's.
  Add: `const [snapTick, setSnapTick] = useState(0)` bumped by a queue subscription (`onSnapshotReady(cb)` in the queue) so
  cards re-render when a picture lands; `warmFeed` kick effect per §2; per-card `snapshot` computed in `renderItem` from
  `peekSnapshot(key)` / `peekFailed(key)`. Build `ctx` once per render: `{ styleUrl, otherStyleUrl, sectorColoursOn,
  widthDp, density, patchedLabelsOn: cachedPatchedStyles(styleUrl)?.labelsOn ?? null, assetFor, trailPeek: rideTrails.peek }`
  (export `rideTrails` from `activityCard.tsx` or move the loader to `trailCache.ts` consumers - choose: export it).
- `cardSnapshotModel.ts`: add `buildSnapshotRequest(card, ctx, trail): SnapshotRequest | null` (pure; null when no asset
  (route) or trail < 2 points (plain) or `patchedLabelsOn` null) so RidesScreen contains no geometry code.
- `wayMapView.tsx`: no change beyond brief 02.

## 4. Tests (`tests/cardsnapshot_suite.ts` extended)
1. Queue ordering (pure part: extract `orderQueue(pending)` or test through a fake `createImage` injected via
   `setCreateImageForTests(fn)`): visible before feed before warm; FIFO within a class; one in flight at a time (the fake
   records concurrency); dedup by key.
2. Retry/backoff: a rejecting fake fails 3 times -> key `failed`; a `'gated'` rejection never marks failed.
3. Sweep: unknown rideId evicted; LRU down to 80; files deleted via the memory fs; index written.
4. `buildSnapshotRequest`: route card without asset -> null; plain card with 1 point -> null; toggle off -> `ALL_YELLOW`
   spans (all null colours); toggle on -> card colours; `leadColour` grey only when on.
5. Source pins: `RidesScreen.tsx` has no `onLongPress`; `activityCard.tsx` mounts `<WayMapView` only inside the
   `snapshot.failed` branch (regex: `snapshot.failed` appears before `<WayMapView` and the `<Image` is under `snapshot.uri`);
   `MAP_COVER_FADE_MS` imported in `activityCard.tsx`; no two-word literal added.
Expected +7 -> 995 tests, 0 fail.

## 5. Acceptance
1. Touched: `activityCard.tsx`, `RidesScreen.tsx`, `cardSnapshotQueue.ts`, `cardSnapshotModel.ts`, `tests/cardsnapshot_suite.ts`;
   new `safe_to_delete/virgin-cycle29-probe-block.txt`. Nothing else.
2. Suite zero FAIL (995). 3. tsc exit 0 (`exec-04-tsc.log`). 4. Allow-list byte-identical. 5. `grep -c "onLongPress" RidesScreen.tsx` = 0.
6. State explicitly: image rendering and the snapshotter cannot be verified here.

## 6. On-device check (Nathan; OPEN-ITEMS line)
"virgin-cycle29 04: ACTIVITIES opens with pictures on every card already seen once (first open after the update: the
frame colour for a moment, then pictures fade in one by one, visible cards first); scrolling never shows a black map;
switching the SETTINGS sector-colours toggle or day/night crossfades the pictures; airplane mode: cached pictures still show;
ignoring a ride changes only its own picture; the RECORD and ROUTES maps are untouched. If any card shows a LIVE map (with
the short cover), note which: that is the failure fallback and means a snapshot failed for it."

## 7. Visible text
None. Allow-list byte-identical.

## 8. Report
`exec-report-04.md`. For the inspector: (a) one `createImage` in flight; (b) no snapshot made while `session !== null`;
(c) the live fallback is reachable only through `failed`; (d) index/eviction never deletes outside `mapsnaps/`;
(e) effects clean up their subscriptions; (f) the probe block is gone and copied to `safe_to_delete/`.
