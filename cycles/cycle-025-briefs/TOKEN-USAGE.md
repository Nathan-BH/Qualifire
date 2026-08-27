# Cycle 025 — token usage ledger

**Purpose:** a running record of every tiered dispatch (Haiku/Sonnet/Fable subagent, or a direct
chore by the coordinator) that went into producing and refining the material in this folder —
backfilled below with the full history from the chat session that built it (2026-08-25), and
continued forward by whoever executes a WP during cycle 025 itself. **Additions only** — never
edit or delete an existing row once written, the same append-only discipline as `team/<role>.md`
logs and `product/DECISIONS.md`. If a figure turns out wrong, add a corrected row below it with a
note, don't rewrite history.

**When to add a row:** whenever a subagent (any tier) or a direct coordinator chore does work
that touches this folder's contents, its inputs (the ride-day and notes reviews the briefs were
built from), or an actual WP execution once cycle 025 runs. One row per dispatch, not per WP — a
WP that goes through triage → execute → inspect gets three rows.

**Format for each row:** `date | tier | model | tokens | outcome`. "tokens" is the subagent's own
reported usage, taken from the tool result, never estimated — if no figure is available (e.g. a
resumed agent whose reply didn't carry a usage block), write `unknown`, never a guess (see
`process/CYCLE.md`'s anti-hallucination rule and honesty rules on never inventing a figure).
Ties into `WP-cycle-token-usage-rule.md`'s proposal to make this a standing requirement in
`process/CYCLE.md` — this file is the concrete ledger that proposal would formalize.

## Log

### Phase 1 — 2026-08-25: ride-day reviews for 20260822/23/24

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-25 | Fable — review qualifire-20260822 | fable | 94,565 | `qualifire-20260822-review.md` written, 19,728 B |
| 2026-08-25 | Fable — review qualifire-20260823 | fable | 104,405 | `qualifire-20260823-review.md` written, 21,893 B |
| 2026-08-25 | Fable — review qualifire-20260824 | fable | 101,641 | `qualifire-20260824-review.md` written, 19,223 B |
| 2026-08-25 | Haiku — verify (3 files) | haiku | 30,064 | confirmed all three review files present |

### Phase 2 — 2026-08-25: notes fix + relaunch/crash investigation

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-25 | Fable — redo 20260824 review (corrected notes) | fable | 122,075 | `qualifire-20260824-review.md` rewritten, 22,310 B |
| 2026-08-25 | Fable — crash investigation + proposal | fable | 147,206 | `WP-relaunch-crash-recovery-investigation.md` written, 17,447 B |
| 2026-08-25 | Haiku — verify (2 files) | haiku | 30,167 | both files confirmed on disk |

### Phase 3 — 2026-08-25: 20260825 review, notes2/notes3 reviews, WP synthesis batch 1

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-25 | Fable — review qualifire-20260825 | fable | 109,679 | `qualifire-20260825-review.md` written, 22,748 B |
| 2026-08-25 | Fable — review Nathan's_notes2.md | fable | 104,063 | `Nathan's_notes2_review.md` written, 15,537 B |
| 2026-08-25 | Fable — review Nathan's_notes3.md | fable | 105,112 | `Nathan's_notes3_review.md` written, 20,044 B |
| 2026-08-25 | Fable — synthesize WPs (batch 1) | fable | 171,722 | 9 new WP briefs written to `cycle-025-briefs/` |

### Phase 4 — 2026-08-25: notes4 (added mid-turn), WP synthesis batch 2, and a recovery

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-25 | Fable — review Nathan's_notes4.md | fable | 121,182 | `Nathan's_notes4_review.md` written, 25,319 B |
| 2026-08-25 | Fable — synthesize WPs (batch 2) | fable | 89,320 | 4 new WPs + 1 extended (`WP-route-naming-migration.md`) — self-reported success, but one file (`WP-comparable-variants.md`) had not actually landed |
| 2026-08-25 | Haiku — verify batch 1+2 | haiku | 31,330 | caught the missing file — this is exactly why the check step exists |
| 2026-08-25 | Fable — recovery (same agent, resumed via SendMessage) | fable | unknown (resumed reply carried no usage block) | re-committed the missing file via `device_bash`, independently re-verified with a fresh directory listing |

### Phase 5 — 2026-08-25: Nathan's direct rulings, applied as coordinator chores (no subagent)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-25 | Direct edit (planner) | sonnet | ~4k | `WP-gps-dead-spot-fixture.md` closed — root cause (E40 underpass) recorded, P1/P3 dropped, kept as reference log |
| 2026-08-25 | Direct edit (planner) | sonnet | ~4k | `WP-route-naming-migration.md` — mechanism ruled to Option 1 (display-name only, no raw rewrite), Options 2/3 struck, three naming-content questions still open |
| 2026-08-25 | Direct edit (planner) | sonnet | ~5k | `WP-live-ghost-position.md` — Stage 2 mechanism specified (gate-anchored autopilot ghosts, corrected at every crossing, v1 scoped to clean rides), NEEDS-NATHAN #2 marked RULED |
| 2026-08-25 | Direct (planner) | sonnet | ~1k | `TOKEN-USAGE.md` created (this file, first version) |
| 2026-08-25 | Direct (planner) | sonnet | ~2k | `TOKEN-USAGE.md` backfilled with the full chat history above (this edit) |

### Phase 6 — 2026-08-26: QUESTIONS-FOR-NATHAN reconciliation (Nathan's answers baked into WPs)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-26 | Fable — brief-writer (read QUESTIONS-FOR-NATHAN.md + all cycle-025 WPs) | fable | 129,625 | mapped all 24 questions to 9 WP files; wrote exact-match edit brief for 15 fully-resolved questions (38 edits) plus 6 still-open items |
| 2026-08-26 | Sonnet — executor (apply edits) | sonnet | 119,269 | all 38 edits applied cleanly across 9 WP files; `QUESTIONS-FOR-NATHAN2.md` written for the 6 still-open items; original file marked processed |
| 2026-08-26 | Haiku — verify | haiku | 43,993 | confirmed 38 edits landed, `QUESTIONS-FOR-NATHAN2.md` present, `DECISIONS.md`/`BACKLOG.md`/`STATE.md`/`IDEAS.md` untouched; flagged 1 false positive (line-wrap grep miss on "top priority") |
| 2026-08-26 | Direct check (coordinator) | sonnet | ~1k | re-checked the Haiku false positive with a whitespace-normalized search — confirmed text intact, no corruption |
| 2026-08-26 | Direct (coordinator) | sonnet | ~1k | this `TOKEN-USAGE.md` update |

### Phase 7 — 2026-08-26: QUESTIONS-FOR-NATHAN2 reconciliation (round 2 answers baked into WPs)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-26 | Fable — brief-writer + codebase investigator | fable | 113,651 | resolved all 6 re-asked questions (O1,O2,O4,O5,O6 + O3 already closed), wrote 16-edit brief across 5 WP files; investigated actual app code/config to answer the 3 "owed to you" informational items |
| 2026-08-26 | Sonnet — executor (apply edits) | sonnet | 110,408 | 15/16 edits applied cleanly; 1 applied with a flagged formatting adjustment (old text wasn't on its own line as brief assumed); all 16 verified in place; `QUESTIONS-FOR-NATHAN2.md` marked processed |
| 2026-08-26 | Haiku — verify | haiku | 54,999 | confirmed all 6 content requirements present; false-negative on DECISIONS.md/BACKLOG.md "does not exist" (searched wrong path) |
| 2026-08-26 | Direct check (coordinator) | sonnet | ~1k | re-checked the false-negative directly — both files exist under `product/`, confirmed untouched (mtimes Aug 24, before this pass) |
| 2026-08-26 | Direct (coordinator) | sonnet | ~1k | relayed the 3 owed answers to Nathan in chat; flagged that round-2's MIN_HISTORY abolition amends D-030/D-036 and kills B-35 — needs a Principal/Product-Owner pass, still pending alongside round 1's D-037 amendment |
| 2026-08-26 | Direct (coordinator) | sonnet | ~1k | this `TOKEN-USAGE.md` update |

### Phase 8 — 2026-08-26/27: DECISIONS.md / BACKLOG.md amendment pass (Nathan-authorized, append-only)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-26 | Fable — brief-writer (read product/DECISIONS.md + product/BACKLOG.md + COLD-START.md) | fable | 119,108 | found house convention (bundled D-number + in-place notes; SUPERSEDED -> D-NNN for backlog), located D-030/D-036/D-037/D-008/D-001/D-012 and B-35/B-38/B-42/B-43 verbatim, wrote 18-edit brief |
| 2026-08-26 | Sonnet — executor (apply edits) | sonnet | 136,331 | all 18 edits applied append-only across DECISIONS.md/BACKLOG.md/COLD-START.md; new D-045 entry landed; one anchor-disambiguation call (D-001) and one scope call (B-48 kept OPEN, not superseded) |
| 2026-08-26 | Haiku — verify | haiku | 41,601 | 14/14 content checks pass, all originals intact; 1 false-positive on git status (Nathan's own concurrent notes file, unrelated to this pass) |
| 2026-08-26 | Direct (coordinator) | sonnet | ~1k | resolved the git-status false positive by timestamp comparison; reported D-036's orphaned 5-ride promotion-offer trigger as an open follow-up needing Nathan's attention |
| 2026-08-27 | Direct (coordinator) | sonnet | ~1k | this `TOKEN-USAGE.md` update |

### Phase 9 — 2026-08-27: cycle 025 execution, overnight marathon (stopped early per Nathan's request)

Nathan kicked off an overnight run through the cycle-025 WPs. Per-dispatch token figures for
most of this phase were not captured into the coordinating chat's durable record before a context
compaction partway through the night, so most rows below are marked `unknown` rather than guessed
-- per this file's own rule above, never invent a figure. The one figure available verbatim is the
final Inspect dispatch, read directly from its tool result. Six work packages were fully executed
(triage -> plan -> execute -> inspect -> commit) before Nathan asked to stop the marathon early
(usage limits reset, tokens needed for other work this week) once the in-flight WP finished.

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-27 | Direct chore (coordinator) | sonnet | unknown | `process/CYCLE.md` token-usage standing-requirement edit landed (WP-cycle-token-usage-rule) -- commit `68f6d6d` |
| 2026-08-27 | Haiku/Fable/Sonnet/Fable -- WP-maplibre-frozen-id-crash (triage/plan/execute/inspect) | mixed | unknown | MapLibre frozen-`id` crash fixed (`key={id}` on all 4 GeoJSONSource tags) + regression test; inspected PASS -- commit `035a667` |
| 2026-08-27 | Haiku/Fable/Sonnet/Fable -- WP-relaunch-crash-recovery-investigation P1-P5 (triage/plan/execute/inspect, multiple dispatches) | mixed | unknown | relaunch/crash-recovery hardening: heartbeat, `downS`, `remount` event kind, unified `restoration` predicate, gpx export fixes; inspector found + coordinator fixed an unvalidated-`lockKind`-into-XML advisory; inspected PASS -- commit `85916fd` |
| 2026-08-27 | Haiku/Fable/Sonnet/Fable -- WP-result-ranking-integrity (triage/plan/execute/inspect) | mixed | unknown | D-045 ruling 2 (RESULT/RIDES ranking pool = previous-9 + current) implemented via `WINDOW_PREV`/`rankingPoolFor`/`rankedCountFor`; closed B-117's RIDES-screen half; inspector found + coordinator fixed a cosmetic triple-apostrophe typo; inspected PASS -- commit `e288ec4` |
| 2026-08-27 | Haiku/Fable/Sonnet/Fable -- WP-pause-screen-and-discard-ride (triage/plan/execute/inspect) | mixed | unknown | pause-screen RESUME/END layout fix + new "Discard ride" path (mirrors RidesScreen.onDelete's delete sequence), D-013-compliant (no red UI); inspected PASS -- commit `4345726` |
| 2026-08-27 | Haiku -- WP-route-naming-migration triage | haiku | unknown | routed to plan tier |
| 2026-08-27 | Fable -- WP-route-naming-migration plan (read code, wrote brief) | fable | unknown | `BRIEF-route-naming-migration.md` written: `ROUTE_DISPLAY_ID` overlay design, 3 UI call sites, mockup-mirror obligations, 3 new tests specified |
| 2026-08-27 | Sonnet -- WP-route-naming-migration execute, attempt 1 | sonnet | unknown | failed on a transient classifier-availability error ("claude-sonnet-5[1m] is temporarily unavailable (timed out)"), not a content block -- no code changes made |
| 2026-08-27 | Sonnet -- WP-route-naming-migration execute, attempt 2 (retry, identical brief) | sonnet | unknown | all edits applied per brief; 248 tests (245 pass/0 fail/3 skip), tsc clean; flagged 2 verification-grep discrepancies as likely benign (not fixed, deferred to inspect) |
| 2026-08-27 | Fable -- WP-route-naming-migration inspect (fresh context, adversarial) | fable | 97,903 | **PASS.** Independently verified overlay table, both flagged discrepancies confirmed genuinely benign (React key + map-asset lookup prop, correctly left raw), searched for missed display surfaces (none), confirmed ids-never-change invariant holds, re-ran tests (248: 245 pass/0 fail/3 skip) and tsc (clean) independently, regenerated SVGs byte-identical to checked-in -- commit `9c3e093` |
| 2026-08-27 | Direct (coordinator) | sonnet | ~2k | this `TOKEN-USAGE.md` update, plus final report to Nathan |

**Marathon stopped early per Nathan's explicit instruction** ("Do not continue the marathon
because i need my tokens for other work tasks this week. Just finish the current work package and
report back."), received right as WP-route-naming-migration's execute-tier report came back.
Deferred, untouched this session: WP-sector-coloured-trail, WP-live-ghost-position,
WP-palette-draft-pass, WP-routing-fork-plain-language, WP-whole-app-export-import, the
virgin-cold-start epic, the coordinator STATE.md/DECISIONS.md/BACKLOG.md/cycle-025.md bookkeeping
pass, and WP-stale-first-fix-cleanup.md (never started). All 6 completed WPs tonight are committed
locally on `main`, ahead of `origin/main` -- `git push` was attempted once, failed with `403 from
proxy` (no github.com egress from this shell), and was not retried per Nathan's own instruction to
not retry pushes hard.

### Phase 10 onward — cycle 025 execution continues (append below as it happens)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| _(none yet — resume here for the remaining WPs in a future session)_ | | | | |
