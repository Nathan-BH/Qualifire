# Ruling on inspect-report-02 (virgin-cycle29 brief 02, snapshot probe) — Plan tier (Fable), 2026-10-10

Read: inspect-report-02.md, exec-report-02.md, 04-brief-02-snapshot-probe.md, 04-brief-04-snapshot-feed.md,
ruling-02-escalation.md, 03-fable-ruling.md Q2, and the real code: cardSnapshotQueue.ts, cardSnapshotModel.ts,
activityCard.tsx, RidesScreen.tsx (probe effect 199-235), wayMapView.tsx (`export function Credit` 362-402, mounted
at 1072, `creditLocked` 434, styles 1101-1112), mapCreditModel.ts, catalogMapView.tsx:396 (already reuses `Credit`),
node_modules/@maplibre/maplibre-react-native android MLRNStaticMapModule.kt:31-76 and ios MLRNStaticMapModule.mm:19-44.

Confirmed: Android's error callback (kt:71-74) only `Log.w`s and removes the snapshotter; it NEVER rejects. iOS (mm:30-32)
does reject. Nathan's phone is Android, so M1 is real. Each `createImage` builds its OWN `MapSnapshotter` (kt:41), so a
hung native call does not block later native calls (no native serialisation); it only holds its GL context/memory until
MapLibre gives up or the process dies. With the JS timeout below plus brief 02's no-retry rule the number of such ghosts
is bounded by Nathan's presses; brief 04's backoff ladder (4 attempts per key per session) bounds it there.

Every instruction below is exact. The executor applies them, re-runs the checks and does not re-decide anything.
Allow-list: STAYS at the 9 ruled entries. Nothing below adds a flagged literal (`'[snap]'`/`'hit'`/`'timeout'` are
console/Error arguments or single words; `rung="maplibre"` is a single-word JSX attribute, exactly as catalogMapView.tsx:396
already has it with no allow-list entry).

## M1 — RULING: JS timeout in `make()`, pure helper in cardSnapshotModel.ts, timeout = a normal failure.

1. `app/src/ui/cardSnapshotModel.ts` — append at the end of the file (pure: no import; `setTimeout` is a global):
```ts
/** inspect-02 M1: Android's MLRNStaticMapModule never rejects on a snapshotter error (it only logs), so a request
 * must time out in JS or the one-at-a-time queue hangs forever. Long enough for a cold first make (glyph/sprite
 * fetch over the network), short enough that Nathan sees `[snap] failed … timeout` instead of "nothing happens". */
export const SNAPSHOT_TIMEOUT_MS = 10000;

/** Settles like `p`, or rejects with Error('timeout') after `ms`. A late result from `p` is dropped (nothing awaits it). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e: unknown) => { clearTimeout(id); reject(e); });
  });
}
```
2. `app/src/ui/cardSnapshotQueue.ts`:
   - line 10: `import { snapshotFileName, snapshotKey, SNAPSHOT_TIMEOUT_MS, withTimeout, type SnapshotKeyInput } from './cardSnapshotModel';`
   - lines 68-74: wrap the call —
```ts
  const uri = await withTimeout(ML.StaticMapImageManager.createImage({
    mapStyle: input.styleJson as object,
    width: input.widthDp,
    height: input.heightDp,
    bounds: input.bounds,
    output: 'file',
  }), SNAPSHOT_TIMEOUT_MS);
```
   Nothing else in `make()`/`requestSnapshot()` changes. What then happens, with the code as it stands:
   - the timed-out request REJECTS with `Error('timeout')`; `requestSnapshot`'s rejection handler already deletes the
     pending key and logs `console.warn('[snap] failed', key, 'timeout')`; the chain advances (`chain = p.catch(...)`).
   - retry policy in brief 02: NONE (unchanged). A later long-press for the same key is a fresh request (pending was
     deleted, nothing in `known`). Brief 04: a timeout is an ordinary rejection in its backoff ladder (1 s, 10 s, 60 s, then
     `failed`); see the brief 04 amendment.
   - a late native result is discarded by construction: the inner promise resolves into a `withTimeout` promise that has
     already rejected, so no `importFile`, no `known.set`, no index write, no log. The native PNG stays in Android cacheDir
     (OS-managed temp file); accepted.
   - the probe path needs nothing extra: the probe only reaches the snapshotter through `requestSnapshot` → `make()`.
3. Test (new, `app/tests/cardsnapshot_suite.ts`, append after the wiring-pins test; add `SNAPSHOT_TIMEOUT_MS, withTimeout`
   to the import from cardSnapshotModel.ts at lines 8-10):
```ts
test('virgin-cycle29 02 (inspect M1): withTimeout rejects a hung promise with "timeout", passes settled ones through, drops a late result', async () => {
  const t0 = Date.now();
  let msg = '';
  await withTimeout(new Promise<string>(() => {}), 30).catch((e: unknown) => { msg = (e as Error).message; });
  assert(msg === 'timeout', `hung promise: got "${msg}"`);
  assert(Date.now() - t0 >= 25, 'rejects after the deadline, not before');
  assert((await withTimeout(Promise.resolve('ok'), 1000)) === 'ok', 'a resolved promise passes through');
  let rej = '';
  await withTimeout(Promise.reject(new Error('boom')), 1000).catch((e: unknown) => { rej = (e as Error).message; });
  assert(rej === 'boom', 'a rejection passes through unchanged');
  let late: (v: string) => void = () => {};
  const r = withTimeout(new Promise<string>((res) => { late = res; }), 10);
  await r.catch(() => undefined);
  late('late');
  await new Promise((res) => setTimeout(res, 5));
  let settled = '';
  await r.then((v) => { settled = v; }, () => { settled = 'rejected'; });
  assert(settled === 'rejected', 'a result arriving after the deadline is dropped');
  assert(SNAPSHOT_TIMEOUT_MS >= 5000 && SNAPSHOT_TIMEOUT_MS <= 15000, 'timeout is seconds, not ms or minutes');
});
```
   And in the EXISTING wiring-pins test (line 115) replace
   `assert((q.match(/createImage\(/g) ?? []).length === 1 && q.includes('chain.then('), 'one createImage, serialised');`
   with
   `assert((q.match(/createImage\(/g) ?? []).length === 1 && q.includes('chain.then(') && q.includes('withTimeout(ML.StaticMapImageManager.createImage(') && q.includes('SNAPSHOT_TIMEOUT_MS)'), 'one createImage, serialised, under the M1 timeout');`

## M2 — RULING: draw the SAME `Credit` control over the picture; the "i" stays part of the A/B (it is identical on both sides).

Why not "exclude it from the criterion": the credit is a licence obligation (mapCreditModel.ts header; wayMapView.tsx
355-360: MapLibre's own attribution is off, so this overlay is the only OSM/OpenMapTiles/OpenFreeMap credit). A snapshot
card without it would be non-compliant in brief 04; the probe must show the card as it will ship. `Credit` is already
exported from wayMapView.tsx and already reused by catalogMapView.tsx:396 with `locked={false}`, which is exactly the
value a browse card gets today (`creditLocked` = false unless `variant === 'live'`). Its styles are absolute `right: 6,
bottom: 6` inside its parent; the card's `st.mapSlot` View (150 dp, full bleed) has the same geometry as the live
card's `frameBleed`, so the "i" lands on the same pixels. Touch: the Credit Pressable is nested inside the block Pressable
exactly as it is today inside WayMapView inside the block; RN gives the deepest Pressable the touch, so tapping "i"
opens the sources card and tapping elsewhere opens the ride, as today. No new string: `Credit` carries its own text.

1. `app/src/ui/activityCard.tsx` line 20: `import WayMapView, { Credit, type WayMapGestures } from './wayMapView';`
2. lines 87-89: replace
```tsx
        {typeof props.snapshotUri === 'string' ? (
          <Image source={{ uri: props.snapshotUri }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} />
        ) : showMap ? (
```
   with
```tsx
        {typeof props.snapshotUri === 'string' ? (
          <>
            <Image source={{ uri: props.snapshotUri }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} />
            {/* inspect-02 M2: the picture has no attribution baked in; the licence credit is the same control the live map shows */}
            <Credit rung="maplibre" locked={false} />
          </>
        ) : showMap ? (
```
3. Pin, in the existing wiring-pins test, after line 107 add:
   `assert((card.match(/<Credit rung="maplibre" locked=\{false\} \/>/g) ?? []).length === 1 && card.indexOf('<Credit') > card.indexOf('<Image'), 'the licence credit is drawn over the picture (inspect-02 M2)');`
4. Probe text — `04-brief-02-snapshot-probe.md` §9 and `COMMANDS-publish.md` §3 "After 02" are amended (done by me, see
   those files): the "i" is present on both sides and part of the comparison; a cached repeat does not count for the time.

## Minors

- m1 (cache hit not logged) — FIX-NOW-IN-02. `cardSnapshotQueue.ts` line 63 becomes two lines:
```ts
  if (hit !== null && await adapter.exists(`mapsnaps/${known.get(key)!.file}`)) { console.log('[snap] hit', key); return hit; }
```
  (single statement on one line is fine too). Probe text tells Nathan only `[snap] made` counts for the ≤1.5 s.
- m2 (stale picture while a new one is pending/failed) — FIX-NOW-IN-02. `RidesScreen.tsx` line 205: after
  `if (!probe) { setProbeUri(null); return; }` insert a new line `setProbeUri(null); // inspect-02 m2: never show a picture of a previous input`.
  A re-run of the effect (theme flip, Refresh, width) then shows the live map until the new picture lands or fails.
- m3 (fractional width truncated natively) — FIX-NOW-IN-02 (one local). `RidesScreen.tsx`: after line 219 (`const lead = …`)
  add `const widthDp = Math.floor(winW); // inspect-02 m3: native does .toInt(); the maths must use the same width`
  and replace `winW` with `widthDp` on lines 220, 231 (`widthDp: widthDp,` → write `widthDp,`) and 232. `winW` stays in the
  dependency array (235). Brief 04 inherits it via `ctx.widthDp` (amendment).
- m4 (weak pins) — SPLIT. FIX-NOW-IN-02 for the gate pin: in the wiring test line 114 replace
  `q.includes('getStatus().session === null')` with `q.includes("if (!idle) throw new Error('gated')") && q.includes('getStatus().session === null')`.
  DEFER-TO-04 for per-layer source/layout parity and the behavioural queue test; brief 04 gets a pure, dependency-injected
  queue core (amendment §A3) so the queue is tested by behaviour, not by strings.
- m5 (placeholder flash on swap) — DEFER-TO-04 (its fade-in/crossfade covers it). Probe text says a one-frame flash at the
  swap is not a FAIL.
- m6 (native leak on `result == null`) — nothing to do (native, not ours); noted.

## Execution list for Sonnet (in this order)
1. cardSnapshotModel.ts: append `SNAPSHOT_TIMEOUT_MS` + `withTimeout` (M1.1).
2. cardSnapshotQueue.ts: import (M1.2), `withTimeout(...)` wrap (M1.2), `[snap] hit` log (m1).
3. activityCard.tsx: `Credit` import + fragment (M2.1-2).
4. RidesScreen.tsx: `setProbeUri(null)` (m2), `widthDp = Math.floor(winW)` (m3).
5. tests/cardsnapshot_suite.ts: import additions; the three pin edits in the wiring test (M1.3 last line, M2.3, m4);
   the new withTimeout test (M1.3).
6. `cd app && node --experimental-strip-types tests/run.ts` → **991 tests, 0 FAIL, 3 skip** (990 + 1).
7. `./node_modules/.bin/tsc --noEmit | tee ../cycles/virgin-cycle29/exec-02-tsc.log` → exit 0, empty.
8. `git diff --numstat -- app/tests/ui-strings.allow.json` → still `72 0` (the 9 ruled entries; nothing added or removed).
9. `git status --short`: the touched set = exec-report-02's list; no new file.
10. Append to `exec-report-02.md` a section `## Fixes after inspect-02 (ruling-02-inspect-fixes.md)` listing the edits
    above, the new counts, and the amended §9 probe line verbatim (copy it from the brief after my amendment). Say again
    that the snapshotter and the Credit overlay cannot be exercised here.
Then the Opus inspector re-checks ONLY this diff (fresh context, reruns suite + tsc, verifies the Credit geometry claim
against wayMapView.tsx styles and that `withTimeout` wraps the one `createImage`).
