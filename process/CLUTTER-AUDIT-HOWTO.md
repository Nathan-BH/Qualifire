# Clutter audit — how to re-run it (before launch, and after any big UI cycle)

Nathan, 2026-10-02: "great analysis that should be done some time in the future again before the app
is actually launched." The automated guard (`app/tests/ui_strings_suite.ts`) stops *new* text from
slipping in unnoticed; this human pass judges whether what is *listed* still earns its place.

## When
Before the first public launch; afterwards after any cycle that touched more than one screen.

## How (Haiku Digest, ~20 min, no code changes)
1. Dispatch a Haiku subagent with the prompt below; it reads `app/tests/ui-strings.allow.json`
   first (the complete inventory — no grep needed), then opens each file at the listed strings
   for context.
2. Save its table as `cycles/<current-cycle>/CLUTTER-AUDIT.md`.
3. Nathan answers inline under each table (`*` lines) as in `cycles/virgin-cycle20/CLUTTER-AUDIT.md`.
4. A Fable pass turns the answers into briefs; every removal shrinks the allowlist (stale entries
   fail the suite until removed — that is the checkable artifact).

## The prompt (paste verbatim, fill the cycle name)
> Audit every rider-visible string in the Qualifire app. Start from `app/tests/ui-strings.allow.json`
> (the complete inventory: file, kind, exact text). For each entry open the file, find the string
> and fill one table row per screen section: **Exact text | file:line | context (what element) |
> when shown (state/phase) | how to see it (tap path) | rating** where rating ∈ `likely-clutter`
> (explanatory sub-label, hint restating the obvious, status about internals, banner, sentence
> where a word would do) · `maybe` · `useful`. Rules of thumb from Nathan: rider-facing text is
> minimal; a figure, a number or one word beats a sentence; "the user should not be concerned with
> this" is the default for status lines; warnings belong in the yellow button's sub-label flash,
> never a banner; ` · ` not `—`. Also list any `long: true` or `legacy: true` entries separately.
> Present text as-is, no rewrites. End with totals by rating and by screen. Write the result to
> `cycles/<cycle>/CLUTTER-AUDIT.md`.
