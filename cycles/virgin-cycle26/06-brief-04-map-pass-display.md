# Brief 04 — Map: the pass the rider is NOT on draws faint (LIVE / DEMO / REPLAY), and the editor tap cycles stacked gates

Written by the Plan tier (Fable) 2026-10-07 ~23:00 UTC from `05-plan.md` (D9-D12, D15) and digest 03; every anchor below was read in the working tree at that time (suite baseline `918 tests: 915 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. **Runs AFTER brief 02 has landed** (imports `PASS_GAP_M` from core); independent of briefs 01 and 03 otherwise (no shared file). Read `EXECUTOR-RULES.md` first, then all of this. `wayMapView.tsx` is a 1 000-line mount-order-sensitive file: you change the props type, ONE hook block, THREE paint blocks, ONE event handler and ONE import — nothing else, and the two static mount-order tests in `tests/waymap_suite.ts` (`:259`, `:361`) must keep passing.

## 0. Rules

- **STOP-ON-AMBIGUITY.** Anchor not where quoted (±15 lines, no other plausible match), a §5 test not behaving as predicted, any unsettled call → STOP, write what you found verbatim into `cycles/virgin-cycle26/06-brief-04-executor-report.md` under `## STOPPED`, return.
- **No warnings, no blocks** (ruling 1): nothing is written, labelled or flagged; this brief changes OPACITY only.
- **Rider-facing text: ZERO new strings**; `app/tests/ui-strings.allow.json` has no diff. The UI files you touch (`wayMapView.tsx`, `RecordScreen.tsx`, `DemoScreen.tsx`, `ReplayScreen.tsx`) are scanned: add no literal that is prose. If the `ui_strings` suite reports anything, STOP.
- **No new GeoJSON source, no conditional mount, no `line-dasharray`, no `line-gradient`, no key/id change** (the 2026-08-24 device-only dasharray bug class and the cycle-025 frozen-id rule — comments in the file).
- Never delete; no commit; no publish; no dependency; no edits outside §3; `GIT_OPTIONAL_LOCKS=0`. Strip-only TS.

## 1. Purpose (Nathan 2026-10-08, plan D9-D12)

On a tour that retraces its own ground, the live map draws both copies of the street and both passes' gates at full strength. Nathan's rule: while the rider is still on the way out, the return pass's line and gates are **fainter**; they brighten as the rider's chainage nears them; dim rather than hide; tier colours stay on the current pass; the same in DEMO and REPLAY; no text.

- **One input.** `WayMapView` gets `progressM?: number | null` — metres along the drawn path. LIVE passes `live.chainageM` (engine, forward-only); REPLAY passes `pos.sM` (recorded chainage); DEMO passes `progressAtTime(asset, gateAt, clockS)` (new pure helper beside `positionAtTime`). Browse surfaces pass nothing ⇒ nothing changes.
- **Pass model, once per asset** (`wayMapGeo.ts`, pure): `cumM[k]` = planar metres along `path`; `partnerM[k]` = chainage of the nearest vertex of ANOTHER pass (> `PASS_GAP_M` away in chainage, within `CORRIDOR_M`), else null. Vertex k is **faint** at progress s iff `partnerM[k] !== null && |s − partnerM[k]| < |s − cumM[k]| && |cumM[k] − s| > FADE_NEAR_M (240)`. A gate is faint iff its path vertex is; a sector span iff its END gate is. On ground that is not retraced nothing is ever faint. 240 m = the engine's own forward window: the other copy brightens when it enters the rider's look-ahead.
- **Paint, not geometry.** The route source's data becomes runs with `faint: 1` on the faint ones (property omitted otherwise — the `['has', …]` convention); `route-casing`, `route-core`, `sector-spans-core`, `gate-ticks-casing`, `gate-ticks` get `'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1]`. With `progressM` null/undefined the route FC is the single feature it is today.
- **Editor tap.** The `gate-ticks` `onPress` collects EVERY hit feature's gate index and hands `nextGateOnTap(hits, selected)` (pure, `gateAdjustModel.ts`) to `gateSelect.onPress`: none selected among the hits ⇒ lowest index; otherwise the next one cyclically; single hit ⇒ today's behaviour (the card's own toggle still deselects).

## 2. Verified anchors (working tree 2026-10-07 ~22:25 UTC)

- `app/src/ui/wayMapGeo.ts:11` `import type { WayAsset } from './wayMapMath.ts';` (the file's ONLY import); `:43-53` `wayLineFeature(a)`; `:55-58`:
  ```
  export interface GateProperties {
    name: string;
    colour?: string;
  }
  ```
  `:176` `export function metresBetween(lat0, lon0, lat1, lon1): number`; `:336-338` `export function gateTicksFeatureCollection(\n  a: WayAsset, gateColours?: (string | null)[], halfLenM = 15,\n): GeoFeatureCollection<LineStringGeometry, GateProperties> {`; `:361-365`:
  ```
        const raw = gateColours?.[i] ?? null;
        const colour = raw === '' ? null : raw;
        const properties: GateProperties = colour !== null
          ? { name: g.name, colour }
          : { name: g.name };
  ```
  `:487-491`:
  ```
  export interface SectorSpanProperties {
    /** 1-based sector number — the span ENDING at gate `sector`. */
    sector: number;
    colour?: string;
    lead?: 'in' | 'out';
  }
  ```
  `:519-522` `export function sectorSpansFeatureCollection(\n  a: WayAsset, sectorColours?: (string | null)[],\n  leadColour?: string | null,\n): … | null {`; `:528-532`:
  ```
      const raw = sectorColours?.[i] ?? null;
      const colour = raw === '' ? null : raw;
      const properties: SectorSpanProperties = colour !== null
        ? { sector: i, colour }
        : { sector: i };
  ```
- `app/src/ui/wayMapMath.ts` — no imports; `:168-170` `export function positionAtTime(\n  a: WayAsset, gateTimes: number[], tSec: number,\n): { lat: number; lon: number } | null {`; its k/f selection `:175-177`:
  ```
    let k = 0;
    while (k < gateTimes.length - 2 && tSec >= gateTimes[k + 1]) k++;
    const span = Math.max(gateTimes[k + 1] - gateTimes[k], 1e-6);
    const f = Math.max(0, Math.min(1, (tSec - gateTimes[k]) / span));
  ```
  `WayAsset` (`:30-50`): `path?: [lat, lon][]`, `gateIdx?: number[]`, `gates: WayGate[]` (`{ name, lat, lon, px, py }`).
- `app/core/src/index.ts` re-exports `projection.ts` (`CORRIDOR_M`; `PASS_GAP_M` after brief 02); core has no JSON import, so the headless suites import it without a loader hook.
- `app/src/ui/gateAdjustModel.ts` — pure, no imports; ends with `fmtPct` (`:77-80`).
- `app/src/ui/wayMapView.tsx:89` `import { offWayM, type WayAsset } from './wayMapMath.ts';`; `:133` `type GatePressEvent = …`; `:304-307`:
  ```
    gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };
    /** virgin-cycle23 brief 01: see WayMapGestures. Default 'full'. */
    gestures?: WayMapGestures;
  };
  ```
  `:589-593`:
  ```
    const wayFC = useMemo(() => {
      if (!asset) return null;
      const feature = wayLineFeature(asset);
      return feature ? { type: 'FeatureCollection' as const, features: [feature] } : null;
    }, [asset]);
  ```
  (above the `riderOnly` early return — hooks here run unconditionally.) `:669-671`:
  ```
    const gateTicksFC = asset
      ? gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen)
      : null;
  ```
  `:676-678`:
  ```
    const sectorSpansFC = asset && props.sectorColours
      ? sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour)
      : null;
  ```
  `:792-797`:
  ```
          <M.Layer id="route-casing" type="line"
            paint={{ 'line-color': CASING, 'line-width': 7 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          <M.Layer id="route-core" type="line"
            paint={{ 'line-color': colors.neutral, 'line-width': 4 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
  ```
  `:856-861`:
  ```
          <M.Layer id="sector-spans-core" type="line"
            paint={{
              'line-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
              'line-width': 4,
            }}
  ```
  `:901-905` the tap handler (`const name = String(e.nativeEvent.features?.[0]?.properties?.name ?? '');` …); `:908-915`:
  ```
          <M.Layer id="gate-ticks-casing" type="line"
            paint={{ 'line-color': CASING, 'line-width': 5 }}
            layout={{ 'line-cap': 'round' }} />
          <M.Layer id="gate-ticks" type="line" paint={{
            'line-color': ['case', ['has', 'colour'], ['get', 'colour'], colors.white],
            'line-width': ['case', ['has', 'colour'], 3, 2],
            'line-opacity': 1,
          }} layout={{ 'line-cap': 'round' }} />
  ```
  The wayMapGeo import in this file is a multi-name import from `'./wayMapGeo.ts'` (locate with `grep -n "from './wayMapGeo.ts'" src/ui/wayMapView.tsx`; it names `gateTicksFeatureCollection`, `sectorSpansFeatureCollection`, `wayLineFeature`, …).
- `app/src/ui/RecordScreen.tsx:1416-1427` the live `<WayMapView …>` with `selfs={settings.selfDots ? selfDots : undefined}` at `:1424`; `live` is the engine state (`live.chainageM: number | null`, used at `:1238`). (2026-10-08 anchor update, after briefs 01/02/05: the live `<WayMapView` is at `:1419-1430`, the `selfs=` line at `:1427`, `live.chainageM` at `:1239` / `:1241`; the other two `<WayMapView` mounts are at `:1270` and `:1538`. Match on text.)
- `app/src/ui/DemoScreen.tsx:127` `import { positionAtTime } from './wayMapMath';`; `:319` `const pos = positionAtTime(ASSET, script.gateAt, clockS);`; `:666-669` the second `<WayMapView … asset={DEMO_WAY_ASSET} … selfs={showSelfs ? selfDots : undefined}\n              variant="live" liveState={running ? 'moving' : 'finished'} fill />`.
- `app/src/ui/ReplayScreen.tsx:114-116` `pos` = `riderPositionAt(…)` (has `.sM`, used `:129`); `:232-243` the `<WayMapView … selfs={settings.selfDots ? selfDots : undefined}\n          rideTrace={rider.fixes}` …
- `app/tests/waymapgeo_suite.ts:7-17` imports (`fs`, `path`, `{ assert, loadJson, test, TESTS_DIR } from './lib.ts'`, the multi-name import from `'../src/ui/wayMapGeo.ts'`, `gateName`, `type WayAsset`); the file ends with the `fitMeNextMode` test. `app/tests/waymap_suite.ts:9-11` imports `fs`, `path`, `{ assert, loadJson, test, TESTS_DIR }`; its static guards read `src/ui/wayMapView.tsx`. `app/tests/gateseeding_suite.ts:6` imports six names from `'../src/ui/gateAdjustModel.ts'`. `run.ts` imports all three. **Do not edit `run.ts`.**

## 3. Files (complete list)

1. `app/src/ui/wayMapGeo.ts` — one core import; `FADE_NEAR_M`, `FAINT_OPACITY`; `faint?: 1` on both property types; `buildPassModel`, `faintVertices`, `gateFaint`, `routeRunsFeatureCollection`; 4th argument on `gateTicksFeatureCollection` and `sectorSpansFeatureCollection`.
2. `app/src/ui/wayMapMath.ts` — `pathCumulativeM`, `progressAtTime`.
3. `app/src/ui/gateAdjustModel.ts` — `nextGateOnTap`.
4. `app/src/ui/wayMapView.tsx` — prop; import; hook block; three paint blocks; tap handler.
5. `app/src/ui/RecordScreen.tsx` — one prop. 6. `app/src/ui/DemoScreen.tsx` — import + one prop. 7. `app/src/ui/ReplayScreen.tsx` — one prop.
8. `app/tests/waymapgeo_suite.ts`, `app/tests/waymap_suite.ts`, `app/tests/gateseeding_suite.ts` — new tests.

## 4. Edits

### 4.1 `wayMapMath.ts` — append at the end

```ts

/** virgin-cycle26 brief 04: planar metres along `path` per vertex (cumM[0] = 0),
 * the same per-segment equirectangular arithmetic positionAtTime uses. The
 * runtime asset's path IS the reference's 5 m vertices, so this agrees with
 * the engine's chainage to rounding. */
export function pathCumulativeM(path: readonly [number, number][]): number[] {
  const cum = [0];
  for (let i = 0; i + 1 < path.length; i++) {
    const dy = (path[i + 1][0] - path[i][0]) * 111320;
    const dx = (path[i + 1][1] - path[i][1]) * 111320 * Math.cos((path[i][0] * Math.PI) / 180);
    cum.push(cum[cum.length - 1] + Math.hypot(dx, dy));
  }
  return cum;
}

/** virgin-cycle26 brief 04: the DEMO's progress in path metres at ride time
 * `tSec` — the same k/f selection as positionAtTime (same bound, same span), so
 * the dot and the pass-aware fade agree. null when the asset cannot be walked. */
export function progressAtTime(a: WayAsset, gateTimes: number[], tSec: number): number | null {
  const path = a.path;
  const idx = a.gateIdx;
  if (!path || !idx || path.length < 2 || idx.length !== gateTimes.length || idx.length < 2) return null;
  let k = 0;
  while (k < gateTimes.length - 2 && tSec >= gateTimes[k + 1]) k++;
  const span = Math.max(gateTimes[k + 1] - gateTimes[k], 1e-6);
  const f = Math.max(0, Math.min(1, (tSec - gateTimes[k]) / span));
  const cum = pathCumulativeM(path);
  const i0 = Math.min(idx[k], path.length - 1);
  const i1 = Math.min(Math.max(idx[k + 1], i0 + 1), path.length - 1);
  return cum[i0] + f * (cum[i1] - cum[i0]);
}
```

### 4.2 `wayMapGeo.ts`

(a) After `:11` add `import { CORRIDOR_M, PASS_GAP_M } from '../../core/src/index.ts';` and `import { pathCumulativeM } from './wayMapMath.ts';` (merge the latter with the existing type import if you prefer: `import { pathCumulativeM, type WayAsset } from './wayMapMath.ts';`).

(b) `GateProperties` (`:55-58`) and `SectorSpanProperties` (`:487-491`) each gain, as the last member:
```ts
  /** virgin-cycle26 brief 04: present (1) when this feature belongs to a pass
   * the rider is NOT on (wayMapGeo.ts faintVertices); omitted otherwise, so
   * the ['has','faint'] opacity expression leaves everything else at 1. */
  faint?: 1;
```

(c) `gateTicksFeatureCollection` signature → `a: WayAsset, gateColours?: (string | null)[], halfLenM = 15, faintGates?: readonly boolean[],` and `:361-365` →
```ts
      const raw = gateColours?.[i] ?? null;
      const colour = raw === '' ? null : raw;
      const properties: GateProperties = colour !== null
        ? { name: g.name, colour }
        : { name: g.name };
      if (faintGates?.[i]) properties.faint = 1;
```

(d) `sectorSpansFeatureCollection` signature → add a 4th parameter `faintGates?: readonly boolean[],` after `leadColour?: string | null,`; `:528-532` → same shape, then `if (faintGates?.[i]) properties.faint = 1;` (span i ends at gate i). Lead-in/out features never get `faint`.

(e) Append at the end of the file:

```ts

// ==================================================== virgin-cycle26 brief 04 (pass-aware fade)

/** The other copy of a retraced stretch brightens once the rider's chainage is
 * within this of it — the live engine's own forward window (core/live.ts
 * DEFAULT_LIVE_OPTIONS.windowFwd), so "coming into view" means the same thing
 * to the map as to the projector. One constant to tune on device. */
export const FADE_NEAR_M = 240;
/** line-opacity of a faint run / tick / span. Dim, never hidden (Nathan
 * 2026-10-08: a rider who strays must still see it). */
export const FAINT_OPACITY = 0.3;

export interface PassModel {
  /** planar metres along the path, per vertex */
  cumM: number[];
  /** per vertex: chainage of the nearest vertex of ANOTHER pass of the same
   * line (> gapM away in chainage, within withinM), or null when the ground is
   * not retraced */
  partnerM: (number | null)[];
}

/** Once per asset. null when the asset has no drawable path. O(n²) over the
 * path (≤ RUNTIME_PATH_MAX_VERTICES = 4000). */
export function buildPassModel(a: WayAsset, withinM = CORRIDOR_M, gapM = PASS_GAP_M): PassModel | null {
  const path = a.path;
  if (!path || path.length < 2) return null;
  const cumM = pathCumulativeM(path);
  const n = path.length;
  const x: number[] = new Array(n);
  const y: number[] = new Array(n);
  const lat0 = path[0][0];
  const clat = 111320 * Math.cos((lat0 * Math.PI) / 180);
  for (let k = 0; k < n; k++) {
    x[k] = (path[k][1] - path[0][1]) * clat;
    y[k] = (path[k][0] - lat0) * 111320;
  }
  const w2 = withinM * withinM;
  const partnerM: (number | null)[] = new Array(n).fill(null);
  for (let k = 0; k < n; k++) {
    let bestD2 = w2;
    let best: number | null = null;
    for (let j = 0; j < n; j++) {
      if (Math.abs(cumM[j] - cumM[k]) <= gapM) continue;
      const dx = x[j] - x[k];
      const dy = y[j] - y[k];
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) { bestD2 = d2; best = cumM[j]; }
    }
    partnerM[k] = best;
  }
  return { cumM, partnerM };
}

/** Per vertex: is it on a pass the rider is NOT on right now? null when there
 * is no progress or nothing is faint (so callers can keep today's single
 * feature). The rule: the ground is retraced, the rider's chainage is nearer
 * the OTHER copy than this one, and this one is further than FADE_NEAR_M away. */
export function faintVertices(model: PassModel, progressM: number | null | undefined, nearM = FADE_NEAR_M): boolean[] | null {
  if (progressM === null || progressM === undefined || !Number.isFinite(progressM)) return null;
  const s = progressM;
  const out: boolean[] = new Array(model.cumM.length);
  let any = false;
  for (let k = 0; k < model.cumM.length; k++) {
    const p = model.partnerM[k];
    const f = p !== null && Math.abs(s - p) < Math.abs(s - model.cumM[k]) && Math.abs(model.cumM[k] - s) > nearM;
    out[k] = f;
    if (f) any = true;
  }
  return any ? out : null;
}

/** Per gate: faint iff its path vertex is. All false without gateIdx or flags. */
export function gateFaint(a: WayAsset, faint: boolean[] | null): boolean[] {
  const idx = a.gateIdx;
  return a.gates.map((_, i) => !!(faint && idx && idx.length === a.gates.length && faint[Math.min(idx[i], faint.length - 1)]));
}

/** The route line as runs: consecutive vertices with the same faint flag form
 * one LineString (adjacent runs share their boundary vertex, like sector
 * spans); faint runs carry `faint: 1`, the others no property. With `faint`
 * null this is exactly today's single wayLineFeature. null without a path. */
export function routeRunsFeatureCollection(
  a: WayAsset, faint: boolean[] | null,
): GeoFeatureCollection<LineStringGeometry, { faint?: 1 }> | null {
  const single = wayLineFeature(a);
  if (!single) return null;
  if (!faint || faint.length !== a.path!.length) return { type: 'FeatureCollection', features: [single as GeoFeature<LineStringGeometry, { faint?: 1 }>] };
  const path = a.path!;
  const features: GeoFeature<LineStringGeometry, { faint?: 1 }>[] = [];
  let start = 0;
  for (let k = 1; k <= path.length; k++) {
    if (k < path.length && faint[k] === faint[start]) continue;
    const end = Math.min(k, path.length - 1); // share the boundary vertex
    const slice = path.slice(start, end + 1);
    if (slice.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: slice.map(([lat, lon]) => [lon, lat] as GeoPosition) },
        properties: faint[start] ? { faint: 1 } : {},
      });
    }
    start = k;
  }
  return { type: 'FeatureCollection', features };
}
```

### 4.3 `gateAdjustModel.ts` — append at the end

```ts

/** virgin-cycle26 brief 04: which gate a map tap selects when the tap hit
 * SEVERAL gate ticks at once (an out-and-back street puts two gates on one
 * pixel). `hits` = the gate indices of every feature under the tap, any
 * order, duplicates allowed, -1 for unknown names. None selected among them
 * => the first (lowest index); otherwise the next one cyclically, so repeated
 * taps walk through the stack. A single hit returns that hit — exactly the
 * pre-cycle26 behaviour, and the card's own toggle still deselects it. The
 * chip row keeps selecting any gate directly. */
export function nextGateOnTap(hits: readonly number[], selected: number | null): number | null {
  const sorted = [...new Set(hits)].filter((i) => i >= 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const at = selected === null ? -1 : sorted.indexOf(selected);
  return at < 0 ? sorted[0] : sorted[(at + 1) % sorted.length];
}
```

### 4.4 `wayMapView.tsx` — exactly these hunks

(a) Imports: add `import { nextGateOnTap } from './gateAdjustModel.ts';` after `:89`; add `buildPassModel, faintVertices, gateFaint, routeRunsFeatureCollection, FAINT_OPACITY` to the existing `from './wayMapGeo.ts'` import (alphabetical placement is not required; keep it one import statement). `wayLineFeature` may become unused in this file after (c) — if `tsc` or the suite flags it, remove it from the import; do not leave an unused import.

(b) Props (`:304-307`): before `/** virgin-cycle23 brief 01: see WayMapGestures …` insert:
```ts
  /** virgin-cycle26 brief 04 (Nathan 2026-10-08): the rider's progress in
   * metres along the drawn path — the live engine's forward-only chainage
   * (RecordScreen), the recorded chainage (ReplayScreen) or progressAtTime
   * (DemoScreen). When set, the copy of a retraced stretch (and its gates and
   * sector spans) that the rider is NOT on draws at FAINT_OPACITY until the
   * rider is within FADE_NEAR_M of it (wayMapGeo.ts faintVertices). Absent or
   * null = today's drawing. MapLibre rung only. */
  progressM?: number | null;
```

(c) `:589-593` →
```ts
  // virgin-cycle26 brief 04: pass model once per asset; faint flags at most
  // every 10 m of progress; the route FC splits into runs only when something
  // is faint (otherwise it is today's single feature). All three hooks run
  // unconditionally (Rules of Hooks — see the comment above).
  const progressKey = props.progressM === null || props.progressM === undefined ? null : Math.round(props.progressM / 10);
  const passModel = useMemo(() => (asset ? buildPassModel(asset) : null), [asset]);
  const faintVerts = useMemo(
    () => (passModel && progressKey !== null ? faintVertices(passModel, progressKey * 10) : null),
    [passModel, progressKey],
  );
  const wayFC = useMemo(() => (asset ? routeRunsFeatureCollection(asset, faintVerts) : null), [asset, faintVerts]);
```

(d) `:669-671` → `const faintGates = asset && faintVerts ? gateFaint(asset, faintVerts) : undefined;` on its own line, then
```ts
  const gateTicksFC = asset
    ? gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen, faintGates)
    : null;
```
and `:676-678` → `sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour, faintGates)`.

(e) Paint: `route-casing` → `paint={{ 'line-color': CASING, 'line-width': 7, 'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1] }}`; `route-core` → `paint={{ 'line-color': colors.neutral, 'line-width': 4, 'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1] }}`; `sector-spans-core` → add `'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1],` after `'line-width': 4,`; `gate-ticks-casing` → `paint={{ 'line-color': CASING, 'line-width': 5, 'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1] }}`; `gate-ticks` → `'line-opacity': 1,` becomes `'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1],`. If the `paint` prop's TypeScript type rejects the expression array (it accepts the same shape for `line-color` two lines up, so it should not), STOP and report the tsc line.

(f) `:901-905` →
```tsx
          onPress={props.gateSelect ? (e: GatePressEvent) => {
            // virgin-cycle26 brief 04: every feature under the tap, not just
            // the first — stacked gates on retraced ground cycle on each tap.
            const hits = (e.nativeEvent.features ?? []).map((f) => {
              const name = String(f.properties?.name ?? '');
              return asset ? asset.gates.findIndex((g) => g.name === name) : -1;
            });
            const idx = nextGateOnTap(hits, props.gateSelect!.selected);
            if (idx !== null) props.gateSelect!.onPress(idx);
          } : undefined}
```

Nothing else: no source added, no key/id changed, no layout change.

### 4.5 Callers

- `RecordScreen.tsx:1424` (now `:1427`, 2026-10-08) — after `selfs={settings.selfDots ? selfDots : undefined}` add a line `progressM={live.chainageM}`.
- `DemoScreen.tsx:127` → `import { positionAtTime, progressAtTime } from './wayMapMath';`; on the SECOND `<WayMapView` (`:666-669`, the one with `asset={DEMO_WAY_ASSET}`) add `progressM={progressAtTime(ASSET, script.gateAt, clockS)}` after `selfs={showSelfs ? selfDots : undefined}`. The FIRST-ride map (no asset) gets nothing.
- `ReplayScreen.tsx:232-243` — after `selfs={settings.selfDots ? selfDots : undefined}` add `progressM={pos ? pos.sM : null}`.

### 4.6 Tests

**`tests/waymapgeo_suite.ts`** — extend the wayMapGeo import with `buildPassModel, faintVertices, gateFaint, routeRunsFeatureCollection, FADE_NEAR_M, FAINT_OPACITY`; add `import { pathCumulativeM, progressAtTime } from '../src/ui/wayMapMath.ts';` and `import { xyToLatLon } from '../core/src/index.ts';`. Append:

```ts

// ------------------------------------------------ virgin-cycle26 brief 04
/** A WayAsset from planar waypoints (metres about 50.87 N, 4.70 E), vertices every 5 m,
 * gates at the given path-metre positions. Pixel fields are dummies (never read here). */
function synAsset(waypoints: [number, number][], gateAtM: number[]): WayAsset {
  const pts: [number, number][] = [];
  const cum: number[] = [];
  let total = 0;
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const [x0, y0] = waypoints[i]; const [x1, y1] = waypoints[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let d = 0; d < len; d += 5) { pts.push([x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len]); cum.push(total + d); }
    total += len;
  }
  pts.push(waypoints[waypoints.length - 1]); cum.push(total);
  const path = pts.map(([x, y]) => xyToLatLon(x, y, 50.87, 4.70) as [number, number]);
  const gateIdx = gateAtM.map((m) => { let k = 0; while (k + 1 < cum.length && cum[k + 1] <= m) k++; return k; });
  return {
    image: '', path, gateIdx, w: 900, h: 1400, x0: 0, y1: 0, scale: 1, offx: 0, offy: 0, sourceRide: 'syn',
    gates: gateIdx.map((k, i) => ({ name: gateName(i, gateIdx.length), lat: path[k][0], lon: path[k][1], px: 0, py: 0 })),
  };
}
const OB_WP: [number, number][] = [[0, 0], [300, 0], [300, 400], [700, 400], [700, -4], [0, -4]];
const OB_GATES_M = [22, 551, 1102, 1653, 2160];

test('virgin-cycle26 04: buildPassModel marks only retraced ground; a straight line has no partners and never fades', () => {
  const straight = synAsset([[0, 0], [3000, 0]], [30, 750, 1500, 2250, 2970]);
  const m = buildPassModel(straight)!;
  assert(m !== null && m.partnerM.every((p) => p === null), 'no partner on a single-pass line');
  assert(faintVertices(m, 100) === null && faintVertices(m, 2900) === null && faintVertices(m, null) === null, 'nothing faint, ever');
  assert(Math.abs(m.cumM[m.cumM.length - 1] - 3000) < 3, `cumM end ${m.cumM[m.cumM.length - 1]}`);
  const ob = buildPassModel(synAsset(OB_WP, OB_GATES_M))!;
  for (let k = 0; k < ob.cumM.length; k++) {
    const c = ob.cumM[k]; const p = ob.partnerM[k];
    // the return copy mirrors the outbound one: x = c outbound, x = 2204 - chainage on the return, so the partner sits at ≈ 2204 - c either way
    if (c <= 290 || c >= 1915) assert(p !== null && Math.abs(Math.abs(p - c) - Math.abs(2204 - 2 * c)) < 40, `street vertex at ${c} must have a partner on the other copy (≈ ${2204 - c}), got ${p}`);
    if (c > 350 && c < 1850) assert(p === null, `block vertex at ${c} must have no partner, got ${p}`);
  }
});

test('virgin-cycle26 04: faintVertices — outbound: the return copy is faint; on the block near the return: nothing faint; on the return: the outbound copy is faint; never within FADE_NEAR_M', () => {
  const a = synAsset(OB_WP, OB_GATES_M);
  const m = buildPassModel(a)!;
  const out = faintVertices(m, 100)!;
  assert(out !== null, 'outbound: something is faint');
  for (let k = 0; k < m.cumM.length; k++) {
    const c = m.cumM[k];
    if (c >= 1915) assert(out[k], `return copy at ${c} must be faint while outbound at 100`);
    if (c <= 290 || (c > 350 && c < 1850)) assert(!out[k], `current pass / block at ${c} must stay bright`);
  }
  const back = faintVertices(m, 2000)!;
  assert(back !== null, 'return: something is faint');
  for (let k = 0; k < m.cumM.length; k++) {
    const c = m.cumM[k];
    if (c <= 290) assert(back[k], `outbound copy at ${c} must be faint while on the return at 2000`);
    if (c >= 1915) assert(!back[k], `current (return) pass at ${c} must be bright`);
  }
  // Nearing the return street from the block (s = 1700): return vertices within 240 m ahead
  // (cum ≤ 1940) are already bright; the far end of the street (cum 2150+) is bright too because
  // the rider's chainage is NOT nearer its outbound partner any more. The outbound copy fades.
  const near = faintVertices(m, 1700)!;
  assert(near !== null, 'approaching: the outbound copy fades');
  for (let k = 0; k < m.cumM.length; k++) {
    const c = m.cumM[k];
    if (c >= 1915) assert(!near[k], `return copy at ${c} must be bright when within reach or current`);
    if (c <= 290) assert(near[k], `outbound copy at ${c} must be faint at 1700`);
  }
  // FADE_NEAR_M: a vertex less than 240 m ahead of the rider is never faint.
  const s = 1950; const f = faintVertices(m, s);
  if (f) for (let k = 0; k < m.cumM.length; k++) if (Math.abs(m.cumM[k] - s) <= FADE_NEAR_M) assert(!f[k], `vertex at ${m.cumM[k]} within ${FADE_NEAR_M} m of ${s} must not be faint`);
  assert(FAINT_OPACITY > 0 && FAINT_OPACITY < 1, 'dim, never hidden');
});

test('virgin-cycle26 04: gateFaint and the feature builders — faint:1 exactly where flagged, omitted otherwise, old call shapes unchanged', () => {
  const a = synAsset(OB_WP, OB_GATES_M);
  const m = buildPassModel(a)!;
  const out = faintVertices(m, 100);
  const g = gateFaint(a, out);
  assert(g.join(',') === 'false,false,false,false,true', `outbound at 100: only FINISH (on the return copy) is faint, got ${g}`);
  const g2 = gateFaint(a, faintVertices(m, 2000));
  assert(g2.join(',') === 'true,false,false,false,false', `return at 2000: only START (outbound copy) is faint, got ${g2}`);
  assert(gateFaint(a, null).every((v) => !v), 'no flags: nothing faint');
  const ticks = gateTicksFeatureCollection(a, undefined, 15, g);
  assert(ticks.features.length === 5 && ticks.features[4].properties.faint === 1 && !('faint' in ticks.features[0].properties), 'tick faint property');
  const plain = gateTicksFeatureCollection(a, undefined, 15);
  assert(plain.features.every((f) => !('faint' in f.properties)), 'three-argument call: no faint key');
  const spans = sectorSpansFeatureCollection(a, [null, 'x', 'x', 'x', 'x'], undefined, g)!;
  assert(spans.features.length === 4 && spans.features[3].properties.faint === 1 && spans.features.slice(0, 3).every((f) => !('faint' in f.properties)), 'span ending at FINISH is faint');
  const spansLead = sectorSpansFeatureCollection(a, [null, 'x', 'x', 'x', 'x'], 'grey', g)!;
  assert(spansLead.features.slice(4).every((f) => f.properties.lead && !('faint' in f.properties)), 'lead-in/out never faint');
  const runs = routeRunsFeatureCollection(a, out)!;
  assert(runs.features.length >= 2, `runs: ${runs.features.length}`);
  const faintRuns = runs.features.filter((f) => f.properties.faint === 1);
  assert(faintRuns.length >= 1 && runs.features.some((f) => !('faint' in f.properties)), 'both faint and bright runs');
  const coords = runs.features.reduce((n, f) => n + f.geometry.coordinates.length, 0);
  assert(coords === a.path!.length + runs.features.length - 1, `runs share boundary vertices: ${coords} coords for ${a.path!.length} vertices in ${runs.features.length} runs`);
  const single = routeRunsFeatureCollection(a, null)!;
  const base = wayLineFeature(a)!;
  assert(single.features.length === 1 && !('faint' in single.features[0].properties) && single.features[0].geometry.coordinates.length === base.geometry.coordinates.length, 'null flags: today\'s single feature');
  assert(routeRunsFeatureCollection({ ...a, path: undefined }, null) === null, 'no path: null');
});

test('virgin-cycle26 04: progressAtTime walks the same k/f as positionAtTime and is monotonic over a demo-style clock', () => {
  const a = synAsset([[0, 0], [3000, 0]], [30, 750, 1500, 2250, 2970]);
  const cum = pathCumulativeM(a.path!);
  const gateAt = [0, 100, 200, 300, 400];
  assert(progressAtTime(a, gateAt, -5) !== null && Math.abs(progressAtTime(a, gateAt, -5)! - cum[a.gateIdx![0]]) < 1e-6, 'before START: at gate 0');
  for (let k = 0; k < gateAt.length; k++) assert(Math.abs(progressAtTime(a, gateAt, gateAt[k])! - cum[a.gateIdx![k]]) < 1e-6, `at gate time ${k}: progress at gate ${k}`);
  let prev = -1;
  for (let t = 0; t <= 450; t += 7) { const p = progressAtTime(a, gateAt, t)!; assert(p >= prev, `monotonic at t=${t}: ${p} < ${prev}`); prev = p; }
  assert(Math.abs(progressAtTime(a, gateAt, 150)! - (cum[a.gateIdx![1]] + cum[a.gateIdx![2]]) / 2) < 1e-6, 'midway in sector 2 by time = midway by metres');
  assert(progressAtTime({ ...a, gateIdx: undefined }, gateAt, 10) === null, 'no gateIdx: null');
});
```

**`tests/waymap_suite.ts`** — append:

```ts

test('virgin-cycle26 04: wayMapView draws the pass the rider is not on at FAINT_OPACITY (progressM prop, faint paint on route / spans / ticks), cycles stacked gates on tap; the three live surfaces pass progressM', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(src.includes('progressM?: number | null;'), 'progressM prop');
  assert((src.match(/\['case', \['has', 'faint'\], FAINT_OPACITY, 1\]/g) ?? []).length === 5, `faint opacity expression on route-casing, route-core, sector-spans-core, gate-ticks-casing, gate-ticks (want 5), got ${(src.match(/\['has', 'faint'\]/g) ?? []).length}`);
  assert(!src.includes("'line-opacity': 1,"), 'the fixed gate-ticks opacity is gone');
  assert(src.includes('routeRunsFeatureCollection(asset, faintVerts)') && src.includes('buildPassModel(asset)'), 'route FC built from the pass model');
  assert(src.includes('gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen, faintGates)') && src.includes('sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour, faintGates)'), 'faint gates reach ticks and spans');
  assert(src.includes('nextGateOnTap(hits, props.gateSelect!.selected)') && !src.includes('features?.[0]?.properties?.name'), 'tap handler cycles stacked gates');
  assert(!/['"]line-(dasharray|gradient)['"]/.test(src), 'no dasharray / gradient paint property (2026-08-24 device bug class; comments may name them)');
  const rec = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  const demo = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'DemoScreen.tsx'), 'utf8');
  const rep = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'ReplayScreen.tsx'), 'utf8');
  assert(rec.includes('progressM={live.chainageM}'), 'LIVE: engine chainage');
  assert(demo.includes('progressM={progressAtTime(ASSET, script.gateAt, clockS)}'), 'DEMO: progressAtTime');
  assert(rep.includes('progressM={pos ? pos.sM : null}'), 'REPLAY: recorded chainage');
});
```

**`tests/gateseeding_suite.ts`** — add `nextGateOnTap` to the `gateAdjustModel` import and append:

```ts

test('virgin-cycle26 04: nextGateOnTap — single hit is the old behaviour, a stack cycles, unknown names are ignored', () => {
  assert(nextGateOnTap([2], null) === 2, 'single hit, nothing selected');
  assert(nextGateOnTap([2], 2) === 2, 'single hit, same selected (the card toggles it off)');
  assert(nextGateOnTap([2], 0) === 2, 'single hit, another selected');
  assert(nextGateOnTap([4, 0], null) === 0, 'stack, nothing selected: lowest index');
  assert(nextGateOnTap([4, 0], 0) === 4, 'stack, first selected: next');
  assert(nextGateOnTap([4, 0], 4) === 0, 'stack, last selected: wraps');
  assert(nextGateOnTap([4, 0], 2) === 0, 'stack, a gate outside the stack selected: first of the stack');
  assert(nextGateOnTap([-1, 3, 3, -1], null) === 3, 'duplicates and unknown names (-1) are dropped');
  assert(nextGateOnTap([-1], null) === null && nextGateOnTap([], 1) === null, 'nothing tappable: null');
});
```

## 5. Expected BEFORE / AFTER

| test | before | after |
|---|---|---|
| the four `waymapgeo_suite` tests, `nextGateOnTap` | cannot compile (new exports missing) — BEFORE evidence is the import failure line | PASS |
| `waymap_suite` source pin | FAIL at `progressM?: number \| null;` | PASS |
| `waymap_suite:259` (key === id) and `:361` (rider last, no conditional mount) | PASS | PASS (unedited) |
| every pre-existing `waymapgeo_suite` test (`gateTicksFeatureCollection` 3-arg, `sectorSpansFeatureCollection` 3-arg, `wayLineFeature`) | PASS | PASS (unedited) |
| `demo_suite` (58 tests), `replay_suite`, `replay_drift_suite` | PASS | PASS (unedited) |

The meaningful "fails before" here is the whole feature's absence; the behavioural assertions in the `faintVertices` test are the design (plan D10) written down — if any of them fails AFTER your edit, STOP and report the printed chainage values (Fable derived the thresholds by hand: street copies at cum ≤ 290 / ≥ 1915 on a 2 204 m path, block 350-1850).

## 6. Steps

1. `GIT_OPTIONAL_LOCKS=0 git status --short` (brief 02 landed; 01/03 may be present — attribute); baseline `cd app && node --experimental-strip-types tests/run.ts | tail -1`.
2. §4.6 first → run → record the import-failure line. Then §4.1, 4.2, 4.3 → run → the `waymapgeo`/`gateseeding` tests PASS, the `waymap_suite` pin still FAILS (record).
3. §4.4, §4.5 → run → zero FAIL, count = baseline + 6.
4. `cd app && ./node_modules/.bin/tsc --noEmit` (timeout_ms 180000, tee `cycles/virgin-cycle26/06-brief-04-tsc.log`) → exit 0. If `wayLineFeature` is reported unused in `wayMapView.tsx`, drop it from that import only.
5. `GIT_OPTIONAL_LOCKS=0 git diff --stat` → the ten files of §3 (plus earlier briefs', attributed); `git diff -- app/tests/ui-strings.allow.json` empty; `git diff -- app/src/ui/wayMapView.tsx` → hunks: imports, props, hook block, builders (`faintGates` + two calls), route paint, sector paint, tap handler + gate paint — and NOTHING touching a `<M.GeoJSONSource` line (`git diff -- app/src/ui/wayMapView.tsx | grep -c "^[+-].*GeoJSONSource"` → 0; unchanged context lines around the route/sector paint hunks will show `GeoJSONSource` — expected, not a finding. Ruling 2026-10-08 brief 04 in RULINGS.md).
6. Report → `cycles/virgin-cycle26/06-brief-04-executor-report.md`: files, counts, BEFORE/AFTER, tsc, diffs, deviations verbatim; remind the coordinator that the fade is only visible on device on a retraced route or in REPLAY of one (plan Q1), and hand over the OPEN-ITEMS text from `05-plan.md` §8.

## 7. Acceptance

- Suite zero FAIL, +6; tsc exit 0; `waymap_suite.ts:259/:361`, pre-existing `waymapgeo_suite`, `demo_suite`, `replay_*` tests unedited and passing.
- `grep -c "GeoJSONSource" app/src/ui/wayMapView.tsx` unchanged from baseline; no `key=`/`id=` diff; no quoted `'line-dasharray'`/`'line-gradient'` paint key (`grep -nE "['\"]line-(dasharray|gradient)['\"]" app/src/ui/wayMapView.tsx` → no hits; the two pre-existing comments naming the words at :584 and :866-867 are not hits).
- `trail-casing`/`trail-core` paint unchanged (brief §1 names exactly five layers; §8 lists the trail as a non-goal; the trail source carries no `faint` property).
- `grep -n "progressM" app/src/ui/RecordScreen.tsx app/src/ui/DemoScreen.tsx app/src/ui/ReplayScreen.tsx` → exactly one hit per file.
- `gateAdjustModel.ts` still import-free; `wayMapMath.ts` still import-free; `wayMapGeo.ts` imports exactly core (`CORRIDOR_M, PASS_GAP_M`) and `wayMapMath` (`pathCumulativeM`, type `WayAsset`).
- No new string; `ui-strings.allow.json` unchanged; no `Alert`, no label.

## 8. Non-goals

- No change to self dots, rider dot, trail, ride-trace, the camera, the PNG rung, `catalogMapView.tsx`, `gateAdjustCard.tsx`, `GateAdjustScreen.tsx`.
- No change to the DEMO fixture geometry (plan Q1) or `demoModel.ts`.
- No drawing change for two ticks on the same pixel beyond the fade (START/FINISH on a pure out-and-back still share a spot).
- Seeding and stops: brief 03. Engine: brief 02. Picker: brief 01.

## 9. For the Inspect pass

Rerun §6-7. Read every JSX/hook change for Rules-of-Hooks order: the three new `useMemo`s sit where `wayFC`'s memo was (above the `riderOnly` early return) and run on every render; `faintGates` is a plain const after the guard (like the other unmemoized builders). Check `progressKey` quantises to 10 m so the route FC is not rebuilt every fix. Mutate-check by reasoning: with the `|s − partner| < |s − cum|` clause removed, the `faintVertices` test's "block near the return" case (s = 1700: return copy must be bright) fails; with the `> nearM` clause removed, the `s = 1950` case fails. Check `routeRunsFeatureCollection` shares boundary vertices (the coordinate-count assertion) so no gaps appear at run boundaries with round caps. Check `gateFaint` returns all-false for a bundled asset without `gateIdx`. Check `buildPassModel` is O(n²) only once per asset (`useMemo([asset])`) and that `WayAsset` objects are referentially stable across renders (they come from `resolveWayAsset`'s cache / a module constant in DEMO). Confirm `wayMapGeo.ts`'s new core import does not pull a JSON import into the headless suite (core has none).
