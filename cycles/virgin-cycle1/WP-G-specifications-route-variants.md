**Status: DONE — landed on the device 2026-09-04, independently inspected (fresh Fable pass, 2 real bugs found+fixed; clean after). 409 tests, 406 pass, 0 fail, 3 skip (20 new); `tsc --noEmit` exit 0. `Route.specs?: string[]` lands, `draftWayCreation` now offers a variant instead of refusing a repeat ride on an existing Way, RECORD's pill rows group by spec prefix (`specPickRows`, byte-identical fallback when no specs), `RidesScreen.tsx`/`ResultScreen.tsx`/`RoutesScreen.tsx` all switched off the raw route id via `routeLabelIn` (a Fable ruling pass added `RidesScreen.tsx` after Execute correctly flagged it as outside the brief's own file list). Inspector fixed: a hand-typed non-array `specs` crashing `validateCatalog`, and a false 'already exists' hint on card-open before any typing.**
**Review doc item: 7 (implementation plan; body is review §4 "Naming card at STOP: worked, but wants more than start/end"). Size: medium-large.**
**Verified against the mount as read 2026-09-03 (HEAD `a03b84e`; suite last reported 366 tests / 363 pass / 0 fail / 3 skip at WP-F's landing — not re-run for this brief).**

---

# WP-G — Route specifications / variants

## 1. Goal

Let a rider name a ride as `From → To → Spec1 → Spec2 → …` (free text, any depth), where every segment after the endpoint pair lives on the **Route**, so that:

- a ride whose endpoints already form a Way of ours can still be saved — as a **new Route (variant) on that existing Way** — instead of today's silent no-offer;
- a spec typed once is offered back as a tap (chips) next time, prefix-aware ("recognize previously-used ones");
- the RECORD tab groups a Way's routes by shared spec prefix and only forks the pill row at the first segment where they actually differ (Nathan: "if everything before Spec2 is the same … only at the Spec2 step the two options appear");
- every screen that prints a user route stops showing the raw `route:20260901-091752-f6ca` id.

| Situation at STOP (after WP-F) | Today | After WP-G |
|---|---|---|
| Endpoints new/new or new/existing, no Way | naming card, CREATE WAY | same card; may optionally add specs to the first route |
| Existing landmark pair, no Way in this direction | naming card (fixed labels), CREATE WAY | same |
| Existing pair, Way exists in this direction, engine unmatched (the WP-A ride-2 shape) | `draftWayCreation` → `null`, no card, straight to Result | card in **variant mode**: "Home → Work, but not on a route you have" — ADD ROUTE enabled once ≥1 spec typed |
| Existing pair, Way exists, engine matched a route on it (the normal commute) | no card | card in variant mode, low-friction: skip is "no — it was Dry" (see §9 Q1 for the quiet alternative) |
| Typed specs equal an existing route's specs on that Way | n/a | button disabled + inline "already exists — pick it on RECORD next time"; nothing is created |
| RECORD tab, Way with routes `[]`, `["Wet"]` | n/a (second route unreachable) | one row: `plain` · `Wet` |
| RECORD tab, routes `["Dry","Fast"]`, `["Dry","Slow"]`, `["Wet"]`, picked Fast | n/a | row 0: `Dry`(on) · `Wet`; row 1: `Fast`(on) · `Slow` |
| RECORD tab, any Way where no route has specs (all seed ways; today's user ways) | flat `routeVariantLabel` pills | **byte-identical** flat pills |

Out of scope (named so nobody scopes them in by accident): renaming/retro-tagging an existing route from the ROUTES tab; per-ride condition attributes; changing route ids (D-023 stands — ids stay opaque, names are data); WP-H's ride screen "set as reference".

## 2. Current state (verified against `a03b84e`)

### 2.1 `store/types.ts:47-57` — `Route` has no name of any kind
`Route { id; wayId; refLineId; gateSetVersion; seeded; referenceRideId? }`. `Way` (`:39-45`) carries `routeIds: string[]` and an optional `loopDiscriminator`. There is no label/variant/spec field anywhere; the only "variant" concept is display-side (§2.4).

### 2.2 `store/wayCreation.ts:237-240` — the refusal that blocks variants
```ts
if (start.kind === 'existing' && end.kind === 'existing') {
  const already = c.ways.some(
    (w) => w.startLandmarkId === start.landmarkId && w.endLandmarkId === end.landmarkId,
  );
  if (already) return null;
}
```
Header comment (`:138-142`) documents this as deliberate ("a repeat ride — way MATCHING is COLD-START §3 step 7, a later package"). `WayCreationDraft` (`:67-78`) has no notion of an existing way. `buildWayCreationCatalog(userCat, draft, names: {start,end}, seed?)` (`:263-327`) always mints `way:${rideId}` + `route:${rideId}` + one v1 GateSet and returns the merged user catalog. Route ids of every user-created route therefore start with `route:` — the discriminator §3.4 relies on.

Merge semantics that matter (`store/catalog.ts:244-256`): `mergeCatalogs(seed, user)` is seed-wins by id per collection. A user Route whose `wayId` names a **seed** Way is already a tolerated shape — `validateCatalog` (`:95-102`) only checks `route.wayId` exists and that every id in `way.routeIds` exists, never the inverse link; `catalogDelete.ts:101-113` guards `if (way)` for exactly this. On the `virgin` build the seed is empty (`store/seed.ts`, `EXPO_PUBLIC_SEED_MODE=empty`), so every Way is a user Way and *can* be edited in place. Consumers that need "routes of a way" filter by `wayId` (`RecordScreen.tsx:870`, `RoutesScreen.tsx:179`, `catalog.ts:149 routesForWay`), not by `way.routeIds`; only `catalogDelete.ts` reads `routeIds`.

### 2.3 `ui/RecordScreen.tsx` — STOP flow and the pill row
- `onEnd` (`:528`) calls `namingDraftFor(rideId, startedAtMs, finalState.track)` → `draftWayCreation(currentCatalog(), …)` (`:90-105`); `null` ⇒ `setShowAnim('rev')` directly (`:551`).
- `onNamingSave(names: {start,end})` (`:571-621`): builds ref line from the ride's fixes, seeds gates, `buildWayCreationCatalog(userCatalog(), draft, names, seed)`, `saveUserCatalog`, `saveUserRef('route:${rideId}', …)`, then the gate-adjust card keyed on `route:${draft.rideId}`.
- `<WayNamingCard … onSave={onNamingSave}>` at `:1005-1013`, fed by `existingLandmarkLabel()` (`:111-114`).
- `wayRoutes` (`:870`) = `sortRoutesForDisplay(CATALOG.routes.filter(r => r.wayId === way.id))`; `pickedRoute` (`:872-875`) = `routePick` if it is on this way else `defaultRouteFor(wayRoutes)` (`:150-163`, §8a most-ridden-recent); `pickSource` (`:880-885`) derives 'picked'/'default'/'none' from the same state.
- Pill row (`:1267-1282`): `{!freeRide && way && wayRoutes.length > 1 ? … wayRoutes.map(r => <Pressable onPress={() => setRoutePick({wayId, routeId: r.id})}>{routeVariantLabel(r.id, way)} …}`. The armed line at `:953` prints `routeVariantLabel(pickedRoute.id, way)`.

### 2.4 `store/defaultRoute.ts` — display-only variant concept
`ROUTE_DISPLAY_ID` (`:13-25`) overlays FromToVariant-style names on seven **seed** ids. `routeLabel(id)` (`:31-33`) splits on capitals. `routeVariantLabel(id, way)` (`:44-55`) strips the way's capitalised landmark-id pair and falls back to `routeLabel(id)` — for a user route (`route:2026…`) both return the raw id. Call sites: `RecordScreen.tsx:60,772-776,953,1010,1100,1273`; `ResultScreen.tsx:218,237`; `rideHistoryModel.ts:127,198`; `RoutesScreen.tsx:30,89,204`; `DemoScreen.tsx:161` (seed id, untouched).

### 2.5 `ui/wayNamingCard.tsx` — two inputs, one button
Props `{startExistingLabel, endExistingLabel, loop, busy, matchedRouteLabel?, onSave(names:{start,end}), onSkip}`; local state `startName`/`endName`; `complete` gates CREATE WAY; three copy variants (loop / matched / unmatched).

### 2.6 Tests that currently lock the refusal (must be rewritten, not deleted)
`tests/waycreation_suite.ts`: header bullet 5 and its test ("an existing (start,end) way means NO offer"); `WP-F 2` (`:215`, "an existing pair refuses regardless of the engine verdict"); `WP-F 6` (`:287`, "real fixtures against the shipped seed catalog — matched but genuinely no other way, stays suppressed"). Each flips from "null" to "draft with `existingWayId` set" — §5.

## 3. Proposed change

### 3.1 `store/types.ts` — `Route.specs`
```ts
export interface Route {
  id: string;
  wayId: string;
  refLineId: string;
  gateSetVersion: number;
  seeded: boolean;
  referenceRideId?: string;
  /** WP-G (Nathan 2026-09-02, Q2): the rider's own ordered free-text segments
   * AFTER the way's From/To — "Home → Work → Dry → Fast" stores ['Dry','Fast'].
   * Order matters (it is a path, not a tag set): RECORD groups a way's routes
   * by shared prefix and forks the pill row only where the lists diverge
   * (store/routeSpecs.ts). Absent or [] = the way's "plain" route. Trimmed,
   * non-empty strings; validateCatalog rejects two routes on one way with the
   * same NON-empty list (two plain routes stay legal — the seed's shape).
   * Seed routes never carry this; their variant names remain the
   * ROUTE_DISPLAY_ID overlay (defaultRoute.ts). Ids are untouched (D-023). */
  specs?: string[];
}
```
Why on Route, not Way: a Way is already "this directed endpoint pair"; the things Nathan wants to differentiate *under* one pair are Routes (RECORD already picks among a Way's routes, the engine scores per route, gates/refs/results are per route). A Way-level field would need a second grouping key for exactly the same set. Nothing on `Way` changes.

Persistence: `decodeCatalog` passes unknown fields through; files without `specs` decode to `undefined`; no `CATALOG_SCHEMA_VERSION` bump.

### 3.2 `store/wayCreation.ts` — offer a variant instead of refusing

**Draft type** (add after `matchedRouteId`):
```ts
  /** WP-G: the way that ALREADY links start→end in this direction, when one
   * does — the offer is then "new route on this way", not "new way". Both
   * endpoints are 'existing' whenever this is set; buildWayCreationCatalog
   * adds no landmark and no way, only a Route (+ gate set) under it. Null =
   * today's brand-new-way offer. */
  existingWayId?: string | null;
```

**`draftWayCreation` `:237-240`** becomes:
```ts
  // WP-G: an existing directed way is no longer a refusal — it is the
  // variant case (a second Route on the same Way). First match wins; only
  // loops can have several ways on one pair (loopDiscriminator) and then
  // any of them is an equally good home for the new route.
  const existingWay =
    start.kind === 'existing' && end.kind === 'existing'
      ? c.ways.find(
          (w) => w.startLandmarkId === start.landmarkId && w.endLandmarkId === end.landmarkId,
        ) ?? null
      : null;
  return { …as today…, matchedRouteId: ride.matchedRouteId ?? null, existingWayId: existingWay?.id ?? null };
```
Update the function's doc block (`:138-142`) and the file header (`:1-26`): "null when: fewer than 2 fixes; track shorter than MIN_TRACK_LENGTH_M. An existing directed way now yields a draft with `existingWayId` (WP-G)."

**Names type** — replace the inline `names: { start: string; end: string }` with an exported type used by the card, RecordScreen and the builder:
```ts
/** WP-G: what the naming card hands back. `specs` in the rider's order; the
 * builder trims and drops empties, so ['', ' Dry '] stores ['Dry']. */
export interface WayNames { start: string; end: string; specs?: readonly string[] }

/** WP-G: trimmed, non-empty, order-preserving; [] when nothing survives. */
export function cleanSpecs(specs: readonly string[] | undefined): string[] {
  return (specs ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** WP-G: case-insensitive positional equality — 'Dry' and 'dry' are the same
 * spec, ['Dry','Fast'] and ['Fast','Dry'] are not. */
export function sameSpecs(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((s, i) => s.toLowerCase() === b[i].toLowerCase());
}

/** WP-G: the route on `wayId` already carrying exactly these specs (after
 * cleanSpecs), or null. The card disables ADD ROUTE on a hit and RecordScreen
 * refuses to build one — "same specs" means "that route", never a twin. */
export function findRouteWithSpecs(c: Catalog, wayId: string, specs: readonly string[]): Route | null {
  const want = cleanSpecs(specs);
  return c.routes.find((r) => r.wayId === wayId && sameSpecs(r.specs ?? [], want)) ?? null;
}
```

**`buildWayCreationCatalog(userCat, draft, names: WayNames, seed?)`** — the body forks on `draft.existingWayId`:
```ts
  const routeId = `route:${draft.rideId}`;
  const specs = cleanSpecs(names.specs);
  const specField = specs.length > 0 ? { specs } : {};   // absent, not [], so pre-WP-G output is byte-identical
  const gateSet: GateSet = …unchanged…;
  if (draft.existingWayId) {
    // WP-G variant path: no landmark, no way. The way is appended to in place
    // when it is ours (userCat); a SEED way (shipped build only — the virgin
    // seed is empty) cannot be edited through the seed-wins merge, so the new
    // route simply points at it: every consumer resolves "routes of a way" by
    // wayId (routesForWay, RecordScreen, RoutesScreen) and validateCatalog
    // never requires the inverse link; catalogDelete already tolerates it.
    const wayId = draft.existingWayId;
    const route: Route = { id: routeId, wayId, refLineId: routeId, gateSetVersion: 1, seeded: false, referenceRideId: draft.rideId, ...specField };
    return {
      schemaVersion: userCat.schemaVersion,
      landmarks: userCat.landmarks,
      ways: userCat.ways.map((w) => (w.id === wayId ? { ...w, routeIds: [...w.routeIds, routeId] } : w)),
      routes: [...userCat.routes, route],
      gateSets: [...userCat.gateSets, gateSet],
    };
  }
  …today's new-way body, with `...specField` spread into the new Route…
```
Update the builder's doc block accordingly ("one Way, one Route" → "one Route, and — unless `draft.existingWayId` — one Way and its new landmark(s)").

### 3.3 `store/routeSpecs.ts` — NEW pure module (grouping + suggestions)
```ts
/**
 * WP-G: spec-prefix grouping for a way's routes (Nathan, 2026-09-02: "if
 * everything before Spec2 is the same, group the rides together; only at the
 * Spec2 step the two options appear"). Pure, no React; RecordScreen feeds it
 * the way's routes and the current pick and renders one pill row per returned
 * row. Also the naming card's suggestion source. Headless-tested in
 * tests/routespec_suite.ts.
 */
import type { Route } from './types.ts';

type SpecRoute = Pick<Route, 'id' | 'specs'>;

/** Label of the "no further spec" option — a way's plain route (the one ride 1
 * made) sitting beside its variants, or ['Dry'] beside ['Dry','Fast']. */
export const PLAIN_SPEC_LABEL = 'plain';

/** True when at least one route carries a spec — RecordScreen's switch between
 * today's flat pill row (kept byte-identical) and the grouped rows. */
export function hasSpecs(routes: readonly SpecRoute[]): boolean {
  return routes.some((r) => (r.specs?.length ?? 0) > 0);
}

export interface SpecPickOption<T> { label: string; route: T; on: boolean }
export interface SpecPickRow<T> { depth: number; options: SpecPickOption<T>[] }

/**
 * One row per depth at which the routes that share the picked route's spec
 * prefix still disagree. Walk: subset = all routes; at depth d group the
 * subset by specs[d] ('' = the list ends here → PLAIN_SPEC_LABEL, listed
 * first, then first-appearance order); ≥2 groups ⇒ emit a row; descend into
 * the picked route's group; stop after the depth where the picked route's
 * list ends. Exactly one option per row is `on`. Tapping an option selects a
 * concrete route at once — the picked route itself when it is in that group,
 * else `pickWithin(group)` (RecordScreen passes its §8a defaultRouteFor) — so
 * `routePick` stays {wayId, routeId} and every downstream reader
 * (pickedRoute, pickSource, onStart) is untouched. [] for <2 routes or when
 * `pickWithin` yields nothing.
 */
export function specPickRows<T extends SpecRoute>(
  routes: readonly T[],
  pickedId: string | null,
  pickWithin: (subset: T[]) => T | null,
): SpecPickRow<T>[] {
  if (routes.length < 2) return [];
  const picked = routes.find((r) => r.id === pickedId) ?? pickWithin([...routes]);
  if (!picked) return [];
  const path = picked.specs ?? [];
  const rows: SpecPickRow<T>[] = [];
  let subset: T[] = [...routes];
  for (let d = 0; d <= path.length; d++) {
    const groups = new Map<string, T[]>();
    for (const r of subset) {
      const k = (r.specs ?? [])[d]?.toLowerCase() ?? '';
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    const keys = [...groups.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : 0)); // stable: plain first, else first appearance
    if (keys.length >= 2) {
      rows.push({
        depth: d,
        options: keys.map((k) => {
          const g = groups.get(k)!;
          const on = g.includes(picked);
          const label = k === '' ? PLAIN_SPEC_LABEL : (g[0].specs ?? [])[d];   // first-used casing
          return { label, route: on ? picked : (pickWithin(g) ?? g[0]), on };
        }),
      });
    }
    if (d === path.length) break;
    subset = groups.get(path[d].toLowerCase())!;
  }
  return rows;
}

/**
 * Chips for the naming card's next spec input. Prefix-aware on THIS way
 * first (values used at position `typed.length` by routes whose earlier
 * segments equal `typed`, case-insensitive), then every spec used anywhere
 * in the catalog (`vocabulary`, e.g. 'Dry' from Work→Home offered on
 * Home→Work), deduped case-insensitively keeping first-used casing, minus
 * anything already in `typed`, capped at `max`.
 */
export function specSuggestions(
  wayLists: readonly (readonly string[])[],
  vocabulary: readonly string[],
  typed: readonly string[],
  max = 8,
): string[] { …straightforward; tested in §5.2… }

/** Every distinct spec value in the catalog, first-used casing, catalog order. */
export function specVocabulary(routes: readonly SpecRoute[]): string[] { … }
```

### 3.4 `store/defaultRoute.ts` — labels that know about specs
```ts
/** WP-G: every route wayCreation.ts mints — the ids the FromToVariant
 * convention (and ROUTE_DISPLAY_ID) can never describe. */
export function isUserMintedRouteId(id: string): boolean { return id.startsWith('route:'); }

export function routeVariantLabel(
  id: string,
  way: { startLandmarkId: string; endLandmarkId: string },
  specs?: readonly string[],          // WP-G: pass route.specs; seed callers omit it
): string {
  if (specs && specs.length > 0) return specs.join(' · ');           // WP-G
  if (isUserMintedRouteId(id)) return PLAIN_SPEC_LABEL;               // WP-G: never the raw id
  …existing body unchanged…
}

/** WP-G: full name of a route as the rider knows it — "Home → Work · Dry ·
 * Fast" from the way's landmark labels plus specs — for any user-minted
 * route in `c`. Seed ids (and ids not in `c`) return routeLabel(id)
 * byte-for-byte, so nothing Nathan's shipped build prints today moves. */
export function routeLabelIn(c: Catalog, id: string): string {
  const r = c.routes.find((x) => x.id === id);
  if (!r || !isUserMintedRouteId(id)) return routeLabel(id);
  const w = c.ways.find((x) => x.id === r.wayId);
  const lab = (lid: string) => c.landmarks.find((l) => l.id === lid)?.label ?? lid;
  const base = w ? `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}` : id;
  return r.specs?.length ? `${base} · ${r.specs.join(' · ')}` : base;
}
```
(`PLAIN_SPEC_LABEL` imported from `./routeSpecs.ts`; `sortRoutesForDisplay` unchanged — spec routes keep catalog order.)

Call-site switches (all mechanical):
- `RecordScreen.tsx:953` and `:1273` → `routeVariantLabel(r.id, way, r.specs)`; `:1010` `matchedRouteLabel` → `routeLabelIn(currentCatalog(), naming.matchedRouteId)`; `:772-776,1100` (live status / sector lines) → `routeLabelIn(CATALOG, …)`.
- `RoutesScreen.tsx:204` → `routeVariantLabel(r.id, w, r.specs)` (the row sits inside the way's own card, so the variant-only name reads right); `:89` delete title → `routeLabelIn(CATALOG, r.id)`.
- `ResultScreen.tsx:218,237` → `routeLabelIn(currentCatalog(), …)`.
- `rideHistoryModel.ts:127,198` are pure and catalog-less: add an optional trailing `labelFor: (id: string) => string = routeLabel` parameter to `buildRideRows`/`buildPbRows` and have the two UI callers pass `(id) => routeLabelIn(CATALOG, id)`. Existing tests keep passing (default unchanged).

### 3.5 `store/catalog.ts` — validation (inside the routes loop, `:95-102`)
```ts
    // WP-G: specs are trimmed non-empty strings; identical NON-empty lists on
    // one way would be two names for one thing (two plain routes stay legal —
    // that is the seed's own shape).
    if (r.specs !== undefined) {
      if (!Array.isArray(r.specs) || r.specs.some((s) => typeof s !== 'string' || s.trim() !== s || s.length === 0)) {
        errs.push(`route ${r.id}: specs must be trimmed non-empty strings`);
      }
    }
  }
  for (const w of c.ways) {
    const seen = new Map<string, string>();   // lowercase joined specs -> route id
    for (const r of c.routes) {
      if (r.wayId !== w.id || !r.specs?.length) continue;
      const key = r.specs.map((s) => s.toLowerCase()).join(' ');
      const dup = seen.get(key);
      if (dup) errs.push(`way ${w.id}: routes ${dup} and ${r.id} share specs ${JSON.stringify(r.specs)}`);
      else seen.set(key, r.id);
    }
  }
```

### 3.6 `ui/wayNamingCard.tsx` — spec segments + variant mode
Props:
```ts
export interface WayNamingCardProps {
  startExistingLabel: string | null;
  endExistingLabel: string | null;
  loop: boolean;
  busy: boolean;
  matchedRouteLabel?: string | null;
  /** WP-G: set when draft.existingWayId is set — the card is then "new route
   * on this way" (title/copy/button change, ≥1 spec required, endpoints shown
   * as fixed text). `knownSpecLists` = specs of the routes already on it. */
  existingWay?: { label: string; knownSpecLists: string[][] } | null;
  /** WP-G: catalog-wide spec vocabulary for the chips (specVocabulary()). */
  vocabulary?: string[];
  onSave: (names: WayNames) => void;
  onSkip: () => void;
}
```
State: `specs: string[]` (committed segments) + `specDraft: string` (the open input). Layout, after the endpoint block:
```
SPECIFICATIONS (optional / required-in-variant-mode)
[Dry ×] [Fast ×]                          ← committed segments as pills, × removes it and everything after it
[ e.g. Dry, Left, Fast            ] [+]   ← TextInput maxLength 24; onSubmitEditing or `+` commits trimmed non-empty
 Dry   Wet   Alt                          ← chips = specSuggestions(knownSpecLists, vocabulary, specs); tap commits
"already exists as Home → Work · Dry — pick it on RECORD next time, or add another specification"   ← inline hint when duplicate
```
- `duplicate = existingWay ? existingWay.knownSpecLists.some((l) => sameSpecs(l, effectiveSpecs)) : false`, where `effectiveSpecs = cleanSpecs([...specs, specDraft])` (so the hint appears while typing, before `+`). Import `sameSpecs`/`cleanSpecs` from `store/wayCreation`.
- `complete` = existing rule `&& (!existingWay || effectiveSpecs.length > 0) && !duplicate`. Save hands back `effectiveSpecs` — typing "Dry" and pressing the button works without `+`.
- Copy in variant mode — title `New route on ${existingWay.label}`; sub: `matchedRouteLabel` ? `Scored as ${matchedRouteLabel}. Was this a different route? Add what made it different to save it as a new route on this way — this ride becomes its reference.` : `${existingWay.label} is a way you have, but this ride did not follow any of its routes. Name what made it different to save it as a new route — this ride becomes its reference.`; button `ADD ROUTE`; skip text `matchedRouteLabel ? 'no — it was ' + matchedRouteLabel : 'skip — keep it as a plain ride'`.
- New-way mode: today's copy and CREATE WAY unchanged; the spec block is present but optional, labelled `SPECIFICATIONS (optional) — e.g. Dry, Left`.
- Update the file header (§2.5's "owns only the two text inputs" → "the two text inputs and the spec segments").

### 3.7 `ui/RecordScreen.tsx`
1. `onNamingSave` signature → `(names: WayNames)`. Before building, in variant mode: `if (draft.existingWayId && findRouteWithSpecs(currentCatalog(), draft.existingWayId, names.specs ?? [])) { Alert.alert('That route already exists', …); return; }` (belt to the card's braces). Everything after `buildWayCreationCatalog` is unchanged — `route:${draft.rideId}` is still the new route's id in both modes, so `saveUserRef` and the gate-adjust card work as they are.
2. `<WayNamingCard>` gains `existingWay={naming.existingWayId ? existingWayProps(naming.existingWayId) : null}` and `vocabulary={specVocabulary(currentCatalog().routes)}`, where
```ts
/** WP-G: the card's view of the way a variant is being added to. */
function existingWayProps(wayId: string): { label: string; knownSpecLists: string[][] } | null {
  const c = currentCatalog();
  const w = c.ways.find((x) => x.id === wayId);
  if (!w) return null;
  const lab = (id: string) => c.landmarks.find((l) => l.id === id)?.label ?? id;
  return { label: `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}`, knownSpecLists: routesForWay(c, wayId).map((r) => r.specs ?? []) };
}
```
3. Update the `onEnd` comment block (`:517-527`): "Null (no offer) now covers: short rides, read failures" — the existing-way case is an offer again.
4. Pill row (`:1267-1282`) becomes:
```tsx
{!freeRide && way && wayRoutes.length > 1 ? (
  <>
    <Text style={styles.flowLabel}>WHICH ROUTE TODAY?</Text>
    {hasSpecs(wayRoutes)
      ? specPickRows(wayRoutes, pickedRoute?.id ?? null, defaultRouteFor).map((row) => (
          <View key={row.depth} style={styles.pillRow}>
            {row.options.map((o) => (
              <Pressable key={`${row.depth}:${o.label}`} onPress={() => setRoutePick({ wayId: way.id, routeId: o.route.id })}
                style={[styles.pill, o.on && styles.pillOn]}>
                <Text style={[styles.pillText, o.on && styles.pillTextOn]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        ))
      : (today's flat wayRoutes.map(...) verbatim, with routeVariantLabel(r.id, way, r.specs))}
    <Text style={styles.sub}>…§8a copy unchanged…</Text>
  </>
) : null}
```
`defaultRouteFor` already has the `(routes: Route[]) => Route | null` shape `specPickRows` wants. No new state.

### 3.8 Not touched
`live/engine.ts` and everything under `core/` (specs are catalog metadata; the engine keys on route ids). `catalogDelete.ts` (removing a variant is already `removeRoute`; the way survives while another route remains). `storage/*`, GPX+ (`routeIds` are ids). `defaultRoute.ts`'s `ROUTE_DISPLAY_ID`/`sortRoutesForDisplay`. `seed.ts`, both seed JSONs.

## 4. Sequencing / phasing
One Execute pass. The only tempting split — ship single-level specs first — saves nothing: `specPickRows` is the same loop for depth 1 and depth n, and the card's segment list is a `string[]` either way. Order within the pass: §3.1 → §3.2 + §3.5 + §5.1 (green) → §3.3 + §5.2 (green) → §3.4 → §3.6/§3.7 (UI, `tsc` only) → §3.4 call-site switches.

WP-A (ride-2 recognition) is independent: until it lands, a reverse-direction commute may still arrive here with a bogus `matchedRouteId`; the card's variant mode handles both matched and unmatched copy, so WP-G is safe to land first and is the rider's safety net meanwhile (review §7 verdict). WP-C landed 2026-09-02 (user routes draw), so a new variant's trace shows on ROUTES immediately.

## 5. Test plan

### 5.1 `tests/waycreation_suite.ts` (rewrite 3, add 8)
Rewrites (same fixtures, flipped assertions, renamed):
- bullet 5 / "existing way means NO offer" → **"WP-G 0: an existing directed way drafts a VARIANT"**: `d !== null`, `d.existingWayId === 'w1'`, both endpoints `kind: 'existing'`, `loop === false`; the reverse direction (no way) still drafts with `existingWayId === null`.
- **WP-F 2** → "an existing pair drafts a variant regardless of the engine verdict": `existingWayId` set for matching, mismatching and null `matchedRouteId`; `matchedRouteId` still round-trips.
- **WP-F 6** → "real fixtures against the shipped seed: matched, no other way ⇒ variant offer on that seed way" (`existingWayId === <the Home→Work seed way id>`).
New:
1. **WP-G 1 — variant build on a user way**: catalog with user way `w1` (`routeIds:['r1']`), draft `{existingWayId:'w1', start/end existing}`; `buildWayCreationCatalog(userCat, d, {start:'', end:'', specs:[' Dry ', '', 'Fast']})` → no new landmark, `ways.length` unchanged, `w1.routeIds` deep-equals `['r1','route:ride-t1']`, new route `{wayId:'w1', refLineId:'route:ride-t1', referenceRideId:'ride-t1', specs:['Dry','Fast']}`, one new gate set; `validateCatalog(mergeCatalogs(emptyCatalog(), built))` is `[]`.
2. **WP-G 2 — variant on a SEED-owned way**: seed catalog holds the way, `userCat` does not; `built.ways` deep-equals `userCat.ways` (untouched), route present with that `wayId`; merged catalog validates; `routesForWay(merged, wayId)` includes the new route.
3. **WP-G 3 — no specs ⇒ no field**: new-way build with `names` lacking `specs`, and with `specs: ['', '  ']` → the route has no own property `specs` (`'specs' in route === false`); deep-equal to the pre-WP-G shape (copy the existing bullet-6 expectations).
4. **WP-G 4 — specs on a brand-new way** are stored trimmed on its first route; way/landmarks exactly as before.
5. **WP-G 5 — `cleanSpecs`/`sameSpecs`**: trim+drop; `sameSpecs(['Dry','Fast'],['dry','fast'])` true; reversed order false; `[]` vs `[]` true.
6. **WP-G 6 — `findRouteWithSpecs`**: hit on case-insensitive equal list; miss on a different way with the same list; miss on prefix (`['Dry']` vs `['Dry','Fast']`); `[]` finds the plain route.
7. **WP-G 7 — validateCatalog**: two routes on one way with `['Dry']`/`['dry']` → one error naming both ids; two plain routes on one way → no error; `specs:['']` and `specs:[' Dry']` → "must be trimmed non-empty"; the same list on a route of another way → no error.
8. **WP-G 8 — loop variant**: an existing loop way (start === end landmark) with `loopDiscriminator` → draft has `loop === true` and `existingWayId` set; build adds a route to it, no second loop way, merged validates.

### 5.2 `tests/routespec_suite.ts` — NEW (register in `tests/run.ts` after `waycreation_suite.ts`)
Fixture routes `A:['Dry','Fast']`, `B:['Dry','Slow']`, `C:['Wet']`, `P:` (no specs), `D:['Dry']`; `first = (s) => s[0] ?? null` as `pickWithin`.
1. **hasSpecs**: `[P]`→false, `[P,C]`→true, `[]`→false.
2. **flat two-way fork**: `[C, {id:'E', specs:['Dry']}]`, picked C → one row depth 0, options `['Wet'(C, on)… ]` in first-appearance order: `[Wet on, Dry(E)]`; no plain option.
3. **two-level fork**: `[A,B,C]`, picked A → rows `[{0:[Dry on, Wet]}, {1:[Fast on, Slow]}]`; picked C → `[{0:[Dry(→pickWithin([A,B]) = A), Wet on]}]` only; picked B → row 1 `[Fast, Slow on]`.
4. **shared first segment is skipped**: `[A,B]`, picked A → single row at depth **1** (`Fast on, Slow`), no depth-0 row.
5. **plain beside variants**: `[P,C]` picked P → `[{0:[plain on, Wet]}]`; `[D,A]` picked D → no depth-0 row (single group 'dry'), then `{1:[plain on, Fast]}`; picked A → `{1:[plain(D), Fast on]}`.
6. **case-insensitive grouping keeps first-used casing**: `[{id:'x',specs:['dry']},{id:'y',specs:['Dry','Fast']}]` picked x → no depth-0 row, row 1 `[plain on, Fast]`; a merged group's label is the first route's casing.
7. **unknown pick falls back to pickWithin**: `[A,B,C]`, picked `'nope'` → same rows as picked A (since `first` picks A); `pickWithin` returning null → `[]`.
8. **degenerate**: one route → `[]`; `pickWithin` is never called for the `on` group (spy counter).
9. **specSuggestions**: `wayLists=[['Dry','Fast'],['Dry','Slow'],['Wet']]`, `vocabulary=['Dry','Fast','Slow','Wet','Alt']`, typed `[]` → `['Dry','Wet','Fast','Slow','Alt']` (way values at position 0 first, then the rest, deduped); typed `['Dry']` → `['Fast','Slow','Wet','Alt']` ('Dry' excluded as already typed; `Fast`/`Slow` are the prefix-matching continuations); typed `['dry']` matches case-insensitively; `max=2` truncates.
10. **specVocabulary**: first-used casing, catalog order, dedupe (`['Dry','dry']` → `['Dry']`).
11. **labels**: `routeVariantLabel('route:x', way, ['Dry','Fast'])` → `'Dry · Fast'`; `routeVariantLabel('route:x', way)` → `'plain'`; `routeVariantLabel('Morning', homeWorkWay)` → `'Dry'` (unchanged); `routeLabelIn(seedCat, 'Morning')` → `routeLabel('Morning')` byte-identical; `routeLabelIn(c, 'route:x')` on a way Home→Work with specs → `'Home → Work · Dry · Fast'`, without specs → `'Home → Work'`; unknown id → `routeLabel(id)`.

### 5.3 Existing suites expected to stay green
`catalogdelete_suite` (a variant is just another route), `catalogstore_suite` (add one assertion that `specs` round-trips through `encodeCatalog`/`decodeCatalog`), `ridehistory_suite` (default `labelFor`), `recordflow_suite`.

## 6. Verification
```bash
cd app
node --experimental-strip-types tests/run.ts        # expect +19 tests, 0 fail (3 pre-existing skips)
./node_modules/.bin/tsc --noEmit                    # exit 0
```
On-device smoke (not blocking; log in the WP status line): ride Home→Work a second time → card reads "New route on Home → Work", chips empty on a fresh install, type "Wet", ADD ROUTE → RECORD shows `plain · Wet`; third ride, type "Wet" again → button disabled with the inline hint; type "Dry" → three pills; ROUTES tab lists the way with rows `plain`, `Wet`, `Dry`, each drawing its own trace (WP-C).

## 7. Files touched
- **New**: `app/src/store/routeSpecs.ts`; `app/tests/routespec_suite.ts`.
- **Edited**: `app/src/store/types.ts` (Route.specs); `app/src/store/wayCreation.ts` (draft field, `WayNames`, `cleanSpecs`/`sameSpecs`/`findRouteWithSpecs`, builder fork, doc blocks); `app/src/store/catalog.ts` (validation); `app/src/store/defaultRoute.ts` (`isUserMintedRouteId`, `routeVariantLabel` specs arg, `routeLabelIn`); `app/src/ui/wayNamingCard.tsx`; `app/src/ui/RecordScreen.tsx`; `app/src/ui/RoutesScreen.tsx`; `app/src/ui/ResultScreen.tsx`; `app/src/ui/rideHistoryModel.ts` (optional `labelFor`); `app/tests/waycreation_suite.ts`; `app/tests/run.ts` (one import); `app/tests/catalogstore_suite.ts` (one round-trip assertion).
- **Not touched**: `live/`, `core/`, `storage/`, `catalogDelete.ts`, `seed.ts`, seed JSONs, `DemoScreen.tsx`, `gateSeeding.ts`, `userRefs`.

## 8. Risks / things the executor should watch
- **Three existing tests flip meaning** (§2.6). Rewrite them in place with the WP-G name so the reason is in the diff; do not delete.
- **Offer frequency.** After WP-G every ride on a known Way shows the card (one-tap skip). This is the direct reading of Nathan's ask plus WP-F's "the offer is about endpoints, not the engine verdict"; §9 Q1 is the one-line switch if he finds it noisy.
- **Card height.** Chips + segment pills add ~2 rows to a card that already sits on the 'ending' screen; keep chips to one wrapping row (`max` 8) and check it on a small phone.
- **Seed-way variants (shipped build only)**: `way.routeIds` goes stale for a user route on a seed way; documented in §3.2 and covered by WP-G 2. Not reachable on `virgin`.
- `specPickRows` keys pills by `${depth}:${label}`; labels within one row are distinct by construction (grouped case-insensitively).

## 9. Open questions (defaults given; none block execution)
1. **Offer the variant card on every ride over a known Way, or only when the engine did NOT match a route on it?** — Default: **always** (Nathan: "people have freedom to name their rides"; a matched verdict is exactly what ride 2 showed to be unreliable). Alternative: in `onEnd`, drop the draft when `draft.existingWayId && matchedRoute?.wayId === draft.existingWayId` — a two-line change in `RecordScreen.tsx` if he wants the quiet version. *Product taste — Nathan may override after a week of riding with it; not a blocker.*
2. **What is the plain route called once variants exist?** — Default: `plain` (matches the existing "keep it as a plain ride" copy); the first-ever route on a way keeps no specs and is never renamed by this WP. Alternative: when the FIRST variant is added, the card also asks "and what was the original?" and writes `specs` onto the old route — cheap to add later (one extra input + a `routes.map` in the builder), deliberately left out to keep the card short. *Product taste; not a blocker.*
3. **Segment separator in labels** — default ` · ` (already the app's status-line separator; survives multi-word segments like "Via Fosh"). Alternative: a space, matching `routeLabel`'s "Home Work Dry".
4. **Spec length/count caps** — default `maxLength 24` per segment, no hard count cap (the UI naturally limits it; validation only requires trimmed non-empty). Alternative: cap at 4 segments.
5. **Case-insensitive grouping and duplicate detection** — default yes, first-used casing wins for display (`'dry'` typed after `'Dry'` exists groups under `Dry`). Alternative: exact match — rejected because chips make exact reuse the common path anyway and a stray lowercase typo would otherwise fork the RECORD row.
