**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Open item:** OPEN-ITEMS.md "Parked" — `rideDetailModel.ts`'s `lineColourFor` duplicates `chips.tsx`'s `tierLineColour` by hand (flagged in the WP-K inspection, 2026-09-04). Size: chore (extract one pure function + one constant into a new module, two import-site changes, no behaviour change).
**Written by:** coordinator directly (Sonnet chat) — the clean fix was already named by the WP-K inspection note ("move `tierLineColour`/`YELLOW_TIER` into a pure `.ts` module, re-export from `chips.tsx`, pass as `paint` everywhere"); re-verified against the real repo below, not copied blind.

## What it is

`app/src/ui/chips.tsx` exports `tierLineColour(tier)` — the single source of truth for what colour a tier paints on a MAP LINE (as opposed to `chipColors(tier, t).text`, which is for a chip's own text and gets purple wrong for a line — see chips.tsx's own doc comment, quoted below). `chips.tsx` is a `.tsx` file (real JSX, React Native components). Node's headless test runner (`--experimental-strip-types`) cannot load `.tsx` files at all — confirmed: every existing `.ts` consumer of `chips.tsx` (`towerModel.ts`, `rideHistoryModel.ts`) only ever did TYPE-only imports (which strip to nothing at runtime and never actually load the module). `app/src/ui/rideDetailModel.ts` is the first PURE `.ts` model that needs the real colour *string* at runtime (not just the type), so instead of touching `chips.tsx`, a local copy (`lineColourFor`) was hand-written to reproduce `tierLineColour` "verbatim" — with a comment explicitly flagging the duplication and asking whoever touches either function to keep them in sync by hand.

## Current state (re-verified 2026-09-04, exact repo)

`app/src/ui/chips.tsx`:
- Line 17: `export const YELLOW_TIER = colors.neutral;` (F1-yellow-as-default-lap-colour rule, see its own doc comment, lines 13-16).
- Lines 36–43:
```typescript
export function tierLineColour(tier: Tier): string | null {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return YELLOW_TIER;
    default: return null;
  }
}
```
- This is documented (lines 18-31) as "the single source of truth for every sector-coloured trail... do not build a local map."

`app/src/ui/rideDetailModel.ts`:
- Lines 15-26: the exact hand-duplication comment, explaining the `.tsx`-cannot-load-headlessly constraint and naming `chips.tsx:36-43` as the source it was copied from.
- Lines 27-34:
```typescript
function lineColourFor(tier: UiTier): string | null {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return colors.neutral; // chips.tsx's YELLOW_TIER = colors.neutral
    default: return null;
  }
}
```
- Line 111: `return storedSectorColours(result, hist, lineColourFor);` — the one call site.
- Note: `UiTier` (rideDetailModel.ts's tier type, imported from `colourModel.ts`) and `Tier` (chips.tsx's tier type) need to be confirmed as structurally identical (both presumably `'none' | 'neutral' | 'yellow' | 'green' | 'purple' | 'est'` — chips.tsx line 12 defines `Tier` this way) before the extracted function can be typed once and used by both call sites without a cast; spot-check `UiTier`'s definition in `colourModel.ts` before writing the extraction.

## The fix

1. Create a new pure `.ts` module, e.g. `app/src/ui/tierColour.ts` (no JSX, safe for headless `--experimental-strip-types`), containing:
   - `export const YELLOW_TIER = colors.neutral;` (moved from chips.tsx)
   - `export function tierLineColour(tier: Tier): string | null { ... }` (moved from chips.tsx, unchanged body) — using whichever `Tier`/`UiTier` type is shared, or re-exporting/aliasing so both chips.tsx and rideDetailModel.ts's existing type imports keep working without a wider refactor.
2. In `chips.tsx`: replace the local `YELLOW_TIER` const and `tierLineColour` function definitions with re-exports from the new module (`export { YELLOW_TIER, tierLineColour } from './tierColour';` or equivalent), so every existing `.tsx` consumer (grep `tierLineColour` and `YELLOW_TIER` usages across `src/` first — check DemoScreen.tsx, ResultScreen.tsx-successor RideDetailScreen.tsx, liveView.tsx, RecordScreen.tsx, tower.tsx for direct imports) keeps working with zero import-path changes.
3. In `rideDetailModel.ts`: delete the hand-duplicated `lineColourFor` function and its comment block (lines 15-34), replace with `import { tierLineColour } from './tierColour.ts';` (or `.ts` extension per this project's import-style convention — check a neighbouring pure-module import in the same file, e.g. `colourModel.ts`'s import style, for the exact extension convention used) and change line 111's call site from `lineColourFor` to `tierLineColour`.
4. Grep the whole `src/` tree for any other hand-duplicated copy of this switch statement before finishing (the OPEN-ITEMS note only named this one instance, but worth a quick check that no third copy exists).

## Acceptance criteria

1. `chips.tsx`'s existing `.tsx` consumers still import `tierLineColour`/`YELLOW_TIER` from `./chips` (or `./chips.tsx`) with no changes needed at their call sites — this is a re-export, not a breaking move.
2. `rideDetailModel.ts` calls the SAME function chips.tsx re-exports — no more hand-kept-in-sync duplicate.
3. Runtime colour output is byte-identical to before (same switch, same colours) — this is a pure refactor, not a behaviour change.

## Verification

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL — this is the proof the new module loads headlessly and rideDetailModel.ts's existing tests (which exercise lineColourFor indirectly via storedSectorColours) still pass unchanged
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```
No new test needed — this is a pure extraction with identical output; existing `rideDetailModel`/`sectorTrailModel`-adjacent tests already cover the colour-mapping behaviour indirectly. If Execute wants extra confidence, a one-line test asserting `tierColour.tierLineColour('purple') === colors.purple` etc. is welcome but not required.

## Stop-on-ambiguity

If any ambiguity or surprise arises during execution, STOP and report back verbatim — never guess, never rule on it. Forward to a fresh Fable Plan pass via the coordinator.

Specifically flag: if `Tier` (chips.tsx) and `UiTier` (colourModel.ts, used by rideDetailModel.ts) turn out NOT to be structurally identical types (e.g. one has a case the other lacks), do not paper over the mismatch with an `as` cast — stop and report the exact discrepancy, since silently widening/narrowing a tier type is exactly the kind of thing that should get a real decision, not a guess.

---
## Inspect findings (2026-09-04, fresh-context Fable pass) — read before executing

**Verdict: PASS WITH FINDINGS — the brief's own open question is now resolved.**

`UiTier` (colourModel.ts, used by rideDetailModel.ts) is confirmed a strict subtype of `Tier` (chips.tsx) — `Tier` simply adds one extra case, `'none'`, that `UiTier` doesn't have. This means the extracted `tierLineColour(tier: Tier): string | null` function accepts a `UiTier` argument with NO cast needed, and is already assignable wherever `RecordScreen.tsx:802`'s existing `SpanPaint`-typed usage expects it (confirmed this compiles today under the current split). **Execute should proceed with the straightforward extraction — the "stop and report the exact discrepancy" clause in this brief's Stop-on-ambiguity section does not apply; there is no discrepancy.**

Also noted (informational only, no action needed): a THIRD switch statement resembling this pattern exists at `RideDetailScreen.tsx:59-67`, but it's a text-colour map (different purpose, different output values), not a duplicate of `tierLineColour` — leave it alone, it's out of scope for this brief.
