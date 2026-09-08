# BRIEF — Root-doc cleanup (virgin-cycle5)

**Status: EXECUTION-READY. Written 2026-09-08 by the Plan tier (Fable) against the tree at
commit `03710eb` (branch `virgin`). One Sonnet Execute dispatch, one commit.**

**Nathan's standing instruction for this cycle (verbatim intent):** run fully autonomously —
never stop to ask him a question, never ask permission to delete (nothing is deleted; one file
is *moved* to `safe_to_delete/`). A genuine ambiguity is resolved from this brief, `STATE.md`'s
ground rules or `process/CONVENTIONS.md` and logged as `[ASSUMPTION]` in the report — except
an **anchor mismatch**, which is handled by §0.3 below (skip that one edit, report verbatim).

Six items, worked in order. §1 and §2 are whole-file replacements. §3, §4, §5 are anchored
edits (§4 is a whole-file replacement too — see its note). §6 is a file move. §7 is
verification + commit + report.

---

## 0. Executor rules and pre-flight

### 0.1 Rules
- Only the files named in this brief are touched: `GLOSSARY.md`, `HOW-THE-APP-IS-BUILT.md`,
  `STATE.md`, `OPEN-ITEMS.md`, `README.md`, `data/strava_export-20260814.zip` (moved), and
  the commit also includes `cycles/virgin-cycle5/` (this brief + `CONTEXT.md`).
- **Never edit** `IDEAS.md`, `CLAUDE.md`, anything under `Nathan/`, `app/`, `product/`,
  `process/`, `cycles/virgin-cycle1..4/`, `scripts/`. **The working tree carries another
  session's uncommitted work** (virgin-cycle4 tail, 2026-09-08 07:22 UTC: `app/src/store/seed.ts`
  default → 'empty', `app/tests/seedmode_pin.ts`, `app/tests/run.ts`, `app/app.config.js`,
  `app/README-dev.md`, `scripts/build7.ps1`, `scripts/dev-virgin.*` deleted to
  `safe_to_delete/`, `cycles/virgin-cycle4/*.md`, and **two hunks inside `STATE.md`**). Leave
  every one of those files exactly as it is and do NOT `git add` them — with one unavoidable
  exception: `STATE.md` is a single file, so when you `git add STATE.md` the other session's
  two seed-mode hunks (already accurate; this brief's S4/S12 are written on top of them) ride
  along in this commit. Say so in the report. Use `git add <path>` by name, never
  `git add -A` / `git add .`. If `git status` at commit time shows *yet more* unrelated
  changes, the same rule applies: named files only.
- Never delete anything. `mv` only. Never `rm`, never `git rm` without `--cached`.
- Every command on this mount: prefix git with `GIT_OPTIONAL_LOCKS=0`.
- Write files with a quoted heredoc (`cat > file <<'EOF'`) or an equivalent that does not
  expand `$`/backticks. The replacement texts below contain both.

### 0.2 Pre-flight (run first; a miss on a line marked STOP is a stop for the whole brief)
```
cd "$HOME/mnt/Qualifire"
GIT_OPTIONAL_LOCKS=0 git rev-parse --short HEAD          # expect 03710eb (a later commit is OK, note it)
GIT_OPTIONAL_LOCKS=0 git branch --show-current            # expect virgin — STOP otherwise
ls GLOSSARY.md HOW-THE-APP-IS-BUILT.md STATE.md OPEN-ITEMS.md README.md CLAUDE.md IDEAS.md
ls data/strava_export-20260814.zip safe_to_delete cycles/virgin-cycle5/CONTEXT.md   # all must exist — STOP otherwise
ls demos 2>&1                                              # expect "No such file" (the mockup is NOT on this branch)
ls app/src/store/routeCreation.ts app/src/ui/routeNamingCard.tsx app/src/store/sports.ts app/src/store/timing.ts app/tests/seedmode_pin.ts   # all must exist (WP-3/WP-1/WP-C + the 2026-09-08 seed-default change) — STOP otherwise
grep -n "export type Tab" app/src/ui/tabNav.tsx           # expect: 'record' | 'rides' | 'routes' | 'results' | 'settings' | 'demo'
grep -c "" STATE.md OPEN-ITEMS.md README.md                # expect 162 / 114 / 60 lines (a small drift is fine; a big one means the anchors below need re-checking)
```

### 0.3 Anchored edits — the matching rule
Every `FIND:` block in §3 and §5 is quoted from the live file as of 2026-09-08. Apply it as
an exact multi-line match (trailing whitespace at line ends may be ignored; nothing else).
If a FIND block does not match exactly: **do not apply that edit, do not "fix" the anchor,
do not guess** — leave the file otherwise edited, continue with the remaining edits, and put
the mismatch in the report with (a) the edit id, (b) the FIND text you looked for, (c) the
actual text at that spot. The coordinator routes it to a fresh Plan pass; you do not rule on it.

---

## 1. GLOSSARY.md — whole-file replacement

Overwrite `GLOSSARY.md` with exactly the text between the markers (not including the marker
lines). Facts verified on the device 2026-09-08: earcons still exist (`app/src/location/index.ts`
`setEarconsEnabled`, `ui/liveView.tsx`, `live/towerSource.ts`), so the entry stays; the live
engine's lock is on a **way** (`EngineStartOptions.wayIds`, `RecordScreen.tsx` `wayLocked`,
`LiveEngineState.lockKind` soft/verified, `phase === 'locked'`), so the entry is worded that way.

----- BEGIN GLOSSARY.md -----
# Glossary

**`virgin` branch — refreshed 2026-09-08 (virgin-cycle5).** Plain 1–3 sentence definitions,
no bare IDs. These are the words used in chat with Claude — if a term shows up in
conversation and isn't here, that's a gap worth flagging. Updated whenever the vocabulary
changes — see `process/CONVENTIONS.md` → "Nathan-facing docs."

**Two words swapped on 2026-09-06 (WP-3, virgin-cycle3):** "route" and "way" now mean the
opposite of what they meant before. Anything dated earlier — old briefs, old comments, the
`legacy-virgin` branch — uses the old meanings. The definitions below are the current ones.

**Route.** The from→to path between two landmarks — home to work, say — ridden in one
direction only. A route is the parent: it groups every way you've ridden it by.

**Way.** One particular way of riding a route — its own line on the map, its own gates, its
own history, ghosts and personal bests, and optionally a spec like "Dry" or "Fast". One route
can have several ways ("multiple ways to take the same route"). Everything that gets timed
and scored is tied to a way, not a route.

**Landmark.** A named place in your catalog — home, work, a station — that a route runs
between.

**Sport.** A category you name yourself — bike, e-bike, run, walk. Every landmark, route,
way, ride and result belongs to exactly one sport, and the app shows one *active* sport at a
time: switch it in SETTINGS → Sports, or with the pill row at the top of RECORD (which only
appears once you have two or more). A fresh install has no sports at all until you name one,
and RECORD says so instead of recording.

**Ghost.** The past version of yourself the app is comparing you against right now — your
own recent rides on that way, not a stranger and not a made-up number.

**Gate.** An invisible line drawn across the road at a fixed spot. The moment your GPS
trace crosses it, that's a timed event — the start, end, or boundary of a sector.

**Sector.** One stretch of a way between two gates. A ride's lap time is really four sector
times added together, and each one gets its own colour.

**Tier (purple / green / yellow).** How a sector's colour is decided. Purple beats the best
of your recent comparable rides on that way (the window is the last 9 plus today's). Green
beats their average. Yellow — the app's neutral, default colour — just means the sector
happened, honestly reported: not a warning, not a failure. Gate markers themselves never
change colour; only sectors do.

**Tower.** The live scoreboard that lists every sector's time and colour as it happens,
mid-ride — built to be readable at a glance, like a race timing tower.

**Reference ride.** The ride a way's official line and gates are built from. On a blank
install the first ride you save on a new route becomes its way's reference automatically;
the gates are seeded from it at 25/50/75 % of the distance and you can nudge them.

**Lock (soft / verified).** The moment the live engine decides which way you're actually
riding, out of every way it was watching. Before lock it's still narrowing candidates. A
*soft* lock shows that way on screen but doesn't yet score against it; once you've covered
enough of that way's corridor it becomes *verified*, and sector colours and the tower are
tied to it. A verified lock never switches. A free ride never locks.

**Free ride ("new>>new").** A ride whose start and end match no landmark you know. The app
records it and shows nothing to compare against — no reference line, no colours — and at
STOP offers to name the two places, which turns the ride into a real route + way with that
ride as its reference.

**Results board / scatterplot.** The RESULTS tab: a board of your ways, most-ridden first;
tap one for its all-time ranked history (fastest first) and a plot of your last nine rides
on it — faster is higher, each dot purple/green/yellow against the window's average.

**Timing mode (raw vs. moving).** *Raw* is wall-clock time from gate to gate — red lights
count, luck counts. It's the default. *Moving* removes the time you spent stopped. SETTINGS →
Timing; colours, ranks and the tower all follow whichever is set.

**Earcon.** A short sound the app plays instead of a visual alert, so you don't have to
look at the phone while riding — one buzz, distinct tones for distinct meanings.

**Fix.** One GPS reading — a single point (with a timestamp, position and accuracy) in the
stream location hands to the engine. An internal diagnostics word; it doesn't appear in the
app.

**GPX and GPX+.** GPX is the standard file format for a GPS track — most fitness apps can
read it. GPX+ is the same file with an extra block of diagnostic information bolted on (gate
times, lock, GPS outages) — useful for troubleshooting, never used for the actual timing.
Shared per ride from RIDES; SETTINGS → DATA can also share the catalog and reference-line
files ("debug export") so a problem can be looked at off the phone.

**Paddock vs. race mode.** Two visual moods the app switches between automatically. Paddock
is the everyday browsing look (warmer, livelier) for RIDES, ROUTES, RESULTS, SETTINGS. Race
is what RECORD switches to once you're riding — near-black or bright white depending on
your theme, chrome stripped away, so nothing but the numbers and colours competes for your
glance.

**The store.** The part of the app (`app/src/store`) that holds your catalog — sports,
landmarks, routes, ways, gates — plus every ride's derived results. When someone says "the
store," this is what they mean.

**Reset to virgin.** SETTINGS → DATA. Moves the phone's entire Qualifire storage folder
aside to a timestamped sibling (nothing is deleted), keeps your theme and settings, and
starts the app again empty. Refused while a ride is recording; two-step confirm.

**Dev client vs. build.** The dev client streams the latest code from the PC to your phone
over WiFi — most changes show up in a second or two, no reinstall. A "build" is a real new
install (APK) — only needed when something native changes, like the map.

**Preview (the blank-seed build).** "Qualifire Preview" is the standalone APK that runs
without the PC. Since build 7 it is permanently blank on first launch — no sports, no
places, no routes, nobody's data — which makes it the install you hand to someone else.
The dev client is blank by default too; Nathan's own Leuven data only appears when he
opts in with an environment flag before starting it.

**`legacy-virgin`.** A git branch frozen at the last commit before WP-3 swapped "route" and
"way" (2026-09-06). Old names, old export format, old seed files — check it out if the
old shape is ever needed. `main` is a separate, older freeze: the original archive-powered
personal app.
----- END GLOSSARY.md -----

---

## 2. HOW-THE-APP-IS-BUILT.md — whole-file replacement

Overwrite `HOW-THE-APP-IS-BUILT.md` with exactly the text between the markers.

----- BEGIN HOW-THE-APP-IS-BUILT.md -----
# How the app is built

**`virgin` branch — refreshed 2026-09-08 (virgin-cycle5).** One page, no code names left
unexplained. Kept up to date whenever the structure below changes — see
`process/CONVENTIONS.md` → "Nathan-facing docs." The story of *how* each part got here is in
`cycles/<name>/README.md`, not on this page.

The app folder (`app/`) has a handful of working parts, each doing one job.

**The engine** (`app/core`) is the pure timing brain. It takes a stream of GPS points,
projects them onto a way's line, detects gate crossings, and computes sector and lap times.
It has no idea about phones, screens, or storage — just numbers in, numbers out. It was
proven on `main` against the 624-ride Strava archive (same input, same answer, every time);
that archive and its tooling stay on `main`, but the engine code hasn't changed since
2026-08-14, so the proof still applies to what runs here.

**Location** (`app/src/location`) talks to Android's GPS in the background (a foreground
service, so it keeps running with the screen off) and hands each fix to the engine as it
arrives. It also plays the earcons.

**Storage** (`app/src/storage`) writes every ride's raw GPS to disk, append-only, forever —
"raw is truth": what actually happened is never edited, only ever added to; a schema change
gets a migration, never a rewrite. It also does the GPX and GPX+ export. "Reset to virgin"
(SETTINGS → DATA) moves the whole storage folder aside rather than deleting it.

**The store** (`app/src/store`) is the app's memory. It holds your sports and, for the
active sport, the catalog — landmarks, routes, the ways on each route, and each way's gate
positions — plus the derived per-ride results (lap and sector times) that ghosts and colours
are computed from, and the timing-mode rule (raw vs. moving) every score goes through. The
store starts genuinely empty everywhere — Preview, dev client, all of it — unless Nathan
opts his own Leuven seed back in with an environment flag on the dev client.

**The UI** (`app/src/ui`) is what you actually see: six tabs across the bottom —
RECORD (set up → armed → running → the finish moment, with the live map; a sport pill row on
top once you have two sports; the naming card at STOP for a ride between unknown places),
RIDES (your ride history; tap a ride for its detail screen with the sector-coloured trail),
ROUTES (your places and routes; tap one for a full-screen detail where ways can be inspected,
their gates edited on a real zoomable map, or deleted), RESULTS (a board of your ways,
most-ridden first; tap one for its ranked history and last-nine-rides scatterplot),
SETTINGS (sports, timing mode, theme, data: debug export and reset), and DEMO (an
accelerated replay of one frozen commute so the race-mode screen can be checked without
riding).

**The live engine** (`app/src/live`) is what runs *while you're riding*: it watches your
GPS fixes against every way in the catalog at once, works out which one you're actually on
(leaning on whichever you picked, but never fooled by a pick that turns out wrong — first a
soft lock, then verified once enough of the way's corridor is covered), and fires gate events
as you cross them — which is what makes the sector colours appear mid-ride instead of only at
the end. A free ride between unknown places is recorded but never locks or scores.

**Dev client vs. build.** Day to day, Nathan's phone runs a "dev client" — it streams the
latest code straight from the PC over the same WiFi (this is "Fast Refresh"), so most changes
show up within a second or two, no reinstall needed. A "build" — a real new APK — is only
needed when something *native* changes, like the map module. The standalone build is
"Qualifire Preview": it runs without the PC, and since build 7 (virgin-cycle4) it is
permanently blank on first launch — no sports, no places, nobody's data — so it is the
install a stranger gets. Build scripts live in `scripts/` and run on Nathan's PC.
----- END HOW-THE-APP-IS-BUILT.md -----

---

## 3. STATE.md — anchored edits (S1 … S12, apply in order)

Do not rewrite the file. Each edit is FIND → REPLACE per §0.3. Line numbers are as of
2026-09-08 and are for orientation only — match on text.

### S1 — header (lines 3–6)
FIND:
```
**Single source of truth for current status.** Rewritten 2026-08-31 when this branch was
cut from `main` — everything below is current as of that cut plus the work landed on it
since. Keep this short; when it drifts from reality, rewrite it, don't patch around the
drift.
```
REPLACE:
```
**Single source of truth for current status.** Rewritten 2026-08-31 when this branch was
cut from `main`; last refreshed 2026-09-08 (virgin-cycle5) against everything landed through
virgin-cycle4. Keep this short; when it drifts from reality, rewrite it, don't patch around
the drift. Cycle-by-cycle narrative lives in `cycles/<name>/README.md`, not here.
```

### S2 — insert the vocabulary/data-model section (before line 25)
FIND (a single line, unique in the file):
```
## Where the app actually is
```
REPLACE:
```
## Vocabulary and data model (since virgin-cycle3, 2026-09-06)

- **Route = the from→to path between two landmarks (parent). Way = one named variant of
  riding that route (child).** Swapped by WP-3: `Route {id, startLandmarkId, endLandmarkId,
  loopDiscriminator?, wayIds, sportId?}`, `Way {id, routeId, refLineId, gateSetVersion,
  seeded, referenceRideId?, specs?}`. Gate sets, results, reference lines and the live
  engine's candidates are all keyed by **way**. `CATALOG_SCHEMA_VERSION` and
  `RESULT_SCHEMA_VERSION` are 2, with a read-side key rename for v1 files. Id VALUES never
  changed: ids minted before WP-3 keep their old prefixes (a `way:<rideId>` id may be a
  Route, a `route:<rideId>` id may be a Way); new mints use the correct prefix. Anything
  written before 2026-09-06 — briefs, comments, the `legacy-virgin` branch (frozen at
  `befb6b0`) — uses the old meanings. The browse tab is still called ROUTES.
- **Sports (WP-1):** user-named, zero seeded — a fresh install has no sport until the rider
  names one, and RECORD blocks with a message until then. One global "active sport"
  (`store/sports.ts`, `store/sportStore.ts`, `store/sportSwitch.ts`); landmarks, routes, ways,
  rides and results carry a `sportId` and are filtered by it (tag-and-filter over the single
  stores, not per-sport storage roots). Switch in SETTINGS → Sports, or the pill row at the
  top of RECORD (shown only with 2+ sports and the SETTINGS toggle on). Sports are fully
  separate: no way, ghost or best ever crosses a sport boundary.

## Where the app actually is
```

### S3 — code/tests bullet (lines 27–32)
FIND:
```
- **Code:** `app/core/` (timing engine, parity-proven), `app/src/live/` (full-catalog
  pick-bias engine), `app/src/store/` (catalog + results, **now empty-seed-capable** — see
  below), `app/src/ui/` (six tabs: record/rides/routes/result/settings/demo).
  `app/tests/`: **302 tests, 299 pass, 0 fail, 3 skip**. `tsc --noEmit`: clean, exit 0.
  Both verified on this branch 2026-08-31 (nothing in `app/` changed by the branch cut
  itself).
```
REPLACE:
```
- **Code:** `app/core/` (timing engine — parity-proven on `main` against the 624-ride
  archive; unchanged since 2026-08-14, so the proof still applies), `app/src/live/`
  (full-catalog pick-bias engine; candidates are ways), `app/src/store/` (sports + catalog +
  results + timing, empty-seed-capable — see below), `app/src/ui/` (six tabs:
  RECORD / RIDES / ROUTES / RESULTS / SETTINGS / DEMO). `app/tests/`: **560 tests, 557 pass,
  0 fail, 3 skip**. `tsc --noEmit`: clean, exit 0. Both verified 2026-09-08.
```
(If §7's test run gives a different total, put the real number here and say so in the report.)

### S4 — seed-mode bullet: add sports to the blank-catalog list (line 39)
The surrounding paragraph was rewritten by the concurrent cycle4 session on 2026-09-08
(default seed is now 'empty'; `dev-virgin` scripts retired). Only one line changes.
FIND (single line):
```
  genuinely blank catalog: 0 landmarks, 0 ways, 0 routes, 0 ghosts. The Leuven seed is
```
REPLACE:
```
  genuinely blank catalog: 0 sports, 0 landmarks, 0 routes, 0 ways, 0 ghosts. The Leuven seed is
```

### S5 — retroactive-creation bullet (lines 46–52)
FIND:
```
- **Retroactive way creation + ride-1-as-reference is built.** Record a ride whose start/end
  don't match any known landmark, and a naming card offers to name them at STOP; on save it
  creates the landmark(s) (reusing/shrinking around existing ones, handling loops), a `Way`,
  a `Route`, and marks that ride as the route's reference (`Route.referenceRideId`). Skipping
  the card writes nothing; the ride itself was already saved beforehand either way.
  `store/wayCreation.ts` (the pure draft/build logic) + `ui/wayNamingCard.tsx` (the card) +
  `RecordScreen.tsx`'s `onEnd` flow.
```
REPLACE:
```
- **Retroactive route creation + ride-1-as-reference is built.** Record a ride whose start/end
  don't match any known landmark, and a naming card offers to name them at STOP; on save it
  creates the landmark(s) (reusing/shrinking around existing ones, handling loops), a `Route`,
  a `Way`, and marks that ride as the way's reference (`Way.referenceRideId`). Skipping the
  card writes nothing; the ride itself was already saved beforehand either way.
  `store/routeCreation.ts` (the pure draft/build logic) + `ui/routeNamingCard.tsx` (the card)
  + `RecordScreen.tsx`'s `onEnd` flow. (Built 2026-08-31 as "way creation"; renamed by WP-3.)
```

### S6 — save-flow gates bullet (lines 53–66)
FIND:
```
- **Save-flow gates + real reference line are built (2026-08-31).** The reference ride's raw
  GPS fixes now build a real `RefLine` (filtered, resampled, smoothed) persisted to a new
  `refs.user.json`; `live/refs.ts`'s `refFor()` falls back to it, so a freshly-created route
  is drawable/raceable, not just structurally present. Four sector gates seed at exact
  25/50/75% chainage quantiles, nudged (≤±250 m) toward the nearest point ≥150 m clear of
  wherever the reference ride itself sat stationary ≥20 s — a zero-network proxy for
  traffic-signal avoidance, since there's no real intersection data source wired in yet. Every
  seeded `GateSet` is honestly flagged `origin: 'geometric'` (never `'measured'` — see Known
  stubs). A tap-then-nudge adjustment card (`ui/gateAdjustCard.tsx`, per
  `product/proposals/SETUP-UX.md` §4) lets Nathan move any of the 3 sector gates before
  confirming; confirming mints `gateSetVersion` 2. `store/gateSeeding.ts` (pure seeding logic)
  + `live/userRefs.ts` (ref persistence) + `ui/gateAdjustModel.ts`/`gateAdjustCard.tsx` +
  `RecordScreen.tsx` wiring. Three briefs, independently inspected: PASS WITH FINDINGS, all
  non-blocking (see Known stubs).
```
REPLACE:
```
- **Save-flow gates + real reference line are built (2026-08-31; card redesigned in cycle2).**
  The reference ride's raw GPS fixes build a real `RefLine` (filtered, resampled, smoothed)
  persisted to `refs.user.json`; `live/refs.ts`'s `refFor()` falls back to it, so a
  freshly-created way is drawable/raceable, not just structurally present. Four sector gates
  seed at exact 25/50/75% chainage quantiles, nudged (≤±250 m) toward the nearest point
  ≥150 m clear of wherever the reference ride itself sat stationary ≥20 s — a zero-network
  proxy for traffic-signal avoidance. Every seeded `GateSet` is honestly flagged
  `origin: 'geometric'` (never `'measured'` — see Known stubs). Gate adjustment is
  tap-then-nudge (per `product/proposals/SETUP-UX.md` §4) on a real zoomable map with
  long-press-to-repeat, start/finish gates adjustable too; the same full-screen surface edits
  the gates of an already-saved way from ROUTES (cycle2 WP-I/WP-J). Confirming mints a new
  `gateSetVersion`. `store/gateSeeding.ts` + `live/userRefs.ts` + the gate-adjust UI +
  `RecordScreen.tsx` wiring.
```

### S7 — replace the "On the phone" bullet with cycle2/cycle3 summaries + the build7 outcome (lines 79–80)
FIND:
```
- **On the phone:** the dev client (Fast Refresh) and the rebuildable "Qualifire Preview"
  standalone APK; a `virgin` EAS build profile now exists but hasn't been built yet.
```
REPLACE:
```
- **Cycle2 landed (2026-09-05, 13 WPs — `cycles/virgin-cycle2/README.md`):** RECORD
  trail/route-match 3-state rule (WP-A), gate-placement chronological-order fix (WP-B;
  prevention "Part C" deferred), raw-time scoring default implemented (WP-C,
  `store/timing.ts`, SETTINGS → Timing), GPS teleport-guard hole closed (WP-D), gate ticks no
  longer recolour (WP-E), tier-colour dedupe (WP-F), way-creation polish + tests (WP-G), gate
  editing on saved ways (WP-I), gate-adjust card on a real map (WP-J), ROUTES tap →
  full-screen place/route detail (WP-K, `CatalogDetailScreen.tsx`), "AI clutter" strings
  removed + SETTINGS tap-to-reveal "?" (WP-L), two-finger map rotation (WP-M).
- **Cycle3 landed (2026-09-06 — `cycles/virgin-cycle3/README.md`):** way/route inversion
  (WP-3, `1773a03`), multi-sport (WP-1, `c597193` / `dce0f83` / `66837b9`), **RESULTS tab**
  (WP-2, `e527b6f` … `ff2fb74`): per-way board (most-ridden first) → tap a way → all-time
  ranked history (fastest first, no tier colours, provisional per "build it, refine later") +
  a last-9-rides scatterplot (faster = up, purple/green/yellow vs the window average,
  hand-rolled Views, no `react-native-svg`). Replaces the old single-ride "Result" tab.
- **On the phone:** the dev client (Fast Refresh — blank by default since 2026-09-08,
  Nathan's Leuven seed only with `EXPO_PUBLIC_SEED_MODE=shipped`), and the rebuildable
  "Qualifire Preview" standalone APK. **Build7 (virgin-cycle4) rebuilt Preview in place as a
  permanently blank-seed install** (`EXPO_PUBLIC_SEED_MODE=empty` on the `preview` profile)
  and re-anchored its OTA fingerprint, which had drifted since build 6 and silently blocked
  `publish-preview.ps1`. A separate "Qualifire Virgin" app with its own package id was
  designed first and rejected by Nathan; the `virgin` EAS profile and `app.config.js` branch
  are dormant leftovers, deliberately untouched. Dry run clean 2026-09-06; **the real EAS
  build was run by Nathan and completed** (reached build4's post-success "Done." block).
  Whether build7 is installed on the phone and confirmed blank on first launch is not
  recorded anywhere — UNVERIFIED; see `OPEN-ITEMS.md` item 1. Details:
  `cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md`.
```

### S8 — ground rules, scoring bullet (lines 96–100)
FIND:
```
- **Scoring:** three colour tiers (purple/green/yellow), F1 palette. No noise floor: a
  route's first-ever ride logs all-purple sectors (you can't have lost to anyone yet); one
  prior ride compares purple/yellow; two or more run the full model on the average of rides
  on record. The ranking window is the 9 most recent previous rides plus the current one —
  never a global ranking, never "of 11".
```
REPLACE:
```
- **Scoring:** three colour tiers (purple/green/yellow), F1 palette. No noise floor: a
  way's first-ever ride logs all-purple sectors (you can't have lost to anyone yet); one
  prior ride compares purple/yellow; two or more run the full model on the average of that
  way's rides on record. The ranking window is the 9 most recent previous rides plus the
  current one — never a global ranking, never "of 11".
```

### S9 — ground rules, sectors bullet (lines 101–105)
FIND:
```
- **Sectors:** every route has exactly 4, gates at 25/50/75% of route distance — never
  scaled by route length. Gates snap away from traffic-signal-controlled intersections
  (≥150 m clear) since a gate at a red light corrupts that sector's times. Adjustment UI is
  tap-then-nudge with ± buttons, never finger-dragging (thumb covers the line).
  Start/end gates sit at 1%/99% of route distance by default.
```
REPLACE:
```
- **Sectors:** every way has exactly 4, gates at 25/50/75% of the way's distance — never
  scaled by length. Gates snap away from traffic-signal-controlled intersections
  (≥150 m clear) since a gate at a red light corrupts that sector's times. Adjustment UI is
  tap-then-nudge with ± buttons (long-press repeats), never finger-dragging (thumb covers
  the line). Start/end gates sit at 1%/99% of the way's distance by default, adjustable.
```

### S10 — ground rules, timing bullet (lines 106–107)
FIND:
```
- **Timing default is raw wall-clock time** (luck counts) — moving-time is opt-in. (The
  scoring/UI implementation of this default is still pending — see Open items.)
```
REPLACE:
```
- **Timing default is raw wall-clock time** (luck counts) — moving-time is opt-in via
  SETTINGS → Timing (`store/timing.ts`, `TimingMode = 'raw' | 'moving'`; colours, ranks and
  the tower all go through `scoredS()` — cycle2 WP-C).
```

### S11 — ground rules, add three settled rules after the map bullet (lines 110–111)
FIND:
```
- **The live ride screen shows a real map** (MapLibre + OpenFreeMap), heading-up, locked
  zoom, no pan/zoom while moving, route line + own position only.
```
REPLACE:
```
- **The live ride screen shows a real map** (MapLibre + OpenFreeMap), heading-up, locked
  zoom, no pan/zoom while moving, reference line + own position only.
- **Gate ticks never change colour** — sectors are coloured, gate markers stay neutral
  (Nathan's rule; cycle2 WP-E retired the last tier-coloured tick).
- **Sports are fully separate and none is pre-seeded** — the rider names them; a way, its
  ghosts and its bests never cross a sport boundary (Nathan's rulings, cycle3 WP-1).
- **A free ride ("new>>new", no known start/end) shows nothing and writes history** — no
  reference line, no comparison; the naming card at STOP can turn it into a route + way
  (Nathan 2026-09-04, cycle2 WP-A).
```

### S12 — Known stubs / footguns: replace the whole section body (lines 120–157)
FIND (from the first stub through the last, inclusive):
```
- ~~`catalogStore.ts`'s `initCatalogStore()` can throw on a malformed `catalog.user.json`~~
  — **fixed** with the retroactive-way-creation work: `recompute()` now runs inside the
  try/catch, reproduced-and-verified by inspection (a malformed file no longer throws, and
  `initRideHistory` still runs afterward).
- The seed mode is a **bundle-time** env constant. Since 2026-09-08 the default is
  'empty', so an `eas update` that forgets `EXPO_PUBLIC_SEED_MODE` now ships blank (the
  safe direction); the explicit `empty` in `eas.json` / `publish-preview.ps1` stays as
  belt-and-braces. Only `EXPO_PUBLIC_SEED_MODE=shipped` brings the Leuven seed back.
- ~~A new route's `refLineId` deliberately pointed at nothing resolvable~~ — **fixed**
  2026-08-31 by the save-flow-gates package: `refFor()` now falls back to a real `RefLine`
  built from the reference ride's own GPS track and persisted to `refs.user.json`.
- ~~`metresBetween` (`store/catalog.ts`) was a flat-earth approximation hardcoded at Leuven's
  latitude~~ — **fixed** 2026-08-31: uses the point pair's own mean latitude now, works
  anywhere on Earth (matches `ui/routeMapGeo.ts`'s `metresBetween`, which already did this
  correctly).
- **Gate placement is honestly `origin: 'geometric'`, never `'measured'`.** Sector gates snap
  away from where the *single* reference ride sat stationary — a real proxy, but a one-ride
  proxy, not real traffic-signal data. `product/proposals/ROUTING-AND-SEGMENTATION.md` §3's
  honesty clause reserves `'measured'` for a re-run on ≥5 real rides; that re-scoring isn't
  built. Also not built: §3's variable 3–6-sector-count algorithm — deliberately out of scope,
  the shipped ground rule (exactly 4 sectors, fixed 25/50/75%) is what's implemented.
- **`refs.user.json`'s boot-time read/write path is unit-tested (memory fs round-trip) but not
  yet verified on-device.** Same category as the retroactive-way-creation stubs below — owed
  an on-device pass.
- **No `expo-sharing` native module in the current dev client.** The new debug-export share
  buttons reuse the existing SAF/share-text mechanism instead of the native share sheet;
  works today, but is a slightly clunkier flow than a real "Share..." sheet would be. A future
  APK rebuild could add `expo-sharing` for the nicer flow.
- Two small, non-blocking findings from the same inspection: the way-naming card's loop
  copy always says "one new place" even when the loop starts at an existing landmark
  (cosmetic only); two matching-logic branches in `wayCreation.ts` (end-side sliver-reuse,
  both-endpoints-already-loop) are implemented correctly but not directly test-covered yet.
- DEMO replays its own frozen fixture (`src/ui/demoRouteFixture.ts`, Morning's geometry, no
  manifest import) via `RouteMapView`'s `asset` prop — the same on every build (WP-E,
  Nathan's Q6 ruling).
- Three empty directory shells survive from the branch cut (`cycles/`,
  `cycles/cycle-024-briefs/`, `cycles/cycle-025-briefs/`) — this mount denies `rmdir` on
  them the way it denies `unlink` on some files. Harmless; git doesn't track empty dirs.
  Clear them from Explorer whenever.
```
REPLACE:
```
- The seed mode is a **bundle-time** env constant (`EXPO_PUBLIC_SEED_MODE`). Since
  2026-09-08 the default is 'empty', so an `eas update` that forgets the variable ships blank
  (the safe direction); `eas.json`'s `preview` profile and `publish-preview.ps1` still set
  `empty` explicitly as belt-and-braces. Only `EXPO_PUBLIC_SEED_MODE=shipped` (dev client,
  and the headless test suite via `tests/seedmode_pin.ts`) brings the Leuven seed back.
  Build7's OTA-fingerprint re-anchor is what makes `publish-preview.ps1` usable again.
- **Gate placement is honestly `origin: 'geometric'`, never `'measured'`.** Sector gates snap
  away from where the *single* reference ride sat stationary — a real proxy, but a one-ride
  proxy, not real traffic-signal data. `product/proposals/ROUTING-AND-SEGMENTATION.md` §3's
  honesty clause reserves `'measured'` for a re-run on ≥5 real rides; that re-scoring isn't
  built. Also not built: §3's variable 3–6-sector-count algorithm — deliberately out of scope,
  the shipped ground rule (exactly 4 sectors, fixed 25/50/75%) is what's implemented.
- **`refs.user.json`'s boot-time read/write path is unit-tested (memory fs round-trip) but not
  yet verified on-device.** Owed an on-device pass — see `OPEN-ITEMS.md` item 2.
- **No `expo-sharing` native module in the current dev client.** The debug-export share
  buttons reuse the existing SAF/share-text mechanism instead of the native share sheet;
  works today, but is a slightly clunkier flow than a real "Share..." sheet would be. Not
  part of build7's scope; a later APK rebuild could add it.
- DEMO replays its own frozen fixture (`src/ui/demoRouteFixture.ts` — the geometry of
  Nathan's "Morning" commute baked in as a fixture, not seed data; no manifest import) via
  `RouteMapView`'s `asset` prop — the same on every build, blank-seed Preview included
  (cycle1 WP-E, Nathan's Q6 ruling).
- **`CatalogDetailScreen.tsx`'s `placeDetailFor` reads the unscoped catalog**, so a place's
  detail can list another sport's routes/ways (cycle3 WP-1 Inspect, non-blocking, confirmed
  real). Needs a product decision — split "list" scoping from "deletable" scoping — not a
  mechanical fix.
- **GPX+ export after WP-3:** two event-literal renames outside WP-3's scope affect the
  export of pre-WP-3 rides, and a few sub-attributes carry a minor v2 naming inconsistency
  (cycle3 WP-3 Inspect, both non-blocking, deliberately left as-is).
- **Gate-placement prevention ("Part C" of cycle2 WP-B) is deferred.** The landed fix derives
  fixes/metadata in chronological (`tUnixMs`) order; nothing yet stops a future write path
  from reintroducing on-disk-order dependence. The on-device GPX+ check against the
  WorkHomeWet/281e ride is still owed.
```

### S13 — cycle history footer (before the last section, line 154)
FIND (single line, unique):
```
## Nathan's own files (unmanaged by any agent)
```
REPLACE:
```
## Cycle history (pointers only)

- `cycles/virgin-cycle1/README.md` — 2026-09-04: delete/reset, sector-coloured trail,
  gate-card map scrub, ride detail screen, virgin manifest leak, and more (WP-A … WP-Q).
- `cycles/virgin-cycle2/README.md` — 2026-09-05: 13 WPs from Nathan's 09-03/09-04 test
  rounds plus the Parked list (WP-A … WP-M).
- `cycles/virgin-cycle3/README.md` — 2026-09-06: way/route inversion (WP-3), multi-sport
  (WP-1), RESULTS tab (WP-2).
- `cycles/virgin-cycle4/README.md` — 2026-09-06/08: build7 (blank-seed Preview + OTA
  re-anchor) — inspected, dry run clean, real build run by Nathan; then (2026-09-08) the
  seed default flipped to 'empty' and the `dev-virgin` scripts were retired.
- `cycles/virgin-cycle5/` — 2026-09-08: this root-doc cleanup (main-branch leftover vs.
  staleness); see its `CONTEXT.md` and `BRIEF-root-docs-cleanup.md`. Later cycles: add a
  line here when the cycle closes.

## Nathan's own files (unmanaged by any agent)
```

---

## 4. OPEN-ITEMS.md — whole-file replacement

`[ASSUMPTION — brief author]` The coordinator asked for a targeted edit but allowed a pointer
block to replace the DONE items "if you judge that reads better". Every section of the
114-line file changes (items 1–3 struck → pointers; 9 of 12 Parked items landed or were
superseded in cycle2/3 per `cycles/virgin-cycle2/README.md` and `CONTEXT.md`; the whole
"Needs Nathan" section is main-backlog carry-over). A whole-file replacement has fewer
anchors to mismatch than a dozen edits, so it is written as one. The text below is what the
file becomes; the one paragraph carried over verbatim is item 4's zip/import spec.

What was cut and why (for the Inspect pass — not to be written into the file):
- Parked "lineColourFor duplicates" → landed cycle2 WP-F `644cb04`.
- Parked "live gate ticks recolour" → landed cycle2 WP-E `d7e925b`.
- Parked "free-ride new>>new design" → ratified by Nathan's 2026-09-04 note, built by cycle2
  WP-A `064b6e2` (`cycles/virgin-cycle2/CONTEXT.md`).
- Parked "contrast bug" → cycle2 CONTEXT.md: code check found no trace, "recommend Nathan
  strike it"; folded into the on-device checklist (item 2) rather than dropped silently.
- Parked "GPS re-acquisition hole" → landed cycle2 WP-D `2fe0ede`.
- Parked "raw-time scoring default" → landed cycle2 WP-C `ed0a5fe`.
- Parked "two polish items from way-creation" → landed cycle2 WP-G `eaab0a4`.
- Parked "WP-I gate-adjust pad overflow" → superseded by cycle2 WP-J (card redesign).
- Parked "WP-G route-specs on the shipped seed build" → about `main`; Preview ships no seed.
- "Needs Nathan": on-device checks "waiting for a few cycles" (day-mode remount,
  footer-overlap, riderBlue, prestart preview) and the taste cluster (REF badge, quali-card,
  sector names) → main-backlog carry-over, no cycle README shows Nathan re-confirming any
  of them; battery A/B PNG-vs-MapLibre → answered by shipping MapLibre everywhere;
  route-naming triage (station/church/fosh) → Nathan's own seed catalog, not a blank-install
  item. IDEAS.md §29 (type a destination) is kept as a one-line Parked entry — it is a
  virgin-relevant product fork, not main leftover.

----- BEGIN OPEN-ITEMS.md -----
# Open items — Qualifire (virgin branch)

Short and curated toward one goal: a working prototype Nathan can hand to someone else.
Rewritten 2026-08-31 replacing the 152-item historical backlog (still on `main`'s
`product/BACKLOG.md`, unabridged — nothing was deleted, just not carried forward); reconciled
against `cycles/virgin-cycle1..4/` on 2026-09-08 (virgin-cycle5). Keep this list current:
strike items as they land, add new ones as they surface, don't let it grow back into what it
replaced. Vocabulary is post-WP-3: a route is the from→to path, a way is one variant of it.

---

## Landed so far — pointers only; the narrative lives in `cycles/`

- 2026-08-31 (branch cut): empty-seed install path; retroactive route creation +
  ride-1-as-reference; save-flow gates + real reference line; debug export. Briefs in
  `briefs/` (legacy location — every later cycle keeps its briefs in `cycles/<name>/`).
- virgin-cycle1 (2026-09-04): delete/reset, sector-coloured trail, gate-card map scrub, ride
  detail screen, virgin manifest leak and more — `cycles/virgin-cycle1/README.md`.
- virgin-cycle2 (2026-09-05): 13 WPs from Nathan's 09-03/09-04 test rounds plus most of the
  old Parked list — `cycles/virgin-cycle2/README.md`.
- virgin-cycle3 (2026-09-06): way/route inversion, multi-sport, RESULTS tab —
  `cycles/virgin-cycle3/README.md`.
- virgin-cycle4 (2026-09-06/08): build7 — Preview rebuilt in place as a permanently
  blank-seed install, OTA fingerprint re-anchored; dry run clean, real EAS build run by Nathan
  and completed; seed default flipped to 'empty' — `cycles/virgin-cycle4/README.md`.

## The virgin-prototype path, in order

1. **Build7 — install it and confirm the blank first launch.** The EAS build completed
   (Nathan, 2026-09-06/07). Not recorded anywhere yet: the APK installed on the phone, first
   launch showing no sports / no places / no rides, and an OTA publish via
   `publish-preview.ps1` landing on it. Nathan only.
   `cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md`.
2. **Nathan's on-device pass on the post-cycle3 app.** Nothing since the 2026-09-04 test
   round has been seen on a phone, and cycles 2 and 3 changed most screens. Checklist:
   the swapped route/way wording reads right everywhere (RECORD, ROUTES, RIDES, RESULTS, the
   naming card, both detail screens); create a sport, switch sports, the RECORD block message
   with zero sports; RESULTS board → tap a way → ranked history + scatterplot; the gate-adjust
   card on the real map (nudge, long-press repeat, start/finish gates) and gate editing on a
   saved way from ROUTES; `refs.user.json` survives an app restart; WP-B's GPX+ check on the
   WorkHomeWet/281e ride; overlapping gate tap-targets on an out-and-back ride; whether the
   old pale-purple contrast bug is really gone (cycle2's code check found no trace). Findings
   go in a `data/activities/TEST in virgin-app rides/` notes file, as before.
3. **Empty-state pass.** "0 rides found" and no lock on the first ride of a new route — what
   the blank Preview says and shows to a stranger before any history exists.
4. **Whole-app export/import.** Still parked as described below. A smaller debug-export exists
   (2026-08-31): SETTINGS → DATA shares `catalog.user.json` and `refs.user.json`, and per-ride
   GPX+ from RIDES carries rich session diagnostics — enough for "get today's state and one
   ride's trace off the phone for feedback" without the full machinery, which stays scoped for
   when a lost/replaced phone or a friend's setup actually needs it:
   Zip the catalog, ride-history store, free-ride cache, and settings into one file; a
   checkbox for whether to include raw ride recordings (they're append-only, so this can grow
   large — get a real size estimate before promising it); import is overwrite, not merge,
   gated behind an explicit confirm listing what dies plus an automatic pre-import backup of
   current state. Version-stamp both directions — refuse or migrate an unknown schema, never
   guess. This is what makes a lost/replaced phone, or handing your exact setup to a friend,
   survivable — separate from retroactive route creation, which is what lets a total stranger
   start from nothing.

## Parked (scoped, not urgent)

- **Real (OSM-signal-based) `'measured'` gate placement.** Today's sector gates snap away from
  the reference ride's own stops — a real but one-ride proxy, honestly flagged
  `origin: 'geometric'`. Getting to `'measured'` needs either a real traffic-signal data
  source (Overpass/OSM query, network + caching design) or the ≥5-clean-rides re-scoring
  `product/proposals/ROUTING-AND-SEGMENTATION.md` §3 describes. Geometric gates are usable now.
- **`expo-sharing` native module.** The debug-export share buttons work today via the existing
  SAF/share-text mechanism; a real native share sheet needs an APK rebuild to add the
  dependency. Deliberately not part of build7. Cosmetic/convenience upgrade only.
- **Overlapping gate hit-areas on an out-and-back ride.** Two gates at mirrored chainages can
  render on the same pixel; only the later-rendered tap target wins. The card has since been
  redesigned with a zoomable map (cycle2 WP-J), which may already resolve it — on the item 2
  checklist; fix only if it's still reproducible.
- **`placeDetailFor` is not sport-scoped** (`CatalogDetailScreen.tsx`): a place's detail can
  list another sport's routes/ways. Needs a product decision — split "what's listed" from
  "what's deletable" — before a code fix (cycle3 WP-1 Inspect, non-blocking).
- **GPX+ naming after WP-3.** Two event-literal renames outside WP-3's scope affect exports of
  pre-WP-3 rides; a few sub-attributes carry a minor v2 naming inconsistency (cycle3 WP-3
  Inspect, non-blocking, left as-is on purpose).
- **Gate-placement prevention (cycle2 WP-B "Part C").** The fix reads fixes in chronological
  order; nothing yet guards against a future write path reintroducing on-disk-order
  dependence.
- **Type a destination and race it (`IDEAS.md` §29).** Product fork, Nathan's call — would
  need a routing engine, and there is no maintained Expo binding for one.
----- END OPEN-ITEMS.md -----

---

## 5. README.md — anchored edits (R1 … R3)

### R1 — branch paragraph (lines 14–18)
FIND:
```
`virgin` branch (2026-08-31 onward, the primary line of work): a working-prototype-first
cut of the project. No named agent roles, no cycle ceremony — just Nathan, a chat, and the
model-tier pipeline in `process/CONVENTIONS.md`. The full archive-powered original (624-ride
GPX dataset, its analysis tooling, and the complete decision/backlog history) still lives on
`main`, untouched.
```
REPLACE:
```
`virgin` branch (2026-08-31 onward, the primary line of work): a working-prototype-first
cut of the project. No named agent roles and no ceremony — just Nathan, a chat, and the
model-tier pipeline in `process/CONVENTIONS.md`; work is grouped into `cycles/<name>/`
folders only so each batch's briefs and findings have one home. The full archive-powered
original (624-ride GPX dataset, its analysis tooling, and the complete decision/backlog
history) still lives on `main`, untouched. `legacy-virgin` is a second frozen branch: this
branch as it was before WP-3 swapped the words "way" and "route" (2026-09-06).
```

### R2 — directory tree: add `briefs/` and `cycles/`, fix the `data/` line (lines 30–32)
FIND:
```
├── app/                 What actually runs on the phone (React Native / Expo).
├── data/                Just data/activities/TEST in app rides/ — Nathan's own notes from
│                        app-recorded test rides. The full GPS archive stays on `main`.
```
REPLACE:
```
├── app/                 What actually runs on the phone (React Native / Expo).
├── briefs/              Legacy: the five 2026-09-01 briefs from the branch cut. Every later
│                        brief lives inside its cycle folder — nothing new goes here.
├── cycles/              One folder per work cycle (virgin-cycle1, 2, …): briefs, decisions,
│                        Inspect findings, token usage. Start with the newest README.md.
├── data/                data/README.md plus data/activities/TEST in app rides/ and
│                        TEST in virgin-app rides/ — Nathan's notes and exports from
│                        app-recorded test rides. The Strava GPS archive lives on `main` only.
```
(The last sentence is true once §6 has run — apply §6 in the same pass.)

### R3 — reading list (line 55)
FIND:
```
- What's actually left to build → `OPEN-ITEMS.md`
```
REPLACE:
```
- What's actually left to build → `OPEN-ITEMS.md`
- What just happened → the newest `cycles/<name>/README.md`
```

---

## 6. Move the Strava archive zip out of the branch

```
cd "$HOME/mnt/Qualifire"
ls -la data/strava_export-20260814.zip safe_to_delete/            # both exist (pre-flight)
mv data/strava_export-20260814.zip safe_to_delete/strava_export-20260814.zip
ls data/                                                            # expect: README.md  activities
GIT_OPTIONAL_LOCKS=0 git ls-files --error-unmatch data/strava_export-20260814.zip 2>&1
```
- If the last command prints the path (file is tracked): run
  `GIT_OPTIONAL_LOCKS=0 git rm --cached data/strava_export-20260814.zip` — this only
  untracks; the bytes are already in `safe_to_delete/`. Note in the report.
- If it says "did not match any file(s) known to git" (untracked): nothing more to do.
- `safe_to_delete/` is gitignored; do not `git add` anything inside it.
- `mv` may be refused by a Windows-side lock. If so: do not retry with `rm`/`cp`; leave the
  file where it is, **skip R2's last sentence edit** (keep R2's other lines: apply R2 with
  "The Strava GPS archive lives on `main` only." replaced by "The raw Strava export zip is
  still here pending a move to `safe_to_delete/` (locked on 2026-09-08)."), and report it.

---

## 7. Verify, commit, report

### 7.1 Verification (both must pass; neither should be affected by root-doc edits)
```
cd "$HOME/mnt/Qualifire/app"
node --experimental-strip-types tests/run.ts 2>&1 | tail -3      # expect "560 tests: 557 pass, 0 fail, 3 skip"
./node_modules/.bin/tsc --noEmit; echo "tsc exit $?"             # expect exit 0, no output
```
Baseline on 2026-09-08 (07:30 UTC, on the tree *including* the concurrent session's
seed-default change): 560 / 557 / 0 / 3, tsc exit 0. If the total differs, use the real
number in S3 and say so. Use the `--experimental-strip-types` runner and the local
`./node_modules/.bin/tsc` exactly as written (bare `npx tsc` can blow the call budget here).

### 7.2 Sanity greps on the finished docs
```
cd "$HOME/mnt/Qualifire"
grep -n "mockup\|cycle 02[0-9]\|the team" GLOSSARY.md HOW-THE-APP-IS-BUILT.md   # expect no output
grep -n "302 tests\|routes/result/\|hasn't been built yet\|directory shells" STATE.md   # expect no output
grep -n "WP-G route-specs\|battery A/B\|fosh\|REF badge" OPEN-ITEMS.md            # expect no output
grep -n "cycles/\|briefs/" README.md | head                                        # expect the new tree lines
```

### 7.3 Commit
```
cd "$HOME/mnt/Qualifire"
ls .git/index.lock .git/HEAD.lock 2>/dev/null && { mv .git/index.lock .git/index_lock_stale_$(date +%s) 2>/dev/null; mv .git/HEAD.lock .git/HEAD_lock_stale_$(date +%s) 2>/dev/null; }
GIT_OPTIONAL_LOCKS=0 git add GLOSSARY.md HOW-THE-APP-IS-BUILT.md STATE.md OPEN-ITEMS.md README.md cycles/virgin-cycle5/
# plus, only if §6 found the zip tracked: the `git rm --cached` above already staged its removal.
GIT_OPTIONAL_LOCKS=0 git status --short      # every unrelated dirty file listed in §0.1 must still show as unstaged (" M" / " D" / "??"), NOT staged; only the five root docs + cycles/virgin-cycle5/ (+ the zip's --cached removal, if any) are staged
GIT_OPTIONAL_LOCKS=0 git commit -m "virgin-cycle5: root-doc cleanup — main-branch leftover cut, docs refreshed through cycle4" -m "GLOSSARY.md and HOW-THE-APP-IS-BUILT.md rewritten as virgin-native (way/route inversion, sports, RESULTS tab, blank-seed Preview; mockup/team/old-cycle references dropped). STATE.md: test count, tabs, vocabulary section, cycle2/3 summaries, build7 outcome, stubs pruned, cycle history. OPEN-ITEMS.md reconciled against cycles 1-4; main-backlog tail cut. README.md: cycles/ and briefs/ in the tree, data/ line fixed. data/strava_export-20260814.zip moved to safe_to_delete/.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P5vBtptD73TGjBLu1nXkXK"
GIT_OPTIONAL_LOCKS=0 git rev-parse --short HEAD
```
If a stray lock file reappears after the commit, `mv` it aside the same way; never delete it.

### 7.4 Report (plain text, in this order)
1. Files changed (with whole-file vs. edited), the zip's final location, tracked/untracked.
2. Each anchored edit S1–S13, R1–R3: APPLIED or MISMATCH (with the verbatim FIND and the
   actual text, per §0.3).
3. Test line and tsc exit code, copied verbatim.
4. Commit hash.
5. Every `[ASSUMPTION]` you made, each in one line — anything not spelled out in this brief
   that you had to decide. Expected to be zero or near zero.

---

## 8. `[ASSUMPTION]` log — decisions made while writing this brief (for the Inspect pass)

- A1. OPEN-ITEMS.md is a whole-file replacement, not a targeted edit (see §4's note).
- A2. The struck `~~fixed~~` stubs in STATE.md (three from 2026-08-31, one polish pair landed
  by cycle2 WP-G) are removed rather than kept struck — the cycle READMEs and git history
  hold them; STATE.md's own header says "rewrite it, don't patch around the drift".
- A3. "Contrast bug" is not dropped outright but folded into item 2's on-device checklist,
  following cycle2 CONTEXT.md's own recommendation ("strike it, or flag on the next
  on-device pass").
- A4. IDEAS.md §29 ("type a destination") stays as one Parked line: it is a virgin-relevant
  product fork, not main-branch leftover. The rest of the "Needs Nathan" section is cut.
- A5. STATE.md's cycle1 bullet ("Delete and reset landed…", line 74–78) is left untouched
  although it names cycle1-era identifiers (`allRouteAssets()`, WP-C/WP-E): it is a dated
  attribution with a brief pointer, and rewriting it risks inventing post-WP-3 names I did
  not verify.
- A6. The "Cycle history" footer includes a line for virgin-cycle5 itself, pointing at
  `CONTEXT.md` + this brief, since the cycle's README does not exist yet.
- A7. The HOW-THE-APP-IS-BUILT sentence "Location … also plays the earcons" is based on
  `setEarconsEnabled` living in `app/src/location/index.ts`; the UI wording of the DEMO and
  SETTINGS tabs is paraphrased from cycle1 WP-O / cycle2 WP-L / cycle3 WP-1 outcomes, not
  from reading the screens.
- A8. `data/README.md` (dated 2026-08-24, likely describes the archive) is NOT in scope —
  root docs only. Flagged for a follow-up chore.
- A9. `cycles/virgin-cycle5/` (CONTEXT.md + this brief) is included in the commit so the
  cycle's record lands with the change it describes.
- A10. A concurrent session changed the tree while this brief was being written (2026-09-08
  07:22 UTC, uncommitted): seed default → 'empty', `dev-virgin` scripts retired, two
  STATE.md hunks, cycle4 README updated to "real build run by Nathan, completed". This brief
  was re-anchored against that tree (S4, S12) and its facts folded into S7/S13, OPEN-ITEMS
  item 1, the Glossary "Preview" entry and the HOW "store" paragraph. The other session's
  STATE.md hunks will ride along in this commit (unavoidable — same file).
- A11. Whether build7 is *installed* on the phone is not stated in any cycle4 file — written
  as UNVERIFIED in STATE.md and as OPEN-ITEMS item 1, not assumed either way.
