# Inspect report — brief 12 map white flash (virgin-cycle27)

Inspector: fresh-context Opus, 2026-10-09. Read-only; nothing fixed. Executor report not trusted; everything below re-verified on the real tree.

## Verdict: PASS WITH NOTES — SHIP (OTA, JS-only)

## Checks rerun
- `git status --short` (cycle28 ignored): M `app/src/ui/catalogMapView.tsx`, M `app/src/ui/wayMapView.tsx`, M `app/tests/run.ts`; new `app/src/ui/mapCover.tsx`, `mapCoverModel.ts`, `mapStyleCache.ts`, `app/tests/mapcover_suite.ts` (+ brief/exec-report docs). Exactly the brief's list.
- Tests: `971 tests: 968 pass, 0 fail, 3 skip` (exit 0).
- `tsc --noEmit`: exit 0, empty output.
- `app/tests/ui-strings.allow.json`: no diff (byte-identical). No new rider text; negative-word grep over the `src/ui` diff: no hits.
- JS-only: `git diff --stat -- app/modules app/app.json app/app.config.js app/package.json app/eas.json` empty. OTA-safe.
- New files byte-match brief §3/§4/§5; every anchor in §6/§7 applied as written, pinned lines (`wayMapStyle.ts` import, `url: styleUrl,`, `setMode(initialMode)` effect, stale-theme `patched:` guard) untouched.

## Requirement-by-requirement
- Hook order: wayMapView `useMapCover` at line 596, before the only early return (`riderOnly…return null`, line 683); `ML === null` guard is in the OUTER `WayMapView` (line 323), which calls no cover hook. catalogMapView: `useMapCover` line 178; the only early return (`ML === null`, line 115) is in the outer `CatalogMapView`; `CatalogMapInner` has no early return before its JSX (260). No hook after an early return introduced. OK.
- Z-order / touch: wayMapView cover is rendered after `</M.Map></View>` and before zoom bar, `<Credit>`, OFF ROUTE / waiting badges; it is absoluteFill inside the frame (`overflow: hidden`, radius clipped). catalogMapView: after `</M.Map>`, before `st.zoomBar` and later siblings. `pointerEvents="none"` on the Animated.View, so map gestures and buttons pass through. OK.
- Never stuck: lifts on styleFailed (offline rung keys get a cover that lifts in the mount effect), on style+fully-rendered frame, or on the 5 s timer; timer restarted per key and cleared in effect cleanup (also on unmount); new key ⇒ new opacity/seen via `useMemo([key])` and `covered = goneKey !== key`; reduce-motion ⇒ `setValue(0)` + immediate gone. OK.
- Cache: module Map keyed by URL, written only in the fetch success path (catch block has no `rememberPatchedStyles`); stores both labelsOn/labelsOff so `mapStyleFor` still picks by `hideLabels`; `patchMapStyle` depends only on `hideLabels`; the stale-theme guard `patchedStyles?.url === styleUrl` still in both views; maplibre-rn `Map.js:94` JSON.stringifies the object, so sharing one cached object across simultaneous maps is safe. Retry ladder/offline rung unchanged on the uncached path.
- Colours: `t.race.bg` = `#FFFFFF` day, `colors.bg` `#0A0A0A` night (theme.ts 101/115/35) — same token `offlineMapStyle` uses. MAP-tab frame now themed. OK.
- Native driver: `useNativeDriver: true`. OK.
- Leaks: timer cleared; reduce-motion promise guarded by `live`. Fade completion may call `setGoneKey` after unmount (animation not stopped on unmount) — React 19.2, no warning, no effect.
- Tests: mutate-reasoned — reverting any wiring line (import, initial-state, cache skip, remember, cover hook, events, JSX order, themed frame) fails a pin in `mapcover_suite.ts`; model/cache tests are real behavioural checks.

## Findings
BLOCKER: none. MAJOR: none.

MINOR
1. `mapCover.tsx` `covered: goneKey !== key` — if the key flips A→B→A before B's cover has lifted (e.g. labels on/off toggled within the fade/load window), `goneKey` is still A and the A remount gets NO cover (possible flash). Never stuck, only a missed cover. Fix if wanted: reset `goneKey` to null whenever `key` changes, or track gone per mount via the `seen` object.
2. Offline recovery: once `styleFailed` is true it is not reset when a later retry lands, so the patched-rung remount after recovery lifts its cover immediately (`mapCoverLifts` short-circuits on styleFailed) and can show the native white once. Bounded, same as today.
3. Theme flip with both URLs cached still does url-rung → patched (two native mounts): the lazy initial state applies only at mount; the effect sets the cached copy one render later. Covered by the cover; pre-existing pattern, no regression.
4. Offline with a cached (inline) style: if "fully rendered" never fires because tiles fail, the cover holds up to 5 s over a map that is essentially the same frame colour. Accepted trade-off per brief §2.
5. Not verifiable here: native rendering (whether `onDidFinishRenderingFrameFully` fires as expected on Android, actual flash removal). Needs the on-device check in the brief §11 OPEN-ITEMS line.

## Ship
Safe to ship OTA (JS only): YES. Ship, then run the on-device check (night tab switches RECORD/ACTIVITIES/MAP, START/finish label flip, day/night flip, +/−/FIT/ME tap-through, airplane mode with nothing cached).
