# 01 — Auto day/night: one "Day from … until …" row + fixed-colon time entry

**Source: Nathan, 2026-09-26 (after seeing cycle14 brief 01 on the phone).** Two asks, his
words: (1) "currently when the auto day/night toggle is on this setting takes three slots.
Can we reduce it to two by having Day from and Until in the same setting box. Literally
`Day from XX:XX until XX:XX` and people can write directly in line, so it takes only one line
instead of two." (2) "hardcode the ':' middle points so they are always there because now
you have to write it yourself. So it would be better if upon writing or deleting, the dots
stay and you can just write '7000' for example and it will properly fill in."

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from anchor checks against the working tree (branch `virgin`, last app commit
`6ca114a`, cycle14 fully landed). Executor: Sonnet, cold, this file only. First brief of
`virgin-cycle15`.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-26. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Everything is RN core (`TextInput`, `Text`, `View`).
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  or anything under `cycles/virgin-cycle14/` (history).
- Do not touch `autoThemeScheduler.tsx`, `themeContext.tsx`, `App.tsx` — the schedule logic
  and the effect are unchanged by this brief. Only the *entry UI* and its pure helpers move.

## Goal

With SETTINGS → APPEARANCE → "Auto day/night" on, the schedule takes **two rows** instead of
three: the switch row, then one row reading **`Day from [07:00] until [19:00]`** with the two
times as inline editable fields. Each field is a fixed-format `HH:MM` mask: the colon is
always on screen, is never typed and never deleted, and digits fill in around it from left
to right — typing `7`, `0`, `0` gives `07:00`; typing `1`, `9`, `0`, `0` gives `19:00`.
Backspace removes the last digit and leaves the colon. Everything behind the fields
(`Settings.dayStart/dayEnd`, `autoTheme.ts`'s model, the scheduler, midnight wrap) stays
exactly as cycle14 brief 01 landed it.

## Current state (verified 2026-09-26 against the tree)

All in `app/src/ui/settings.tsx` (706 lines) unless stated.

- **Imports.** Line 9 `import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';`
  Line 27 `import { DEFAULT_DAY_END, DEFAULT_DAY_START, formatHHMM, parseHHMM, themeForTime } from './autoTheme';`
- **Settings keys.** Lines 56-58 `autoTheme: boolean; dayStart: string; dayEnd: string;`
  (defaults lines 70-72; load guard lines 104-105 — untouched by this brief).
- **The field component.** Lines 164-190: comment `/** virgin-cycle14 brief 01: one HH:MM
  field. ...` (164-165) then

  ```tsx
  function TimeRow(props: { label: string; value: string; onCommit: (v: string) => void; t: PaddockTheme; help: Help }) {   // 166
  ```

  It wraps one `<TextInput>` (172-187) in a `<Row label=…>` (171): controlled `draft`
  state, `onChangeText={setDraft}` (174), commit in `onEndEditing` (175-181) via
  `parseHHMM`/`formatHHMM` with snap-back on parse failure,
  `keyboardType="numbers-and-punctuation"` (182), `maxLength={5}` (183), `placeholder="09:00"`
  (184), style line 186
  `style={[st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg, minWidth: 74, textAlign: 'center' }]}`.
  `TimeRow` is referenced nowhere else in `app/` (grep'd).
- **`Help` interface** line 195, **`Row`** line 197-236: label (+ optional "?" when a `hint`
  is given) in a `flex: 1` left column, `{props.children}` on the right (line 234), row
  style `st.row` = `flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1` (line 692).
- **The screen.** `export default function SettingsScreen()` line 567; line 568
  `const { t, mode, toggleMode, pickMode } = useTheme();`. The APPEARANCE card, lines 585-599:

  ```tsx
        <Row label="Auto day/night" t={t} help={help}                                       // 585
          hint="Day theme inside the window, night outside, switched at the times below (phone clock). Never switches mid-ride — it waits for STOP.">
          <Switch on={s.autoTheme} onToggle={() => set('autoTheme', !s.autoTheme)} t={t} />  // 587
        </Row>
        {s.autoTheme ? (                                                                     // 589
          <>
            <TimeRow label="Day from" value={s.dayStart} onCommit={(v) => set('dayStart', v)} t={t} help={help} />   // 591
            <TimeRow label="Day until" value={s.dayEnd} onCommit={(v) => set('dayEnd', v)} t={t} help={help} />      // 592
            <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 8 }}>            // 593
              {themeForTime(Date.now(), s.dayStart, s.dayEnd) === null
                ? 'Times must be HH:MM and different — auto is paused until they are.'
                : `Day ${s.dayStart}–${s.dayEnd}, night otherwise.`}
            </Text>
          </>
        ) : null}                                                                            // 599
        <Row label="Help icons" t={t} help={help}>                                           // 600
  ```

  So with auto on the block is: switch row, "Day from" row, "Day until" row, summary text —
  the "three slots" Nathan counted, plus a fourth thin line that repeats the two rows.
- **Styles.** `const st = StyleSheet.create({` line 689; `input:` line 705
  `input: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },`.
- **Pure model** `app/src/ui/autoTheme.ts` (77 lines): `DEFAULT_DAY_START`/`_END` lines 9-10,
  `parseHHMM` line 14 (regex `^([0-9]{1,2}):([0-9]{2})$`), `formatHHMM` line 24,
  `themeForTime` line 33, `boundariesAround` line 47. No RN imports.
- **Tests** `app/tests/autotheme_suite.ts` (107 lines, 9 `test(...)` blocks, last one starts
  line 102 and the file ends at its `});`). Already registered in `tests/run.ts:52`.
- Baseline (STATE.md, 2026-09-26): **676 tests, 673 pass, 0 fail, 3 skip**; `tsc --noEmit` clean.

## Decisions (already made — do not reopen)

1. **One `Row`, label `Day from`, children = `[field] until [field]`.** The existing `Row`
   already puts its children on the right of the label, so the combined row is
   `<Row label="Day from">` with a horizontal `View` holding the first field, a dim `until`
   `Text`, and the second field. No new row primitive, no change to `Row`. No `hint` on this
   row (same as the two rows today — the switch row above carries the explanation), so no
   "?" button competes for width.
2. **The summary line goes when the schedule is valid.** `Day from 07:00 until 19:00` on the
   row already says everything `Day 07:00–19:00, night otherwise.` said. The line is kept
   **only** for the inert case (`themeForTime(...) === null`, i.e. equal times) so the user
   still learns why nothing switches. Net height with auto on: switch row + one row (+ the
   hint line only while the times are equal). If Nathan wants the summary back it is a
   one-line revert in the JSX, not a design question.
3. **Field model = a left-filled buffer of 0-4 digits; the colon is display only.** The
   `TextInput`'s value is always `digits.slice(0, 2) + ':' + digits.slice(2)` (`:` for an
   empty buffer, `07:` after two digits, `07:0` after three, `07:00` when full). The colon is
   never part of the state, so it cannot be typed or deleted; whatever the native field
   reports back is reduced to its digits and re-rendered through the mask. No `_`/`-`
   placeholder glyphs for empty slots: they would be typable characters in the text and
   defeat the point.
4. **Digit acceptance rules (the "7000 → 07:00" ask):**
   - first digit `3`-`9` → a one-digit hour, stored as `0d` (so `7` shows `07:`);
     first digit `0`-`2` → wait for the second hour digit (`1` shows `1:`, then `19:`);
   - second hour digit that would make hour ≥ 24 (`24`-`29`) → **refused** (the field stays
     at `2:`);
   - minutes tens `6`-`9` → **refused**; minute units any digit;
   - a fifth digit → refused (buffer full; `maxLength={5}` also blocks it natively);
   - any non-digit → refused.
   So Nathan's `7`,`0`,`0`,`0` → `07:`, `07:0`, `07:00`, (4th `0` dropped) = `07:00`. Minutes
   are always two digits (no `07:5` → `07:05` guessing) — consistent with cycle14 brief 01's
   own rule and its corrected checklist step 6.
5. **Backspace deletes the last digit; the colon stays.** Concretely the only special case:
   when the buffer is `H` or `HH` the display ends in `:`, and a backspace there makes the
   native field report the text without its colon while the digits are unchanged. That
   pattern (digits unchanged AND colon missing from the reported text AND buffer non-empty)
   is treated as "delete the last digit". Without this rule the field is stuck at `07:`
   (RN pushes the controlled value straight back). Any other edit — including the user
   tapping mid-string and deleting a digit — is simply "take the digits that are left,
   re-flow them left-to-right through rule 4". That re-flow can shift a minute digit into
   the hour slot; accepted: the field is meant to be *retyped*, not edited in place, which
   is why the next decision exists.
6. **`selectTextOnFocus`.** Tapping a field selects its whole content, so the first digit
   typed replaces the old time and the four-keystroke flow of decision 4 is the normal path.
   Keyboard `number-pad` (digits only — the colon no longer needs a punctuation keyboard;
   this closes cycle14 brief 01's open question about the colon being hard to reach).
7. **Commit when the fourth digit lands, and on end-editing.** Four accepted digits are by
   construction a valid `HH:MM` (rules 4 refuse everything `parseHHMM` would), so the value
   is committed via `onCommit(formatHHMM(parseHHMM(display)!))` the moment the buffer is
   full — no need to hit Done. `onEndEditing` with 0-3 digits **snaps back** to the last
   saved value (same behaviour as today's parse failure). Equal times (`09:00`/`09:00`)
   remain committable and show the inert hint (decision 2), exactly as today.
8. **The pure helpers live in `autoTheme.ts`** (no RN imports) and are tested in the existing
   `autotheme_suite.ts` — so no new file, no `run.ts` edit.
9. **Midnight wrap unchanged.** `dayStart > dayEnd` (e.g. `22:00` until `06:00`) is a valid
   window per cycle14 decision 7; the mask does not care about ordering. Nothing to add.

## Why RN pushes the value back (context for decision 5 — executor: read, don't "fix")

RN's controlled `TextInput` (0.85.3 here) keeps a `lastNativeText` state updated from every
native change event and, in a layout effect, re-sends `props.value` to the native view
whenever the two differ. So a non-digit sneaking in (`07:0a`) is reverted by RN itself even
when our state does not change — but by the same mechanism, a backspace over the colon
(`07:` → native `07`) would be reverted too unless we turn it into a digit deletion. That is
all decision 5 does. Do not add `setNativeProps` calls or a controlled `selection` prop;
neither is needed and both have Android quirks.

## Files to touch

### 1. `app/src/ui/autoTheme.ts` — append four pure helpers (after `boundariesAround`, i.e. at end of file)

```ts
/** virgin-cycle15 brief 01: fixed-colon time entry. The field's state is a
 * left-filled buffer of 0-4 digits; the colon is display only.
 * Feed one character into the buffer. Returns the new buffer, or the same
 * string when the character is refused. Rules: first digit 3-9 is a one-digit
 * hour ("7" -> "07"); a second hour digit making 24-29 is refused; minute tens
 * 6-9 refused; a 5th digit refused; non-digits refused. */
export function pushTimeDigit(digits: string, ch: string): string;

/** Any text the native field reports -> canonical buffer: keep only digits and
 * replay them through pushTimeDigit from empty (refused digits are skipped,
 * later ones still land — same as typing them one by one). */
export function digitsFromText(raw: string): string;

/** Buffer -> what the field shows: "" -> ":", "07" -> "07:", "070" -> "07:0",
 * "0700" -> "07:00". */
export function displayTime(digits: string): string;

/** Reported native text after an edit -> new buffer, given the buffer before
 * the edit. The one special case: digits unchanged, colon gone, buffer
 * non-empty = the user backspaced over the colon -> drop the last digit.
 * Everything else is digitsFromText(raw). */
export function digitsAfterEdit(prevDigits: string, raw: string): string;
```

Also add a one-line header note under the existing file comment (lines 1-6): "virgin-cycle15
brief 01: `pushTimeDigit`/`digitsFromText`/`displayTime`/`digitsAfterEdit` back the
fixed-colon field in settings.tsx." `parseHHMM`/`formatHHMM`/`themeForTime`/`boundariesAround`
are unchanged.

A `"HH:MM"` saved value becomes a buffer with `digitsFromText('09:00') === '0900'` — no
separate `digitsFromHHMM` needed (rule 4 accepts every string `parseHHMM` accepts, incl.
`9:00` → `0900`).

### 2. `app/src/ui/settings.tsx`

**Import** (line 27): extend to
`import { DEFAULT_DAY_END, DEFAULT_DAY_START, digitsAfterEdit, digitsFromText, displayTime, formatHHMM, parseHHMM, themeForTime } from './autoTheme';`

**Replace `TimeRow` (lines 164-190, comment included) with two components** in the same
spot (after `Switch`, before the `Help` interface at 195 — `Help` is hoisted, same as today):

```tsx
/** virgin-cycle15 brief 01: one fixed-colon HH:MM field. State is a 0-4 digit
 * buffer (ui/autoTheme.ts pushTimeDigit rules); the ":" is display only, never
 * typed, never deleted. Commits the moment 4 digits are in; an incomplete field
 * snaps back to the saved value on end-editing. */
function TimeField(props: { value: string; onCommit: (v: string) => void; t: PaddockTheme }) {
  const { t } = props;
  const [digits, setDigits] = useState(() => digitsFromText(props.value));
  useEffect(() => { setDigits(digitsFromText(props.value)); }, [props.value]);
  const display = displayTime(digits);
  return (
    <TextInput
      value={display}
      onChangeText={(raw) => {
        const next = digitsAfterEdit(digits, raw);
        setDigits(next);
        if (next.length === 4) {
          const norm = formatHHMM(parseHHMM(displayTime(next))!);
          if (norm !== props.value) props.onCommit(norm);
        }
      }}
      onEndEditing={() => { if (digits.length !== 4) setDigits(digitsFromText(props.value)); }}
      keyboardType="number-pad"
      maxLength={5}
      selectTextOnFocus
      accessibilityLabel="Time, hours and minutes"
      style={[st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg, minWidth: 64, paddingHorizontal: 8, textAlign: 'center' }]}
    />
  );
}

/** virgin-cycle15 brief 01: "Day from [HH:MM] until [HH:MM]" as ONE settings row
 * (was two rows in cycle14). */
function DayWindowRow(props: { start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void; t: PaddockTheme; help: Help }) {
  const { t } = props;
  return (
    <Row label="Day from" t={t} help={props.help}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TimeField value={props.start} onCommit={props.onStart} t={t} />
        <Text style={{ color: t.textDim, fontSize: 13 }}>until</Text>
        <TimeField value={props.end} onCommit={props.onEnd} t={t} />
      </View>
    </Row>
  );
}
```

Notes: the non-null `!` on `parseHHMM(...)` is safe by construction (four accepted digits
always parse — the suite below asserts it); `st.input` (line 705) is unchanged, the
per-field override narrows it from `minWidth: 74`/`paddingHorizontal: 10` to `64`/`8` so
both fields plus `until` fit beside the label on a 360-dp phone (card inner width ≈ 300 dp;
label column ≈ 70 dp; children ≈ 64 + 6 + ~32 + 6 + 64 = 172 dp). `placeholder` is dropped:
the value is never the empty string (an empty buffer shows `:`), so a placeholder would never
show.

**Screen block** — replace lines 589-599 (`{s.autoTheme ? (` … `) : null}`) with:

```tsx
        {s.autoTheme ? (
          <>
            <DayWindowRow start={s.dayStart} end={s.dayEnd}
              onStart={(v) => set('dayStart', v)} onEnd={(v) => set('dayEnd', v)} t={t} help={help} />
            {themeForTime(Date.now(), s.dayStart, s.dayEnd) === null ? (
              <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 8 }}>
                Times must be different — auto is paused until they are.
              </Text>
            ) : null}
          </>
        ) : null}
```

(The old hint said "must be HH:MM and different"; the mask makes the first half impossible,
so it goes.) Lines 585-588 (the switch row, incl. its hint "switched at the times below")
stay as they are — still true.

Nothing else in the file changes. In particular the load guard (104-105), `Row`, `Seg`,
`Switch`, `SportsSection`'s own `TextInput`s (498, 533 — sport names, not times) and the
`Theme` row (580-584) are untouched.

### 3. `app/tests/autotheme_suite.ts` — append after the last `});` (line 107)

Import line 7 becomes
`import { parseHHMM, formatHHMM, themeForTime, boundariesAround, pushTimeDigit, digitsFromText, displayTime, digitsAfterEdit } from '../src/ui/autoTheme.ts';`
Same `assert`/`test` style as the file. Cases (each `test(...)` name prefixed `autoTheme:`):

- `pushTimeDigit` first digit: `('', '7') → '07'`, `('', '9') → '09'`, `('', '3') → '03'`,
  `('', '0') → '0'`, `('', '1') → '1'`, `('', '2') → '2'`.
- second hour digit: `('1', '9') → '19'`, `('2', '3') → '23'`, `('0', '0') → '00'`,
  `('2', '4') → '2'` (refused), `('2', '9') → '2'` (refused).
- minutes: `('19', '5') → '195'`, `('19', '0') → '190'`, `('19', '6') → '19'` (refused),
  `('19', '9') → '19'` (refused), `('195', '9') → '1959'`, `('070', '0') → '0700'`.
- full / junk: `('1959', '0') → '1959'`, `('', 'a') → ''`, `('07', ':') → '07'`,
  `('07', ' ') → '07'`.
- `digitsFromText`: `'07:00' → '0700'`, `'9:00' → '0900'` (lenient saved value),
  `'7' → '07'`, `'7000' → '0700'` (Nathan's example: 4th `0` dropped), `'0700' → '0700'`,
  `'' → ''`, `':' → ''`, `'07:' → '07'`, `'25:00' → '200'` (the `5` is skipped, later
  digits still land — pin this so nobody "fixes" it), `'07:0a' → '070'`, `'1959' → '1959'`.
- `displayTime`: `'' → ':'`, `'0' → '0:'`, `'07' → '07:'`, `'070' → '07:0'`,
  `'0700' → '07:00'`, `'1959' → '19:59'`.
- round trip: for each `s` of `['00:00', '07:00', '09:05', '19:00', '23:59']`:
  `displayTime(digitsFromText(s)) === s`, and
  `formatHHMM(parseHHMM(displayTime(digitsFromText(s)))!) === s`.
- every full buffer parses: for `h` in 0..23, `m` in 0..59, the four digits of
  `formatHHMM(h*60+m)` fed one by one through `pushTimeDigit` from `''` give a 4-digit
  buffer whose `displayTime` `parseHHMM`s to `h*60+m` (1440 iterations, trivial).
- `digitsAfterEdit` — the backspace-over-colon rule: `('07', '07') → '0'`, `('0', '0') → ''`,
  `('', '') → ''`; and the ordinary path: `('0700', '07:0') → '070'` (backspace at the end),
  `('070', '07:00') → '0700'` (typed a digit), `('07', '07:') → '07'` (no change),
  `('0700', '0700') → '070'` (colon deleted with the caret mid-string: digits unchanged +
  colon gone = last digit dropped, per decision 5), `('0700', '0:00') → '000'` (mid-string
  digit deleted → re-flow), `('', '7') → '07'`, `('07', '07:0a') → '070'`.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count goes up by the new tests
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
```

Baseline (cycle14 landed, 2026-09-26): 676 tests, 673 pass, 0 fail, 3 skip. Record
before/after counts in the report. If `tsc` blows the call budget on this mount, retry once
with a longer timeout, then report — do not substitute a syntax-only check without saying so.
Also confirm with `grep -n "TimeRow\|numbers-and-punctuation" app/src/ui/settings.tsx`
→ no matches.

## On-device checklist (Nathan, after OTA — not the executor)

1. SETTINGS → APPEARANCE with Auto day/night **off**: nothing changed.
2. Switch it on: exactly one extra row, `Day from [09:00] until [19:00]`, no summary line
   under it. Both fields, `until` and the label fit on one line with no wrapping (check in
   both themes).
3. Tap the first field: the whole `09:00` is selected. Type `7`,`0`,`0` → the field shows
   `07:`, `07:0`, `07:00`; the theme reacts as soon as the third key lands (if the clock is
   in/out of the new window) — no Done needed. Type a 4th `0` → nothing happens.
4. Tap the second field, type `1`,`9`,`0`,`0` → `1:`, `19:`, `19:0`, `19:00`.
5. Backspace test: in a field showing `07:00`, press backspace 5 times → `07:0`, `07:`,
   `0:`, `:`, `:` (the colon never goes). Now tap elsewhere (or Done) → the field snaps back
   to the saved `07:00`.
6. Refused digits: type `2`,`5` → stays `2:`; then `3` → `23:`. In minutes, type `7` first →
   nothing; then `5`,`9` → `23:59`.
7. Set both to the same time → the "Times must be different — auto is paused" line appears
   under the row; change one → it disappears.
8. Wrap: `Day from 22:00 until 06:00` is accepted and the theme is day at night (as cycle14
   decision 7 intends).
9. Kill and relaunch the app → the times you set are still there (unchanged storage).

## Out of scope

- A native time picker, `Appearance`/`useColorScheme`, sunrise/sunset (as in cycle14).
- Editing in place at an arbitrary caret position (decision 5/6: the field is retyped).
- A controlled `selection` prop to pin the caret at the end — noted as the fallback if
  Nathan finds mid-string edits confusing on his phone; not done here.
- iOS (no iOS build of Qualifire; `number-pad`/`selectTextOnFocus` are fine there anyway).
- Anything in `autoThemeScheduler.tsx`, `themeContext.tsx`, the storage keys, `STATE.md`,
  `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (two files edited + the
existing test suite extended; no new dependency, no `app.json`/`eas.json` change), so it
ships to the Preview APK over EAS Update via `scripts/publish-preview.cmd` — no new numbered
build, no reinstall. Visible only with Auto day/night on: the two time rows become one and
the fields get the fixed colon. Saved times are untouched.

## Open questions / assumptions (logged, not blocking)

- **Summary line removed for the valid case** (decision 2) — Nathan did not ask for this
  explicitly; it was redundant once the row itself reads `Day from X until Y`. One-line
  revert if he wants it back.
- **`7000` read as `07:00`** (decision 4): the fourth digit is dropped, not shifted. If
  Nathan meant something else by that example, the acceptance rules are the only thing to
  revisit (`pushTimeDigit`), not the component.
- **Empty buffer shows a lone `:`** — only reachable by backspacing everything, and it snaps
  back on blur. If it looks odd on the phone, the alternative is showing the saved value dimmed
  as a placeholder, which needs the value to be `''` and would bring the placeholder back.
- **Width on very narrow phones** (< 340 dp): if `until` wraps or a field is clipped, the
  cheapest fix is `fontSize: 12` on the `until` text and `minWidth: 60` on the fields; the
  label column has `flex: 1` and shrinks first.
