# CLAUDE.md — Qualifire

Orientation for any Claude session working in this repo. Binding.

1. **Read `STATE.md` first.** It is the single source of truth; if a fact appears in two places, `STATE.md` wins.
2. **Every task runs the model-tier protocol (D-039).** `process/CONVENTIONS.md` → "Model tiers": Haiku subagent triages; the main chat model (frontier) reads the code itself and writes a self-contained brief; a Sonnet subagent executes from the brief alone under a stop-on-ambiguity rule; a fresh-context frontier subagent inspects adversarially and reruns every check. Chores under ~10 mechanical lines skip the tiers — subagent overhead (~30–80k tokens) must pay for itself.
3. **Nothing is done because an agent said so.** Progress points at a checkable artifact: a test that failed before and passes after, a file that exists, a decision Nathan ratified.
4. **File ownership is strict** (`process/CONVENTIONS.md`): `IDEAS.md` is Nathan's, never edited; `STATE.md` and `product/DECISIONS.md` are Principal-only; `BACKLOG.md` items are the Product Owner's, Principal sets status only. One writer per file.
5. **Never delete** — move to `safe_to_delete/`. Dates always absolute.
6. **Verification:** `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL) and `npx tsc --noEmit` (clean). Regenerate `demos/mockup.html` in the same pass as any shipped design change.
7. Process details: `process/CYCLE.md`. Cycle records: `cycles/` (Librarian-written, ≤40 lines).
