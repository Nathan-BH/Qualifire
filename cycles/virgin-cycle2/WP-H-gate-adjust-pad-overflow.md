**Status: SUPERSEDED — folded into WP-J-gate-adjust-card-redesign.md (2026-09-04). Do not execute this brief separately; see WP-J instead.**
**Open item:** OPEN-ITEMS.md "Parked" — "WP-I gate-adjust pad: button labels may overflow on a narrow phone" + the paired taste question about button sizing. Size: chore (style-only).
**Written by:** coordinator directly (Sonnet chat) — OPEN-ITEMS.md already names a specific suggested fix from the original WP-I inspection; re-verified against the real repo below.

## What it is

`OPEN-ITEMS.md`'s exact wording: "The 4-button pad's labels grew from `−10`/`−50` to `−0.1%`/`−1%`; RN rows don't wrap by default, so the row may spill past the card border on a ~360px-wide phone. Suggested fix: `padBtn: { flex: 1, minWidth: 0 }` or similar. Also worth checking: Nathan's wording ('two buttons are big … the smaller ones') may want the ±1% pair visibly larger, not just labelled differently — all four are currently the same size. Needs an on-device look."

Recall Nathan's own Q2 answer (`cycles/virgin-cycle1/QUESTIONS-FOR-NATHAN2.md`, already landed as WP-I): "lets have two + and two -buttons. Two buttons are big and move the gate +-1% of the ride. The smaller ones move it 0.1% of the ride." — so the INTENT was always for the ±1% pair to read as visually bigger/more prominent than the ±0.1% pair, not just differently labelled. WP-I landed the 4-button behaviour but not the size differentiation, and separately the row has no overflow protection on a narrow phone.

## Current state (re-verified 2026-09-04, exact repo)

`app/src/ui/gateAdjustCard.tsx`:
- Line 82 (button render): `style={[st.padBtn, { borderColor: t.cardBorder }]}`
- Line 86 (label render): `<Text style={[st.padText, { color: t.text }]}>{label}</Text>`
- Line 147: `<View style={st.padRow}>` — the row containing all 4 buttons.
- Style definitions (`StyleSheet.create`, near end of file):
```typescript
padRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
padBtn: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 12, paddingVertical: 12, minWidth: 52, alignItems: 'center' },
padText: { fontSize: 15, fontWeight: '700' },
```
`padRow` is `flexDirection: 'row'` with no `flexWrap`; `padBtn` has a fixed `minWidth: 52` and no `flex`/`maxWidth`/`flexShrink` — on a narrow viewport, 4 fixed-minimum-width buttons plus `gap: 8` plus horizontal padding can exceed the available row width with nothing to shrink, causing overflow past the card border (matches the filed concern exactly). All 4 buttons currently share one `padBtn` style — no size distinction between the ±1% pair and the ±0.1% pair.

Confirm at execute time how the 4 buttons are ordered/labelled in the JSX around line 147 (which two are "−1%/+1%" vs "−0.1%/+0.1%", and their left-to-right order) before applying a size distinction, so the bigger buttons land on the ones Nathan actually meant.

## The fix

Two independent, additive style changes to the same `StyleSheet.create` block (no logic changes):

1. **Overflow fix.** Give `padBtn` the ability to shrink instead of a hard floor: change `minWidth: 52` to allow flexible sizing, e.g. `padBtn: { ..., flex: 1, minWidth: 0 }` (per OPEN-ITEMS' own suggested fix) so all 4 buttons share the row's width proportionally and never spill past the card border, regardless of screen width. Verify visually (or via a snapshot/dimension check if this project has one — check `tests/` for any existing layout-dimension test pattern before assuming none exists) that button text doesn't get clipped at typical narrow widths once `flex: 1` is applied — if `−0.1%` text doesn't fit in an even 1/4 share at 320-360px, consider a smaller `fontSize` on `padText` or `paddingHorizontal` reduction as a secondary adjustment, but keep the change minimal.

2. **Size distinction for the ±1% pair.** Split `padBtn` into two variants (e.g. `padBtnBig`/`padBtnSmall`, or a `big?: boolean` prop on the button-rendering sub-component if one exists at line ~82) so the ±1% buttons render visibly larger (more `paddingVertical`/`paddingHorizontal`, or a larger `padText` `fontSize` for their label) than the ±0.1% pair — matching Nathan's original wording ("two buttons are big... the smaller ones move it 0.1%"). Keep both variants using `flex` so the overflow fix from (1) still applies (e.g. `flex: 1.3` for big vs `flex: 0.7` for small, or similar — exact ratio is a judgment call, keep it visually clear but not extreme).

## Acceptance criteria

1. On a ~360px-wide viewport, all 4 pad buttons render fully within the card's border, no clipping or overflow — this is the primary, previously-filed bug.
2. The two ±1% buttons are visibly larger than the two ±0.1% buttons (matches Nathan's stated intent from his WP-I answer).
3. Tapping each button still fires the same nudge amount as before (1%/0.1% of route length) — this brief changes ONLY styling, never the nudge-amount logic (`nudgeDeltaM` or equivalent, untouched).

## Verification

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL — this is a style-only change, should not affect any existing test
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```
No new automated test expected (pure RN style values aren't meaningfully unit-testable here) — this genuinely needs Nathan's on-device visual confirmation on his actual phone width, exactly as OPEN-ITEMS.md already flags ("needs an on-device look"). Note this plainly in the execution report rather than claiming visual correctness from code alone.

## Stop-on-ambiguity

If any ambiguity or surprise arises during execution, STOP and report back verbatim — never guess, never rule on it. Forward to a fresh Fable Plan pass via the coordinator.

Specifically flag: if `gateAdjustCard.tsx`'s button-rendering code near line 82 turns out to already be a shared sub-component used for all 4 buttons with no easy per-button variant hook, the "size distinction" half (item 2) may need a slightly bigger structural change than a pure style tweak — if so, still apply the overflow fix (item 1) regardless, and report the size-distinction constraint back rather than forcing an awkward change.
