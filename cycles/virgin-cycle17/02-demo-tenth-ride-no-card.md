# 02 — DEMO: TENTH RIDE ends like a real ride on a known way — no "new way?" card

**Source: Nathan, 2026-09-29.** His words: "also i feel like the demos post ride screen do
not reflect reality. For example the tenth ride screen asks if it is a new way on HomeWork;
but i home it is not the case like that in the real app. If it is a tenth ride, i assume i
already chose the correct way initially on RECORD screen, so it should not propose me that?"

**This brief reverses an explicit ruling by a previous Plan tier.**
`cycles/virgin-cycle11/BRIEF-demo-tenth-ride-reveal.md` R6 chose, on purpose, to show WP-G's
"new way on this route" card after the reveal in BOTH SECOND and TENTH RIDE — "that is a real
screen a real rider sees, and it is the one with something to fill in". Two things have
changed since: (1) cycle15 brief 05 (Nathan 2026-09-26) made the real screen stop
auto-showing that card for a ride scored as an existing way — it now shows only a dim
`not <way>?` link through the reveal and plays the end mark by itself; (2) Nathan now says
the card is wrong for a tenth ride. Nothing is broken; the demo is simply behind the real
screen, and this is written down so nobody reads it as a bug fix.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `c98a4a5`). Executor: Sonnet, cold, this file only. Brief 02 of
`virgin-cycle17`. **It shares `app/src/ui/DemoScreen.tsx` with brief 01** of this folder —
run 01 and 02 in ONE executor pass, 01 first. Brief 01 edits lines 206, 217, 515, 524 and
723 (comments, one state comment, one prop); this brief inserts lines at 56, 76, 100, 228, 310,
333, 589-594, 662-701 and 792 and adds ~40 lines above brief 01's render site. Match on the
**quoted text**, never on line numbers, whichever order they run.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. **Do not touch `RecordScreen.tsx`, `recordFlow.ts`,
  `routeNamingCard.tsx`, `rankingRevealModel.ts` or `tower.tsx`** — the demo mirrors them by
  value; nothing there is shared, imported anew or edited.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief here, or anything under `cycles/virgin-cycle11/` /
  `cycles/virgin-cycle15/` (history — cycle11's R6 stays as it was).
- The only files touched: `app/src/ui/DemoScreen.tsx`, `app/src/ui/demoModel.ts`,
  `app/tests/demo_suite.ts`.

## Goal

TENTH RIDE's ending screen behaves exactly like the real RECORD screen after a ride on a
route the rider already has: "Ride saved.", the tower's ranking reveal, one dim
`not Home → Work?` link under it while the tower climbs and holds, and then — with no tap —
the end mark plays by itself and the demo returns to idle. Tapping the link during the
climb or the hold opens the same WP-G "New way on Home → Work" card the demo shows today
(ADD WAY / skip), exactly as the real screen does. SECOND RIDE and FIRST RIDE are unchanged.

## Current state (verified 2026-09-29 against the tree)

### How SECOND vs TENTH is distinguished today

- `app/src/ui/demoModel.ts` line 41: `export type DemoMode = 'first' | 'second' | 'tenth';`
- line 71: `export const DEMO_PRIOR_LAPS: Readonly<Record<DemoMode, number>> = { first: 0, second: 1, tenth: WINDOW_PREV };`
  — the ONLY thing that separates SECOND from TENTH today is how many prior laps feed the
  reveal, the plot and the self dots. Every post-reveal branch in `DemoScreen.tsx` tests
  `mode === 'first'` and treats second/tenth identically ("SECOND/TENTH" in the comments).
- lines 132-136, the existing pure STOP rule the new rule sits next to:

  ```ts
  /** R4: what the STOP button (and hardware back) does. */
  export type DemoStopOutcome = 'skip' | 'ending';
  export function demoStopOutcome(gatesDone: number, sectorCount: number = DEMO_SECS.length): DemoStopOutcome {
    return gatesDone >= sectorCount ? 'ending' : 'skip';
  }
  ```

- line 138: `/** R7: theatre timings for the fake save. */` (the next block).
- lines 316-318: `DEMO_ROUTE_START = 'Home'`, `DEMO_ROUTE_END = 'Work'`,
  ``DEMO_ROUTE_LABEL = `${DEMO_ROUTE_START} → ${DEMO_ROUTE_END}` ``.

### `app/src/ui/DemoScreen.tsx`

- Lines 48-56, the header paragraph this brief amends (line 57 is ` *`, line 58 starts
  ` * virgin-cycle14 brief 08`):

  ```
   * virgin-cycle11 brief B: a third mode, TENTH RIDE (now the default) —
   * SECOND RIDE is an honest ride 2 (one prior lap, purple/yellow only);
   * TENTH RIDE judges today against the last WINDOW_PREV pinned laps, the
   * real app's whole ranking pool. Once the run ends, SECOND/TENTH mount the real
   * `TimingTower` in reveal mode over a board built by the real
   * `buildRankingReveal` (an injected synthetic window, no store reads) and,
   * after the hold, the real `RouteNamingCard` in its WP-G "new way on this
   * route" variant — FIRST RIDE still mounts the both-endpoints-unknown card
   * straight away. Every SAVE/ADD WAY here is theatre: nothing is written.
  ```

- Lines 76-77 of the `demoModel.ts` import list: `  demoPlotResults,` / `  demoRunEndS,`.
- Line 107: `import { REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type RankingReveal } from './rankingRevealModel.ts';`
- Lines 225-228, the reveal state:

  ```tsx
    // virgin-cycle11 (brief B, R1/R6): the ranking reveal board (SECOND/TENTH only).
    const [reveal, setReveal] = useState<RankingReveal | null>(null);
    const [revealDone, setRevealDone] = useState(true);
    const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  ```

- Lines 304-314, `enterEnding` (deps `[mode]`, so `mode` is fresh here — the comment above
  it says why):

  ```tsx
    const enterEnding = useCallback(() => {
      clearTimer();
      setRunning(false);
      const now = Date.now();
      const next = buildDemoReveal(mode, now);
      setReveal(next);
      setRevealDone(next === null);
      setEndedAtMs(now);            // brief 08: dates the plot (same instant as the reveal)
      setPlotSel(DEMO_TODAY_RIDE_ID);
      setPhase('ending');
    }, [mode]);
  ```

- Lines 316-334, `exitToIdle` — its last three lines (332-334): `    setAdjust(null);` /
  `    setPendingNames(null);` / `    setPhase('idle');` then `  }, []);`. **Note:** there is a
  second `setPendingNames(null);` at line 407 inside `start()` — Edit H is the one in
  `exitToIdle`, identified by the `setPhase('idle');` directly below it.
- Line 550: `const onDemoNamingSkip = useCallback(() => setShowAnim('rev'), []);` — unchanged.
- Lines 589-594, the reveal hold timer (deps `[]`):

  ```tsx
    // R6: the reveal's hold timer — after onPlayed, the card/line appears
    // REVEAL_HOLD_MS later, exactly RecordScreen.tsx's revealHoldRef.
    const onRevealPlayed = useCallback(() => {
      revealHoldRef.current = setTimeout(() => { revealHoldRef.current = null; setRevealDone(true); }, REVEAL_HOLD_MS);
    }, []);
  ```

- Lines 662-701, the ending screen's slot under the tower. The chain is
  `revealDone ? (savedLine → adjust → mode==='first' card → WP-G card) : null`:

  ```tsx
            {revealDone ? (
              savedLine !== null ? (
                <Text style={styles.trackLine}>{savedLine}</Text>
              ) : adjust !== null ? (
                <GateAdjustCard
  ```
  … (FIRST RIDE's card, lines 676-686) …
  ```tsx
              ) : (
                // R6: SECOND/TENTH RIDE's after-reveal card — WP-G "new way on this route".
                <RouteNamingCard
                  startExistingLabel={DEMO_ROUTE_START}
                  endExistingLabel={DEMO_ROUTE_END}
                  loop={false}
                  busy={busy}
                  matchedWayLabel={DEMO_ROUTE_LABEL}
                  existingRoute={{ label: DEMO_ROUTE_LABEL, knownSpecLists: [[]] }}
                  vocabulary={[...DEMO_SPEC_VOCABULARY]}
                  onSave={onDemoAddWaySave}
                  onSkip={onDemoNamingSkip}
                />
              )
            ) : null}
  ```

- Lines 702-720: the RESULTS plot, gated `revealDone && plotResults !== null` — unchanged.
- Line 723: `{showAnim === 'rev' && <LaunchAnimation reverse onDone={exitToIdle} />}` —
  brief 01's line. **Not touched here.**
- Lines 784-792 of `makeStyles`, the `trackLine` style ends `    marginTop: 10,` / `  },`
  and line 793 is `  // virgin-cycle16 07: REPLAY's control-row vocabulary (ReplayScreen.tsx`.
- `busy` (line 218), `styles` (line 192, `makeStyles(t)`), `Pressable` and `Text` (line 64
  import) all exist and are in scope for the new link.

### The real screen being mirrored — `app/src/ui/RecordScreen.tsx` (read only)

- Line 232: `const postRevealRef = useRef<'card' | 'rev'>('rev');` — decided in `onEnd`
  (line 681: `postRevealRef.current = namingOfferMode(draft) === 'card' ? 'card' : 'rev';`).
- Lines 211-213: `namingExpanded` state + `namingExpandedRef` mirror.
- Lines 704-719, `onRevealPlayed`, and 725-732, `onNotThisWay` — copied by value below.
- Lines 1252-1263: the link element; 1695-1696 its two styles:
  `notThisWayBtn: { paddingVertical: 10, alignItems: 'center' },` /
  `notThisWayText: { color: t.textDim, fontSize: 13 },`.
- `app/src/ui/recordFlow.ts` lines 141-148, `endingSlotFor`: the link shows only while
  `!revealDone && offer === 'quiet' && !namingExpanded`; once `revealDone`, the card shows
  only if `offer === 'card' || (offer === 'quiet' && namingExpanded)`. The demo's inline
  conditions below encode the same rule for its one quiet mode (TENTH).

### `app/tests/demo_suite.ts`

- Line 36 of the destructured import: `  demoRunEndS, DEMO_ROLL_OUT_S, demoStopOutcome, demoLiveViewModel, demoSavedLine, demoFmtMS,`
- Lines 176-181, the STOP-rule test the new test follows:

  ```ts
  test('demoModel: STOP skips before the line, ends after it', () => {
    for (let g = 0; g <= 3; g++) {
      assert(demoStopOutcome(g) === 'skip', `demoStopOutcome(${g}) expected 'skip', got ${demoStopOutcome(g)}`);
    }
    assert(demoStopOutcome(4) === 'ending', `demoStopOutcome(4) expected 'ending', got ${demoStopOutcome(4)}`);
  });
  ```

## Decisions (pre-resolved — do not re-open)

1. **Which mode shows what.** TENTH RIDE → the real screen's *quiet offer*: dim
   `not Home → Work?` link during climb + hold, end mark by itself after the hold, card only
   on tap. SECOND RIDE → unchanged: cycle11 R6's WP-G card after the hold. FIRST RIDE →
   unchanged. Why: Nathan's complaint names the tenth ride and its reasoning ("i already
   chose the correct way initially") is exactly the real screen's quiet-offer case; SECOND
   RIDE keeps the one ending "with something to fill in" so the demo still teaches ADD WAY
   without a tap. (Open question 2 logs making SECOND real too.)
2. **TENTH mirrors the real screen, not a simplification of it.** "No card, mark after the
   hold" alone would be simpler, but the real screen shows the link, and Nathan's complaint
   is "do not reflect reality". The link also keeps the WP-G card reachable in TENTH for
   anyone who wants to try it. Copied by value from RecordScreen (this file's standing
   pattern: "the run/ending columns mirror RecordScreen's own race surface exactly").
3. **The mode → outcome rule is a pure function in `demoModel.ts`** (`demoPostReveal`),
   tested, and read once in `enterEnding` into a `postRevealRef` — RecordScreen's
   `postRevealRef` decided in `onEnd`, in disguise. `onRevealPlayed` keeps `[]` deps and
   reads refs (the tower captures `onPlayed` at mount — `tower.tsx` line 169 — same reason
   RecordScreen uses refs).
4. **After the TENTH hold, `setRevealDone(true)` AND `setShowAnim('rev')` in the same tick**,
   exactly RecordScreen lines 712-717. The RESULTS plot therefore mounts under the mark for
   the mark's duration and unmounts with `exitToIdle`; invisible in practice, harmless, and
   the same order of operations as the real screen. Not gated further (Open question 1
   records the plot-preview trade-off).
5. **Link text is `not ${DEMO_ROUTE_LABEL}?`** — the demo's fixed route label, which is
   what `wayLabelIn(...)` would render on the real screen for this way. Same
   `accessibilityLabel`, same `disabled={busy || showAnim !== null}`, same two styles by
   value.
6. **`namingExpanded` resets in `exitToIdle` only.** `exitToIdle` is the only way out of
   `'ending'` (mark `onDone` or hardware back), and `switchMode`/`start` are reachable only
   from idle, so no other reset is needed. `enterEnding` sets `postRevealRef` fresh every
   run.
7. **No new `DemoMode`, no fourth pill.** Nathan asked for the tenth ride to stop proposing
   a new way, not for another scenario.
8. **Brief 01 owns the `reverse` prop; this brief never touches line 723.**

## Files to touch

### 1. `app/src/ui/demoModel.ts`

**Edit A — after line 136** (the `}` closing `demoStopOutcome`) and before line 138
(`/** R7: theatre timings for the fake save. */`), insert:

```ts

/** virgin-cycle17 brief 02 (Nathan 2026-09-29): what the ending screen does once the tower
 *  has landed and held — RecordScreen's postRevealRef, decided per mode instead of per draft.
 *  TENTH RIDE is a ride on a route the rider chose on RECORD long ago, so the real screen
 *  makes only a quiet offer (a dim "not <way>?" link through climb + hold) and then plays the
 *  end mark by itself; the WP-G card opens only if the link is tapped. SECOND RIDE keeps
 *  cycle11 R6's card-after-hold — the one ending with something to fill in. FIRST RIDE has
 *  no reveal (buildDemoReveal is null there), so its value is never read. */
export type DemoPostReveal = 'card' | 'rev';
export function demoPostReveal(mode: DemoMode): DemoPostReveal {
  return mode === 'tenth' ? 'rev' : 'card';
}
```

(One blank line before the doc comment, so the file keeps one blank line between blocks.)

### 2. `app/tests/demo_suite.ts`

**Edit B — line 36.** Replace `demoStopOutcome, demoLiveViewModel` with
`demoStopOutcome, demoPostReveal, demoLiveViewModel` (same line, nothing else changes).

**Edit C — after line 181** (the `});` closing the STOP test quoted above), insert:

```ts

test('demoModel: after the reveal, TENTH RIDE plays the end mark by itself; SECOND keeps the card', () => {
  assert(demoPostReveal('tenth') === 'rev', `demoPostReveal('tenth') expected 'rev', got ${demoPostReveal('tenth')}`);
  assert(demoPostReveal('second') === 'card', `demoPostReveal('second') expected 'card', got ${demoPostReveal('second')}`);
  assert(demoPostReveal('first') === 'card', `demoPostReveal('first') expected 'card', got ${demoPostReveal('first')}`);
});
```

### 3. `app/src/ui/DemoScreen.tsx`

**Edit D — header comment.** After line 56 (` * straight away. Every SAVE/ADD WAY here is
theatre: nothing is written.`) and before the existing ` *` on line 57, insert:

```
 * virgin-cycle17 brief 02 (Nathan 2026-09-29): TENTH RIDE no longer mounts that
 * card by itself — a tenth ride is on a route the rider chose on RECORD long ago,
 * so it ends as the real screen does since cycle15 brief 05: a dim `not Home →
 * Work?` link through the tower's climb + hold, then the end mark with no tap;
 * the WP-G card opens only from the link (`demoPostReveal`, `postRevealRef`,
 * `namingExpanded` — RecordScreen's own names, by value). SECOND RIDE keeps the
 * card after the hold: the one ending with something to fill in.
```

**Edit E — import.** Between `  demoPlotResults,` (line 76) and `  demoRunEndS,` (line 77)
insert `  demoPostReveal,` (alphabetical order of the existing list).

**Edit F — state.** After line 228
(`  const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);`) insert:

```tsx
  // virgin-cycle17 brief 02: what the ending screen does once the reveal has played —
  // mount the WP-G card, or start the end mark (demoPostReveal, set in enterEnding).
  // A ref, not a closure over `mode` — the tower's onPlayed fires from an animation
  // callback captured at mount, exactly RecordScreen.tsx's postRevealRef.
  const postRevealRef = useRef<DemoPostReveal>('card');
  // TENTH RIDE's quiet offer: tapping the `not Home → Work?` link sets this, which
  // (1) renders the WP-G card and (2) makes the post-reveal hold keep the screen up
  // instead of playing the end mark. Ref for the [] timeout closure, as above.
  const [namingExpanded, setNamingExpanded] = useState(false);
  const namingExpandedRef = useRef(false);
  namingExpandedRef.current = namingExpanded;
```

and add `  type DemoPostReveal,` to the `demoModel.ts` import list between
`  type DemoPhase,` and `  type DemoRate,` (lines 99-100).

**Edit G — `enterEnding`.** After `      setRevealDone(next === null);` (line 310) insert:

```tsx
      postRevealRef.current = demoPostReveal(mode);   // brief 02: TENTH → 'rev', else 'card'
```

`mode` is already in the deps array; do not change `[mode]`.

**Edit H — `exitToIdle`.** After `    setPendingNames(null);` (line 333 — the one inside
`exitToIdle`, NOT the one at 407 inside `start()`) and before `    setPhase('idle');` insert:

```tsx
    setNamingExpanded(false);
```

**Edit I — `onRevealPlayed`.** Replace lines 589-594 (quoted in Current state) with:

```tsx
  // R6: the reveal's hold timer — after onPlayed, the card/line appears
  // REVEAL_HOLD_MS later, exactly RecordScreen.tsx's revealHoldRef.
  // virgin-cycle17 brief 02: with postRevealRef 'rev' (TENTH RIDE) the end mark starts
  // instead of the card, unless the link was tapped — namingExpandedRef is the live
  // escape hatch the frozen baseline can't see (RecordScreen.tsx's onRevealPlayed, by value).
  const onRevealPlayed = useCallback(() => {
    // The link was tapped during the climb — nothing to hold for, the card is due now.
    if (namingExpandedRef.current) {
      setRevealDone(true);
      return;
    }
    revealHoldRef.current = setTimeout(() => {
      revealHoldRef.current = null;
      setRevealDone(true);
      if (postRevealRef.current === 'rev' && !namingExpandedRef.current) setShowAnim('rev');
    }, REVEAL_HOLD_MS);
  }, []);
  // brief 02: the `not Home → Work?` tap. Expands the offer and, if the post-landing hold
  // is running, ends it now — the card shows at once and the cleared timer can never start
  // the end mark later. During the climb (no timer yet) onRevealPlayed handles the landing.
  const onNotThisWay = useCallback(() => {
    setNamingExpanded(true);
    if (revealHoldRef.current) {
      clearTimeout(revealHoldRef.current);
      revealHoldRef.current = null;
      setRevealDone(true);
    }
  }, []);
```

**Edit J — the ending slot, three sub-edits inside lines 662-701.**

J1. Replace the comment line 688

```tsx
              // R6: SECOND/TENTH RIDE's after-reveal card — WP-G "new way on this route".
```

with

```tsx
              // R6: SECOND RIDE's after-reveal card — WP-G "new way on this route". Brief 02:
              // TENTH RIDE reaches it only through the `not Home → Work?` link (namingExpanded).
```

J2. Replace the line directly above that comment, line 687

```tsx
            ) : (
```

with

```tsx
            ) : mode === 'tenth' && !namingExpanded ? null : (
```

(the four-line context: the FIRST RIDE card's closing `/>` on 686, then this line, then the
J1 comment, then `<RouteNamingCard`).

J3. Replace the chain's closing line 701

```tsx
          ) : null}
```

(the one directly after the WP-G card's closing `)` on line 700 and directly before the
`{/* virgin-cycle14 brief 08 (Nathan #11): the RESULTS tab's scatterplot` comment) with

```tsx
          ) : mode === 'tenth' && !namingExpanded ? (
            /* brief 02: TENTH RIDE's quiet offer — the ride is already "saved" as the
               scored way; this one dim line is the whole correction affordance. Shown
               through the tower climb + hold (before revealDone — recordFlow.ts
               endingSlotFor's 'link' slot, by value); tapping holds the screen. */
            <Pressable
              style={styles.notThisWayBtn}
              disabled={busy || showAnim !== null}
              onPress={onNotThisWay}
              accessibilityLabel="This ride was a different way"
            >
              <Text style={styles.notThisWayText}>{`not ${DEMO_ROUTE_LABEL}?`}</Text>
            </Pressable>
          ) : null}
```

**Edit K — styles.** After the `trackLine` block's closing `  },` (line 792, the one after
`    marginTop: 10,`) and before `  // virgin-cycle16 07: REPLAY's control-row vocabulary`
insert:

```tsx
  // brief 02: the quiet offer's link — RecordScreen.tsx notThisWayBtn/notThisWayText, by value.
  notThisWayBtn: { paddingVertical: 10, alignItems: 'center' },
  notThisWayText: { color: t.textDim, fontSize: 13 },
```

Nothing else in the file changes. Line 723 (brief 01) is not touched.

## Verification

From the repo root:

- `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL**, and the new test
  `demoModel: after the reveal, TENTH RIDE plays the end mark by itself; SECOND keeps the card`
  is listed as passing.
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (the `DemoPostReveal` type
  import and the `useRef<DemoPostReveal>` are what would fail if Edit F's import was missed).
- `grep -n "demoPostReveal" app/src/ui/demoModel.ts app/src/ui/DemoScreen.tsx app/tests/demo_suite.ts`
  → definition (demoModel), import + one call in `enterEnding` (DemoScreen), import + three
  asserts (demo_suite).
- `grep -n "namingExpanded" app/src/ui/DemoScreen.tsx` → the state/ref block (Edit F), the
  reset in `exitToIdle` (H), `onRevealPlayed` + `onNotThisWay` (I), the two render guards
  (J2, J3). No hit anywhere else.
- `grep -n "setShowAnim('rev')" app/src/ui/DemoScreen.tsx` → five hits: the four brief 01
  counts (550, 560, 571, 584 shifted) plus the new one inside `onRevealPlayed`.
- `grep -n "notThisWay" app/src/ui/DemoScreen.tsx` → the two styles, the two style uses,
  `onNotThisWay`'s definition and its `onPress`.
- `grep -n "mode === 'tenth'" app/src/ui/DemoScreen.tsx` → exactly three hits: J2, J3 and the
  pre-existing TENTH pill (`mode === 'tenth' ? styles.pillSelected`, twice on the pill —
  so four in total if the grep counts both pill lines; report the count either way).
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the three files named above.

## On-device checklist (Nathan, after publish)

1. DEMO → TENTH RIDE → RUN → let it play out: "Ride saved.", the tower climbs to P3, a dim
   `not Home → Work?` line sits under it, the tower holds, then **the mark plays with no
   tap** and the chooser returns. **No "New way on Home → Work" card.**
2. Same, but tap `not Home → Work?` while the tower is still climbing: the line disappears;
   when the tower lands the WP-G card appears at once (no hold). Skip → mark. ADD WAY with a
   spec → "Home → Work · Dry added as a new way · demo only" line → mark.
3. Same, but tap the link during the hold (tower landed, still on screen): the card appears
   immediately and the mark does not fire until skip/ADD WAY.
4. DEMO → SECOND RIDE → RUN: exactly as before — tower, hold, **the card appears by itself**,
   no link.
5. DEMO → FIRST RIDE → RUN: exactly as before — card straight away, no tower, no link.
6. TENTH RIDE: hardware back during the reveal → chooser (no mark, as before). Then RUN
   again → step 1 again (the link is back; the expanded state did not leak).
7. The RESULTS-style plot: still below the card in SECOND/FIRST and in TENTH after the link
   is tapped. In TENTH's no-tap path it is not seen (Open question 1).

## Out of scope

- Making SECOND RIDE real too (Open question 2).
- Any new `DemoMode`, pill, or wording on the idle chooser.
- The card's own copy — brief 03 (`routeNamingCard.tsx`) is independent: the demo only
  passes props in.
- The mark's direction — brief 01.
- `RecordScreen.tsx`, `recordFlow.ts` (`endingSlotFor` is mirrored inline, not imported —
  its `NamingOfferMode` input is a store-draft concept the demo does not have).
- iOS (no iOS build). `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md`.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (no dependency, no
`app.json`/`eas.json` change), so it ships to the Preview APK over EAS Update via
`scripts/publish-preview.cmd` — no new numbered build, no reinstall. Visible only on the
DEMO tab in TENTH RIDE: after the ranking reveal there is no more "New way on Home → Work"
card; instead a dim `not Home → Work?` link sits under the tower while it climbs and holds,
and the end mark then plays by itself — the same ending a real ride on a known route gets.
The card is still there behind the link for anyone who taps it. SECOND RIDE, FIRST RIDE,
the RECORD tab and everything else are unchanged.

## Open questions / assumptions (logged, not blocking)

1. **TENTH's no-tap path loses the RESULTS plot preview** (cycle14 brief 08, Nathan #11).
   The plot renders only once `revealDone`, and in the real screen that instant is also when
   the mark starts. Keeping the plot visible would mean a demo-only hold (e.g. a
   `DEMO_SAVED_HOLD_MS`-style 1.8 s pause with a "scored as Home → Work" line before the
   mark) — the kind of "does not reflect reality" theatre this brief removes. Chosen: real.
   If Nathan misses the plot on TENTH, that pause is a ~6-line follow-up in `onRevealPlayed`.
2. **SECOND RIDE is now the only mode that is knowingly not real** (the real screen would
   give a second ride on Home → Work the same quiet offer). Kept on cycle11 R6's grounds — it
   is the demo's only no-tap route to the ADD WAY flow. If Nathan wants SECOND real as well:
   `demoPostReveal` returns `'rev'` for both, and the two `mode === 'tenth'` guards become
   `mode !== 'first'`. Four lines plus the test.
3. **Assumption:** `tower.tsx`'s `onPlayed` (line 169, `.start(() => onPlayed?.())`) is
   captured at mount, as RecordScreen's comments say — hence refs and `[]` deps rather than
   `mode`/`namingExpanded` in the deps array. Even if it were re-read per render, the ref
   version is correct; the deps version would only be *also* correct.
4. **Assumption:** `DEMO_ROUTE_LABEL` ('Home → Work') is the label the real link would show
   for this fixture way. It is what the demo's card already shows as `matchedWayLabel`, so
   the link and the card agree.
