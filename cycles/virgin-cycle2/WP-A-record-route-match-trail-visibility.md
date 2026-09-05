**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Review doc item:** qualifire-20260903 review, issues #1+#2 (combined), Nathan's 2026-09-04
addendum in `qualifire-20260903-notes.md`. Also resolves OPEN-ITEMS' parked **"Free-ride
'new>>new' design"** entry as far as the live map is concerned (see §1.2). Size: **small-medium**
(3 source files + 2 test files; ~40 lines of code, ~40 lines of tests, a handful of comment fixes).
**Anchors verified against the mounted working tree on 2026-09-04 (Plan pass). Line numbers below
are from that read — Execute MUST re-verify every anchor before editing (standard practice).**

---

# WP-A (cycle 2) — RECORD map: reference line vs live yellow trail, by route state

## 1. What it is

### 1.1 The bug, in Nathan's words

From `qualifire-20260903-notes.md` (2026-09-03):

> The yellow line being written behind me is also active on rides that already have a route. It
> should only be the case when you are "writing history", otherwise the two yellow lines overlap
> strangely.

> I selected work>>home. and the app did not recognize it as a new route. So it showed me the
> route overlay of the home>>work line (which is the only one available for now). In the future
> the app should not show any line, and just let me write the history for a route I am taking
> for the first time.

2026-09-04 addendum:

> for now when pressing record it always show the yellow route for the home>>work reference
> that has been written regardless of which options you choose on the RECORD screen. This
> should be fixed. **If you take new>>new show nothing and let me write history. If I take now
> work>>home, but it does not exist yet, also show nothing and let me write history. If I take
> a known route >> show the route and disable the yellow line writing live behind me to avoid
> overlap.**

### 1.2 The spec — three states

The RECORD tab's maps (the setup preview, the armed "ready — not started" map, and the running
live map) must obey exactly this:

| # | Situation | Reference route line | Live yellow trail (breadcrumb) |
|---|-----------|----------------------|--------------------------------|
| 1 | **new>>new** — a free ride (either endpoint is the `new` pseudo-landmark; engine mode `'free'`) | **none** | **shown** ("writing history") |
| 2 | **Way/direction picked but no catalog route exists for it** (e.g. work>>home picked while only home>>work exists) — engine mode `'route'`, no pick, nothing locked yet | **none** | **shown** ("writing history") |
| 3 | **A known route** — either picked on the RECORD tab (a real catalog route with a drawable ref) or matched/locked by the engine mid-ride | **that route's line** | **hidden** |

Two consequences Nathan's wording implies and this brief adopts:

- **The two states are mutually exclusive by construction:** the trail is shown *exactly when* no
  reference line is shown. There is never a frame where both draw (that is the overlap he
  complains about) and never a frame where neither draws while recording.
- **Transitions are live.** A state-2 ride that the engine later locks onto an existing route
  (say the rider actually is on home>>work) flips to state 3 at the lock: the reference line
  appears, the trail disappears. If a soft lock is later dropped (`live.track` goes back to
  null with no pick), the ride flips back to state 2 and the trail — which kept accumulating
  in the background — reappears in full.

`OPEN-ITEMS.md` parks a "Free-ride new>>new design" question. For the *map* this brief settles
it: new>>new is state 1 — basemap + rider dot + the yellow trail + the WP-B gates-only gate rings
(unchanged), and **no route line**. Anything else about a free-ride layout stays open.

### 1.3 Out of scope (do not touch)

- Gate-tick colour logic (`gateColours`, `gateTicksFeatureCollection`, WP-D/WP-K work) —
  a separate work package.
- The status line (`routeLine` in `RecordScreen.tsx` ~L719–727) — its "writing history" /
  "your pick · confirming…" wording already matches the three states; leave it.
- The engine (`live/engine.ts`), the hard-pick-lock rule, and what mode/pick `onStart` sends
  to `startTracking()` — unchanged. Raw ride recordings stay append-only; the trail *state*
  (`trail`/`setTrail`) keeps accumulating exactly as today — only the *prop handed to the map*
  is gated.
- WP-B's gates-only free-ride map (`gatesOnly`, `gateRouteIds`, `crossedGates`) — unchanged.

## 2. Root cause

Two independent defects; both must be fixed. (Verified 2026-09-04 by reading the files, not
from the digest alone.)

### 2.1 `routeMapView.tsx` silently substitutes "the first drawable catalog route" for `routeId={null}`

- `app/src/ui/routeMapView.tsx` **L143–145**:
  ```ts
  function defaultRouteId(): string | null {
    return defaultMapRouteId(currentCatalog(), (ref) => assetFor(ref) !== null);
  }
  ```
- MapLibre rung, **L317**: `const id = props.routeId ?? defaultRouteId();`
- PNG rung, **L735**: `const id = props.routeId ?? defaultRouteId();`
- `app/src/store/defaultRoute.ts` **L131–134**: `defaultMapRouteId()` returns the refLineId of
  the **first catalog route whose ref is drawable**, in catalog order.

So every caller that passes `routeId={null}` meaning "no route" gets *some* route drawn as
soon as the catalog holds one drawable route. On a virgin build the catalog was empty and the
fallback returned null, which is why WP-D's "rider-only map" appeared to work; the moment
Nathan wrote the home>>work reference (WP-P/WP-C), that route became the universal fallback.
That is precisely "it always shows the yellow route for the home>>work reference regardless
of which options you choose".

Every null-passing call site is affected:

- `RecordScreen.tsx` **L930** (armed map) and **L1192** (setup preview):
  `routeId={pickedRoute?.refLineId ?? null}` — null for new>>new *and* for work>>home (no
  `way` → `pickedRoute` null, ~L843–847) → draws home>>work. This is the "when pressing
  record" symptom (RECORD → armed screen).
- `RecordScreen.tsx` **L1037** (running map):
  `routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)}` — in state 2 the
  hint is null (set at START from `pickedRouteRef.current?.refLineId ?? null`, **L448**) and
  `live.track` is null until a lock → draws home>>work under the live trail: the "two yellow
  lines overlap strangely" symptom. (State 1 is *not* affected on this map: `gatesOnly` is true
  in free mode and the rung ignores `routeId` — but it *is* affected on the armed/setup maps.)
- `RideDetailScreen.tsx` **L446** and **L463**: `variant="browse" routeId={null} trail={fixes}`
  — the free-ride / no-route trace views. WP-H intended "trail only" here (see the WP-H comment
  at `routeMapView.tsx` ~L444–446); the fallback quietly defeats that too. Same bug class,
  fixed for free by §3.1.
- `DemoScreen.tsx` L55 works *around* the fallback with a fake id (`'demo:first-ride'`),
  explicitly because null would fall back (its comments at L13–15 and L52–54).

**No caller in the codebase wants this fallback.** Every `routeId={null}` means "no route".
The B-39 rationale (comment at L135–142: "when no route is known yet (candidate not
picked/locked)") predates `rideRouteHint` — the running map now passes the candidate itself.

### 2.2 `RecordScreen.tsx` passes the trail unconditionally

`RecordScreen.tsx` **L1046**: `trail={trail}` on the running map, with no dependence on
whether a reference line is drawn. `routeMapView.tsx` L435–439 (`trailFC`) and L447
(`hasTrail`) draw whenever the prop is non-empty. So on a picked or locked ride (state 3) the
route line and the trail draw on top of each other.

### 2.3 Not a cause (the digest's "two `rideRouteHint`" oddity)

There is exactly **one** `rideRouteHint` state hook, `RecordScreen.tsx` **L224**. The digest's
"line 112" was a misread (L112–114 is the `defaultRouteFor` doc comment). Nothing to resolve.

Also not a cause: `refFor()`/`userRefFor()` never substitute a different route's ref; the
route-id → catalog invariant `route.id === route.refLineId` holds for seed and user-minted
routes alike (`live/refs.ts` L28, `store/wayCreation.ts` L347/L380), so `live.track ??
rideRouteHint` is a consistent id space.

## 3. The fix

Three source files, two test files. Do them in this order.

### 3.1 `app/src/ui/routeMapView.tsx` — `routeId: null` means "no route line", full stop

1. **Delete** the `defaultRouteId()` function (L135–145 including its doc comment).
2. **Delete** the now-unused import `import { defaultMapRouteId } from '../store/defaultRoute.ts';`
   (L77). Keep the `currentCatalog` import (L76) — it is still used by `assetDeps()` (L126).
   Confirm with a grep that `defaultMapRouteId` and `defaultRouteId` no longer appear anywhere
   in this file.
3. MapLibre rung **L317**: change
   `const id = props.routeId ?? defaultRouteId();` → `const id = props.routeId;`
4. PNG rung **L735**: same change. (`const img = id !== null ? IMAGES[id] : undefined;` on
   L737 and `assetFor(null)` → null are already null-safe; `[props.routeId]` in the zoom-reset
   effect dep list at L347 is unaffected.)
5. Update the `routeId` prop doc comment (**L178–179**), currently
   `/** null before the route locks — the map then just shows the candidate */`, to:
   ```ts
   /** The route whose line/ticks to draw. null = NO route line: a live surface renders
    * rider-only (WP-D), a browse surface renders trail-only (WP-H). There is no
    * catalog-wide fallback any more (cycle-2 WP-A, Nathan 2026-09-04: a null pick must
    * never draw "whichever route happens to be first in the catalog"). */
   ```
6. `store/defaultRoute.ts`'s `defaultMapRouteId()` and its three tests stay **untouched**
   (still exported, still tested, simply no longer consumed by the map). Removing it is a
   separate chore; do not bundle it.

### 3.2 `app/src/ui/recordFlow.ts` — one pure, render-time derivation (the WP-L `effectiveFromId` pattern)

Append after `effectiveFromId` (L63–72), before `statusItemsFor`:

```ts
/** Cycle-2 WP-A (Nathan 2026-09-04): what the RUNNING map overlays, derived
 * per render from the engine state + the pick frozen at START. Three states:
 *  1. free ride (new>>new)                  -> no route line, trail shown
 *  2. route mode, nothing picked, no lock   -> no route line, trail shown
 *  3. a known route (picked or locked)      -> that route's line, trail HIDDEN
 * The trail is shown exactly when no reference line is — never both (the
 * "two yellow lines overlap" bug), never neither. `track` (the engine's locked
 * route) outranks `routeHint` (the pick), same precedence the map already
 * used; a lock appearing or dropping mid-ride flips the state live. */
export type LiveMapOverlay = { routeId: string | null; showTrail: boolean };
export function liveMapOverlayFor(input: {
  mode: 'route' | 'free';
  track: string | null;
  routeHint: string | null;
}): LiveMapOverlay {
  const routeId = input.mode === 'free' ? null : (input.track ?? input.routeHint);
  return { routeId, showTrail: routeId === null };
}
```

No new imports needed (`recordFlow.ts` is import-free; keep it that way — inline the
`'route' | 'free'` literal rather than importing `LiveEngineState`).

### 3.3 `app/src/ui/RecordScreen.tsx` — use it on the running map

1. Extend the existing import at **L39**:
   `import { effectiveFromId, isFullscreen, statusItemsFor, type RecordPhase } from './recordFlow';`
   → add `liveMapOverlayFor` to the named imports (keep alphabetical-ish order; no other change).
2. Directly **above** the `{settings.liveMap ? (` that wraps the running map (currently
   **L1034**, inside the running-phase JSX), this cannot hold a `const` — so instead put the
   derivation with the other render-time derivations near `routeLocked`/`writingHistory`
   (**after L711**, the `writingHistory` const, before the `routeLine` comment block):
   ```ts
   // Cycle-2 WP-A: reference line vs live trail, mutually exclusive — see
   // recordFlow.ts liveMapOverlayFor. Derived per render (no effect/state):
   // live.track (lock) outranks the START-frozen pick hint; free mode = neither.
   const mapOverlay = liveMapOverlayFor({ mode: live.mode, track: live.track, routeHint: rideRouteHint });
   ```
   `live`, `rideRouteHint` are both in scope there (L187, L224).
3. Running map `<RouteMapView …>` at **L1036–1050**: change exactly two props —
   - L1037 `routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)}`
     → `routeId={mapOverlay.routeId}`
   - L1046 `trail={trail}` → `trail={mapOverlay.showTrail ? trail : undefined}`
   Leave `gatesOnly={live.mode === 'free'}`, `gateRouteIds`, `crossedGates`, `gateColours`,
   `sectorColours`, `liveState`, `fill`, `zoom` exactly as they are.
4. Armed map (**L929–937**) and setup preview (**L1191–1200**): **no code change** —
   `routeId={pickedRoute?.refLineId ?? null}` is already right once §3.1 stops the fallback.
   They draw no trail today and must not start to.
5. Comment hygiene (comment-only, no logic): the WP-D comment above the setup preview
   (**L1183–1189**, "…it no longer falls back to drawing some other route from the asset
   manifest") is now actually true — append one sentence: "Cycle-2 WP-A removed the
   catalog-wide `defaultRouteId()` fallback in routeMapView.tsx, so a null pick draws
   rider-only even once the catalog holds drawable routes."
6. Do **not** change `trail`/`setTrail` accumulation (L236, L268–330, L427, L512, L653) —
   the trail keeps being built for the whole ride so a lock-drop can show the full line.

### 3.4 `app/src/ui/DemoScreen.tsx` — comments only

The two comments that instruct future editors to avoid `null` because it "falls back to
`defaultRouteId()`" (**L13–15** in the file header, **L52–54** above `DEMO_FIRST_RIDE_ID`)
are now wrong. Rewrite each to say the fake id is kept so the demo's FIRST-RIDE mode is
recognisably not a catalog route (and stays stable as a `key`/zoom-reset id), and that
`null` would now also render rider-only (cycle-2 WP-A). **Do not change `DEMO_FIRST_RIDE_ID`
or any DemoScreen logic** — `demo_suite.ts` may assert on that id; leave the constant alone.

### 3.5 Tests — see §5

## 4. Acceptance criteria

Numbered so Nathan can walk them on-device and Inspect can tick them off. "Catalog" below
= Nathan's current phone catalog with exactly one user route, home>>work, ref written.

1. **State 1 — new>>new, running.** Pick `new` at both ends, RECORD, START, ride. Live map
   shows basemap + rider dot + the yellow trail growing behind the rider + WP-B gate rings.
   **No route line anywhere on the map.** (Was: correct on the running map already; this
   criterion guards it.)
2. **State 1 — new>>new, armed + setup.** Same pick; the setup preview and the armed
   "ready — not started" map show basemap + dot only — **no home>>work line**. (Was: drew
   home>>work.)
3. **State 2 — work>>home (no catalog route), armed + setup.** Pick work → home. Setup preview
   and armed map: basemap + dot, **no home>>work line**. Status text "work → home · ready —
   not started" (no route variant suffix). (Was: drew home>>work.)
4. **State 2 — work>>home, running.** START and ride away from home>>work's start. Live map:
   basemap + dot + yellow trail, **no route line**; status line reaches "writing history · no
   known route here". (Was: home>>work line under the trail — the overlap.)
5. **State 3 — home>>work picked, running.** Pick home → work, START. From the first frame the
   live map draws the home>>work reference line and **no yellow trail** — at no point before,
   at, or after the ~400 m lock do both draw. Gate ticks/sector colouring behave exactly as
   before this WP.
6. **State 3 — armed + setup for a known route.** Home>>work picked: setup preview and armed
   map draw the home>>work line (unchanged behaviour — guard against over-correction).
7. **State 2 → 3 transition.** Pick work>>home (no pick sent to the engine, `mode: 'route'`)
   but actually ride home>>work from its start. When the engine locks, the map flips: the
   home>>work line appears and the trail disappears in the same frame. (Static check for
   Execute/Inspect: `liveMapOverlayFor({mode:'route', track:'HomeWork', routeHint:null})`
   → `{routeId:'HomeWork', showTrail:false}`.)
8. **State 3 → 2 transition (soft lock dropped).** If the engine's `track` returns to null on an
   un-picked ride, the trail reappears **with its full history** (it never stopped
   accumulating) and the line goes away. Pure-function check:
   `liveMapOverlayFor({mode:'route', track:null, routeHint:null}).showTrail === true`.
9. **Rides tab, free-ride / no-route trace view** (`RideDetailScreen.tsx` L444–453, L461–470):
   shows the ridden trail only — **no home>>work line** behind it. (Was: overlapped, same
   bug.)
10. **Nothing else moved.** Routes tab previews (`RoutesScreen.tsx` L211, real ids), the ride
    detail map for a matched ride (`RideDetailScreen.tsx` L384/L417), and DemoScreen both
    modes render exactly as before.
11. **The engine/recording is untouched.** `onStart`'s `startTracking()` calls (L444, L450),
    the GPX+ sidecar, `pickSource`, and the raw recording are byte-for-byte the same code.
    A `git diff --stat` shows only the files named in §3 and §5.

## 5. Verification

Run from `app/` on the device (`GIT_OPTIONAL_LOCKS=0` for any git call):

- `cd app && node --experimental-strip-types tests/run.ts` — **zero FAIL**; the pass count
  must rise by exactly the number of tests added below (report before/after counts).
- `cd app && ./node_modules/.bin/tsc --noEmit` — exit 0 (never bare `npx tsc` on this mount).
- `grep -n "defaultRouteId\|defaultMapRouteId" app/src/ui/routeMapView.tsx` → no output.
- `grep -n "trail={trail}" app/src/ui/RecordScreen.tsx` → no output (the only occurrence was
  the running map, now gated).

### New tests

**A. `app/tests/recordflow_suite.ts`** — append after the last `effectiveFromId` test (L127+),
same `assert`/`test` style, import `liveMapOverlayFor` from `'../src/ui/recordFlow.ts'`:

1. `liveMapOverlayFor: free ride (new>>new) -> no route line, trail shown, regardless of track/hint`
   — asserts `{routeId:null, showTrail:true}` for `mode:'free'` with `track:null, routeHint:null`
   AND (belt-and-braces) with `track:'HomeWork', routeHint:'HomeWork'` (free mode never locks;
   the rule must not depend on it).
2. `liveMapOverlayFor: route mode, nothing picked, nothing locked -> no route line, trail shown (writing history)`
   — `{mode:'route', track:null, routeHint:null}` → `{routeId:null, showTrail:true}`.
3. `liveMapOverlayFor: a picked known route shows its line and hides the trail from the first frame`
   — `{mode:'route', track:null, routeHint:'HomeWork'}` → `{routeId:'HomeWork', showTrail:false}`.
4. `liveMapOverlayFor: a lock outranks the pick hint and hides the trail`
   — `{mode:'route', track:'HomeWork', routeHint:null}` → `{routeId:'HomeWork', showTrail:false}`;
   and `{mode:'route', track:'EveningA', routeHint:'HomeWork'}` → `routeId === 'EveningA'`
   (documents the precedence the map already had; under the hard-pick rule the engine never
   produces this pair, but the derivation must be total).
5. `liveMapOverlayFor: trail and route line are mutually exclusive in every reachable state`
   — loop over `mode ∈ {route, free}` × `track ∈ {null,'A'}` × `routeHint ∈ {null,'B'}` and
   assert `showTrail === (routeId === null)` for all 8 combinations.

**B. `app/tests/routemap_suite.ts`** — one static source guard, appended next to the two
existing MapLibre-rung static guards (L242+; same doctrine, same `fs.readFileSync` of
`src/ui/routeMapView.tsx`), named
`routemap: routeId={null} draws NO route — the catalog-wide defaultRouteId() fallback is gone (cycle-2 WP-A)`:
- assert `src.includes('defaultRouteId')` is **false** and `src.includes('defaultMapRouteId')`
  is **false**;
- assert the source contains **exactly two** occurrences of the literal
  `const id = props.routeId;` (one per rung) and **zero** of `props.routeId ??`.
Explain in the test comment (as the neighbouring tests do) that the component cannot be
rendered headlessly, so this locks the wiring rather than the pixels.

No test is needed for RideDetailScreen/DemoScreen (comment-only / behaviour follows from B).

## 6. Stop-on-ambiguity

If any ambiguity or surprise arises during execution, STOP and report back verbatim — never
guess, never rule on it. Forward to a fresh Fable Plan pass via the coordinator.

Spots where Plan is less than fully certain — tread carefully, and stop if reality differs:

1. **`defaultMapRouteId` consumers.** Plan's grep found it consumed only by
   `routeMapView.tsx` (plus its own tests and two DemoScreen *comments*). If Execute's grep
   finds another consumer (a new screen, a hook), STOP — do not remove the import/function
   anywhere but `routeMapView.tsx`, and do not touch `store/defaultRoute.ts` regardless.
2. **Where `mapOverlay` is declared.** §3.3 step 2 places it after `writingHistory` (~L711).
   If that spot is inside a conditional/early-return path (it should not be — `routeLocked`,
   `writingHistory`, `routeLine` are unconditional consts in the component body), or if
   `live`/`rideRouteHint` are not in scope there, STOP rather than relocating it into a
   branch.
3. **`trail={undefined}` vs `trail={[]}`.** Plan chose `undefined` (the prop is optional;
   `trailFC` yields an empty FeatureCollection either way and the always-mounted-source
   contract at `routeMapView.tsx` L428–434 is preserved). If tsc objects, or if the trail
   source is found to be *conditionally* mounted on `props.trail` being defined, STOP — that
   would reintroduce the WP-J z-order bug the always-mounted design guards against.
4. **`demo_suite.ts` and `DEMO_FIRST_RIDE_ID`.** Comments only in DemoScreen. If any test or
   code turns out to depend on the *fallback* (e.g. a test asserting that null resolves to a
   route), STOP and report the test name — Plan found none.
5. **A deliberate call, not an ambiguity, recorded so Inspect does not re-litigate it:** in
   state 3 the trail is hidden for the *whole* picked ride, including a picked ride the engine
   never anchors ("writing history · not on home>>work yet"). Nathan's wording — "If I take a
   known route >> show the route and disable the yellow line" — is by pick, not by lock, and
   the reference line is drawn from START under the hard-pick rule, so hiding the trail there
   is the only way to keep "never both" true. The recording on disk is unaffected.
6. **Anchor drift.** Every line number above is from the 2026-09-04 read. A mismatch of a few
   lines is expected; a mismatch in *content* (a prop already gated, a fallback already gone,
   a second `rideRouteHint` after all) is a STOP.

---
## Inspect findings (2026-09-04, fresh-context Fable pass) — read before executing

**Verdict: PASS WITH FINDINGS.** Every anchor was re-confirmed exact; the root cause and fix design hold. Two things to fold in before Execute runs:

1. `defaultMapRouteId` has THREE test consumers this brief doesn't name: `store_suite.ts:792`, `catalogstore_suite.ts:198`, and `routeasset_runtime_suite.ts:313` — the last of these was written by WP-C (cycle1) specifically to pin "a newly saved user route becomes the setup map's default," which is exactly the fallback behaviour this brief removes for the live map. Execute should grep for `defaultMapRouteId`/`defaultRouteId` across `tests/` before touching anything, expect that test to need updating (not silently left broken), and should NOT stop-on-ambiguity over this — it's an expected, in-scope consequence of the fix, just worth flagging so it isn't missed.
2. Unstated edge case: a picked route whose reference line isn't drawable (no asset) would, under the new logic, render neither the reference line nor the live trail (both suppressed). This situation doesn't appear to be reachable in the current app (every route with a `refLineId` should have a drawable asset once it's real), but Execute should confirm this assumption holds rather than silently accept a genuinely blank map if it turns out to be reachable.
