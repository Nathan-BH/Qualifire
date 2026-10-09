# exec-report-01 (virgin-cycle29 brief 01) - Status: DONE

Steps 2.1-2.6 and 3.1-3.3 done in order; all anchors matched by content (line numbers had shifted from earlier briefs; no mismatch).
Files touched by me: app/src/ui/{mapCoverModel.ts,mapCover.tsx,wayMapView.tsx,catalogMapView.tsx,activityCard.tsx,RidesScreen.tsx}, app/tests/{mapcover_suite.ts,waymap_suite.ts,feedmodel_suite.ts}. Nothing else.
Tests: before 980 tests / 977 pass / 0 fail / 3 skip (baseline differs from brief's 971: tree had earlier work); after 981 / 978 / 0 / 3 (+1 new test, as expected).
tsc --noEmit: exit 0 (log exec-01-tsc.log empty = clean). First tsc run failed on my feedmodel_suite pin (URL type); fixed by using TESTS_DIR + node:path (imports added in feedmodel_suite.ts).
Checks: grep onFrameFully in app/src/ui/*.tsx = 0; goneKey in mapCover.tsx = 0; ui-strings.allow.json md5 unchanged (0959f79d...); no change outside app/src/ui + app/tests; no git add/commit.
Note: during the run another session committed b9cdedf (cycle28), so git status shrank; unrelated to my work.
Native rendering NOT verifiable here (static checks only).
Allow-list entries: none added/edited/removed.
Inspector: (a) hook order unchanged in both views; (b) seen.gone per-key via useMemo([key]), bump state only forces re-render; (c) setStyleFailed(false) placed right after setPatchedStyles(rememberPatchedStyles(...)) in success branch only (both views); (d) cachedPatchedStyles(styleUrl) fallback returns only the copy for the same URL (verify in mapStyleCache.ts). Also: wayMapView/catalogMapView effect already calls setStyleFailed(false) at effect start (pre-existing).
OPEN-ITEMS line: "virgin-cycle29 01: night + day: switching RECORD / ACTIVITIES / ROUTES shows the dark/light frame colour for a fraction of a second, then the map with tiles filling in; no white flash; ACTIVITIES shows two cards with maps, a third gets its map when it is 40 % on screen; a day/night flip restarts each map once. Re-rank the three tabs by speed and report."

## Post-inspect fix (coordinator, 2026-10-10): inspector M1
inspect-report-01.md M1: a frame reported before the style loaded set `firstFrame`, so the cover could lift the moment the style loaded.
Fixed in `app/src/ui/mapCover.tsx` `onFirstFrame`: `if (!seen.styleLoaded) return;` before `seen.firstFrame = true`. Pin added to `app/tests/mapcover_suite.ts`.
After: 982 tests, 979 pass, 0 fail, 3 skip; tsc exit 0 (fix-m1-tsc.log empty). Inspector MINORs 1-5 not fixed (accepted/noted, see inspect-report-01.md).
