# inspect-report-01 (virgin-cycle29 brief 01) - INSPECT tier, fresh-context Opus, 2026-10-10

## Verdict
**PASS WITH NOTES.** Safe to ship OTA (JS only): yes. No BLOCKER. One MAJOR (the white flash can come back on a frame that
fired before the style loaded; one-line fix proposed). I recommend applying the MAJOR fix before the OTA. It is cheap and only
tightens the lift condition. Shipping without it is acceptable if the on-device check is watched for a flash.

## Checks rerun (all by me, on the real tree; HEAD b9cdedf)
| Check | Result |
|---|---|
| `git status --short` | M on exactly the 9 claimed files (6 under app/src/ui, 3 under app/tests); `?? cycles/virgin-cycle29/`, `?? cycles/virgin-cycle30/`. No other change. |
| `git diff --stat` | 9 files, +62 / -36. Every hunk belongs to brief 01. |
| `node --experimental-strip-types tests/run.ts` | **981 tests: 978 pass, 0 fail, 3 skip.** This is +1 on the executor's 980 baseline. The brief said 972 on a 971 baseline, but HEAD moved on with b9cdedf. |
| `tsc --noEmit` (timeout 175 s) | **exit 0**, empty output (`safe_to_delete/inspect01-tsc.log`) |
| `git diff -- app/tests/ui-strings.allow.json` | **empty** (0 bytes). Byte-identical to HEAD. No entries added, edited or removed. |
| JS-only: diff over app/modules, app.json, app.config.js, package.json, eas.json, App.tsx, GateAdjustScreen.tsx, mapStyleCache.ts, wayMapStyle.ts | empty |
| `onFrameFully` in app/src/ui/*.tsx | 0. `frameRendered` is also gone from app/src and app/tests. |
| `goneKey` in mapCover.tsx | 0 |
| New two-word string literals in src/ui | none (only comments were added) |
| `MAP_COVER_TIMEOUT_MS` | 2500 (mapCoverModel.ts:18) |
| `mapCoverLifts` | `styleFailed \|\| timedOut \|\| (styleLoaded && firstFrame)` |
| Both frame events -> `cover.onFirstFrame` | wayMapView.tsx:796-797, catalogMapView.tsx:268-269 |
| `setStyleFailed(false)` placement | added only in the fetch success branch, after `setPatchedStyles(rememberPatchedStyles(...))` (wayMapView.tsx:575, catalogMapView.tsx:149). The effect-start reset (558/132) was already at HEAD. |
| `patched:` fallback | `cachedPatchedStyles(styleUrl)` (wayMapView.tsx:604, catalogMapView.tsx:163). `cache.get(url)` returns only that URL's entry (mapStyleCache.ts:16-18), so it never hands over another URL's copy. |
| Feed values | `MAP_MOUNT_RADIUS = 0` (activityCard.tsx:40), threshold 40 (RidesScreen.tsx:197), `windowSize={3}` (252), `initialNumToRender={2}` (253), `maxToRenderPerBatch={3}` unchanged |
| Hook order | wayMapView and catalogMapView: no hook added or removed. useMapCover: the same 12 hooks in the same order (the `goneKey` useState became the `bump` useState). |
| Cover z-order / touch | `<MapCover>` is unchanged after `</M.Map>` and before the zoom bar (wayMapView.tsx:1046, catalogMapView.tsx:377), with `pointerEvents="none"`. The suite pin still passes. |

## Cover logic (mapCover.tsx) - adversarial walk-through
- **Never stuck:** the effect at :60-64 restarts a 2500 ms `decide(true)` timer on every key or `decide` change, and `mapCoverLifts` returns true on `timedOut`. The fade callback always sets `gone` while the key is unchanged. If the key changed, the old `seen` is discarded and the new key has its own timer.
- **Per-key state:** `seen` (with `gone`) and `opacity` are `useMemo([key])`, so A->B->A builds a fresh object each time. The old fade callback writes `gone` on the closed-over OLD `seen`, so the new A stays covered. Minor 1 is fixed.
- **Reduce motion:** sets `opacity` to 0, sets `gone`, and bumps the counter in the same call. Correct.
- **Offline / styleFailed:** the offline rung changes the key, gets a new cover and `decide(false)` lifts it at once. On recovery, `setStyleFailed(false)` plus the patched rung gives a new key, a new opaque cover, and a lift on style + frame. Minor 2 is fixed.
- **Theme flip with cache:** the first render after the flip already picks `newUrl#labels`. The effect then sets the same cached object, so the key does not change. Result: one native mount. Minor 3 is fixed.

## Findings

### BLOCKER
None.

### MAJOR
**M1 - a frame rendered BEFORE the style loaded counts as the "first frame"; the white flash can return.** mapCover.tsx:67 (and the model at mapCoverModel.ts:28).
- The native listeners are all registered when the view is built (MLRNMapView.kt:383-388). `onDidFinishRenderingFrame` (not fully) is sent for every rendered frame, with no check on whether the style has loaded (:718-727). So `seen.firstFrame` can latch while the view is still clear-colour.
- When `onDidFinishLoadingStyle` then fires, `decide` lifts at that instant, before the style's background layer has painted a frame.
- The fade is 200 ms with Easing.out(quad), so the cover is already about 15 % transparent after the first 16 ms frame. That is exactly the frame the brief says must be past.
- Before this brief, the signal was `...Fully`, which in practice comes only after the style and its sources have loaded. So this ordering hole is new.
- The model test ("a frame before the style is not enough") only checks that both flags are needed, not the order in which they arrive.
- Most exposed path: the url rung on a cold session (network style load, many frames before the style is ready). The patched rung (inline JSON) is less exposed but not immune.
- Fix (one line, JS-only): `const onFirstFrame = useCallback(() => { if (!seen.styleLoaded) return; seen.firstFrame = true; decide(false); }, [seen, decide]);`. Frames keep coming after the style loads, so a frame after the style is guaranteed.
- Add one model or source pin for the order.
- Unverified off-device: whether MapLibre Native actually emits frames before the style loads in continuous mode. The fix is harmless either way.

### MINOR
1. **Stale `styleFailed` on a theme flip lifts the new cover at once.** wayMapView.tsx:604/622, catalogMapView.tsx:163/179.
   - When the old theme's native load had failed (`styleFailed` = true) and the new URL is already cached, the first render after the flip is the patched rung with a new key.
   - The cover effect runs `decide(false)` with the stale `styleFailed = true`. The reset in the styleUrl effect is only visible on the next render, so the cover lifts unconditionally and a white flash is possible. This is rare: it needs offline-then-flip.
   - Fix: pass `useMapCover(mapStyleKey, rung === 'offline')`. Only the offline rung must never be hidden; destructure `rung` from `mapStyleFor`.
2. **The cache fallback can hand a second patched object under the same key.** Cold session, two maps of the same theme each fetching (for example 2 ACTIVITIES card maps):
   - map 1's fetch lands and fills the cache;
   - map 2 re-renders (a trail loads, say) and switches to the cached object (remount, fine);
   - then map 2's own fetch lands and replaces `patchedStyles` with a new object for the same URL and key.
   - It stays harmless only because Map.tsx:669-670 `JSON.stringify`s the style, the content is identical, and Fabric diffs props. MLRNMapView.setReactMapStyle (:762) has no equality guard. A style-server change between two fetches seconds apart would cause an in-place `setStyle`, the cycle22 09 bug.
   - Optional hardening: in the success branch, skip `setPatchedStyles` when `cachedPatchedStyles(styleUrl)` was filled meanwhile.
3. **Per-frame JS callback for the life of every map.** `onFirstFrame` now runs on every rendered frame. That is continuous on RECORD during a ride (camera follow). The cost is small (set a flag, then `lift` returns early), but it is never switched off. Optional: pass `undefined` for the prop once `!cover.covered`.
4. **No hysteresis on unmounting.** With threshold 40 and radius 0, a card loses its live map as soon as it drops below 40 % visible. It shows the placeholder over up to 39 % of a visible card, and remounts with a cover when scrolled back. This follows the ruling, but Nathan should know about it for the on-device check.
5. **2500 ms safety timeout:** on a slow cold url-rung load it can lift over a view that has not painted yet. This was accepted by the ruling (Q5).
6. **The A->B->A test is a source pin, not behavioural:** it checks `gone: false }` and `covered: !seen.gone`. It would not catch `gone` moved out of the keyed memo while the same text stays. Acceptable per the brief.
7. **Stale doc comment:** activityCard.tsx:9-10 still says "on-screen blocks plus MAP_MOUNT_RADIUS neighbours" (now 0).

## Mutation reasoning (new / changed tests)
- `setStyleFailed(false)` regex pin: I made a copy of wayMapView.tsx with the new line removed (safe_to_delete/insp01/w.tsx) and ran the regex on it. Result: **false**, so the test would fail. The only other `setStyleFailed(false)` sits before the success branch, so the lazy match cannot reach it.
- Reverting either frame event, or reverting to `onFrameFully`, breaks the two `includes` pins in mapcover_suite.
- A timeout of 5000 fails the `<= 3000` bound.
- Reverting to `goneKey` fails the A->B->A pin.
- Reverting the radius, threshold, windowSize or initialNumToRender fails the feedmodel_suite pins.
- Reverting the `patched:` fallback to `: null` fails the mapcover_suite and waymap_suite pins.

## Not verifiable off-device
- Whether `onDidFinishRenderingFrame` fires promptly on Android, and whether it fires before the style loads (this decides M1).
- The real lift time and the absence of a white flash on day and night.
- That ACTIVITIES mounts exactly 2 maps at open.
- How scroll-in and scroll-out look under the 40 % rule.
- That a day/night flip remounts each map exactly once.
- Blank areas from `windowSize={3}` when flinging fast.
