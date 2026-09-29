# 05 — No duplicate places: existing places are proposed while you type, a taken name is refused, and two places can be merged or renamed

**Source: Nathan, 2026-09-29.** His words: "after saving the plain ride, i decided i actually
might go back to that place, so i decided to go in the RIDES tab, select the ride and select
the option to make it the reference of a new route. However there i had to input again Work
and Store as my from/to options. But instead of recognizing Work already existed it made a
separate place for it, so now i have two 'Work' places defined which cannot be deleted or
merged. This is a big mistake, the app should either propose existing places when you start
typing, or put up a warning saying 'This place already exist, do you want to select' or
something like that so we do not make duplicate places."

**What this brief delivers.** (1) *Prevention* — on the naming card a new-place input proposes
matching existing places as you type (tap one: that endpoint becomes that place), an exact
existing name is refused with a hint, and the store refuses a duplicate name as a belt.
(2) *Recovery* — a place's detail page (ROUTES › place) gets **Rename** and **Merge into
another place…**, a pure, tested catalog operation that re-points every route, folds the
routes that become twins, and drops the loser. Nathan's two "Work"s are fixed with one merge.
(3) The **shared place picker** (`ui/placePicker.tsx` + `store/placeSearch.ts`) and the
**endpoint-choice model** (`applyEndpointChoices` in `store/routeCreation.ts`) that brief 06
reuses — 06 depends on this brief.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `2267b9c`, i.e. BEFORE briefs 02/04 land). Executor: Sonnet, cold, this file
only. Brief 05 of `virgin-cycle18`. **Order: after brief 04** (04 rewrites the naming card's
header, props block, buttons block and styles; this brief edits the card's inputs region,
which 04 leaves byte-for-byte, and ONE line inside 04's buttons block — anchors are quoted
text, not line numbers). **Before brief 06** (06 extends the picker to endpoints that
already resolved to a place).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29 and, where
  brief 04 changes the file, from brief 04's own quoted edits. If a quoted line is not
  where the brief says, or a name/signature differs, **stop and report the mismatch
  verbatim** (file, line, expected, found). Never guess, never patch around it, never rule
  on it yourself.
- **Precondition (brief 04 landed):** `grep -n "onSaveFree" app/src/ui/routeNamingCard.tsx`
  → a hit in the props block and one in the buttons block; `grep -n "plain ride" app/src` →
  no hits. Otherwise brief 04 has not landed — stop and report.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. Files touched (exactly these): **new** `app/src/store/placeSearch.ts`,
  **new** `app/src/store/catalogMerge.ts`, **new** `app/src/ui/placePicker.tsx`,
  `app/src/store/routeCreation.ts`, `app/src/store/routeFromRide.ts`,
  `app/src/ui/routeNamingCard.tsx`, `app/src/ui/RecordScreen.tsx`,
  `app/src/ui/RideDetailScreen.tsx`, `app/src/ui/catalogDetailModel.ts`,
  `app/src/ui/CatalogDetailScreen.tsx`, **new** `app/tests/placesearch_suite.ts`,
  **new** `app/tests/catalogmerge_suite.ts`, `app/tests/routecreation_suite.ts`,
  `app/tests/catalogdetail_suite.ts`, `app/tests/run.ts`.
- Do not touch `DemoScreen.tsx` (its two `RouteNamingCard` mounts keep compiling — every
  prop this brief adds is optional and `onSave`'s new second argument may be ignored by a
  callback that declares one parameter), `store/catalog.ts` (`validateCatalog` is the
  contract, not the place for a label rule — see decision 2), `store/catalogDelete.ts`,
  `store/landmarkUsage.ts`, `store/resultsStore.ts`, `live/*`, `storage/*`, `recordFlow.ts`.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief, or anything under `cycles/virgin-cycle16/` / `virgin-cycle17/`.

## Symptom, restated as the code sees it — and the ROOT CAUSE, proven

Nathan's ride: RECORD pick `Work → new`, ride to the store, END, card dismissed (a "plain
ride"). Later on RIDES › that ride › **Make this the reference of a new route**:

1. `RideDetailScreen.tsx:251-253` `draftRouteFromRide(request.rideId, …)` →
   `routeFromRide.ts:161-173` → `draftRouteCreation(scoped, …)` (`routeCreation.ts:188-288`).
   Each endpoint is resolved by **coordinates only**: `landmarkAt(c, first)` (`catalog.ts:141-157`,
   inside a disc) → `'existing'`; else `fittedRadius` (`routeCreation.ts:114-124`: 120 m
   shrunk to clear every existing disc, floor 30 m) → `'new'` with a draft landmark
   `lm:<rideId>:start` and **`label: ''`** (`newLandmark`, `:143-159`); only when not even 30 m
   fits does it snap to the squeezing disc's place (`:218-220`, `:247-253`). His start fix was
   outside the existing Work disc (120 m, one visit's worth — `NEW_LANDMARK_RADIUS_M` doc,
   `:40-44`) and not engine-matched (no route existed), so the WP-F 300 m slack (`:226-231`)
   never applied → **`start.kind === 'new'`**, likewise the end.
2. The card renders a `TextInput` for every `'new'` endpoint (`routeNamingCard.tsx:115-124`,
   `132-141`) and NOTHING else: no list of existing places, no lookup of the typed text.
   `RouteNamingCardProps` (`:37-58`) carries two labels, `loop`, `busy`, the WP-F/WP-G
   flags and a spec vocabulary — **no catalog, no landmark list**.
3. `onSave` → `createRouteFromDraft` (`routeFromRide.ts:219-237`) →
   `buildRouteCreationCatalog` (`routeCreation.ts:327-415`), which pushes
   `{ ...draft.start.draft, label: names.start.trim() }` (`:382-387`) with **no check that the
   label already names a landmark**. `validateCatalog` (`catalog.ts:45-128`) checks id
   duplicates, disc overlap, radius, route/way links, spec twins — **never labels**
   (`Landmark.label` is free text, `types.ts:21-35`). The second "Work" lands ~150 m from the
   first with a disc shrunk to not overlap it. Two landmarks, distinct ids, one name.
4. Stuck: `removeLandmark` (`catalogDelete.ts:157-172`) refuses while any route references
   the landmark (`routeReferences`, `:60-62`), and the ROUTES place page only offers
   *Delete*, hidden unless `deletable` (`catalogDetailModel.ts:100`,
   `CatalogDetailScreen.tsx:201-205`). There is **no rename and no merge anywhere**:
   `grep -rn "rename\|merge" app/src/store app/src/ui --include=*.ts --include=*.tsx -il`
   → `catalog.ts` (`mergeCatalogs`, seed+user), `sports.ts` (`renameSport`), nothing about
   landmarks. Deleting a route frees its landmarks only when nothing else references them
   (`orphanedLandmarkIds`, `:68-88`) — Nathan would have to delete his routes to lose the
   twin, which is the wrong trade.

**Where landmark ids live (so a merge knows what to re-point) — enumerated from code:**
- `Route.startLandmarkId` / `endLandmarkId` (`types.ts:40-41`) — the only structural refs.
  `Way` references a route, never a landmark; gate sets are keyed by `wayId`; user refs by
  `way.refLineId`; stored results by `rideId` → `wayId` (`resultsStore.ts:98`, `:224`);
  `lastRide.ts`'s recorded window by way; `landmarkUsage.ts` derives counts from routes on
  demand (no cache); `resultsListModel.ts:115-116`, `defaultWay.ts:80`, `rideDetailModel` /
  `catalogDetailModel` all look labels up by id at read time.
- `grep -rn -i "landmark" app/src/live app/src/location app/src/storage app/core/src` →
  **no hits**: the live engine, gates, reference lines and the raw ride files know nothing
  about landmarks. A route whose endpoint disc does not contain its reference line's end is
  not an invariant anyone checks (`validateCatalog` has no such rule) — which is exactly
  what already happens after the WP-F slack snap (`MATCHED_ENDPOINT_SLACK_M`, 300 m past
  the disc edge) and what brief 06 relies on too.
- The ride sidecar's `pick` event (`storage/types.ts:144-156`: `from`/`to` ids +
  `fromLabel`/`toLabel`) is a START-time **log**, read only for the RIDES row label fallback
  (`RidesScreen.tsx:142-144`, `RideDetailScreen.tsx:226-229`). History; not rewritten by a
  merge (decision 7).

**Not the cause (checked, leave alone):** `findWayWithSpecs` + the card's `duplicate` flag
(`routeNamingCard.tsx:73-80`) dedupe **specs within one route** only; the seed catalog
(`catalog.seed.json` labels `home`, `work`, …) is empty on the virgin build; sport scoping
(`scopeCatalog`) keeps all landmarks (`sports.ts:129-137`), so the twin is visible under every
sport.

### Proof (read from the tree, 2026-09-29)

`routecreation_suite.ts:164-176` builds `{ start: '  Home ', end: 'Work' }` on an empty catalog
and asserts the trimmed label lands; nothing in `routecreation_suite.ts`, `catalogdelete_suite.ts`,
`catalogstore_suite.ts` or `catalogdetail_suite.ts` ever asserts a label is unique
(`grep -n "already exists\|duplicate label\|same name" app/tests/*.ts` → only the WP-G spec
duplicates). Building the WP-G 1 fixture twice with `{ start: 'Home', end: 'Work' }` at fixes
150 m apart validates clean both times — the model accepts the twin by construction.

## Decisions (pre-resolved — do not re-open)

1. **A place name is unique, case-insensitively, after trimming.** "Work" and "work " are
   the same place. The card refuses an exact match on a new-place input (hint: `A place
   called "Work" already exists — tap it above to use it`) and the store refuses it too
   (`createRouteFromDraft` returns `{ ok: false, errors }` — the same `Alert` path the
   callers already have for a refused catalog). Rename refuses the same way.
2. **The label rule lives in `routeCreation.ts` (`newPlaceLabelErrors`) and
   `catalogMerge.ts`, not in `validateCatalog`.** `validateCatalog` judges the merged
   seed+user catalog; making labels a structural error would turn an existing twin
   (Nathan's phone today) into a catalog that refuses EVERY save until merged. The rule is
   enforced at the two points a label is born or changed.
3. **Proposals while typing** (`matchingPlaces`): from the first character, case-insensitive,
   places whose label starts with the typed text first, then those containing it, max 6,
   most-used first within each group (`landmarkUsageCounts` → `placeOptions`). Tapping a
   proposal makes that endpoint `{ kind: 'existing', landmarkId }` — the input disappears,
   the place shows as fixed text with a `change` link back to typing. Both directions are
   one tap.
4. **An endpoint choice is applied to the draft by a pure function**,
   `applyEndpointChoices(catalog, draft, choices)`, which re-points `start`/`end`,
   recomputes `loop` and `existingRouteId` with the SAME rule `draftRouteCreation` uses
   (extracted as `existingRouteFor`). So picking Work AND Store for a pair that already has a
   route makes the card flip live into WP-G's "New way on Work → Store" mode (specs
   required, ADD WAY) — the card asks the parent through a `routeForPair(choices)` prop.
   Nothing about the variant/quiet rulings changes; the card only learns the effective pair.
5. **The disc is never moved or grown when a `'new'` endpoint is re-pointed to an existing
   place.** The route just references that place; the landmark stays where its first visit
   put it (the 88-visit-cluster lesson: discs never creep). Consequence, stated honestly:
   a later ride ending on the same far-side spot drafts `'new'` again and needs the same one
   tap. Growing on confirm is Nathan's call 4.
6. **Merge is included, pure and tested** (`mergeLandmarks(userCat, seedCat, keepId, dropId)`):
   every user route with `dropId` at either end gets `keepId`; a route that thereby becomes
   `X → X` gets `loopDiscriminator: 'loop:merged:<dropId>'` if it has none; two non-loop
   routes that now share `(start, end, sportId ?? '')` and of which at least one was
   re-pointed are **folded** — the later one's ways move to the earlier one
   (`way.routeId`, `route.wayIds`), the later route is dropped; ways keep their ids, so gate
   sets, reference lines, stored results and the recorded window are untouched by
   construction. Loops are never folded (two loops on one place are a legal category,
   `validateCatalog`). A fold that would put two ways with the same non-empty specs on one
   route is **refused** with the way names (rename/delete one first) — `validateCatalog`
   would refuse that catalog anyway, and refusing early gives a readable message. Two plain
   ways (no specs) on one route are legal and are left so (the seed's own shape). The
   dropped landmark must be user-owned; the kept one may be a shipped one.
7. **A merge rewrites the catalog only.** Sidecar `pick` labels, GPX exports and RIDES row
   fallbacks keep the label the ride was started under — that is a log of what the screen
   said that day.
8. **UI home for rename/merge: the place's detail page** (ROUTES › tap a place), under
   ACTIONS: `Rename` (inline input + SAVE; `Alert.prompt` is iOS-only, so no prompt dialog),
   `Merge into another place…` (the shared picker, then a confirm `Alert` with the counts,
   then the write). Both only for user-owned places (`!seedOwned`). After a merge the screen
   opens the kept place.
9. **The card stays dumb.** It gets `places` (usage-sorted options) and `routeForPair`; it
   owns the two choices exactly as it owns the two text inputs; `onSave` hands back
   `(names, choices)` and the parent applies them. `DemoScreen.tsx` is untouched.

## Files to touch

### §1. New `app/src/store/placeSearch.ts` — pure, no store imports beyond types/metres

```ts
/**
 * virgin-cycle18 brief 05 (Nathan 2026-09-29, "two 'Work' places"): the
 * place-picker model shared by the naming card (RecordScreen / RideDetail),
 * the place detail's merge picker, and brief 06's endpoint override. Pure.
 *
 * A place name is unique case-insensitively after trimming (decision 1);
 * the rule is enforced where a label is born or changed (routeCreation.ts
 * newPlaceLabelErrors, catalogMerge.ts), never in validateCatalog.
 */
import type { Catalog, Landmark } from './types.ts';

export interface PlaceOption {
  id: string;
  label: string;
  /** "2 routes" — plus " · lat, lon" (5 dp) when another option shares the label */
  detail: string;
  usage: number;
}

export function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

/** The landmark whose label equals `label` (normLabel), or null. `exceptId`
 * excludes one landmark (rename: a place may keep its own name). */
export function placeByLabel(
  c: Pick<Catalog, 'landmarks'>, label: string, exceptId: string | null = null,
): Landmark | null {
  const want = normLabel(label);
  if (want.length === 0) return null;
  return c.landmarks.find((l) => l.id !== exceptId && normLabel(l.label) === want) ?? null;
}

/** Every landmark as a picker option, most-used first (ties keep catalog
 * order — a stable sort, same as sortLandmarksByUsage), minus `exclude`.
 * `detail` counts the routes touching the place; when two options share a
 * label (Nathan's two "Work"s) each gets its coordinates appended so they
 * can be told apart. `usage` comes from landmarkUsageCounts (injected — this
 * module has no results-store import). */
export function placeOptions(
  c: Pick<Catalog, 'landmarks' | 'routes'>,
  usage: Map<string, number>,
  opts: { exclude?: readonly string[] } = {},
): PlaceOption[] {
  const exclude = new Set(opts.exclude ?? []);
  const kept = c.landmarks.filter((l) => !exclude.has(l.id));
  const labelCount = new Map<string, number>();
  for (const l of kept) labelCount.set(normLabel(l.label), (labelCount.get(normLabel(l.label)) ?? 0) + 1);
  const sorted = [...kept].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  return sorted.map((l) => {
    const n = c.routes.filter((r) => r.startLandmarkId === l.id || r.endLandmarkId === l.id).length;
    let detail = `${n} route${n === 1 ? '' : 's'}`;
    if ((labelCount.get(normLabel(l.label)) ?? 0) > 1) detail += ` · ${l.lat.toFixed(5)}, ${l.lon.toFixed(5)}`;
    return { id: l.id, label: l.label, detail, usage: usage.get(l.id) ?? 0 };
  });
}

/** Proposals for a typed new-place name (decision 3): '' → []; else options
 * whose label starts with the text, then those containing it, each group in
 * the input's (usage) order, capped at `max`. Case-insensitive. */
export function matchingPlaces(options: readonly PlaceOption[], typed: string, max = 6): PlaceOption[] {
  const q = normLabel(typed);
  if (q.length === 0) return [];
  const starts = options.filter((o) => normLabel(o.label).startsWith(q));
  const contains = options.filter((o) => !normLabel(o.label).startsWith(q) && normLabel(o.label).includes(q));
  return [...starts, ...contains].slice(0, max);
}

/** Why `typed` cannot name a NEW place, or null when it can. '' is null here
 * (emptiness is the caller's own "name required" rule). `otherNewName` is the
 * other endpoint's typed name when that one is new too. */
export function newPlaceNameError(
  existingLabels: readonly string[], typed: string, otherNewName: string | null,
): string | null {
  const q = normLabel(typed);
  if (q.length === 0) return null;
  const taken = existingLabels.find((l) => normLabel(l) === q);
  if (taken !== undefined) return `A place called "${taken}" already exists — tap it above to use it`;
  if (otherNewName !== null && normLabel(otherNewName) === q) return 'start and end cannot share a name';
  return null;
}
```

### §2. New `app/src/store/catalogMerge.ts` — pure (same posture as `catalogDelete.ts`)

```ts
/**
 * virgin-cycle18 brief 05 (Nathan 2026-09-29): rename a place, or merge one
 * place into another — the recovery for the two "Work" landmarks his phone
 * already holds. Pure, USER catalog in/out (catalogStore.userCatalog()), the
 * caller runs saveUserCatalog (which validates the seed+user merge). Never
 * throws. Landmark ids live in Route.start/endLandmarkId ONLY (brief 05's
 * enumeration): ways, gate sets, user refs, stored results and the recorded
 * window are all keyed by way id and are untouched by construction.
 */
import { mergeCatalogs } from './catalog.ts';
import { placeByLabel } from './placeSearch.ts';
import { sameSpecs } from './routeCreation.ts';
import type { Catalog, Route, Way } from './types.ts';

export type RenameOutcome = { ok: true; next: Catalog } | { ok: false; errors: string[] };

/** Trimmed, non-empty, not another place's name (case-insensitive, seed
 * included); a shipped place cannot be renamed (seed wins every id). */
export function renameLandmark(userCat: Catalog, seedCat: Catalog, id: string, label: string): RenameOutcome {
  const l = userCat.landmarks.find((x) => x.id === id);
  if (!l) return { ok: false, errors: [`"${id}" is not one of your own places — a shipped place cannot be renamed`] };
  const next = label.trim();
  if (next.length === 0) return { ok: false, errors: ['a place needs a name'] };
  const clash = placeByLabel(mergeCatalogs(seedCat, userCat), next, id);
  if (clash) return { ok: false, errors: [`A place called "${clash.label}" already exists`] };
  return { ok: true, next: { ...userCat, landmarks: userCat.landmarks.map((x) => (x.id === id ? { ...x, label: next } : x)) } };
}

export interface FoldedRoute { droppedRouteId: string; intoRouteId: string; movedWayIds: string[] }
export type MergeOutcome =
  | {
      ok: true; next: Catalog;
      /** routes whose start and/or end now reads keepId */
      repointedRouteIds: string[];
      /** routes that became X → X and received a loopDiscriminator */
      loopedRouteIds: string[];
      /** later twin routes folded into an earlier one (their ways moved) */
      folded: FoldedRoute[];
    }
  | { ok: false; errors: string[] };

function routeKey(r: Route): string {
  return `${r.startLandmarkId}|${r.endLandmarkId}|${r.sportId ?? ''}`;
}

/** Merge `dropId` into `keepId` (decision 6). */
export function mergeLandmarks(userCat: Catalog, seedCat: Catalog, keepId: string, dropId: string): MergeOutcome {
  if (keepId === dropId) return { ok: false, errors: ['pick a different place to merge into'] };
  const merged = mergeCatalogs(seedCat, userCat);
  const keep = merged.landmarks.find((l) => l.id === keepId);
  if (!keep) return { ok: false, errors: [`unknown place "${keepId}"`] };
  const drop = userCat.landmarks.find((l) => l.id === dropId);
  if (!drop) return { ok: false, errors: [`"${dropId}" is not one of your own places — a shipped place cannot be merged away`] };
  const lab = (id: string) => merged.landmarks.find((l) => l.id === id)?.label ?? id;

  // 1. re-point
  const repointedRouteIds: string[] = [];
  const loopedRouteIds: string[] = [];
  let routes: Route[] = userCat.routes.map((r) => {
    if (r.startLandmarkId !== dropId && r.endLandmarkId !== dropId) return r;
    repointedRouteIds.push(r.id);
    const next: Route = {
      ...r,
      startLandmarkId: r.startLandmarkId === dropId ? keepId : r.startLandmarkId,
      endLandmarkId: r.endLandmarkId === dropId ? keepId : r.endLandmarkId,
    };
    if (next.startLandmarkId === next.endLandmarkId && !next.loopDiscriminator) {
      loopedRouteIds.push(r.id);
      return { ...next, loopDiscriminator: `loop:merged:${dropId}` };
    }
    return next;
  });
  const repointed = new Set(repointedRouteIds);

  // 2. fold twins (non-loop, same start/end/sportId, at least one re-pointed)
  let ways: Way[] = userCat.ways;
  const folded: FoldedRoute[] = [];
  const firstByKey = new Map<string, Route>();
  const out: Route[] = [];
  for (const r of routes) {
    const isLoop = r.startLandmarkId === r.endLandmarkId;
    const first = isLoop ? undefined : firstByKey.get(routeKey(r));
    if (!first || (!repointed.has(first.id) && !repointed.has(r.id))) {
      if (!isLoop && !first) firstByKey.set(routeKey(r), r);
      out.push(r);
      continue;
    }
    const firstWays = ways.filter((w) => w.routeId === first.id);
    const laterWays = ways.filter((w) => w.routeId === r.id);
    for (const a of laterWays) {
      if (!a.specs || a.specs.length === 0) continue;
      const twin = firstWays.find((b) => b.specs && b.specs.length > 0 && sameSpecs(b.specs, a.specs!));
      if (twin) {
        return {
          ok: false,
          errors: [
            `ways "${a.specs.join(' · ')}" on ${lab(r.startLandmarkId)} → ${lab(r.endLandmarkId)} would exist twice after the merge ` +
              `(${twin.id} and ${a.id}) — rename or delete one of them first`,
          ],
        };
      }
    }
    const movedWayIds = laterWays.map((w) => w.id);
    ways = ways.map((w) => (w.routeId === r.id ? { ...w, routeId: first.id } : w));
    const idx = out.findIndex((x) => x.id === first.id);
    const grown: Route = { ...out[idx], wayIds: [...out[idx].wayIds, ...r.wayIds] };
    out[idx] = grown;
    firstByKey.set(routeKey(grown), grown);
    folded.push({ droppedRouteId: r.id, intoRouteId: first.id, movedWayIds });
  }
  routes = out;

  // 3. drop the loser
  const landmarks = userCat.landmarks.filter((l) => l.id !== dropId);
  const next: Catalog = { schemaVersion: userCat.schemaVersion, landmarks, routes, ways, gateSets: userCat.gateSets };
  return { ok: true, next, repointedRouteIds, loopedRouteIds, folded };
}
```

`sameSpecs` is `routeCreation.ts:301-303` (`export function sameSpecs(a: readonly string[], b: readonly string[]): boolean`);
`mergeCatalogs` is `catalog.ts:225`. `routeCreation.ts` imports only `./catalog.ts` and
`./types.ts` (`:37-38`) and will import `./placeSearch.ts` (§3) — no cycle with this file.

### §3. `app/src/store/routeCreation.ts`

**Anchors:** line 37 `import { landmarkAt, metresBetween } from './catalog.ts';`; lines
266-275 (the WP-G `existingRoute` block, quoted below); line 292
`export interface RouteNames { start: string; end: string; specs?: readonly string[] }`;
the end of file (line 415 `}` closing `buildRouteCreationCatalog`).

**Edit 3A — import.** After line 37 insert `import { placeByLabel } from './placeSearch.ts';`.

**Edit 3B — extract the pair→route rule.** Replace lines 266-275

```ts
  // WP-G: an existing directed way is no longer a refusal — it is the
  // variant case (a second Route on the same Way). First match wins; only
  // loops can have several ways on one pair (loopDiscriminator) and then
  // any of them is an equally good home for the new route.
  const existingRoute =
    start.kind === 'existing' && end.kind === 'existing'
      ? c.routes.find(
          (w) => w.startLandmarkId === start.landmarkId && w.endLandmarkId === end.landmarkId,
        ) ?? null
      : null;
```

with

```ts
  // WP-G: an existing directed way is no longer a refusal — it is the
  // variant case (a second Route on the same Way). First match wins; only
  // loops can have several ways on one pair (loopDiscriminator) and then
  // any of them is an equally good home for the new route. Rule extracted
  // (virgin-cycle18 brief 05) so applyEndpointChoices re-applies it verbatim.
  const existingRoute = existingRouteFor(c, start, end);
```

and, immediately BEFORE the doc comment of `draftRouteCreation` (the line
`/**` above ` * Should STOP offer to name this ride's endpoints, and as what?`, line 161), insert:

```ts
/** WP-G's pair → route rule: the first route linking these two EXISTING
 * landmarks in this direction, else null (a 'new' endpoint never matches). */
export function existingRouteFor(c: Pick<Catalog, 'routes'>, start: EndpointResolution, end: EndpointResolution): Route | null {
  return start.kind === 'existing' && end.kind === 'existing'
    ? c.routes.find((w) => w.startLandmarkId === start.landmarkId && w.endLandmarkId === end.landmarkId) ?? null
    : null;
}
```

**Edit 3C — the endpoint-choice model.** After line 292 (`export interface RouteNames …`) insert:

```ts
/** virgin-cycle18 brief 05: what the naming card decided about one endpoint.
 * 'proposed' = keep what draftRouteCreation resolved (a 'new' place named by
 * RouteNames, or the existing place it matched); 'existing' = the rider
 * pointed this end at an existing place instead (typeahead pick, brief 05;
 * the change picker, brief 06). No 'new' override exists: a new disc can
 * never be minted at a fix that resolved to an existing place (it would
 * overlap that disc — validateCatalog), and a 'new' endpoint is already new. */
export type EndpointChoice = { kind: 'proposed' } | { kind: 'existing'; landmarkId: string };
export interface EndpointChoices { start: EndpointChoice; end: EndpointChoice }
export const PROPOSED: EndpointChoices = { start: { kind: 'proposed' }, end: { kind: 'proposed' } };

/** The draft with the rider's choices applied — pure, same rules as
 * draftRouteCreation for what follows from the endpoints: `loop` is
 * start === end, `existingRouteId` is existingRouteFor on the effective pair
 * (so two existing places that already have a route flip the offer into the
 * WP-G variant). A loop draft (end resolved onto the start's own new disc,
 * `end.draft` absent) follows the start's choice. matchedWayId, sportId,
 * trackLengthM, rideId, startedAtMs are carried unchanged. Both 'proposed'
 * returns the input draft itself. */
export function applyEndpointChoices(c: Pick<Catalog, 'routes'>, draft: RouteCreationDraft, choices: EndpointChoices): RouteCreationDraft {
  if (choices.start.kind === 'proposed' && choices.end.kind === 'proposed') return draft;
  const start: EndpointResolution =
    choices.start.kind === 'existing' ? { kind: 'existing', landmarkId: choices.start.landmarkId } : draft.start;
  let end: EndpointResolution;
  if (choices.end.kind === 'existing') end = { kind: 'existing', landmarkId: choices.end.landmarkId };
  else if (draft.loop && draft.end.kind === 'new' && !draft.end.draft) end = start; // loop onto the start's draft follows the start
  else end = draft.end;
  const loop = start.landmarkId === end.landmarkId;
  return { ...draft, start, end, loop, existingRouteId: existingRouteFor(c, start, end)?.id ?? null };
}

/** virgin-cycle18 brief 05 (decision 1): the names a build would give to
 * NEW places must not already name a landmark (case-insensitive, trimmed),
 * and start/end may not share one. Checked against the MERGED catalog
 * (seed + user) by createRouteFromDraft; the card enforces the same rule
 * live. Empty names are not judged here (the caller requires them). */
export function newPlaceLabelErrors(c: Pick<Catalog, 'landmarks'>, draft: RouteCreationDraft, names: RouteNames): string[] {
  const errs: string[] = [];
  const startNew = draft.start.kind === 'new' && !!draft.start.draft;
  const endNew = !draft.loop && draft.end.kind === 'new' && !!draft.end.draft;
  const taken = (label: string) => placeByLabel(c, label);
  if (startNew) {
    const t = taken(names.start);
    if (t) errs.push(`A place called "${t.label}" already exists — use it instead of naming it again`);
  }
  if (endNew) {
    const t = taken(names.end);
    if (t) errs.push(`A place called "${t.label}" already exists — use it instead of naming it again`);
  }
  if (startNew && endNew && names.start.trim().length > 0 && names.start.trim().toLowerCase() === names.end.trim().toLowerCase()) {
    errs.push('start and end cannot share a name');
  }
  return errs;
}
```

`Route` is already in the type import on line 38 (`import type { Catalog, GateSet, Landmark, Way, Route } from './types.ts';`).
`buildRouteCreationCatalog` is **unchanged** (byte-identical output for every existing test).

### §4. `app/src/store/routeFromRide.ts` — the store belt

**Anchors:** lines 28-30 `import {` / `  buildRouteCreationCatalog, draftRouteCreation, type RouteCreationDraft, type RouteNames,` / `} from './routeCreation.ts';`;
the `createRouteFromDraft` signature `): Promise<CreateRouteOutcome> {` followed by
`  const fixes = await readRideFixes(draft.rideId, fs);` (briefs 02 and 04 edit this
function's TAIL only — its first line is untouched by them; if the first body line is not
`const fixes = …`, stop). `currentCatalog` is already imported (line 23).

**Edit 4A — import.** Line 29 → `  buildRouteCreationCatalog, draftRouteCreation, newPlaceLabelErrors, type RouteCreationDraft, type RouteNames,`.

**Edit 4B — refuse a taken name before touching anything.** Immediately after
`): Promise<CreateRouteOutcome> {` (before `const fixes = …`) insert:

```ts
  // virgin-cycle18 brief 05 (decision 1): belt to the card's braces — a new
  // place may not take an existing place's name (Nathan's two "Work"s).
  // Judged on the merged catalog, the one the rider sees. No writes on refusal.
  const nameErrs = newPlaceLabelErrors(currentCatalog(), draft, names);
  if (nameErrs.length > 0) return { ok: false, errors: nameErrs };
```

### §5. New `app/src/ui/placePicker.tsx` — the shared picker (dumb UI)

```tsx
/**
 * virgin-cycle18 brief 05: one pill row of places, shared by the naming
 * card (typeahead proposals here; brief 06's "change" picker), and the
 * place detail's "Merge into…". Dumb: options in, a tap out. Mirrors the
 * RECORD tab's START pills (RecordScreen.tsx styles.pill/pillOn) so a place
 * looks the same wherever it is picked. `markedId` gets `markedSuffix`
 * appended to its label (brief 06: the place picked at START).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaceOption } from '../store/placeSearch';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface PlacePickerProps {
  options: readonly PlaceOption[];
  selectedId: string | null;
  onPick: (id: string) => void;
  busy?: boolean;
  markedId?: string | null;
  markedSuffix?: string;
}

export function PlacePicker(props: PlacePickerProps) {
  const { t } = useTheme();
  if (props.options.length === 0) return null;
  return (
    <View style={st.row}>
      {props.options.map((o) => {
        const on = o.id === props.selectedId;
        const label = props.markedId === o.id && props.markedSuffix ? `${o.label}${props.markedSuffix}` : o.label;
        return (
          <Pressable
            key={o.id}
            style={[st.pill, { borderColor: on ? t.accent : t.cardBorder }]}
            disabled={props.busy}
            onPress={() => props.onPick(o.id)}
            accessibilityLabel={`${o.label}, ${o.detail}`}
          >
            <Text style={[st.pillText, { color: on ? t.accentText : t.text }]}>{label}</Text>
            {o.detail.length > 0 ? <Text style={[st.detail, { color: t.textDim }]}>{o.detail}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12.5 },
  detail: { fontSize: 10.5 },
});
```

(`radius.pill`, `t.accent`, `t.accentText`, `t.cardBorder`, `t.text`, `t.textDim` all exist —
`theme.ts:48-56`, used by `routeNamingCard.tsx:234` and `RecordScreen.tsx:1698-1704`.)

### §6. `app/src/ui/routeNamingCard.tsx` (post-brief-04 tree)

**Anchors (quoted; 04 leaves lines 60-205 byte-for-byte):**
- line 32 `import { cleanSpecs, sameSpecs, type RouteNames } from '../store/routeCreation';`
- line 35 `import { useTheme } from './themeContext';`
- props: `  vocabulary?: string[];` followed by `  onSave: (names: RouteNames) => void;`
- state: `  const [endName, setEndName] = useState('');`
- `  const needStart = props.startExistingLabel === null;` / `  const needEnd = props.endExistingLabel === null && !props.loop;` /
  `  const nameComplete = (!needStart || startName.trim().length > 0) && (!needEnd || endName.trim().length > 0);`
- `  const existingRoute = props.existingRoute ?? null;`
- the STARTED AT block from `      <Text style={[st.label, { color: t.textDim }]}>STARTED AT</Text>` to the
  `      )}` that closes `needStart ? ( … ) : ( … )` (lines 114-127 today), and the ENDED AT
  block `{!props.loop && ( … )}` (lines 129-146 today), both quoted below.
- inside brief 04's Edit 1C: `        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs })}`
- styles: `  fixed: { fontSize: 15, paddingVertical: 6 },`

**Edit 6A — imports.** Line 32 →

```ts
import { cleanSpecs, sameSpecs, type EndpointChoice, type EndpointChoices, type RouteNames } from '../store/routeCreation';
```

After line 35 insert:

```ts
import { matchingPlaces, newPlaceNameError, type PlaceOption } from '../store/placeSearch';
import { PlacePicker } from './placePicker';
```

**Edit 6B — props.** Between `  vocabulary?: string[];` and `  onSave: …` insert:

```ts
  /** virgin-cycle18 brief 05: every place, most-used first (placeOptions).
   * A new-place input proposes matches from it while typing; a typed name
   * that equals one of them is refused. Absent/[] = no proposals (DEMO). */
  places?: readonly PlaceOption[];
  /** brief 05: the route (if any) between the EFFECTIVE pair once a choice
   * is not 'proposed' — the card flips into the "new way on …" variant on a
   * hit, exactly as if draftRouteCreation had resolved that pair. Absent =
   * never a variant after a choice (DEMO). */
  routeForPair?: (choices: EndpointChoices) => { label: string; knownSpecLists: string[][] } | null;
```

and replace `  onSave: (names: RouteNames) => void;` with

```ts
  /** brief 05: `choices` says which endpoint the rider pointed at an existing
   * place instead of naming a new one (or instead of the proposal — brief 06).
   * The caller applies them with applyEndpointChoices before building. */
  onSave: (names: RouteNames, choices: EndpointChoices) => void;
```

**Edit 6C — state + derived.** After `  const [endName, setEndName] = useState('');` insert:

```ts
  // brief 05: an endpoint the rider pointed at an existing place (typeahead
  // tap). 'proposed' = as drafted (new place named below, or the matched one).
  const [startChoice, setStartChoice] = useState<EndpointChoice>({ kind: 'proposed' });
  const [endChoice, setEndChoice] = useState<EndpointChoice>({ kind: 'proposed' });
  const places = props.places ?? [];
  const placeLabel = (id: string) => places.find((p) => p.id === id)?.label ?? id;
```

Replace the three lines `const needStart …` / `const needEnd …` / `const nameComplete …` with:

```ts
  // An input is shown for a 'new' endpoint the rider has not pointed elsewhere.
  const needStart = props.startExistingLabel === null && startChoice.kind === 'proposed';
  const needEnd = props.endExistingLabel === null && !props.loop && endChoice.kind === 'proposed';
  const startLabel = startChoice.kind === 'existing' ? placeLabel(startChoice.landmarkId) : props.startExistingLabel;
  const endLabel = endChoice.kind === 'existing' ? placeLabel(endChoice.landmarkId) : props.endExistingLabel;
  // brief 05 (decision 1/3): proposals while typing, and a taken name is refused.
  const startMatches = needStart ? matchingPlaces(places, startName) : [];
  const endMatches = needEnd ? matchingPlaces(places, endName) : [];
  const placeLabels = places.map((p) => p.label);
  const startNameErr = needStart ? newPlaceNameError(placeLabels, startName, needEnd ? endName : null) : null;
  const endNameErr = needEnd ? newPlaceNameError(placeLabels, endName, needStart ? startName : null) : null;
  const nameComplete =
    (!needStart || startName.trim().length > 0) && (!needEnd || endName.trim().length > 0) &&
    startNameErr === null && endNameErr === null;
  const choices: EndpointChoices = { start: startChoice, end: endChoice };
```

Replace `  const existingRoute = props.existingRoute ?? null;` with:

```ts
  // brief 05 (decision 4): the variant question is asked of the EFFECTIVE
  // pair. Both 'proposed' = what the parent drafted; any choice = ask the parent.
  const existingRoute =
    startChoice.kind === 'proposed' && endChoice.kind === 'proposed'
      ? props.existingRoute ?? null
      : props.routeForPair?.(choices) ?? null;
```

(Every later use of `existingRoute` — the dup check, `complete`, `suggestions`, the title,
the copy, the button label, brief 04's exit branch — now follows the effective pair with no
further edit.)

**Edit 6D — STARTED AT.** Replace

```tsx
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
```

with

```tsx
      <Text style={[st.label, { color: t.textDim }]}>STARTED AT</Text>
      {needStart ? (
        <>
          <TextInput
            style={inputStyle}
            value={startName}
            onChangeText={setStartName}
            placeholder="e.g. Home"
            placeholderTextColor={t.textDim}
            editable={!props.busy}
            maxLength={40}
          />
          {/* brief 05: existing places that match what is typed — one tap uses one */}
          <PlacePicker
            options={startMatches}
            selectedId={null}
            busy={props.busy}
            onPick={(id) => { setStartChoice({ kind: 'existing', landmarkId: id }); setStartName(''); }}
          />
          {startNameErr !== null && <Text style={[st.hint, { color: t.textDim }]}>{startNameErr}</Text>}
        </>
      ) : (
        <View style={st.fixedRow}>
          <Text style={[st.fixed, { color: t.text }]}>{startLabel}</Text>
          {startChoice.kind === 'existing' && (
            <Pressable disabled={props.busy} onPress={() => setStartChoice({ kind: 'proposed' })} hitSlop={8}>
              <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
            </Pressable>
          )}
        </View>
      )}
```

**Edit 6E — ENDED AT.** Replace

```tsx
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
```

with

```tsx
      {!props.loop && (
        <>
          <Text style={[st.label, { color: t.textDim }]}>ENDED AT</Text>
          {needEnd ? (
            <>
              <TextInput
                style={inputStyle}
                value={endName}
                onChangeText={setEndName}
                placeholder="e.g. Work"
                placeholderTextColor={t.textDim}
                editable={!props.busy}
                maxLength={40}
              />
              <PlacePicker
                options={endMatches}
                selectedId={null}
                busy={props.busy}
                onPick={(id) => { setEndChoice({ kind: 'existing', landmarkId: id }); setEndName(''); }}
              />
              {endNameErr !== null && <Text style={[st.hint, { color: t.textDim }]}>{endNameErr}</Text>}
            </>
          ) : (
            <View style={st.fixedRow}>
              <Text style={[st.fixed, { color: t.text }]}>{endLabel}</Text>
              {endChoice.kind === 'existing' && (
                <Pressable disabled={props.busy} onPress={() => setEndChoice({ kind: 'proposed' })} hitSlop={8}>
                  <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
```

**Edit 6F — onSave hands the choices back** (inside brief 04's Edit 1C). Replace
`        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs })}`
with
`        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs }, choices)}`.

**Edit 6G — styles.** After `  fixed: { fontSize: 15, paddingVertical: 6 },` insert:

```ts
  fixedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  changeLink: { fontSize: 12.5, textDecorationLine: 'underline', paddingVertical: 6 },
```

`st.hint` already exists (`hint: { fontSize: 11.5, marginTop: 6 }`). `View` and `Pressable`
are already imported from `react-native` (line 31).

**Header note (Edit 6H).** After brief 04's header lines (the paragraph ending
`ride is already timed under that way.`) insert:

```
 * virgin-cycle18 brief 05 (Nathan 2026-09-29): a new-place input proposes
 * matching EXISTING places while you type (PlacePicker) — one tap points
 * that endpoint at the place instead of naming a twin — and a typed name
 * that already names a place is refused. onSave hands back the choices;
 * the caller applies them (applyEndpointChoices) before building.
```

### §7. `app/src/ui/RecordScreen.tsx`

**Anchors:** line 56 `import { findWayWithSpecs, type RouteCreationDraft, type RouteNames } from '../store/routeCreation';`;
line 82 `import { landmarkUsageCounts, sortLandmarksByUsage } from '../store/landmarkUsage';`;
`onNamingSave`: `  const onNamingSave = useCallback(async (names: RouteNames) => {` /
`    const draft = namingRef.current;` / `    if (!draft) return;` (lines 742-744 today; brief
04 inserts inside this function AFTER `setNaming(null);` only); the card mount's
`              vocabulary={specVocabulary(activeCatalog().ways)}` line (1248 today; 04 adds
`onSaveFree=` two lines below it).

**Edit 7A — imports.** Line 56 →

```ts
import {
  applyEndpointChoices, findWayWithSpecs, type EndpointChoices, type RouteCreationDraft, type RouteNames,
} from '../store/routeCreation';
```

After line 82 insert `import { placeOptions } from '../store/placeSearch';`.

**Edit 7B — apply the choices.** Replace the three lines

```ts
  const onNamingSave = useCallback(async (names: RouteNames) => {
    const draft = namingRef.current;
    if (!draft) return;
```

with

```ts
  const onNamingSave = useCallback(async (names: RouteNames, choices: EndpointChoices) => {
    const drafted = namingRef.current;
    if (!drafted) return;
    // virgin-cycle18 brief 05: the rider may have pointed an endpoint at an
    // existing place on the card — the draft that is built is the one with
    // those choices applied (pure; identity when both are 'proposed').
    const draft = applyEndpointChoices(activeCatalog(), drafted, choices);
```

(Everything below in the function keeps reading `draft` — the WP-G belt check, `createRouteFromDraft`,
brief 04's `getStoredResult(draft.rideId)` — unchanged.)

**Edit 7C — the card gets places + the pair rule.** Directly after the line
`              vocabulary={specVocabulary(activeCatalog().ways)}` insert:

```tsx
              places={placeOptions(activeCatalog(), landmarkUsageCounts(activeCatalog()))}
              routeForPair={(ch) => {
                const d = applyEndpointChoices(activeCatalog(), naming, ch);
                return d.existingRouteId ? existingRouteProps(d.existingRouteId) : null;
              }}
```

(`naming` is non-null in this branch — `endingSlot === 'card' && naming !== null`;
`existingRouteProps` is already imported, line 66.)

### §8. `app/src/ui/RideDetailScreen.tsx`

**Anchors:** line 56 `import { findWayWithSpecs, type RouteCreationDraft, type RouteNames } from '../store/routeCreation.ts';`;
`  async function onNamingSave(names: RouteNames) {` / `    if (offer === null) return;` (lines
268-269 today; brief 04 edits lines further down in it); the card mount's
`            vocabulary={specVocabulary(activeCatalog().ways)}` / `            onSave={(names) => void onNamingSave(names)}`.

**Edit 8A — imports.** Line 56 →

```ts
import {
  applyEndpointChoices, findWayWithSpecs, type EndpointChoices, type RouteCreationDraft, type RouteNames,
} from '../store/routeCreation.ts';
```

and after it insert:

```ts
import { landmarkUsageCounts } from '../store/landmarkUsage.ts';
import { placeOptions } from '../store/placeSearch.ts';
```

**Edit 8B — apply the choices.** Replace

```ts
  async function onNamingSave(names: RouteNames) {
    if (offer === null) return;
```

with

```ts
  async function onNamingSave(names: RouteNames, choices: EndpointChoices) {
    if (offer === null) return;
    const draft = applyEndpointChoices(activeCatalog(), offer, choices); // brief 05
```

and inside that function replace every `offer.existingRouteId` with `draft.existingRouteId`
(one hit, the WP-G belt line) and `createRouteFromDraft(offer, names, createExpoFsAdapter())`
with `createRouteFromDraft(draft, names, createExpoFsAdapter())`. `offer === null` /
`setNaming(false)` / `setDraft(null)` / brief 04's `request.rideId` lines stay.

**Edit 8C — the card.** Replace `            onSave={(names) => void onNamingSave(names)}` with
`            onSave={(names, choices) => void onNamingSave(names, choices)}` and, directly after the
`vocabulary=` line, insert:

```tsx
            places={placeOptions(activeCatalog(), landmarkUsageCounts(activeCatalog()))}
            routeForPair={(ch) => {
              const d = applyEndpointChoices(activeCatalog(), offer, ch);
              return d.existingRouteId ? existingRouteProps(d.existingRouteId) : null;
            }}
```

### §9. `app/src/ui/catalogDetailModel.ts` — two booleans

**Anchors:** lines 28-33 (`PlaceDetailModel`), specifically
`  dormant: boolean; offerAtStart: boolean; seedOwned: boolean; deletable: boolean;`; in
`placeDetailFor` the line `  const deletable = !seedOwned && touchingRoutes.length === 0;` and
the returned object's `    deletable,`.

**Edit 9A.** `  dormant: boolean; offerAtStart: boolean; seedOwned: boolean; deletable: boolean;` →

```ts
  dormant: boolean; offerAtStart: boolean; seedOwned: boolean; deletable: boolean;
  /** virgin-cycle18 brief 05: a user place can be renamed; merged only when another place exists */
  renamable: boolean; mergeable: boolean;
```

**Edit 9B.** After `  const deletable = !seedOwned && touchingRoutes.length === 0;` insert
`  const renamable = !seedOwned;` / `  const mergeable = !seedOwned && c.landmarks.length > 1;`
and after `    deletable,` in the return insert `    renamable,` / `    mergeable,`.

### §10. `app/src/ui/CatalogDetailScreen.tsx` — Rename + Merge on the place page

**Anchors:** line 17 `import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`;
line 25 `import { currentCatalog } from '../store/catalogStore.ts';`; the `PlaceBody` mount
(lines 104-113 today, `onDelete={() => { … }}` then `        />`); `PlaceBody`'s signature
(lines 144-151) and its ACTIONS block (lines 197-206, quoted below); `makeStyles`'s
`deleteBtn`/`deleteText` (lines ~362-375); the `st` sheet (line 378).

**Edit 10A — imports.** Line 17 → `import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';`.
Line 25 → `import { currentCatalog, saveUserCatalog, userCatalog } from '../store/catalogStore.ts';`.
After line 25 insert:

```ts
import { mergeLandmarks, renameLandmark } from '../store/catalogMerge.ts';
import { landmarkUsageCounts } from '../store/landmarkUsage.ts';
import { placeOptions } from '../store/placeSearch.ts';
import { PlacePicker } from './placePicker.tsx';
```

Also add `useState` to the react import if not present (`grep -n "from 'react'" app/src/ui/CatalogDetailScreen.tsx`
→ the line lists `useEffect, useMemo, useState` today — verify; if `useState` is missing, add it).

**Edit 10B — the two actions, wired in the screen.** In the `PlaceBody` mount, after the
`onDelete={() => { … }}` prop (its closing `}}`), insert:

```tsx
          onRename={async (label) => {
            const out = renameLandmark(userCatalog(), SEED, request.id, label);
            if (!out.ok) { Alert.alert('Could not rename', out.errors.join('\n')); return false; }
            const errs = await saveUserCatalog(out.next);
            if (errs.length > 0) { Alert.alert('Could not rename', errs.join('\n')); return false; }
            bump();
            return true;
          }}
          mergeOptions={placeOptions(CATALOG, landmarkUsageCounts(CATALOG), { exclude: [request.id] })}
          onMergeInto={(keepId) => {
            const me = CATALOG.landmarks.find((x) => x.id === request.id);
            const keep = CATALOG.landmarks.find((x) => x.id === keepId);
            if (!me || !keep) return;
            const out = mergeLandmarks(userCatalog(), SEED, keepId, request.id);
            if (!out.ok) { Alert.alert('Could not merge', out.errors.join('\n')); return; }
            const n = out.repointedRouteIds.length;
            let body = `${n} route${n === 1 ? '' : 's'} from or to "${me.label}" will use "${keep.label}" instead, and "${me.label}" is removed.`;
            if (out.folded.length > 0) {
              body += `\n${out.folded.length} route${out.folded.length === 1 ? '' : 's'} become${out.folded.length === 1 ? 's' : ''} the same as an existing one and fold${out.folded.length === 1 ? 's' : ''} into it — its ways, gates, reference lines and results are kept.`;
            }
            if (out.loopedRouteIds.length > 0) body += `\n${out.loopedRouteIds.length} route${out.loopedRouteIds.length === 1 ? '' : 's'} become${out.loopedRouteIds.length === 1 ? 's' : ''} a loop.`;
            body += '\nRide recordings are never touched.';
            Alert.alert(`Merge "${me.label}" into "${keep.label}"?`, body, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Merge',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    const errs = await saveUserCatalog(out.next);
                    if (errs.length > 0) { Alert.alert('Could not merge', errs.join('\n')); return; }
                    // the page's own place is gone — show the one that absorbed it
                    tabNav.openCatalog({ kind: 'place', id: keepId });
                  })();
                },
              },
            ]);
          }}
```

**Edit 10C — `PlaceBody` props + UI.** Extend the signature: after `  onDelete: () => void;`
add

```ts
  onRename: (label: string) => Promise<boolean>;
  mergeOptions: readonly import('../store/placeSearch.ts').PlaceOption[];
  onMergeInto: (keepId: string) => void;
```

(and destructure `onRename, mergeOptions, onMergeInto` next to `onDelete`). Inside `PlaceBody`,
before `return (`, add state:

```ts
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState(model.label);
  const [merging, setMerging] = useState(false);
```

Replace the ACTIONS block

```tsx
      <View style={{ marginTop: 16 }}>
        <Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>
        {model.deletable ? (
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={onDelete}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
```

with

```tsx
      <View style={{ marginTop: 16 }}>
        <Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>
        {/* virgin-cycle18 brief 05: rename (inline — Alert.prompt is iOS-only) */}
        {model.renamable && !renaming ? (
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={() => { setRenameText(model.label); setRenaming(true); }}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>Rename</Text>
          </Pressable>
        ) : null}
        {renaming ? (
          <View style={st.renameRow}>
            <TextInput
              style={[st.renameInput, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }]}
              value={renameText}
              onChangeText={setRenameText}
              maxLength={40}
              autoFocus
            />
            <Pressable
              style={[styles.deleteBtn, { borderColor: t.cardBorder }]}
              onPress={() => { void onRename(renameText).then((ok) => { if (ok) setRenaming(false); }); }}
            >
              <Text style={[styles.deleteText, { color: t.text }]}>SAVE</Text>
            </Pressable>
            <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={() => setRenaming(false)}>
              <Text style={[styles.deleteText, { color: t.textDim }]}>cancel</Text>
            </Pressable>
          </View>
        ) : null}
        {/* brief 05: merge this place INTO another — every route here uses that one, this one goes */}
        {model.mergeable && mergeOptions.length > 0 ? (
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder, marginTop: 8 }]} onPress={() => setMerging((v) => !v)}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>Merge into another place…</Text>
          </Pressable>
        ) : null}
        {merging ? (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: t.textDim, fontSize: 12.5 }}>
              {`Pick the place to keep. Every route from or to "${model.label}" will use it instead, and "${model.label}" is removed.`}
            </Text>
            <PlacePicker options={mergeOptions} selectedId={null} onPick={onMergeInto} />
          </View>
        ) : null}
        {model.deletable ? (
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder, marginTop: 8 }]} onPress={onDelete}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
```

**Edit 10D — styles.** In the `st` sheet add:

```ts
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  renameInput: { flex: 1, borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
```

Check `styles.deleteBtn` accepts an array with an override (it is used that way at line 346
today: `[styles.deleteBtn, { borderColor: t.cardBorder, marginTop: 8 }]`) — yes.

### §11. Tests

**Harness facts:** `app/tests/lib.ts` exports `test(name, fn)` and `assert(cond, msg)`;
suites that import anything reaching `store/seed.ts` (`catalogStore.ts`, `resultsStore.ts`,
`landmarkUsage.ts`, `routeFromRide.ts`) register the `.json` loader hook first and import
dynamically — copy the 12-line `registerHooks({ load … })` block from
`app/tests/landmarkusage_suite.ts:19-27` verbatim. `placeSearch.ts` and `catalogMerge.ts`
import only `catalog.ts`/`routeCreation.ts`/`types.ts` (JSON-free), so their suites need no
hook. Fixture helpers: copy `lm(id, lat, lon, radiusM)` and `catWith(…)` from
`routecreation_suite.ts:45-54` (they are file-local; re-declare, do not import).

**New `app/tests/placesearch_suite.ts`** (import `assert, test` from `./lib.ts`;
`emptyCatalog` from `../src/store/catalog.ts`; the four functions from `../src/store/placeSearch.ts`):

1. `c18-05 ps1: placeOptions — most-used first, ties keep catalog order, detail counts touching routes`
   — landmarks A, B, C (catalog order), routes A→B and B→C, usage `{B: 5, C: 1}` → ids
   `['B','C','A']`; details `'2 routes'`, `'1 route'`, `'1 route'`; `exclude: ['B']` → `['C','A']`.
2. `c18-05 ps2: two places with one label get their coordinates in detail` — labels
   `'Work'`, `'work '` at different coords → both details end with ` · <lat>, <lon>` (5 dp);
   a third `'Home'` does not.
3. `c18-05 ps3: matchingPlaces — empty → [], starts-with before contains, case-insensitive, capped`
   — options `Work`, `Workshop`, `Homework`, `Home` with `'wo'` → `['Work','Workshop','Homework']`;
   `'WORK'` → same first two + `Homework`; `''` → `[]`; `max = 1` → `['Work']`.
4. `c18-05 ps4: newPlaceNameError — taken (any case/space), same as other new name, else null`
   — labels `['Work','Home']`: `' work '` → the message names `"Work"`; `'Store'` with other
   `'store'` → `'start and end cannot share a name'`; `'Store'` with other `'Home'` → null (the
   function compares the two TYPED names only — an existing `Home` is reported by the other
   endpoint's own check); `''` → null. Also `placeByLabel(cat, 'WORK')` → the `Work` landmark;
   with `exceptId` = its id → null.

**New `app/tests/catalogmerge_suite.ts`** (imports: `assert, test`; `emptyCatalog, mergeCatalogs,
validateCatalog` from `../src/store/catalog.ts`; `mergeLandmarks, renameLandmark` from
`../src/store/catalogMerge.ts`; types). Fixture `twoWorks()`: user catalog with landmarks
`home (50.87,4.70,120)`, `work1 (50.90,4.70,120)`, `work2 (50.9025,4.70,120)` (~278 m apart —
must validate: `metresBetween ≥ 240`), `store (50.95,4.75,120)`; routes
`r1: home→work1 [w1]`, `r2: work2→store [w2]`, `r3: work1→store [w3]`, `r4: store→work2 [w4]`;
ways `w1..w4` (`refLineId` = own id, `gateSetVersion: 1`, `seeded: false`, `referenceRideId`
`'ride-<n>'`, `w3.specs: ['Dry']`); one gate set per way `[10, 500]`. Assert
`validateCatalog(mergeCatalogs(emptyCatalog(), twoWorks())).length === 0` in a setup test.

1. `c18-05 m1: rename — trims, refuses empty, refuses a taken name case-insensitively, refuses a seed place, keeps own name`
   — `renameLandmark(cat, seed, 'work2', '  Work B ')` → ok, label `'Work B'`, every other
   field byte-equal; `''` → `ok:false`; `'HOME'` → `ok:false` mentioning `"home"`; own
   `'work2'` → ok; with `seed = catWith([lm('sw',…)])` and id `'sw'` → `ok:false` (not in user);
   a user rename to a SEED label (`seed.landmarks[0].label`) → `ok:false`.
2. `c18-05 m2: merge re-points every route, drops the loser, keeps ways/gates untouched, validates`
   — `mergeLandmarks(cat, empty, 'work1', 'work2')`: ok; `next.landmarks` ids
   `['home','work1','store']`; `r4.startLandmarkId`… note r2 (`work2→store`) collides with
   r3 (`work1→store`) → **folded**: `folded` = `[{ droppedRouteId:'r2', intoRouteId:'r3', movedWayIds:['w2'] }]`,
   `next.routes` ids `['r1','r3','r4']`, `r3.wayIds` `['w3','w2']`, `w2.routeId === 'r3'`,
   `r4.endLandmarkId === 'work1'`; `repointedRouteIds` `['r2','r4']`; `next.gateSets` deep-equal
   input; every way id present; `validateCatalog(mergeCatalogs(empty, next)).length === 0`.
3. `c18-05 m3: a merge that makes a route X → X gets a loopDiscriminator and validates`
   — add route `r5: work2→work1 [w5]` (+ way/gates) → after merge `r5` has
   `loopDiscriminator === 'loop:merged:work2'`, `loopedRouteIds === ['r5']`, catalog validates.
4. `c18-05 m4: two plain ways fold; equal non-empty specs refuse with no partial result`
   — give `w2.specs = ['Dry']` (same as w3) → `ok:false`, error mentions `w3` and `w2`;
   the input catalog object is unchanged (same reference, deep-equal).
5. `c18-05 m5: refusals — same id, unknown keep, seed drop; keep may be a seed place`
   — `('work1','work1')` → false; `('nope','work2')` → false; `seed` with landmark `'sw'`:
   `(cat, seed, 'work1', 'sw')` → false (not user-owned); `(cat, seed, 'sw', 'work2')` → ok,
   routes point at `'sw'`, and `validateCatalog(mergeCatalogs(seed, next))` is clean (place
   `sw` far from the others, radius 120).
6. `c18-05 m6: pre-existing twins are NOT folded unless one of them was re-pointed`
   — a catalog that already holds `r6: home→store` and `r7: home→store` (both untouched by
   merging `work2`) keeps both.
7. `c18-05 m7: sportId separates twins` — `r2.sportId = 'sport:b'`, `r3` unstamped → after
   merge both routes remain (`['r1','r2','r3','r4']`), `folded === []`, still validates.

**`app/tests/routecreation_suite.ts` — append after the last pure test (WP-G 10, before the
`import { registerHooks }` block at line 619):**

1. `c18-05 rc1: applyEndpointChoices — both proposed is identity; start → existing re-points, loop and existingRouteId recompute`
   — `d = draftRouteCreation(catWith([lm('X', LAT0+0.05, LON0, 120)]), { ...RIDE, fixes: northRide(20) })`
   (two new endpoints); `applyEndpointChoices(cat, d, PROPOSED) === d` (same reference);
   `{ start: { kind:'existing', landmarkId:'X' }, end: PROPOSED.end }` → `start.kind==='existing'`,
   `start.landmarkId==='X'`, `end` deep-equal `d.end`, `loop===false`, `existingRouteId===null`;
   both → `'X'` → `loop === true`, and with a catalog holding route `X→X` (`loopDiscriminator`)
   → `existingRouteId` is that route's id.
2. `c18-05 rc2: applyEndpointChoices — a pair that already has a route flips into the variant`
   — catalog with `A`, `B`, route `A→B [wAB]`; a draft with two new endpoints; choices
   `A`/`B` → `existingRouteId === 'A→B route id'`, and `buildRouteCreationCatalog(cat, applied,
   { start:'', end:'', specs:['Alt'] })` adds a way under that route and NO landmark
   (`landmarks.length` unchanged) — same shape WP-G 1 asserts.
3. `c18-05 rc3: applyEndpointChoices — a loop draft follows the start's choice`
   — take WP-G's loop fixture from `wayCreation: a ride ending back at its own new start
   landmark drafts a loop` (line 99) and apply start → existing `X`: `end.landmarkId === 'X'`,
   `loop === true`.
4. `c18-05 rc4: newPlaceLabelErrors — taken names (any case), shared name, existing endpoints never judged`
   — catalog `[lm('Work'…)]` (label 'Work'); draft with two new endpoints: `{ start:'work ', end:'Store' }`
   → one error naming `"Work"`; `{ start:'Shop', end:'shop' }` → `['start and end cannot share a name']`;
   `{ start:'A', end:'B' }` → `[]`; a draft whose start is `'existing'` with `names.start = 'Work'`
   → `[]` (nothing new on that side); `{ start:'', end:'' }` → `[]`.

**In the WP-H block (after WP-H 17b, line ~945), add:**

5. `c18-05 rc5 (createRouteFromDraft): a taken name is refused before any write`
   — `wphSetup()`; `wphWriteRideFile(fs, 'create5', wphFixes(200, 0.0002, 1_700_500_000))` (the
   WP-H 17 ride: starts inside `wph-a`, ends far north of every disc → `start` existing,
   `end` new); `draftRouteFromRide('create5', 1_700_500_000_000, null, fs)`. The user landmark
   labels in `wphUserCatalog()` equal their ids (`lm()` sets `label: id`), so
   `createRouteFromDraft(d!, { start: '', end: 'WPH-B' }, fs)` → `ok:false`, the error names
   `"wph-b"`; afterwards `wphCatalogStore.userCatalog().landmarks.length` is unchanged,
   `routes.length` unchanged and `wphUserRefs.userRefFor('way:create5') === null` (nothing
   written). Then `{ start: '', end: 'Far' }` → `ok:true` (the happy path still works).
   (Under the pinned shipped seed the merged catalog also holds `home`/`work`/… — a label
   `'Work'` would be refused too; do not use seed labels as the "free" name.)

**`app/tests/catalogdetail_suite.ts` — one assertion per existing place test:** in
`catalogdetail: place A …` (line 69) add `assert(m.renamable === true && m.mergeable === true, …)`;
in the seed-landmark case (find the test asserting `seedOwned === true` for `lmSeed`; if none,
add `c18-05 cd1: a seed place is neither renamable nor mergeable`) assert both false; and
`c18-05 cd2: the only place is renamable but not mergeable` (a catalog with one user
landmark, no routes).

**`app/tests/run.ts`:** after `import './landmarkusage_suite.ts';` (line 32) insert
`import './placesearch_suite.ts';` and `import './catalogmerge_suite.ts';`.

**Expected before the fix:** `tsc` fails (`placeSearch.ts`, `catalogMerge.ts`, `placePicker.tsx`
missing; `onSave` arity; `renamable`/`mergeable` missing); the new suites fail to import; rc1-rc5
fail (`applyEndpointChoices`/`newPlaceLabelErrors` undefined; rc5's first create succeeds).
**After:** all pass; no existing test changes except the two `catalogdetail` assertions.

## Verification

From the repo root:

- `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL** (new: placesearch ×4,
  catalogmerge ×8 incl. setup, c18-05 rc ×5, cd ×2).
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0. The `onSave` signature change
  is what proves no naming-card caller was missed: `grep -rn "<RouteNamingCard" app/src` → 4
  hits (RecordScreen, RideDetailScreen, DemoScreen ×2); DemoScreen's `onDemoNamingSave` /
  `onDemoAddWaySave` take one parameter and still type-check (fewer parameters are assignable).
- `grep -rn "applyEndpointChoices" app/src` → `routeCreation.ts` (def), `RecordScreen.tsx` (×2),
  `RideDetailScreen.tsx` (×2), nothing else.
- `grep -rn "newPlaceLabelErrors" app/src` → def + `routeFromRide.ts`.
- `grep -rn "PlacePicker" app/src` → def + `routeNamingCard.tsx` (×2) + `CatalogDetailScreen.tsx`.
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly the 15 files under Executor rules (5 new,
  shown by `git status --short` as `??` until added). `DemoScreen.tsx` NOT in the diff.

## Stop conditions (report, do not resolve)

- Brief 04 not in the tree (precondition grep), or its buttons block does not contain the
  exact `onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs })}` line.
- `createRouteFromDraft`'s first body line is not `const fixes = await readRideFixes(draft.rideId, fs);`.
- `routeCreation.ts` lines 266-275 are not the quoted WP-G block verbatim.
- `RouteNamingCard` mounted anywhere other than the four sites.
- A test in `routecreation_suite.ts`/`catalogstore_suite.ts`/`catalogdelete_suite.ts` starts
  failing because `buildRouteCreationCatalog`'s output changed — it must not change at all.
- `tsc` reports `PlaceOption` import type problems from `CatalogDetailScreen.tsx`'s inline
  `import('../store/placeSearch.ts').PlaceOption` — replace with a top-level
  `import type { PlaceOption } from '../store/placeSearch.ts';` and say so; any other type
  error, stop.

## JS-only / what changes on Nathan's phone

**JS-only** (no dependency, no `app.json`/`eas.json`/native change) → Preview APK over EAS
Update via `scripts/publish-preview.cmd`
(`powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1"`),
no new numbered build, no reinstall. Once executed, on the phone:

1. **Naming card (END of a ride, and RIDES › Make this the reference…):** typing in a new-place
   field shows matching existing places as pills under it from the first letter (most-used
   first). Tap one → that field becomes the place, with a `change` link. Typing exactly an
   existing name (any case) dims CREATE ROUTE and shows `A place called "Work" already exists —
   tap it above to use it`. Naming start and end the same is refused too.
2. **Picking Work and Store when Work → Store already exists** flips the card into "New way on
   Work → Store" (specs required, ADD WAY) — no twin route, ever.
3. **ROUTES › tap a place (yours):** ACTIONS gains `Rename` (inline field + SAVE) and `Merge
   into another place…` (pill list of the other places; each shows its route count and, when
   two share a name, coordinates). Merge → a confirm that counts the routes re-pointed and
   folded → the kept place's page opens. Shipped places (none on the virgin build) get neither.
4. **His recovery, step by step:** ROUTES › the second "Work" (the pills show coordinates so
   he can tell which is which — the one with fewer routes is the twin) › `Merge into another
   place…` › tap the other "Work" › Merge. Every route now reads Work; if two routes became
   the same pair, they are one route with two ways (both plain: RECORD's WHICH WAY TODAY? row
   then lists them by their variant labels). Results, gates, reference lines, ride
   recordings: untouched. Same for a duplicated "Store".
5. **Not changed:** how an endpoint is resolved from coordinates (a far-side stop still drafts
   `'new'` — decision 5), disc sizes, the RECORD tab, DEMO, ranking, RESULTS grouping, the
   quiet `not <way>?` offer, free rides (brief 04).

## Nathan's call (recommended defaults applied; change = one-line follow-ups)

1. **Merge in this brief vs. a separate one.** Default: included — it is one pure ~90-line
   function with 7 tests and a confirm dialog; without it his two "Work"s stay stuck.
   Alternative: ship §1-§8 + Rename only and park §2/§10's merge as brief 07 (then he renames
   one to `Work 2` and re-creates routes by hand).
2. **Hard refusal of a taken name in the store.** Default: yes (decision 1) — the card already
   makes it one tap to use the existing place, so a second "Work" is never what he wants.
   Alternative: warn only (card hint, store accepts) — then twins remain possible from a
   future caller.
3. **Case-insensitive uniqueness.** Default: `Work` = `work`. Alternative: exact match only.
4. **Growing a disc when a `'new'` endpoint is pointed at an existing place** (decision 5).
   Default: never. Alternative (follow-up, ~15 lines in `applyEndpointChoices` + a validate):
   when the fix is within 300 m of the disc edge and the grown disc would overlap nothing,
   enlarge `radiusM` to cover the fix + 30 m — fewer repeat proposals, but discs then creep,
   which is the thing `validateCatalog` was written to stop.
5. **Twins folded by raw `sportId`** (decision 6). Default: `(a.sportId ?? '') === (b.sportId ?? '')`.
   Edge: a stamped-with-the-first-sport route and an unstamped one (same effective sport,
   `sports.ts:113-116`) are not folded and both stay reachable only through RESULTS (RECORD
   finds the first). Alternative: pass `currentSports()` into `mergeLandmarks` and compare
   `effectiveSportId` — a signature change in §2 and one more test.
6. **Proposals from the first character, max 6.** Default as written. Alternative: show the
   top places before anything is typed (then the card grows by one pill row for every
   new-place field; brief 06 gives existing-place endpoints their own picker anyway).
7. **After a merge, land on the kept place.** Default: yes. Alternative: `tabNav.closeCatalog()`
   back to the ROUTES list.

## Out of scope

- Editing an endpoint that resolved to an EXISTING place (auto-detected wrong, or the
  pre-ride pick) — brief 06, on top of this brief's picker and `applyEndpointChoices`.
- Moving a landmark, changing its radius, `offerAtStart` toggles, deleting a referenced place.
- A `pick` sidecar rewrite after a merge (decision 7); `STATE.md`, `OPEN-ITEMS.md`, this
  folder's `README.md`.

## Open questions / assumptions (logged, not blocking)

1. `placeOptions` is computed per render of the 'ending' phase / ride detail
  (`landmarkUsageCounts` walks stored results per route — the same cost RECORD's setup pills
   pay today, `RecordScreen.tsx:1062-1065`). Fine at catalog scale; memoise later if it shows.
2. The typeahead compares against ALL landmarks, dormant ones included — identity, not
   offerability (same reason `landmarkAt` runs with the active-time filter off in
   `draftRouteCreation`).
3. A merge that folds routes leaves the folded route's ways with their original
   `referenceRideId`s; `catalogDetailModel`'s route page lists both ways under one route.
   `RESULTS` regroups by `way.routeId` on the next mount (`resultsListModel.ts:141-190`).
4. `Alert.alert` with three-line bodies renders fine on Android (already used by
   `catalogDeleteActions.ts:65-70`).
