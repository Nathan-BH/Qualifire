# Inspect report — virgin-cycle27 batch 1 (briefs 03 slogan, 07 routes rename, 10 activity-card states, 05 breathing sector)

Inspector: fresh-context Opus, 2026-10-09. Read-only on app code. Brief 02 (tier colours) hunks in the shared tree were attributed to it and not re-judged.

## Checks rerun by the inspector
- `cd app && node --experimental-strip-types tests/run.ts` → **958 tests: 955 pass, 0 fail, 3 skip** (log `safe_to_delete/insp-b1-tests.log`). No STALE/UNLISTED ui_strings failure.
- `cd app && ./node_modules/.bin/tsc --noEmit` → **exit 0**, empty output (`safe_to_delete/insp-b1-tsc.log`).
- No hunk under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`. `tower.tsx`, `ReplayScreen.tsx`, `STATE.md`, `engine.ts`, notification policy: untouched.
- Rule (1) grep over every added line in `git diff -- app/src/ui` for `Alert|flashSub|missed|interrupted|estimated|no lap|no time|gap|NOT DETECTED`: 3 hits, all comments (feedModel.ts doc, rideDetailModel.ts doc + trailing comment). No new rider-visible negative wording.

## Allow-list ledger (`git diff -- app/tests/ui-strings.allow.json`), every changed entry
| entry | change | brief | verdict |
|---|---|---|---|
| CatalogDetailScreen.tsx / text | `BACK TO MAP` → `BACK`; reason "virgin-cycle27 07: tab renamed ROUTES; the button no longer names the tab (minimal text)", since 2026-10-08, by "Sonnet execute, virgin-cycle27 brief 07" | 07 | matches §2.6 |
| RecordScreen.tsx / literal | `same activity · new meaning` → `same route · new meaning`; reason "virgin-cycle27 03 (Nathan 2026-10-08): route, not activity — the slogan is about riding the same route again", since 2026-10-08, by "Sonnet execute, virgin-cycle27 brief 03" | 03 | matches §2.2 |
| RecordScreen.tsx / literal | `Interrupted · saved as free activity` removed at its old slot, `Saved as free activity` added at its sorted slot; reason "virgin-cycle27 10: no negative word; the fact is that it was saved", since 2026-10-08, by "Sonnet execute, virgin-cycle27 brief 10" | 10 | an EDIT (same file/kind; moved only by the re-sort on the new text) — matches §6 |
| rideDetailModel.ts / literal | `GPS gap at a gate` REMOVED | 10 | matches §6 |
| rideDetailModel.ts / literal | `a gate was missed` REMOVED | 10 | matches §6 |
No other entry changed. Brief 05 adds/removes nothing (correct). Brief 02's ledger requirement (byte-identical) also holds.

## Brief 03 — RECORD slogan: **PASS**
- `RecordScreen.tsx:1682` `{yellowSub('same route · new meaning')}` — the only slogan change. `grep "same activity" app/src` → none. `ui_strings_suite.ts` fixture untouched (correct).
- Mutate: reverting the literal makes the ui_strings suite report STALE + UNLISTED → fails. Good.
- Safe to ship OTA (JS only): yes.

## Brief 07 — tab MAP→ROUTES, BACK: **PASS**
- `App.tsx:58-61`: `routes: 'routes'`, comment line added; tab id `'routes'` unchanged. `grep "'map'" App.tsx` → none.
- `CatalogDetailScreen.tsx:179` `BACK`. `grep "BACK TO MAP" src tests` → none.
- `RoutesScreen.tsx:2, :14` comment-only. `GLOSSARY.md:86` and `:104` exactly per §2.4. `STATE.md` untouched; replacement line handed over in the exec report.
- `catalogmap_suite.ts:217-220` renamed + negative assert; reverting App.tsx fails both asserts.
- Safe to ship OTA (JS only): yes.

## Brief 10 — activity card states: **PASS WITH NOTES**
- `feedModel.ts:88-90` exactly §3.1; `activityCard.tsx:76-82` exactly §3.2, `notRanked` style 15/700/18 dim; unused `NOT_RANKED_LABEL` import removed. `numberOfLines={1}` count 8→7, pin updated (`recordflow_suite.ts:400`) as §3.2 allows.
- `rideDetailModel.ts:14` import `{ NOT_RANKED_LABEL, unrankedForDisplay }`; `:91` returns the constant (rendered via the constant, never retyped — the ui_strings scanner sees no new `Not ranked` literal). `RideDetailScreen.tsx:478-480` duration in `t.accentText`; `styles.notRanked` + its import removed together with the pin (allowed by §3.4).
- `RecordScreen.tsx:117` `'Saved as free activity'`, constant name kept.
- `grep "gate was missed|GPS gap at a gate|Interrupted ·" src` → none; `rawS` not in feedModel.ts / activityCard.tsx.
- **Adjudication — `feedmodel_suite.ts:73` `rankLabel === null` → `'Not ranked'` for the ignored ride: CORRECT.** `unrankedForDisplay` (feedModel.ts:64-66) returns true for `ignored`, and §3.1's mandated `rankLabel: route ? (unranked ? NOT_RANKED_LABEL : …)` therefore yields `'Not ranked'` for an ignored ride; §7 says explicitly "or one he ignored, shows its total time … with `Not ranked` … where `P3/10` would be". The old assert could not survive the brief's own code; the edit is forced, not scope creep.
- Rider-facing activity text: no `missed`, `lap`, `interrupted`, `gap`, `estimated`, `~` left in the card or detail (sector rows for missed/estimated render an empty time, `rideHistoryModel.ts:228-240`; strip shows a bare `–` for missed). Remaining "no X"/status words are the ones Q10.2 (a) deliberately keeps: `no rank`, `too few to rank`, `ignored in ranking` (rideDetailModel.ts:75-90).
- Mutate: reverting §3.1 fails the rewritten feedmodel test (`heroLabel === durationLabel(umeta)`); reverting §3.3 fails ridedetail_suite :111 / :151 and recordflow :320.

## Brief 05 — breathing sector: **PASS WITH NOTES**
- `chips.tsx:8-9` imports, `:18-22` `BREATHE_FLOOR = 0.55`, `BREATHE_PERIOD_MS = 2400`; `StripSlot` effects `:76-97` verbatim from §3.1: both `Animated.timing` use `useNativeDriver: true` (opacity only, on `Animated.View`), `Animated.loop` stopped in cleanup (`loop.stop(); breathe.setValue(1)`), non-current / reduce-motion path stops and pins opacity 1. Reduce-motion read via `AccessibilityInfo.isReduceMotionEnabled()` with an unmount guard (`live` flag). Hook order fixed (no conditional hooks).
- `liveView.tsx:308-312` renders `{vm.livePos ?? ' '}` only; `contextLabel` still in the interface (`:98`) and builder (`:194-199`), still produced by `replayModel.ts:165`, `demoModel.ts:361`, `PreviewScreen.tsx:201`; no longer rendered anywhere. `livePos` is only ever `P<n>` or null (RecordScreen:1237, ReplayScreen:127, DemoScreen:290) so `??` loses no case vs the old falsy check.
- `grep "settings|useSettings|sectorColours" chips.tsx liveView.tsx` → none. Allow-list untouched. `replay_suite` / `recordflow :532, :565-574` pass unedited. New test appended (+1 → 958).
- Mutate: the new test is a source-string pin; reverting chips.tsx or liveView.tsx fails it. It does not prove runtime behaviour (cannot render headless) — Nathan's on-bike check stays the real gate.
- Safe to ship OTA (JS only): yes (`Animated`, `AccessibilityInfo` are RN core; no dependency added).

## Findings (ranked)
### BLOCKER
None.
### MAJOR
None.
### MINOR
1. `app/tests/feedmodel_suite.ts:69-72` (brief 10): the ignored-ride test is still titled "no time, no rank …" and asserts `heroLabel === ''` only because `meta` is `null`. With a real meta the ignored card now shows the duration — that path has no test. Fix: rename to "…duration (when known), 'Not ranked' in the rank slot…" and add one assert with a meta (`heroLabel === durationLabel(meta)`).
2. `app/src/ui/feedModel.ts:26` (`heroTier` comment "detail.lapTier (neutral while ignored)") and `:57` ("the ONE rule for 'no time, no rank, Not ranked'") are stale after brief 10 (comments only). Fix: "neutral when unranked" / drop "no time, no rank".
3. `app/src/ui/chips.tsx:78-84` (brief 05): reduce-motion is read once per slot mount; a rider toggling the OS setting mid-ride is not picked up until the slots remount (no `reduceMotionChanged` listener). Same pattern as `launchAnimation.tsx`, as the brief prescribed — note only.
4. Pre-existing, out of scope: `RideDetailScreen.tsx:407` 'There are no past results on this way yet.' (a "no X" sentence inside the promote-reference `Alert`) — not touched by any brief in this batch; flag for Nathan's standing rule.
5. Untracked `cycles/virgin-cycle28/`, `product/proposals/watch.md` and `product/proposals/README.md` change in the tree are not from these briefs (docs only) — coordinator to attribute.

## Safe to ship OTA (JS only)?
03 yes · 07 yes · 10 yes · 05 yes. No native change in the tree.
