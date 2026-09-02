# Review of Nathan's virgin-install ride notes — 2026-09-01

This reviews `qualifire-20260901-notes.md` (two rides on the freshly-reset virgin build, 09:17 Home→Work and 19:17 Work→Home) against the two GPX+ files, `qualifire-catalog-20260901.json`, `qualifire-refs-20260901.json`, the live engine (`app/src/live/engine.ts`), the map layer (`app/src/ui/routeMapView.tsx`, `routeMapGeo.ts`), `RecordScreen.tsx`, the save-flow modules, and `STATE.md`/`OPEN-ITEMS.md` as of 2026-08-31. It also folds in the still-live parts of `Nathan/Nathan's_notes5/Nathan's_notes5.md` (26 and 29 August, pre-branch) and says explicitly which of those are stale.

Landmarks created on ride 1, for reference throughout: **Home** at 50.8366472, 4.6382618 (https://www.google.com/maps?q=50.8366472,4.6382618) and **Work** at 50.8633583, 4.6879247 (https://www.google.com/maps?q=50.8633583,4.6879247). Straight-line distance between them: **4 580 m**.

**The headline finding is ride 2.** It was not a random failure. Ride 2 rode the ride-1 reference line *backwards* (Work→Home over a Home→Work line), the engine never anchored or locked during the ride, and then at the very last GPS fix the ride-end `finalize()` recovery stamped it as `lockKind="finalized"` against the *existing* Home→Work route — with a recorded cross-track distance of **4 547.8 m**, which is the Home–Work straight-line distance to within 1 %. That is the numeric fingerprint of a projector frozen at the Work end while the rider stood at Home. Because the ride ended "matched", `RecordScreen` never offered the naming/gate cards, and no Work→Home Way was ever created (the catalog after both rides has exactly one Way and one Route). The "no live map during ride 2" complaint has a second, *independent* cause: the map layer can only draw routes that exist in the bundled asset manifest, and a route born on the phone is not in it — so the live map is structurally blank on every user-created route, locked or not. Both are detailed in §5 and §6 below.

Two bigger-picture observations sit behind most of the individual points:

1. **User-created routes are not drawable.** `routeMapView.tsx` renders exclusively from the Metro-bundled `assets/routes/routes.json` manifest (`routeMapView.tsx:76`, `const ASSETS = manifest.routes`), and both rungs return `null` when the requested route has no manifest entry (`routeMapView.tsx:232-233` and `:344`; PNG rung `:597`). Ride 1's route (`route:20260901-091752-f6ca`, refLineId = its own id per `wayCreation.ts:235`) lives only in `catalog.user.json` + `refs.user.json`. `gateAdjustCard.tsx:11-13` says this out loud: *"No map: a user-created route has no RouteAsset yet (routeMapView renders bundled assets only) — §4's map-mirror joins when user routes become drawable."* This single gap is why: the setup/armed screens show no map on a virgin install, the ride-2 live map was blank, the gate card was a "plain line", ROUTES can't show the trace, and Result's VIEW TRACE (and the sector-coloured trail) cannot render for ride 1. `STATE.md:56` says a freshly-created route is "drawable/raceable" — that is true for the *engine* (`refFor()` falls back to `refs.user.json`) and false for the *map*. Nothing in `OPEN-ITEMS.md` tracks it. It is the biggest lever in this whole review.
2. **Route matching/locking is the same problem surfacing three times**: OPEN-ITEMS item 4's "no route lock on ride 1", notes5's WorkHomeWet→WorkChurch auto-switch, and today's ride 2. Ride 2 is the first *reproducible, numerically-fingerprinted* case.

> **Nathan's ruling (2026-09-01), reframing the fix below:** "the problem is not that Work>>Home does not lock, that's expected of a new ride — the problem is it was not recognized as a virgin ride. If I've never done it, it should be recognized and handled as such." That is the correct framing and this review adopts it: nobody wants Work→Home to lock against the Home→Work route — the two are different Ways and should stay different. The bug is that the app had no notion of "I don't recognize this as anything, so treat it exactly like ride 1" — instead `finalize()`'s FINISH-recovery mistakenly decided ride 2 *did* match the existing route, which suppressed the ride-1-style naming/save offer that a genuinely unmatched ride should always get. §7, item 1 and item 6 below are rewritten around that framing. Nathan also asked for a UX touch once this is fixed: while a ride is running and no known route is recognized, the existing rotating status line (`RecordScreen.tsx:642-666`, `recordFlow.ts`'s `statusItemsFor`) — which already alternates GPS/route status every 6 s — should fold in a line like "writing history" (something that tells the rider they're literally laying down a new route for the first time), alternating with the ordinary GPS-live text. See item 1a below.

---

## Ride 1 (09:17, Home→Work, new→new)

### 1. Record screen empty, but no map before START

Correct diagnosis, and it's deterministic. The setup rung renders `<RouteMapView routeId={pickedRoute?.refLineId ?? null} …>` (`RecordScreen.tsx:1064-1075`) and the armed rung does the same (`:819-827`). With nothing picked, `RouteMapView` falls to `defaultRouteId()` (`routeMapView.tsx:83-85`: "the first CATALOG route with a drawable asset … Null ⇒ both rungs render nothing"). On a virgin catalog that is null; `!gatesOnly && !asset → return null` (`:344`). So no map, no blue dot — by construction, not by accident. The ride-1 GPX confirms the location layer *was* delivering fixes before START: one trackpoint carries `<qf:preStart/>`, five seconds ahead of the `start` button timestamp — so the data for a rider-only map existed, it just had nowhere to render.

Note the same block also carries a hardcoded fallback centre `[4.68, 50.85]` (`routeMapView.tsx:382`, https://www.google.com/maps?q=50.85,4.68 — Leuven) for the gates-only rung when there is no fix yet. That is a small residual virgin-install leak of the same kind item 1 in OPEN-ITEMS was meant to close.

**Verdict: real, confirmed at file:line, and a small-to-medium fix — `RouteMapView` needs a "no route, rider only" rendering mode instead of returning null.** Unrelated to the engine.

### 2. Map appeared after START with a moving dot — but with black circles

The map appears after START because ride 1 was a *free ride* (`freeRide = fromId === NEW_ID || to === NEW_ID`, `RecordScreen.tsx:733`), and the running rung passes `gatesOnly={live.mode === 'free'}` (`:921`), a rung that does not need a route asset (`routeMapView.tsx:342-344`).

**Your reading of the black circles is right, and here is exactly what they are.** In gates-only mode the map draws a `gate-rings` circle layer (`routeMapView.tsx:486-494`: radius 6, transparent fill, near-black `CASING` stroke — i.e. black rings) fed by `allGatesFeatureCollection(ASSETS, …, props.gateRouteIds)` (`:360-361`). `allGatesFeatureCollection` does `const ids = routeIds ?? Object.keys(assets)` (`routeMapGeo.ts:112`). For a new→new ride `freeRideRouteIds()` returns `null` (`catalog.ts:174-186`, both ends null → null = "unfiltered, full-catalog"), so the filter is null and **every route in the bundled manifest gets its gates drawn** — and the manifest is Nathan's Leuven routes (`routeMapView.tsx:87-91` still requires `Morning.png`/`EveningA.png`/`EveningB.png`; the comment at `:79-81` acknowledges "in a virgin build (empty catalog, manifest still bundled)"). The empty-seed work (OPEN-ITEMS item 1) blanked the *catalog*; the *asset manifest* still ships, and this rung reads the manifest, not the catalog.

So the circles are your old gates, but not because the reset failed or state survived — the build itself still carries them. The bundled-`'Morning'` DEMO exception in `STATE.md:141-144` is the same species of leak, already tracked under item 4.

**Verdict: confirmed virgin-install data leak, with a precise cause. Fix is small: filter the gates-only rung by the runtime catalog (or strip the manifest from the virgin profile) — decision below.** I have not opened `routes.json` itself (not in the reviewed set), so I can't list which routes' gates were drawn; the mechanism doesn't depend on that.

### 3. Solid yellow trail behind the rider as you ride

Not built. The running rung draws the rider dot (`routeMapView.tsx:533-537`) and, in gates-only mode, no line at all (there's no route asset to draw, `:363-370` skip everything except gate rings). The recorded fixes are in memory/on disk (`rides/<rideId>.jsonl`), so a breadcrumb polyline is a rendering addition, not a data change.

**Verdict: new feature, small-to-medium, no design conflict. It also happens to be the natural fallback for the live map on user-created routes until §1-lever lands.**

### 4. Naming card at STOP: worked, but wants more than start/end

The catalog proves the flow worked end to end: one landmark pair, one Way, one Route, one 5-gate set at chainage `[56.6, 1415.4, 2830.8, 4246.2, 5605.0]` over a ~5 661 m line (`origin: "geometric"`, `referenceRideId` = ride 1), and `refs.user.json` holds ride 1's built reference line. That closes the "a save actually shows up" half of OPEN-ITEMS item 2/3's owed on-device pass on the *data* side (the *display* side failed, see §1-lever).

The card itself only takes two names (`wayNamingCard.tsx`, `onNamingSave(names: {start, end})` at `RecordScreen.tsx:478`). "Dry", "Left/Right", sub-routes etc. have no input. Important nuance for the design: **the data model already has the concept you're describing.** A Way holds several Routes; the RECORD tab already lists a way's routes as separate pick options (`wayRoutes`/`routeVariantLabel`, `RecordScreen.tsx:747-752`; `needsRoutePick`, `catalog.ts:188-191`). "HomeWorkDryLeft" and "HomeWorkDryRight" are two Routes on the Home→Work Way. What's missing is (a) a way to *create a second Route on an existing Way from a ride* — `draftWayCreation()` returns `null` when a Way with those endpoints already exists (`wayCreation.ts:185-190`), so today ride 3 Home→Work can never become a new variant — and (b) a place to type/pick tags, with recognition of previously-used ones.

**Verdict: the ask is sound and the model supports it; the "+ add specification" UI and the "new route on an existing way" save path are both new work (medium-to-large together). One decision needed: are specifications free-text tags, a fixed vocabulary (Dry/Wet + a free variant name), or both?** If you meant only *conditions* (Dry/Wet) and not route *variants*, say so — that changes the size a lot (conditions could be a per-ride attribute, not a Route).

### 5. Gate placement was "a plain line with draggable gates" — wants the map

Two corrections and one conflict.

- **It isn't draggable.** `gateAdjustCard.tsx:2-5,96-103`: tap G1–G3 to select, then a `−50 −10 │ x m │ +10 +50` nudge pad. That is the *settled* design: `STATE.md` ground rules — "Adjustment UI is tap-then-nudge with ± buttons, never finger-dragging (thumb covers the line)."
- **The missing map is the §1-lever, and it's documented as such** (`gateAdjustCard.tsx:11-13`). The card's own header says the map-mirror joins "when user routes become drawable". So "show the trace + gates on the map" is not a redesign, it's the already-planned second half, blocked on drawable user routes.
- **The conflict:** what you describe — *tap a gate to select it, then slide your finger left/right anywhere to scrub the gate earlier/later along the ride* — is a finger gesture, which the ground rule forbids. But note it is *not* the thing the rule was written against: your finger is not on the line, it's a horizontal scrub with the gate riding the path. The rule's stated reason ("thumb covers the line") doesn't obviously apply. It still needs you to re-rule explicitly, because STATE.md is binding and the ± pad was independently inspected on that basis.

**Verdict: map-on-the-gate-card is already designed and blocked only on drawable user routes; finger-scrub needs you to re-open the tap-then-nudge decision before anyone plans it. My suggestion: keep the pad (it's built and glove-friendly) and add the scrub as an alternative input on top of the same selection model — both are "select first, then move", so they coexist.**

### 6. ROUTES tab should show the saved route's trace and gates

`RoutesScreen.tsx:100` renders `<RouteMapView variant="browse" routeId={r.refLineId} …>` — the PNG/browse rung, which does `ASSETS[id]` (`routeMapView.tsx:597`) and has nothing for a user route. The gate data is there (catalog proves it); the drawing isn't.

**Verdict: confirmed, and it is the §1-lever again, not a separate bug. Once user routes are drawable, ROUTES gets the trace and the gate ticks for free.** OPEN-ITEMS item 3's owed check "a route seeded today actually shows 4 sectors on ROUTES/live" therefore *fails today*, for a known reason.

---

## Ride 2 (19:17, Work→Home, both landmarks known)

### 7. RECORD offered Home/Work; picked Work→Home; then no live map, no save, no gates — nothing

Three things happened, and I can separate what is confirmed from what is inferred.

**What the app did at START (confirmed from code).** Both ends known → `freeRide = false` (`RecordScreen.tsx:733`). `way = CATALOG.ways.find(start===Work && end===Home)` → undefined (only Home→Work exists) → `pickedRoute = null` (`:744-753`) → `startTracking({ routePick: null })` in ordinary *route* mode (`:404-406`), with every catalog route as a candidate — i.e. exactly one candidate, `f6ca` (Home→Work), and no pick. So ride 2 was neither a free ride nor a picked ride: it was "match me against whatever exists".

**No live map (confirmed, independent of the engine).** Running rung: `routeId = live.track ?? rideRouteHint` (`:917`); `rideRouteHint` was null (no picked route), `live.track` null until a lock — and even after a lock it would be `route:…f6ca`, which has no manifest asset. `gatesOnly` false. → `defaultRouteId()` → null → `RouteMapView` returns null (`routeMapView.tsx:344`). **This means the live map is blank on every ride on a user-created route, including a future Home→Work repeat of ride 1.** It is the §1-lever, not a ride-2 quirk.

**No save/naming/gate offer (confirmed chain, one link inferred).** `onEnd` calls `liveEngine.finalize()` first (`RecordScreen.tsx:424`), then reads `finalState` (`:428`), then computes the naming draft only if `finalState.track === null` (`:441`, comment: "Null (no offer) covers: locked rides…"). The ride-2 GPX shows what `finalize()` left behind: `<qf:routeLock track="route:…f6ca" atChainageM="5661.63" atT="17:32:27.463Z" lockKind="finalized"/>` — timestamp = the ride's last GPS fix, 0.5 s before the pause/end buttons. So `track` was non-null, no draft, no naming card, no gate card, straight to Result. Had `track` been null, `draftWayCreation()` *would* have offered a Work→Home Way (`wayCreation.ts:185-190` only suppresses when that exact directed Way exists; it doesn't).

**Why did `finalize()` think f6ca was completed? (inferred — strong evidence, not line-traced.)** `finalize()` (`engine.ts:572-596`) recovers a route from any candidate whose detector has passed every gate (`c.det.nextGateIndex >= c.gates.length`). The engine's own docs explain how a reverse traversal can get there without ever locking: a candidate's first fix seeds chainage by a *global* nearest-vertex search (`engine.ts:~152-157`) — for a rider starting at Work that is chainage ≈ 5 661 (the *end* of the Home→Work line); projection is forward-only-monotonic ("no way back"); anchoring requires `fix.s ≤ ANCHOR_M (300)` at some fix (`engine.ts:835`), which a ride starting at chainage 5 661 can never satisfy; and in route mode the `GateDetector` is constructed with default arming (`engine.ts:395`, D-016(b) "you were already past this gate"), so seeding at the far end plausibly marks all five gates as passed. The fingerprints agree: the `phase="anchor"` attempt at 17:17:28 (6 s after START, `xtdM=15.5` — the rider *was* on the line, at the Work end) and the `phase="lock"` attempt at the final fix with **`xtdM=4547.8`** — the projector still sitting at Work while the rider stood at Home, 4 580 m away. `routeFidelity onRoutePct="100.0"` alongside `maxXtdM=15.5` shows the *fidelity* pass measured against the geometry (correctly: he was on the line the whole way), while the *lock* path was stuck. I am confident in the mechanism; the specific claim that the detector's arming rule fired all gates from the seed fix needs `core/live.ts` (`GateDetector`/`LiveProjector`, not in the reviewed set) traced by whoever implements the fix, and a replay test of ride 2's fixes against ride 1's reference line is the right first move.

**Side effect to check:** `rememberRide(finalState, …)` ran before the draft check (`RecordScreen.tsx:433`), so ride 2 is probably stored as a *Home→Work* ride on route f6ca with nonsense sector times. Look at the RIDES tab; if it's there, that's the "ignore from ranking" case in §9 arriving early.

**Verdict: the most severe item in this review — and per Nathan's ruling above, the target is not "make Work→Home lock", it's "recognize this ride matches nothing and handle it exactly like ride 1."** A core virgin-install promise ("set multiple reference rides in your first journeys") silently fails whenever a new ride reuses the road of an existing route in the other direction — which is the *normal* case for a commute. Priority 1, and it doubles as the first concrete repro in the general route-matching area OPEN-ITEMS item 4 gestures at (that item is scoped as empty-state copy, not this specific engine bug — see the plan below). Your "offer set-as-reference for any ride at STOP" is the right product answer and also the right safety net: even when matching is wrong, the rider can still save the Way.

---

## General

### 8. RIDES tab: open a ride full-screen like a real "place"

`RidesScreen.tsx` is an in-list accordion (`expandedId`, `:43`, `:182-205`) with export/delete demoted into the expanded row (`:228`, `:237`). Nothing full-screen, no trace, no set-as-reference, no ignore-from-ranking. The app already has a "go somewhere" idiom (`tabNav.go('result')`, `RecordScreen.tsx:882`; the armed/running phases *are* a different place inside the RECORD tab), so the pattern you're pointing at exists — but the tab navigator is what's reviewed here and it's a tab switcher, not a stack.

**Verdict: new ask, medium (large if it needs a proper navigation stack). Design decision needed: a full-screen "ride detail" reachable from RIDES, and whether the post-stop screen (§9) is the *same* screen.** Trace-on-map inside it is, again, blocked on the §1-lever.

### 9. RESULTS tab is confusing; post-stop should land on a proper ride screen; maybe 4 tabs

Today `onEnd` → 'ending' phase (cards) → reversed launch mark → `tabNav.go('result')` (`RecordScreen.tsx:876-884`). Result shows "the ride you just finished" plus PBs, and "VIEW TRACE" (`ResultScreen.tsx:256-263`) — which is blank for a user route (§1-lever), so on the virgin install Result currently shows the least of what it's meant to.

**Verdict: I agree the post-stop destination should be a *ride detail* screen with save/set-as-reference/discard/ignore, and that it should be the same screen RIDES opens (§8) — one screen, two entry points. Whether RESULTS survives as a stats tab or is dropped is your call; nothing in code makes either hard.** Open question below.

### 10. Layout that expands gracefully; RECORD tab pills centred instead of flush-left

The setup rung uses a centred ScrollView (`RecordScreen.tsx:1030-1032` comment, `pillRow` at `:1084`). With two pills ("Home", "new") centring reads as floating. This is a styling ruling, not a bug.

**Verdict: needs your ruling — "fixed final form with gaps" vs "tight and grows". My recommendation: tight, flush-left, wrap — a fixed layout for a catalog that starts at zero would be mostly empty for a stranger's first week.** Small once decided.

### 11. "BRIEF-sector-coloured-trail-p1 — I want sectors coloured, not gates"

Correction: **it is already built**, on the Result screen. `routeMapView.tsx:364-370` builds `sectorSpansFeatureCollection` when `sectorColours` is supplied, and `ResultScreen.tsx:263` supplies them; gate ticks stay neutral markers (`STATE.md`, "Sector-coloured trail (Result screen only) is built"). No file named `BRIEF-sector-coloured-trail-p1` exists in the reviewed tree. Extending it to the live/racing screen is *already scoped and parked* in OPEN-ITEMS ("Sector-coloured trail, phase 2 … Nathan's call to unpause").

Two caveats for the virgin install: it renders only when the asset can be split (`:366-368`), i.e. never for a user route today (§1-lever) — so you have not yet *seen* it on this build, which is probably why it felt unbuilt; and the "gates coloured" you're reacting to on the live screen is the live rung's `gateColours` ticks (`RecordScreen.tsx:920`).

**Verdict: nothing to design. Say "unpause phase 2" and it's briefable; it will only become visible on the virgin build after user routes are drawable.**

---

## notes5 (26/29 Aug) — what's still live

| # | Item | Status | Evidence |
|---|------|--------|----------|
| N1 | ElevenLabs motivational TTS library, toggleable, per-sector/pace + start/end | **Still relevant, untracked, off the virgin path** | No audio/TTS/sound reference in any reviewed file, `STATE.md`, or `OPEN-ITEMS.md`. The two mp3s are in `Nathan/` (not reviewed). Needs you to confirm it belongs on the virgin backlog at all. |
| N2 | "I don't think I have any sound in the app" | **Still true as far as the reviewed set shows** | Same search; nothing plays audio. Same item as N1 in practice. |
| N3 | Bake more into GPX+ from the TEST rides | **Largely addressed since** | Both rides' `<qf:session>` now carry `appVersion`, `firstFixAt/DelayS`, `startPressedAt`, `excludedFixes` (which counts `preStart`/`warmup`-flagged trackpoints), `buttons` (start/pause/end), `elevationOutliers`, `storageErrors`, `relaunches`, `maxSpeedKmh`, `routeLock`, `routeFidelity`, `routeMatchDiagnostics` — ride 1 additionally logs an `outages` entry (a real 5 s GPS gap; ride 2 had none to log) — this is the "rich session diagnostics" OPEN-ITEMS item 5 mentions. Today's review was only possible because of it. Remaining gap: N9. |
| N4 | Enforce the picked route — WorkHomeWet auto-switched to WorkChurch | **Still relevant; same area as ride 2** | `engine.ts:584-591`: `finalize()` picks the *longest completed* candidate and only breaks exact ties toward the pick; `pickHonoured` is recorded, not enforced. The pick is a preference, not a lock. Decision needed (hard lock vs preference) — bundle into the ride-2 engine work. |
| N5 | Start auto-detect should be a suggestion, editable from RECORD | **Still relevant, confirmed, untracked** | `RecordScreen.tsx:728`: `fromId = startMode === 'auto' ? (detected?.id ?? from) : from` — the detected landmark overrides the tap unconditionally. Small fix (detected seeds `from` once; a tap wins afterwards). |
| N6 | Gates invisible when zoomed out / in FIT | **Partly addressed; needs on-device re-check** | Single-route rung: circles replaced by perpendicular ticks with a black casing, explicitly reverted-for-visibility 2026-08-24 (`routeMapView.tsx:496-527`). Gates-only rung still uses 6 px circles with transparent fill (`:488-494`) — the black rings you saw. User routes: nothing draws (§1-lever). OPEN-ITEMS already lists the owed "full both-themes map check". |
| N7 | Rounded tick ends to match the route line | **Still open, trivial** | `gate-ticks-casing`/`gate-ticks` use `'line-cap': 'butt'` (`routeMapView.tsx:519`, `:524`); the route line uses `'round'` (`:472`). Chore-sized. Possibly moot if §11's "colour sectors, neutral gates" makes ticks less prominent — your call. |
| N8 | Is pause/resume in GPX+? | **Addressed** | `<qf:button kind="pause">` present in both rides' `<qf:buttons>` (ride 1: start/pause/end). |
| N9 | Log the RECORD-tab pick, the lock, and any lock *change* in GPX+ | **Half addressed; the missing half bit today** | `routeLock` + `routeMatchDiagnostics` attempts now exist. But there is no `qf:pick`/`qf:mode` element at all (grep of both files: none), and no lock-change history. Ride 2's GPX does not record that you picked Work→Home or that the app started in route mode with no pick — I had to reconstruct that from `RecordScreen.tsx`. Small, high-value, and it directly serves the Priority-1 investigation. |

---

## Summary

**Concrete, actionable**
- Ride-2 root cause: reverse traversal of an existing route → never anchors, projector frozen at the far end, `finalize()` FINISH-recovery false-positive wrongly calls it "matched" → no naming offer, no Way created (§7). Per Nathan's ruling, the fix target is "recognize as unmatched/virgin and handle like ride 1", not "make it lock" — replay test + guard in `finalize()` (item 1), plus a "writing history" status-line touch once that recognition exists (item 1a).
- Make user-created routes drawable — one fix that unblocks the pre-START map, live map on user routes, ROUTES trace, Result VIEW TRACE, sector-coloured trail, and the gate-card map (§1-lever; §1, §5, §6, §7, §9, §11).
- Virgin leaks: bundled-manifest gates drawn on new→new free rides (§2); Leuven fallback centre (§1).
- Rider-only map before START (§1); breadcrumb trail (§3).
- Post-stop "set as reference / create Way" offer for *any* ride, regardless of match (§7, §9).
- Start auto-detect as a suggestion (N5); GPX+ pick + lock-change logging (N9); round tick ends (N7).

**Open questions needing Nathan's answer**
1. **Gate adjustment:** re-open the settled tap-then-nudge rule to allow "select, then horizontal finger scrub"? (Recommendation: keep the pad, add scrub on top — same selection model.) Nothing map-related can be briefed for the gate card until user routes are drawable regardless.
2. **Specifications:** free-text tags, fixed condition vocabulary (Dry/Wet) + variant name, or both? And are conditions per-*route* (a new Route under the Way) or per-*ride* attributes? This decides the size of §4.
3. **Route pick enforcement (N4):** hard lock for the whole ride, or preference with a visible "switched to X" notice? Hard lock is what you asked for; it means a wrong pick gives you a ride scored against the wrong route with no rescue.
4. **RESULTS tab:** keep as summary statistics, or drop to 4 tabs with the post-stop ride screen absorbing its job?
5. **RECORD layout:** tight-and-grows (recommended) or fixed final form?
6. **Virgin manifest:** strip bundled route assets from the `virgin` profile entirely, or keep them and filter every map rung by the runtime catalog? (Filtering also fixes the DEMO question in item 4 only if DEMO is handled separately.)
7. **Sector-coloured trail phase 2:** unpause? (yes/no is all that's needed.)
8. ~~Audio/TTS (N1/N2): on the virgin backlog or explicitly "after the prototype"?~~ — **Ruled 2026-09-01: after the prototype.** Nathan: it needs a new build regardless, and the priority is a good working app before extra features. See item 17.

**Already known / tracked (new evidence only)**
- OPEN-ITEMS item 4 "no route lock on ride 1" is scoped as empty-state copy, not this engine bug — but it's the same neighbourhood: ride 2 is a concrete, reproducible case in that neighbourhood, and N4 (notes5's auto-switch) belongs to it too. The specific `finalize()` false-positive itself is new and untracked (item 1 in the plan is **N**, not **T** — corrected from an earlier draft of this review).
- OPEN-ITEMS item 2/3 "still owed on-device pass": data side passes (catalog + refs prove it); display side ("a save actually shows up on ROUTES", "shows 4 sectors on ROUTES/live") fails for the documented no-RouteAsset reason.
- OPEN-ITEMS "Sector-coloured trail, phase 2": Nathan's §11 is a request to unpause, not a new design.
- OPEN-ITEMS item 4 "bundled 'Morning' in DEMO": §2's manifest-gates leak is the same class.
- OPEN-ITEMS "On-device visual checks … full both-themes map check": N6.
- OPEN-ITEMS "Free-ride new>>new design": ride 1 was exactly this path and worked; the black circles are its only visible defect.

**Just noted**
- Ride 2 is probably stored in RIDES as a Home→Work ride with meaningless sectors (`rememberRide` ran before the draft check) — check and, if so, it's the first customer for "ignore from ranking".
- `STATE.md:56` "drawable/raceable" overstates: raceable yes, drawable no. Worth a one-line correction when STATE.md is next rewritten.
- Ride 1 GPX: one 5 s GPS outage, max 35.9 km/h, no storage errors — clean.

---

## Implementation plan

Ordered by (1) blocking-ness for the virgin-install goal, (2) tracked items with new evidence, (3) new asks, (4) nice-to-haves. **T** = already tracked in OPEN-ITEMS.md (new evidence only); **N** = new, to be added to OPEN-ITEMS in a future session.

1. **Recognize an unmatched ("virgin") ride and handle it like ride 1** — *N (the specific `finalize()` false-positive is a new, untracked mechanism; it sits in the same general area as OPEN-ITEMS item 4, "no route lock on ride 1", which is about empty-state copy, not this engine bug — don't conflate the two when filing it) · medium · `app/src/live/engine.ts` (`finalize()` :572-596, anchoring :835, candidate seeding ~:152-157), `core/live.ts` (`GateDetector` arming, `LiveProjector`), `app/tests/`.* **Reframed per Nathan's 2026-09-01 ruling: the goal is not making Work→Home lock against the Home→Work route — that should never happen, they're different Ways. The goal is that the app correctly concludes "no existing route matches this ride" and treats it exactly like ride 1** (naming/save/gate offer at STOP), instead of `finalize()`'s FINISH-recovery false-positive silently swallowing it as a match. First: a replay test feeding ride 2's fixes against ride 1's built reference line, asserting `track === null` at finalize (i.e. "correctly recognized as unmatched"). Then the guard: since projection is forward-only-monotonic (chainage cannot decrease), a reverse-direction ride doesn't show up as decreasing chainage — it shows up as chainage that **never advances past its seed point** while the rider demonstrably kept moving (ride 2's fingerprint: `adv` stuck near 0 for the whole ride, only "catching up" via FINISH-gate recovery at the very last fix). FINISH-recovery must require real corridor-verified advance (anchored near the candidate's own start, or `adv` past a real threshold) before it can call a ride matched — a candidate that never demonstrably advanced is a different, unmatched Way, full stop. Fold N4's pick-enforcement decision into the same brief since it touches the same winner selection. **Before briefing:** nothing blocks the guard itself; only the N4 pick-enforcement piece folded into this brief waits on Nathan's answer to open question 3 (hard lock vs preference).

1a. **"Writing history" status line for an unmatched/virgin ride** — *N (Nathan, 2026-09-01) · small · `RecordScreen.tsx:642-666` (the existing rotating status carousel — `statusIdx`, `gpsLine`, `routeLine`, 6 s interval), `recordFlow.ts`'s `statusItemsFor()`.* Once item 1 lets the app know mid-ride "this will never match an existing route," fold a line such as "writing history" / "setting this road for the first time" into the same rotation that already alternates GPS status and route status every 6 s, in place of (or alternating with) the current "detecting route…" text, which today sits there unchanged for the whole ride with no acknowledgement that nothing will ever lock. Purely additive to an existing, tested mechanism (the PIN_MS pinning logic already prioritises GPS trouble over the carousel) — no redesign. Depends on item 1 only for *knowing* a ride is unmatched early enough to be worth showing; the copy/rotation itself can be built in parallel. No decision needed beyond final wording.

2. **GPX+ pick and lock-change logging** — *N (notes5 N9) · small · the GPX+ session writer (the module that emits `<qf:routeLock>`, not in the reviewed set) + `engine.ts` lock transitions.* Emit `<qf:pick from= to= routeId= mode=>` at START and one `<qf:lockChange>` per `lockKind`/`locked` transition with timestamp and reason. Cheap and it makes item 1 (and every future match bug) diagnosable from the file alone. No decision needed.

3. **Drawable user-created routes** — *N · large · `app/src/ui/routeMapView.tsx` (`ASSETS` :76, `defaultRouteId` :83-85, asset lookups :232-233, :344, :597), `app/src/live/userRefs.ts` (the built `RefLine` is the geometry source), `routeMapGeo.ts` (feature builders take a `RouteAsset`).* Build a `RouteAsset` at runtime from `refs.user.json` + the catalog's gate set (path, gates with lat/lon, bounds) and let every rung resolve `id → asset` through a function that checks the manifest *then* the user registry — mirroring `refFor()`'s seed-wins fallback. The PNG rung needs a vector fallback (`imgFailed` path at `:592-593` already draws from `path`). Unblocks items 4, 6, 7, 9, 11 and OPEN-ITEMS items 2/3's display checks. No decision needed; mandatory both-themes on-device check afterwards.

4. **Rider-only map before START, and on unmatched rides** — *N · small-medium · `routeMapView.tsx:344` (return-null guard), `RecordScreen.tsx` setup :1064-1075, armed :819-827, running :915-928.* When no asset resolves, render basemap + rider dot centred on the last fix instead of null; drop the Leuven fallback centre at `:382` in favour of "no fix yet → no camera target". Independent of item 3 but reads much better after it.

5. **Virgin manifest leak on free rides** — *T (item 4 class, "bundled 'Morning'") · small · `routeMapView.tsx:360-361`, `routeMapGeo.ts:105-129`, `RecordScreen.tsx:738-740`.* Either pass the runtime catalog's route ids as the filter when `freeRideRouteIds()` returns null (so "unfiltered" means "all *catalog* routes", never "all *manifest* routes"), or strip route assets from the `virgin` EAS profile. **Before briefing:** open question 6.

6. **Post-stop reference offer for any ride** — *N · medium · `RecordScreen.tsx` `onEnd` :417-466 (draft gating at :441), `store/wayCreation.ts:138-190`, `ui/wayNamingCard.tsx`.* Offer "save as new way / route" whenever the ride's endpoints don't form an existing *directed* Way, even if the engine matched something; and offer "set as reference" as an explicit action on the ride screen (item 8). Depends on item 1 being fixed so the offer is the exception, not the workaround; ships fine before item 1 as the safety net. Decision: none for the offer; the *variant* case is item 7.

7. **Specifications / route variants on an existing Way** — *N · medium-large · `store/wayCreation.ts` (`draftWayCreation` :185-190 currently refuses existing-Way rides), `ui/wayNamingCard.tsx` ("+" tag input, known-tag picker), `store/catalog.ts` (`routesForWay`, `needsRoutePick` :188-191), `RecordScreen.tsx:747-752` (variant pills).* The Way→Routes model already supports variants; the work is the "new Route on an existing Way" save path, tag storage, tag recall, and RECORD showing variants as separate options (already does, once they exist). **Before briefing:** open question 2.

8. **Ride detail screen (RIDES tap + post-stop destination)** — *N · medium (large if a real stack is needed) · `ui/RidesScreen.tsx` (accordion :43, :182-237), `ui/ResultScreen.tsx`, `RecordScreen.tsx:876-884` (post-stop navigation), the tab navigator (`tabNav`).* One full-screen ride view: trace (after item 3), sectors, gates, export, set-as-reference (item 6), discard/delete, ignore-from-ranking (new flag on the ride record). Entered from RIDES and from STOP. **Before briefing:** open questions 4 (RESULTS fate) and the navigation-model call (in-tab phase like armed/running, vs a stack).

9. **Gate card on the map + finger scrub** — *T (item 3's own "§4 map-mirror joins when user routes become drawable") for the map; N for the scrub · medium · `ui/gateAdjustCard.tsx`, `ui/gateAdjustModel.ts`, `routeMapView.tsx` (browse rung with a selected-gate highlight).* Map half is unblocked by item 3 and needs no decision. **Before briefing the scrub: Nathan must explicitly re-open the STATE.md tap-then-nudge ground rule (open question 1).**

10. **Breadcrumb trail behind the rider** — *N · small-medium · `routeMapView.tsx` (new `trail` source/layer, solid `colors.neutral` with casing, `'round'` caps), `RecordScreen.tsx` running rung (feed recent fixes).* Independent; nice on free rides and as the live fallback for user routes.

11. **Sector-coloured trail, phase 2** — *T (parked) · medium · `routeMapView.tsx:364-370`, `RecordScreen.tsx:920` (`gateColours` → `sectorColours`).* Already scoped. Visible on the virgin build only after item 3. **Before briefing:** Nathan says "unpause" (open question 7).

12. **Route pick enforcement** — *N (notes5 N4) · medium · `engine.ts:584-591` and the soft-lock/verified transitions.* Folded into item 1's brief once open question 3 is answered.

13. **Start auto-detect as a suggestion** — *N (notes5 N5) · small · `RecordScreen.tsx:728`.* Detected landmark seeds `from` once (or until the rider leaves the disc); an explicit tap wins afterwards. No decision needed.

14. **RECORD setup layout** — *N · small · `RecordScreen.tsx` setup rung styles (`pillRow`, centred ScrollView ~:1030).* **Before briefing:** open question 5.

15. **Round gate-tick ends** — *N (notes5 N7) · chore · `routeMapView.tsx:519`, `:524`.* Under the ~10-line threshold; skip the pipeline.

16. **Gate visibility when zoomed out** — *T ("full both-themes map check") · on-device check, not code yet.* Re-check after items 3 and 5; the single-route rung already has the casing fix.

17. **Audio / TTS motivational library** — *N (notes5 N1/N2) · large · new module (audio playback, sector-complete hooks in `engine.ts` events, settings toggle, voice assets).* **Explicitly deprioritized by Nathan, 2026-09-01: "not a priority as it would also require a new build — let's just focus first on making a good working app before adding extra stuff."** Parked below everything else on this list, including the chores; revisit only after the virgin-install path (items 1-16) is solid. The two proof-of-concept mp3s stay in `Nathan/Nathan's_notes5/` until then.

---

*Prepared by the Plan tier (Fable) on 2026-09-01 from Nathan's raw notes `qualifire-20260901-notes.md`, the two GPX+ files, `qualifire-catalog-20260901.json`, `qualifire-refs-20260901.json`, and `Nathan/Nathan's_notes5/Nathan's_notes5.md`, checked against the staged code subset (`app/src/live/engine.ts`, `refs.ts`, `userRefs.ts`, `ui/routeMapView.tsx`, `routeMapGeo.ts`, `RecordScreen.tsx`, `RidesScreen.tsx`, `RoutesScreen.tsx`, `ResultScreen.tsx`, `gateAdjustCard.tsx`, `wayNamingCard.tsx`, `store/catalog.ts`, `wayCreation.ts`, `gateSeeding.ts`) and against `STATE.md`/`OPEN-ITEMS.md` as of 2026-08-31. A separate Haiku Digest pass over the same code area ran in parallel but its output never reached this Plan pass (a coordinator handoff slip); this Plan tier compensated with its own targeted lookups in the staged subset rather than a full read, so file:line anchors above are first-hand, not relayed. `core/live.ts` (`GateDetector`/`LiveProjector`) and `assets/routes/routes.json` were not available; every claim that depends on them is marked as inferred. The Home–Work distance (4 580 m) was computed from the catalog coordinates by the coordinator directly from the raw GPX+/catalog files (matched almost exactly against the 4 547.8 m cross-track figure the ride-2 GPX itself recorded — the numeric fingerprint this whole review's Priority 1 rests on). Nothing was run on a device. After this draft was produced, Nathan reviewed it live and issued two corrections folded in above: (1) the ride-2 fix target is "recognize as unmatched/virgin and handle like ride 1," not "make the reverse direction lock" — reframed in the headline, §7, and items 1/1a; (2) the audio/TTS item (17) is explicitly deprioritized until the virgin-install path is solid, since it needs a new build regardless.*
