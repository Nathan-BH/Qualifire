# 04 — The live gate flash AND the finish flash are time only: clock-sized digits in the tier text colour, no box, no label, no delta, no rank; same look for every tier, both themes, whatever "Sector colours" says; after the finish flash the clock runs again

**Numbering note:** two Plan sessions wrote briefs in parallel on 2026-10-05 ~21:30-22:00. This flash brief
is **04** (the number this README announced first; the map/keep-awake briefs for items 5-7 took 05/06/07)
and its DEMO/REPLAY companion is **08** (next free NN). A draft of this brief briefly existed as `07-…`;
the superseded first draft is in `safe_to_delete/04-live-flash-time-only.v1-superseded.md`.

**Source: Nathan, 2026-10-04 (README "Clarification from Nathan (2026-10-04, item 2)") + 2026-10-05
(decision after reading D8): "i just found it lacked consistency, that's the fix i want; lets encode
proper behavior and i will run a proper test of it with immediate note taking." + 2026-10-05 23:41
(answer 1, overruling the planner's first decision): "the lap result at the finish must match the sector
flash: it flashes ONLY the lap time (same style: clock digits, tier colour via tierTextColour, no
box/label/delta/rank text) for the same 2.5 s hold, THEN THE CLOCK RUNS AGAIN."** What Nathan saw on the
phone (dark, toggle OFF: a yellow sector flashed bare yellow time, no rectangle, no label; dark, toggle
ON: a purple sector = whole rectangle filled purple; day, toggle ON: a green sector = green outline +
an `S#` label top-left) is exactly the per-tier chip grammar of `chipColors` in `chips.tsx` (purple =
filled box with near-black ink, green = outline, yellow/neutral = bare text, est = grey dashed) plus the
`S{k}` label row of `LiveBigChip`. D8 (Opus, 2026-10-05, read-only) proved the "Sector colours" toggle has
NO code path to the flash — it only feeds the live map's sector-spans layer — so the inconsistency IS the
tier-dependent chip shape, not the toggle. The fix: BOTH flashes (sector at each gate, lap at the finish)
become ONE text, the frozen time, set in the same typography as the lap clock they mask, coloured by
the shared `tierTextColour` (brief 03). No `View` box, no border, no fill, no dashed outline, no label,
no delta, no PB dot, no rank chip. The 2.5 s replace-not-overlay behaviour is unchanged for the sector
flash (README clarification: "the SAME 2.5 s replacement behaviour as today"); the lap flash gets the same
hold and, unlike today's terminal lap chip, hands the slot BACK to the running clock. Written by the Plan
tier (Fable) on 2026-10-05 after re-verifying every anchor against the tree (HEAD 38002ff + uncommitted;
baseline re-measured 848/845/0/3, tsc exit 0). Nothing is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.

**Run order: 01 -> 02 -> 03 -> 04 (this) -> 05 -> 06 -> 07 -> 08.** This brief DEPENDS on 02 (which removes
`glyph` from `BigChipModel` and `LiveBigChip`; the anchors below are the post-02 text) and on 03 (which
creates the pure `tierTextColour(tier, t)` in `app/src/ui/tierColour.ts` with `PURPLE_TEXT_NIGHT`
#C364FF, `GREEN_TEXT_DAY` #007A00, `YELLOW_TEXT_DAY` #8C6900, and adds `relLum`/`contrast`/`TIERS`
helpers to `ridedetail_suite.ts` which step 1c reuses). It edits `RecordScreen.tsx` (3 small deletions),
which 02 (before) and 07 (keep-awake, after) also edit — anchors are by content. 05/06 (wayMapView) are unrelated.
Dependency check (STOP if any fails): `grep -c glyph app/src/ui/chips.tsx app/src/ui/liveView.tsx` ->
0 and 0; `grep -n "export function tierTextColour" app/src/ui/tierColour.ts` -> 1 hit; `grep -n "^const
TIERS\|^function contrast" app/tests/ridedetail_suite.ts` -> 2 hits. Do not improvise missing pieces.

## 0. What the code does today (verified 2026-10-05 against the pre-02 tree; post-02 deltas noted)

**The sector flash path (D8 §1 agrees):**
- `app/src/ui/RecordScreen.tsx:1424-1433` mounts `<LiveSectorPane vm={viewModelFromEngine(live,
  realTimebase(session.startedAtMs), null, tierOf, livePos)} showLap={showLap} />`. `tierOf` (:1092-1093)
  = `liveTierFor(live.track, sectorIndex, timeS, session?.rideId)` (colourModel.ts). No settings read.
  The pane sits in `styles.raceColumn` (:1701-1702, `backgroundColor: t.race.bg`): night `colors.bg`
  #0A0A0A, day #FFFFFF (theme.ts:77/91). RecordScreen is the ONLY surface that flashes today (D8 F1/F2:
  demoModel.ts:362-363 and replayModel.ts:168-169 hand the pane `flash: null, flashKey: 0` — brief 08).
- `app/src/ui/liveView.tsx`:
  - `:73-81` `interface BigChipModel { tier: Tier; waiting?: boolean; lbl: string; glyph: string; time:
    string; delta: string; pb?: boolean; }` (post-02: no `glyph` line). `:83-87` `interface LapChipModel {
    tier: Tier; time: string; delta: string; }`.
  - `:135-153` `bigFromSector(k, sec, tierOf)`: `lbl = \`S${k}\``; estimated -> `{ tier: 'est', lbl, time:
    \`~${fmtSec(sec.rawS)}\`, delta: '– –' }`; done -> `{ tier: tierOf(k, scoredS(sec)), lbl, time:
    fmtSec(scoredS(sec) ?? sec.rawS, 1), delta: '' }`; missed -> `{ tier: 'est', lbl, time: '– –', delta:
    '' }`. `waiting`/`pb` are NEVER set from the engine — the only producers are `ui/preview/data.ts`
    (dead mockup) via `PreviewScreen.tsx:204`.
  - `:183-186` `flash = bigFromSector(lastDone, ...)`; `:188-202` the lap: `st.lap.estimated ? { tier:
    'est', time: st.lap.rawS !== null ? \`~${fmtSec(st.lap.rawS)}\` : '– –', delta: '– –' } : { tier:
    tierOf(0, scoredS(st.lap) ?? st.lap.rawS ?? null), time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0),
    delta: '' }` (lap time has NO decimal — `fmtSec` doc :118 "sector times get one decimal, lap/estimated
    times none"); `:211` `flashKey: st.gateFires`.
  - `:218-238` `LapClock({ tb, clockSize })`: one `<Text style={[clockStyles.clock, clockSize != null ?
    { fontSize: clockSize } : null, { color: tb ? t.text : t.textDim }]}>`; `:240-248` `clockStyles.clock
    = { fontSize: 92, fontWeight: '800', textAlign: 'center', letterSpacing: -1, fontVariant:
    ['tabular-nums'] }`.
  - `:255-316` `LiveSectorPane({ vm, showLap = true, clockSize })`: `flashOn` effect on `vm.flashKey`,
    `FLASH_HOLD_MS = 2500` (:116, :263-271); `:273` `const lapTakesSlot = vm.lap !== null && showLap; //
    terminal — the counter never resumes`; the `bigSlot` (:285-308) renders, in priority: `lapTakesSlot &&
    vm.lap` -> `<View style={paneStyles.lapRow}><View style={{ flex: 1 }}><LiveLapChip tier time delta
    /></View>{vm.posChip ? <PosChip label={vm.posChip} /> : null}</View>`; else `flashOn && vm.flash` ->
    `<LiveBigChip ... />` (:295-304; post-02 without `glyph=`); else `<LapClock tb={vm.clock}
    clockSize={clockSize} />`. `:329` `lapRow` style. `clockSize` 56 is passed by DemoScreen.tsx:673 and
    ReplayScreen.tsx:248 (`<LiveSectorPane vm={vm} showLap clockSize={56} />`); RecordScreen passes none.
  - Header comments `:1-29` describe the chip flash, "interrupted keeps its earned tier (no pause mark
    since virgin-cycle22 02)" (post-02 wording at :11 and :28), and `:11-14` "At the final gate the LAP
    result takes the slot terminally (~1.1 s after the gate, cutting the sector flash short per §2a.1),
    plus a static tower-position chip when a tower source exists (B-28 UNBUILT ...)".
  - Imports `:33` `import { LiveBigChip, LiveLapChip, PosChip, StripSlot, Tier } from './chips';`.

**The finish / lap path today:**
- Engine (`app/src/live/engine.ts`): the way is one-shot — `phase: 'idle' | 'detecting' | 'locked' |
  'finished'` (:156); when the pick's FINISH gate fires, `this.lap = { rawS, stoppedS, movingS, estimated
  }` is set ONCE and `this.phase = 'finished'` (:576-595, "D-022 handover ... the lap is scored once");
  `lastDone` = the final sector index at that same emit (:408-412), `gateFires` increments (:428). There is
  no next lap and no automatic stop: the recording continues (whole-ride elapsed clock keeps running,
  `realTimebase` anchored at recording start, `running: true`) until the rider presses STOP. The engine is
  NOT touched by this brief.
- `RecordScreen.tsx:247` `const [showLap, setShowLap] = useState(false);`; `:429-439`:
```ts
  // LAYOUT §2a: the lap chip appears ~1.1 s after the final gate, with the
  // lap earcon — never simultaneously with the sector chip.
  const lapScored = live.lap !== null;
  useEffect(() => {
    if (!lapScored) {
      setShowLap(false);
      return;
    }
    const id = setTimeout(() => setShowLap(true), 1100);
    return () => clearTimeout(id);
  }, [lapScored]);
```
  `showLap` is used ONLY as the pane prop (:1432) — grep `showLap` in RecordScreen: 3 hits (:247, :434/:437
  inside the effect, :1432). There is NO lap earcon in code (grep `earcon` in RecordScreen: only this
  comment; `location/index.ts:617` buzzes per gate fire, the FINISH gate included) — the 1.1 s is purely
  the visual handover. `live.lap` is also read at `:1224-1227` (livePos goes null once the lap lands —
  untouched) and `:1415` (`liveState` 'finished' for the map — untouched).
- `chips.tsx:96-114` `LiveLapChip({ tier, time, delta })`: a `View` with `s.liveLap` (`borderRadius,
  borderWidth: 2, padding, row`) + `chipColors` bg/border, children `"LAP"` label (`s.llbl`), time (`s.lt`,
  42 px), delta (`s.ld`). Used ONLY by liveView.tsx:289. `:146-158` `PosChip({ label })` — used ONLY by
  liveView.tsx:293; on the real screen `posChip` is ALWAYS null (RecordScreen:1428 comment "virgin-cycle11
  R1: the rank is revealed after STOP by the tower, never here"; demoModel/replayModel also null; only the
  dead PreviewScreen:208 passes one). Styles `liveLap, llbl, lt, ld` (:181-194) and `posChip,
  posChipText` (:198-206) belong to those two components.
- What the lap chip carries and where else it is shown: the lap TIME (shown after STOP by the timing
  tower reveal `tower.tsx` — its own "LAP" allow-list entry at ui-strings.allow.json:~3651 — and as the
  big lap time on the ACTIVITIES detail, brief 03) and its TIER (same two places: `rankingRevealModel` /
  `rideDetailModel.lapTier`); the DELTA is always `''` or `'– –'` (D-021: no reference); the RANK (`PosChip`)
  is never shown live (R1). So nothing the rider needs disappears with the chip — the only loss is the
  word "LAP" itself during the 2.5 s flash (decision 3).
- Allow-list: `ui-strings.allow.json:1726-1732` `{ "file": "src/ui/chips.tsx", "kind": "text", "text":
  "LAP", "reason": "bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)", "since":
  "2026-10-02", "by": "bootstrap" }` — the ONLY chips.tsx entry; goes stale with `LiveLapChip` -> removed.
  The tower.tsx "LAP" entry (:~3651) stays. `'– –'`, `~`, `S${k}`: never entries (extractor needs two
  letters, ui_strings_extract.ts:124). NO liveView.tsx entry exists.
- Other consumers of `LapChipModel`/`.lap.delta`: `demoModel.ts:364-366` (`lap: gatesDone >= 4 ? { tier:
  'neutral' as Tier, time: demoFmtMS(script.lap), delta: '' } : null`), `replayModel.ts:164` (`const lap =
  allDone && r.finishMs !== null ? { tier: 'neutral' as Tier, time: lapLabel, delta: '' } : null;`) and
  its doc comment `:146` ("lap = ... {tier: 'neutral', time: lapLabel, delta: ''} : null;"),
  `PreviewScreen.tsx:206` (`lap: lap ? { tier: lap.tier, time: lap.t, delta: lap.d } : null,`),
  `tests/replay_suite.ts:301` (`... && done.lap.delta === ''`), `tests/demo_suite.ts:193-203` (reads
  `.lap.tier` / `.lap.time` only — fine). Tests cannot load liveView.tsx/chips.tsx (JSX).
- Nothing in `liveView.tsx`, `chips.tsx` or `tierColour.ts` reads `settings`, `useSettings` or
  `sectorColours` (grep, 0 hits) — the toggle-independence already holds; this brief PINS it (step 1b).

**Why a plain text and not a "transparent chip":** keeping `LiveBigChip`/`LiveLapChip` with `bg/border`
forced transparent would leave 2 px of invisible border + padding + a 64/42 px font that is NOT the
clock's 92 px, i.e. the digits would still visibly shrink and jump when the flash replaces the clock.
Nathan's rule is "sector time in tier colour on the timer digits": same digits, other colour. So both
flashes are rendered with `clockStyles.clock` itself, next to `LapClock`, and both chips go.

**Colour per tier (via `tierTextColour`, brief 03) and contrast on the RACE ground the pane sits on
(WCAG 2.x; 92 px / 800 is "large text": AA = 3.0; scored tiers are still held to 4.5). Palette = the
planner's default (Nathan 2026-10-05 23:41: he will not decide colours); each value is one constant:**

| tier | night (`race.bg` #0A0A0A) | day (`race.bg` #FFFFFF) |
|---|---|---|
| purple | `PURPLE_TEXT_NIGHT` #C364FF **6.21** (old chip fill #9000C8 as text would be 2.85) | `colors.purple` #9000C8 **6.95** |
| green | `colors.green` #00D000 **9.45** | `GREEN_TEXT_DAY` #007A00 **5.55** |
| yellow | `YELLOW_TIER` #F5C542 **12.21** | `YELLOW_TEXT_DAY` #8C6900 **5.08** |
| neutral (no verdict) | `t.accentText` = #F5C542 **12.21** (identical to yellow in dark mode — pre-existing, D8 §2) | `t.accentText` #B98A0A **3.13** (large-text AA ok; theme token, left alone) |
| est / none | `t.textDim` #9a978f **6.79** | `t.textDim` #8A8577 **3.68** |

(Script: brief 03 §0; the inspector reruns it with `#0A0A0A` / `#FFFFFF` as ground.) The lap clock
itself is `t.text` (night #F4F2EC 17.69, day #201F24 16.37) — a flash is always "a bit less white than
the clock", which is the intended cue.

## Scope / non-scope

IN: `app/src/ui/liveView.tsx` (model types, `bigFromSector`, lap builder, new `LiveFlash` component next
to `LapClock`, pane state/effects/render, imports, header comments), `app/src/ui/chips.tsx` (delete
`LiveBigChip`, `LiveLapChip`, `PosChip` + their styles; nothing else), `app/src/ui/RecordScreen.tsx`
(delete the `showLap` state, its effect and the prop — 3 deletions), `app/src/ui/DemoScreen.tsx` and
`app/src/ui/ReplayScreen.tsx` (remove the `showLap` attribute, one token each), `app/src/ui/demoModel.ts`
and `app/src/ui/replayModel.ts` (drop `delta: ''` from the lap literal; replayModel doc line), `app/src/ui/preview/PreviewScreen.tsx`
(TWO object literals, type-only), `app/tests/ui-strings.allow.json` (remove ONE entry), `app/tests/recordflow_suite.ts`
(2 source tests), `app/tests/ridedetail_suite.ts` (1 pure pin test), `app/tests/replay_suite.ts` (one
assertion loses `&& done.lap.delta === ''`).
OUT: `chipColors`, `PURPLE_INK`, `StripSlot` (byte-identical); `LapClock`, `FLASH_HOLD_MS`, the sector
flash effect, `bigSlot`; `tierColour.ts` (03's helper is consumed, not changed); the engine
(`live/engine.ts`), `live/towerSource.ts`, `tower.tsx` (post-STOP reveal), `rankingRevealModel.ts`;
making DEMO/REPLAY flash (brief 08); `ui/preview/` beyond the two literals; `settings.tsx`; the lap
`tier` rule in demoModel/replayModel (`'neutral'` stays here — 08 decides it); `core/`, store, storage.

## Target invariants

1. ONE component `LiveFlash({ time, tier, clockSize })` renders ONE `Text` in `clockStyles.clock` (same
   `fontSize` 92 / `clockSize` override, weight, letterSpacing, tabular-nums, centre) with `color:
   tierTextColour(tier, t)`. No `View` wrapper of its own, no border/background/padding, no label, no
   delta, no PB marker, no rank chip — for EVERY tier incl. 'est' and 'neutral' (they differ only by colour).
2. `FlashModel` (renamed from `BigChipModel`) is `{ tier: Tier; time: string }` and is ALSO the lap's
   type: `LiveViewModel.flash: FlashModel | null`, `LiveViewModel.lap: FlashModel | null`; `LapChipModel`
   is gone. `bigFromSector` returns exactly `{ tier, time }`: est `{ tier: 'est', time:
   \`~${fmtSec(sec.rawS)}\` }`, done `{ tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ??
   sec.rawS, 1) }`, missed `{ tier: 'est', time: '– –' }`. The lap builder keeps its tier and time
   expressions byte-identical and drops `delta`. All time strings are unchanged (lap: no decimal).
3. Sequence at the FINISH gate (the only gate that scores a lap): the final sector's flash starts with the
   gate fire (as at every gate); `LAP_HANDOVER_MS = 1100` later the lap flash takes the slot (cutting the
   sector flash short, LAYOUT §2a.1 — same 1.1 s as today, now owned by the pane); it holds
   `FLASH_HOLD_MS` (2.5 s); then the slot returns to the running clock (whole-ride elapsed, as the
   engine keeps timing until STOP). The lap flash never recurs (the lap is scored once); the sector
   flash does not come back after it.
4. `chips.tsx` has no `LiveBigChip`, `LiveLapChip`, `PosChip`, no `liveBig, liveRow1, slbl, sdelta,
   stime, liveLap, llbl, lt, ld, posChip, posChipText` styles. `chipColors`, `StripSlot`, `PURPLE_INK`,
   `YELLOW_TIER`/`tierLineColour` re-exports: byte-identical. `ChipPalette` stays (chipColors' type).
5. `LiveSectorPane` props are `{ vm, clockSize? }` — `showLap` is gone (the pane owns the handover
   timing); RecordScreen has no `showLap`/`setShowLap`; DemoScreen/ReplayScreen pass `vm` + `clockSize`
   only. `LiveViewModel.posChip` stays in the model (accepted, not rendered — decision 4).
6. Toggle independence, pinned: `liveView.tsx`, `chips.tsx`, `tierColour.ts` contain none of
   `sectorColours`, `useSettings`, `settings`.
7. The allow-list loses exactly the chips.tsx "LAP" entry; the tower.tsx "LAP" entry and `legacyCount`
   are untouched; the ui-strings suite is green.
8. tsc exit 0.

## Steps (anchors by quoted content; line numbers are the pre-02 tree, "≈" where 02/06 shift them)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short` (record). Baseline after 01-03: expect
**856 tests / 853 pass / 0 fail / 3 skip** (chain: 848 -> 849 (01) -> 851 (02) -> 856 (03)); if a brief
was skipped, the delta below (+3) still applies to whatever you measure.
tsc exit 0 (foreground, `timeout_ms: 180000`; ~80 s on this mount). Run the dependency check in the
header.

**Step 1 — tests first (failed-before).**
a. `app/tests/recordflow_suite.ts`, append at the end of the file:
```ts
test('virgin-cycle22 04: the gate flash and the finish flash are time only — clock typography, tier text colour, no chip box, no label, no delta, no rank', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  const lv = read('src', 'ui', 'liveView.tsx');
  const chips = read('src', 'ui', 'chips.tsx');
  // the two chips and the rank chip are gone, with their styles
  for (const gone of ['LiveBigChip', 'BigChipModel', 'LiveLapChip', 'LapChipModel', 'PosChip', 'liveBig', 'liveRow1', 'slbl', 'sdelta', 'stime', 'liveLap', 'llbl', 'posChipText', 'lapRow'])
    assert(!chips.includes(gone) && !lv.includes(gone), `"${gone}" still exists in chips.tsx or liveView.tsx`);
  // one model for both flashes: (tier, time) and nothing else
  assert(lv.includes('export interface FlashModel {\n  tier: Tier;\n  time: string;\n}'), 'FlashModel is exactly { tier, time }');
  assert(lv.includes('flash: FlashModel | null;') && lv.includes('lap: FlashModel | null;'), 'flash and lap share FlashModel');
  assert(lv.includes("return { tier: 'est', time: `~${fmtSec(sec.rawS)}` };"), 'estimated flash: ~m:ss, dim, nothing else');
  assert(lv.includes('return { tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ?? sec.rawS, 1) };'), 'done flash: tier + m:ss.d');
  assert(lv.includes("return { tier: 'est', time: '– –' };"), 'missed flash: – –');
  const builder = lv.slice(lv.indexOf('function bigFromSector('), lv.indexOf('export function viewModelFromEngine('));
  for (const gone of ['delta', 'lbl', 'pb', 'waiting', 'glyph'])
    assert(!builder.includes(gone), `bigFromSector still produces "${gone}"`);
  const lapBuilder = lv.slice(lv.indexOf('let lap: FlashModel | null = null;'), lv.indexOf('const contextLabel ='));
  assert(lapBuilder.length > 0 && !lapBuilder.includes('delta'), 'the lap builder carries no delta');
  assert(lapBuilder.includes('time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0)'), 'lap time string unchanged (no decimal)');
  for (const gone of ['lbl', 'pb?:', 'waiting?:', 'delta: string'])
    assert(!lv.includes(gone), `a model still carries "${gone}"`);
  // one Text, styled like the clock it replaces, coloured by the shared helper
  assert(lv.includes("import { tierTextColour } from './tierColour';"), 'liveView imports tierTextColour');
  assert(lv.includes('function LiveFlash({ time, tier, clockSize }'), 'LiveFlash component exists');
  const flashBody = lv.slice(lv.indexOf('function LiveFlash('), lv.indexOf('const clockStyles'));
  assert(flashBody.includes('clockStyles.clock') && flashBody.includes('{ color: tierTextColour(tier, t) }'), 'LiveFlash uses the clock style + tierTextColour');
  for (const gone of ['<View', 'border', 'backgroundColor', 'padding', 'chipColors', '●', 'LAP'])
    assert(!flashBody.includes(gone), `LiveFlash must not contain "${gone}" (no box, no fill, no marker, no label)`);
  // the pane: lap flash first (after the 1.1 s handover, for one hold), then sector flash, then the clock
  assert(lv.includes('export const LAP_HANDOVER_MS = 1100;') && lv.includes('export const FLASH_HOLD_MS = 2500;'), 'handover + hold constants');
  assert(lv.includes('<LiveFlash time={vm.lap.time} tier={vm.lap.tier} clockSize={clockSize} />'), 'lap flash renders LiveFlash');
  assert(lv.includes('<LiveFlash time={vm.flash.time} tier={vm.flash.tier} clockSize={clockSize} />'), 'sector flash renders LiveFlash');
  assert(lv.includes('<LapClock tb={vm.clock} clockSize={clockSize} />'), 'the clock branch is untouched');
  assert(lv.indexOf('lapFlashOn && vm.lap ?') < lv.indexOf('flashOn && vm.flash ?'), 'lap flash outranks the sector flash in the slot');
  assert(lv.includes('setTimeout(() => setLapFlashOn(false), FLASH_HOLD_MS)'), 'the lap flash ends after one hold — the clock runs again');
  assert(!lv.includes('lapTakesSlot') && !lv.includes('terminal'), 'the lap result is no longer terminal in the slot');
  assert(lv.includes('{ vm: LiveViewModel; clockSize?: number }'), 'LiveSectorPane props: vm + clockSize only (showLap gone)');
  // RecordScreen no longer owns the handover; the engine is untouched
  const rec = read('src', 'ui', 'RecordScreen.tsx');
  assert(!rec.includes('showLap') && !rec.includes('setShowLap') && !rec.includes('lapScored'), 'RecordScreen: showLap state/effect/prop gone');
  for (const f of ['DemoScreen.tsx', 'ReplayScreen.tsx']) assert(!read('src', 'ui', f).includes('showLap'), `${f} still passes showLap`);
  assert(read('src', 'live', 'engine.ts').includes("this.phase = 'finished';"), 'engine untouched: one-shot lap, phase finished');
  // the stale allow-list entry went with the chip; the tower keeps its own LAP
  const allow = read('tests', 'ui-strings.allow.json');
  assert(!allow.includes('"file": "src/ui/chips.tsx"'), 'no chips.tsx allow-list entry left (LAP went with LiveLapChip)');
  assert(allow.includes('"file": "src/ui/tower.tsx",\n      "kind": "text",\n      "text": "LAP"'), 'tower.tsx keeps its LAP entry');
});

test('virgin-cycle22 04: the flash never reads the Sector colours setting — tier and theme are its only inputs (pinned, D8)', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  for (const f of ['liveView.tsx', 'chips.tsx', 'tierColour.ts']) {
    const src = read('src', 'ui', f);
    for (const forbidden of ['sectorColours', 'useSettings', 'settings'])
      assert(!src.includes(forbidden), `${f} reads "${forbidden}" — the flash must not depend on a setting`);
  }
  const lv = read('src', 'ui', 'liveView.tsx');
  assert(lv.includes("import { StripSlot, Tier } from './chips';"), 'liveView takes only the strip slot and Tier from chips');
});
```
b. `app/tests/ridedetail_suite.ts`, append at the end (AFTER brief 03's `relLum`/`contrast`/`TIERS`
   helpers and its tierTextColour tests — it reuses them; `night`/`daylight`/`colors`/`tierTextColour`/
   `YELLOW_TIER` are imported there by 03; add `PURPLE_TEXT_NIGHT, GREEN_TEXT_DAY, YELLOW_TEXT_DAY` to the
   existing `from '../src/ui/tierColour.ts'` import):
```ts
test('virgin-cycle22 04: the flash colour per tier x theme on the RACE ground (race.bg), pinned — what Nathan should see at each gate and at the finish', () => {
  // Night: brand green/yellow, readable purple tint. Day: brand purple, deep green/gold. est/none dim, neutral = accentText.
  assert(tierTextColour('purple', night) === PURPLE_TEXT_NIGHT && tierTextColour('green', night) === colors.green && tierTextColour('yellow', night) === YELLOW_TIER, 'night flash colours');
  assert(tierTextColour('purple', daylight) === colors.purple && tierTextColour('green', daylight) === GREEN_TEXT_DAY && tierTextColour('yellow', daylight) === YELLOW_TEXT_DAY, 'day flash colours');
  for (const t of [night, daylight]) {
    for (const tier of ['purple', 'green', 'yellow'] as const) {
      const r = contrast(tierTextColour(tier, t), t.race.bg);
      assert(r >= 4.5, `${tier} flash on ${t.statusBar === 'light' ? 'night' : 'day'} race ground ${t.race.bg}: ${r.toFixed(2)} < 4.5`);
    }
    for (const tier of ['neutral', 'est', 'none'] as const) {
      const r = contrast(tierTextColour(tier, t), t.race.bg);
      assert(r >= 3.0, `${tier} flash (92 px, large text) on ${t.race.bg}: ${r.toFixed(2)} < 3.0`);
    }
    // a flash is always a shade off the clock's ink, never the same colour as the ticking digits
    for (const tier of TIERS) assert(tierTextColour(tier, t) !== t.text, `${tier} flash must not be the clock ink ${t.text}`);
  }
});
```
c. `app/tests/replay_suite.ts:~301`: `assert(done.lap !== null && done.lap.tier === 'neutral' &&
   done.lap.time === '10:15' && done.lap.delta === '',` -> drop ` && done.lap.delta === ''` (the lap model
   has no delta any more; the assertion message `expected the lap chip once finished` -> `expected the
   lap once finished`).
d. Run the suite: the two recordflow tests FAIL (first assertion: `"LiveBigChip" still exists`; second:
   liveView still imports `LiveBigChip`); the ridedetail pin PASSES already (it pins 03's helper on a
   ground 03 did not test — a pin, not a failed-before; say so in the report); replay_suite stays green.
   Record the two failure lines. (856 -> 859 tests, 2 fail.)

**Step 2 — `app/src/ui/liveView.tsx`.**
a. Imports (`:33`): `import { LiveBigChip, LiveLapChip, PosChip, StripSlot, Tier } from './chips';` ->
   `import { StripSlot, Tier } from './chips';` and add, right after `import { useTheme } from
   './themeContext';`: `import { tierTextColour } from './tierColour';`
b. Models (`:73-87`): replace `export interface BigChipModel { ... }` AND `export interface LapChipModel {
   tier: Tier; time: string; delta: string; }` (both, post-02 ≈ 7 + 5 lines) with the single
```ts
/** A flash in the clock's slot (virgin-cycle22 04, Nathan 2026-10-04/05): the frozen time and the
 * tier that colours it — nothing else. No label, no delta, no PB marker, no rank, no box: a flash is
 * the lap clock's own digits in another colour for FLASH_HOLD_MS. Used for BOTH the sector flash at
 * each gate (`time` = `m:ss.d`; `~m:ss` for an estimated sector, D-011/D-013; `– –` for a missed gate)
 * and the lap flash at the finish (`time` = `m:ss`, no decimal, as the lap has always been shown). */
export interface FlashModel {
  tier: Tier;
  time: string;
}
```
c. `LiveViewModel` (`:97-113`): `flash: BigChipModel | null;` -> `flash: FlashModel | null;` (keep its
   doc line); `lap: LapChipModel | null;` -> add a doc line above it and retype:
```ts
  /** the lap result once the FINISH gate scored it (one-shot) — flashes LAP_HANDOVER_MS after that
   *  gate for FLASH_HOLD_MS, then the clock runs again until STOP */
  lap: FlashModel | null;
```
   `posChip` doc (`:107`): append ` virgin-cycle22 04: accepted, NOT rendered — the rank is revealed
   after STOP by the tower (cycle11 R1); kept so the three producers need no signature change.`
d. `bigFromSector` (`:135-153`, post-02 ≈ :135-151): replace the whole function with
```ts
function bigFromSector(k: number, sec: LiveSector, tierOf: TierSource): FlashModel {
  if (sec.kind === 'done') {
    if (sec.estimated) {
      // D-011/D-013: gap-derived — ~raw, no decimal; 'est' -> textDim, no verdict.
      return { tier: 'est', time: `~${fmtSec(sec.rawS)}` };
    }
    // cycle 008: real tier from the ghost history, via the injected source.
    // virgin-cycle22 04: the time alone; no label row, nothing to compare against (D-021: no reference yet).
    return { tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ?? sec.rawS, 1) };
  }
  // 'missed' (skipped gate / offroute): no data — dim dashes.
  return { tier: 'est', time: '– –' };
}
```
   (The source test greps this function's body for the words `delta`, `lbl`, `pb`, `waiting`, `glyph` —
   keep them out of its comments too.)
e. Flash type at `:183` -> `const flash: FlashModel | null =`. Lap builder (`:188-202`): `let lap:
   LapChipModel | null = null;` -> `let lap: FlashModel | null = null;`; delete the two `delta` lines
   (`delta: '– –',` in the estimated branch and `delta: '', // no lap reference yet (D-021)` in the
   scored branch) — tier/time expressions stay byte-identical (the source test pins
   `time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0)`). The word "delta" must not remain between
   `let lap:` and `const contextLabel` (comments included).
f. Constants: after `export const FLASH_HOLD_MS = 2500;` (`:116`) add
```ts
/** LAYOUT §2a: the lap flash follows the final gate's sector flash by this much (cutting it short,
 * §2a.1) — the handover the screens used to time themselves (RecordScreen's showLap, until
 * virgin-cycle22 04). Owned by the pane now, so every surface (RECORD, DEMO, REPLAY) sequences alike. */
export const LAP_HANDOVER_MS = 1100;
```
g. New component: directly AFTER `LapClock`'s closing `}` (`:238`) and BEFORE `const clockStyles =`
   (`:240`), insert
```tsx

/** A flash (virgin-cycle22 04): a frozen time — the completed sector's at a gate, the lap's at the
 * finish — set EXACTLY like the lap clock it masks (same clockStyles.clock, same clockSize override)
 * and coloured by the shared tier text colour. One Text: no box, no frame, no fill, no label, no
 * delta, no marker, no rank; identical shape for every tier and both themes. (The source test greps
 * this component for box/fill words — keep this comment free of them.) The "Sector colours" setting is the live MAP's
 * (D8, 2026-10-05); it is not read here and must never be. Nathan 2026-10-04: "sector time in tier
 * colour on the timer digits"; 2026-10-05: the finish flashes only the lap time the same way. */
function LiveFlash({ time, tier, clockSize }: { time: string; tier: Tier; clockSize?: number }) {
  const { t } = useTheme();
  return (
    <Text
      style={[
        clockStyles.clock,
        clockSize != null ? { fontSize: clockSize } : null,
        { color: tierTextColour(tier, t) },
      ]}
    >
      {time}
    </Text>
  );
}
```
h. The pane (`:252-316`). Doc comment `:252-254` -> `/** The pane. Owns both flash timers: a sector
   flash at each gate fire (FLASH_HOLD_MS), and at the finish the lap flash LAP_HANDOVER_MS after the
   final gate (LAYOUT §2a — it cuts the sector flash short, §2a.1) for one FLASH_HOLD_MS; then the slot
   is the running clock's again (virgin-cycle22 04 — the lap result used to be fixed in the slot). */`.
   Signature: `export function LiveSectorPane({ vm, showLap = true, clockSize, }: { vm: LiveViewModel;
   showLap?: boolean; clockSize?: number })` -> `export function LiveSectorPane({ vm, clockSize }: { vm:
   LiveViewModel; clockSize?: number })`.
   After the existing `flashOn` state/effect (`:259-271`, untouched) add:
```tsx
  // Finish: the lap is scored once (engine phase 'finished'); LAP_HANDOVER_MS after that gate the lap
  // flash takes the slot from the sector flash (which does not come back), holds FLASH_HOLD_MS, then
  // the whole-ride clock runs again until STOP. Nathan 2026-10-05: same look as the sector flash.
  const [lapFlashOn, setLapFlashOn] = useState(false);
  const lapScored = vm.lap !== null;
  useEffect(() => {
    if (!lapScored) {
      setLapFlashOn(false);
      return;
    }
    let hold: ReturnType<typeof setTimeout> | null = null;
    const handover = setTimeout(() => {
      setFlashOn(false);
      setLapFlashOn(true);
      hold = setTimeout(() => setLapFlashOn(false), FLASH_HOLD_MS);
    }, LAP_HANDOVER_MS);
    return () => {
      clearTimeout(handover);
      if (hold) clearTimeout(hold);
    };
  }, [lapScored]);
```
   Delete `const lapTakesSlot = vm.lap !== null && showLap; // terminal — the counter never resumes` (`:273`).
   Replace the `bigSlot` children (`:286-307`, post-02 ≈ :285-305: from `{lapTakesSlot && vm.lap ? (` to the
   closing `)}` before `</View>`) with
```tsx
        {lapFlashOn && vm.lap ? (
          <LiveFlash time={vm.lap.time} tier={vm.lap.tier} clockSize={clockSize} />
        ) : flashOn && vm.flash ? (
          <LiveFlash time={vm.flash.time} tier={vm.flash.tier} clockSize={clockSize} />
        ) : (
          <LapClock tb={vm.clock} clockSize={clockSize} />
        )}
```
   (If the old block still has a `glyph={vm.flash.glyph}` line, 02 was not applied -> STOP.)
   Delete `lapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },` from
   `paneStyles` (`:329`). Keep `pane`, `ctx`, `bigSlot`, `strip`.
i. Header comments (`:1-29`). Replace the sentence starting "At each gate the" (`:7`) through "(B-28
   UNBUILT on the real screen — see live/towerSource.ts)." (`:14`) with:
```
 * not a benchmark; follow-up brief R10). At each gate the completed sector's
 * frozen time REPLACES the digits in its tier's text colour for ~2.5 s
 * (virgin-cycle22 04: same clock typography, no box/label/delta — only the
 * colour says the tier; estimated = dim ~time; interrupted keeps its earned
 * tier, unmarked) — masking, never pausing: the clock runs underneath and
 * reappears already honest. At the final gate the LAP time flashes the same
 * way, LAP_HANDOVER_MS after that gate (cutting the sector flash short, §2a.1),
 * for one hold — then the whole-ride clock runs again until STOP (the lap chip
 * used to stay in the slot; the rank is revealed after STOP by the tower, R1).
```
   (keep the `P4` context-row sentence that precedes it intact — adjust the join so the paragraph still
   reads; the exact wrap is yours). In the Honesty paragraph (`:26-28`) replace "estimated renders
   dashed-grey ~time, delta suppressed; interrupted keeps its earned tier, unmarked." (post-02 text) with
   "estimated flashes a dim ~time; there is no delta anywhere in a flash (D-021); interrupted keeps its
   earned tier, unmarked." No "dashed", "grey", "box", "chip", "terminal" or "delta blank" wording about
   the flash may remain in this file (the source test forbids the word `terminal` file-wide).
j. `grep -n "LiveBigChip\|LiveLapChip\|PosChip\|BigChipModel\|LapChipModel\|lbl\|waiting\|pb\b\|delta\|showLap\|lapTakesSlot\|lapRow\|terminal" app/src/ui/liveView.tsx` -> 0 hits.

**Step 3 — `app/src/ui/chips.tsx`.**
a. Delete the doc comment + function `LiveBigChip` (`/** The big last-completed-sector chip (LAYOUT §2):
   ...` through its closing `}` — pre-02 :53-94, post-02 :53-92), the doc comment + function `LiveLapChip`
   (`/** The lap chip at the final-gate handover (LAYOUT §2a): below the sector` / ` * chip, same tier
   language, appears once ~1.1 s after the gate. */` through `}` — :96-114) and the doc comment + function
   `PosChip` (`/** Static tower-position chip at the final-gate handover (LAYOUT §2a beat 2,` ... through
   `}` — :146-158). `StripSlot` (:116-144) stays byte-identical.
b. In `makeChipStyles` delete the entries `liveBig`, `liveRow1`, `slbl`, `sdelta`, `stime` (:162-180),
   `liveLap`, `llbl`, `lt`, `ld` (:181-194) and `posChip`, `posChipText` (:198-206). Remaining: `slot`,
   `slotBar`, `slotText` — byte-identical.
c. Header comment (`:1-6`): change "Shared tier-chip language (LAYOUT §6: filled > outlined > flat, no
   red, grey = no-data only)." to "Shared tier palette + the strip slot (LAYOUT §6: filled > outlined >
   flat, no red, grey = no-data only). The big chips are gone since virgin-cycle22 04 — a flash is the
   clock's digits in tierTextColour (liveView.tsx)." Keep the rest.
d. Imports: `radius` (`:9`) becomes unused (it was used by `liveLap`/`posChip` only) -> change `import {
   PaddockTheme, colors, radius } from './theme';` to `import { PaddockTheme, colors } from './theme';`.
   `useMemo`, `StyleSheet`, `Text`, `View`, `useTheme`, `YELLOW_TIER`, `tierLineColour`, `colors` are
   still used (StripSlot, chipColors). If tsc reports another unused import, STOP (noUnusedLocals is not
   expected to be on; this step is for cleanliness, not for tsc).
e. `grep -n "LiveBigChip\|LiveLapChip\|PosChip\|liveBig\|slbl\|sdelta\|stime\|liveRow1\|liveLap\|llbl\|posChip\|radius" app/src/ui/chips.tsx`
   -> 0 hits. `grep -n "chipColors\|PURPLE_INK\|StripSlot\|ChipPalette" app/src/ui/chips.tsx` -> all present.

**Step 4 — `app/src/ui/RecordScreen.tsx` (three deletions; anchors by content, 02/06 shift lines).**
a. Delete `const [showLap, setShowLap] = useState(false);` (`:247`).
b. Delete the block quoted in §0 from `// LAYOUT §2a: the lap chip appears ~1.1 s after the final gate,
   with the` through `}, [lapScored]);` (`:429-439`, 11 lines) and replace it with the two-line comment
   `// virgin-cycle22 04: the final-gate handover (1.1 s, LAP_HANDOVER_MS) is timed by LiveSectorPane
   itself now — nothing to sequence here.` (keep one blank line around it; do NOT write the word showLap
   or lapScored in it — the source test greps for them).
c. Delete the line `showLap={showLap}` (`:1432`). In the JSX comment above the pane (`:1419-1423`)
   change "virgin-cycle11 R1: posChip is always null now — the rank is revealed after STOP by the timing
   tower, never announced here." to "virgin-cycle11 R1: posChip is always null — the rank is revealed
   after STOP by the timing tower, never announced here. virgin-cycle22 04: at the finish the LAP time
   flashes like a sector, then this clock runs on until STOP."
d. `grep -n "showLap\|setShowLap\|lapScored" app/src/ui/RecordScreen.tsx` -> 0 hits. `useState` is still
   imported/used elsewhere (many). `live.lap` reads at ≈:1224-1227 and ≈:1415 untouched.

**Step 5 — DEMO / REPLAY screens and models (type-only + one token each; 08 does the real work).**
a. `app/src/ui/DemoScreen.tsx:673`: `<LiveSectorPane vm={vm} showLap clockSize={56} />` -> `<LiveSectorPane
   vm={vm} clockSize={56} />`. `app/src/ui/ReplayScreen.tsx:248`: same edit.
b. `app/src/ui/demoModel.ts:364-366`: `? { tier: 'neutral' as Tier, time: demoFmtMS(script.lap), delta:
   '' }` -> `? { tier: 'neutral' as Tier, time: demoFmtMS(script.lap) }`. (Tier rule untouched here — 08.)
c. `app/src/ui/replayModel.ts:164`: `{ tier: 'neutral' as Tier, time: lapLabel, delta: '' }` -> `{ tier:
   'neutral' as Tier, time: lapLabel }`; doc comment `:146` "`{tier: 'neutral', time: lapLabel, delta:
   ''} : null;`" -> "`{tier: 'neutral', time: lapLabel} : null;`".
d. `app/src/ui/preview/PreviewScreen.tsx` (≈:202-206): `{ tier: st.tier, lbl: st.lbl, time: st.time,
   delta: st.delta, pb: st.pb }` -> `{ tier: st.tier, time: st.time }`; `lap: lap ? { tier: lap.tier, time:
   lap.t, delta: lap.d } : null,` -> `lap: lap ? { tier: lap.tier, time: lap.t } : null,`. Nothing else in
   `preview/` changes (`data.ts` keeps its own fields — its own types; PreviewScreen's own `chipColors`/
   `PURPLE_INK` imports at :25 still resolve).

**Step 6 — `app/tests/ui-strings.allow.json`.** Remove the whole object `{ "file": "src/ui/chips.tsx",
"kind": "text", "text": "LAP", "reason": "bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)",
"since": "2026-10-02", "by": "bootstrap" }` (≈:1726-1732; keep the JSON valid — watch the neighbours'
commas). Do not touch the header, `legacyCount`, the tower.tsx "LAP" entry or any other entry. Report:
"removed 1 entry: chips.tsx text 'LAP' (LiveLapChip deleted)". No entry is added.

**Step 7 — run everything.** Tests: **859 tests / 856 pass / 0 fail / 3 skip** (delta +3 vs post-03: 2
recordflow, 1 ridedetail; replay_suite count unchanged). ui-strings suite green (no STALE/UNLISTED). tsc
exit 0. `git diff --stat`: exactly `liveView.tsx`, `chips.tsx`, `RecordScreen.tsx`, `DemoScreen.tsx`,
`ReplayScreen.tsx`, `demoModel.ts`, `replayModel.ts`, `PreviewScreen.tsx`, `ui-strings.allow.json`,
`recordflow_suite.ts`, `ridedetail_suite.ts`, `replay_suite.ts` beyond the pre-existing modifications.

## Failed-before procedure (never git stash)
Step 1d is the record. To re-prove later that the box test bites: `cp app/src/ui/liveView.tsx
safe_to_delete/liveView.c22-04.bak`, wrap `LiveFlash`'s `<Text>` in `<View style={{ borderWidth: 2 }}>`,
run (recordflow test FAILS: `LiveFlash must not contain "<View"`), restore with `cp` and `cmp`. For the
"clock runs again" rule: change `setTimeout(() => setLapFlashOn(false), FLASH_HOLD_MS)` to a no-op ->
FAILS `the lap flash ends after one hold`; restore + cmp. For the toggle pin: add `const _x =
'sectorColours';` -> the second test FAILS; restore + cmp.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0 (foreground, 180 s budget).
- `grep -rn "LiveBigChip\|LiveLapChip\|PosChip\|BigChipModel\|LapChipModel" app/src app/App.tsx` -> 0 hits
  (the recordflow test names them inside a `gone` string list — expected there, none in src).
- `grep -n "showLap" app/src/ui/*.tsx` -> 0 hits.
- `grep -n "sectorColours\|useSettings\|settings" app/src/ui/liveView.tsx app/src/ui/chips.tsx app/src/ui/tierColour.ts` -> 0.
- `git diff app/src/ui/chips.tsx`: only deletions + the header phrase + the `radius` import;
  `chipColors`, `StripSlot` have no hunks.
- `git diff app/src/ui/liveView.tsx`: `LapClock`, `clockStyles`, the sector flash effect, the strip
  have no hunks.
- `git diff app/src/live/engine.ts` -> no hunks from this brief.
- `git diff app/tests/ui-strings.allow.json` -> exactly one removed object (+ 02's "GPS live" removal).
- Recompute the contrast table in §0 against `t.race.bg` (#0A0A0A / #FFFFFF) — every cell to 2 decimals.
- Timing read-through: at the FINISH emit `gateFires` increments AND `lap` becomes non-null in the same
  state -> sector flash on at t0; lap flash on at t0+1.1 s (sector off); lap flash off at t0+3.6 s; clock.
  Confirm the cleanup paths: unmount or `lap` -> null (replay scrub back, brief 08) clears both timers.

## Added visible text
None. Removed: the "LAP" label of the live lap chip (chips.tsx allow-list entry removed with the
component; tower.tsx's own "LAP" stays). The flash still shows `m:ss.d`, `~m:ss`, `– –` or the lap's
`m:ss` — the `S#` label, the blank/`– –` delta, the `●` PB dot and the (always null) rank chip stop
being rendered; none of them was an allow-list entry.

## What changes on the phone / what does not
Changes (after OTA publish, real RECORD ride with a way picked at START): at each gate the big clock
digits are replaced for 2.5 s by the sector time in the SAME size and font, coloured purple (light
purple at night, brand purple by day), green (neon at night, dark green by day), yellow (brand yellow at
night, deep gold by day), or dim for an estimated/missed sector — and NOTHING else: no rectangle, no
filled purple box, no green outline, no dashed grey frame, no `S1` label, no `– –` delta. Then the white
clock returns. At the FINISH gate: the last sector's time flashes, 1.1 s later the LAP time (no decimal)
flashes in the lap's tier colour the same way for 2.5 s — no "LAP" chip, no box — and then the clock
RUNS AGAIN (whole-ride elapsed) until you press STOP; before, the lap chip stayed in the slot until STOP.
Same look whether "Sector colours" is ON or OFF, in dark and day mode; the strip bar of that sector
(tiered as before) is the thing to compare a sector flash with; the lap tier is what the tower reveals
after STOP and the ACTIVITIES big lap time shows. Does NOT change: the 2.5 s hold, the 1.1 s handover,
the replace-not-overlay behaviour; the strip; the engine (one-shot lap, no auto-stop); times, tiers,
history, scoring; the tower reveal after STOP; the live map and the Sector colours toggle (map only);
DEMO and REPLAY (they never flashed and still do not until brief 08); any stored data.

## Out of scope (do not do)
- Making DEMO/REPLAY flash or changing their lap tier rule (brief 08).
- Removing `LiveViewModel.posChip` (decision 4) or touching `towerSource.ts`/`tower.tsx`.
- Touching `chipColors`, `PURPLE_INK`, `StripSlot`, `tierColour.ts`, `theme.ts`, `engine.ts`,
  `ui/preview/data.ts`.
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs.

## Decisions taken by the Plan tier (logged, not asked)
1. **Lap flash = same `LiveFlash`, same hold, then the clock** (Nathan 2026-10-05 23:41 overruled the
   first draft's "keep the lap chip"). "Clock runs again" = the whole-ride elapsed clock that never
   stopped underneath (engine: the lap is scored once at FINISH, `phase 'finished'`, recording continues
   until STOP; there is no next lap on a one-shot way). Nothing about the ride's end changes.
2. **The 1.1 s handover (LAYOUT §2a) is kept and moved INTO the pane** (`LAP_HANDOVER_MS`) instead of
   each screen timing it: RecordScreen loses `showLap`; DEMO/REPLAY (08) get the identical sequence for
   free. Sequence at the finish: sector flash at the gate, lap flash at +1.1 s (sector flash cut, §2a.1),
   clock at +3.6 s. There is no lap earcon in code (the old comment was aspirational), so nothing audible moves.
3. **What leaves the rider's screen and where it still is:** the word "LAP" (the context line is empty
   after the finish, so the lap flash is identified by position in the sequence — right after S4's flash,
   with all four strip bars done — and by the tower reveal that follows STOP; Nathan: no label/rank text);
   the delta (always blank/`– –`, D-021 — nowhere, because it does not exist); the rank chip (always null
   live since cycle11 R1 — the tower shows the rank after STOP); the PB dot (never set by the engine).
   The lap time and tier remain in the tower reveal and on the ACTIVITIES detail (brief 03).
4. **`LiveViewModel.posChip` stays as an accepted-but-unrendered field** rather than being removed:
   removing it means a signature change in `viewModelFromEngine` and edits in RecordScreen (positional
   `null`), demoModel, replayModel and PreviewScreen for a B-28 hook that cycle11 R1 already parked.
   Documented in the model; flagged for a later chore. `PosChip` the component is deleted (dead).
5. **`LapChipModel` is folded into `FlashModel`** (one contract, as Nathan asked); the `delta` field
   goes everywhere it was produced (liveView, demoModel, replayModel, PreviewScreen) and asserted
   (replay_suite). The lap tier rule in demoModel/replayModel (`'neutral'`, cycle11 R5) is NOT changed
   here — 08 owns the DEMO/REPLAY fidelity decisions.
6. **Rendered as a sibling of `LapClock` in `liveView.tsx` sharing `clockStyles.clock`** rather than a
   restyled component in `chips.tsx`: the invariant "same digits as the clock" is enforced by sharing the
   style object. `chips.tsx` is left to the palette and the strip slot.
7. **'est' and 'neutral' get the same bare treatment** (colour only: `t.textDim` / `t.accentText` via
   03's helper). In dark mode neutral and yellow are the same colour (#F5C542) as before (D8 §2).
8. **Palette unchanged** (Nathan 23:41, answer 3): night purple #C364FF, day green/yellow/purple as in
   03, neutral day 3.13:1 left alone. One constant per tier in `tierColour.ts`.
9. **Three tests, two failed-before + one pin** (the ridedetail pin passes before the code change; it
   tests 03's helper on the race ground, which 03 did not test).
10. **Allow-list:** one removal (chips.tsx "LAP"); verified nothing else the flashes rendered was an entry.
11. **Numbering 04/08** (see the note at the top): this brief keeps 04 as first announced; the parallel
    items 5-7 briefs are 05/06/07; the DEMO/REPLAY companion is 08. README/COMMANDS updated accordingly.
