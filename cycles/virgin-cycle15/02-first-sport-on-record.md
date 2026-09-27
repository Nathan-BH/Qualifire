# 02 — First sport on RECORD: add it where you press, not in SETTINGS

**Source: Nathan, 2026-09-26 (same session as brief 01).** His words: "also lets change how
you add the initial sport on a fresh app launch. Instead of having to go to settings, it would
be better to be able to add your first sport on the go. So for the first sport it could be
asked when you press record for the first time with no sport configoured, it could ask you to
type in a sport right there and then. for the rest i would it keep it in the settings so people
can always add more so no change there needed?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from a Haiku digest plus two anchor checks against the working tree (branch
`virgin`, HEAD `c3e92ef`, cycle14 fully landed, brief 01 of this cycle unexecuted). Executor:
Sonnet, cold, this file only. Second brief of `virgin-cycle15`; independent of brief 01 (no
shared lines — brief 01 edits `settings.tsx` 164-190 / 589-599 and `autoTheme.ts`; this one
edits `RecordScreen.tsx`, `recordFlow.ts`, one new UI file and one test file). Either order.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-26. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Everything is RN core (`TextInput`, `Text`, `View`,
  `Pressable`).
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  `01-day-night-compact-time-input.md`, or anything under `cycles/virgin-cycle14/` (history).
- **Do not touch `app/src/ui/settings.tsx`, `app/src/store/sports.ts`,
  `app/src/store/sportStore.ts`.** Adding the 2nd, 3rd… sport stays in SETTINGS exactly as
  it is (Nathan: "no change there needed"). The store already does everything the new
  prompt needs (`addSport` auto-activates the first sport); this brief only adds a second
  *caller* of it.

## Goal

On a phone with **zero sports** (fresh install, or right after Reset-to-virgin), pressing
**● RECORD** no longer jumps to SETTINGS. Instead an input appears in the RECORD screen's
setup area asking for the sport's name; the rider types it (`Bike`, `Run`, …) and presses
**● RECORD** again. That second press saves the sport (it becomes the active sport, exactly
as SETTINGS → "add sport" would have done) and then continues straight into today's arming
flow — the same `onRecord` path a phone with a sport already takes. "not now" under the
input backs out. SETTINGS → SPORTS is untouched and remains the only place to add a
second sport, rename or delete.

## Current state (verified 2026-09-26 against the tree)

All in `app/src/ui/RecordScreen.tsx` (1715 lines) unless stated.

- **Imports.** Line 17 `import { useCallback, useEffect, useMemo, useRef, useState } from 'react';`
  Line 18 `import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
  (no `TextInput` yet). Line 78
  `import { effectiveRideSportId, setActiveSport, showSportPillRow, wayIdsOfSport } from '../store/sports';`
  Line 80 `import { activeCatalog, activeSportId, currentSports, saveSports } from '../store/sportStore';`
  Line 39 `import { effectiveFromId, isFullscreen, liveMapOverlayFor, statusItemsFor, type RecordPhase } from './recordFlow';`
  Line 73 `import { RouteNamingCard } from './routeNamingCard';`
- **Zero-sports flag.** Lines 226-234:

  ```tsx
    // Q4: zero sports blocks the whole setup flow (the C0 card further down)      // 226
    // and onRecord (belt-and-braces guard below) — a ride cannot start
    // without a sport for it to belong to.
    const noSport = currentSports().sports.length === 0;                              // 229
    // onRecord is a []-deps useCallback (mirrors pickedWayRef/freeRideRef's
    // pattern below): it must read the CURRENT noSport, not the one from the
    // render it was created in.
    const noSportRef = useRef(noSport);                                               // 233
    noSportRef.current = noSport;                                                     // 234
  ```

  (The Haiku digest placed this at line 219 as `activeSportId() === null` — wrong on both
  counts; the lines above are what is in the tree. `noSportRef` is used in exactly one
  other place, line 452.)
- **Same-screen sport switch pattern** (C1), lines 249-261: `pickSport` calls
  `setActiveSport` → `void saveSports(next)` → resets from/to → `setSportSwitchTick((v) => v + 1)`
  (state declared line 224 `const [, setSportSwitchTick] = useState(0);`). The comment at
  249-251 is the fact this brief leans on: *"saveSports() updates the in-memory sport list
  synchronously (before its own await)"* — confirmed in `app/src/store/sportStore.ts`
  90-99 (`sports = next;` at 94, before the `await enqueueWrite` at 96).
- **`onRecord`**, lines 448-532 (`const onRecord = useCallback(async () => {` at 448,
  `}, []);` at 532). Its guard, lines 449-452:

  ```tsx
      // Q4 belt-and-braces: the button is not rendered while noSport (the C0
      // card replaces the whole setup flow), but the guard makes the
      // invariant explicit rather than relying on render-absence alone.
      if (noSportRef.current) return;                                                 // 452
  ```

  Then `setBusy(true)` (453), permissions (457-462), and at 495-499
  `const sportId = activeSportId(); if (sportId === null) { Alert.alert('No sport set up', 'Add a sport in SETTINGS before recording.'); return; }`
  — unchanged by this brief (still unreachable; see out of scope).
- **The C0 card**, lines 1368-1378:

  ```tsx
          {/* Q4 (WP-1): zero sports blocks the whole setup flow — a ride           // 1368
              cannot start without a sport for it to belong to. No onboarding
              screen; SETTINGS -> SPORTS only. Nathan 2026-09-24: dropped the
              explanatory body copy (too much AI-sounding text for a real
              product) — the label alone, extended with the destination, is
              enough. */}
          {noSport ? (                                                                // 1374
            <View style={styles.startFlow}>
              <Text style={styles.flowLabel}>SET UP A SPORT FIRST — GO TO SETTINGS</Text>   // 1376
            </View>
          ) : (                                                                       // 1378
  ```

  followed by the real setup flow (`SPORT` pill row 1382-…, `GOING TO` 1424, `WHICH WAY
  TODAY?` 1443). Styles: `startFlow` line 1639 `{ alignSelf: 'stretch', gap: 4, marginTop: 6 }`,
  `flowLabel` line 1640 `{ color: t.textDim, fontSize: 11, letterSpacing: 2, marginTop: 8 }`,
  `styles = useMemo(() => makeStyles(t), [t])` line 148.
- **The RECORD button**, lines 1488-1515. Comment 1488-1492 ends "…exist the button still
  presses through to SETTINGS, but Nathan 2026-09-24 wants it reading as the normal RECORD
  button (not a distinct "GO TO SETTINGS" label) — only the subtext below it flags the
  missing sport. …". Then:

  ```tsx
        <Pressable                                                                      // 1493
          style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
          disabled={busy}
          onPress={noSport ? () => tabNav.go('settings') : onRecord}                    // 1496
        >
          {noSport ? (                                                                  // 1498
            <>
              <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
              <Text style={[styles.bigBtnSub, styles.startSub]}>no sport selected</Text> // 1501
            </>
          ) : (
  ```

  (the non-noSport branch 1503-1513 is untouched). `busy` style line 1700 `{ opacity: 0.5 }`.
- **The inline-card precedent** `app/src/ui/routeNamingCard.tsx` (238 lines): `useTheme()`
  for colours, `TextInput` with `placeholder`/`placeholderTextColor={t.textDim}`/
  `editable={!props.busy}`/`maxLength`, input style
  `{ borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 }`
  + `{ color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }`, a dim
  `skipBtn`/`skipText` (`paddingVertical: 10, alignItems: 'center'` / `fontSize: 13`,
  colour `t.textDim`). Imports `radius` from `./theme`, `useTheme` from `./themeContext`.
  It is a "dumb UI" card: owns its inputs, the screen owns the save.
- **Store side (read-only for this brief).** `app/src/store/sports.ts`: `MAX_SPORT_LABEL = 24`
  (25), `SPORT_LABEL_PLACEHOLDER = 'e.g. Bike, Run, Walk, E-bike, Fast walk'` (26),
  `addSport(f, label, nowMs): SportsFile | string[]` (180-191) — mints the id, and
  `activeSportId: f.activeSportId ?? id` (187) makes the first sport active;
  `validateSports` (86) refuses labels outside 1-24 chars after trim and case-insensitive
  duplicates. `app/src/store/sportStore.ts`: `saveSports(next): Promise<string[]>` (90-99)
  validates, refuses with a one-line message when writes are disarmed (93), otherwise
  updates memory synchronously then writes. SETTINGS' `handleAdd` (`settings.tsx` 385-399)
  is the exact sequence to copy: `addSport(sf, addText.trim(), Date.now())` → array ⇒ show
  `join('; ')` → `await saveSports(candidate)` → non-empty ⇒ show → clear.
- **Pure rules file** `app/src/ui/recordFlow.ts`: exports `RecordPhase` (27),
  `canTransition` (46), `isFullscreen` (54), `effectiveFromId` (63), `LiveMapOverlay`/
  `liveMapOverlayFor` (82-83), `statusItemsFor` (97). Its suite
  `app/tests/recordflow_suite.ts` imports from `'../src/ui/recordFlow.ts'` (lines 7-9,
  `assert, test` from `./lib.ts`), registered at `tests/run.ts:37`. **No test covers the
  zero-sports RECORD press today.**
- Baseline (STATE.md line 65-66, 2026-09-26): **676 tests, 673 pass, 0 fail, 3 skip**;
  `tsc --noEmit` clean, exit 0.

## Decisions (already made — do not reopen)

1. **Two presses, and RECORD is the confirm.** Press 1 with zero sports opens the prompt
   (nothing else — no navigation, no permission dialog). Press 2 with a non-empty name
   saves the sport **and immediately runs `onRecord()`**, i.e. the phone arms exactly as it
   would have with the sport pre-existing (permission dialogs, launch animation, armed
   phase). Rationale: Nathan's "on the go / right there and then" — the press that would
   have armed anyway is the one that creates the sport; the "OS dialogs happen at the kerb,
   on a deliberate RECORD press" rule (`onRecord` comment 455-456) is preserved because
   the rider pressed RECORD, not a keyboard key. There is no separate "add sport" button in
   the prompt: one big yellow button, two meanings, the subtext says which (decision 6).
2. **The setup flow (START / GOING TO / WHICH WAY) is not shown between the two presses.**
   On a zero-sport phone the catalog is either empty (B-39 blank seed → `new>>new`, the
   free ride, nothing to pick) or, if a seed exists, every route falls back to `sports[0]`
   (sports.ts fallback rule, 16-20) — which *is* the sport just created — so the defaults
   `from`/`to` were computed from (line 239-240) are the same ones the flow would show.
   Nothing is reset: `afterSportSwitch` is **not** called. If Nathan wants to land in the
   setup flow instead of arming, the change is deleting one line (`await onRecord();` in
   step 2c) — logged as open question 1.
3. **Same validation as SETTINGS, same store call, nothing new in the store.** The handler
   is `handleAdd` transplanted: `addSport(currentSports(), text.trim(), Date.now())` then
   `await saveSports(...)`. Empty after trim never reaches `addSport` (the handler shows
   `type a sport name first` and stops). `maxLength={MAX_SPORT_LABEL}` on the input;
   duplicates are impossible with zero sports. The only realistic store error is the
   disarmed-writes refusal (`sports.json could not be read at boot — not saved`), shown
   verbatim under the input, same as SETTINGS shows it.
4. **`onRecord`'s guard reads the live store, and `noSportRef` goes.** Line 452's
   `if (noSportRef.current) return;` would still be `true` on press 2 (the ref is refreshed
   at render, and the save happens in the same tick as the call). Replace it with
   `if (currentSports().sports.length === 0) return;` — `saveSports` has already updated the
   in-memory list synchronously (current-state bullet 3). `noSportRef` (233-234 + its
   comment 230-232) is then unused and is removed; `noSport` (229) stays for the JSX.
5. **The prompt shows only while `noSport && firstSportPrompt`.** So if the rider opens the
   prompt, wanders to SETTINGS, adds a sport there and comes back, the prompt is gone by
   construction (the real setup flow renders) and the stale flag is harmless; it is also
   cleared on save and on "not now". Plain `useState`, no persistence, no reset on tab change.
6. **Copy, all-caps label style matching the other setup-flow blocks (no bordered card).**
   The prompt lives where the C0 label lives, inside `styles.startFlow`, so it reads as one
   more block of the setup flow (like `SPORT`/`GOING TO`), not as a modal or a naming card.
   Label `YOUR FIRST SPORT`; input placeholder `SPORT_LABEL_PLACEHOLDER`; dismiss link
   `not now`. C0 label when the prompt is closed: `SET UP A SPORT FIRST — PRESS RECORD`
   (was `… — GO TO SETTINGS`). RECORD subtext: `no sport yet` when closed (was
   `no sport selected`), `with this sport` when open. No body copy anywhere — Nathan
   2026-09-24 (comment 1370-1373) already struck the explanatory sentence from this card.
7. **Keyboard: `autoFocus`, `returnKeyType="done"`, Done only closes the keyboard.** Done
   does *not* save-and-arm (decision 1: arming comes from RECORD). Because the RECORD button
   sits below the input and the keyboard may cover it, the executor also sets
   `keyboardShouldPersistTaps="handled"` on the setup-phase `ScrollView` **if it is not set
   already** (RN's default `never` would swallow the RECORD tap that dismisses the keyboard,
   forcing a double tap). If that `ScrollView` already has a `keyboardShouldPersistTaps` prop
   with a different value, stop and report (rule 1) — do not override it.
8. **The press rule is a pure function in `recordFlow.ts`, tested.** `recordPressAction`
   (below) is what the JSX's `onPress` reads, so the zero-sports gap named in the digest is
   closed in `recordflow_suite.ts` without any RN in the test.
9. **New file for the prompt UI**, `app/src/ui/firstSportPrompt.tsx`, controlled
   (`value`/`onChange` lifted into `RecordScreen`, because the confirm is the RECORD button
   outside the prompt). Keeps `RecordScreen.tsx` from growing by another block and gives the
   rationale a header comment, as `routeNamingCard.tsx` does.

## Files to touch

### 1. `app/src/ui/recordFlow.ts` — append one pure rule at end of file

```ts
/** virgin-cycle15 brief 02: what the big RECORD button does on press.
 * 'open-first-sport' = zero sports and the inline prompt is closed → open it;
 * 'add-first-sport'  = zero sports and the prompt is open → save the typed
 *                      sport (RecordScreen's onFirstSport), then arm;
 * 'arm'              = at least one sport → onRecord as always (the prompt
 *                      flag is ignored: it can only be stale here). */
export type RecordPressAction = 'open-first-sport' | 'add-first-sport' | 'arm';
export function recordPressAction(input: { sportCount: number; firstSportPrompt: boolean }): RecordPressAction {
  if (input.sportCount > 0) return 'arm';
  return input.firstSportPrompt ? 'add-first-sport' : 'open-first-sport';
}
```

### 2. `app/src/ui/firstSportPrompt.tsx` — new file

```tsx
/**
 * virgin-cycle15 brief 02 (Nathan 2026-09-26): the first sport is named on
 * RECORD, not in SETTINGS. Rendered by RecordScreen inside the setup flow's
 * zero-sports block once RECORD has been pressed with no sport configured.
 * Dumb UI, controlled: RecordScreen owns the text, the addSport/saveSports
 * call and the arm that follows (the big RECORD button is the confirm — there
 * is deliberately no button here). "not now" backs out to the label state.
 * The 2nd+ sport is still added in SETTINGS -> SPORTS; this file never touches
 * the store.
 */
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_SPORT_LABEL, SPORT_LABEL_PLACEHOLDER } from '../store/sports';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface FirstSportPromptProps {
  value: string;
  onChange: (v: string) => void;
  /** validation / store refusal, shown under the input; null = nothing */
  error: string | null;
  busy: boolean;
  onDismiss: () => void;
}

export function FirstSportPrompt(props: FirstSportPromptProps) {
  const { t } = useTheme();
  return (
    <View style={st.wrap}>
      <Text style={[st.label, { color: t.textDim }]}>YOUR FIRST SPORT</Text>
      <TextInput
        style={[st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }]}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={SPORT_LABEL_PLACEHOLDER}
        placeholderTextColor={t.textDim}
        editable={!props.busy}
        maxLength={MAX_SPORT_LABEL}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel="Sport name"
      />
      {props.error ? <Text style={[st.hint, { color: t.textDim }]}>{props.error}</Text> : null}
      <Pressable style={st.dismissBtn} disabled={props.busy} onPress={props.onDismiss}>
        <Text style={[st.dismissText, { color: t.textDim }]}>not now</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, letterSpacing: 2, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  hint: { fontSize: 11.5 },
  dismissBtn: { paddingVertical: 8, alignSelf: 'flex-start' },
  dismissText: { fontSize: 13 },
});
```

(`label` duplicates `RecordScreen`'s `flowLabel` values on purpose — `makeStyles(t)` is local
to that file. `radius`/`useTheme` import paths are the ones `routeNamingCard.tsx` uses,
lines 23-24 there.)

### 3. `app/src/ui/RecordScreen.tsx`

**a. Imports.**
- Line 39 → `import { effectiveFromId, isFullscreen, liveMapOverlayFor, recordPressAction, statusItemsFor, type RecordPhase } from './recordFlow';`
- After line 73 (`RouteNamingCard` import) add `import { FirstSportPrompt } from './firstSportPrompt';`
- Line 78 → `import { addSport, effectiveRideSportId, setActiveSport, showSportPillRow, wayIdsOfSport } from '../store/sports';`
- Line 17/18 unchanged (`useRef` is still used by the other refs; `TextInput` lives in the
  new file).

**b. State.** Replace lines 226-234 with:

```tsx
  // Q4: zero sports blocks the whole setup flow (the C0 block further down)
  // and onRecord (belt-and-braces guard below, which reads the live store) —
  // a ride cannot start without a sport for it to belong to.
  const noSport = currentSports().sports.length === 0;
  // virgin-cycle15 brief 02: the first sport is named right here. RECORD
  // press 1 opens the prompt, press 2 saves the sport and arms (onFirstSport).
  const [firstSportPrompt, setFirstSportPrompt] = useState(false);
  const [firstSportText, setFirstSportText] = useState('');
  const [firstSportError, setFirstSportError] = useState<string | null>(null);
```

(`noSportRef` is gone — decision 4. `grep -n noSportRef` must return nothing after the edit.)

**c. `onRecord` guard.** Replace lines 449-452 with:

```tsx
    // Q4 belt-and-braces: the setup flow is not rendered while zero sports
    // exist, but the guard makes the invariant explicit. Reads the live store
    // (not a render-time flag) because onFirstSport calls this in the same
    // tick as the saveSports that created sport #1.
    if (currentSports().sports.length === 0) return;
```

Then, **directly after `onRecord`'s closing `}, []);` (line 532)**, add:

```tsx
  // virgin-cycle15 brief 02: RECORD press 2 with zero sports — SETTINGS'
  // handleAdd transplanted (addSport → saveSports, first sport auto-active),
  // then straight into the normal arming path. Not a []-deps callback: it
  // reads the typed text.
  const onFirstSport = useCallback(async () => {
    const label = firstSportText.trim();
    if (label.length === 0) { setFirstSportError('type a sport name first'); return; }
    const candidate = addSport(currentSports(), label, Date.now());
    if (Array.isArray(candidate)) { setFirstSportError(candidate.join('; ')); return; }
    const errs = await saveSports(candidate);
    if (errs.length > 0) { setFirstSportError(errs.join('; ')); return; }
    setFirstSportError(null);
    setFirstSportText('');
    setFirstSportPrompt(false);
    setSportSwitchTick((v) => v + 1);
    await onRecord();
  }, [firstSportText, onRecord]);
```

**d. The C0 block.** Replace lines 1368-1377 (comment + `{noSport ? ( … )` up to and
including the closing `</View>` at 1377; the `) : (` at 1378 stays) with:

```tsx
        {/* Q4 (WP-1): zero sports blocks the whole setup flow — a ride
            cannot start without a sport for it to belong to. No onboarding
            screen. Nathan 2026-09-24: label only, no body copy.
            virgin-cycle15 brief 02 (Nathan 2026-09-26): the first sport is
            named HERE — RECORD opens the prompt, RECORD again saves + arms.
            2nd+ sports: SETTINGS -> SPORTS, unchanged. */}
        {noSport ? (
          <View style={styles.startFlow}>
            {firstSportPrompt ? (
              <FirstSportPrompt
                value={firstSportText}
                onChange={(v) => { setFirstSportText(v); if (firstSportError) setFirstSportError(null); }}
                error={firstSportError}
                busy={busy}
                onDismiss={() => { setFirstSportPrompt(false); setFirstSportText(''); setFirstSportError(null); }}
              />
            ) : (
              <Text style={styles.flowLabel}>SET UP A SPORT FIRST — PRESS RECORD</Text>
            )}
          </View>
```

**e. The RECORD button.** In the comment 1488-1492 replace the sentence "…exist the button
still presses through to SETTINGS, but Nathan 2026-09-24 wants it reading as the normal
RECORD button (not a distinct "GO TO SETTINGS" label) — only the subtext below it flags the
missing sport." with "…exist the button opens the first-sport prompt, then saves + arms
(virgin-cycle15 brief 02; recordFlow.recordPressAction) — Nathan 2026-09-24 wants it
reading as the normal RECORD button, only the subtext flags the missing sport." Keep the
rest of the comment. Then replace lines 1493-1502 (`<Pressable` … the `</>` closing the
noSport branch) with:

```tsx
      <Pressable
        style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
        disabled={busy}
        onPress={() => {
          const action = recordPressAction({ sportCount: currentSports().sports.length, firstSportPrompt });
          if (action === 'arm') void onRecord();
          else if (action === 'add-first-sport') void onFirstSport();
          else setFirstSportPrompt(true);
        }}
      >
        {noSport ? (
          <>
            <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
            <Text style={[styles.bigBtnSub, styles.startSub]}>{firstSportPrompt ? 'with this sport' : 'no sport yet'}</Text>
          </>
```

Lines 1503-1515 (the `) : (` branch with `same ride · new meaning` and the closing
`</Pressable>`) unchanged. `tabNav.go('settings')` no longer appears on this button;
`tabNav` stays imported/used elsewhere in the file — do not remove it.

**f. Keyboard taps (decision 7).** Find the `ScrollView` that wraps the setup phase (the one
whose closing tag is at line 1517, directly above `{showAnim === 'fwd' && (`). If it has no
`keyboardShouldPersistTaps` prop, add `keyboardShouldPersistTaps="handled"`. If it already
has one with any value other than `"handled"`, stop and report.

Nothing else in the file changes: `pickSport` (252-261), the `SPORT` pill row, `onEnd`,
the naming card, the Alert at 496-499, `makeStyles`.

### 4. `app/tests/recordflow_suite.ts` — extend

Import (lines 7-9) gains `recordPressAction`. Append at end of file, same `assert`/`test`
style, names prefixed `recordFlow:`:

- `recordPressAction({ sportCount: 0, firstSportPrompt: false }) === 'open-first-sport'`
  — "fresh install: the first RECORD press opens the first-sport prompt, never navigates".
- `recordPressAction({ sportCount: 0, firstSportPrompt: true }) === 'add-first-sport'`
  — "press 2 saves the typed sport and arms".
- `recordPressAction({ sportCount: 1, firstSportPrompt: false }) === 'arm'` and
  `recordPressAction({ sportCount: 3, firstSportPrompt: false }) === 'arm'`.
- `recordPressAction({ sportCount: 1, firstSportPrompt: true }) === 'arm'` — "a stale
  prompt flag (sport added in SETTINGS meanwhile) is ignored once a sport exists"
  (decision 5).
- One integration line, no fs: `import { addSport, emptySports } from '../src/store/sports.ts'`
  (check it is not already imported; `sports_suite.ts` shows the import shape) and assert
  that `addSport(emptySports(), 'Bike', 1_000)` is not an array and has
  `activeSportId === sports[0].id` **and** that `recordPressAction({ sportCount: 1, firstSportPrompt: true }) === 'arm'`
  for that resulting count — i.e. after the save the very next press is a plain arm, which
  is why `onFirstSport` may call `onRecord()` directly.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count goes up by the new tests (5-6)
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
```

Baseline (2026-09-26): 676 tests, 673 pass, 0 fail, 3 skip. Record before/after counts. If
`tsc` blows the call budget on this mount, retry once with a longer timeout, then report —
do not substitute a syntax-only check without saying so. Also:

```
grep -n "GO TO SETTINGS\|noSportRef\|tabNav.go('settings')" app/src/ui/RecordScreen.tsx   # → no matches
grep -n "recordPressAction" app/src/ui/RecordScreen.tsx app/src/ui/recordFlow.ts app/tests/recordflow_suite.ts   # → 3 files
git status --short   # → exactly: M recordFlow.ts, M RecordScreen.tsx, M recordflow_suite.ts, ?? firstSportPrompt.tsx (plus nothing under settings.tsx / store/)
```

## On-device checklist (Nathan, after OTA — not the executor)

Needs a zero-sport phone: SETTINGS → Reset-to-virgin (sports.json lives under the storage
root, so the reset returns to zero sports — sportStore.ts header).

1. RECORD tab, zero sports: label reads `SET UP A SPORT FIRST — PRESS RECORD`; the button
   is the normal yellow ● RECORD with subtext `no sport yet`. No START / GOING TO blocks.
2. Press RECORD: nothing navigates. In the same spot: `YOUR FIRST SPORT`, an empty input
   with the keyboard up and the `e.g. Bike, Run, …` placeholder, `not now` under it. The
   button subtext now reads `with this sport`. No permission dialog yet.
3. Press RECORD with the field empty: `type a sport name first` appears under the input,
   nothing else happens. Start typing → the hint disappears.
4. Type `Bike`, press Done on the keyboard: keyboard drops, text stays, nothing else
   happens. Press RECORD **once**: the prompt is gone and the phone arms exactly as it does
   with a pre-existing sport (permission dialogs on a first install, launch animation, the
   armed screen). Cancel back to setup: the normal setup flow is there, `SPORT` pill row
   hidden (one sport), RECORD subtext `same ride · new meaning`.
5. SETTINGS → SPORTS: `Bike` is listed and active. Add `Run` there — works exactly as before
   (this brief changed nothing in SETTINGS). Back on RECORD, two pills if the toggle is on.
6. Reset-to-virgin again. Press RECORD, type something, press `not now`: back to the
   `SET UP A SPORT FIRST — PRESS RECORD` label, subtext `no sport yet`; pressing RECORD
   again opens an **empty** prompt.
7. Reset-to-virgin again. Press RECORD (prompt opens), go to SETTINGS, add `Walk` there,
   come back to RECORD: the prompt is gone, the normal setup flow shows (decision 5).
8. Keyboard-up tap: with the keyboard showing (step 2), tap RECORD directly — it must react
   on the first tap, not merely close the keyboard (decision 7). If it needs two taps,
   report it — that is the `keyboardShouldPersistTaps` line not landing.
9. Both themes: label, input border/text, placeholder and `not now` legible.

## Out of scope

- **Adding a 2nd, 3rd… sport, renaming, deleting, the active-sport pick in SETTINGS →
  SPORTS (`settings.tsx` `SportsSection`, `handleAdd` 385-399, the input 533-540, the
  `add sport` button 542-544) — UNCHANGED, by Nathan's explicit ruling.** The prompt is a
  second caller of the same `addSport`/`saveSports`; no store, schema or file change.
- Any onboarding screen, modal or first-run wizard. The prompt is one block inside the
  existing setup flow.
- The unreachable Alert at `RecordScreen.tsx` 496-499 (`'Add a sport in SETTINGS before
  recording.'`) — still unreachable, wording left alone.
- Showing the START / GOING TO / WHICH WAY flow between the two presses (decision 2).
- The `SPORT` pill row, `pickSport`, `afterSportSwitch`, the sport-pill SETTINGS toggle.
- iOS (no iOS build; `autoFocus`/`returnKeyType` are fine there anyway).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (three files edited, one small
UI file added, one suite extended; no new dependency, no `app.json`/`eas.json` change), so
it ships to the Preview APK over EAS Update via `scripts/publish-preview.cmd` — no new
numbered build, no reinstall. Visible **only** on a phone with zero sports (fresh install or
after Reset-to-virgin): RECORD asks for the sport's name in place and the second press
records with it. A phone that already has a sport sees no difference at all; SETTINGS is
untouched.

## Open questions / assumptions (logged, not blocking)

1. **Press 2 arms immediately** (decision 1/2) rather than dropping the rider into the
   setup flow to press RECORD a third time. Read from "on the go / right there and then".
   If Nathan would rather see START / GOING TO first, delete `await onRecord();` in
   `onFirstSport` and change the test name — the sport is still created and active.
2. **Press 1 is required to open the prompt** (Nathan: "asked when you press record").
   The zero-tap alternative — the input always visible in place of the C0 label, so the
   very first RECORD press already saves + arms — is one condition fewer
   (`firstSportPrompt` always true); the label copy would then need to say `type a sport`.
3. **Keyboard Done does not save + arm** (decision 7). If Done-then-RECORD feels like one
   tap too many on the phone, wiring `onSubmitEditing` in `firstSportPrompt.tsx` to a new
   `onSubmit` prop that calls `onFirstSport` is a two-line change — but it makes a keyboard
   key trigger the permission dialogs, which is why it is not the default here.
4. **Copy** — `YOUR FIRST SPORT`, `SET UP A SPORT FIRST — PRESS RECORD`, `no sport yet`,
   `with this sport`, `not now`, `type a sport name first` are the Plan tier's shortest
   guesses in the existing all-caps-label register; all six are single string literals.
5. **`keyboardShouldPersistTaps="handled"`** on the setup ScrollView also changes how taps
   land on the naming card and the pills while a keyboard is up (they now go through on the
   first tap). Expected to be an improvement, but it is a screen-wide side effect and is
   called out for that reason.
