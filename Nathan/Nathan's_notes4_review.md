# Qualifire — review of your notes4 (2026-08-25), checked against the project on 2026-08-25

Same drill as before: I read your notes, then checked every point against the repo (STATE, the backlog, the cold-start and routing proposals in `product/proposals/`, the data model, and the ten cycle-025 briefs just written). The headline this time is not about any single feature: **notes4 is the first notes file where the app stops being for you alone.** Virgin installs, whole-app export, navigation "people asked for", multiple sports, palettes for "a diverse clientele" — five of your six points are about other people. That matters because almost every scope ruling on record (D-001, D-012, and the cold-start design's own header: *"single-user, no accounts, no sync... 'someone else' is used here as the sharpest test"*) treats other users as a thought experiment, not a goal. Nothing you ask for needs accounts or sync — so there's no hard contradiction — but the *framing* of several standing documents flips from "design lens" to "roadmap" the moment you confirm this is now a real direction. That confirmation should be recorded as a decision, in one sentence, so the team stops hedging. It's the first thing I'd ask of you from this file.

Point by point, in your order. (No coordinates are cited in notes4, so no map links were needed.)

---

## 1. The "virgin" app build — record first, save, name, auto-gates

**Is it already designed? Yes, almost exactly — and it's unbuilt.** This is the pleasant surprise of notes4: the flow you describe independently reproduces the cold-start design written in cycle 011 (`product/proposals/COLD-START.md`), which has been sitting in the proposals folder waiting for a reason to exist. You just supplied the reason. Compare:

- **Your flow:** record rides first — live blue dot, yellow trail behind you, no landmarks or gates yet → at the end, save it → give it a name → define begin and endpoint as landmarks → auto-annotate gates → reusable from the RECORD tab.
- **The proposal's flow:** on a virgin install *"setup is retroactive, not prospective... ride 1 must be ride first, name after"* — naming start + end at STOP is "the only true onboarding step", landmarks are *"born from visited endpoints rather than mined from the archive"*, the way is created automatically from the (start, end) pair, and ride 1 is the reference by default.

These are the same design. It was decomposed into backlog items long ago, all still OPEN: **B-35** (the cold-start ladder — verdict-free ride 1, the "ride n of 5" countdown, colours switch on at 5), **B-36** (retroactive way creation — your "name it, define begin/end as landmarks"), **B-37** (provisional gates), **B-42** (ride 1 is the reference by default), **B-43** (the empty-state pass). So the ask is not "design this", it's "promote an existing unbuilt design to a build epic."

**The one technical prerequisite, and it's already half-done:** route identity used to be hardcoded. Cycle 024's WP-D3 de-hardcoded the UI screens, but per B-39 and STATE, **the empty-seed install path is still untouched** — the backlog's own words: *"Blocks every user-created way."* That remaining half of B-39 is where a virgin build starts; nothing else in your flow can exist before it.

**On your auto-gate scheme specifically** (start/end within 1% of ride, gates at 25/50/75%, adjustable percentages) — three notes:

1. **The equal-percentage seed is exactly what the proposals suggest** (COLD-START step 8: "equal-chainage split... editable later, replaced by measured gates once history allows"). Your 25/50/75 is that split for 4 sectors. One refinement already designed and worth taking: the routing proposal's gate-seeding algorithm (§3 of `ROUTING-AND-SEGMENTATION.md`) starts from equal quantiles but then **snaps each gate to the middle of the longest traffic-signal-free stretch nearby, and refuses gates within 150 m of a controlled intersection** — because a gate at a red light corrupts that sector's times, which is this project's oldest measured lesson (D-011). I'd seed at your percentages, snap per that rule, and keep your "adjust the percentage" option on top. The adjustment UI question is also pre-answered: `SETUP-UX.md` argues against finger-dragging gates on the phone (your thumb covers the line) and proposes tap-then-nudge with ± buttons.
2. **Fixed four sectors is flagged as a Nathan-shaped assumption** — B-38 (open): sector count should scale with route length ("four sectors over a 4-minute errand are 60 s blocks dominated by GPS noise; over a 2-hour ride they are useless"). The routing proposal's `n = clamp(L/1400 m, 3, 6)` is the concrete version. For a virgin build aimed at *other people's* routes — whose lengths you don't control — scaling matters more than it ever did for your commute. I'd fold B-38 in rather than hard-coding 25/50/75.
3. **"Start and end within 1% of ride"** — I read this as: the start gate sits at ~1% of the route's distance and the end gate at ~99%, i.e. slightly inside the true endpoints (the same instinct as the old start-line-downstream-of-the-door setup, which exists so that GPS jitter while you're standing still doesn't start the clock). If you meant something else by "within 1%", say so — everything downstream of this sentence is my assumption.

**One thing in your flow that is genuinely new relative to the proposal:** you'd annotate gates at the save step of ride 1; COLD-START proposed provisional gates only after ride 2 confirms the corridor (two matched traces, B-37). Your version is better for the feel of the product — the route is *complete* when you save it — and technically fine, since the ride-1 trace is the reference line anyway. The honesty machinery already designed covers the risk: gates from geometry/one ride are a starting grid, not a benchmark, and colours don't fire before 5 clean rides regardless (MIN_HISTORY, D-008).

**Verdict: concrete, actionable, and the design already exists — this is a build epic, not a design task.** It is much bigger than one work package (empty-seed path + B-35/36/37/42/43 + the save-flow UI), so it needs sequencing against cycle 025's already-written briefs rather than jumping the queue. One decision from you folds in: does the countdown ladder ("ride 1 of 5... colours are on") ship as part of it? It's the piece that makes a blank app feel like it's loading rather than broken, and I'd say yes.

---

## 2. Nomenclature — "routes" and "ways"

**You're right that a defined nomenclature is needed — but there's a collision you should know about before ruling anything: the project already uses both of your words, and one of them means something different.**

The data model on record (`product/DATA-MODEL.md`, and the catalog: 6 landmarks, 13 ways, 20 routes) is:

- **Way** = an ordered (start-landmark, end-landmark) pair. Home→work is *one way*.
- **Route** = a specific curated path within a way. Your h>>w-w and h>>w-d would be *two routes of the home→work way*.

Your notes4 definition of **"route"** — endpoints plus the path taken, h>>w-w and h>>w-d genuinely different, not sector-comparable — **matches the existing "route" exactly.** No conflict there; the model already agrees with you, including the never-compare rule (different routes are grouped but never colour-compared — D-010/D-015, B-41).

But your **"way"** — small variations *within* a route, sharing all 5 gates, sector times fully comparable — is a **new, third, finer level that doesn't exist yet**, and it collides head-on with the existing "Way", which sits one level *above* route, not below. The word "way" is load-bearing in the schema (`Way`, `wayId`), the catalog, the Routes tab, and every analysis doc. So adopting your nomenclature as written means renaming the existing concept everywhere, or picking a different word for the new fine-grained level ("variant", "line", "trace" — your call). **This needs your ruling, and it should be ruled together with the two naming questions already blocking `WP-route-naming-migration.md`** (the cycle-025 brief from your notes3 ask, which is waiting on: the exact Morning→HomeWorkA mapping, and how far the FromToVariant standard reaches). One sitting, one naming convention for landmarks/ways/routes/variants, and both briefs unblock. Doing the rename migration *before* minting a third level is also the cheap order — every week adds more data keyed to the current words.

**Your feasibility question — "we should match exactly all the 5 gates so those rides are comparable. Is that feasible?" Yes, and the door was deliberately left open for it.** DATA-MODEL §8 already considered sector-sharing and deferred it ("tempting, and wrong to build now... sector identity is keyed to (route, chainage pair), which leaves the door open without walking through it"). Your proposal is the walk through that door, and your own instinct about how — *"you would still need to do a reference ride for each way, but you can save them to the same route"* — is exactly the workable mechanism:

- Each variant carries **its own reference line** (from its own reference ride), so route lock and the 40 m corridor work normally mid-variant; without that, a deviation bigger than ~40 m would drop the lock and void the sector.
- The **5 gates become shared physical crossing lines** pinned to stretches of road common to all variants — which requires precisely your stated constraint: the differences must live strictly *between* gates, never at them. When saving a second variant, the app should verify the new reference trace actually crosses all 5 existing gate lines (within corridor tolerance) and refuse the "comparable variant" status if it doesn't — that check is what makes the comparability honest rather than assumed.
- Sector times are then genuinely comparable: same start gate, same end gate, different tarmac in between — which is a *legitimate* comparison (the variant choice becomes part of what you're racing, like line choice through a corner).

So: feasible, coherent with the model's own deferral, and medium-sized (schema extension + save-flow check + a "which variant was this?" grouping in results). It should be specced *after* the naming ruling, since its whole vocabulary depends on it.

**Small ambiguity flag:** I read h>>w-**w** and h>>w-**d** as wet and dry (matching the existing rain/asphalt route thread and `StationHomeWet`). If the letters mean something else, correct me — it doesn't change the analysis, but it will change the naming discussion.

---

## 3. Export the "whole app" — backup and restore

**Genuinely new — nothing in the 152-item backlog covers it — and yes, it's feasible.** Everything that makes your app *yours* lives in a known, enumerable set of on-phone stores: the catalog (landmarks/ways/routes/gates), the ride-history store (`results/index.json` + per-ride files), the free-ride cache, settings, and the raw ride recordings. A whole-app export is "zip those into one file"; import is the reverse. Single-user, no accounts, no sync — a file you move yourself is fully consistent with D-001/D-012, so no ruling is violated. It also fixes a known structural weakness: COLD-START §4 lists "one device, never reinstalled" as a load-bearing assumption that's essentially unprotected today — right now, a lost phone loses everything.

Three decisions define the work package, two of them yours:

1. **What's in the file.** Catalog + results + free rides + settings is small (KBs–MBs) and covers "load my routes onto a virgin app" — your stated use case. Including every raw GPS recording makes the file grow forever (raw is append-only by design, D-023) but makes it a true full backup. I'd offer it as one export with a checkbox: "include raw ride recordings". Your call.
2. **Overwrite vs merge.** You said overwrite, and I agree — merge semantics (two catalogs with clashing route ids, two ride histories) is a swamp, and overwrite matches your mental model ("it will overwrite my current app data with this new one"). But overwrite is destructive, so it needs a confirm step that says exactly what dies, and ideally an automatic export-of-current-state *before* the import lands, so a mistaken restore is reversible. That safety step should be non-negotiable.
3. **A version stamp in the file** (not yours to decide, just noting it): the free-ride cache already got flagged for having no schema check (B-133); an import file crossing app versions is the same lesson bigger. The exporter must stamp schema versions and the importer must refuse or migrate, never guess.

One nuance worth a sentence: for the **virgin-build "other people" scenario**, export/import solves *your phone → your new phone*, and *you → a friend who wants your exact routes*. It does not solve the general new-user case — a stranger in another city imports nothing; they need point 1's record-first flow. The two features are complementary, not substitutes, and point 1 is the one the "other people" goal actually depends on.

**Verdict: concrete, actionable, well-defined — a clean small-to-medium WP candidate once you answer decisions 1 and 2.**

---

## 4. Navigation — "go from my location to somewhere new"

**Every question you asked here was already answered, in full, in a document that's been waiting for you since cycle 011: `product/proposals/ROUTING-AND-SEGMENTATION.md` ("type a destination, get a raceable track", answering IDEAS §29).** This fork is literally item 4 of STATE's "Awaiting Nathan" list — "still his fork alone to call." Your note "present to me how we could do it and then I can think about it properly" is therefore an easy ask to satisfy: the presentation exists and needs translating to plain words, not inventing. Here is the short version, mapped to your exact questions:

- **"I don't know if that is possible"** — it is, and *offline*. The recommended engine is **BRouter**: open-source (MIT), free, no account, no key, no server; it literally ships as an Android app and is the offline routing engine inside OSMAnd. Route calculation would run on the phone with no signal.
- **"What is needed for it"** — three real costs. (a) A **custom native module**: no maintained Expo/React-Native binding exists for any offline routing engine — this is priced work, tracked as **B-49**, open. (b) A **74.7 MB routing-data file** downloaded once (too big to bundle in the app). (c) The only part that needs internet is the **search box** (turning "Bondgenotenlaan 5" into coordinates — geocoding). The free service for that (Nominatim) allows 1 request per second and **forbids autocomplete-style search outright**, so the design is: type and resolve the destination while you still have signal ("at the kitchen table"), then ride fully offline.
- **"Can it be done freely"** — yes, the whole routing side is €0 forever. The hosted alternatives (GraphHopper API, openrouteservice) have daily caps and non-commercial clauses, which is exactly why the proposal picks the offline path.
- **"Just Leuven or the whole world?"** — it's a data question, not a code question. The single 74.7 MB tile covers longitude 0–5°, latitude 50–55° — all of Belgium and well beyond your commute. The neighbouring tile is 181 MB. World coverage = downloading tiles on demand. So: start with one tile, expand by download, no rewrite.
- **"This changes the app from known routes (which is my philosophy)"** — the proposal anticipated exactly this worry and built the philosophy in as hard rules: the routing profile *picks the road but never touches a time* (no ETA is ever stored, shown, or compared); a planned route may run the clock and record bare sector times but **cannot claim a PB, colour a sector, or enter the tower until it has 5 clean rides and you ratify it**; and if you ignore the plan, *"the plan loses to the road"* — no reroute prompt, no nag, and at ride end the app offers the trace you actually rode as the candidate route instead. It even refuses to call any suggestion "fastest", for a measured reason: two-thirds of your moving time sits at 22–26 km/h against the assist cutoff, so road choice barely moves the clock — the time lives in junctions and lights. A route is offered as "a sensible way", nothing more. In other words: navigation as designed here doesn't replace known routes — it's a *route factory* whose output must still earn its place exactly like every other route.

**What I'd actually do with your ask:** a small, doc-only work item — "present §29 to Nathan in plain language" (essentially the bullet list above plus pictures and the cost table), after which the fork ruling stays yours. If you lean yes, the two de-risking steps are already named and sized: **B-49** (price the native module — the one genuine unknown) and **B-48** (replay the overlap/segmentation numbers on the 624-ride archive before trusting them). No build should start before the fork is ruled — this is the single biggest scope item on the project's books.

---

## 5. Multiple sports — walking, running, e-bike vs standard bike

**Genuinely new — nothing in the backlog or IDEAS covers it — and it's really two asks of different sizes bundled together:**

1. **E-bike vs standard bike (or any "don't compare these" split within cycling)** is the cheap one, and the project has already built its precedent: the free-ride store exists precisely to keep one category of times from polluting another, and it took three inspection rounds to make that wall hold. A per-ride "equipment/sport" tag that partitions comparison sets on the *same* routes is the same pattern again — same gates, same sectors, separate ghost pools. Small-to-medium, conceptually settled.
2. **Other sports (walking, running)** is bigger than it looks, because the app's honesty numbers are calibrated to your bike. COLD-START §4 flags the e-bike assumption as *"Numbers: load-bearing"* — the sector-length floors (a 3% gain clears noise at ~100–200 m *at cycling speed*), the 40 m corridor, the moving-vs-stopped detection, the gate-spacing defaults all descend from measured e-bike variance. Walking is ~4× slower: sectors that are honest at 300 m on a bike are different beasts on foot, and the stationary-detection thresholds would misfire. None of that is a blocker — the core model (gates, sectors, mean-relative colours, last-10 window) is genuinely sport-agnostic — but each sport needs its own calibration constants and its own comparison pool. That's a real design pass, not a toggle.

**Recommendation: a one-page concept note first, not code** — the same verdict your notes3 workout-app idea got, and for the same reason: it generalizes the engine, and generalizations deserve a page of thought before a line of code. Also worth saying: this is the "other people" thread again (you ride one e-bike; the demand came from your conversations), so its priority depends on the direction decision from the top of this review. One question for you that shapes the note: is sport a property of the *ride* (one route, walked or ridden, separate pools — like the bike-type tag) or of the *route* (walking routes are just different routes)? Your gates-are-shared instincts from point 2 suggest the former, but it's your call.

---

## 6. More colour palettes — pink / light blue / green drafts

**Actionable and cheap — the infrastructure for exactly this was built in cycle 024.** The `design/` folder generates all 18 screen mockups (9 screens × day + night) from one script, `design/make_screens.py`, driven by theme tokens. A new palette = a new token set = 9 more SVGs per palette, generated, not hand-drawn. Drafting pink, light-blue, and green variants for you to look at is a small Designer job with no app code touched — a natural companion to the Inkscape round-trip loop you asked for in notes2 (still unproven, incidentally — no `design/edited/` round-trip has happened yet; reviewing palette drafts could be the occasion that proves it).

Three constraints the drafts must respect, so they don't quietly break settled things:

1. **The verdict colours are not a theme.** D-030 settled the palette as *not a setting* — and the part of that worth defending is the tier language: purple = career-best, green, yellow. That's the app's vocabulary, and it must mean the same thing in every skin, or the product stops making sense. So a "pink theme" recolours the chrome — backgrounds, accents, buttons, the route line — never the verdicts. If themes proliferate, D-030 deserves a one-line clarifying amendment ("chrome themes are free; the verdict palette is fixed") rather than silent erosion.
2. **Contrast is already a live wound** — B-149 (pale purple text on a bare background, a real open app bug) is on the books precisely because low-contrast pastels bite. Light-pastel themes are the highest-risk contrast territory there is; every draft should ship with its contrast ratios checked, not eyeballed.
3. **A small framing thought, take or leave:** in the app and site copy, I'd present these as *themes anyone picks* rather than "for girls / for children" — the drafts can absolutely be designed with those audiences in mind, but labelling them that way in-product ages badly and narrows their appeal. The drafts themselves can proceed regardless.

**Verdict: small, concrete, ready to brief as-is.**

---

## Summary — what's actionable, what's a question, what's just noted

**Concrete, actionable (WP-brief candidates — none of these duplicates the ten cycle-025 briefs already written):**
1. **Virgin/cold-start build epic** (point 1) — finish B-39's empty-seed install path, then build the already-designed retroactive flow (B-35/36/37/42/43) with your save-flow spec (name, endpoint landmarks, percentage-seeded gates snapped away from intersections, adjustable). Large; needs sequencing, not re-design.
2. **Whole-app export/import** (point 3) — new; small-to-medium; overwrite-with-confirm plus auto-backup-before-import; awaiting your two decisions below.
3. **Plain-language presentation of the §29 routing proposal** (point 4) — doc-only, cheap; the fork ruling itself remains yours and blocks any build.
4. **Palette draft pass via `make_screens.py`** (point 6) — small; verdict colours untouched, contrast-checked; doubles as the first real `design/edited/` round-trip.
5. **Comparable-variants mechanism** (point 2, the feasibility half) — feasible, medium; spec it *after* the naming ruling, since its vocabulary depends on it.

**Open questions needing your answer (each one sentence):**
- **The direction ruling:** is "other people can use this" now an official project goal? (It reframes COLD-START from thought experiment to roadmap and sets the priority of points 1, 3, 5, 6.)
- **Nomenclature (point 2):** your "way" collides with the schema's existing "Way" (landmark pair). Rename the old concept, or pick a new word for your fine-grained variant level? Best ruled together with the two naming questions already blocking `WP-route-naming-migration.md`.
- **Export (point 3):** raw ride recordings in the export file, or catalog+results only (or a checkbox)? And confirmed: overwrite semantics with a confirm + auto-backup?
- **Gate seeding (point 1):** confirm "within 1% of ride" means start/end gates at ~1%/99% of distance; and fixed 25/50/75 vs length-scaled sector count (B-38) — I'd take the scaled version for other people's routes.
- **Multi-sport (point 5):** is sport a per-ride tag on shared routes, or do other sports get their own routes? And is this for you or for the future-users thread (priority)?
- **Letters check:** h>>w-**w** / h>>w-**d** = wet / dry?

**Already designed / already answered — cite, don't re-invent:**
- The record-first virgin flow: `product/proposals/COLD-START.md` + B-35/36/37/42/43 (all OPEN, unbuilt).
- All five of your navigation questions: `product/proposals/ROUTING-AND-SEGMENTATION.md` (§29 fork, STATE "Awaiting Nathan" #4; de-risk via B-49 and B-48).
- Gate-adjustment UX: `SETUP-UX.md`'s tap-then-nudge (anti-drag) design.
- The never-compare-different-routes rule your point 2 assumes: D-010/D-015/B-41 — the model already agrees with your "route" definition.

**Just noted:**
- Notes4's convergence with the unbuilt cold-start design is genuine independent agreement — a good sign the design was right, and it's on record that the flow spec is yours as well.
- The e-bike vs standard split reuses the free-ride store's category-isolation pattern; the anti-pollution wall there is the hardest-tested code in the app, which bodes well.

---

*Prepared by a fresh-context research pass over STATE.md, product/BACKLOG.md, product/DATA-MODEL.md, product/proposals/COLD-START.md, ROUTING-AND-SEGMENTATION.md and SETUP-UX.md, and the ten cycle-025 briefs, cross-checked against every point in Nathan's_notes4.md. Overlap with notes1–3 was checked: notes4's nomenclature entry extends (not repeats) notes3's route-renaming ask — see `WP-route-naming-migration.md`, blocked on the same naming rulings; none of notes4's six points duplicates the other nine cycle-025 briefs. No coordinates are cited in notes4, so no map links were needed.*
