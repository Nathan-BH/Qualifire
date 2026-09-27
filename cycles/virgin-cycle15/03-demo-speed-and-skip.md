# 03 — DEMO ride: 5x / 15x / 25x speed pills + SKIP to results

**Source: Nathan, 2026-09-26 (same session as briefs 01 and 02).** His words: "add extra
buttons during the demo rides to change their speed between 5x,15x,25x or skip option so i
can also go straight to the result tab for easier troubleshooting and updates"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from a Haiku digest plus ONE anchor check against the working tree (branch
`virgin`; briefs 01 and 02 of this cycle unexecuted at writing time). Executor: Sonnet, cold,
this file only. Third brief of `virgin-cycle15`; independent of 01 and 02 (no shared files —
01 edits `settings.tsx`/`autoTheme.ts`, 02 edits `RecordScreen.tsx`/`recordFlow.ts`; this
one edits `DemoScreen.tsx`, `demoModel.ts` and one test file). Any order.

**Anchor honesty.** The spot-check confirmed `DemoScreen.tsx` 521-522 (idle title/caveat),
401 (`if (phase === 'running') {` — the running-phase render entry), 97-101 (imports incl.
`RankingReveal`, `RouteNamingCard`, `ResultsPlot`) and `ReplayScreen.tsx` 30 + 223-231 (the
speed-pill row). It did **not** confirm the digest's placement of `RATE = 25` at 99-100 nor
the speed math at 397-401 — those lines hold imports and `onRevealPlayed` respectively. So
the RATE constant, the tick/speed math, `demoRunEndS` and the tab-nav import are marked
*(locate)* below: the executor finds them with the given grep, and stops if the grep result
does not match the described shape.

## Executor rules (binding)

- **Stop-on-ambiguity.** If a *(verified)* anchor is not where the brief says, or a
  *(locate)* grep returns something other than the described shape (zero hits, several
  candidates, a different signature), **stop and report the mismatch verbatim** (file, line,
  what you expected, what you found). Never guess, never patch around it, never rule on it
  yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Everything is RN core (`Pressable`, `Text`, `View`).
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  `01-*.md`, `02-*.md`, or anything under `cycles/virgin-cycle14/` (history).
- **Do not touch `ReplayScreen.tsx`, `replayModel` (wherever `REPLAY_RATES` is defined),
  `RecordScreen.tsx`, `tabNav.tsx`, the results screen, or any store file.** REPLAY keeps its
  own 5/10/25 presets; DEMO gets its own 5/15/25 list (Nathan named these three; they are
  deliberately not shared with REPLAY).
- DEMO is a test harness ("Not part of the final app", DemoScreen.tsx:522). Keep the
  additions inside DEMO; nothing here may change what a real RECORD ride does.

## Goal

While a DEMO ride is running, a row of three pills **5x · 15x · 25x** sits above the existing
controls; tapping one changes the playback speed *from that moment on* with no jump, pause
or restart of the simulated ride (25x is the default and is what runs today). Next to /
below the pills a **SKIP ▸ RESULTS** button ends the demo ride immediately as if it had played
out to its natural end (`demoRunEndS`), then jumps to the RESULTS tab, so Nathan can
troubleshoot the results screen without waiting a demo lap out. Idle DEMO screen and every
non-DEMO screen: unchanged.

## Current state (2026-09-26; tags say what was verified)

All in `app/src/ui/DemoScreen.tsx` unless stated.

- *(verified)* Lines 97-101 are imports:
  `LiveSectorPane` from `./liveView`, `REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type RankingReveal`
  from `./rankingRevealModel.ts`, `RouteNamingCard`, `ResultsPlot`, `selfDotsAt, selfLivePosition`
  from `./selfRaceModel.ts`. So DEMO already renders its own in-screen reveal/plot after the
  ride ends — that in-screen flow is not what Nathan asked to skip *to*; he wants the
  **RESULTS tab** (`tabNav.go('results')`).
- *(verified)* Lines 395-399: `onRevealPlayed` arms `revealHoldRef` with `REVEAL_HOLD_MS`
  ("exactly RecordScreen.tsx's revealHoldRef"). Line 401: `if (phase === 'running') {` then
  `return (` — **the running-phase render starts here.** This is where the pills + SKIP go.
- *(verified)* Lines 519-522: the idle render — `<ScrollView style={{ flex: 1 }}
  contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>`, `<Text style={styles.h2}>DEMO RIDE</Text>`,
  `<Text style={styles.sub}>Not part of the final app — use only for testing features.</Text>`.
  Untouched by this brief.
- *(locate)* **Fixed rate.** Digest: `const RATE = 25` with a comment, no speed UI. Locate:
  `grep -n "RATE" app/src/ui/DemoScreen.tsx`. Expected shape: one `const RATE = 25` (module
  scope or inside the component) and a handful of uses inside the tick/clock code. If `RATE`
  is imported from `demoModel.ts` instead, or there are two rate-like constants, stop and
  report.
- *(locate)* **Clock math.** Digest: simulated seconds advance as
  `(elapsed_real_ms / 1000) * RATE`, anchored to a wall-clock start (`Date.now()` or a
  `startMs`/`t0` ref) — i.e. `simS = (now - startMs) / 1000 * RATE`. Locate: the uses of
  `RATE` from the grep above; expect a single expression of that shape inside a
  `setInterval`/`requestAnimationFrame`/timer callback (the "tick"). Read the whole tick
  callback once — you need to know (a) whether it computes everything from `simS` alone
  (position lookup into the script) or (b) also **accumulates** per tick (pushes samples into
  a ride log, detects sector crossings by comparing previous vs current, etc.). Decision 4
  branches on this.
- *(locate)* **Natural end.** `app/src/store/demoModel.ts` (digest: `demoRunEndS(script) =
  script.lap + DEMO_ROLL_OUT_S`, 255-257, `DEMO_ROLL_OUT_S = 60`). Locate:
  `grep -n "demoRunEndS\|DEMO_ROLL_OUT_S" app/src/store/demoModel.ts app/src/ui/DemoScreen.tsx`.
  The DemoScreen hit inside the tick is the **auto-stop check** (`if (simS >= demoRunEndS(script)) …`)
  and whatever it calls is the **completion path** (call it `finishDemo` below, whatever its
  real name — it may be inline). If `demoModel.ts` lives under `app/src/ui/` rather than
  `app/src/store/`, use the path the grep finds; that is not a mismatch.
- *(locate)* **Tab navigation.** `useTabNav()` → `tabNav.go(tab)`, `tab` type
  `'demo' | 'record' | 'rides' | 'routes' | 'results' | 'settings'` (`tabNav.tsx` 19-20, 58).
  `RecordScreen.tsx` uses it (brief 02 current-state, line 1496). Locate whether DemoScreen
  already imports it: `grep -n "useTabNav\|tabNav" app/src/ui/DemoScreen.tsx`. If absent, copy
  the import line from `grep -n "useTabNav" app/src/ui/RecordScreen.tsx` (same directory ⇒
  same relative path).
- *(verified)* **The pill pattern to mirror**, `app/src/ui/ReplayScreen.tsx` 223-231:

  ```tsx
        {REPLAY_RATES.map((r) => (                                                   // 223
          <Pressable
            key={r}
            style={[styles.pill, r === anchor.rate ? styles.pillSelected : styles.pillOutline]}
            onPress={() => setRate(r)}
          >
            <Text style={r === anchor.rate ? styles.pillTextSelected : styles.pillText}>{r}x</Text>
          </Pressable>
        ))}
      </View>                                                                        // 231
  ```

  followed by `stopSlim` buttons (PLAY/PAUSE, RESTART) and a `‹ BACK` link. Note the name
  `anchor.rate` — REPLAY already keeps `{rate, playing, …}` in an *anchor* object, which is
  the same re-anchoring idea decision 3 uses. `REPLAY_RATES` is imported at line 30 from a
  model file together with `REPLAY_RATE_DEFAULT, REPLAY_TICK_MS`. Styles `pill`,
  `pillSelected`, `pillOutline`, `pillText`, `pillTextSelected` live in ReplayScreen's
  `makeStyles` — **copy their values** into DemoScreen's `makeStyles` (grep
  `pill` in DemoScreen.tsx first; if DemoScreen already has same-named styles, reuse them and
  copy nothing). Also copy the `View` style of the row wrapping line 223 (the pill container,
  likely `flexDirection: 'row', gap: …`).
- **Tests.** `app/tests/run.ts` registers suites (brief 02 cites line 37 for
  `recordflow_suite`). Locate a demo suite: `ls app/tests | grep -i demo`. If one imports
  `demoModel.ts`, extend it; else create `app/tests/demorate_suite.ts` and register it in
  `run.ts` next to the other `*_suite` imports, same pattern.
- Baseline (STATE.md 65-66, 2026-09-26): **676 tests, 673 pass, 0 fail, 3 skip**; `tsc --noEmit`
  clean. **Briefs 01/02 may land before this one and change these counts — run the suite
  BEFORE editing and record the real numbers; never quote 676/673 as your "before".**

## Decisions (already made — do not reopen)

1. **Presets `5 | 15 | 25`, default 25, DEMO-only constants.** `DEMO_RATES = [5, 15, 25] as const`
   and `DEMO_RATE_DEFAULT = 25` in `demoModel.ts` (pure, importable by the test). Not shared
   with `REPLAY_RATES` (5/10/25) — Nathan chose 15 for DEMO; keeping them separate means a
   later change to one never moves the other. Today's behaviour (fixed 25x) is exactly the
   default, so an untouched demo ride is byte-for-byte what it was.
2. **Rate is per-session state, not persisted.** `useState<DemoRate>(DEMO_RATE_DEFAULT)` +
   a ref the tick reads. Every mount starts at 25x. No settings.json key, no AsyncStorage.
3. **Changing speed mid-ride is seamless: re-anchor, never rescale.** The clock becomes
   `simS = anchor.simS + (now - anchor.wallMs) / 1000 * anchor.rate`. On a pill tap:
   `anchor = { simS: simSNow, wallMs: Date.now(), rate: newRate }` — the simulated clock is
   continuous through the switch (no jump backwards or forwards, no pause, no restart), only
   its slope changes. This replaces the current single-anchor `(now - startMs)/1000 * RATE`
   with the same formula plus a movable anchor. The pure helper `reanchorDemo` (files §1) is
   what the pill handler calls, and is what the test pins down. Tapping the already-active
   pill is a no-op (`if (r === anchor.rate) return;`).
4. **SKIP = force-complete through the existing completion path, then go to RESULTS.** Nathan's
   purpose is "go straight to the result tab for easier troubleshooting" — so RESULTS must
   have *this* demo ride to show, which means the ride must end through the same path the
   auto-stop uses (`finishDemo`, *(locate)* above), not be abandoned. How to get there
   depends on what the tick does (current-state "Clock math", (a) vs (b)):
   - **(a) tick is a pure function of `simS`** (looks up the script at `simS`, no
     accumulation): SKIP sets the anchor so the next tick sees `simS = demoRunEndS(script)`
     (`anchor = { simS: demoRunEndS(script), wallMs: Date.now(), rate: anchor.rate }`) and
     calls the tick body once synchronously (or simply lets the interval fire). The auto-stop
     check trips, `finishDemo` runs exactly as it would have.
   - **(b) tick accumulates** (samples/sectors/ranking depend on every tick having run):
     SKIP steps the tick body synchronously from the current `simS` to `demoRunEndS(script)`
     in the tick's own simulated step (`tickMs/1000 * rate`, or 1 simulated second if the
     step is not a named constant) — a plain `for` loop calling the extracted tick body with
     an explicit `simS`, ending with `simS = demoRunEndS(script)` so the auto-stop check trips
     on the last step. The ride record is then the same one a fully-played demo produces. If
     the tick body cannot be given an explicit `simS` without restructuring more than the
     clock read (e.g. it reads `Date.now()` in several places, or the auto-stop is in a
     different effect than the sampling), **stop and report** — do not restructure the tick.
   In both branches, **after** `finishDemo` has run: `tabNav.go('results')`. SKIP does not
   touch `revealHoldRef`/the in-screen reveal — if `finishDemo` arms it, it arms; the tab
   switch simply leaves the DEMO screen. Whether that leaves a pending reveal timer running is
   the same situation as switching tabs during the reveal by hand today.
5. **Placement: running screen only, one block, above the existing stop control.** Inside the
   `phase === 'running'` return (line 401), the executor inserts one `<View style={styles.demoCtl}>`
   containing the pill row and the SKIP button **directly above the existing STOP/END
   pressable** (the demo's manual stop — find the first `Pressable` in the running render
   whose label stops the demo; if there is none, put the block last). Not on the idle screen
   (Nathan: "during the demo rides"); not inside the map/`LiveSectorPane` area; nothing
   absolute-positioned. Pills copy ReplayScreen's markup 1:1 (decision-free), SKIP copies
   the `stopSlim`/`stopSlimText` style if DemoScreen has it, else the same style the
   existing demo STOP button uses.
6. **Labels.** Pills `5x` `15x` `25x` (format `${r}x`, as REPLAY). SKIP button
   `SKIP ▸ RESULTS` — all-caps to match the surrounding control register; the label says where
   it goes so it cannot be mistaken for "discard". Open question 1 if Nathan wants shorter.
7. **SKIP is idempotent and only in `running`.** Guard `if (phase !== 'running') return;` and
   a `skippingRef` set on entry so a double tap cannot run `finishDemo` twice while the
   synchronous loop / next tick is in flight. The button gets `disabled` while busy if the
   running render already has a `busy` flag; otherwise the ref alone suffices.
8. **Pure helpers + tests live in `demoModel.ts`.** `DEMO_RATES`, `DEMO_RATE_DEFAULT`,
   `DemoRate`, `DemoClockAnchor`, `demoSimSAt`, `reanchorDemo` — so seamlessness is proven in
   the test runner, not on the phone.

## Files to touch

### 1. `app/src/store/demoModel.ts` (or wherever the *(locate)* grep found it) — append

```ts
/** virgin-cycle15 brief 03: DEMO playback speed presets (Nathan 2026-09-26:
 * "5x,15x,25x"). Deliberately NOT REPLAY_RATES (5/10/25) — DEMO is a test
 * harness with its own list. 25 is today's fixed RATE, so the default demo
 * ride is unchanged. */
export const DEMO_RATES = [5, 15, 25] as const;
export type DemoRate = (typeof DEMO_RATES)[number];
export const DEMO_RATE_DEFAULT: DemoRate = 25;

/** The simulated clock is a line through a movable anchor:
 *  simS(now) = anchor.simS + (now - anchor.wallMs) / 1000 * anchor.rate.
 * Changing speed moves the anchor to "now" first, so the line stays
 * continuous and only its slope changes (no jump, no pause). */
export interface DemoClockAnchor { simS: number; wallMs: number; rate: DemoRate }

export function demoSimSAt(anchor: DemoClockAnchor, nowMs: number): number {
  return anchor.simS + Math.max(0, nowMs - anchor.wallMs) / 1000 * anchor.rate;
}

export function reanchorDemo(anchor: DemoClockAnchor, nowMs: number, rate: DemoRate): DemoClockAnchor {
  if (rate === anchor.rate) return anchor;
  return { simS: demoSimSAt(anchor, nowMs), wallMs: nowMs, rate };
}

/** SKIP ▸ RESULTS: an anchor whose next read is the ride's natural end. */
export function skipDemoAnchor(anchor: DemoClockAnchor, nowMs: number, endS: number): DemoClockAnchor {
  return { simS: endS, wallMs: nowMs, rate: anchor.rate };
}
```

(`Math.max(0, …)` guards a clock that steps backwards; the old `(now - startMs)` had the
same exposure, this just makes it explicit. If `demoModel.ts` already exports a clock helper
with a different shape, stop and report rather than adding a second one.)

### 2. `app/src/ui/DemoScreen.tsx`

**a. Imports.** Extend the existing `demoModel` import (find it with
`grep -n "demoModel" app/src/ui/DemoScreen.tsx`) with
`DEMO_RATES, DEMO_RATE_DEFAULT, type DemoRate, type DemoClockAnchor, demoSimSAt, reanchorDemo, skipDemoAnchor`.
Add the `useTabNav` import if the *(locate)* grep found none. `Pressable`, `Text`, `View` are
almost certainly imported already (the running render uses them) — check, add if missing.

**b. Replace the fixed rate with the anchor.** Delete `const RATE = 25` (and its comment;
rewrite the comment's fact, if any, into the new anchor's comment). Where the tick computed
`simS` from `startMs`/`RATE`, it now reads `demoSimSAt(anchorRef.current, Date.now())`.
State:

```tsx
  // virgin-cycle15 brief 03: playback speed is a movable clock anchor, not a
  // constant — see demoModel.reanchorDemo. `rate` is the rendered pill state,
  // anchorRef is what the tick reads (the tick is a timer callback and must
  // not close over a stale render).
  const [rate, setRate] = useState<DemoRate>(DEMO_RATE_DEFAULT);
  const anchorRef = useRef<DemoClockAnchor>({ simS: 0, wallMs: 0, rate: DEMO_RATE_DEFAULT });
```

Where the demo *starts* (the place `startMs = Date.now()` — or equivalent — was set):
`anchorRef.current = { simS: 0, wallMs: Date.now(), rate: anchorRef.current.rate };` (the
rate chosen before/while a previous ride persists for the session, decision 2). If the old
code's `startMs` is also used for something other than `simS` (e.g. a real-elapsed display),
keep `startMs` for that use and add the anchor beside it — do not repurpose.

**c. Pill handler.**

```tsx
  const onPickRate = useCallback((r: DemoRate) => {
    anchorRef.current = reanchorDemo(anchorRef.current, Date.now(), r);
    setRate(r);
  }, []);
```

**d. SKIP handler** — write branch (a) or (b) per decision 4, after reading the tick:

```tsx
  // virgin-cycle15 brief 03: SKIP ▸ RESULTS — end the demo ride through the
  // same completion path the auto-stop uses (so RESULTS has this ride), then
  // leave for the RESULTS tab. Branch (a|b) per brief 03 decision 4: <say which>.
  const skippingRef = useRef(false);
  const onSkip = useCallback(() => {
    if (phase !== 'running' || skippingRef.current) return;
    skippingRef.current = true;
    const endS = demoRunEndS(script);           // same expression the auto-stop uses
    // (a): anchorRef.current = skipDemoAnchor(anchorRef.current, Date.now(), endS); tick();
    // (b): for (let s = simSNow + stepS; s < endS; s += stepS) tickAt(s); tickAt(endS);
    tabNav.go('results');
    skippingRef.current = false;
  }, [phase, script /* + whatever tick/tickAt closes over */]);
```

The executor replaces the two comment lines with the real branch and deletes the other. If
`finishDemo` is `async` and `tabNav.go('results')` must wait for it (e.g. it awaits the ride
write before RESULTS can list it), `await` it and make `onSkip` async — check by reading
`finishDemo`; if unclear whether RESULTS reads from memory or from disk, stop and report.
`script` here is whatever name the running demo's script object has in scope.

**e. Running render (line 401 block).** Insert directly above the existing stop control
(decision 5):

```tsx
        {/* virgin-cycle15 brief 03: speed pills (DEMO_RATES, not REPLAY's) +
            SKIP ▸ RESULTS for troubleshooting the results screen without
            waiting a demo lap out. Running phase only. */}
        <View style={styles.demoCtl}>
          <View style={styles.pillRow}>
            {DEMO_RATES.map((r) => (
              <Pressable
                key={r}
                style={[styles.pill, r === rate ? styles.pillSelected : styles.pillOutline]}
                onPress={() => onPickRate(r)}
                accessibilityLabel={`Demo speed ${r}x`}
              >
                <Text style={r === rate ? styles.pillTextSelected : styles.pillText}>{r}x</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.stopSlim} onPress={onSkip} accessibilityLabel="Skip to results">
            <Text style={styles.stopSlimText}>SKIP ▸ RESULTS</Text>
          </Pressable>
        </View>
```

**f. Styles** in DemoScreen's `makeStyles`: `demoCtl: { gap: 8, marginTop: 8 }`; `pillRow`
= the container style of ReplayScreen's pill row (copy); `pill`, `pillSelected`,
`pillOutline`, `pillText`, `pillTextSelected`, `stopSlim`, `stopSlimText` = copied from
ReplayScreen's `makeStyles` **unless DemoScreen already defines them** (grep first; reuse,
never duplicate a name). If DemoScreen's `makeStyles` takes a different argument than
ReplayScreen's (`t` vs a theme object), adapt the colour references, nothing else.

Nothing else in the file changes: idle render 519-522, `onRevealPlayed`, the in-screen
reveal/plot, the naming card, the manual STOP button.

### 3. Tests — `app/tests/demorate_suite.ts` (new) or the existing demo suite (extend)

Same `assert, test` from `./lib.ts`, names prefixed `demoModel:`:

- `DEMO_RATES` deep-equals `[5, 15, 25]`; `DEMO_RATE_DEFAULT === 25` — "default is today's
  fixed RATE".
- `demoSimSAt({ simS: 0, wallMs: 1000, rate: 25 }, 5000) === 100` (4 s real × 25).
- **Seamless switch:** `a0 = { simS: 0, wallMs: 0, rate: 25 }`; at `now = 4000`
  `demoSimSAt(a0, 4000) === 100`; `a1 = reanchorDemo(a0, 4000, 5)`; assert
  `a1.simS === 100 && a1.wallMs === 4000 && a1.rate === 5`; assert
  `demoSimSAt(a1, 4000) === 100` (no jump at the switch) and
  `demoSimSAt(a1, 6000) === 110` (2 s real × 5 after it).
- `reanchorDemo(a0, 4000, 25) === a0` (same object — no-op on the active pill).
- Monotone through a switch: for `t` in `[0, 1000, …, 8000]` the simS sequence built by
  switching 25→15→5 at 2000/5000 never decreases.
- Clock going backwards: `demoSimSAt({ simS: 50, wallMs: 5000, rate: 25 }, 4000) === 50`.
- `skipDemoAnchor(a0, 9000, 1380).simS === 1380` and `.rate === 25`; and with a real script
  if the suite already builds one: `skipDemoAnchor(a, now, demoRunEndS(script)).simS === demoRunEndS(script)`.
- If `demoRunEndS` was not already covered: `demoRunEndS({ …lap: 1320 }) === 1320 + DEMO_ROLL_OUT_S`
  (use the suite's existing script fixture; if none exists, skip this line rather than
  fabricating a script shape).

Register the new file in `app/tests/run.ts` if new.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # BEFORE editing: record N tests / pass / fail / skip
cd app && node --experimental-strip-types tests/run.ts     # AFTER: 0 FAIL; count = before + new tests (7-9)
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
```

Baseline per STATE.md (2026-09-26) is 676/673/0/3 but briefs 01/02 may have landed in
between — the "before" run is the baseline you report, not this number. If `tsc` blows the
call budget on this mount, retry once with a longer timeout, then report — do not substitute
a syntax-only check without saying so. Also:

```
grep -n "const RATE\b\|\bRATE\b" app/src/ui/DemoScreen.tsx           # → no matches (constant gone)
grep -n "DEMO_RATES\|reanchorDemo\|skipDemoAnchor" app/src/ui/DemoScreen.tsx app/src/store/demoModel.ts app/tests/*.ts   # → 3 files
grep -n "REPLAY_RATES" app/src/ui/DemoScreen.tsx                      # → no matches (DEMO never borrows REPLAY's list)
grep -n "tabNav.go('results')" app/src/ui/DemoScreen.tsx              # → exactly 1 hit, inside onSkip
git status --short   # → M DemoScreen.tsx, M demoModel.ts, M run.ts (if new suite), ?? demorate_suite.ts (or M <existing demo suite>); nothing under ReplayScreen / RecordScreen / tabNav / store other than demoModel
```

## On-device checklist (Nathan, after OTA — not the executor)

1. DEMO tab idle: `DEMO RIDE` + caveat exactly as before; no pills on the idle screen.
2. Start a demo ride: it runs at 25x as before; **above the STOP control** a `5x 15x 25x`
   row with `25x` highlighted, and `SKIP ▸ RESULTS` under it.
3. Tap `5x` mid-ride: the highlighted pill moves, the live view keeps going from the same
   place (no jump backwards/forwards, no freeze), visibly slower. Tap `25x`: faster again,
   still continuous. Tap the active pill: nothing happens.
4. Speed switch near the end: at `5x` let it reach the natural end — the demo still ends by
   itself with the usual in-screen reveal (auto-stop unaffected by the anchor change).
5. `SKIP ▸ RESULTS` mid-ride: DEMO ends at once, the app is on the RESULTS tab, and the ride
   RESULTS shows is *this* demo ride, complete (lap + roll-out), not a truncated one. Compare
   its result against a demo ride left to play out at 25x — same numbers (decision 4).
6. Double-tap SKIP fast: one ride in RIDES/RESULTS, not two.
7. Back to DEMO after a skip: idle screen, and a new demo ride starts at the **last picked**
   rate (decision 2: per session), not necessarily 25x. Kill + relaunch the app: 25x again.
8. Both themes: pills (selected/outline) and SKIP legible; REPLAY's pills unchanged.

## Out of scope

- **REPLAY's speed control** (`REPLAY_RATES` 5/10/25, its model, ReplayScreen) — untouched.
- A speed pick on the DEMO idle screen (before starting) — open question 3.
- Persisting the demo rate across launches (decision 2).
- Any change to what `finishDemo`/the auto-stop does, to the ride record shape, to the
  in-screen reveal (`onRevealPlayed`, `REVEAL_HOLD_MS`), or to the RESULTS screen — SKIP only
  calls what exists and then navigates.
- A "discard" / abort-without-result control — the existing STOP is that (whatever it does
  today), and Nathan asked for skip-to-results, not abort.
- Real RECORD rides, `RecordScreen.tsx`, anything the real app does.
- iOS (no iOS build).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (two files edited, one suite
added/extended; no new dependency, no `app.json`/`eas.json` change), so it ships to the
Preview APK over EAS Update via `scripts/publish-preview.cmd` — no new numbered build, no
reinstall. Visible **only inside a running DEMO ride**: a 5x/15x/25x row and a SKIP ▸ RESULTS
button above the stop control. A demo ride left alone still runs at 25x and ends by itself
exactly as today; RECORD, REPLAY, RESULTS and every other tab see no difference.

## Open questions / assumptions (logged, not blocking)

1. **SKIP label** — `SKIP ▸ RESULTS` is the Plan tier's guess; `SKIP` alone or `▸▸ RESULTS`
   are one-literal changes. Nathan's phrase was "skip option".
2. **SKIP logs a full ride** (decision 4) rather than a truncated one or none at all. Read
   from "go straight to the result tab": RESULTS needs a finished ride to be useful for
   troubleshooting. If Nathan would rather see the *partial* ride (what the results screen
   makes of an unfinished one), branch (a) with `simS = simSNow` instead of `endS` — but then
   the auto-stop never trips and `finishDemo` must be called explicitly, which is a different
   edit; and if he wants nothing logged, that is a STOP + tab switch, not this brief.
3. **Pills only while running.** A pre-start pick on the idle screen would be the same
   `DEMO_RATES.map` block under the caveat (line 522) sharing the same `rate` state — cheap,
   but not asked for; at 25x the first second passes before a pill can be tapped, which may
   or may not matter to him.
4. **Rate persistence** — per session (decision 2). If Nathan wants "always 5x while I'm
   troubleshooting", that is a settings.json key and a SETTINGS row, out of scope here.
5. **Branch (a) vs (b)** in decision 4 is decided by the executor from the tick's shape, and
   the executor must say which in the report and in the `onSkip` comment. If the tick is
   shape (b) and stepping `simS` through the tick body needs more than passing an explicit
   `simS`, the executor stops — the Plan tier could not read the tick (only one anchor check
   was allowed, spent on the pill markup), which is also why `RATE` and the clock math are
   *(locate)* anchors.
6. **`Math.max(0, …)` in `demoSimSAt`** clamps a wall clock that steps backwards (NTP
   adjust). Harmless; called out because it is a behaviour the old `(now - startMs)` did not
   have.
