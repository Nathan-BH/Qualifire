# 04 — PAUSE button: just the word PAUSE, centred (drop the "recording continues · resume or end" sub-text)

**Source: Nathan, 2026-09-30** — the PAUSE button carries a clutter sub-line
`recording continues · resume or end`. Ruling: remove it; the button shows only **PAUSE**, centred.

**Status: brief only. Nothing below is in the app.** Written 2026-09-30 by the Plan tier (Fable)
against the working tree (branch `virgin`, HEAD `ae911bb`, 784 tests / 781 pass / 0 fail / 3 skip
at HEAD; add whatever cycle19 / cycle20 briefs 01-03 landed before this one). Executor: Sonnet,
cold, this file only. Independent of briefs 01-03 (different files) — can run in any order.

## What this changes on the phone — and what it does not

- **Changes:** while recording, the slim amber PAUSE bar shows the single word `PAUSE`, centred,
  nothing under or beside it.
- **Stays:** bar height (56), amber border, tap → RESUME | END menu (+ Discard ride), the RESUME
  and END buttons (they already carry only their word — no sub-text exists there, verified), the
  START button's sub-label (a different button, `bigBtnSub`, untouched).
- **JS-only → OTA-able** (one `.tsx`, one test file; no native, no config, no asset). Confirmed:
  `RecordScreen.tsx` and `tests/` are inside the JS bundle; nothing under `modules/`, `android/`,
  `app.json`, `plugins/` is touched.

## Evidence (read 2026-09-30)

- `app/src/ui/RecordScreen.tsx` lines 1446-1454 (inside the `phase === 'running'` column, after the
  status/warn lines, under the `PAUSE → RESUME | END (Cycle 020)` comment):
  ```tsx
        {!pauseMenu ? (
          <Pressable
            style={[styles.stopSlim, busy && styles.busy]}
            disabled={busy}
            onPress={() => { noteButtonPress('pause'); setPauseMenu(true); }}
          >
            <Text style={styles.stopSlimText}>PAUSE</Text>
            <Text style={styles.stopSlimSub}>recording continues · resume or end</Text>
          </Pressable>
        ) : (
  ```
  RESUME (line 1463) and END (line 1470) are `<Text style={styles.stopSlimText} numberOfLines={1}>…</Text>`
  alone — no sub-text there.
- Styles, lines 1811-1827:
  ```ts
    stopSlim: {
      alignSelf: 'stretch',
      height: 56,
      borderRadius: radius.btn,
      borderWidth: 2,
      borderColor: colors.amber,
      backgroundColor: t.race.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    // flexShrink + numberOfLines at the call sites: a stopSlim button's content
    // can now never push past its flex:1 width, whatever future copy does
    // (2026-08-25 screenshot: "ESUME back to the rid" off both screen edges).
    stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
    stopSlimSub: { color: t.textDim, fontSize: 11, letterSpacing: 1 },
  ```
  `stopSlim` is a fixed-height (56) row with `alignItems: 'center'` + `justifyContent: 'center'` —
  the word and the sub-text sit side by side today (row, `gap: 12`), not stacked. With one child the
  row centres it both ways; height does not change. `gap` becomes moot with a single child
  (harmless; kept because RESUME | END reuse `stopSlim`).
- `stopSlimSub` is used **exactly once** in the repo's app sources (line 1453). The string
  `recording continues` / `resume or end` appears in **no** test, no other `src/` file
  (`grep -rn "recording continues\|resume or end\|stopSlimSub" app/src app/tests` → only
  `RecordScreen.tsx` 1453 and 1827). `STATE.md` / `OPEN-ITEMS.md` do not quote it.
- `app/tests/recordflow_suite.ts` is the RECORD-screen suite (pure, imports `assert, test` from
  `./lib.ts`, no `fs`); it is where the regression pin goes.

## Executor rules (binding)

- **Stop-on-ambiguity.** If any quoted line is not found verbatim, stop and report (file, line,
  expected, found). Never guess.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a stray `.git/index.lock` is `mv`'d aside).
  Nothing is deleted or moved in this brief.
- No `npm install`, `npx`, `eas`.
- **Files touched — exactly these:**
  - EDIT `app/src/ui/RecordScreen.tsx` (remove one JSX line, remove one style line)
  - EDIT `app/tests/recordflow_suite.ts` (one new test)
- Do **not** touch: `stopSlim` / `stopSlimText` styles, RESUME / END / Discard markup, the
  START button and `bigBtnSub`, `liveView.tsx`, `recordFlow.ts`, `tests/run.ts`, anything else.

## Goal

The running-phase PAUSE bar renders `<Text style={styles.stopSlimText}>PAUSE</Text>` as its only
child; the `stopSlimSub` style and the sub-text string no longer exist in `RecordScreen.tsx`; a
suite test pins both; tests 0 FAIL, `tsc` clean.

## Decisions

1. **Remove the `<Text style={styles.stopSlimSub}>` line only; leave the Pressable, its style
   array and `onPress` untouched.** No `numberOfLines={1}` is added to PAUSE (RESUME/END have it
   because they share a row at `flex: 1`; PAUSE spans the full width and always did without it —
   out of scope).
2. **Remove the now-unused `stopSlimSub` style.** `tsc` does not flag unused StyleSheet keys, so
   this is hygiene, and it makes the suite pin (`!includes('stopSlimSub')`) meaningful.
3. **Layout:** unchanged height (56 fixed), the single child is centred by the existing
   `alignItems`/`justifyContent`; no style edit needed. The comment above `stopSlimText`
   (flexShrink rationale) still applies to RESUME | END — leave it.
4. **Pin it** with one text-level test in `recordflow_suite.ts` (that suite is "the exact rules
   RecordScreen.tsx … are built from"; reading the screen as text is the same technique
   `ridenotification_suite.ts` uses for `index.ts`). Count +1.

## Files to touch

### 1. EDIT `app/src/ui/RecordScreen.tsx`

(a) Lines 1452-1453 — before:
```tsx
            <Text style={styles.stopSlimText}>PAUSE</Text>
            <Text style={styles.stopSlimSub}>recording continues · resume or end</Text>
```
after (the sub-text line is gone; the word stays as-is):
```tsx
            <Text style={styles.stopSlimText}>PAUSE</Text>
```

(b) Line 1827 — before:
```ts
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
  stopSlimSub: { color: t.textDim, fontSize: 11, letterSpacing: 1 },
```
after:
```ts
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
```

Optional (allowed, one line): in the comment block at lines 1440-1445 (`{/* PAUSE → RESUME | END
(Cycle 020): a safety catch, not a real pause …`) nothing mentions the sub-text — leave it.

### 2. EDIT `app/tests/recordflow_suite.ts`

(a) Imports — before (lines 6-10):
```ts
import { assert, test } from './lib.ts';
import {
  canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, statusItemsFor, type RecordPhase,
} from '../src/ui/recordFlow.ts';
import { addSport, emptySports } from '../src/store/sports.ts';
```
after:
```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  canTransition, effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, statusItemsFor, type RecordPhase,
} from '../src/ui/recordFlow.ts';
import { addSport, emptySports } from '../src/store/sports.ts';
```
(`TESTS_DIR` is exported by `tests/lib.ts` line 16.)

(b) Append at the end of the file:
```ts
test('virgin-cycle20 04: PAUSE bar is the bare word — no "recording continues" sub-text, no stopSlimSub style', () => {
  const src = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RecordScreen.tsx'), 'utf8');
  assert(!src.includes('recording continues'), 'PAUSE sub-text copy must be gone (Nathan, 2026-09-30)');
  assert(!src.includes('resume or end'), 'PAUSE sub-text copy must be gone (Nathan, 2026-09-30)');
  assert(!src.includes('stopSlimSub'), 'unused stopSlimSub style removed');
  const pause = src.indexOf("noteButtonPress('pause')");
  assert(pause >= 0, 'PAUSE Pressable present');
  const block = src.slice(pause, src.indexOf('</Pressable>', pause));
  assert((block.match(/<Text\b/g) ?? []).length === 1 && block.includes('>PAUSE</Text>'), 'PAUSE Pressable has exactly one Text child: the word');
});
```

## Verification plan

1. Run the suite once with the **test added but RecordScreen not yet edited** → the new test
   FAILs on `recording continues` (the "failed before" artifact). Then apply step 1.
2. `cd app && node --experimental-strip-types tests/run.ts` → **0 FAIL**, total = previous total
   + 1 (785 on a bare `ae911bb`; more if other briefs landed first). Report the summary line.
3. `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0.
4. `grep -n "stopSlimSub\|recording continues\|resume or end" app/src/ui/RecordScreen.tsx` → no
   output. `grep -c "stopSlimText" app/src/ui/RecordScreen.tsx` → 4 (PAUSE, RESUME, END, the
   style) — unchanged from today.
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` → `M app/src/ui/RecordScreen.tsx`,
   `M app/tests/recordflow_suite.ts` (plus whatever other briefs left).
6. Inspect (fresh Opus): reruns 1-5; diff of `RecordScreen.tsx` is exactly two removed lines.

## On-device check — Nathan (OTA is enough)

Start a ride: the amber bar reads only `PAUSE`, centred, same height as before. Tap it: RESUME | END
+ Discard ride unchanged. Screenshot into this folder's `PROGRESS.md`.

## Out of scope

Any change to the RESUME / END / Discard copy or layout, the START sub-label, `bigBtnSub`, the
pause semantics (D-042: a safety catch, recording continues — the *behaviour* the removed text
described is unchanged, only the text is gone).

## Report back

- FAIL line from Verification 1, final summary line, `tsc` exit code, the two greps, `git status`.
- Any anchor mismatch, verbatim — and stop there.
- Reminder line for the coordinator: "JS-only, OTA-able".
