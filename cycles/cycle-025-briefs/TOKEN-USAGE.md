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

### Phase 6 onward — cycle 025 execution (append below as it happens)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| _(none yet — the next row here is the first real WP execution)_ | | | | |
