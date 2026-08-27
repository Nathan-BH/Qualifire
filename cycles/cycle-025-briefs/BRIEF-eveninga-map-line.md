# BRIEF — EveningA ("WorkHomeDry") map reference line misses the START gate (cycle 025 · D-039 execution tier)

Written 2026-08-27 by the Fable planning pass, from the code at HEAD (commit e23cfef;
every anchor and number below measured today against the working tree). You are the
Sonnet executor. This brief is your ONLY input — execute exactly what is written here.
**Stop-on-ambiguity rule:** if any anchor string below does not match the file, if a
test fails for a reason this brief does not predict, or if you need to make ANY
decision this brief does not already make — STOP, change nothing further, and report
the exact discrepancy verbatim to the coordinator. Never rule on ambiguity yourself.

## Environment

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every
  call is a fresh shell (no cwd/env carryover) with a ~45 s timeout — start every
  command with `cd "$HOME/mnt/Qualifire" && …`. Tests ~3 s; `npx tsc --noEmit` ~17 s
  (give it `timeout_ms` near 45000).
- Do NOT run `git` (except the two read-only `git diff --stat` checks in
  Verification) — the coordinator commits.
- Never delete a file. Nothing here requires deleting.
- Do NOT run `data/analysis/08_build_route_assets.py` under any circumstances — it
  would overwrite the 20-route `routes.json` with only 3 routes and it hard-exits
  without basemap crops that are deliberately not in the repo. Part C only EDITS it.

## Mandate (Nathan, 2026-08-27, verbatim)

> "i think you introduced an error when changing the names for the WorkHomeDry route
> on the RECORD tab. The current reference route for this ride is wrong and is
> completely off the first gate (at least visually when looking at the live map). …
> I think it is just an overlay issue as the first sector still logged properly
> today. But lets make this cosmetic change."

**Planning-pass findings (all data-verified today — you re-verify nothing upstream
of the anchors below):**

- "WorkHomeDry" is catalog route id **`EveningA`** (`ROUTE_DISPLAY_ID` in
  `app/src/store/defaultRoute.ts`).
- Today's naming commits (9c3e093, 0b4ba39) are NOT the cause — they changed label
  text and pill/list ordering only; the map's `routeId` prop still receives
  `pickedRoute.refLineId` (`= 'EveningA'`) unchanged, and `sortRoutesForDisplay`
  does not reorder the work>home pair (both ids rank the same). The bad data below
  is byte-identical all the way back to the initial repo import.
- Root cause: the live map's vector line is drawn from
  `app/assets/routes/routes.json` → `routes.EveningA.path`, which script 08 built
  from the MOST RECENT A-variant ride (`20260813-1618-work2home-19726172105.gpx`).
  That ride's first ~700 m took a different street: its path deviates up to
  **217.8 m** from the parity-anchored EveningA reference the engine times against
  (`app/tests/fixtures/refs.json`), and the drawn line passes **182.8 m** from the
  START gate (which the map draws at its true position, 8.5 m off the engine ref).
  Hence exactly Nathan's symptom: line visibly off the first gate, timing correct
  (the live engine never reads `routes.json`).
- Ruled fix: rebuild ONLY EveningA's `path`, `gateIdx`, `sourceRide` in
  `routes.json` (and the `demos/routes-data.js` preview mirror) from the PARITY.md
  medoid ride **`data/activities/20260724-1838-work2home-19448004625.gpx`** — the
  same ride the engine's reference is built from (`PARITY_REFS.EveningA` in
  `app/tests/build_fixtures.ts`). Measured result: max deviation from the engine
  ref drops to 16.8 m; gate distances to the drawn path become
  START 8.3 / G1 11.8 / G2 13.0 / G3 1.0 / FINISH 14.5 m (healthy routes today
  are all ≤ 19.7 m). Gates, the Web-Mercator transform fields and `EveningA.png`
  are untouched.

## Baseline at HEAD (measured today by the planning pass)

- `cd app && node --experimental-strip-types tests/run.ts` → `251 tests: 248 pass, 0 fail, 3 skip`.
- `routes.json` → `routes.EveningA`: `path` has 168 points, `gateIdx` is
  `[11, 55, 94, 122, 159]`, `sourceRide` is `20260813-1618-work2home-19726172105.gpx`.
- `demos/routes-data.js` mirror holds only 3 routes (Morning/EveningA/EveningB —
  already stale vs the 20-route routes.json; that staleness is out of scope, do NOT
  expand it to 20 routes) and its EveningA entry equals routes.json's.
- Both files round-trip byte-identically through `json.dump(..., indent=1)` plus a
  trailing newline (mirror: wrapped in its two-line header and `;`).

Execute in this order: **Part B (guard test) → run tests (expect exactly the one
predicted FAIL) → Part A (data rebuild) → run tests (expect 0 fail) → Part C (pin) →
Verification.**

## Part B — guard test in `app/tests/routemap_suite.ts`

Anchor (end of the FIRST test in the file — these exact lines exist once):

```
    assert(a.w > 0 && a.h > 0 && a.scale > 0, `${id}: broken asset dimensions`);
  }
});
```

Immediately AFTER that anchor, insert:

```ts

test('routemap: every gate sits on its own drawn path (cycle 025 EveningA map-line fix)', () => {
  // The visual invariant the live map depends on: the vector line drawn from
  // `path` must pass through the route's own gates. EveningA's path was built
  // from a ride whose start deviates ~183 m from the START gate, so the
  // RECORD/armed and running maps drew a line off the first gate while GPS
  // timing (which reads tests/fixtures/refs.json, never this file) stayed
  // correct (Nathan, 2026-08-27). Distance is to the nearest path VERTEX
  // (~37 m spacing); worst healthy gate today reads 19.7 m, the bug 182.8 m —
  // 60 m splits them with 3x margin each way.
  for (const [id, a] of Object.entries(manifest.routes)) {
    assert(!!a.path && a.path.length >= 2, `${id}: asset has no drawable path`);
    for (const g of a.gates) {
      let best = Infinity;
      for (const [lat, lon] of a.path!) {
        const dm = Math.hypot(
          (lat - g.lat) * 111320,
          (lon - g.lon) * 111320 * Math.cos((g.lat * Math.PI) / 180));
        if (dm < best) best = dm;
      }
      assert(best < 60, `${id}/${g.name}: drawn path misses the gate by ${best.toFixed(1)} m`);
    }
  }
});
```

Then run the suite. Predicted result: `252 tests: 248 pass, 1 fail, 3 skip`, the
single FAIL being this new test with message
`EveningA/START: drawn path misses the gate by 182.8 m`. Any other failure, or a
different distance (±0.5 m tolerance on the printed value): STOP and report.

## Part A — rebuild script `data/analysis/11_rebuild_eveninga_asset_path.py` (new file)

Create the file with EXACTLY this content, then run it once
(`cd "$HOME/mnt/Qualifire" && python3 data/analysis/11_rebuild_eveninga_asset_path.py`):

```python
"""One-shot data fix (cycle 025): EveningA's drawn map line.

routes.json's EveningA entry was built by 08_build_route_assets.py's pick()
("most recent A-variant ride" = 20260813-1618-work2home-19726172105.gpx),
whose first ~700 m took a different street: up to 218 m off the
parity-anchored EveningA reference the engine times against, and 183 m off
the START gate. The live map drew that line (RECORD armed preview + running
map) while sector timing — which reads tests/fixtures/refs.json, never this
file — stayed correct (Nathan, 2026-08-27). Rebuilds ONLY EveningA's `path`,
`gateIdx`, `sourceRide` from the PARITY.md medoid ride, with script 08's
exact decimation (stride-2 GPX parse, every 3rd point, 5-dp rounding) and
nearest-vertex gate indexing. Gates, the Web-Mercator transform and
EveningA.png are untouched (the PNG fallback rung keeps its baked — still
stale — line; flagged in the cycle record). demos/routes-data.js (3-route
preview mirror) receives the identical entry.

Run: python3 data/analysis/11_rebuild_eveninga_asset_path.py   (idempotent)
"""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
J = lambda *p: os.path.join(ROOT, *p)

# PARITY_REFS.EveningA in app/tests/build_fixtures.ts — keep in sync.
MEDOID = '20260724-1838-work2home-19448004625.gpx'

txt = open(J('data', 'activities', MEDOID), encoding='utf-8').read()
pts = [(float(a), float(b))
       for a, b in re.findall(r'<trkpt lat="([-\d.]+)" lon="([-\d.]+)"', txt)][::2]
path = [[round(a, 5), round(b, 5)] for a, b in pts[::3]]

def nearest_idx(poly, lat, lon):  # same maths as 08_build_route_assets.py
    best, bi = 1e18, 0
    for i, (a, b) in enumerate(poly):
        d = (a - lat) ** 2 + (b - lon) ** 2
        if d < best:
            best, bi = d, i
    return bi

def patch(routes):
    e = routes['EveningA']
    e['path'] = path
    e['gateIdx'] = [nearest_idx(path, g['lat'], g['lon']) for g in e['gates']]
    e['sourceRide'] = MEDOID + ' (parity medoid; map-line fix 2026-08-27)'
    return e['gateIdx']

jp = J('app', 'assets', 'routes', 'routes.json')
bundle = json.load(open(jp, encoding='utf-8'))
gate_idx = patch(bundle['routes'])
with open(jp, 'w', encoding='utf-8') as f:
    json.dump(bundle, f, indent=1)
    f.write('\n')

HEAD = ('// GENERATED by data/analysis/08_build_route_assets.py — do not edit.\n'
        'window.ROUTES_JSON = ')
dp = J('demos', 'routes-data.js')
js = open(dp, encoding='utf-8').read()
assert js.startswith(HEAD), 'routes-data.js header changed — stop, report'
mirror = json.loads(js[len(HEAD):].rstrip().rstrip(';'))
patch(mirror['routes'])
with open(dp, 'w', encoding='utf-8') as f:
    f.write(HEAD)
    json.dump(mirror, f, indent=1)
    f.write(';\n')

print(f'EveningA rebuilt from {MEDOID}: {len(path)} path points, gateIdx {gate_idx}')
```

Predicted output line:
`EveningA rebuilt from 20260724-1838-work2home-19448004625.gpx: 149 path points, gateIdx [7, 42, 79, 106, 143]`
— any other point count or gateIdx: STOP and report.

Then run the suite again. Predicted: `252 tests: 249 pass, 0 fail, 3 skip`.

## Part C — pin the medoid in `data/analysis/08_build_route_assets.py` (edit only, never run)

Anchor (exists once):

```
ROUTES = {'Morning': pick('home2work', 'main'),
          'EveningA': pick('work2home', 'A'),
          'EveningB': pick('work2home', 'B')}
```

Replace with:

```python
ROUTES = {'Morning': pick('home2work', 'main'),
          # EveningA is PINNED to the PARITY.md medoid, not pick()'s most-recent:
          # the most-recent A ride (20260813-1618) strays up to 218 m from the
          # engine's reference over its first ~700 m and misses the START gate
          # by ~183 m — the cycle-025 wrong-map-line bug. Keep in sync with
          # PARITY_REFS.EveningA in app/tests/build_fixtures.ts and with
          # 11_rebuild_eveninga_asset_path.py.
          'EveningA': '20260724-1838-work2home-19448004625.gpx',
          'EveningB': pick('work2home', 'B')}
```

## Must-not-change list (byte-identical at the end of your pass)

- `routes.json` → EveningA's `image`, `w`, `h`, `x0`, `y1`, `scale`, `offx`, `offy`,
  `gates` (all five, including px/py) — and every OTHER route's entire entry.
- `app/assets/routes/EveningA.png` (and every other PNG/asset file).
- `app/tests/fixtures/refs.json`, `app/src/store/catalog.seed.json`,
  everything under `app/core/`, `app/src/live/`, `app/src/ui/` (no UI code changes
  in this pass), `demos/mockup.html` (no visual design changed — repo rule 6 not
  triggered), `design/`.

## Verification (run all; all must hold)

1. `cd app && node --experimental-strip-types tests/run.ts` → `252 tests: 249 pass, 0 fail, 3 skip`.
2. `cd app && npx tsc --noEmit` → clean (~17 s; set timeout_ms near 45000).
3. `git diff --stat` lists EXACTLY four changed files: `app/assets/routes/routes.json`,
   `demos/routes-data.js`, `app/tests/routemap_suite.ts`,
   `data/analysis/08_build_route_assets.py` — plus the new untracked
   `data/analysis/11_rebuild_eveninga_asset_path.py` and this brief.
4. `git diff app/assets/routes/routes.json | grep -c '^[+-]'` — every changed line
   sits inside the `"EveningA"` block (spot-check with
   `git diff app/assets/routes/routes.json | grep '^[+-]' | grep -v 'path\|gateIdx\|sourceRide\|^[+-][^"]*$' | head`
   → empty).
5. Re-run `python3 data/analysis/11_rebuild_eveninga_asset_path.py` once more →
   same output line, and `git diff --stat` unchanged (idempotence).

## Include these findings in your report (informational — no code action)

- The PNG fallback rung (`PngRouteMap`, used only when the MapLibre native module
  is absent) still shows the old baked line inside `EveningA.png`; regenerating it
  needs the basemap crops re-captured via `demos/basemap-capture.html` on Nathan's
  machine. Deliberately left stale.
- `08_build_route_assets.py`, if ever re-run as-is, would truncate the 20-route
  `routes.json` back to 3 routes (its `manifest` only covers Morning/EveningA/
  EveningB) — pre-existing landmine, out of scope, flagged for the backlog.
- `demos/routes-data.js` was already stale (3 routes vs 20) before this pass;
  its EveningA entry is now correct but the missing 17 routes remain missing.
