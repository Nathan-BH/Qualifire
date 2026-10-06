# 08 — DEMO and REPLAY flash like the real ride: sector time at each gate, lap time at the finish, then the clock again (same FlashModel / LiveFlash contract as brief 04)

**Source: Nathan, 2026-10-05 23:41 (answer 2):** "DEMO and REPLAY must flash as well, for consistency
(today both have flash: null, per D8)." D8 F1/F2 (Opus, 2026-10-05) found that `demoLiveViewModel`
(demoModel.ts:362-363) and `replayLiveViewModel` (replayModel.ts:168-169) hand `LiveSectorPane` `flash:
null, flashKey: 0`, so neither surface has ever flashed, although demoModel's own doc comment claims
"what the demo shows IS what the rider sees" (:347-348) and REPLAY exists to re-watch a real ride. Both
also force the lap tier to `'neutral'` (cycle11 R5), which the real screen stopped doing in cycle20 07.
This brief gives both surfaces the real ride's pane behaviour through the SAME `FlashModel` and the same
`LiveFlash`/timers that brief 04 put in the pane: a sector flash at each crossed gate (2.5 s, tier text
colour, time only), the lap flash LAP_HANDOVER_MS after the final gate (2.5 s), then the clock again.
REPLAY derives gate times and tiers from the recorded ride's own rows (the ride-detail model, which
already runs the one shared tier rule `tierFor` from colourModel.ts); DEMO from its fixed script and
`demoTier`. Written by the Plan tier (Fable) on 2026-10-05 after reading the code; anchors verified
against the tree (HEAD 38002ff + uncommitted). Nothing is executed yet.

**Plan-tier consistency fix (Fable, 2026-10-06):** step 1c's recordflow test used to require the
substring `time: sectorRows[gatesDone - 1].timeLabel` while step 4c writes the flash through a `lastRow`
local (`time: lastRow.timeLabel`); the test now pins the `lastRow` form. Step 3's DemoScreen comment
anchors (a, c) were quoted as single lines although they wrap over two comment lines in the file; now
quoted as they are. Expected values of the demo tests were re-derived on the current tree
(demoTier: S1 purple, S2 green, S3 yellow, S4 green, lap green; lap with 1 prior lap = purple, not
neutral; fmt(185,1) = 3:05.0, fmt(207,1) = 3:27.0, fmt(237,1) = 3:57.0) — they hold. No intent change.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.

**Run order: 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 (this, last).** DEPENDS on 04 — the flash brief (`FlashModel`, `LiveFlash`,
`LAP_HANDOVER_MS`, the pane's lap-flash timer, `showLap` removed, `delta` gone from the lap literals in
demoModel/replayModel). Dependency check (STOP if any fails): `grep -n "export interface FlashModel"
app/src/ui/liveView.tsx` -> 1 hit; `grep -n "LAP_HANDOVER_MS" app/src/ui/liveView.tsx` -> >= 3 hits;
`grep -c showLap app/src/ui/DemoScreen.tsx app/src/ui/ReplayScreen.tsx` -> 0 and 0; `grep -n "delta"
app/src/ui/demoModel.ts app/src/ui/replayModel.ts` -> 0 hits.

## 0. What the code does today (verified 2026-10-05)

**The pane after 04 (contract this brief feeds):** `LiveViewModel { clock: Timebase | null; contextLabel;
flash: FlashModel | null; flashKey: number; lap: FlashModel | null; posChip; livePos?; strip }`
(liveView.tsx:97-113). The pane's sector-flash effect keys on `vm.flashKey` (`flashKey <= 0` -> off;
each CHANGE -> on for FLASH_HOLD_MS 2500); its lap-flash effect keys on `vm.lap !== null` (-> after
LAP_HANDOVER_MS 1100: sector flash off, lap flash on for FLASH_HOLD_MS, then off -> clock). Both timers
are REAL-time `setTimeout`s in the pane, independent of any simulated clock, and are cleared on unmount
or when `lap` goes back to null. `clockSize` is honoured by both the clock and the flash (04 decision 7).

**DEMO (`app/src/ui/DemoScreen.tsx`, `app/src/ui/demoModel.ts`):**
- `DemoScreen.tsx:673` `<LiveSectorPane vm={vm} clockSize={56} />` (post-04) for SECOND/TENTH RIDE;
  FIRST RIDE shows a text line instead. `:574` `const vm = demoLiveViewModel(script, clockS, Date.now(),
  livePos, DEMO_PRIOR_LAPS[mode]);` with the comment `:570-573` "View model built by hand — the demo has
  no engine, but it feeds the very same pane, so what you see here is what the Record screen would draw.
  Used by SECOND/TENTH RIDE only. R5: the lap chip stays neutral until STOP. Depth (R2): judged against
  the LAST DEMO_PRIOR_LAPS[mode] pinned laps."
- The demo CLOCK: `clockS` is React state set by `startTick()` (`:424-431`) every `TICK_MS = 33` (`:170`,
  "~30 fps redraw; sim time is wall-clock anchored so the rate is exact") from `demoSimSAt(anchorRef.current,
  Date.now())`; `demoLiveViewModel` hands the pane `clock: { anchorRealMs: nowMs, anchorClockMs: clockS *
  1000, rate: 1, running: false }` (demoModel.ts:362) — a FROZEN timebase re-anchored on every render, so
  `LapClock` shows `fmtClock(clockS * 1000)` and advances at 30 fps because the parent re-renders, while
  its own 100 ms ticker stays off (`running: false`). The digits DO visibly run (D8 F1 confirms). Pinned by
  `demo_suite.ts:229-240` ("timebase anchor is the demo clock", `running === false`).
- `demoModel.ts:354-376` `demoLiveViewModel(script, clockS, nowMs, livePos = null, priorLaps =
  DEMO_HISTORY[0].length)`: `gatesDone = script.gateAt.filter((g, i) => i > 0 && clockS >= g).length`;
  `contextLabel: gatesDone < 4 ? \`S${gatesDone + 1}\` : ''`; `flash: null, flashKey: 0`; `lap: gatesDone >=
  4 ? { tier: 'neutral' as Tier, time: demoFmtMS(script.lap) } : null` (post-04, no delta); `posChip:
  null`; `strip: script.secs.map((v, i) => ({ tier: i < gatesDone ? (demoTier(i + 1, v, priorLaps) as
  Tier) : 'none', label: \`S${i + 1}\`, time: i < gatesDone ? demoFmtMS(v) : undefined, current: i ===
  gatesDone }))`. Doc comment `:346-353` ("R5: the lap chip is 'neutral' once the lap lands (cycle11 R1 —
  the tier is the rank in disguise and is revealed after STOP by the tower, brief B)").
- Fixture (`demo_suite.ts:55-66`): `buildDemoScript()` -> `secs` [185, 207, 237, 207], `gateAt` [0, 185,
  392, 629, 836], `lap` 836; `demoTier` pins S1 purple, S2 green, S3 yellow, S4 green, lap (i=0, 836)
  GREEN against the full pinned history. `DEMO_PRIOR_LAPS = { first: 0, second: 1, tenth: WINDOW_PREV }`
  (:71). `demoFmtMS(s)` (:340-344) = `m:ss`, no decimal. `fmt(s, decimals)` from `colourModel.ts:221` is
  the shared `m:ss(.d)` formatter (same output as liveView's `fmtSec`); demoModel already imports
  `WINDOW_PREV, tierFor, type UiTier` from `./colourModel.ts` (:23) and `type Tier` from `./chips.tsx` (:25).
- End of the run: `DEMO_ROLL_OUT_S = 60` (demoModel.ts:128, "~2.4 real s at the default 25x. Long enough
  to read the neutral lap chip; brief C also needs every slower self to reach its finish inside it");
  `demoRunEndS(script) = script.lap + DEMO_ROLL_OUT_S` (:130); `startTick` calls `endRun()` when `next >=
  endS` -> phase 'ending' -> the pane UNMOUNTS (the ending screen replaces it). `DEMO_RATES = [5, 15, 25]`,
  default 25 (:382-384). Tests on the roll-out are relative (`demo_suite.ts:116` `demoRunEndS(script) ===
  836 + DEMO_ROLL_OUT_S`, `:117` `DEMO_ROLL_OUT_S >= 30`, `:553` uses `836 + DEMO_ROLL_OUT_S`).
- Scrub (virgin-cycle16 07): the demo clock can jump backwards/forwards; `gatesDone` follows `clockS`.
- Buzz: `DemoScreen.tsx:299-308` vibrates once per gate (`prevGates` ref) — untouched.
- `demo_suite.ts:190-204` test `'demoModel: the lap chip is neutral at the line (R5)'` asserts
  `atLine.lap!.tier === 'neutral'`, `time === '13:56'`, `posChip === null`, `livePos === null`, and roll-out
  (900) keeps the lap; `:206-227` strip fixture test; `:229-240` timebase test.

**REPLAY (`app/src/ui/ReplayScreen.tsx`, `app/src/ui/replayModel.ts`):**
- `ReplayScreen.tsx:36` props `{ rideId, wayId, startedAtMs, detail: RideDetailModel, onClose }`; `:134-141`
  `vm = useMemo(() => ready ? replayLiveViewModel(rider, detail.sectorRows, detail.lapLabel, clockS,
  replayTimebase(anchor), livePos) : null, [ready, rider, detail.sectorRows, detail.lapLabel, clockS,
  anchor, livePos])`; `:248` `<LiveSectorPane vm={vm} clockSize={56} />` (post-04). `detail` is the
  ride-detail model (`rideDetailModel.ts`): `sectorRows: SectorRowModel[]` (`rideHistoryModel.ts:219-246`
  `buildSectorRows`: `{ index, label 'S<n>', timeLabel ('m:ss.d' clean/interrupted via `fmt(v, 1)`,
  '~m:ss' estimated, '– did not traverse –' missed), tier (UiTier: `tierFor(v, h)` — THE shared tier
  rule, colourModel.ts:172-178 — or 'est'), avgLabel }`), `lapLabel` (`lapCellLabel`: `m:ss.d` for a scored
  lap, `~m:ss` estimated, `–` otherwise), `lapTier: UiTier` (`:127` `ignored ? 'neutral' : tierFor(lapS,
  hist)`). So the replay already carries the per-sector time + tier and the lap time + tier of the
  recorded ride, computed once by the same rule the live screen uses (`liveTierFor` -> `tierFor`; the
  only difference is the history window the detail model injects, which is the post-ride view the
  tower/ACTIVITIES show).
- The replay CLOCK: `clockS` state advanced every `REPLAY_TICK_MS = 50` while `anchor.playing`
  (`:84-100`); `replayTimebase(anchor)` is a RUNNING timebase while playing (the pane's own ticker runs).
  At `replayEndS(rider)` (= ride length + `REPLAY_ROLL_OUT_S = 10` when the finish was crossed,
  replayModel.ts:48/103) the tick parks the clock and sets `playing: false`; the pane stays MOUNTED
  (`:248`, `vm` stays non-null) under a `replay over · …` status line (`:223`). Scrub bar + speed dial
  (5/10/25) can move `clockS` anywhere.
- `replayModel.ts:147-175` `replayLiveViewModel(r, sectorRows, lapLabel, clockS, tb, livePos)`: `gatesDone
  = replayGatesDone(r, clockS)` (`:127-135`: the highest gate index `i >= 1` whose `gateMs[i] !== null &&
  <= nowMs`; a never-crossed gate is `null` and is skipped); strip from `sectorRows[k]` once `k + 1 <=
  gatesDone`; `allDone = gatesDone >= totalSectors`; `lap = allDone && r.finishMs !== null ? { tier:
  'neutral' as Tier, time: lapLabel } : null` (post-04); `flash: null, flashKey: 0`. Doc comment `:142-146`.
  Imports `type { LiveViewModel, Timebase, StripSlotModel } from './liveView.tsx'` (:18), `type {
  SectorRowModel } from './rideHistoryModel.ts'` (:19), `type { Tier } from './chips.tsx'` (:20).
- `replay_suite.ts:271-303` test `'replay: replayLiveViewModel fills the strip as gates are crossed and
  reveals the lap at the end'`: 4 `sectorRows` (S1 purple '3:05', S2 green '2:40', S3 yellow '3:20', S4
  neutral '1:10'), rider `gateMs: [0, 100000, 200000, 300000, 400000]`, `finishMs: 400000`; calls at
  clockS 0 / 200 / 400 with 6 positional args; asserts strip, contextLabel, livePos pass-through, lap
  `{ tier: 'neutral', time: '10:15' }` (post-04, no delta).
- Neither screen reads `settings.sectorColours` for the pane (D8 1d) — their map does; unchanged.

## Scope / non-scope

IN: `app/src/ui/demoModel.ts` (`demoLiveViewModel` flash + flashKey + real lap tier; `DEMO_ROLL_OUT_S`;
`fmt` import; doc comments), `app/src/ui/DemoScreen.tsx` (3 comments), `app/src/ui/replayModel.ts`
(`replayLiveViewModel` flash + flashKey + `lapTier` param; doc), `app/src/ui/ReplayScreen.tsx` (pass
`detail.lapTier`, deps), `app/tests/demo_suite.ts` (1 test rewritten, 1 added), `app/tests/replay_suite.ts`
(1 test added), `app/tests/recordflow_suite.ts` (1 source test).
OUT: `liveView.tsx`, `chips.tsx`, `tierColour.ts` (04's contract is consumed, not changed); the demo
clock mechanism (`running: false`, TICK_MS, `demoSimSAt`, scrub) — see decision 2; `REPLAY_ROLL_OUT_S`
(decision 4); `rideDetailModel.ts`/`rideHistoryModel.ts` (the tier rule and rows are reused, not
edited); `buildDemoReveal`/ranking reveal (post-STOP, untouched); the FIRST RIDE demo mode (no pane);
DEMO/REPLAY maps and their `sectorColours`; `ui/preview/`; any allow-list entry (no string changes).

## Target invariants

1. `demoLiveViewModel`: `flashKey = gatesDone`; `flash = gatesDone >= 1 ? { tier: demoTier(gatesDone,
   script.secs[gatesDone - 1], priorLaps), time: fmt(script.secs[gatesDone - 1], 1) } : null`; `lap =
   gatesDone >= 4 ? { tier: demoTier(0, script.lap, priorLaps), time: demoFmtMS(script.lap) } : null`
   (REAL lap tier — R5 retired, as cycle20 07 did on the real screen). Strip, contextLabel, clock
   (`running: false`, re-anchored) unchanged. For the TENTH RIDE fixture: flashes purple 3:05.0 / green
   3:27.0 / yellow 3:57.0 / green 3:27.0, lap green 13:56.
2. `replayLiveViewModel(r, sectorRows, lapLabel, clockS, tb, livePos, lapTier: Tier = 'neutral')`:
   `flashKey = gatesDone`; `flash = gatesDone >= 1 && sectorRows[gatesDone - 1] ? { tier:
   sectorRows[gatesDone - 1].tier as Tier, time: sectorRows[gatesDone - 1].timeLabel } : null` (written
   via a `lastRow` local in step 4c — the step 1c test pins `time: lastRow.timeLabel`); `lap =
   allDone && r.finishMs !== null ? { tier: lapTier, time: lapLabel } : null`. ReplayScreen passes
   `detail.lapTier`. Strip/contextLabel/livePos/clock unchanged. No second tier implementation: the
   tiers are the rows' (`tierFor` via the detail model).
3. The pane does the rest (04): each `flashKey` change flashes for 2.5 s in `clockSize` 56 typography;
   `lap` non-null -> lap flash after 1.1 s for 2.5 s -> clock. Scrubbing backwards past a gate changes
   `flashKey` and re-flashes the then-last gate (accepted — decision 5); scrubbing back before the finish
   sets `lap` null and cancels a pending lap flash (pane cleanup).
4. DEMO roll-out: `DEMO_ROLL_OUT_S = 125` so that at the fastest rate (25x) the run stays on the pane
   for 5.0 real s after the lap: 1.1 s S4 flash + 2.5 s lap flash + ~1.4 s of running clock before
   'ending'. (60 gave 2.4 s — the lap flash would have been cut by the unmount.) At 15x: 8.3 s; at 5x: 25 s.
5. REPLAY needs no roll-out change: the pane stays mounted after the replay parks, and the flash timers
   are real-time, so the lap flash completes and the (parked) clock returns under "replay over".
6. No rider-facing string added or removed; `ui-strings.allow.json` untouched.

## Steps (anchors by quoted content; line numbers are the pre-04 tree where 04 did not touch them)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short` (record). Baseline after 01-07: expect **863
tests / 860 pass / 0 fail / 3 skip** (chain: 856 after 03 -> 859 after 04 (flash) -> 860 (05) -> 862 (06) -> 863 (07)); tsc exit 0 (foreground, `timeout_ms: 180000`). Dependency check
in the header.

**Step 1 — tests first (failed-before).**
a. `app/tests/demo_suite.ts`: REPLACE the test `'demoModel: the lap chip is neutral at the line (R5)'`
   (`:190-204`, from `test(` to `});`) with
```ts
test('virgin-cycle22 08: the demo lap flashes its REAL tier at the line (fixture: green), time m:ss — R5 neutral retired as on the real screen (cycle20 07)', () => {
  const script = buildDemoScript();
  const T = 5000;
  const before = demoLiveViewModel(script, 835, T);
  assert(before.lap === null, `at 835 (before the line) expected lap === null, got ${JSON.stringify(before.lap)}`);

  const atLine = demoLiveViewModel(script, 836, T);
  assert(atLine.lap !== null, 'at 836 (the line) expected a lap');
  assert(atLine.lap!.tier === 'green', `expected the fixture's real lap tier 'green', got ${atLine.lap!.tier}`);
  assert(atLine.lap!.time === '13:56', `expected time '13:56', got ${atLine.lap!.time}`);
  assert(!('delta' in atLine.lap!), 'the lap is a FlashModel: tier + time only');
  assert(atLine.posChip === null, `expected posChip null, got ${atLine.posChip}`);
  assert(atLine.livePos === null, `expected livePos null, got ${atLine.livePos}`);

  const rollOut = demoLiveViewModel(script, 900, T);
  assert(rollOut.lap !== null && rollOut.lap.tier === 'green', 'roll-out (900) keeps the lap (the pane decides how long it flashes)');
  // SECOND RIDE depth (1 prior lap): the lap tier follows demoTier against that window, never a forced neutral
  const second = demoLiveViewModel(script, 836, T, null, 1);
  assert(second.lap !== null && second.lap.tier === demoTier(0, 836, 1) && second.lap.tier !== 'neutral', `second-ride lap tier = demoTier(0, 836, 1), got ${second.lap?.tier}`);
});

test('virgin-cycle22 08: the demo gate flash follows the fixture — flashKey = gates done, flash = the last done sector in m:ss.d and its tier; roll-out long enough for the lap flash at 25x', () => {
  const script = buildDemoScript();
  const T = 5000;
  const start = demoLiveViewModel(script, 100, T);
  assert(start.flash === null && start.flashKey === 0, `before gate 1: no flash, flashKey 0, got ${JSON.stringify([start.flash, start.flashKey])}`);
  const one = demoLiveViewModel(script, 185, T);
  assert(one.flashKey === 1 && one.flash !== null && one.flash.tier === 'purple' && one.flash.time === '3:05.0', `at gate 1: purple 3:05.0, got ${JSON.stringify(one.flash)} key ${one.flashKey}`);
  const two = demoLiveViewModel(script, 400, T);
  assert(two.flashKey === 2 && two.flash !== null && two.flash.tier === 'green' && two.flash.time === '3:27.0', `at 400 (2 gates): green 3:27.0, got ${JSON.stringify(two.flash)}`);
  const three = demoLiveViewModel(script, 700, T);
  assert(three.flashKey === 3 && three.flash !== null && three.flash.tier === 'yellow' && three.flash.time === '3:57.0', `at 700 (3 gates): yellow 3:57.0, got ${JSON.stringify(three.flash)}`);
  const line = demoLiveViewModel(script, 836, T);
  assert(line.flashKey === 4 && line.flash !== null && line.flash.tier === 'green' && line.flash.time === '3:27.0', `at the line: S4 green 3:27.0, got ${JSON.stringify(line.flash)}`);
  // the strip keeps m:ss (no decimal) — the decimal lives in the flash, as on the real screen
  assert(line.strip[0].time === '3:05', `strip keeps m:ss, got ${line.strip[0].time}`);
  // depth: SECOND RIDE (1 prior lap) flashes with the same depth as its strip
  const second = demoLiveViewModel(script, 400, T, null, 1);
  assert(second.flash !== null && second.flash.tier === second.strip[1].tier, 'flash tier == strip tier for the same sector and depth');
  // DEMO_ROLL_OUT_S: at the fastest rate the pane must stay up for the 1.1 s handover + 2.5 s lap flash + ~1 s of clock
  const fastest = Math.max(...DEMO_RATES);
  assert(DEMO_ROLL_OUT_S / fastest >= 4.6, `DEMO_ROLL_OUT_S ${DEMO_ROLL_OUT_S} gives ${(DEMO_ROLL_OUT_S / fastest).toFixed(1)} real s at ${fastest}x; need >= 4.6`);
});
```
   `demoTier`, `DEMO_RATES`, `DEMO_ROLL_OUT_S`, `buildDemoScript`, `demoLiveViewModel` are already imported
   (`:36-42`, `demoTier` at the import block's start — verify with grep; add it if missing).
b. `app/tests/replay_suite.ts`: after the test `'replay: replayLiveViewModel fills the strip as gates are
   crossed and reveals the lap at the end'` (ends `:~303`) add
```ts
test('virgin-cycle22 08: the replay flashes each crossed gate from the ride\'s own rows and the lap in its real tier — same FlashModel as the live screen', () => {
  const sectorRows = [
    { index: 0, label: 'S1', timeLabel: '3:05.2', tier: 'purple' as const, avgLabel: '3:10' },
    { index: 1, label: 'S2', timeLabel: '2:40.0', tier: 'green' as const, avgLabel: '2:50' },
    { index: 2, label: 'S3', timeLabel: '~3:20', tier: 'est' as const, avgLabel: '3:00' },
    { index: 3, label: 'S4', timeLabel: '1:10.9', tier: 'yellow' as const, avgLabel: '1:15' },
  ];
  const r: ReplayRider = {
    rideId: 'vm-flash', startMs: 0, finishMs: 400000, endMs: 400000,
    gateMs: [0, 100000, 200000, 300000, 400000],
    fixes: [{ tUnixMs: 0, lat: 0, lon: 0, sM: 0 }, { tUnixMs: 400000, lat: 0, lon: 0, sM: 0 }],
  };
  const tb = replayTimebase({ clockS: 0, realMs: 0, rate: 10, playing: true });
  const before = replayLiveViewModel(r, sectorRows, '10:15.3', 50, tb, null, 'purple');
  assert(before.flash === null && before.flashKey === 0, 'before gate 1: no flash, flashKey 0');
  const one = replayLiveViewModel(r, sectorRows, '10:15.3', 100, tb, null, 'purple');
  assert(one.flashKey === 1 && one.flash !== null && one.flash.tier === 'purple' && one.flash.time === '3:05.2', `gate 1: the row's tier + m:ss.d, got ${JSON.stringify(one.flash)}`);
  const three = replayLiveViewModel(r, sectorRows, '10:15.3', 350, tb, null, 'purple');
  assert(three.flashKey === 3 && three.flash !== null && three.flash.tier === 'est' && three.flash.time === '~3:20', `gate 3 estimated: est ~m:ss, got ${JSON.stringify(three.flash)}`);
  assert(three.lap === null, 'no lap before the finish');
  const done = replayLiveViewModel(r, sectorRows, '10:15.3', 400, tb, null, 'purple');
  assert(done.flashKey === 4 && done.flash !== null && done.flash.tier === 'yellow' && done.flash.time === '1:10.9', `finish gate: S4 yellow, got ${JSON.stringify(done.flash)}`);
  assert(done.lap !== null && done.lap.tier === 'purple' && done.lap.time === '10:15.3' && !('delta' in done.lap), `lap = (lapTier, lapLabel), got ${JSON.stringify(done.lap)}`);
  // scrub back before the finish: lap null again (the pane cancels a pending lap flash), flashKey follows gatesDone
  const back = replayLiveViewModel(r, sectorRows, '10:15.3', 250, tb, null, 'purple');
  assert(back.lap === null && back.flashKey === 2 && back.flash !== null && back.flash.tier === 'green', 'scrub back: lap null, flash = gate 2');
  // default lapTier (6-arg callers) stays neutral; a gate without a row (rows shorter than gates) flashes nothing
  const noTier = replayLiveViewModel(r, sectorRows, '10:15.3', 400, tb, null);
  assert(noTier.lap !== null && noTier.lap.tier === 'neutral', 'lapTier default is neutral');
  const fewRows = replayLiveViewModel(r, sectorRows.slice(0, 2), '10:15.3', 300, tb, null, 'green');
  assert(fewRows.flashKey === 3 && fewRows.flash === null, 'no row for the crossed gate -> no flash, key still counts');
});
```
c. `app/tests/recordflow_suite.ts`, append at the end:
```ts
test('virgin-cycle22 08: DEMO and REPLAY feed the pane a real flash — no `flash: null` left, replay passes the ride\'s lap tier', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  const demo = read('src', 'ui', 'demoModel.ts');
  const replay = read('src', 'ui', 'replayModel.ts');
  for (const [name, src] of [['demoModel.ts', demo], ['replayModel.ts', replay]] as const) {
    assert(!src.includes('flash: null'), `${name} still hands the pane flash: null`);
    assert(!src.includes('flashKey: 0'), `${name} still hands the pane flashKey: 0`);
    assert(src.includes('flashKey: gatesDone'), `${name}: flashKey is the gates-done count`);
    assert(!src.includes("'neutral' as Tier, time"), `${name}: the lap tier is no longer forced neutral`);
  }
  assert(demo.includes('time: fmt(script.secs[gatesDone - 1], 1)'), 'demo flash time is m:ss.d via the shared fmt');
  assert(demo.includes('tier: demoTier(0, script.lap, priorLaps)'), 'demo lap tier is demoTier(0, …)');
  assert(demo.includes('export const DEMO_ROLL_OUT_S = 125;'), 'demo roll-out lengthened for the lap flash');
  assert(replay.includes('lapTier: Tier = \'neutral\'') && replay.includes('time: lastRow.timeLabel'), 'replay flash = the row (lastRow); lapTier param');
  const screen = read('src', 'ui', 'ReplayScreen.tsx');
  assert(screen.includes('detail.lapTier,') && screen.includes('detail.lapTier]') , 'ReplayScreen passes detail.lapTier and lists it in the memo deps');
  assert(!read('src', 'ui', 'DemoScreen.tsx').includes('stays neutral'), 'DemoScreen comments no longer promise a neutral lap chip');
});
```
d. Run the suite: the rewritten demo test FAILS (`expected the fixture's real lap tier 'green', got
   neutral`), the new demo test FAILS (`before gate 1 … ` passes, `at gate 1: purple 3:05.0, got null`),
   the new replay test FAILS (tsc-strip runs it: `gate 1: the row's tier + m:ss.d, got null`), the
   recordflow test FAILS (`demoModel.ts still hands the pane flash: null`). Record the four lines.
   (863 -> 866 tests, 4 fail.)

**Step 2 — `app/src/ui/demoModel.ts`.**
a. Import (`:23`): `import { WINDOW_PREV, tierFor, type UiTier } from './colourModel.ts';` -> `import {
   WINDOW_PREV, fmt, tierFor, type UiTier } from './colourModel.ts';`
b. Roll-out (`:126-128`): replace the doc comment + constant with
```ts
/** R3: simulated seconds the clock keeps running past the lap before the run auto-STOPs
 *  (5.0 real s at the fastest 25x: the 1.1 s handover + 2.5 s lap flash + ~1.4 s of running clock,
 *  virgin-cycle22 08 — was 60 = 2.4 s, enough for a fixed lap chip, not for a flash that hands the
 *  slot back). Brief C also needs every slower self to reach its finish inside it (>= 30). */
export const DEMO_ROLL_OUT_S = 125;
```
c. `demoLiveViewModel` doc (`:346-353`): replace "R5: the lap chip is 'neutral' once the lap lands (cycle11
   R1 — the tier is the rank in disguise and is revealed after STOP by the tower, brief B); sectors keep
   their tiers; posChip null." with "virgin-cycle22 08: the pane flashes exactly as on the bike — the last
   done sector (m:ss.d, its demoTier) at each gate via flashKey = gatesDone, and the lap in its REAL
   demoTier at the line (cycle11 R5's forced neutral is retired, as cycle20 07 did on the real screen);
   posChip null."
d. Body (`:361-375`): replace `flash: null,` / `flashKey: 0,` / the `lap:` expression with
```ts
    // virgin-cycle22 08: the flash is the last done sector — same depth (priorLaps) as its strip slot.
    flash: gatesDone >= 1
      ? { tier: demoTier(gatesDone, script.secs[gatesDone - 1], priorLaps) as Tier, time: fmt(script.secs[gatesDone - 1], 1) }
      : null,
    flashKey: gatesDone,
    lap: gatesDone >= 4
      ? { tier: demoTier(0, script.lap, priorLaps) as Tier, time: demoFmtMS(script.lap) }
      : null,
```
   (`clock`, `contextLabel`, `posChip`, `livePos`, `strip` unchanged. `demoTier` returns `UiTier`, a subset
   of `Tier` — the `as Tier` mirrors the strip's existing cast.)
e. `grep -n "neutral" app/src/ui/demoModel.ts` -> only pre-existing hits unrelated to the lap literal
   (e.g. tierFor docs); `grep -n "flash" app/src/ui/demoModel.ts` -> the new lines only.

**Step 3 — `app/src/ui/DemoScreen.tsx` (comments only).**
a. `:42-43`, a sentence wrapped over two comment lines: ` * into an 'ending' screen. Lap chip is neutral before the run ends, exactly as the`
   / ` * real screen since the ranking reveal. FIRST RIDE's SAVE now continues into` -> replace the
   sentence "Lap chip is neutral before the run ends, exactly as the real screen since the ranking
   reveal." with "At the line the LAP time flashes in its real tier like a sector, then the clock runs on
   (virgin-cycle22 08, same pane behaviour as the real screen)." and rewrap the two lines as you like;
   the sentences before and after it stay.
b. `:572` "Used by SECOND/TENTH RIDE only. R5: the lap chip stays neutral until STOP." -> "Used by
   SECOND/TENTH RIDE only. Flashes at each gate and at the line like the real screen (virgin-cycle22 08)."
c. `:422-423`, wrapped over two comment lines: `  // R3: the clock keeps running DEMO_ROLL_OUT_S past the lap (long enough`
   / `  // to read the neutral lap chip) and then ends the run into 'ending'.` -> the parenthetical
   "(long enough to read the neutral lap chip)" becomes "(long enough for the S4 flash, the lap flash
   and a second of running clock at 25x — virgin-cycle22 08)"; rewrap as needed.
d. `grep -n "neutral lap\|stays neutral" app/src/ui/DemoScreen.tsx` -> 0 hits. No code change in this file.

**Step 4 — `app/src/ui/replayModel.ts`.**
a. Doc comment (`:142-146`): replace the `lap = ...` and `flash null, flashKey 0` sentences with
   "lap = every gate done AND r.finishMs !== null ? {tier: lapTier (the ride's real lap tier from the
   detail model; default 'neutral'), time: lapLabel} : null; flash = the last crossed gate's row (tier +
   timeLabel, m:ss.d / ~m:ss) or null before gate 1, flashKey = gatesDone (virgin-cycle22 08 — the pane
   flashes it exactly as on the bike); posChip null, livePos passed through, clock = tb."
b. Signature (`:147-150`): add a 7th parameter `lapTier: Tier = 'neutral',` after `livePos: string | null,`.
c. Body: `const lap = allDone && r.finishMs !== null ? { tier: 'neutral' as Tier, time: lapLabel } :
   null;` -> `const lap = allDone && r.finishMs !== null ? { tier: lapTier, time: lapLabel } : null;`; add
   right after it
```ts
  // virgin-cycle22 08: the flash is the last crossed gate's own row — the same tier rule (tierFor via
  // the detail model) and the same m:ss.d label the SECTORS list shows; no second implementation.
  const lastRow = gatesDone >= 1 ? sectorRows[gatesDone - 1] : undefined;
  const flash = lastRow ? { tier: lastRow.tier as Tier, time: lastRow.timeLabel } : null;
```
   and in the returned object `flash: null,` -> `flash,` and `flashKey: 0,` -> `flashKey: gatesDone,`.
d. `grep -n "flash\|lapTier" app/src/ui/replayModel.ts` -> the new lines + doc only.

**Step 5 — `app/src/ui/ReplayScreen.tsx` (`:134-141`).** The call `replayLiveViewModel(rider as
ReplayRider, detail.sectorRows, detail.lapLabel, clockS, replayTimebase(anchor), livePos,)` -> append
`detail.lapTier,` as the last argument; the `useMemo` deps `[ready, rider, detail.sectorRows,
detail.lapLabel, clockS, anchor, livePos]` -> `[ready, rider, detail.sectorRows, detail.lapLabel, clockS,
anchor, livePos, detail.lapTier]`. (`detail.lapTier` is `UiTier`, assignable to `Tier`.) Nothing else.

**Step 6 — run everything.** Tests: **866 tests / 863 pass / 0 fail / 3 skip** (delta +3 vs post-07 (keep-awake):
demo_suite +1 net (one rewritten), replay_suite +1, recordflow_suite +1). tsc exit 0. ui-strings suite
green, allow-list untouched. `git diff --stat`: exactly `demoModel.ts`, `DemoScreen.tsx`, `replayModel.ts`,
`ReplayScreen.tsx`, `demo_suite.ts`, `replay_suite.ts`, `recordflow_suite.ts` beyond the pre-existing
modifications (DemoScreen/ReplayScreen also carry 04's one-token edits).

## Failed-before procedure (never git stash)
Step 1d is the record. To re-prove: `cp app/src/ui/demoModel.ts safe_to_delete/demoModel.c22-08.bak`, set
`flash: null,` back -> the new demo test and the recordflow test FAIL; restore with `cp` and `cmp`. Same
for `replayModel.ts` (`flash: null` -> replay test FAILS).

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0.
- `grep -n "flash: null\|flashKey: 0" app/src/ui/demoModel.ts app/src/ui/replayModel.ts` -> 0 hits.
- `grep -n "demoTier(0" app/src/ui/demoModel.ts` -> the lap literal (+ pre-existing docs if any).
- `git diff app/src/ui/liveView.tsx app/src/ui/chips.tsx` -> no hunks from this brief (04's only).
- Arithmetic: `125 / 25 = 5.0 s`, `125 / 15 = 8.3 s`, `125 / 5 = 25 s` real roll-out; the pane's lap
  flash ends at 1.1 + 2.5 = 3.6 s after the line.
- Read-through of the pane's timers against the replay's parked clock: `tb.running` false after
  `replayEndS` does not stop a real-time `setTimeout`; the flash completes; `LapClock` then shows the
  parked `fmtClock`. Scrub: `lap` null -> cleanup clears the pending handover/hold.
- DEMO FIRST RIDE unaffected (`mode === 'first'` renders a text line, DemoScreen.tsx:673).

## Added visible text
None. `ui-strings.allow.json` untouched (state this in the report).

## What changes on the phone / what does not
Changes (after OTA publish): DEMO > SECOND RIDE / TENTH RIDE — at each simulated gate the 56 pt demo
clock is replaced for 2.5 s by that sector's time with one decimal in its tier colour (TENTH: purple
3:05.0, green 3:27.0, yellow 3:57.0, green 3:27.0), then the clock again; at the line the lap time 13:56
flashes GREEN (TENTH) / its real tier (SECOND) 1.1 s after the S4 flash, then the clock runs on for a few
seconds before the ending screen (the run now rolls out 125 sim-seconds instead of 60: 5 s at 25x, 8 s
at 15x, 25 s at 5x). ACTIVITIES > a ride > REPLAY — the same sequence from the recorded ride: each
crossed gate flashes that sector's SECTORS-list time and colour (estimated sectors flash dim `~m:ss`),
the finish flashes the ride's lap time in the tier the ACTIVITIES big lap time shows, then the parked
clock returns under "replay over". Scrubbing re-flashes the gate you land after. Does NOT change: the
demo and replay clocks' speed/scrub/speed dial, the strip, the maps and the Sector colours toggle, the
ranking reveal after the demo run, stored rides, the real RECORD screen (brief 04), FIRST RIDE.

## Out of scope (do not do)
- Changing the demo clock to a running timebase (decision 2) or `TICK_MS`.
- `REPLAY_ROLL_OUT_S` (decision 4), `REPLAY_TICK_MS`, scrub behaviour.
- Any change to `liveView.tsx` / `chips.tsx` / `tierColour.ts` / `rideHistoryModel.ts` / `rideDetailModel.ts`.
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs.

## Decisions taken by the Plan tier (logged, not asked)
1. **Replay tiers/times come from `detail.sectorRows` and `detail.lapTier`/`lapLabel`** — the rows the
   SECTORS list and the big lap time already show for that ride, computed by `tierFor` (colourModel.ts),
   the same rule `liveTierFor` applies live. No new tier computation in replayModel (Nathan: "no second
   implementation"). The history window differs from the live one only in that it is the post-ride view
   (the detail model's pool) — the same numbers the tower revealed after that ride's STOP.
2. **The demo clock is NOT changed**: it already runs visibly (30 fps re-render of a frozen, re-anchored
   timebase, D8 F1). Keeping `running: false` avoids a second ticker inside the pane and leaves the
   pinned timebase test (`demo_suite.ts:229-240`) intact. The flash replaces digits that are moving.
3. **R5 (forced-neutral lap in DEMO/REPLAY) is retired**: the real screen shows the real lap tier since
   cycle20 07; a demo that flashes a neutral lap while the rider's own screen flashes green would be the
   inconsistency Nathan is removing. TENTH RIDE's lap is green by fixture; SECOND's follows `demoTier(0,
   836, 1)`. The post-STOP ranking reveal is unaffected (it never read the pane).
4. **`DEMO_ROLL_OUT_S` 60 -> 125** (the only way the lap flash and a glimpse of the clock fit before the
   demo unmounts the pane at 25x); replay needs nothing (pane stays mounted, timers are real-time).
   Pinned relative to `DEMO_RATES` max in demo_suite.
5. **Scrubbing (demo + replay) re-flashes the gate you land after** (flashKey = gatesDone changes).
   Accepted: it is the simplest honest behaviour ("this is the last sector you have passed") and the
   alternative (a monotonic fire counter) needs state the pure models do not have.
6. **`lapTier` is an optional 7th parameter** (default `'neutral'`) so the three existing replay_suite
   calls compile unchanged and the default documents the pre-08 behaviour; ReplayScreen always passes it.
7. **Demo flash time via `fmt(v, 1)`** from colourModel (shared `m:ss.d`), strip stays `demoFmtMS` (m:ss)
   — exactly the live split (strip m:ss, flash m:ss.d).
8. **Four tests fail before** (one rewritten, three new); no allow-list change.
