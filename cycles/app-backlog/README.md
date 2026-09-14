# app-backlog — accumulating briefs for the real app

> **Naming note (for Nathan):** this folder is deliberately *not* `virgin-cycle6`. The numbered
> `virgin-cycleN` folders are each one executed body of work; this one is a holding pen that
> fills up with briefs *before* any of them is executed. If you'd rather it be called something
> else (`virgin-cycle6`, `backlog`, `queue`, …), rename it — nothing references the path yet.

## Purpose

A place to collect briefs for small, independent app updates Nathan wants, one file per update.
Briefs land here as they're written; **nothing in this folder gets executed until Nathan says
"there's enough, go execute."** At that point each brief is dispatched individually through the
normal pipeline (Digest → Plan → Execute → Inspect, per `CLAUDE.md`), and its status line below
gets updated.

## Conventions

- One brief per file, `BRIEF-<descriptor>.md`, same shape as the `virgin-cycle5` briefs
  (Rulings → Rules → numbered tasks → Verify, then commit → Report back).
- Briefs here are written from a Digest, not a full read of the code, so each one carries an
  explicit stop-on-ambiguity clause. Expect some to bounce back once an executor actually looks.
- Status values: `backlog` (written, not dispatched) → `executing` → `done <commit>` / `bounced`.

## Briefs

| File | What | Origin | Status |
|---|---|---|---|
| `BRIEF-gates-white.md` | Gate markers on the route map render white instead of a tier/accent colour | `marketing/silent-studio/gates-saving/rounds/v4/FEEDBACK.md`, shipped in marketing cycle 06; Nathan wants the same in the real app | backlog |

## Execution

Deferred. When Nathan gives the go, execute briefs one at a time (separate commits), update the
table above, and record outcomes in `STATE.md` / `OPEN-ITEMS.md` as usual.
