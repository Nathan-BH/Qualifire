# CLAUDE.md — Qualifire (virgin branch)

Orientation for any Claude session working in this repo. Binding.

1. **Read `STATE.md` first.** It's the single source of truth: current status, what's
   settled about how the app behaves, and what's actually still open. If a fact appears
   in two places, `STATE.md` wins.
2. **Every real task runs the model-tier pipeline:** a Haiku **Digest** subagent reads
   files and condenses them into a factual, line-anchored digest; the frontier model
   (**Plan**, dispatched as `model: "fable"`) reads that digest — not raw files — and does
   the thinking: designs the fix, writes a self-contained brief. A Sonnet **Execute**
   subagent implements the brief alone under a stop-on-ambiguity rule (any anchor
   mismatch or undecided call → stop and report verbatim, never guess, never rule on it
   from the coordinator's chat — forward it to a fresh Fable). A fresh-context Fable
   **Inspect** pass adversarially reruns every check before anything's called done.
   Chores under ~10 mechanical lines skip the pipeline — subagent overhead
   (~30–80k tokens) has to pay for itself. **Narrate every dispatch in chat** (tier,
   model, one-line mandate) and end with a tier/model/tokens/outcome readout table.
3. **Nothing is done because an agent said so.** Progress points at a checkable
   artifact: a test that failed before and passes after, a file that exists, a change
   Nathan has actually seen.
4. **File ownership:** `IDEAS.md` is Nathan's, never edited by an agent. `STATE.md` and
   `OPEN-ITEMS.md` are the coordinator's to rewrite as work lands — no other file needs
   a standing owner now that there's no team of named roles.
5. **Never delete.** Move to `safe_to_delete/` (gitignored) instead — this mount also
   sometimes denies outright `rm`/`rmdir` on specific files/dirs (Windows-side locks);
   `mv` works where `rm` doesn't, so prefer it.
6. **Verification:** `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL)
   and `cd app && ./node_modules/.bin/tsc --noEmit` (clean, exit 0; avoid bare `npx tsc`
   on this mount — the resolution overhead alone can blow a 45s call budget).
7. **Git on this mount:** `device_bash` commands should run with `GIT_OPTIONAL_LOCKS=0`.
   A stray `.git/index.lock` or `.git/HEAD.lock` sometimes survives a git call that
   otherwise succeeded — `mv` it aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
   never delete it. Real git writes (add/commit) do go through despite the warning noise.
8. Process details, honesty rules, and the full model-tier explanation:
   `process/CONVENTIONS.md`.
