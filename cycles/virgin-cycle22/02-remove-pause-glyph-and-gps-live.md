# 02 — Remove the sector pause glyph ‖ everywhere a rider sees it, and the "GPS live" label on the race screen

**Source: Nathan, 2026-10-04 + 2026-10-05 (README "Decision from Nathan (2026-10-04, item 3)" and
"Decisions from Nathan (2026-10-05)" item 3).** The ‖ (U+2016) after a sector label marks a sector with
>= 1.0 s of stopped time (`interrupted`, core/src/timing.ts INTERRUPTED_STOP_S). Nathan: the rider
should not be concerned with it; it has no purpose. Remove the glyph; keep the `interrupted` flag and
the scoring untouched (an interrupted sector still keeps its earned tier — only the mark goes). Also
remove the "GPS live" status text on the RECORD race screen (one quiet slot that said "GPS live" while
the last fix was <= 5 s old). Both are rider-facing text removals: the allow-list entries go with the
code (CLAUDE.md rule 9). Written by the Plan tier (Fable) on 2026-10-05 after re-verifying every
anchor of digests D3/D7 against the tree. Nothing is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.

**Run order:** after 01, before 03 (03 edits `RideDetailScreen.tsx` + `recordflow_suite.ts` too, and
reads `buildSectorRows` labels; 03 is written to be independent of this brief, but run 02 first anyway).

**IMPORTANT — the live gate flash is NOT being redesigned here.** README item 2 (flash = sector time
only, tier colour, no box, no label) is under a separate Opus investigation. This brief only removes the
glyph from the flash's label row; no restyle of `LiveBigChip` (box, border, fill, fonts) — keep every
other line of `chips.tsx` exactly as is.

## 0. Where the glyph and the label live today (verified 2026-10-05; grep "‖" over app/src + app/tests)

Rider-reachable code:
- `app/src/ui/liveView.tsx:146` — `glyph: sec.interrupted ? '‖' : '',` in `bigFromSector` (the gate
  FLASH model, `BigChipModel.glyph` :77); also `glyph: ''` at :140 and :152.
- `app/src/ui/liveView.tsx:170` — `label: sec.interrupted ? `${label} ‖` : label,` in
  `viewModelFromEngine` (the sector STRIP slot labels, rendered by `StripSlot`).
- `app/src/ui/liveView.tsx:296-304` — `<LiveBigChip ... glyph={vm.flash.glyph} ... />`.
- `app/src/ui/liveView.tsx:11` and `:28` — header comments "interrupted keeps its earned tier + ‖".
- `app/src/ui/chips.tsx:55-63` — `LiveBigChip` props incl. `glyph: string;` (:59); `:82` —
  `{props.glyph ? <Text style={{ fontWeight: '400' }}> {props.glyph}</Text> : null}`.
- `app/src/ui/rideHistoryModel.ts:243` — `const label = sec.quality === 'interrupted' ? `S${sec.index} ‖`
  : `S${sec.index}`;` in `buildSectorRows` -> the post-race SECTORS list on RideDetailScreen (and the
  model RIDES uses). Pure `.ts`, headless-testable.
- `app/src/ui/RecordScreen.tsx:1438` — `{flashMsg ?? (gpsLive ? 'GPS live' : '')}`; `:1072` — `const
  gpsLive = status.lastFixMs != null && lastFixAgeS != null && lastFixAgeS <= 5;`; `:1063-1064` — `const
  lastFixAgeS = status.lastFixMs != null ? Math.round((now - status.lastFixMs) / 1000) : null;` (used
  ONLY by `gpsLive` — grep: 2 hits); comment block `:1066-1071` ("The only live status text left is
  "GPS live" ..."); JSX comment `:1434-1436` ("one quiet slot — "GPS live" or nothing; ...").
- `app/tests/ui-strings.allow.json:~784-791` — the entry `{"file": "src/ui/RecordScreen.tsx", "kind":
  "literal", "text": "GPS live", "reason": "bootstrap: survived the cycle20 clutter audit
  (CLUTTER-REVIEW.md)", "since": "2026-10-02", "by": "bootstrap"}` — NOT a `legacy` entry (legacyCount
  33 is untouched by removing it).
- `app/tests/recordflow_suite.ts:288` — the `kept` list of the virgin-cycle20 08 source test starts with
  `"'GPS live'"`: it asserts RecordScreen STILL contains `'GPS live'`. Must move.
- The glyph itself is in NO allow-list entry for the live/post-race code (templates `${label} ‖` and
  `S${sec.index} ‖` have no prose and are not extracted), so nothing to remove there for ‖.

NOT rider-reachable (leave untouched, see decisions): `app/src/ui/preview/` (`PreviewScreen.tsx`,
`data.ts` with hardcoded `glyph: '‖'`, `rt: '15:24 ‖'`, "‖ 1 stop" strings and their 5 allow-list
entries at ~2463/2493/2502/2511/2579). Nothing outside that folder imports it (`grep -n "preview"
src/ui/*.tsx src/ui/*.ts App.tsx` -> only comments; App.tsx imports DemoScreen, not PreviewScreen).
Only ONE line there is touched, for tsc (step 4).

Also NOT touched: `app/core/` (parity-proven), `app/src/live/engine.ts` (`interrupted: boolean` :84,
set at :554), `store/derive.ts`, `store/results.ts`, `store/timing.ts` (`scoredS`), test fixtures with
`"flag":"interrupted"`, `tests/live_suite.ts:79-80/146-148` (flag mapping), `live_colour_suite.ts`
interrupted-founding tests, `ui_strings_suite.ts` (its 'GPS live' strings at :39/:48/:71/:76/:109 are
FIXTURE text for the extractor, not app code).

## Scope / non-scope

IN: `app/src/ui/liveView.tsx`, `app/src/ui/chips.tsx` (glyph prop + render only), `app/src/ui/rideHistoryModel.ts`,
`app/src/ui/RecordScreen.tsx`, `app/src/ui/preview/PreviewScreen.tsx` (ONE property removed, type-only),
`app/tests/ui-strings.allow.json` (remove ONE entry), `app/tests/recordflow_suite.ts`,
`app/tests/ridehistory_suite.ts`.
OUT: everything listed as NOT touched above; `LiveBigChip` styling; `StripSlot`; `LiveLapChip`;
`settings.tsx`; `ReplayScreen.tsx`/`DemoScreen.tsx` (they render through `LiveSectorPane` and get the
change for free); any `interrupted` data or scoring; the `INTERRUPTED_*` names of virgin-cycle21 04
(`INTERRUPTED_MSG`, `interruptedRideAction` — a different concept, an interrupted RIDE).

## Target invariants

1. No rider-visible string in `app/src/ui/` (excluding `preview/`) contains U+2016 ‖: liveView.tsx,
   chips.tsx, rideHistoryModel.ts, RecordScreen.tsx, RideDetailScreen.tsx, RidesScreen.tsx,
   ReplayScreen.tsx, DemoScreen.tsx — code AND comments (so the source test is simple).
2. `buildSectorRows` labels are `S${index}` for every quality; `tier`/`timeLabel`/`avgLabel` unchanged
   (an interrupted sector keeps `tierFor(v, h)` and `fmt(v, 1)`).
3. The strip label for a done interrupted sector is `S{n}` (same as clean); `~` for estimated stays.
4. `BigChipModel` and `LiveBigChip` have no `glyph` field/prop; the flash renders `lbl`, `delta`, `time`
   (+ `●` PB marker) exactly as before, in the same box.
5. RecordScreen's quiet slot renders `flashMsg ?? ''` (the 5 s foreground-permission flash still works;
   an empty string keeps the slot's height so the pane does not jump). `gpsLive` and `lastFixAgeS` are gone.
6. ui-strings suite green with the "GPS live" entry removed; legacyCount 33 unchanged.

## Steps (anchors by quoted content; line numbers are current-tree approximations)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short` (record). Baseline after brief 01: expect
**849 tests / 846 pass / 0 fail / 3 skip**, tsc exit 0 (foreground, `timeout_ms: 180000`; `&` jobs die
with the call). If 01 was not run, expect 848/845/0/3 and adjust the deltas below.

**Step 1 — tests first (failed-before).**
a. `app/tests/ridehistory_suite.ts`: after the test `'ridehistory: buildSectorRows — estimated ~raw,
   missed did-not-traverse, clean gets a real tier + avg'` add:
```ts
test('virgin-cycle22 02: buildSectorRows — an interrupted sector keeps its tier and time but its label carries no ‖ glyph', () => {
  // Nathan 2026-10-04/05: the pause mark means nothing to the rider; only the glyph goes,
  // the interrupted flag and scoring stay (core/timing untouched).
  const result = makeResult('r1', 'Morning', 1000, { movingS: 850, rawS: 900, quality: 'interrupted' }, [
    { index: 1, movingS: 200, rawS: 230, quality: 'interrupted' },
    { index: 2, movingS: 210, rawS: 210, quality: 'clean' },
  ]);
  const hist = [190, 195, 205, 210, 215];
  const rows = buildSectorRows(result, () => hist);
  const s1 = rows.find((r) => r.index === 1)!;
  const s2 = rows.find((r) => r.index === 2)!;
  assert(s1.label === 'S1', `interrupted label must be the bare S1, got "${s1.label}"`);
  assert(s2.label === 'S2', `clean label is S2, got "${s2.label}"`);
  assert(s1.tier !== 'est', `interrupted keeps a real tier (history of 5), got ${s1.tier}`);
  assert(s1.timeLabel === fmt(200, 1), `interrupted keeps its moving time, got ${s1.timeLabel}`);
  for (const r of rows) assert(!r.label.includes('‖') && !r.timeLabel.includes('‖'), `no ‖ in row ${r.index}`);
});
```
   (`makeResult(rideId, wayId, startedAtMs, lap, sectors)` is the suite's own helper at :36-40 —
   `lap: { movingS, rawS, quality }`, `sectors: { index, movingS, rawS, quality }[]`. `fmt` is imported at :32.)
b. `app/tests/recordflow_suite.ts`: append at the end of the file:
```ts
test('virgin-cycle22 02: no ‖ pause glyph and no "GPS live" anywhere a rider looks', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  for (const f of ['liveView.tsx', 'chips.tsx', 'rideHistoryModel.ts', 'RecordScreen.tsx', 'RideDetailScreen.tsx', 'RidesScreen.tsx', 'ReplayScreen.tsx', 'DemoScreen.tsx']) {
    assert(!read('src', 'ui', f).includes('‖'), `${f} still contains the ‖ glyph`);
  }
  const rec = read('src', 'ui', 'RecordScreen.tsx');
  assert(!rec.includes('GPS live') && !rec.includes('gpsLive') && !rec.includes('lastFixAgeS'), 'RecordScreen: GPS live label and its two dead consts are gone');
  assert(rec.includes('{flashMsg ?? \'\'}'), 'the quiet slot still carries the permission flash');
  const chips = read('src', 'ui', 'chips.tsx');
  assert(!chips.includes('glyph'), 'LiveBigChip has no glyph prop');
  assert(!read('src', 'ui', 'liveView.tsx').includes('glyph'), 'BigChipModel has no glyph field');
  const allow = read('tests', 'ui-strings.allow.json');
  assert(!allow.includes('"text": "GPS live"'), 'allow-list entry removed with the code');
});
```
c. In the SAME file, the existing virgin-cycle20 08 source test (~:279-288): in the `kept` array remove
   the first element `"'GPS live'"`; in the `gone` array (the `for (const gone of [` list just above,
   ~:280-286) add `'GPS live'` at the end of the last line (after `'settings.liveMap',`).
d. Run the suite: the two new tests FAIL and the cycle20 08 test FAILS (`RecordScreen still contains
   "GPS live"`) — record the three failure lines. (849 -> 851 tests, 3 fail.)

**Step 2 — `rideHistoryModel.ts` (:241-244).** Replace
```ts
      // clean or interrupted, with a real time (store/timing.ts).
      const tier = tierFor(v, h);
      const label = sec.quality === 'interrupted' ? `S${sec.index} ‖` : `S${sec.index}`;
      return { index: sec.index, label, timeLabel: fmt(v, 1), tier, avgLabel };
```
with
```ts
      // clean or interrupted, with a real time (store/timing.ts). virgin-cycle22 02
      // (Nathan 2026-10-04): no pause mark (U+2016) on an interrupted sector any more;
      // the flag still drives scoring (scoredS) and sector colours, the rider is not told.
      const tier = tierFor(v, h);
      return { index: sec.index, label: `S${sec.index}`, timeLabel: fmt(v, 1), tier, avgLabel };
```
   (Invariant 1 forbids the character even in comments — write "U+2016", never the glyph itself.)

**Step 3 — `liveView.tsx`.**
a. `BigChipModel` (:73-81): delete the line `glyph: string;`.
b. `bigFromSector` (:135-153): delete `glyph: '',` at :140 and :152 and the line `glyph: sec.interrupted ?
   '‖' : '',` at :146. Result for the done-not-estimated branch: `{ tier: tierOf(k, scoredS(sec)), lbl,
   time: fmtSec(scoredS(sec) ?? sec.rawS, 1), delta: '' }` with the existing comments kept.
c. `viewModelFromEngine` strip (:168-172): replace `label: sec.interrupted ? `${label} ‖` : label,` with
   `label,` and add above the `switch` (:164) the comment
   `// virgin-cycle22 02 (Nathan 2026-10-04): no pause mark (U+2016) on an interrupted sector; the flag only drives scoring.`
d. Render (:296-304): delete the line `glyph={vm.flash.glyph}`.
e. Header comments :11 "interrupted keeps its earned tier + ‖." -> "interrupted keeps its earned tier
   (no pause mark since virgin-cycle22 02)." and :28 "interrupted keeps earned tier + ‖." -> "interrupted
   keeps its earned tier, unmarked."
f. `grep -n "glyph" app/src/ui/liveView.tsx` and `grep -n "‖" app/src/ui/liveView.tsx` -> no hits.

**Step 4 — `chips.tsx` (`LiveBigChip` :55-94 only).** Delete `glyph: string;` (:59) and the line
`{props.glyph ? <Text style={{ fontWeight: '400' }}> {props.glyph}</Text> : null}` (:82) so row 1 is
`<Text style={[s.slbl, { color: text }]}>{props.lbl}</Text>`. Change NOTHING else in this file (no box,
border, fill, PB dot, styles). `PreviewScreen.tsx:204`: remove `glyph: st.glyph, ` from the object literal
`{ tier: st.tier, lbl: st.lbl, glyph: st.glyph, time: st.time, delta: st.delta, pb: st.pb }` (tsc
excess-property check on `LiveViewModel.flash`; the screen is unreachable but compiled). Nothing else in
`preview/` changes.

**Step 5 — `RecordScreen.tsx`.**
a. Delete :1063-1064 (`const lastFixAgeS = ...` two lines) and :1072 (`const gpsLive = ...`). Replace the
   comment block :1066-1071 with:
```ts
  // virgin-cycle20 brief 08 (Nathan, clutter review): the rotating status
  // slot is gone. virgin-cycle22 02 (Nathan 2026-10-05): the last status text,
  // "GPS live", is gone too — the slot below only carries the 5 s permission
  // flash (flashMsg) and is otherwise empty. The engine's route logic is
  // untouched; it is simply not narrated here any more.
```
   Check `now` (:1062 `stationary`) is still used — yes; do not remove it.
b. :1434-1439: JSX comment -> `{/* virgin-cycle20 08 / virgin-cycle22 02: one quiet slot — the 5 s flash
   of the foreground-only permission ask (Q5b) or nothing. Storage errors stay permanent below. */}` and
   the text child -> `{flashMsg ?? ''}`. Keep the `Animated.Text`, its style and opacity binding.
c. `grep -n "GPS live\|gpsLive\|lastFixAgeS" app/src/ui/RecordScreen.tsx` -> 0 hits. Related labels that
   STAY (do not touch): `'Location (GPS) is turned off'`, `PERM_*_MSG`, `GPS_FLASH_HOLD_MS`.

**Step 6 — `app/tests/ui-strings.allow.json`.** Remove the whole object `{ "file":
"src/ui/RecordScreen.tsx", "kind": "literal", "text": "GPS live", ... "by": "bootstrap" }` (keep the JSON
valid: watch the comma of the neighbouring entries). Do not touch the header, `legacyCount`, or any other
entry. Report in your final message: "removed 1 entry: RecordScreen.tsx literal 'GPS live'". No entry
is added by this brief.

**Step 7 — run everything.** Tests: **851 tests / 848 pass / 0 fail / 3 skip** (delta +2 vs the post-01
baseline). The ui-strings suite must be green (no `STALE`/`UNLISTED` violation). tsc exit 0.
`git diff --stat`: exactly the 8 files in Scope IN beyond the pre-existing modifications.

## Failed-before procedure (never git stash)
Step 1d is the failed-before record. To re-prove later: `cp app/src/ui/liveView.tsx
safe_to_delete/liveView.c22-02.bak`, re-insert one `‖` in a label, run (1 FAIL), restore with `cp` and `cmp`.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0.
- `grep -rn "‖" app/src/ui/*.ts app/src/ui/*.tsx` -> 0 hits (preview/ is a subfolder and is excluded by this glob).
- `grep -n "‖" app/src/ui/preview/data.ts | wc -l` -> unchanged (11) — proves preview/ untouched except PreviewScreen:204.
- `grep -n "glyph" app/src/ui/liveView.tsx app/src/ui/chips.tsx` -> 0 hits.
- `grep -n "GPS live" app/src/ui/RecordScreen.tsx app/tests/ui-strings.allow.json` -> 0 hits.
- `grep -n "interrupted" app/src/live/engine.ts app/src/store/derive.ts app/src/store/results.ts` -> unchanged vs `git diff` (no hunks from this brief).
- `git diff app/tests/ui-strings.allow.json` -> exactly one removed object.

## Added visible text
None. Removed: `GPS live` (RecordScreen literal). The ‖ glyph was never an allow-list entry.

## What changes on the phone / what does not
Changes (after OTA publish): during a ride, the sector strip labels read S1..S4 with no ‖ after a sector
in which you stopped; the gate flash shows the sector label without ‖; the quiet line under the live
pane no longer says "GPS live" (it still flashes the permission message when needed); after the ride,
the SECTORS list on the activity detail shows S1..S4 without ‖. Does NOT change: which sectors are
counted, times, tiers/colours, the stop handling in timing (an interrupted sector keeps its moving
time and tier), old rides (the stored flag is unchanged), "Location (GPS) is turned off", the box/
outline/fill look of the flash (separate item 2).

## Out of scope (do not do)
- Any restyle of the gate flash (item 2) — only the glyph line goes.
- `app/src/ui/preview/` content (dead mockup; only the type-only line at :204).
- Removing/renaming `interrupted` anywhere in core/, engine, store, storage, fixtures.
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs.

## Decisions taken by the Plan tier (logged, not asked)
1. `glyph` is REMOVED from `BigChipModel` and `LiveBigChip` (not left as an always-empty string): dead
   plumbing is the kind of thing the inspector flags, and the only other producer (PreviewScreen:204)
   is a one-property edit in unreachable code.
2. `ui/preview/` is left as-is (except that one line): nothing imports it (verified), its strings are
   mockup data, and ripping ‖ out of its "‖ 1 stop" prose would mean editing 5 allow-list entries of a
   screen nobody can open. The source test therefore targets the 8 rider-reachable files by name
   rather than a folder-wide grep.
3. `lastFixAgeS` goes with `gpsLive` (its only consumer); `now` stays (used by `stationary`).
4. The quiet slot keeps rendering `flashMsg ?? ''` rather than being unmounted when empty: the
   permission flash needs the slot, and an always-present empty Text keeps the layout from jumping.
5. The ui_strings_suite.ts fixture strings containing 'GPS live' are extractor test inputs, not app
   strings — untouched.
6. Comments are also scrubbed of the character so the source test can be a plain "file contains no
   U+2016" check (no comment-stripping logic to get wrong).
