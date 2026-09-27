# 05 — Post-ride "was this a different way?" card: assume the scored way, offer a small correction

**Source: Nathan, 2026-09-26 (same session as briefs 01-04; two messages about the same UI,
treated as one ask).** His words:

> (3) "In the demo it always ask post ride if it is a new way on Home>>Work; is this just a
> demo feature or a real app feature, if thats the case it should be removed asap; we dont
> want to bother each time to confirm it was indeed that route as we already select it before
> starting the ride; so the default should be assumed correct ride; WITH smaller option to
> update it if it is not, but not big in our face, does that make sense?"

> (5, second half) "remove fromthe post-ride screen tab the text about 'scored as Home>>Work.
> Was this a different way.....' all the ai clutter needs to go from the app"

**Answer to his question first: it is a REAL app feature, not a demo one.** The card is
`RouteNamingCard` (`app/src/ui/routeNamingCard.tsx`), rendered by the RECORD screen's
`'ending'` phase (`app/src/ui/RecordScreen.tsx` 1147-1157) whenever the STOP-time naming
offer `naming` is non-null. That condition is not gated on DEMO; it fires after every real
ride whose endpoints match a route you have but not one of its existing ways — and, in the
case Nathan is describing, even when the engine DID score the ride as an existing way
(the "Scored as Home>>Work. Was this a different way?" variant).

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from a Haiku digest plus two anchor reads against the working tree (branch
`virgin`, HEAD `c3e92ef`, cycle14 fully landed, briefs 01-04 of this cycle unexecuted).
Executor: Sonnet, cold, this file only. Fifth brief of `virgin-cycle15`. **Shares
`RecordScreen.tsx` with brief 02** (brief 02 edits lines 17-80 imports, 226-234, 448-452,
1368-1378, 1488-1515; this brief edits 176-200, ~600-628, 631-637, 1120-1175 and one
import) — no overlapping lines, but if brief 02 has landed first, re-read every anchor
below (line numbers will have shifted by its additions) and match on the quoted text, not
the number. Either order.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-26 unless it
  is explicitly marked *(not read by the Plan tier)*. If a quoted line is not where the
  brief says, or a name/signature differs, **stop and report the mismatch verbatim** (file,
  line, what you expected, what you found). Never guess, never patch around it, never rule
  on it yourself. The marked-unread block (RecordScreen 600-628) has an explicit "expected
  shape" — if the shape differs, stop.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Everything is RN core (`Pressable`, `Text`, `View`).
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  briefs 01-04, or anything under `cycles/virgin-cycle14/` (history).
- **Do not touch `app/src/store/routeCreation.ts`, `app/src/store/wayFromRide.ts`, the
  results/ranking store, `RideDetailScreen.tsx`, `GateAdjustScreen.tsx`, `DemoScreen.tsx`.**
  The offer computation (`draftRouteFromRide`), the save (`createRouteFromDraft`) and the
  ride record are correct and unchanged. This brief changes only *whether and how big* the
  offer is shown for one of its variants.

## Goal

After STOP on a ride the engine scored as an existing way of an existing route
(Nathan's Home>>Work), the RECORD screen no longer stops on a full bordered card asking
"Scored as Home>>Work. Was this a different way?". The ride is what it already is — saved
and scored as that way — and the screen proceeds by itself exactly as a ride with no offer
does (Ride saved → timing tower → reversed launch mark → ride detail). During that window
one small dim line sits under the tower, in the register of the card's own skip link:
`not Home>>Work?`. Tapping it holds the screen and opens the **existing** naming card (title
`New way on <route>`, STARTED AT / ENDED AT / SPECIFICATIONS, ADD WAY, and the existing
`no — it was Home>>Work` link to back out) — with the "Scored as … Was this a different
way …" sentence removed from that card. No tap is ever required to get past a scored ride.

The other card variants (ride matches no route at all; ride is on a route you have but
followed none of its ways) are **unchanged** — there is nothing to assume there.

## Current state (verified 2026-09-26 against the tree)

All in `app/src/ui/RecordScreen.tsx` (1715 lines) unless stated.

- **The offer state**, lines 177-185:

  ```tsx
    // OPEN-ITEMS item 2 (WP-F: any finished ride, not just unlocked ones):        // 177
    // the STOP-step naming offer for endpoints that match no existing way, or
    // that diverge >MATCHED_ENDPOINT_SLACK_M from the ride's own matched route
    // (null = no offer). While non-null the 'ending' phase shows the naming
    // card and holds the reversed launch mark.
    const [naming, setNaming] = useState<RouteCreationDraft | null>(null);          // 182
    // Mirror for the [] useCallback closures below, same reason as sessionRef.
    const namingRef = useRef<RouteCreationDraft | null>(null);                      // 184
    namingRef.current = naming;                                                     // 185
  ```

  Followed by `adjust`/`adjustRef` (190-192), `endedRef` (196), `reveal`/`revealDone`
  (199-200: `const [reveal, setReveal] = useState<RankingReveal | null>(null);` /
  `const [revealDone, setRevealDone] = useState(true);`).
- **Where the offer is computed** (`onEnd`), lines 578-580:

  ```tsx
        const draft = s                                                              // 578
          ? await draftRouteFromRide(s.rideId, s.startedAtMs, finalState.track, createExpoFsAdapter(), s.sportId ?? activeSportId())
          : null;
  ```

  preceded (563-577) by the comment explaining the offer is about the ENDPOINT PAIR and
  that "an existing way in this direction is no longer a null-offer either — it comes back
  with existingWayId set". Then 587-600: `setSession(null); setRecovered(false);
  setPauseMenu(false); … setTrail([]); … setFromExplicit(false); setReveal(nextReveal);
  setRevealDone(nextReveal === null);`.
- **The ride is already saved before the card exists** — the fact this whole brief rests on.
  Lines 631-637:

  ```tsx
    // OPEN-ITEMS item 2 — the naming card's two exits. Skip loses nothing: the    // 631
    // ride was already saved (rememberRide/rememberFreeRide/raw JSONL) before
    // the card existed, and the next unmatched ride offers again.
    const onNamingSkip = useCallback(() => {                                        // 634
      setNaming(null);
      setShowAnim('rev');
    }, []);                                                                         // 637
  ```

  and `onNamingSave` 639-… (`createRouteFromDraft(draft, names, createExpoFsAdapter())`,
  then `setNaming(null)` and either `setAdjust(out.adjust)` or `setShowAnim('rev')`).
  So "assume the scored way is correct" costs nothing mechanically: it is the skip path,
  taken automatically.
- **Lines 600-628 — the hold/advance logic *(not read by the Plan tier; executor reads
  first)*.** Between `setRevealDone(nextReveal === null);` (600) and the end of the
  callback at 628 (`}, REVEAL_HOLD_MS);` / `}, []);`) live (a) the rest of `onEnd` — the
  `setNaming(draft)` + `setPhase('ending')` flip and, for the **no-offer / no-reveal**
  case, whatever starts the reversed mark (`setShowAnim('rev')`) without a card — and (b)
  `onRevealPlayed`, a `[]` callback that after the tower plays waits `REVEAL_HOLD_MS` and
  then, reading `namingRef`/`adjustRef` (that is why those refs exist, 183-185), either
  holds for the card or plays the reversed mark. **Expected shape:** a decision of the form
  "if `namingRef.current === null` (and no adjust) → `setShowAnim('rev')`, else hold" in
  the timeout, and a matching "no offer, no reveal → `'rev'` now" branch in `onEnd`. If the
  advance logic is not of that shape (e.g. the reversed mark is started somewhere else, or
  there is no no-reveal branch), **stop and report** with the lines 600-628 pasted.
- **The `'ending'` render**, lines 1121-1157: `Ride saved` line (1123-1125), `TimingTower`
  when `reveal !== null` (1127-1135), then

  ```tsx
            {revealDone ? (                                                          // 1137
              adjust !== null ? (
                <GateAdjustCard … />                                                 // 1139-1146
              ) : naming !== null ? (                                                // 1147
                <RouteNamingCard
                  startExistingLabel={existingLandmarkLabel(naming.start)}
                  endExistingLabel={existingLandmarkLabel(naming.end)}
                  loop={naming.loop}
                  busy={busy}
                  matchedWayLabel={naming.matchedWayId ? wayLabelIn(currentCatalog(), naming.matchedWayId) : null}   // 1153
                  existingRoute={naming.existingRouteId ? existingRouteProps(naming.existingRouteId) : null}         // 1154
                  vocabulary={specVocabulary(activeCatalog().ways)}
                  onSave={onNamingSave}
                  onSkip={onNamingSkip}
                />
              ) : null
            ) : null}
          </ScrollView>                                                              // 1160
          {showAnim === 'rev' && (                                                   // 1161
            <LaunchAnimation
              reverse
              onDone={() => {
                setShowAnim(null);                                                   // 1165
                setReveal(null); // a board must never survive into the next ride's 'ending'
                setPhase('setup');
                … tabNav.openRide({ rideId: ended.rideId, source: 'post-stop', … })
  ```

- **The card**, `app/src/ui/routeNamingCard.tsx` (238 lines). Title 87-89
  (`existingRoute ? \`New way on ${existingRoute.label}\` : 'New route — name where you rode'`).
  Body `<Text style={[st.sub, …]}>` 90-102 — a nested ternary with **five** sentences:

  | # | condition | line | copy |
  |---|---|---|---|
  | **2 — this brief** | `existingRoute && props.matchedWayLabel` | 93 | `Scored as ${matchedWayLabel}. Was this a different way? Add what made it different to save it as a new way on this route — this ride becomes its reference.` |
  | 3 | `existingRoute && !matchedWayLabel` | 94 | `${existingRoute.label} is a route you have, but this ride did not follow any of its ways. Name what made it different …` |
  | 1a | `!existingRoute && loop` | 96-98 | `This ride looped from and back to …` |
  | 1b | `!existingRoute && !loop && matchedWayLabel` | 100 | `Scored as ${matchedWayLabel}, but no route of yours runs between these two places. Name them …` |
  | 1c | `!existingRoute && !loop && !matchedWayLabel` | 101 | `This ride does not match any route you have. Name its start and end …` |

  Variant 2 is exactly `props.existingRoute !== null && props.matchedWayLabel !== null`;
  in draft terms `draft.existingRouteId && draft.matchedWayId` (both fields on
  `RouteCreationDraft`, `app/src/store/routeCreation.ts` 91 and 97, set at 284-285).
  The card's skip link, 203-211, already says **`no — it was ${matchedWayLabel}`** for
  variant 2 (`skip — keep it as a plain ride` otherwise). Styles 216-238:
  `card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 }` (217),
  `sub: { fontSize: 12.5, marginBottom: 6 }` (219), `saveBtn` full-width accent (232),
  **`skipBtn: { paddingVertical: 10, alignItems: 'center' }` (235), `skipText: { fontSize: 13 }`
  (236), colour `t.textDim`** — this dim 13-pt centred text link is the smallest secondary
  control on the post-ride screen today and is the visual model for the new affordance.
- **Pure rules file** `app/src/ui/recordFlow.ts` exports `RecordPhase` (27), `canTransition`
  (46), `isFullscreen` (54), `effectiveFromId` (63), `liveMapOverlayFor` (82-83),
  `statusItemsFor` (97); suite `app/tests/recordflow_suite.ts` (imports from
  `'../src/ui/recordFlow.ts'`, `assert, test` from `./lib.ts`), registered at
  `tests/run.ts:37`. Brief 02 appends `recordPressAction` to both; this brief appends after
  it (or at end of file if 02 has not landed).
- Baseline (STATE.md 65-66, 2026-09-26): **676 tests, 673 pass, 0 fail, 3 skip**;
  `tsc --noEmit` clean, exit 0.

## Decisions (already made — do not reopen)

1. **"Default assumed correct" means: nothing to do, nothing to wait for.** The ride is
   already saved and scored as the matched way before the card would have appeared (631-633);
   the card only ever offered to *additionally* mint a new way. So for variant 2 the screen
   takes the no-offer path — `Ride saved` → tower → `REVEAL_HOLD_MS` → reversed mark → ride
   detail — with no card, no confirm, no timer beyond the hold that already exists. There is
   no implicit confirmation, no "auto-confirms after N seconds": there is nothing to confirm.
   Rationale: Nathan chose the way before START ("we already select it before starting the
   ride") and the engine agreed; asking again is the bother.
2. **The correction affordance is one dim line, `not <matched way>?`, in the card's own
   skip-link style**, placed where the card used to be (under the tower, inside the
   `revealDone` slot at 1137). Style = `skipBtn`/`skipText` values from `routeNamingCard.tsx`
   235-236 (`paddingVertical: 10, alignItems: 'center'`, `fontSize: 13`, `t.textDim`) — the
   existing smallest secondary control on this screen, so it reads as the footnote it is and
   nothing new is designed. No icon, no chip, no border, no body copy. Visible only while
   the ending screen is up (it goes with the reversed mark).
3. **Tapping it re-uses the existing card and flow, unchanged in behaviour.** The tap sets
   `namingExpanded` true, which (a) makes the `'ending'` render show `RouteNamingCard` with
   exactly today's props and handlers (`onNamingSave` / `onNamingSkip`), and (b) makes the
   hold logic keep the screen up instead of playing the reversed mark. ADD WAY and
   `no — it was <way>` then work exactly as they do now (save → optional gate-adjust card →
   reversed mark; skip → reversed mark). No new save path, no new store call.
4. **Variant 2's explanatory sentence is deleted, not reworded.** In `routeNamingCard.tsx`
   the body `<Text>` is not rendered at all when `existingRoute && matchedWayLabel` — a
   rider who opened the card via `not Home>>Work?` has already said it was different; the
   title `New way on <route>` and the field labels carry the rest. Nathan: "all the ai
   clutter needs to go". Variants 1a/1b/1c/3 keep their sentences (out of scope).
5. **The rule "which offers are quiet" is a pure function in `recordFlow.ts`, tested.**
   `namingOfferMode(draft)` → `'none' | 'quiet' | 'card'`; `'quiet'` iff
   `draft.existingRouteId && draft.matchedWayId`. Both `RecordScreen` decision points (the
   hold and the render) read it; the recordflow suite pins it.
6. **The race is closed by a ref, the same way `namingRef` closes it today.** The hold
   decision runs inside a `[]` callback's timeout; the tap can land before or after it.
   `namingExpandedRef` mirrors the state (pattern of 184-185). Timeout fires first → `'rev'`
   plays, the link is under the animation overlay and its `Pressable` is `disabled` while
   `showAnim !== null`, so a late tap does nothing. Tap first → the timeout sees the ref and
   holds. The reversed mark's `onDone` (1164-1167) additionally clears `naming` and
   `namingExpanded`, because in the quiet path `naming` is still non-null when the mark
   plays (today it never is).
7. **No-reveal quiet ride: proceed immediately, no synthetic hold.** If `nextReveal === null`
   (no ranking board) *and* the offer is quiet, `onEnd` takes today's "no offer, no reveal"
   branch unchanged — the link is on screen only for the reversed mark's lead-in, i.e.
   effectively not available. Accepted for this brief: a scored ride on an existing way is
   a ranked ride, so this combination should be rare; the durable fix is a post-hoc "this
   ride was a different way" entry on the ride detail overlay (open question 1), not a
   timer that makes every rider wait.
8. **Copy: `not ${matchedWayLabel}?`** — lower-case fragment, same register as
   `no — it was ${matchedWayLabel}` on the card. `accessibilityLabel="This ride was a
   different way"`. One string literal.

## Files to touch

### 1. `app/src/ui/recordFlow.ts` — append one pure rule at end of file

```ts
/** virgin-cycle15 brief 05 (Nathan 2026-09-26): how loud the STOP-time naming
 * offer is. 'none' = no draft (nothing to offer); 'quiet' = the ride is on a
 * route the rider has AND the engine scored it as one of that route's ways —
 * the ride is already saved as that way, so the screen proceeds by itself and
 * only a small "not <way>?" link is shown; 'card' = every other draft (new
 * route, or a route with no matching way): nothing to assume, full card as
 * before. Takes the two ids rather than the draft type so the rule has no
 * store import. */
export type NamingOfferMode = 'none' | 'quiet' | 'card';
export function namingOfferMode(draft: { existingRouteId?: string | null; matchedWayId?: string | null } | null): NamingOfferMode {
  if (draft === null) return 'none';
  return draft.existingRouteId && draft.matchedWayId ? 'quiet' : 'card';
}
```

(`RouteCreationDraft` is structurally assignable to that parameter — both fields are
`?: string | null`, routeCreation.ts 91/97 — so `RecordScreen` passes the draft as is.)

### 2. `app/src/ui/routeNamingCard.tsx`

**a. Header comment** (top of file, the block that describes the card — read it first):
append one paragraph: *"virgin-cycle15 brief 05 (Nathan 2026-09-26): when the ride was
scored as an existing way of an existing route (`existingRoute && matchedWayLabel`) this
card is no longer shown by default — RecordScreen shows a one-line `not <way>?` link and
only opens the card on tap. In that case the explanatory body sentence is dropped: the
rider already said it was different."*

**b. Body text, lines 90-102.** Wrap the whole `<Text style={[st.sub, …]}> … </Text>` in
a condition so it is not rendered for variant 2, and delete the variant-2 sentence
(line 93) from the ternary:

```tsx
      {!(existingRoute && props.matchedWayLabel) && (
        <Text style={[st.sub, { color: t.textDim }]}>
          {existingRoute
            ? `${existingRoute.label} is a route you have, but this ride did not follow any of its ways. Name what made it different to save it as a new way — this ride becomes its reference.`
            : props.loop
              ? props.startExistingLabel !== null
                ? `This ride looped from and back to ${props.startExistingLabel}.`
                : 'This ride looped from and back to one new place.'
              : props.matchedWayLabel
                ? `Scored as ${props.matchedWayLabel}, but no route of yours runs between these two places. Name them to make this a way of its own — this ride becomes its reference.`
                : 'This ride does not match any route you have. Name its start and end to make it a real way — this ride becomes its reference.'}
        </Text>
      )}
```

The four surviving strings are byte-identical to today's lines 94, 97, 98, 100, 101 —
copy them from the tree, do not retype. Title (87-89), fields, spec section, ADD WAY, the
`no — it was ${matchedWayLabel}` skip link (203-211) and all styles: unchanged.

### 3. `app/src/ui/RecordScreen.tsx`

**a. Import.** On the `./recordFlow` import (line 39 today; brief 02 also edits it — merge,
alphabetical): add `namingOfferMode`.

**b. State, after line 185 (`namingRef.current = naming;`).** Insert:

```tsx
  // virgin-cycle15 brief 05: a 'quiet' offer (namingOfferMode — the ride was
  // scored as an existing way of a route you have) shows only a one-line
  // "not <way>?" link and lets the screen proceed by itself; tapping the link
  // sets this, which (1) renders the full RouteNamingCard and (2) makes the
  // post-reveal hold below keep the screen up instead of playing the reversed
  // mark. Ref for the [] timeout closure, same reason as namingRef.
  const [namingExpanded, setNamingExpanded] = useState(false);
  const namingExpandedRef = useRef(false);
  namingExpandedRef.current = namingExpanded;
```

and amend the comment at 177-181: after "(null = no offer)." add "Brief 05: a quiet offer
(namingOfferMode) does NOT hold the reversed mark unless expanded — see namingExpanded."

**c. `onEnd`, the flip (inside 600-628 — locate by text).** Wherever `setNaming(draft)` is
called, add `setNamingExpanded(false);` on the line before it (a fresh ride never starts
expanded). Then find the "no offer → reversed mark now" decision in the no-reveal branch
(expected shape: something equivalent to `if (draft === null) setShowAnim('rev')` or
`if (nextReveal === null && draft === null) …`). Change its condition so a quiet offer
counts as no offer: `namingOfferMode(draft) !== 'card'` in place of `draft === null`
(keep any `adjust` term as is). If the branch is not of that shape, stop and report.

**d. `onRevealPlayed`'s timeout (ends at 628).** The hold decision reads
`namingRef.current`. Change its "there is a naming offer → hold" test from
`namingRef.current !== null` (or equivalent) to

```tsx
        const holdsForNaming = namingOfferMode(namingRef.current) === 'card' || namingExpandedRef.current;
```

and use `holdsForNaming` where the null-test was. Semantics: a full-card offer holds as
today; a quiet offer holds only if the link was tapped before the hold ran out; no offer
never holds. `adjustRef` handling unchanged. If the timeout's decision is not a
recognisable null-test on `namingRef.current`, stop and report.

**e. The `'ending'` render, 1147-1157.** Replace the `naming !== null ? ( <RouteNamingCard …/> ) : null` branch with:

```tsx
            ) : naming !== null && (namingOfferMode(naming) === 'card' || namingExpanded) ? (
              <RouteNamingCard
                startExistingLabel={existingLandmarkLabel(naming.start)}
                endExistingLabel={existingLandmarkLabel(naming.end)}
                loop={naming.loop}
                busy={busy}
                matchedWayLabel={naming.matchedWayId ? wayLabelIn(currentCatalog(), naming.matchedWayId) : null}
                existingRoute={naming.existingRouteId ? existingRouteProps(naming.existingRouteId) : null}
                vocabulary={specVocabulary(activeCatalog().ways)}
                onSave={onNamingSave}
                onSkip={onNamingSkip}
              />
            ) : naming !== null && naming.matchedWayId ? (
              /* brief 05: quiet offer — the ride is already saved as the scored
                 way; this one dim line is the whole correction affordance. */
              <Pressable
                style={styles.notThisWayBtn}
                disabled={busy || showAnim !== null}
                onPress={() => setNamingExpanded(true)}
                accessibilityLabel="This ride was a different way"
              >
                <Text style={styles.notThisWayText}>{`not ${wayLabelIn(currentCatalog(), naming.matchedWayId)}?`}</Text>
              </Pressable>
            ) : null
```

The `<RouteNamingCard …>` props block is byte-identical to today's 1148-1157 — copy, do
not retype. (`naming.matchedWayId` is guaranteed non-null in the quiet branch by
`namingOfferMode`, but the explicit `&& naming.matchedWayId` keeps `wayLabelIn`'s argument
typed `string` without a `!`.)

**f. The reversed mark's `onDone`, 1164-1167.** After `setReveal(null); // a board must never survive …`
add:

```tsx
              setNaming(null); // brief 05: a quiet offer rides through the mark un-cleared
              setNamingExpanded(false);
```

**g. Styles, in `makeStyles(t)`** (find `skipBtn`-like entries or the `flowLabel` at ~1640
and add beside them):

```tsx
  notThisWayBtn: { paddingVertical: 10, alignItems: 'center' },
  notThisWayText: { color: t.textDim, fontSize: 13 },
```

(the `routeNamingCard.tsx` 235-236 values, colour resolved from `t` because `makeStyles`
has it.)

Nothing else in the file changes: `onNamingSkip`/`onNamingSave` (634-…), `draftRouteFromRide`
call (578-580), `GateAdjustCard` branch, `endedRef`/`tabNav.openRide`.

### 4. `app/tests/recordflow_suite.ts` — extend

Import gains `namingOfferMode`. Append, `recordFlow:`-prefixed names:

- `namingOfferMode(null) === 'none'`.
- `namingOfferMode({ existingRouteId: 'r1', matchedWayId: 'w1' }) === 'quiet'` — "scored as
  an existing way of a route you have: the ride is already saved as it, no card".
- `namingOfferMode({ existingRouteId: 'r1', matchedWayId: null }) === 'card'` — "route
  exists, no way matched: nothing to assume" (variant 3).
- `namingOfferMode({ existingRouteId: null, matchedWayId: 'w1' }) === 'card'` — "scored, but
  no route between these places: still a new route" (variant 1b).
- `namingOfferMode({ existingRouteId: null, matchedWayId: null }) === 'card'` (variant 1c);
  `namingOfferMode({}) === 'card'` (both undefined).
- One line against the real draft builder, if `routecreation` already has a suite with a
  fixture catalog (check `app/tests/` for `routeCreation`/`routecreation_suite.ts`): take
  its existing "second Route on that Way / existingWayId set" case's draft and assert
  `namingOfferMode(draft) === 'quiet'` when the fixture's `matchedWayId` is set. If no
  such fixture exists, skip this bullet and say so in the report — do not build one.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count up by 6-7
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
```

Baseline (2026-09-26): 676 tests, 673 pass, 0 fail, 3 skip (higher if briefs 01-04 landed
first — record the before count you actually observe). If `tsc` blows the call budget on
this mount, retry once with a longer timeout, then report — do not substitute a
syntax-only check without saying so. Also:

```
grep -n "Was this a different way" app/src/ui/routeNamingCard.tsx        # → no matches
grep -n "namingOfferMode" app/src/ui/RecordScreen.tsx                     # → import + 3 uses (onEnd branch, hold, render)
grep -n "namingExpanded" app/src/ui/RecordScreen.tsx                      # → state, ref, onEnd reset, hold, render, onDone
grep -n "no — it was" app/src/ui/routeNamingCard.tsx                      # → still 1 (the skip link stays)
git status --short   # → exactly: M recordFlow.ts, M routeNamingCard.tsx, M RecordScreen.tsx, M recordflow_suite.ts
```

## On-device checklist (Nathan, after OTA — not the executor)

Needs a phone with at least one route that has a way (Home>>Work) and its ride history.

1. Ride Home>>Work as picked on RECORD, STOP. `Ride saved`, the tower plays, then — with
   no tap — the reversed mark plays and the ride detail opens. **No card.** Under the tower,
   during the hold, one dim line: `not Home>>Work?`.
2. Same ride again, but tap `not Home>>Work?` during the hold: the screen stays; the card
   opens with title `New way on Home>>Work` and **no sentence under the title** — straight to
   STARTED AT / ENDED AT / SPECIFICATIONS. Tap `no — it was Home>>Work`: reversed mark, ride
   detail, nothing created (ROUTES tab unchanged).
3. Same again, tap the link, add a spec (`Detour`), ADD WAY: today's behaviour — the way is
   created, the gate-adjust card (or the reversed mark) follows, ROUTES shows the new way.
4. Ride between two places no route of yours connects (or Reset-to-virgin and ride once):
   the full `New route — name where you rode` card still blocks as before, with its
   sentence. Unchanged.
5. Ride a route you have but off all its ways (e.g. deliberately a different street): the
   full `New way on <route>` card still blocks, with the `<route> is a route you have, but
   this ride did not follow any of its ways…` sentence. Unchanged.
6. Tap `not Home>>Work?` at the very last instant of the hold: either the card opens
   (tap won) or the mark plays and the ride detail opens (hold won) — never both, never a
   card left up under the animation.
7. DEMO tab: whatever DEMO does post-ride is unchanged by this brief (it is not `RecordScreen`
   — if the demo shows the same card text, that is a separate ask; report it).
8. Both themes: the dim link legible.

## Out of scope

- **Variants 1a/1b/1c and 3 (no route matched; route matched but no way followed) —
  UNCHANGED, full bordered card with their current sentences, ADD WAY / CREATE ROUTE and
  skip link.** There is no already-correct default in those cases; the ride is saved as a
  plain ride and the card is the only way to make it a way.
- A post-hoc "this ride was a different way" action on the ride detail overlay (the
  durable, always-available correction) — open question 1; separate brief.
- Any change to `draftRouteFromRide`, `createRouteFromDraft`, `MATCHED_ENDPOINT_SLACK_M`,
  the engine's route verdict, ranking/reveal timing (`REVEAL_HOLD_MS`), the gate-adjust card.
- The DEMO tab's own post-ride presentation (`DemoScreen.tsx`).
- Copy of the surviving four card sentences, the title, `no — it was …`.
- `STATE.md`, `OPEN-ITEMS.md` (item 2's "two exits" note is now three-state — coordinator's
  edit), this folder's `README.md`.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (four files edited, none
added; no new dependency, no `app.json`/`eas.json` change), so it ships to the Preview APK
over EAS Update via `scripts/publish-preview.cmd` — no new numbered build, no reinstall.
Visible after every ride the engine scored as the way you picked: the post-ride screen no
longer stops on the "Scored as … Was this a different way?" card; it plays through to the
ride detail on its own, with one small `not <way>?` line you can tap during the tower hold
if it really was a different way. Rides that match nothing, or match a route but none of
its ways, look exactly as they do today.

## Open questions / assumptions (logged, not blocking)

1. **The correction is only offered during the post-ride hold** (decision 1/7), not later.
   If Nathan wants to reclassify a scored ride from RIDES → ride detail afterwards, that
   needs `draftRouteFromRide(rideId, startedAtMs, track, fs, sportId)` recomputed from the
   stored ride and the card rendered inside `RideDetailScreen` — a separate brief; this one
   deliberately does not touch that screen.
2. **Hold length is unchanged** (`REVEAL_HOLD_MS`). If the link proves too fleeting on the
   phone, lengthening the hold *only when a quiet offer exists* is one condition in
   `onRevealPlayed`; not done here because it would make the default ride slower, which is
   the opposite of the ask.
3. **No-reveal + quiet offer proceeds with no window** (decision 7). Expected rare; if it
   turns out common (e.g. free rides that still match a way), fold into open question 1.
4. **Copy** `not ${way}?` is the Plan tier's shortest guess in the card's own register; one
   literal in `RecordScreen.tsx`.
5. **DEMO**: Nathan saw this "in the demo". If `DemoScreen.tsx` renders its own copy of the
   card text (not verified — that file was not read), it will still show it after this
   brief; checklist item 7 catches it.
