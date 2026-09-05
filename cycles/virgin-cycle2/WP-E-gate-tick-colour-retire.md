**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Open item:** OPEN-ITEMS.md "Parked" — live gate ticks still recolour by tier (`gateColours`). Size: chore (~1 line functional change + a dead-code removal).
**Written by:** coordinator directly (Sonnet chat) — well-specified by a prior inspection note + Nathan's own stated rule, no Plan-tier design judgment needed; re-verified against the real repo before writing (see below), not copied blind from OPEN-ITEMS.md.

## What it is

`STATE.md`'s ground rules: "Adjustment UI is tap-then-nudge..." and, more directly, Nathan's own standing rule (quoted in `OPEN-ITEMS.md`, from the WP-K inspection note): **"gates should not change colour."** Now that sector-coloured trail spans exist everywhere (WP-K, landed 2026-09-04) and carry the "how did I do on this stretch" signal on the segment BETWEEN gates, the live map's gate *ticks themselves* still separately recolour by the tier the sector they end just earned — a second, redundant colour-coding of the same information, on the marker rather than the span, which is exactly what Nathan's rule says not to do.

## Current state (re-verified 2026-09-04, exact repo)

`app/src/ui/RecordScreen.tsx`:
- Lines 769–787: a `useMemo` computing `gateColours`, a `(string | null)[]` — one entry per gate, `null` for the start marker and any not-yet-`'done'` sector, otherwise the tier's colour (`colors.purple` for purple, else `chipColors(tier, t).text`).
- Line 1041: `gateColours={gateColours}` passed to `<RouteMapView>`.

`gateColours` has exactly one producer (RecordScreen.tsx's `useMemo` above) and is consumed at exactly two render rungs, both in `app/src/ui/routeMapView.tsx`:
- Line 475 (MapLibre rung): `gateTicksFeatureCollection(asset, props.gateColours)` — feeds `props.gateColours` through to `app/src/ui/routeMapGeo.ts`'s `gateTicksFeatureCollection` (lines 66–74) and `allGatesFeatureCollection`'s sibling (lines 334–360), both of which use `gateColours?.[i] ?? null` per gate, falling back to `null` (neutral/no-colour rendering) when the array or entry is absent.
- Lines 878–895 (PNG-basemap fallback rung, `gateTickPx` tick bars): `const col = props.gateColours?.[i] ?? null; ... backgroundColor: col ?? CASING` — same fallback shape, falls back to `CASING` (near-black casing colour) when absent.

Both rungs already have a clean, pre-existing fallback for "no colour supplied" — nothing needs to change in `routeMapView.tsx`, `routeMapGeo.ts`, or the PNG rung. `gateColours` is used NOWHERE else in the codebase (`grep -rn "gateColours" src/` returns only the 6 lines above plus one unrelated comment in `sectorTrailModel.ts:70` that just references the naming convention, not the prop itself).

## The fix

Two options, pick the cleaner one at execute time (both are correct and equally small):

**Option 1 (minimal, matches Nathan's own "one-line" estimate):** at `RecordScreen.tsx` line 1041, change
```
gateColours={gateColours}
```
to
```
gateColours={undefined}
```
and delete the now-dead `gateColours` `useMemo` (lines 769–787) plus its two immediately-preceding standalone comment blocks (lines ~760–768, ~769-776 — the ones explaining the purple-marker-colour-override reasoning) since nothing reads the memo's result anymore. Also check whether `tierOf` (used inside the memo) has any other caller in the same file before deleting it — if `tierOf` is used elsewhere, keep it and delete only the `gateColours` memo + its dedicated comments.

**Option 2 (equivalent, slightly larger diff):** delete the `gateColours` prop entirely from `RouteMapView`'s prop interface (`routeMapView.tsx` line 197) and both its two consuming sites (line 475, lines 878–895), replacing each with the same `null`/`CASING` fallback unconditionally. Prefer Option 1 unless Execute finds a reason `gateColours` as a prop is still worth keeping for some other in-progress or planned caller (grep first — as of this brief, there is none).

Either way, the net visible effect: gate ticks on the live map always render in their neutral/casing colour, never tier-coloured — matching Nathan's rule and removing the redundant signal now that sector spans carry it.

## Acceptance criteria

1. Live map (RecordScreen, recording in progress, on a known/matched route with at least one scored sector) — gate ticks render in their neutral colour (MapLibre rung: whatever `gateTicksFeatureCollection` renders with a `null`/absent colour array; PNG rung: `CASING`), never purple/green/yellow, regardless of how the sector between two gates scored.
2. Sector-coloured trail spans (WP-K) are untouched — they still carry the tier colour on the segment, unaffected by this change.
3. No other screen (RideDetailScreen, DemoScreen, RoutesScreen) is affected — `gateColours` was only ever wired from RecordScreen's live map.

## Verification

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```
No new test strictly required (this removes a rendering signal, not logic with edge cases) — but if any existing test asserts on `gateColours` being passed/populated (grep `tests/` for `gateColours` before editing), update or remove that assertion to match the new behaviour rather than leaving a stale expectation.

## Stop-on-ambiguity

If any ambiguity or surprise arises during execution, STOP and report back verbatim — never guess, never rule on it. Forward to a fresh Fable Plan pass via the coordinator.

Specifically flag: if `tierOf` (used inside the doomed `gateColours` memo) turns out to have another live caller in `RecordScreen.tsx` that this brief's author didn't spot, don't delete it — just remove the `gateColours` memo and its prop wiring, leave `tierOf` alone.

---
## Inspect findings (2026-09-04, fresh-context Fable pass) — read before executing

**Verdict: PASS WITH FINDINGS — one correction to apply.**

1. Confirmed via a fresh `grep -rn "gateColours" src/ tests/`: `gateColours` genuinely has no other consumer anywhere in the codebase. Safe to remove as this brief describes.
2. `tierOf` (used inside the doomed `gateColours` memo) DOES have a second caller, at `RecordScreen.tsx:1065` — per this brief's own stop-on-ambiguity clause, **keep `tierOf`**, delete only the `gateColours` memo itself.
3. **Correction to the deletion range in "The fix" → Option 1:** delete lines **769-787 only**. The originally-suggested "~760-768" range is wrong — it would also delete an UNRELATED comment (the gate-buzz `NOTE` at lines ~765-767, about where the gate buzzer fires) that has nothing to do with `gateColours` and must stay. Execute should re-read the current file at execution time to confirm the exact boundaries before deleting (line numbers may have shifted further since this Inspect pass), but the rule is: delete the `gateColours` `useMemo` and its OWN directly-preceding comment block only, not the earlier gate-buzz note.
