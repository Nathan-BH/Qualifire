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

### Phase 10 — 2026-08-27 to 30: work between coordinator sessions (Nathan + other tooling)

Between this coordinator's Phase 9 report and this Phase 10 entry (roughly 3 days), commits
`0b4ba39` through `ac8777a` landed on `main` outside this coordinator's direct knowledge --
`0b4ba39` (route naming updates, matching `BRIEF-record-variant-display.md`'s work>>station
Alt/Std overlay) and `126a177` (`cycle025: EAS Update OTA setup`, matching
`BRIEF-eas-update-setup.md`) both follow the D-039 commit convention, so were very likely done
via this same protocol in a separate session not covered by this ledger. `1b6fe3c` ("route
update") applied `BRIEF-eveninga-map-line.md`'s fix (confirmed: test count 252->249/0/3 exactly
matches that brief's final predicted state). The remaining commits (`e23cfef` build6,
`00c864e`/`2dd24f1` publish-preview scripts, `ff130a1` troubleshooting, `576e245`/`63d50fd`/
`ac8777a` chatgpt design experiments) are Nathan's own manual work, outside subagent dispatch
and outside this ledger's scope. No token figures available for any of Phase 10's first stretch
-- none of it was dispatched or observed by this coordinator.

### Phase 11 — 2026-08-30: marathon resumed (Sunday evening, budget-bounded), stopped on Fable exhaustion

Nathan resumed the marathon with an explicit budget ceiling: "10% fable usage left and 16% all
models left this week... continue with all the work packages until usage limits is used"
(resets Monday 05:00). Before dispatching anything, the coordinator discovered and reconciled
Phase 10's untracked history (above) rather than assuming stale context. Given the scarcity of
fable specifically (the Plan and Inspect tiers' required model), the coordinator made two
efficiency calls not used in Phase 9: (a) skipped a separate Haiku triage dispatch for each WP,
since the coordinator's own review of every remaining WP's NEEDS-NATHAN section already
confirmed each was unblocked and ready for planning; (b) wrote the routing-fork WP's plain-
language document directly as a coordinator chore rather than a Fable dispatch, since the WP's
own text was already the complete draft (pure translation, no code-reading required).

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-30 | Direct (coordinator, no dispatch) | sonnet | ~3k | `ROUTING-FORK-FOR-NATHAN.md` written directly (WP-routing-fork-plain-language) -- commit `aede4a0` |
| 2026-08-30 | Fable -- WP-sector-coloured-trail P1 plan (read code, wrote brief) | fable | 167,624 | `BRIEF-sector-coloured-trail-p1.md` written: sector-span line-colouring on the Result/VIEW TRACE map only (Phase 2 live-map deferred, needs on-device verification this pipeline can't do) |
| 2026-08-30 | Sonnet -- WP-sector-coloured-trail P1 execute | sonnet | 80,528 | all edits applied per brief; 255 tests (252 pass/0 fail/3 skip), tsc clean; 1 flagged discrepancy (unexpected-but-benign CRLF git warning) |
| 2026-08-30 | Fable -- WP-sector-coloured-trail P1 inspect (fresh context, adversarial) | fable | 84,107 | **PASS.** Boundary-math traced by hand on all 20 routes (no gaps/overlaps/off-by-one), colour palette confirmed canonical, scope discipline confirmed, CRLF warning confirmed pre-existing/benign; caught one thing the executor missed -- an untracked ride-data folder that must not be swept into the commit -- commit `f9ba39c` |
| 2026-08-30 | Fable -- WP-stale-first-fix-cleanup P1-P4 plan (read code, wrote brief) | fable | 207,755 | `BRIEF-stale-first-fix-cleanup.md` written (981 lines): additive preStart/warmup fix-flagging (D-023-safe), threaded through outage/stop/distance/firstFixDelayS/matcher-anchoring, new accuracy+gap-filtered max-speed figure, elevationOutliers omit-when-empty confirmed already intentional |
| 2026-08-30 | Sonnet -- WP-stale-first-fix-cleanup execute | sonnet | 116,091 | all edits applied per brief exactly; 264 tests (261 pass/0 fail/3 skip), tsc clean; explicit D-023 guard self-check passed (unflagged fix's encoded line byte-identical to before) |
| 2026-08-30 | Fable -- WP-stale-first-fix-cleanup inspect (fresh context, adversarial) | fable | 83,793 (partial -- did not complete) | **DID NOT FINISH.** Cut off mid-inspection by the API: "You've reached your Fable 5 limit." Got through source-diff verification (confirmed matches brief) before being terminated; no verdict was rendered. Marathon stopped here per plan (continue until usage limits hit) -- Fable is now unusable for the rest of this week (resets Monday 05:00), so neither Plan nor Inspect tier can run again this session. Work committed anyway (`dca0f92`) as tested-but-uninspected, explicitly flagged as not done per D-039 until inspected -- preserving real, tsc-clean, test-passing work rather than leaving it uncommitted against the risk of Nathan's own concurrent manual commits on this repo. |
| 2026-08-30 | Direct (coordinator) | sonnet | ~3k | this `TOKEN-USAGE.md` update, plus final report to Nathan |

**Marathon stopped on hard Fable exhaustion, exactly as anticipated going in.** Two WPs landed
fully done and inspected (`aede4a0` doc, `f9ba39c` sector-trail P1). One WP (`dca0f92`,
stale-first-fix-cleanup) is committed, tested, and tsc-clean, but genuinely NOT inspected --
top priority for the first Fable dispatch of the next session, ahead of any new work. Untouched
this session: WP-live-ghost-position, WP-palette-draft-pass, WP-whole-app-export-import,
WP-virgin-cold-start-epic (deliberately last per its own text), and the coordinator
STATE.md/DECISIONS.md/BACKLOG.md/cycle-025.md bookkeeping pass. `git push` was not attempted
again this session (confirmed dead earlier -- 403 from proxy, no github.com egress from this
shell); all commits remain local on `main`, ahead of `origin/main`.

### Phase 12 — 2026-08-30: Fable AND Sonnet both exhausted for the week -- Opus/Haiku substitution

Immediately after Phase 11's report, Nathan reported the weekly Fable quota AND Sonnet quota
both exhausted, with roughly 10% of "all models" left until Monday 05:00 reset. He proposed an
emergency tier substitution: Opus (the strongest model still available) takes over both the
Plan and Inspect roles Fable normally holds, and Haiku takes over the Execute role Sonnet
normally holds, for anything attempted the rest of this week.

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-08-30 | Opus (substituting for Fable) -- WP-stale-first-fix-cleanup inspect, retry (fresh context, adversarial) | opus | 107,795 | **PASS.** Closes the gap left by Phase 11's Fable-limit cutoff. D-023 compliance proven by extracting and diffing both encoder versions byte-for-byte over 8 fixtures (identical); classifier boundary math traced by hand (t==startedAtMs correctly NOT flagged, accuracy/time-cap boundaries both exact); all named downstream consumers (outage/stop/distance/max-speed/firstFixDelayS/matcher-anchoring) verified to read only `cleanFixes`; test quality independently assessed as genuinely behavioural, not smoke-only. Two informational (non-blocking) notes: an `accuracyM===undefined` doctrine inconsistency between fixFlags.ts and engine.ts/computeMaxSpeedKmh worth a future decision record, and a theoretical interior-hole edge case in outage detection that provably can't occur given goodFixSeen's irreversible latch. commit `dca0f92` is now fully closed -- no code change needed, this entry supersedes its "NOT YET INSPECTED" flag. |

**WP-stale-first-fix-cleanup (P1-P4) is now COMPLETE: planned, executed, inspected, PASS.**
No further work attempted this phase pending Nathan's decision on whether the remaining ~10%
"all models" budget should fund one more (small) WP under the Opus-plan/Haiku-execute/
Opus-inspect substitution, or be preserved unspent for the rest of the week.

### Phase 13 onward — cycle 025 execution continues (append below as it happens)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| _(none yet)_ | | | | |
