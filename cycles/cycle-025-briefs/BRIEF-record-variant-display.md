# BRIEF — RECORD tab: variant-only third choice + station–work Std/Alt (cycle 025 · fix pass on WP-route-naming-migration · D-039 execution tier)

Written 2026-08-27 by the Fable planning pass, from the code at HEAD (commit 11623ae;
every anchor below re-verified today, after the naming-overlay pass 9c3e093 landed).
Revised the same day to fold in Nathan's follow-up ruling (work>>station Alt/Std naming
+ Std-first ordering) — this file supersedes the earlier same-named revision in full.
You are the Sonnet executor. This brief is your ONLY input — execute exactly what is
written here. **Stop-on-ambiguity rule:** if any anchor string below does not match
the file, if a test fails for a reason this brief does not predict, or if you need to
make ANY decision this brief does not already make — STOP, change nothing further, and
report the exact discrepancy verbatim to the coordinator. Never rule on ambiguity
yourself.

## Environment

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every
  call is a fresh shell (no cwd/env carryover) with a ~45 s timeout — start every
  command with `cd "$HOME/mnt/Qualifire" && …`. Tests ~3 s; `npx tsc --noEmit` ~17 s
  (give it `timeout_ms` near 45000). Backgrounding does not survive across calls.
- Do NOT run `git` — the coordinator commits.
- Never delete a file. Nothing here requires deleting.

## Mandate (Nathan, 2026-08-27 — two rulings)

**Ruling 1 — the three components.** Cycle 025's display-name overlay renders the
RECORD tab's third pre-ride choice as the FULL concatenated route name. Nathan: a ride
is three separate components — *starting from* = home, *going to* = work, *which route
today* = dry — and the third choice must show ONLY the variant word. He sees
"Home Work Dry" pills (and "Station Work Std") where he should see "Dry" / "Wet" /
"Std" / "Alt". Applies to EVERY route, not just Home→Work.

**Ruling 2 — station–work Alt/Std, both directions.** station>>work already carries
Std/Alt names; work>>station still shows A/B. Nathan: **A = Alt, B = Std** — and
**Std must always be the first option (leftmost pill / listed first) compared to Alt,
in BOTH directions**. The A↔Alt / B↔Std mapping is DATA-VERIFIED by the planning pass
against the route traces in `app/assets/routes/routes.json`: `WorkStationA`'s path is
the reverse of `StationWorkAlt`'s (12–21 m mean nearest-point separation — same road)
and `WorkStationB` is the reverse of `StationWorkStd` (10–12 m); the cross-pairings
are 140–205 m apart (different roads). Neither pair has any seeded or historical ride
result (`results.seed.json` covers only Morning/EveningA/EveningB), so nothing
historical is at risk — and per the ruled overlay mechanism (2026-08-25: no raw-data
rewrite) the ids `WorkStationA`/`WorkStationB` still never change; only the display
overlay gains entries.

**Ruled scope of this pass (planning-pass reading — deviations are escalations, not
your call):**

- The setup screen already presents STARTING FROM / GOING TO / WHICH ROUTE TODAY? as
  three separate pill sections — the layout is right; only the third section's pill
  text is wrong (full name instead of bare variant), and the station–work pill order
  is wrong (Alt/A currently lists first in both directions — catalog order).
- The armed screen's ready line (`HOME → WORK · HOME WORK DRY · READY — NOT STARTED`)
  repeats from/to inside the route name — it becomes `HOME → WORK · DRY · …`.
- The RUNNING screen's rotating status ("Home Work Dry · route locked"), the
  detecting-hint ("you picked …"), and the sector toasts KEEP the full route name —
  deliberate: the live engine can lock any of the 20 catalog routes, including one on
  a *different way* than picked (§8a), so a bare "Dry" would be ambiguous there. Do
  not change them.
- The ROUTES tab keeps full route names but gains the same Std-first ordering in its
  per-way route list ("listed first" in Nathan's ruling). RIDES / RESULT / DEMO tabs:
  untouched.
- Ordering is implemented as a stable display sort (Std-suffixed display ids before
  Alt-suffixed; everything else keeps catalog order), applied where a way's routes are
  listed. Feeding the sorted list to RecordScreen's `defaultRouteFor` also makes Std
  the empty-history §8a default via its first-in-array tiebreak — this implements
  Nathan's 2026-08-26 ruling "Std is the default selection", which the previous pass
  flagged as unimplemented. `catalog.seed.json` itself is NOT reordered.

**The variant word is DERIVED, not a new table:** display id (after the
`ROUTE_DISPLAY_ID` overlay) minus the way's capitalized landmark-id pair. Verified
against all 7 multi-route ways at HEAD, with this pass's overlay additions applied:

| way | routes → variant pills (display order after this pass) |
|---|---|
| home>work | `Morning`→**Dry** · `MorningB`→**Wet** |
| work>home | `EveningA`→**Dry** · `EveningB`→**Wet** |
| station>work | `StationWorkStd`→**Std** · `StationWorkAlt`→**Alt** (order flipped: Std now first) |
| work>station | `WorkStationB`→**Std** · `WorkStationA`→**Alt** (overlay + order flipped) |
| station>home | `StationHomePreferred`→**Dry** · `StationHomeWet`→**Wet** |
| home>station | `HomeStationPreferred`→**Preferred** · `HomeStationViaFosh`→**Via Fosh** |
| work>church | `WorkChurchA`→**A** · `WorkChurchB`→**B** |

Single-route ways (`HomeChurch` etc.) never render the third section
(`wayRoutes.length > 1` guard) — and the helper's fallback returns the full label for
any id that does not follow the FromToVariant convention, so nothing can ever render
blank.

## Baseline at HEAD (measured today by the planning pass)

- `cd app && node --experimental-strip-types tests/run.ts` → **248 tests: 245 pass, 0 fail, 3 skip**.
- `cd app && npx tsc --noEmit` → clean, exit 0.

---

## Part A — app code (3 files)

### A1. `app/src/store/defaultRoute.ts` — overlay entries + two helpers

**A1a — extend the overlay.** Anchor (end of the `ROUTE_DISPLAY_ID` table):

```ts
  StationHomePreferred: 'StationHomeDry',
};
```

replace with:

```ts
  StationHomePreferred: 'StationHomeDry',
  // Nathan 2026-08-27: work>>station mirrors station>>work's Std/Alt naming.
  // A=Alt, B=Std — verified against the route traces (A reverses
  // StationWorkAlt, B reverses StationWorkStd); ids unchanged as ever.
  WorkStationA: 'WorkStationAlt',
  WorkStationB: 'WorkStationStd',
};
```

**A1b — the variant helper.** Directly AFTER the existing `routeLabel` function
(which ends `…'$1 $2');\n}`), insert:

```ts

/** Variant-only label for a route shown inside its way's context (Nathan,
 * 2026-08-27): where "starting from" and "going to" are already their own
 * choices on the RECORD tab, the third choice names ONLY the variant —
 * "Dry", "Wet", "Std", "Alt", "Via Fosh" — never the full FromToVariant
 * concatenation. Derived: the display id (overlay applied) minus the way's
 * capitalized landmark-id pair, split on capitals. Any id that does not
 * follow the convention (or would strip to nothing) falls back to the full
 * routeLabel(), so no pill ever renders blank. */
export function routeVariantLabel(
  id: string,
  way: { startLandmarkId: string; endLandmarkId: string },
): string {
  const display = ROUTE_DISPLAY_ID[id] ?? id;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const prefix = cap(way.startLandmarkId) + cap(way.endLandmarkId);
  if (display.startsWith(prefix) && display.length > prefix.length) {
    return display.slice(prefix.length).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }
  return routeLabel(id);
}

/** Display order for a way's routes (Nathan, 2026-08-27): "Std" always
 * lists before "Alt" — ruled for BOTH directions between station and work,
 * written as a general suffix rule so any future Std/Alt pair behaves the
 * same. Every other route keeps catalog order (the sort is stable —
 * ES2019+ guarantees it, Hermes included). RecordScreen feeds the sorted
 * list to defaultRouteFor, whose first-in-array tiebreak then makes Std
 * the empty-history §8a default too (Nathan's 2026-08-26 ruling: "Std is
 * the default selection"; previously flagged unimplemented). */
export function sortRoutesForDisplay<T extends { id: string }>(routes: T[]): T[] {
  const pri = (id: string): number => {
    const display = ROUTE_DISPLAY_ID[id] ?? id;
    return display.endsWith('Std') ? 0 : display.endsWith('Alt') ? 2 : 1;
  };
  return [...routes].sort((a, b) => pri(a.id) - pri(b.id));
}
```

### A2. `app/src/ui/RecordScreen.tsx` — import + three call sites

Anchor (line ~50):

```ts
import { routeLabel } from '../store/defaultRoute';
```

→ `import { routeLabel, routeVariantLabel, sortRoutesForDisplay } from '../store/defaultRoute';`

**A2a — the WHICH ROUTE TODAY? pills** (line ~928, inside the
`!freeRide && way && wayRoutes.length > 1` block). Anchor:

```tsx
                    <Text style={[styles.pillText, pickedRoute?.id === r.id && styles.pillTextOn]}>
                      {routeLabel(r.id)}
                    </Text>
```

Change `{routeLabel(r.id)}` to `{routeVariantLabel(r.id, way)}` (`way` is non-null
here — narrowed by the enclosing conditional).

**A2b — the armed screen's ready line** (line ~632). Anchor:

```tsx
        <Text style={styles.trackLine}>
          {landmarkLabel(fromId)} → {landmarkLabel(to)}
          {pickedRoute ? ` · ${routeLabel(pickedRoute.refLineId)}` : ''} · ready — not started
        </Text>
```

Change the middle interpolation to:

```tsx
          {way && pickedRoute ? ` · ${routeVariantLabel(pickedRoute.id, way)}` : ''} · ready — not started
```

(`pickedRoute.id`, not `.refLineId` — the overlay/variant is keyed by route id; the
two are equal for all 20 catalog routes at HEAD, verified, so no rendered output
changes beyond the shortening. `way` is in scope; the extra `way &&` narrows the
`Way | undefined` type — `pickedRoute` is only ever non-null when `way` matched.)

**A2c — the way's route list, sorted** (line ~567). Anchor:

```ts
  const wayRoutes = way ? CATALOG.routes.filter((r) => r.wayId === way.id) : [];
```

replace with:

```ts
  const wayRoutes = way ? sortRoutesForDisplay(CATALOG.routes.filter((r) => r.wayId === way.id)) : [];
```

(`wayRoutes` feeds the pills — Std now leftmost on both station–work ways — the ghost
count, which is order-independent, and `defaultRouteFor`, whose tiebreak now prefers
Std on empty history, per the Mandate. Do NOT touch `defaultRouteFor` itself, line
~89.)

### A3. `app/src/ui/RoutesScreen.tsx` — same ordering in the catalog listing

Anchor (line ~16): `import { routeLabel } from '../store/defaultRoute.ts';`
→ `import { routeLabel, sortRoutesForDisplay } from '../store/defaultRoute.ts';`
(this file uses explicit `.ts` extensions — keep it).

Anchor (line ~59):

```ts
        const routes = CATALOG.routes.filter((r) => r.wayId === w.id);
```

replace with:

```ts
        const routes = sortRoutesForDisplay(CATALOG.routes.filter((r) => r.wayId === w.id));
```

The route rows themselves keep `routeLabel(r.id)` (full name — line ~82, untouched):
`WorkStationA` now renders "Work Station Alt" there via the A1a overlay, no code
change needed.

**Nothing else in `app/src`.** In particular do NOT touch: the running-screen
`routeLine` ternary (lines ~484–486, `routeLabel(live.track)` /
`you picked ${routeLabel(rideRouteHint)}`), the sector toast (line ~761
`routeLabel(sec.routeId)`), `ResultScreen.tsx`, `RidesScreen.tsx`,
`rideHistoryModel.ts`, `DemoScreen.tsx` — all deliberate full-name surfaces.

## Part B — tests: `app/tests/store_suite.ts`

Extend the import (line ~20)
`import { fallbackRouteId, routeLabel } from '../src/store/defaultRoute.ts';`
to also name `routeVariantLabel` and `sortRoutesForDisplay`.

**B1 — update the previous pass's overlay tests (three surgical edits, no count
change):**

B1a. In the test at line ~617
(`test('routeLabel: the four legacy ids + StationHomePreferred show their ruled display names', …`),
change the title string to
`'routeLabel: the ruled display-name overlays render their display names'`
and add, before the test's closing `});`:

```ts
  assert(routeLabel('WorkStationA') === 'Work Station Alt',
    `WorkStationA -> ${routeLabel('WorkStationA')} (A=Alt, Nathan 2026-08-27)`);
  assert(routeLabel('WorkStationB') === 'Work Station Std',
    `WorkStationB -> ${routeLabel('WorkStationB')} (B=Std, Nathan 2026-08-27)`);
```

B1b. In the test at line ~626, the line

```ts
  assert(routeLabel('WorkStationA') === 'Work Station A', 'native id spot check');
```

is now false — replace it with:

```ts
  assert(routeLabel('WorkChurchA') === 'Work Church A', 'native id spot check');
```

B1c. In the overlay-guard test (line ~637), extend BOTH arrays:

```ts
  const legacy = ['Morning', 'MorningB', 'EveningA', 'EveningB', 'StationHomePreferred'];
  const display = ['HomeWorkDry', 'HomeWorkWet', 'WorkHomeDry', 'WorkHomeWet', 'StationHomeDry'];
```

→

```ts
  const legacy = ['Morning', 'MorningB', 'EveningA', 'EveningB', 'StationHomePreferred', 'WorkStationA', 'WorkStationB'];
  const display = ['HomeWorkDry', 'HomeWorkWet', 'WorkHomeDry', 'WorkHomeWet', 'StationHomeDry', 'WorkStationAlt', 'WorkStationStd'];
```

(The rest of that test then automatically proves the new overlay ids never leak into
catalog, map-asset manifest, or engine refs.)

**B2 — new tests.** Append at the END of the file (`path`, `loadJson`, `TESTS_DIR`,
`Catalog`, `test`, `assert` are in scope):

```ts

// ------------------------- RECORD-tab variant-only third choice + ordering (Nathan 2026-08-27)

test('routeVariantLabel: the third choice shows only the variant word, every multi-route way', () => {
  const w = (a: string, b: string) => ({ startLandmarkId: a, endLandmarkId: b });
  assert(routeVariantLabel('Morning', w('home', 'work')) === 'Dry', `Morning -> ${routeVariantLabel('Morning', w('home', 'work'))}`);
  assert(routeVariantLabel('MorningB', w('home', 'work')) === 'Wet', 'MorningB -> Wet');
  assert(routeVariantLabel('EveningA', w('work', 'home')) === 'Dry', 'EveningA -> Dry');
  assert(routeVariantLabel('EveningB', w('work', 'home')) === 'Wet', 'EveningB -> Wet');
  assert(routeVariantLabel('StationWorkStd', w('station', 'work')) === 'Std', 'StationWorkStd -> Std (Nathan example)');
  assert(routeVariantLabel('StationWorkAlt', w('station', 'work')) === 'Alt', 'StationWorkAlt -> Alt');
  assert(routeVariantLabel('WorkStationA', w('work', 'station')) === 'Alt', 'A -> Alt overlay then variant (Nathan 2026-08-27)');
  assert(routeVariantLabel('WorkStationB', w('work', 'station')) === 'Std', 'B -> Std overlay then variant (Nathan 2026-08-27)');
  assert(routeVariantLabel('StationHomePreferred', w('station', 'home')) === 'Dry', 'overlay applies before stripping');
  assert(routeVariantLabel('StationHomeWet', w('station', 'home')) === 'Wet', 'StationHomeWet -> Wet');
  assert(routeVariantLabel('HomeStationPreferred', w('home', 'station')) === 'Preferred', 'HomeStationPreferred -> Preferred');
  assert(routeVariantLabel('HomeStationViaFosh', w('home', 'station')) === 'Via Fosh', 'multi-word variant splits on capitals');
  assert(routeVariantLabel('WorkChurchB', w('work', 'church')) === 'B', 'WorkChurchB -> B');
});

test('routeVariantLabel: never blank for any catalog route; off-convention ids fall back to the full label', () => {
  const catalog = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  for (const r of catalog.routes) {
    const way = catalog.ways.find((x) => x.id === r.wayId);
    assert(way !== undefined, `route ${r.id} must have a way`);
    const v = routeVariantLabel(r.id, way!);
    assert(v.length > 0, `variant label for ${r.id} must not be empty, got "${v}"`);
  }
  assert(routeVariantLabel('HomeChurch', { startLandmarkId: 'home', endLandmarkId: 'church' }) === 'Home Church',
    'a route with no variant suffix falls back to its full label (single-route ways never render pills anyway)');
  assert(routeVariantLabel('Morning', { startLandmarkId: 'church', endLandmarkId: 'fosh' }) === 'Home Work Dry',
    'an id that does not start with the way prefix falls back to the full label');
});

test('sortRoutesForDisplay: Std lists before Alt in BOTH station-work directions; everything else keeps catalog order', () => {
  const catalog = loadJson<Catalog>(path.join(TESTS_DIR, '..', 'src', 'store', 'catalog.seed.json'));
  const wayIds = (wayId: string) =>
    sortRoutesForDisplay(catalog.routes.filter((r) => r.wayId === wayId)).map((r) => r.id).join(',');
  assert(wayIds('station>work') === 'StationWorkStd,StationWorkAlt',
    `station>work must list Std first, got ${wayIds('station>work')}`);
  assert(wayIds('work>station') === 'WorkStationB,WorkStationA',
    `work>station must list Std (=B) first, got ${wayIds('work>station')}`);
  assert(wayIds('home>work') === 'Morning,MorningB',
    `home>work keeps catalog order, got ${wayIds('home>work')}`);
  assert(wayIds('station>home') === 'StationHomePreferred,StationHomeWet',
    `station>home keeps catalog order, got ${wayIds('station>home')}`);
  assert(wayIds('work>church') === 'WorkChurchA,WorkChurchB',
    `work>church keeps catalog order, got ${wayIds('work>church')}`);
});
```

Expected suite result after Parts A+B: **251 tests: 248 pass, 0 fail, 3 skip.**

## Part C — `demos/mockup.html` (repo rule 6; edit directly, do NOT run `07_build_mockup.py` — same stale-template reasoning as the previous brief, B-66)

The mockup's home–work way card carries BOTH directions' routes in one array, so
variant-only pill text needs a direction filter or the pills would read
Dry/Dry/Wet/Wet. The mockup has NO station–work routes (`"routes": []` on its
station--work way), so Ruling 2 needs no mockup edit. Four edits:

**C1.** Directly below the anchor (line ~214):

```js
const ROUTE_LABEL = {Morning:'Home Work Dry', EveningA:'Work Home Dry', EveningB:'Work Home Wet', MorningB:'Home Work Wet'};
```

insert:

```js
// RECORD-tab variant-only third choice (Nathan 2026-08-27): pills + readytag
// show only the variant word; keys are the display names used in D.ways[].routes.
const ROUTE_DIR = {'Home Work Dry':'home>work','Home Work Wet':'home>work','Work Home Dry':'work>home','Work Home Wet':'work>home'};
const ROUTE_VARIANT = {'Home Work Dry':'Dry','Home Work Wet':'Wet','Work Home Dry':'Dry','Work Home Wet':'Wet'};
```

**C2.** Anchor (line ~339):

```js
    const routes = w && w.routes && w.routes.length>1 ? w.routes : null;
```

replace with:

```js
    const dirRoutes = w && w.routes ? w.routes.filter(r=>!ROUTE_DIR[r] || ROUTE_DIR[r]===sel.from+'>'+sel.to) : [];
    const routes = dirRoutes.length>1 ? dirRoutes : null;
```

**C3.** Anchor (lines ~367–369):

```js
        ${routes ? `<div style="margin-top:10px"><div class="muted">which route today?</div>
          <div style="margin-top:6px">${routes.map((r,i)=>
            `<span class="pill${(sel.routePick||routes[0])===r?' on':''}" data-route="${r}">${r}</span>`).join('')}</div></div>`:''}
```

replace with (pill text → variant word; highlight falls back to the first
*in-direction* route when the stored pick isn't in this direction's list):

```js
        ${routes ? `<div style="margin-top:10px"><div class="muted">which route today?</div>
          <div style="margin-top:6px">${routes.map((r,i)=>
            `<span class="pill${(routes.includes(sel.routePick)?sel.routePick:routes[0])===r?' on':''}" data-route="${r}">${ROUTE_VARIANT[r]||r}</span>`).join('')}</div></div>`:''}
```

**C4.** Armed readytag, anchor (line ~388): in

```js
      <div class="readytag">${lm(sel.from)} → ${lm(sel.to)}${sel.routePick?' · '+sel.routePick:''} · ready, not started</div>
```

replace `${sel.routePick?' · '+sel.routePick:''}` with
`${sel.routePick?' · '+(ROUTE_VARIANT[sel.routePick]||sel.routePick):''}`.

**Leave untouched:** the running-screen locked chip (line ~552,
`(sel.routePick||'route')+' · route locked'`) — mirrors the app's full-name rule;
`data-route` keeps carrying the full display name (the click handler at line ~863 and
`sel.routePick` key on it); everything else in the file.

Post-check: `grep -c "ROUTE_VARIANT" demos/mockup.html` → 3 (the C1 const + C3 pill
+ C4 readytag; corrected 2026-08-27 — an earlier revision said 4, a planning-pass
miscount the executor correctly stopped on).

## Part D — `design/make_screens.py` + regenerate `design/canonical/`

(`design/canonical/` is agent-owned build output; `design/edited/` is Nathan's and is
NEVER written.) The mirror draws only the home→work way, so Ruling 2 changes no pixel
— but the Python `ROUTE_DISPLAY_ID` mirror must stay exact.

**D0.** Anchor (end of the Python `ROUTE_DISPLAY_ID` dict):

```python
    "StationHomePreferred": "StationHomeDry",
}
```

replace with:

```python
    "StationHomePreferred": "StationHomeDry",
    "WorkStationA": "WorkStationAlt",
    "WorkStationB": "WorkStationStd",
}
```

Also fix the now-stale example in `route_label`'s docstring (line ~627): replace
`'WorkStationA' -> 'Work Station A'` with `'WorkChurchA' -> 'Work Church A'`.

**D1.** Directly after the `route_label` function (ends
`return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", ROUTE_DISPLAY_ID.get(route_id, route_id))`),
insert:

```python


def route_variant_label(route_id: str, way: dict) -> str:
    """Mirrors store/defaultRoute.ts's routeVariantLabel() exactly: display id
    (overlay applied) minus the way's capitalized landmark-id pair, split on
    capitals — 'Morning' on home>work -> 'Dry', 'StationWorkStd' -> 'Std';
    falls back to route_label() for any off-convention id."""
    display = ROUTE_DISPLAY_ID.get(route_id, route_id)
    prefix = way["startLandmarkId"].capitalize() + way["endLandmarkId"].capitalize()
    if display.startswith(prefix) and len(display) > len(prefix):
        return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", display[len(prefix):])
    return route_label(route_id)
```

**D2.** Anchor (line ~1038):

```python
        route_items = [(route_label(r["id"]), r["id"] == picked_route_id) for r in way_routes]
```

→ `route_items = [(route_variant_label(r["id"], way), r["id"] == picked_route_id) for r in way_routes]`

**D3.** Anchor (line ~1095): in
`text_el(content, "content_track_line_l1", VB_W / 2, 30, "home → work · Home Work Dry", 12,`
replace `"home → work · Home Work Dry"` with `"home → work · Dry"`.

**D4 + D5 — leftover from the previous pass (planning-pass finding, fix now):** the
running and finished mirrors still hardcode the RAW id (the previous brief's
post-check grep was case-sensitive, so uppercase `MORNING` slipped it). Lines ~1196
and ~1311 both read:

```python
    text_el(content, "content_status_line", VB_W / 2, y + 12, "MORNING · ROUTE LOCKED", 12,
```

In BOTH, replace `"MORNING · ROUTE LOCKED"` with
`route_label("Morning").upper() + " · ROUTE LOCKED"` (full name, NOT variant — the
running screen keeps full names, see Mandate). Rendered: `HOME WORK DRY · ROUTE LOCKED`.

Then run: `cd "$HOME/mnt/Qualifire" && python3 design/make_screens.py` — expect
`Wrote 18 SVGs`. If it prints `VALIDATION FAILED`, STOP and escalate with the full
error output — do not debug the validator.

Post-checks:
- `grep -l "Home Work Dry" design/canonical/record_setup_*.svg design/canonical/record_armed_*.svg` → no output (pills/ready line are variant-only now).
- `grep -l "HOME WORK DRY · ROUTE LOCKED" design/canonical/record_running_day.svg design/canonical/record_running_night.svg design/canonical/record_finished_day.svg design/canonical/record_finished_night.svg` → all four files.
- `grep -rl "MORNING · ROUTE LOCKED" design/canonical/` → no output.

## Must-not-change list (byte-identical at the end of your pass)

`app/src/store/catalog.seed.json` (NOT reordered — ordering is display-side only) ·
`app/src/store/results.seed.json` · `app/assets/routes/routes.json` ·
`app/tests/fixtures/**` · `app/src/live/**` · `app/core/**` · `app/src/storage/**` ·
`app/src/ui/preview/**` · `app/src/ui/ResultScreen.tsx` · `app/src/ui/RidesScreen.tsx` ·
`app/src/ui/DemoScreen.tsx` · `app/src/ui/rideHistoryModel.ts` ·
`data/analysis/07_build_mockup.py` · `data/analysis/mockup_template.html` ·
`design/edited/**` · `IDEAS.md` · `STATE.md` · `product/**` · `BACKLOG.md`.

## Verification (run all; all must hold)

1. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts` →
   **251 tests: 248 pass, 0 fail, 3 skip** (baseline 248/245/0/3; +3 new).
2. `cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit` → clean, exit 0 (timeout_ms≈45000).
3. `cd "$HOME/mnt/Qualifire/app" && grep -n "routeLabel(r.id)" src/ui/RecordScreen.tsx` → no match.
4. `cd "$HOME/mnt/Qualifire/app" && grep -n "routeLabel(pickedRoute" src/ui/RecordScreen.tsx` → no match.
5. `cd "$HOME/mnt/Qualifire/app" && grep -c "routeLabel(" src/ui/RecordScreen.tsx` → **4**
   (the four deliberate full-name survivors: the two locked-line templates at ~484/485,
   the detecting hint at ~486, the sector toast at ~761). Any other count → STOP and
   escalate with the grep output.
6. Mockup: `cd "$HOME/mnt/Qualifire" && grep -c "ROUTE_VARIANT" demos/mockup.html` → 3
   (corrected from 4 — planning-pass miscount, see Part C post-check).
7. Design post-checks from Part D (all three greps).
8. `cd "$HOME/mnt/Qualifire" && python3 -c "import json; c=json.load(open('app/src/store/catalog.seed.json')); ids=[r['id'] for r in c['routes']]; assert len(ids)==20 and 'WorkStationA' in ids and 'WorkStationAlt' not in ids; print('catalog ids intact, order untouched:', ids[:3])"`
   → prints `catalog ids intact, order untouched: …` (seed untouched, per rule).
9. `cd "$HOME/mnt/Qualifire" && grep -c "WorkStationStd" app/src/store/defaultRoute.ts design/make_screens.py` → `1` for each file (the TS overlay and its Python mirror agree).

## Include these findings in your report (informational — no code action)

1. The RUNNING screen (route-locked line, detecting hint, sector toasts) deliberately
   keeps full route names — cross-way locks make a bare variant ambiguous. If Nathan
   wants those shortened too, that is a new ruling, not this pass.
2. RIDES / RESULT tabs keep full concatenated names (rows lack from/to context).
3. The remaining A/B ways (work>station is now Alt/Std; work>church still shows pills
   "A" / "B") — whether work>church deserves descriptive variants is a content ruling
   for Nathan, same family as the wet/dry and Alt/Std rulings, not this pass.
4. The Std-first sort also flips the empty-history §8a DEFAULT pick to Std on both
   station–work ways (via defaultRouteFor's first-in-array tiebreak) — this implements
   Nathan's 2026-08-26 "Std is the default selection" ruling, which the previous pass
   reported as unimplemented. Real ride history, once it exists, still outranks it
   (most ghosts, then most recent — unchanged).
5. The A=Alt / B=Std mapping was verified against route-trace geometry, not assumed:
   WorkStationA reverses StationWorkAlt (12–21 m mean separation), WorkStationB
   reverses StationWorkStd (10–12 m). No ride results exist for either pair, so the
   overlay is risk-free to history.
