# REVIEW — `product/` docs against the `virgin` branch (virgin-cycle5, follow-on)

**Planning document only. Nothing under `product/` was edited.** Written 2026-09-08 by the Plan
tier (Fable) against `virgin` at `eb2e2da`, with a Haiku Digest of CONCEPT.md and DATA-MODEL.md
as input and every other file read directly on the device. Ground truth is this cycle's freshly
cleaned `STATE.md` / `GLOSSARY.md` / `OPEN-ITEMS.md` plus the code where a doc makes a checkable
claim (`app/src/store/types.ts`, `app/src/ui/colourModel.ts`, `app/src/ui/wayMapView.tsx`,
`app/src/store/gateSeeding.ts`, `app/src/ui/gateAdjustModel.ts`, `app/src/ui/RideDetailScreen.tsx`).

Companion: `BRIEF-product-docs-cleanup.md` (the execution brief).

---

## 0. The shape of the problem

Every file under `product/` predates the branch cut (2026-08-31). Newest is 2026-08-24; oldest is
2026-08-14. None was written for `virgin`; none has been touched since. That gives three overlapping
problems, and the fix differs per problem — which is why the verdicts below name which one applies:

1. **Vocabulary inversion (WP-3, 2026-09-06).** Every doc that uses "way" and "route" as data-model
   terms (DATA-MODEL, COLD-START, SETUP-UX, ROUTING-AND-SEGMENTATION, and CONCEPT's status block)
   means the *opposite* of what the code now means. DATA-MODEL.md asserts the wrong mapping with
   confidence and is the one doc a developer would open while writing store code — weighted highest.
2. **Dangling references to things cut from this branch.** Commit `44e24f1` (2026-08-31, "cut the
   archive-app clutter") deleted `product/BACKLOG.md`, `product/DECISIONS.md`,
   `product/proposals/TRIAGE-ideas-18-27.md` and all of `product/superseded/` (4 docs + README).
   `product/README.md` still indexes every one of them as "live". Beyond those file-level ghosts,
   **every `D-0xx` and `B-xx` identifier in every product doc** now resolves to nothing on this branch
   — they are keys into `main`'s DECISIONS.md/BACKLOG.md. Same category as the root-doc cycle's
   `demos/mockup.html` finding, but there are hundreds of them, so the honest fix is one footnote per
   file, not a scrub.
3. **Plain staleness.** "UNBUILT" claims on things long built (timing tower, MapLibre on every screen,
   palette firewall, retroactive route creation, reference promotion, gate nudging); v1 schema
   versions; the 7-day/28-day tier window; B-59 "raw time pending"; "20 routes across 13 ways"; the
   three-hardcoded-tracks framing that the empty-seed default (2026-09-08) retired.

A fourth category matters for how much to rewrite: most of these files are **dated design records**
(the way `LAYOUT.md` §1 already labels itself "historical"). The root-doc cycle drew the line between
*artifact leftover* (cut it) and *rule leftover* (virgin's constitution — keep as pointer). Product
docs add a third: *record leftover* — a proposal or spec that was true when written and is now
history. Those should not be rewritten to lie about their date; they get an accurate status header
and a disposition, and the body stays. Only two files earn body-level rewrites: `product/README.md`
(it is an index, and the index is wrong) and DATA-MODEL.md §3 (a schema listing that a developer
will copy from).

One finding is not a doc problem at all — see §14 (`MIN_HISTORY` still gates colours in code while
`STATE.md`'s ground rule says there is no noise floor). It surfaced through COLD-START.md's own
stale note and is the most consequential thing in this review.

---

## 1. `product/README.md` — verdict: **leftover-from-main, needs restructure (rewrite)**

4653 bytes, 2026-08-24. An index whose rows point at files that do not exist here.

- **Dangling (confirmed absent on `virgin`, present on `main`):** `BACKLOG.md`, `DECISIONS.md`,
  `proposals/TRIAGE-ideas-18-27.md`, `superseded/MAPLIBRE-SPIKE.md`, `superseded/MAP-STACK-OPTIONS.md`,
  `superseded/BUILD-PIPELINE.md`, `superseded/GPX-PLUS-proposal.md`, `superseded/README.md`. Eight of
  the eighteen index rows, plus the whole "Moved 2026-08-24" table and the `## superseded/` section.
- Row text is stale even where the file exists: DATA-MODEL "§8a … B-152", LAYOUT "shipped six-tab app"
  (true) but "(+ status-block fix)" hides that the block is now wrong, MAP-TILES "open B-52/B-56",
  proposals "unbuilt" (COLD-START and SETUP-UX are largely built — §9, §10 below).
- Role names in "Who reads it" (Product Owner, Team Principal, Navigation Engineer, Art Director, QA)
  are `main`'s named-role process, which this branch dropped.
- "see `STATE.md` → 'Awaiting Nathan'" — that STATE section no longer exists.

Why it matters: this is the first file anyone opens in `product/`. Small file, whole-file replacement
is cheaper than anchoring; the brief supplies the full text.

## 2. `product/CONCEPT.md` — verdict: **stale (status block) + record leftover (body)**

9157 bytes. Body dated 2026-08-15; "Status corrections" block 2026-08-24. The block was the right idea
and is now itself stale in five places:

- "The catalog is now **20 routes across 13 ways**" — inverted vocabulary, and describes Nathan's
  Leuven seed, which a fresh install no longer ships (empty-seed default 2026-09-08).
- "D-042 … raw wall-clock time … Implementation is still pending (B-59)" — landed cycle2 WP-C
  (`store/timing.ts`, SETTINGS → Timing).
- Nothing about WP-3 (route/way), WP-1 (sports), WP-2 (RESULTS), retroactive route creation,
  blank-seed Preview.
- Body §"The core mechanic": "Three tracks, not one route … Morning / Evening A / Evening B" — the
  hardcoded-three-track model is gone as a default; "track" is the pre-DATA-MODEL word for what is now
  a *way*.
- Body §"Colour model": 28-day / 7-day tiers; "sectors with <5 clean rides stay neutral"; "Moving time
  colours"; monthly-automatic reference lap (D-009) — all superseded (last-10 window; raw time default;
  ride-1-as-reference + explicit promotion from RIDE detail). Note that the "<5 clean rides" line is
  superseded *by ruling* but not by code — see §14.
- §"The timing tower — … UNBUILT" and the closing "No application code exists yet" — both false, and the
  status block already says so; the body headings still shout it.
- §"Genuinely open questions": *Sector placement* → gates are placed (25/50/75 % + stop-snap,
  `gateSeeding.ts`), gate-move history semantics answered by `gateSetVersion` and the ROUTES reset dialog;
  *Cold start* → the retroactive-creation half is built, the "day-two colours" half is exactly §14;
  *Ideal lap* → still not built, not on OPEN-ITEMS (dropped, apparently by silence); *Nathan's
  confirmations* (rolling vs calendar, monthly reference) → both ruled since (last-10 rolling; reference
  is ride 1 + promotion). *Numbers* → k/σ never measured, and the D-045 model doesn't use them.

Fix shape: replace the status block with a virgin-native one (execution-ready text in the brief); add
"superseded" strike-notes on the three body headings that assert UNBUILT; leave the body as the dated
record it already claims to be. Medium.

## 3. `product/DATA-MODEL.md` — verdict: **inverted vocabulary, technically load-bearing — highest weight**

16877 bytes, 2026-08-16 (pre-branch, pre-WP-3). Confirmed against `app/src/store/types.ts`:

- §2 and §3 define **Way = (startLandmark, endLandmark) pair; Route = one physical path with a
  reference polyline.** Code (v2, WP-3): **Route = the from→to pair (parent, `wayIds[]`,
  `sportId?`); Way = one physical path (`routeId`, `refLineId`, `gateSetVersion`, `seeded`,
  `referenceRideId?`, `specs?`).** `GateSet.routeId` → `GateSet.wayId` (+ `origin?`).
  `RideResult.routeId` → keyed by way. Every sentence in §2, §3, §6, §7, §8, §8a that says "route"
  or "way" is backwards for a reader of the current code.
- §2's own aside — "Morning / Evening A / Evening B are, in the new vocabulary, *routes* of two
  ways" — was written for the 2026-08-16 vocabulary. Read today it is doubly wrong: it is now
  "*ways* of two *routes*", and those three names are seed-only.
- `CATALOG_SCHEMA_VERSION = 1`, `RESULT_SCHEMA_VERSION = 1` → both 2 (read-side key rename for v1).
- §5 "Migration from what exists today" (`TrackId` hardcoded, 232/131 archive rides), §7 (tower query
  over a 28-day window), §9 Q1/Q4 (the 88-visit cluster, dormant landmarks, `landmarks_v1.json`) are
  Nathan's-archive material; `data/analysis/` is not on this branch.
- §9 Q3 "Does a way with 4 rides get colours at all?" — ruled by D-045 (yes, from ride 1) but the code
  still says no; same as §14.
- What still holds structurally and is worth keeping: the §1 argument (derived results cache, no
  tier/colour/rank stored — `types.ts`'s header quotes it), §4 on-disk layout (matches
  `resultsStore.ts`), §6 gate-move cost asymmetry (implemented as `gateSetVersion` + the ROUTES reset
  dialog), §8a "the ridden route wins" (the live engine's pick-bias rule — now "the ridden *way* wins").

Why it matters more than the prose docs: a developer writing store code who trusts §3 will name a
field or key a lookup backwards. The digest's warning stands — this can cause a bug, not an
embarrassment. Fix shape: a loud header block (execution-ready in the brief) plus a rewrite of §3 to
the v2 shape (scoped in the brief, text to be lifted from `types.ts`, which is already the authority),
plus "historical" markers on §5/§7/§9. Medium-large; its own WP.

## 4. `product/LAYOUT.md` — verdict: **stale status block; body is an honest dated record**

44613 bytes, the largest product doc. Read in full. Good news: the body does *not* use "way"/"route"
as data-model terms — it says "track", "direction", "this track", so **no find-replace pass is needed
and none should be attempted.** The body is a cycle-002→007 design record already labelled historical
in §1 and internally consistent as such. The problems are all at the edges:

- Status block (line 3): tab list "record / rides / routes / **result** / settings / demo" (RESULTS,
  plural, a different screen since cycle3 WP-2); "D-042 … implementation still pending, B-59"
  (landed cycle2 WP-C); "cycle-022 mockup … built cycle 024" (main's cycle numbering; the mockup is not
  on this branch). Nothing about WP-3 / sports / blank seed / cycle1–4 UI (RIDE detail, ROUTES detail,
  gate-adjust on a map, RESULTS board + scatterplot).
- §3b heading paragraph ends "**UNBUILT.**" — the tower landed long ago (the status block says so; the
  body contradicts it).
- §6a "Audible reference implementation: `demos/mockup.html`" — not on this branch (same finding the
  root-doc cycle made for GLOSSARY.md). Earcons live in `app/assets/earcons/*.wav` + `make_earcons.py`.
- §2 rule 3 "scoring stays moving time (D-008)" and §2a "moving time vs rolling 7-day / 28-day lap
  bests" — the status block corrects the window but not the moving-time default; both are ruled and
  built otherwise (raw default, last-10).
- §4 HISTORY and §5 setup-flow describe surfaces that now exist in different shapes (RIDES + RESULTS;
  gate-adjust card is tap-then-nudge on a real map, no chainage-bar drag). §1 already says "read it
  against the app as it now stands"; a one-line pointer per section is enough.
- "Open items exported from this spec" (bottom): several are settled (tower population = last 10;
  D-006 supersession recorded by usage; ideal-lap window — the ideal lap is not built at all; numeric
  thresholds — the app ships 25/50/75 % + 150 m/250 m stop-snap, not B-17-derived numbers; hex palette
  → `theme.ts`). Needs a disposition line per item, not deletion.
- Role/process residue: "Owner: Designer", "`team/designer.md`", "Principal at cycle close",
  "Race Engineer" — attribution in a dated record; footnote, don't scrub.

Fix shape: targeted edits only — new status block, one-line strike-notes at §3b/§6a/§2-rule-3, a
disposition column on the exported-open-items list, the D-/B- footnote. No rewrite. Medium in
reading, small in typing. The brief supplies exact FIND/REPLACE for the status block and the
three strike-notes and scopes the rest.

## 5. `product/BRAND.md` — verdict: **current, four small fixes**

6845 bytes, rewritten 2026-08-24. The voice/tone rules and P1–P4 hold and the code agrees (`theme.ts`
carries the "do not reintroduce red" note verbatim; `launchAnimation.tsx`/`launchChoreo.ts` implement
the ring-then-slash choreography from concept 5). Drift:

- "the last 10 comparable rides on that **route**" (twice) — post-WP-3 that is per **way**
  (`ghostsFor(wayId)`); the scoring unit is the way, and the GLOSSARY says so.
- "night is user-selectable (a toggle on the Record screen, persisted)" — still true
  (`RecordScreen.tsx` mode pill) *and* SETTINGS → Theme exists (`settings.tsx`); say both.
- Paths: `brand/brandboard.png` and `brand/board_12_motion.png` → the files are under
  `brand/board/` (`brand/board/brandboard.png`, `brand/board/board_12_motion.png`).
- "Nathan asked for MORE uses of it … which is still open work" — not on OPEN-ITEMS; it was neither
  done nor consciously dropped. Flagged in the brief's New WPs as a Nathan call, not silently cut.
- "D-013 palette", "D-030/D-037", "D-006", "D-019" — covered by the cross-cutting footnote.

Small; execution-ready in the brief. No three-track or 7/28-day language survives in this file (the
2026-08-24 rewrite already removed it).

## 6. `product/MAP-CONTRACT.md` — verdict: **stale header (says UNBUILT; it is built) — the contract itself is still binding**

13368 bytes, 2026-08-17. This is the per-surface behaviour contract for the real map, written the day
Nathan overruled "no map on live ride". Checked against `wayMapView.tsx` and the screens that import it
(`RecordScreen`, `DemoScreen`, `CatalogDetailScreen`, `RideDetailScreen`, `gateAdjustCard`;
`ResultsDetailScreen` deliberately has no map — "Nathan, Q2"):

- Header "UNBUILT" + "Reads … BACKLOG.md, team logs, `routeMapView.tsx`" — MapLibre + OpenFreeMap has
  been live on every screen since main's cycle 015–024 and on this branch from day one; the file is
  `wayMapView.tsx` now (renamed by WP-3; `routeMapView.tsx` no longer exists).
- §1 table "PNG today" column and the `ResultScreen.tsx` / static-`<Image>` ground are pre-build-3 facts.
  The "For / Shows / Interactions / Never" columns are still the rule the app follows (heading-up locked,
  labels hidden, zero interaction while moving; pan/zoom when stationary; reference line + own dot only).
- §1 "Result (post-ride) … view trace link, one tap away" → realised as the RIDE detail screen's
  sector-coloured trail (cycle1 WP-H), reachable from RIDES, not from RESULTS. §1's "Future gate-setup"
  row → built as the gate-adjust card on a real map (cycle2 WP-J) and ROUTES → edit gates (WP-I).
- §3 "Proposed backlog rows" B-50…B-58 and the "Existing items — change status" list are main-backlog
  bookkeeping; B-50/51/53 done, B-52 (ambient cache offline) still unverified on device, B-54/55/56
  LATER/non-goals, B-57 done differently, B-58 (phone-checkable acceptance test) never folded anywhere.
- §4 acceptance test is still the best one-paragraph on-device check of the live map and belongs on
  OPEN-ITEMS item 2's checklist (New WP in the brief).
- §5 palette-firewall finding (route line renders in the yellow-tier colour) — `theme.ts` still
  documents the dual use; unchanged, still "not reopened".
- §7 satellite sandwich — satellite was never adopted; harmless as a rule-in-waiting.

Fix shape: replace the header with a BUILT status block; mark §3 historical; rename the file
references; leave §1/§4/§5/§6/§7 as the binding contract. Small-medium; execution-ready in the brief.

## 7. `product/MAP-TILES.md` — verdict: **stale header; §1 and §5 are built exactly as written**

10980 bytes, 2026-08-17. Checked: `wayMapView.tsx` uses `…/styles/positron` (day) and `…/styles/dark`
(night) — both from this doc's §1 table; the attribution string is byte-identical to §6's; the
palette firewall + label hiding of §5 is `wayMapStyle.ts`. So:

- "All UNBUILT" header → §1 (online basemap, no key) and §5 (style patching) are built; §6 attribution
  shipped; §2 ambient-cache-offline behaviour is still `[UNVERIFIED]` on device (never tested — belongs
  on the on-device checklist); §3 PMTiles corridor extract not built (parked, only if §2 proves
  insufficient); §4 satellite/terrain remain non-goals.
- Corridor bbox (Leuven, from `routes.json`) — Nathan-specific and `app/assets/routes/routes.json` is
  not on this branch. Harmless as a worked example, must not read as a product constant now that the
  product is location-agnostic (blank install).
- `08_build_route_assets.py` (main's analysis pipeline), `MAPLIBRE-SPIKE.md §3` (in the deleted
  `superseded/`), `cycles/cycle-014.md` (main) — dangling.
- B-32 / D-030 / D-038 — cross-cutting footnote.

Small; execution-ready in the brief.

## 8. `product/PRIOR-ART.md` — verdict: **current as reference; one header line**

7878 bytes, 2026-08-14, oldest file. Evergreen competitor/library notes. No claim about Qualifire's own
state has drifted in a way that misleads — the "steal list" items are either done (interpolated gate
crossings; completion-only earcons; expo-audio; cheap-ruler-style flat-earth math) or still true as
principles. Residue: "Phase-0 harness / Phase 3 / Phase-99" is main's original build plan; "our `data/`
ZIP" is now in `safe_to_delete/`; "one-route scale" predates multi-way; `[UNVERIFIED — test on real
device in Phase 3]` for audio ducking was never closed. A two-line status header is enough. Small.

## 9. `product/proposals/COLD-START.md` — verdict: **largely BUILT; the file still says "every proposal below is UNBUILT"; vocabulary inverted**

13964 bytes, main cycle 011 (2026-08-17), with a D-045 stale-note added 2026-08-26. This is the design
the whole `virgin` branch executed, and the file does not know. Disposition of its own proposals
(§6 table), checked in code:

| Proposal | Status on `virgin` | Where |
|---|---|---|
| B-32 retroactive way creation (name start/end at STOP) | **BUILT** 2026-08-31 | `store/routeCreation.ts`, `ui/routeNamingCard.tsx` (renamed by WP-3 — creates a Route + Way) |
| B-35 de-hardcode route identity; empty-seed install | **BUILT** (cycle025 + 2026-09-08 default `'empty'`) | `store/seed.ts`, `EXPO_PUBLIC_SEED_MODE` |
| B-38 ride 1 is the reference; promote a later lap | **BUILT** — ride-1 default 2026-08-31; promotion from RIDE detail (`promoteRideToReference`, `RideDetailScreen.tsx` `onPromote`) | |
| B-33 provisional gates | **BUILT, differently**: seeded from ride 1 (not "after ride 2"), 25/50/75 % + stop-snap, `origin:'geometric'`; the "replaced by measured gates at ≥10 rides" half is not built (OPEN-ITEMS Parked) | `store/gateSeeding.ts` |
| B-36 persist the comparison window across restarts | **BUILT** (main cycle 024 WP-A1 `resultsStore.ts`) — §4's "`recordedResults()` is memory-only" is no longer true | |
| B-37 alternatives: multiple ways per endpoint pair, grouped, never colour-compared | **BUILT** structurally by WP-3 (Route → `wayIds[]`) + `specs` (cycle1/2 WP-G) | `store/types.ts` |
| B-40 bug F-1 (own lap inside its own history) | **FIXED** by D-045 ruling 2 — window sliced after excluding the judged ride | `colourModel.ts` `ghostsFor` |
| B-41 reconcile 28-day vs `WINDOW_N=10` | **RESOLVED** — last-10 everywhere (STATE ground rule) | |
| B-39 empty-state pass | **OPEN** — OPEN-ITEMS item 3 | |
| B-31 cold-start ladder ("ride n of 5", verdict-free ride-1 board, two announcements) | **NOT BUILT** — and its premise (`MIN_HISTORY=5`) is *still in code* while the ruling says it's gone. See §14. | `colourModel.ts:40,144` |
| B-34 sector count scales with length | **NOT BUILT**, deliberately (STATE: exactly 4, fixed) | |

Also: §3's step table ("Way creation from the (start, end) pair" etc.) is the pre-WP-3 vocabulary
throughout; §4's "Three routes … hardcoded" row is history; §5 F-1/F-3 are fixed, F-2 (sector colour
lags lap colour) is still structurally true (`sectorValues` is clean-only), F-4 is §14.

Fix shape: a disposition block at the top (the table above, execution-ready in the brief), the
vocabulary note, and a corrected status line. Body stays. Medium.

## 10. `product/proposals/SETUP-UX.md` — verdict: **mostly BUILT; header says UNBUILT; vocabulary inverted**

14161 bytes, main cycle 011. Checked:

- §1 "no seventh tab; ROUTES rows tappable → read-only detail; edit gates behind a second tap" —
  **BUILT** (cycle2 WP-K `CatalogDetailScreen.tsx`, WP-I `GateAdjustScreen.tsx`).
- §2 first run: "ride first, name after; arrival card names the place; one answer creates landmark +
  route + way + reference + 4 proposed gates" — **BUILT** 2026-08-31 (naming card + save-flow gates).
  Two details differ: a blank install first asks for a **sport** (WP-1) — RECORD blocks until one is
  named; and there is no prefilled "Home" start — with no landmarks the first ride is a free ride
  ("new>>new") and *both* ends are named at STOP.
- §3 destination entry from your own places — **BUILT** in spirit (STARTING FROM / GOING TO pills on
  RECORD, `RecordScreen.tsx`); the type-to-filter and recents ranking are not.
- §4 nudge pad — **BUILT** (cycle2 WP-J: ± buttons, long-press repeat, real zoomable map). The
  START/FINISH "locked ring + laps-count confirm" was **deliberately dropped** (`gateAdjustModel.ts`:
  every gate nudges alike; the ROUTES entry point prices every move with its own reset dialog).
  "Make this a new route instead" — not built.
- §5 depth strip — **NOT BUILT**; the RESULTS scatterplot (last 9 rides) is the nearest thing. The
  `⚠n/5` retirement it proposes is moot if §14 lands.
- Vocabulary: "Way (start→end pair)", "Which route on a way is the reference" — inverted.

Fix shape: disposition header (execution-ready in the brief). Small-medium.

## 11. `product/proposals/ROUTING-AND-SEGMENTATION.md` — verdict: **genuinely still a proposal; header needs a status + data-provenance note**

16527 bytes, main cycle 011. IDEAS §29 (type a destination) is still unbuilt and is the one Parked
line OPEN-ITEMS kept. What *did* ship out of it: §3 step 5 (no gate within 150 m of a controlled stop,
±250 m search window) and the `GateSet.origin: 'measured' | 'geometric'` honesty clause — both cited by
name in `gateSeeding.ts` and `types.ts`. Not shipped: BRouter, geocoding, the 3–6 sector count, the
overlap scan (its inputs — `data/analysis/RESULTS.md`, `activity-index.csv`, `routes.json`, the 624-ride
archive — are all `main`-only). Vocabulary: "route" here is the physical path (= today's *way*).
Small: a status header.

## 12. `product/proposals/README.md` — verdict: **stale (says "never implemented")**

208 bytes. Two of the three proposals are largely built (§9, §10). Whole-file replacement, tiny.

## 13. `product/brand/README.md` and `product/brand/LOGO-RATIONALE.md` — verdict: **current; one status line each**

- `brand/README.md` (2026-08-15): asset index is accurate (checked every path). "Status: palette
  decision OPEN — Nathan comparing `palettes/brandboard_*.png`" has sat unanswered for 24 days; the app
  ships palette A ("signal", `theme.ts` `#F5C542 / #A667F0 / #3ED598`) by default of nobody deciding.
  Nathan's `notes4` point 6 asks a *different* palette question (extra chrome themes — pink / light
  blue / green — for "a diverse clientele", verdict colours fixed). Neither is on OPEN-ITEMS. Not
  blocking anything. "Librarian index" is a main role name.
- `LOGO-RATIONALE.md` (2026-08-15): evergreen; its recommendation (5 as identity, 1 as launcher) is
  what shipped — `app/assets/icon/README.md` builds the launcher from concept 1, `launchChoreo.ts`
  animates concept 5. One line saying so closes it.
- `design/ChatGPT attempt at improved design/` holds app screenshots + a "canonical reconstructed"
  set; it is a screen-mockup exercise, not a brand/palette proposal, and does not supersede anything
  under `product/brand/`. `design/` currency itself was flagged unverified by the cycle5 README and
  remains out of scope here.

## 14. Not a doc problem: `MIN_HISTORY = 5` still gates every colour and rank

`STATE.md` ground rule (freshly cleaned, and it quotes Nathan's D-045 ruling of 2026-08-26): *"No
noise floor: a way's first-ever ride logs all-purple sectors; one prior ride compares purple/yellow;
two or more run the full model on the average."* COLD-START.md's own 2026-08-26 note says the same
("MIN_HISTORY=5 no longer exists — the min-history rule was deleted").

The code disagrees, in four places, all live on `virgin` at `eb2e2da`:

- `app/src/ui/colourModel.ts:40` `export const MIN_HISTORY = 5;` and `:144`
  `if (!st || st.n < MIN_HISTORY) return 'neutral';` inside `tierFor` — the one function every sector
  and lap colour goes through (`sectorTrailModel.ts`, RESULTS, RIDE detail).
- `app/src/live/towerSource.ts:40` `if (ghosts.length < MIN_HISTORY) return null;` — no live position
  under 5 ghosts.
- `app/src/ui/rideDetailModel.ts:71–75` — "`n` rides of history — too few to rank".
- `app/src/store/routeCreation.ts:24` says it out loud: *"Deriving that ride into the route's first
  scored all-purple lap is STILL deferred — a later package."*

Consequence for the product this branch exists to make: a stranger with the blank-seed Preview rides
the same way five times before a single colour or rank appears — the exact "four identical grey
screens" failure COLD-START §2 was written to prevent, and a direct contradiction of the ground rule
`STATE.md` now states as settled. Nothing on OPEN-ITEMS covers it (item 3, "empty-state pass", is about
copy for "0 rides found" and lock, not colours). D-045 ruling 2 (the window slice) *was* implemented;
ruling 1 was not. This is the first New WP in the brief and, in my judgement, the most valuable thing
this audit found — it is a code change of moderate size with tests, not a doc edit, and it is a
ruling Nathan already made.

## 15. Cross-cutting, for every file

- **D-0xx / B-xx identifiers** are keys into `main`'s `product/DECISIONS.md` / `product/BACKLOG.md`
  (deleted here by `44e24f1`). Hundreds of occurrences. Rule for the brief: never strip them (they are
  the record's citations); add one standard footnote line under each file's title. Also applies to
  main cycle numbers ("cycle 014", `cycles/cycle-014.md`) and IDEAS §-numbers (those still resolve —
  `IDEAS.md` is on this branch and unchanged).
- **Role names** (Product Owner, Designer, Backend Dev, Race Engineer, Navigation Engineer, Team
  Principal, Librarian, QA, Art Director) are authorship attributions in dated records. Keep them in
  bodies; the same footnote explains them. Only `product/README.md`'s "Who reads it" column, which
  *routes* work to roles, gets rewritten.
- **"Nathan's catalog" material** (Morning/Evening A/B, Leuven bbox, 624 rides, 232/131, six
  landmarks, puttestraat) — keep where it is a worked example inside a dated record; flag once per
  file that a fresh install ships none of it.

## 16. Weighting summary

| File | Verdict | Why it matters | Size of fix |
|---|---|---|---|
| DATA-MODEL.md | inverted, load-bearing | a dev can copy the wrong schema | medium-large (own WP) |
| README.md | leftover, index wrong | first thing opened; 8 dead rows | small (rewrite) |
| COLD-START.md | built-but-says-unbuilt, inverted | hides that the branch's core work is done; its stale note exposes §14 | medium |
| CONCEPT.md | stale block, record body | the "what is this app" doc misdescribes the model | medium |
| LAYOUT.md | stale edges, honest body | biggest file; edges only | small typing, medium reading |
| MAP-CONTRACT.md | stale header, binding body | says UNBUILT; §4 test is reusable | small-medium |
| SETUP-UX.md | built-but-says-unbuilt, inverted | same as COLD-START | small-medium |
| MAP-TILES.md | stale header | says UNBUILT; §1/§5 shipped verbatim | small |
| BRAND.md | current | four small fixes | small |
| ROUTING-AND-SEGMENTATION.md | still a proposal | provenance note | small |
| PRIOR-ART.md | current reference | header line | small |
| proposals/README.md | stale | "never implemented" is false | tiny |
| brand/README.md, LOGO-RATIONALE.md | current | close the palette line | tiny |
