**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Update 2026-09-05:** Nathan confirmed the re-timing design (Q2 in `QUESTIONS-FOR-NATHAN.md`) — no open product question remains, see Stop-on-ambiguity item 2.
**Source:** `data/activities/TEST in virgin-app rides/qualifire-20260904/qualifire-20260904-notes.md`, "other small issue is not being able to change gates for current routes yet, only delete options are available from the ROUTES tab." Size: **small-medium** (one new store function + one draft helper ~70 lines, ~60 lines of ROUTES-screen wiring, ~6 lines of optional props on the existing card, ~6 new headless tests). No schema change, no new file except tests.
**Written by:** Fable Plan pass, 2026-09-04, against the mount at `5ae4c30`. Every line number below was read from the real file on that mount; re-verify anchors before editing (standard).

## What it is

Nathan, verbatim (2026-09-04):

> other small issue is not being able to change gates for current routes yet, only delete options are available from the ROUTES tab.
> for example for this route, the middle gate is exactly under the bridge where I have no connection, so it would be better for me if I could edit it
> As per my current convention, if I edit the gate, it should not recalculate, and just say that previous recordings will be lost (starting over basically)

Today a route's sector gates can be nudged exactly once: on the tap-then-nudge card that appears right after CREATE WAY (RecordScreen's `ending` phase, RideDetailScreen's retroactive create-way flow). Once that card is dismissed, the only thing ROUTES offers a route is "delete route" / "delete way". This WP adds the missing **entry point**: from an expanded route on ROUTES, open the same gate-adjust card on the route's real reference line with its CURRENT gates, nudge, and save — behind Nathan's stated convention, which is exactly the one he ratified on 2026-09-04 for "make this ride the reference" (`cycles/virgin-cycle1/QUESTIONS-FOR-NATHAN2.md:39`: "instead of recomputing the gates for previous ride, for know lets have it reset this ride's progress. So there should be a warning like 'This route will be overwritten and past ghosts will be lost'. And then you just start again from there."). "My current convention" in his note IS that ruling. So: **no remap of old results onto the new gates, one destructive warning, the route's stored results are cleared, new gate-set version minted.**

**Scope boundary with WP-J.** A SEPARATE work package (WP-J) redesigns the gate-adjust card itself — the other three bullets under the same note (a real zoomable map render, long-press auto-repeat on ±, START/FINISH editable). This WP-I is ONLY the entry point + the store-side reset for an EXISTING route. It reuses whatever `GateAdjustCard` exists at execute time — WP-J's card if it has landed, today's card (`app/src/ui/gateAdjustCard.tsx`) if not — and must not touch the card beyond the two optional copy props in §Fix step 3. If WP-J has landed and already exposes equivalent props, use those and skip step 3.

## Current state / investigation (real line numbers, mount `5ae4c30`)

### The card is already reusable for an existing route — with one copy problem
`app/src/ui/gateAdjustCard.tsx`:
- Props (lines 31-39): `refLine: RefLine`, `refLengthM`, `initialChainageM: number[]`, `busy`, `onKeep()`, `onSave(chainageM)`. Nothing about "new route", no results assumption, no catalog read — it is a dumb, self-contained component ("owns only selection and the working chainage list; the host screen owns persistence", header lines 9-12).
- `useState(props.initialChainageM)` at line 45: initial state is captured ONCE per mount. A host that can switch which route is being edited while the card stays mounted must remount it (`key={routeId}`), or the chainages go stale. RecordScreen/RideDetailScreen never hit this (one draft per screen life); ROUTES can (edit route A, cancel, edit route B) — so the `key` is required there.
- Copy is hardcoded for the just-created case: title `Sector gates — proposed` (line 92), subtitle `Seeded at 25/50/75% of your ride, nudged clear of where you stopped. A proposal, not a benchmark — tap a gate to nudge it, or keep it and refine after a few rides.` (lines 93-97), and the dirty-state secondary button `discard nudges — keep the proposal` (line 169). All three are wrong for "editing a route I have ridden six times". Button labels `SAVE GATES` / `KEEP GATES` (line 164) read fine in both contexts.
- `isAdjustable` (`gateAdjustModel.ts:28-30`) locks index 0 and n-1 (START/FINISH) — WP-J's concern, untouched here; the store function below must NOT depend on that lock (see step 1: it validates shape, not which indices moved).
- `clampNudge` keeps every nudge ≥ `MIN_GATE_GAP_M` (50 m) from both neighbours and ≤ `refLengthM`, so anything the card hands `onSave` is already strictly increasing.

### ROUTES today is list-only with inline expand + delete
`app/src/ui/RoutesScreen.tsx` (261 lines):
- No route-detail screen exists for ROUTES (Nathan asks for one in the same note — "tapping on a 'place' or a 'way' should open it similarly in a new tab" — that is a separate, larger UI WP; this WP goes inline, and its store function carries over unchanged whenever that screen is built).
- Lines 176-236: each way renders as an outer `<Pressable onPress={() => setOpen(isOpen ? null : w.id)} style={st.card}>` (line 183). When open, lines 199-223 map each route: label, `rankedCountFor` caption, a `RouteMapView variant="browse"` (line 211), and `routeDeletable ? <Pressable … delete route>` (lines 213-220). `delete way` follows (224-231).
- **Nested-Pressable footgun:** because the whole card is the toggle Pressable, any touch on a non-Pressable child (the card's own map box, its text, the gate card's map background) bubbles to that outer Pressable and collapses the way — which would unmount an inline gate-adjust card mid-edit and drop the working chainages. The existing delete buttons don't suffer because they ARE Pressables (deepest responder wins). The gate card is mostly non-Pressable surface. Step 2 restructures this.
- State/refresh idiom (lines 113-118): `open`, plus `setTick`/`bump()` re-read of `currentCatalog()`/`userCatalog()` after a mutation. No `busy` state exists yet (add one).
- `applyDeletion` (lines 50-65) is the local precedent for the lastRide mirror after a results reset: `removeStoredResult` + `dropRecorded` per result, `clearLastRide()` if `getLastRide()?.routeId === routeId`, then `bump()`.
- Footer text lines 238-241: "Route lines are pre-rendered from your own rides, with the measured gates marked. Moving a middle gate keeps lap history comparable; moving START or FINISH does not." — the second sentence states the B-20 remap theory, the opposite of the reset convention this WP implements. It becomes false the moment this lands; step 2 replaces it. (Nathan separately wants this whole paragraph gone as "AI clutter" — that de-cluttering is its own item; here only the falsehood is fixed.)
- Imports already present that this WP needs: `currentCatalog, saveUserCatalog, userCatalog`, `removeStoredResult, storedResultsForRoute`, `clearLastRide, dropRecorded, getLastRide`, `routeLabelIn`, `Alert`. Missing: `replaceRecorded` (lastRide.ts:297), `getStoredResult` (resultsStore.ts:214), `createExpoFsAdapter` (`../storage/expoFsAdapter.ts`), `GateAdjustCard`, the two new store exports.

### The precedent to mirror: `promoteRideToReference`
`app/src/store/wayFromRide.ts:85-136` (doc comment 67-84). Its shape, step by step, and what this WP does with each:

| promote step | lines | WP-I: reuse or diverge |
|---|---|---|
| refuse unless the route is in `userCatalog()` (seed routes never editable) | 88-92 | **reuse verbatim** |
| refuse when the ride is already the reference | 93-95 | **n/a** — no ride involved |
| `readRideFixes` + `buildRefFromRideFixes`, refuse when no line can be built | 96-100 | **diverge:** no new ride, no new line. The line is the route's EXISTING `userRefFor(route.refLineId)` (`live/userRefs.ts:104`); refuse if null |
| `version = (gateSetFor(user, routeId)?.version ?? 0) + 1`; `addGateSet(user, {routeId, version, chainageM: seedGateChainages(...), createdAtMs, origin:'geometric', note})` | 103-111 | **reuse the versioning + `addGateSet` exactly**; **diverge on chainages:** they come from the card (the rider's own nudges), NOT from `seedGateChainages` — `gateSeeding.ts` is not called at all. `origin` stays `'geometric'` (the honesty clause: a hand-placed gate is still not a `'measured'` one) |
| rewrite `route.referenceRideId` in the same derived catalog | 112-115 | **diverge:** untouched — the reference ride is still the reference |
| one `saveUserCatalog`, first, the only refusable write | 116-117 | **reuse verbatim** |
| `saveUserRef(route.refLineId, built.ref)` | 119 | **diverge:** no ref write — the line did not change |
| clear: `storedResultsForRoute(routeId)` → `removeStoredResult` each | 123-124 | **reuse verbatim** |
| immediate re-derive: `backfillMissingResults(fs, candidates)`; `retimed` = those scored on this route again | 125-127 | **reuse verbatim** (candidates = `clearedRideIds`, nothing else to add — there is no "new ride" that might lack a result) |
| return `{ ok, gateSetVersion, ghostsCleared, clearedRideIds, retimed }` | 129-135 | **reuse the shape**, plus `moved` (see below) |

Why the immediate re-derive is kept (read this before questioning it): WP-H §3.3b item 5 (`cycles/virgin-cycle1/WP-H-ride-detail-screen.md:184`) established that a bare delete of results is NOT a reset that sticks — `backfillMissingResults` (`resultsStore.ts:428-482`) re-derives any ride that has neither a stored result nor an unmatched marker, and it runs at every boot (`lastRide.ts:270`) and every RIDES refresh. So the cleared rides come back re-timed against the current gates regardless; running that re-derive immediately, awaited, means the state Nathan sees on confirm is the final state, not one that silently changes at next boot. Old times, ranks and old-gate sector splits are gone (what "past ghosts will be lost" promises); the rides are re-timed from their raw recordings against the NEW gates. This is precisely the design Nathan already accepted for promote (§8.8 flagged the alternative — a "cleared" marker that keeps the rides off the route for good — as a possible follow-on, never requested). See Stop-on-ambiguity for the one honest question this leaves.

The one existing gate-save function, `saveAdjustedGates` (wayFromRide.ts:228-242), is NOT reusable: it hardcodes `version: 2` (line 233, correct only for the just-created v1 route) and clears nothing (correct only because a just-created route has no results). Leave it alone; RecordScreen/RideDetailScreen keep using it.

### What re-reads the gates after the write (nothing to invalidate)
- `RouteMapView variant="browse"` resolves its asset per render through `assetFor(id)` → `resolveRouteAsset` (`routeMapView.tsx:132-133, 318`; `routeAssetRuntime.ts:104-120`), whose cache key includes `gateSet.version|chainageM` (line 112) — so after `bump()` the browse map on ROUTES redraws the moved gate ticks by itself.
- `catalogTrackSpecs()` (`live/tracks.ts:21-44`) reads `currentCatalog()` at call time → the live engine and the backfill see the new set at once (WP-H 27 already proves this for promote).
- `validateCatalog` (`catalog.ts:74-80`) requires ≥2 gates, strictly increasing chainages, and that `route.gateSetVersion` resolves (line 46-47) — `addGateSet` satisfies the last by construction.

## The fix

### Step 1 — store: `editRouteGates` + `gateEditDraftFor` in `app/src/store/wayFromRide.ts`
Append after `saveAdjustedGates` (line 242). No React, no Alerts, no `ui/` imports (the module's own rule, header lines 5-7). New import needed: `userRefFor` from `'../live/userRefs.ts'` (add to the existing `import { buildRefFromRideFixes, saveUserRef } from '../live/userRefs.ts'` line 20).

```ts
/** WP-I (virgin-cycle2): the gate-adjust draft for an EXISTING user route —
 * its own reference line and its CURRENT gate set, so RoutesScreen can open
 * GateAdjustCard on it. null when the route is not user-owned, has no
 * resolvable user ref (a way saved without a line), or no gate set. Pure
 * read, no I/O. Same shape as the create-way draft on purpose: the card and
 * the screen wiring do not care which flow produced it. */
export function gateEditDraftFor(routeId: string): GateAdjustDraft | null {
  const user = userCatalog();
  const route = user.routes.find((r) => r.id === routeId);
  if (!route) return null;
  const ref = userRefFor(route.refLineId);
  const gates = gateSetFor(user, routeId, route.gateSetVersion);
  if (!ref || !gates) return null;
  return { routeId, ref, refLengthM: ref.length, chainageM: [...gates.chainageM] };
}

export type EditGatesOutcome =
  | { ok: true; moved: false }
  | {
      ok: true;
      moved: true;
      /** the gate-set version minted */
      gateSetVersion: number;
      /** every rideId whose stored result on this route was removed */
      clearedRideIds: string[];
      /** of clearedRideIds, the ones the immediate re-derive scored on THIS route again */
      retimed: string[];
    }
  | { ok: false; errors: string[] };

/** WP-I: move the gates of an EXISTING user route to `chainageM` — Nathan's
 * "edit the gate … it should not recalculate, and just say that previous
 * recordings will be lost (starting over basically)" (2026-09-04), i.e. the
 * SAME reset-not-remap convention as promoteRideToReference above, minus the
 * parts that are about a new ride: the reference line is untouched (no
 * readRideFixes/buildRefFromRideFixes/saveUserRef), referenceRideId is
 * untouched, and the chainages are the rider's, not seedGateChainages'.
 * Kept identical: user-route-only refusal, version = latest + 1 through
 * addGateSet (old versions stay), one refusable catalog write first, then
 * every stored result on the route removed and the affected rides re-derived
 * at once through the ordinary backfill (see promote's doc comment for why a
 * bare delete would come back re-timed at the next boot anyway). Unmoved
 * gates are a free no-op, as saveAdjustedGates. Refuses, with no writes, for
 * a non-user route, a missing gate set or ref, a chainage list of a different
 * length, or one that is not strictly increasing within [0, ref.length]. */
export async function editRouteGates(
  routeId: string, chainageM: number[], fs: FsAdapter,
): Promise<EditGatesOutcome> {
  const user = userCatalog();
  const route = user.routes.find((r) => r.id === routeId);
  if (!route) {
    return { ok: false, errors: [`"${routeId}" is not one of your own routes — a shipped route's gates cannot be edited`] };
  }
  const current = gateSetFor(user, routeId);
  const ref = userRefFor(route.refLineId);
  if (!current || !ref) {
    return { ok: false, errors: ['this route has no gate set or no reference line to place gates on'] };
  }
  if (chainageM.length !== current.chainageM.length) {
    return { ok: false, errors: [`expected ${current.chainageM.length} gates, got ${chainageM.length}`] };
  }
  for (let i = 0; i < chainageM.length; i++) {
    const c = chainageM[i];
    if (!(c >= 0 && c <= ref.length) || (i > 0 && c <= chainageM[i - 1])) {
      return { ok: false, errors: [`gate ${i} at ${c} m is not on the line or not after gate ${i - 1}`] };
    }
  }
  const moved = chainageM.some((v, i) => Math.abs(v - current.chainageM[i]) > 1e-6);
  if (!moved) return { ok: true, moved: false };

  const version = current.version + 1;
  const errs = await saveUserCatalog(
    addGateSet(user, {
      routeId,
      version,
      chainageM: [...chainageM],
      createdAtMs: Date.now(),
      origin: 'geometric',
      note: `edited from ROUTES (tap-then-nudge) over v${current.version} (WP-I, virgin-cycle2)`,
    }),
  );
  if (errs.length > 0) return { ok: false, errors: errs };

  // The reset, then the immediate re-derive — promoteRideToReference's exact loop.
  const clearedRideIds = storedResultsForRoute(routeId).map((r) => r.rideId);
  for (const id of clearedRideIds) await removeStoredResult(id);
  await backfillMissingResults(fs, clearedRideIds);
  const retimed = clearedRideIds.filter((id) => getStoredResult(id)?.routeId === routeId);
  return { ok: true, moved: true, gateSetVersion: version, clearedRideIds, retimed };
}
```
Notes for Execute: `gateSetFor(user, routeId)` with no version = the LATEST version (catalog.ts:211-219); `route.gateSetVersion` equals it by `addGateSet`'s construction — using the latest for the bump matches promote line 103 exactly. `GateAdjustDraft`, `FsAdapter`, `gateSetFor`, `addGateSet`, `saveUserCatalog`, `userCatalog`, `storedResultsForRoute`, `removeStoredResult`, `backfillMissingResults`, `getStoredResult` are all already imported in this file (lines 17-28).

### Step 2 — ROUTES entry point in `app/src/ui/RoutesScreen.tsx`
1. **Imports.** Add `replaceRecorded` to the `./lastRide.ts` import (line 28); add `getStoredResult` to the `../store/resultsStore.ts` import (line 27); add `import { editRouteGates, gateEditDraftFor, type GateAdjustDraft } from '../store/wayFromRide.ts';`, `import { GateAdjustCard } from './gateAdjustCard.tsx';`, `import { createExpoFsAdapter } from '../storage/expoFsAdapter.ts';`.
2. **State** (next to lines 113-118): `const [editing, setEditing] = useState<GateAdjustDraft | null>(null);` and `const [busy, setBusy] = useState(false);`.
3. **Fix the nested-Pressable footgun.** Change the way card (line 183-184) from `<Pressable key={w.id} onPress={…toggle…} style={[st.card, …]}>` to `<View key={w.id} style={[st.card, …]}>` and wrap ONLY the header row (lines 185-196, the `<View style={[st.row, …]}>` holding "from → to / N routes / ▾") in `<Pressable onPress={() => setOpen(isOpen ? null : w.id)}>`. Close the matching tag at line 234. Consequence, deliberate: tapping the open body (the browse map, captions) no longer collapses the card — only the header toggles. Nothing else changes.
4. **The button.** In the per-route block, after the `delete route` Pressable (lines 213-220), render — for a user route only, and only when a draft can be built:
   ```tsx
   {routeDeletable && gateEditDraftFor(r.id) !== null ? (
     <Pressable
       style={[st.deleteBtn, { borderColor: t.cardBorder }, busy && st.dim]}
       disabled={busy}
       onPress={() => { const d = gateEditDraftFor(r.id); if (d) setEditing(d); }}
     >
       <Text style={[st.deleteText, { color: t.textDim }]}>edit gates</Text>
     </Pressable>
   ) : null}
   ```
   (`routeDeletable` = `!isSeedOwned(SEED,'route',r.id)`, already computed at line 201 — the same user-route rule `editRouteGates` enforces; `gateEditDraftFor` is a cheap pure read, fine per render on a list this size.) Style reuse: the dim-outline `deleteBtn` (lines 252-259) is this screen's only button style and is deliberately never the yellow accent; add `dim: { opacity: 0.45 }` to the StyleSheet (as gateAdjustCard.tsx:194). If the two buttons should sit side by side rather than stacked, wrap both in a `flexDirection: 'row', gap: 8` View — Execute's call, either is fine.
5. **The card.** Directly under that route's `delete route`/`edit gates` buttons (still inside the route's `<View key={r.id}>`), when `editing?.routeId === r.id`:
   ```tsx
   {editing !== null && editing.routeId === r.id ? (
     <View style={{ marginTop: 12 }}>
       <GateAdjustCard
         key={editing.routeId}
         refLine={editing.ref}
         refLengthM={editing.refLengthM}
         initialChainageM={editing.chainageM}
         busy={busy}
         title={`Sector gates — ${routeVariantLabel(r.id, w, r.specs)}`}
         subtitle="Tap a gate to nudge it. Saving moved gates resets this route's history — past results are re-timed from their recordings against the new gates, old times and ranks do not survive."
         discardLabel="discard nudges — keep the current gates"
         onKeep={() => setEditing(null)}
         onSave={(ch) => confirmEditGates(r.id, ch)}
       />
     </View>
   ) : null}
   ```
   `key` is mandatory (card captures `initialChainageM` once per mount — see Current state). Opening the editor for a second route while one is open simply replaces `editing` (the first card unmounts; its unsaved nudges are discarded — acceptable, they were never saved and KEEP costs nothing).
6. **The warning + the write** — two functions inside the component (they need `bump`/`setBusy`/`setEditing`), mirroring `RideDetailScreen.tsx`'s `confirmPromote` (341-357) and `onPromote` (315-339) one-for-one:
   ```tsx
   function confirmEditGates(routeId: string, chainageM: number[]) {
     const n = storedResultsForRoute(routeId).length;
     const ghosts = n === 0
       ? 'There are no past results on this route yet.'
       : `Its ${n} past result${n === 1 ? ' is' : 's are'} discarded and re-timed from the recordings against the new gates — old times and ranks do not survive.`;
     Alert.alert(
       `Move the gates of "${routeLabelIn(currentCatalog(), routeId)}"?`,
       `This route's history will be reset and past ghosts will be lost.\n\n${ghosts} The reference line and ride recordings are kept.`,
       [
         { text: 'Cancel', style: 'cancel' },
         { text: 'Save & reset', style: 'destructive', onPress: () => void onEditGates(routeId, chainageM) },
       ],
     );
   }

   async function onEditGates(routeId: string, chainageM: number[]) {
     setBusy(true);
     try {
       const out = await editRouteGates(routeId, chainageM, createExpoFsAdapter());
       if (!out.ok) {
         Alert.alert('Could not save the gates', out.errors.join('\n'));
         return;
       }
       if (out.moved) {
         // lastRide coherence — applyDeletion's steps (above) plus replaceRecorded
         // for whatever the immediate re-derive came back with (RideDetailScreen's onPromote).
         for (const id of out.clearedRideIds) dropRecorded(id);
         if (getLastRide()?.routeId === routeId) clearLastRide();
         for (const id of out.clearedRideIds) {
           const r = getStoredResult(id);
           if (r) replaceRecorded(r);
         }
       }
       setEditing(null);
       bump();
     } catch (e) {
       Alert.alert('Could not save the gates', e instanceof Error ? e.message : String(e));
     } finally {
       setBusy(false);
     }
   }
   ```
   The warning sits at SAVE, not at "edit gates": opening the card and pressing KEEP GATES costs nothing (exactly as on the create-way flow), so the only destructive moment is the save — the same placement promote uses (confirm immediately before the one write). The card's subtitle already says up front what saving will do, so Nathan knows before he starts nudging. `out.moved === false` cannot actually reach here (the card calls `onKeep`, not `onSave`, when nothing moved — gateAdjustCard.tsx:161) but the branch keeps the wiring honest.
7. **Footer copy** (lines 238-241): replace the second sentence so it stops asserting the remap theory. Suggested: `Route lines are pre-rendered from your own rides, with the measured gates marked. Editing a route's gates resets its history — every past ride is re-timed against the new gates.` (Or drop the paragraph entirely if the de-clutter item has landed by then — check.)

### Step 3 — two/three optional copy props on `app/src/ui/gateAdjustCard.tsx` (skip if WP-J has landed with equivalents)
Additive only, defaults = today's strings byte-for-byte, so RecordScreen/RideDetailScreen render unchanged:
- `GateAdjustCardProps` (31-39): add `title?: string; subtitle?: string; discardLabel?: string;`.
- Line 92: `{props.title ?? 'Sector gates — proposed'}`.
- Lines 93-97: `{props.subtitle ?? 'Seeded at 25/50/75% of your ride, nudged clear of where you stopped. A proposal, not a benchmark — tap a gate to nudge it, or keep it and refine after a few rides.'}` (keep the existing string exactly; it is one JSX text node today — collapse it to one string literal).
- Line 169: `{props.discardLabel ?? 'discard nudges — keep the proposal'}`.
Nothing else in the card changes. The hint `tap G1–G3 to nudge a gate` (line 155) and the START/FINISH lock are WP-J's.

### Not in scope (say so in the execution report if tempted)
- A ROUTES detail screen (Nathan's "same as RIDES" wish) — separate WP; when built, the `edit gates` button and the card move there and `editRouteGates`/`gateEditDraftFor` are reused as-is.
- Anything about the card's map, long-press, START/FINISH — WP-J.
- Fixing `saveAdjustedGates`' hardcoded `version: 2` — not a bug for its only caller.
- A "cleared" marker that keeps old rides off the route for good (WP-H §8.8's design (i)) — not requested; see Stop-on-ambiguity.

## Acceptance criteria
1. On ROUTES, an expanded USER route (one that shows `delete route`) whose reference line resolves also shows `edit gates`; a seed route and a user route without a resolvable ref show no such button.
2. Tapping `edit gates` opens the gate-adjust card inline under that route, drawn on the route's real reference line with its CURRENT gates (the ones the browse map shows), title naming the route, subtitle stating the reset. KEEP GATES closes it with no write, no dialog.
3. Touching the open card's map background or captions does NOT collapse the way card (only the header row toggles).
4. SAVE GATES with a moved gate → one `Alert.alert` (Cancel / `Save & reset`, destructive) whose body says the history is reset, names the count of past results discarded and re-timed, and says the line and recordings are kept. Cancel writes nothing.
5. Confirm → `catalog.user.json` gains a gate set at `latest+1` with the nudged chainages, `origin: 'geometric'`; the old set(s) survive; `route.gateSetVersion` points at the new one; `route.referenceRideId` and `refs.user.json` are byte-unchanged; every stored result that was on the route is removed and the affected rides are re-derived at once (their result files reappear against the new gates where the recording still yields a clean/interrupted lap with corridor coverage; otherwise they get the ordinary unmatched marker). The card closes, the browse map shows the gate in its new place, the "N ghost laps" caption re-reads.
6. Unmoved gates never write (`{ ok: true, moved: false }`), any refusal (non-user route, length mismatch, non-increasing, off-line) writes nothing at all.
7. RecordScreen's and RideDetailScreen's existing gate cards render exactly as before (default copy).
8. STATE.md/OPEN-ITEMS.md updated by the coordinator when this lands: the ROUTES-tab bullet gains "edit gates (reset convention)"; the footer-copy falsehood is noted fixed.

## Verification
```
cd app && node --experimental-strip-types tests/run.ts     # zero FAIL
cd app && ./node_modules/.bin/tsc --noEmit                  # exit 0
```
New headless tests, in `app/tests/waycreation_suite.ts` on the existing `wph*` harness (lines 527-634: `wphSetup()` boots a memory-fs catalog/results/refs stack with user route `WphRoute`, gate set v1 `[50,500,1000,1500,1950]`, three ghost results `ghost1..3`; `wphWriteRideFile`/`wphFixes` write a synthetic straight ride). The harness registers NO user ref for `WphRoute` — the promote tests build one from a ride. So each edit test first establishes a ref, cheapest via `await wphUserRefs.saveUserRef('WphRoute', wphUserRefs.buildRefFromRideFixes(fixes)!.ref)` where `fixes` is a `wphFixes(200, 0.0002, …)` track mapped to `RefFixInput` (`{ lat, lon, tUnixMs: t * 1000 }` — `tUnixMs` is required, userRefs.ts:38-45; ≈4.4 km, so the v1 chainages fit), or via a prior `promoteRideToReference` call (then the current set is v2 and the edit mints v3 — either is fine, just assert relative to `gateSetFor(userCatalog(),'WphRoute').version`). Place them after WP-H 18 (line 862), numbered `WP-I 1..6`:
1. `gateEditDraftFor`: null for a seed/unknown route and for a user route with no ref; with a ref, returns `{ routeId, ref, refLengthM === ref.length, chainageM }` equal to the CURRENT set's chainages (a copy — mutating it does not mutate the catalog).
2. Unmoved: `editRouteGates('WphRoute', sameChainages, fs)` → `{ ok:true, moved:false }`, catalog byte-identical, all three ghosts still stored.
3. Moved (G2 +150 m): `{ ok:true, moved:true, gateSetVersion: prev+1 }`; the new set carries the given chainages, `origin:'geometric'`; the old set survives; `route.gateSetVersion === prev+1`; `route.referenceRideId` unchanged (`'oldref1'`); `refs.user.json` content unchanged (compare `fs.files.get('refs.user.json')` before/after, after `flushUserRefWrites()`).
4. The reset: `clearedRideIds` sorts to `['ghost1','ghost2','ghost3']`; `getStoredResult('ghostN') === null` for each (their synthetic ghosts have no ride file, so the backfill leaves them gone — `retimed` is `[]`); a result on `SomeOtherRoute` survives in memory and on disk (mirror WP-H 24's check).
5. The immediate re-time: write a real ride file for a ride, `saveResult` a ghost for it on `WphRoute`, edit the gates → that ride is in `clearedRideIds` AND in `retimed`, its fresh stored result has `derivedBy.gateSetVersion === prev+1` and `routeId === 'WphRoute'`.
6. Refusals write nothing (catalog + results + refs JSON-stringified before/after): seed route id (`'Morning'`), unknown route, wrong length (`[50,1000,1950]`), non-increasing (`[50,1000,900,1500,1950]`), beyond the line (`[50,500,1000,1500, ref.length+10]`).
Also: `catalogTrackSpecs()` (mirror WP-H 27, line 753) resolves `WphRoute` with the NEW chainages after an edit — fold into test 3 or add as WP-I 7.

No automated UI test exists for RN screens in this repo; ACs 1-4 and 7 need Nathan's on-device look — say so plainly in the execution report rather than claiming them from code.

## Stop-on-ambiguity
If any anchor above does not match the file (line drift from WP-A..H or WP-J landing first, a prop name already taken, a `wph*` helper renamed), or any call here is undecided, STOP and report verbatim — never guess, never rule on it from the coordinator's chat; forward it to a fresh Fable Plan pass. Specifically:

1. **WP-J ordering.** If WP-J has landed, read its `GateAdjustCard` first: use its props for title/subtitle/discard copy if it has them (skip step 3), and note that START/FINISH may now be movable — `editRouteGates` already accepts that (it validates shape, not indices), so nothing here changes; if WP-J changed the card's `onSave` signature or draft type, stop and report.
2. ~~Re-time vs. truly gone (the one product question).~~ **RESOLVED 2026-09-05 — Nathan confirmed re-timing is what he wants** (`cycles/virgin-cycle2/QUESTIONS-FOR-NATHAN.md` Q2): "if its possible to re-recompute accurately then lets have the previous rides re-timed against the new gates position. I just thought it would be difficult to implement so I proposed to just start from 'scratch'..." — i.e. his original "starting over" wording was a guess at what was FEASIBLE, not a preference for discarding history; re-timing (this brief's design, already built) is exactly what he wants. No follow-on needed — do not build WP-H §8.8's "cleared marker" alternative.
3. **Dialog copy** is Plan's suggestion in Nathan's own register ("past ghosts will be lost", mirroring promote's); the exact wording is not ratified. Execute uses it as written; do not invent a two-step confirm (settings' reset-to-virgin idiom) — one route, one step, as promote.
4. **Warning placement** is at SAVE (destructive moment), with the subtitle as the up-front notice. If the coordinator or Nathan wants the Alert at the `edit gates` tap instead, that is a three-line move, not a redesign — but do not do both.
5. **`edit gates` visibility** is gated on `gateEditDraftFor(r.id) !== null`. A user route with no user ref (a way created when the reference could not be built — `createWayFromDraft`'s null-ref path, wayFromRide.ts:206-209) silently shows no button. If a visible-but-disabled affordance with an explanation is preferred, stop and ask; do not guess.
6. **The way-card restructure (step 2.3)** changes what a body tap does (no longer collapses). If that reads as out of scope, the alternative is to render the card OUTSIDE the way `Pressable` (as a sibling below it, keyed on `editing`) — functionally equivalent for this WP; pick one, say which, do not leave the card inside a toggle Pressable.
