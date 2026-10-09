# Inspect report: briefs 01-02 (gate card) and 03 (rename way), virgin-cycle28

Inspector: fresh-context Opus, 2026-10-09. Against the uncommitted working tree. Static checks only; nothing rendered.

## Verdicts

| brief | verdict | safe to ship OTA (JS only)? |
|---|---|---|
| 01-02 gate card (chip focus + pad without percent) | PASS-WITH-NOTES | yes: no hunk under app/modules, app.json, app.config.js, package.json, eas.json |
| 03 rename way | PASS-WITH-NOTES | yes: same check |

## Commands run (by me) and results

1. `cd app && node --experimental-strip-types tests/run.ts` -> `978 tests: 975 pass, 0 fail, 3 skip` (exit 0; no UNLISTED/STALE lines). Matches executors: 971 baseline + 3 (01-02) + 4 (03).
2. `cd app && timeout 175 ./node_modules/.bin/tsc --noEmit` -> exit 0, empty output (not a timeout: timeout would exit 124).
3. `GIT_OPTIONAL_LOCKS=0 git status --short` / `git diff --stat`: 13 files = brief 01-02's 7 (gateAdjustCard.tsx, gateAdjustModel.ts, wayMapView.tsx, wayMapGeo.ts, gateseeding/waymap/waymapgeo suites) + brief 03's 6 (catalogMerge.ts, catalogDetailModel.ts, CatalogDetailScreen.tsx, catalogmerge/catalogdetail suites, ui-strings.allow.json). Nothing else in app/. Untracked: cycles/virgin-cycle28..30 only.
4. `git diff --stat -- app/modules app/app.json app/app.config.js app/package.json app/eas.json` -> empty.
5. `git diff -- app/tests/ui-strings.allow.json` -> exactly ONE added entry, nothing edited/removed:
   `{"file": "src/ui/CatalogDetailScreen.tsx", "kind": "text", "text": "rename way", "reason": "virgin-cycle28 03 (Nathan 2026-10-09): ways can be renamed like places; lowercase like edit gates / delete way", "since": "2026-10-09", "by": "Sonnet execute, virgin-cycle28 brief 03"}`
   Matches brief 03's table; 01-02 contributes nothing (byte-identical requirement met).
6. `git diff -U0 -- app/tests/ | grep '^-'` -> only three import lines replaced (extended); no assertion removed or loosened.
7. `grep -rn focusGate app/src` -> only wayMapView.tsx (prop + effect) and gateAdjustCard.tsx:166. No other WayMapView caller passes it.
8. `grep -n % app/src/ui/gateAdjustCard.tsx` -> no hits. `fmtPct` now only defined (gateAdjustModel.ts:77) and used by tests; no app caller.
9. Probe (scratch `safe_to_delete/insp28/probe.ts`, real `renameWay` + `validateCatalog`): rider-recorded way on a SEED route renames OK and merged catalog validates; shipped way refused; see finding 03-1 for the collision case.

## Brief 01-02 checks

- Byte-identical: `NUDGE_SMALL_PCT`, `NUDGE_LARGE_PCT`, `nudgeDeltaM`, `MIN_GATE_GAP_M`, `clampNudge`, `fmtPct` (gateAdjustModel.ts diff is a pure append of `fmtMoved` after fmtPct). `smallM`/`largeM` lines unchanged; pad deltas in order `-largeM, -smallM, smallM, largeM` (gateAdjustCard.tsx:201-204); `REPEAT_MS = 120`, `LONG_PRESS_MS = 350` values unchanged (only the comment changed); `nudge`/`startRepeat`/`stopRepeat`/padBtn flex untouched.
- Map tap literal `gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}` unchanged (gateAdjustCard.tsx:165). Map taps do not move the camera; nudges do not move the camera (the effect is keyed on `focusSeq` only, wayMapView.tsx:534; the asset rebuild per nudge does not retrigger it).
- `setFocus(` occurs once, in the chip handler, only when `next !== null` (gateAdjustCard.tsx:178-182): a deselecting chip tap does not move the map.
- Effect wayMapView.tsx:522-534 is above the riderOnly early return (:706), sets `'free'` before `setStop`, setStop in try/catch. `asset`, `liveZoom`, `setMode`, `cameraRef` declared above (:409, :455, :438, :491).
- `gateFocusStop` = `max(liveZoom ?? 0, 17)`: never lowers zoom. Gate index -> `asset.gates[i]` maps 1:1 to chainage index (wayAssetRuntime.ts:96).
- React keys of pad unique (`backBig/backSmall/onSmall/onBig`). Readout has no percent.
- All four call sites (RecordScreen.tsx:1353, RideDetailScreen.tsx:618, DemoScreen.tsx:728, GateAdjustScreen.tsx:112) mount the one shared `GateAdjustCard`, which is the only place the prop is wired, so idea 1 applies on all of them with no per-site change.
- Rider text: pad glyphs `−`/`+` and the `· +36 m` suffix are not letter runs; ui-strings suite passes with allow-list unchanged. No banner, no em dash in rider text (the em dash at gateAdjustCard.tsx:126 is a code comment).
- Mutate-check (by reasoning): T3 fails if the chip handler is reverted (`if (next !== null) setFocus(` and the single-`setFocus(` count) or a `%` label returns; T1 fails if `Math.max` is dropped (`gateFocusStop(g, 18.4).zoom === 18.4`).

## Brief 03 checks

- `renameLandmark` / `mergeLandmarks` byte-identical: catalogMerge.ts diff = import line + inserted block before `FoldedRoute` only.
- `renameWay` (catalogMerge.ts:44-58) returns `{ ...userCat, ways: map(...) }`: only that way object changes, only its `specs` (spread copy, `delete next.specs` for plain). Shipped way refused (not in userCat). Empty only when no siblings. Duplicate check excludes the way itself (`x.id !== wayId`, :49) and uses `sameSpecs` over the merged seed+user ways (:51), so seed siblings count.
- Button gating: `renamable: !seedOwned` (catalogDetailModel.ts) with `isSeedOwned` = id in seed ways; a rider-recorded way on a seed route is renamable (probe: OK, merged validates).
- Memo fix: `[request, tick]` (CatalogDetailScreen.tsx:83). Previously keyed on the stable `setTick`, so `bump()` never recomputed the model; now rename, place rename, delete way, delete route and place delete all recompute. Route/way delete that removes the subject -> `model === null` -> the existing close effect (:88-90) fires (improvement; previously the close path depended on something else re-keying). Merge navigates via `openCatalog` (new request) as before. Nothing else read the old memo. WaySection keyed by `r.id`, so the inline rename state follows its way across a re-sort.
- Length: per-part 24 enforced in `renameWay`; TextInput `maxLength={40}` caps the whole line.
- Alert bodies (store, unscanned): all <= 11 words, no em dash.
- Mutate-check (by reasoning): `'DRY'` vs w2 `['Dry']` fails if the duplicate check is removed; the screen test fails if the memo deps revert to `setTick`.

## Findings (ranked)

No BLOCKER, no MAJOR.

1. MINOR (03) catalogMerge.ts:51 vs catalog.ts:111: `renameWay`'s duplicate test (`sameSpecs`, positional parts) is weaker than the validator's (parts lowercased and joined with a SPACE). Scenario (reproduced in probe): a sibling way has `['Dry','Fast']`; rider renames to `Dry Fast` (one part). `renameWay` returns ok, then `saveUserCatalog` refuses and the alert shows the raw developer string `route r1: ways s1 and u1 share specs ["Dry Fast"]`. No data damage (nothing saved). Minimal fix: in renameWay also refuse when `specs.join(' ').toLowerCase() === cleanSpecs(x.specs).join(' ').toLowerCase()`, with the same rider message. Same latent gap exists in the naming card's `findWayWithSpecs` path (pre-existing, not this brief).
2. MINOR (01-02) wayMapView.tsx:610-612: the existing `mapStyleKey` effect resets mode to `initialMode` ('fit') when the online style fetch arrives and the native map remounts. A chip tap made before that (first second or so after the card opens) gets refit back to the whole route. Pre-existing camera rule, rare; device check only.
3. MINOR (01-02, behaviour note, unchanged code) wayMapView.tsx:1048-1052: after a chip focus, tapping the zoom bar `+`/`−` sets mode `'follow'`, which (no rider fix on this map) centres on the route's bounds midpoint, jumping away from the focused gate. Same as after a manual drag today; worth an on-device look since chip focus now makes this path common.
4. MINOR (01-02, hygiene) gateAdjustModel.ts:77: `fmtPct` has no app caller now (tests only). Brief said keep it; flag for a later cleanup.
5. NOTE (01-02, OPEN-ITEMS from executor): `design/make_screens.py:2683` and `design/canonical/gate_adjust_*.svg` still show percent labels.

## Not verifiable without a device

- That `cameraRef.setStop({center, zoom, duration, easing})` animates on MapLibre RN as intended and that the declarative props switching from `{bounds}` to `{}` (mode 'free') does not re-apply a fit on the next render.
- Glyph sizes 30/18 with lineHeight 34/22 fitting the pad buttons (paddingVertical 16/10) without clipping on small phones.
- Rename row layout (TextInput + SAVE + cancel in one row) on narrow screens and keyboard behaviour (`autoFocus`).
- Other screens (ROUTES list, RECORD pills, ride history) showing the new name: they recompute from `currentCatalog()`, which `saveUserCatalog` updates (catalogStore.ts:123-124), but refresh-on-focus of those screens was not exercised.
