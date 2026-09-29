# 04 — Every ride has a place in RESULTS: no "plain ride", free ride is a real post-ride choice

**Source: Nathan, 2026-09-29.** His words: "I went to a new place so I selected WorkNew, and at
the end of my ride I wanted to save it as a free ride because it is not a place I want to go
often, but the option was not proposed. Instead the only option on the bottom is 'no-save as a
plain ride' I believe, which should never be an option in the first place. All rides deserve a
spot somewhere, and should show up in the results tab; because this 'plain ride' was only in
rides and nowhere in results. RESULTS should contain from the start the reference rides if you
make one (which is already not the case, I do not know why?), and then when you ride a saved
ride more, all these rides should be added to that same result tab route so they are bunched
by routes then ways? Then the other option post ride is to save as a 'free ride'; which gets
its own route tab in RESULTS with all the free rides; which are rides that are properly
recorded, but are not part of a fixed oftenly taken route."

**The model this brief implements.** Every finished ride has exactly one home in RESULTS:
under its ROUTE › WAY (a matched ride; the founding/reference ride of a route from the moment
the route is created), or in the FREE RIDES group. There is no third state. The post-ride
choice on the naming card is therefore *create the route / add the way* **or** *save as a
free ride* — never "skip, keep it as a plain ride". Anything that still ends up without a
home (app killed with the card open, rides from before this brief) is filed as a free ride by
the app itself the next time RIDES or RESULTS is opened.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch `virgin`,
HEAD `e418dec`) and two throwaway repro runs outside the repo (Proof below). Executor: Sonnet,
cold, this file only. Brief 04 of `virgin-cycle18`. **Order: after brief 02** (this brief
edits two regions brief 02 writes, and calls the `clearUnmatched` it introduces — see
"Interaction with brief 02"). Independent of 01 and 03. **Before briefs 05 and 06** (which
will change `routeNamingCard.tsx` too — this brief's edits there are listed by region so the
later ones can be anchored after it).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29 (HEAD
  `e418dec`, i.e. BEFORE brief 02 lands; where brief 02 shifts lines, the anchor is given as
  the quoted text, not a line number). If a quoted line is not where the brief says, or a
  name/signature differs, **stop and report the mismatch verbatim** (file, line, expected,
  found). Never guess, never patch around it, never rule on it yourself.
- **Precondition (brief 02 landed):** `grep -n "clearUnmatched\|deriveReferenceAgainst" app/src/store/routeFromRide.ts`
  → hits for both. No hits = brief 02 has not landed — stop and report.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. Files touched (exactly these): `app/src/ui/routeNamingCard.tsx`,
  `app/src/ui/RecordScreen.tsx`, `app/src/ui/RideDetailScreen.tsx`, `app/src/ui/DemoScreen.tsx`,
  `app/src/ui/ResultsScreen.tsx`, `app/src/ui/RidesScreen.tsx`, `app/src/ui/lastRide.ts`,
  `app/App.tsx`, `app/src/store/routeFromRide.ts`, **new** `app/src/ui/rideHomes.ts`,
  `app/tests/routecreation_suite.ts`, **new** `app/tests/ridehomes_suite.ts`, `app/tests/run.ts`.
- Do not touch `app/src/store/freeRides.ts` (its API is enough), `app/src/store/resultsStore.ts`
  (brief 02's `clearUnmatched`/`isUnmatched` are what this brief needs; the structural rule in
  `freeRides.ts`'s header — resultsStore/catalog/lastRide/live never import the free-ride
  store — still holds, which is why the orphan filing lives in a `ui/` module and boot gets a
  callback), `store/routeCreation.ts`, `rideDetailModel.ts`, `rideHistoryModel.ts`,
  `resultsListModel.ts`, `recordFlow.ts`.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief, or anything under `cycles/virgin-cycle16/` / `virgin-cycle17/`.

## Symptom, restated as the code sees it — and the ROOT CAUSE, proven

Nathan picked `Work → new` on RECORD. Since cycle16 brief 01 that is an ordinary route-mode
ride; nothing locked (no way runs there), so at END:

1. `RecordScreen.tsx:623` `rememberRide(finalState, …)` — `st.track === null` → **no stored
   result** (`lastRide.ts:81-84`).
2. `:645-647` `draftRouteFromRide(...)` → a draft with `end.kind === 'new'`,
   `existingRouteId === null`, `matchedWayId === null` → `namingOfferMode(draft) === 'card'`
   (`recordFlow.ts:126-129`) → the 'ending' phase mounts **`RouteNamingCard` in its "New route"
   variant** (`RecordScreen.tsx:1240-1251`): title `New route — name where you rode`, one
   accent button `CREATE ROUTE` (`routeNamingCard.tsx:211`) and one dim line
   **`skip — keep it as a plain ride`** (`:219`, the `existingRoute === null` branch). **That is
   the whole choice set on that screen. There is no free-ride affordance on the RECORD tab at
   all** — `grep -n "markRideFree\|free" app/src/ui/RecordScreen.tsx` finds only comments and the
   index `mode !== 'free'` filter. The only place "Save as free ride" exists is the ride-detail
   overlay (`RideDetailScreen.tsx:620-628`), which opens AFTER the card is dismissed
   (`onNamingSkip` `:737-740` → end mark → `tabNav.openRide(... 'post-stop')` `:1280`) — and
   it is hidden the moment the retroactive naming card is open (`!naming`, `:620`). Nathan met
   the decision point on the RECORD card, where the free option genuinely was not proposed.
3. Skip writes nothing (`onNamingSkip` = `setNaming(null); setShowAnim('rev')`). The ride's
   state: raw JSONL + index entry, no result, no free record, no way references it →
   `rideDetailFor` → `kind: 'none'` (`rideDetailModel.ts:107-111`), RIDES row `Work → new · no
   lap` (`rideHistoryModel.ts:158-169`), and **RESULTS shows nothing for it**:
   `buildResultsRoutes` walks `storedResultsForWay` per catalog way (`resultsListModel.ts:39-41`,
   `146`) and the FREE RIDES section reads `freeRideResults()` (`ResultsScreen.tsx:61-67`). A
   ride in neither store is invisible there by construction. That is the "plain ride … only
   in rides and nowhere in results".
4. Later backfills (`RidesScreen.tsx:82-115` on every RIDES mount; `lastRide.ts:259-287` at
   boot) retry it against every catalog way, match nothing, and write the permanent
   `unmatched` marker (`resultsStore.ts:485-486`) — the same marker brief 02 is about. From
   then on it is never retried. Still no home.

**"RESULTS should contain from the start the reference rides if you make one (which is already
not the case)".** Two causes, both real:

- **(a) the marker** (brief 02, Path A): a ride named retroactively from RIDES already carries
  the marker (RIDES mounted → backfill ran → marker) and `createRouteFromDraft` never cleared
  it → never timed → RESULTS never lists the route. Brief 02 fixes the marker.
- **(b) no derive at creation.** `createRouteFromDraft` (`routeFromRide.ts:219-237`) saves the
  catalog + the ref line and returns. The founding ride's result only appears when the *next*
  backfill runs — a RIDES visit or a restart. RESULTS itself never backfills
  (`ResultsScreen.tsx` reads stores only). So: END → CREATE ROUTE → detail → RESULTS tab =
  **nothing**, until RIDES is opened. Brief 02 deliberately kept this (its decision 4: deriving
  at creation would leave a v1 result under the v2 gates `saveAdjustedGates` mints a second
  later, with no re-time) and parked the fix as its "Nathan's call 2". **This brief takes it:**
  derive at creation AND re-time at `saveAdjustedGates`, so decision 4's reason disappears.

**"when you ride a saved ride more … bunched by routes then ways"** — already true and
verified: a ride the engine locks is stored at END by `rememberRide` (`lastRide.ts:141-171`,
any lap quality), a ride it did not lock but that traces a way is stored by the next backfill
(`resultsStore.ts:436-500`), and `buildResultsRoutes` groups `way.routeId` → ways → rides
(`resultsListModel.ts:141-190`, Group-5 fix-up). Nothing to change there.

### Every path today where a finished ride can exist without appearing in RESULTS, and what closes it

| # | state | closed by |
|---|---|---|
| 1 | ended, no lock, card skipped → no result, no free record | card has no skip; free is a button (§1, §2); END with no card at all files free (§2 edit 2C); `settleRideHomes` files leftovers (§6) |
| 2 | founding ride of a new route, no result yet (no backfill since) | derive at creation + re-time on gate adjust (§5) |
| 3 | founding ride behind an `unmatched` marker | brief 02 (`clearUnmatched` in `createRouteFromDraft`); plus §5 derives directly, so the marker no longer matters at creation |
| 4 | founding ride whose recording has a GPS hole → lap `missed` → the candidate loop refuses it (`resultsStore.ts:477`) → marker | §5 stores the reference's own result at ANY quality (same as `rememberRide` does live) — it is listed under its way as NO TIME, never ranks (D-028, `ranks()`), never colours |
| 5 | app killed while the card is up; rides from before this brief (Nathan's WorkNew) | `settleRideHomes` on RIDES and RESULTS mount (§6, §7, §8) |
| 6 | legacy `mode: 'free'` rides (pre-cycle16 free mode) with zero crossings → never got a `free:<ms>` record, excluded from backfill forever | `settleRideHomes` files them free (they are free rides by definition) |
| 7 | a free-labelled ride that a later backfill ALSO times on a way (double home; today possible, more likely once orphans are auto-filed) | free rides are excluded from every backfill (§6 RIDES/RESULTS, §9 boot); RESULTS hides a free record that has a way result (§7) — route wins, as `rideDetailFor`/`buildRideRows` already decide |
| 8 | ride still `recording` (crashed mid-ride, not healed) | not a finished ride — out of scope; RIDES shows it as it always did |

### Proof (throwaway scripts against the real modules, 2026-09-29, memory fs)

- `createRouteFromDraft` on a straight synthetic 200-fix ride (the WP-H harness's
  `wphFixes(200, 0.0002, …)`, ref 4395 m, seeded gates `44,1099,2198,3296,4351`), then
  `deriveRideResult` of that same ride against `out.adjust.ref` + `out.adjust.chainageM`,
  `gateSetVersion 1`: **`wayId way:create1, lap clean, sectors clean×4`**. Nudged gate 2 by
  +25 m (WP-H 18's nudge), `gateSetVersion 2`: **clean**. The candidate loop
  (`backfillMissingResults`) stores the same ride `clean` at v1 — so deriving directly at
  creation stores exactly what the next boot would have stored.
- Same ride with fixes 155–185 removed (a ~660 m hole at 3.4–4.1 km): v1 derive →
  `lap missed, sectors clean,clean,clean,missed`; every nudge of gate 3 (3500/3700/3900) →
  `missed`. A hole inside a sector is a missed sector regardless of gate placement, and the
  seeded gates span 1 %–99 % of the line, so **a reference that times clean at v1 cannot be
  made to fail by a tap-then-nudge at creation** (there is nowhere for a hole to hide between
  1 % and 99 % that v1 did not already cross). Hence §5 needs no "refuse the nudge" precheck
  (brief 02's decision 2 is for EDIT GATES on existing ways, where v1 can be anything); it
  re-times after the save and reports `referenceRetimed`.

## Decisions (pre-resolved — do not re-open)

1. **The naming card never offers "keep it as a plain ride".** Its second action is **SAVE AS
   FREE RIDE** (an outlined secondary button, same geometry as CREATE ROUTE) in both
   no-match variants (`existingRoute === null`, and `existingRoute && !matchedWayLabel`). The
   matched-way variant (`existingRoute && matchedWayLabel`) keeps cycle17 03's dim
   `keep it as <way>` line — that ride is already timed under that way, it HAS a home. New
   required prop `onSaveFree`. The card stays dumb: it does not know what "free" writes.
2. **A free ride is a post-ride label (cycle16 02), written by the caller.** RECORD's 'ending'
   phase writes it with `markRideFree(rideId, startedAtMs, durationS, sportId)` from the ended
   session (a new `onNamingFree`), then plays the end mark exactly as skip did — the post-stop
   detail then opens on the FREE RIDE card. RideDetail's card passes its existing `onSaveFree`.
3. **A ride that ends with no card at all (draft `null`: unreadable or under the draft's
   minimum length) and no lock is filed free at END.** Nothing else could ever claim it (a
   ride too short to draft a route from is too short to be a way), and "all rides deserve a
   spot". Three lines in `onEnd`.
4. **Orphans are filed by the app, not by Nathan.** New `ui/rideHomes.ts` →
   `settleRideHomes(fs)`: reads `index.json`, runs the SAME backfill pass RidesScreen runs today
   (moved there verbatim, sport-scoped) **minus rides that carry a free record**, then files
   every ended ride that has no way result, is no way's reference, and has no free record, as
   a free ride (its own `startMs`, `endMs - startMs`, `effectiveRideSportId(sportId)`).
   RidesScreen's mount effect calls it instead of its inline backfill; ResultsScreen calls it
   on mount too (so Nathan's existing plain rides appear in RESULTS the first time he opens
   RESULTS after the update, without visiting RIDES first). Idempotent; never throws.
5. **Free rides are never backfilled** — everywhere. RIDES/RESULTS through
   `settleRideHomes`'s filter; boot through a new optional `skipBackfill` callback on
   `initRideHistory` that `App.tsx` supplies from the free-ride store (App now awaits
   `initFreeRidePersistence` BEFORE `initRideHistory` so the callback sees the records).
   Rationale: D-025's own rule ("a free ride must never get silently re-derived as a route
   PB") applied to the label that replaced free mode. The way back is "Not a free ride"
   (decision 7).
6. **The naming offer is shown on the FREE RIDE card too** (drops cycle16 02's decision 5).
   Nathan's WorkNew, auto-filed free, is one tap from becoming a route: "Make this the
   reference of a new route" → `createRouteFromDraft` → the free record is removed by the
   caller (`unmarkRideFree`) — route wins, the two labels stay exclusive by construction. No
   two-step "Not a free ride" first.
7. **"Not a free ride" stays, and now also means "retry"**: it removes the record AND clears
   the ride's `unmatched` marker (`clearUnmatched`, brief 02), so the next
   `settleRideHomes`/boot backfill re-matches it against today's ways. If it still matches
   nothing, that pass files it free again — honest: it has no other home. The "Save as free
   ride" button on the transient `kind === 'none'` card stays as is.
8. **`createRouteFromDraft` derives and stores the founding ride's result** (supersedes brief
   02's decision 4) through a new `timeReferenceAt(rideId, wayId, ref, gates, version, fs)`
   helper that stores at ANY lap quality when `result.wayId === wayId` (brief 02's
   `deriveReferenceAgainst` is kept for its block decision — it returns null for a
   `missed`/`estimated` lap, which is right for "would this edit LOSE a timed reference" and
   wrong for "does this ride have a home"). `saveAdjustedGates(a, chainageM, fs)` re-times the
   reference at the minted v2 after the catalog write and reports `referenceRetimed`; both
   outcomes grow additively. `editWayGates` (brief 02's reset block) gets the same any-quality
   fallback so a gate edit never leaves the reference result-less either.
9. **RESULTS copy:** the `NO RESULTS YET — RIDE A ROUTE FIRST` line shows only when there are
   neither routes nor free rides. FREE RIDES rows keep their date + duration label.

## Interaction with brief 02 (must be read together)

- 02 lands first. It adds `clearUnmatched`/`isUnmatched` (resultsStore), `deriveReferenceAgainst`
  and the `BACKFILL_ENGINE_VERSION, saveResult, deriveRideResult, RideResult` imports
  (routeFromRide), the `clearUnmatched(draft.rideId)` call in `createRouteFromDraft`, and the
  reference-first reset in `editWayGates`. This brief REUSES those imports and helpers.
- This brief overwrites two things 02 wrote: the comment+call block after
  `if (builtRef) await saveUserRef(wayId, builtRef.ref);` in `createRouteFromDraft` (02's Edit
  2H — the comment says "Not derived here on purpose … (decision 4)", which stops being true),
  and the single line `if (refNext !== null) await saveResult(refNext);` in `editWayGates`
  (02's Edit 2F). Both are quoted verbatim in §5 below.
- This brief flips ONE assertion in 02's test `c18-02 4`:
  `assert(wphResultsStore.getStoredResult('create9') === null, 'create does NOT derive itself (decision 4)');`
  → the founding ride IS stored (§10). Every other 02 test is unaffected (they go through
  `editWayGates`/`promoteRideToReference`, whose clean-path behaviour is unchanged).
- Brief 02's "Nathan's call 2" (same-session dot after creating a way) is delivered here as a
  side effect of §5 + the `replaceRecorded` mirroring in both callers.

## Files to touch

### §1. `app/src/ui/routeNamingCard.tsx` — regions touched: header (lines 17-18), props (after line 57), the buttons block (lines 206-221), styles (after line 244). Nothing between lines 60 and 205 (the inputs/specs briefs 05 and 06 will edit) is touched.

**Anchors:** lines 17-18 `renders as fixed text, not an input. SKIP is always available and loses` /
`nothing — the ride itself was already saved before this card exists.`; line 56 `onSave: (names: RouteNames) => void;`;
line 57 `onSkip: () => void;`; lines 206-221 (the CREATE/ADD button and the skip `Pressable`,
quoted below); line 243 `saveBtn: {...}`; line 244 `saveText: {...}`.

**Edit 1A — header, lines 17-18.** Replace the two lines with:

```
 * renders as fixed text, not an input. virgin-cycle18 brief 04 (Nathan
 * 2026-09-29): there is no "skip — keep it as a plain ride" any more — every
 * ride has a home. The second action is SAVE AS FREE RIDE (`onSaveFree`, the
 * caller writes the label) in both no-match variants; only the matched-way
 * variant keeps a plain `keep it as <way>` exit (`onSkip`), because that
 * ride is already timed under that way.
```

**Edit 1B — props.** After line 57 `  onSkip: () => void;` insert:

```ts
  /** virgin-cycle18 brief 04: SAVE AS FREE RIDE — shown instead of the old
   * plain-ride skip whenever this ride is not already timed under a way
   * (new-route card, and the "new way on <route>" card with no matched way).
   * The caller files the free-ride record (store/freeRides.ts markRideFree). */
  onSaveFree: () => void;
```

**Edit 1C — the buttons, lines 206-221.** Replace

```tsx
      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, (!complete || props.busy) && st.dim]}
        disabled={!complete || props.busy}
        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs })}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>{existingRoute ? 'ADD WAY' : 'CREATE ROUTE'}</Text>
      </Pressable>
      <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
        <Text style={[st.skipText, { color: t.textDim }]}>
          {existingRoute
            ? props.matchedWayLabel
              ? `keep it as ${props.matchedWayLabel}`
              : 'skip — keep it as a plain ride'
            : 'skip — keep it as a plain ride'}
        </Text>
      </Pressable>
```

with

```tsx
      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, (!complete || props.busy) && st.dim]}
        disabled={!complete || props.busy}
        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs })}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>{existingRoute ? 'ADD WAY' : 'CREATE ROUTE'}</Text>
      </Pressable>
      {existingRoute && props.matchedWayLabel ? (
        // cycle17 03: the ride is already timed as this way — keeping it costs nothing.
        <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
          <Text style={[st.skipText, { color: t.textDim }]}>{`keep it as ${props.matchedWayLabel}`}</Text>
        </Pressable>
      ) : (
        // virgin-cycle18 brief 04: the other real choice. No plain-ride skip.
        <Pressable
          style={[st.freeBtn, { borderColor: t.cardBorder }, props.busy && st.dim]}
          disabled={props.busy}
          onPress={props.onSaveFree}
        >
          <Text style={[st.freeText, { color: t.text }]}>SAVE AS FREE RIDE</Text>
        </Pressable>
      )}
```

**Edit 1D — styles.** After line 244 `  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },` insert:

```ts
  freeBtn: { marginTop: 8, borderWidth: 1, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  freeText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
```

`st.skipBtn`/`st.skipText` stay (still used by the matched branch).

### §2. `app/src/ui/RecordScreen.tsx`

**Anchors:** line 55 `import { dropRecorded, rememberRide } from './lastRide';`; line 75
`import { removeStoredResult } from '../store/resultsStore';`; line 77 (imports
`effectiveRideSportId` from `../store/sports`) and line 80 (imports `currentSports` from
`../store/sportStore`) — both already present; line 224
`const endedRef = useRef<{ rideId: string; startedAtMs: number } | null>(null);`; line 618
`endedRef.current = s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : null;`; line 623
`rememberRide(finalState, …)`; lines 628-629 `const sum = await stopTracking();` /
`setLastSummary(sum);`; lines 645-647 (`const draft = s` / `? await draftRouteFromRide(…)` / `: null;`);
lines 737-740 `onNamingSkip`; line 766 `      setNaming(null);` (in `onNamingSave`, right after
the `if (!out.ok) { … return; }` block); line 797 `const out = await saveAdjustedGates(a, chainageM);`;
lines 803-804 `setAdjust(null);` / `setShowAnim('rev');` (inside `onAdjustSave`'s try, after
the `if (!out.ok)` block); lines 1249-1250 `onSave={onNamingSave}` / `onSkip={onNamingSkip}`.

**Edit 2A — imports.** Line 55 → `import { dropRecorded, rememberRide, replaceRecorded } from './lastRide';`.
Line 75 → `import { getStoredResult, removeStoredResult } from '../store/resultsStore';`.
After line 75 insert `import { markRideFree } from '../store/freeRides';`.

**Edit 2B — `endedRef` carries what a free record needs.** Line 224 →

```ts
  const endedRef = useRef<{ rideId: string; startedAtMs: number; durationS: number | null; sportId: string | null } | null>(null);
```

Line 618 →

```ts
      endedRef.current = s
        ? { rideId: s.rideId, startedAtMs: s.startedAtMs, durationS: null, sportId: effectiveRideSportId(s.sportId, currentSports()) }
        : null;
```

After line 629 `      setLastSummary(sum);` insert:

```ts
      // virgin-cycle18 brief 04: the ride's wall-clock length, for a free-ride
      // record written from the naming card (onNamingFree) — same value the
      // ride detail's own "Save as free ride" takes from RideMeta.
      if (endedRef.current && sum) endedRef.current = { ...endedRef.current, durationS: Math.max(0, (sum.endMs - sum.startMs) / 1000) };
```

(`RideSummary` has `startMs`/`endMs` — `location/index.ts:30-35`; `ActiveSession.sportId` is
`string | undefined` — `location/session.ts:35` — which is what `effectiveRideSportId` takes.)

**Edit 2C — END with no card and no lock files free (decision 3).** After the `draft`
statement (line 647 `        : null;`) insert:

```ts
      // virgin-cycle18 brief 04 (decision 3): nothing locked AND nothing to
      // offer (no draft: unreadable / too short) — no card will ask, so the
      // ride is filed free right here. A locked ride already has a stored
      // result from rememberRide above; a draftable ride gets the card.
      if (s && finalState.track === null && draft === null) {
        const e = endedRef.current;
        if (e) markRideFree(e.rideId, e.startedAtMs, e.durationS, e.sportId);
      }
```

**Edit 2D — the card's free exit.** After `onNamingSkip` (line 740 `  }, []);`) insert:

```ts
  // virgin-cycle18 brief 04: SAVE AS FREE RIDE on the naming card. Files the
  // label from the ended session's identity (endedRef, set in onEnd), then
  // proceeds exactly as skip did — the post-stop detail opens on the FREE
  // RIDE card. The ride was saved before the card existed; this only says
  // where it lives.
  const onNamingFree = useCallback(() => {
    const e = endedRef.current;
    if (e) markRideFree(e.rideId, e.startedAtMs, e.durationS, e.sportId);
    setNaming(null);
    setShowAnim('rev');
  }, []);
```

**Edit 2E — the card gets it.** Between line 1249 `              onSave={onNamingSave}` and
line 1250 `              onSkip={onNamingSkip}` insert `              onSaveFree={onNamingFree}`.

**Edit 2F — the founding ride's result reaches this session's window.** In `onNamingSave`,
after line 766 `      setNaming(null);` insert:

```ts
      // virgin-cycle18 brief 04: createRouteFromDraft stored the founding
      // ride's own result (§5) — mirror it so a second ride in this session
      // already races it (brief 02's "Nathan's call 2").
      const founding = getStoredResult(draft.rideId);
      if (founding) replaceRecorded(founding);
```

**Edit 2G — gate adjust re-time.** Line 797 → `      const out = await saveAdjustedGates(a, chainageM, createExpoFsAdapter());`
and after line 803 `      setAdjust(null);` insert:

```ts
      // virgin-cycle18 brief 04: the v2 re-time of the reference is what the
      // next ride races — mirror it (replaceRecorded drops it if it no longer ranks).
      const refRide = getStoredResult(a.wayId.startsWith('way:') ? a.wayId.slice('way:'.length) : a.wayId);
      if (refRide) replaceRecorded(refRide);
```

`wayId` is `` `way:${draft.rideId}` `` (`routeFromRide.ts:230`), so the reference ride id is the
way id without its `way:` prefix — the derivation `createRouteFromDraft` makes. If that line
does not read `const wayId = \`way:${draft.rideId}\`;`, stop and report.

### §3. `app/src/ui/RideDetailScreen.tsx`

**Anchors:** lines 45-47 the `resultsStore` import (`getStoredResult, removeStoredResult,
setIgnoredFromRanking, storedResultsForWay`); line 48 the `freeRides` import (`freeRideNear,
freeRideResults, markRideFree, unmarkRideFree`); lines 49-51 the `lastRide` import — includes
`replaceRecorded` already; lines 283-286
(`setNaming(false);` / `setDraft(null);` / `setTick((v) => v + 1); // model re-reads: referenceOf = the new route` / `if (out.adjust) setAdjust(out.adjust);`);
lines 307-311 `onUnsaveFree`; line 317 `const out = await saveAdjustedGates(adjust, chainageM);`;
line 322 `setAdjust(null);`; line 611 the offer button's condition; lines 650-651
`onSave={(names) => void onNamingSave(names)}` / `onSkip={() => setNaming(false)}`.

**Edit 3A — import.** Lines 45-47 → add `clearUnmatched`:

```ts
import {
  clearUnmatched, getStoredResult, removeStoredResult, setIgnoredFromRanking, storedResultsForWay,
} from '../store/resultsStore.ts';
```

**Edit 3B — creation wins over free; mirror the founding result.** Replace lines 283-286

```tsx
      setNaming(false);
      setDraft(null);
      setTick((v) => v + 1); // model re-reads: referenceOf = the new route
      if (out.adjust) setAdjust(out.adjust);
```

with

```tsx
      // virgin-cycle18 brief 04 (decision 6): a free ride that just became a
      // route's reference is not free any more — route wins, one home.
      if (model.free !== null) unmarkRideFree(model.free.rideId);
      const founding = getStoredResult(request.rideId);
      if (founding) replaceRecorded(founding); // §5 stored it; the RECORD window sees it now
      setNaming(false);
      setDraft(null);
      setTick((v) => v + 1); // model re-reads: kind 'route', referenceOf = the new route
      if (out.adjust) setAdjust(out.adjust);
```

**Edit 3C — "Not a free ride" = retry (decision 7).** Replace lines 307-311

```tsx
  function onUnsaveFree() {
    if (model.free === null) return;
    unmarkRideFree(model.free.rideId);
    setTick((v) => v + 1); // model re-reads: free = null → kind 'none', offer back
  }
```

with

```tsx
  function onUnsaveFree() {
    if (model.free === null) return;
    unmarkRideFree(model.free.rideId);
    // virgin-cycle18 brief 04 (decision 7): also drop the ride's permanent
    // unmatched marker so the next settleRideHomes/boot backfill re-matches
    // it against today's ways. Matches nothing → filed free again by that pass.
    void clearUnmatched(request.rideId);
    setTick((v) => v + 1); // model re-reads: free = null → kind 'none', offer + "Save as free ride" back
  }
```

**Edit 3D — gate adjust re-time.** Line 317 → `      const out = await saveAdjustedGates(adjust, chainageM, createExpoFsAdapter());`
and after line 322 `      setAdjust(null);` insert:

```tsx
      const refRide = getStoredResult(request.rideId); // virgin-cycle18 brief 04: the v2 re-time
      if (refRide) replaceRecorded(refRide);
      setTick((v) => v + 1); // sectors/lap re-read at the minted gates
```

**Edit 3E — the offer shows on the FREE RIDE card too (decision 6).** Line 611
`        {offer !== null && !naming && adjust === null && model.kind !== 'free' ? (` →
`        {offer !== null && !naming && adjust === null ? (`.

**Edit 3F — the card's free exit.** Between line 650 and 651 insert
`            onSaveFree={onSaveFree}`. (`onSaveFree`, lines 297-306, already closes the card
and re-reads the model.)

### §4. `app/src/ui/DemoScreen.tsx` — theatre only, nothing written

**Anchors:** line 585 `const onDemoNamingSkip = useCallback(() => setShowAnim('rev'), []);`;
lines 747-748 `onSave={onDemoNamingSave}` / `onSkip={onDemoNamingSkip}` (FIRST RIDE card);
lines 761-762 `onSave={onDemoAddWaySave}` / `onSkip={onDemoNamingSkip}` (SECOND/TENTH card).

**Edit 4A:** after line 747 insert `                onSaveFree={onDemoNamingSkip}`; after line
761 insert `                onSaveFree={onDemoNamingSkip}`. FIRST RIDE now shows the real
SAVE AS FREE RIDE button (plays the end mark, as skip did); the SECOND/TENTH card passes
`matchedWayLabel` so it keeps `keep it as Home → Work` — DEMO stays a faithful copy of the
real card without a store write.

### §5. `app/src/store/routeFromRide.ts` (post-brief-02 tree)

**Anchors (quoted, since brief 02 shifts lines):**
- the `CreateRouteOutcome` type: `  | { ok: true; wayId: string; adjust: GateAdjustDraft | null }`
- in `createRouteFromDraft`: `  if (builtRef) await saveUserRef(wayId, builtRef.ref);` followed
  by brief 02's inserted block (starts with the comment line
  `  // virgin-cycle18 brief 02 (decision 3): the founding ride matched nothing`, ends with
  `  await clearUnmatched(draft.rideId);`), then `  return {` / `    ok: true,` / `    wayId,` /
  `    adjust: builtRef && seed ? { wayId, ref: builtRef.ref, refLengthM: builtRef.ref.length, chainageM: seed.chainageM } : null,` / `  };`
- `export type AdjustOutcome = { ok: true; moved: boolean } | { ok: false; errors: string[] };`
- `export async function saveAdjustedGates(a: GateAdjustDraft, chainageM: number[]): Promise<AdjustOutcome> {`
  through `  return errs.length > 0 ? { ok: false, errors: errs } : { ok: true, moved: true };` / `}`
- brief 02's helper `export async function deriveReferenceAgainst(` (insert §5C right AFTER
  its closing `}`), and in `editWayGates` the line `  if (refNext !== null) await saveResult(refNext);`.

**Edit 5A — `CreateRouteOutcome`.** Replace the `ok: true` branch with:

```ts
  | {
      ok: true; wayId: string; adjust: GateAdjustDraft | null;
      /** virgin-cycle18 brief 04: true iff the founding ride's own result is
       * now stored on this way (any lap quality — see timeReferenceAt). */
      referenceTimed: boolean;
    }
```

**Edit 5B — `createRouteFromDraft` derives the founding ride.** Replace brief 02's block (from
its `  // virgin-cycle18 brief 02 (decision 3): the founding ride matched nothing` comment line
down to and including `  await clearUnmatched(draft.rideId);`) plus the `return { … };` that
follows, with:

```ts
  // virgin-cycle18 brief 02 (decision 3) + brief 04 (decision 8): the
  // founding ride matched nothing when it ended — a backfill since (RIDES
  // visit, restart) may have left a permanent unmatched marker. Clear it,
  // then store this ride's OWN result against the way it just founded, at
  // the v1 gates, so RESULTS lists the route from this moment (no backfill
  // needed) and a second ride this session already races it. Any lap
  // quality is stored (a missed sector = NO TIME under the way, never a
  // rank — D-028), exactly as rememberRide stores a live ride.
  // saveAdjustedGates re-times it if the gates move a moment later.
  await clearUnmatched(draft.rideId);
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
    adjust: builtRef && seed ? { wayId, ref: builtRef.ref, refLengthM: builtRef.ref.length, chainageM: seed.chainageM } : null,
    referenceTimed,
  };
```

`seed` is the `{ chainageM }` built on the lines above (`const seed = builtRef ? { chainageM:
seedGateChainages(…) } : undefined;`) and the v1 gate set saved by `buildRouteCreationCatalog`
IS `seed.chainageM` at `version: 1` (`routeCreation.ts:336-340`; WP-H 17 asserts it) — if
either differs, stop.

**Edit 5C — the helper.** Immediately after brief 02's `deriveReferenceAgainst` function
(its closing `}`), insert:

```ts
/** virgin-cycle18 brief 04 (decision 8): the reference ride's result against
 * `gates` at ANY lap quality — the "does this ride have a home" question,
 * where deriveReferenceAgainst above answers "would this edit lose a TIMED
 * reference" (it returns null for missed/estimated laps on purpose). null
 * only when the recording is absent/unreadable/too short, or when derive
 * itself disowns the way (missed sectors AND no lap bounds — derive.ts:110).
 * Same reader, same engine version, same `source` as the backfill, so the
 * stored result is byte-compatible with a loop-derived one. */
export async function timeReferenceAt(
  rideId: string, wayId: string, ref: RefLine, gates: number[], gateSetVersion: number, fs: FsAdapter,
): Promise<RideResult | null> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null || fixes.length < 2) return null;
  const result = deriveRideResult({
    rideId,
    t: fixes.map((f) => f.tUnixMs / 1000),
    lat: fixes.map((f) => f.lat),
    lon: fixes.map((f) => f.lon),
    ref, gates, wayId, gateSetVersion,
    engineVersion: BACKFILL_ENGINE_VERSION, source: 'app',
  });
  return result.wayId === wayId ? result : null;
}
```

**Edit 5D — `saveAdjustedGates` takes `fs`, re-times, reports.** Replace the `AdjustOutcome`
type, the doc comment above `saveAdjustedGates` and the whole function with:

```ts
export type AdjustOutcome =
  | { ok: true; moved: false }
  | {
      ok: true; moved: true;
      /** virgin-cycle18 brief 04: true iff the reference ride's result was
       * re-derived at the minted v2 and stored; false = its v1 result was
       * removed (a stale-chainage result must not survive) and the way has
       * no reference result until the next gate save. */
      referenceRetimed: boolean;
    }
  | { ok: false; errors: string[] };

/** RecordScreen.tsx's onAdjustSave decision + try-body. KEEP costs nothing
 * (the seeded v1 set was already saved by CREATE WAY): unmoved gates return
 * `{ ok:true, moved:false }` with no write. Moved gates mint VERSION 2
 * through addGateSet ("history is never deleted", store/catalog.ts).
 * virgin-cycle18 brief 04: the founding ride's v1 result (stored by
 * createRouteFromDraft) is re-timed against the moved gates right here, so
 * it never sits under chainages that are no longer the way's. `fs` is
 * required, as everywhere else in this module (readRideFixes' note). */
export async function saveAdjustedGates(a: GateAdjustDraft, chainageM: number[], fs: FsAdapter): Promise<AdjustOutcome> {
  const moved = chainageM.some((v, i) => Math.abs(v - a.chainageM[i]) > 1e-6);
  if (!moved) return { ok: true, moved: false };
  const errs = await saveUserCatalog(
    addGateSet(userCatalog(), {
      wayId: a.wayId,
      version: 2,
      chainageM,
      createdAtMs: Date.now(),
      origin: 'geometric',
      note: 'adjusted at save (tap-then-nudge) from the seeded proposal',
    }),
  );
  if (errs.length > 0) return { ok: false, errors: errs };
  const refRideId = userCatalog().ways.find((w) => w.id === a.wayId)?.referenceRideId ?? null;
  if (refRideId === null) return { ok: true, moved: true, referenceRetimed: false };
  const own = await timeReferenceAt(refRideId, a.wayId, a.ref, chainageM, 2, fs);
  if (own !== null) {
    await saveResult(own);
    return { ok: true, moved: true, referenceRetimed: true };
  }
  await removeStoredResult(refRideId);
  return { ok: true, moved: true, referenceRetimed: false };
}
```

`removeStoredResult` is already imported (brief 02's Edit 2A keeps it). `Way.referenceRideId`
is optional on the type (`?.referenceRideId ?? null` handles both `undefined` and a missing way).

**Edit 5E — `editWayGates`: the reference never ends result-less.** Replace brief 02's line
`  if (refNext !== null) await saveResult(refNext);` with:

```ts
  if (refNext !== null) {
    await saveResult(refNext);
  } else if (refRideId !== null) {
    // virgin-cycle18 brief 04: no TIMED result under the new gates (brief 02's
    // decision 2 let this through: it was not timed before either) — store
    // whatever this way's own reference derives to, so it keeps its home
    // under the way as NO TIME instead of becoming an orphan.
    const own = await timeReferenceAt(refRideId, wayId, ref, chainageM, version, fs);
    if (own !== null) await saveResult(own);
  }
```

(`ref`, `chainageM`, `version`, `refRideId`, `wayId`, `fs` are all in scope at that point in
brief 02's `editWayGates` — `const ref = userRefFor(way.refLineId);`, the function's
`chainageM` parameter, and 02's Edit 2E block. If any is not, stop.) Brief 02's
`referenceRetimed` on that path then reads true when a NO TIME result was stored — its
GateAdjustScreen alert ("could not be timed … recording missing or unreadable") stays
correct for the only case it still fires on.

### §6. New `app/src/ui/rideHomes.ts`

```ts
/**
 * virgin-cycle18 brief 04 (Nathan 2026-09-29): "All rides deserve a spot
 * somewhere, and should show up in the results tab." Every FINISHED ride has
 * exactly one home in RESULTS — under its route › way (a stored result with
 * a wayId, or the way it is the reference of) or in FREE RIDES (a free-ride
 * record). settleRideHomes() makes that true for whatever is on disk:
 *
 *  1. the backfill pass RidesScreen ran inline until this brief (ended
 *     rides, per-ride sport scoping, `mode !== 'free'`), now ALSO skipping
 *     rides that carry a free record — a free ride is never re-derived as a
 *     route ride (D-025's rule, carried over to the label that replaced
 *     free mode; the way back is "Not a free ride" on the ride detail);
 *  2. then every ended ride still without a home is filed as a free ride
 *     (its own startMs, wall-clock duration, effective sport).
 *
 * Idempotent (both steps skip what is already settled), never throws, cheap
 * after the first pass. Called on RIDES and RESULTS mount. Boot runs only
 * step 1 (lastRide.initRideHistory, with the same free-record skip handed
 * in from App.tsx — lastRide must not import this store). Lives in ui/
 * because store/resultsStore, store/catalog and ui/lastRide are barred from
 * importing store/freeRides (its header's structural rule) — a ui/ module
 * that reads all of them is the only place this composition can sit.
 */
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeIndex } from '../storage/rideIndex.ts';
import type { IndexEntry } from '../storage/types.ts';
import { backfillMissingResults, getStoredResult } from '../store/resultsStore.ts';
import { freeRideNear, freeRideResults, markRideFree } from '../store/freeRides.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { effectiveRideSportId, wayIdsOfSport } from '../store/sports.ts';
import { currentSports } from '../store/sportStore.ts';

export type RideHomeEntry = Pick<IndexEntry, 'rideId' | 'startMs' | 'endMs' | 'status' | 'mode' | 'sportId'>;

/** Step-1 candidates: ended, not recorded in the retired free MODE, and not
 * carrying a free record (`isFree` — the caller's freeRideNear by startMs,
 * the same tolerance match RIDES/detail resolve the label with). Pure. */
export function backfillCandidates(
  entries: readonly RideHomeEntry[],
  isFree: (rideId: string, startMs: number) => boolean,
): RideHomeEntry[] {
  return entries.filter((r) => r.status === 'ended' && r.mode !== 'free' && !isFree(r.rideId, r.startMs));
}

/** Step-2 candidates: ended (endMs known), no stored result on a way, not a
 * way's reference, no free record. Legacy `mode: 'free'` rides ARE
 * candidates (they are free rides by definition; only those with >=1 gate
 * crossing ever got a record under WP-B). Pure. */
export function orphanRides(
  entries: readonly RideHomeEntry[],
  hasWayResult: (rideId: string) => boolean,
  isReference: (rideId: string) => boolean,
  isFree: (rideId: string, startMs: number) => boolean,
): RideHomeEntry[] {
  return entries.filter((r) => (
    r.status === 'ended' && r.endMs !== null
    && !hasWayResult(r.rideId) && !isReference(r.rideId) && !isFree(r.rideId, r.startMs)
  ));
}

/** Both steps against the live stores. Returns the rideIds filed free in
 * this pass (empty when everything already had a home). Never throws. */
export async function settleRideHomes(fs: FsAdapter): Promise<string[]> {
  const filed: string[] = [];
  try {
    const text = await fs.readText('index.json');
    const rideIndex = text !== null ? decodeIndex(text) : null;
    if (rideIndex === null) return filed;
    const isFree = (_rideId: string, startMs: number) => freeRideNear(freeRideResults(), startMs) !== null;

    // 1. RidesScreen.tsx's backfill effect, verbatim, minus free rides.
    const candidates = backfillCandidates(rideIndex.rides, isFree);
    const sportByRideId = new Map(candidates.map((r) => [r.rideId, r.sportId]));
    await backfillMissingResults(fs, candidates.map((r) => r.rideId), (rideId) => {
      const f = currentSports();
      return wayIdsOfSport(currentCatalog(), effectiveRideSportId(sportByRideId.get(rideId), f), f);
    });

    // 2. Whatever still has no home is a free ride.
    const ways = currentCatalog().ways;
    const orphans = orphanRides(
      rideIndex.rides,
      (rideId) => getStoredResult(rideId)?.wayId != null,
      (rideId) => ways.some((w) => w.referenceRideId === rideId),
      isFree,
    );
    for (const r of orphans) {
      markRideFree(
        r.rideId,
        r.startMs,
        r.endMs !== null ? Math.max(0, (r.endMs - r.startMs) / 1000) : null,
        effectiveRideSportId(r.sportId, currentSports()),
      );
      filed.push(r.rideId);
    }
  } catch { /* best-effort — the screens render off whatever is already stored */ }
  return filed;
}
```

`IndexEntry` is `storage/types.ts:76-97` (`rideId, file, startMs, endMs: number | null, nFixes,
status, mode?, sportId?`); `decodeIndex` is `storage/rideIndex.ts:15`; `wayIdsOfSport` /
`effectiveRideSportId` are what RidesScreen imports from `../store/sports` today. If any
signature differs, stop.

### §7. `app/src/ui/ResultsScreen.tsx`

**Anchors:** line 24 `import { storedResultsForWay } from '../store/resultsStore';`; line 31
`import { useTheme } from './themeContext';`; lines 42-45 the mount tick effect
(`const [tick, setTick] = useState(0);` / `useEffect(() => {` / `setTick((v) => v + 1);` / `}, []);`);
lines 61-67 the `freeRides` memo; line 99 `      {routes.length === 0 ? (`.

**Edit 7A — imports.** Line 24 → `import { getStoredResult, storedResultsForWay } from '../store/resultsStore';`.
After line 31 insert:

```ts
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { settleRideHomes } from './rideHomes';
```

**Edit 7B — settle on mount.** Replace lines 43-45

```ts
  useEffect(() => {
    setTick((v) => v + 1);
  }, []);
```

with

```ts
  // virgin-cycle18 brief 04: RESULTS settles homes itself (backfill what can
  // be timed, file the rest as free rides — ui/rideHomes.ts), so a ride is
  // never "only in RIDES": Nathan's pre-brief plain rides appear here the
  // first time this tab opens, and a route created at END shows its
  // reference without a RIDES visit in between. The tick then re-reads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await settleRideHomes(createExpoFsAdapter());
      if (!cancelled) setTick((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
```

**Edit 7C — a free record whose ride also has a way result is not listed twice.** In the
`freeRides` memo (lines 61-67) change

```ts
      .filter((r) => r.sportId === null || r.sportId === sportId)
```

to

```ts
      .filter((r) => r.sportId === null || r.sportId === sportId)
      // brief 04 table row 7: route wins — same precedence as rideDetailFor/buildRideRows.
      .filter((r) => getStoredResult(r.rideId)?.wayId == null)
```

**Edit 7D — copy (decision 9).** Line 99 `      {routes.length === 0 ? (` →
`      {routes.length === 0 && freeRides.length === 0 ? (`.

### §8. `app/src/ui/RidesScreen.tsx`

**Anchors:** lines 13-17 imports (`decodeIndex`; `backfillMissingResults, getStoredResult`;
`freeRideNear, freeRideResults`; `currentCatalog`; `effectiveRideSportId, wayIdsOfSport`);
line 23 `import { lapValues } from './colourModel';`; lines 82-115 the backfill effect (starts
`  useEffect(() => {` right after the comment line
`  // entirely if the index is missing/corrupt rather than guessing at status.` (line 81);
lines 86-106 run from `      setBackfilling(true);` through
`      } catch { /* best-effort — the row still renders off whatever is already stored */ }`;
ends `  }, [rides]);` on line 115).

**Edit 8A — the effect body.** Replace lines 86-106 with:

```tsx
      setBackfilling(true);
      // virgin-cycle18 brief 04: the inline backfill moved to ui/rideHomes.ts
      // (same pass, minus free rides) and is followed there by the orphan
      // filing — a ride this list shows is, after this, always in RESULTS too.
      await settleRideHomes(createExpoFsAdapter());
```

**Edit 8B — imports.** After line 23 insert `import { settleRideHomes } from './rideHomes';`.
Then `grep -n "decodeIndex\|backfillMissingResults\|wayIdsOfSport\|currentCatalog\|currentSports\|effectiveRideSportId" app/src/ui/RidesScreen.tsx`
and remove from the import lines ONLY the names that now have no other use in the file
(`decodeIndex`, `backfillMissingResults` and `wayIdsOfSport` are expected to go — drop the
whole `decodeIndex` import line; keep `getStoredResult` (line 129), `currentCatalog` (line
131), `currentSports`/`effectiveRideSportId` (`refresh`, lines 52-54), `activeSportId`). If a
name you expected unused still has a hit, keep it and note it in the report.

### §9. Boot: `app/src/ui/lastRide.ts` + `app/App.tsx`

**Anchors:** `lastRide.ts:242` `export async function initRideHistory(fs: FsAdapter): Promise<void> {`;
`:269` `      const endedEntries = rideIndex.rides.filter((r) => r.status === 'ended' && r.mode !== 'free');`.
`App.tsx:42` `import { initFreeRidePersistence } from './src/store/freeRides';`; `:162`
`const fs = createExpoFsAdapter();`; `:167-174` the chain (`initSportStore(fs)` /
`.then(() => initCatalogStore(fs))` / `.then(() => initUserRefs(fs))` /
`.then(() => initRideHistory(fs))` / `.then(` / `() => setWindowHydrated(true),` / `() => {},` / `);`);
`:175-178` the WP-B comment (3 lines) + `void initFreeRidePersistence(createExpoFsAdapter());`.

**Edit 9A — `initRideHistory` takes the free-record skip.** Line 242 →

```ts
export async function initRideHistory(
  fs: FsAdapter,
  // virgin-cycle18 brief 04 (decision 5): App.tsx passes "this ride carries a
  // free-ride record" — a callback, because this module must not import
  // store/freeRides (that store's structural-isolation rule). Skipped rides
  // are never derived against the catalog; ui/rideHomes.ts applies the
  // identical rule on RIDES/RESULTS.
  skipBackfill: (rideId: string, startMs: number) => boolean = () => false,
): Promise<void> {
```

Line 269 →

```ts
      const endedEntries = rideIndex.rides.filter((r) => r.status === 'ended' && r.mode !== 'free' && !skipBackfill(r.rideId, r.startMs));
```

**Edit 9B — App.tsx.** Line 42 → `import { freeRideNear, freeRideResults, initFreeRidePersistence } from './src/store/freeRides';`.
Replace lines 167-178 (the chain through the `void initFreeRidePersistence(...)` line, WP-B
comment included) with:

```ts
    initSportStore(fs)
      .then(() => initCatalogStore(fs))
      .then(() => initUserRefs(fs))
      // virgin-cycle18 brief 04: the free-ride cache hydrates BEFORE the ride
      // history, whose boot backfill must skip free rides (decision 5) — the
      // callback below reads the store, so it has to be loaded first. Same
      // no-throw contract (D-023) as everything else in this chain; it used
      // to run fire-and-forget beside the chain (WP-B).
      .then(() => initFreeRidePersistence(fs))
      .then(() => initRideHistory(fs, (_rideId, startMs) => freeRideNear(freeRideResults(), startMs) !== null))
      .then(
        () => setWindowHydrated(true),
        () => {},
      );
```

`createExpoFsAdapter` stays imported (line 162 uses it). `initFreeRidePersistence` never
throws (`freeRides.ts:178-199`), so the chain's error branch is unchanged in meaning.

### §10. Tests

#### `app/tests/routecreation_suite.ts`

**WP-H 17** (starts line 899): after the line
`  assert(v1 !== undefined && JSON.stringify(v1.chainageM) === JSON.stringify(out.adjust!.chainageM), 'the v1 gate set is the seeded proposal');`
append:

```ts
  // virgin-cycle18 brief 04 (decision 8): the founding ride is stored on its own way at once.
  assert(out.referenceTimed, 'createRouteFromDraft reports the founding ride timed');
  const own = wphResultsStore.getStoredResult('create1');
  assert(own !== null && own.wayId === 'way:create1' && own.lap.quality === 'clean' && own.derivedBy.gateSetVersion === 1,
    `the founding ride's own result is stored on way:create1 at v1, got ${JSON.stringify(own && { wayId: own.wayId, q: own.lap.quality, v: own.derivedBy.gateSetVersion })}`);
```

**WP-H 18** (starts line 946): the two `saveAdjustedGates(out.adjust, …)` calls (lines 954, 959)
get a third argument `fs`. After the last assertion of that test
(`assert(cat.ways.find((r) => r.id === out.wayId)!.gateSetVersion === 2, 'the route points at v2');`)
append:

```ts
  // virgin-cycle18 brief 04: the founding ride is re-timed at v2, never left under v1 chainages.
  assert(moved.ok && moved.moved && moved.referenceRetimed, `moved gates re-time the reference, got ${JSON.stringify(moved)}`);
  const re = wphResultsStore.getStoredResult('adjust1');
  assert(re !== null && re.wayId === out.wayId && re.derivedBy.gateSetVersion === 2 && re.lap.quality === 'clean',
    `re-timed at v2 and clean, got ${JSON.stringify(re && { v: re.derivedBy.gateSetVersion, q: re.lap.quality })}`);
  assert(JSON.stringify(re!.sectors.map((s) => s.toChainageM)) === JSON.stringify(nudged.slice(1)),
    'the v2 sectors carry the nudged chainages');
```

**Brief 02's `c18-02 4`** (second block): replace
`    assert(wphResultsStore.getStoredResult('create9') === null, 'create does NOT derive itself (decision 4)');`
with
`    assert(wphResultsStore.getStoredResult('create9')?.wayId === 'way:create9', 'create derives its founding ride itself (c18-04 decision 8 supersedes 02 decision 4)');`

**New test, appended right after WP-H 18** (holed recording → NO TIME result, still a home).
`ranks` is not imported in this suite today (`grep -n "ranks" app/tests/routecreation_suite.ts`
→ no hits); the inline dynamic import below is deliberate:

```ts
test('c18-04 (createRouteFromDraft): a founding ride with a GPS hole is stored as NO TIME under its way — a home, never a rank', async () => {
  const { fs } = await wphSetup();
  const f = wphFixes(200, 0.0002, 1_700_100_000);
  const keep = (i: number) => i < 155 || i > 185;
  await wphWriteRideFile(fs, 'holed1', { t: f.t.filter((_, i) => keep(i)), lat: f.lat.filter((_, i) => keep(i)), lon: f.lon.filter((_, i) => keep(i)) });
  const d = await wphRouteFromRide.draftRouteFromRide('holed1', 1_700_100_000_000, null, fs);
  assert(d !== null, 'precondition: a draft');
  const out = await wphRouteFromRide.createRouteFromDraft(d!, { start: '', end: 'Far' }, fs);
  assert(out.ok && out.referenceTimed, `stored at any quality, got ${JSON.stringify(out)}`);
  const own = wphResultsStore.getStoredResult('holed1');
  assert(own !== null && own.wayId === 'way:holed1' && own.lap.quality === 'missed', `expected a missed lap on its own way, got ${JSON.stringify(own && own.lap)}`);
  const { ranks } = await import('../src/store/results.ts');
  assert(!ranks(own!), 'a missed lap never ranks (D-028)');
});
```

(Proof above: this exact hole gives `lap missed, sectors clean,clean,clean,missed` at the
seeded v1 gates.)

#### New `app/tests/ridehomes_suite.ts` (+ `import './ridehomes_suite.ts';` in `app/tests/run.ts`, on the line after `import './ridedetail_suite.ts';`)

Same `registerHooks` JSON shim + dynamic-import pattern as `resultsstore_suite.ts:9-38`
(copy that header; the app modules below read `catalog.seed.json`). Static imports:
`assert, test` from `./lib.ts`; `createMemoryFsAdapter` from `../src/storage/fsAdapter.ts`;
`emptyCatalog` from `../src/store/catalog.ts`; `RESULT_SCHEMA_VERSION, type RideResult,
type Landmark` from `../src/store/types.ts`; `effectiveRideSportId` from `../src/store/sports.ts`.
Dynamic (after the hook): `../src/ui/rideHomes.ts`, `../src/store/resultsStore.ts`,
`../src/store/freeRides.ts`, `../src/store/catalogStore.ts`, `../src/store/sportStore.ts`.
Copy `makeResult` from `resultsstore_suite.ts:58-74` and `lm` from `routecreation_suite.ts:44-46`
(the suites do not export them). Tests:

```ts
test('ridehomes: backfillCandidates — ended, not free MODE, not free-labelled', () => {
  const e = (rideId: string, status: 'ended' | 'recording', mode?: 'route' | 'free') =>
    ({ rideId, startMs: 1000, endMs: status === 'ended' ? 2000 : null, status, mode });
  const out = rideHomes.backfillCandidates(
    [e('a', 'ended'), e('b', 'recording'), e('c', 'ended', 'free'), e('d', 'ended', 'route')],
    (id) => id === 'd',
  );
  assert(out.map((r) => r.rideId).join() === 'a', `expected only a, got ${out.map((r) => r.rideId).join()}`);
});

test('ridehomes: orphanRides — a home is a way result, a reference designation or a free record; a recording ride is not finished', () => {
  const e = (rideId: string, status: 'ended' | 'recording' = 'ended', mode?: 'route' | 'free') =>
    ({ rideId, startMs: 1000, endMs: status === 'ended' ? 2000 : null, status, mode });
  const out = rideHomes.orphanRides(
    [e('route'), e('ref'), e('free'), e('orphan'), e('legacyfree', 'ended', 'free'), e('rec', 'recording')],
    (id) => id === 'route', (id) => id === 'ref', (id) => id === 'free',
  );
  assert(out.map((r) => r.rideId).join() === 'orphan,legacyfree', `got ${out.map((r) => r.rideId).join()}`);
});

test('ridehomes: settleRideHomes files every homeless ended ride as a free ride, once, with its own identity', async () => {
  freeRides.resetFreeRidesForTests();
  resultsStore.resetResultsStoreForTests();
  catalogStore.resetCatalogStoreForTests();
  const fs = createMemoryFsAdapter();
  await catalogStore.initCatalogStore(fs);
  const user = emptyCatalog();
  user.landmarks = [lm('rh-a', 51.30, 4.50, 150), lm('rh-b', 51.32, 4.50, 150)];
  user.routes = [{ id: 'rh-a>rh-b', startLandmarkId: 'rh-a', endLandmarkId: 'rh-b', wayIds: ['RhWay'] }];
  user.ways = [{ id: 'RhWay', routeId: 'rh-a>rh-b', refLineId: 'RhWay', gateSetVersion: 1, seeded: false, referenceRideId: 'r-ref' }];
  user.gateSets = [{ wayId: 'RhWay', version: 1, chainageM: [50, 500, 1000, 1500, 1950], createdAtMs: 0 }];
  const errs = await catalogStore.saveUserCatalog(user);
  assert(errs.length === 0, `catalog must save, got ${errs.join('; ')}`);
  await resultsStore.initResultsStore(fs);
  await freeRides.initFreeRidePersistence(fs);
  await resultsStore.saveResult(makeResult('r-route', 'RhWay', 3000, 500));
  assert(resultsStore.getStoredResult('r-route') !== null, 'precondition: the timed ride is stored');
  freeRides.markRideFree('r-free', 5000, 60, null);
  await fs.writeText('index.json', JSON.stringify({ schemaVersion: 1, rides: [
    { rideId: 'r-route', file: 'rides/r-route.jsonl', startMs: 3000, endMs: 4000, nFixes: 2, status: 'ended' },
    { rideId: 'r-ref', file: 'rides/r-ref.jsonl', startMs: 3100, endMs: 4100, nFixes: 2, status: 'ended' },
    { rideId: 'r-free', file: 'rides/r-free.jsonl', startMs: 5000, endMs: 6000, nFixes: 2, status: 'ended' },
    { rideId: 'r-orphan', file: 'rides/r-orphan.jsonl', startMs: 7000, endMs: 7900, nFixes: 2, status: 'ended', sportId: 'cycling' },
    { rideId: 'r-legacy', file: 'rides/r-legacy.jsonl', startMs: 8000, endMs: 8500, nFixes: 2, status: 'ended', mode: 'free' },
    { rideId: 'r-rec', file: 'rides/r-rec.jsonl', startMs: 9000, endMs: null, nFixes: 1, status: 'recording' },
  ] }));
  const filed = await rideHomes.settleRideHomes(fs);
  assert(filed.join() === 'r-orphan,r-legacy', `expected the two homeless rides filed, got ${filed.join()}`);
  const free = freeRides.freeRideResults();
  assert(free.length === 3, `r-free + 2 filed, got ${free.length}`);
  const o = free.find((r) => r.rideId === 'r-orphan')!;
  assert(o.startedAtMs === 7000 && o.durationS === 0.9 && o.sportId === effectiveRideSportId('cycling', sportStore.currentSports()),
    `filed with its own identity, got ${JSON.stringify(o)}`);
  assert(free.find((r) => r.rideId === 'r-legacy')!.durationS === 0.5, 'a legacy free-mode ride is filed too');
  assert(freeRides.freeRideNear(free, 3000) === null && freeRides.freeRideNear(free, 3100) === null && freeRides.freeRideNear(free, 9000) === null,
    'a timed ride, a reference ride and a still-recording ride are never filed');
  const again = await rideHomes.settleRideHomes(fs);
  assert(again.length === 0 && freeRides.freeRideResults().length === 3, 'idempotent');
  await freeRides.flushFreeRideWrites();
  assert((fs.files.get('free-rides-cache.json') ?? '').includes('r-orphan'), 'persisted');
});
```

Notes for the executor: `decodeIndex` accepts any object with an array `rides`
(`rideIndex.ts:15-19`) — if it validates `schemaVersion` or entry shape and rejects the
fixture, stop and report its rule. The `r-*` rides have no JSONL files on purpose: the
backfill `continue`s on a missing file with no marker (`resultsStore.ts:447`), which is
exactly the "still homeless after the backfill" state step 2 must catch. `IndexEntry.sportId`
on `r-orphan` is resolved through `effectiveRideSportId` against whatever `currentSports()` is
under the pinned seed mode — assert through the same function, as written, never a literal.
If `sportStore.currentSports()` needs `initSportStore(fs)` first to be non-throwing, call it
right after `initCatalogStore(fs)` and report that you did.

**Expected before the fix:** `tsc` fails on `onSaveFree` (missing prop at the four call
sites), `saveAdjustedGates` arity, `referenceTimed`/`referenceRetimed`; WP-H 17's new asserts
fail (`getStoredResult('create1') === null`); brief 02's flipped assert fails; the new suite
fails to import `./rideHomes.ts`. **After:** all pass; every existing test unchanged except
the ones named here.

## Verification

From the repo root:

- `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL** (new: ridehomes ×3,
  c18-04 ×1; extended: WP-H 17, WP-H 18, c18-02 4).
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (the required `onSaveFree` prop
  is what proves no naming-card call site was missed: `grep -rn "<RouteNamingCard" app/src`
  → 4 hits, each followed by an `onSaveFree=` line).
- `grep -rn "plain ride" app/src` → **no hits**.
- `grep -rn "settleRideHomes" app/src` → the definition + `RidesScreen.tsx` + `ResultsScreen.tsx`.
- `grep -rn "backfillMissingResults(" app/src` → `resultsStore.ts` (def), `routeFromRide.ts`
  (promote/edit), `lastRide.ts` (boot), `rideHomes.ts` — and NOT `RidesScreen.tsx`.
- `grep -rn "timeReferenceAt" app/src` → def + `createRouteFromDraft` + `saveAdjustedGates` + `editWayGates`.
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the 13 files under Executor rules (2 new,
  shown by `git status --short` as `??` until added).

## Stop conditions (report, do not resolve)

- Brief 02 not in the tree (precondition grep), or its `createRouteFromDraft` block /
  `editWayGates` line not verbatim as quoted in §5.
- `RouteNamingCard` mounted anywhere other than the four sites in §1-§4.
- `initRideHistory(` called anywhere other than `App.tsx` and test suites (`grep -rn
  "initRideHistory(" app`); a test caller keeps working — the parameter defaults.
- `saveAdjustedGates(` called anywhere other than RecordScreen, RideDetailScreen, WP-H 18.
- `IndexEntry`/`RideSummary`/`ActiveSession.sportId` fields differ from the ones quoted.
- Making something compile would need `resultsStore.ts` or `lastRide.ts` to import
  `freeRides.ts` — it must not; the composition belongs in `rideHomes.ts`.

## JS-only / what changes on Nathan's phone

**JS-only** (ten source files + tests, no dependency, no `app.json`/`eas.json`/native change) →
Preview APK over EAS Update via `scripts/publish-preview.cmd`
(`powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1"`),
no new numbered build, no reinstall. Once executed, on the phone:

1. **END of a ride that matched nothing** (his `Work → new`): the card offers **CREATE ROUTE**
   and **SAVE AS FREE RIDE**. No "skip — keep it as a plain ride" anywhere. SAVE AS FREE RIDE
   → end mark → the post-stop detail shows the FREE RIDE card; RESULTS lists it under FREE
   RIDES. A ride on a known route that followed none of its ways: **ADD WAY** / **SAVE AS FREE
   RIDE**. A ride scored as a known way: unchanged (`not <way>?` link, then `keep it as <way>`).
2. **CREATE ROUTE / ADD WAY** → the founding ride is under its route › way in RESULTS
   immediately (`1 way · 1 ride`), before any RIDES visit or restart; the next ride on it in the
   same session races that dot. Nudging the gates on the adjust card re-times it.
3. **His existing plain rides** (the WorkNew one and any other `no lap` row with no route)
   appear under FREE RIDES the first time he opens RESULTS or RIDES after the update. RIDES
   shows them as `Free ride · <duration>`. Nothing is deleted or re-timed.
4. On a FREE RIDE's detail: **Make this the reference of a new route** is offered directly
   (naming it un-frees it); **Not a free ride** now also retries matching it against today's
   routes on the next RIDES/RESULTS visit.
5. A ride too short to name (no card) and unlocked is filed free at END by itself.
6. DEMO › FIRST RIDE shows the same two buttons (theatre). RESULTS' empty line only shows when
   there is truly nothing.
7. **Not changed:** ranking, colours, D-028/D-045, the reveal, EDIT GATES on ROUTES (brief
   02's, plus §5E's fallback), RIDES row labels, the 10 s free-record tolerance, ride deletion.

## Nathan's call (recommended defaults applied; change = one-line follow-ups)

1. **Weight of SAVE AS FREE RIDE.** Default: an outlined button under CREATE ROUTE (same
   size). Alternative: a dim text line like the old skip (`st.skipBtn`) — smaller, but it is
   the choice he reached for and did not find.
2. **Tiny rides.** Default: EVERY ended ride gets a home, including one with 0–1 fixes (a
   3-second accidental START/END) — it shows under FREE RIDES with its duration, deletable
   from its detail. Alternative: skip `nFixes < 2` in `orphanRides` (one condition) — those
   would stay RIDES-only, which is the state he objected to.
3. **FREE RIDES row label.** Default: date + duration (unchanged from cycle16 03). Adding the
   START pick (`Work → new`) means one sidecar read per free ride on RESULTS mount — a small
   follow-up (RidesScreen already does exactly that for its rows).
4. **"Not a free ride".** Default: kept, with the retry meaning above. Alternative: remove it
   now that naming is offered on the free card directly — then the only way to get a mis-filed
   free ride timed against an EXISTING way would be gone.
5. **Legacy free-MODE rides** (before cycle16, `mode: 'free'` in `index.json`) are filed as free
   rides by default — they were free rides. Alternative: leave them RIDES-only.
6. **END with no card at all** (draft `null`) files free by default. Alternative: leave it to
   the next settle pass (identical outcome, a few minutes later).

## Out of scope

- The ROUTES-tab EDIT GATES flow beyond §5E (brief 02's). Brief 05 (no duplicate places) and
  brief 06 (editable From/To) — they edit `routeNamingCard.tsx` lines 60-205, which this brief
  leaves byte-for-byte; order them after this one and anchor on the tree at that time.
- A "recording" (crashed, un-healed) ride's home. iOS. `STATE.md`, `OPEN-ITEMS.md`, this
  folder's `README.md`.

## Open questions / assumptions (logged, not blocking)

1. `settleRideHomes` on RESULTS mount runs a backfill that may take a moment on a phone with
   many never-derived rides — once. Subsequent mounts skip stored/marked/free rides at
   `resultsStore.ts:443-444`. RESULTS renders from the stores immediately and re-reads on the
   tick, same as RIDES.
2. Boot's `initRideHistory` backfill and a RIDES/RESULTS `settleRideHomes` can overlap on the
   first screen after launch; both are idempotent per ride (`store.has` / marker), and a ride
   derived twice stores the same bytes.
3. The 10 s `freeRideNear` tolerance is reused as the "carries a free record" test on
   `IndexEntry.startMs`; two rides never start within 10 s of each other.
4. The repro scripts live outside the repo (`$HOME/repro2/*.mts` on the Cowork VM); WP-H 17/18
   and `c18-04` reproduce their cases inside the suite.
