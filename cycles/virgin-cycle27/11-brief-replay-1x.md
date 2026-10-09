# Brief 11 — Replay / Demo speed dial: add 1× (real time) to BOTH lists — REPLAY `[1, 5, 10, 25]`, DEMO `[1, 5, 15, 25]`

Written by the Plan tier (Fable) 2026-10-09 ~23:00 UTC from `00-nathan-ideas.md` idea 11 and `14-replay-speed-digest.md`; every anchor re-read in the working tree (baseline `956 tests: 953 pass, 0 fail, 3 skip`, tsc clean). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first. **Status: APPROVED (Nathan 2026-10-09 00:24: execute all briefs). Chore/small. Runs after `11-brief-record-pairing.md` and before `11-brief-map-tab-controls-and-dot.md` (`10-plan.md` §15).**

## 0. Rules
- **STOP-ON-AMBIGUITY** (EXECUTOR-RULES: anchor mismatch, undecided call, a check failing for an unanticipated reason → STOP, report verbatim; never guess). Report: `cycles/virgin-cycle27/12-brief-11-executor-report.md`, `## STOPPED`.
- **Nathan's words (2026-10-08 08:31):** "in the replay features, also have a 1x option, next to the 5x,15x and 25x options." The 5/15/25 list is DEMO's (`demoModel.ts:385`); REPLAY's is 5/10/25 (`replayModel.ts:24`). Which screen he meant is unresolved and Nathan is not to be asked mid-run.
- **Fable ruling: option (c) — add 1× to BOTH dials.** Reasons: (1) he said "the replay features", plural, and DEMO is the scripted replay of the same pane; (2) both dials are the same 44 dp cycling control, so the cost is one list entry + one wrap test each; (3) a 1× that exists on one screen and not its twin is exactly the inconsistency he keeps asking us to remove (ideas 2, 6, 8); (4) nothing in either engine keys on a minimum rate (digest 14 §2: the clock is a wall-clock line, `scrubDeltaS` scales linearly, the roll-outs are in ride-seconds). **ONE-LINE SWITCH if the coordinator's dispatch message restricts it:** to do REPLAY only, skip §3.2 and §4.2; to do DEMO only, skip §3.1 and §4.1. Do NOT choose yourself — default is both.
- 1× is inserted FIRST (ascending order, as both lists are); the DEFAULTS do not change (REPLAY 10, DEMO 25). The dial text is computed (`{anchor.rate}×`, `{rate}×`), so **ZERO new rider-facing strings**: `git diff -- app/tests/ui-strings.allow.json` must be empty; a STALE/UNLISTED report → STOP.
- Never delete; no git add/commit/push; no EAS/OTA; no edits outside §3/§4; `GIT_OPTIONAL_LOCKS=0`; strip-only TS.

## 1. Purpose
A 1× speed makes a replay run at wall-clock pace — the ride as it happened, for watching a sector crossing in real time. Both speed dials cycle on tap: REPLAY 1 → 5 → 10 → 25 → 1, DEMO 1 → 5 → 15 → 25 → 1.

## 2. Verified anchors (2026-10-09 ~22:30 UTC)
- `app/src/ui/replayModel.ts:22-24`:
  ```ts
  /** Ride-seconds per real second. Nathan/LBH: 10 first, tweak later. ONE constant. */
  export const REPLAY_RATE_DEFAULT = 10;
  export const REPLAY_RATES: readonly number[] = [5, 10, 25];
  ```
  `:25-27` the `SCRUB_S_PER_DP_PER_RATE` doc ("8 min at 5x, 16 min at 10x, 40 min at 25x"); `:29-35`:
  ```ts
  /** Cycles the replay speed dial 5 -> 10 -> 25 -> 5 (wraps). A rate not in REPLAY_RATES
   * (shouldn't happen) falls back to REPLAY_RATES[0] rather than throwing. */
  export function nextReplayRate(rate: number): number {
    const i = REPLAY_RATES.indexOf(rate);
    if (i === -1) return REPLAY_RATES[0];
    return REPLAY_RATES[(i + 1) % REPLAY_RATES.length];
  }
  ```
  `:47-48` `/** Ride-seconds the clock keeps running past the FINISH crossing before auto-pause (1 real s at 10x). */` `export const REPLAY_ROLL_OUT_S = 10;`.
- `app/src/ui/ReplayScreen.tsx:173` `setRate(nextReplayRate(anchor.rate));` `:224` the status line `` `replay · ${anchor.rate}x · …` ``; `:255` `<Text style={styles.dialText}>{anchor.rate}×</Text>` — no edit (the dial is 44 dp wide; "1×" is the shortest label).
- `app/src/ui/demoModel.ts:381-387`:
  ```ts
  /** virgin-cycle15 brief 03: DEMO playback speed presets (Nathan 2026-09-26:
   * "5x,15x,25x"). Deliberately NOT REPLAY_RATES (5/10/25) — DEMO is a test
   * harness with its own list. 25 was the fixed RATE before this brief, so the
   * default demo ride is unchanged. */
  export const DEMO_RATES = [5, 15, 25] as const;
  export type DemoRate = (typeof DEMO_RATES)[number];
  export const DEMO_RATE_DEFAULT: DemoRate = 25;
  ```
- `app/src/ui/DemoScreen.tsx:491-498` `cycleRate` (comment "wraps (5 → 15 → 25 → 5)"; the code indexes `DEMO_RATES` generically — no code edit); `:20` header comment "(5x/15x/25x on"; `:183` `let demoSessionRate: DemoRate = DEMO_RATE_DEFAULT;` (type widens automatically); `:684` accessibilityLabel `` `Demo speed ${rate}x` `` (computed; allow-list `:411` entry `Demo speed {…}x` already covers it).
- `app/tests/replay_suite.ts:93-96` constants test (`REPLAY_RATE_DEFAULT === 10`, default ∈ `REPLAY_RATES`); `:455-460`:
  ```ts
  test('replay: nextReplayRate cycles 5 -> 10 -> 25 -> 5 and falls back on an unknown rate', () => {
    assert(nextReplayRate(5) === 10, `expected 10, got ${nextReplayRate(5)}`);
    assert(nextReplayRate(10) === 25, `expected 25, got ${nextReplayRate(10)}`);
    assert(nextReplayRate(25) === 5, `expected wrap to 5, got ${nextReplayRate(25)}`);
    assert(nextReplayRate(7) === REPLAY_RATES[0], `unknown rate must fall back to REPLAY_RATES[0], got ${nextReplayRate(7)}`);
  });
  ```
- `app/tests/demo_suite.ts:125-128`:
  ```ts
  test('demoModel: DEMO_RATES is 5/15/25, default is today\'s fixed RATE', () => {
    assert(JSON.stringify(DEMO_RATES) === JSON.stringify([5, 15, 25]), `expected [5,15,25], got ${JSON.stringify(DEMO_RATES)}`);
    assert(DEMO_RATE_DEFAULT === 25, `expected default 25, got ${DEMO_RATE_DEFAULT}`);
  });
  ```
  `:229-230` `const fastest = Math.max(...DEMO_RATES);` roll-out check — keys on the MAX only, unaffected by adding 1.
- `STATE.md:188-189` mentions "default 10x" — still true; not edited (coordinator's file).

## 3. Edits
### 3.1 `src/ui/replayModel.ts`
- `:24` → `export const REPLAY_RATES: readonly number[] = [1, 5, 10, 25]; // virgin-cycle27 11 (Nathan 2026-10-08): 1x = real time, first on the dial`
- `:25-27` doc: append ` 1x (virgin-cycle27 11) = 1.6 min per swipe — frame-level nudging in real time.` inside the comment.
- `:29-30` doc → `/** Cycles the replay speed dial 1 -> 5 -> 10 -> 25 -> 1 (wraps; virgin-cycle27 11 added 1x). A rate not in REPLAY_RATES\n * (shouldn't happen) falls back to REPLAY_RATES[0] rather than throwing. */`. Code unchanged.
- `:47` doc → `/** Ride-seconds the clock keeps running past the FINISH crossing before auto-pause (1 real s at 10x, 10 real s at 1x — virgin-cycle27 11). */`
### 3.2 `src/ui/demoModel.ts`
- `:381-384` doc: append ` virgin-cycle27 11 (Nathan 2026-10-08): 1x added first — real time, next to the three presets.` before the closing `*/`.
- `:385` → `export const DEMO_RATES = [1, 5, 15, 25] as const;`
- `DEMO_RATE_DEFAULT` stays `25`.
### 3.3 Comments only
- `DemoScreen.tsx:492` "wraps (5 → 15 → 25 → 5)" → "wraps (1 → 5 → 15 → 25 → 1; virgin-cycle27 11)"; `:20` "(5x/15x/25x on" → "(1x/5x/15x/25x on". No code.
### 3.4 Nothing else
No change to `ReplayScreen.tsx`, `DemoScreen.tsx` code, `liveView.tsx`, the scrub maths, the roll-outs, the allow-list, `STATE.md`.

## 4. Tests
### 4.1 `tests/replay_suite.ts:455-460` → 
```ts
test('replay: nextReplayRate cycles 1 -> 5 -> 10 -> 25 -> 1 (virgin-cycle27 11: 1x = real time) and falls back on an unknown rate', () => {
  assert(JSON.stringify(REPLAY_RATES) === JSON.stringify([1, 5, 10, 25]), `REPLAY_RATES = ${JSON.stringify(REPLAY_RATES)}`);
  assert(nextReplayRate(1) === 5, `expected 5, got ${nextReplayRate(1)}`);
  assert(nextReplayRate(5) === 10, `expected 10, got ${nextReplayRate(5)}`);
  assert(nextReplayRate(10) === 25, `expected 25, got ${nextReplayRate(10)}`);
  assert(nextReplayRate(25) === 1, `expected wrap to 1, got ${nextReplayRate(25)}`);
  assert(nextReplayRate(7) === REPLAY_RATES[0], `unknown rate must fall back to REPLAY_RATES[0], got ${nextReplayRate(7)}`);
  assert(REPLAY_RATE_DEFAULT === 10, 'the default is still 10x');
});
```
Add directly after it:
```ts
test('virgin-cycle27 11: at 1x the replay clock runs at wall-clock pace and a scrub is 0.4 ride-s per dp', () => {
  const a = { clockS: 100, realMs: 1_000_000, rate: 1, playing: true };
  assert(replayClockS(a, 1_000_000 + 2_500) === 102.5, `2.5 real s at 1x -> 102.5 ride-s, got ${replayClockS(a, 1_000_000 + 2_500)}`);
  assert(scrubDeltaS(10, 1) === 4, `10 dp at 1x -> 4 ride-s, got ${scrubDeltaS(10, 1)}`);
});
```
(`replayClockS` and `scrubDeltaS` are already imported at `:29`; check `replayClockS`'s exact anchor shape at `replayModel.ts:110-113` — if its fields differ from `{ clockS, realMs, rate, playing }`, adapt the literal and say so; if the function reads other fields, STOP.)
### 4.2 `tests/demo_suite.ts:125-128` →
```ts
test('demoModel: DEMO_RATES is 1/5/15/25 (virgin-cycle27 11 added 1x), default is today\'s fixed RATE', () => {
  assert(JSON.stringify(DEMO_RATES) === JSON.stringify([1, 5, 15, 25]), `expected [1,5,15,25], got ${JSON.stringify(DEMO_RATES)}`);
  assert(DEMO_RATE_DEFAULT === 25, `expected default 25, got ${DEMO_RATE_DEFAULT}`);
  assert(Math.min(...DEMO_RATES) === 1, '1x = real time is on the dial');
});
```

## 5. Acceptance
1. Baseline (record it) → **+1 test, 0 FAIL**. `demo_suite.ts:229-230` (roll-out at the fastest rate) passes unedited; every other `replay_suite` / `demo_suite` test passes unedited.
2. `tsc --noEmit` exit 0 (`12-brief-11-tsc.log`, timeout_ms 180000). `DemoRate` now includes `1`; `demoSessionRate` / `useState<DemoRate>` compile unchanged.
3. `git diff --stat`: `src/ui/replayModel.ts`, `src/ui/demoModel.ts`, `src/ui/DemoScreen.tsx` (comments), `tests/replay_suite.ts`, `tests/demo_suite.ts`. Allow-list diff EMPTY.
4. `grep -n "\[5, 10, 25\]\|\[5, 15, 25\]" src tests -r` → no hits.

## 6. What this changes on Nathan's phone (JS-only, OTA)
REPLAY (from an activity's detail page) and DEMO: tapping the round speed dial now cycles through 1× too (first after 25×). At 1× the ride plays in real time: the 10 s roll-out after FINISH takes 10 real seconds before auto-pause, and a full-width scrub swipe moves ~1.6 min. Defaults unchanged (REPLAY opens at 10×, DEMO at 25×). Nothing else.

## 7. Rollback
Remove the `1,` from both lists and restore the two tests.

## 8. Report
`12-brief-11-executor-report.md`: files, counts, tsc, allow-list diff (empty), the switch you were given (both / replay only / demo only), any STOP. OPEN-ITEMS line: "Replay/Demo 1x (cycle27 brief 11) — on-device: tap the dial through 1× on REPLAY and DEMO; at 1× the clock ticks once a second and the roll-out is 10 real s."
