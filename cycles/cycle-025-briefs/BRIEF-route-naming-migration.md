# BRIEF — Route display-name overlay (cycle 025 · WP-route-naming-migration · D-039 execution tier)

Written 2026-08-27 by the Fable planning pass, from the code at HEAD (all anchors below
re-verified tonight, after the five earlier cycle-025 passes landed). You are the Sonnet
executor. This brief is your ONLY input — execute exactly what is written here.
**Stop-on-ambiguity rule:** if any anchor string below does not match the file, if a test
fails for a reason this brief does not predict, or if you need to make ANY decision this
brief does not already make — STOP, change nothing further, and report the exact discrepancy
verbatim to the coordinator. Never rule on ambiguity yourself.

## Environment

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every call is
  a fresh shell (no cwd/env carryover) with a ~45 s timeout — start every command with
  `cd "$HOME/mnt/Qualifire" && …` (or `…/Qualifire/app`). Run verification synchronously in
  one call (`tests/run.ts` takes ~3 s, `npx tsc --noEmit` ~17 s — both fit; give tsc
  `timeout_ms` near 45000). Backgrounding does not survive across calls.
- Do NOT run `git` — the coordinator commits.
- Never delete a file. (Nothing in this task requires deleting; if you think it does, stop
  and escalate.)
- Node v22.23.2 and `node_modules/.bin/tsc` are present; `python3` is `/usr/bin/python3`.

## Mandate

Nathan ruled (2026-08-25/26, WP-route-naming-migration): the four legacy time-of-day route
ids get descriptive display names **as a display overlay only** — "I think we don't have to
rewrite raw data, but at least in app show me my updated names." Route **ids never change
anywhere**: not in `catalog.seed.json`, not in `results.seed.json`, not in engine track refs,
not in map-asset manifests, not in GPX/GPX+ exports, not in caches. You add a lookup table and
route every user-visible label through it, falling back to the existing split-on-capitals
derivation for every id not in the table.

**The ruled table (apply exactly, nothing more):**

| catalog id (unchanged forever) | display-style name |
|---|---|
| `Morning` | `HomeWorkDry` → renders "Home Work Dry" |
| `MorningB` | `HomeWorkWet` → renders "Home Work Wet" |
| `EveningA` | `WorkHomeDry` → renders "Work Home Dry" |
| `EveningB` | `WorkHomeWet` → renders "Work Home Wet" |
| `StationHomePreferred` | `StationHomeDry` → renders "Station Home Dry" |

(`StationHomePreferred` is the real catalog id — verified at HEAD in
`app/src/store/catalog.seed.json`, way `station>home`, paired with `StationHomeWet`.)

Explicitly ruled NOT renamed: `StationHomeWet`, `StationWorkStd`, `StationWorkAlt`, and the
remaining twelve descriptive routes — they get NO table entry and must render byte-for-byte
as today (split-on-capitals of the id).

## Baseline at HEAD (measured tonight by the planning pass)

- `cd app && node --experimental-strip-types tests/run.ts` → **245 tests: 242 pass, 0 fail, 3 skip** (~3 s).
- `cd app && npx tsc --noEmit` → clean, exit 0 (~17 s).

## How labels work today (verified)

The derivation is centralized: `routeLabel(id)` in `app/src/store/defaultRoute.ts` does
`id.replace(/([a-z0-9])([A-Z])/g, '$1 $2')`. It is imported by `RecordScreen.tsx` (picker,
sector toasts, armed line, detecting-hint), re-exported through `ui/rideHistoryModel.ts`
(which feeds `RidesScreen` row titles and `ResultScreen` PB rows via `routeName`), and used
directly in `ResultScreen.tsx`. Exactly THREE user-visible surfaces bypass it at HEAD — you
fix all three in Part A. Everything else follows automatically from the one function.

---

## Part A — app code (4 files)

### A1. `app/src/store/defaultRoute.ts` — the overlay itself

Replace the current block (verbatim at HEAD):

```ts
/** Presentational label for a route id — the Route type has no label field
 * (schema untouched): "EveningA" -> "Evening A", "Morning" -> "Morning".
 * Shared by RecordScreen and ResultScreen (previously duplicated). */
export function routeLabel(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}
```

with:

```ts
/** Display-name overlay (Nathan, 2026-08-26 — WP-route-naming-migration):
 * the four legacy time-of-day ids plus StationHomePreferred render under
 * FromToVariant-style names. The ids themselves never change (no raw-data
 * rewrite — D-023): this maps id -> display-style id only, and routeLabel()
 * then applies the same split-on-capitals every native FromToVariant id
 * gets, so overlaid and native routes render identically. Any id absent
 * here (including future routes) keeps its derived label byte-for-byte. */
export const ROUTE_DISPLAY_ID: Record<string, string> = {
  Morning: 'HomeWorkDry',
  MorningB: 'HomeWorkWet',
  EveningA: 'WorkHomeDry',
  EveningB: 'WorkHomeWet',
  StationHomePreferred: 'StationHomeDry',
};

/** Presentational label for a route id — the Route type has no label field
 * (schema untouched): "Morning" -> "Home Work Dry" (overlay), "EveningA" ->
 * "Work Home Dry" (overlay), "WorkStationA" -> "Work Station A" (derived).
 * Shared by RecordScreen and ResultScreen (previously duplicated). */
export function routeLabel(id: string): string {
  return (ROUTE_DISPLAY_ID[id] ?? id).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}
```

### A2. `app/src/ui/RecordScreen.tsx` — live "route locked" status line shows the raw id

Around line 484 (inside the `routeLine` ternary), these two template literals currently
interpolate the raw engine track id:

```ts
        ? `${live.track ?? ''} · route locked (your pick) · verifying${live.onRoute ? '' : ' · off route'}`
        : `${live.track ?? ''} · route locked${live.onRoute ? '' : ' · off route'}`
```

In BOTH lines replace `${live.track ?? ''}` with `${live.track ? routeLabel(live.track) : ''}`.
`routeLabel` is already imported in this file (line ~50). Touch nothing else in the file —
RecordScreen was edited twice tonight by other passes.

### A3. `app/src/ui/RoutesScreen.tsx` — Routes tab renders `r.id` raw

Anchor (inside the open-way route list):

```tsx
                      <Text style={{ color: t.text, fontSize: 13.5 }}>{r.id}</Text>
```

Change `{r.id}` to `{routeLabel(r.id)}`, and add to the imports (this file uses explicit
extensions):

```ts
import { routeLabel } from '../store/defaultRoute.ts';
```

### A4. `app/src/ui/DemoScreen.tsx` — demo subtitle names the route in prose

Anchor:

```tsx
      <Text style={styles.sub}>
        A real archived Morning lap replayed at {RATE}x. Buzz at every gate, tier colours as they
        are earned, the live map moving. Nothing is recorded.
      </Text>
```

Change `Morning` to `{routeLabel(ROUTE)}`, and add to the imports (this file uses
extensionless specifiers):

```ts
import { routeLabel } from '../store/defaultRoute';
```

Do NOT change `const ROUTE = 'Morning';` (line ~25) — that is the engine/data key, marked
"Intentional literal (B-39)".

**Nothing else in `app/src`.** In particular do not touch: `lastRide.ts`, `colourModel.ts`,
`rideHistoryModel.ts` (already routes through `routeLabel`), `liveView.tsx`, `engine.ts`,
`tracks.ts`, `refs.ts`, anything in `app/src/storage/` (GPX/GPX+ exporters write raw track
ids by design — the existing `gpxplus_suite` asserts `track="Morning"` and MUST keep passing
unchanged), and `app/src/ui/preview/` (an unreferenced old prototype — not reachable from the
app; deliberately left alone).

## Part B — tests

### B1. `app/tests/ridehistory_suite.ts` — one expectation updates

Anchor (line ~71):

```ts
  assert(withResult.routeName === 'Morning', `ride with a result must get a routeName, got ${withResult.routeName}`);
```

Replace with:

```ts
  assert(withResult.routeName === 'Home Work Dry',
    `ride with a result must get its display routeName (Morning -> Home Work Dry overlay), got ${withResult.routeName}`);
```

This is the ONLY existing test that asserts a rendered label for an overlaid id (verified by
grep across `app/tests/`). `recordflow_suite.ts:64` contains the string
`'Morning · route locked'` but only as an opaque input fixture to `statusItemsFor` — leave it.
`store_suite.ts`'s synthetic fixtures use ids like `'MorningA'` that are not in the overlay —
leave them.

### B2. `app/tests/store_suite.ts` — new tests

Extend the existing import (line ~20) `import { fallbackRouteId } from '../src/store/defaultRoute.ts';`
to `import { fallbackRouteId, routeLabel } from '../src/store/defaultRoute.ts';`.

Append at the END of the file (after the last `fallbackRouteId` test; `path`, `loadJson`,
`TESTS_DIR`, `Catalog`, `test`, `assert` are all already imported/in scope):

```ts
// -------------------------------------- route display-name overlay (Nathan 2026-08-26)

test('routeLabel: the four legacy ids + StationHomePreferred show their ruled display names', () => {
  assert(routeLabel('Morning') === 'Home Work Dry', `Morning -> ${routeLabel('Morning')}`);
  assert(routeLabel('MorningB') === 'Home Work Wet', `MorningB -> ${routeLabel('MorningB')}`);
  assert(routeLabel('EveningA') === 'Work Home Dry', `EveningA -> ${routeLabel('EveningA')}`);
  assert(routeLabel('EveningB') === 'Work Home Wet', `EveningB -> ${routeLabel('EveningB')}`);
  assert(routeLabel('StationHomePreferred') === 'Station Home Dry',
    `StationHomePreferred -> ${routeLabel('StationHomePreferred')}`);
});

test('routeLabel: StationWork pair (ruled unchanged) and native ids keep their derived labels', () => {
  assert(routeLabel('StationWorkStd') === 'Station Work Std', 'Std keeps its name (ruled)');
  assert(routeLabel('StationWorkAlt') === 'Station Work Alt', 'Alt keeps its name (ruled)');
  assert(routeLabel('StationHomeWet') === 'Station Home Wet', 'already descriptive — no entry');
  assert(routeLabel('WorkStationA') === 'Work Station A', 'native id spot check');
  assert(routeLabel('HomeChurch') === 'Home Church', 'native id spot check');
  assert(routeLabel('SomeFutureRoute') === 'Some Future Route',
    'an id the table has never heard of falls back to split-on-capitals');
});

test('overlay never touches stored ids: catalog, map-asset manifest and engine refs still key the legacy ids', () => {
  const legacy = ['Morning', 'MorningB', 'EveningA', 'EveningB', 'StationHomePreferred'];
  const display = ['HomeWorkDry', 'HomeWorkWet', 'WorkHomeDry', 'WorkHomeWet', 'StationHomeDry'];

  const catalog = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const ids = new Set(catalog.routes.map((r) => r.id));
  for (const id of legacy) assert(ids.has(id), `catalog.seed.json must still contain route id ${id}`);
  for (const d of display) assert(!ids.has(d), `display name ${d} must never appear as a catalog route id`);
  for (const r of catalog.routes) {
    assert(!display.includes(r.refLineId), `refLineId ${r.refLineId} must stay a real track id`);
  }

  const manifest = loadJson<{ routes: Record<string, unknown> }>(
    path.join(TESTS_DIR, '..', 'assets', 'routes', 'routes.json'));
  for (const id of legacy) assert(id in manifest.routes, `map-asset manifest must still key ${id}`);
  for (const d of display) assert(!(d in manifest.routes), `map-asset manifest must not gain a ${d} key`);

  const refs = loadJson<{ tracks: Record<string, unknown> }>(path.join(TESTS_DIR, 'fixtures', 'refs.json'));
  for (const id of legacy) assert(id in refs.tracks, `engine refs.json must still key track ${id}`);
  for (const d of display) assert(!(d in refs.tracks), `engine refs.json must not gain a ${d} track`);
});
```

(Export byte-identity is additionally locked by the untouched `gpxplus_suite`, which asserts
`<qf:routeLock track="Morning" …>` etc. — it must pass unchanged.)

Expected suite result after Parts A+B: **248 tests: 245 pass, 0 fail, 3 skip.**

## Part C — `demos/mockup.html` (repo rule 6: mockup changes in the same pass)

**CRITICAL — do NOT run `data/analysis/07_build_mockup.py`.** The planning pass verified at
HEAD that the checked-in `demos/mockup.html` (879 lines, Leaflet-based, hand-evolved directly
in cycle 024 WP-B) has drifted far ahead of the stale `mockup_template.html` (479 lines);
running the builder would clobber newer shipped work with an obsolete page. Regen debt is
already tracked (B-66). Instead edit `demos/mockup.html` directly — the evolved page already
centralizes display labels in a `ROUTE_LABEL` table, so only three edits are needed:

**C1.** Anchor (line ~214):

```js
const ROUTE_LABEL = {Morning:'Morning', EveningA:'Evening A', EveningB:'Evening B', MorningB:'Morning B'};
```

Replace with:

```js
const ROUTE_LABEL = {Morning:'Home Work Dry', EveningA:'Work Home Dry', EveningB:'Work Home Wet', MorningB:'Home Work Wet'};
```

**C2.** In the one-line embedded DATA blob (line ~185) there is exactly one non-empty ways
routes array (verified: one occurrence). Replace the exact substring

```
"routes": ["Morning", "Evening A", "Evening B", "Morning B"]
```

with

```
"routes": ["Home Work Dry", "Work Home Dry", "Work Home Wet", "Home Work Wet"]
```

(These strings are the RECORD-tab "which route today?" pills, the readytag, and the
"… · route locked" chip via `sel.routePick` — display-only in the mockup sim; the ghost
tower is hardwired to `D.towers.Morning` regardless.)

**C3.** Demo-tab prose, anchor (line ~812): change
`One thing only: a real archived Morning lap replayed at 25x, through the` to
`One thing only: a real archived Home Work Dry lap replayed at 25x, through the`
(mirrors A4).

**Leave every other `Morning`/`EveningA`/`EveningB`/`MorningB` occurrence in the file
untouched** — they are data keys and comments: the DATA blob's `"towers"` keys and per-ride
`"route"` ids, `const GH = D.towers.Morning`, `route:'Morning'` (~line 501),
`resultOpen = 'Morning'` (~line 503), `routesAvail = ['Morning','EveningA',…]` (~line 591),
and JS comments. Display of all of those flows through `ROUTE_LABEL[route]||route`.

Also leave `data/analysis/07_build_mockup.py` and `data/analysis/mockup_template.html`
untouched — the stale pipeline's disposition is a coordinator call (see report items).

Post-check: `grep -c "Home Work Dry" demos/mockup.html` ≥ 3, and open-in-browser is not
required (text-level change only).

## Part D — `design/make_screens.py` + regenerate `design/canonical/`

The design SVG mirror renders route names as visible text and has its own sanctioned
regeneration (stdlib-only Python; `design/canonical/` is agent-owned build output; Nathan's
`design/edited/` is empty except the placeholder and is NEVER written). Seven edits, then
one rerun:

**D1.** Replace the mirror function (anchor, line ~615):

```python
def route_label(route_id: str) -> str:
    """Mirrors store/defaultRoute.ts's routeLabel() exactly: 'EveningA' ->
    'Evening A', 'Morning' -> 'Morning' (no match, no change)."""
    return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", route_id)
```

with:

```python
ROUTE_DISPLAY_ID = {
    "Morning": "HomeWorkDry",
    "MorningB": "HomeWorkWet",
    "EveningA": "WorkHomeDry",
    "EveningB": "WorkHomeWet",
    "StationHomePreferred": "StationHomeDry",
}


def route_label(route_id: str) -> str:
    """Mirrors store/defaultRoute.ts's routeLabel() exactly: the ruled
    display-name overlay (Nathan 2026-08-26) first, then split-on-capitals:
    'Morning' -> 'Home Work Dry', 'WorkStationA' -> 'Work Station A'
    (no overlay entry, derived unchanged)."""
    return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", ROUTE_DISPLAY_ID.get(route_id, route_id))
```

**D2.** Line ~747: in
`text_el(content, "content_route_entry_label", 30, ry2, "Morning", 13.5, color=t["text"])`
replace `"Morning"` with `route_label("Morning")`.

**D3.** Line ~889 (demo subtitle): replace `"A real archived Morning lap replayed at 25x. Buzz at every gate, tier "`
with `"A real archived Home Work Dry lap replayed at 25x. Buzz at every gate, tier "`.

**D4.** Line ~1084: replace `"home → work · Morning"` with `"home → work · Home Work Dry"`.

**D5.** Line ~1352/1354 (rides placeholder rows): `{"route": "Morning",` → `{"route": "Home Work Dry",`
and `{"route": "Evening A",` → `{"route": "Work Home Dry",`.

**D6.** Line ~1451: in `text_el(content, "content_last_route", VB_W / 2, cy, "Morning", 13, …)`
replace `"Morning"` with `route_label("Morning")`.

**D7.** Line ~1485/1486 (PB placeholder rows): `{"route": "Morning", "pb":` → `{"route": "Home Work Dry", "pb":`
and `{"route": "Evening A", "pb":` → `{"route": "Work Home Dry", "pb":`.

Do NOT touch the six `load_route_asset(repo_root, "Morning")` calls, the
`picked_route_id = "Morning" …` logic (~line 1022), or any comment — those are data keys.

Then run: `cd "$HOME/mnt/Qualifire" && python3 design/make_screens.py` — expect
`Wrote 18 SVGs to …/design/canonical:` (the script validates ALL files before writing ANY;
if it prints `VALIDATION FAILED`, STOP and escalate with the full error output — do not
debug the validator). Post-check: `grep -rl "Morning\|Evening A" design/canonical/` must
return nothing.

## Must-not-change list (byte-identical at the end of your pass)

`app/src/store/catalog.seed.json` · `app/src/store/results.seed.json` ·
`app/assets/routes/routes.json` · `app/tests/fixtures/**` · `app/src/live/**` ·
`app/core/**` · `app/src/storage/**` · `app/src/ui/preview/**` ·
`data/analysis/07_build_mockup.py` · `data/analysis/mockup_template.html` ·
`design/edited/**` · `IDEAS.md` · `STATE.md` · `product/**` · `BACKLOG.md`.

## Verification (run all; all must hold)

1. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts` →
   **248 tests: 245 pass, 0 fail, 3 skip** (baseline was 245/242/0/3; +3 new).
2. `cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit` → clean, exit 0 (use timeout_ms≈45000; ~17 s).
3. `cd "$HOME/mnt/Qualifire/app" && grep -n "{r.id}" src/ui/RoutesScreen.tsx` → no match.
4. `cd "$HOME/mnt/Qualifire/app" && grep -n 'live.track ?? ' src/ui/RecordScreen.tsx` → no match
   (both status lines now go through routeLabel).
5. `cd "$HOME/mnt/Qualifire" && grep -c "Home Work Dry" demos/mockup.html` → ≥ 3.
6. `cd "$HOME/mnt/Qualifire" && grep -rl "Morning\|Evening A" design/canonical/` → no output.
7. `cd "$HOME/mnt/Qualifire" && python3 -c "import json; c=json.load(open('app/src/store/catalog.seed.json')); ids=[r['id'] for r in c['routes']]; assert 'Morning' in ids and 'StationHomePreferred' in ids and 'HomeWorkDry' not in ids; print('catalog ids intact,', len(ids), 'routes')"`
   → `catalog ids intact, 20 routes`.

## Include these findings in your report (informational — no code action)

1. **StationWorkStd default (Nathan's ruling, second half):** the app has NO static
   per-way default-variant mechanism to set. The §8a default (`defaultRouteFor` in
   RecordScreen) is history-driven: most ghost rides in the recent window, tie → most
   recent, tie → catalog order. At HEAD both StationWork routes have zero seeded rides and
   catalog order lists `StationWorkAlt` BEFORE `StationWorkStd`, so an empty-history
   station→work pick currently defaults to **Alt**, contrary to the ruling. Not fixed in
   this pass (would mean either reordering ratified seed data or inventing a new static
   default mechanism — both out of scope). Flag for the virgin-cold-start epic.
2. **Mockup pipeline drift:** `demos/mockup.html` is hand-evolved (cycle 024 WP-B edited it
   directly); `07_build_mockup.py` + `mockup_template.html` are stale and regenerating would
   clobber shipped work — this brief therefore edits the mockup directly, per that precedent.
   Coordinator should decide whether to refresh or retire the template pipeline (relates to
   open B-66).
3. `app/src/ui/preview/PreviewScreen.tsx` still shows old route wording but is unreferenced
   by the running app — deliberately untouched.
4. `app/tests/recordflow_suite.ts:64`'s `'Morning · route locked'` is an opaque fixture
   string, deliberately untouched.
