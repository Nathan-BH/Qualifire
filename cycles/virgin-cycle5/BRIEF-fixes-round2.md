# BRIEF — virgin-cycle5 round-2 fixes (post-Inspect)

**Written 2026-09-08 ~08:00 UTC (Plan tier, fable) against `virgin` HEAD `eeab73f`.** Every
anchor below was re-read from the live files at write time, not copied from the Inspect
report. Executor: Sonnet, stop-on-ambiguity — if any "find" block does not match the file
byte-for-byte, STOP and report the file, the line, and what is actually there. Never guess,
never improvise a nearby edit.

---

## 0. Rulings (the part Nathan should read)

### I2 — "engine unchanged since 2026-08-14" → reword; do NOT re-run parity

The claim is false as written: `git log -- app/core` shows three commits after the parity
measurement — `072830c` (08-19), `90f7f68` (08-23), `fa0e3aa` (08-31). I read all three diffs.

- `072830c`: adds a `MorningB` gate set to `gates.ts` (a fourth commute track — not one of
  the three tracks parity compared), widens `TrackId` to include it, and restricts
  `harness/parity.ts` to the original three tracks. Data + type only.
- `90f7f68`: refreshes the `MorningB` chainages (its reference line was promoted to a
  different ride) and widens `TrackId` to `string`. Data + type only.
- `fa0e3aa`: appends `collapseStationaryRuns` + a private `pointDistM` to `reference.ts`.
  `buildReference` / `medoid` themselves are byte-identical; the new export is used by the
  on-phone reference builder, not by the parity path.

None of the three touches the arithmetic PARITY.md compared (chainage projection, stop
detection, gate crossings, sector times — `geo.ts`, `live.ts`, the analysis code). So a
reworded pointer is honest and sufficient. **Re-running the harness is not possible from
this branch**: `harness/parity.ts` reads `data/activity-index.csv` (the curated archive
index — not in the raw Strava zip that now sits in `safe_to_delete/`) and compares against
`py_sector_times.csv`, which `harness/dump_py_sector_times.py` produces from
`data/analysis/01_parse.py`'s cache; `data/analysis/` does not exist on `virgin`. Ruling:
replace the claim in both files with "measured 08-14; three small non-arithmetic core
commits since; not re-measured, can't be from here". Exact text in §2.

Note for the record: git history on this branch starts at the 2026-08-17 import (cycle
013), so "unchanged since 08-14" was never checkable from git in the first place — one
more reason to say what PARITY.md actually records instead.

### I4 — HEAD is internally inconsistent → keep the docs, stamp the commit status, track it

Fresh check at 07:53 UTC: HEAD is still `eeab73f`; `git status` shows the concurrent
virgin-cycle4 session's seed-default work still uncommitted (`app/src/store/seed.ts`,
`app/tests/seedmode_pin.ts` (new), `app/tests/run.ts`, `app/app.config.js`,
`app/README-dev.md`, `scripts/build7.ps1`, `scripts/dev-virgin.{cmd,ps1}` deleted with
copies in `safe_to_delete/`, `cycles/virgin-cycle4/{README,TOKEN-USAGE,BUILD7-*}.md`).
All last touched 07:22 UTC — active, coherent, and the suite on that tree is 560 / 557 / 0 / 3
(I ran it). The two STATE.md hunks from that session already rode into `eeab73f`.

Ruling: **do not walk the docs back.** Reasons, in order of weight:

1. The honesty rule is "never log *unbuilt* work as built". This work is built — the files
   exist on disk, the suite passes on them. What's imprecise is the *commit* status, and
   the fix for an imprecise status is to state it precisely, not to describe a state the
   tree has already left.
2. Walking back would require a second re-edit when the commit lands, and no session owns
   that re-edit. Docs that say "pending" after the work is committed are the more likely
   long-term staleness. A one-line "uncommitted as of …" flag plus a tracked OPEN-ITEMS
   entry has a clear removal trigger.
3. CLAUDE.md rule 1 already provides the precedent for where the flag lives: "if a fact
   appears in two places, STATE.md wins". So the flag goes in STATE.md (the seed bullet +
   the cycle4 footer line) and OPEN-ITEMS.md (landed-list line + a new Housekeeping entry).
   GLOSSARY.md:104 and HOW-THE-APP-IS-BUILT.md:30 keep their plain-language "blank by
   default" — they are subordinate to STATE.md by rule.
4. This cycle's commit does **not** absorb the other session's files. Committing another
   session's in-flight work from here would strip it of its own Inspect/commit step and set
   a bad precedent. Named `git add` only, as in round 1.

### I3 — data/README.md → rewrite now (in scope); app/README.md:7 → fix

`data/README.md` is 14 lines and describes five things that don't exist on this branch. The
root README now sends readers there, so leaving it is worse than the 5-minute rewrite. Done
in this pass (§3). No OPEN-ITEMS entry needed since it's fixed, not deferred.

### I7 — commit message

No action on `eeab73f`. This round's commit uses the message in §8, which describes what
this round actually does.

---

## 1. Rules

- Touch **only**: `GLOSSARY.md`, `HOW-THE-APP-IS-BUILT.md`, `STATE.md`, `OPEN-ITEMS.md`,
  `README.md`, `app/README.md`, `data/README.md`. Plus this brief is committed
  (`cycles/virgin-cycle5/BRIEF-fixes-round2.md`).
- **Never edit or `git add`** any file the concurrent session owns (list in §0/I4), nor
  `IDEAS.md`, `CLAUDE.md`, anything under `app/src`, `app/tests`, `scripts/`, `process/`,
  `cycles/virgin-cycle1..4/`. `git add <path>` by name only — never `-A` / `.`.
- Never delete. `mv` only. Never `rm`.
- All seven target files are LF-only (verified) — keep them LF. Write with a quoted
  heredoc (`<<'EOF'`) or a tool that does not expand `$`/backticks.
- Every git command: `GIT_OPTIONAL_LOCKS=0`. A stray `.git/*.lock` gets `mv`'d aside.
- Each "find" block below is the exact current text. Match it whole. On mismatch: STOP.

---

## 2. I2 — parity claim (two files)

### 2a. `HOW-THE-APP-IS-BUILT.md` lines 12–15

Find:
```
It has no idea about phones, screens, or storage — just numbers in, numbers out. It was
proven on `main` against the 624-ride Strava archive (same input, same answer, every time);
that archive and its tooling stay on `main`, but the engine code hasn't changed since
2026-08-14, so the proof still applies to what runs here.
```
Replace with:
```
It has no idea about phones, screens, or storage — just numbers in, numbers out. It was
proven on `main` against the 624-ride Strava archive (same input, same answer, every time —
`app/core/PARITY.md`, measured 2026-08-14). That archive and its Python side stay on `main`,
so the proof can't be re-run from this branch. Three small core commits have landed since
(2026-08-19, 08-23, 08-31: a fourth commute track's gate data, a widened track-id type, and
an added stationary-run helper in `reference.ts`); none touches the arithmetic the proof
compared, but parity has not been re-measured on top of them.
```

### 2b. `STATE.md` lines 47–48

Find:
```
- **Code:** `app/core/` (timing engine — parity-proven on `main` against the 624-ride
  archive; unchanged since 2026-08-14, so the proof still applies), `app/src/live/`
```
Replace with:
```
- **Code:** `app/core/` (timing engine — parity-proven on `main` against the 624-ride
  archive, measured 2026-08-14, `app/core/PARITY.md`; three small core commits since —
  `072830c` 08-19, `90f7f68` 08-23, `fa0e3aa` 08-31: MorningB gate data, `TrackId` widened
  to `string`, `collapseStationaryRuns` added to `reference.ts` — none touch the compared
  arithmetic, but parity is not re-measured and can't be from this branch: the archive's
  `activity-index.csv` and the Python side live on `main` only), `app/src/live/`
```

---

## 3. I3 — `data/README.md` (full rewrite) + `app/README.md` line 7

### 3a. `data/README.md` — replace the whole file (14 lines) with:

```
# data/ — app-recorded test rides (virgin branch)

On `virgin` this folder holds only what the app itself produced during test rounds. The
624-ride Strava archive, `activity-index.csv`, the `analysis/` Python pipeline and its
reports all stay on `main`. Nothing here is read by the app or by the headless test suite.

| Entry | What it is |
|---|---|
| `activities/TEST in app rides/` | Pre-branch test rounds on the old app (2026-08-19 → 08-29), one `qualifire-YYYYMMDD/` folder per day: Nathan's notes, reviews and post-review notes, plus a few screenshots. Notes only — no GPX. Kept for reference; vocabulary is pre-WP-3 (route/way not yet swapped). |
| `activities/TEST in virgin-app rides/` | Test rounds on this branch (2026-09-01, 09-03, 09-04), one `qualifire-YYYYMMDD/` folder per day: the app's GPX+ exports (`qualifire-YYYYMMDD-HHMM.gpx`), the debug exports `qualifire-catalog-*.json` / `qualifire-refs-*.json`, and the day's notes / review. New on-device findings go in a new folder here (OPEN-ITEMS.md item 2). |

Not on this branch, though still referenced by two offline builder scripts the suite never
imports (`app/tests/build_fixtures.ts`, `app/tests/build_seed.ts`) and by the scratch script
`app/tests/scratch_freeride_replay.ts`: `activity-index.csv`, the raw archive, `analysis/`.
`strava_export-20260814.zip` was moved to `safe_to_delete/` in virgin-cycle5. The `.gpx`
files here are the app's own exports, not Strava's.
```

### 3b. `app/README.md` lines 6–7

Find:
```
- **`../HOW-THE-APP-IS-BUILT.md`** — the plain-language one-pager: engine, location,
  storage, the store, the UI, the live engine, dev client vs. build, mockup vs. app.
```
Replace with:
```
- **`../HOW-THE-APP-IS-BUILT.md`** — the plain-language one-pager: engine, location,
  storage, the store, the UI, the live engine, dev client vs. build (Preview).
```

---

## 4. I4 — commit-status flags (STATE.md ×2, OPEN-ITEMS.md ×2)

**Before editing, re-check:** `cd "$HOME/mnt/Qualifire" && GIT_OPTIONAL_LOCKS=0 git log --oneline -3 && GIT_OPTIONAL_LOCKS=0 git status --porcelain`.
- If HEAD is still `eeab73f` and `app/src/store/seed.ts` still shows ` M` → apply 4a–4d.
- If a new commit above `eeab73f` has landed **and** `seed.ts` no longer shows in
  `git status` → the other session committed. **Skip 4a–4d entirely**, and instead confirm
  with `GIT_OPTIONAL_LOCKS=0 git show HEAD:app/src/store/seed.ts | grep -n "SEED_MODE: SeedMode" -A1`
  that the committed default is `'empty'`; say so in the report. No doc change needed.
- Anything else (e.g. new commit but `seed.ts` still modified) → STOP and report.

### 4a. `STATE.md` lines 56–57

Find:
```
  The empty seed is the **default** since 2026-09-08 (`seed.ts` resolves 'empty' unless
  `EXPO_PUBLIC_SEED_MODE=shipped`): plain `npx expo start` on the dev client and the
```
Replace with:
```
  The empty seed is the **default** since 2026-09-08 (`seed.ts` resolves 'empty' unless
  `EXPO_PUBLIC_SEED_MODE=shipped`) — **landed in the working tree, not yet committed** as
  of `eeab73f` and the cycle5 round-2 commit; the virgin-cycle4 session owns that commit
  (`seed.ts`, `tests/seedmode_pin.ts`, `tests/run.ts`, `app.config.js`, `README-dev.md`,
  `scripts/build7.ps1`, the `dev-virgin` retirement, the cycle4 docs). Until it lands,
  HEAD's `seed.ts` still defaults to 'shipped' and `scripts/dev-virgin.*` are still tracked
  — see OPEN-ITEMS "Housekeeping". With it: plain `npx expo start` on the dev client and the
```

### 4b. `STATE.md` lines 214–215

Find:
```
  re-anchor) — inspected, dry run clean, real build run by Nathan; then (2026-09-08) the
  seed default flipped to 'empty' and the `dev-virgin` scripts were retired.
```
Replace with:
```
  re-anchor) — inspected, dry run clean, real build run by Nathan; then (2026-09-08) the
  seed default flipped to 'empty' and the `dev-virgin` scripts were retired (that tail sits
  in the working tree, uncommitted as of the cycle5 round-2 commit — OPEN-ITEMS Housekeeping).
```

### 4c. `OPEN-ITEMS.md` line 25

Find:
```
  and completed; seed default flipped to 'empty' — `cycles/virgin-cycle4/README.md`.
```
Replace with:
```
  and completed; seed default flipped to 'empty' (working tree only — uncommitted, see
  Housekeeping below) — `cycles/virgin-cycle4/README.md`.
```

### 4d. `OPEN-ITEMS.md` — new section immediately before `## Parked (scoped, not urgent)`

Find (the blank line + heading; the line before the blank line ends `start from nothing.`):
```
  start from nothing.

## Parked (scoped, not urgent)
```
Replace with:
```
  start from nothing.

## Housekeeping (agent-side, no phone needed)

- **Commit the virgin-cycle4 tail.** As of the cycle5 round-2 commit the seed-default flip
  ('empty' unless `EXPO_PUBLIC_SEED_MODE=shipped`) sits in the working tree, uncommitted:
  `app/src/store/seed.ts`, `app/tests/seedmode_pin.ts`, `app/tests/run.ts`,
  `app/app.config.js`, `app/README-dev.md`, `scripts/build7.ps1`, `scripts/dev-virgin.*`
  deleted (copies in `safe_to_delete/`), `cycles/virgin-cycle4/*.md`. The root docs already
  describe the flipped state (STATE.md wins where they differ). The virgin-cycle4 session
  owns the commit; when it lands, strike this item and drop the "uncommitted" flags in
  STATE.md (the seed bullet and the cycle4 footer line) and in the cycle4 line above. Then
  the last cycle4 step per `cycles/virgin-cycle4/TOKEN-USAGE.md`: record build7's
  fingerprint in `scripts/OTA-TROUBLESHOOTING.md`.

## Parked (scoped, not urgent)
```

---

## 5. I1 — `GLOSSARY.md` "Lock" entry, lines 51–55

Verified against `app/src/live/engine.ts` (header lines 37–55, `evaluateLockState` lines
808–856), `app/src/ui/RecordScreen.tsx:776–777` ("a soft lock is displayed and scored, but
it is not yet corridor-confirmed"), and `app/tests/live_colour_suite.ts:306`.

Find:
```
**Lock (soft / verified).** The moment the live engine decides which way you're actually
riding, out of every way it was watching. Before lock it's still narrowing candidates. A
*soft* lock shows that way on screen but doesn't yet score against it; once you've covered
enough of that way's corridor it becomes *verified*, and sector colours and the tower are
tied to it. A verified lock never switches. A free ride never locks.
```
Replace with:
```
**Lock (soft / verified).** The moment the live engine commits to the way you're riding.
Before lock it's still gathering evidence: no lock of any kind until a way has about 400 m
of corridor-verified travel behind it. If you picked a way on RECORD, that pick is the only
way the ride can ever lock. A *soft* lock (pick rides only) comes as soon as the picked way
has its 400 m: from then on it is shown on screen **and** scored — sector colours, the
tower, everything — exactly as a verified lock would be; the only difference is that the
engine hasn't yet confirmed it as the clear leader over every other way it watches, and the
screen says so. Once it is, the lock is promoted to *verified* with no second lock event.
Without a pick there's no soft stage — the clear leader locks verified straight away. A
lock never switches to another way, however far ahead one pulls; leaving the picked road
scores as missed sectors on the pick. A free ride never locks.
```

---

## 6. I5 — sport pill-row condition (two files)

Model wording is STATE.md:41–42 ("shown only with 2+ sports and the SETTINGS toggle on").
Source: `app/src/store/sports.ts:230` `sportCount >= 2 && setting`; the toggle is
`showSportPillOnRecord`, default `true`, labelled "Sport picker on RECORD" in
`app/src/ui/settings.tsx:507–513`.

### 6a. `GLOSSARY.md` lines 25–26

Find:
```
time: switch it in SETTINGS → Sports, or with the pill row at the top of RECORD (which only
appears once you have two or more). A fresh install has no sports at all until you name one,
```
Replace with:
```
time: switch it in SETTINGS → Sports, or with the pill row at the top of RECORD (shown only
with 2+ sports and the SETTINGS "Sport picker on RECORD" toggle on — on by default). A
fresh install has no sports at all until you name one,
```
(The next line, `and RECORD says so instead of recording.`, is unchanged.)

### 6b. `HOW-THE-APP-IS-BUILT.md` lines 34–35

Find:
```
RECORD (set up → armed → running → the finish moment, with the live map; a sport pill row on
top once you have two sports; the naming card at STOP for a ride between unknown places),
```
Replace with:
```
RECORD (set up → armed → running → the finish moment, with the live map; a sport pill row on
top with 2+ sports and the SETTINGS toggle on; the naming card at STOP for a ride between
unknown places),
```

---

## 7. I6 — `README.md` line 33

Verified: all five `briefs/*.md` open with "Written 2026-08-31".

Find:
```
├── briefs/              Legacy: the five 2026-09-01 briefs from the branch cut. Every later
```
Replace with:
```
├── briefs/              Legacy: the five 2026-08-31 briefs from the branch cut. Every later
```

---

## 8. Verify, then commit

Run from `$HOME/mnt/Qualifire`:

```
# anchors gone / new text present
grep -n "doesn't yet score" GLOSSARY.md                       # expect no output
grep -n "hasn't changed since" HOW-THE-APP-IS-BUILT.md         # expect no output
grep -n "unchanged since 2026-08-14" STATE.md                  # expect no output
grep -n "mockup vs. app" app/README.md                         # expect no output
grep -n "2026-09-01 briefs" README.md                          # expect no output
grep -n "624 exported rides\|Navigation" data/README.md        # expect no output
grep -n "once you have two" GLOSSARY.md HOW-THE-APP-IS-BUILT.md  # expect no output
grep -n "Housekeeping" OPEN-ITEMS.md STATE.md                  # expect >= 3 hits (skip if §4 was skipped)
for f in GLOSSARY.md HOW-THE-APP-IS-BUILT.md STATE.md OPEN-ITEMS.md README.md app/README.md data/README.md; do printf "%s CRLF=%s\n" "$f" "$(grep -c $'\r$' "$f")"; done   # all 0

# suite + types (baseline on this tree, measured 2026-09-08 07:55 UTC: 560 / 557 / 0 / 3, tsc exit 0)
cd app && node --experimental-strip-types tests/run.ts 2>&1 | tail -2 && ./node_modules/.bin/tsc --noEmit; echo "tsc exit $?"; cd ..

# only the named files changed by THIS round (the other session's files will still show — leave them)
GIT_OPTIONAL_LOCKS=0 git status --porcelain
```

Commit — named paths only:

```
GIT_OPTIONAL_LOCKS=0 git add GLOSSARY.md HOW-THE-APP-IS-BUILT.md STATE.md OPEN-ITEMS.md README.md app/README.md data/README.md cycles/virgin-cycle5/BRIEF-fixes-round2.md
GIT_OPTIONAL_LOCKS=0 git commit -m "virgin-cycle5 round 2: Inspect fixes — parity claim, Lock entry, data/README, commit-status flags" -m "Round-2 fixes after the fresh-context Inspect of eeab73f:
- GLOSSARY: Lock entry now matches the engine (a soft lock is displayed AND scored, just not yet corridor-confirmed as leader); sport pill-row condition = 2+ sports AND the SETTINGS toggle
- HOW / STATE: 'engine unchanged since 2026-08-14' replaced with what PARITY.md records — measured 08-14, three small non-arithmetic core commits since (072830c, 90f7f68, fa0e3aa), not re-measured, not re-runnable from this branch
- data/README.md rewritten for virgin (only the two app-recorded test-ride folders exist here); app/README.md no longer points at the removed 'mockup vs. app' section
- STATE / OPEN-ITEMS: the 2026-09-08 seed-default flip is flagged as landed-in-tree-but-uncommitted (the cycle4 session owns that commit) with a Housekeeping item to clear the flags when it lands
- README: legacy briefs dated 2026-08-31, not 09-01
Suite 560 / 557 / 0 / 3, tsc clean, both re-run after the edits.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P5vBtptD73TGjBLu1nXkXK"
GIT_OPTIONAL_LOCKS=0 git log --oneline -2
```

If §4 was skipped because the other session committed first, drop the STATE / OPEN-ITEMS
bullet from the message and add one line saying the seed-default commit had already landed
(give its hash).

## 9. Report back

1. Per section 2–7: applied / skipped (with the reason from §4 if skipped).
2. The grep block output, the suite tail, the tsc exit code.
3. `git status --porcelain` before and after the commit, and the new commit hash.
4. Any STOP, verbatim: file, expected text, actual text.
