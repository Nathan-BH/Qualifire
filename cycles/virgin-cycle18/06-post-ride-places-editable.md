# 06 — Post-ride From/To are proposals, never etched: every endpoint on the naming card can be changed

**Source: Nathan, 2026-09-29.** His words: "similar to how the auto-detect start feature works,
which preselects it BUT still allows us to change it. The way the app proposes the From and To
places post ride should be the same. Because: i then selected StoreWork, which was a new
route, but upon starting my ride i changed plans in my head and headed straight home. Upon
arrival i stopped the ride and the app decided it was a StoreHome ride, which was correct but
the issue is i could not even manually edit the two places. I think it can correctly fill it
in, but it should not be etched in stone in a way i have no input over it. So post ride
whatever is filled in, even if you selected in advance properly WorkHome for example, it
should still let me edit it if i wanted to."

**What this brief delivers.** On the naming card an endpoint that resolved to an existing
place is still shown pre-filled — but with a `change` link that opens brief 05's shared
place picker (every place, most-used first, the place picked at START marked and listed
first). A tap re-points that end; tapping the proposal again reverts. Explicit wins and
sticks for the life of the card, exactly like `effectiveFromId`'s rule for the RECORD tab's
detected start (WP-L): a proposal until touched. The rest of the card (new-place inputs with
typeahead, variant flip, specs, CREATE ROUTE / ADD WAY / SAVE AS FREE RIDE, `keep it as
<way>`) is brief 04 + 05, unchanged. One store belt: a ride that becomes the reference of a
route it was re-pointed to never keeps a stale result on the way the engine scored it as.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `2267b9c`, i.e. BEFORE briefs 02/04/05 land). Executor: Sonnet, cold, this
file only. Brief 06 of `virgin-cycle18`. **Order: after brief 05** (this brief extends
05's `PlacePicker`, `placeSearch.ts`, `EndpointChoice`/`applyEndpointChoices`, and the
card's choice state; without 05 nothing here has anything to attach to). 05 is after 04,
04 after 02. Anchors are quoted text against the post-05 tree.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below is quoted text (the card and `RecordScreen` were
  rewritten by 04 and 05 in the regions this brief touches). If a quoted line is not where
  the brief says, or a name/signature differs, **stop and report the mismatch verbatim**
  (file, line, expected, found). Never guess, never patch around it, never rule on it yourself.
- **Precondition (brief 05 landed):** `grep -n "applyEndpointChoices" app/src/store/routeCreation.ts app/src/ui/RecordScreen.tsx app/src/ui/RideDetailScreen.tsx`
  → hits in all three; `test -f app/src/ui/placePicker.tsx && test -f app/src/store/placeSearch.ts`.
  Otherwise stop and report.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. Files touched (exactly these): `app/src/store/placeSearch.ts`,
  `app/src/store/routeFromRide.ts`, `app/src/ui/routeNamingCard.tsx`,
  `app/src/ui/RecordScreen.tsx`, `app/src/ui/RideDetailScreen.tsx`,
  `app/tests/placesearch_suite.ts`, `app/tests/routecreation_suite.ts`.
- Do not touch `DemoScreen.tsx` (every prop added here is optional; the `change` link only
  renders when the caller supplied the proposed id AND at least one other place — DEMO
  supplies neither, so its two cards render exactly as after brief 04), `store/routeCreation.ts`
  (05's `applyEndpointChoices` already covers existing → existing; this brief only adds
  tests for it), `recordFlow.ts` (`effectiveFromId` is the model, not a dependency),
  `store/catalog.ts`, `store/resultsStore.ts`, `placePicker.tsx`, `catalogMerge.ts`.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief, or anything under `cycles/virgin-cycle16/` / `virgin-cycle17/`.

## Symptom, restated as the code sees it — and the ROOT CAUSE, proven

Nathan's ride: RECORD pick `Store → Work` (a new pair, no route: since cycle16 01 an ordinary
route-mode ride), rode home instead, END.

1. `RecordScreen.tsx:645-647` `draftRouteFromRide(s.rideId, …, finalState.track, …)` →
   `draftRouteCreation` (`routeCreation.ts:188-288`) resolves **from coordinates**: first fix
   inside Store's disc → `start = { kind: 'existing', landmarkId: Store }` (`:207-209`); last
   fix inside Home's disc → `end = { kind: 'existing', landmarkId: Home }` (`:234-236`). No
   route Store → Home → `existingRouteId: null` → `namingOfferMode(draft) === 'card'`
   (`recordFlow.ts:126-129`) → the "New route" card.
2. **The pre-ride pick is not an input to any of this.** `startContextRef` (`RecordScreen.tsx:1114-1117`)
   is threaded into `startTracking` only to log the sidecar `pick` event
   (`location/index.ts:397-406`); `RideFacts` (`routeCreation.ts:51-65`) has `fixes`,
   `matchedWayId`, `sportId` — no pick. `grep -n "startContext\|ridePick\|pickedWayRef" app/src/ui/RecordScreen.tsx`
   shows the pick used for the engine's `wayPick`/`wayIds` and the map hint, never for the
   draft. So "the app decided StoreHome" is the coordinate resolution alone — correct here,
   and by design (a pick is a plan; the ride is the fact).
3. **An existing endpoint is fixed text.** `routeNamingCard.tsx:67-68`
   `needStart = props.startExistingLabel === null` / `needEnd = props.endExistingLabel === null && !props.loop`;
   `:115-127` and `:132-144` render `<TextInput>` for a new place and `<Text style={st.fixed}>`
   for a matched one. The card receives labels only (`RouteNamingCardProps :37-58`): **it
   cannot offer another place because it has no list of places and no id to change.** The
   header says so on purpose (`:16-17` "An endpoint that matched an EXISTING landmark renders
   as fixed text, not an input") — a WP-G-era simplification, not a ruling; nothing in
   `STATE.md`/`OPEN-ITEMS.md` pins endpoints as uneditable (`grep -n "fixed text\|etched\|uneditable" STATE.md OPEN-ITEMS.md` → nothing relevant).
4. `RideDetailScreen.tsx:641-652` mounts the same card the same way for the retroactive offer
   — same limitation there.

**Brief 05 changes (3) for NEW endpoints only** (typeahead + tap → `{ kind: 'existing' }`)
and introduces the pure `applyEndpointChoices` (start/end re-point, `loop` and
`existingRouteId` recomputed). An existing → existing change is ALREADY correct in that
function (`choices.start.kind === 'existing'` overrides whatever `draft.start` was); what is
missing after 05 is (a) the UI on a proposed-existing endpoint, (b) the ids the card needs
to know which option is "the proposal", (c) the START-time pick as a marked option, (d) a
stale-result belt for the "scored as X, but it was not X" path.

**What re-pointing an endpoint to a place the ride did NOT end inside means — checked, safe:**
- Structurally nothing requires a route's endpoint disc to contain its reference line's
  ends: `validateCatalog` (`catalog.ts:45-128`) checks ids, disc overlap, radius, links,
  spec twins. `grep -rn -i "landmark" app/src/live app/src/location app/src/storage app/core/src`
  → no hits: the live engine locks on the reference line + gates (`live/engine.ts`,
  `tracks.ts`), gate seeding is on the line (`gateSeeding.ts`), results are keyed by way.
- The WP-F slack already creates exactly this state on purpose (`MATCHED_ENDPOINT_SLACK_M`
  300 m past the disc edge, `routeCreation.ts:67-72`, `:226-231`, `:257-262`), and a merge
  (brief 05) re-points routes wholesale. Consequences are the same as there: RECORD's
  detected start (`landmarkAt`) and `draftRouteCreation` for a LATER ride still go by
  coordinates, so a later ride that truly ends at the far spot drafts `'new'`/`'existing'` by
  its own fixes — and the rider corrects it on this same card with one tap. Discs are never
  moved (05 decision 5; Nathan's call 4 there).

### Proof (read from the tree, 2026-09-29)

`recordflow_suite.ts:79-115` pins `effectiveFromId` (auto + untapped seeds from detection;
a tap wins and sticks; sticks after detection changes). No suite pins anything about the
card's endpoint editability; `routecreation_suite.ts:164-176` builds from a draft whose
endpoints are exactly what `draftRouteCreation` returned. After brief 05, `c18-05 rc1/rc2`
prove `applyEndpointChoices` re-points and recomputes — those tests use NEW-endpoint drafts;
this brief adds the existing-endpoint cases (§4).

## Decisions (pre-resolved — do not re-open)

1. **Coordinates propose, the rider disposes — for EVERY endpoint.** An endpoint that resolved
   to an existing place renders as that place with a `change` link; tapping it opens the
   picker (all places, most-used first) with the proposal selected. Picking another place
   sets `{ kind: 'existing', landmarkId }`; picking the proposal again sets `{ kind: 'proposed' }`.
   Mirrors `effectiveFromId`: `proposed until touched; a touch wins and sticks` — for the
   life of this card (a new ride = a new card = fresh state, as WP-L's per-ride reset).
2. **The pre-ride pick is an OPTION, not the proposal.** When the START-time pick names a
   place other than the proposal, it is listed first and marked ` · picked at START`. It does
   not preselect: the ride went where it went (his own case — StoreHome "was correct"), and
   the pick is one tap away. RECORD passes the pick from the session; the ride detail passes
   none (Nathan's call 3).
3. **A proposed-existing endpoint can be changed to another EXISTING place only — not typed as
   a new place.** A new disc cannot be minted at a fix that lies inside an existing disc
   (`validateCatalog` overlap), so the offer would be a lie there; the one case where it
   could fit (a WP-F slack snap, fix outside the disc) is Nathan's call 2. A `'new'` endpoint
   keeps 05's input + typeahead.
4. **`loop` follows the effective pair.** A card drafted as a loop on an existing place
   (`X → X`) whose start is changed to `Y` becomes `Y → X`: ENDED AT appears with `X` and its
   own `change`. A loop drafted on a NEW place stays a loop (05's rule: the end follows the
   start's choice; one name, one place). The card derives `loop` from the choices; the parent's
   `applyEndpointChoices` derives it identically.
5. **The variant question follows the effective pair** (05 decision 4, unchanged): change the
   pair onto one that has a route → "New way on …" (specs required); change it off one →
   "New route". `matchedWayLabel` stays what it is — a fact about the ride ("Scored as X,
   but…"); the `keep it as <way>` exit stays exactly where brief 04 put it (the matched-way
   variant), so cycle15 05's quiet-offer ruling is untouched: the `not <way>?` link, the
   card only on tap, `keep it as <way>` writes nothing.
6. **One home, store-enforced.** `createRouteFromDraft` already (brief 04) stores the founding
   ride's own result on the new way, overwriting a result it held on another way (results are
   keyed by `rideId`, `resultsStore.ts:98`/`:236`). When it cannot time the ride
   (`referenceTimed === false`), a result left on a DIFFERENT way is removed — a ride is
   never both "scored as X" and "the reference of Y". Callers mirror: `replaceRecorded` when a
   result exists, `dropRecorded` when none does.
7. **Nothing new is persisted.** No sidecar change, no catalog field. The pick comes from the
   session (`startContextRef` at START) and lives in a ref until the next START.

## Files to touch

### §1. `app/src/store/placeSearch.ts` (brief 05's file) — two pure helpers

**Anchor:** the end of the file (after `newPlaceNameError`'s closing `}`).

```ts
/** virgin-cycle18 brief 06: the options for an endpoint's "change" picker —
 * every place, with the one picked at START (when it is a place and differs
 * from nothing in particular — the card marks it) moved to the front. Order
 * otherwise = the input's (usage). Returns a new array. */
export function endpointOptions(options: readonly PlaceOption[], pickedId: string | null): PlaceOption[] {
  if (pickedId === null) return [...options];
  const picked = options.find((o) => o.id === pickedId);
  if (!picked) return [...options];
  return [picked, ...options.filter((o) => o.id !== pickedId)];
}

/** brief 06: the landmark id an endpoint stands for on the card — the
 * proposal until the rider touched it, then the choice (effectiveFromId's
 * rule, recordFlow.ts). null = a new, still-unnamed place. */
export function effectiveEndpointId(
  proposedId: string | null, choice: { kind: 'proposed' } | { kind: 'existing'; landmarkId: string },
): string | null {
  return choice.kind === 'existing' ? choice.landmarkId : proposedId;
}
```

### §2. `app/src/store/routeFromRide.ts` (post-02/04 tree) — the one-home belt

**Anchors (brief 04's Edit 5B, quoted):** inside `createRouteFromDraft`:

```ts
  let referenceTimed = false;
  if (builtRef && seed) {
    const own = await timeReferenceAt(draft.rideId, wayId, builtRef.ref, seed.chainageM, 1, fs);
    if (own !== null) {
      await saveResult(own);
      referenceTimed = true;
    }
  }
  return {
    ok: true,
    wayId,
```

`getStoredResult` and `removeStoredResult` are imported on line 26
(`import { backfillMissingResults, getStoredResult, removeStoredResult, storedResultsForWay } from './resultsStore.ts';`).

**Edit 2A.** Between that block's closing `  }` and `  return {` insert:

```ts
  // virgin-cycle18 brief 06 (decision 6): this ride is now the reference of
  // `wayId`. A result it still holds on ANOTHER way (the engine scored it as
  // X, the rider re-pointed the endpoints on the card: "not X") would be a
  // second home. timeReferenceAt above overwrote it when it could time the
  // ride (results are keyed by rideId); when it could not, drop the stale one.
  if (!referenceTimed) {
    const stale = getStoredResult(draft.rideId);
    if (stale && stale.wayId !== wayId) await removeStoredResult(draft.rideId);
  }
```

### §3. `app/src/ui/routeNamingCard.tsx` (post-04/05 tree)

**Anchors (quoted):**
- 05's import line `import { matchingPlaces, newPlaceNameError, type PlaceOption } from '../store/placeSearch';`
- 05's props: `  routeForPair?: (choices: EndpointChoices) => { label: string; knownSpecLists: string[][] } | null;`
- 05's state lines `  const [endChoice, setEndChoice] = useState<EndpointChoice>({ kind: 'proposed' });`
  and `  const placeLabel = (id: string) => places.find((p) => p.id === id)?.label ?? id;`
- 05's derived block starting `  const needStart = props.startExistingLabel === null && startChoice.kind === 'proposed';`
  through `  const choices: EndpointChoices = { start: startChoice, end: endChoice };`
  (quoted in full below)
- the copy branch `          : props.loop` / `            ? props.startExistingLabel !== null`
- 05's STARTED AT fixed row (quoted below) and ENDED AT fixed row (quoted below), and the
  ENDED AT wrapper `      {!props.loop && (`
- 05's styles `  changeLink: { fontSize: 12.5, textDecorationLine: 'underline', paddingVertical: 6 },`

**Edit 3A — imports.** Replace 05's placeSearch import with

```ts
import {
  effectiveEndpointId, endpointOptions, matchingPlaces, newPlaceNameError, type PlaceOption,
} from '../store/placeSearch';
```

**Edit 3B — props.** After the `routeForPair?:` line insert:

```ts
  /** virgin-cycle18 brief 06: the landmark ids the proposals stand for (null
   * = a new place). With `places`, an existing endpoint gets a `change` link
   * that opens the picker; without them (DEMO) it stays fixed text. */
  startProposedId?: string | null;
  endProposedId?: string | null;
  /** brief 06: the place picked on RECORD at START for each end (null = none
   * / 'new' / not known — the ride detail). Listed first and marked in the
   * picker when it differs from the proposal; never preselected (decision 2). */
  startPickedId?: string | null;
  endPickedId?: string | null;
```

**Edit 3C — state.** After `  const placeLabel = …` insert:

```ts
  // brief 06: which endpoint's "change" picker is open (one at a time).
  const [pickerOpen, setPickerOpen] = useState<'start' | 'end' | null>(null);
  const startProposedId = props.startProposedId ?? null;
  const endProposedId = props.endProposedId ?? null;
  const effStartId = effectiveEndpointId(startProposedId, startChoice);
  const effEndId = effectiveEndpointId(endProposedId, endChoice);
```

**Edit 3D — `loop` follows the pair (decision 4).** Replace 05's derived block

```ts
  const needStart = props.startExistingLabel === null && startChoice.kind === 'proposed';
  const needEnd = props.endExistingLabel === null && !props.loop && endChoice.kind === 'proposed';
```

with

```ts
  const bothProposed = startChoice.kind === 'proposed' && endChoice.kind === 'proposed';
  // brief 06 (decision 4): a loop drafted on a NEW place stays a loop (the end
  // follows the start's choice — applyEndpointChoices); otherwise the pair
  // is a loop iff both ends now stand for the same place.
  const loop = bothProposed
    ? props.loop
    : props.loop && startProposedId === null
      ? true
      : effStartId !== null && effStartId === effEndId;
  const needStart = props.startExistingLabel === null && startChoice.kind === 'proposed';
  const needEnd = props.endExistingLabel === null && !loop && endChoice.kind === 'proposed';
```

Then, in the SAME derived block, `props.loop` must not be read again: verify with
`grep -n "props.loop" app/src/ui/routeNamingCard.tsx` — after this brief the only hits are the
`loop` definition above. Replace the copy branch `          : props.loop` with `          : loop`,
and the ENDED AT wrapper `      {!props.loop && (` with `      {!loop && (`.

**Edit 3E — the `change` link + picker on a proposed-existing START.** Replace 05's fixed row

```tsx
        <View style={st.fixedRow}>
          <Text style={[st.fixed, { color: t.text }]}>{startLabel}</Text>
          {startChoice.kind === 'existing' && (
            <Pressable disabled={props.busy} onPress={() => setStartChoice({ kind: 'proposed' })} hitSlop={8}>
              <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
            </Pressable>
          )}
        </View>
```

with

```tsx
        <>
          <View style={st.fixedRow}>
            <Text style={[st.fixed, { color: t.text }]}>{startLabel}</Text>
            {startProposedId === null ? (
              // brief 05: a typeahead pick on a NEW endpoint — back to typing
              startChoice.kind === 'existing' && (
                <Pressable disabled={props.busy} onPress={() => setStartChoice({ kind: 'proposed' })} hitSlop={8}>
                  <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
                </Pressable>
              )
            ) : startOptions.length > 1 ? (
              // brief 06 (decision 1): a proposal, not a verdict — open the picker
              <Pressable disabled={props.busy} onPress={() => setPickerOpen((v) => (v === 'start' ? null : 'start'))} hitSlop={8}>
                <Text style={[st.changeLink, { color: t.textDim }]}>{pickerOpen === 'start' ? 'close' : 'change'}</Text>
              </Pressable>
            ) : null}
          </View>
          {pickerOpen === 'start' && startProposedId !== null && (
            <PlacePicker
              options={startOptions}
              selectedId={effStartId}
              busy={props.busy}
              markedId={props.startPickedId ?? null}
              markedSuffix=" · picked at START"
              onPick={(id) => {
                setStartChoice(id === startProposedId ? { kind: 'proposed' } : { kind: 'existing', landmarkId: id });
                setPickerOpen(null);
              }}
            />
          )}
        </>
```

and, in the derived section (after `const effEndId = …`), add:

```ts
  // brief 06: the picker's options — every place, the START pick first when
  // it is one. Same list for both ends; the proposal is the selected pill.
  const startOptions = startProposedId !== null ? endpointOptions(places, props.startPickedId ?? null) : [];
  const endOptions = endProposedId !== null ? endpointOptions(places, props.endPickedId ?? null) : [];
```

**Edit 3F — same on END.** Replace 05's ENDED AT fixed row

```tsx
            <View style={st.fixedRow}>
              <Text style={[st.fixed, { color: t.text }]}>{endLabel}</Text>
              {endChoice.kind === 'existing' && (
                <Pressable disabled={props.busy} onPress={() => setEndChoice({ kind: 'proposed' })} hitSlop={8}>
                  <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
                </Pressable>
              )}
            </View>
```

with

```tsx
            <>
              <View style={st.fixedRow}>
                <Text style={[st.fixed, { color: t.text }]}>{endLabel}</Text>
                {endProposedId === null ? (
                  endChoice.kind === 'existing' && (
                    <Pressable disabled={props.busy} onPress={() => setEndChoice({ kind: 'proposed' })} hitSlop={8}>
                      <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
                    </Pressable>
                  )
                ) : endOptions.length > 1 ? (
                  <Pressable disabled={props.busy} onPress={() => setPickerOpen((v) => (v === 'end' ? null : 'end'))} hitSlop={8}>
                    <Text style={[st.changeLink, { color: t.textDim }]}>{pickerOpen === 'end' ? 'close' : 'change'}</Text>
                  </Pressable>
                ) : null}
              </View>
              {pickerOpen === 'end' && endProposedId !== null && (
                <PlacePicker
                  options={endOptions}
                  selectedId={effEndId}
                  busy={props.busy}
                  markedId={props.endPickedId ?? null}
                  markedSuffix=" · picked at START"
                  onPick={(id) => {
                    setEndChoice(id === endProposedId ? { kind: 'proposed' } : { kind: 'existing', landmarkId: id });
                    setPickerOpen(null);
                  }}
                />
              )}
            </>
```

**Edit 3G — a loop that stopped being a loop shows its end.** With `loop` now derived, an
existing-loop draft (`props.loop`, `endProposedId === startProposedId`) whose start changed
renders the ENDED AT block through `{!loop && (` — `needEnd` is false (the end label is
non-null), so the fixed row shows `endLabel` = `props.endExistingLabel` (the loop's place)
with its own `change`. No further edit; verify by reading.

**Edit 3H — header.** After brief 05's header paragraph (ends `the caller applies them
(applyEndpointChoices) before building.`) insert:

```
 * virgin-cycle18 brief 06 (Nathan 2026-09-29): an endpoint that matched an
 * existing place is a PROPOSAL — it renders pre-filled with a `change` link
 * that opens the same picker (every place, the START pick marked). Explicit
 * wins and sticks for this card, as effectiveFromId does for the detected
 * start. The pick is never preselected: the ride went where it went.
```

and delete the sentence fragment `An endpoint that matched an EXISTING landmark` /
`renders as fixed text, not an input.` from the header (brief 04 rewrote the line that
follows it; the fragment now reads: ` * saveUserCatalog() call. An endpoint that matched an
EXISTING landmark` — replace that line with ` * saveUserCatalog() call.` and remove the
leading `renders as fixed text, not an input. ` from 04's next line, leaving
` * virgin-cycle18 brief 04 (Nathan` … as the line's start). If those two lines do not read
as described, stop and report.

### §4. `app/src/ui/RecordScreen.tsx` (post-04/05 tree)

**Anchors (quoted):**
- `const NEW_ID = '~new';` (line 122 today)
- 04's `endedRef` line: `  const endedRef = useRef<{ rideId: string; startedAtMs: number; durationS: number | null; sportId: string | null } | null>(null);`
- in `onStart`: `      setRecovered(false);` immediately followed by `      setSession(s);` (lines 594-595 today)
- 04's Edit 2F in `onNamingSave`: `      const founding = getStoredResult(draft.rideId);` / `      if (founding) replaceRecorded(founding);`
- 05's card props: `              places={placeOptions(activeCatalog(), landmarkUsageCounts(activeCatalog()))}`
- `dropRecorded` is imported (line 55, `import { dropRecorded, rememberRide, replaceRecorded } from './lastRide';` after 04).

**Edit 4A — remember the START pick for the card.** After the `endedRef` line insert:

```ts
  // virgin-cycle18 brief 06: the from/to the RECORD tab showed when START was
  // pressed — landmark ids, null for 'new' — so the naming card can list them
  // first as "picked at START". Set in onStart, read in 'ending'; never
  // persisted (the sidecar's pick event already logs it).
  const ridePickRef = useRef<{ from: string | null; to: string | null }>({ from: null, to: null });
```

**Edit 4B — capture at START.** Between `      setRecovered(false);` and `      setSession(s);`
in `onStart` insert:

```ts
      const ctx = startContextRef.current;
      ridePickRef.current = {
        from: ctx && ctx.from !== NEW_ID ? ctx.from : null,
        to: ctx && ctx.to !== NEW_ID ? ctx.to : null,
      };
```

(`startContextRef` is declared later in the component body but assigned every render — the
`[]` callback reads `.current` at call time, exactly as the `startContext:` argument two lines
above does.)

**Edit 4C — mirror the one-home rule.** Replace `      if (founding) replaceRecorded(founding);`
with

```ts
      if (founding) replaceRecorded(founding);
      else dropRecorded(draft.rideId); // brief 06: no result any more (a stale one on another way was dropped) — leave the window too
```

**Edit 4D — the card gets the ids.** After the `places={…}` line insert:

```tsx
              startProposedId={naming.start.kind === 'existing' ? naming.start.landmarkId : null}
              endProposedId={naming.end.kind === 'existing' ? naming.end.landmarkId : null}
              startPickedId={ridePickRef.current.from}
              endPickedId={ridePickRef.current.to}
```

### §5. `app/src/ui/RideDetailScreen.tsx` (post-04/05 tree)

**Anchors (quoted):** 04's Edit 3B lines `      const founding = getStoredResult(request.rideId);` /
`      if (founding) replaceRecorded(founding); // §5 stored it; the RECORD window sees it now`;
05's `            places={placeOptions(activeCatalog(), landmarkUsageCounts(activeCatalog()))}`.
`dropRecorded` is imported (lines 49-51).

**Edit 5A.** Replace the `if (founding) …` line with

```ts
      if (founding) replaceRecorded(founding); // §5 stored it; the RECORD window sees it now
      else dropRecorded(request.rideId); // brief 06: a stale result on another way was dropped — leave the window too
```

**Edit 5B.** After the `places={…}` line insert:

```tsx
            startProposedId={offer.start.kind === 'existing' ? offer.start.landmarkId : null}
            endProposedId={offer.end.kind === 'existing' ? offer.end.landmarkId : null}
```

(No `startPickedId`/`endPickedId` here — decision 2 / Nathan's call 3.)
