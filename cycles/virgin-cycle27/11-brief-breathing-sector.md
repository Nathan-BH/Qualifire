# Brief 5 — Live ride: only `P` under the map; the current sector's strip slot breathes

Written by the Plan tier (Fable) 2026-10-08 ~02:00 UTC from `10-plan.md` §5 and digest 04 §2/§5; anchors re-read in the working tree (suite baseline `940 tests: 937 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md`. **Status: APPROVED (Nathan 2026-10-09 00:24). Q5.1/5.2 defaults (a) in force. Runs 5th, sequential, after the colour brief touched `chips.tsx:26` — re-anchor `chips.tsx` by content (`10-plan.md` §15).**

## 0. Rules
- STOP-ON-AMBIGUITY → `cycles/virgin-cycle27/12-brief-05-executor-report.md` `## STOPPED`.
- Nathan's words (2026-10-08 00:55): "we should just show position and have the current sector strip+label breath in a same way". Non-blocking Q5.1 answered (a): floor **0.55**, period **2.4 s** (both constants, tune on device); Q5.2 (a): the running notification keeps `· S2` (unchanged, untouched).
- **Rider-facing text: ZERO new strings; nothing removed from the allow-list either** — `liveView.tsx` and `chips.tsx` have no allow-list entries (verified: the `S${n}` labels are templates the scanner does not list). `git diff -- app/tests/ui-strings.allow.json` must be empty; if the `ui_strings` suite reports anything, STOP.
- Honour the OS reduce-motion setting (`AccessibilityInfo.isReduceMotionEnabled`, the pattern already in `launchAnimation.tsx:70-78`): no animation, slot at full opacity.
- `useNativeDriver: true` (opacity only). No new dependency (`Animated` is RN core). Never delete; no commit; no publish; strip-only TS; `GIT_OPTIONAL_LOCKS=0`.

## 1. Purpose
Today the context line under the live map reads `S2 · P3` (`liveView.tsx:308-315`: `vm.contextLabel` then `vm.livePos`), and the current strip slot has no cue at all (`chips.tsx:53-61` doc: "The current sector gets no cue"). After this brief: the context line shows only `P3` (or nothing); the current slot's label and bar breathe (opacity 1 → 0.55 → 1, 2.4 s, looped). The `contextLabel` field stays in `LiveViewModel` (REPLAY, DEMO and three tests read it) but is no longer rendered.

## 2. Verified anchors (2026-10-08 ~01:40 UTC)
- `app/src/ui/chips.tsx:8-12` imports: `import { useMemo } from 'react';` `import { StyleSheet, Text, View } from 'react-native';` … `:53-61` the StripSlot doc comment (ends `… does not affect styling. */`); `:62` `export function StripSlot(props: { tier: Tier; label: string; time?: string; current?: boolean }) {`; `:74-82` the return:
  ```tsx
    const line = tierLineColour(props.tier);
    const barColour = line ?? t.race.border;
    const labelColour = line ?? t.textDim;
    return (
      <View style={s.slot}>
        <Text style={[s.slotText, { color: labelColour }]}>{props.label}</Text>
        <View style={[s.slotBar, { backgroundColor: barColour }]} />
      </View>
    );
  ```
  `:86-88` styles `slot`, `slotBar`, `slotText`.
- `app/src/ui/liveView.tsx:32-33` `import { useEffect, useState } from 'react';` / `import { StyleSheet, Text, View } from 'react-native';` (do not change `:35` — `recordflow_suite.ts:573` pins `import { StripSlot, Tier } from './chips';`). `:96-98` `/** small context line: current sector label, e.g. 'S3' (never a benchmark) */ contextLabel: string;` `:194-199` `contextLabel` builder (keep). `:308-315`:
  ```tsx
        <Text style={[paneStyles.ctx, { color: t.textDim }]}>
          {vm.contextLabel || (vm.livePos ? '' : ' ')}
          {vm.livePos ? (
            <Text style={{ color: t.text }}>
              {(vm.contextLabel ? ' · ' : '') + vm.livePos}
            </Text>
          ) : null}
        </Text>
  ```
  `:325-329` the strip row passes `current={slot.current}`. `:338-349` `paneStyles` (`ctx` at `:340-346`).
- `app/src/ui/launchAnimation.tsx:70-78` the reduce-motion read pattern.
- Tests reading `contextLabel`: `tests/replay_suite.ts:288, :296, :300`; `tests/recordflow_suite.ts:532` (slices the source up to `'const contextLabel ='`); `:565-574` (chips/liveView must not read settings). All must pass unedited.

## 3. Edits

### 3.1 `src/ui/chips.tsx` — the breathing slot
- `:8` → `import { useEffect, useMemo, useRef, useState } from 'react';`
- `:9` → `import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';`
- After `STRIP_BAR_HEIGHT` (`:16`) add:
```ts
// virgin-cycle27 brief 05 (Nathan 2026-10-08): the CURRENT sector's slot breathes —
// a slow opacity cycle, never below BREATHE_FLOOR so the label stays legible in
// daylight; off (full opacity, still) when the OS reduce-motion setting is on.
export const BREATHE_FLOOR = 0.55;
export const BREATHE_PERIOD_MS = 2400;
```
- Replace the doc paragraph `:53-61` sentence "The current sector gets no cue at all (identical to an unreached one): the context line above the clock already names it, so `current` is accepted for the caller's sake but does not affect styling." with: "virgin-cycle27 05: the current sector's label and bar BREATHE (opacity 1 → BREATHE_FLOOR → 1 over BREATHE_PERIOD_MS, looped, native driver) — the only cue that a sector is live; the context line no longer names it. Reduced motion: no animation, full opacity."
- Inside `StripSlot`, after `const s = useMemo(…)` add:
```tsx
  const breathe = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (live) setReduceMotion(v); })
      .catch(() => { /* default: animate */ });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!props.current || reduceMotion) {
      breathe.stopAnimation();
      breathe.setValue(1);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: BREATHE_FLOOR, duration: BREATHE_PERIOD_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: BREATHE_PERIOD_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); breathe.setValue(1); };
  }, [props.current, reduceMotion, breathe]);
```
- The return becomes:
```tsx
  return (
    <Animated.View style={[s.slot, { opacity: breathe }]}>
      <Text style={[s.slotText, { color: labelColour }]}>{props.label}</Text>
      <View style={[s.slotBar, { backgroundColor: barColour }]} />
    </Animated.View>
  );
```
Hook order: the two `useEffect`s sit after the existing `useTheme`/`useMemo` and before the return; no conditional hooks.

### 3.2 `src/ui/liveView.tsx` — the context line shows only P
- `:96-98` doc → `/** current sector label, e.g. 'S3' — kept in the model for REPLAY/DEMO/tests; NOT rendered since virgin-cycle27 05 (the strip's current slot breathes instead) */`
- `:308-315` → 
```tsx
      {/* virgin-cycle27 05 (Nathan 2026-10-08): position only — the current sector is shown by its
          breathing strip slot, never as text here. The blank keeps the row's height when there is no P. */}
      <Text style={[paneStyles.ctx, { color: t.text }]}>
        {vm.livePos ?? ' '}
      </Text>
```
(`vm.livePos` is `string | null | undefined`; `?? ' '` covers both.) `paneStyles.ctx` unchanged.
- Nothing else in `liveView.tsx`: `viewModelFromEngine`, `contextLabel` builder, flashes, strip mapping untouched.

### 3.3 Nothing else
No change to `RecordScreen.tsx`, `DemoScreen.tsx`, `ReplayScreen.tsx`, the notification (`rideNotificationPolicy.ts` keeps `· S2`), `engine.ts`.

## 4. Tests — `tests/recordflow_suite.ts`, append at the end
```ts
test('virgin-cycle27 05: the live context line renders only P; the current strip slot breathes (Animated.loop, floor 0.55, reduce-motion aware)', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  const lv = read('src', 'ui', 'liveView.tsx');
  assert(lv.includes("{vm.livePos ?? ' '}"), 'context line = P only');
  assert(!lv.includes('{vm.contextLabel') && !lv.includes("(vm.contextLabel ? ' · ' : '')"), 'contextLabel is no longer rendered');
  assert(lv.includes('const contextLabel =') && lv.includes('contextLabel: string;'), 'the model field stays (REPLAY/DEMO/tests read it)');
  const ch = read('src', 'ui', 'chips.tsx');
  assert(ch.includes('export const BREATHE_FLOOR = 0.55;') && ch.includes('export const BREATHE_PERIOD_MS = 2400;'), 'tunables');
  assert(ch.includes('Animated.loop(Animated.sequence([') && ch.includes('useNativeDriver: true') && ch.includes('<Animated.View style={[s.slot, { opacity: breathe }]}>'), 'the slot breathes via native-driver opacity');
  assert(ch.includes('AccessibilityInfo.isReduceMotionEnabled()') && ch.includes('if (!props.current || reduceMotion) {'), 'only the current slot, and not under reduce-motion');
  assert(ch.includes('return () => { loop.stop(); breathe.setValue(1); };'), 'loop stopped on cleanup');
});
```

## 5. Acceptance
1. Baseline 940/937/0/3 → after: **941 tests, 0 FAIL**; `replay_suite.ts:288-300` and `recordflow_suite.ts:532, :565-574` pass unedited.
2. `tsc --noEmit` exit 0 (`12-brief-05-tsc.log`).
3. `git diff --stat`: `src/ui/chips.tsx`, `src/ui/liveView.tsx`, `tests/recordflow_suite.ts`. Allow-list diff empty.
4. `grep -n "settings\|useSettings\|sectorColours" src/ui/chips.tsx src/ui/liveView.tsx` → no hits (the cycle22 pin).

## 6. What this changes on Nathan's phone (JS-only, OTA)
During a ride with self dots on: the line under the map reads `P3` only; the current sector's `S2` label and bar pulse softly (1 → 55 % → 1 every 2.4 s). Self dots off: the line is blank; the pulse still marks the current sector. DEMO and REPLAY share the pane, so they breathe too. The running notification still says `12:34 · S2`. NOT changed: flashes, clock, tier colours, the strip's done/pending slots. Cannot be rendered headless: the inspector reads the hook code; Nathan judges the rhythm and the floor on the bike.

## 7. Rollback
Restore `chips.tsx:8-9`, drop the two constants and the two effects, restore the plain `<View style={s.slot}>`; restore `liveView.tsx:308-315`; remove the test.

## 8. Report
`12-brief-05-executor-report.md`: files, counts, tsc, allow-list diff (empty), any STOP. OPEN-ITEMS line: "Breathing current sector (cycle27 brief 05) — tune BREATHE_FLOOR / BREATHE_PERIOD_MS in chips.tsx on the bike in daylight; check reduce-motion phones show a still slot."
