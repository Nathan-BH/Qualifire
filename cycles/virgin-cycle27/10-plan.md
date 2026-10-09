# virgin-cycle27 — Plan 10: ruling proposals + briefs for Nathan's parked ideas 1-10

Written by the Plan tier (Fable) 2026-10-08 ~01:40 UTC from `00-nathan-ideas.md` (every ruling, leaning and coordinator note), digests 01-09, `process/CONVENTIONS.md` § Rider-facing text, the standing design principles (nothing is a problem; never show the rider anything negative; minimal text; no banners), and spot-reads of every source line the briefs anchor on. **No app code was edited. Nothing here is executed** — execution is a later step Nathan approves; there are no COMMANDS / publish instructions in this cycle.

Working tree at plan time: HEAD `7f638ba`, with **virgin-cycle26 briefs 01 + 02 landed uncommitted** (cycle26 briefs 03 + 04 NOT yet landed — `wayMapView.tsx`, `gateSeeding.ts`, `userRefs.ts` are clean). Suite baseline run by me: **`940 tests: 937 pass, 0 fail, 3 skip`**. Every digest anchor I rely on was re-read; where a digest line number drifted (cycle26 brief 01 moved `RecordScreen.tsx` lines) the brief carries the current one — see §9.

Deliverables: this plan; `11-brief-*.md` (one per idea with a brief, 8+9 combined); `11-note-watch-glance.md` (idea 4, research note, no brief); `EXECUTOR-RULES.md` / `INSPECTOR-RULES.md` copied from cycle26 and adapted at the top for this cycle.

---

## 0. Standing rules every brief inherits

1. Nothing negative is ever shown to a rider: no warning, no banner, no explanatory sub-label, no quality word (missed / interrupted / estimated), no "no X". An odd case is a different, neutral kind of card.
2. Minimal rider text. No string is added unless the idea cannot be built without it; every added / changed / removed visible string is budgeted in the brief's `## Visible text` table and mirrored in `app/tests/ui-strings.allow.json` (append or edit at the sorted slot, one-line reason, `by: "Sonnet execute, virgin-cycle27 brief NN"`).
3. A brief is not a demo. Each brief says what Nathan will and will not see on his phone, and every change this cycle is **JS-only (OTA-publishable)**; nothing touches native code or the OTA fingerprint.
4. Stop-on-ambiguity: anchor mismatch, undecided call, unexpected test failure → the executor STOPS and reports verbatim. Decisions Nathan has not made are marked **BLOCKED UNTIL NATHAN RULES** inside the brief; the brief is written for my recommended option so it can run the moment he says "go with the recommendation".
5. Verification, every brief: `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL) and `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0), plus the brief's own acceptance greps; `git diff -- app/tests/ui-strings.allow.json` quoted in the report.

---

## 1. Idea 1 — RECORD picker: GOING TO follows STARTING FROM

**Ruling proposal.** When the START place changes (a tap, auto-detection, a sport switch, or the first render), GOING TO is set to the destination the rider has ridden to most often **from that start** — derived on the spot from stored results (`RideResult.wayId → Way.routeId → Route.start/end`), nothing new is persisted. Ties: the more recently ridden destination wins, then catalog order. A loop route (start = end) counts as the destination "loop" and selects the `loop` pill. If the rider has never ridden from that start, GOING TO is left exactly as it is today (no guess). Once the rider taps a GOING TO pill themselves, it stops following START until the next ride (or a sport switch). The way variant (Std/Alt) keeps today's rule (most ghosts). Pure functions in `store/landmarkUsage.ts`, the same module that already ranks the pills; one small effect in `RecordScreen.tsx`.

**Why.** Digest 01 (verified): a START tap never sets `to`; the highlighted GOING TO is whatever `to` was last (mount default = second landmark in CATALOG order, or the previous ride's destination). "Most ridden from here" is what Nathan described ("from Home, it should auto-highlight Work"); recency only breaks ties so a one-off trip never beats a daily commute. Following auto-detection too means the common case (phone in the Home disc → Home → Work) needs zero taps.

**On Nathan's phone:** opening RECORD with history → START = detected/first place, GOING TO already on his usual destination from there; tapping another START re-highlights its usual destination; he can still tap any GOING TO. **Not changed:** pill order (still most-used first), the `loop`/`new` pills, auto-detection, way pick, the armed/running screens, a fresh install (no history → unchanged behaviour), free rides.

**Open questions (menus).**
- Q1.1 What "most used" means — (a) **all-time ride count from this start, recency breaks ties** [recommended]; (b) the destination of the most recent ride from this start; (c) count, but only the last 90 days. 
- Q1.2 Should GOING TO follow an auto-DETECTED start change (no tap)? — (a) **yes, until the rider taps GOING TO** [recommended]; (b) only on an explicit START tap.
- Q1.3 No history from this start — (a) **leave GOING TO as it is** [recommended]; (b) pick the most-used place overall.
Brief is written for (a)/(a)/(a); Q1.2 is marked BLOCKED in the brief because it changes the effect's trigger.

**Size:** small (one store module + ~15 lines in RecordScreen + 6 tests). **Files:** `src/store/landmarkUsage.ts`, `src/ui/RecordScreen.tsx`, `tests/landmarkusage_suite.ts`, `tests/recordflow_suite.ts` (one source pin). **Strings:** none.

## 2. Idea 2 — Tier colours: one palette, Nathan's picks, both themes

**Ruling proposal.** One single-source tier palette in `theme.ts`: `tierHex = { purple: '#C364FF', green: '#007A00', yellow: '#8C6900' }`, used by the map line (`tierLineColour`) and by card text (`tierTextColour`) in BOTH themes — exactly Nathan's 00:48 clarification. Brand yellow `#F5C542` (`colors.neutral`) stays the brand/accent: the ridden reference line, the MAP tab's lines, the yellow RECORD button, `accentText` in night. **The yellow tier gets its own token** (`YELLOW_TIER = tierHex.yellow`, no longer `colors.neutral`), so a yellow sector on the map is now visibly distinct from the un-scored base line (today both are `#F5C542` — a documented, unfixed problem in `wayMapView.tsx:838-845`). `colors.purple` / `colors.green` become aliases of the palette so the timing tower and the legacy chip palette follow automatically. Night variants: a second table `tierTextNight` that is **identical** to the day values today (three lines; the place to change if the phone says night needs lighter text).

**Flag, not decided away (Nathan judges on the phone):** contrast. Nathan's picks were tuned on the white day card; computed WCAG ratios: green `#007A00` 5.55:1 on the day card but **2.89:1 on the night card** (`#212127`); yellow `#8C6900` 5.08:1 day / **3.15:1 night**; purple `#C364FF` **3.19:1 day** / 5.02:1 night. On the dark basemap the dark green/yellow map lines will also be low-contrast. `tests/ridedetail_suite.ts:254-262` pins ≥ 4.5:1 on both cards and `:266-277` pins the old per-theme split; the brief rewrites those pins to "both themes return the palette" and lowers the contrast floor to **≥ 2.8:1, explicitly marked as a preview floor** that the inspector and the readout must quote, so the 4.5 rule can be reinstated once Nathan has picked final values. Also noted: day `accentText` `#B98A0A` (neutral, no verdict yet) and yellow-tier `#8C6900` are two similar golds on the day card — unchanged here, Nathan to judge.

**On Nathan's phone (JS-only, OTA):** every sector time, total time, live gate flash, live strip bar, timing-tower row and sector-coloured map span uses the three new hexes in day and night; yellow sectors on the map now differ from the base line. **Not changed:** the brand yellow everywhere else, the launcher icon, the MAP tab map, the DEMO fixture, gate ticks (white), the rider dot.

**Open questions.** Q2.1 Night text — (a) **same hexes in both themes, see it first** [recommended, Nathan's words]; (b) day = his picks, night = lighter variants kept at ≥ 4.5:1. Q2.2 Contrast test — (a) **lower the floor to 2.8 with a preview note** [recommended]; (b) keep 4.5 and skip the night-card assertion for green/yellow and the day-card one for purple. The brief is written for (a)/(a); neither blocks execution (both are reversible one-liners).

**Size:** small (two source files + one test file; ~40 lines). **Files:** `src/ui/theme.ts`, `src/ui/tierColour.ts`, `src/ui/tower.tsx` (comment only, follows via `colors.*`), `tests/ridedetail_suite.ts`. **Strings:** none.

## 3. Idea 3 — RECORD slogan

**Ruling proposal.** `same activity · new meaning` → `same route · new meaning` (middle dot, the app's separator; Nathan typed a hyphen, the dot is the convention he set in cycle14). One literal (`RecordScreen.tsx:1681`, drifted from the digest's 1671 by cycle26 brief 01), one allow-list entry edited in place (`ui-strings.allow.json:858`), the in-memory extractor fixture in `ui_strings_suite.ts:41/49` left alone (it tests the extractor, not the screen). **Chore** — under 10 lines; can be done directly by the coordinator, brief supplied anyway so it can ride with batch A.

**On Nathan's phone:** the caption under the RECORD button. **Not changed:** anything else. **Open question:** Q3.1 punctuation — (a) **`same route · new meaning`** [recommended]; (b) `same route - new meaning`.

## 4. Idea 4 — Smartwatch glance (research note only)

No brief. `11-note-watch-glance.md` separates (A) the zero-code path — Android bridges the phone's ongoing notification ("12:34 · S2") to a paired Wear OS or Garmin watch as text [UNVERIFIED on device] — from (B) a real Wear OS companion app (native Kotlin/Compose, Wearable Data Layer from the phone's foreground service, a second Gradle application module that the managed-Expo/EAS setup does not produce today — a build-system question before a UI question) and (C) Garmin Connect IQ / Apple Watch (Apple: impossible, Android-only app). Recommended first step: Nathan says which watch, then one on-device test of (A). **Decision for Nathan:** which watch (Wear OS incl. Samsung / Garmin / Apple / none yet); whether (A) is worth a test ride.

## 5. Idea 5 — Phone live ride: only P under the map, the current sector breathes

**Ruling proposal.** The context line under the live map shows only the live position `P<n>` (or nothing); the `S<n>` text leaves it. The current sector's strip slot — its `S<n>` label and its bar — breathes: a slow opacity cycle 1.0 → 0.55 → 1.0 over ~2.4 s (`Animated.loop`, native driver), legibility floor **0.55**; when the OS "reduce motion" setting is on the slot sits still at full opacity. Only the `current` slot animates; done / pending slots are static as today. `contextLabel` stays in the view model (DEMO / REPLAY / `replay_suite.ts:288-300` / `recordflow_suite.ts:532` read it) but is no longer rendered; the pane doc says so. No new strings; `liveView.tsx` has no allow-list entries (verified), so the allow-list diff must be empty.

**On Nathan's phone:** during a ride with self dots on: "P3" alone under the map; the current sector's label+bar pulses softly. With self dots off: the context line is empty; the pulse still shows which sector is current (today the current slot has no cue at all). DEMO and REPLAY use the same pane, so they breathe too. **Not changed:** flashes, clock, tiers, sector count, the notification body (still "12:34 · S2" — see Q5.2).

**Open questions.** Q5.1 Floor and period — (a) **0.55 / 2.4 s** [recommended]; (b) 0.6 / 3 s. Tunable constants either way. Q5.2 The running notification still names the sector as text ("12:34 · S2") — (a) **leave it** [recommended; a notification cannot breathe and it is the only place the watch (idea 4A) would see the sector]; (b) drop it from the notification too.

**Size:** small. **Files:** `src/ui/liveView.tsx`, `src/ui/chips.tsx`, `tests/recordflow_suite.ts` (one new source pin). **Strings:** none.

## 6. Idea 6 — Every map edge to edge

**Ruling proposal.** Every `WayMapView` mount passes `bleed` (no border, no radius) and its parent inset is cancelled with a wrapper `marginHorizontal: -<inset>` so only the map bleeds while the text around it keeps its gutter: RECORD setup (inset 20), RECORD armed + running, REPLAY, DEMO running (race column, inset 12), ride detail (`mapWrap` 16 → 0), catalog place/way maps (inset 16), DEMO's full-screen running map. Overlays (zoom bar, credit "i", badges) are positioned inside the frame, so they move to 6 dp from the screen edge — the same as the ACTIVITIES cards already do. Safe areas: the app only insets the tab bar; no map reads side insets today and the ACTIVITIES cards prove the pattern on Nathan's phone. The RECORD screens' panels below the map are untouched; "edge to edge" means the map's horizontal extent only.

**Conflict to surface (Nathan decides).** Cycle23 kept the DETAIL page map bordered and inset on purpose (`cycles/virgin-cycle23/00-nathan-decisions.md:39`, `brief-03-detail-page-redesign.md:304, :322` "full-bleed deferred"). Nathan's 01:01 ask ("all maps") supersedes it if he confirms. Q6.1 — (a) **yes, the detail page map bleeds too** [recommended, consistent]; (b) keep the detail map framed. Q6.2 The gate editor map sits inside a bordered card with chips — (a) **the gate editor keeps its framed card** [recommended: it is an editor tool, not a map page, and the card border carries the chips]; (b) it bleeds too and the card loses its border. Both marked BLOCKED in the brief.

**Tests:** `recordflow_suite.ts:377-388` pins the opposite ("only the feed card passes bleed") and must be inverted. **Size:** medium (7 files, mostly one-line wrappers; layout surgery that only a phone can confirm). **Strings:** none. **Must run after cycle26 brief 04 and after brief 8-9** (both touch `wayMapView.tsx` / the map mounts).

## 7. Idea 7 — Rename the MAP tab to ROUTES

**Ruling proposal.** Rename. The sibling tabs name their content (RECORD, ACTIVITIES, SETTINGS); "MAP" names a presentation; the tab's own detail screen already says ROUTES FROM HERE / ROUTES TO HERE; Route is the app's core noun. Cost: places are less visible in the name — accepted because places exist only as route endpoints. Same change renames the detail screen's `BACK TO MAP` button (`CatalogDetailScreen.tsx:179`) to `BACK` — shorter, and it no longer has to name the tab. Internal ids stay `routes`. Stale docs fixed in the same change: `GLOSSARY.md:86, :106` (RESULTS tab, "RIDES, ROUTES, RESULTS"); `STATE.md:64-65` ("six tabs: RECORD / RIDES / ROUTES / RESULTS / SETTINGS / DEMO") is **the coordinator's file** — the brief hands the coordinator the exact replacement line instead of editing it. Cycle24's "ROUTES renamed MAP" had no recorded rationale (digest 06), so this is a reversal of a label, not of a design.

**Menu.** Q7.1 — (a) **ROUTES** [recommended]; (b) keep MAP; (c) PLACES; (d) EXPLORE. Q7.2 the back button — (a) **BACK** [recommended, minimal]; (b) BACK TO ROUTES. Q7.1 is BLOCKED in the brief (it IS the change).

**Size:** chore/small (label map, one test pin, one button literal + allow-list edit, GLOSSARY lines). **Files:** `App.tsx`, `src/ui/CatalogDetailScreen.tsx`, `tests/catalogmap_suite.ts`, `tests/ui-strings.allow.json`, `GLOSSARY.md`. **Strings:** `BACK TO MAP` → `BACK` (edited entry). Tab labels are single words and not scanned (cycle24 D15, verified: no entry for `map`).

## 8+9. One MAP-tab map package: ME/FIT, +/−, rotate, blue dot; north arrow retired everywhere

**Ruling proposal (Nathan's rulings applied, quoted in the brief).**
- **All `WayMapView` maps:** the `↑` button is retired. **FIT now also resets north** — the FIT branch of the single FIT/ME toggle calls the existing `resetNorth()` (sticky `userBearing = 0`) before `setMode('fit')`: FIT = exactly what "↑ then FIT" did yesterday, no new mechanism. **ME is untouched** (centre on the rider; course-up while moving/stopped; a held two-finger rotation stays held, as today). Allow-list entry `Reset map to north up` (accessibilityLabel) is removed. Every map that can be rotated (browse, prestart, finished) has FIT, so every rotated map keeps a way back to north; moving/stopped maps cannot be rotated. The ACTIVITIES card maps are read-only (no buttons) — unchanged.
- **MAP tab (`catalogMapView.tsx`):** `touchRotate={false}` → rotation on, as every other map. The `⤢` glyph is replaced by the same coupled FIT/ME toggle (`fitMeNextMode`, literal `FIT` / `ME` text — the existing allow-list entries are per file, so two new entries for `catalogMapView.tsx`). FIT = fit the catalog bounds, north-up (bearing 0, already the fit rule). ME = centre on the rider's position at street zoom (15, or the current zoom if closer) **without touching the bearing** (the live bearing is read back from `onRegionDidChange`, which already carries it). The rider dot reuses `WayMapView`'s `rider-dot` paint (`colors.riderBlue`, white stroke) as a `rider` source mounted LAST (dot on top), fed from the shared location store (`getStatus()` / `subscribe()`); the tab calls the non-prompting `refreshPositionIfPermitted()` once when it opens and once on each ME tap. **Never prompts**: with no permission, no services or no fix yet there is simply no dot and the toggle reads FIT only (`fitMeNextMode(mode, hasPosition)`), nothing is said.

**On Nathan's phone:** MAP tab: +, −, FIT/ME; two-finger rotation works; a blue dot where he is when location was already granted at RECORD; ME jumps to it. Every other map: the `↑` button is gone; FIT un-rotates. **Not changed:** ME on every existing map; the live ride's course-up; the DEMO; the ACTIVITIES cards; the permission flow (RECORD stays the only place that asks).

**Open questions.** Q8.1 ME on the MAP tab with no position (location off / never granted) — (a) **the button simply reads FIT; nothing is offered or said** [recommended]; (b) ME shown, tap asks for permission (a second prompt site — against the "RECORD asks" rule); (c) ME shown but does nothing. Q8.2 how fresh the dot is — (a) **one quiet read when the tab opens and on each ME tap** [recommended, no battery policy to write]; (b) a 5 s poll while the tab is visible. Q8.3 FIT on a finished live map after a rotate also drops the held course-up (it keeps north through a later ME, exactly as `↑` did) — (a) **accept** [recommended]; (b) FIT clears the rotation only, so a later ME swings back to course-up. Q8.1/8.2 BLOCKED in the brief (they decide what gets built); Q8.3 is informational.

**Size:** medium. **Files:** `src/ui/wayMapView.tsx` (zoom bar only), `src/ui/wayMapGeo.ts` (doc comment), `src/ui/catalogMapView.tsx`, `src/ui/RoutesScreen.tsx` (quiet read + status subscription), `tests/waymap_suite.ts` (`:319-331`, `:387-403` rewritten), `tests/catalogmap_suite.ts` (new pins), `tests/ui-strings.allow.json` (−1 entry, +2 entries). **Must run after cycle26 brief 04** (same file) and **before brief 6**.

## 10. Idea 10 — ACTIVITIES cards: nothing negative (delta only)

**What the current tree really does (source read, not the digest alone):** the tester's "no lap" / "missed" / "interrupted" strings do not exist in the tree (`c1f46ad` removed them; `feedmodel_suite.ts:81-96` forbids them). An unranked activity (missed or estimated lap, or rider-ignored) shows **"Not ranked" in place of the time**, no rank, an empty strip (`feedModel.ts:57, :66-67, :86-93`; `activityCard.tsx:77-79`). The detail page shows the same "Not ranked" big slot **plus a reason line that is still negative: `a gate was missed` / `GPS gap at a gate`** (`rideDetailModel.ts:91`, allow-listed `:2562`/`:2578`), and REPLAY's end line reuses that reason. The RECORD screen flashes `Interrupted · saved as free activity` when the app was killed mid-ride (`RecordScreen.tsx:117`). "interrupted" (a stop inside a sector) is a ranked lap and is already shown nowhere. The tester's build id is unverified (digest 09): the plan assumes she ran a pre-`c1f46ad` build.

**Ruling proposal (the delta).** Follow Nathan's 01:17 suggestion: an unranked activity keeps its **total activity time** (the wall-clock duration, exactly what a free activity shows — a fact, never an estimate, so the 2026-10-07 "never show estimates" rule still holds) in neutral colour, and shows **Not ranked** in the position slot where `P3/10` would be. Detail page: the same duration in the big slot, rank line `Not ranked`; the two reason lines are retired (allow-list entries removed). `ignored in ranking` (the rider's own choice), `no rank` and `too few to rank` are unchanged — not in Nathan's ask; flagged below. RECORD's `Interrupted · …` flash → `Saved as free activity`. Nothing else: the strip row stays empty, the tower's `TODAY · Not ranked` stays (it already carries no reason).

**Conflict to surface.** This reverses the 2026-10-07 brief 05 ruling "either ranked with a time and rank, or Not ranked with no time, no rank". Nathan's 10-08 words are "just suggestions"; Q10.1 — (a) **duration + "Not ranked" in the rank slot** [recommended: a blank hero reads as a failure, a duration is a neutral fact]; (b) keep today's "Not ranked" instead of the time (then only the detail reason lines and the RECORD flash change). BLOCKED in the brief. Q10.2 `too few to rank` / `no rank` lines on the detail page — (a) **leave** [recommended, out of scope, neutral-ish]; (b) fold into `Not ranked`.

**Size:** small. **Files:** `src/ui/feedModel.ts`, `src/ui/activityCard.tsx`, `src/ui/rideDetailModel.ts`, `src/ui/RideDetailScreen.tsx`, `src/ui/RecordScreen.tsx` (one constant), tests `feedmodel_suite.ts`, `ridedetail_suite.ts`, `recordflow_suite.ts`, `ui-strings.allow.json` (−2 entries, 1 edited). **Runs after brief 2** (shares `ridedetail_suite.ts`).

---

## 11. Dependencies, conflicts between ideas, batching

| Touches | 1 | 2 | 3 | 5 | 6 | 7 | 8+9 | 10 |
|---|---|---|---|---|---|---|---|---|
| `RecordScreen.tsx` | ✓ | | ✓ | | ✓ (3 mounts) | | | ✓ (1 const) |
| `wayMapView.tsx` | | | | | ✓ (mounts + test pin) | | ✓ (zoom bar) | |
| `ui-strings.allow.json` | | | ✓ | | | ✓ | ✓ | ✓ |
| `ridedetail_suite.ts` | | ✓ | | | | | | ✓ |
| `recordflow_suite.ts` | ✓ | | | ✓ | ✓ | | | ✓ |
| `liveView.tsx` / `chips.tsx` | | | | ✓ | | | | |
| `theme.ts` / `tierColour.ts` | | ✓ | | | | | | |
| `catalogMapView.tsx` / `RoutesScreen.tsx` | | | | | | | ✓ | |
| `App.tsx` / `CatalogDetailScreen.tsx` | | | | | ✓ (2 mounts) | ✓ | | |

External dependency: **cycle26 briefs 03 + 04 are not landed.** Brief 04 rewrites `wayMapView.tsx` (props, hooks, paint, tap handler) and adds a prop to the RecordScreen/DemoScreen/ReplayScreen mounts. Cycle27 briefs 8+9 and 6 touch the same lines. Decision: cycle27's map briefs run only after cycle26 04 has landed (or Nathan explicitly parks cycle26 03/04). Everything else in cycle27 is independent of cycle26.

**Recommended execution order (each batch Opus-inspected before the next):**
- **Batch A — chores, one Sonnet, sequential:** 3 (slogan) → 7 (ROUTES rename). Both tiny; both touch the allow-list.
- **Batch B — three Sonnets in parallel (disjoint files):** 2 (colours) ∥ 5 (breathing sector) ∥ 1 (record pairing). Then **10** (after 2: both edit `ridedetail_suite.ts`; after 1: both edit `RecordScreen.tsx`).
- **Batch C — after cycle26 brief 04 lands:** 8+9 (map controls + dot) → 6 (edge to edge). Sequential: both edit `wayMapView.tsx` and its mounts; 6 last because it is the most phone-dependent and the easiest to revert alone.
- Idea 4: no execution (note only).

Rationale: A first because it is 10 minutes and unblocks nothing else; B is the bulk and parallel-safe; C waits for the map file to settle so no brief re-anchors twice.

## 12. Conflicts surfaced (for Nathan, in one place)

1. **Idea 6 vs cycle23's detail map:** cycle23 kept the detail page map framed on purpose; "all maps edge to edge" supersedes it only if Nathan confirms (Q6.1). The gate editor's framed card is a second question (Q6.2).
2. **Idea 2, night variants + the yellow token split:** Nathan's picks are day-card picks; computed contrast on the night card is 2.9:1 (green) / 3.2:1 (yellow), and the purple is 3.2:1 on the day card. The brief ships them as asked in both themes with a preview contrast floor and a one-table place to split night later (Q2.1/Q2.2). Yellow-tier becomes its own token; brand yellow stays everywhere else, as he proposed.
3. **Idea 1, history-less default:** a fresh install has no pairs to learn from; the brief leaves today's behaviour there (Q1.3) rather than inventing a default.
4. **Idea 7, stale docs:** `STATE.md` still lists six tabs incl. RIDES/ROUTES/RESULTS; `GLOSSARY.md` names the RESULTS tab. GLOSSARY is in the brief; STATE.md is the coordinator's and gets the replacement line handed to it.
5. **Idea 10, tester build id:** unverified; the current tree already removed the words she saw. The brief changes only the delta (time visible, reason lines gone, RECORD flash wording) and reverses part of the 10-07 brief-05 ruling (Q10.1) — Nathan must say which of his two statements wins.
6. **Idea 8+9 vs cycle24 brief 03:** cycle24 specified the MAP tab bar as "+ / − / FIT only, no ME, no compass" and rotation off with no recorded reason; Nathan's 01:25 ruling supersedes it.
7. **Cycle26 briefs 03/04 unlanded:** map briefs in this cycle wait for them.

## 13. Digest anchors that did not verify as written

- Digest 01 / 03 `RecordScreen.tsx` line numbers predate cycle26 brief 01: slogan is at `:1681` (not 1671); GOING TO row `:1599-1620` (not 1596-1609); `pickFrom` `:284`, `setTo` `:279/:298/:1602/:1610/:1616` (the `loop` pill is new). Content unchanged; briefs carry the current lines.
- Digest 01 §2: `defaultEndpoints` is at `defaultWay.ts:158-161` (digest said 145-148).
- Digest 05: all frame anchors verified (`wayMapView.tsx:238, :317, :712, :1033-1034`; `recordflow_suite.ts:369-388`).
- Digest 06/07/08/09: anchors verified (`App.tsx:58-60`, `catalogMapView.tsx:263, :338-351, :165`, `wayMapView.tsx:489-498, :979-1015`, `wayMapGeo.ts:427-441, :481-483`, `feedModel.ts:57-93`, `activityCard.tsx:76-82`, `rideDetailModel.ts:69-91`).
- Digest 02: all colour values verified; the test lines `ridedetail_suite.ts:244-300` verified.
- Not verified by me (not needed for a brief): digest 04's native/notification claims; digest 09's tester build inference.

## 14. Every question Nathan must answer, in one list

| # | Question | Options (recommended in bold) | Blocks |
|---|---|---|---|
| Q1.1 | "most used destination" = | **(a) all-time count, recency breaks ties** / (b) most recent / (c) last 90 days | no |
| Q1.2 | follow an auto-detected START too? | **(a) yes, until the rider taps GOING TO** / (b) only on a START tap | brief 1 |
| Q1.3 | no history from this start | **(a) leave GOING TO as today** / (b) most-used place overall | no |
| Q2.1 | night text colours | **(a) same hexes both themes, judge on phone** / (b) lighter night variants (≥ 4.5:1) | no |
| Q2.2 | contrast test | **(a) preview floor 2.8:1, noted** / (b) keep 4.5 with per-theme exemptions | no |
| Q3.1 | slogan punctuation | **(a) `same route · new meaning`** / (b) hyphen | no |
| Q4 | which watch, and test the free notification path? | Wear OS (incl. Samsung) / Garmin / Apple / none — see note | note only |
| Q5.1 | breathe floor / period | **(a) 0.55 / 2.4 s** / (b) 0.6 / 3 s | no |
| Q5.2 | sector text in the running notification | **(a) keep** / (b) drop | no |
| Q6.1 | detail page map bleeds (reverses cycle23)? | **(a) yes** / (b) keep framed | brief 6 |
| Q6.2 | gate editor map | **(a) keeps its framed card** / (b) bleeds too | brief 6 |
| Q7.1 | tab name | **(a) ROUTES** / (b) MAP / (c) PLACES / (d) EXPLORE | brief 7 |
| Q7.2 | detail back button | **(a) BACK** / (b) BACK TO ROUTES | no |
| Q8.1 | MAP-tab ME with no position | **(a) reads FIT, says nothing** / (b) asks permission / (c) inert ME | brief 8-9 |
| Q8.2 | dot freshness | **(a) read on tab open + each ME tap** / (b) 5 s poll | brief 8-9 |
| Q8.3 | FIT on a finished map drops the held course-up too | **(a) accept (= old ↑)** / (b) clear rotation only | no |
| Q10.1 | unranked card | **(a) duration + "Not ranked" in the rank slot** / (b) keep "Not ranked" instead of the time | brief 10 |
| Q10.2 | `too few to rank` / `no rank` lines | **(a) leave** / (b) fold into Not ranked | no |


---

## 15. FINAL execution order (Fable, 2026-10-09 ~23:05 UTC) — supersedes §11's batching

Context: Nathan ruled the colours FINAL (2026-10-09 00:24) and asked for everything to be executed now; rulings 1.2 / 6.1 / 6.2 / 7.1 / 8.1 / 8.2 are folded into the briefs (amendment sections dated 2026-10-09); every unanswered §14 question keeps its recommended default (listed in `15-rulings-after-plan.md`). cycle26 is committed (`a7834cd`), so the map briefs are unblocked. Baseline at this pass: **`956 tests: 953 pass, 0 fail, 3 skip`**, tsc clean, working tree = the 2026-10-08 colour trial (brief 02's §1 says what to keep/replace). Idea 4 (watch glance): NOT executed — Nathan owns no watch; `product/proposals/watch.md` is the record.

**Run strictly SEQUENTIALLY in this order, one Sonnet per brief, Opus inspect after each group marked ⟂ (or after all nine if the coordinator prefers one inspection).** Parallel execution is NOT allowed this time: eight of the nine briefs share at least one file with another (table below); the only fully disjoint one (replay-1x) is a chore, so serialising everything costs minutes and removes every re-anchoring hazard.

| # | brief | size | files it touches (shared ones in **bold**) | tests after (expected, 0 FAIL) |
|---|---|---|---|---|
| 1 | `11-brief-tier-colours.md` (FINAL rewrite) | small | theme.ts, tierColour.ts, **chips.tsx**, wayMapStyle.ts (c), **wayMapView.tsx** (c), **ridedetail_suite.ts** | 957 (+1) |
| 2 | `11-brief-record-slogan.md` | chore | **RecordScreen.tsx** (1 line), **allow.json** (1 edit) | 957 |
| 3 | `11-brief-routes-tab-rename.md` | chore | App.tsx, CatalogDetailScreen.tsx, **catalogmap_suite.ts**, **allow.json**, GLOSSARY.md | 957 |
| 4 ⟂ | `11-brief-activity-card-states.md` | small | feedModel.ts, activityCard.tsx, rideDetailModel.ts, RideDetailScreen.tsx, **RecordScreen.tsx** (1 const), feedmodel_suite.ts, **ridedetail_suite.ts**, **recordflow_suite.ts**, **allow.json** | 957 |
| 5 | `11-brief-breathing-sector.md` | small | **chips.tsx**, liveView.tsx, **recordflow_suite.ts** | 958 (+1) |
| 6 | `11-brief-record-pairing.md` + amendment | small/medium | landmarkUsage.ts, **RecordScreen.tsx**, recordFlow.ts, settings.tsx, landmarkusage_suite.ts, **recordflow_suite.ts**, **allow.json** (−2) | 963 (+5) |
| 7 ⟂ | `11-brief-replay-1x.md` | chore | replayModel.ts, demoModel.ts, DemoScreen.tsx (c), replay_suite.ts, demo_suite.ts | 964 (+1) |
| 8 | `11-brief-map-tab-controls-and-dot.md` + amendment | medium | **wayMapView.tsx**, wayMapGeo.ts (c), catalogMapView.tsx, RoutesScreen.tsx, location/index.ts, waymap_suite.ts, **catalogmap_suite.ts**, positionretry_suite.ts, **allow.json** (−1 +2) | 966 (+2) |
| 9 ⟂ | `11-brief-maps-edge-to-edge.md` + amendment | medium | **RecordScreen.tsx**, ReplayScreen.tsx, DemoScreen.tsx, RideDetailScreen.tsx, CatalogDetailScreen.tsx, gateAdjustCard.tsx, GateAdjustScreen.tsx, **recordflow_suite.ts** | 966 |

(c) = comment-only hunk. "Tests after" assumes the previous rows landed exactly; each brief says "+N vs the baseline you record", so a deviation upstream shifts the absolute numbers, never the deltas.

**Why this order.** Colours first: the tree already holds a half-applied colour trial and every later diff reads cleaner once it is settled; it also owns `ridedetail_suite.ts` before 04 does. 02/03 are two-line chores that touch the allow-list — done early so the allow-list hunks are attributable one brief at a time. 04 before 06 because both edit `RecordScreen.tsx` and 06's hunks are larger (anchors move once). 05 before 06 only because 05 is a single-file change in `chips.tsx`/`liveView.tsx` after 01 touched `chips.tsx:26`. 07 is independent and slots before the map pair. 08 before 09 because 09 adds `bleed` to the very mounts 08 leaves alone, while 08 rewrites the zoom bar of `wayMapView.tsx` — 09 then re-anchors by content once. 09 last: the most phone-dependent and the easiest to revert alone.

**File-overlap hazards the executor must re-anchor by content (never by line):** `RecordScreen.tsx` (02, 04, 06, 09); `chips.tsx` (01, 05); `wayMapView.tsx` (01 comment, 08); `ridedetail_suite.ts` (01, 04); `recordflow_suite.ts` (04, 05, 06, 09); `catalogmap_suite.ts` (03, 08); `ui-strings.allow.json` (02, 03, 04, 06, 08 — five briefs; each quotes its exact entries; the inspector attributes every hunk).

**Allow-list ledger (what the whole cycle may change, nothing else):** 02 edits `same activity · new meaning` → `same route · new meaning`; 03 edits `BACK TO MAP` → `BACK`; 04 removes `a gate was missed` + `GPS gap at a gate`, edits `Interrupted · saved as free activity` → `Saved as free activity`; 06 removes `Start place` (settings.tsx) + `START NOT DETECTED` (RecordScreen.tsx); 08 removes `Reset map to north up` (wayMapView.tsx), adds `FIT` + `ME` for `catalogMapView.tsx`. Briefs 01, 05, 07, 09: byte-identical allow-list.

**Rulings made in this pass (details in each brief):** colours — one palette both themes, white ink on purple chips, explicit dated contrast exemptions instead of a floor; record-pairing — `startMode` removed entirely, `START NOT DETECTED` retired (no "no X" text), `DETECTED START` kept; edge-to-edge — the gate editor card loses its border, map wrapper cancels card padding + a new required `mapInset` prop; map tab — ME with no live fix uses the OS last-known position (C: live store fix → OS cache → nothing; nothing persisted; MAP tab only, RECORD unchanged); replay — 1× on BOTH dials, one-line switch to restrict.

**Still unanswered by Nathan — defaults in force:** 1.1 (count + recency), 1.3 (no history ⇒ unchanged), 3.1 (middle dot), 5.1 (0.55 / 2.4 s), 5.2 (notification keeps "· S2"), 7.2 (`BACK`), 8.3 (FIT on a finished map drops held course-up), 10.1 (duration + "Not ranked"), 10.2 (leave `too few to rank` / `no rank`). The old 2.1/2.2 are superseded by the FINAL colour ruling.
