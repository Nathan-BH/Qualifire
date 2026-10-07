# virgin-cycle23 — execution order

Written by the Plan tier (Fable) 2026-10-06 night from `00-nathan-decisions.md` + digests 01/02 + preview B. Three briefs, strictly sequential; each is verifiable alone with the headless suite (`cd app && node --experimental-strip-types tests/run.ts` zero FAIL; `cd app && ./node_modules/.bin/tsc --noEmit` exit 0). All three are JS-only (OTA-publishable; no native change, no new dependency).

| # | brief | depends on | what lands | visible to Nathan? |
|---|---|---|---|---|
| 1 | `brief-01-map-gestures-actions-feedmodel.md` | — | `WayMapView` `gestures` prop ('full' default = unchanged); `src/ui/rideActions.ts` (Delete/Ignore/Export shared); `src/ui/feedModel.ts` + `src/ui/trailCache.ts` (pure) with `tests/feedmodel_suite.ts` + `tests/trailcache_suite.ts`; `SectorRowModel.gapS` (+ `gapS: null` on the 4 `tests/replay_suite.ts` fixture rows, R2); allow-list: 10 `file` edits (moved alert strings) + 1 new `rideActions.ts` `Cancel`, entries re-sorted (R3) | NO (no screen changes) |
| 2 | `brief-02-activities-feed.md` | 1 | ACTIVITIES tab = feed (`RidesScreen.tsx` rewrite of the list; new `activityCard.tsx`, `activityMenu.tsx`); windowed live maps; ⋯ menu; scroll restore; 1 source-pin test; allow-list: −1 (FREE ACTIVITIES) +3 (menu labels) | YES |
| 3 | `brief-03-detail-page-redesign.md` | 2 | `RideDetailScreen.tsx` flat redesign; `sectorHighlightColours` in `rideDetailModel.ts`; 2 model tests + 1 source-pin test; allow-list: −6 removed, 4 `kind` edits, 0 new | YES |

## Pipeline per brief

Execute (Sonnet, `EXECUTOR-RULES.md`) → Inspect (fresh Opus, `INSPECTOR-RULES.md`) → coordinator fixes/forwards escalations to a fresh Fable → next brief. Do not start brief N+1 before brief N's Inspect is PASS (or PASS WITH NOTES the coordinator accepts). The coordinator — never the executor — updates STATE.md / OPEN-ITEMS.md (each brief's §7 paragraph) and commits.

## What the Inspect pass must rerun, per brief

- **Brief 01:** full suite + tsc (expected `887 tests: 884 pass, 0 fail, 3 skip`; tsc exit 0 — the executor's first tsc log was empty = timed out); `git diff -- app/tests/ui-strings.allow.json` = 10 entries moved from the RideDetailScreen.tsx block into a new 11-entry rideActions.ts block (+ the new `prop:text Cancel`), 463 entries, sorted, `RideDetailScreen.tsx | prop:text | Cancel` and `| text | Delete` still present, legacy untouched (RULINGS.md R3); `tests/replay_suite.ts` diff = exactly four `, gapS: null` additions (R2); `trailCache.ts` declares `readonly capacity: number;` with a plain constructor (R1, no parameter property); `grep -rn "gestures=" app/src/ui/*.tsx` → no caller; `tests/waymap_suite.ts` pins (touchRotate={rotateEnabled}, touchPitch={false}, zoom-bar slice, key={mapStyleKey}, rider last) pass unedited; `rideActions.ts` vs the removed handlers (diff by eye: same calls, same order, same strings); the new suites would fail if reverted (mutate-check `liveMapIndices` clamping and `LruCache` eviction order); no screen file other than RideDetailScreen.tsx (handlers only) and wayMapView.tsx changed; no test file other than run.ts (2 imports), replay_suite.ts (fixture) and the two new suites changed.
- **Brief 02:** full suite + tsc; `git diff -- app/tests/ui-strings.allow.json` = −1 +3 exactly as the table; card height arithmetic (styles vs `CARD_HEIGHT_ROUTE` 290 / `CARD_HEIGHT_PLAIN` 256) — recompute from the StyleSheet; `onViewableItemsChanged`/`viewabilityConfig` stable refs; `useRideTrail` cleanup; no hex; `recordflow_suite` RidesScreen pins (NO SPORT YET badge, no banned strings) pass unedited; `CARD_MAP_GESTURES` is one exported constant; the OPEN-ITEMS §7 paragraph is in the executor's report.
- **Brief 03:** full suite + tsc; allow-list diff = −6 and 4 kind edits, nothing appended; the cycle20/22 pins in `recordflow_suite.ts` (`>ref</Text>`, `tierTextColour` substrings, 4 `<WayMapView` with the sectorColours/trail split, fixes-effect regex) pass unedited; every action still reachable (Replay button, 3 menu items, 4 suggestion rows under their original conditions, naming + gate cards, bottom primary with 4 labels); `sectorHighlightColours` tests would fail if the function returned the verdict colours; no hex; no new strings.

## Risks that could not be settled in the sandbox (go to OPEN-ITEMS when the briefs land)

1. One-finger touches over a card's native map (feed scroll / tap) — mitigated by `CARD_MAP_GESTURES` ('twoFinger' first, 'readonly' = guaranteed fallback, one line).
2. Scroll smoothness with 3-5 live MapLibre views + the remount cost after BACK (feed unmounts under the detail by App.tsx's mount-swap, maps are re-created on return; trails come from the in-memory cache).
3. Android edge swipe-back vs the detail map's 16 dp margin.
4. Night-theme contrast of tier text / rank / gap on the bare page background (the tierTextColour values were validated against the CARD colour, not `t.bg`; `night.bg` #17171b is darker than `night.card` #212127 so contrast only improves; `daylight.bg` #FAF7EE vs card #FFFFFF is a negligible change — [UNVERIFIED on device]).
