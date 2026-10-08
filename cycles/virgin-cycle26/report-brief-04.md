# Report brief 04 (map pass display) - STATUS: DONE (after Fable ruling in RULINGS.md, brief 04 amended)

Ruling applied: waymap_suite.ts:435 assertion replaced with the regex form `!/['"]line-(dasharray|gradient)['"]/.test(src)`. Re-run: tsc exit 0; suite 954 tests / 951 pass / 0 fail / 3 skip; `git diff -- wayMapView.tsx | grep -c "^[+-].*GeoJSONSource"` = 0; one progressM line per Record/Demo/Replay screen; ui-strings.allow.json untouched by brief 04. The wiring assertions after the dasharray one now pass. The STOPPED section below is history.


All source edits of 4.1-4.5 and all 6 tests of 4.6 are applied (uncommitted). tsc --noEmit: exit 0 (log: 06-brief-04-tsc.log).
Suite: baseline 948 tests / 945 pass / 0 fail / 3 skip; now 954 tests: 950 pass, 1 FAIL, 3 skip.

## STOPPED (verbatim)
FAIL virgin-cycle26 04: wayMapView draws the pass the rider is not on ... - no dasharray / gradient (2026-08-24 device bug class)
Cause: the brief's waymap_suite assertion `!src.includes('line-dasharray') && !src.includes('line-gradient')` scans the whole file,
but wayMapView.tsx ALREADY contains both strings in pre-existing comments (HEAD has 3 matches):
 :584 "...paint the 'ahead' segment with a MapLibre line-dasharray. On-device"
 :866-867 "...NO line-dasharray (the 2026-08-24 device-only dasharray bug class) and no line-gradient."
No code uses them. The test as written can never pass; fixing it (e.g. scan only `'line-dasharray'` quoted, or strip comments) is a call for Fable, not me.
Everything else in the new test passes up to that assertion; the later assertions (RecordScreen/DemoScreen/ReplayScreen wiring) were therefore NOT reached - re-verify after the fix.

## Files / hunks (brief 04 only)
- app/src/ui/wayMapMath.ts: +2 functions appended (1 hunk)
- app/src/ui/gateAdjustModel.ts: +nextGateOnTap appended (1)
- app/src/ui/wayMapGeo.ts: import (1), GateProperties.faint (1), gateTicks signature+faint line (2), SectorSpanProperties.faint (1), spans signature+faint line (2), appended block (1) = 8
- app/src/ui/wayMapView.tsx: imports (2), prop (1), hook block (1), faintGates+2 builder calls (2), 5 paint edits (route-casing, route-core, sector-spans-core, gate-ticks-casing, gate-ticks), tap handler (1). GeoJSONSource diff lines: 0.
- RecordScreen.tsx +1 line, DemoScreen.tsx +2 (import, prop), ReplayScreen.tsx +1.
- Tests: waymapgeo_suite.ts imports + 4 tests; waymap_suite.ts 1 test; gateseeding_suite.ts import + 1 test (appended after brief 03's block). ui-strings.allow.json: not touched by me.

## BEFORE / AFTER
BEFORE (tests only): suite crashed at import: `SyntaxError: The requested module '../src/ui/wayMapGeo.ts' does not provide an export named 'FADE_NEAR_M'`.
After geo/math/model edits: 954 tests, 4 fail (waymap pin + 3 CORRIDOR_M import mistakes from my first half-applied patch, fixed) -> then only the waymap pin failed ("progressM prop") = predicted.
AFTER: 950 pass, 1 fail (the dasharray assertion above). The 4 waymapgeo tests and nextGateOnTap test PASS.

## Deviations (minor, anchors disambiguated, not guesses)
- `: { name: g.name };` occurs twice in wayMapGeo.ts (gatesFeatureCollection :78 and gateTicks :367); edited only the gateTicks one (brief's :361-365 anchor).
- `paint={{ 'line-color': CASING, 'line-width': 7 }}` / colors.neutral width 4 also occur in the `trail-casing`/`trail-core` layers; edited only the route-* ones (matched with the layer id).
- `wayLineFeature` import removed from wayMapView.tsx (now unused), as the brief allows.

## Escalation for Fable
Rule on the dasharray/gradient assertion in the waymap_suite test (wayMapView.tsx has the words in comments at :584 and :866-867). Not fixed by me.
Also remind: OPEN-ITEMS text from 05-plan.md section 8 to be handed over once resolved; fade only visible on device on a retraced route / REPLAY (plan Q1). Inspect points: Rules-of-Hooks order of the 3 useMemos, progressKey 10 m quantisation.
