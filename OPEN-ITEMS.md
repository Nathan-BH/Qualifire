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
  and completed; seed default flipped to 'empty' (`09a0aa0`) — `cycles/virgin-cycle4/README.md`.
- virgin-cycle9 (2026-09-16, in progress): `settings.sectorColours` defaulted off
  (live-map/ride-detail/RIDES sector colouring, one-line chore, `54aae2d`) after Nathan's
  "too much colour" feedback; sector-strip redesign (four boxes -> thin F1-style bars,
  Nathan's own mockup) fully briefed, ready to execute —
  `cycles/virgin-cycle9/README.md`, `BRIEF-sector-strip-bars.md`, `QUESTIONSFORNATHAN.md`.
- virgin-cycle14 (2026-09-26): 8 tester-feedback briefs, all landed — auto day/night theme,
  post-ride REPLAY screen, SETTINGS reorder + renames, Luck-factor row removed, map credits
  folded into an "i" button, DEMO tab text cleanup + RESULTS scatterplot, RECORD button
  slogan. 638 -> 676 tests, `tsc` clean, one fresh Opus Inspect pass, no blocking defects —
  `cycles/virgin-cycle14/README.md`.
- virgin-cycle22 (2026-10-06, in the tree, uncommitted, not published): 8 briefs executed and inspected — one ACTIVITIES yellow line, no ‖ / "GPS live", readable tier text colours, time-only gate + finish flash (also DEMO/REPLAY), PNG map rung retired, single FIT/ME toggle, keep-screen-awake while riding — `cycles/virgin-cycle22/README.md`, `PROGRESS.md`; Nathan's publish + on-device checklist is `COMMANDS.md`.

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
   old pale-purple contrast bug is really gone (cycle2's code check found no trace);
   MAP-CONTRACT §4's acceptance sequence (pre-start pannable → moving locked/no labels →
   stopped identical to moving → finished released back to pannable); MAP-TILES §2's
   dead-zone check (does the ribbon still draw the last-ridden corridor with the radio off?).
   Never run formally — added here 2026-09-08 (virgin-cycle5 NW-2). Findings go in a
   `data/activities/TEST in virgin-app rides/` notes file, as before.
3. **Empty-state pass.** "0 rides found" and no lock on the first ride of a new route — what
   the blank Preview says and shows to a stranger before any history exists. Also check
   COLD-START F-2 while here (added 2026-09-08, virgin-cycle5 NW-2): a way's lap can colour
   while its busiest sector stays uncoloured, because sector history is clean-only while lap
   history isn't — the board should say why rather than looking inconsistent.
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
5. **virgin-cycle6 self-racing — on-device progression check (phone only).** The headless
   suite (`tests/selfrace_suite.ts`) proves the model; only a phone proves the feel of riding
   the incremental unlock. Checklist (verbatim from `BRIEF-live-self-racing.md` §Task 8):
   1. Blank install (or SETTINGS → DATA → Reset to virgin). Name a sport. Ride a short loop
      or any route; at STOP name the endpoints → way created, ride 1 = reference. **Expect:
      no self dots at any point of ride 1.**
   2. Ride 2 of the same way. **Expect: one purple dot** parked at the START gate until you
      cross it, then moving; it finishes where you finished last time.
   3. Ride 3. **Expect: two dots: one purple, one yellow or green depending on the mean;
      a `P1`/`P2` appears under the map once you cross START.** Confirm the purple one is
      the faster of the two (RESULTS tab ranks them).
   4. Keep going as convenient; at ride 11 **expect nine dots, never ten**.
   5. Toggle `selfDots` off mid-ride → dots vanish next frame; on → back within a second.
   6. Note anything about size/colour/opacity to adjust (R5 in `BRIEF-live-self-racing.md` is
      a starting point Nathan adjusts by eye, not a hard spec).
   7. Two dots overlapping: the faster one on top (`circle-sort-key`), rider always on top.
6. **virgin-cycle11 ranking reveal — on-device look (phone only).** Ride a way with ≥ 1
   prior ride; at STOP expect: lap time in neutral (no P, no colour) at the final gate; on
   STOP the tower with today parked at the bottom in plain ink; ~0.5 s later the climb; rows
   step down one by one; a hard colour + P<n> cut at landing; ~1.5 s hold; then the naming
   card beneath (Skip → reverse mark → ride detail). Ride 1 of a new way: no tower. Tune:
   `REVEAL_START_DELAY_MS`, `REVEAL_HOLD_MS`, `CLIMB_*` (`ui/rankingRevealModel.ts`),
   `STEP_W` (`ui/tower.tsx`), past rows coloured vs all-white (R3), lap-chip tier before
   STOP (R1). The DEMO tab (SECOND / TENTH RIDE, brief B) now previews the same reveal
   without riding — a preview of the animation, not a substitute for the real-ride check.
   The board now shows every ride in the pool (up to 10) — check a 10-ride way fits your
   screen without scrolling before the card appears.
7. **virgin-cycle11 DEMO overhaul — on-device look (phone only).** DEMO tab → FIRST RIDE →
   RUN: expect the tab bar to vanish, the map filling the top half course-up, the yellow
   trail, the status line, STOP; ~34 s later the roll-out and the 'Ride saved — m:ss.' screen
   with the naming card; type two names → CREATE ROUTE dims the button ~0.6 s → the
   'Sector gates — proposed' card with the demo's line and five seeded gates on the map;
   tap a gate, nudge it with the pad (hold to repeat), zoom the map → KEEP GATES (or SAVE
   GATES, which dims ~0.6 s) → one confirmation line naming kept/adjusted → the reverse
   mark → back to the chooser with the tab bar. Nothing is saved at either step. STOP
   before the line →
   straight back. SECOND RIDE / TENTH RIDE → after the roll-out: 'Ride saved.', the tower
   with today parked at the bottom in plain ink (all 10 rows on TENTH), ~0.5 s later the
   climb (0.8 s for SECOND, 2.0 s for TENTH), rows stepping down one by one, the hard colour
   + P<n> cut, ~1.5 s hold, then the 'New way on Home → Work' card beneath; add a spec →
   ADD WAY dims ~0.6 s → one confirmation line → the reverse mark. SETTINGS → sector colours
   ON/OFF, then DEMO → RUN: the map spans follow the toggle, the strip is coloured either
   way. Hardware back behaves like STOP. SECOND RIDE: one purple dot leaves START with you;
   you lead it through S1 and S2 (`P1` on the context row), it claws back 4 s in S3 (233 vs
   your 237), you pull away again in S4 and finish 6 s ahead. TENTH RIDE: nine dots; you lead
   the whole field through S1 and S2 (`P1`), then the 830 s and 835 s selves come past in S3
   (they cross G3 at 625 s / 629 s to your 629 s) — the context row drops to `P3` and stays
   there to the line; the other seven fall away behind; finished dots dim and park at FINISH.
   SETTINGS → SELF DOTS off, back to DEMO, RUN → no dots, `P` gone from the context row; on
   again → back (no restart needed). Judge size / opacity / stacking here first (cycle6 R5 is
   a starting point); the real-ride check in item 5 still stands. **Open (Nathan, item 9):**
   the demo redraws nine dots at ~30 fps where the real screen ticks at 4 Hz — if this
   stutters on the phone, say so; quantising to 250 ms is one line in `DemoScreen.tsx`.
   **Open (Nathan, item 13):** FIRST RIDE's naming card only ever shows the both-endpoints-unknown
   variant — say if you also want the start-known / end-known / loop variants reachable from
   the demo, and which script would drive each one.
8. **virgin-cycle14 — on-device pass (phone only), 8 features at once.** Nothing in this
   cycle has been seen on a phone yet. Per-feature checklists are each brief's own
   "On-device checklist" section (`cycles/virgin-cycle14/0N-*.md`); in short: the auto
   day/night schedule across a real clock boundary (01); the REPLAY screen end-to-end,
   especially on a small phone at 10x/25x — the on-device pass should also judge whether
   RESTART (a second full-width button, not the small pill the brief described) and the
   `10x` label (ASCII, not `×`) are fine as landed or worth a follow-up chore (02); the
   SETTINGS reorder/rename (03); the removed Luck-factor row + Reset app / reference rides
   copy (04); the map "i" button on every map surface, both themes (05); DEMO's new caveat
   line (06); RECORD's new slogan (07); the DEMO scatterplot in all three modes (08).
   **Open (Nathan):** three alert strings still say "reference line" on purpose
   (`RideDetailScreen.tsx`, `catalogDeleteActions.ts` x2) because "reference ride" would
   read wrong there — say if you want different wording, and what. **Open (Nathan):**
   replay's "no replay available" message names one specific cause (never crossed START)
   but also fires for a couple of others (missing ride file, unknown way) — worth a
   follow-up chore to disambiguate, or fine as a generic message?
9. **virgin-cycle15 — on-device pass (phone only), 15 features from one unattended session.**
   Nothing in this cycle has been seen on a phone. Each brief's own "On-device checklist"
   section is the authoritative per-feature list; full summary in
   `cycles/virgin-cycle15/README.md`. Worth extra attention: the way line no longer visibly
   cutting corners on tight bends, with the ride's own trace beneath it (07) — also watch for
   scrub-stutter during REPLAY (see STATE.md's GeoJSON re-serialization note); RESULTS's new
   route -> way grouping — most-used first, tapping into a multi-way route's way list, Back
   from a way's detail landing on the way list (not the route list), and that the route list
   actually scrolls past the first screenful (13); DEMO's SKIP landing on its own ending
   screen rather than a blank RESULTS tab (03); the "not this way?" correction link actually
   being reachable (05).

## Distribution (2026-09-09 pivot — see `deployment/`)

Nathan answered most of `deployment/rounds/round1/questions-and-rulings.md` on 2026-09-09; folded into
`STATE.md`'s ground rules. What that adds here:

- **Package rename to the clean `com.nathanbonher.qualifire` / "Qualifire"** (dropping
  "Preview") is decided, for the eventual Play listing. **Correction (2026-09-09, Q10):** no
  testers have a build yet — Nathan hasn't sent the APK/link to anyone — so the reinstall/
  history-loss cost of this rename lands only on **Nathan's own `.preview` phone**, not on
  testers. Cleanest order: do the rename before the first hand-off, so no one but Nathan ever
  sees the old package name. Item 4 (whole-app export/import) is still worth having before
  Nathan does that rename himself, so he doesn't lose his own ride history in the process.
- **Sentry crash reporting** (Q8, Nathan wants it) — a normal app work package, not deployment
  config: one new APK build, works the same for sideloaded and Play installs. Needs its own
  `cycles/` folder when picked up; not started.
- **Background location confirmed requested** (code check, 2026-09-09):
  `app/src/location/index.ts` uses `TaskManager` + `Location.startLocationUpdatesAsync`, and
  `app.json` sets `isAndroidBackgroundLocationEnabled: true` + `ACCESS_BACKGROUND_LOCATION`.
  This raises the cost of the Play route (prominent-disclosure copy, written justification,
  usually a demo video in review) — factored into `deployment/rounds/round1/review.md`.
- **Signing decided 2026-09-10:** Google generates the Play app-signing key (Q6); no keystore
  backup needed for the Play-signed key (Q7) — Play keeps its own copy. Nothing left open on
  distribution route or signing. Real remaining work, tracked in
  `deployment/rounds/round1/review.md` §0: a `play` EAS build profile, the background-location
  in-app disclosure UI (can ride along with the Sentry native build), a privacy policy page,
  the Play Console setup itself, and the written background-location justification for review.
- **Round 2 landed 2026-10-05 (`deployment/rounds/round2/`):** `scripts/publish-play.ps1` exists (never run; its step 0 stops until the `play` profile is back). The `play` profile in `app/eas.json` (store, `.aab`, channel `play`, `autoIncrement`, no `APP_VARIANT`) was drafted, then **backed out the same day**: inspection showed `eas.json` is hashed by the fingerprint, so it would have stopped preview OTAs reaching installed build 8. Draft kept in `deployment/rounds/round2/DEFERRED-eas.json-with-play-profile.json`. **Deferred to one native-build cycle** (adds the `play` profile back, (own `cycles/`
  folder; trigger = the next native build, i.e. Sentry): `app/fingerprint.config.js` (skip name +
  package, probably version, so `.preview` and Play hash the same), `app.json` version bump,
  Sentry, background-location disclosure UI, build `preview` + `play`, verify with
  `eas fingerprint:compare` that both fingerprints match, first manual `.aab` upload to the Play
  internal track, then add `-Promote` (`eas update:republish --destination-channel play`) to
  `publish-play.ps1` and the OTA loop becomes preview → check on phone → republish to `play`.
  Checklist: `deployment/rounds/round2/PLAN.md` §4. Optional, Nathan-only: download the `.preview`
  credentials once as a backup (`eas credentials`, interactive).

## Housekeeping (agent-side, no phone needed)

- **Git index corruption on the `virgin` branch, found 2026-09-26 during cycle14's commit,
  cause confirmed by Nathan same day.** HEAD's tree had silently shrunk to ~50 tracked
  files (vs. `origin/main`'s 513) — a Haiku subagent in an earlier session had run
  `pkill -9` on a stuck git process while it held lock files, corrupting the local index
  so git believed hundreds of real, on-disk, unchanged files were untracked. **Nothing was
  lost from disk** — this was a git-bookkeeping problem, not data loss. The cycle14
  coordinator commit (`401969a`) was scoped narrowly to only this cycle's own files to
  avoid compounding the problem. **Nathan is fixing the index himself (in progress as of
  2026-09-26).** Until it's confirmed fixed: don't run `git clean` or `git reset --hard`
  on this repo — under the corrupted tracking state those could delete files git
  (wrongly) considers disposable untracked clutter. See [[qualifire-model-tier-protocol]]
  memory for the standing rule this adds: never `pkill -9`/`kill -9` a git process stuck
  on a lock, even via device_bash — rename the lock file away instead (already the
  documented fix for stranded `.git/index.lock`/`.git/HEAD.lock` files).

- **Record build7's fingerprint in `scripts/OTA-TROUBLESHOOTING.md`** — the last cycle4 step
  per `cycles/virgin-cycle4/TOKEN-USAGE.md`, still not done (the seed-flip tail itself landed
  as `09a0aa0`).
- ~~**STATE.md's "no noise floor" rule is not what ships.**~~ **RESOLVED 2026-09-08 (NW-1).**
  `MIN_HISTORY` is now 1 (`app/src/ui/colourModel.ts`); the way's reference ride is neutral +
  ranked on the day it's ridden, one prior ride is purple/yellow-only, 2+ unlocks green.
  STATE.md's line updated to match. `marketing/index.html`'s noise-floor copy updated too.

## Parked (scoped, not urgent)

- **(cycle18, 2026-09-30) reference ride can be re-stored on the engine-scored way.** A reference
  ride with `referenceTimed === false` is still a step-1 backfill candidate in `ui/rideHomes.ts`
  and boot `initRideHistory`; a later settle could re-store it there. Fix when next touched:
  exclude any user way's `referenceRideId` from step-1 candidates in both paths (step 1b already
  times references on their own way).
- **(cycle18) ride-notification foreground-service match.** If expo-audio lock-screen controls
  are ever used during a ride, the notification module should also match the channel id ending
  `:qualifire-ride-tracking` (native change, needs a rebuild).
- **(cycle18) on-device checks pending** for all six briefs after the build7 rebuild; nothing
  from cycle18 is committed yet.

- **`design/` empty-state mockups (D4, virgin-cycle5).** `BRIEF-design-folder-plan.md` D4 —
  one mockup each for ROUTES/RIDES/RESULTS/RECORD-setup's zero-data state, now that the
  default install is `EXPO_PUBLIC_SEED_MODE=empty`. The brief's own recommendation: only worth
  building if Nathan is actively working on first-run UX; parked here rather than built on
  spec (2026-09-08).
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
- **virgin-cycle6 self-racing — answered 2026-09-14, folded in by
  `BRIEF-self-racing-followup.md`**; only the on-device look (yellow dot on the yellow line,
  P-number placement) remains Nathan's.
- ~~**Revert tier colours to cycle7's hex.**~~ **RESOLVED 2026-09-16 — actually
  executed** (`950a72e`, `cycles/virgin-cycle9/`). Reverted to cycle7's F1-broadcast hex
  (`#9000C8`/`#00D000`/`#F5C542`, `purpleDeep` `#65008C`), undoing cycle8's phone-matched
  picks — Nathan had already rejected those on phone testing 2026-09-15. (This coordinator
  first misread Nathan's "keep the current colours" as endorsing cycle8 and logged it that
  way; corrected the same session once he caught it.) His earlier, unspecified "I think we
  can use the colours in a better way" became concrete too: less colour on the live
  map/ride-detail/RIDES row (`sectorColours` defaulted off, `54aae2d`), a thin-bar
  sector-strip redesign (`f60b6d0`), and the sector-spans map layer's completion-triggered
  line-width bump removed (`eb8ad99`) — see `cycles/virgin-cycle9/`. Full log:
  `marketing/hex-colours/SUMMARY.md`.
- **Reduced-motion / haptic at landing for the ranking reveal (virgin-cycle11, R9).** Out
  of scope for the first build: no settings toggle for the reveal, no earcon/haptic at the
  landing cut (the reference animation's green chime has no in-app analogue yet), no
  reduced-motion handling for the tower.

- **virgin-cycle16 (2026-09-29) — "Save as free ride" isn't offered at the natural
  moment brief 02 described.** Brief 02's Goal says the choice appears "instead of a
  saved known or new route" right on STOP; in the landed code, RECORD's `RouteNamingCard`
  still shows first for an unmatched ride (Skip or Save), and only AFTER that does the
  ride-detail overlay offer "Save as free ride" on the resulting unnamed card. So the
  free-ride choice still works, it's just one extra Skip tap away from the moment Nathan
  will actually be looking at it. Flagged by the Opus Inspect pass on cycle16 groups
  01-04, not blocking (nothing is broken, on-device checklists just undersell the extra
  tap). Open question for Nathan/a fresh Fable: should `RouteNamingCard` on RECORD get its
  own "Save as free ride" exit alongside Skip/Save, so it's offered in one step?

- **virgin-cycle16 (2026-09-29) — brief 06's title/theme-pill spacing wasn't
  checked against the removed logo's width.** With the Q mark gone, the QUALIFIRE
  title is now the header's only flow child, roughly centred, sharing its row with
  the absolutely-positioned theme pill (top-right). Opus's Inspect pass on cycle16
  Group B estimated only ~10-15dp of clearance between the title's right edge and
  the pill on a 360dp-wide screen — not provably broken, but worth Nathan's eye on
  the on-device pass. If it looks cramped, a small `marginTop`/reflow on `appTitle`
  would fix it; that's a new call for Nathan/a fresh Fable, not something brief 06
  pre-resolved.

- **virgin-cycle16 (2026-09-29) — brief 07's "drag slider to the end" isn't
  literal at low speeds.** Demo's new scrub gesture is a relative jog ported
  byte-for-byte from Replay (`DEMO_SCRUB_S_PER_DP_PER_RATE`), not an absolute
  seek. At the 5x default rate, one full-width drag on a normal phone screen
  covers roughly 650 of the run's ~896 sim-seconds — it takes two drags to
  reach the end, not one, even dragging edge-to-edge. At 25x a small nudge
  ends it. Flagged by the Opus Inspect pass on cycle16 Group C; matches the
  brief exactly (it's a faithful Replay port) but the on-device checklist's
  "drag to the end ends the run" item may feel inconsistent at low speed.
  Open question for Nathan/a fresh Fable: keep the Replay-identical relative
  jog, or make Demo's scrub an absolute seek (knob position = fraction of
  endS) so "drag to the edge = end" is literal regardless of rate? The two
  screens would then differ in scrub feel even though they look identical.
- **virgin-cycle16 (2026-09-29) — brief 08's "lighter in day mode" landed as
  written but also dims the night-mode dots, and yellow-on-white contrast is
  worth a look.** Nathan asked for lighter dots specifically because day-mode
  black dots felt too strong; night mode wasn't part of the complaint. The
  brief (and the landed code) applies `t.textDim` to non-today dots in BOTH
  themes, which also dims night's dots from `t.text` (#F4F2EC) to `t.textDim`
  (#9a978f) — a change nobody asked for. Separately, theme.ts already notes
  the brand yellow (`t.accent`, #F5C542) has poor contrast on the white card
  background (~1.6:1, vs ~3.7:1 for the grey dots) — worth checking on-device
  whether "today's dot" is actually the easiest one to see or the hardest.
  Flagged by the Opus Inspect pass on cycle16 Group C, not blocking (matches
  the brief). Open question for Nathan: night mode too, or day-only? And does
  the yellow dot need a thin border/outline to read clearly on light mode?

- **virgin-cycle17 (2026-09-29) — TENTH RIDE's no-tap path never shows the results
  plot brief 02 assumed was "invisible in practice."** With the WP-G card gone from
  TENTH's default (no-tap) path, the cycle14 RESULTS-plot preview and "demo only ·
  nothing saved" line — gated only on `revealDone && plotResults !== null` — mount in
  the same tick as the end mark and flash through during its 250ms fade-out, then get
  swept away when the mark finishes. On the real screen only the tower ever shows during
  that fade. Flagged by the Opus Inspect pass on cycle17; not broken, just a design gap
  the brief didn't fully think through (its own Decision 4 called this "invisible in
  practice", which isn't quite right). Nathan's call: gate the plot out on TENTH's
  no-tap path too (one added condition) so it matches the real screen exactly, or add a
  short demo-only hold before the mark so the plot is actually visible if that's worth
  keeping as a demo nicety.
- **virgin-cycle17 (2026-09-29) — two small loose ends from cycle17, non-blocking.**
  (1) The new `demoModel.ts` test only pins `demoPostReveal`'s trivial mode->outcome
  mapping; the actual ordering logic (link vs. card vs. mark, and what a tap does) lives
  untested in `DemoScreen.tsx`'s component code. A fresh Fable could design a shared
  `endingSlotFor`-based test if `recordFlow.ts`'s `endingSlotFor` (which already takes a
  plain `offer: 'none'|'quiet'|'card'` value, not a store draft as brief 02 assumed) were
  reused by DEMO's own slot choice instead of parallel logic. (2) `RecordScreen.tsx` still
  has ~14 stale comments describing the post-ride mark as "reversed" (lines 163, 170,
  196-197, 208, 217, 221, 230, 428, 649, 651, 703, 842, 1192) — pre-existing since cycle15
  brief 15 actually landed the forward-mark change there, unrelated to cycle17's own edits
  (RecordScreen.tsx's diff for this cycle is empty). Purely cosmetic, worth a chore-sized
  cleanup pass whenever convenient.

- **virgin-cycle22 (2026-10-06) — open decisions / loose ends, non-blocking.** (1) RESOLVED 2026-10-06 (Nathan): REPLAY never flashes a missed sector (`– did not traverse –`); the clock just keeps running (`replayModel.ts`, one-line guard + test; suite 867/0 fail). (2) Brief 04 also changed DEMO/REPLAY lap behaviour (the LAP chip no longer stays; the lap flashes once, then the clock returns) — brief 08 builds on it; the brief-04 text saying DEMO/REPLAY don't change is wrong. (3) Run `publish-preview.ps1 -DryRun` (brief 07's keep-awake: expected no fingerprint drift; `build8.ps1` is the fallback). (4) Follow-up chores: drop the PNG rows from `metro.seedRedirect.js`/`seedstubs_suite.ts` and move `app/assets/ways/*.png` to `safe_to_delete/`; `virginmanifest_suite.ts`'s static guard passes vacuously (pre-existing); a stray `$HOME/wayMapView.c22-05.orig` sits outside the repo; daylight `accentText` is 3.13:1 on white (left for Nathan).
