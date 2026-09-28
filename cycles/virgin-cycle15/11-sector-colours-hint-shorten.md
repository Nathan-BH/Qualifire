# 11 — Shorten the "Sector colours" help text

**Source (Nathan, verbatim):** "also in the help icon exlanatory text of Sector colours, shorten it by a lot; just keep the first sentence up to 'earned' and replace 'tier' with colour. So it is easier to understand as paint each stretch of the route line in the colour its sector earned?"

**Status:** parked — do not execute until Nathan asks.

**Executor rules:** stop-on-ambiguity; no commit; no delete.

## Goal
Shorten the "Sector colours" setting's help-icon explanatory text to just its first sentence, with "tier" replaced by "colour".

## Current state (confirmed by direct grep, no subagent needed — mechanical text-only chore)
`app/src/ui/settings.tsx:613-614`:
```tsx
<Row label="Sector colours" t={t} help={help}
     hint="Paint each stretch of the route line in the tier its sector earned — on the live map, in the ride view and on the RIDES list. Purple beats your best, green beats your recent average, yellow is an ordinary lap. Off keeps the whole line yellow.">
```

## Decisions
- New hint text, exactly matching Nathan's own phrasing: `"Paint each stretch of the route line in the colour its sector earned."`
- This drops the second and third sentences entirely ("on the live map, in the ride view and on the RIDES list. Purple beats your best, green beats your recent average, yellow is an ordinary lap. Off keeps the whole line yellow.") — Nathan explicitly asked to keep only "the first sentence up to 'earned'", so the where-it-applies and color-meaning detail is removed, not reworded or relocated. If Nathan wants that detail preserved elsewhere (e.g. in-app documentation), that's a separate future ask, not assumed here.
- "tier" → "colour" is the only word substitution within the kept sentence.

## Files to touch
- `app/src/ui/settings.tsx` — one line (614): the `hint=` string.

## Verification plan
Confirm current test baseline before landing (may shift if other parked cycle15 briefs land first). After the change: `grep -n "Paint each stretch" app/src/ui/settings.tsx` should show only the new shortened sentence, with no trailing "Purple beats..." text. Check `app/tests/` for any test asserting the old full hint string; update if found.

## On-device checklist
Open Settings, tap the help icon next to "Sector colours", confirm the popover/tooltip now shows only: "Paint each stretch of the route line in the colour its sector earned." with no additional sentences.

## Out of scope
- The setting's label ("Sector colours" itself is unchanged).
- The underlying sector-coloring behavior/logic — text only.

## What this changes on Nathan's phone
Only the help-icon explanatory text for "Sector colours" gets shorter and uses "colour" instead of "tier". No behavior change.

## Open questions
None — fully specified.
