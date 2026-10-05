# 01 — ACTIVITIES ride detail: ONE yellow line = the reference; the raw ridden trail is drawn only when there is no reference

**Source: Nathan, 2026-10-05 (README "Decisions from Nathan (2026-10-05)" item 1).** On the ACTIVITIES
ride-detail map the whole yellow line is two lines that mostly overlap and part at bends and the
roundabout (D6: the smoothed REFERENCE line and the raw 5 m-decimated RIDDEN TRAIL, both drawn in the
same yellow). Decision: one yellow line, the reference (it carries the sector colours and the gates and
is what ROUTES shows). A ride with NO reference has nothing else to show and keeps its ridden trail.
Written by the Plan tier (Fable) after reading the code on 2026-10-05; every anchor below was
re-verified against the current tree (D1/D6 digests are not trusted blindly). Nothing is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.
Never rule yourself.

**Run order:** 01 -> 02 -> 03. This brief has no dependency on 02/03 and they do not depend on it, but
all three edit `app/src/ui/RideDetailScreen.tsx` and `app/tests/recordflow_suite.ts`, so run them one
after the other, never in parallel, and re-check anchors by content.

## 0. What the code does today (read, do not change yet)

- `app/src/ui/RideDetailScreen.tsx` renders FOUR cards, each with its own `<WayMapView variant="browse"
  ... />` (line numbers = current tree):
  1. `model.kind === 'route'` card (~484-536): `wayId={model.wayId}` (the matched way — a route-kind
     ride always has `res.wayId`, rideDetailModel.ts:108-114), `sectorColours={s.sectorColours ?
     model.sectorColours : ALL_YELLOW}`, `leadColour={s.sectorColours ? colors.grey : undefined}`,
     **`trail={fixes ?? undefined}`** (~510). This is the ONLY card with a reference line.
  2. `model.referenceOf !== null` card (~537-561, "founded a way but its own result never matched"):
     `wayId={null}`, `trail={fixes ?? undefined}` (~558).
  3. `model.kind === 'free'` card (~562-580): `wayId={null}`, `trail={fixes ?? undefined}` (~577).
  4. fallback card (~581-600, unmatched / pre-GPX+): `wayId={null}`, `trail={fixes ?? undefined}` (~597).
- `fixes` state (~128) is filled by the effect at ~165-183 ("The true ridden trace: the raw fixes,
  decimated through WP-J's own min-distance rule"): `readRideFixes(request.rideId, createExpoFsAdapter())`
  then `appendTrailPoint` per fix (5 m decimation), deps `[request.rideId]`. It runs for every ride,
  including route-kind rides where (after this brief) nothing consumes it.
- `app/src/ui/wayMapView.tsx` (MapLibre rung) paints, in mount order: `ride-trace` (:700, blue width 2,
  ReplayScreen only), `route` (:710, grey CASING width 7 + `colors.neutral` core width 4 = the
  reference line, `wayFC ?? EMPTY_FC`), `trail` (:724, SAME casing+core style and widths as route,
  `trailFC` = `trailLineFeature(props.trail)` :530-534, always mounted, empty when `props.trail` is
  empty/undefined), `sector-spans` (:774, `sectorSpansFC ?? EMPTY_FC`, built at :603-605 from
  `asset && props.sectorColours`), `place`, `gate-ticks`, `gate-selected`, `selfs`, `rider`. So on the
  route card the yellow doubling is exactly layers `route` + `trail`; `sector-spans` paints over both.
- Early return (:572-577): `riderOnly = !asset; if (riderOnly && !showRider && !hasTrail && !place)
  return null;` — a browse map with no asset and no trail renders nothing. For the route card the asset
  is `assetFor(model.wayId)` (wayAssetRuntime.ts `resolveWayAsset` :113-130: bundled manifest, else the
  way's ref line + gate set); a way whose results exist always has both (deleting a way removes its
  results first, catalogDeleteActions.ts:39-40), so the route card keeps a map after the trail goes.
- The PNG rung (~960+) has no trail at all (doc comment :51-57: "the PNG rung has no equivalent").
- ReplayScreen.tsx:232-246 (the separate Replay button) draws the reference + sector spans + the ride as
  the BLUE `rideTrace` (width 2, a different colour and purpose: the ride being replayed). Not touched —
  see decisions.
- `sectorColours` / `ALL_YELLOW` / `leadColour`: the toggle wiring on the route card (~504-509 comment +
  props) is NOT changed by this brief.

## Scope / non-scope

IN: `app/src/ui/RideDetailScreen.tsx` (route card `trail` prop, the fixes effect, two comments),
`app/tests/recordflow_suite.ts` (one new source test).
OUT: `wayMapView.tsx` (no layer, prop or style change — the `trail` source stays always-mounted and
simply receives no points from the route card), `ReplayScreen.tsx`, `CatalogDetailScreen.tsx`,
`rideDetailModel.ts`, `trailModel.ts`, sector colours / `ALL_YELLOW` / `leadColour`, `core/`, storage,
ui-strings.allow.json (no rider-facing string changes).

## Target invariants

1. The route card's `<WayMapView>` has NO `trail` prop: its map = reference line (`route` layer) +
   `sector-spans` (toggle-gated exactly as today) + gate ticks. One yellow line.
2. The other three cards keep `trail={fixes ?? undefined}` unchanged: a ride with no reference still
   shows its ridden trail (free ride, unmatched ride, way's-own-reference-founder card, and the
   interrupted rides virgin-cycle21 04 files as free).
3. The fixes file is not read for a route-kind ride (no dead I/O): the effect returns early with
   `setFixes(null)` when `model.kind === 'route'`, and re-runs when `model.kind` changes (a ride that
   becomes a route via the naming card drops its trail; `onUnsaveFree` free -> none re-reads it).
4. Toggle behaviour unchanged: `s.sectorColours ? model.sectorColours : ALL_YELLOW` and
   `leadColour={s.sectorColours ? colors.grey : undefined}` are byte-identical before and after.

## Steps (anchors by quoted content; line numbers are current-tree approximations)

**Pre-flight.** `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git status --short` (expect the
cycle 20/21 files modified + untracked, uncommitted; record it). Baseline: `cd app && node
--experimental-strip-types tests/run.ts` -> expect **848 tests / 845 pass / 0 fail / 3 skip** (~22 s);
`cd app && ./node_modules/.bin/tsc --noEmit` -> exit 0 (~35 s). Run both in the FOREGROUND with
`timeout_ms: 180000` — a `&` background job does not survive the end of a device_bash call on this
mount (measured 2026-10-05: the output file stays empty). If the baseline differs, record it and
continue only if 0 fail and tsc exit 0 (deltas below are relative).

**Step 1 — test first (failed-before).** Append to `app/tests/recordflow_suite.ts` (after the last
`test(` in the file; `fs`, `path`, `TESTS_DIR`, `assert`, `test` are already imported there):
```ts
test('virgin-cycle22 01: the ACTIVITIES route card draws one yellow line (the reference) — the raw trail only on cards with no reference', () => {
  // Nathan 2026-10-05: the ridden trail (same casing+core style as the reference) doubled the
  // reference line at bends; the reference carries sectors and gates and is what ROUTES shows.
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RideDetailScreen.tsx'), 'utf8');
  const maps = src.split('<WayMapView').slice(1).map((chunk) => chunk.slice(0, chunk.indexOf('/>')));
  assert(maps.length === 4, `RideDetailScreen mounts 4 WayMapViews, found ${maps.length}`);
  const routeCard = maps.filter((m) => m.includes('sectorColours='));
  assert(routeCard.length === 1, `exactly one WayMapView carries sectorColours (the route card), found ${routeCard.length}`);
  assert(!routeCard[0].includes('trail='), 'the route card must not pass a trail (one yellow line = the reference)');
  assert(routeCard[0].includes('wayId={model.wayId}'), 'the route card draws the matched way');
  const noRef = maps.filter((m) => !m.includes('sectorColours='));
  assert(noRef.length === 3 && noRef.every((m) => m.includes('trail={fixes ?? undefined}') && m.includes('wayId={null}')),
    'the three no-reference cards keep the ridden trail');
  assert(/if \(model\.kind === 'route'\) \{\s*setFixes\(null\);\s*return;\s*\}/.test(src),
    'the fixes effect skips the read for a route-kind ride');
});
```
Run `node --experimental-strip-types tests/run.ts`: this test must FAIL on the current tree (the route
card still has `trail=`, and the effect has no route guard) — record the failure line; everything else
still passes (848 -> 849 tests, 1 fail).

**Step 2 — `RideDetailScreen.tsx`, route card.** In the `model.kind === 'route'` card's `<WayMapView`
(the one with `sectorColours={s.sectorColours ? model.sectorColours : ALL_YELLOW}`), delete the line
`trail={fixes ?? undefined}` (~510). Replace the comment block above `sectorColours` (~504-507,
"// WP-K: gated by the settings toggle, same two-line pattern as ...") with:
```
              // WP-K: gated by the settings toggle, same two-line pattern as
              // RecordScreen and the RIDES row — ALL_YELLOW (truthy, all-null)
              // when off, no leadColour when off (pixel-identical to a map
              // with no sectorColours prop at all — sectorTrailModel.ts).
              // virgin-cycle22 01 (Nathan 2026-10-05): no `trail` here — the
              // reference line IS this ride's line (sectors, gates, what ROUTES
              // shows); the raw ridden trail doubled it at every bend. The
              // trail is drawn only by the cards below, which have no reference.
```
Do not touch `sectorColours=` / `leadColour=` or any other prop. The other three `<WayMapView>` blocks
(`wayId={null}` ... `trail={fixes ?? undefined}`) stay exactly as they are.

**Step 3 — `RideDetailScreen.tsx`, the fixes effect (~165-183).** Replace the comment and add the guard:
```ts
  // The true ridden trace: the raw fixes, decimated through WP-J's own
  // min-distance rule rather than pushing every raw fix into the map.
  // virgin-cycle22 01: only for a ride with NO reference (the three cards
  // below the route card) — the route card draws the reference alone, so
  // the file is not read for it. Re-runs when the kind changes (naming card
  // makes a route; "Not a free activity" makes a plain ride again).
  useEffect(() => {
    if (model.kind === 'route') {
      setFixes(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const raw = await readRideFixes(request.rideId, createExpoFsAdapter());
      ...unchanged body...
    })();
    return () => {
      cancelled = true;
    };
  }, [request.rideId, model.kind]);
```
`model` is declared AFTER this effect today (`const model = useMemo(...)` ~185). Hooks may not reference
a later `const` — MOVE the effect so it sits immediately AFTER the `model` useMemo block (after `[request.rideId,
request.startedAtMs, tick],\n  );` ~197) and BEFORE `const replayWayId = ...` (~199). Moving a hook
changes hook order but every hook here is unconditional, so React is fine; keep the other effects where
they are. If the file's structure around ~185-199 does not match this description, STOP.

**Step 4 — verify no dead code.** `grep -n "fixes\|appendTrailPoint\|TrailPoint" app/src/ui/RideDetailScreen.tsx`:
expect `fixes` state + effect + three `trail={fixes ?? undefined}` uses; `appendTrailPoint`/`TrailPoint`
imports still used by the effect. Nothing to remove.

**Step 5 — run everything.** Tests: 849 tests / 846 pass / 0 fail / 3 skip (delta +1 vs baseline). tsc
exit 0. `git diff --stat` must list exactly `app/src/ui/RideDetailScreen.tsx` and
`app/tests/recordflow_suite.ts` beyond the pre-existing cycle 20/21 modifications (compare with the
pre-flight `git status`).

## Failed-before procedure (never git stash)
Step 1 already gives failed-before for the source test. If you need to re-prove it later: `cp
app/src/ui/RideDetailScreen.tsx safe_to_delete/RideDetailScreen.c22-01.bak`, re-add the old `trail=`
line by hand, run the suite (1 FAIL), then `cp safe_to_delete/RideDetailScreen.c22-01.bak
app/src/ui/RideDetailScreen.tsx && cmp` the two. Never `git stash`/`checkout`/`reset`.

## Verification (the inspector reruns all of it)
- `cd app && node --experimental-strip-types tests/run.ts` -> 0 FAIL, counts reported before/after.
- `cd app && ./node_modules/.bin/tsc --noEmit` -> exit 0.
- `grep -n "trail=" app/src/ui/RideDetailScreen.tsx` -> exactly 3 hits, none inside the route card.
- `grep -n "sectorColours=\|leadColour=" app/src/ui/RideDetailScreen.tsx` -> unchanged two lines.
- `git diff app/src/ui/wayMapView.tsx` -> no hunks from this brief (the file keeps its cycle 21 03 diff only).

## What changes on the phone / what does not
Changes (after OTA publish, COMMANDS.md): ACTIVITIES > a ride on a way shows ONE yellow line (the
way's reference) with its gate ticks; sector colours (when the setting is on) paint on it exactly as
before; the roundabout is circled as many times as the reference does (2x on the bus ride), no
doubling at bends. Opening such a ride no longer reads the fixes file (slightly faster).
Does NOT change: ROUTES tab maps; the Replay screen (still the blue ride trace over the reference);
free / unmatched / founder-card rides (still your trail); the Settings "Sector colours" toggle; map
tiles, zoom, gates; any stored data; any text.

## Out of scope (do not do)
- Making the trail visibly distinct (D6 option C) or distance-based smoothing (D6 D / item 4: Nathan: no change).
- Any `wayMapView.tsx` edit, any `ReplayScreen.tsx` edit, any rideDetailModel change.
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs.

## Decisions taken by the Plan tier (logged, not asked)
1. ReplayScreen keeps `rideTrace` (blue, width 2): it is a different colour and purpose (the ride being
   replayed over its reference), not the yellow-on-yellow doubling Nathan described. Nathan can ask for
   it to go in a later cycle.
2. The reference-founder card (`model.referenceOf !== null`, kind !== 'route') keeps the trail, although
   the way it founded has a reference: its `wayId={null}` today (its own result never matched), so the
   trail is the only line it can show. Drawing the founded way's line there is a separate change.
3. The fixes read is gated on `model.kind === 'route'` (not deleted): three cards still need it. The
   effect moves below the `model` useMemo to reference it.
4. Test = source test on RideDetailScreen.tsx (the screen is `.tsx`/JSX and cannot be loaded headless;
   the same pattern as cycle 21 03's wayMapView test). No model change was needed, so no model test.
5. No `wayMapView.tsx` change: the `trail` source is already always-mounted with an empty collection
   when no points are passed, so dropping the prop draws nothing and changes no layer order.
