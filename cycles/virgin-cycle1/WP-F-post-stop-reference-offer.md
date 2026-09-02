**Status: Brief written 2026-09-02, ready to execute. Not yet built. No decision needed from Nathan for the core offer.**
**Review doc item: 6. Size: medium.**
**Verified against the mirror at commit `447c2ba` (working tree clean at the time).**

---

# WP-F — Post-stop "save as new way" offer for any ride

## 1. Goal

After STOP, offer "New way — name where you rode" whenever the finished ride's **directed start→end landmark pair is not an existing Way** — regardless of what the live engine concluded about route matching. Today the offer is reachable only when the engine matched *nothing* (`finalState.track === null`); a ride the engine soft-locked, late-locked, partially matched, or matched some other route never gets it, even when its endpoints form no Way at all.

Precise scope (don't widen by accident):

| Ride's directed endpoint pair | Engine matched something? | Today | After this WP |
|---|---|---|---|
| No existing Way | no | offer | offer (unchanged) |
| No existing Way | **yes** (any lockKind) | **no offer ← the gap** | **offer** |
| Already has a Way (that direction) | either | no offer | no offer (unchanged — a second Route/variant on an existing Way is a separate WP: review item 7) |

The second half of review item 6 ("set as reference" from a ride's own detail/history entry) depends on a ride-detail screen that doesn't exist (WP-H) — that's a follow-on hook only here (§8), not designed in this brief.

## 2. Current state (verified against `447c2ba`; suite ran 302 pass / 0 fail / 3 skip at read time)

### 2.1 The gate in `RecordScreen.tsx`'s `onEnd`

Sequence: `liveEngine.finalize()` → `finalState = liveEngine.getState()` → `rememberRide(finalState, …)` → `stopTracking()` → **the gate**:
```ts
const draft = s && finalState.track === null ? await namingDraftFor(s.rideId, s.startedAtMs) : null;
```
→ card shown if `draft !== null`. The comment above it ("covers: locked rides, matched endpoints…") needs rewriting — "locked rides" is exactly the behaviour this WP removes.

`namingDraftFor(rideId, startedAtMs)` reads the ride's fixes, calls `draftWayCreation(currentCatalog(), { rideId, startedAtMs, fixes })`, null on any throw.

`onNamingSave` is entirely draft-driven — **nothing in it depends on `finalState`**, so it works unchanged for a ride the engine also matched.

### 2.2 What `finalState` looks like in each case (post WP-A)

`getState().track` is `this.locked ? this.locked.track : null`.

| Case | `track` | `lockKind` |
|---|---|---|
| Never locked, nothing completed (post-WP-A `finished` filter) | `null` | `'none'` |
| Soft lock, nothing completed | route id | `'soft'`→`'finalized'` |
| Verified live lock | route id | `'verified'` |
| Completed at ride end | route id | `'finalized'` |
| Free mode | `null` | — |

Today the offer is suppressed in every non-`null`-track row even when the ride ended somewhere with no Way.

### 2.3 `draftWayCreation()` — `store/wayCreation.ts`

Already implements exactly the "directed pair has SOME Way → no offer" rule, and doesn't look at the engine at all:
- `null` for <2 fixes or ridden length < `MIN_TRACK_LENGTH_M` (200m).
- Each end resolves to `{kind:'existing', landmarkId}` when inside a disc, else a `kind:'new'` draft landmark (with a fitted radius clear of every existing disc), else squeezed onto the nearest disc.
- **The directed-pair check**: if both ends resolve `existing` and a Way already links them in that direction, return `null`. (Directed — reverse direction still offers, already tested.) A pair with any `new` end can never "already exist," so it always drafts.
- Returns a `WayCreationDraft`; `buildWayCreationCatalog` mints the way/route from it (unchanged by this WP).

### 2.4 `wayNamingCard.tsx`

Already handles all four new/existing endpoint combinations — no structural change needed. Its "This ride does not match any way you have" sub-copy becomes misleading once a ride can be *both* a scored lap of route X on Result *and* offered as a new way — see §3.3.

### 2.5 Empirical risk check (done against the real ride fixtures + shipped seed catalog, not simulated)

Ran `draftWayCreation` on every ride fixture against `catalog.seed.json` as a read-only probe. Of the matched real rides, **one** (`latelock_20260805` — a real 2026-08-05 ride, late-locked with START skipped) has its first fix **75m past its way's own start landmark's disc edge**, so with the *bare* gating change alone it would draft a spurious "New way" card (start input + the known end) after a ride the engine correctly attributed to Morning. **This is why §3.2 (the slack guard) exists — the gating change must not ship alone.**

## 3. Proposed change

### 3.1 `RecordScreen.tsx` — drop the engine gate, pass the engine's verdict as a fact

```ts
// WP-F: the offer is about the ride's ENDPOINT PAIR, not the engine's route
// verdict — a ride the engine (soft/late/partially) matched can still end
// somewhere no way of yours goes. finalState.track is handed over only so
// draftWayCreation can refuse to mint a "new place" a few tens of metres
// outside the matched way's own landmark (latelock_20260805: 75 m past
// home's disc). Null (no offer) now covers: an existing way in this
// direction, short rides, read failures — NOT "the engine locked".
const draft = s ? await namingDraftFor(s.rideId, s.startedAtMs, finalState.track) : null;
```
`namingDraftFor(rideId, startedAtMs, matchedRouteId: string | null)` forwards it into `RideFacts`. Rewrite the stale comments. Free mode unaffected (`track` always null there).

### 3.2 `wayCreation.ts` — a matched-way endpoint guard, catalog-identity based, pure

Add to `RideFacts`:
```ts
/** WP-F: the route the live engine settled this ride on, or null. Evidence
 * about WHERE the ride started/ended, not a veto — it only stops a fix a
 * little outside that way's own landmark disc from being drafted as a
 * brand-new place. */
matchedRouteId?: string | null;
```
New constant:
```ts
/** WP-F: on a ride the engine attributed to route X, an endpoint fix within
 * this many metres OUTSIDE X's own landmark disc is that landmark, not a new
 * place. Aligned with live/engine.ts's ANCHOR_M (not imported — store code
 * must not depend on live/). Measured: latelock_20260805 sits 75 m past the
 * edge. [ASSUMPTION — tune on device.] */
export const MATCHED_ENDPOINT_SLACK_M = 300;
```
Resolve `matchedWay` once from the catalog (degrade to today's behaviour if the route/way id is stale or missing — never throw). Immediately after the start resolution and before the end resolution:
```ts
if (matchedWay && start.kind === 'new') {
  const a = landmarkById(c, matchedWay.startLandmarkId);
  if (a && metresBetween(first, a) - a.radiusM <= MATCHED_ENDPOINT_SLACK_M) {
    start = { kind: 'existing', landmarkId: a.id };
  }
}
```
symmetrically for the end. Rules: only a `kind:'new'` resolution is overridden (an endpoint already inside a *different* existing landmark is untouched — Gym→Home→Work still offers Gym→Work); a new place beyond the slack stays new (Home→Work→Shop 2km on still offers). After the override the existing pair-exists check does the rest (latelock resolves to home→work, which already exists → `null`, no card — correctly suppressed).

### 3.3 `wayNamingCard.tsx` — honest copy in the matched case (small, recommended)

Optional `matchedRouteLabel?: string | null` prop. When set: *"Scored as {label}, but no way of yours runs between these two places. Name them to make this a route of its own — this ride becomes its reference."* Requires `finalState.track`/label to survive into the `naming` state (simplest: add `matchedRouteId` to `WayCreationDraft`, set from the fact it was given).

## 4. Test plan — `tests/waycreation_suite.ts`

1. **The gap case (the point of the WP)**: existing way a→b; ride a→g (g a different known landmark) with `matchedRouteId` set to the existing route → drafts `existing:a → existing:g`, not null; same with `matchedRouteId: null` → same draft (the fact never *creates* an offer by itself).
2. **Existing pair still refuses regardless of the engine**: ride a→b with any `matchedRouteId` (matching, mismatching, or null) → all `null`. Locks the "variant is a separate WP" boundary.
3. **Slack snap (the latelock regression guard)**: a ride whose first fix is 75m past a's disc edge (today would draft new), ending inside b, with the matching `matchedRouteId` → `null`; with `matchedRouteId: null` → new→existing (today's behaviour for genuinely unmatched rides preserved). Mirror for the end side.
4. **Slack doesn't swallow a different known place or a far new place**: start inside a *different* landmark stays that landmark regardless of `matchedRouteId`; end 2km past the way's end stays new.
5. **Unknown/stale `matchedRouteId`** (route id not in catalog, or its way missing) → identical to null.
6. **Fixture-level lock**: `latelock_20260805` + `clean_morning` against the real shipped seed catalog → `draftWayCreation(seed, {…, matchedRouteId: 'Morning'}) === null` for both — pins the real-ride case, not just synthetic geometry.
7. If `WayCreationDraft.matchedRouteId` is added: assert it round-trips and `buildWayCreationCatalog` ignores it.

## 5. Verification

```
cd app
node --experimental-strip-types tests/run.ts   # expect baseline + new tests, 0 fail
./node_modules/.bin/tsc --noEmit
```
On device: ride a known way normally → no card (unchanged); start a known route, divert, and stop at a genuinely new place → card appears with the matched-route sentence, CREATE WAY works, Result still shows the partial lap; start a known route from ~100m outside its start landmark → no spurious card.

## 6. Files touched

`src/ui/RecordScreen.tsx` (gate + comments + card props), `src/store/wayCreation.ts` (`RideFacts.matchedRouteId`, the constant, two snap blocks, doc comments), `src/ui/wayNamingCard.tsx` (optional prop + copy), `tests/waycreation_suite.ts`. Not touched: `src/live/engine.ts`, `lastRide.ts`, `catalogStore.ts`, `buildWayCreationCatalog`.

## 7. Relationship to WP-A

With WP-A's hard-pick lock + corrected completion guard already landed, a Work→Home ride against a Home→Work-only catalog now ends `track === null` and **already** gets the offer today. This WP is the safety net for the remaining matched-but-different-endpoint cases (soft/late lock, partial match, genuine extension past FINISH) — the review's own framing, not the main fix. No dependency on WP-A's specific implementation.

## 8. Follow-on hook (not in scope)

"Set as reference" from a ride's own detail/history entry needs the ride-detail screen (WP-H, not started). When that lands, it can reuse this exact seam: `draftWayCreation(currentCatalog(), { rideId, startedAtMs, fixes, matchedRouteId: result.routeId ?? null })` + `WayNamingCard` + `onNamingSave`'s body (worth extracting into a small shared module then, not now).

## 9. Open questions (none block execution; defaults given)

1. **Slack value** — 300m (ANCHOR_M-aligned, recommended) vs. 120m (the new-landmark default radius). Both cover the latelock case; Nathan may have an opinion from how far from home he actually presses START.
2. **Card copy in the matched case** — ship the "scored as X, but…" sentence (recommended — otherwise the card would contradict what Result shows), or keep the card ignorant of the engine?
3. **Should a fully verified, completed lap ever offer?** With the slack guard it only does when the ride demonstrably continued to a known-other or genuinely-far-new place. If Nathan prefers "a fully verified lap never prompts," it's a one-line exclusion at the call site — but it would also drop the genuine Home→Work→Shop extension case.
