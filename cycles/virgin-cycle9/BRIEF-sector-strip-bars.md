# BRIEF — Sector strip: boxes → thin F1-style bars (cycle 9)

**Coordinator's note on anchors:** this brief was planned by a Fable Plan pass reading only
a Haiku digest of the code (the repo was not mounted in the planning container) — every line
number below is the digest's, as of commit `54aae2d`. Execute must confirm each anchor
against the real file before editing and STOP (per the closing clause) if any doesn't match.

## Summary

Replace the four 68×56 outlined/filled "box" slots under the live lap clock with a lighter
treatment: an "S1".."S4" label above a thin horizontal bar, one pair per sector. Both label
and bar are neutral grey until that sector is completed with a real earned tier, at which
point both take the tier colour (purple / green / yellow). The current sector is cued only
by brightening its label. Per-sector time text is no longer rendered in the strip. This is a
presentational change confined to `StripSlot` and its styles in `app/src/ui/chips.tsx`. The
`StripSlotModel` contract in `app/src/ui/liveView.tsx` is unchanged; `RecordScreen.tsx` and
`DemoScreen.tsx` need no edits (they consume the shared `LiveSectorPane`, per liveView's hard
rule §3.8 comment).

Out of scope, do not touch: map/route-line colouring (already handled by the
`settings.sectorColours` default flip in `54aae2d`), `chipColors()` itself (shared with other
chips), tier hex values in `theme.ts`, anything engine-side, any test file.

**Revision note (2026-09-16):** Nathan answered every question in `QUESTIONSFORNATHAN.md`
before this was executed. Three of his answers change what was originally planned — see the
updated design-decisions table below, which supersedes the first draft: (1) there is now NO
current-sector cue of any kind in the strip (he doesn't want it — the existing
`contextLabel` line above the clock, e.g. 'S3', already names the current sector and needs
no change); (2) the bar should ship a bit thicker than the mockup's literal 4px on the first
try, and the strip's overall width/proportions relative to the rest of the screen deserve a
sanity check, not a literal copy of hand-drawn mockup pixels; (3) completed-sector time
staying off the strip is confirmed — the existing gate-flash over the clock
(`liveView.tsx`'s `BigChipModel`/flash, unchanged by this brief) already shows each
completed sector's time for ~2.5s, which is enough for him; (4) discrete colour-flip on
completion is confirmed as the end state, not a stepping stone — no progressive-fill
follow-up wanted.

## Design decisions (settled, do not re-open at Execute time)

| Question | Decision | Why |
|---|---|---|
| Current sector cue | **NONE.** The current sector renders IDENTICALLY to a not-yet-reached sector: dim label (`t.textDim`), grey bar (`t.race.border`). The `current` prop is still accepted by `StripSlot` (for signature compatibility with `StripSlotModel.current`) but no longer changes styling at all. | Nathan (QUESTIONSFORNATHAN.md Q3): explicitly does not want a cue here, even the brightened-label default originally proposed — the `contextLabel` line above the clock (`LiveViewModel.contextLabel`, e.g. 'S3') already names the current sector and is unchanged by this brief; a second cue in the strip is unwanted distraction. |
| Completed time text | Not rendered in the strip. `time` prop stays in the props type and in `StripSlotModel`, is simply ignored by `StripSlot`. | Matches Nathan's mockup, confirmed (Q2): the existing gate-flash over the clock already shows each completed sector's time for ~2.5s — that's enough, no new display needed. Data model untouched so liveView needs no edit. |
| Bar thickness | `STRIP_BAR_HEIGHT = 6` (dp) — bumped up from the mockup's literal 4px — as a named constant in chips.tsx, easy to retune. | Nathan (Q1): "if you already think 4px is too small, ship it a bit bigger on the first try" — he drew the mockup freehand with no proportion consideration, so treat its raw pixel values as illustrative, not a spec. |
| Overall strip width/proportions | Slots stay `flex: 1` inside whatever container `paneStyles.strip` already uses — i.e. inherit the same horizontal inset the rest of the live pane uses, not a new hardcoded margin. Execute should eyeball the rendered result against the rest of the screen (map card edges, pause bar) and flag in its report if it looks off, rather than guess a fix. | Nathan (Q1): "think about how wide each bar should be and what the total strip width is in relation to the other UI elements" — a real rendered check, not something Plan can verify without the device. |
| Neutral grey | Bar: `t.race.border` (today's "not yet reached" outline colour). Label: `t.textDim` (today's empty-slot label colour). | Reuse the existing tokens; no new grey. |
| Tier colour source | `chipColors(tier, t).border` for BOTH bar fill and label colour when tier is purple/green/yellow. | `.border` is the tier hue itself for all three tiers; `.text` for purple is `PURPLE_INK` (dark, for on-fill contrast) and would be invisible on the dark background. |
| `'est'` tier (estimated, no verdict) | Treated as neutral: grey bar, dim label. The "~" suffix already in the label carries the meaning. | An estimate has no earned tier, so it earns no colour. |
| Interrupted (`'S{i} ‖'` label with a real tier) | Coloured like any completed sector; the "‖" suffix in the label is preserved as-is. | Label text is untouched by this brief. |
| Slot width | `flex: 1` with a small horizontal gap between slots, replacing fixed `width: 68`. | Bars should span the strip like the mockup (~81w on a 390 screen). |

## Tasks

### Task 1 — `app/src/ui/chips.tsx`: restyle `StripSlot`

Anchor: the `StripSlot` component, digest lines ~116–136 (the component that renders
`slotText` and, when `props.time` is present, `slotTime`, inside a `View` styled
`styles.slot` with `borderColor: current ? t.accent : empty ? t.race.border : c.border` and
`backgroundColor: c.bg`).

1. Add a module-level constant near the top of the file: `const STRIP_BAR_HEIGHT = 6;` with a
   one-line comment `// F1-style sector bar thickness (Nathan: a bit bigger than the first
   // sketch's 4px) -- tune further on device if it still reads thin.`
2. Inside `StripSlot`, derive one colour per role:
   - `const coloured = !empty && tier !== 'est' && tier !== 'none';` (i.e. exactly purple /
     green / yellow). If the existing `empty` flag is defined as something other than
     `tier === 'none'`, keep using the existing flag for the neutral case and add the `'est'`
     exclusion alongside it; do not change how `empty` is computed.
   - `const tierColour = c.border;` (from the existing `chipColors(tier, t)` call — keep
     that call, do not modify `chipColors`).
   - `const barColour = coloured ? tierColour : t.race.border;`
   - `const labelColour = coloured ? tierColour : t.textDim;`
   - **`current` is NOT used in either colour derivation** (revised per Nathan, Q3 — see
     the design-decisions table). The `current` prop stays in `StripSlot`'s signature
     (still passed in from `liveView.tsx` unchanged) but has zero effect on rendering.
3. Replace the rendered tree with: outer `View style={styles.slot}` → `Text
   style={[styles.slotText, { color: labelColour }]}` (label unchanged) → `View
   style={[styles.slotBar, { backgroundColor: barColour }]}`.
   - Remove the `slotTime` render branch entirely. Do NOT remove `time` from the props type.
   - Remove `borderColor` / `backgroundColor` from the outer `View` (the outer view is now
     unstyled apart from layout).
   - If the current tree also sets `borderStyle: 'dashed'` (or similar) for `'est'`, drop it;
     `'est'` is neutral now.
4. In `makeChipStyles` (digest ~lines 187–195), replace the `slot` style with layout only:
   `{ flex: 1, alignItems: 'center', gap: 4 }` — no `width`, `height`, `borderRadius`,
   `borderWidth`. Add `slotBar: { alignSelf: 'stretch', height: STRIP_BAR_HEIGHT, borderRadius:
   STRIP_BAR_HEIGHT / 2 }`. Leave `slotText` as is (fontSize 14 / weight 700); drop its
   explicit `color` if one is set there, since colour is now passed inline.
5. `slotTime` style: grep the repo for other usages. If `slotTime` is referenced only by the
   removed branch in `StripSlot`, delete the style entry. If it is referenced anywhere else,
   leave it and note that in the report.
6. Update the component's doc comment (if any) to describe the new look in one or two lines:
   label + thin bar, grey until completed with an earned tier, current sector = bright label.

Acceptance:
- `StripSlot` renders no border, no background box, no time text, regardless of props.
- Rendered colour matrix, by `tier` (the `current` prop has NO visible effect, whatever its
  value):
  - `'none'` → label `t.textDim`, bar `t.race.border` (whether or not `current` is true)
  - `'est'` → label `t.textDim`, bar `t.race.border`
  - `'purple'` / `'green'` / `'yellow'` → label AND bar = `chipColors(tier, t).border`
- No accent token (`t.accent`) or `t.text` (the "brightened" ink) is referenced anywhere in
  `StripSlot` for the current-sector case — confirm the current sector is visually
  indistinguishable from a not-yet-reached sector.
- `chipColors()`, `Chip`, and every other export of chips.tsx are byte-for-byte unchanged.
- `cd app && ./node_modules/.bin/tsc --noEmit` exits 0.

### Task 2 — `app/src/ui/liveView.tsx` / rendered result: verify strip container layout and overall proportions (read-only unless the one named condition holds)

Anchor: `paneStyles.strip`, the style applied to the `<View style={paneStyles.strip}>` that
maps `vm.strip` to `<StripSlot …/>` (digest ~lines 302–304), and the `StripSlotModel`
interface (~lines 89–95) plus its construction in `viewModelFromEngine()` (~lines 162–180).

1. Do NOT edit `StripSlotModel` or `viewModelFromEngine()`.
2. Read `paneStyles.strip`. It must lay the four slots out in a row with horizontal spacing
   so that `flex: 1` slots become four equal-width bars separated by a gap. Exactly one
   permitted edit: if `paneStyles.strip` has `flexDirection: 'row'` but no `gap` (and no
   equivalent spacing such as `justifyContent: 'space-between'` with fixed-width children —
   which no longer applies since slots are now `flex: 1`), add `gap: 10`. Any other change
   needed here is out of brief → STOP and report.
3. If `paneStyles.strip` (or a wrapper) has a fixed `height` sized to the old 56-tall boxes,
   report it verbatim and STOP; do not change it. (Expected: no fixed height, the pane
   reflows. Confirm.)

4. Separately (Nathan, Q1): once rendered (a screenshot on a simulator/device is fine, no
   need for a real ride), sanity-check the strip's left/right edges against the rest of the
   live screen — does it line up with the map card's inset, the pause bar's inset, etc., the
   same way the OLD box strip did? This is an observation, not a mandate to redesign the
   pane: if it already lines up (most likely, since the container/padding isn't part of this
   brief's changes), say so in the report. If it visibly doesn't, report exactly what you see
   and STOP rather than guess a new margin — that's a real layout call, not a mechanical one.

Acceptance:
- Four equal-width bars with visible gaps between them fill the strip's width at phone width.
- `liveView.tsx` diff is either empty or exactly the `gap` line.
- The Execute report states explicitly whether the strip's horizontal inset visually matches
  the rest of the screen's content (map card / pause bar), per step 4.

### Task 3 — Verification

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.
3. If any test fails: do NOT edit the test. Report the test file, test name and assertion
   verbatim and STOP. Expected candidates (unknown until run — the digest listed test files
   referencing `StripSlot`/`liveView` but none appeared to snapshot box dimensions): a test
   asserting that a completed slot renders its `time` string, or asserting on
   `borderColor`/`backgroundColor`/`width: 68`. Either would be an expected consequence of
   this brief, but the call to update the test belongs to a fresh Fable, not to Execute.
4. Report: the full diff of chips.tsx and (if any) liveView.tsx, the test summary line, tsc
   exit code, and the `slotTime` grep result from Task 1 step 5.

Not in scope, do not do: `accessibilityLabel` on the slot (candidate for a follow-up), any
animation on colour change, progressive in-sector fill (Nathan confirmed, Q4: discrete
flip-on-completion is the intended END STATE, not a stepping stone — do not build toward
progressive fill), any current-sector visual cue of any kind (Q3 — confirmed none wanted),
changes to `DemoScreen.tsx` / `RecordScreen.tsx`, changes to `theme.ts`.

**If any ambiguity or surprise arises — an anchor that doesn't match the digest, an `empty`
flag computed differently than described, a `paneStyles.strip` shape not covered by Task 2,
a failing test — STOP and report back verbatim. Never guess.**
