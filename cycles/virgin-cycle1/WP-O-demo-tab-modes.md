**Status: Brief written 2026-09-02. Phase 1 (mode picker + "second ride" mode) ready to execute now, independent of every other WP. Phase 2 ("first ride" mode) blocked on WP-D and WP-J landing first — both already have execution-ready briefs, neither needs a decision from Nathan. No decision needed from Nathan for this WP either.**
**Review doc item: none — new ask, Nathan 2026-09-02 ("add a demo WP ... the current DEMO tab should have multiple options so i can test it out"). Touches the same ground as items 10 (breadcrumb trail, WP-J) and 11 (sector colouring, WP-K) and open question Q6 (bundled-Morning-in-DEMO). Size: small-medium.**
**Verified against the device tree as staged 2026-09-02 (file mtimes 2026-09-01/02; `DemoScreen.tsx` unchanged since 2026-08-27).**

---

# WP-O — DEMO tab: selectable "first ride" / "second ride" demo modes

## 1. Goal

Turn the DEMO tab from one fixed replay into a two-mode testing aid so Nathan can see, from the couch, the two things a real commute only shows him once a day:

- **Mode "FIRST RIDE"** (Nathan: "a virgin ride: so just a live map blue dot moving and the yellow line being written as you ride") — basemap, the blue rider dot moving along a real route's geometry, and a solid `colors.neutral` (yellow) trail growing behind it. **No reference line, no gate ticks, no sector strip** — exactly what a stranger's very first ride looks like.
- **Mode "SECOND RIDE"** (Nathan: "the 'second time' you do this ride. So you already have the yellow trace+gates. And as you pass the sectors (not the gates!) get coloured properly") — the full yellow reference line and neutral gate ticks are there from the start; as the dot passes each gate, the **sector segment just completed** paints in its earned tier colour (purple/green/yellow). The gate ticks themselves never change colour (Nathan's 2026-09-01 ruling, restated in `WP-K-sector-coloured-trail-phase2.md`).

This is a testing/demo aid, not production polish: a two-pill mode picker, the existing RUN button, nothing more. Nothing is recorded; the Rides/Result tabs never see it (unchanged from today's demo contract).

## 2. Current state (verified)

### 2.1 `app/src/ui/DemoScreen.tsx` — one fixed demo, no modes

| Line | What | Why it matters |
|---|---|---|
| 26-27 | `const ROUTE = 'Morning'; const RATE = 25;` | Single hardcoded route and speed. `Morning` is a bundled route — the only kind the map can draw until WP-C lands. |
| 30 | `const ASSET = manifest.routes[ROUTE]` | Reads `assets/routes/routes.json` directly — has `path` (163 vertices) and `gateIdx` (5 gates), which `positionAtTime` needs. |
| 41-48 | `script` = sector seconds from `ghostsFor(ROUTE)`'s most recent lap, else `[185, 207, 237, 207]` | **On the virgin build `ghostsFor()` is always `[]`** (`colourModel.ts:44-46`: `GHOSTS = shippedResults()` is `[]` under the `virgin` EAS profile), so the fallback literal is what actually runs. |
| 85-86 | `tierOf(i, v) = tierFor(v, sectorValues(ROUTE, i))` | `sectorValues` also reads the (empty) ghost set → `tierFor` hits the `n < MIN_HISTORY` (5) floor at `colourModel.ts:140` and returns `'neutral'` for **every** sector. **The current demo shows no tier colours at all on the virgin build.** Nathan's "get coloured properly" cannot happen without the demo owning its own history. |
| 108-112 | `gateColours` — gate ticks painted with the earned tier | This is the "gates coloured" behaviour Nathan explicitly rejected on 2026-09-01. Must go (replaced by `sectorColours`, §3.3). |
| 115 | `pos = positionAtTime(ASSET, script.gateAt, clockS)` | Dot walks the real polyline, arc-length between gates (cycle 009). Reuse as-is for both modes. |
| 125-132 | `<RouteMapView routeId={ROUTE} lat lon zoom={4} gateColours={gateColours} variant="browse" />` | Only map call. `variant="browse"` was Nathan's 2026-08-18 ruling for the demo (pannable preview + zoom bar). |
| 134-136 | `<LiveSectorPane vm={vm} showLap />` | Sector strip + clock. Right for mode 2; wrong for mode 1 (no sectors exist on a first ride). |
| 63-83 | `start()` — wall-clock-anchored replay at RATE, `setInterval` at 33 ms | Keep exactly; both modes share it. |

### 2.2 What `RouteMapView` already supports (no WP-K dependency for mode 2)

- `routeMapView.tsx:136` — **`sectorColours?: (string | null)[]` is already a prop**, gate-indexed (index i = colour of the sector ending at gate i; index 0 ignored). `:368-370` builds `sectorSpansFeatureCollection(asset, sectorColours)`; `:465-470` renders the `sector-spans` source/layers over the base route line. `ResultScreen.tsx:263` already passes it. **Mode 2 is a one-prop change on the map side** — WP-K's remaining job is wiring the same prop into `RecordScreen`'s running rung, which this WP does not touch.
- `gateColours` (`:363`) paints the gate ticks — the thing to *stop* passing.
- The rider dot needs only `lat`/`lon` and renders independently of the route layers (`:526-540`) **but only once the component gets past the `:344` guard** `if (!gatesOnly && !asset) return null;` — a non-null `routeId` with no manifest entry renders nothing. This is why mode 1 cannot be built today (see §2.3).
- `routeId={null}` does **not** mean "no route": `:232` falls back to `defaultRouteId()`, which on `main` returns the first catalog route with an asset (draws a real route — wrong for mode 1) and on the virgin build returns `null` (→ the `:344` null return). Mode 1 must therefore pass a **non-null id that has no asset** (§3.4).

### 2.3 What mode 1 needs from other WPs

- **WP-D §3.1(a)** — the rider-only guard (`riderOnly = !gatesOnly && !asset; if (riderOnly && !showRider) return null;`) plus conditional `asset!` dereferences and `cameraTargetFor`. Without it, a no-asset map returns `null`.
- **WP-J Steps 1-2** — `src/ui/trailModel.ts` (`appendTrailPoint`, `trailLineFeature`, 5 m min step, 4000-point FIFO) and the always-mounted `trail` source/layers behind a new `trail` prop on `RouteMapView`. Without it there is no yellow line to draw behind the dot.

Both are "brief written, ready to execute" in `README.md`; both edit `routeMapView.tsx:337-382` (the same lines). WP-J Step 3 explicitly overlaps WP-D and says "coordinate/diff carefully rather than doing both blindly."

**Decision (Plan tier): do NOT fold WP-D or WP-J into this WP.** Three briefs editing the same 45 lines of `routeMapView.tsx` is an executor conflict, and WP-J's z-order rationale (an always-mounted, possibly-empty trail source so it never mounts after the rider source) has to be done once, properly, in the file that owns it. Instead this WP is split: **Phase 1 lands now; Phase 2 lands right after WP-D → WP-J.** Once Phase 2 is in, the DEMO tab becomes the cheapest on-device test for both WP-D (rider-only map) and WP-J (trail) — Nathan can check both without a commute, which is a reason to run WP-D and WP-J *before* B/C/F/L in the queue.

### 2.4 Other facts the executor needs

- `tierFor(value, history)` (`colourModel.ts:137-143`): `value < best` → `'purple'`; `< mean` → `'green'`; else `'yellow'`; `history.length < 5` → `'neutral'`. Pure — takes history as an argument, so the demo can pass its own.
- `chipColors(tier, t).text` (`chips.tsx`) is the tier → colour string mapping the demo already uses; keep using it for both `sectorColours` and the strip.
- `Tab` type (`tabNav.tsx`) already has `'demo'`; nothing in navigation changes.
- `settings.liveMap` gates the demo map (`DemoScreen.tsx:125`) the same way it gates the RECORD rungs — unchanged.
- Q6 (`QUESTIONS-FOR-NATHAN.md`): the demo runs on bundled `Morning`, which the virgin build still ships in `routes.json`. If Q6 is answered "strip bundled assets from the virgin profile", **this WP's map breaks** unless the demo keeps its own bundled fixture. Noted as an addendum under Q6; not a blocker for this WP (Nathan wants the demo now, on the current build).

## 3. Proposed changes

### 3.1 New pure module `app/src/ui/demoModel.ts` (headless-testable — no React, no manifest import)

```ts
import { tierFor, type UiTier } from './colourModel.ts';

export type DemoMode = 'first' | 'second';

/** The demo's own "previous laps" — six per sector, so tierFor()'s MIN_HISTORY
 * floor (5) is cleared on a virgin build with zero archived rides. Chosen so
 * one run of the scripted lap shows all three verdict colours. */
export const DEMO_HISTORY: readonly (readonly number[])[] = [
  [190, 195, 188, 200, 192, 197],   // S1: best 188, mean ~193.7
  [210, 205, 215, 208, 212, 206],   // S2: best 205, mean ~209.3
  [230, 225, 235, 228, 232, 226],   // S3: best 225, mean ~229.3
  [210, 205, 215, 208, 212, 206],   // S4: best 205, mean ~209.3
];

/** Today's scripted sector seconds — the existing literal, kept. */
export const DEMO_SECS: readonly number[] = [185, 207, 237, 207];
// → S1 purple (185 < 188), S2 green (207 < 209.3), S3 yellow (237 ≥ 229.3), S4 green.
// Lap 836 vs lap history [840, 830, 853, 844, 848, 835] → green.

export interface DemoScript { secs: readonly number[]; gateAt: number[]; lap: number }
export function buildDemoScript(secs: readonly number[] = DEMO_SECS): DemoScript;
/** Tier for sector `i` (1-based, matching sectorColours' gate index) or the lap (i = 0). */
export function demoTier(i: number, value: number | null): UiTier;
/** Gate-indexed colours for RouteMapView's `sectorColours` prop: index 0 null,
 * index i = colour of sector i iff i <= gatesDone, else null. `paint` maps a
 * tier to its colour string (the screen passes `(tier) => chipColors(tier, t).text`). */
export function demoSectorColours(
  script: DemoScript, gatesDone: number, paint: (tier: UiTier) => string,
): (string | null)[];
/** Lap history = per-lap sums of DEMO_HISTORY, used by demoTier(0, …). */
```
Rules: `demoTier` calls `tierFor(value, DEMO_HISTORY[i-1])` for i ≥ 1 and `tierFor(value, lapHistory)` for i = 0. `buildDemoScript` is today's lines 45-47 lifted verbatim (`gateAt = [0, cumsum…]`, `lap = sum`). No `ghostsFor`/`sectorValues` calls anywhere in the demo any more — **the demo is self-contained by design** so it behaves identically on `main` and on the virgin build. (If someone later wants "real history when present", that is a separate decision; do not add it here.)

### 3.2 `DemoScreen.tsx` — mode picker (Phase 1)

- `const [mode, setMode] = useState<DemoMode>('second');` — default `'second'` in Phase 1 (the only mode that renders a map before WP-D/WP-J). Flip the default to `'first'` in Phase 2 if Nathan prefers; not a decision needed now.
- Two pills above the map, reusing the screen's existing `btn`/`btnText` styles at reduced padding (or `chips.tsx`'s pill if it fits — executor's call, no new component file): **`FIRST RIDE`** and **`SECOND RIDE`**. Selected pill = `t.accent` fill; unselected = outline. Switching mode: clear the interval, `setRunning(false)`, `setClockS(0)`, `prevGates.current = 0`, `setTrail([])` (Phase 2). In Phase 1 the `FIRST RIDE` pill is rendered disabled with the subtitle "needs WP-D + WP-J" — no dead map area.
- Replace the header copy at lines 119-123 with mode-specific text:
  - second: `A real archived {routeLabel(ROUTE)} lap replayed at {RATE}x — the reference line and gates are already there; each sector paints its colour as you cross the gate that ends it. Nothing is recorded.`
  - first: `The same lap ridden as if for the first time — no route, no gates, just you and the line you are writing. Nothing is recorded.`
- Keep `start()`, the buzz effect, `fmtMS`, `RATE`, `TICK_MS`, `ASSET`, `positionAtTime` unchanged. Replace `script` with `buildDemoScript()` and `tierOf` with `demoTier`.

### 3.3 Mode "second" (Phase 1)

```tsx
<RouteMapView routeId={ROUTE} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
  zoom={4} sectorColours={sectorColours} variant="browse" />
```
- `sectorColours = demoSectorColours(script, gatesDone, (tier) => chipColors(tier, t).text)`.
- **Remove `gateColours` entirely** from the demo (both the array at 108-112 and the prop). Gate ticks stay neutral — that is Nathan's ruling, and it is the point of the mode.
- `LiveSectorPane` + `vm` as today, tiers via `demoTier`. The strip and the map now agree by construction (same function, same history).
- Buzz per gate unchanged (D-019).

### 3.4 Mode "first" (Phase 2 — after WP-D and WP-J have landed)

```tsx
<RouteMapView routeId={DEMO_FIRST_RIDE_ID} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
  zoom={4} trail={trail} variant="browse" />
```
- `const DEMO_FIRST_RIDE_ID = 'demo:first-ride';` — a **non-null id with no manifest entry**, so `ASSETS[id]` is `undefined` and WP-D's rider-only path renders basemap + dot with no route layers. This is deliberately the *same* code path a user-created route (e.g. `route:20260901-091752-f6ca`, Nathan's Home→Work) takes — so mode 1 doubles as a regression check for WP-P/WP-D. Do **not** pass `null` (see §2.2: falls back to `defaultRouteId()`). Do **not** pass `gatesOnly` (draws every bundled route's gates — the "black circles" leak Nathan rejected, WP-E).
- Trail: `const [trail, setTrail] = useState<readonly TrailPoint[]>([]);` In the interval callback (or an effect on `clockS`), when `pos` is non-null and `mode === 'first'`: `setTrail((prev) => appendTrailPoint(prev, pos.lat, pos.lon));`. Reset to `[]` in `start()` and on mode switch. Arithmetic check: Morning ≈ 5.6 km over ~836 s at 25x ≈ 33 s wall → ≈ 170 m/s → ≈ 5.6 m per 33 ms tick, so the 5 m min step keeps nearly every tick and one run produces ~1000 points, well under WP-J's 4000 cap. Nothing to tune.
- The dot still follows `positionAtTime(ASSET, script.gateAt, clockS)` on Morning's real geometry — the *route* is hidden, not the *road*. That is honest: a first ride is on a real road; the app just doesn't know it yet.
- No `LiveSectorPane` in this mode. In its place one status line reusing `styles.sub`: `writing history · no known route here` — the exact string `RecordScreen.tsx:685` shows when nothing is recognized (WP-A piece 3), plus the elapsed clock `fmtMS(clockS)` on the same line. No buzz (there are no gates on a first ride): guard the vibration effect with `mode === 'second'`.
- `variant="browse"` for both modes, matching Nathan's 2026-08-18 demo ruling. If he wants the locked, course-up ribbon feel of the real running screen for mode 1, it is a one-line flip to `variant="live" liveState="moving"` after he has seen it — note in the on-device check, don't pre-decide.

### 3.5 File header

Rewrite the header comment (lines 1-11): two modes, why the demo owns its history (virgin build has no ghosts; D-008's floor), why `'demo:first-ride'` is a non-null unknown id, and the WP-D/WP-J dependency for mode 1.

### 3.6 Explicitly NOT in this WP

Wiring `sectorColours` into `RecordScreen`'s running rung (that is WP-K's remaining scope — after this WP it is a ~5-line change: compute the gate-indexed colours from `live.sectors` the way `RecordScreen.tsx:729-738` already does for `gateColours`, pass `sectorColours`, and *stop* passing `gateColours`). Any change to `routeMapView.tsx`, `trailModel.ts`, or `RecordScreen.tsx`. A third "free ride with bundled gates" mode. Speed selection (25x stays).

## 4. Test plan

New `tests/demo_suite.ts`, registered in `tests/run.ts`:

- `buildDemoScript()` with default secs → `gateAt = [0, 185, 392, 629, 836]`, `lap = 836`.
- `demoTier(1, 185) === 'purple'`, `demoTier(2, 207) === 'green'`, `demoTier(3, 237) === 'yellow'`, `demoTier(4, 207) === 'green'`, `demoTier(0, 836) === 'green'` — pins the fixture so it can never drift back to all-neutral.
- `demoTier(i, null) === 'est'` for any i (passes through `tierFor`).
- Every `DEMO_HISTORY[i].length >= MIN_HISTORY` (import the constant; assert against it, not a literal 5).
- `demoSectorColours(script, 0, paint)` → `[null, null, null, null, null]`; `gatesDone = 2` → indices 1-2 painted, 0/3/4 null; `gatesDone = 4` → 1-4 painted, 0 null; length always `script.secs.length + 1`.

Rendering is JSX and not headlessly testable — **on-device visual check required** (Nathan, both themes):
- Phase 1: SECOND RIDE default; reference line + neutral gate ticks visible before RUN; after RUN the dot moves, buzz at each gate, and the segment *behind* the gate just crossed paints (S1 purple, S2 green, S3 yellow, S4 green); gate ticks never change colour; strip colours match the map; pill switch mid-run stops the run and resets.
- Phase 2: FIRST RIDE shows basemap + dot only (no line, no ticks, no black circles) before RUN; after RUN a solid yellow trail grows behind the dot with no gap to the dot; "writing history · no known route here" line updates its clock; no buzz; switching back to SECOND RIDE clears the trail.

## 5. Verification

```
cd app
node --experimental-strip-types tests/run.ts      # baseline + demo_suite, 0 fail
./node_modules/.bin/tsc --noEmit                   # exit 0
grep -n "gateColours" src/ui/DemoScreen.tsx        # expect no output
grep -n "ghostsFor\|sectorValues" src/ui/DemoScreen.tsx   # expect no output
```
Phase 2 additionally: `grep -n "trail=" src/ui/DemoScreen.tsx` → one hit; `grep -n "routeId={null}" src/ui/DemoScreen.tsx` → no output.

## 6. Files touched

Phase 1: `src/ui/demoModel.ts` (new), `src/ui/DemoScreen.tsx`, `tests/demo_suite.ts` (new), `tests/run.ts`.
Phase 2: `src/ui/DemoScreen.tsx` only (imports `trailModel.ts` from WP-J; relies on WP-D's rider-only path). Not touched in either phase: `routeMapView.tsx`, `routeMapGeo.ts`, `RecordScreen.tsx`, `colourModel.ts`, `chips.tsx`, storage, engine.

## 7. Open questions (defaults chosen; none block Phase 1)

1. Default mode: `'second'` in Phase 1 because it is the only one that can render; revisit once Phase 2 lands (Nathan may want `'first'` first, matching a stranger's journey).
2. `variant="browse"` vs the live ribbon for mode 1 — see §3.4; decide on device.
3. Q6 interaction: if bundled assets leave the virgin profile, the demo needs its own bundled `Morning` fixture (path + gateIdx + gates only — no PNG). Small, but it is a follow-on, not this WP. Addendum written under Q6 in `QUESTIONS-FOR-NATHAN.md`.
