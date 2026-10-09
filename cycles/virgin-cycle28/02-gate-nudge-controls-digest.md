# Gate nudge controls: digest

> **Clarification (Nathan, 2026-10-09):** scope is relabel/restyle only. Behaviour, step sizes and clamps stay as they are today.

Date: 2026-10-09
Scope: the gate-adjust screen and card (save-flow and ROUTES full-screen editor) in app/src/ui, its model, persistence, tests, and rider strings. Read-only. No design proposals. Line numbers are as read on 2026-10-09. "(inferred)" marks anything not directly read.

## TL;DR
1. The percent pad is four buttons in gateAdjustCard.tsx:185-190: "−1%" and "+1%" (big), "−0.1%" and "+0.1%" (small). Each is a fixed fraction of the route's reference length.
2. "Percent" = percent of the reference line's length. A nudge is pct × refLengthM metres (gateAdjustModel.ts:17-19). A 4000 m route gives 40 m and 4 m steps.
3. Clamps are MIN_GATE_GAP_M = 50 m from neighbours, with START clamped to 0 and FINISH to refLengthM (gateAdjustModel.ts:23, 52-63). Only metres are persisted; no percent is saved.
4. Percent also appears in the readout ("37.2 %", gateAdjustCard.tsx:183) and in gate seeding (1%/99%, 25/50/75%). Seeding is not a UI control.
5. No generic stepper component exists. Only the zoom +/- pairs (wayMapView.tsx:1007-1011, catalogMapView.tsx:341-345) are similar.
6. Tests pin clampNudge and fmtPct, not the button labels. The labels are not in ui-strings.allow.json.

## 1. Screen and controls
- Screen: app/src/ui/GateAdjustScreen.tsx:31 (full-screen ROUTES editor). Mounts GateAdjustCard at :112-125 with subtitle "Tap a gate to move it" and discardLabel "discard nudges".
- Save: onSave -> confirmEditGates (:55-68, Alert) -> onEditGates (:70-100) -> editWayGates. On success it calls tabNav.closeGateAdjust() (:94).
- Card: app/src/ui/gateAdjustCard.tsx.
  - Constants: REPEAT_MS = 120 (:66), LONG_PRESS_MS = 350 (:67).
  - Step sizes: smallM = nudgeDeltaM(NUDGE_SMALL_PCT, refLengthM) (:85), largeM = nudgeDeltaM(NUDGE_LARGE_PCT, refLengthM) (:86).
  - nudge(deltaM) (:88-95): acts only if a gate is selected; uses clampNudge on the functional state update.
  - pad(label, deltaM, size) (:120-138): onPress = nudge(deltaM) (:125); onLongPress = startRepeat (:126); delayLongPress = 350 ms; onPressOut = stop; disabled while busy.
  - Pad row (:185-190): pad('−1%', -largeM, 'big'), pad('−0.1%', -smallM, 'small'), pad('+0.1%', smallM, 'small'), pad('+1%', largeM, 'big').
  - Shown only when a gate is selected (:180-192). Otherwise the hint at :193 reads "tap a gate on the map or below to nudge it".
  - Selection: map tap via gateSelect (:156) or chip row (:163-175). Chips show gateName (START / G1 / FINISH).
  - Styles: padBtnBig flex 1.25 (:30), padBtnSmall flex 0.75 (:31), padTextBig 17 pt (:32), padTextSmall 13 pt (:33). Long-press-repeat is ~8 steps/s for the big buttons (comment :66).
- Map placement: gates are re-placed on every change via buildRuntimeWayAsset(refLine, chainageM, 'gate-card') (:79-82).
- Inline hosts that mount the same card: RecordScreen.tsx:1335, RideDetailScreen.tsx:617, DemoScreen.tsx:727.

## 2. What "percent" means
- Basis: refLengthM, the length of the reference line (draft.refLengthM from GateAdjustScreen.tsx:116). Gate positions are chainage in metres along that line.
- Conversion: nudgeDeltaM(pct, refLengthM) = pct × refLengthM (gateAdjustModel.ts:17-19). NUDGE_SMALL_PCT = 0.001, NUDGE_LARGE_PCT = 0.01 (:12-13).
- Example (read from tests): 1% of 4000 m = 40 m; 0.1% = 4 m (tests/gateseeding_suite.ts:78-79). Inferred: a 10 km route gives 100 m and 10 m.
- The pre-WP-I steps were fixed 10 m and 50 m. Header comment at gateAdjustModel.ts:7-11 says the change was made on 2026-09-04 (WP-I, Q2).
- Clamp (clampNudge, gateAdjustModel.ts:52-63):
  - lo = 0 for START, else chainage[i-1] + 50.
  - hi = refLengthM for FINISH, else min(chainage[i+1] − 50, refLengthM).
  - Result = clamp(chainage[i] + deltaM, lo, hi). MIN_GATE_GAP_M = 50 (:23).
  - isAdjustable needs at least 2 gates (:37-39). All gates, START and FINISH included, are adjustable (comment :25-31).
- Readout: fmtPct(chainageM, refLengthM) (gateAdjustModel.ts:77-80) returns `${(c/ref*100).toFixed(1)} %` (note the space before %), or "— %" if refLengthM <= 0. Rendered at gateAdjustCard.tsx:183.
- Persistence:
  - Save path A (save-flow, RecordScreen / RideDetailScreen): saveAdjustedGates (store/routeFromRide.ts:303-) adds a gate set with version 2, origin 'geometric', and chainageM in metres.
  - Save path B (ROUTES editor): editWayGates (store/routeFromRide.ts:477-) checks length equality, 0 <= c <= ref.length, and strictly increasing values (:14-22). It writes version current+1, chainageM copied in metres, and a note that says "tap-then-nudge".
  - No percent value is written to the store (inferred: no percent field in either call).

## 3. Other percent occurrences
- Seeding (not UI): gateSeeding.ts:4 places gates at 25/50/75% of route distance and START/FINISH at 1%/99%. routeCreation.ts:11, 13, 380, 404 repeat this. Tests: tests/routecreation_suite.ts:14, 185, 219.
- Design mock: design/make_screens.py:2683 pad_items = [("−1%", 1.25), ("−0.1%", 0.75), ("+0.1%", 0.75), ("+1%", 1.25)] with the same weights as the code. design/canonical/gate_adjust_day.svg:63, 67 and gate_adjust_night.svg:63, 67 hold text ids content_pad_2_label / content_pad_3_label (label content not read).
- Code comments: gateAdjustCard.tsx:4 (header shows "−1% −0.1% │ 1 842 m │ +0.1% +1%"), :66 (rate in %/s); gateAdjustModel.ts:8-10 ("±1% of the ride").
- Other percent UI (unrelated): DemoScreen.tsx:689-691 and ReplayScreen.tsx:259-261 use progress-bar widths.
- Docs at repo root (README, STATE, OPEN-ITEMS, HOW-THE-APP-IS-BUILT, GLOSSARY): no hits for the nudge percents.

## 4. Tests and rider strings
Tests:
- tests/gateseeding_suite.ts:46-51 clampNudge with literal metre deltas (+50, −10, clamps to 50 m gap).
- :59-63 START and FINISH clamps.
- :66-74 gateName, fmtChainage, fmtPct ('37.2 %', '0.0 %').
- :77-79 nudgeDeltaM (1% of 4000 = 40 m; 0.1% = 4 m).
- tests/recordflow_suite.ts:314-318 checks GateAdjustScreen.tsx has "Tap a gate to move it" and discardLabel="discard nudges", and lacks "nudge it". The card must contain 'Tap a gate to move it'.
- tests/recordflow_suite.ts:332, 387 include gateAdjustCard.tsx in em-dash and WayMapView-bleed checks.
- No test references the pad labels "−1%", "+1%", "−0.1%", "+0.1%".

Rider strings in tests/ui-strings.allow.json (gate-related):
- GateAdjustScreen.tsx: "Tap a gate to move it" (:582-585), "discard nudges" (:612-615), "EDIT GATES" (:644), "‹ BACK" (:652), "Cancel" (:628), "Save & re-time" (:636), "Could not save the gates" (:554), "Gates saved — reference not re-timed" (:562), alert bodies at :534, :546, :590-609 (one flagged long: true at :596 and :609).
- Title alert "Move the gates of \"{…}\"?" (:574).
- "discard nudges" also at :1573. "tap a gate on the map or below to nudge it" at :1589 (42 characters; its long flag was not checked).
- Not found in the allow-list: "−1%", "−0.1%", "+0.1%", "+1%", and the readout (template, not a literal). Whether run.ts scans these JSX arguments is not verified.
- Budget rules (CLAUDE.md item 9): any string over 40 characters needs long: true; alert bodies max 20 words; no em dashes; warnings go to a sub-label, not a banner. Relevant to any new label text.

## 5. Reusable +/- controls
- No generic Stepper, Counter, or NumberInput component exists in app/src (grep).
- Zoom +/- pairs: wayMapView.tsx:1007 and :1011 (+ and −), catalogMapView.tsx:341 and :345. Local styles (st.zoomText), not shared.
- Add-spec "+": routeNamingCard.tsx:349.
- The pad itself (padBtn / padBtnBig / padBtnSmall, gateAdjustCard.tsx:120-138, stylesheet padBtn* entries at about :216-228 (inferred from grep offsets)) is local to the card. It already handles hold-to-repeat, so any "++/--" or big/small variant would mostly change the pad() calls and the label strings, not the handler logic (inferred).
