# The Work Cycle

How the virtual team makes progress between Nathan's check-ins.

---

## Cadence

**Set by D-003: on demand only.** No schedule. Cycles run when Nathan asks. (`product/DECISIONS.md` is authoritative; this section explains the reasoning.)

Reasoning: a cycle is only worth running if something has changed since the last one. At 5-minute intervals nothing has — the team would re-read its own output and generate churn that *looks* like progress while costing tokens linearly in the number of runs. Design thinking needs something new to react to: a decision from Nathan, a completed piece of work, or a real result.

Sensible options, in increasing cost:

| Cadence | Good for | Cost | Status |
|---|---|---|---|
| On demand (Nathan triggers) | Deliberate bursts of work | Lowest | **CURRENT (D-003)** |
| Daily | Steady progress, one meaningful step per day | Moderate | needs a decision superseding D-003 |
| Twice daily | Active build phases with real code landing | High | needs a decision superseding D-003 |

Anything on a schedule requires superseding D-003, not just turning on a scheduler. The bar: cycles consistently ending with "more to do, nothing blocking us, and real artifacts landing".

---

## Cycle anatomy

Each cycle has four phases. **Model assignment is fixed by D-039** (`CONVENTIONS.md` → Model tiers): the Principal's phases (1, 3) run on the frontier model in the main chat; members in phase 2 run as executor-tier subagents — Sonnet for real work, Haiku for pure checks — each on a self-contained brief with the stop-on-ambiguity rule; phase 4 is Haiku-tier; anything that lands code additionally gets a fresh-context frontier inspection before the Meeting accepts it.

### 1. Brief (Team Principal)
Reads within its coordinator read path (`CONVENTIONS.md` → Token discipline). Picks **one to three** focus questions from `BACKLOG.md` — no more. Names which members run and which document each may read. If there is nothing worth working on, the Principal **ends the cycle immediately** and says so. A skipped cycle is a valid, cheap outcome.

### 2. Work (members, in parallel)
Only members named in the agenda run. Each one:
- reads `STATE.md` + its own `team/<role>.md` + up to two agenda-named docs
- does its thinking within its remit
- appends a **delta** to its own running log — what changed, not a restatement
- returns a short structured report to the Principal (see output contract in `CONVENTIONS.md`)

Members do **not** read each other's files. Cross-role information flows only through the Principal and `STATE.md`.

### 3. Meeting (Team Principal)
Collects the reports. Its job is to:
- resolve contradictions between members, explicitly
- reject anything not grounded in checkable reality
- decide what is now **settled** → append to `product/DECISIONS.md`
- decide what is still open → set status fields in `product/BACKLOG.md` (status only; the Product Owner owns the items themselves)
- rewrite `STATE.md` to reflect the new truth
- regenerate NATHAN-STATUS.md — the plain-language twin of STATE.md (CONVENTIONS.md → "Nathan-facing docs")
- flag anything that genuinely needs Nathan

### 4. Record (Librarian)
Receives the agenda and outcomes from the Principal and writes `cycles/cycle-NNN.md`: agenda, decisions made, open items, one-line-per-member summary. Target under 40 lines. Then prunes: once a cycle file is older than the last 5, it gets compacted into `archive/`.

**Every cycle summary carries a token-usage section** (added 2026-08-27, per Nathan's 2026-08-23 ask): planning tier-by-tier, execution per-WP, combined total. Work with no figure — coordinator-direct chores, continuation runs relayed to an already-running executor — is listed as "no figure exists", never estimated or invented.

---

## The anti-hallucination rule

An agent will happily write "implemented the sector algorithm" into its log when it has implemented nothing. This is the single biggest failure mode of an autonomous team.

Therefore every claim of progress must be one of:

- **A file that exists** — name it, and it must be openable.
- **A decision** — recorded in `DECISIONS.md` with a date.
- **A proposal** — explicitly labelled as unbuilt.

Anything else the Principal rejects. Members write proposals; only Nathan's approval or a real artifact converts a proposal into progress.

---

## Escalation to Nathan

The Principal raises something to Nathan when, and only when:

- two members disagree and the choice is a matter of taste, not fact
- a decision would be expensive to reverse (stack choice, data model, core mechanic)
- the team has been going in circles on the same question for two cycles
- there is nothing left to do without his input

Otherwise the team decides and records it. Nathan can override any decision at any time; that is cheaper than asking him about everything.

---

## How a cycle is actually triggered

Three mechanisms, in increasing autonomy.

### 1. Ask in chat (start here)
Nathan says *"run a cycle"*, or *"run a cycle on the colour model"*. Claude acts as Team Principal: reads `STATE.md` + `BACKLOG.md`, sets the agenda, and **spawns the named members as subagents in a single parallel batch**. They run simultaneously, each with only its own read path. Their reports come back to the Principal, who runs the meeting and writes the files.

This is the recommended default. It costs nothing when idle, and Nathan sees the outcome immediately.

### 2. Named-member runs
*"Get the Race Engineer and Designer to fight out the colour tiers."* Same machinery, agenda set by Nathan instead of the Principal. Useful when he already knows what he wants worked on.

### 3. Scheduled — *not currently in use*
A scheduled task carrying a fixed prompt: *act as Team Principal, run one cycle per `process/CYCLE.md`, escalate only per the escalation triggers.* Available, but switched off by D-003. Turning it on means superseding that decision.

**Parallelism is real.** Members are independent by construction — they never read each other's files, so there is no ordering dependency between them and they can all run at once. The Principal is the only serial step, and it runs twice: once to brief, once to meet. That shape is what makes a cycle cheap.

**One constraint worth knowing:** a subagent returns only its final message to the Principal. That is why the output contract in `CONVENTIONS.md` is a fixed 15-line block — it is the entire bandwidth between a member and the rest of the team.

---

## Reporting to Nathan

When Nathan asks "where are we?", the answer is assembled from `STATE.md` plus the last cycle file. Nothing else needs reading. That is the whole point of the structure.
