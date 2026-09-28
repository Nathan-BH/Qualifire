# 05 — GPS-off warning lives in the yellow button, briefly, then fades

**Source: Nathan, 2026-09-28.** His words: "when you try to press record with location
turned off, the warning message is show on top, which you cannot even see because you are
already scrolled down to press record in the first place." — "shorten the message to only
'Location (GPS) is turned off' and instead of adding it above put instead of the same ride -
new meaning text in the yellow button. But only briefly, show the message for like 2 seconds
then fade out and show the original text again, until the person tries to press record again
without location; then gps message again. (what i mean is just so it does not stay there,
but that it is a popup message)?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 05 of
`virgin-cycle16`. **Independent of briefs 01–04** (the free-ride retirement): no edited
region overlaps theirs, so this can land before, between or after them. **This brief
touches exactly one file: `app/src/ui/RecordScreen.tsx`.**

**Line numbers below are against HEAD `2c21265` with none of 01–04 applied.** Brief 01
deletes lines above and below every region this brief edits, so if 01 (or 02–04) has
landed first, expect every anchor to sit a few lines off (never more than ~40). The
**quoted content** is the anchor; the line number is a hint. Stop only when the quoted
content itself is not found or reads differently.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. If a quoted
  block is not in the file, or a name/signature/style key differs from what is quoted,
  **stop and report the mismatch verbatim** (file, line, what you expected, what you found).
  Never guess, never patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` (repo root) is the bin (`mv`, never
  `rm`), and **never call `device_request_delete_permission`**, for any reason.
- No new dependency. `Animated` comes from `react-native`, already a dependency and already
  used by `app/src/ui/launchAnimation.tsx`.
- Do not touch `app/src/location/index.ts` (the `'services-off'` outcome and
  `ensurePermissions` stay exactly as they are), `app/src/ui/launchAnimation.tsx`,
  `app/src/ui/theme.ts`, any test file, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief in this folder, or anything under `cycles/virgin-cycle15/`.
- **Do not touch the `'denied'` or `'foreground-only'` banners** (Current state, the
  `problemStates` fragment). Only the `'services-off'` branch of that fragment goes.
- **No test is edited or added by this brief.** The change is render + a timer + an
  `Animated.Value`, none of which the node test runner exercises (`tests/run.ts` runs pure
  modules only; `RecordScreen.tsx` is not imported by any suite — `grep -rn RecordScreen
  app/tests` → no hits, check it and report if that has changed).

## Goal

Pressing RECORD (setup) or START (armed) with the phone's location toggle off no longer
adds a banner at the top of the screen. Instead the yellow button's own sub-label — the
text under "● RECORD" / "START" — is replaced by **`Location (GPS) is turned off`** for
about two seconds, then fades out (opacity → 0), and the normal caption (`same ride · new
meaning` / `no sport yet` / `with this sport` / `the clock runs from here`) reappears.
Every further press with GPS still off restarts the flash from full opacity. Nothing
persists: once the fade ends the button is exactly as before. The `'denied'` and
`'foreground-only'` banners (permission problems, not a toggle) are untouched.

## Current state (verified 2026-09-28 against the tree)

**Why Nathan can't see the banner:** the setup phase is one `ScrollView` (line 1439,
`contentContainerStyle={styles.content}`); `{problemStates}` is its second child (line
1449, right after the theme pill) and the RECORD `Pressable` is its last (line 1622). With
a filled catalog the form is taller than the screen, so RECORD is pressed with the top of
the scroll — and the banner — off-screen.

**Three render sites share the fragment.** `{problemStates}` is rendered at line 1163
(armed screen, a non-scrolling `styles.raceColumn` `View`, directly under the trackLine),
line 1303 (running) and line 1449 (setup). The armed screen's START button (line 1178)
is the only other place `'services-off'` can be produced (by `onStart`), and there the
banner is visible today (no scroll) — this brief still moves it into the button there
too, for one behaviour (Decisions 2).

### `app/src/ui/RecordScreen.tsx`

- Line 17: `import { useCallback, useEffect, useMemo, useRef, useState } from 'react';`
- Line 18: `import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
  (no `Animated` anywhere in this file today — `grep -n Animated app/src/ui/RecordScreen.tsx`
  → no hits).
- Lines 88-91: the `PIN_MS` doc comment and `const PIN_MS = 20000;` — the file's existing
  "hold a transient state for N ms" constant. Left alone; a new constant pair goes right
  after it.
- Line 176: `const [problem, setProblem] = useState<PermissionOutcome | null>(null);`
  (`PermissionOutcome` = `'granted' | 'foreground-only' | 'denied' | 'services-off'`,
  `location/index.ts:276-280`). `problem` is read nowhere except the `problemStates`
  fragment (`grep -n "problem\b" RecordScreen.tsx` → 176, 479, 482, 525, 528, 1121,
  1127, 1137 plus the line-3 header comment and a line-1670 style comment).
- **`onRecord`, line 467** `const onRecord = useCallback(async () => {` … deps `}, []);` at
  line 492. Lines 477-482:

  ```tsx
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return; // stay in setup
      }
      setProblem(outcome === 'foreground-only' ? 'foreground-only' : null);
  ```

  (`setBusy(true)` at 473 before the `try`, `setBusy(false)` in the `finally` at 490.)
- **`onStart`, line 512** `const onStart = useCallback(async () => {` … deps `}, []);` at
  line 570. Lines 523-528:

  ```tsx
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return;
      }
      setProblem(outcome === 'foreground-only' ? 'foreground-only' : null);
  ```

- **The fragment, lines 1117-1149** — the part this brief edits is 1119-1126:

  ```tsx
    const problemStates = (
      <>
        {problem === 'services-off' && (
          <Text style={styles.warn}>
            Location (GPS) is turned off on this phone. Enable it in quick settings, then press
            Start again.
          </Text>
        )}
        {problem === 'denied' && (
  ```

  (1127 `{problem === 'denied' && (` through 1148 `)}` and 1149 `</>` stay.)
- **START button (armed), lines 1178-1185:**

  ```tsx
          <Pressable
            style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
            disabled={busy}
            onPress={onStart}
          >
            <Text style={[styles.bigBtnText, styles.startText]}>START</Text>
            <Text style={[styles.bigBtnSub, styles.startSub]}>the clock runs from here</Text>
          </Pressable>
  ```

- **RECORD button (setup), lines 1622-1649** (comment block 1614-1621 above it stays):

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
          ) : (
            <>
              {/* Record-dot glyph (mockup: red slab + white dot; D-013 "NO RED
                  ANYWHERE" forbids the red, so this ships as a charcoal dot on the
                  existing accent-yellow slab — t.onAccent inherited from the
                  parent Text, same colour the RECORD label itself uses. */}
              <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
              <Text style={[styles.bigBtnSub, styles.startSub]}>
                same ride · new meaning
              </Text>
            </>
          )}
        </Pressable>
  ```

- Styles (inside `makeStyles`, line 1664 `const makeStyles = (t: PaddockTheme) => StyleSheet.create({`):
  - 1789 `warn: { color: colors.amber, fontSize: 14, textAlign: 'center' },` — stays (used by
    the two remaining banners).
  - 1799 `bigBtn: {` … `height: 150,` …
  - 1809 `startYellow: { backgroundColor: t.accent, borderColor: t.accent },`
  - 1843 `bigBtnSub: { color: t.textDim, fontSize: 12, letterSpacing: 1 },`
  - 1844 `startSub: { color: t.onAccent, opacity: 0.75 },` — note the static 0.75 opacity;
    the design below deliberately does not fight it (Decisions 5).
- Existing transient pattern, lines 921-933: `const [pinned, setPinned] = useState<'way' |
  'gps' | null>(null);` with two `useEffect` + `setTimeout(…, PIN_MS)` + `clearTimeout`
  cleanups. That is an effect-driven pin (it reacts to state); the flash below is
  imperative (it reacts to a press), so it uses a callback + a timer ref instead, same
  cleanup discipline. Not edited.
- Precedent for the fade: `launchAnimation.tsx:48` `import { AccessibilityInfo, Animated,
  Easing, StyleSheet, View } from 'react-native';`, `:68` `const fade = useRef(new
  Animated.Value(1)).current;`, `:84-88` `Animated.timing(fade, { … useNativeDriver: true, …
  })`. Read-only reference.

## Decisions (pre-resolved — do not re-open)

1. **Text is exactly `Location (GPS) is turned off`** — no trailing period, no "on this
   phone", no instructions. One `const` at module scope so both buttons and the grep in
   Verification see one string.
2. **Both yellow buttons get the flash: RECORD (setup) and START (armed).** The
   `'services-off'` branch is removed from `problemStates` outright (it is one shared
   fragment rendered in three phases); if only RECORD got the flash, the armed screen would
   lose its GPS-off message altogether. Nathan named RECORD; START is the same yellow button
   one phase later and the same `'services-off'` outcome, so it gets the same treatment
   (logged as assumption 1).
3. **`'denied'` and `'foreground-only'` stay as persistent banners, untouched.** Nathan did
   not mention them, and they are permission problems with an "Open app settings" action
   the rider has to act on, not a toggle flipped by accident. Not one character of those
   two branches or of `styles.warn`/`warnBox`/`linkBtn` changes.
4. **`setProblem(outcome)` on `'services-off'` stays.** `problem === 'services-off'` simply
   renders nothing after this brief. Keeping it means the state still reports the truth
   and the diff at the two call sites is one added line each. (Dropping it would leave a
   previous `'foreground-only'` banner on screen while GPS is off — arguably fine, but a
   behaviour change nobody asked for.)
5. **Timing and look:** hold **2000 ms** at full opacity, then a **400 ms** linear
   `Animated.timing` to opacity 0 (`useNativeDriver: true`), then the caption is back
   instantly at its normal look. No fade-in, no spring, no bounce — Nathan's "show … then
   fade out and show the original text again" verbatim. While the message shows, the
   animated opacity **replaces** `startSub`'s static `opacity: 0.75`, so the message sits at
   1.0 — slightly brighter than the caption it replaces, which is the point of an alert.
   The caption, when it returns, keeps its 0.75 (the animated style is only applied while
   flashing).
6. **Re-trigger semantics:** a new press while a flash is in progress cancels the pending
   hold timer, stops any running fade, snaps opacity back to 1 and restarts the 2 s hold.
   The `start()` callback checks `finished` so a stopped fade never clears the state that
   a newer flash owns.
7. **The flash is state on `RecordScreen`, not a new component.** One `useState<boolean>`,
   one `useRef<Animated.Value>`, one timer ref, one `useCallback`, one unmount cleanup
   effect — placed just above `onRecord` so both `onRecord` and `onStart` (both `[]`-deps
   callbacks) capture a stable function. Nothing new in `store/`, `live/` or `location/`.
8. **Both branches of the RECORD button (`noSport` and not) go through the same sub-label
   helper.** `onFirstSport` awaits `saveSports` and then calls `onRecord()`, so a flash can
   be triggered from the press that created sport #1; by the time `ensurePermissions()`
   resolves the re-render has flipped `noSport`, but routing both branches through one
   helper makes the flash correct whichever branch is on screen.

## Files to touch

### 1. `app/src/ui/RecordScreen.tsx`

**Edit A — import `Animated`.** Line 18:

```tsx
import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
```

→

```tsx
import { Alert, Animated, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
```

(`Text` stays — the RECORD/START labels and everything else still use it.)

**Edit B — constants.** Directly after line 91 `const PIN_MS = 20000;` (and its blank line
if there is one; keep one blank line on each side), add:

```tsx
/** virgin-cycle16 05 (Nathan 2026-09-28): pressing RECORD/START with the
 * phone's location toggle off no longer adds a banner at the top of the
 * screen (off-screen once the form is scrolled to the button). The yellow
 * button's own sub-label shows this text instead, holds GPS_FLASH_HOLD_MS,
 * fades out over GPS_FLASH_FADE_MS and the normal caption returns. Every
 * further press with GPS still off restarts the flash. */
const GPS_OFF_MSG = 'Location (GPS) is turned off';
const GPS_FLASH_HOLD_MS = 2000;
const GPS_FLASH_FADE_MS = 400;
```

**Edit C — the flash state + helper.** Insert directly above line 467
`const onRecord = useCallback(async () => {` (after the `}, [phase]);` that closes the
hardware-back effect at 465 and its blank line):

```tsx
  // virgin-cycle16 05: transient GPS-off message in the yellow button's
  // sub-label (RECORD in setup, START when armed). Imperative rather than an
  // effect on `problem` because Nathan wants it to re-fire on EVERY press
  // while GPS stays off, and `problem` would not change between presses.
  const [gpsFlash, setGpsFlash] = useState(false);
  const gpsFlashOpacity = useRef(new Animated.Value(1)).current;
  const gpsFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashGpsOff = useCallback(() => {
    if (gpsFlashTimer.current !== null) clearTimeout(gpsFlashTimer.current);
    gpsFlashOpacity.stopAnimation();
    gpsFlashOpacity.setValue(1);
    setGpsFlash(true);
    gpsFlashTimer.current = setTimeout(() => {
      gpsFlashTimer.current = null;
      Animated.timing(gpsFlashOpacity, {
        toValue: 0,
        duration: GPS_FLASH_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return; // a newer press stopped this fade — it owns the state now
        setGpsFlash(false);
        gpsFlashOpacity.setValue(1);
      });
    }, GPS_FLASH_HOLD_MS);
  }, [gpsFlashOpacity]);
  useEffect(() => () => {
    if (gpsFlashTimer.current !== null) clearTimeout(gpsFlashTimer.current);
  }, []);
  // Sub-label of either yellow button: the GPS-off message while flashing
  // (animated opacity replaces startSub's static 0.75), the caption otherwise.
  const yellowSub = (caption: string) => (
    <Animated.Text style={[styles.bigBtnSub, styles.startSub, gpsFlash ? { opacity: gpsFlashOpacity } : null]}>
      {gpsFlash ? GPS_OFF_MSG : caption}
    </Animated.Text>
  );
```

`styles` is already in scope here: line 150 `const styles = useMemo(() => makeStyles(t), [t]);`
(verified). If that declaration is not above the insertion point, stop and report.

**Edit D — `onRecord`, lines 477-481.**

```tsx
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return; // stay in setup
      }
```

→

```tsx
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        if (outcome === 'services-off') flashGpsOff(); // virgin-cycle16 05: message in the button, not a banner
        return; // stay in setup
      }
```

The `useCallback` deps at 492 stay `[]` — `flashGpsOff` is itself `[gpsFlashOpacity]`-stable
(a `useRef` value), so the closure never goes stale. Do not add it to the deps.

**Edit E — `onStart`, lines 523-526.**

```tsx
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return;
      }
```

→

```tsx
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        if (outcome === 'services-off') flashGpsOff(); // virgin-cycle16 05
        return;
      }
```

Deps at 570 stay `[]`, same reason.

**Edit F — `problemStates`, lines 1121-1126.** Delete the six lines

```tsx
      {problem === 'services-off' && (
        <Text style={styles.warn}>
          Location (GPS) is turned off on this phone. Enable it in quick settings, then press
          Start again.
        </Text>
      )}
```

so that `<>` (1120) is directly followed by `{problem === 'denied' && (`. Replace the
two-line comment above `const problemStates` (1117-1118, `// Shared between both branches
below — …`) with:

```tsx
  // Shared between the three phase branches below — unchanged position/behaviour.
  // 'services-off' is deliberately NOT here: it flashes in the yellow button
  // (virgin-cycle16 05, flashGpsOff above) instead of a top-of-screen banner.
```

**Edit G — START button, line 1184.**

```tsx
          <Text style={[styles.bigBtnSub, styles.startSub]}>the clock runs from here</Text>
```

→

```tsx
          {yellowSub('the clock runs from here')}
```

**Edit H — RECORD button, both branches.** Line 1636:

```tsx
            <Text style={[styles.bigBtnSub, styles.startSub]}>{firstSportPrompt ? 'with this sport' : 'no sport yet'}</Text>
```

→

```tsx
            {yellowSub(firstSportPrompt ? 'with this sport' : 'no sport yet')}
```

and lines 1645-1647:

```tsx
            <Text style={[styles.bigBtnSub, styles.startSub]}>
              same ride · new meaning
            </Text>
```

→

```tsx
            {yellowSub('same ride · new meaning')}
```

The `{'●'} RECORD` `Text` lines, the record-dot comment and the `Pressable`'s `onPress`
are untouched.

No style entry is added or removed. That is the whole brief: one file.

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL (nothing here is
under test; the run is the regression guard). `./node_modules/.bin/tsc --noEmit` → exit 0.
Two likely type complaints, if any, and what to do:

- If `tsc` rejects `{ opacity: gpsFlashOpacity }` inside the `Animated.Text` style array
  (e.g. "Type 'Animated.Value' is not assignable to type 'AnimatedNode<number>'" or a
  `null` in the array), report the exact error verbatim and stop — do not cast.
- If `tsc` flags `Text` as unused: it is still used (RECORD/START labels, banners) —
  report, don't remove.

Then, in `app/src/ui/RecordScreen.tsx`:

- `grep -n "turned off on this phone" app/src/ui/RecordScreen.tsx` → **no hits**.
- `grep -n "problem === 'services-off'" app/src/ui/RecordScreen.tsx` → **no hits**.
- `grep -n "Location (GPS) is turned off" app/src/ui/RecordScreen.tsx` → exactly **one**
  hit (the `GPS_OFF_MSG` constant).
- `grep -n "flashGpsOff" app/src/ui/RecordScreen.tsx` → the definition, the two call sites
  (`onRecord`, `onStart`) and the `problemStates` comment — four hits.
- `grep -n "yellowSub" app/src/ui/RecordScreen.tsx` → the helper plus three call sites
  (START, RECORD noSport, RECORD normal) — four hits.
- `grep -n "styles.bigBtnSub, styles.startSub" app/src/ui/RecordScreen.tsx` → exactly
  **one** hit (inside `yellowSub`).
- `grep -n "problem === 'denied'\|problem === 'foreground-only'" app/src/ui/RecordScreen.tsx`
  → both still present, one hit each.
- `grep -rn "RecordScreen" app/tests` → no hits (confirms no suite renders it).
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly one file changed.

## On-device checklist (Nathan, after publish)

1. Turn Location off in quick settings. RECORD tab, scroll down, press **● RECORD**. The
   sub-text under RECORD reads **Location (GPS) is turned off** for ~2 s, fades out over
   under half a second, and **same ride · new meaning** is back. No banner at the top of
   the screen (scroll up to confirm nothing is there). You stay on the setup form.
2. Press RECORD again, GPS still off: the message shows again, same timing. Press it
   three times fast: the message just stays up and restarts its 2 s from the last press
   — no flicker, no stuck half-faded text.
3. Turn Location on, press RECORD: arms normally (launch mark, armed screen). On the
   armed screen, turn Location off again, press **START**: the sub-text under START reads
   the GPS message for ~2 s, fades, and **the clock runs from here** is back. Ride does
   not start.
4. Settings → Reset to virgin → RECORD with GPS off: sub-text reads the GPS message where
   "no sport yet" was, then "no sport yet" is back. (Press 1 with zero sports does not
   check permissions — expect the message only from the press that arms.)
5. Deny location permission entirely (app settings) and press RECORD: the **denied**
   banner (amber text + "Open app settings") still appears at the top exactly as before.
   Same for the background-location banner if "Allow all the time" is not granted.
6. Night and day themes: the message is readable on the yellow slab in both (it is the
   same `onAccent` colour as the caption, just at full opacity).

## Out of scope

- Any change to the `'denied'` / `'foreground-only'` banners, their placement, or
  `styles.warn`.
- Prompting the OS location-services dialog or deep-linking to quick settings.
- Moving the two permission banners nearer the button, or making the setup form not
  scroll.
- A fade-in, a haptic, or a sound on the message.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships to the Preview APK over
EAS Update via `scripts/publish-preview.cmd` — no new numbered build. Visible: with the
phone's location toggle off, pressing RECORD (or START on the armed screen) briefly writes
"Location (GPS) is turned off" into the yellow button in place of its caption, fades it
out after ~2 s, and never adds a banner at the top of the scroll. Permission-denied and
background-permission banners look and behave exactly as today.

## Open questions / assumptions (logged, not blocking)

1. **START on the armed screen gets the same flash** (Decision 2). Nathan only described
   RECORD; the armed screen's banner was actually visible (no scroll there), so this is a
   consistency call, not a fix. If he prefers the persistent banner on the armed screen,
   it is a two-line revert: keep the `'services-off'` branch in `problemStates` and drop
   the `flashGpsOff()` call in `onStart` — but then the armed screen would show a banner
   AND nothing in the button, which is the split behaviour this brief avoids.
2. **2000 ms hold / 400 ms fade** are the "like 2 seconds" reading; both are single
   constants at the top of the file for on-device tuning.
3. **The message is at opacity 1.0 vs the caption's 0.75** (Decision 5). If Nathan finds
   it too bright, set the `Animated.Value` initial/reset value to `0.75` in `flashGpsOff`
   and in the `useRef` — two literals.
4. **`problem` still becomes `'services-off'`** (Decision 4) even though nothing renders
   it; the `PermissionOutcome` union is untouched. A later tidy could drop the assignment,
   but it is not wrong.
5. **Line drift from briefs 01–04.** Anchors are content-quoted; all edited regions are
   disjoint from 01's edits (01 touches imports 41/56/78, state at 298, the START branch
   537-562, STOP 597-599, resets 646/832, the free-ride block 1060-1111, map props
   1324-1381, pills 1567-1570 and two style keys — none of which this brief quotes).
