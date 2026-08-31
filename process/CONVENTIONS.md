# Conventions — Qualifire (virgin branch)

Rules that keep this cheap, honest and readable. Rewritten 2026-08-31 when the branch cut
away the team-of-named-roles process (Nathan: "we mostly work based on my app comment's
now") and the exhaustive decision/backlog log. What follows is the model-tier pipeline
alone, plus the honesty and file rules worth keeping. History of *why* things are the way
they are, in full, is on `main`'s `product/DECISIONS.md`/`product/BACKLOG.md` if ever needed
— nothing was deleted, just not carried onto this branch.

---

## Model tiers

Thinking is scarce and expensive; execution is plentiful and cheap. Route each kind of
work to the cheapest model that can hold it.

| Tier | Model | Does | Never does |
|---|---|---|---|
| **Digest** | Haiku subagent (Sonnet only where Haiku's read would be unreliable) | Reads the files/state a task needs; produces a condensed, factual, line-anchored digest — exact quotes, line numbers, current behaviour, no design opinion | deciding anything, writing the brief |
| **Plan** | Frontier — dispatched as `model: "fable"` | Reads the digest, does the thinking: designs the fix, writes a self-contained brief. May open a specific file directly to spot-check an anchor the digest leaves ambiguous, or to dry-run the finished brief | broad exploratory reading of its own |
| **Execute** | Sonnet subagent | The edits + tests, from the brief alone | redesign, guessing |
| **Inspect** | Frontier subagent, **fresh context** | Adversarial verification; reruns every check itself | trusting the executor's report; editing |

Binding rules:

- **The brief is the interface.** Models share no memory; tiers connect only through a
  self-contained brief: exact files, exact changes, acceptance criteria, report format.
- **Stop-on-ambiguity.** Every brief carries: *"if any ambiguity or surprise arises, STOP
  and report back — never guess."* An escalation means the brief was underspecified — log
  it, don't resent it. If the coordinator's chat is running on Sonnet, it never rules on an
  executor's escalation itself — it forwards the stop verbatim to a fresh Fable subagent.
- **Derive, never hardcode.** Facts about the repo — counts, names, versions — are derived
  at read time (by Digest, or by Plan's own spot-check), never copied from a stale comment
  or an earlier brief.
- **Fresh-context inspection.** The inspector shares no context with planner or executor.
  An agent reviewing its own work in-context rationalizes; clean context finds what the
  executor sailed past.
- **Plan-tier token diet.** Fable is the most expensive tier per token; its job is the
  thinking, not the reading. Dispatch a Digest subagent first (or fold "digest, then
  decide" into the Fable prompt) rather than pointing Fable at a pile of files to read
  cold. One planning pass on this project cost 320,574 tokens reading files itself before
  this rule existed — don't repeat that.
- **The size threshold.** A subagent costs ~30–80k tokens of overhead before any work
  happens. A chore — under ~10 lines of mechanical change, or answerable by one read — is
  done directly, no subagents.
- **Bookkeeping stays with the coordinator.** Updating `STATE.md`/`OPEN-ITEMS.md`, running
  the verification commands, committing — never the executor's job.
- **The tiers are visible.** Every dispatch is announced as it happens (tier, model,
  one-line mandate); escalations are surfaced verbatim; the task ends with a
  tier/model/tokens/outcome readout table.
- **Mechanics:** dispatch via the Agent tool with `model: "haiku"` / `"sonnet"` / `"fable"`.
  If a stopped subagent can't be continued (no message channel), re-dispatch fresh with the
  amendment plus a note of any partial state already on disk.

## Honesty rules

- **Never log unbuilt work as built.** Label proposals `UNBUILT`.
- **Never invent a fact about the outside world** — GPS accuracy figures, API limits,
  library behaviour — without saying it needs verification. Mark it `[UNVERIFIED]`.
- **Never invent a fact about Nathan's preferences.** Anything not sourced from `STATE.md`
  or a direct read is an assumption — label it `[ASSUMPTION]`.
- **Progress = a checkable artifact.** A file that exists, a test that flipped from FAIL to
  PASS, a change Nathan's actually seen. Not an agent's say-so.

## File ownership

- `IDEAS.md` — Nathan's raw idea log. Never edited by an agent.
- `STATE.md`, `OPEN-ITEMS.md` — kept current by whoever's coordinating a session; rewrite
  freely as work lands, don't let them drift stale.
- Everything else — normal code-review judgment; no standing per-file owner.

## Never delete

Move to `safe_to_delete/` (gitignored) instead of `rm`. This mount also sometimes denies
`rm`/`rmdir` outright on specific files/directories (a Windows-side lock, not a repo rule)
— `mv` works where `rm` doesn't, so reach for it first regardless of the reason.

## Data

Raw ride recordings, once this branch starts recording real rides again, are append-only —
never rewritten in place, never silently migrated. If a schema needs to change, write a
migration, don't mutate history.

## Verification, every time code lands

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```

## Escalating to Nathan

Ask, rather than deciding and moving on, when: it's a matter of taste, not fact; a decision
would be expensive to reverse; the same question has come up twice with no resolution; or
there's genuinely nothing left to do without his input. Otherwise decide and keep moving —
he can always override.

## How work actually starts

Nathan asks in chat — "keep going", "build B-36", a plain description of what he wants.
There's no separate cycle-scheduling ceremony; the model-tier pipeline above *is* the
workflow, dispatched directly against whatever's next in `OPEN-ITEMS.md` or whatever he
just asked for.
