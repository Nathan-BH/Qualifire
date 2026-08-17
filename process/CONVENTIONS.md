# Conventions

Rules that keep the team cheap, honest and readable. These are binding on every member.

---

## Token discipline

The cost of this project is dominated by how much each agent reads, not how much it writes.

**Read paths are bounded.** Three tiers, by role:

| Tier | Who | May read |
|---|---|---|
| **Specialist** | Product Owner, Race Engineer, Designer, Mobile Dev, Backend Dev, QA | `STATE.md` + own `team/<role>.md` + **up to two** documents named in the cycle agenda |
| **Coordinator** | Team Principal | `STATE.md`, `product/BACKLOG.md`, `product/DECISIONS.md`, `team/TEAM.md`, both files in `process/`, plus all member reports |
| **Archivist** | Librarian | Anything. It is the only role permitted a full-folder read, because compaction requires it. |

No specialist may read another specialist's file, the `cycles/` folder, or `archive/`. Cross-role information reaches them only via the Principal, through `STATE.md` and the cycle agenda.

**Assumption-checking is delegated, not distributed.** Specialists are not required to read `IDEAS.md` or `DECISIONS.md` to label assumptions. They label anything they cannot source from `STATE.md` or their agenda docs as `[ASSUMPTION]`; the Principal, who does hold `DECISIONS.md`, either confirms it or strikes the label. This keeps the honesty rule from silently costing every member two extra documents per cycle.

**Write deltas, not restatements.** A log entry says what changed. It does not re-summarise the project, re-state the concept, or recap previous entries. If an entry could have been written without doing any work, it should not have been written.

**Prose is expensive; structure is cheap.** Bullets and tables over paragraphs. No preamble, no "as discussed above", no closing summaries.

**The Principal is the bottleneck.** It reads every member's report, so reports are capped (see below). Long member reports are the most likely thing to make this project expensive.

---

## Model tiers (added 2026-08-17, D-039)

Thinking is scarce and expensive; execution is plentiful and cheap. Every task routes each kind of work to the cheapest model that can hold it. Proven on B-44 (cycle 013) before it became a rule.

| Tier | Model | Does | Never does |
|---|---|---|---|
| **Triage** | Haiku subagent | Confirms the task is real and actionable, locates files, yes/no checks | design, edits |
| **Plan** | Frontier — the main chat model (Fable) | Reads the code *itself*, writes the brief | the edits |
| **Execute** | Sonnet subagent | The edits + tests, from the brief alone | redesign, guessing |
| **Inspect** | Frontier subagent, **fresh context** | Adversarial verification; reruns every check itself | trusting the executor's report; editing |

Binding rules:

- **The brief is the interface.** Models share no memory; the tiers connect only through a self-contained brief: exact files, exact changes, acceptance criteria, report format. The executor sees nothing else.
- **Stop-on-ambiguity.** Every brief carries: *"if any ambiguity or surprise arises, STOP and report back — never guess."* An escalation is evidence the brief was underspecified — log it, don't resent it. (Cycle 013: this rule caught a planner error before it shipped.)
- **Derive, never hardcode.** Facts about the repo — counts, names, versions — are derived at execution time, never copied from comments or briefs. (Cycle 013: the brief said 10 Morning seed ghosts; the seed had 9.)
- **Fresh-context inspection.** The inspector shares no context with planner or executor. An agent reviewing its own work in-context rationalizes; one with clean context finds what the executor sailed past.
- **The size threshold.** A subagent costs ~30–80k tokens of overhead before any work happens. A chore — under ~10 lines of mechanical change, or answerable by one read — is done directly by the planner. Tiers pay for themselves on real tasks, not on renames.
- **Bookkeeping stays with the coordinator.** BACKLOG status, STATE.md, the cycle record — never the executor's job, and never skipped.
- **The tiers are visible (Nathan, 2026-08-17).** In an interactive chat, every dispatch is announced as it happens — tier, model, one-line mandate — escalations are surfaced verbatim, and the task ends with a readout table: tier | model | tokens | outcome. Nathan judges the distribution by watching it work, not by trusting a summary. Unattended runs put the same readout in their report.
- **Backlog IDs are for files, not for Nathan (2026-08-17).** When Nathan asks what's pending, translate BACKLOG/STATE into a plain-language menu: for each workable item, one sentence on what it actually means, its rough size, and whether it waits on him. Never assume he remembers what B-NN stands for; he picks from the menu, then the pick runs through the tiers.
- **Mechanics (Cowork):** dispatch via the Agent tool with `model: "haiku"` / `"sonnet"` / `"fable"`. If a stopped subagent can't be continued (no message channel), re-dispatch a fresh one with the amendment plus a note of any partial state already on disk.
- **Coordinator mode (Nathan, 2026-08-17): the chat may run on Sonnet.** Planning and inspection then run as `model: "fable"` subagents; the brief-writer reads the code in its own context. Hard rule: Sonnet never rules on an executor escalation — it forwards the stop verbatim to a Fable subagent (accepting the ~30–80k-token dispatch cost) or ends the task and reports. Design-heavy or ambiguous sessions (product forks, unratified rulings) still run in a Fable chat, where escalations are resolved in-context for free.

---

## Output contract for member reports

Every member returns exactly this to the Principal. Under 15 lines.

```
ROLE: <role name>
DELTA: <what I worked out this cycle, 1-3 bullets>
PROPOSALS: <concrete suggestions, each labelled UNBUILT>
NEEDS: <what I need from another role or from Nathan; "nothing" is a valid answer>
CONFIDENCE: high | medium | low — and why, in one clause
```

`CONFIDENCE: low` is a respected answer. A member that says "I don't have enough to go on" is more useful than one that invents.

---

## Running logs

Each `team/<role>.md` ends with a `## Log` section. Entries are append-only:

```
### Cycle NNN — YYYY-MM-DD
- <delta bullet>
- <delta bullet>
```

Cap: a role file stays under ~120 lines. When it exceeds that, the Librarian compacts the oldest entries into a single summarised block and moves the detail to `archive/`. **Compaction is the one exception to single-writer ownership** — the Librarian may rewrite any role file's `## Log`, but only to summarise existing entries, never to add content.

**Exempt from the cap:** `IDEAS.md` (Nathan's raw record, append-only, never edited) and `product/DECISIONS.md` (permanent). Both grow without limit by design. Neither is on any specialist's read path, so their growth costs nothing per cycle — only the Principal reads `DECISIONS.md`, and only Nathan and the Product Owner read `IDEAS.md`.

---

## Honesty rules

- **Never log unbuilt work as built.** Label proposals `UNBUILT`.
- **Never invent a fact about the outside world** — GPS accuracy figures, API limits, library behaviour — without saying it needs verification. Mark it `[UNVERIFIED]`.
- **Never invent a fact about Nathan's preferences.** Anything a member cannot source from its own read path is an assumption. Label it `[ASSUMPTION]` and let the Principal adjudicate.
- **Disagreement is logged, not smoothed over.** If two roles conflict, the Principal records both positions and the reason for the call.

---

## File ownership

| File | Written by | Note |
|---|---|---|
| `IDEAS.md` | Nathan only | Claude transcribes; agents never edit |
| `STATE.md` | Team Principal only | Rewritten each cycle, not appended |
| `product/DECISIONS.md` | Team Principal only | Append-only |
| `product/CONCEPT.md` | Product Owner | Principal may reject, not edit |
| `product/BACKLOG.md` | Product Owner | Owns content and IDs. The Principal sets **status** fields only — it may mark an item `IN CYCLE` or `DONE`, never add, reword or reorder items. |
| `team/<role>.md` `## Log` | That role only | Librarian may compact (summarise-only) |
| `cycles/`, `archive/` | Librarian only | Principal supplies the agenda as part of its handoff; the Librarian writes the file |

One writer per file. This is what prevents two agents overwriting each other's truth. Where a second role needs to touch a file, its permission is narrow and named above.

---

## Naming

- Cycle files: `cycles/cycle-001.md`, zero-padded to 3. Log headings match: `### Cycle 001 — YYYY-MM-DD`. The one exception is the pre-cycle scaffold entry, headed `### Setup — YYYY-MM-DD`, which exists once per role file and is never repeated.
- Decisions: `D-001`, sequential, never renumbered, never deleted — superseded ones marked `SUPERSEDED by D-NNN`.
- Backlog items: `B-01`, zero-padded to 2.
- Dates always absolute (`2026-08-14`), never "yesterday" or "last cycle".
- Cross-references cite the file and the exact heading text, not a `§` shorthand.

---

## Data & deletion

- Ride data lives in `data/` (`activities/` + `activity-index.csv` + original ZIP). GPX files are renamed copies; the ZIP is the untouched source of truth for raw data.
- **No agent deletes files.** Anything to be removed is moved to `safe_to_delete/`, which Nathan empties periodically.
- **User-testable HTML goes in `demos/`** (D-020) — one folder for everything Nathan opens in a browser.

---

## Prototype vs. implementation vs. on-device (added 2026-08-16, after a real miss)

Three tiers exist and they are NOT the same thing. Every claim about "what the app does" must say which tier it means:

1. **Prototype** — `demos/*.html`. A design, not the app. Nothing here runs on the phone.
2. **In the codebase** — TypeScript under `app/src/`. May still be unwired: today `src/store/` and `src/ui/routeMapMath.ts` compile and are tested but no screen imports them.
3. **On device** — and even here, two different things: the **dev client** runs whatever JS is on the PC (Fast Refresh, no build needed), while a **preview/standalone APK freezes the JS at build time**.

**Rule before any build:** state explicitly what the build will change on the phone and what it will not. Build 3 (2026-08-16) delivered native modules and a standalone APK, but shipped no visible change — because the five-tab design existed only as `demos/mockup.html`. Nathan installed it expecting the new design and found the old three-tab app. The build was not wasted; the *framing* was wrong.

**Consequence for sequencing:** design work lands in the codebase first and is judged on the dev client via Fast Refresh, which costs no builds. A preview build is baked only once a design is settled.

## The mockup tracks the app, always (added 2026-08-17)

`demos/mockup.html` is regenerated from `data/analysis/mockup_template.html` by `07_build_mockup.py`. **Whenever a shipped design changes, the mockup changes in the same pass** — Nathan uses it to try things quickly, and a mockup that shows an older design is worse than none, because it silently disagrees with the phone.

Cycle 009 examples: the six-tab horizontally scrolling footer, the demo tab reduced to a single demo ride, and the colour-model row becoming a fixed statement once D-030 settled it.

If a design decision makes the mockup *ahead* of the app instead (a prototype), say so explicitly — see the prototype / in-codebase / on-device section above.
