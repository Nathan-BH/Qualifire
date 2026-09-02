**Status: DONE. Part 1 (DEMO tab + Result screen) AND Part 2 (RecordScreen live gate-tick colours)
both landed and 2026-09-02, uncommitted to git (device_bash down all session). Ad-hoc request from
Nathan mid-session, not a lettered WP — but overlaps WP-K's scope (sector-coloured-trail phase 2) and
should be cross-referenced there when WP-K is next planned.**

## What Nathan asked (verbatim, DEMO tab second-ride mode, but "same applies for the actual race
ride if its shipped")

1. "The purple for example is really dark on the openmap sector and barely visible while the purple
   used for the sector block is a nice lighter contrast. Let's make sure we match the colours
   properly. Use the same ones from the sector blocks for the openmap overlay."
2. "Also the 4 sectors colour properly but the small portions before and after (between route start
   and gate0 and gate4 and route end) are also yellow, let's colour them grey instead."

## Root causes

1. **Purple mismatch.** `DemoScreen.tsx` built the map's sector-span colours from
   `chipColors(tier, t).text` — for `'purple'` that resolves to `PURPLE_INK` (`#120521`, a near-black
   ink meant only for the text label drawn ON TOP of a purple-filled legend chip), not the tier's
   actual colour (`colors.purple`, `#A667F0`). `ResultScreen.tsx` already had a correct, but
   duplicated, local `SPAN_TIER_COLOUR` map — and its own comment already warned about exactly this
   trap — but `DemoScreen.tsx` (added the same day as WP-O) independently fell into it anyway. No
   single shared source of truth existed for "tier → map-line colour".
2. **Yellow lead-in/lead-out.** `routeMapGeo.ts`'s `sectorSpansFeatureCollection()` never emitted any
   GeoJSON feature at all for the stretch before the first gate or after the last gate — by its own
   doc comment, "they are outside the timed lap and stay the base line colour" — so the permanent
   yellow `route-core` base line always showed through there, with no way to distinguish "genuinely
   never-scorable" from "not yet run" (which legitimately should stay yellow mid-ride).

## Fix (Part 1 — DEMO tab + Result screen)

Full Digest → Fable-Plan → Sonnet-Execute → Fable-Inspect pipeline (6 source files + 1 test file,
real design decisions, well past the chore threshold):

- New exported `tierLineColour(tier)` helper in `app/src/ui/chips.tsx` — single source of truth for
  map-line colour per tier (`purple → colors.purple`, `green → colors.green`,
  `yellow → colors.neutral`, else `null`). Now used by BOTH `DemoScreen.tsx` and `ResultScreen.tsx`
  (whose old local `SPAN_TIER_COLOUR` map was deleted), closing the duplication that caused the bug.
- `sectorSpansFeatureCollection()` gained an optional 3rd `leadColour?` parameter. When truthy it
  appends two extra ALWAYS-coloured features after the 4 real sector features —
  `{sector: 0, lead: 'in', colour: leadColour}` for the lead-in slice, `{sector: gateIdx.length,
  lead: 'out', colour: leadColour}` for the lead-out slice — reusing the exact coordinate-swap/slice
  logic the existing per-sector loop uses. Deliberately does NOT touch the "unearned real sector
  paints transparent → base yellow shows through" mid-ride behaviour, since the lead/lead-out spans
  are permanently non-scorable (never a sector, ever), unlike a real sector that's merely "not yet
  reached".
- `routeMapView.tsx` forwards a new `leadColour?` prop into that call, gated on `sectorColours` also
  being present — so DemoScreen's FIRST RIDE mode (which never passes `sectorColours`) is unaffected.
- Both DemoScreen's SECOND RIDE map and ResultScreen's trace map now pass `leadColour={colors.grey}`
  (`#6f6e6a`, the theme's explicit NO-DATA colour — exactly the right semantic for a permanently
  non-scorable stretch).
- New test appended to `app/tests/routemapgeo_suite.ts` covering the leadColour parameter, absence
  behaviour, and exact coordinate/index correctness against every route in the manifest.

### Verification (Part 1)

Real. The fresh-context Fable inspector staged the whole `app/` tree into the cloud container (since
`device_bash` was down) and actually ran `node --experimental-strip-types tests/run.ts`: **346 tests,
343 pass, 0 fail, 3 skip** (the 3 skips are pre-existing python-parity-oracle skips, unrelated to this
change). Full RN-typed `tsc --noEmit` wasn't possible in the cloud container (no npm registry
access), but the inspector ran `tsc --strict` directly against the pure modules plus a full
`src/`-wide pass with hand-stubbed RN/maplibre/expo types: **0 errors** in any of the 7 touched
files. **Verdict: PASS WITH FINDINGS** (all non-blocking) — see below.

### Findings from Part 1's inspection (non-blocking, but drove Part 2)

1. **The identical `chipColors(tier,t).text`-for-map-colour bug survives on a third surface** —
   `RecordScreen.tsx`'s live-map gate-tick colours (`gateColours` array, ~line 795, fed to
   `<RouteMapView gateColours=…>`). A purple gate tick on the real live RECORD map would render
   near-invisible the same way. Has a wrinkle `tierLineColour()` doesn't cover on its own: `'est'`
   maps to `null` in `tierLineColour`, but the gate-tick context wants a visible dashed-grey for
   `'est'` (matching the chip's own dashed/grey semantic) — needs explicit fallback handling, not a
   blind swap. **This is Part 2, tracked below.**
2. Same `.text`-on-card pattern (unconfirmed severity, no map involved) in `RidesScreen.tsx` lines
   212-216 — expanded ride-sector row text rendered in `chipColors(sec.tier, t).text` directly on the
   card background. Out of scope for this subcycle; flagged for a future look if Nathan wants it.
3-5. Minor test-gap / cosmetic notes only, no action needed (see Part 1's inspection transcript in
   session history if ever needed — not reproduced here to keep this doc short).

## Fix (Part 2 — RecordScreen live gate-tick colours)

Landed as a direct coordinator chore, NOT the full pipeline — once the coordinator spot-checked the
actual code (`RecordScreen.tsx` lines 786-798, `chips.tsx`'s `chipColors()`), the design question the
Part-1 inspection flagged turned out to have a clean, minimal answer, not one needing Plan-tier
judgment: `chipColors(tier, t).text` is ALREADY the correct marker colour for every tier except
`'purple'` — `'est'` already resolves to `colors.grey` (matches the chip's own dashed-grey semantic),
`'neutral'` already resolves to the theme's accent text colour, both correct and unrelated to the
PURPLE_INK trap. So swapping in `tierLineColour()` wholesale (which returns `null` for anything but
purple/green/yellow) would have been a regression, not a fix — confirming the wrinkle Part 1's
inspector flagged was real. The actual fix is a single-line surgical override:

```ts
out.push(tier === 'purple' ? colors.purple : chipColors(tier, t).text);
```

(was `out.push(chipColors(tier, t).text);`). `colors` was already imported in this file (`./theme`,
line 61), so no new import needed. A one-line comment was added above the `gateColours` `useMemo`
explaining why only purple is special-cased here, cross-referencing `chips.tsx`'s `tierLineColour()`.

### Verification (Part 2)

`device_bash` was still down (checked again immediately before this fix — same "Workspace
unavailable" error). Grepped `app/tests/` for any test touching `gateColours` or importing
`RecordScreen.tsx` directly: none exists (`RecordScreen.tsx` imports `react-native`, same reason
`chips.tsx` has no headless coverage — the pure Node test runner can't load it). So there was no
regression risk to a passing suite either way, and no way to add meaningful headless coverage for
this specific line. Change is a 1-line ternary using an already-imported constant, no signature/type
change, no other call site touches `gateColours`. **Nathan should visually confirm** the next time he
records a real (or free) ride: after a sector scores purple, its gate marker on the live map should
be the same bright purple as the sector legend block, not near-black.
