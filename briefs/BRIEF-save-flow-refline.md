# BRIEF — Save-flow gates, PART A of 3: real reference line from the reference ride

**Written 2026-08-31 (Plan tier, fable) against `virgin` HEAD `3c738fa`. Every anchor,
line number and quoted "before" block below was verified against that HEAD this session.
The baseline was actually run this session: `node --experimental-strip-types
app/tests/run.ts` → `283 tests: 280 pass, 0 fail, 3 skip`; `npx tsc --noEmit` → exit 0.
The edit set was dry-run mentally against the verified quotes, NOT applied — predicted
post-edit outputs are derived, so treat any deviation as stop-and-report, not as noise.**

This is PART A of a three-brief sequence for OPEN-ITEMS item 3 ("Save-flow gate UI +
provisional gates"). A: build + persist a real reference line for a user-created route.
B (`BRIEF-save-flow-gates-ui.md`): sector-gate seeding + tap-then-nudge card — MUST NOT
be executed until A has landed and verified. C (`BRIEF-debug-export.md`): debug export —
depends on A only for one import; run it after A (order A → B → C).

## Stop-on-ambiguity

**If any ambiguity or surprise arises — an anchor that doesn't match, a test that fails
differently than predicted, a file that differs from what this brief quotes — STOP and
report back. Never guess, never improvise a fix.** An escalation means this brief was
underspecified; that is the brief's fault, not yours.

## Mandate

1. Move `collapseStationaryRuns` from `app/tests/build_track_ref.ts` into
   `app/core/src/reference.ts` (numeric behaviour identical; log line moves to the
   caller; the collapsed runs become part of the return value).
2. New pure module `app/src/live/userRefs.ts`: build a `RefLine` from a ride's raw
   recorded fixes (the exact single-ride recipe `build_track_ref.ts` already uses),
   keep a runtime registry of user-built refs, and persist them to `refs.user.json`
   under the storage root.
3. `app/src/live/refs.ts`: `refFor()` falls back to the user-ref registry before
   throwing (bundled tracks win any id collision).
4. `RecordScreen.tsx`: on naming-card SAVE, build the ref from the just-finished
   ride's JSONL and persist it under the new route's `refLineId`, so the route becomes
   resolvable (live-raceable candidate via `tracks.ts`) immediately and across restarts.
5. `App.tsx`: load `refs.user.json` at boot (`initUserRefs`), in the existing init chain.
6. Tests: new `app/tests/userrefs_suite.ts` (9 tests) + registration in
   `app/tests/run.ts`.

No gate changes in this part (`wayCreation.ts` is untouched); no UI beyond the two
onNamingSave lines. Sector gates + the adjust card are PART B.

## Design decisions already made (do not re-decide)

- **Persistence location: `refs.user.json` under the storage root** (sibling of
  `catalog.user.json` and `rides/`), one file for all user-built refs, same
  `{rx, ry, ch, lat0, lon0}` per-track shape as the bundled
  `app/tests/fixtures/refs.json`. Why: `live/refs.ts` reads a **Metro-bundled** JSON —
  read-only at runtime, so runtime-built refs need their own store; a storage-root JSON
  via `FsAdapter` is the established pattern (`catalogStore.ts`); one file keeps boot to
  one read and mirrors the bundled file's shape.
- **User refs are DERIVED data** — rebuildable in principle from
  `rides/<rideId>.jsonl` + `Route.referenceRideId` (both kept forever). Read posture is
  therefore tolerant: missing file = nothing built yet; undecodable file = console.warn,
  empty registry, file left untouched by init. A later `saveUserRef` rewrites the whole
  file from the registry (last-write-wins, serialized) — acceptable for a derived store.
  (No automatic rebuild-from-JSONL at boot in this pass; flagged in handoff.)
- **Bundled wins collisions**: `refFor()` checks `refs.json` first, user registry
  second — the same seed-wins rule as `mergeCatalogs` (`store/catalog.ts:244`).
- **Build recipe = `build_track_ref.ts`'s single-ride recipe, exactly**: filter flagged
  fixes → `collapseStationaryRuns` (15 m / 20 s) → `meanOrigin([ride])` →
  `buildReference` (k=5 box smooth, 5 m resample) → mm-round rx/ry and RECOMPUTE
  chainage from the rounded coords (`roundRef` discipline: "what is stored is exactly
  what replay uses"). Do not invent a different pipeline.
- **Fix filtering**: exclude `preStart` and `warmup` fixes only — the existing doctrine
  ("every DERIVED consumer excludes it", `storage/types.ts:12–24`). No extra accuracy
  threshold: warm-up poor accuracy is exactly what the `warmup` flag already marks.
- **Guards**: `buildRefFromRideFixes` returns `null` when fewer than 2 usable fixes
  remain, when the built line has <2 vertices, or when its length is below
  `MIN_TRACK_LENGTH_M` (200 m, imported from `store/wayCreation.ts` — same floor as the
  naming offer itself). Null ⇒ the way saves exactly as today (unresolvable
  `refLineId`); building a reference must never block creating the way.
- **Stop chainages are computed here** (each collapsed run's centroid projected onto
  the built line via core `nearestOnSegments`) and returned as `stopChainageM` — Part B
  consumes them for gate snapping. Zero network, zero new data source: the reference
  ride's own ≥20 s stationary runs are the proxy for "there is probably a light or
  junction here".
- **Ref is persisted AFTER `saveUserCatalog` succeeds** (an orphan ref for a refused
  save would be harmless but pointless); it is registered in memory synchronously inside
  `saveUserRef` before the best-effort file write, so the route is resolvable this
  session even if the write fails.
- **`saveUserRef` never throws** (best-effort write, same posture as every sidecar
  write in this app — `catalogStore.ts`'s `enqueueWrite` shape).

## Edit 1 — `app/core/src/reference.ts` (move `collapseStationaryRuns` into core)

Anchor: the import at **line 4** and end-of-file after `buildReference` (file is 94
lines; `buildReference` closes at line 94).

Before (line 4, verbatim):
```typescript
import { toXY, cumdist, resample } from './geo.ts';
```
After:
```typescript
import { M_PER_DEG_LAT, M_PER_DEG_LON, toXY, cumdist, resample } from './geo.ts';
```

Append at end of file (after line 94):
```typescript

/** One collapsed stationary run (parked bike / red light / junction wait):
 * its centroid, time span, and how many raw points it swallowed. Chainage is
 * NOT computed here — the caller projects the centroid onto whatever
 * reference line it builds. */
export interface StationaryRun {
  lat: number;
  lon: number;
  tFromS: number;
  tToS: number;
  nPoints: number;
}

export interface CollapsedRide {
  ride: RidePoints;
  runs: StationaryRun[];
}

/** Planar distance (metres) between two lat/lon points, equirectangular about
 * their own midpoint latitude — accurate enough for a 15 m threshold check.
 * (Moved verbatim from tests/build_track_ref.ts, cycle 024.) */
function pointDistM(alat: number, alon: number, blat: number, blon: number): number {
  const latMidRad = ((alat + blat) / 2) * (Math.PI / 180);
  const dy = (alat - blat) * M_PER_DEG_LAT;
  const dx = (alon - blon) * M_PER_DEG_LON * Math.cos(latMidRad);
  return Math.hypot(dx, dy);
}

/** Stationary-run collapse (data/analysis/way-curation.md, "On smoothing it
 * out"): where consecutive fixes stay within `radiusM` of the run's first fix
 * for more than `minDurationS`, replace the whole run with ONE centroid point
 * (mean lat/lon/ele, first t). Pure; operates on the point order as given.
 * Moved here from tests/build_track_ref.ts (cycle 024) so the on-phone
 * reference builder (app/src/live/userRefs.ts) and the QA script share ONE
 * implementation. Numeric behaviour is IDENTICAL to the original; only the
 * console.log moved to the caller, and the collapsed runs are now returned
 * alongside the ride. */
export function collapseStationaryRuns(
  ride: RidePoints, radiusM = 15, minDurationS = 20,
): CollapsedRide {
  const n = ride.lat.length;
  const outT: number[] = [];
  const outLat: number[] = [];
  const outLon: number[] = [];
  const outEle: number[] = [];
  const runs: StationaryRun[] = [];

  let i = 0;
  while (i < n) {
    let j = i;
    while (
      j + 1 < n &&
      pointDistM(ride.lat[i], ride.lon[i], ride.lat[j + 1], ride.lon[j + 1]) <= radiusM
    ) {
      j += 1;
    }
    const duration = ride.t[j] - ride.t[i];
    if (j > i && duration > minDurationS) {
      let sla = 0, slo = 0, sel = 0;
      for (let k = i; k <= j; k++) {
        sla += ride.lat[k];
        slo += ride.lon[k];
        sel += ride.ele[k];
      }
      const count = j - i + 1;
      outT.push(ride.t[i]);
      outLat.push(sla / count);
      outLon.push(slo / count);
      outEle.push(sel / count);
      runs.push({ lat: sla / count, lon: slo / count, tFromS: ride.t[i], tToS: ride.t[j], nPoints: count });
      i = j + 1;
    } else {
      outT.push(ride.t[i]);
      outLat.push(ride.lat[i]);
      outLon.push(ride.lon[i]);
      outEle.push(ride.ele[i]);
      i += 1;
    }
  }

  return {
    ride: {
      name: ride.name,
      t: Float64Array.from(outT),
      lat: Float64Array.from(outLat),
      lon: Float64Array.from(outLon),
      ele: Float64Array.from(outEle),
    },
    runs,
  };
}
```
(`core/src/index.ts` already does `export * from './reference.ts';` — no index edit.)

## Edit 2 — `app/tests/build_track_ref.ts` (import from core; identical output)

2a. Import block, **lines 31–34**. Before (verbatim):
```typescript
import {
  parseGpx, meanOrigin, buildReference, cumdist, M_PER_DEG_LAT, M_PER_DEG_LON,
  type RidePoints,
} from '../core/src/index.ts';
```
After:
```typescript
import {
  parseGpx, meanOrigin, buildReference, collapseStationaryRuns, cumdist,
  type RidePoints,
} from '../core/src/index.ts';
```
(`M_PER_DEG_LAT`/`M_PER_DEG_LON` were only used by the local `pointDistM`, which moves
to core — verified: their only other mention in this file is inside the deleted block.)

2b. Delete the whole local block **lines 41–111** — the `pointDistM` doc comment +
function (lines 41–48) and the `collapseStationaryRuns` doc comment + function
(lines 50–111), which ends with:
```typescript
  return {
    name: ride.name,
    t: Float64Array.from(outT),
    lat: Float64Array.from(outLat),
    lon: Float64Array.from(outLon),
    ele: Float64Array.from(outEle),
  };
}
```
Do NOT delete the file-header comment (lines 1–28) or anything from `roundRef` down.

2c. Call site, **line 148** (inside `main()`). Before (verbatim):
```typescript
  ride = collapseStationaryRuns(ride);
```
After (reproduces the moved log line exactly, from the returned runs):
```typescript
  const collapsed = collapseStationaryRuns(ride);
  const collapsedPoints = collapsed.runs.reduce((a, r) => a + r.nPoints, 0);
  console.log(
    `collapseStationaryRuns: ${collapsed.runs.length} run(s), ${collapsedPoints} raw points -> ` +
      `${collapsed.runs.length} centroid point(s); ${ride.t.length} -> ${collapsed.ride.t.length} points`,
  );
  ride = collapsed.ride;
```

## Edit 3 — NEW FILE `app/src/live/userRefs.ts`

Create with exactly this content:
```typescript
/**
 * User-built reference lines (OPEN-ITEMS item 3, save-flow package, Part A).
 *
 * live/refs.ts reads a Metro-BUNDLED refs.json — read-only at runtime, so a
 * route born on the phone (retroactive way creation) can never get its
 * reference line there. This module is the runtime half: it builds a RefLine
 * from the reference ride's own recorded fixes (the EXACT single-ride recipe
 * tests/build_track_ref.ts uses: flag-filter -> stationary-run collapse ->
 * meanOrigin -> buildReference -> mm-round + recompute chainage), keeps an
 * in-memory registry, and persists to refs.user.json under the storage root
 * (sibling of catalog.user.json). refFor() (live/refs.ts) falls back to this
 * registry, bundled tracks winning any id collision — the same seed-wins rule
 * as store/catalog.ts's mergeCatalogs.
 *
 * Posture: user refs are DERIVED data — rebuildable in principle from
 * rides/<rideId>.jsonl + Route.referenceRideId, both kept forever. So reads
 * are tolerant (missing => nothing built yet; undecodable => warn, empty
 * registry, file untouched by init) and writes are best-effort and
 * serialized (catalogStore.ts's writeTail shape). saveUserRef never throws.
 *
 * Pure — no expo, no react-native, no bundled-JSON imports; the QA suite
 * runs this headless against createMemoryFsAdapter.
 */
import type { RefLine, RidePoints } from '../../core/src/index.ts';
import {
  buildReference, collapseStationaryRuns, cumdist, meanOrigin, nearestOnSegments,
} from '../../core/src/index.ts';
import { MIN_TRACK_LENGTH_M } from '../store/wayCreation.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export const USER_REFS_FILE = 'refs.user.json';
export const USER_REFS_SCHEMA_VERSION = 1;

interface RawUserRef { rx: number[]; ry: number[]; ch: number[]; lat0: number; lon0: number }
interface UserRefsFile { schemaVersion: number; tracks: Record<string, RawUserRef> }

/** What buildRefFromRideFixes needs from a fix — matches storage FixRecord. */
export interface RefFixInput {
  lat: number;
  lon: number;
  ele?: number;
  tUnixMs: number;
  preStart?: boolean;
  warmup?: boolean;
}

export interface BuiltRideRef {
  ref: RefLine;
  /** Chainage (m on `ref`) of each >=20 s stationary run's centroid — the
   * reference ride's own stops. Part B's gate-snap input: with no OSM
   * traffic-signal source wired in, the rider's own observed stops are the
   * honest zero-network proxy for "a light or junction is probably here". */
  stopChainageM: number[];
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Build a route's reference line from its reference ride's raw fixes.
 * Returns null (build refused, caller proceeds without a ref) when fewer
 * than 2 usable fixes remain after flag-filtering, when the line has <2
 * vertices, or when its length is under MIN_TRACK_LENGTH_M — the same floor
 * as the naming offer itself.
 */
export function buildRefFromRideFixes(fixes: readonly RefFixInput[]): BuiltRideRef | null {
  const used = fixes.filter((f) => !f.preStart && !f.warmup);
  if (used.length < 2) return null;
  const ride: RidePoints = {
    name: '',
    t: Float64Array.from(used, (f) => f.tUnixMs / 1000),
    lat: Float64Array.from(used, (f) => f.lat),
    lon: Float64Array.from(used, (f) => f.lon),
    ele: Float64Array.from(used, (f) => f.ele ?? 0),
  };
  const collapsed = collapseStationaryRuns(ride);
  if (collapsed.ride.lat.length < 2) return null;
  const { lat0, lon0 } = meanOrigin([collapsed.ride]);
  const raw = buildReference(collapsed.ride, lat0, lon0);
  if (raw.rx.length < 2) return null;
  // Same rounding discipline as tests/build_track_ref.ts's roundRef(): rx/ry
  // to mm, chainage RECOMPUTED from the rounded coords then rounded to 1e-6 —
  // what is stored is exactly what replay uses.
  const rx = Float64Array.from(raw.rx, (v) => round(v, 3));
  const ry = Float64Array.from(raw.ry, (v) => round(v, 3));
  const ch = Float64Array.from(cumdist(rx, ry), (v) => round(v, 6));
  const length = ch[ch.length - 1];
  if (length < MIN_TRACK_LENGTH_M) return null;
  const ref: RefLine = { rx, ry, ch, lat0, lon0, length };
  const nseg = ch.length - 1;
  const clat = Math.cos((lat0 * Math.PI) / 180) * 111320;
  const stopChainageM = collapsed.runs.map((r) => {
    const px = (r.lon - lon0) * clat;
    const py = (r.lat - lat0) * 110540;
    return nearestOnSegments(px, py, ref, 0, nseg).s;
  });
  return { ref, stopChainageM };
}

let registry = new Map<string, RefLine>();
let armedFs: FsAdapter | null = null;
let writeTail: Promise<void> = Promise.resolve();

/** The user-built ref for a track id, or null. Synchronous — refFor's seam. */
export function userRefFor(id: string): RefLine | null {
  return registry.get(id) ?? null;
}

function decodeUserRefs(text: string): UserRefsFile | null {
  try {
    const f = JSON.parse(text) as UserRefsFile;
    if (!f || typeof f.tracks !== 'object' || f.tracks === null) return null;
    return f;
  } catch {
    return null;
  }
}

function toRefLine(r: RawUserRef): RefLine | null {
  if (!Array.isArray(r.rx) || !Array.isArray(r.ry) || !Array.isArray(r.ch)) return null;
  if (r.rx.length < 2 || r.rx.length !== r.ry.length || r.rx.length !== r.ch.length) return null;
  const ch = Float64Array.from(r.ch);
  return {
    rx: Float64Array.from(r.rx),
    ry: Float64Array.from(r.ry),
    ch,
    lat0: r.lat0,
    lon0: r.lon0,
    length: ch[ch.length - 1],
  };
}

function encodeRegistry(): string {
  const tracks: Record<string, RawUserRef> = {};
  for (const [id, ref] of registry) {
    tracks[id] = {
      rx: Array.from(ref.rx), ry: Array.from(ref.ry), ch: Array.from(ref.ch),
      lat0: ref.lat0, lon0: ref.lon0,
    };
  }
  return JSON.stringify({ schemaVersion: USER_REFS_SCHEMA_VERSION, tracks }) + '\n';
}

/** Loads refs.user.json into the registry. Never throws; a missing file is
 * "nothing built yet", an undecodable one is ignored for the session (warn)
 * and left untouched. Returns how many refs loaded. */
export async function initUserRefs(fs: FsAdapter): Promise<number> {
  armedFs = fs;
  registry = new Map();
  try {
    const text = await fs.readText(USER_REFS_FILE);
    if (text === null) return 0;
    const decoded = decodeUserRefs(text);
    if (decoded === null) {
      console.warn(`initUserRefs: ${USER_REFS_FILE} is not a refs file — ignored for this session`);
      return 0;
    }
    for (const [id, raw] of Object.entries(decoded.tracks)) {
      const ref = toRefLine(raw);
      if (ref) registry.set(id, ref);
    }
    return registry.size;
  } catch {
    return 0;
  }
}

/** Registers the ref in memory AT ONCE (refFor resolves it from this line
 * on), then best-effort persists the whole registry. Never throws; a failed
 * write degrades to "unresolvable again next boot" — today's behaviour. */
export function saveUserRef(id: string, ref: RefLine): Promise<void> {
  registry.set(id, ref);
  const fs = armedFs;
  const text = encodeRegistry();
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fs.writeText(USER_REFS_FILE, text);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushUserRefWrites(): Promise<void> {
  return writeTail;
}

/** Test-only: clears the registry and disarms persistence. */
export function resetUserRefsForTests(): void {
  registry = new Map();
  armedFs = null;
  writeTail = Promise.resolve();
}
```
Note on `stopChainageM`'s projection: the centroid is converted with the same
equirectangular constants `toXY` uses (111320 / 110540, `core/src/geo.ts:11–12`),
inlined for a single point rather than allocating arrays. Keep it exactly as written.

## Edit 4 — `app/src/live/refs.ts` (fallback to the user registry)

4a. Imports, after **line 21** (`import type { RefLine, TrackId } ...`). Add:
```typescript
import { userRefFor } from './userRefs.ts';
```

4b. Inside `refFor`, **lines 37–38**. Before (verbatim):
```typescript
  const r = rawTracks[track];
  if (!r) throw new Error(`refFor: unknown track "${track}"`);
```
After:
```typescript
  const r = rawTracks[track];
  if (!r) {
    // OPEN-ITEMS item 3: routes born on the phone get their reference line
    // built from the reference ride and registered in userRefs.ts. Bundled
    // tracks win any id collision (same seed-wins rule as mergeCatalogs).
    // Not cached here — userRefs keeps its own registry, already typed.
    const u = userRefFor(track);
    if (u) return u;
    throw new Error(`refFor: unknown track "${track}"`);
  }
```

## Edit 5 — `app/src/ui/RecordScreen.tsx` (build + persist on naming SAVE)

5a. Imports: after **line 48** (`import { decodeRideFile } from '../storage/jsonl';`)
add:
```typescript
import { buildRefFromRideFixes, saveUserRef } from '../live/userRefs';
```

5b. Refactor `namingDraftFor` (**lines 68–81**) to share a fix reader. Before
(verbatim, lines 68–81):
```typescript
async function namingDraftFor(rideId: string, startedAtMs: number): Promise<WayCreationDraft | null> {
  try {
    const fs = createExpoFsAdapter();
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    const decoded = decodeRideFile(text);
    return draftWayCreation(currentCatalog(), {
      rideId,
      startedAtMs,
      fixes: decoded.fixes.map((f) => ({ lat: f.lat, lon: f.lon })),
    });
  } catch {
    return null;
  }
}
```
After:
```typescript
/** The ride's raw recorded fixes (flags included), or null on any failure. */
async function readRideFixes(rideId: string) {
  try {
    const fs = createExpoFsAdapter();
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    return decodeRideFile(text).fixes;
  } catch {
    return null;
  }
}

async function namingDraftFor(rideId: string, startedAtMs: number): Promise<WayCreationDraft | null> {
  const fixes = await readRideFixes(rideId);
  if (fixes === null) return null;
  try {
    return draftWayCreation(currentCatalog(), {
      rideId,
      startedAtMs,
      fixes: fixes.map((f) => ({ lat: f.lat, lon: f.lon })),
    });
  } catch {
    return null;
  }
}
```

5c. `onNamingSave` (**lines 451–471**). Before (verbatim — the try block, lines
455–465):
```typescript
    try {
      const built = buildWayCreationCatalog(userCatalog(), draft, names);
      const errs = await saveUserCatalog(built);
      if (errs.length > 0) {
        // saveUserCatalog refused (the MERGED catalog would not validate)
        // and changed nothing — surface WHY, keep the card up; SKIP remains.
        Alert.alert('Could not create the way', errs.join('\n'));
        return;
      }
      setNaming(null);
      setShowAnim('rev');
```
After:
```typescript
    try {
      // OPEN-ITEMS item 3 (Part A): build the route's real reference line
      // from the ride that is becoming its reference. null on ANY failure
      // => the way saves exactly as before (unresolvable refLineId) —
      // building a reference must never block creating the way.
      const fixes = await readRideFixes(draft.rideId);
      const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;
      const built = buildWayCreationCatalog(userCatalog(), draft, names);
      const errs = await saveUserCatalog(built);
      if (errs.length > 0) {
        // saveUserCatalog refused (the MERGED catalog would not validate)
        // and changed nothing — surface WHY, keep the card up; SKIP remains.
        Alert.alert('Could not create the way', errs.join('\n'));
        return;
      }
      if (builtRef) {
        // wayCreation.ts sets refLineId = route id = `route:<rideId>` —
        // persist under that id so refFor() resolves it from now on
        // (registered in memory at once; the file write is best-effort).
        await saveUserRef(`route:${draft.rideId}`, builtRef.ref);
      }
      setNaming(null);
      setShowAnim('rev');
```
(Part B will thread `builtRef` into `buildWayCreationCatalog` — do not do that here.)

## Edit 6 — `app/App.tsx` (boot load)

6a. After **line 38** (`import { initCatalogStore } from './src/store/catalogStore';`)
add:
```typescript
import { initUserRefs } from './src/live/userRefs';
```

6b. **Lines 94–95.** Before (verbatim):
```typescript
    initCatalogStore(fs)
      .then(() => initRideHistory(fs))
```
After:
```typescript
    initCatalogStore(fs)
      .then(() => initUserRefs(fs))
      .then(() => initRideHistory(fs))
```
(`initUserRefs` never throws/rejects on a bad file, so the chain's existing
error-tolerance is unchanged.)

## Edit 7 — NEW FILE `app/tests/userrefs_suite.ts` + registration

7a. `app/tests/run.ts`: after **line 21** (`import './waycreation_suite.ts';`) add:
```typescript
import './userrefs_suite.ts';
```

7b. Create `app/tests/userrefs_suite.ts` with 9 tests. Skeleton fixtures: a
"north ride" of n fixes, 0.001 deg lat steps (~110.54 m each), 5 s apart, starting at
lat 50.87 / lon 4.70 — build `RefFixInput[]` directly. Required tests (names verbatim):

1. `userRefs: buildRefFromRideFixes builds a 5 m-resampled strictly-increasing line`
   — 20-fix north ride (~2100 m). Assert: result non-null; `ch[0] === 0`; every
   `ch[i] > ch[i-1]`; `Math.abs(ref.length - 19 * 110.54) < 12` (resample's np.arange
   semantics drop up to one 5 m step; rounding is mm-scale); interior spacing
   `Math.abs((ch[10] - ch[9]) - 5) < 0.02`; `Math.abs(lat0 - mean lat) < 1e-9`.
2. `userRefs: preStart and warmup fixes are excluded from the build` — same ride plus
   a leading `{preStart: true}` fix 5 km away and one `{warmup: true}` fix; assert the
   built rx/ry/ch arrays deep-equal the clean ride's build (iterate and compare).
3. `userRefs: a >=20 s stationary knot collapses and reports one stop chainage` —
   north ride with 30 extra fixes jittered within 3 m of the 10th fix's position
   (1 s apart, so ~30 s stationary) spliced in after fix 10. Assert non-null;
   `stopChainageM.length === 1`; the value is within 30 m of `10 * 110.54`; and
   `Math.abs(ref.length - cleanRef.length) < 15`.
4. `userRefs: degenerate rides build nothing` — `[]`, one fix, all-preStart, and a
   2-fix ~56 m ride (0.0005 deg step) all return null.
**Coordinator ruling (numeric fixture correction).** The original fixture
annotations and assertions above used the LONGITUDE constant (111.32 m per
0.001 deg) for a pure-LATITUDE fixture. `app/core/src/geo.ts` defines
`M_PER_DEG_LAT = 110540.0` and `M_PER_DEG_LON = 111320.0`, and `toXY` maps
lat deltas through `M_PER_DEG_LAT`, so each 0.001 deg lat step is 110.54 m.
Verified against the real unmodified pipeline: the 20-fix north ride yields
`ref.length` = 2100.0 exactly (true length 19 * 110.54 = 2100.26 m; the k=5
box-smooth is an identity on this collinear equally-spaced fixture, and
`resample`'s np.arange semantics truncate to the last 5 m multiple). The
original test-1 assertion `Math.abs(ref.length - 19 * 111.32) < 12` would
FAIL a correct implementation (gap 15.08 m > 12); it is corrected above to
`Math.abs(ref.length - 19 * 110.54) < 12` (actual gap 0.26 m, and the <12
band still absorbs the up-to-5 m resample truncation on other fixtures).
Test 3's stop-chainage centre had the same mixup (10 * 111.32 vs the correct
10 * 110.54, a 7.8 m error); the ±30 m slack happened to cover it, but the
centre is corrected above regardless. No other numbers in this brief were
changed.

5. `userRefs: save -> restart -> load round-trips the ref exactly` — memory fs;
   `initUserRefs(fs)`, `saveUserRef('route:x', ref)`, `flushUserRefWrites()`,
   `resetUserRefsForTests()`, `initUserRefs(fs)` again; assert `userRefFor('route:x')`
   non-null and rx/ry/ch/lat0/lon0/length all exactly equal.
6. `userRefs: a missing refs.user.json is just "nothing built yet"` — fresh memory fs,
   `initUserRefs` returns 0, `userRefFor` null, no throw.
7. `userRefs: an undecodable refs.user.json is ignored and left untouched` — write
   `'not json'` to the file, `initUserRefs` returns 0 without throwing, and
   `fs.readText(USER_REFS_FILE)` still returns `'not json'`.
8. `userRefs: saveUserRef with no armed fs registers in memory and resolves` — after
   `resetUserRefsForTests()`, `await saveUserRef(...)` resolves; `userRefFor` finds it.
9. `core: collapseStationaryRuns collapses a run to its centroid and reports it` —
   hand-built `RidePoints`: 3 moving points (30 m apart, 5 s apart), then 30 points
   within 2 m of one spot 1 s apart, then 3 moving points. Assert `runs.length === 1`,
   `runs[0].nPoints === 30`, centroid lat/lon within 1e-7 of the knot mean,
   `ride.lat.length === 7` (3 + 1 centroid + 3), and `tFromS` is the run's first t.

Imports for the suite: `test`/`assert` from `./lib.ts`; `createMemoryFsAdapter` from
`../src/storage/fsAdapter.ts`; everything else from `../src/live/userRefs.ts` and
`../../` core paths as needed (`collapseStationaryRuns` from `../core/src/index.ts`).
NEVER import `../src/live/refs.ts` in the suite — its bundled-JSON import does not load
under Node (the documented reason `storage/core.ts` injects `refFor`, lines 46–52).

## Mandatory verification (run all, in order)

1. `cd app && npx tsc --noEmit` → exit code **0**, no output.
2. `cd app && node --experimental-strip-types tests/run.ts` → final line exactly:
   `292 tests: 289 pass, 0 fail, 3 skip`
3. `grep -c "userRefFor" app/src/live/refs.ts` → `2` (import + call).
4. `grep -c "initUserRefs" app/App.tsx` → `2` (import + call).
5. `grep -c "collapseStationaryRuns" app/tests/build_track_ref.ts` → `4`
   (doc-comment mention at line 16, the import, the new console.log template
   string, and the call) and
   `grep -c "export function collapseStationaryRuns" app/core/src/reference.ts` → `1`.
6. `grep -n "M_PER_DEG" app/tests/build_track_ref.ts` → no matches (exit 1).

If ANY of these differs, stop and report (see Stop-on-ambiguity).

## Must not change

- `buildReference`, `meanOrigin`, `resample`, `cumdist`, `toXY` bodies — parity-proven
  (`core/PARITY.md` discipline); Edit 1 only touches reference.ts's import line and
  appends new code.
- `collapseStationaryRuns`'s numeric behaviour (15 m radius, 20 s minimum, centroid
  math, first-t timestamp) — the move must be byte-faithful on the algorithm.
- `app/tests/fixtures/refs.json` and every other fixture; `build_fixtures.ts`.
- `app/src/store/wayCreation.ts` (Part B's file, not Part A's) and every existing
  test in `waycreation_suite.ts`.
- `exportGpx` output (byte-identical doctrine), `gpxPlusExport.ts`, `storage/core.ts`.
- `catalogStore.ts`, `catalog.user.json` semantics, `onNamingSkip`, the naming-offer
  predicate (`namingDraftFor`'s null conditions — the refactor in 5b must not change
  when it returns null).
- `refFor()`'s behaviour for every bundled track id (fallback runs only on a miss).

## Handoff notes for the coordinator

- STATE.md "Known stubs/footguns": the unresolvable-`refLineId` bullet (currently
  lines 97–100) is resolved by this brief for NEWLY-named ways; ways named BEFORE this
  landed still have no ref (no backfill built — their `catalog.user.json` route exists
  but `refs.user.json` has no entry). On Nathan's phone that is at most a test way or
  two; rebuilding from `Route.referenceRideId`'s JSONL at boot is a scoped-out
  hardening item worth a line in OPEN-ITEMS ("rebuild missing user refs at boot from
  the reference ride's JSONL — derived data, cheap insurance").
- `refs.user.json` is derived data and is deliberately NOT in the item-5 export scope
  discussion yet; if item 5 lands later it should either include it or rebuild it.
- The route map (`routeMapView.tsx`) still cannot DRAW user-created routes — it renders
  from the bundled `assets/routes/routes.json` `RouteAsset`s (raster + transform), not
  from `RefLine`s. A resolvable ref makes the route live-raceable (`tracks.ts`), not
  drawable. Synthesizing a runtime RouteAsset-equivalent from a user ref is a separate
  small package; worth an OPEN-ITEMS line.
- STATE.md still says "273 tests, 270 pass" (line 30) — stale even before this brief
  (HEAD is at 283/280/3); after A it should read 292/289/3.
