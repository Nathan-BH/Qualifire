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

## Design decisions (settled, do not re-open at Execute time)

| Question | Decision | Why |
|---|---|---|
| Current sector cue | Label rendered in `t.text` (normal ink) instead of `t.textDim`; bar stays neutral grey. No accent colour anywhere in the strip. | Accent and the yellow tier are the same hex; with no time text left in the slot, an accent bar would be unreadable from a completed yellow-tier bar. The context line above the clock already names the current sector. |
| Completed time text | Not rendered in the strip. `time` prop stays in the props type and in `StripSlotModel`, is simply ignored by `StripSlot`. | Matches Nathan's mockup; re-adding it reinstates the visual mass being removed. Data model untouched so liveView needs no edit. |
| Bar thickness | 4 (dp), as a named constant `STRIP_BAR_HEIGHT` in chips.tsx | Matches the mockup; one-line to tune on device. |
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

1. Add a module-level constant near the top of the file: `const STRIP_BAR_HEIGHT = 4;` with a
   one-line comment `// F1-style sector bar thickness; tune on device.`
2. Inside `StripSlot`, derive one colour per role:
   - `const coloured = !empty && tier !== 'est' && tier !== 'none';` (i.e. exactly purple /
     green / yellow). If the existing `empty` flag is defined as something other than
     `tier === 'none'`, keep using the existing flag for the neutral case and add the `'est'`
     exclusion alongside it; do not change how `empty` is computed.
   - `const tierColour = c.border;` (from the existing `chipColors(tier, t)` call — keep
     that call, do not modify `chipColors`).
   - `const barColour = coloured ? tierColour : t.race.border;`
   - `const labelColour = coloured ? tierColour : current ? t.text : t.textDim;`
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
- Rendered colour matrix, by `tier` / `current`:
  - `'none'`, not current → label `t.textDim`, bar `t.race.border`
  - `'none'`, current → label `t.text`, bar `t.race.border`
  - `'est'` → label `t.textDim`, bar `t.race.border`
  - `'purple'` / `'green'` / `'yellow'` → label AND bar = `chipColors(tier, t).border`
- No accent token (`t.accent`) is referenced anywhere in `StripSlot`.
- `chipColors()`, `Chip`, and every other export of chips.tsx are byte-for-byte unchanged.
- `cd app && ./node_modules/.bin/tsc --noEmit` exits 0.

### Task 2 — `app/src/ui/liveView.tsx`: verify strip container layout (read-only unless the one named condition holds)

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

Acceptance:
- Four equal-width bars with visible gaps between them fill the strip's width at phone width.
- `liveView.tsx` diff is either empty or exactly the `gap` line.

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
animation on colour change, progressive in-sector fill (needs engine data that does not
exist), changes to `DemoScreen.tsx` / `RecordScreen.tsx`, changes to `theme.ts`.

**If any ambiguity or surprise arises — an anchor that doesn't match the digest, an `empty`
flag computed differently than described, a `paneStyles.strip` shape not covered by Task 2,
a failing test — STOP and report back verbatim. Never guess.**
