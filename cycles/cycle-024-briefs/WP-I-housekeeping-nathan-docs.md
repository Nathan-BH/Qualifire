# WP-I — Housekeeping & Nathan-facing docs (cycle 024 execution brief)

**Executor model:** Sonnet. **You see only this brief.** If ANY ambiguity or surprise arises — a file that isn't where this brief says, a count that doesn't match, a convention conflict — STOP and escalate. Never guess. Never delete anything (repo rule: removals are `mv` into `safe_to_delete/`). All dates you write are absolute (`2026-08-24`), never "today"/"last cycle". No bare B-NN/D-NN IDs in anything Nathan reads standalone — plain language first, IDs in parentheses.

## 0. Goal, in Nathan's words

From `Nathan/Nathan's_notes1.md` (2026-08-18): "there are a lot of md files in the product folder that I wonder if they are still needed/useful"; "I don't have a good idea of the current status or next steps … I am in more of a manager position"; "Some files … seem really outdated such as the LAYOUT.md file"; "Should each folder have its own readme file for quick lookup and efficient navigation?"; "all the outdated specific-to-me stuff should be removed or at least updated truthfully" (three-tracks / 162 m / scarcity in the brand); "for the app folder I have overall little knowledge of how it is made up … sometimes claude references the 'store' but I have no idea what it is". Nathan endorsed the fix plan in `Nathan/Nathan's_notes1_review.md`: theme 1 options 1+2+3 (product split + per-folder READMEs + standing plain-language status page), theme 2 option 2 (manager summary each cycle end), theme 6 (architecture one-pager + glossary).

## 1. Environment & mechanics (verified 2026-08-20 by the planner)

- Repo lives on Nathan's PC, reachable two ways:
  - **device_bash** — a Linux VM on his machine with the repo mounted **read-write** (fuse, `rw` confirmed via `findmnt`) at `$HOME/mnt/Qualifire`. Has `node` v22.23.2, `npx`, `python3`. Each call is a fresh shell; 45 s cap; no network; **never run git** (stale-lock risk; git is Nathan's).
  - **device_stage_files / device_commit_files** — stage repo files into the cloud container at `/mnt/user-data/uploads/...`, edit there, commit back. Commit CANNOT move/delete, only write.
- A read-only snapshot of most files is already at `/mnt/user-data/uploads/Qualifire/` — but it is PARTIAL and possibly stale by execution time. **For every file you edit: re-stage the live copy first** (device_stage_files) or read it via device_bash `cat`; never edit from the snapshot blind.
- **Move mechanism — pre-resolved: use `mv` via device_bash.** The mount is rw, but FUSE rename support must be probed once before relying on it:
  ```
  echo probe > "$HOME/mnt/Qualifire/safe_to_delete/_wpI_mv_probe.txt" \
    && mv "$HOME/mnt/Qualifire/safe_to_delete/_wpI_mv_probe.txt" "$HOME/mnt/Qualifire/safe_to_delete/_wpI_mv_probe_moved.txt" \
    && cat "$HOME/mnt/Qualifire/safe_to_delete/_wpI_mv_probe_moved.txt"
  ```
  If it prints `probe`, `mv` works — use it for every move below; leave the probe file in `safe_to_delete/` (Nathan empties that folder). If it fails: FALLBACK = write the file's content at the new path via device_commit_files, then overwrite the ORIGINAL in place with a 3-line tombstone (`# MOVED 2026-08-XX\nThis file now lives at <new path>.\nNathan: this stub can be deleted via your safe_to_delete flow.`) and list all tombstones in `safe_to_delete/WP-I-tombstones-to-delete.md`. Do not improvise a third mechanism.
- **Sequencing (hard):** WP-I runs **LAST in cycle 024** — after cycle 023 has landed AND after every other cycle-024 WP (A–H, J) has finished, including the DATA-MODEL §8a / COLD-START §10 follow-up edits from Nathan's 2026-08-20 lock-then-verify ruling and the coordinator's DECISIONS.md/BACKLOG.md bookkeeping. STATE.md and the per-folder READMEs must describe the post-024 repo, and the `product/` moves must not yank files out from under another executor. If you cannot confirm this ordering from your dispatch message, STOP and ask.

## 2. Work item A — the `product/` split (move, never delete)

Create `product/proposals/` and `product/superseded/` (device_bash `mkdir -p`). True current inventory of `product/` (17 files + 1 dir, listed from the live device 2026-08-20):

| File | Disposition | Why (one line) |
|---|---|---|
| `BACKLOG.md` | **stay** (live) | Product Owner's open-work list, updated every cycle |
| `DECISIONS.md` | **stay** (live) | append-only decision log, D-001…D-043+ |
| `CONCEPT.md` | **stay** + correction block (item D below) | live interpretation of the idea; tail is stale |
| `DATA-MODEL.md` | **stay** (live) | §8a is active ruling material (route-pick, lock-then-verify) |
| `LAYOUT.md` | **stay** + header fix (item C below) | live screen spec; status header predates the built app |
| `BRAND.md` | **stay** + full rewrite (item B below) | brand doc; Nathan overruled its core framing |
| `PRIOR-ART.md` | **stay** (live reference) | still consulted (OpenTracks answer for Nathan is in it) |
| `MAP-TILES.md` | **stay** (live reference) | style URLs, ToS, attribution strings still operative (open B-52/B-56) |
| `MAP-CONTRACT.md` | **stay** (live reference) | per-surface map behaviour + acceptance test still binding |
| `brand/` (dir) | **stay** | canonical brand assets + `make_brandboard.py` |
| `COLD-START.md` | → `proposals/` | unbuilt design (B-35…B-43 open); move only AFTER its §10 follow-up edit has landed |
| `SETUP-UX.md` | → `proposals/` | unbuilt onboarding/gate-setup design |
| `ROUTING-AND-SEGMENTATION.md` | → `proposals/` | unbuilt; gated on the §29 fork Nathan hasn't ruled |
| `TRIAGE-ideas-18-27.md` | → `proposals/` | idea triage; open remnants (§24, §26) tracked here |
| `MAPLIBRE-SPIKE.md` | → `superseded/` | STATE.md itself flags it stale (v10 prop names, pre-B-46) |
| `MAP-STACK-OPTIONS.md` | → `superseded/` | decision support consumed by D-041 |
| `BUILD-PIPELINE.md` | → `superseded/` | plan overtaken by real builds 3/4/5 + runbooks + scripts/ |
| `GPX-PLUS-proposal.md` | → `superseded/` + prepend one line: `**IMPLEMENTED 2026-08-19 (B-68, cycle 021) — the code and cycles/cycle-021.md are the truth now.**` | shipped |

Root-level file dispositions:

| File | Disposition |
|---|---|
| `BUILD-3-RUNBOOK.md` | → `safe_to_delete/` (build 3 failed and was superseded; the history lives in `cycles/cycle-008.md`) |
| `BUILD-4-RUNBOOK.md` | **stay** at root (active riding-build runbook; STATE references its §5 checklist) |
| `IDEAS.md`, `CLAUDE.md`, `.gitattributes`, `.gitignore` | untouched |

If by execution time a file listed here does not exist, or a file NOT listed here exists in `product/` (another WP may have added one), STOP and escalate with the diff — do not extend the table yourself.

## 3. Work item B — `product/BRAND.md` rewrite

Current file (95 lines, `Status: PROPOSED`, Designer 2026-08-15) contains framings Nathan has explicitly overruled. Rewrite the whole file. Binding content rules (sources: `Nathan/Nathan's_notes1.md` bullets under "marketing folder", `cycles/cycle-022.md` which already applied them to the website, `app/src/ui/theme.ts` comments):

REMOVE entirely:
- "Colour is the scarcest resource" / "Purple is rare by design" scarcity framing (Nathan: "never been a fan … it should be removed entirely from our brand idea and identity. It's just something claude came up with").
- "the lap begins 162 m later" and any fixed-metre flying-start claim (not always 162 m; he wouldn't talk about it anyway).
- "One rider, three known tracks" / any three-tracks count (19 routes across 13 ways as of cycle 019; don't hardcode the new number as identity either — say "your own routes").
- "rolling 7-day and 28-day versions of yourself" (superseded by D-030/D-037 last-10 window — reference the model without window-marketing).
- The 2026-08-15 "red as livery is allowed and welcome" amendment paragraph — record instead that livery red was TRIED AND DROPPED by Nathan the same day (`theme.ts` line ~104: "do not reintroduce red anywhere"). No red anywhere stands (D-013).

KEEP / ADD:
- Keep "Same road. New meaning." (Nathan: "perfectly on track with the brand image").
- New story core, in this order: (1) self-improvement — "a bit better every day, by pushing yourself"; (2) make your daily trajects (not just commutes — the routes you ride often) more fun, exciting, playful. Racing yourself, never others. No F1 name-dropping in outward-facing copy (F1 vocabulary — sectors, tower, quali — stays fine INSIDE the team/app docs).
- Colour rationale, replacing scarcity: **colours because they are easy, intuitive and relatable to something that exists** (Nathan's exact reason). Purple/green/neutral roles per D-030 stay; the honesty rule (no colour a sector hasn't earned) stays.
- Theming: night AND day are both real and shipped (daylight is the app default, night user-selectable — `theme.ts`); "happy with the current night and day designs and they could be expanded with more themes in the future".
- Keep P2 (colour hierarchy = meaning hierarchy), P3 (numbers are the hero), P4 (the gate is the mark), and the Motion section (launch animation is ratified and Nathan asked for MORE uses of it, `Nathan's_notes2.md` 2026-08-19) — update P1's palette description to the two-theme reality instead of "charcoal only".
- Keep the reference-panels + logo-brief sections, updating palette words to match `theme.ts` (`#FAF7EE` daylight ground / `#17171b` night ground / `#F5C542` structural yellow / race `#0A0A0A` night, `#FFFFFF` day).
- New status line: `Status: ACTIVE — rewritten 2026-08-XX (cycle 024) per Nathan's rulings in Nathan/Nathan's_notes1.md; supersedes the 2026-08-15 PROPOSED draft.`

Verification for this file: `grep -niE "scarc|162|three (known )?tracks|7-day|28-day|rare by design" product/BRAND.md` must return nothing.

## 4. Work item C — `product/LAYOUT.md` stale-header fixes

Do NOT rewrite the 403-line body. Three surgical edits:
1. Replace the status paragraph (lines 3–4, beginning `**Status: spec.` … `— is UNBUILT.**`) with a dated status block saying: this is the live screen-by-screen spec; the live counter v2, board v2 and timing tower described here are **BUILT** (tower cycle 016, B-28); the app has **six tabs** (record / rides / routes / result / settings / demo) with a horizontally scrolling tab bar, not §1's "five screens, no tab bar" (that section is kept as the original design record); tier windows in this doc predate **D-030/D-037** — colour today compares against the **last-10-rides** window (purple beats every ghost, green above recent average), not 7-day/28-day; **D-042 (2026-08-17)** made RAW time the scoring default (implementation pending, B-59), superseding this doc's moving-time wording; the RECORD flow is being reworked to setup→armed→running per the cycle-022 mockup. Dated `2026-08-XX (cycle 024)`.
2. At the top of §1 ("Five screens, one navigation stack, no tab bar") insert one italic line: *Historical (cycle 002). The shipped app is six tabs — see the status block above.*
3. Leave everything else byte-identical.

## 5. Work item D — `product/CONCEPT.md` correction block + `app/README-dev.md` opener

- `CONCEPT.md`: keep the body; insert, directly under the "Owner: Product Owner. Last revised…" line, a dated **Status corrections (2026-08-XX, cycle 024)** block of ~6 bullets correcting only what is now false: the app EXISTS and runs on Nathan's phone (dev client, since 2026-08-14); the timing tower is BUILT (cycle 016); the catalog is 19 routes / 13 ways (cycle 019), of which the live engine locks/scores 4 (Morning, EveningA, EveningB, MorningB — cycle 020; all-19 is cycle-024 WP-D work — check its outcome at execution time and state whichever is true); colour model is D-030 last-10, not 7d/28d; D-042 made raw time the ruled default (B-59 pending); the closing line "No application code exists yet; every design above is UNBUILT" is false since cycle 005. Do not edit the body text itself.
- `app/README-dev.md`: replace ONLY the opening status paragraph (lines 3–10, "Status (cycle 005): …") with a current one: pipeline proven; app on the phone as a dev client (build 4, MapLibre); suite currently N tests (derive — see §8) run headless via `node --experimental-strip-types tests/run.ts`; storage/store/live modules all landed; keep the rest of the file (the acceptance steps are live).

## 6. Work item E — STATE.md full regeneration (flagged overdue since cycle 016; three correction paragraphs bolted on since)

Rewrite `STATE.md` from scratch, ≤100 lines (its own rule), keeping its header contract (single source of truth; points at records, never copies them; drift here is a bug here). Structure:

1. Header + precedence paragraphs (keep, lightly compressed).
2. `Last updated: 2026-08-XX · After cycle 024`.
3. **Phase** — one paragraph: Phase 2; app real on the phone (dev client + MapLibre map on every screen, D-041); catalog 19 routes / 13 ways; live engine track count (derive from `app/src/live/refs.ts` TRACK_IDS post-WP-D); GPX+ shipping as the one export (B-68); cycle 022 redesigned mockup/marketing; cycles 023–024 (summarise from `cycles/cycle-023.md` and the cycle-024 briefs' outcomes — read them at execution time).
4. **Settled** — `D-001 … D-NNN` (derive NNN) with a 3–4 line highlight reel of the newest (D-041 map, D-042 raw time, D-043 preview APK, plus the 2026-08-20 lock-then-verify pick-bias ruling under whatever D-number the coordinator recorded it as — find it in DECISIONS.md; if it is NOT yet recorded, STOP and escalate rather than inventing an ID).
5. **The dataset** — 624 archive GPX + app-recorded rides (count `data/activities/TEST in app rides/` subfolders/files), 125 cached .npz.
6. **Open work** — "`product/BACKLOG.md` is authoritative — N items" (derive N: `grep -cE '^\| B-[0-9]+' product/BACKLOG.md`), then the top ~5 in plain language + IDs, taken from BACKLOG statuses as they stand post-024.
7. **Blockers / Awaiting Nathan** — derive from post-024 reality; carry forward whichever of these are still true: git commits are Nathan's (uncommitted work if any), B-47 battery A/B, route questions B-61…B-64, the §29 fork, safe_to_delete emptying.
8. **Roster** — keep the pointer to `team/TEAM.md`, one line.
9. **Ground truth** — code layout one-liner; **test count derived by actually running the suite via device_bash** (see §8) at regen time, stated as "N tests: P pass / F fail / S skip (run 2026-08-XX)"; tsc status (run it, see §8); what is on the phone.

NO correction paragraphs survive — their content is folded in. Do not copy any number from this brief or from the old STATE; every count is derived at execution time (D-039 rule: the brief said 145/142/0/3 on 2026-08-20 — treat that only as a sanity reference).

## 7. Work item F — READMEs per folder + root README + the Nathan-facing set

**Hard constraint discovered 2026-08-20: `Nathan/README.txt` says agents never write inside `Nathan/` unless explicitly asked. Do not create or edit ANY file in `Nathan/`.** The Nathan-facing docs therefore live at repo ROOT.

New root files (all plain language, no bare IDs — IDs in parentheses only):
1. **`NATHAN-STATUS.md`** — the standing status page (review theme 1 option 3 / theme 2 option 2). Sections: **On your phone today** (what actually works when he opens the app); **What just changed** (this cycle, ≤6 bullets); **What's next** (plain menu, one sentence + rough size each); **What needs you** (each with the one-sentence question); **Where to read more** (STATE.md for agents' detail, GLOSSARY.md, HOW-THE-APP-IS-BUILT.md). ≤ one screen (~45 lines). Regenerate it from post-024 truth, same derivation discipline as STATE.md.
2. **`HOW-THE-APP-IS-BUILT.md`** — one page modeled on the paragraph in `Nathan/Nathan's_notes1_review.md` theme 6 (that style worked for Nathan — read it first and match its voice). Cover: the engine (`app/core` — pure timing brain, GPS→gates→sector/lap times, parity-proven), location (Android GPS foreground service), storage (append-only raw JSONL, "raw is truth", GPX+ export), **the store** (`app/src/store` — the catalog of landmarks/ways/routes/gates + derived per-ride results feeding ghosts and colours; "when someone says the store, they mean this"), the UI (six tabs, named), the live engine (`app/src/live` — route lock + gate firing while riding), dev client vs build (Fast Refresh streams code from the PC; a build is only needed when native pieces change), mockup vs app (`demos/mockup.html` is a browser prototype mirroring the app, never the app). End with "updated whenever the structure changes" note.
3. **`GLOSSARY.md`** — plain 1–3 sentence definitions, at minimum: ghost, gate, sector, way vs route, tier (purple/green/neutral), tower, seed ride / reference ride (note: two words for one idea — the ride a route's line and benchmark come from), dev client vs build, the store, landmark, route lock, earcon, fix (GPS fix — internal diagnostics, hidden from UI since cycle 022), GPX and GPX+, paddock vs race mode, mockup. Keep the team honest: these are the words used with Nathan in chat too.

**Per-folder `README.md`** (new files; 1–5 lines PER FILE inside, more for big folders by subfolder): `product/` (the full disposition index: every file, `live | proposal | superseded`, last-touched date derived via device_bash `stat -c '%y'`, who reads it, one-line what — including a "moved 2026-08-XX" map of old→new paths), `product/proposals/` (2-line charter: designs written but not built; promotion = building them), `product/superseded/` (2-line charter: settled or overtaken; kept for the record, never deleted), `process/`, `cycles/`, `team/`, `data/` (describe `activities/`, `analysis/`, the index CSV, the ZIP — not per-ride), `demos/` (each html file one line), `marketing/`, `scripts/`, `archive/`, `safe_to_delete/` (explain the convention: agents never delete; Nathan empties), `app/` (point to `README-dev.md` + `HOW-THE-APP-IS-BUILT.md`). Skip `Nathan/` (write-forbidden — the root README describes it instead) and `design/` (WP-J writes that one).

**Root `README.md` rewrite** — keep the two rules and the reading-guide spirit, but the folder map must list ALL top-level entries as they exist post-024 (verify with device_list_dir): README, IDEAS, STATE, NATHAN-STATUS, HOW-THE-APP-IS-BUILT, GLOSSARY, CLAUDE.md, BUILD-4-RUNBOOK, app/, archive/, cycles/, data/, demos/, design/ (if WP-J landed), marketing/, Nathan/ (his folder — agents read-only), process/, product/ (+ proposals/ + superseded/), safe_to_delete/, scripts/, team/. Add "Nathan: start here → NATHAN-STATUS.md" at the top of the reading guide.

## 8. Work item G — process amendments (single writer: this WP owns both process files this cycle)

- `process/CONVENTIONS.md`: append a new section `## Nathan-facing docs (added 2026-08-XX, cycle 024)` with three binding rules: (1) **`NATHAN-STATUS.md` is regenerated by the Principal at every cycle end**, same pass as STATE.md — a cycle that ends without it is unfinished; (2) `HOW-THE-APP-IS-BUILT.md` and `GLOSSARY.md` are updated whenever structure/vocabulary changes; (3) **design round-trip check** — at cycle start the coordinator diffs `design/edited/` against `design/canonical/` (see `design/README.md`, WP-J) and turns differences into agenda items. Keep it under ~15 lines.
- `process/CYCLE.md`: in "### 3. Meeting (Team Principal)", add one bullet after "rewrite `STATE.md` …": `- regenerate NATHAN-STATUS.md — the plain-language twin of STATE.md (CONVENTIONS.md → "Nathan-facing docs")`.
- Do NOT touch `CLAUDE.md`.

## 9. Verification (all before reporting done)

Sandbox-pure: none of this touches app code, but prove it — after all edits run via device_bash:
- `cd $HOME/mnt/Qualifire/app && node --experimental-strip-types tests/run.ts` → identical counts to your pre-work baseline run (record both).
- `cd $HOME/mnt/Qualifire/app && npx tsc --noEmit` → clean (record output).
- `wc -l $HOME/mnt/Qualifire/STATE.md` ≤ ~100.
- BRAND grep from §3 returns nothing; `grep -n "no tab bar" product/LAYOUT.md` still finds §1 (body untouched) and the new status block exists.
- Every moved file: `test -f` new path AND old path gone (or tombstoned under the fallback); every new README exists; `ls product/ product/proposals/ product/superseded/` matches the §2 table exactly.
- `demos/mockup.html` is NOT touched by this WP (no shipped design change here — CLAUDE.md §6 not triggered).
- Nothing written under `Nathan/`: `find $HOME/mnt/Qualifire/Nathan -newer <a pre-work timestamp file>` returns nothing of yours.

## 10. Files touched (union)

Edited: `STATE.md`, `README.md`, `product/BRAND.md`, `product/LAYOUT.md`, `product/CONCEPT.md`, `product/GPX-PLUS-proposal.md` (one prepended line, then moved), `app/README-dev.md`, `process/CONVENTIONS.md`, `process/CYCLE.md`.
Created: `NATHAN-STATUS.md`, `HOW-THE-APP-IS-BUILT.md`, `GLOSSARY.md`, `product/README.md`, `product/proposals/README.md`, `product/superseded/README.md`, `process/README.md`, `cycles/README.md`, `team/README.md`, `data/README.md`, `demos/README.md`, `marketing/README.md`, `scripts/README.md`, `archive/README.md`, `safe_to_delete/README.md`, `app/README.md`, `safe_to_delete/_wpI_mv_probe*` (probe).
Moved: `product/{COLD-START,SETUP-UX,ROUTING-AND-SEGMENTATION,TRIAGE-ideas-18-27}.md` → `product/proposals/`; `product/{MAPLIBRE-SPIKE,MAP-STACK-OPTIONS,BUILD-PIPELINE,GPX-PLUS-proposal}.md` → `product/superseded/`; `BUILD-3-RUNBOOK.md` → `safe_to_delete/`.

## 11. Conflicts with cycle 023 / other WPs

- Cycle 023's scope is app code (race-map day-mode fix, pause/dim, off-route) — no doc overlap EXCEPT its bookkeeping may rewrite STATE.md/BACKLOG statuses. That is why WP-I runs last; re-stage STATE.md immediately before regenerating.
- COLD-START.md / DATA-MODEL.md get a follow-up edit from the 2026-08-20 lock-then-verify ruling (owned elsewhere). Move COLD-START.md only after confirming that edit is present in the file (grep for a 2026-08-20-dated note in §10); if absent, STOP and escalate.
- WP-J creates `design/` and its README, and depends on `process/CONVENTIONS.md` gaining the round-trip rule — which THIS WP writes (single-writer). Root README lists `design/` only if it exists.

## 12. Pre-resolved ambiguities

- Moves = device_bash `mv` (mount verified rw 2026-08-20), probe-first, tombstone fallback — §1.
- Nathan-facing docs live at ROOT, not `Nathan/` (his README.txt forbids agent writes there).
- `BUILD-3-RUNBOOK.md` goes to `safe_to_delete/` (proposing deletion IS the repo's ratification mechanism; history preserved in cycles/cycle-008.md and git).
- BRAND keeps F1 vocabulary internally; bans it only as outward positioning.
- LAYOUT/CONCEPT get dated correction blocks, not rewrites (append-only honesty; their bodies are design records).
- `TRIAGE-ideas-18-27.md` → proposals/ (forward-looking triage, some items unactioned).
- STATE regen waits for, and folds in, cycles 023 and 024 outcomes; every number derived at execution time.

## 13. NEEDS-NATHAN

1. Post-hoc confirmation of the §2 disposition table — every move is reversible (`mv` back); flag the table in NATHAN-STATUS.md "What needs you".
2. `BUILD-3-RUNBOOK.md` sits in `safe_to_delete/` — emptying it makes the deletion real; he should glance first.
3. Nothing else — do not add items without escalating.

## 14. Rollback

Everything is plain-text files plus renames on a mounted filesystem Nathan controls with git. Rollback = `mv` files back per the §2 table and `git checkout` of edited files (Nathan's action). No app code, no tests, no data touched.
