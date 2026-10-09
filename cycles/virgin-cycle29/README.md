# virgin-cycle29: map loading speed (tab switches, ACTIVITIES feed) + freeze rule

**Created:** 2026-10-09
**Status:** Fable ruling written and amended with Nathan's answers; five briefs written. Nothing executed yet.

## Why
virgin-cycle27 brief 12 (commit c93f406) removed the white flash. Nathan's on-device test after it: maps are now visibly slow
(ROUTES fastest, RECORD a short black flash, ACTIVITIES a long black period). Fable's finding: the "black" IS the new cover,
which waits for every tile; plus 4-5 native maps at once on ACTIVITIES. Nathan also ruled a FREEZE RULE (a ride shows the
ranking state of the day it was ridden) and that gate edits must stop re-timing old activities (scoped, not executed).

## Files (read in this order)
1. `00-nathan-direction.md` — Nathan's observations and decisions (binding).
2. `01-findings-digest.md` — coordinator's code digest (corrected by 03 §3).
3. `02-ruling-request.md` — the questions put to Fable.
4. `03-fable-ruling.md` — the ruling, AMENDED 2026-10-09 with Nathan's two answers (block at the top). `03-fable-ruling-v1.md`
   is the unamended original, kept for the record.
5. Briefs (executor files, self-contained):
   - `04-brief-01-cover-first-frame-and-visible-only.md` — cover lifts on the first rendered frame, 2.5 s safety timeout,
     inspector minors 1-3 fixed; ACTIVITIES mounts only the visible cards. OTA. **First. Its on-device check is the profile.**
   - `04-brief-02-snapshot-probe.md` — layer-paint extraction (parity by construction), pure snapshot model (key, padded bounds,
     fit zoom, style JSON), minimal one-at-a-time queue over the headless `StaticMapImageManager`, hidden long-press A/B on card 1.
     OTA. **Gate for 04: Nathan must not tell the picture from the live map.**
   - `04-brief-03-freeze-rule.md` — `ignoredAtMs` + `rankedAsOf` + frozen `priorWindowFor`; feed card, detail page, "ON THIS ROUTE"
     and REPLAY share one frozen pool. OTA. Independent of 02; before 04.
   - `04-brief-04-snapshot-feed.md` — cards become pictures; placeholder -> fade; live map only on snapshot failure; priorities,
     gates, LRU 80, warm the other theme/toggle. OTA. Needs 02 PASS + 03.
   - `04-brief-05-gate-edit-keeps-old-activities-SCOPING.md` — document only: what it takes to keep old activities untouched
     after a gate edit (store, pools per gate version, maps at a version, backfill as-of, snapshot key). After 01, independent.
6. `EXECUTOR-RULES.md`, `INSPECTOR-RULES.md` — tier rules for this cycle. `COMMANDS-publish.md` — OTA publish per brief.
7. Produced during execution: `exec-report-NN.md`, `exec-NN-tsc.log`, `inspect-report-NN.md`, `05-scoping-gate-edit-keeps-old-activities.md`.

## Work order
01 -> (02, 03 in either order; never in parallel on the shared tree) -> 04 (only after Nathan's PASS on 02 and inspect of 03).
05 after 01, any time. Each code brief: Sonnet executes, fresh Opus inspects, then OTA via `COMMANDS-publish.md`, then Nathan's
on-device line (each brief's §"On-device check") goes to OPEN-ITEMS.

## Tier rule
Plan = Fable (ruling + briefs, done). Execute = Sonnet on a self-contained brief, stop-on-ambiguity. Inspect = fresh Opus.
Nothing is executed until Nathan approves the amended ruling.

## Still open for Nathan (03 §5)
- After a gate edit (brief 05): confirm the next ride is "ride 1 of a new history" (neutral, P1/1, ghost = re-timed reference only).
- Count-then-re-ignore: single `ignoredAtMs` = "last ignore wins" (default) vs exact intervals (bigger brief).
