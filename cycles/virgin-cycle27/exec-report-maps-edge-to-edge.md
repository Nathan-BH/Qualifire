# Executor report - brief 11 maps edge to edge (brief 6, with AMENDMENT 6.1 + 6.2)
Done: all of sections 3.1-3.5, A2, A3. No STOP.
Files changed (by me): app/src/ui/RecordScreen.tsx (3 maps bleed, -12/-12/-20, mapInset={12}), ReplayScreen.tsx (-12), DemoScreen.tsx (-12, 2 mounts, mapInset={12}), RideDetailScreen.tsx (mapWrap 0, 4 bleed, mapInset={16}), CatalogDetailScreen.tsx (place -16; way map wrapped -16), gateAdjustCard.tsx (mapInset prop, CARD_PAD, no border/radius, bleed), GateAdjustScreen.tsx (mapInset={16}), tests/recordflow_suite.ts (bleed test rewritten per section 4 + A3).
Not touched: wayMapView.tsx, ui-strings.allow.json (diff there is from earlier briefs only).
Tests: before 966 (963 pass, 0 fail, 3 skip); after 966 (963 pass, 0 fail, 3 skip). tsc exit 0 (empty log = pass).
Deviation: the one-line comment in JSX positions is written as {/* ... */} (a bare // comment in JSX is rendered text and tripped the ui-strings scanner); in RideDetailScreen it is a trailing // comment in the style object.
Note: editor's negative margin is an expression, so not counted by the literal margin count test.
Grep: bleed counts Record 5, Replay 2, Demo 3, RideDetail 5, CatalogDetail 3, gateAdjustCard 3; mapInset= exactly 4 lines.
Static checks only; no device render.
OPEN-ITEMS line: "Maps edge to edge (cycle27 brief 06) - on-device: every screen listed in section 6 plus the gate editor (4 mounts), day + night, notch/side insets, overlay buttons tappable at the edge."

## Post-inspection fixes
Fix 1: RecordScreen.tsx and DemoScreen.tsx end-of-ride ScrollView: style marginHorizontal: -12, contentContainerStyle paddingHorizontal: 12 (gate editor map no longer clipped). GateAdjustScreen: its ScrollView is the screen root with padding 16 and mapInset={16}, no clip issue; mapInset values unchanged (12/12/16/16). Test pinning both ScrollViews added in the bleed test; literal -12 counts updated (Record 3->4, Demo 1->2) because the ScrollView margin matches the same regex.
Fix 2: wayMapView.tsx FIT branch: `if (fitMeNext === 'fit' && rotateEnabled) resetNorth();`; pinned string in tests/waymap_suite.ts updated.
Result: tests 966, 0 fail (see run), tsc exit 0.
