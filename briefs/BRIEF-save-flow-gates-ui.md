# BRIEF — Save-flow gates, PART B of 3: sector-gate seeding + tap-then-nudge card

**Written 2026-08-31 (Plan tier, fable) against `virgin` HEAD `3c738fa`. Every quoted
"before" block was verified against that HEAD this session; the baseline suite
(`283 tests: 280 pass, 0 fail, 3 skip`) and `tsc --noEmit` (exit 0) were actually run.
The edit set was dry-run mentally, NOT applied — predicted outputs are derived, treat
any deviation as stop-and-report.**

**Sequencing: PART A (`BRIEF-save-flow-refline.md`) MUST have landed and verified
first** (its suite prediction: `292 tests: 289 pass, 0 fail, 3 skip`). Part A edits
`RecordScreen.tsx`, so line numbers in that file have shifted from HEAD `3c738fa`;
every RecordScreen anchor below is therefore given as a LITERAL quote of the post-A
text (Part A specifies it exactly) plus a grep to locate it. All other files' line
numbers are verified against `3c738fa` and unshifted by Part A except where said.

## Stop-on-ambiguity

**If any ambiguity or surprise arises — an anchor that doesn't match, a test that fails
differently than predicted, a file that differs from what this brief quotes — STOP and
report back. Never guess, never improvise a fix.**

## Mandate

1. `GateSet` gains an optional `origin: 'measured' | 'geometric'` field
   (ROUTING-AND-SEGMENTATION §3's honesty clause — the ONE thing this package takes
   from that proposal besides the ≥150 m snap rule; its n=3–6 variable-count
   algorithm is explicitly NOT built, per STATE.md's fixed-4-sectors ground rule).
2. New pure `app/src/store/gateSeeding.ts`: seed the 5-gate chainage list
   (1%/99% start/finish + 25/50/75% sector gates — 4 sectors, the STATE.md ground
   rule) on the built reference line, nudged clear of the reference ride's own stops.
3. `wayCreation.ts`: `buildWayCreationCatalog` accepts an optional gate seed; with it
   the route's v1 gate set is the full 5-gate seed, without it today's 2-gate
   provisional pair (now also flagged `origin: 'geometric'`).
4. UI: `gateAdjustModel.ts` (pure) + `gateAdjustCard.tsx` (dumb card) — SETUP-UX §4's
   tap-then-nudge, cited not redesigned — shown in RecordScreen's 'ending' phase after
   a successful CREATE WAY whose gates were seeded. KEEP costs nothing; SAVE with
   moved gates mints gate-set VERSION 2 via the existing `addGateSet`.
5. Tests: +2 in `waycreation_suite.ts`, new `gateseeding_suite.ts` (8 tests),
   registration in `run.ts`.

## Design decisions already made (do not re-decide)

- **Gate count is 5, not 6.** START (1%), G1/G2/G3 (25/50/75%), FINISH (99%) —
  5 strictly-increasing chainages = exactly 4 sectors, matching the shipped seed
  gate sets (`catalog.seed.json`, e.g. `[162, 1312, 2662, 4212, 5487]`) and STATE.md's
  "every route has exactly 4" ground rule. (The coordinator's tasking said "6 gates";
  that was an arithmetic slip — 4 sectors need 5 fences.)
- **Snap strategy — the rider's own stops, zero network (decided here).** There is no
  OSM/traffic-signal source in this app and building one tonight (network, cache,
  errors) is out of scope. The reference ride's own ≥20 s stationary runs (already
  computed by Part A's `buildRefFromRideFixes` as `stopChainageM`) are a real,
  measured, self-contained proxy for "a light or junction is here": if the rider
  stopped ≥20 s at a spot on the reference ride, a gate within 150 m of it risks
  exactly the corruption the ground rule names. So: seed at the exact quantiles, and
  only where a stop sits within 150 m, slide that gate (10 m steps, alternating
  ± , nearest first) to the closest clear chainage within ±250 m (R&S §3's window);
  if the whole window is blocked, the quantile stands (R&S §3 step 6's fallback).
  **`origin: 'geometric'` regardless** — one ride's stops are a proxy, not measured
  signal data; per the honesty clause these gates are "a starting grid, not a
  benchmark", and `'measured'` stays reserved for a future ≥5-clean-rides
  re-measurement. Skipping the snap entirely (option b) was rejected because the
  mechanism is ~30 pure lines over primitives that already exist, is deterministic
  and headless-testable, and directly improves tomorrow's very first seeded route.
- **Safety rails on the snap:** never snap on routes under 600 m (quantiles only —
  no room to slide); snapped gates must stay ≥50 m inside START/FINISH; if any two
  neighbouring gates end up closer than 50 m, revert ALL sector gates to pure
  quantiles (simple, deterministic, honest — `validateCatalog` only requires strictly
  increasing, but 50 m is the sanity floor for distinct gates).
- **Seeding basis is the REF line's length**, not `trackLengthM` — gates are chainage
  on the reference polyline (what the engine projects onto); the fix-to-fix ridden
  length is a different, slightly longer number. The no-ref fallback pair keeps using
  `trackLengthM` (that route isn't raceable anyway, and it's today's shipped
  behaviour).
- **One-step save, not a two-phase upgrade.** Today NOTHING is persisted at ride-save
  time — the whole catalog addition happens at CREATE WAY (`onNamingSave`). So the
  v1 gate set is simply born fully seeded when a ref could be built; there is no
  stored 2-gate set to "upgrade" and no second flow. The 2-gate provisional remains
  only as the no-ref fallback.
- **Adjustment mints v2, never edits v1.** The seeded v1 is saved first (crash-safe:
  backgrounding mid-adjust loses only the adjustment); a SAVE with moved gates then
  goes through the existing `addGateSet` ("a gate move mints a new version; history
  is never deleted" — `store/catalog.ts:203`). Untouched gates ⇒ no v2, no churn.
- **Only G1/G2/G3 are adjustable.** SETUP-UX §4 locks START/FINISH behind a
  deliberate unlock + count dialog (B-20); that machinery is NOT built here — the
  ends simply don't select. Lap comparability is thereby structurally safe
  (`lapsComparable`: middle-gate moves keep laps).
- **No map on the card.** User-created routes have no `RouteAsset` (routeMapView
  renders the bundled `assets/routes/routes.json` rasters only — verified), so the
  §4 "map line highlights" mirror physically cannot render yet. The card implements
  §4's essential mechanism: the chainage bar with tappable gate handles that enlarge
  on select, and the `−50 −10 │ 1 842 m │ +10 +50` nudge pad in the bottom third of
  the card, chainage number always visible and never under the thumb. The map mirror
  joins when user routes become drawable (flagged in handoff).

## Edit 1 — `app/src/store/types.ts` (GateSet.origin)

Anchor: `export interface GateSet {` at **line 58**, closing at line 64. Before
(verbatim, lines 58–64):
```typescript
export interface GateSet {
  routeId: string;
  version: number;
  chainageM: number[];
  createdAtMs: number;
  note?: string;
}
```
After:
```typescript
export interface GateSet {
  routeId: string;
  version: number;
  chainageM: number[];
  createdAtMs: number;
  /** ROUTING-AND-SEGMENTATION §3 honesty clause: 'geometric' = placed from
   * geometry/proxies (quantiles, the reference ride's own stops), a starting
   * grid, never to be described as good placement; 'measured' is reserved
   * for placement from real multi-ride stop data (unbuilt). Optional: sets
   * that predate this field (the shipped seed) carry neither claim. */
  origin?: 'measured' | 'geometric';
  note?: string;
}
```

## Edit 2 — NEW FILE `app/src/store/gateSeeding.ts`

Create with exactly this content:
```typescript
/**
 * Sector-gate seeding for a route born on the phone (OPEN-ITEMS item 3,
 * Part B). STATE.md ground rule, binding: every route has exactly 4 sectors,
 * gates at fixed 25/50/75% of route distance, start/finish at 1%/99% — never
 * scaled by route length. From ROUTING-AND-SEGMENTATION §3 (an UNBUILT
 * proposal for a different, larger redesign) this takes ONLY the snap rule
 * (no gate within 150 m of a controlled stop, searched in a ±250 m window,
 * quantile stands when the window is blocked) and the honesty clause
 * (GateSet.origin) — NOT its variable n=3–6 count algorithm.
 *
 * Stop source: with no OSM/traffic-signal data wired into this app, the
 * reference ride's own >=20 s stationary runs (live/userRefs.ts's
 * stopChainageM) are the zero-network proxy — where the rider actually
 * stood still is where a gate would corrupt a sector's times. One ride is a
 * proxy, not a measurement, so the seeded set is ALWAYS origin:'geometric'.
 *
 * Pure — no fs, no Date, no imports beyond nothing at all.
 */

export const START_FRAC = 0.01;
export const FINISH_FRAC = 0.99;
export const SECTOR_FRACS = [0.25, 0.5, 0.75] as const;
/** R&S §3 step 5: no gate within 150 m of a (proxied) controlled stop. */
export const SIGNAL_CLEAR_M = 150;
/** R&S §3 step 3: how far a gate may slide from its quantile. */
export const SNAP_WINDOW_M = 250;
export const SNAP_STEP_M = 10;
/** Sanity floor between neighbouring gates; a violation reverts the seed to
 * pure quantiles (validateCatalog needs only strictly-increasing, but two
 * gates 3 m apart is a degenerate sector, not a placement). */
export const MIN_GATE_GAP_M = 50;
/** Below this there is no room to slide anything — quantiles only. */
export const MIN_SNAP_LENGTH_M = 600;

/**
 * The 5 seeded gate chainages (START, G1, G2, G3, FINISH) for a reference
 * line of `refLengthM` metres, given the reference ride's own stop
 * chainages. Always strictly increasing for any refLengthM > 0.
 */
export function seedGateChainages(
  refLengthM: number,
  stopChainageM: readonly number[],
): number[] {
  const L = refLengthM;
  const start = START_FRAC * L;
  const finish = FINISH_FRAC * L;
  const quantiles = SECTOR_FRACS.map((f) => f * L);
  if (L < MIN_SNAP_LENGTH_M || stopChainageM.length === 0) {
    return [start, ...quantiles, finish];
  }
  const clear = (c: number): boolean =>
    stopChainageM.every((s) => Math.abs(c - s) >= SIGNAL_CLEAR_M);
  const snapped = quantiles.map((g0) => {
    if (clear(g0)) return g0;
    for (let k = 1; k * SNAP_STEP_M <= SNAP_WINDOW_M; k++) {
      for (const c of [g0 - k * SNAP_STEP_M, g0 + k * SNAP_STEP_M]) {
        if (c > start + MIN_GATE_GAP_M && c < finish - MIN_GATE_GAP_M && clear(c)) {
          return c;
        }
      }
    }
    // R&S §3 step 6: window blocked — the quantile stands, and the set's
    // origin:'geometric' flag (not silence) carries the honesty.
    return g0;
  });
  const all = [start, ...snapped, finish];
  for (let i = 1; i < all.length; i++) {
    if (all[i] - all[i - 1] < MIN_GATE_GAP_M) {
      // Two snapped gates converged — revert every sector gate to its pure
      // quantile rather than shipping a degenerate sector.
      return [start, ...quantiles, finish];
    }
  }
  return all;
}
```

## Edit 3 — `app/src/store/wayCreation.ts` (optional seed; honest doc refresh)

3a. Header doc, **lines 9–12**. Before (verbatim):
```typescript
 * named, build the user-catalog additions (buildWayCreationCatalog) that
 * catalogStore.saveUserCatalog() persists: landmark(s) born from the visited
 * endpoints, one Way linking them, one Route, and one PROVISIONAL two-gate
 * set (start/finish at 1%/99% of the ridden track length — the settled
 * default; the 25/50/75% sector gates are the NEXT work package, OPEN-ITEMS
 * item 3, deliberately absent here).
```
(Note: that quote spans lines 7–12; replace lines 9–12 only, keeping lines 7–8.)
After (new lines 9–12 region):
```typescript
 * endpoints, one Way linking them, one Route, and its v1 gate set: the full
 * 5-gate seed (1%/99% start/finish + 25/50/75% sector gates on the caller's
 * built reference line — store/gateSeeding.ts) when a `seed` is supplied,
 * else the PROVISIONAL start/finish pair at 1%/99% of the ridden length.
```

3b. Honest-limits bullet, **lines 14–24**. Before (verbatim):
```typescript
 * Honest limits, by design (each is the next package's job, not a bug):
 *  - route.refLineId is set to the route's own id, which resolves to NO
 *    entry in refs.json — live/tracks.ts skips the route with a
 *    console.warn, and routeMapView returns null on the unknown asset, so
 *    the route exists structurally but is not yet raceable or drawable.
 *    Building a real reference line from the reference ride's recorded
 *    track is explicitly deferred; faking one would be worse than none.
 *  - route.referenceRideId records the ride-1-as-reference designation
 *    (COLD-START §3 step 9: "ride 1 IS the reference by default").
 *    Deriving that ride into the route's first scored all-purple lap needs
 *    the reference line + sector gates above, so it is deferred with them.
```
After:
```typescript
 * Honest limits, by design:
 *  - route.refLineId is set to the route's own id. Since the save-flow
 *    package (OPEN-ITEMS item 3) the CALLER builds and persists a real
 *    reference line under that id (live/userRefs.ts) whenever it can; when
 *    it cannot, the id resolves to nothing and every consumer degrades as
 *    before (tracks.ts warns + skips; routeMapView draws no user routes
 *    either way — they have no RouteAsset).
 *  - route.referenceRideId records the ride-1-as-reference designation
 *    (COLD-START §3 step 9). Deriving that ride into the route's first
 *    scored all-purple lap is STILL deferred — a later package.
```

3c. `buildWayCreationCatalog` doc, **lines 198–206**. Before (verbatim):
```typescript
/**
 * The user catalog with the named way merged in: userCat (this phone's
 * additions, catalogStore.userCatalog()) plus the draft's new landmark(s)
 * carrying the rider's names, one Way, one Route (referenceRideId = the ride
 * just finished), and the provisional start/finish gate set at 1%/99% of the
 * ridden length (the settled start/end-gate default; STATE.md ground rules).
 * Feed the result to saveUserCatalog(), which validates the MERGE before
 * accepting. Names are trimmed here; the caller enforces non-empty.
 */
```
After:
```typescript
/**
 * The user catalog with the named way merged in: userCat (this phone's
 * additions, catalogStore.userCatalog()) plus the draft's new landmark(s)
 * carrying the rider's names, one Way, one Route (referenceRideId = the ride
 * just finished), and its v1 gate set — `seed.chainageM` (the 5-gate
 * gateSeeding.ts proposal on the built reference line) when given, else the
 * provisional 1%/99% start/finish pair on the ridden length. Both carry
 * origin:'geometric' (R&S §3 honesty clause: a starting grid, not measured
 * placement). Feed the result to saveUserCatalog(), which validates the
 * MERGE before accepting. Names are trimmed here; the caller enforces
 * non-empty.
 */
```

3d. Signature, **lines 207–211**. Before (verbatim):
```typescript
export function buildWayCreationCatalog(
  userCat: Catalog,
  draft: WayCreationDraft,
  names: { start: string; end: string },
): Catalog {
```
After:
```typescript
export function buildWayCreationCatalog(
  userCat: Catalog,
  draft: WayCreationDraft,
  names: { start: string; end: string },
  seed?: { chainageM: number[] },
): Catalog {
```

3e. The gate-set literal, **lines 237–243**. Before (verbatim):
```typescript
  const gateSet: GateSet = {
    routeId,
    version: 1,
    chainageM: [0.01 * draft.trackLengthM, 0.99 * draft.trackLengthM],
    createdAtMs: draft.startedAtMs,
    note: 'provisional: start/finish gates only — sector gates are the next work package',
  };
```
After:
```typescript
  const gateSet: GateSet = seed
    ? {
        routeId,
        version: 1,
        chainageM: seed.chainageM,
        createdAtMs: draft.startedAtMs,
        origin: 'geometric',
        note:
          'seeded: start/finish at 1%/99%, sectors at 25/50/75% of the reference line, ' +
          "nudged clear of the reference ride's own stops — a proposal, not measured placement",
      }
    : {
        routeId,
        version: 1,
        chainageM: [0.01 * draft.trackLengthM, 0.99 * draft.trackLengthM],
        createdAtMs: draft.startedAtMs,
        origin: 'geometric',
        note: 'provisional: start/finish gates only — no reference line could be built from this ride',
      };
```
(The fallback note keeps the leading word `provisional` — `waycreation_suite.ts`
line 136 asserts `note.includes('provisional')` and must keep passing.)

## Edit 4 — NEW FILE `app/src/ui/gateAdjustModel.ts`

Create with exactly this content:
```typescript
/**
 * Pure rules for the save-flow gate-adjustment card (OPEN-ITEMS item 3,
 * Part B; SETUP-UX §4 "select, then nudge" — cited, not redesigned).
 * Headless-testable, same discipline as routeMapMath.ts / towerModel.ts.
 */

export const NUDGE_SMALL_M = 10;
export const NUDGE_LARGE_M = 50;
/** Same sanity floor as gateSeeding.ts — a nudge can never push two gates
 * closer than this. */
export const MIN_GATE_GAP_M = 50;

/** SETUP-UX §4: middle gates (G1..G3) adjust freely; START/FINISH are locked
 * (their unlock + laps-cost dialog is B-20 machinery, deliberately unbuilt
 * here — the ends simply do not select). */
export function isAdjustable(index: number, nGates: number): boolean {
  return index > 0 && index < nGates - 1;
}

export function gateName(index: number, nGates: number): string {
  if (index === 0) return 'START';
  if (index === nGates - 1) return 'FINISH';
  return `G${index}`;
}

/** The gate's new chainage after a nudge, clamped to stay MIN_GATE_GAP_M
 * clear of both neighbours (and on the line). Locked gates return their
 * current chainage unchanged. */
export function clampNudge(
  chainageM: readonly number[],
  index: number,
  deltaM: number,
  refLengthM: number,
  minGapM = MIN_GATE_GAP_M,
): number {
  if (!isAdjustable(index, chainageM.length)) return chainageM[index];
  const lo = chainageM[index - 1] + minGapM;
  const hi = Math.min(chainageM[index + 1] - minGapM, refLengthM);
  return Math.min(Math.max(chainageM[index] + deltaM, lo), hi);
}

/** "1842" -> "1 842 m" — the always-visible chainage readout (SETUP-UX §4:
 * never under the thumb, so it must stay short and fixed-position). */
export function fmtChainage(m: number): string {
  const v = String(Math.round(m)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v} m`;
}
```

## Edit 5 — NEW FILE `app/src/ui/gateAdjustCard.tsx`

Create with exactly this content:
```tsx
/**
 * Save-flow gate-adjustment card (OPEN-ITEMS item 3, Part B). SETUP-UX §4,
 * cited not redesigned: tap a gate -> it enlarges; a glove-sized
 * `−50 −10 │ 1 842 m │ +10 +50` nudge pad sits in the bottom third of the
 * card, the chainage number always visible and never under the thumb.
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase after CREATE WAY saved a route
 * whose gates were seeded (gateSeeding.ts). Dumb UI: owns only selection and
 * the working chainage list; RecordScreen owns persistence (KEEP = nothing,
 * SAVE with moved gates = a v2 gate set via addGateSet). No map: a
 * user-created route has no RouteAsset yet (routeMapView renders bundled
 * assets only) — §4's map-mirror joins when user routes become drawable.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius } from './theme';
import { useTheme } from './themeContext';
import {
  NUDGE_LARGE_M, NUDGE_SMALL_M, clampNudge, fmtChainage, gateName, isAdjustable,
} from './gateAdjustModel';

export interface GateAdjustCardProps {
  refLengthM: number;
  initialChainageM: number[];
  busy: boolean;
  onKeep: () => void;
  onSave: (chainageM: number[]) => void;
}

export function GateAdjustCard(props: GateAdjustCardProps) {
  const { t } = useTheme();
  const [chainageM, setChainageM] = useState<number[]>(props.initialChainageM);
  const [selected, setSelected] = useState<number | null>(null);
  const n = chainageM.length;
  const dirty = chainageM.some((v, i) => Math.abs(v - props.initialChainageM[i]) > 1e-6);

  const nudge = (deltaM: number) => {
    if (selected === null) return;
    setChainageM((prev) =>
      prev.map((v, i) =>
        i === selected ? clampNudge(prev, selected, deltaM, props.refLengthM) : v,
      ),
    );
  };

  const pad = (label: string, deltaM: number) => (
    <Pressable
      key={label}
      style={[st.padBtn, { borderColor: t.cardBorder }]}
      disabled={props.busy}
      onPress={() => nudge(deltaM)}
    >
      <Text style={[st.padText, { color: t.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>Sector gates — proposed</Text>
      <Text style={[st.sub, { color: t.textDim }]}>
        Seeded at 25/50/75% of your ride, nudged clear of where you stopped. A
        proposal, not a benchmark — tap a gate to nudge it, or keep it and refine
        after a few rides.
      </Text>

      <View style={st.bar}>
        <View style={[st.barLine, { backgroundColor: t.cardBorder }]} />
        {chainageM.map((c, i) => {
          const adjustable = isAdjustable(i, n);
          const sel = selected === i;
          return (
            <Pressable
              key={i}
              disabled={!adjustable || props.busy}
              onPress={() => setSelected(sel ? null : i)}
              style={[st.tickHit, { left: `${(c / props.refLengthM) * 100}%` }]}
            >
              <View
                style={[
                  st.tick,
                  { backgroundColor: adjustable ? t.accent : t.textDim },
                  sel && st.tickSelected,
                ]}
              />
              <Text style={[st.tickLabel, { color: sel ? t.text : t.textDim }]}>
                {gateName(i, n)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null ? (
        <View style={st.padRow}>
          {pad(`−${NUDGE_LARGE_M}`, -NUDGE_LARGE_M)}
          {pad(`−${NUDGE_SMALL_M}`, -NUDGE_SMALL_M)}
          <Text style={[st.chainage, { color: t.text }]}>{fmtChainage(chainageM[selected])}</Text>
          {pad(`+${NUDGE_SMALL_M}`, NUDGE_SMALL_M)}
          {pad(`+${NUDGE_LARGE_M}`, NUDGE_LARGE_M)}
        </View>
      ) : (
        <Text style={[st.hint, { color: t.textDim }]}>tap G1–G3 to nudge a gate</Text>
      )}

      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, props.busy && st.dim]}
        disabled={props.busy}
        onPress={() => (dirty ? props.onSave(chainageM) : props.onKeep())}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>
          {dirty ? 'SAVE GATES' : 'KEEP GATES'}
        </Text>
      </Pressable>
      {dirty ? (
        <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onKeep}>
          <Text style={[st.skipText, { color: t.textDim }]}>discard nudges — keep the proposal</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginBottom: 6 },
  bar: { height: 58, marginTop: 10, marginHorizontal: 8 },
  barLine: { position: 'absolute', left: 0, right: 0, top: 14, height: 2 },
  tickHit: { position: 'absolute', top: 0, width: 44, marginLeft: -22, alignItems: 'center' },
  tick: { width: 4, height: 30, borderRadius: 2 },
  tickSelected: { width: 8, height: 38, borderRadius: 3 },
  tickLabel: { fontSize: 10, letterSpacing: 1, marginTop: 3 },
  padRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  padBtn: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 12, paddingVertical: 12, minWidth: 52, alignItems: 'center' },
  padText: { fontSize: 15, fontWeight: '700' },
  chainage: { fontSize: 16, fontWeight: '700', minWidth: 86, textAlign: 'center', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 4 },
  saveBtn: { marginTop: 14, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
```
(`left` as a percentage string on an absolutely-positioned child is valid React
Native; the −22 px `marginLeft` centres the 44 px hit target on the tick. Keep the
`left: \`${(c / props.refLengthM) * 100}%\`` expression exactly as written — RN's
types accept template percent strings for `left`. If tsc rejects it anyway, STOP and
report; do not improvise a cast.)

## Edit 6 — `app/src/ui/RecordScreen.tsx` (wiring; anchors are POST-PART-A literals)

6a. Imports. Part A added, after the `decodeRideFile` import:
```typescript
import { buildRefFromRideFixes, saveUserRef } from '../live/userRefs';
```
Directly below that line, add:
```typescript
import { seedGateChainages } from '../store/gateSeeding';
import { GateAdjustCard } from './gateAdjustCard';
```
And extend the existing catalog-helpers import (locate with
`grep -n "freeRideRouteIds, landmarkAt" app/src/ui/RecordScreen.tsx` — line 53 on
HEAD `3c738fa`). Before:
```typescript
import { freeRideRouteIds, landmarkAt } from '../store/catalog';
```
After:
```typescript
import { addGateSet, freeRideRouteIds, landmarkAt } from '../store/catalog';
```

6b. A module-level type. Directly below the `existingLandmarkLabel` function (ends
`?? r.landmarkId;` then `}` — line 88 on HEAD), insert:
```typescript

/** What the gate-adjust step carries between CREATE WAY and its own save. */
interface GateAdjustDraft {
  routeId: string;
  refLengthM: number;
  chainageM: number[];
}
```

6c. State. Locate (`grep -n "namingRef.current = naming" app/src/ui/RecordScreen.tsx`);
directly below that line, insert:
```typescript
  // OPEN-ITEMS item 3 (Part B): the seeded-gates adjustment step, shown by
  // 'ending' after a CREATE WAY whose reference line + gate seed were built
  // (naming is cleared first — the two cards are never up together). Its
  // exit handlers are what start the reversed mark then.
  const [adjust, setAdjust] = useState<GateAdjustDraft | null>(null);
  const adjustRef = useRef<GateAdjustDraft | null>(null);
  adjustRef.current = adjust;
```

6d. `onNamingSave` — replace the post-Part-A body. Before (verbatim, as Part A
edit 5c left it):
```typescript
      const fixes = await readRideFixes(draft.rideId);
      const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;
      const built = buildWayCreationCatalog(userCatalog(), draft, names);
```
After:
```typescript
      const fixes = await readRideFixes(draft.rideId);
      const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;
      // Part B: with a real reference line, the v1 gate set is born fully
      // seeded (5 gates, 4 sectors, snapped clear of the ride's own stops).
      const seed = builtRef
        ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM) }
        : undefined;
      const built = buildWayCreationCatalog(userCatalog(), draft, names, seed);
```
And further down in the same try block, before (verbatim, as Part A left it):
```typescript
      setNaming(null);
      setShowAnim('rev');
```
(the occurrence INSIDE `onNamingSave`, directly after the `if (builtRef) { ... }`
persist block — NOT the ones in `onNamingSkip` or elsewhere.) After:
```typescript
      setNaming(null);
      if (builtRef && seed) {
        // SETUP-UX §4: offer tap-then-nudge before the reversed mark plays;
        // the card's exits (onAdjustKeep/onAdjustSave) start the animation.
        setAdjust({
          routeId: `route:${draft.rideId}`,
          refLengthM: builtRef.ref.length,
          chainageM: seed.chainageM,
        });
      } else {
        setShowAnim('rev');
      }
```

6e. New handlers. Directly below `onNamingSave`'s closing `}, []);` (locate the
`// Discard (Cycle 025, ...` comment that follows it), insert above that comment:
```typescript

  // OPEN-ITEMS item 3 (Part B) — the adjust card's two exits. KEEP costs
  // nothing: the seeded v1 set was already saved by CREATE WAY. SAVE with
  // moved gates mints VERSION 2 through the existing addGateSet ("a gate
  // move mints a new version; history is never deleted" — store/catalog.ts).
  const onAdjustKeep = useCallback(() => {
    setAdjust(null);
    setShowAnim('rev');
  }, []);

  const onAdjustSave = useCallback(async (chainageM: number[]) => {
    const a = adjustRef.current;
    if (!a) return;
    const moved = chainageM.some((v, i) => Math.abs(v - a.chainageM[i]) > 1e-6);
    if (!moved) {
      setAdjust(null);
      setShowAnim('rev');
      return;
    }
    setBusy(true);
    try {
      const errs = await saveUserCatalog(
        addGateSet(userCatalog(), {
          routeId: a.routeId,
          version: 2,
          chainageM,
          createdAtMs: Date.now(),
          origin: 'geometric',
          note: 'adjusted at save (tap-then-nudge) from the seeded proposal',
        }),
      );
      if (errs.length > 0) {
        // refused — surface WHY, keep the card up; KEEP remains available.
        Alert.alert('Could not save the gates', errs.join('\n'));
        return;
      }
      setAdjust(null);
      setShowAnim('rev');
    } catch (e) {
      Alert.alert('Could not save the gates', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);
```

6f. The 'ending' render. Before (verbatim — unshifted by Part A except line
position; locate with `grep -n "WayNamingCard$" -A 8 app/src/ui/RecordScreen.tsx`):
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
After:
```tsx
        {adjust !== null ? (
          <GateAdjustCard
            refLengthM={adjust.refLengthM}
            initialChainageM={adjust.chainageM}
            busy={busy}
            onKeep={onAdjustKeep}
            onSave={onAdjustSave}
          />
        ) : naming !== null ? (
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

## Edit 7 — tests

7a. `app/tests/run.ts`: after the Part-A-added `import './userrefs_suite.ts';` add:
```typescript
import './gateseeding_suite.ts';
```

7b. `app/tests/waycreation_suite.ts` — append 2 tests at end of file (after the loop
test closing at line 150). The suite's existing helpers (`northRide`, `RIDE`,
`emptyCatalog`, `mergeCatalogs`, `validateCatalog`, `draftWayCreation`,
`buildWayCreationCatalog`) are all in scope:
```typescript

test('wayCreation: a seeded build carries the 5-gate set, origin geometric, and validates', () => {
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes: northRide(20) })!;
  const seed = { chainageM: [10, 250, 500, 750, 990] };
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' }, seed);
  const gs = built.gateSets[0];
  assert(gs.chainageM.length === 5, '5 gates = 4 sectors (STATE.md ground rule)');
  assert(gs.chainageM.every((v, i) => v === seed.chainageM[i]), 'seed carried verbatim');
  assert(gs.origin === 'geometric', 'R&S §3 honesty clause: geometric, never silent');
  assert(gs.version === 1 && built.routes[0].gateSetVersion === 1, 'born at v1, no upgrade step');
  const errs = validateCatalog(mergeCatalogs(emptyCatalog(), built));
  assert(errs.length === 0, `seeded build must validate, got: ${errs.join('; ')}`);
});

test('wayCreation: the un-seeded fallback keeps the provisional pair, now flagged geometric', () => {
  const d = draftWayCreation(emptyCatalog(), { ...RIDE, fixes: northRide(20) })!;
  const built = buildWayCreationCatalog(emptyCatalog(), d, { start: 'Home', end: 'Work' });
  const gs = built.gateSets[0];
  assert(gs.chainageM.length === 2, 'no seed => the 1%/99% pair, unchanged');
  assert(gs.origin === 'geometric', 'the fallback pair is geometric too');
  assert(typeof gs.note === 'string' && gs.note.startsWith('provisional'), 'still says what it is');
});
```

7c. NEW FILE `app/tests/gateseeding_suite.ts` — 8 tests, names verbatim; import
`test`/`assert` from `./lib.ts`, seeding exports from
`../src/store/gateSeeding.ts`, adjust exports from `../src/ui/gateAdjustModel.ts`
(pure — safe headless). Use `const near = (a: number, b: number) =>
Math.abs(a - b) < 1e-9;`:

1. `gateSeeding: no stops seeds pure quantiles at 1/25/50/75/99%` — L=4000, stops
   `[]` → `[40, 1000, 2000, 3000, 3960]` (each `near`), strictly increasing.
2. `gateSeeding: a stop on a quantile nudges that gate 150 m clear inside the window`
   — L=4000, stops `[2000]` → gate index 2 is `1850` (search order tries −10 first,
   walks out, first clear candidate is `2000 − 150`); indices 0,1,3,4 unchanged from
   test 1's values.
3. `gateSeeding: a fully blocked window falls back to the exact quantile (R&S §3 step 6)`
   — L=4000, stops at every 100 m from 1600 to 2400 inclusive
   (`[1600,1700,...,2400]`) → gate index 2 is exactly `2000`; indices 1 and 3 are
   `1000`/`3000` (their windows are clear).
4. `gateSeeding: short routes (<600 m) seed pure quantiles, no snapping` — L=500,
   stops `[125]` → `[5, 125, 250, 375, 495]` (each `near`) — the stop is ignored.
5. `gateSeeding: converging snaps revert to pure quantiles and stay strictly increasing`
   — L=700, stops `[175, 350]` → exactly the pure quantiles
   `[7, 175, 350, 525, 693]` (each `near`; dry-run: G1's whole window is blocked so
   it falls back to 175, G2 snaps to 500, the 500→525 gap is 25 < 50 ⇒ revert-all);
   also assert strictly increasing.
6. `gateAdjust: clampNudge moves by ±10/±50 and clamps 50 m off both neighbours` —
   base `[40, 1000, 2000, 3000, 3960]`, refLength 4000:
   `clampNudge(base, 2, +50, 4000) === 2050`; `clampNudge(base, 2, -10, 4000) === 1990`;
   `clampNudge(base, 1, -5000, 4000) === 90` (lo = 40+50);
   `clampNudge(base, 1, +5000, 4000) === 1950` (hi = 2000−50).
7. `gateAdjust: START and FINISH are locked` — same base:
   `isAdjustable(0, 5) === false`, `isAdjustable(4, 5) === false`,
   `clampNudge(base, 0, 500, 4000) === 40`, `clampNudge(base, 4, -500, 4000) === 3960`;
   `isAdjustable(2, 5) === true`.
8. `gateAdjust: gateName maps START/G1/G2/G3/FINISH and fmtChainage groups thousands`
   — `gateName(0,5)==='START'`, `gateName(1,5)==='G1'`, `gateName(3,5)==='G3'`,
   `gateName(4,5)==='FINISH'`; `fmtChainage(1842) === '1 842 m'`,
   `fmtChainage(75) === '75 m'`.

## Mandatory verification (run all, in order; Part A must already be green)

1. `cd app && npx tsc --noEmit` → exit code **0**, no output.
2. `cd app && node --experimental-strip-types tests/run.ts` → final line exactly:
   `302 tests: 299 pass, 0 fail, 3 skip`
3. `grep -c "GateAdjustCard" app/src/ui/RecordScreen.tsx` → `2` (import + JSX).
4. `grep -c "origin: 'geometric'" app/src/store/wayCreation.ts` → `2` (both arms).
5. `grep -c "version: 2" app/src/ui/RecordScreen.tsx` → `1` (only the adjust save).
6. `grep -n "chainageM.length === 2" app/tests/waycreation_suite.ts` → 2 matches
   (the existing line ~132 test and the new fallback test).

If ANY of these differs, stop and report.

## Must not change

- `validateCatalog`, `gateSetFor`, `addGateSet`, `lapsComparable`,
  `sectorsComparable`, `mergeCatalogs` bodies (`store/catalog.ts`).
- The un-seeded fallback's chainage math (`0.01/0.99 × trackLengthM`) and every
  EXISTING assertion in `waycreation_suite.ts` (the fallback note must keep starting
  with `provisional`).
- `wayNamingCard.tsx`, `onNamingSkip`, the naming-offer predicate, the DISCARD flow.
- Part A's `userRefs.ts` behaviour and its suite; `refs.ts`; `App.tsx`.
- `live/engine.ts`, `live/tracks.ts`, `core/` (this brief adds NO core code).
- The seed catalog and its gate sets; `results`/`derive` modules.
- `GateSet.origin` stays OPTIONAL — no schema-version bump, seed decodes unchanged.

## Handoff notes for the coordinator

- **STATE.md ground rule status:** "gates snap away from traffic-signal-controlled
  intersections (≥150 m clear)" is now implemented via a PROXY — the reference ride's
  own ≥20 s stops — not real signal data (none exists in the app). The gate set says
  so itself (`origin: 'geometric'` + note). Suggested OPEN-ITEMS line: "snap against
  real signal/junction data, and re-measure gates once a route has ≥5 clean rides
  (R&S §3's re-measurement mint), both unbuilt — the current snap is single-ride
  stop-proxy only."
- The coordinator's item-3 text says "seeds sector gates at 25/50/75%" — landed as
  **5 gates / 4 sectors** (the tasking's "6 gates" was a miscount; seed catalog
  confirms 5).
- **Deriving the reference ride into the route's first scored all-purple lap is still
  unbuilt** (deliberately — it needs a results-derivation pass, not a save-flow one).
  Keep it visible in OPEN-ITEMS.
- The adjust card has **no map mirror** (user routes have no RouteAsset) — pairs with
  Part A's handoff note about synthesizing runtime route assets; SETUP-UX §4's map
  highlight joins then. Also §4's START/FINISH unlock + "34 laps stop being
  comparable" dialog is NOT built (ends are simply locked).
- Nathan's on-device pass tomorrow should check: the adjust card renders inside the
  'ending' column (both themes), tick tap targets are thumb-sized, the nudge pad is
  reachable one-handed, KEEP → reversed mark → Result still flows, and a nudged save
  shows v2 on ROUTES.
- After B, STATE.md's test line should read **302 tests, 299 pass, 3 skip**.
