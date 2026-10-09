# 13 - product/proposals folder inventory

Date: 2026-10-08 · Scope: `product/proposals/` (non-recursive; no subfolders exist) · Mode: read-only (nothing moved, edited or deleted)

## TL;DR

1. The folder holds 4 files, all git-tracked, all Markdown: a README index and three design proposals from main's cycle 011 (2026-08-17), each last edited 2026-09-08.
2. Nothing here is junk or a duplicate. No file is OUTDATED. The three proposals are KEEP-CURRENT or KEEP-REFERENCE because each is cited by live docs and each still has an open remainder or a parked decision.
3. COLD-START and SETUP-UX are largely built on `virgin`; their disposition tables at the top are the authority, and the bodies still say UNBUILT in places (stale wording, not a status problem).
4. Dangling reference: `product/README.md` lines 11 and 33 cite `proposals/TRIAGE-ideas-18-27.md`, which is not in the folder and was removed from git in 44e24f1 (2026-08-31). Fix the README or restore the file; it is not a folder cleanup item.
5. Cycle 27 ruling 4 says to save the watch idea as `product/proposals/watch.md`, but no such file exists and the lower-case name breaks the folder's UPPER-KEBAB convention. Decide the name before writing it (e.g. `WATCH-GLANCE.md`) and add it to `README.md`.

## Folder facts

- Path: `product/proposals/`. Subfolders: none. Git: 4 of 4 files tracked (`git ls-files`).
- Naming convention: UPPER-KEBAB-CASE.md for every proposal (siblings in `product/` are BRAND.md, CONCEPT.md, DATA-MODEL.md, LAYOUT.md, MAP-TILES.md and so on). `README.md` is the index.
- Index: yes, `README.md` (922 B, 2026-09-08 17:42) lists the three proposals with their status. A new file needs a line there.
- Folder mtime 2026-09-01 20:38 (no entries added or removed since then).

## Table

| file | modified | classification | reason | referenced by |
|---|---|---|---|---|
| README.md (922 B) | 2026-09-08 17:42 | KEEP-CURRENT | Index for the folder, states the status of each proposal; accurate against the files. | product/README.md:30-33; root README.md:50-52 |
| COLD-START.md (18426 B) | 2026-09-08 21:46 | KEEP-CURRENT | Largely built (disposition table, lines 15-38). Open remainder: "ride n of N" honesty ladder and F-4 messaging (line 68 onward), and F-2 sector-colour lag, still open in OPEN-ITEMS. | STATE.md (none direct); OPEN-ITEMS.md:61; product/DATA-MODEL.md:107; product/README.md:30,42-43; root README.md:50-52; cycles/virgin-cycle5/* (several briefs and QUESTIONS); cycles/virgin-cycle22/PROGRESS.md; app/src comments (see note) |
| SETUP-UX.md (16738 B) | 2026-09-08 17:40 | KEEP-REFERENCE | Largely built (table lines 18-24). Depth strip DROPPED by Nathan 2026-09-08 (closed, not parked). Cited as the design source for the built tap-then-nudge gate editor. Not an open to-do file. | STATE.md:127; product/README.md:31,42-43; root README.md:50-52; cycles/virgin-cycle5/QUESTIONS-FOR-NATHAN.md:28-29 (Q2); cycles/virgin-cycle5/README.md:21 |
| ROUTING-AND-SEGMENTATION.md (18207 B) | 2026-09-08 17:40 | KEEP-CURRENT | Still a proposal, parked (IDEAS §29, the one parked product fork). Engine pick (BRouter) unbuilt. §3 gate rules and GateSet.origin shipped, so the file is not abandoned. | STATE.md:312; OPEN-ITEMS.md:244; product/DATA-MODEL.md:45,129; product/README.md:32; root README.md:50-52; app/src/store/gateSeeding.ts and types.ts (comments citing §3) |

## Per-file detail (OUTDATED, IRRELEVANT or UNCLEAR)

None. No file met those classifications. Items that could later become OUTDATED are listed under "Unverified / uncertain".

## Unverified / uncertain

- COLD-START.md body (sections 1-6, last reworked 2026-08-17) still states "UNBUILT" in several places and says MIN_HISTORY=5, which the 2026-09-08 note corrects to 1. Readers should use the disposition table and `app/src/ui/colourModel.ts`. Consider a wording-only pass; not a cleanup candidate.
- Whether the "ride n of N" ladder and F-4 messaging are deliberately parked or simply never scheduled: no decision text found in OPEN-ITEMS or the cycle folders. Needs Nathan's call before COLD-START can be closed.
- SETUP-UX §3 items (type-to-filter, recents, time-of-day ranking, pre-START sector-strip preview) are unbuilt and no ruling was found on them. Ask Nathan whether they are dropped like the depth strip.
- ROUTING-AND-SEGMENTATION: "parked" is recorded in OPEN-ITEMS, but no date or owner for un-parking was found. Treated as current.
- Cycle 27 ruling 4 (cycles/virgin-cycle27/15-rulings-after-plan.md:14) says "done (see NOTES.md)" for `product/proposals/watch.md`, yet the file does not exist in the working tree. Either NOTES.md is wrong or the write did not happen. Checked the folder listing and a repo-wide name search for `watch*.md` (none found outside cycles).
- Referenced-by lists are from a name grep limited to root docs, product/, cycles/ and app/src; `grep` over the full repo timed out, so vendored or data folders were not searched.
- The app/src hit list includes code comments citing the proposals (for example gateSeeding.ts and routeCreation.ts); these were not individually read.
