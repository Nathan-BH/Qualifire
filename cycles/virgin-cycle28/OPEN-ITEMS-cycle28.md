# OPEN-ITEMS cycle28 (2026-10-09)

State: briefs 01-02, 03, 04 executed (Sonnet) and inspected (Opus, PASS-WITH-NOTES). Fable not used. Uncommitted in the working tree. 980 tests / 0 fail, tsc exit 0. Static checks only: nothing seen on a phone yet.

## Needs Nathan
- "new" pill memory: "new" is remembered per from/to pair, so tap new, change GOING TO, come back, and it is lit again without a tap (also after GPS start drift). Fix is one line in pickFrom/pickTo (RecordScreen.tsx ~:284/:291). Decide: clear on pair change?
- "Original" is provisional (4e). One constant: ORIGINAL_SPEC_LABEL in app/src/store/waySpecs.ts.

## Minor findings (not fixed)
- Rename (catalogMerge.ts:51 vs catalog.ts:111): `Dry Fast` vs `Dry · Fast` passes rename check, then save is refused with a developer-style message. No data damage.
- wayMapView.tsx:610: chip tap before the online map style finishes loading can zoom back out to the whole route.
- After a chip tap, the zoom +/- jumps the map to the route middle (old behaviour, now more visible).
- fmtPct is only used by tests now.
- Brief 04 RecordScreen test only matches source text.
- Design mocks still show percent labels: design/make_screens.py:2683, design/canonical/gate_adjust_*.svg.

## Check on the phone
Chip tap pans to the gate (all 4 screens); larger outer +/- fit; rename row on narrow screens; one-way route shows "plain | new"; free ride then "New way on..." card with required specifier; "Original" fits in pills.

## Reports
10-plan.md, 11-brief-*, 11-brief-*-executor-report.md, 13-inspect-report-01-02-03.md, 13-inspect-report-04.md
