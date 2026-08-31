# BRIEF — B-39 remainder: the empty-seed install path (cycle 025 · virgin cold-start epic, step 1 · D-039 execution tier)

Written 2026-08-31 by the Fable planning pass, from the code at HEAD `0991f70` (every anchor
below verified against the actual file bytes tonight, and the WHOLE edit set dry-run:
applied, verified, restored). You are the Sonnet executor. This brief is your ONLY input —
execute exactly what is written here.

**Stop-on-ambiguity rule:** if any anchor string below does not match the file, if a test
fails for a reason this brief does not predict, if a count in the Verification section comes
out different, or if you need to make ANY decision this brief does not already make — STOP,
change nothing further, and report the exact discrepancy verbatim (file, line, what you
expected, what you found) to the coordinator. Never rule on ambiguity yourself, never
"fix forward", never re-run with variations beyond a single retry of a timed-out command.

## Environment

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every call is
  a fresh shell (no cwd/env carryover) — start every command with
  `cd "$HOME/mnt/Qualifire" && …` (or `…/Qualifire/app`).
- The mount is slow. The test suite (`node --experimental-strip-types tests/run.ts`) takes
  ~40 s; `tsc --noEmit` took ~50 s on the planning pass. Run tsc as
  `./node_modules/.bin/tsc --noEmit` (NOT `npx tsc`) with `timeout_ms` around 170000 and NO
  `timeout` shell prefix. Backgrounding (nohup/disown) does not survive across device_bash
  calls — never try it.
- Do NOT run any git write command (add/commit/checkout/reset/clean/stash) — the coordinator
  commits. Read-only `git status` / `git diff --stat` are fine. A
  `warning: unable to unlink '…/.git/index.lock'` line, or a stream of
  `warning: CRLF will be replaced by LF in …` lines, may appear on this mount — both are
  benign noise, ignore them.
- Never delete a file. Never run anything under `data/analysis/`. Do NOT run
  `07_build_mockup.py` or `08_build_route_assets.py`.
- Node v22 and `app/node_modules/.bin/tsc` are present. `python3` is NOT available in
  device_bash — use `node` for any scripted edit.
- A single device_bash command has an argument-size limit (the planning pass hit `E2BIG`
  writing one large heredoc): write long files in two or three appended chunks
  (`cat > f <<'EOF'` then `cat >> f <<'EOF'`), never one giant call.
- Scratch space for helper scripts: `mkdir -p "$HOME/b39-exec"` (outside the repo — never
  put scratch files inside `$HOME/mnt/Qualifire`).

## Mandate

- **B-39** (`product/BACKLOG.md` row B-39, status PART-DONE 2026-08-24): "De-hardcode route
  identity … empty-seed install path. Blocks every user-created way." Cycle 024's WP-D3 built
  `defaultRoute.ts` and de-hardcoded the four screens; its own text says **"the empty-seed
  install path is still untouched — remains OPEN"**. That remainder is this brief's whole
  scope.
- **D-045 ruling 3** (`product/DECISIONS.md`, 2026-08-26): "Someone else besides Nathan can
  use this app" is an actual goal and a top priority — a virgin blank-install app another
  rider could use. Nathan: "First I want of course to test the virgin build myself but for
  that we should build it ASAP."
- **Epic sequencing** (`cycles/cycle-025-briefs/WP-virgin-cold-start-epic.md`, "Sequencing"):
  step 1 = the B-39 remainder, "the one technical prerequisite … Nothing else in the flow can
  exist before it." Steps 2+ (B-36/B-42 retroactive way creation, the save-flow UI, B-37,
  B-43) are NOT this brief — see "Deferred" at the end.

## What the empty-seed install path actually is (findings at HEAD, verified tonight)

1. **The catalog is a compile-time constant.** `catalog.seed.json` is imported directly by
   FIVE modules (`live/tracks.ts`, `store/resultsStore.ts`, `ui/lastRide.ts`,
   `ui/RecordScreen.tsx`, `ui/RoutesScreen.tsx`), each freezing `const CATALOG = …` at module
   scope. There is no runtime catalog, so there is nowhere a user-created landmark/way/route
   could ever be written — that is the literal meaning of "blocks every user-created way".
   The archive ghosts (`results.seed.json`) are likewise imported directly by
   `ui/colourModel.ts` and `ui/ResultScreen.tsx`.
2. **The live engine snapshots the catalog at import.** `live/engine.ts` line 358:
   `this.specs = specs ?? catalogTrackSpecs()` in the constructor, and `export const
   liveEngine = new LiveEngine()` at line 944 — so even a runtime catalog would be invisible
   to the module-scope engine.
3. **Two route-identity hardcodes survive on the empty path.** `RecordScreen.tsx` lines
   151–152: `useState('home')` / `useState('work')` — literal landmark ids. And
   `routeMapView.tsx` line 77: `DEFAULT_ROUTE_ID = Object.keys(ASSETS)[0]` — with an empty
   catalog but the (still bundled) asset manifest, a stranger's setup map would draw
   Nathan's `Morning` route in Leuven.
4. **What an empty catalog does today, screen by screen** (traced in code — the seed cannot
   be emptied without this brief): nothing crashes. RECORD: `from='home'`/`to='work'` render
   as raw ids, no pills, "no route known for this pair yet", a ride records unscored; the
   setup/armed map draws the manifest's first route (wrong — finding 3). ROUTES: two empty
   cards with boilerplate prose. RESULT: "Record a ride to see it here." / "No route history
   on file yet." (already fine). DEMO: unaffected (it reads the manifest, not the catalog).
   The free-ride gates-only map already handles zero routes (`routeMapView.tsx` lines
   372–374 — a Leuven-area centre fallback when there is no fix; B-43 material, untouched).
5. **The one remaining literal is still `DemoScreen.tsx` line 26** (`const ROUTE =
   'Morning';`, with its "Intentional literal (B-39)" comment on line 25). Still legitimately
   exempt — a scripted replay of an archived lap — and this brief does not touch it.
6. **No test at HEAD exercises an empty catalog.** `store_suite.ts` has `fallbackRouteId(
   emptyCatalog(), [])` only. This brief adds the coverage.

## Design (pre-resolved — do not redesign)

- **`store/seed.ts` — one choke point for shipped data.** `shippedCatalog()` /
  `shippedResults()`; mode `'shipped'` (default) or `'empty'`, fixed at bundle time by
  `process.env.EXPO_PUBLIC_SEED_MODE` (Expo inlines `EXPO_PUBLIC_*` at build; under Node it
  is unset ⇒ `'shipped'`, so the headless suite is unchanged). No `expo-constants` — it would
  break the Node suite.
- **`store/catalogStore.ts` — the runtime catalog** = `mergeCatalogs(shippedCatalog(),
  userCatalog)`. The user catalog is `catalog.user.json` under the storage root (sibling of
  `rides/`, `results/`, `free-rides-cache.json`) and holds ONLY what the phone created. **The
  seed is never copied to disk** — so Nathan's seed edits keep reaching his phone exactly as
  today, no install-once trap, and a virgin build (empty seed) runs on the user file alone.
  Missing file ⇒ nothing added; undecodable/unreadable ⇒ ignored for the session and never
  overwritten (it is the only copy of a rider's own places). `saveUserCatalog()` validates
  the MERGED catalog first. Nobody calls it yet — it is the seam B-36/B-42 write through.
- **Every consumer reads `currentCatalog()` at use time**, never at import; the engine
  resolves `catalogTrackSpecs()` at `start()`.
- **Two pure, tested fallbacks replace the last literals:** `defaultEndpoints(c)` (first two
  offerable landmarks — home, work on today's seed; null ⇒ the `'~new'` pseudo-landmark, so a
  blank install opens on new>>new, the free ride that needs no catalog) and
  `defaultMapRouteId(c, drawable)` (first CATALOG route with an asset — `Morning` on today's
  seed, i.e. byte-identical behaviour for Nathan; null on an empty catalog ⇒ the map renders
  nothing rather than somebody else's road).
- **A `virgin` build profile** (`eas.json` + `app.config.js`): a third separate app,
  "Qualifire Virgin", package `….virgin`, `EXPO_PUBLIC_SEED_MODE=empty`. Building it is
  Nathan's device action, not yours.
- **Minimal empty states on ROUTES** ("No places yet." / "No ways yet.") — one line each, so a
  blank install's cards do not read as broken. B-43's empty-state pass owns the real design.

## Baseline at HEAD (measured tonight by the planning pass)

- `cd app && node --experimental-strip-types tests/run.ts` → **264 tests: 261 pass, 0 fail, 3 skip**.
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0.
- `git status --short` shows exactly two pre-existing untracked entries (`_to_delete/` and
  `data/activities/TEST in app rides/qualifire-20260830/`) — they are Nathan's, leave them.

Re-run both baselines yourself BEFORE editing. If either differs, STOP and report.

---

## Part A — two NEW files under `app/src/store/`

The planning pass's dry-run copies of all three new files (A1, A2 and E2) are parked in
`safe_to_delete/b39-plan-dryrun-20260831/` (gitignored). If that folder still exists, you may
`cp` them into place instead of retyping — then confirm `wc -l` gives **53** (seed.ts),
**128** (catalogStore.ts), **190** (catalogstore_suite.ts) and that each file's first line
matches the listing below. If the folder is gone or a count differs, create the files from
the listings here (they are the source of truth). Do NOT delete the parked copies.

### A1. `app/src/store/seed.ts` (NEW, 53 lines)

```ts
/**
 * The shipped seed — the ONE place the app reads its bundled catalog and
 * archive ghosts from (cycle 025, B-39 remainder: the empty-seed install
 * path; D-045 ruling 3 — a stranger with a blank install must be able to use
 * this app).
 *
 * Two seed modes, fixed at bundle time:
 *  - 'shipped' (default — Nathan's dev client and "Qualifire Preview"): the
 *    curated catalog (catalog.seed.json: 6 landmarks, 13 ways, 20 routes)
 *    and the archive ghosts (results.seed.json), exactly as before this
 *    module existed.
 *  - 'empty' (the virgin build — eas.json's `virgin` profile sets
 *    EXPO_PUBLIC_SEED_MODE=empty): NO landmarks, ways, routes, gate sets or
 *    ghosts. Everything the rider will ever race against is created on the
 *    phone (B-36/B-42, unbuilt) and lives in store/catalogStore.ts's user
 *    catalog file.
 *
 * `process.env.EXPO_PUBLIC_*` is inlined by Expo's bundler at build time, so
 * the mode is a constant in the shipped bundle; under Node (the headless
 * suite) the variable is simply unset and the seed is 'shipped'. The pure
 * `...ForSeedMode` functions exist so the suite can exercise the 'empty'
 * branch without touching the environment.
 *
 * Nothing here is ever mutated: both JSON imports are handed out as-is —
 * every consumer treats a Catalog / RideResult[] as read-only, as before.
 */
import catalogJson from './catalog.seed.json';
import resultsJson from './results.seed.json';
import { emptyCatalog } from './catalog.ts';
import type { Catalog, RideResult } from './types.ts';

export type SeedMode = 'shipped' | 'empty';

export const SEED_MODE: SeedMode =
  process.env.EXPO_PUBLIC_SEED_MODE === 'empty' ? 'empty' : 'shipped';

export function catalogForSeedMode(mode: SeedMode): Catalog {
  return mode === 'empty' ? emptyCatalog() : (catalogJson as unknown as Catalog);
}

export function resultsForSeedMode(mode: SeedMode): RideResult[] {
  return mode === 'empty' ? [] : (resultsJson as unknown as RideResult[]);
}

/** The catalog this build ships with. */
export function shippedCatalog(): Catalog {
  return catalogForSeedMode(SEED_MODE);
}

/** The archive ghosts this build ships with. */
export function shippedResults(): RideResult[] {
  return resultsForSeedMode(SEED_MODE);
}
```

### A2. `app/src/store/catalogStore.ts` (NEW, 128 lines)

```ts
/**
 * The runtime catalog (cycle 025, B-39 remainder — the empty-seed install
 * path).
 *
 * Before this module every reader imported catalog.seed.json directly, so
 * "the catalog" was a compile-time constant: nothing a rider does on the
 * phone could ever add a landmark, a way or a route — the backlog's own
 * words, "blocks every user-created way". Now:
 *
 *   currentCatalog() === mergeCatalogs(shippedCatalog(), userCatalog())
 *
 * where the user catalog is `catalog.user.json` under the storage root
 * (sibling of rides/ and results/), holding ONLY what was created on this
 * phone. The seed is never copied to disk — see mergeCatalogs() for why —
 * so a virgin build (seed 'empty', store/seed.ts) runs on the user file
 * alone, and Nathan's build keeps picking up seed changes exactly as before.
 *
 * Read posture (D-023-style tolerance, mirrors resultsStore.ts): a missing
 * user file is simply "nothing added yet"; an undecodable one is IGNORED for
 * the session and NEVER overwritten — unlike results/, this file is not a
 * derived cache but the only copy of the rider's own places and routes.
 * Write posture: saveUserCatalog() validates the MERGED catalog before
 * accepting, so a bad write can never leave the app reading a catalog that
 * validateCatalog() rejects; fs errors are swallowed (best-effort, like
 * every sidecar write in this app).
 *
 * Nothing calls saveUserCatalog() yet — it is the seam B-36/B-42
 * (retroactive way creation) write through.
 *
 * Synchronous readers: every consumer calls currentCatalog() at USE time
 * (never captured at import), so what it sees is the seed until
 * initCatalogStore() resolves, then seed + user. App.tsx bumps a state after
 * boot hydration so mounted screens re-render with the merged catalog.
 */
import { decodeCatalog, emptyCatalog, encodeCatalog, mergeCatalogs, validateCatalog } from './catalog.ts';
import { shippedCatalog } from './seed.ts';
import type { Catalog } from './types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export const USER_CATALOG_FILE = 'catalog.user.json';

let seed: Catalog = shippedCatalog();
let user: Catalog = emptyCatalog();
let current: Catalog = mergeCatalogs(seed, user);
let armedFs: FsAdapter | null = null;
/** Serializes every write against USER_CATALOG_FILE, last-write-wins —
 * the same shape as resultsStore.ts's writeTail. */
let writeTail: Promise<void> = Promise.resolve();

function recompute(): void {
  current = mergeCatalogs(seed, user);
}

function enqueueWrite(fn: (fs: FsAdapter) => Promise<void>): Promise<void> {
  const fs = armedFs;
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fn(fs);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

/** The catalog every reader uses: shipped seed + this phone's additions. */
export function currentCatalog(): Catalog {
  return current;
}

/** This phone's own additions only (what catalog.user.json holds). */
export function userCatalog(): Catalog {
  return user;
}

/** Loads catalog.user.json (missing => nothing added; undecodable or
 * unreadable => ignored for this session, never written) and recomputes
 * currentCatalog(). Never throws. Returns the merged catalog. */
export async function initCatalogStore(fs: FsAdapter): Promise<Catalog> {
  armedFs = fs;
  user = emptyCatalog();
  try {
    const text = await fs.readText(USER_CATALOG_FILE);
    if (text !== null) {
      const decoded = decodeCatalog(text);
      if (decoded !== null) {
        user = decoded;
      } else {
        console.warn(
          `initCatalogStore: ${USER_CATALOG_FILE} is not a catalog — ignored for this session, left untouched`,
        );
      }
    }
  } catch { /* unreadable => same as missing for this session; nothing written */ }
  recompute();
  return current;
}

/** Replaces this phone's additions. Refuses — returns validateCatalog()'s
 * errors and changes nothing — when the MERGED catalog would not validate;
 * otherwise updates currentCatalog() at once, writes the file best-effort,
 * and returns []. */
export async function saveUserCatalog(next: Catalog): Promise<string[]> {
  const errs = validateCatalog(mergeCatalogs(seed, next));
  if (errs.length > 0) return errs;
  user = next;
  recompute();
  const text = encodeCatalog(next);
  await enqueueWrite(async (fs) => {
    await fs.writeText(USER_CATALOG_FILE, text);
  });
  return [];
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushCatalogWrites(): Promise<void> {
  return writeTail;
}

/** Test-only: clears state and disarms persistence. `seedOverride` lets the
 * suite simulate a build with a different seed (an EMPTY one = the virgin
 * install) without touching process.env; omit it to return to the shipped
 * seed. */
export function resetCatalogStoreForTests(seedOverride?: Catalog): void {
  armedFs = null;
  writeTail = Promise.resolve();
  seed = seedOverride ?? shippedCatalog();
  user = emptyCatalog();
  recompute();
}
```

---

## Part B — pure helpers (2 files, append-only)

### B1. `app/src/store/catalog.ts` — append `mergeCatalogs` at END of file

The file (226 lines) currently ends with (lines 223–226):

```ts
export function sectorsComparable(a: GateSet, b: GateSet): boolean {
  if (a.chainageM.length !== b.chainageM.length) return false;
  return a.chainageM.every((v, i) => Math.abs(v - b.chainageM[i]) < 1e-6);
}
```

Append after it (a blank line, then):

```ts

/**
 * B-39 (empty-seed install path): the runtime catalog is the shipped seed
 * PLUS the rider's own additions (store/catalogStore.ts's user catalog file),
 * merged read-side on every boot. The seed is never copied onto the phone —
 * so a seed change (a new route, a moved gate) still reaches Nathan's phone
 * the way it always has — and a virgin build (empty seed) runs on the user
 * catalog alone. Seed entries win every id collision: a user entry whose id
 * already exists in the seed is dropped, never merged over it (gate sets
 * collide on routeId + version). Seed order first, user order after — every
 * "first in catalog order" rule keeps meaning what it meant. Pure;
 * validateCatalog() judges the result.
 */
export function mergeCatalogs(seed: Catalog, user: Catalog): Catalog {
  const lm = new Set(seed.landmarks.map((l) => l.id));
  const wy = new Set(seed.ways.map((w) => w.id));
  const rt = new Set(seed.routes.map((r) => r.id));
  const gs = new Set(seed.gateSets.map((g) => `${g.routeId}@${g.version}`));
  return {
    schemaVersion: seed.schemaVersion,
    landmarks: [...seed.landmarks, ...user.landmarks.filter((l) => !lm.has(l.id))],
    ways: [...seed.ways, ...user.ways.filter((w) => !wy.has(w.id))],
    routes: [...seed.routes, ...user.routes.filter((r) => !rt.has(r.id))],
    gateSets: [...seed.gateSets, ...user.gateSets.filter((g) => !gs.has(`${g.routeId}@${g.version}`))],
  };
}
```

(`Catalog` is already imported at the top of the file — no import change. File becomes 252 lines.)

### B2. `app/src/store/defaultRoute.ts` — append two helpers at END of file

The file (92 lines) currently ends with (lines 88–92):

```ts
  if (best !== null && c.routes.some((route) => route.id === best!.routeId)) {
    return best.routeId;
  }
  return c.routes[0]?.id ?? null;
}
```

Append after it:

```ts

/** B-39 (empty-seed install path): the route the map draws when nothing is
 * picked or locked yet — the FIRST CATALOG ROUTE that has a drawable asset,
 * never the asset manifest's own key order (routeMapView.tsx used to take
 * `Object.keys(ASSETS)[0]`, which in a virgin build — empty catalog, but the
 * manifest still bundled — would quietly draw one of the shipped routes for
 * a rider who has none). Null when no catalog route is drawable: the map
 * then renders nothing rather than somebody else's road. `drawable` is the
 * caller's own asset lookup, so this stays pure. Today's seed: the first
 * route is Morning, which is also the manifest's first key — byte-identical
 * behaviour for Nathan's build. */
export function defaultMapRouteId(c: Catalog, drawable: (refLineId: string) => boolean): string | null {
  for (const r of c.routes) if (drawable(r.refLineId)) return r.refLineId;
  return null;
}

/** B-39 (empty-seed install path): RecordScreen's initial STARTING FROM /
 * GOING TO — the first two offerable landmarks in catalog order (today's
 * seed: home, work — byte-identical to the old literals), null when the
 * catalog has fewer than that; the caller substitutes its 'new' pseudo-
 * landmark for null, so a blank install opens on new>>new — the free ride,
 * which needs no catalog at all. */
export function defaultEndpoints(c: Catalog): { from: string | null; to: string | null } {
  const offer = c.landmarks.filter((l) => l.offerAtStart);
  return { from: offer[0]?.id ?? null, to: offer[1]?.id ?? null };
}
```

(File becomes 118 lines.)

---

## Part C — consumers (10 files). Each edit is an exact old→new block; touch nothing else in these files.

### C1. `app/src/live/tracks.ts` (44 lines) — 2 edits

**C1a — header + imports.** Anchor (lines 5–16):

```ts
 * (refs.json, via refFor) with its current gate set (catalog.seed.json, via
 * gateSetFor). Pure — reads the SAME catalog seed the rest of the app reads,
 * so the phone and the test suite can never disagree about what "every
 * route" means.
 */
import catalogJson from '../store/catalog.seed.json';
import { gateSetFor } from '../store/catalog.ts';
import type { Catalog } from '../store/types.ts';
import { refFor } from './refs.ts';
import type { TrackSpec } from './engine.ts';

const CATALOG = catalogJson as unknown as Catalog;
```

Replace with:

```ts
 * (refs.json, via refFor) with its current gate set (the runtime catalog —
 * store/catalogStore.ts, seed + this phone's additions — via gateSetFor).
 * Pure — reads the SAME catalog the rest of the app reads, so the phone and
 * the test suite can never disagree about what "every route" means. Read at
 * CALL time, never captured at import (B-39: the catalog can be empty at
 * boot and grow later).
 */
import { gateSetFor } from '../store/catalog.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { refFor } from './refs.ts';
import type { TrackSpec } from './engine.ts';
```

(After the edit, `import type { TrackSpec } …` is followed by ONE blank line, then the
`/** One spec per catalog route …` comment — exactly as the blank line before it was.)

**C1b — read at call time.** Anchor (lines 22–23):

```ts
export function catalogTrackSpecs(): TrackSpec[] {
  const specs: TrackSpec[] = [];
```

Replace with:

```ts
export function catalogTrackSpecs(): TrackSpec[] {
  const CATALOG = currentCatalog();
  const specs: TrackSpec[] = [];
```

### C2. `app/src/live/engine.ts` (944 lines) — 4 edits, all inside `class LiveEngine`

**C2a.** Anchor (line 329):

```ts
  private readonly specs: TrackSpec[];
```

Replace with:

```ts
  /** Injected by tests; null = resolve catalogTrackSpecs() at every start()
   * (B-39: the runtime catalog can be empty at boot and grow later, so the
   * module-scope singleton must never snapshot it at construction). */
  private readonly specs: TrackSpec[] | null;
```

**C2b.** Anchor (lines 357–359):

```ts
  constructor(specs?: TrackSpec[]) {
    this.specs = specs ?? catalogTrackSpecs();
  }
```

Replace with:

```ts
  constructor(specs?: TrackSpec[]) {
    this.specs = specs ?? null;
  }
```

**C2c.** Anchor (line 368):

```ts
    const pickSpec = this.pick !== null ? this.specs.find((s) => s.id === this.pick) : undefined;
```

Replace with:

```ts
    const allSpecs = this.specs ?? catalogTrackSpecs();
    const pickSpec = this.pick !== null ? allSpecs.find((s) => s.id === this.pick) : undefined;
```

**C2d.** Anchor (line 382):

```ts
    const specs = opts?.routeIds ? this.specs.filter((s) => opts.routeIds!.includes(s.id)) : this.specs;
```

Replace with:

```ts
    const specs = opts?.routeIds ? allSpecs.filter((s) => opts.routeIds!.includes(s.id)) : allSpecs;
```

(`catalogTrackSpecs` is already imported at line 118. After these four edits
`grep -n "this\.specs" src/live/engine.ts` must show exactly 2 lines: the field declaration
and the constructor assignment.)

### C3. `app/src/store/resultsStore.ts` (467 lines) — 3 edits

**C3a — imports.** Anchor (lines 39–43):

```ts
import catalogJson from './catalog.seed.json';
import { gateSetFor } from './catalog.ts';
import { deriveRideResult } from './derive.ts';
import { emptyResultsIndex, rebuildIndex, removeResult, upsertResult } from './results.ts';
import type { Catalog, ResultsIndex, RideResult } from './types.ts';
```

Replace with:

```ts
import { gateSetFor } from './catalog.ts';
import { currentCatalog } from './catalogStore.ts';
import { deriveRideResult } from './derive.ts';
import { emptyResultsIndex, rebuildIndex, removeResult, upsertResult } from './results.ts';
import type { ResultsIndex, RideResult } from './types.ts';
```

**C3b — drop the frozen constant.** Anchor (lines 47–51):

```ts
import { CORRIDOR_M, crossTime, projectRideOffline, toXY, type RefLine } from '../../core/src/index.ts';

const CATALOG = catalogJson as unknown as Catalog;

export const RESULTS_DIR = 'results';
```

Replace with:

```ts
import { CORRIDOR_M, crossTime, projectRideOffline, toXY, type RefLine } from '../../core/src/index.ts';

export const RESULTS_DIR = 'results';
```

**C3c.** Anchor (line 422):

```ts
        const gateSetVersion = gateSetFor(CATALOG, spec.id)?.version ?? 1;
```

Replace with:

```ts
        const gateSetVersion = gateSetFor(currentCatalog(), spec.id)?.version ?? 1;
```

### C4. `app/src/ui/lastRide.ts` (299 lines) — 3 edits

**C4a — imports.** Anchor (lines 22–33, i.e. through the blank line after `const CATALOG`):

```ts
import catalogJson from '../store/catalog.seed.json';
import { gateSetFor } from '../store/catalog.ts';
import { ranks } from '../store/results.ts';
import * as resultsStore from '../store/resultsStore.ts';
import type { LiveEngineState } from '../live/engine.ts';
import type { Catalog, RideResult, SectorQuality } from '../store/types.ts';
import { RESULT_SCHEMA_VERSION } from '../store/types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeIndex } from '../storage/rideIndex.ts';

const CATALOG = catalogJson as unknown as Catalog;

```

Replace with:

```ts
import { gateSetFor } from '../store/catalog.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { ranks } from '../store/results.ts';
import * as resultsStore from '../store/resultsStore.ts';
import type { LiveEngineState } from '../live/engine.ts';
import type { RideResult, SectorQuality } from '../store/types.ts';
import { RESULT_SCHEMA_VERSION } from '../store/types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeIndex } from '../storage/rideIndex.ts';

```

(After the edit, `import { decodeIndex } …` is followed by ONE blank line, then
`export interface FinishedRide {`.)

**C4b — comment.** Anchor (line 111):

```ts
  // The ridden route's OWN current gate set (catalog.seed.json) — resolved
```

Replace with:

```ts
  // The ridden route's OWN current gate set (the runtime catalog,
  // store/catalogStore.ts — B-39) — resolved
```

**C4c.** Anchor (line 121):

```ts
  const gateSet = gateSetFor(CATALOG, routeId);
```

Replace with:

```ts
  const gateSet = gateSetFor(currentCatalog(), routeId);
```

### C5. `app/src/ui/colourModel.ts` (170 lines) — 2 edits

**C5a.** Anchor (line 18):

```ts
import seed from '../store/results.seed.json';
```

Replace with:

```ts
import { shippedResults } from '../store/seed.ts';
```

**C5b.** Anchor (line 43):

```ts
const GHOSTS = seed as unknown as RideResult[];
```

Replace with:

```ts
/** The archive ghosts this build ships with — [] in a virgin build (B-39,
 * store/seed.ts): colours and ranks then run on the phone's own rides only. */
const GHOSTS: RideResult[] = shippedResults();
```

### C6. `app/src/ui/ResultScreen.tsx` (333 lines) — 2 edits

**C6a.** Anchor (line 24):

```ts
import seedResultsJson from '../store/results.seed.json';
```

Replace with:

```ts
import { shippedResults } from '../store/seed.ts';
```

**C6b.** Anchor (line 39):

```ts
const SEED_RESULTS = seedResultsJson as unknown as RideResult[];
```

Replace with:

```ts
/** B-39 (store/seed.ts): [] in a virgin build — the PB list then lists only
 * routes this phone has actually ridden. */
const SEED_RESULTS: RideResult[] = shippedResults();
```

### C7. `app/src/ui/RecordScreen.tsx` (1183 lines) — 3 edits

**C7a — imports.** Anchor (lines 48–51):

```ts
import catalogJson from '../store/catalog.seed.json';
import { freeRideRouteIds, landmarkAt } from '../store/catalog';
import { routeLabel, routeVariantLabel, sortRoutesForDisplay } from '../store/defaultRoute';
import type { Catalog, Route } from '../store/types';
```

Replace with:

```ts
import { currentCatalog } from '../store/catalogStore';
import { freeRideRouteIds, landmarkAt } from '../store/catalog';
import { defaultEndpoints, routeLabel, routeVariantLabel, sortRoutesForDisplay } from '../store/defaultRoute';
import type { Route } from '../store/types';
```

**C7b — drop the frozen constant.** Anchor (lines 67–71, through the blank line after it):

```ts
const STOPPED_AFTER_MS = 6000;
const MOVE_EPS_M = 10;

const CATALOG = catalogJson as unknown as Catalog;

```

Replace with:

```ts
const STOPPED_AFTER_MS = 6000;
const MOVE_EPS_M = 10;

```

(After the edit, `const MOVE_EPS_M = 10;` is followed by ONE blank line, then the
`/** WP-B: a UI-only pseudo-landmark …` comment.)

**C7c — data-driven defaults, catalog read per render.** Anchor (lines 151–152, inside the
component, directly under the "Start flow (§21)" comment):

```ts
  const [from, setFrom] = useState('home');
  const [to, setTo] = useState('work');
```

Replace with:

```ts
  // B-39 (empty-seed install path): the runtime catalog — shipped seed plus
  // this phone's own additions (store/catalogStore.ts) — read per render,
  // never captured at import: it can be empty at boot and grow later.
  const CATALOG = currentCatalog();
  // B-39: data-driven, never literal ids — the first two offerable catalog
  // landmarks (today's seed: home, work), or the 'new' pseudo-landmark when
  // the catalog has none, so a blank install opens on new>>new: the free
  // ride, which needs no catalog at all.
  const [from, setFrom] = useState(() => defaultEndpoints(currentCatalog()).from ?? NEW_ID);
  const [to, setTo] = useState(() => defaultEndpoints(currentCatalog()).to ?? NEW_ID);
```

Every later `CATALOG.…` use in this file (lines ~540–588 at HEAD: `startable`, `landmarkAt`,
`freeRideRouteIds`, `way`, `wayRoutes`, `landmarkLabel`) now resolves to this per-render
constant — they are all in the render body, none inside a `[]`-dependency callback
(verified at HEAD). Touch none of them.

### C8. `app/src/ui/RoutesScreen.tsx` (112 lines) — 3 edits

**C8a — header, imports, per-render catalog.** Anchor (lines 6–26):

```tsx
 * Everything here is READ from src/store/catalog.seed.json, which was built
 * from data/analysis/landmarks_v1.json — Nathan's curated set. Nothing is
 * discovered at runtime: places and routes enter the catalog because he agreed
 * they are places and routes (DATA-MODEL §8a).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import catalogJson from '../store/catalog.seed.json';
import type { Catalog } from '../store/types.ts';
import { rankedCountFor } from './colourModel.ts';
import { routeLabel, sortRoutesForDisplay } from '../store/defaultRoute.ts';
import RouteMapView from './routeMapView.tsx';
import { radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const CATALOG = catalogJson as unknown as Catalog;

export default function RoutesScreen() {
  const { t } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();
```

Replace with:

```tsx
 * Everything here is READ from the runtime catalog (store/catalogStore.ts —
 * B-39): the shipped seed (src/store/catalog.seed.json, built from
 * data/analysis/landmarks_v1.json — Nathan's curated set) plus whatever this
 * phone has added. Nothing is discovered at runtime: places and routes enter
 * the catalog because the rider agreed they are places and routes
 * (DATA-MODEL §8a). Empty in a virgin build until the rider creates them.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentCatalog } from '../store/catalogStore.ts';
import { rankedCountFor } from './colourModel.ts';
import { routeLabel, sortRoutesForDisplay } from '../store/defaultRoute.ts';
import RouteMapView from './routeMapView.tsx';
import { radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

export default function RoutesScreen() {
  const { t } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();
  // B-39: read per render, never captured at import (see RecordScreen).
  const CATALOG = currentCatalog();
```

**C8b — places empty state.** Anchor (lines 46–49 at HEAD — the end of the landmarks `.map`
and the start of the explanatory `<Text>`; this four-line sequence is unique in the file):

```tsx
          );
        })}
        <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }}>
          Dormant places keep seeding history but are never offered at START.
```

Replace with:

```tsx
          );
        })}
        {/* B-39 minimal empty state (a blank install has no places yet) — a
            bare card read as broken; B-43's empty-state pass owns the real
            design and may replace this line. */}
        {CATALOG.landmarks.length === 0 ? (
          <Text style={{ color: t.textDim, fontSize: 14, paddingVertical: 9 }}>No places yet.</Text>
        ) : null}
        <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }}>
          Dormant places keep seeding history but are never offered at START.
```

**C8c — ways empty state.** Anchor (lines 55–56 at HEAD):

```tsx
      <Text style={[st.h2, { color: t.textDim }]}>WAYS</Text>
      {CATALOG.ways.map((w) => {
```

Replace with:

```tsx
      <Text style={[st.h2, { color: t.textDim }]}>WAYS</Text>
      {/* B-39 minimal empty state — same note as the places card above. */}
      {CATALOG.ways.length === 0 ? (
        <Text style={{ color: t.textDim, fontSize: 14, marginBottom: 10 }}>No ways yet.</Text>
      ) : null}
      {CATALOG.ways.map((w) => {
```

### C9. `app/src/ui/routeMapView.tsx` (812 lines) — 4 edits

**C9a — imports.** Anchor (line 41):

```ts
import { cropFor, gateTickPx, offRouteM, projectToPixel, type RouteAsset } from './routeMapMath.ts';
```

Replace with:

```ts
import { cropFor, gateTickPx, offRouteM, projectToPixel, type RouteAsset } from './routeMapMath.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { defaultMapRouteId } from '../store/defaultRoute.ts';
```

**C9b — the fallback.** Anchor (lines 75–77):

```ts
/** Fallback when no route is known yet (candidate not picked/locked): the
 * first route in the asset manifest, not a literal track name (B-39). */
const DEFAULT_ROUTE_ID: string | null = Object.keys(ASSETS)[0] ?? null;
```

Replace with:

```ts
/** Fallback when no route is known yet (candidate not picked/locked): the
 * first CATALOG route with a drawable asset (B-39, empty-seed install path)
 * — not the manifest's first key, which in a virgin build (empty catalog,
 * manifest still bundled) would draw a shipped route the rider does not
 * have. Null => both rungs render nothing. Resolved per render: the runtime
 * catalog can grow after boot (store/catalogStore.ts). */
function defaultRouteId(): string | null {
  return defaultMapRouteId(currentCatalog(), (ref) => ASSETS[ref] !== undefined);
}
```

**C9c — MapLibre rung.** Anchor (lines 224–225, inside `MapLibreRouteMap`):

```ts
  const id = props.routeId ?? DEFAULT_ROUTE_ID;
  const asset = !gatesOnly && id !== null ? ASSETS[id] : undefined;
```

Replace with:

```ts
  const id = props.routeId ?? defaultRouteId();
  const asset = !gatesOnly && id !== null ? ASSETS[id] : undefined;
```

**C9d — PNG rung.** Anchor (lines 588–589, inside `PngRouteMap`):

```ts
  const id = props.routeId ?? DEFAULT_ROUTE_ID;
  const asset = id !== null ? ASSETS[id] : undefined;
```

Replace with:

```ts
  const id = props.routeId ?? defaultRouteId();
  const asset = id !== null ? ASSETS[id] : undefined;
```

Touch NOTHING else in this file (sector spans, gate ticks, `IMAGES`, the key/id discipline).

### C10. `app/App.tsx` (204 lines) — 2 edits

**C10a — import.** Anchor (line 37):

```ts
import { initFreeRidePersistence } from './src/store/freeRides';
```

Replace with:

```ts
import { initFreeRidePersistence } from './src/store/freeRides';
import { initCatalogStore } from './src/store/catalogStore';
```

**C10b — boot order.** Anchor (lines 85–90):

```ts
  const [, setWindowHydrated] = useState(false);
  useEffect(() => {
    initRideHistory(createExpoFsAdapter()).then(
      () => setWindowHydrated(true),
      () => {},
    );
```

Replace with:

```ts
  const [, setWindowHydrated] = useState(false);
  useEffect(() => {
    // B-39 (empty-seed install path): the runtime catalog (seed + this
    // phone's own additions, store/catalogStore.ts) loads FIRST — the ride
    // history's backfill resolves routes through it — then the history.
    // initCatalogStore never throws; the same state bump then re-renders the
    // mounted screens with the merged catalog too.
    const fs = createExpoFsAdapter();
    initCatalogStore(fs)
      .then(() => initRideHistory(fs))
      .then(
        () => setWindowHydrated(true),
        () => {},
      );
```

(The `// WP-B: the free-ride cache …` comment and
`void initFreeRidePersistence(createExpoFsAdapter());` that follow stay exactly as they are.)

---

## Part D — build config (2 files)

### D1. `app/eas.json` (17 lines, LF) — add the `virgin` profile

Anchor (lines 10–17, the end of the file):

```json
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "preview" }
    }
  }
}
```

Replace with:

```json
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "preview" }
    },
    "virgin": {
      "distribution": "internal",
      "channel": "virgin",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "virgin", "EXPO_PUBLIC_SEED_MODE": "empty" }
    }
  }
}
```

### D2. `app/app.config.js` — **CRLF + BOM file: edit ONLY with the script below**

This file has a UTF-8 BOM and CRLF line endings in the working tree (`file app/app.config.js`
→ "UTF-8 (with BOM) text, with CRLF line terminators"; git stores it LF via `text=auto`). A
plain-text edit that normalises either would show as a whole-file diff. Do exactly this:

```
mkdir -p "$HOME/b39-exec" && cat > "$HOME/b39-exec/cfg.js" <<'EOF'
const fs = require('fs');
const f = 'app.config.js';
let s = fs.readFileSync(f, 'utf8');
const old = "module.exports = ({ config }) => {\r\n  if (process.env.APP_VARIANT !== 'preview') return config;\r\n";
const neu = [
  "module.exports = ({ config }) => {",
  "  // B-39 / D-045: the VIRGIN build -- a third, separate app (a blank install for",
  "  // another rider, or for Nathan to test the cold start himself). Its eas.json",
  "  // profile also sets EXPO_PUBLIC_SEED_MODE=empty, which is what actually",
  "  // empties the seed (src/store/seed.ts); this block only keeps the virgin app",
  "  // from replacing the dev client or the preview.",
  "  if (process.env.APP_VARIANT === 'virgin') {",
  "    return {",
  "      ...config,",
  "      name: 'Qualifire Virgin',",
  "      android: { ...config.android, package: `${config.android.package}.virgin` },",
  "    };",
  "  }",
  "  if (process.env.APP_VARIANT !== 'preview') return config;",
  "",
].join('\r\n');
const n = s.split(old).length - 1;
if (n !== 1) { console.error('MATCH COUNT ' + n); process.exit(1); }
s = s.replace(old, () => neu);
fs.writeFileSync(f, s);
console.log('ok app.config.js');
EOF
cd "$HOME/mnt/Qualifire/app" && node "$HOME/b39-exec/cfg.js"
```

Expected output: `ok app.config.js`. If it prints `MATCH COUNT 0` (or anything else), STOP
and report — do not edit the file by hand.

---

## Part E — tests (3 files)

### E1. `app/tests/store_suite.ts` (710 lines) — 1 import edit + 3 tests appended

**E1a — imports.** Anchor (lines 20–31):

```ts
import { fallbackRouteId, routeLabel, routeVariantLabel, sortRoutesForDisplay } from '../src/store/defaultRoute.ts';
import {
  addGateSet,
  decodeCatalog,
  emptyCatalog,
  encodeCatalog,
  freeRideRouteIds,
  gateSetFor,
  landmarkAt,
  lapsComparable,
  metresBetween,
  needsRoutePick,
```

Replace with:

```ts
import {
  defaultEndpoints, defaultMapRouteId, fallbackRouteId, routeLabel, routeVariantLabel, sortRoutesForDisplay,
} from '../src/store/defaultRoute.ts';
import {
  addGateSet,
  decodeCatalog,
  emptyCatalog,
  encodeCatalog,
  freeRideRouteIds,
  gateSetFor,
  landmarkAt,
  lapsComparable,
  mergeCatalogs,
  metresBetween,
  needsRoutePick,
```

**E1b — append at END of file** (the file currently ends with the `sortRoutesForDisplay: Std
lists before Alt …` test's closing `});` on line 710). Append (a blank line, then):

```ts

// ------------------------------------------------------------- B-39 remainder: the empty-seed install path (cycle 025)

/** A small, valid, non-overlapping addition far from every seed landmark
 * (Antwerp, ~40 km from the Leuven seed) — what a rider's own first way
 * would look like once B-36 writes one. */
function userAddition(): Catalog {
  const c = emptyCatalog();
  c.landmarks = [
    { id: 'alpha', label: 'alpha', lat: 51.2, lon: 4.4, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
    { id: 'beta', label: 'beta', lat: 51.25, lon: 4.45, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
  ];
  c.ways = [{ id: 'alpha>beta', startLandmarkId: 'alpha', endLandmarkId: 'beta', routeIds: ['AlphaBeta'] }];
  c.routes = [{ id: 'AlphaBeta', wayId: 'alpha>beta', refLineId: 'AlphaBeta', gateSetVersion: 1, seeded: false }];
  c.gateSets = [{ routeId: 'AlphaBeta', version: 1, chainageM: [100, 1000, 2000, 3000, 3900], createdAtMs: 0 }];
  return c;
}

test('mergeCatalogs: seed first, user additions after; seed wins every id collision; empty seed => user alone; empty user => seed unchanged', () => {
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const user = userAddition();
  const merged = mergeCatalogs(seed, user);
  assert(merged.landmarks.length === seed.landmarks.length + 2, 'two user landmarks appended');
  assert(merged.ways.length === seed.ways.length + 1 && merged.routes.length === seed.routes.length + 1
    && merged.gateSets.length === seed.gateSets.length + 1, 'one user way/route/gate set appended');
  assert(merged.landmarks[0].id === seed.landmarks[0].id && merged.routes[0].id === seed.routes[0].id,
    'seed order comes first — "first in catalog order" keeps its meaning');
  assert(merged.landmarks[merged.landmarks.length - 1].id === 'beta' && merged.routes[merged.routes.length - 1].id === 'AlphaBeta',
    'user entries come after the seed, in their own order');
  assert(validateCatalog(merged).length === 0, `merged seed+user must validate: ${validateCatalog(merged).join('; ')}`);

  // Collisions: a user entry re-using a seed id is dropped, the seed entry survives untouched.
  const clash = userAddition();
  clash.landmarks.push({ ...seed.landmarks[0], label: 'IMPOSTOR' });
  clash.ways.push({ ...seed.ways[0], routeIds: [] });
  clash.routes.push({ ...seed.routes[0], gateSetVersion: 99 });
  clash.gateSets.push({ ...seed.gateSets[0], chainageM: [1, 2] });
  const m2 = mergeCatalogs(seed, clash);
  assert(m2.landmarks.length === merged.landmarks.length && m2.ways.length === merged.ways.length
    && m2.routes.length === merged.routes.length && m2.gateSets.length === merged.gateSets.length,
    'colliding user entries are dropped, not appended');
  assert(m2.landmarks.find((l) => l.id === seed.landmarks[0].id)!.label === seed.landmarks[0].label,
    'the seed landmark, not the impostor, survives');
  assert(m2.routes.find((r) => r.id === seed.routes[0].id)!.gateSetVersion === seed.routes[0].gateSetVersion,
    'the seed route, not the impostor, survives');
  // A same-route gate set at a NEW version is not a collision (a gate move mints a version).
  const bump = userAddition();
  bump.gateSets.push({ ...seed.gateSets[0], version: seed.gateSets[0].version + 1000 });
  assert(mergeCatalogs(seed, bump).gateSets.length === merged.gateSets.length + 1,
    'a gate set at a new version for a seed route is appended');

  // The two ends of the install path.
  assert(JSON.stringify(mergeCatalogs(emptyCatalog(), user)) === JSON.stringify(user),
    'empty seed (virgin build) + user = the user catalog, byte for byte');
  assert(JSON.stringify(mergeCatalogs(seed, emptyCatalog())) === JSON.stringify(seed),
    'seed + nothing added = the seed, byte for byte (Nathan\'s build today)');
});

test('defaultMapRouteId: first CATALOG route with a drawable asset; undrawable skipped; empty catalog => null; real seed => first seed route', () => {
  const c = emptyCatalog();
  c.routes = [
    { id: 'NoAsset', wayId: 'w', refLineId: 'NoAsset', gateSetVersion: 1, seeded: false },
    { id: 'Drawable', wayId: 'w', refLineId: 'DrawableRef', gateSetVersion: 1, seeded: false },
    { id: 'Later', wayId: 'w', refLineId: 'LaterRef', gateSetVersion: 1, seeded: false },
  ];
  const drawable = new Set(['DrawableRef', 'LaterRef', 'Morning']);
  assert(defaultMapRouteId(c, (ref) => drawable.has(ref)) === 'DrawableRef', 'first route WITH an asset wins, by refLineId');
  assert(defaultMapRouteId(c, () => false) === null, 'nothing drawable => null');
  assert(defaultMapRouteId(emptyCatalog(), () => true) === null, 'empty catalog (virgin build) => null, never the manifest\'s own first key');
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const manifest = loadJson<{ routes: Record<string, unknown> }>(
    path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));
  const got = defaultMapRouteId(seed, (ref) => manifest.routes[ref] !== undefined);
  assert(got === seed.routes[0].refLineId, `real seed: expected the first seed route's ref ${seed.routes[0].refLineId}, got ${got}`);
  assert(got === Object.keys(manifest.routes)[0],
    'real seed: identical to the manifest-first-key fallback it replaces (byte-identical behaviour for Nathan\'s build)');
});

test('defaultEndpoints: first two offerable landmarks in catalog order; dormant skipped; short catalogs => null', () => {
  const seed = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const offer = seed.landmarks.filter((l) => l.offerAtStart).map((l) => l.id);
  const got = defaultEndpoints(seed);
  assert(got.from === offer[0] && got.to === offer[1], `real seed: ${JSON.stringify(got)} vs first two offerable ${offer[0]},${offer[1]}`);
  assert(got.from === 'home' && got.to === 'work', 'real seed: the old literal defaults, exactly (regression guard for RecordScreen)');
  const c = emptyCatalog();
  assert(defaultEndpoints(c).from === null && defaultEndpoints(c).to === null, 'empty catalog => both null (RecordScreen opens new>>new)');
  c.landmarks = [
    { id: 'dormant', label: 'd', lat: 51, lon: 4, radiusM: 100, activeFromMs: 0, activeUntilMs: null, offerAtStart: false },
    { id: 'only', label: 'o', lat: 51.1, lon: 4.1, radiusM: 100, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
  ];
  const one = defaultEndpoints(c);
  assert(one.from === 'only' && one.to === null, 'a dormant landmark is never a default; one offerable => from only');
});
```

(File becomes 806 lines. `Catalog`, `loadJson`, `path`, `TESTS_DIR`, `assert`, `test` and
`validateCatalog` are all already imported at the top of the file.)

### E2. `app/tests/catalogstore_suite.ts` (NEW, 190 lines)

```ts
/**
 * QA — cycle 025 (B-39 remainder): the runtime catalog store and the
 * empty-seed install path. Locks:
 *  1. boot with nothing added = the shipped seed, and NOTHING is written;
 *  2. a user catalog file merges in (seed first) and survives a re-init;
 *  3. an undecodable user file is ignored for the session and never
 *     overwritten (it is the only copy of the rider's own places);
 *  4. saveUserCatalog refuses a merged catalog that does not validate;
 *  5. the VIRGIN install (empty seed, nothing added): zero everything, no
 *     live candidates, the engine survives a ride start-to-finalize without
 *     a lock, every data-driven fallback answers null — nothing invented.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { assert, test, loadFixture } from './lib.ts';
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { emptyCatalog, validateCatalog } from '../src/store/catalog.ts';
import { defaultEndpoints, defaultMapRouteId, fallbackRouteId } from '../src/store/defaultRoute.ts';
import type { Catalog } from '../src/store/types.ts';

// Same bare-.json loader shim as resultsstore_suite.ts, same reason: the
// modules under test import the seed JSON directly (via store/seed.ts).
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const seedMod = await import('../src/store/seed.ts');
const store = await import('../src/store/catalogStore.ts');
const { catalogTrackSpecs } = await import('../src/live/tracks.ts');
const { LiveEngine } = await import('../src/live/engine.ts');

function userAddition(): Catalog {
  const c = emptyCatalog();
  c.landmarks = [
    { id: 'alpha', label: 'alpha', lat: 51.2, lon: 4.4, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
    { id: 'beta', label: 'beta', lat: 51.25, lon: 4.45, radiusM: 150, activeFromMs: 0, activeUntilMs: null, offerAtStart: true },
  ];
  c.ways = [{ id: 'alpha>beta', startLandmarkId: 'alpha', endLandmarkId: 'beta', routeIds: ['AlphaBeta'] }];
  c.routes = [{ id: 'AlphaBeta', wayId: 'alpha>beta', refLineId: 'AlphaBeta', gateSetVersion: 1, seeded: false }];
  c.gateSets = [{ routeId: 'AlphaBeta', version: 1, chainageM: [100, 1000, 2000, 3000, 3900], createdAtMs: 0 }];
  return c;
}

test('B-39 seed: under Node the seed mode is shipped; the empty mode is a real empty catalog and no ghosts', () => {
  assert(seedMod.SEED_MODE === 'shipped', `headless suite must run on the shipped seed, got ${seedMod.SEED_MODE}`);
  const shipped = seedMod.shippedCatalog();
  assert(shipped.routes.length === 20 && shipped.landmarks.length === 6 && shipped.ways.length === 13,
    `shipped seed is the ratified catalog (6/13/20), got ${shipped.landmarks.length}/${shipped.ways.length}/${shipped.routes.length}`);
  assert(seedMod.shippedResults().length > 0, 'shipped ghosts present');
  const empty = seedMod.catalogForSeedMode('empty');
  assert(empty.landmarks.length === 0 && empty.ways.length === 0 && empty.routes.length === 0 && empty.gateSets.length === 0,
    'empty seed mode: nothing at all');
  assert(validateCatalog(empty).length === 0, 'an empty catalog validates');
  assert(seedMod.resultsForSeedMode('empty').length === 0, 'empty seed mode: no ghosts');
  assert(JSON.stringify(seedMod.catalogForSeedMode('shipped')) === JSON.stringify(shipped), 'shipped mode is the shipped seed');
});

test('B-39 catalogStore: boot with nothing added = the shipped seed, byte for byte, and nothing is written', async () => {
  store.resetCatalogStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    const before = JSON.stringify(store.currentCatalog());
    assert(before === JSON.stringify(seedMod.shippedCatalog()), 'before init: the seed (synchronous readers see it at once)');
    const got = await store.initCatalogStore(fs);
    await store.flushCatalogWrites();
    assert(JSON.stringify(got) === before && JSON.stringify(store.currentCatalog()) === before,
      'after init with no user file: still exactly the seed');
    assert(fs.files.size === 0, `init must write nothing (the seed is never copied to disk), wrote ${[...fs.files.keys()].join(',')}`);
    assert(store.userCatalog().routes.length === 0, 'nothing added');
  } finally {
    store.resetCatalogStoreForTests();
  }
});

test('B-39 catalogStore: a user catalog file merges in (seed first), saveUserCatalog round-trips, re-init reproduces it', async () => {
  store.resetCatalogStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    await store.initCatalogStore(fs);
    const seedRoutes = store.currentCatalog().routes.length;
    const errs = await store.saveUserCatalog(userAddition());
    await store.flushCatalogWrites();
    assert(errs.length === 0, `save must accept a valid addition: ${errs.join('; ')}`);
    assert(store.currentCatalog().routes.length === seedRoutes + 1, 'merged catalog visible at once');
    assert(store.currentCatalog().routes[seedRoutes].id === 'AlphaBeta', 'user route appended AFTER the seed routes');
    assert(store.currentCatalog().routes[0].id === seedMod.shippedCatalog().routes[0].id, 'seed order intact');
    const text = fs.files.get(store.USER_CATALOG_FILE);
    assert(typeof text === 'string' && text.endsWith('\n'), 'the user file was written, newline-terminated');
    assert(JSON.stringify(JSON.parse(text!)) === JSON.stringify(userAddition()), 'the file holds ONLY the user catalog, never the seed');

    store.resetCatalogStoreForTests();
    assert(store.currentCatalog().routes.length === seedRoutes, 'reset drops the in-memory addition');
    await store.initCatalogStore(fs);
    assert(store.currentCatalog().routes.length === seedRoutes + 1 && store.userCatalog().landmarks.length === 2,
      're-init from the same fs reproduces the merged catalog');
    assert(fs.files.size === 1, 'init wrote nothing new');
  } finally {
    store.resetCatalogStoreForTests();
  }
});

test('B-39 catalogStore: an undecodable user file is ignored for the session and NEVER overwritten', async () => {
  store.resetCatalogStoreForTests();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const fs = createMemoryFsAdapter();
    fs.files.set(store.USER_CATALOG_FILE, '{"landmarks": "not an array"');
    await store.initCatalogStore(fs);
    await store.flushCatalogWrites();
    assert(JSON.stringify(store.currentCatalog()) === JSON.stringify(seedMod.shippedCatalog()), 'runs on the seed alone');
    assert(fs.files.get(store.USER_CATALOG_FILE) === '{"landmarks": "not an array"', 'the corrupt file is left exactly as found');
    // A throwing adapter is the same story.
    const bad = createMemoryFsAdapter();
    bad.readText = async () => { throw new Error('disk'); };
    await store.initCatalogStore(bad);
    assert(JSON.stringify(store.currentCatalog()) === JSON.stringify(seedMod.shippedCatalog()) && bad.files.size === 0,
      'unreadable => seed alone, nothing written, no throw');
  } finally {
    console.warn = origWarn;
    store.resetCatalogStoreForTests();
  }
});

test('B-39 catalogStore: saveUserCatalog refuses an addition whose MERGED catalog does not validate — nothing changes, nothing is written', async () => {
  store.resetCatalogStoreForTests();
  try {
    const fs = createMemoryFsAdapter();
    await store.initCatalogStore(fs);
    const before = JSON.stringify(store.currentCatalog());
    // A landmark sitting on top of a seed landmark — the overlap error the
    // validator exists for (the 88-visit cluster), now guarding user input.
    const seedHome = seedMod.shippedCatalog().landmarks[0];
    const overlap = userAddition();
    overlap.landmarks.push({ ...seedHome, id: 'home2', label: 'home again' });
    const errs = await store.saveUserCatalog(overlap);
    await store.flushCatalogWrites();
    assert(errs.length > 0 && errs.some((e) => e.includes('overlap')), `expected an overlap error, got ${JSON.stringify(errs)}`);
    assert(JSON.stringify(store.currentCatalog()) === before, 'refused: the live catalog is untouched');
    assert(fs.files.size === 0, 'refused: nothing written');
    // Dangling references are refused too.
    const dangling = userAddition();
    dangling.routes[0].wayId = 'nowhere';
    const errs2 = await store.saveUserCatalog(dangling);
    assert(errs2.some((e) => e.includes('unknown way')), `expected an unknown-way error, got ${JSON.stringify(errs2)}`);
    assert(JSON.stringify(store.currentCatalog()) === before && fs.files.size === 0, 'refused again: untouched, unwritten');
  } finally {
    store.resetCatalogStoreForTests();
  }
});

test('B-39 VIRGIN install: empty seed + nothing added => zero catalog, zero live candidates, engine survives a ride unlocked, every fallback null', async () => {
  store.resetCatalogStoreForTests(emptyCatalog());
  try {
    const fs = createMemoryFsAdapter();
    const c = await store.initCatalogStore(fs);
    assert(c.landmarks.length === 0 && c.ways.length === 0 && c.routes.length === 0 && c.gateSets.length === 0,
      'the virgin catalog is empty');
    assert(fs.files.size === 0, 'nothing written on a virgin boot');
    assert(catalogTrackSpecs().length === 0, 'no catalog routes => no live candidates (and no throw)');
    assert(fallbackRouteId(c, []) === null, 'Result fallback route: null');
    assert(defaultMapRouteId(c, () => true) === null, 'map fallback route: null even though the manifest is bundled');
    const ends = defaultEndpoints(c);
    assert(ends.from === null && ends.to === null, 'RecordScreen defaults: null/null => new>>new');

    // The module-scope engine shape: NO injected specs, resolved at start().
    const f = loadFixture('clean_morning');
    for (const mode of ['route', 'free'] as const) {
      const engine = new LiveEngine();
      engine.start(mode === 'free' ? { mode: 'free', routeIds: null } : undefined);
      for (let i = 0; i < f.fixes.t.length; i += 10) {
        engine.feed(f.fixes.lat[i], f.fixes.lon[i], f.fixes.t[i] * 1000);
      }
      engine.finalize();
      const st = engine.getState();
      assert(st.track === null && st.lap === null, `${mode}: a real Morning ride on an empty catalog locks nothing, scores nothing`);
      assert(st.gateFires === 0, `${mode}: no gate can fire with no candidates`);
      assert(st.fixesFed > 0, `${mode}: fixes were still counted (the ride records; D-023)`);
    }
  } finally {
    store.resetCatalogStoreForTests();
    assert(catalogTrackSpecs().length === 20, 'restored: the shipped seed is back for every later suite');
  }
});
```

### E3. `app/tests/run.ts` (28 lines) — register the suite

Anchor (line 19):

```ts
import './resultsstore_suite.ts';
```

Replace with:

```ts
import './resultsstore_suite.ts';
import './catalogstore_suite.ts';
```

Expected suite result after Parts A–E: **273 tests: 270 pass, 0 fail, 3 skip** (+9 on the
baseline's 264/261/0/3: 3 in store_suite, 6 in catalogstore_suite).

---

## Part F — `demos/mockup.html`, `design/make_screens.py`, `design/canonical/*.svg`: **N/A, no edit**

Verified at HEAD: the mockup's `routesScreen()` (line 729) and every canonical SVG render
Nathan's seeded catalog; the only user-visible change in this brief is two one-line empty
states that can never render with that data (a mirror would be dead code), and every other
change is plumbing with byte-identical behaviour on the shipped seed. Do not edit anything
under `demos/` or `design/`. (If you find yourself wanting to, STOP — out of scope.)

## Must-not-change list (byte-identical at the end of your pass)

`app/src/ui/DemoScreen.tsx` (its `'Morning'` literal stays — exempt, line 26) ·
`app/src/ui/RidesScreen.tsx` · `app/src/ui/rideHistoryModel.ts` · `app/src/ui/towerModel.ts` ·
`app/src/ui/settings.tsx` · `app/src/ui/chips.tsx` · `app/src/ui/theme.ts` ·
`app/src/ui/routeMapGeo.ts` · `app/src/ui/routeMapMath.ts` · `app/src/ui/routeMapStyle.ts` ·
`app/src/ui/liveView.tsx` · `app/src/ui/preview/**` · `app/src/live/refs.ts` ·
`app/src/live/towerSource.ts` · `app/src/location/**` · `app/src/storage/**` ·
`app/src/store/types.ts` · `app/src/store/derive.ts` · `app/src/store/results.ts` ·
`app/src/store/freeRides.ts` · `app/src/store/catalog.seed.json` · `app/src/store/results.seed.json` ·
`app/assets/**` · `app/tests/fixtures/**` · `app/tests/lib.ts` · every test suite not named
in Part E · `app/app.json` · `app/package.json` · `app/tsconfig.json` · `scripts/**` ·
`design/**` · `demos/**` · `data/**` · `product/**` · `process/**` · `STATE.md` · `IDEAS.md` ·
`product/BACKLOG.md` (Product Owner's rows, Principal's statuses) · everything in `safe_to_delete/`.

## Verification (MANDATORY — run all, report exact outputs)

1. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts 2>&1 | tail -1`
   → **`273 tests: 270 pass, 0 fail, 3 skip`**. Report the exact final line. (Also report
   any line containing `FAIL` from the full output — there must be none.)
2. `cd "$HOME/mnt/Qualifire/app" && ./node_modules/.bin/tsc --noEmit; echo "tsc exit: $?"`
   → `tsc exit: 0`, no diagnostics. `timeout_ms` ≈ 170000, NO `timeout` prefix.
3. `cd "$HOME/mnt/Qualifire/app" && grep -rn "from '.*\.seed\.json'" src App.tsx`
   → exactly 2 lines, both in `src/store/seed.ts` (the catalog and results imports). No
   other file may import a seed JSON any more.
4. `cd "$HOME/mnt/Qualifire/app" && grep -rn "'Morning'" src/ | grep -v preview`
   → exactly 1 line: `src/ui/DemoScreen.tsx:26:const ROUTE = 'Morning';` (the exempt literal).
5. `cd "$HOME/mnt/Qualifire/app" && grep -n "DEFAULT_ROUTE_ID" src/ui/routeMapView.tsx`
   → no output.
6. `cd "$HOME/mnt/Qualifire/app" && grep -n "this\.specs" src/live/engine.ts`
   → exactly 2 lines (the field declaration and `this.specs = specs ?? null;`).
7. `cd "$HOME/mnt/Qualifire/app" && grep -c "currentCatalog" src/live/tracks.ts src/store/resultsStore.ts src/ui/lastRide.ts src/ui/RecordScreen.tsx src/ui/RoutesScreen.tsx src/ui/routeMapView.tsx src/store/catalogStore.ts`
   → `src/live/tracks.ts:2`, `src/store/resultsStore.ts:2`, `src/ui/lastRide.ts:2`,
   `src/ui/RecordScreen.tsx:4`, `src/ui/RoutesScreen.tsx:2`, `src/ui/routeMapView.tsx:2`,
   `src/store/catalogStore.ts:5`.
8. `cd "$HOME/mnt/Qualifire/app" && node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('eas.json valid')"`
   → `eas.json valid`.
9. `cd "$HOME/mnt/Qualifire/app" && node -e "const c={android:{package:'x'}}; const f=require('./app.config.js'); process.env.APP_VARIANT='virgin'; const v=f({config:c}); console.log(v.name, v.android.package); process.env.APP_VARIANT='preview'; console.log(f({config:c}).name); delete process.env.APP_VARIANT; console.log(f({config:c})===c)" && file app.config.js && wc -l app.config.js`
   → `Qualifire Virgin x.virgin`, `Qualifire Preview`, `true`, then
   `app.config.js: Unicode text, UTF-8 (with BOM) text, with CRLF line terminators` and
   `23 app.config.js`.
10. `cd "$HOME/mnt/Qualifire/app" && wc -l src/store/seed.ts src/store/catalogStore.ts tests/catalogstore_suite.ts src/store/catalog.ts src/store/defaultRoute.ts tests/store_suite.ts`
    → `53`, `128`, `190`, `252`, `118`, `806`.
11. `cd "$HOME/mnt/Qualifire" && git status --short 2>&1 | grep -v "warning:\|original line endings\|index.lock"`
    → exactly these entries (order may differ): 16 ` M` lines — `app/App.tsx`,
    `app/app.config.js`, `app/eas.json`, `app/src/live/engine.ts`, `app/src/live/tracks.ts`,
    `app/src/store/catalog.ts`, `app/src/store/defaultRoute.ts`, `app/src/store/resultsStore.ts`,
    `app/src/ui/RecordScreen.tsx`, `app/src/ui/ResultScreen.tsx`, `app/src/ui/RoutesScreen.tsx`,
    `app/src/ui/colourModel.ts`, `app/src/ui/lastRide.ts`, `app/src/ui/routeMapView.tsx`,
    `app/tests/run.ts`, `app/tests/store_suite.ts`; plus `??` for the three NEW files
    (`app/src/store/catalogStore.ts`, `app/src/store/seed.ts`, `app/tests/catalogstore_suite.ts`);
    plus the two pre-existing untracked entries (`_to_delete/` and the
    `data/activities/TEST in app rides/qualifire-20260830/` folder) and this brief's own
    file if it shows as untracked. If ANY other tracked file shows as modified, STOP and report.
12. `cd "$HOME/mnt/Qualifire" && git diff --stat 2>&1 | grep -v "warning:\|original line endings\|index.lock" | tail -1`
    → `16 files changed, 257 insertions(+), 51 deletions(-)` — measured on the planning
    pass's dry run. Drift of a line or two from whitespace is acceptable; a different file
    count is not.

**The planning pass DRY-RAN this entire edit set tonight against HEAD `0991f70`** (applied every
Part A–E edit above — the same bytes — ran verifications 1–12, then restored the tree and
re-ran the suite to confirm the baseline 264/261/0/3 came back): the suite came back exactly
**273 tests: 270 pass, 0 fail, 3 skip**, tsc exited 0, and the diff was exactly the 16 files
above at 257/51. Every number here is measured, not estimated — any deviation you see is a
real discrepancy: FLAG it in your report, do not fix, rationalise, or improvise.

## Include these findings in your report (informational — no code action)

1. **On-device check owed (Nathan):** (a) his dev client / preview must behave byte-identically
   — RECORD still opens on home → work, the setup map still shows Home Work Dry, ROUTES still
   lists 6 places / 13 ways, RESULT unchanged; (b) the virgin build is
   `cd app && eas build --profile virgin --platform android` (a third APK, "Qualifire Virgin",
   installs beside the other two); a cheaper first look without a build is
   `EXPO_PUBLIC_SEED_MODE=empty npx expo start` on the dev client — but NOTE that route shares
   the dev client's storage root (his real rides/results stay; `catalog.user.json` does not
   exist yet, so nothing is lost or written either way).
2. **What a virgin install does after this brief:** RECORD opens on new>>new (free ride, gates-
   only map with the rider dot, no route), records raw rides; ROUTES shows "No places yet." /
   "No ways yet."; RESULT shows the free-ride board or "Record a ride to see it here."; DEMO is
   unchanged (it replays the bundled Morning asset — B-43's call whether a stranger should
   see it). The setup/armed maps render NOTHING on an empty catalog (null route — honest,
   not a crash); a rider-only map there is B-43 / epic step-3 material.
3. **Pre-existing, left alone:** `colourModel.ts` still has `MIN_HISTORY = 5` although D-045
   deleted the noise floor — another cycle-025 WP owns that; not touched here.
   `routeMapView.tsx` lines ~372–374 keep a Leuven-area centre fallback (`[4.68, 50.85]`) for
   the gates-only map when there is no fix and no gates — B-43 material.

## Deferred — NOT in this brief (for the coordinator / the epic's step 2)

- **Reference polylines and map assets are still bundle-only.** `live/refs.ts` reads
  `tests/fixtures/refs.json` and `routeMapView.tsx` reads `assets/routes/routes.json`; a
  user-created route (B-36) needs a runtime ref registry (`refFor()` throws on an unknown id —
  `catalogTrackSpecs()` already skips it with a warn) and a runtime asset for the map. Both
  are B-36's build, through the same `catalog.user.json` seam; this brief deliberately does
  not invent their shape. The bundled refs/manifest (~760 KB) still ship in the virgin build —
  harmless, only reachable through the exempt DEMO tab.
- **Headless relaunch never calls `initCatalogStore`.** `src/location/index.ts` runs
  module-scope only when Android relaunches the bundle headlessly; today that is fine (the
  seed is the whole catalog), but once B-36 writes user routes, the location module must init
  the catalog store itself (or the engine's `start()` must await it) — flag for B-36's brief.
- **`Way.routeIds` vs user routes on a seed way:** `mergeCatalogs` never rewrites a seed way's
  `routeIds`, so a user route added to a SEED way is reachable via `routesForWay()` (filters by
  `wayId`) but not via `way.routeIds`. `validateCatalog` accepts it. B-36 should decide
  whether user routes may attach to seed ways at all.
- **RecordScreen's from/to defaults are captured once at mount** (React `useState`
  initialiser). On a virgin install they are new>>new; when B-36 creates the first landmarks
  during that same app session, the pills appear but the selected defaults stay `new` until
  the rider taps — acceptable; B-36 may reset them on catalog change.
- **Bookkeeping (Principal / Product Owner, not the executor):** on landing, B-39 can move
  PART-DONE → DONE; `STATE.md`'s "Known stubs/flags" line about the empty-seed path retires;
  `safe_to_delete/b39-plan-dryrun-20260831/` can be purged.

## Coordinator ruling — C2 grep-count escalation (2026-08-31)

**Escalation:** after applying C2a–C2d verbatim, `grep -n "this\.specs" src/live/engine.ts`
returns 3 lines, not the "exactly 2" stated in Part C2's closing note and Verification step 6.

**Found (Fable ruling pass, targeted read of `app/src/live/engine.ts` + `git diff`, no bulk read):**

- The working-tree diff of `engine.ts` is byte-for-byte the four old→new blocks C2a–C2d
  prescribe (declaration comment + `| null`, `specs ?? null`, the new `allSpecs` line, the
  `allSpecs.filter(...) : allSpecs` rewrite). Nothing was misapplied.
- The three matches are: **102** — a pre-existing file-header prose line
  (`` `this.specs` is just filtered before the same ``), present at HEAD, untouched by this
  brief, and a false positive because the pattern has no word boundary; **361** — the C2b
  constructor assignment; **371** — `const allSpecs = this.specs ?? catalogTrackSpecs();`,
  which is C2c's own mandated new line.
- The planning pass miscounted twice: it counted "the field declaration" (which is
  `private readonly specs: …` — no `this.` prefix, so it never matched this grep at any
  point), and it omitted both the pre-existing prose line and its own C2c line. For
  reference, at HEAD the same grep returned 4 lines (102, 358, 368, 382); C2c/C2d correctly
  retired the two member-access uses (368, 382).
- The grep's actual intent — no remaining *member access* on the now-nullable field — is
  satisfied: `grep -n "this\.specs\." src/live/engine.ts` → no output.

**Ruling:** documentation slip only; **no code change.** Rewording header line 102 to dodge
the grep would touch a line outside the brief's exact old→new blocks for no behavioural
gain — out of scope, declined.

**Corrected expectation (supersedes Part C2's closing note and Verification step 6):**

6. `cd "$HOME/mnt/Qualifire/app" && grep -n "this\.specs" src/live/engine.ts`
   → exactly 3 lines: `102:` (pre-existing header prose, backticked), `361:    this.specs = specs ?? null;`,
   `371:    const allSpecs = this.specs ?? catalogTrackSpecs();`. (Line numbers may shift by
   later edits only if a later Part touches `engine.ts` — none does.)
6b. `cd "$HOME/mnt/Qualifire/app" && grep -n "this\.specs\." src/live/engine.ts`
   → no output (no member access on the nullable field).

**Resumption instruction for the paused executor:** Treat C2 as complete and correct as
applied. Verification step 6's expected count is corrected from 2 to 3 (reason above); add
step 6b. Do not edit `engine.ts` further. Resume at **Part C3** and continue the brief
unchanged; at Verification, report the 3-line output of step 6 and the empty output of 6b.
