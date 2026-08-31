# BRIEF — Retroactive way creation, PART 2 of 2: the STOP-step naming UI

**Written 2026-08-31 (Plan tier, fable) against `virgin` HEAD. PREREQUISITE:
`briefs/BRIEF-retroactive-way-creation.md` (Part 1) has landed and its verification
passed — this brief imports `store/wayCreation.ts`, which Part 1 creates. Line
numbers below are for RecordScreen.tsx as of the evening of 2026-08-31 and assume
Part 1 touched neither `RecordScreen.tsx` nor `wayNamingCard.tsx` (it must not
have). The full edit set below was dry-run applied together with Part 1's,
verified (283 tests / 280 pass / 0 fail / 3 skip; `tsc --noEmit` exit 0), and
restored.**

## Stop-on-ambiguity

**If any ambiguity or surprise arises — an anchor that doesn't match, a hunk that
doesn't apply, output that differs from the predictions — STOP and report back.
Never guess.**

## Mandate

At the STOP step, when the just-finished ride never locked a route and its
endpoints match no existing way, show a naming card: name the start and end
(COLD-START §3 step 5 — "the only true onboarding step"), create the
landmarks/way/route through `saveUserCatalog()`, and mark the ride as the route's
reference. Skipping loses nothing.

## The flow (design already decided — do not re-decide)

- `onEnd` already saves the ride (`rememberRide`/`rememberFreeRide`/raw JSONL)
  BEFORE any of this; the naming card is a pure addition after the save.
- After `stopTracking()` succeeds, when the session was real AND
  `finalState.track === null` (the ride never locked — free rides always, route
  rides that matched nothing), read the ride's own raw JSONL
  (`rides/<rideId>.jsonl`, the pattern `RidesScreen.tsx` already uses via
  `createExpoFsAdapter`) and call Part 1's `draftWayCreation()` against
  `currentCatalog()`. Any failure → null → behave exactly as today.
- With a draft: the phase still flips to `'ending'` as today, but the reversed
  launch animation is HELD — the naming card renders in the `'ending'` screen
  instead. Both card exits (save succeeded / skip) clear the card and start the
  reversed animation, which lands on Result exactly as before. Hardware back is
  already swallowed during `'ending'` (RecordScreen's BackHandler), so the card
  cannot be accidentally dismissed.
- SKIP: nothing is written; the ride stays a plain recorded ride; the next
  unmatched ride offers again. This is the documented decline path.
- SAVE: `buildWayCreationCatalog(userCatalog(), draft, names)` →
  `await saveUserCatalog(built)`. A non-empty error return means the MERGED
  catalog failed validation and nothing changed: show the errors verbatim in an
  `Alert` and KEEP the card up (skip stays available). Success → clear card, run
  the animation.
- An endpoint that matched an EXISTING landmark shows its label as fixed text,
  not an input. A loop shows one input. Save is disabled until every required
  name is non-empty (trimmed).
- What the rider gets immediately: the new way + route appear in ROUTES (blank
  map — the refLineId is deliberately unresolvable until the next work package
  builds a reference line from this ride's track; `routeMapView` returns null
  for an unknown asset, verified). The route is not yet live-raceable — also
  next package. Two cosmetic known-inaccuracies are accepted and OUT of scope:
  RoutesScreen's hardcoded "4 sectors · START ~160 m in" line, and DEMO's
  bundled Morning ride (both belong to OPEN-ITEMS item 4, the empty-state pass).

## Edit 1 — NEW FILE `app/src/ui/wayNamingCard.tsx`

Create with exactly this content:

```tsx
/**
 * STOP-step naming card (OPEN-ITEMS item 2; COLD-START §3 step 5 — "the only
 * true onboarding step... this is where landmarks are born on a cold start").
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase when the just-finished ride never
 * locked a route and store/wayCreation.ts drafted new endpoint(s). Dumb UI:
 * it owns only the two text inputs; RecordScreen owns the draft, the build
 * and the saveUserCatalog() call. An endpoint that matched an EXISTING
 * landmark renders as fixed text, not an input. SKIP is always available and
 * loses nothing — the ride itself was already saved before this card exists.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface WayNamingCardProps {
  /** label of the matched existing start landmark, or null => name input */
  startExistingLabel: string | null;
  /** label of the matched existing end landmark, or null => name input */
  endExistingLabel: string | null;
  /** start === end: one place, one input */
  loop: boolean;
  busy: boolean;
  onSave: (names: { start: string; end: string }) => void;
  onSkip: () => void;
}

export function WayNamingCard(props: WayNamingCardProps) {
  const { t } = useTheme();
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const needStart = props.startExistingLabel === null;
  const needEnd = props.endExistingLabel === null && !props.loop;
  const complete = (!needStart || startName.trim().length > 0) && (!needEnd || endName.trim().length > 0);

  const inputStyle = [st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }];
  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>New way — name where you rode</Text>
      <Text style={[st.sub, { color: t.textDim }]}>
        {props.loop
          ? 'This ride looped from and back to one new place.'
          : 'This ride does not match any way you have. Name its start and end to make it a real route — this ride becomes its reference.'}
      </Text>

      <Text style={[st.label, { color: t.textDim }]}>STARTED AT</Text>
      {needStart ? (
        <TextInput
          style={inputStyle}
          value={startName}
          onChangeText={setStartName}
          placeholder="e.g. Home"
          placeholderTextColor={t.textDim}
          editable={!props.busy}
          maxLength={40}
        />
      ) : (
        <Text style={[st.fixed, { color: t.text }]}>{props.startExistingLabel}</Text>
      )}

      {!props.loop && (
        <>
          <Text style={[st.label, { color: t.textDim }]}>ENDED AT</Text>
          {needEnd ? (
            <TextInput
              style={inputStyle}
              value={endName}
              onChangeText={setEndName}
              placeholder="e.g. Work"
              placeholderTextColor={t.textDim}
              editable={!props.busy}
              maxLength={40}
            />
          ) : (
            <Text style={[st.fixed, { color: t.text }]}>{props.endExistingLabel}</Text>
          )}
        </>
      )}

      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, (!complete || props.busy) && st.dim]}
        disabled={!complete || props.busy}
        onPress={() => props.onSave({ start: startName, end: endName })}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>CREATE WAY</Text>
      </Pressable>
      <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
        <Text style={[st.skipText, { color: t.textDim }]}>skip — keep it as a plain ride</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginBottom: 6 },
  label: { fontSize: 11, letterSpacing: 2, marginTop: 6 },
  fixed: { fontSize: 15, paddingVertical: 6 },
  input: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  saveBtn: { marginTop: 14, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
```

## Edit 2 — `app/src/ui/RecordScreen.tsx`, imports

Anchor A: line **48** is `import { currentCatalog } from '../store/catalogStore';`.
Replace that line with:

```typescript
import { currentCatalog, saveUserCatalog, userCatalog } from '../store/catalogStore';
```

Anchor B: line **45** is `import { rememberFreeRide } from '../store/freeRides';`.
Insert directly after it:

```typescript
import { buildWayCreationCatalog, draftWayCreation, type WayCreationDraft } from '../store/wayCreation';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { decodeRideFile } from '../storage/jsonl';
import { WayNamingCard } from './wayNamingCard';
```

(This file's imports carry no `.ts` extensions — keep that style.)

## Edit 3 — `app/src/ui/RecordScreen.tsx`, module-scope helpers

Anchor: `const PIN_MS = 20000;` at line **58** (pre-edit numbering). Insert directly
after that line:

```typescript

/** OPEN-ITEMS item 2: does the just-finished unlocked ride warrant the STOP
 * naming offer, and as what? Reads the ride's raw JSONL (the only record of
 * where it went) and drafts against the runtime catalog. Null on ANY failure
 * — the stop flow must never break on a naming convenience. */
async function namingDraftFor(rideId: string, startedAtMs: number): Promise<WayCreationDraft | null> {
  try {
    const fs = createExpoFsAdapter();
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    const decoded = decodeRideFile(text);
    return draftWayCreation(currentCatalog(), {
      rideId,
      startedAtMs,
      fixes: decoded.fixes.map((f) => ({ lat: f.lat, lon: f.lon })),
    });
  } catch {
    return null;
  }
}

/** The matched existing landmark's label for the naming card, or null when
 * the endpoint is a new place (the card shows an input instead). */
function existingLandmarkLabel(r: WayCreationDraft['start']): string | null {
  if (r.kind !== 'existing') return null;
  return currentCatalog().landmarks.find((l) => l.id === r.landmarkId)?.label ?? r.landmarkId;
}
```

## Edit 4 — `app/src/ui/RecordScreen.tsx`, state

Anchor: line **138** (pre-edit numbering) is
`  const [lastSummary, setLastSummary] = useState<RideSummary | null>(null);`.
Insert directly after it:

```typescript
  // OPEN-ITEMS item 2: the STOP-step naming offer for an unlocked ride whose
  // endpoints match no existing way (null = no offer). While non-null the
  // 'ending' phase shows the naming card and holds the reversed launch mark.
  const [naming, setNaming] = useState<WayCreationDraft | null>(null);
  // Mirror for the [] useCallback closures below, same reason as sessionRef.
  const namingRef = useRef<WayCreationDraft | null>(null);
  namingRef.current = naming;
```

## Edit 5 — `app/src/ui/RecordScreen.tsx`, inside `onEnd`

`onEnd` starts at line **352** (pre-edit). Two sub-edits inside its `try` block.

5a — after `setLastSummary(sum);` (the `const sum = await stopTracking();` pair at
lines **372–373**), insert:

```typescript
      // Retroactive way creation (OPEN-ITEMS item 2): an unlocked ride with
      // a real session may be ride 1 on a brand-new way — compute the naming
      // offer BEFORE the phase flip so 'ending' can show it. Null (no offer)
      // covers: locked rides, matched endpoints, short rides, read failures.
      const draft = s && finalState.track === null ? await namingDraftFor(s.rideId, s.startedAtMs) : null;
```

(`s` and `finalState` are already in scope — declared earlier in `onEnd`.)

5b — the phase-flip lines **380–384** (pre-edit) read:

```typescript
      setSession(null);
      setRecovered(false);
      setPauseMenu(false);
      setPhase('ending');
      setShowAnim('rev');
```

Replace ONLY the last of those five lines (`setShowAnim('rev');`) with:

```typescript
      setNaming(draft);
      // The reversed mark waits for the naming card (its close handlers
      // below start it); with no offer it plays at once, exactly as before.
      if (draft === null) setShowAnim('rev');
```

## Edit 6 — `app/src/ui/RecordScreen.tsx`, the two card handlers

Anchor: the comment line starting `  // Discard (Cycle 025, Nathan 2026-08-26): end WITHOUT saving.`
(line **397** pre-edit, directly after `onEnd`'s closing `}, []);`). Insert BEFORE
that comment:

```typescript
  // OPEN-ITEMS item 2 — the naming card's two exits. Skip loses nothing: the
  // ride was already saved (rememberRide/rememberFreeRide/raw JSONL) before
  // the card existed, and the next unmatched ride offers again.
  const onNamingSkip = useCallback(() => {
    setNaming(null);
    setShowAnim('rev');
  }, []);

  const onNamingSave = useCallback(async (names: { start: string; end: string }) => {
    const draft = namingRef.current;
    if (!draft) return;
    setBusy(true);
    try {
      const built = buildWayCreationCatalog(userCatalog(), draft, names);
      const errs = await saveUserCatalog(built);
      if (errs.length > 0) {
        // saveUserCatalog refused (the MERGED catalog would not validate)
        // and changed nothing — surface WHY, keep the card up; SKIP remains.
        Alert.alert('Could not create the way', errs.join('\n'));
        return;
      }
      setNaming(null);
      setShowAnim('rev');
    } catch (e) {
      Alert.alert('Could not create the way', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

```

## Edit 7 — `app/src/ui/RecordScreen.tsx`, the `'ending'` render

Anchor: inside `if (phase === 'ending')` the lines (**683–684** pre-edit):

```tsx
        <View style={{ flex: 1 }} />
        {showAnim === 'rev' && (
```

Insert BEFORE `<View style={{ flex: 1 }} />`:

```tsx
        {naming !== null ? (
          <WayNamingCard
            startExistingLabel={existingLandmarkLabel(naming.start)}
            endExistingLabel={existingLandmarkLabel(naming.end)}
            loop={naming.loop}
            busy={busy}
            onSave={onNamingSave}
            onSkip={onNamingSkip}
          />
        ) : null}
```

## MANDATORY verification (predicted output from the dry run)

1. `cd app && ./node_modules/.bin/tsc --noEmit` — exit 0, no output.
2. `cd app && node --experimental-strip-types tests/run.ts` — last line exactly
   `283 tests: 280 pass, 0 fail, 3 skip` (unchanged from Part 1's landing: this
   part adds UI the headless suite does not import; a CHANGED count means you
   broke a pure module — STOP).
3. `cd app && git diff --stat` shows ONLY `app/src/ui/RecordScreen.tsx` (~90
   insertions) among tracked files, plus untracked `app/src/ui/wayNamingCard.tsx`.
4. Sanity greps, each must hit: `grep -c "namingDraftFor" src/ui/RecordScreen.tsx`
   → 2 (definition + the one call in onEnd);
   `grep -c "WayNamingCard" src/ui/RecordScreen.tsx` → 2 (import + render);
   `grep -c "setShowAnim('rev')" src/ui/RecordScreen.tsx` → 3 (onEnd conditional,
   onNamingSkip, onNamingSave).

## Known coverage limit (documented, accepted)

The RecordScreen wiring itself has no headless test — the suite has no RN
renderer, and every other screen in this repo carries the same limit
(`[UNTESTED ON DEVICE]` header convention). The decision logic IS tested
(Part 1's 10 tests cover draft/build/save/boot). The on-device pass — record an
unmatched ride on a dev client, see the card, save, check ROUTES; record again,
skip — goes on Nathan's device-check list, NOT into this brief's execution.

## Must NOT change

- The `onEnd` failure path (`catch`/`finally`), `onDiscard`, the phase machine
  (`recordFlow.ts`), the BackHandler block, `lastRide.ts`, `freeRides.ts`.
- No naming offer on the discard path (onDiscard) — discarded rides died.
- The `'ending'` screen's existing "Ride saved" line and the animation's
  `onDone` (still lands on Result).
- No new dependencies; `TextInput` comes from react-native.
- Never run git write commands; never delete files (move to `safe_to_delete/`).

## Report format

Report back: files created/changed, tsc exit code, the test-count line verbatim,
the three grep results, and any deviation (a deviation is a STOP, not a footnote).
