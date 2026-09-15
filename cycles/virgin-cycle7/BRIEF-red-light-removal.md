# BRIEF — Remove the "Red lights" setting and the RED LIGHT – HOLD CLOCK button

**STATUS: NOT AUTHORIZED — do not execute until Nathan explicitly confirms he wants this
removed.** Nathan asked for an opinion (2026-09-14), not a removal. The opinion is in this
folder's `README.md` §D and the go/no-go is `QUESTIONS.md` Q1. This brief exists so a "yes"
is a ten-minute execution instead of another Plan pass. Do not dispatch it on the strength of
the README, the digest, or the coordinator's chat.

**Written 2026-09-15 UTC (Plan tier, fable).** Anchors were read from the live working tree
on Nathan's PC on 2026-09-15 (cycle 6 committed as `92bd6ea`, marketing cycle 09 as `003d4df`). Executor: Sonnet,
stop-on-ambiguity. **Any anchor mismatch or undecided call → stop and report verbatim (file,
line, what is actually there); do not guess, do not rule on it yourself — escalate to a fresh
Fable.** Never rule on an open call from the coordinator's chat.

## What the feature actually is (read first — it is smaller than it looks)

`settings.redLight: 'auto' | 'button' | 'off'` has exactly **one** consumer in the app:
`RecordScreen.tsx:1196` decides whether to render a button. `'auto'` and `'off'` are
indistinguishable at runtime. The button flips a `held` boolean that only its own label and
opacity read. No clock, engine, recording, result, test or other screen reads either. The
Settings hint promises auto-pause and "off: the clock never pauses"; neither is implemented —
the clock never pauses in any mode (cycle 6 R11 established the same for PAUSE).

Everything the app *really* does about stops is elsewhere and **stays**: automatic stop
measurement (`app/core/src/timing.ts:8` `INTERRUPTED_STOP_S`, `store/derive.ts:68–114`), the
Timing setting (wall clock / moving, `settings.tsx:584–588`, `store/timing.ts`), the
interrupted-sector exclusion from the mean (`colourModel.ts:130–131`, D-028), the map's
dim-but-locked stopped state (`wayMapView.tsx:28, 236, 372, 1125`), and the stationary
detection comment at `RecordScreen.tsx:92–98`. **None of those files are touched.**

## File anchors

`app/src/ui/settings.tsx` (656 lines)
- `:29` `/** How a stop at a red light is handled (§18 — UNSETTLED, hence a setting). */`
- `:30` `export type RedLight = 'auto' | 'button' | 'off';`
- `:31–50` `export interface Settings {` — first field `:32` `redLight: RedLight;`
- `:52–62` `DEFAULTS` — `:53` `redLight: 'auto',`
- `:97–101` provider load effect: `const saved = await load(); if (saved) setS((prev) => ({ ...prev, ...saved }));`
- `:547–552` the row:
  ```
  <Row label="Red lights" t={t} help={help}
    hint="auto: a stop at a light is detected and the clock pauses by itself. button: … off: the clock never pauses.">
    <Seg t={t} value={s.redLight}
      options={[['auto', 'auto'], ['button', 'button'], ['off', 'off']]}
      onPick={(v) => set('redLight', v)} />
  </Row>
  ```
  It is the first row of the ON THE BIKE card (`:545–546` heading + card `View`); `Live map`
  follows at `:553`.
- `:585` Timing hint "… every stop counts, a red light is your luck …" — **stays** (true).

`app/src/ui/RecordScreen.tsx`
- `:193` `const [held, setHeld] = useState(false); // manual red-light hold (§18)`
- `:1196–1208` the block starting `{settings.redLight === 'button' && (` — a `Pressable`
  (`styles.redFlag`, `held && { opacity: 0.6 }`, `onPress={() => setHeld((h) => !h)}`) with two
  `Text`s (`'GO - RELEASE CLOCK' : 'RED LIGHT - HOLD CLOCK'`, and the `stopSlimSub` subtitle
  "self-reported stop - the measured clock keeps its own truth"), closing `)}` at `:1208`.
  `:1209` `{status.storageErrors > 0 && (` follows.
- `:1624` comment `// Amber, never red (D-013) even though it is a "red light" button.`
- `:1625–1635` `redFlag: { … }` style; `:1636` `redFlagText: { … }`.
- `:1641` `stopSlimSub` — **stays** (also used at `:1227`).
- `held` occurrences: `:193, :1198, :1199, :1202` only (grep, 2026-09-15). `useState` and
  `settings` remain used elsewhere in the file.

Not touched, by ruling: `IDEAS.md §18` (`:212–216`, Nathan's file); `process/BETA-TESTERS.md:75, 83`
(historical tester notes); `STATE.md:199` (about gate placement, not the setting);
`GLOSSARY.md:83` (timing mode); every file named in the paragraph above.

## Rulings

### R1 — Remove the setting entirely; no deprecation alias
Delete `:29–30` (comment + `RedLight` type), `:32` (the field), `:53` (the default). `RedLight`
is imported nowhere else (grep `RedLight` over `app/src`, 2026-09-15). Do not keep the type
"for compatibility" — nothing is compatible with a placebo.

### R2 — Scrub the stale key from existing `settings.json` files
Phones that ran an earlier build have `"redLight": "auto"` on disk. The spread at `:99` would
carry it into state forever (harmless, but untidy and untyped). Change `:98–99` to:
```ts
      const saved = await load();
      if (saved) {
        delete (saved as Record<string, unknown>).redLight; // virgin-cycle7: setting retired; scrub old files
        setS((prev) => ({ ...prev, ...saved }));
      }
```
The next write (`:107–110`) then persists a clean file. No migration version, no alert.

### R3 — Remove the row
Delete `:547–552`. `Live map` becomes the first row of ON THE BIKE. No replacement row, no
"see Timing" note — the Timing row's own hint already says what happens at a red light.

### R4 — Remove the button, its state and its styles
- Delete `:193` (`held` state).
- Delete `:1196–1208` (the whole `{settings.redLight === 'button' && ( … )}` block).
- Delete `:1624–1636` (the D-013 comment, `redFlag`, `redFlagText`). Keep `stopSlimText`
  (`:1640`) and `stopSlimSub` (`:1641`).
If, after the deletions, `tsc` reports `colors` or `radius` unused in `RecordScreen.tsx`
(they are used elsewhere in the file today — this is a guard, not an expectation), stop and
report rather than removing imports on your own.

### R5 — The philosophy line stays where it already is
Do not edit `settings.tsx:585`, `store/timing.ts:1–12`, `colourModel.ts:130–131` or any
`wayMapView.tsx` comment. They describe the measurement-and-luck rule the app actually
implements; the removal makes them *more* true, not less.

### R6 — Out of scope, explicitly
The Timing setting's `moving` option (`QUESTIONS.md` Q2) — not touched, not mentioned in
the commit. Any change to stop detection thresholds. Any change to PAUSE/RESUME.

## Rules
- Touch only `app/src/ui/settings.tsx` and `app/src/ui/RecordScreen.tsx`.
- Never delete files; this brief deletes *lines* — that is fine. Git via `device_bash` with
  `GIT_OPTIONAL_LOCKS=0`; `mv` stale `.git/*.lock` aside, never delete.
- Independent of the other two briefs. If `BRIEF-settings-help-toggle.md` has landed first,
  `settings.tsx` line numbers have shifted by ~15 — re-read, do not arithmetic.
- Footprint: ~45 lines removed, ~4 added. Past 60, stop.

## Tasks
1. Re-read every anchor; paste `grep -n "redLight\|RedLight\|\bheld\b\|redFlag" app/src/ui/settings.tsx app/src/ui/RecordScreen.tsx`
   *before* into the report. 2. R1. 3. R2. 4. R3. 5. R4. 6. Verify. 7. Commit.

## Acceptance criteria
- `grep -rn "redLight\|RedLight\|redFlag\|HOLD CLOCK" app/src` → **no output**.
- `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0 (not bare `npx tsc`).
- `cd app && node --experimental-strip-types tests/run.ts` — **zero FAIL**; counts unchanged
  from the pre-change run (no test references the setting — grep, 2026-09-15).
- On the phone (Nathan, or "pending"): SETTINGS → ON THE BIKE starts with `Live map`; RECORD
  during a route ride shows no amber RED LIGHT button in any state; a phone that had
  `"redLight"` in `settings.json` launches without error and, after any settings change, the
  file no longer contains the key.
- One commit: `app: retire the "Red lights" setting and the no-op RED LIGHT button (§18 settled: wall clock, luck counts)`,
  ending with the attribution lines from the session reminder.

## Report back
Plain text. Before/after grep; every file:line removed/changed; tsc + test counts; commit
hash; on-device status; anything stopped on, verbatim.

## Ground-rule wording for the coordinator (STATE.md / GLOSSARY.md, after landing)
"There is no red-light setting and no manual hold. The clock never pauses. Stops are
measured automatically (`INTERRUPTED_STOP_S` = 1 s) and never acted on; SETTINGS → Timing
(wall clock, default / moving, opt-in) is the only timing policy. `IDEAS.md §18` is settled by
Nathan's 2026-09-14 note."
