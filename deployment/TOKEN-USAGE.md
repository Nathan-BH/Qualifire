# deployment — dispatch readout (running)

Same format as the per-cycle `TOKEN-USAGE.md` files, but this table is **never closed**:
the coordinator (main chat) appends one row per agent dispatch spent on deployment work,
in chronological order, and adds a dated sub-total line at the end of each work session.
Token figures come from the Agent tool's result metadata, filled in by the coordinator —
subagents don't know their own count while writing, so a row written by a subagent carries
a placeholder until the coordinator replaces it.

Chat model for the 2026-09-09 session: see the coordinator's own readout; this file tracks
dispatches only.

## 2026-09-09 — folder creation, current-state inventory, options analysis

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Digest | Haiku | Inventory the repo's deployment-relevant facts: `app.json` / `app.config.js` / `eas.json` / `package.json`, build + OTA scripts, `STATE.md` ground rules, existing doc conventions, assets, CI presence | 65,410 (26 tool calls) | Digest produced; confirmed no `deployment/` folder existed, no store presence, no CI, Android-only, `STATE.md` "no store distribution" rule on record |
| Plan (analysis + writing, no Execute handoff) | Fable | Think through the real distribution routes for *this* app and create `deployment/` with README, CURRENT-STATE, DEPLOYMENT-OPTIONS, QUESTIONS-FOR-NATHAN, TOKEN-USAGE, CYCLE-LOG | 81,743 (15 tool calls) | Six files written. Options laid out without a recommendation (goal undecided); Q1 surfaces the `STATE.md` ground-rule conflict; keystore backup, crash reporting and the background-location check flagged as route-independent items. Note: the `device_bash` mount was unavailable this session, so files were written via `device_commit_files` and spot-checks used `device_stage_files` — no git operations were run. |

**Session total (2026-09-09, first pass):** 147,153 tokens, 41 tool calls (coordinator/chat-model tokens not included — see the chat session's own accounting)

## 2026-09-09 — pivot revision (Nathan: app is no longer personal-only)

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Coordinator (direct chore, <10 mechanical lines) | Sonnet | Record the pivot in `STATE.md` ("The goal" + ground rules) and root `README.md`'s blurb; save durable project memory | not tracked as a dispatch (no Agent call) | Both files rewritten and committed; `qualifire-pivot-public-app-2026-09-09.md` added to project memory |
| Plan (analysis + writing, no Execute handoff) | Fable | Rework `DEPLOYMENT-OPTIONS.md` into a staged recommendation and update `QUESTIONS-FOR-NATHAN.md` / `CYCLE-LOG.md` now that Q1 is resolved | 105,191 (17 tool calls) | `DEPLOYMENT-OPTIONS.md` gained §0 (staged plan: hygiene now → Play closed testing → public later); Q1 marked answered with an explicit list of what it does *not* settle; flagged one open item (whether "virgin build" in Nathan's statement means the branch or the dormant `.virgin` EAS profile/package) |
| Coordinator (direct chore, <10 mechanical lines) | Sonnet | Note the superseded ground rule in `CURRENT-STATE.md` §2; fill this table's token figures | not tracked as a dispatch | `CURRENT-STATE.md` §2 now marked superseded, pointing to `STATE.md` |

**Pivot-revision total (tracked dispatches):** 105,191 tokens, 17 tool calls

## 2026-09-09 — Nathan's answers folded in

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Digest | Haiku | Check `app.json`/`app.config.js`/`app/src/location/index.ts` for background vs. foreground-only location usage (Q9, Nathan said "check") | 47,108 (11 tool calls) | Confirmed background location IS requested — `isAndroidBackgroundLocationEnabled: true`, `ACCESS_BACKGROUND_LOCATION`, `TaskManager`/`startLocationUpdatesAsync` in `location/index.ts` |
| Coordinator (direct chore, <10 mechanical lines) | Sonnet | Fold Nathan's decided answers (Q1–Q5, Q8, Q10) into `STATE.md` ground rules and a new `OPEN-ITEMS.md` "Distribution" section; add `marketing/` to both root README's tree and STATE.md's pivot note (previously undocumented) | not tracked as a dispatch | Both files rewritten and committed |
| Plan (analysis + writing, no Execute handoff) | Fable | Fold every answer into `deployment/QUESTIONS-FOR-NATHAN.md`, `DEPLOYMENT-OPTIONS.md`, `CURRENT-STATE.md`, `CYCLE-LOG.md`; write plain-language, worked-example explanations for Q6 (signing-key continuity) and Q7 (keystore backup) since Nathan said those terms were unfamiliar | 143,812 (54 tool calls) | Route/scale/fee/timeline/package-name/Sentry/background-location all marked decided and consistent; Q6/Q7 rewritten with primers + examples, still open; caught that Q10 means no testers have a build yet, so the "testers must reinstall" framing overstated the cost — flagged back to coordinator |
| Coordinator (direct chore, <10 mechanical lines) | Sonnet | Correct the "testers must reinstall" overstatement in `STATE.md`/`OPEN-ITEMS.md` per Fable's catch (only Nathan's own `.preview` phone is affected, no testers exist yet); fill this table | not tracked as a dispatch | Both files corrected |

**This-round total (tracked dispatches):** 190,920 tokens, 65 tool calls

**Session running total (all three rounds, tracked dispatches):** 443,264 tokens, 123 tool calls

## 2026-09-10 — Q6/Q7 (signing key) decided, all ten questions resolved

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Plan (analysis + writing, no Execute handoff) | Fable | Fold Nathan's Q6/Q7 answers (found in a stray `QUESTIONS-FOR-NATHAN2.md`) into a rewritten canonical `QUESTIONS-FOR-NATHAN.md`, `DEPLOYMENT-OPTIONS.md`, `CURRENT-STATE.md`, `CYCLE-LOG.md`; answer Nathan's follow-up question on how EAS Update and Play's own update mechanism interact | 134,244 (40 tool calls) | Q6 = Play generates a fresh signing key; Q7 = no backup needed (confirmed his own reasoning, with the one narrow `.preview`-only exception named); explained the two independent update paths (EAS OTA vs. Play binary review) accurately; nothing left open on route or signing |
| Coordinator (direct chore, <10 mechanical lines) | Sonnet | Fold final signing decisions into `STATE.md`/`OPEN-ITEMS.md`; fix stale "no recommendation"/"inbox" framing in `deployment/README.md`; note the stray `QUESTIONS-FOR-NATHAN2.md` / `(answered before update)` files for Nathan to clear (no `device_bash` access to move them); fill this table | not tracked as a dispatch | `STATE.md`/`OPEN-ITEMS.md`/`deployment/README.md` updated |

**This-round total (tracked dispatches):** 134,244 tokens, 40 tool calls

**Session running total (all four rounds, tracked dispatches):** 577,508 tokens, 163 tool calls

**Landed in the app:** nothing — documentation only, all three passes.
