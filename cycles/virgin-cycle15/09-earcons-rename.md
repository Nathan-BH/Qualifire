# 09 — Rename "Earcons" setting label to "Gate buzz"

**Source (Nathan, verbatim):** "also Earcons is a really bad name for a vibration setting as it is not descriptive and unclear; we can simply call it Gate buzz for example"

**Status:** parked — do not execute until Nathan asks.

**Executor rules:** stop-on-ambiguity; no commit; no delete.

## Goal
Rename the user-facing label of the "Earcons" toggle in Settings to "Gate buzz" (or Nathan's exact preferred wording if he refines it at execution time). This is a display-string-only change.

## Current state (confirmed by direct grep, no subagent needed — this is a mechanical ≤10-line chore)
`app/src/ui/settings.tsx:621`:
```tsx
<Row label="Earcons" hint="A short buzz at each gate crossing." help={help} t={t}>
```
This is the only user-visible occurrence of the word "Earcons" as a setting name. The toggle itself:
```tsx
<Switch on={s.earcons} onToggle={() => set('earcons', !s.earcons)} t={t} />
```
(line 622).

## Decisions
- **Change only the display label**, `"Earcons"` → `"Gate buzz"`, at line 621.
- **Do NOT rename the internal state key** `earcons` (settings.tsx:33 type field, :65 default, :113 `setEarconsEnabled(s.earcons)`, :622 `set('earcons', ...)`) or the imported function `setEarconsEnabled` (`app/src/location`, imported settings.tsx:10). This key is very likely the on-disk settings storage key — renaming it risks a silent settings-migration bug (existing users' saved preference would no longer be read) for zero user-visible benefit. Out of scope.
- The existing hint text "A short buzz at each gate crossing." already describes the feature clearly and doesn't use the word "Earcons" — leave it unchanged unless Nathan says otherwise at execution time.
- The word "earcon"/"earcons" appears elsewhere in the codebase purely as internal/demo terminology (DemoScreen.tsx settings flag usage, preview/data.ts demo copy strings like "🔊 buzz + one soft note", code comments) — none of these are the Settings screen's user-facing toggle name, so they are OUT of scope for this brief.

## Files to touch
- `app/src/ui/settings.tsx` — one line (621): `label="Earcons"` → `label="Gate buzz"`.

## Verification plan
Confirm current test baseline before landing (may have shifted if other parked briefs in this cycle land first). Grep after the change: `grep -n "label=\"Earcons\"" app/src/ui/settings.tsx` should return nothing; `grep -n "Gate buzz" app/src/ui/settings.tsx` should return the one new line. No test should reference the literal string "Earcons" as a rendered label (if one does, e.g. a settings-screen snapshot/text test, update it as part of this brief — check `app/tests/` for any hit on "Earcons" first).

## On-device checklist
Open Settings, confirm the row now reads "Gate buzz" with its switch and hint unchanged, confirm toggling it still works exactly as before (functionality untouched, this is a label-only change).

## Out of scope
- Internal state key/storage key rename.
- Any change to the hint text, sound behavior, or the switch itself.
- Other "earcon" references in demo/preview code.

## What this changes on Nathan's phone
Only the visible name of the Settings row for gate-crossing buzz feedback changes from "Earcons" to "Gate buzz". No behavior change.

## Open questions
None — this is fully specified.
