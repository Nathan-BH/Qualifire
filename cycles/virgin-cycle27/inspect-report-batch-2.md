# Inspect report — batch 2 (virgin-cycle27): record-pairing (+AMENDMENT, +escalation ruling) and replay-1x

Inspector: fresh-context Opus, 2026-10-09. Read-only. I did not use the exec reports as evidence; everything below was checked against the working tree.

## Checks rerun
- `cd app && node --experimental-strip-types tests/run.ts` gives **964 tests: 961 pass, 0 fail, 3 skip**. This matches the expected count.
- `cd app && ./node_modules/.bin/tsc --noEmit` exits **0** with empty output (`safe_to_delete/insp-b2-tsc.log`).
- JS-only: `git status` shows no hunk under `app/modules/`, `app.json`, `app.config.js`, `package.json` or `eas.json`.

## Allow-list ledger (semantic diff, HEAD vs tree, keyed file|kind|text)
**Brief 01 (record-pairing) removed exactly these three entries.** That matches A4 plus ruling item 2:
- REMOVED `src/ui/settings.tsx | attr:label | Start place`
- REMOVED `src/ui/RecordScreen.tsx | literal | START NOT DETECTED`
- REMOVED `src/ui/settings.tsx | text | STARTING AN ACTIVITY` (approved by ruling-record-pairing-escalation.md §2)

`DETECTED START` and `STARTING FROM` are still present (the -U0 text diff only shifts them).

**Brief 11 (replay-1x) changed no entries.**

These other entries in the tree belong to briefs 03, 07 and 10, which were already inspected:
- `BACK TO MAP` → `BACK`
- `Interrupted · saved as free activity` → `Saved as free activity`
- `same activity · new meaning` → `same route · new meaning`
- `GPS gap at a gate` and `a gate was missed` removed

No unlisted entry. The header block is unchanged.

---

## Brief 11-record-pairing (+ AMENDMENT + escalation ruling): **PASS WITH NOTES**

### Requirements verified
- `landmarkUsage.ts`: `destinationUsageFrom` and `suggestedDestination` are appended verbatim to §3.1. `landmarkUsageCounts` and `sortLandmarksByUsage` are byte-identical (the diff only appends after line 29).
- Ordering is count first, then `lastMs` with a strict `>`, then catalog order (the first landmark wins ties).
- A loop counts under the start id. No history returns `null`, and the effect then leaves `to` untouched (Q1.3a).
- `RecordScreen.tsx`:
  - The import is updated (:88).
  - `toExplicit` and `pickTo` are defined at :290-291.
  - The effect at :1166-1171 is guarded by `phase !== 'setup' || toExplicit || fromId === NEW_ID`, so it never runs outside setup. Its deps are `[fromId, toExplicit, phase]`.
  - The effect is unconditional and sits before the only `return (` (:1525), so hook order is safe.
  - Loop handling: when `best === fromId` it calls `setTo(LOOP_ID)`, which makes `loopOn` true and lights the loop pill.
- All three GOING TO pills (place, loop, new) go through `pickTo`, including the loop pill `pickTo(LOOP_ID)` (:1622).
- `setToExplicit(false)` appears exactly three times: sport switch (:306), ride end (:819) and discard (:1056).
- `grep setTo(` finds only `pickTo`'s own call (:291), the sport switch (:305) and the effect (:1170), plus the useState setter. §5.5 holds.
- User tap overriding the smart pick: a GOING TO tap sets `toExplicit` and the effect stops following. A later START tap changes `fromId` but does not re-follow while `toExplicit` is true. Ride end, discard and sport switch re-arm it.
- With one pill chosen or no history, `to` is unchanged.
- A sport switch resets `from`/`to` and re-arms; the new `fromId` re-triggers the effect.
- `startMode` is gone:
  - Removed from the `Settings` type and `DEFAULTS`, and the whole `STARTING AN ACTIVITY` card is deleted (`Seg`, `Row` and `help` are still used elsewhere).
  - `effectiveFromId` no longer has a `startMode` param.
  - `RecordScreen` no longer reads `settings.startMode`.
  - `grep -rn startMode src tests` finds only the `settings.tsx:102` scrub line and two test strings. App.tsx, scripts and modules are clean.
- Load scrub: `delete saved.startMode` (settings.tsx:102) runs before `setS({...prev, ...saved})`, so an old `settings.json` holding `startMode: 'pick'` loads cleanly. Nothing reads the key, so there is no crash path. The next write drops the key.
- Escalation fix 1 applied: the em dash in the scrub comment is now a comma.
- The label is two-state, `{fromId === detected?.id ? 'DETECTED START' : 'STARTING FROM'}`. There is no ` ✓` and no `START NOT DETECTED`.
- Negative-wording grep on this brief's hunks: the only hit is the code comment `no "not detected" wording` (:1590), which is not rider-visible.
- Tests:
  - The four landmarkusage tests and the one recordflow pin are added as specified.
  - The effectiveFromId tests have their `startMode` property dropped, and their behaviour asserts are unchanged.
  - The pick-mode test is rewritten as A3 specified.
  - The cycle26 loop-pill pin now matches `pickTo(LOOP_ID)` exactly, per ruling §3, and is still a count-of-1 pin.
  - None of these tests were loosened.
- Mutate-check (reasoned):
  - Making the tie-break `>=` makes "full tie → catalog order" return `Z`, so that test FAILS.
  - Counting a loop under the end instead of the start breaks nothing on its own, but dropping the `startLandmarkId !== fromId` filter fails the "nothing from other starts" check (`size === 3`).
  - Reverting any pill to `setTo(` fails the recordflow pin (count 3 / no `setTo(` regex).
- No edits outside the brief and amendment file list.

### Findings
- **MINOR-1: cold-launch race; the follow can miss its only chance.** RECORD is the default tab (App.tsx:75) and mounts before `initRideHistory` (lastRide.ts:253 → `initResultsStore`) has filled the results store. The effect only re-runs when `fromId`, `toExplicit` or `phase` change.
  - Failing scenario: GPS fix lands, or `fromId` settles, before results hydrate. `suggestedDestination` then reads an empty store and returns null. Nothing re-runs it after hydration, so GOING TO keeps the mount default until the rider taps START, switches tab or finishes a ride.
  - Likely rare, because a GPS fix is usually slower than a file read.
  - Proposed minimal fix: add a "stores ready" state, set via `whenStoresReady()` (store/bootstrap.ts, already imported at RecordScreen:81), to the effect's deps.
- **MINOR-2: the suggested destination may not be a visible GOING TO pill.**
  - `suggestedDestination` iterates all `CATALOG.landmarks`, but the pills show only `offerAtStart` landmarks.
  - If the most-ridden destination from START is an archive-only or errand landmark (`offerAtStart: false`), `to` is set to it and no pill is highlighted. The route still resolves correctly.
  - The same class of display gap existed before for the `defaultEndpoints` / last-ride default.
  - Possible fix: filter `c.landmarks` by `offerAtStart` at the call site.
- **MINOR-3: stale doc comment.** `recordFlow.ts:62` still says "'pick' mode never consults detection at all". The appended line corrects it, but the old sentence was left in place. This is a comment only.
- **NOTE: the follow effect is pinned by source, not by behaviour.** That is by brief design. The pure logic is behaviour-tested.

**Safe to ship OTA (JS only)? YES.**

---

## Brief 11-replay-1x: **PASS WITH NOTES**

### Requirements verified
- `replayModel.ts:24` is `REPLAY_RATES = [1, 5, 10, 25]`, with doc lines updated per §3.1. `REPLAY_RATE_DEFAULT` is still 10.
- `demoModel.ts:385` is `DEMO_RATES = [1, 5, 15, 25] as const`. `DEMO_RATE_DEFAULT` is still 25.
- `DemoScreen.tsx` has two comment-only hunks (:20, :492).
- There is no engine edit, and `ReplayScreen.tsx` and `liveView.tsx` are untouched.
- `nextReplayRate` and `cycleRate` index the lists generically, so the dials cycle 1→5→10→25→1 and 1→5→15→25→1. A `DemoRate` that includes `1` compiles; tsc is clean.
- No consumer keys on a minimum rate. I grepped every `DEMO_RATES` / `REPLAY_RATES` use, and the clock and scrub are linear in rate. The demo roll-out test (`demo_suite.ts:230`) uses `Math.max` and is unaffected.
- The acceptance grep for `[5, 10, 25]` / `[5, 15, 25]` in src and tests has no hits.
- Allow-list: no change attributable to this brief.
- Tests are as specified. That gives +1 test (963 → 964).
- Mutate-check: reverting either list fails the JSON-equality asserts and `nextReplayRate(25) === 1`.

### Findings
- **MINOR-4: the new 1x clock test does not pin this brief's change.** `virgin-cycle27 11: at 1x the replay clock…` (replay_suite.ts:464-468) exercises `replayClockS` and `scrubDeltaS` with rate 1. These are pure arithmetic and would pass even with 1 removed from `REPLAY_RATES`. The behaviour is still pinned by the rewritten cycle test, so this is harmless, but the test is not evidence for this brief.
- **MINOR-5: stale comments.**
  - `demoModel.ts:382` still says "Deliberately NOT REPLAY_RATES (5/10/25)".
  - `DemoScreen.tsx:174` still lists "8 min at 5x, 40 min…" with no 1x.
  - Both are comments only.

**Safe to ship OTA (JS only)? YES.**

---

## Ranked findings
1. MINOR-1: cold-launch race; GOING TO follow may read an empty results store (RecordScreen.tsx:1166-1171). Fix: add a stores-ready dep.
2. MINOR-2: a suggested destination with `offerAtStart: false` leaves no GOING TO pill lit (landmarkUsage.ts `suggestedDestination` over all landmarks).
3. MINOR-4: the replay 1x clock test passes regardless of the change (replay_suite.ts:464).
4. MINOR-3 / MINOR-5: stale comments (recordFlow.ts:62, demoModel.ts:382, DemoScreen.tsx:174).

No BLOCKER and no MAJOR findings.
