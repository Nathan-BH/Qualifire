# Open items — virgin-cycle26 (2026-10-08)

Executed uncommitted, NOT published. Final Opus inspect: PASS WITH NOTES (inspect-report-final.md, device checklist in its section 8).


- `[UNVERIFIED]` parity: `projectRideOffline` anchor and global re-acquisition use `passVertex` (virgin-cycle26 brief 02); identical for single-pass references by construction; archive parity not re-measurable on `virgin`.
- Replace `OPEN-ITEMS.md:248-251` ("Overlapping gate hit-areas…") with: "**Gates on retraced ground (virgin-cycle26).** Seeding slides sector gates ≥ 60 m (chainage) off retraced ground when the ±250 m window allows (`seedGateChainages` 3rd argument, `overlapChainages`); the editor's map tap cycles through stacked gates (`nextGateOnTap`); the live/DEMO/REPLAY map draws the pass the rider is not on at 0.3 opacity until it is within 240 m. Still open: START and FINISH on a pure out-and-back always share a spot; a tour folding back within 240 m of chainage is ambiguous inside the projection window."
- New: "A second loop Route on one place (merge-made, `loop:merged:…`) is not reachable from RECORD's `loop` pill; its ways stay visible in MAP/catalog."
- New (D13 amended): "Loop titles: `routeTitle` covers every route name except the three delete-confirmation dialogs in `catalogDeleteActions.ts` (`Delete the route {…} → {…}?` etc.), which still print `Home → Home` for a loop because their allow-list templates would change (3 entries). One-line follow-up when Nathan wants it: build the dialog text from `routeTitle` and rewrite those three entries."
- `OPEN-ITEMS.md:52` checklist line can be ticked once Nathan has seen the cycling tap on device.


- Pass pick (briefs 02/05/06): first-fix anchor takes the earliest pass anywhere inside the 40 m corridor (START pick is the reference, cycle21); re-acquisition takes the pass nearest the last chainage among those within 15 m of the nearest distance (PASS_AMBIGUITY_M), both capped at the caller's corridor. Still open: (1) two passes within 15 m in distance AND < 240 m apart in chainage stay ambiguous; (2) on a 20-25 m wide road a RE-ACQUISITION fix >= (D+15)/2 m toward the far side lands on the return copy; (3) a loop whose closing vertex is > 40 m from its opening one anchors at the end when started from the closing point.

## Final-inspect minors (non-blocking)
- N1: wayMapView.tsx:604 builds the O(n^2) pass model on every map mount (7-39 ms desktop); only build when progressM is set.
- N2: WorkStationA and ChurchFosh cross themselves near the end, so 70 m / 160 m of each draws faint at ride start. Rule working as designed; Nathan to decide if he likes it.
- N3: pathCumulativeM uses 111320 m/deg latitude, engine 110540; map metres drift 0.3-0.6%.
- N4-N6: removing the FADE_NEAR_M clause, reverting routeFromRide.ts:118/:241 to 2-arg seeding, and dropping nearS at live re-acq all pass every test; add tests if wanted.

## Nathan's open questions (defaults in force)
- Q1 DEMO fixture with a retraced street (default: no). Q2 fade numbers 0.3 / 240 m judged on device. Q3 pill word stays 'loop'.
