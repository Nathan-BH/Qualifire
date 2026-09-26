# 01 — Auto day/night theme on a schedule

**Source: testuser LBH, idea #1** — "Add a Settings option to set a day interval, e.g.
09:00–19:00, and the app automatically switches between the day and night themes at those
times."

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-25 by the Plan
tier (Fable) from a Haiku digest + anchor checks against the working tree. Executor: Sonnet,
cold, this file only.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-25. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. `AppState` comes from `react-native` core.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`.

## Goal

A default-OFF setting under SETTINGS → APPEARANCE: "Auto day/night" + a day window
(`Day from` HH:MM, `Day until` HH:MM, default 09:00–19:00, device local time). With it on,
the theme is `daylight` inside the window and `night` outside it, switching at the boundaries
without polling. The manual Day/Night control (SETTINGS Seg + RECORD's mode pill) keeps working.

## Decisions (already made — do not reopen)

1. **Manual pick while auto is on = temporary override until the next scheduled boundary.**
   Same as Android's and iOS's dark-mode schedule; nothing hidden gets switched off behind
   the user's back. The override is in-memory only: a relaunch re-applies the schedule.
2. **Never switch while a ride is being recorded.** `getStatus().session !== null`
   (`app/src/location/index.ts:113`) means recording; the switch is deferred and lands when the
   session clears (via `subscribe`, line 117). A race is only ever live inside a recording, so
   this covers "race is live" too.
3. **Timer aimed at the next boundary + re-check on AppState `active`.** No interval polling.
   JS timers don't run in the background, so `active` is what catches a boundary that passed
   while the app was asleep.
4. **Storage: the three new keys go in the existing `Settings` object** (`settings.tsx`,
   `<documents>/settings.json`), persisted by the existing whole-object write. **Nothing new
   is written to the theme's own file.** See "Write-race check" — the two providers write two
   *different* files, and this design keeps it that way.
5. **Schedule logic is one pure module** (`app/src/ui/autoTheme.ts`, no RN imports) so it is
   headless-testable; the side effects live in one small component mounted in `App.tsx`.
6. **Invalid or equal times = schedule inert** (`themeForTime` returns `null`, nothing
   switches, UI shows a one-line hint). Not "always day", not "always night".
7. **Boundary semantics:** at exactly `dayStart` the mode is `daylight`; at exactly `dayEnd`
   it is `night`. Window wraps midnight when `dayStart > dayEnd` (e.g. 22:00–06:00 → day
   during the night hours; a valid, if odd, choice — we don't second-guess it).
8. **Time entry is two `TextInput`s** (already imported in `settings.tsx:9`), committed on
   `onEndEditing`, lenient parse (`9:00` accepted), stored normalised (`09:00`). No native
   time picker — JS-only, ships OTA.

## Write-race check (verified 2026-09-25; executor re-verifies before touching anything)

The digest claimed both providers write "the same file". They don't:

- `themeContext.tsx:13-15` → `new File(new Directory(Paths.document, 'qualifire'), 'settings.json')`
  = `<documents>/qualifire/settings.json`, written as `{ themeMode }` only (line 36).
- `settings.tsx:76` → `` const FILE = `${FileSystem.documentDirectory ?? ''}settings.json`; ``
  = `<documents>/settings.json`, whole `Settings` object (line 116).

Different paths, no clobber. **Rule for this brief:** the new keys live only in the
`Settings` object; `themeContext.tsx`'s file keeps exactly its one key `themeMode`. Do not
add a second writer to either file.

Observation, out of scope: `<documents>/qualifire/` is also the storage root that "Reset to
virgin" moves aside (`expoFsAdapter.ts:86-92`), so the *theme mode* does not actually survive
a reset + relaunch despite the alert copy at `settings.tsx:302` ("Your settings and theme
stay"). The new keys are outside that root and do survive. Log it, don't fix it.

## Files to touch

### 1. NEW `app/src/ui/autoTheme.ts` — pure schedule model (no `react-native`/`expo` imports)

```ts
import type { ThemeMode } from './themeContext.tsx';

export const DEFAULT_DAY_START = '09:00';
export const DEFAULT_DAY_END = '19:00';

/** "9:00" | "09:00" -> minutes since midnight; null for anything else
 * (hours 0-23, minutes 00-59, exactly one colon, no seconds, no spaces). */
export function parseHHMM(s: string): number | null;

/** minutes since midnight -> "HH:MM" (zero-padded). */
export function formatHHMM(min: number): string;

/** Mode at `now` (Date or epoch ms, LOCAL time) for a day window. null when either
 * time fails parseHHMM or start === end. Day iff start <= m < end; when start > end
 * the window wraps midnight: day iff m >= start || m < end. */
export function themeForTime(now: Date | number, dayStart: string, dayEnd: string): ThemeMode | null;

/** The boundary just passed and the next one, as epoch ms in LOCAL time (built with the
 * Date(y, mo, d, h, mi) constructor — never UTC arithmetic), plus the mode right now.
 * prevMs <= nowMs < nextMs; nextMs - nowMs <= 24h. null under the same conditions as
 * themeForTime. Candidates are dayStart and dayEnd on yesterday, today and tomorrow. */
export function boundariesAround(now: Date | number, dayStart: string, dayEnd: string):
  { mode: ThemeMode; prevMs: number; nextMs: number } | null;
```

`import type` is erased by `--experimental-strip-types`; `rankingRevealModel.ts:38` already
does the same against a `.tsx` file (`import type { TowerModel } from './tower.tsx';`), so
`tsc` accepts the `.tsx` extension too.

### 2. `app/src/ui/themeContext.tsx` (74 lines)

Anchors: line 42-46 is

```ts
interface ThemeCtx {
  t: PaddockTheme;
  mode: ThemeMode;
  toggleMode: () => void;
}
```

line 48 `const Ctx = createContext<ThemeCtx>({ t: daylight, mode: 'daylight', toggleMode: () => {} });`
line 57-63 `const toggleMode = useCallback(() => { ... saveMode(next); ... }, []);`
line 66 `<Ctx.Provider value={{ t: mode === 'daylight' ? daylight : night, mode, toggleMode }}>`.

Change:

- Extend `ThemeCtx` with
  ```ts
  /** User's explicit pick (Seg row / RECORD pill). Records manualAt. */
  pickMode: (m: ThemeMode) => void;
  /** The auto-schedule's write: same as pickMode but does NOT touch manualAt. */
  applyScheduledMode: (m: ThemeMode) => void;
  /** Date.now() of the last user pick this JS launch; null if none. In-memory only. */
  manualAt: number | null;
  ```
  Update the `createContext` default (line 48) with no-op functions and `manualAt: null`.
- Add `const [manualAt, setManualAt] = useState<number | null>(null);`.
- `toggleMode` (57-63): after computing `next`, also `setManualAt(Date.now())` (outside the
  `setMode` updater — do not call a setter inside another setter's updater). Keep `saveMode`.
- `pickMode(m)`: `saveMode(m); setMode(m); setManualAt(Date.now());`.
- `applyScheduledMode(m)`: `saveMode(m); setMode(m);` — no manualAt.
- Both wrapped in `useCallback([], ...)`; add them + `manualAt` to the Provider value (66).
- Header comment (lines 1-6): add one line "virgin-cycle14 brief 01: `pickMode`/`applyScheduledMode`/`manualAt` for the auto day/night schedule (schedule itself lives in settings.tsx + autoThemeScheduler.tsx)."
- `saveMode` stays as is (still writes `{ themeMode: mode }` only — see write-race rule).

### 3. `app/src/ui/settings.tsx` (667 lines)

**Interface** — after line 55 `  showHelp: boolean;` (inside `export interface Settings`,
closing `}` at 56) add:

```ts
  /** virgin-cycle14 brief 01 (testuser LBH #1): switch daylight/night on a clock.
   * Off = manual only (the default, so existing installs see no change). Times are
   * "HH:MM" device-local; dayStart > dayEnd wraps midnight. The pure model is
   * ui/autoTheme.ts, the effect is ui/autoThemeScheduler.tsx. */
  autoTheme: boolean;
  dayStart: string;
  dayEnd: string;
```

**DEFAULTS** — after line 67 `  showHelp: true,` add
`  autoTheme: false,` / `  dayStart: DEFAULT_DAY_START,` / `  dayEnd: DEFAULT_DAY_END,`.
Import: add `import { DEFAULT_DAY_END, DEFAULT_DAY_START, formatHHMM, parseHHMM, themeForTime } from './autoTheme';`
next to the other `./` imports (line 26-27 area).

**Load** — line 100-104: `setS((prev) => ({ ...prev, ...saved }))` is a shallow merge over
flat keys, so an old file without the three keys keeps the defaults. No migration needed.
Add a guard right after the `delete ... redLight` line (102), same spirit:

```ts
        // virgin-cycle14 brief 01: never load an unparseable time (hand-edited file).
        if (typeof saved.dayStart !== 'string' || parseHHMM(saved.dayStart) === null) delete saved.dayStart;
        if (typeof saved.dayEnd !== 'string' || parseHHMM(saved.dayEnd) === null) delete saved.dayEnd;
```

**Screen** — line 536 `const { t, mode, toggleMode } = useTheme();` → also destructure
`pickMode`. Line 548-552 is the Theme row:

```tsx
        <Row label="Theme" hint="The map and race surface follow it." help={help} t={t}>
          <Seg t={t} value={mode === 'daylight' ? 'day' : 'night'}
            options={[['night', 'night'], ['day', 'day']]}
            onPick={(v) => { if ((v === 'day') !== (mode === 'daylight')) toggleMode(); }} />
        </Row>
```

Change `onPick` to `onPick={(v) => pickMode(v === 'day' ? 'daylight' : 'night')}` and the hint
to `"The map and race surface follow it. With Auto on, your pick holds until the next scheduled change."`.
(RECORD's pill at `RecordScreen.tsx:1330` keeps calling `toggleMode`, which now records
`manualAt` too — no change there.)

Insert, between the Theme row's `</Row>` (552) and `<Row label="Help icons"` (553):

```tsx
        <Row label="Auto day/night" t={t} help={help}
          hint="Day theme inside the window, night outside, switched at the times below (phone clock). Never switches mid-ride — it waits for STOP.">
          <Switch on={s.autoTheme} onToggle={() => set('autoTheme', !s.autoTheme)} t={t} />
        </Row>
        {s.autoTheme ? (
          <>
            <TimeRow label="Day from" value={s.dayStart} onCommit={(v) => set('dayStart', v)} t={t} help={help} />
            <TimeRow label="Day until" value={s.dayEnd} onCommit={(v) => set('dayEnd', v)} t={t} help={help} />
            <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 8 }}>
              {themeForTime(Date.now(), s.dayStart, s.dayEnd) === null
                ? 'Times must be HH:MM and different — auto is paused until they are.'
                : `Day ${s.dayStart}–${s.dayEnd}, night otherwise.`}
            </Text>
          </>
        ) : null}
```

New component `TimeRow`, placed after `Switch` (line 152-159) and before the `Help` interface
(line 161):

```tsx
/** virgin-cycle14 brief 01: one HH:MM field. Local draft while typing; commits on
 * end-editing only if it parses, otherwise snaps back to the last saved value. */
function TimeRow(props: { label: string; value: string; onCommit: (v: string) => void; t: PaddockTheme; help: Help }) {
  const { t } = props;
  const [draft, setDraft] = useState(props.value);
  useEffect(() => { setDraft(props.value); }, [props.value]);
  return (
    <Row label={props.label} t={t} help={props.help}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={() => {
          const m = parseHHMM(draft.trim());
          if (m === null) { setDraft(props.value); return; }
          const norm = formatHHMM(m);
          setDraft(norm);
          if (norm !== props.value) props.onCommit(norm);
        }}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="09:00"
        placeholderTextColor={t.textDim}
        style={[st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg, minWidth: 74, textAlign: 'center' }]}
      />
    </Row>
  );
}
```

`Help` is declared at line 161 *after* this insertion point; TS hoists interface names, so
the reference is fine (the `Row` function at 166 already references `Help` the same way).
`st.input` exists (line 666). `t.bg`, `t.text`, `t.textDim`, `t.cardBorder` are used at
line 418 the same way.

### 4. NEW `app/src/ui/autoThemeScheduler.tsx` — the effect (renders `null`)

```tsx
/**
 * virgin-cycle14 brief 01: applies the auto day/night schedule. Mounted once in
 * App.tsx inside SettingsProvider (it reads settings) and inside ThemeProvider
 * (it writes the mode). Re-evaluates on: mount, settings change, a timer aimed
 * at the next boundary (+1 s slop), AppState -> 'active', and the tracker's
 * session clearing. Never switches while a ride is recording; never overrides
 * a manual pick made after the last boundary (or after auto was turned on).
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getStatus, subscribe } from '../location';
import { boundariesAround } from './autoTheme';
import { useSettings } from './settings';
import { useTheme } from './themeContext';

export function AutoThemeScheduler() {
  const { s } = useSettings();
  const { mode, manualAt, applyScheduledMode } = useTheme();
  const [tick, setTick] = useState(0);
  const enabledSince = useRef<number | null>(null);

  // Remember when auto was switched on this launch: a pick older than that is stale.
  useEffect(() => {
    enabledSince.current = s.autoTheme ? Date.now() : null;
  }, [s.autoTheme]);

  useEffect(() => {
    if (!s.autoTheme) return;
    const b = boundariesAround(Date.now(), s.dayStart, s.dayEnd);
    if (b === null) return; // invalid schedule: inert until fixed
    const recording = getStatus().session !== null;
    const threshold = Math.max(b.prevMs, enabledSince.current ?? 0);
    const overridden = manualAt !== null && manualAt >= threshold;
    if (!recording && !overridden && mode !== b.mode) applyScheduledMode(b.mode);

    const bump = () => setTick((n) => n + 1);
    const timer = setTimeout(bump, Math.max(1000, b.nextMs - Date.now() + 1000));
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') bump(); });
    let wasRecording = recording;
    const unsub = subscribe((st) => {
      const now = st.session !== null;
      if (wasRecording && !now) bump(); // ride just stopped: apply the deferred switch
      wasRecording = now;
    });
    return () => { clearTimeout(timer); app.remove(); unsub(); };
  }, [s.autoTheme, s.dayStart, s.dayEnd, mode, manualAt, tick, applyScheduledMode]);

  return null;
}
```

Notes for the executor: `getStatus`/`subscribe` are exported at `location/index.ts:113` and
`:117`; `settings.tsx:10-11` already imports from `../location`, so there is no new import
cycle. `AppState.addEventListener` returns a subscription with `.remove()` on RN 0.85.
`mode` in the deps is deliberate: a manual pick changes `mode` and `manualAt` together, and the
effect then does nothing (override) but re-arms the timer. The one-shot timer never busy-loops:
`nextMs` is strictly in the future by contract, and the guard `Math.max(1000, …)` holds even
if the clock jumps.

### 5. `app/App.tsx` (300 lines)

Line 257-260 is

```tsx
      <ThemeProvider>
        <SettingsProvider>
          <Shell />
        </SettingsProvider>
```

Insert `          <AutoThemeScheduler />` directly after `<Shell />` (inside SettingsProvider).
Add `import { AutoThemeScheduler } from './src/ui/autoThemeScheduler';` after line 39
(`import { ThemeProvider, useTheme } from './src/ui/themeContext';`).

### 6. NEW `app/tests/autotheme_suite.ts` + registration

Register in `app/tests/run.ts`: add `import './autotheme_suite.ts';` directly after line 51
`import './virginmanifest_suite.ts';` (before line 52 `import { runAll } from './lib.ts';`).

Style: `app/tests/launch_anim_suite.ts` (pure-maths suite, `import { assert, test } from './lib.ts';`,
import the module as `'../src/ui/autoTheme.ts'`). Build every `now` with the local
constructor `new Date(2026, 8, 25, h, m)` so the suite passes in any timezone. Cases:

- `parseHHMM`: `'09:00'`→540, `'9:00'`→540, `'00:00'`→0, `'23:59'`→1439; null for `'24:00'`,
  `'09:60'`, `'0900'`, `'9'`, `''`, `'09:00:00'`, `' 09:00'`, `'ab:cd'`.
- `formatHHMM`: 0→`'00:00'`, 540→`'09:00'`, 1439→`'23:59'`; `formatHHMM(parseHHMM('9:05')!) === '09:05'`.
- `themeForTime` normal window 09:00–19:00: 08:59 night, 09:00 day (boundary), 12:00 day,
  18:59 day, 19:00 night (boundary), 23:00 night, 00:00 night.
- wrap-midnight 22:00–06:00: 22:00 day, 23:30 day, 00:00 day, 05:59 day, 06:00 night,
  12:00 night, 21:59 night.
- equal `'09:00','09:00'` → null; invalid `'abc','19:00'`, `'09:00','25:00'`, `'',''` → null.
- `boundariesAround` 09:00–19:00: now 12:00 → mode day, prev = today 09:00, next = today
  19:00; now 20:00 → night, prev today 19:00, next tomorrow 09:00 (`new Date(2026, 8, 26, 9, 0)`);
  now 03:00 → night, prev yesterday 19:00 (`new Date(2026, 8, 24, 19, 0)`), next today 09:00;
  now exactly 09:00 → mode day, prev = today 09:00 (prev <= now), next = today 19:00.
  For each: `prevMs <= nowMs`, `nextMs > nowMs`, `nextMs - nowMs <= 24*3600*1000`.
- `boundariesAround` wrap 22:00–06:00, now 23:00 → day, prev today 22:00, next tomorrow 06:00.
- `boundariesAround` invalid/equal → null.

The scheduler component and the settings screen are not headless-testable (RN), as with every
other screen in this repo; the on-device checklist below is their test.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count goes up by the new tests
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
```

Baseline before the change (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip. Record
before/after counts in the report. If `tsc` blows the call budget on this mount, retry once
with a longer timeout, then report — do not substitute a syntax-only check without saying so.

## On-device checklist (Nathan, after OTA — not the executor)

1. SETTINGS → APPEARANCE: new "Auto day/night" switch, off; Theme row unchanged. Nothing
   else looks different.
2. Switch it on: "Day from 09:00 / Day until 19:00" and the summary line appear; the theme
   snaps to whichever the clock says.
3. Set "Day until" to a minute or two ahead; wait — the theme flips to night within ~1 s of
   the minute. Set it back.
4. Flip Theme manually while auto is on: it stays flipped; at the next boundary the schedule
   wins again.
5. Start recording, cross a boundary (or set one a minute ahead), confirm no switch until
   STOP; the switch lands right after.
6. Type `9:5` → the field snaps back to the previous value (minutes must be two digits,
   e.g. `09:05`); type `25:00` → also snaps back; set both equal → the "paused" hint
   shows and nothing switches. [Corrected 2026-09-26 post-Inspect: the brief's own spec
   requires two-digit minutes, so `9:5` is invalid input, not a valid `09:05` — the
   landed code follows the spec; this checklist line was wrong.]
7. Background the app across a boundary, reopen: the theme is right on return.

## Out of scope

- A native time picker, `Appearance`/`useColorScheme` (follow the OS theme), sunrise/sunset.
- DST-transition minutes (the boundary lands within an hour of where it should; not worth code).
- The DEMO tab's full-screen run (not a recording; the theme may switch mid-demo — fine).
- The ~61 hardcoded hex colours outside the theme system (PreviewScreen etc.) — they don't
  follow either theme today and won't after this.
- The pre-existing "theme does not survive Reset to virgin" observation above.
- i18n; the tester-facing name of the setting (Nathan can rename; only the label string moves).
- Anything in `STATE.md` / `OPEN-ITEMS.md` / this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (three files touched, two new
`src/ui` files, one new test suite; `AppState` is RN core; no `package.json` change), so it
ships to the Preview APK over EAS Update via `scripts/publish-preview.cmd` — no new numbered
build, no reinstall. Default OFF: an updated phone looks and behaves exactly as before until
someone turns on SETTINGS → APPEARANCE → Auto day/night.

## Open questions / assumptions (logged, not blocking)

- **Override semantics** chosen as "hold until the next boundary" (decision 1). If Nathan
  would rather a manual pick switch auto off, it is a two-line change in
  `autoThemeScheduler.tsx` (call `set('autoTheme', false)` from the settings ctx on
  `manualAt` change) — not done here.
- **Relaunch during an override**: `manualAt` is in-memory, so after a cold start the
  schedule wins immediately. Assumed acceptable; a persisted override would need a fourth key.
- **`themeMode` file vs reset**: left as found (see Write-race check).
- **Tester's exact wording** ("day interval") became "Day from / Day until". Labels only.
- Keyboard type `numbers-and-punctuation` is the closest RN core option that shows a colon on
  both platforms; Android may fall back to a numeric pad with punctuation — if the colon is
  hard to reach on Nathan's phone, `keyboardType="default"` is the fallback.
