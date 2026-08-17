# Cycle 011 — 2026-08-17

Trigger: Nathan, on the back of cycle 010's map ruling — *"if the MapLibre design can get implemented lets have the team (or a new member) think about expanding capabilities"* — with two questions transcribed into `IDEAS.md` as **§28** (what a freshly shipped app looks like for someone else, no preseeded Strava data) and **§29** (type a destination, get a route, get it segmented into raceable sections).

Nathan ruled the frame before the cycle ran: **MapLibre = feasibility spike, then decide**; **§28 = design lens only** (still a single-user app — the cold start matters because it is also the path for a new way, a new city, and a reinstall); **roster = existing roles plus one new seat.**

Four members ran in one parallel batch: Mobile Developer, Product Owner, Designer, and the **Navigation Engineer** — a new seat, created this cycle.

## The finding: the two ideas are one idea, and they unlock each other

They arrived as separate questions and they are not separable.

- **§28 needs §29.** The Designer's honest objection to "set the gates before a completely new ride" is that a gate is a chainage value on a polyline, and a route nobody has ridden has no polyline — so gates placed on nothing would be a lie drawn on a map. Correct, and it holds absolutely — *unless a router draws the polyline first.* §29 is the one thing that makes §28's request truthfully answerable before ride 1 rather than one ride later.
- **§29 needs MapLibre.** Independently, from the asset side, the Mobile Dev found that every PNG in `app/assets/routes/` is baked by Python from a ride already ridden, into a fixed 900×1400 window at 4.47 m/px. A typed destination produces a corridor that is not in that window, for a line no GPX contains. Both escape hatches (render on-device from geometry; pre-bake a wider coarser asset) are worse than a real basemap.
- **So D-032's trigger condition has been reached.** It read: "a capability the pre-rendered asset genuinely cannot serve — pan/zoom, or a route outside the three ratified assets." That is §29, exactly. Recorded as **ARMED, not fired** — it fires when Nathan adopts §29, and never for cosmetic reasons.

The chain runs one way and only one way: **§29 adopted → MapLibre justified → §28 answerable before the first ride.** If §29 is not adopted, MapLibre stays out and §28's answer is the Designer's arrival card, one ride later.

## Member deltas

| Role | Delta |
|---|---|
| **Mobile Dev** | `product/MAPLIBRE-SPIKE.md` (96 lines, nothing installed). Compatibility settled on evidence, not opinion: `@maplibre/maplibre-react-native@11.3.6` pins `expo 56.0.8` / `react-native 0.85.3` / `react 19.2.3` in its own CI — our exact pins. Build diff is one dep + one plugin string: no new permissions, no Gradle, keystore and applicationId untouched, 1 of 15 monthly builds. **Overturned D-032's tile source** — OpenFreeMap's ToS bars automated bulk collection, which is what cutting an offline pack is; Stadia prohibits it outright. Verdict **GO WITH CONDITIONS**, conditions not met today. |
| **Navigation Engineer** | `product/ROUTING-AND-SEGMENTATION.md` (167 lines). **BRouter** picked (MIT, genuinely on-device Android, `E0_N50.rd5` = 74.7 MB covers the whole commute region, €0, no VPS). Found the real network dependency is **geocoding, not routing** — Nominatim caps at 1 req/s and forbids autocomplete outright, so typing a destination is a kitchen-table action and riding to it is not. Named both required numbers: overlap tolerance **25 m**, minimum shared length **800 m** contiguous plus one whole sector. |
| **Product Owner** | `product/COLD-START.md` (116 lines). "A few reference rides" resolves into three numbers: **2** buys the whole workflow, **5** buys the first verdict (`MIN_HISTORY`), **10** fills the window. Structural finding: on a virgin install **setup is retroactive** — §21's START→autodetect→destination flow is archive-dependent end to end, so landmarks must be born at STOP. Audited what is secretly Nathan-shaped, and found the 624-ride archive is the most load-bearing assumption in the project. |
| **Designer** | `product/SETUP-UX.md` (140 lines). **No seventh tab** — split setup by *frequency*, not subject: the read-only ROUTES tab becomes the editable catalog, RECORD keeps exactly one setup affordance. Cold launch → START is **1 tap**, no typing, no destination asked; the destination is learned from where the rider *stops*, on an arrival card whose single answer creates landmark + way + route + reference + four proposed gates. One honesty mechanism, the **depth strip**, which retires the `⚠n/5` warning glyph rather than adding to it. |

## The defect the cycle found by accident

The Product Owner went looking for what the cold-start ladder implies about ride counts and found a live bug instead. **The Principal verified it in the code before recording it**, per the anti-hallucination rule:

`ghostsFor()` returns `[...GHOSTS, ...recordedResults()]`, and `rememberRide()` ends with `pushRecorded(last)`. So by the time `ResultScreen.tsx:53` sets `others = laps` for a real finished ride, **today's lap is already inside its own comparison history.** Three consequences: `value < st.best` can never be true, so a personal best **can never render purple on the Result screen**; `positionAmong` prepends the value to a history that already contains it, so ten rides read "P1 of 11"; and `MIN_HISTORY` is reached one ride early. Filed as **B-44** with an acceptance test.

Same shape as cycle 009's finding, and the same lesson: the bugs in this project are living in the seams between two correct-looking pieces of code.

## Decisions

| ID | Content |
|---|---|
| **D-034** | Offline tiles are a **local PMTiles corridor extract** (Protomaps, ODbL, `pmtiles://file://`), not a hosted style. Amends D-032's tile source; MapLibre stays the renderer, OpenFreeMap demoted to kitchen-table fallback. Records the trap that `pmtiles://asset://` is unsupported, so a copy-to-`filesDir` bootstrap is real work. |
| **D-035** | MapLibre's trigger is **ARMED, not fired**. Four conditions gate the build: the zero-EAS-build install spike passes; battery is *measured* (+2 to +5 pp is an estimate, >5 pp is NO-GO); tiles are D-034's local file; and it rides along on a build already being spent. Records the permanent cost — the map stops reaching the phone over Fast Refresh — and the migration map (2 of `routeMapMath.ts`'s 5 exports replaced, engine untouched, PNG kept as the offline fallback rung). |
| **D-036** | A planned route **may keep time; it may never compare**, until 5 clean rides. From ride 1 it runs the clock, fires gates and shows bare numbers; it may not claim a benchmark, colour a sector, enter the tower, be offered at START, or inherit archive ghosts. Geometric gates are a **starting grid, not a benchmark**. No routing engine's ETA is ever stored, shown or compared — and the default profile is never called "fastest" (66.3% of moving time sits under the 25 km/h assist cutoff, so road class barely moves this bike's clock). Binding on any §29 implementation, adopted or not. |
| **D-037** | The comparison window is the **last 10 rides**, not 28 days. D-028's wording was stale; the code was right. Settled with it, because it is the same number: the Designer's depth strip has **ten slots** — one per window place, not one per ladder rung. |

## Backlog

**B-35 … B-49 added.** B-35–B-45 are the Product Owner's rows, renumbered by the Principal from her proposed B-31–B-41 because cycle 010 had already spent B-31–B-34 — an ID collision she flagged herself. **B-46–B-49 are Principal-drafted** from the Mobile Dev's and Navigation Engineer's reports and are the Product Owner's to reword at her next pass; they are marked as work, not as decisions. B-45 landed already DONE via D-037.

Note that **B-46 (the MapLibre install spike) is explicitly gated** on Nathan adopting §29. Running it earlier would be spending effort on an armed-but-unfired trigger.

## Disagreements, preserved

1. **Designer vs. Nathan, on §29's own words.** Nathan asked to "set the gates and segments" before a completely new ride. The Designer declined it as not truthfully possible and offered the earliest honest moment instead — the arrival card, one ride later. The Navigation Engineer's routing design *does* make it possible before ride 1. **Both are right, in different worlds**, and which world this is depends entirely on whether §29 is adopted. Not averaged away; the resolution is Nathan's ruling, not the Principal's.
2. **Mobile Dev vs. D-032, on tiles.** Settled in the Mobile Dev's favour on ToS evidence — D-034.
3. **The Race Engineer did not run and has three questions waiting**: whether `origin: 'geometric'` sectors may ever earn a tier; whether a 3-ride comparison set is enough (D-008 says <5 stays neutral, IDEAS §21 says small sets are fine — that conflict is his); and whether a partially-overlapping ride enters a window at full weight. Nothing downstream of §29 should be built before he rules.
4. **F-4 remains open** (Product Owner, honestly logged): Nathan's cycle-003 words were "ride Monday → ride Tuesday → sectors light up". Under `MIN_HISTORY = 5` they light up on ride 5. The ladder proposes a reconciliation — on day two something *does* appear, but it is a delta in ink, not a tier. Recorded as a deviation from Nathan's words, not a resolution of them.

## Awaiting Nathan

1. **The §29 ruling.** Everything above hangs off it: MapLibre's trigger, the routing native module (B-49), and whether §28's gates can be set before ride 1 or one ride after. This is the single most consequential open question in the project right now.
2. **B-44** — the PB-can-never-go-purple bug is live on the phone today, independent of everything else here.
3. Unchanged from cycle 010: Monday's commute, and the B-32 basemap ground question (light wash vs near-monochrome dark).
