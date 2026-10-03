# 07 — Finish-lap chip in its REAL tier colour at the instant it lands

**Source: Nathan, 2026-10-02** — crossing the FINAL gate, the lap time appears in **yellow
only**, not in the colour that lap actually ranks (purple / green / yellow). Ruling: the lap time
is shown in its correct tier colour **the instant it appears**, computed synchronously from the
engine's final lap time against the ghost-history window *excluding the current ride* — purple =
faster than the best of the last 9 previous rides, green = faster than their mean, yellow =
slower (the rule `colourModel.tierFor` already states).

Nathan's separate complaint about the **sector STRIP** on a second ride is brief 10
(`10-second-ride-sector-colours.md`), not this one. The coloured map line (the 'Sector colours'
setting) is not part of this brief either — see §Interplay.

**Status: brief only. Nothing below is in the app.** Written 2026-10-02 by the Plan tier
(Fable) against the working tree (branch `virgin`, HEAD `ae911bb`; 784 tests / 781 pass /
0 fail / 3 skip at HEAD — cycle19 and cycle20 briefs 01-06, 08-10 are unexecuted at writing
time, so if any of them landed first, add their test counts to every number in §Verification).
Executor: Sonnet, cold, this file only. Independent of briefs 06 (start-gate/selfs loading),
08 (status lines / settings) and 10 (sector history) — see §Interplay for 10.

## What this changes on the phone — and what it does not

- **Changes:** when the FINISH gate fires, the `LAP` chip that lands ~1.1 s later is painted
  purple / green / yellow by its real verdict — the same verdict the timing tower reveals after
  STOP, so the two never disagree. A way's very first lap (no history) keeps today's look
  (`'neutral'`, Decision 4).
- **Stays exactly as today:** the lap TIME and its ~1.1 s delay (`showLap`), the sector flash
  and the S1–S4 strip (their rule is untouched; brief 10 owns their history), the coloured map
  line and its setting, the live `P4` context fact, `posChip` = null before STOP, the tower
  reveal after STOP (`rankingRevealModel.ts` untouched), ride detail / RIDES / replay colours,
  the DEMO tab (§Out of scope).
- **JS-only → OTA-able** via EAS Update (`scripts/publish-preview.ps1`; no native, no
  fingerprint change). No new build needed.

## Evidence (read 2026-10-02)

### Root cause — a deliberate ruling, not a race

- `app/src/ui/RecordScreen.tsx` lines 1031-1046:
  ```ts
    // Colour comes from the ghost history for the LOCKED route only: before the
    // lock there is nothing honest to compare against, so everything stays
    // neutral (D-025). Sector index 0 means "the whole lap".
    const tierOf = (sectorIndex: number, timeS: number | null): Tier => {
      if (live.track === null || timeS === null) return 'neutral';
      const history = sectorIndex === 0 ? lapValues(live.track) : sectorValues(live.track, sectorIndex);
      const tier = tierFor(timeS, history);
      return tier === 'est' ? 'est' : (tier as Tier);
    };

    // virgin-cycle11 R1: sector index 0 is "the whole lap" (liveView.tsx:197–198). Its
    // tier is the rank announcement in disguise — a purple lap chip says P1 — so the
    // live pane shows the lap as 'neutral' (no verdict yet) and the tower reveals the
    // tier after STOP. Sectors and the flash keep their live colours.
    const tierOfLive = (sectorIndex: number, timeS: number | null): Tier =>
      sectorIndex === 0 ? 'neutral' : tierOf(sectorIndex, timeS);
  ```
  and lines 1421-1429 pass `tierOfLive` to the pane:
  ```tsx
          <LiveSectorPane
            vm={viewModelFromEngine(
              live,
              realTimebase(session.startedAtMs),
              null, // virgin-cycle11 R1: the rank is revealed after STOP by the tower, never here
              tierOfLive,
              livePos,
            )}
            showLap={showLap}
          />
  ```
- `app/src/ui/liveView.tsx` lines 188-202 build the lap chip model: `tier: tierOf(0, scoredS(st.lap) ?? st.lap.rawS ?? null)` — index 0 = "the whole lap". So the lap chip is **forced `'neutral'`** by `tierOfLive`.
- Why neutral LOOKS yellow: `app/src/ui/chips.tsx` lines 34-52 — `case 'neutral': return { bg: 'transparent', border: 'transparent', text: t.accentText }`; `app/src/ui/theme.ts` line 88 `accentText: colors.neutral` (night) / line 74 `accentText: '#B98A0A'` (daylight, a darker gold); `app/src/ui/tierColour.ts` line 14 `YELLOW_TIER = colors.neutral`. In the night/race theme the 'neutral' text colour is **the exact same hex as the yellow tier** — a "no verdict" chip and an "ordinary lap" chip are indistinguishable. That is what Nathan saw: "yellow only".
- The ruling that put it there: `cycles/virgin-cycle11/BRIEF-ranking-reveal.md` §R1 ("The lap chip renders with tier 'neutral' before STOP … a purple lap chip *is* the rank announcement") — and R1 itself ends: *"If Nathan wants the tier back on the pre-STOP lap chip after seeing it, it is a one-line revert."* Nathan has now seen it and wants the tier back. **This brief is that revert, plus the exclusion it needs to be correct (next section).**
- What later produces the correct colour: `onEnd` (`RecordScreen.tsx` lines 617-726) calls `rememberRide(finalState, {rideId: s.rideId, …})` (line 639) then `buildRankingReveal(finalState, s.rideId, s.startedAtMs)` (line 643); `app/src/ui/rankingRevealModel.ts` lines 71-98 compute `tier: today.tier` from `buildTowerModel(window = ghostsFor(st.track, rideId) WITH exclusion, todayS = scoredS(st.lap))`; `app/src/ui/towerModel.ts` line 92 `tier: tierFor(todayLapS, values)`. Same `tierFor`, same `scoredS`, same window minus today ⇒ computing the live chip from `lapValues(track, session.rideId)` lands on the identical colour.
- The lap time is FINAL the instant it appears: `app/src/live/engine.ts` lines 921-942 — `if (evFin && this.lap === null) { … this.lap = { rawS, stoppedS, movingS, estimated }; this.phase = 'finished'; }` — "the lap is scored once", never recomputed. No asynchronous result computation feeds the live chip (`resultsStore` / `derive.ts` only run for the persisted record). Nothing about the time is late; only the tier was withheld on purpose.

### Why the exclusion is mandatory (the race that WOULD exist after a naive revert)

- `rememberRide` stores today synchronously into `recorded` (`app/src/ui/lastRide.ts` lines 211-228 `pushRecorded` → `recorded.push({ … rideId: f.rideId, startedAtMs: meta?.startedAtMs ?? f.atMs, … })`, `rideId = meta?.rideId ?? \`session:${atMs}\`` at line 86), the same pool `colourModel.rankedFor` reads (`app/src/ui/colourModel.ts` lines 64-68, `[...GHOSTS, ...recordedResults()]`).
- In `onEnd`, after line 639 `rememberRide(…)` come `await stopTracking()` (line 644), `setLastSummary(sum)` (line 645, a state change → re-render) and `await draftRouteFromRide(…)` (line 666) — all **before** `setSession(null)` / `setPhase('ending')` (lines 682 / 710). During that window the screen still renders the 'running' tree with the live pane (and every engine emit re-renders it too — `engine.ts` line 640 `sectors: [...this.sectors]` is a fresh array per emit).
- `colourModel.ts` lines 77-79 `ghostsFor(wayId, excludeRideId?)` / 135-137 `lapValues(wayId, excludeRideId?)` / 145-155 `sectorValues(wayId, index, excludeRideId?)` — exclusion by id is already supported; the live screen just never passes one. Without it, once today is stored, a best-of-window lap reads `value < st.best` = false → green (or yellow at n=1, where best = mean) — `tierFor`, lines 168-174 — i.e. a PB lap chip would turn purple at the line and then flip green for the second or two before the tower. This is the B-44 bug class (`tests/live_colour_suite.ts` lines 235-278 pin it for the RESULT side).
- `session.rideId` is available at the `tierOf` scope: `const [session, setSession] = useState<ActiveSession | null>(null);` (RecordScreen line 182); `onEnd` stores under `s.rideId` where `s = sessionRef.current` (lines 628, 639) — the same id.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor above was read from the tree on 2026-10-02. If a quoted
  line is not where the brief says, or a name differs, stop and report the mismatch verbatim
  (file, line, expected, found). Never guess, never patch around it. Line numbers in
  `colourModel.ts` and `live_colour_suite.ts` may have shifted if brief 10 landed first —
  anchor on the quoted TEXT (§Interplay).
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is
  `mv`'d aside, never deleted). **Never delete** — `safe_to_delete/` is the bin. No
  `npm install`, no `npx …`, no `eas …`. Never grep the whole repo or `node_modules`;
  `timeout 40 grep -n` on the named files only.
- **Files touched — exactly these, nothing else:**
  - EDIT `app/src/ui/colourModel.ts` (one new exported function + doc comment, after `tierFor`)
  - EDIT `app/src/ui/RecordScreen.tsx` (import line 46; the `tierOf`/`tierOfLive` block
    1031-1046; the `tierOfLive,` argument at line 1425)
  - EDIT `app/tests/live_colour_suite.ts` (two import edits, two import lines, append four tests)
- Do **not** touch: `liveView.tsx`, `chips.tsx`, `theme.ts`, `tierColour.ts`,
  `rankingRevealModel.ts`, `towerModel.ts`, `demoModel.ts` / `DemoScreen.tsx`,
  `replayModel.ts`, `sectorTrailModel.ts`, `wayMapView.tsx`, `wayMapGeo.ts`, `settings.tsx`,
  `engine.ts`, `lastRide.ts`, `tests/run.ts` (no new suite file), `STATE.md`, `OPEN-ITEMS.md`,
  `IDEAS.md`, this folder's other files; in `RecordScreen.tsx` nothing but the three anchors
  above — in particular NOT the `sectorColours` memo (lines 1061-1070), the status-line block
  (975-1029) or the `settings.liveMap` block (1395-1413) — briefs 08 and 10 read those;
  in `colourModel.ts` NOT `sectorValues` (lines 139-155, brief 10's).

## Goal

At the FINISH gate the `LAP` chip lands in the tier its time earns against the locked way's
previous-rides window (last 9 ranked rides, today excluded by `session.rideId`), identical to
the tier the tower reveals after STOP; a way's first lap stays `'neutral'`; the chip does not
change colour between the FINISH gate and the 'ending' screen. Four headless tests pin the pure
rule, the no-history case, the no-flicker-across-STOP invariant (which fails against today's
unexcluded reads), and the RecordScreen wiring (which fails against today's source).

## Decisions

1. **Revert cycle11 R1's lap-neutral override; the lap chip takes `tierOf(0, …)` again.** R1
   explicitly offered this revert and Nathan has now asked for it. `posChip` stays `null`
   (the rank NUMBER is still revealed by the tower after STOP — Nathan's objection in cycle11
   was to the rank, and the rank chip is not coming back). The tower reveal is untouched; because
   the live chip and the reveal now compute from the same `tierFor` over the same window-minus-
   today, the reveal always lands on the colour the rider already saw.
2. **`tierOf` excludes the current ride by `session.rideId`.** Before STOP the exclusion is a
   no-op (nothing is stored under that id yet — same 9 ghosts); after `rememberRide` it is what
   keeps a purple lap chip purple until the 'ending' screen takes over. Same B-44 rule the
   RESULT side has used since cycle 009. Test 3 demonstrates the flip without it. Because the
   sector flash and the strip share `tierOf`, they inherit the same exclusion — a no-op for them
   before STOP, and consistent afterwards; their RULE (which history counts) is not changed here
   (brief 10's).
3. **The rule lives in one exported pure function, `liveTierFor`, in `colourModel.ts`** so it is
   headless-testable (RecordScreen is not). `RecordScreen.tierOf` becomes a one-line delegate.
   Behaviour of the sector/flash path is byte-for-byte the same as today's `tierOf` (null track
   or null time → `'neutral'`; otherwise `tierFor` over `sectorValues`), plus the exclusion.
4. **First-ever lap on a way (no history) stays `'neutral'`** — `tierFor(v, [])` →
   `'neutral'` (`MIN_HISTORY = 1`, D-045 ruling 1, pinned at `live_colour_suite.ts` 85/134).
   Not changed. NOTE for Nathan (no action in this brief): `'neutral'` renders in
   `t.accentText`, which in the night/race theme IS the yellow-tier hex (`theme.ts` 88,
   `tierColour.ts` 14), so a ride-1 lap chip will *still* read as yellow on the handlebars.
   Making "no verdict" visibly different from "ordinary lap" is a palette decision
   (`chips.tsx` 40-45 even claims it is "deliberately NOT yellow" — the theme contradicts that
   in night mode). Flagged, not fixed — a design call, not a code defect.
5. **No freezing / caching of the lap tier.** The engine's lap is immutable once set
   (`engine.ts` 921-942) and the store only changes at STOP (excluded by Decision 2), so a
   per-render computation is already stable — test 3 proves equality before/after the store
   write. A frozen ref would add state for nothing and would go stale if ghost history were
   ever refreshed mid-ride.
6. **Tests: append to the existing `live_colour_suite.ts`** (it already loads `colourModel`,
   `lastRide.rememberRide` with `meta`, and the `stateWith`/`doneSector` helpers). Count goes
   784 → 788 (+4). Test 3's "without exclusion" clause and test 4 fail against today's tree;
   tests 1-2 fail to import today (`liveTierFor` does not exist) — failed-before as well.

## Files to touch

### 1. EDIT `app/src/ui/colourModel.ts` — add `liveTierFor` directly after `tierFor`

Anchor on text: the closing `}` of `tierFor` (line 174 at HEAD; the function ends
`return value < st.mean ? 'green' : 'yellow';` / `}`), followed by a blank line and the
`/** All-time best scored lap (store/timing.ts) for a route — NOT window-limited:` doc comment
(line 176 at HEAD). Insert between them:
```ts

/**
 * virgin-cycle20 brief 07: the LIVE verdict for the Record screen — sector
 * `sectorIndex` >= 1, or the whole lap when `sectorIndex` is 0 (liveView.tsx's
 * convention). One place, headless-testable, used by the lap chip, the sector
 * flash and the strip, so they can never disagree.
 *
 *  - no locked way, or no real time → 'neutral' (D-025: before the lock there is
 *    nothing honest to compare against; a null time never earns a colour);
 *  - otherwise tierFor() over lapValues()/sectorValues() for the locked way,
 *    EXCLUDING the current ride by id (B-44 for the live screen): before STOP the
 *    exclusion is a no-op, after onEnd's rememberRide() it is what keeps a
 *    best-of-window lap purple while the 'running' tree is still on screen.
 *  Ride 1 of a way (no history) lands on 'neutral' through tierFor's own floor.
 */
export function liveTierFor(
  wayId: string | null, sectorIndex: number, timeS: number | null, excludeRideId?: string,
): UiTier {
  if (wayId === null || timeS === null) return 'neutral';
  const history = sectorIndex === 0 ? lapValues(wayId, excludeRideId) : sectorValues(wayId, sectorIndex, excludeRideId);
  return tierFor(timeS, history);
}
```
(`lapValues` and `sectorValues` are declared above `tierFor` in the same file — plain function
declarations, hoisted; no ordering issue. Whatever brief 10 made `sectorValues`'s body, its
signature `(wayId, index, excludeRideId?)` is unchanged, so this call compiles either way.)

### 2. EDIT `app/src/ui/RecordScreen.tsx`

(a) Line 46 — replace
```ts
import { ghostsFor, lapValues, sectorValues, tierFor } from './colourModel';
```
with
```ts
import { ghostsFor, liveTierFor, sectorValues } from './colourModel';
```
(`lapValues` and `tierFor` have no other use in this file — confirm with
`timeout 40 grep -n "lapValues\|tierFor\b" app/src/ui/RecordScreen.tsx` → only line 46 and the
block below before the edit, no hits after. `ghostsFor` is still used at lines 145 and 1160;
`sectorValues` is still used by the `sectorColours` memo at 1065 — left exactly as it is.)

(b) Lines 1031-1046 — replace the whole block quoted in §Evidence (from the comment
`// Colour comes from the ghost history for the LOCKED route only: before the` through
`sectorIndex === 0 ? 'neutral' : tierOf(sectorIndex, timeS);`) with
```ts
  // Colour comes from the ghost history for the LOCKED route only: before the
  // lock there is nothing honest to compare against, so everything stays
  // neutral (D-025). Sector index 0 means "the whole lap". The rule itself is
  // colourModel.liveTierFor (headless-tested); the current ride is excluded by
  // id so the lap chip cannot change colour between the FINISH gate and the
  // 'ending' screen — onEnd's rememberRide() stores today's ride while this
  // tree is still rendering (B-44 for the live screen).
  //
  // virgin-cycle20 brief 07 (Nathan, 2026-10-02): the lap chip (index 0) shows its
  // REAL tier the instant it lands — purple / green / yellow against the same
  // window the tower reveals after STOP, so the two always agree. This reverts
  // cycle11 R1's 'neutral' override on the lap chip exactly as R1 offered; the
  // rank NUMBER is still revealed after STOP by the tower only (posChip stays null).
  const tierOf = (sectorIndex: number, timeS: number | null): Tier =>
    liveTierFor(live.track, sectorIndex, timeS, session?.rideId);
```
(`UiTier` is a strict subset of `Tier`, so no cast is needed. The name `tierOfLive` must not
survive anywhere in the file.)

(c) Line 1425 (inside the `viewModelFromEngine(` call quoted in §Evidence; after (b) the
number shifts by about -1 — anchor on the text) — replace
```ts
            tierOfLive,
```
with
```ts
            tierOf, // brief 07: real lap tier at the line (cycle11 R1 revert)
```
The `null, // virgin-cycle11 R1: the rank is revealed after STOP by the tower, never here`
line directly above it stays exactly as is.

### 3. EDIT `app/tests/live_colour_suite.ts` — imports + four appended tests

First, the static imports at the top of the file (lines 11-12 at HEAD). Test 4 reads
`RecordScreen.tsx` from disk with the repo's source-pin idiom (`recordflow_suite.ts` 214:
`path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx')`) — NOT `new URL(…, import.meta.url)`,
which `tsc --noEmit` rejects under `expo/tsconfig.base` (`lib: ["DOM", "ESNext"]`: the DOM `URL`
is not assignable to `node:fs`'s `string | URL`, TS2345 — Fable ruling 2026-10-03 after the
executor stopped on exactly that error). Replace
```ts
import * as nodeFs from 'node:fs';
import { assert, test, loadFixture } from './lib.ts';
```
with
```ts
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { assert, test, loadFixture, TESTS_DIR } from './lib.ts';
```

Then add `liveTierFor` to the destructured `colourModel` import (lines 29-32 at HEAD):
```ts
const {
  fmt, ghostsFor, lapValues, liveTierFor, positionAmong, sectorValues, tierFor, MIN_HISTORY, WINDOW_N,
  WINDOW_PREV, rankingPoolFor, rankedCountFor,
} = await import('../src/ui/colourModel.ts');
```
(If brief 10 landed first and added names to this destructure, keep its names and add
`liveTierFor` — the set is a union; stop only if the `await import('../src/ui/colourModel.ts')`
block itself is not where the brief says.) Directly after that block add one more dynamic
import (same hook-after pattern as the others):
```ts
const { buildRankingReveal } = await import('../src/ui/rankingRevealModel.ts');
```
Then append at the very END of the file (after everything brief 10 may have appended;
`doneSector` and `stateWith` are the file's existing helpers; `nodeFs` is already imported at
the top, `path` and `TESTS_DIR` by the import edit above):
```ts
/** brief 07 helper: a clean 4-sector finished ride on `wayId` with a real
 * rideId/startedAtMs (the shape onEnd hands rememberRide), for the live-tier tests. */
function brief07Ride(wayId: string, lapS: number, rideId: string, startedAtMs: number) {
  const q = lapS / 4;
  rememberRide(
    stateWith({
      track: wayId,
      sectors: [doneSector(q), doneSector(q), doneSector(q), doneSector(q)],
      lap: { rawS: lapS, stoppedS: 0, movingS: lapS, estimated: false },
    }),
    { rideId, startedAtMs },
  );
}

test('virgin-cycle20 07: liveTierFor — the lap chip gets its real tier at the line (cycle11 R1 revert)', () => {
  resetRecordedForTests();
  const wayId = 'brief07-way-a';
  brief07Ride(wayId, 600, 'b07a-1', 1_000);
  brief07Ride(wayId, 620, 'b07a-2', 2_000);
  brief07Ride(wayId, 640, 'b07a-3', 3_000); // best 600, mean 620
  const today = 'b07a-today';
  assert(liveTierFor(wayId, 0, 590, today) === 'purple', 'beats every lap in the window ⇒ purple at the line');
  assert(liveTierFor(wayId, 0, 610, today) === 'green', 'between best and mean ⇒ green at the line');
  assert(liveTierFor(wayId, 0, 630, today) === 'yellow', 'slower than the mean ⇒ yellow at the line');
  // sector path: the refactor must not change the flash/strip rule (sector 1: 150/155/160 → best 150, mean 155)
  assert(liveTierFor(wayId, 1, 149, today) === 'purple', 'sector verdict unchanged by the refactor (purple)');
  assert(liveTierFor(wayId, 1, 152, today) === 'green', 'sector verdict unchanged by the refactor (green)');
  assert(liveTierFor(wayId, 1, 158, today) === 'yellow', 'sector verdict unchanged by the refactor (yellow)');
  // exact parity with the old RecordScreen.tierOf body
  assert(liveTierFor(wayId, 0, 610, today) === tierFor(610, lapValues(wayId, today)), 'lap: liveTierFor === tierFor over lapValues');
  assert(liveTierFor(wayId, 2, 152, today) === tierFor(152, sectorValues(wayId, 2, today)), 'sector: liveTierFor === tierFor over sectorValues');
  resetRecordedForTests();
});

test('virgin-cycle20 07: no lock / no time / no history ⇒ neutral, exactly as before', () => {
  resetRecordedForTests();
  assert(liveTierFor(null, 0, 600, 'x') === 'neutral', 'no locked way ⇒ neutral (D-025)');
  assert(liveTierFor('brief07-way-b', 0, null, 'x') === 'neutral', 'no real time ⇒ neutral, never est on the live surface');
  assert(liveTierFor('brief07-way-b', 0, 600, 'x') === 'neutral', 'ride 1 of a way (no history) ⇒ neutral (MIN_HISTORY floor), however fast');
  // n=1: only purple/yellow reachable (NW-1), unchanged
  brief07Ride('brief07-way-b', 600, 'b07b-1', 1_000);
  assert(liveTierFor('brief07-way-b', 0, 599, 'today') === 'purple', 'n=1 faster ⇒ purple');
  assert(liveTierFor('brief07-way-b', 0, 600, 'today') === 'yellow', 'n=1 tie ⇒ yellow (not green)');
  resetRecordedForTests();
});

test('virgin-cycle20 07: the lap tier does not flip when onEnd stores today (exclusion by session.rideId)', () => {
  resetRecordedForTests();
  const wayId = 'brief07-way-c';
  brief07Ride(wayId, 600, 'b07c-1', 1_000);
  brief07Ride(wayId, 620, 'b07c-2', 2_000);
  const today = 'b07c-today';
  const mine = 580; // a new best — the case a self-inclusion demotes
  // 1) at the FINISH gate (nothing stored yet): exclusion is a no-op
  const atLine = liveTierFor(wayId, 0, mine, today);
  assert(atLine === 'purple', `at the line a new best is purple, got ${atLine}`);
  assert(liveTierFor(wayId, 0, mine, today) === liveTierFor(wayId, 0, mine), 'before STOP, excluding an unstored id changes nothing');
  // 2) STOP: onEnd's rememberRide stores today under session.rideId while the 'running' tree still renders
  brief07Ride(wayId, mine, today, 3_000);
  assert(liveTierFor(wayId, 0, mine, today) === atLine, 'WITH the exclusion the lap chip keeps its colour after the store write (no flicker)');
  // the defect this brief removes: today's own unexcluded read is NOT purple any more
  const unexcluded = tierFor(mine, lapValues(wayId));
  assert(unexcluded !== 'purple', `without the exclusion the stored ride compares against itself and drops to ${unexcluded} — the flip Decision 2 prevents`);
  // 3) the tower reveal lands on the colour the rider already saw
  const reveal = buildRankingReveal(
    { track: wayId, lap: { rawS: mine, stoppedS: 0, movingS: mine, estimated: false } },
    today, 3_000,
  );
  assert(reveal !== null && reveal.tier === atLine, `reveal tier ${reveal?.tier} must equal the live chip's ${atLine}`);
  resetRecordedForTests();
});

test('virgin-cycle20 07: RecordScreen wires the real lap tier and the session exclusion', () => {
  const src = nodeFs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(!src.includes('tierOfLive'), 'cycle11 R1 lap-neutral override must be gone (tierOfLive)');
  assert(src.includes('liveTierFor(live.track, sectorIndex, timeS, session?.rideId)'), 'tierOf delegates to liveTierFor with the session exclusion');
  assert(!src.includes('lapValues(live.track)') && !src.includes('sectorValues(live.track, sectorIndex)'), 'no unexcluded live tierOf history read survives');
  // the cut from the sector flash to the lap chip is unchanged (LAYOUT §2a)
  assert(src.includes('setTimeout(() => setShowLap(true), 1100)'), 'the ~1.1 s lap handover delay is untouched');
});
```

## Verification plan

1. **Failed-before artifact.** Before editing anything: temporarily append ONLY test 4 (the
   RecordScreen source pin — it needs no new import) and run
   `cd app && node --experimental-strip-types tests/run.ts` → it must FAIL on `tierOfLive`
   (report the line). Remove it again, then do the edits in order 1 → 2 → 3. (Tests 1-3 cannot
   run before step 1 — `liveTierFor` does not exist — which is their failed-before state; test
   3's "without the exclusion" clause additionally demonstrates the flip against the unchanged
   `colourModel` reads.)
2. `cd app && node --experimental-strip-types tests/run.ts` — expect **788 tests / 785 pass /
   0 fail / 3 skip** (784 + 4; if brief 10 landed first it adds 4 more → 792 / 789; add any other
   landed briefs' counts likewise). Zero FAIL is the bar; report the exact summary line.
3. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0. (A `TS2345 … 'URL' is not
   assignable to parameter of type 'string | URL'` here means test 4 was written with the
   `new URL(…, import.meta.url)` form — use the `path.resolve(TESTS_DIR, …)` idiom in §Files 3.)
4. `timeout 40 grep -n "tierOfLive\|lapValues(live.track)\|sectorValues(live.track, sectorIndex)" app/src/ui/RecordScreen.tsx` → **no output**.
   `timeout 40 grep -n "liveTierFor" app/src/ui/colourModel.ts app/src/ui/RecordScreen.tsx app/tests/live_colour_suite.ts` → one definition, one call site (+ comment), the test import/uses.
   `timeout 40 grep -n "sectorValues(live.track, i)" app/src/ui/RecordScreen.tsx` → exactly one hit (the untouched memo).
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` shows (besides the pre-existing
   `M scripts/OTA-TROUBLESHOOTING.md`, the untracked `cycles/…`, `marketing/…`, and whatever
   other landed briefs changed) exactly: `M app/src/ui/colourModel.ts`,
   `M app/src/ui/RecordScreen.tsx`, `M app/tests/live_colour_suite.ts`.
6. Inspect (fresh Opus): reruns 1-5; reads the RecordScreen diff against Decisions 1-3 (the
   `null` posChip line still present; `tierOf` passed, not `tierOfLive`; the `sectorColours`
   memo byte-identical); confirms `liveView.tsx`, `rankingRevealModel.ts`, `demoModel.ts`,
   `sectorTrailModel.ts` are byte-identical to HEAD (`git diff --stat` lists none of them);
   confirms test 3's `unexcluded !== 'purple'` clause actually exercises the store (2 priors +
   today's 580 stored → `lapValues(wayId)` has 3 values with best = 580).

## Interplay with brief 10 (`10-second-ride-sector-colours.md`)

Both briefs edit `app/src/ui/colourModel.ts` and append to `app/tests/live_colour_suite.ts`,
at disjoint places:
- Brief 10 replaces the `sectorValues` doc comment + body (lines 139-155 at HEAD) and never
  touches `RecordScreen.tsx`. It keeps `sectorValues`'s signature.
- This brief inserts `liveTierFor` after `tierFor` (line 174 at HEAD), edits `RecordScreen.tsx`,
  and never touches `sectorValues`.
- **Either order works.** If 10 lands first, `tierFor` and the all-time-best comment sit a few
  lines lower — anchor on the quoted text. If 07 lands first, 10's `sectorValues` anchor is
  unchanged (it is above the insertion). Both append tests at the end of the suite and both
  touch the `colourModel` destructure: the second one in simply adds its names. Test totals are
  additive (+4 each).
- Semantics compose: `liveTierFor` calls `sectorValues` for the strip/flash, so once 10 lands
  the strip's history includes interrupted sectors as 10 intends — this brief has no opinion on
  that rule. The lap path (`lapValues`) is untouched by 10.

## On-device checklist — Nathan, after the OTA (JS-only; no new build)

1. Ride a way with history. At the FINISH gate: sector flash as today, then ~1 s later the
   `LAP` chip — **in colour**: purple if it is the fastest of your last 9, green if faster than
   their average, yellow otherwise. Note the colour.
2. Roll on a bit, press STOP. The tower climbs and lands today's row in **the same colour** as
   the chip in step 1 (purple = P1).
3. While stopping (the second or two before the tower appears) watch the `LAP` chip: **it does
   not change colour.**
4. A brand-new way (first ride ever): the lap chip appears with no coloured border/fill, text
   in the theme's accent — i.e. it still *looks* yellow in night mode. That is the known
   'neutral' palette (Decision 4), not this bug; say if you want "no verdict" to look
   different from "ordinary lap".
5. Optional: DEMO tab — the demo's lap chip is still neutral at the line (out of scope, see
   below); say if you want it to mirror the real screen.

## Out of scope

- `demoModel.ts` / `DemoScreen.tsx` (cycle11 brief "demo-fullscreen-run" R5 pins the demo's lap
  chip `'neutral'` at the line, `demo_suite.ts` 189-203) and `replayModel.ts` (`replay_suite.ts`
  301): both mirror the R1 look and now diverge from the real screen. One-line changes each plus
  test inversions, but separate surfaces and separate rulings — the coordinator decides whether
  to follow up.
- The 'neutral' = yellow palette collision (Decision 4). `STATE.md`'s "no lap tier before STOP
  (R1)" line — the coordinator updates it when this lands.
- The sector STRIP on a second ride (brief 10) and the coloured map line / 'Sector colours'
  setting (brief 08 renames or removes settings; nobody has evidence of a map-line defect).
  The `sectorColours` memo at RecordScreen 1061-1070 reads `sectorValues(live.track, i)` with
  no exclusion; it is memoised and not this brief's concern — noted for the coordinator only,
  no change proposed here.

## Open calls (default chosen — executor does NOT stop for these)

- **A. Remove the now-unused `lapValues`/`tierFor` imports from RecordScreen.** Chosen: remove
  (tsc with `strict` does not fail on unused imports, but a dead import on a 1,800-line screen
  is noise).

## Report back

- The failed-before line from Verification 1 (test 4 failing on `tierOfLive`), the final test
  summary line (0 FAIL, 788 total unless other briefs landed), and `tsc` exit code.
- The three greps from Verification 4 and the `git status --porcelain` list.
- Any anchor mismatch, verbatim, with the line actually found — and stop there.
- A reminder line for the coordinator: "JS-only; OTA-able; demo/replay lap chip still neutral
  (out of scope); STATE.md R1 line to update".
