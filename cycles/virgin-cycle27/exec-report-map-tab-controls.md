# Executor report: brief 11 map-tab controls + dot (8 of 9) -- DONE

## STOPPED (one question for the coordinator / Fable)
The ui_strings suite reports one UNLISTED string NOT in the brief's Visible text table (EXECUTOR-RULES: any other UNLISTED -> STOP):

    UNLISTED visible string  src/ui/catalogMapView.tsx:353  [literal]  "rider-dot"

It is the brief's own mandated `<M.Layer id="rider-dot" ...>` (section 4.1 item 7), a MapLibre layer id, not rider-visible. wayMapView.tsx has the same entry (`src/ui/wayMapView.tsx | literal | rider-dot`, bootstrap).
Question: may I APPEND `{file: src/ui/catalogMapView.tsx, kind: literal, text: rider-dot, reason: "virgin-cycle27 09: MapLibre layer id of the MAP tab rider dot, not rider-visible", since 2026-10-09, by "Sonnet execute, virgin-cycle27 brief 08"}` (sorted slot)? Recommended: yes (the brief's allow-list ledger said "adds two" but did not foresee this literal). Alternative: rename the layer id to a non-literal.
This is the ONLY remaining failure.

## State (all edits applied, nothing else pending)
- Tests: baseline 964 tests / 961 pass / 0 fail / 3 skip. Now 966 tests / 962 pass / 1 fail (the rider-dot UNLISTED) / 3 skip. (+2 tests as the amendment says.)
- tsc --noEmit: exit 0 (log: cycles/virgin-cycle27/12-brief-08-tsc.log).
- Files changed by this brief: app/src/ui/wayMapView.tsx (up-arrow block removed, FIT calls resetNorth(), comments), app/src/ui/wayMapGeo.ts (comment), app/src/ui/catalogMapView.tsx, app/src/ui/RoutesScreen.tsx, app/src/location/index.ts (lastKnownPositionIfPermitted inserted before the quiet-read doc comment), app/tests/waymap_suite.ts, app/tests/catalogmap_suite.ts, app/tests/positionretry_suite.ts, app/tests/ui-strings.allow.json.
- Allow-list: REMOVED `src/ui/wayMapView.tsx | attr:accessibilityLabel | Reset map to north up`; ADDED `src/ui/catalogMapView.tsx | text | FIT` and `| text | ME` (reason "virgin-cycle27 08: the MAP tab gets the same coupled FIT/ME toggle as every map", since 2026-10-09, by "Sonnet execute, virgin-cycle27 brief 08"). Sorted via json round-trip.
- Deviations: a comment in RoutesScreen said "LAST KNOWN", which tripped the pre-existing trendpanel pin (`!rs.includes('LAST ')`); reworded to lowercase. Up-arrow glyph kept out of the wayMapView comment so the acceptance grep for it is empty.
- Not done: acceptance grep checks (A4) not run beyond the above because of the STOP; native rendering not checkable here.

## For the Opus inspector
Camera arithmetic in catalogMapView (followZoom, liveBearing, mode 'follow'), rider source mounted last, RoutesScreen precedence (live store fix, then OS last-known), no ensurePermissions/request calls.

## OPEN-ITEMS lines (for the coordinator)
- MAP-tab controls + dot (cycle27 brief 08+09) -- on-device: rotate then FIT on ride detail, catalog detail, prestart and finished maps; MAP tab dot after a RECORD-granted install; ME with location off reads FIT.
- MAP-tab last-known position (ruling 8.1 = live fix -> OS last-known -> none; nothing persisted) -- on-device: open the tab cold indoors; dot + ME at once, dot moves when the fresh fix lands.
- RECORD armed map: ME with no fix still centres the route (not changed by cycle27; apply the same last-known fallback later if Nathan wants it).

## RESOLVED (Fable ruling R1-R3)
Appended allow entry `src/ui/catalogMapView.tsx | literal | rider-dot` (sorted). Ledger: removed 1 (Reset map to north up), added 3 (FIT, ME, rider-dot). Final: 966 tests / 963 pass / 0 fail / 3 skip; tsc exit 0. A4 greps: no up-arrow/Reset; resetNorth x3; no ensurePermissions/request in Routes/catalogMap; getLastKnownPositionAsync only location/index.ts:505; no lastKnown/here= in activity maps.
