# Qualifire — Idea Log

Running capture of Nathan's ideas for the Qualifire app. Append-only; nothing here is a decision yet.

Started: 2026-08-14

---

## 1. Core concept

A mobile app that combines **Strava-like functionality** (GPS tracking to follow and log exercise along a path) with the **F1 qualifying** concept.

## 2. Scope / motivation

- Built as a **personal app first** — for Nathan, not initially for a wider audience.
- Driven by a real daily use case: **biking to and from work every day**.
- The point is to add **an extra challenge** to an otherwise routine commute.

## 3. The qualifying mechanic

- Set a **reference "lap"** — e.g. ride the commute to or from work once, and that ride's time is kept as the benchmark.
- The route is **broken into sections** (F1 mini-sectors / sectors).
- On subsequent rides of the same route, each section is **colour-coded based on whether you improved** on the reference or not — exactly like F1 qualifying timing screens (purple / green / yellow logic).
- Example flow: ride Monday → that becomes the reference → ride Tuesday → sections light up green/red vs Monday.

## 4. The colouring problem (needs detailed thought)

**The problem:** In F1 the colour scheme works because there are multiple drivers — purple = overall fastest sector/lap in the session, green = personal best, yellow = no improvement. Solo, there is only one driver, so the scheme has to be re-derived from something other than "other people".

**Proposed substitute: use time windows instead of competitors.** Replace "other drivers" with "past me over different time horizons", so each colour tier maps to a period.

Sketch (explicitly an example, not settled):

- **Reference lap** set on a recurring cadence — e.g. every Monday, or the 1st of each month. This lap is **purple across all sections** by definition when set.
- **Green** = best time of the *week* for that section — something to chase every week.
- **Purple** = best time of the *month* for that section.
- **Yellow / neutral** = no improvement in the current window.

**Why this is appealing:** it gives a rhythm — a fresh, achievable target every week, plus a rarer, harder target per month. Beating a section stays possible even late in a period.

**To think through in detail:**

- Which window "owns" which colour, and how many tiers are useful (week/month/all-time? session/week/month?).
- What happens at a window rollover — does the week reset wipe the greens on Monday morning? Is a reset motivating or demoralising?
- Should the reference lap be a *deliberate* effort (you know you're setting it) or just whatever you happened to ride?
- Conflict handling: if a section is simultaneously week-best and month-best, purple presumably wins — but is losing the green signal a loss of information?
- Does an all-time PB need its own colour/marker so it isn't lost inside "month best"?

## 5. Feasibility questions raised (2026-08-14)

Nathan's open technical unknowns, in his own framing:

- **How do you even start building this?**
- **Can you access a device's location easily?** Is device GPS something an app can just read, or is it hard/restricted?
- **Are there publicly available maps that people use when building location-based apps?** i.e. does map data have to be bought, or is there a free/open source of it?

### First-pass answers (2026-08-14, to be revisited)

- **Device location is a standard, well-supported API.** On both iOS and Android it is a permissioned system service. In React Native / Expo the usual stack is `expo-location` (foreground + background GPS streams, permissions) plus `expo-task-manager` for tracking while the app is backgrounded. Android additionally needs a **foreground service with a persistent notification** to keep tracking when minimised. `react-native-background-geolocation` is the heavier-duty, battery-aware alternative used by serious tracking apps.
- **The real difficulty is not "getting a location" — it's getting a *good, continuous* track**: background execution limits, OS battery optimisation, GPS noise/drift, and tunnels/urban canyons. That is where commute-tracking apps actually spend their effort.
- **Map data: yes, there is a free/open option.** OpenStreetMap is the open map dataset; MapLibre is the MIT-licensed rendering SDK (a fork of Mapbox SDK v9 from before it went proprietary) and can be used free, including self-hosted tiles. Strava and AllTrails are cited as production apps on open/OSM-based stacks.
- **Commercial alternatives with free tiers:** Mapbox (~25k monthly active users free on mobile, then pay-as-you-go) and Google Maps (moved to free usage caps ~28.5k loads/month, then paid tiers). For a personal single-user app, *any* of these sits comfortably inside the free tier — cost only becomes a real decision if this ever goes multi-user.
- **Important nuance for this project:** for the qualifying mechanic, the map is mostly *cosmetic*. The sectoring, timing and colour logic run on the raw GPS trace (lat/lon/timestamp), not on the map tiles. So the map provider choice is low-stakes and easily swapped later.

## 6. Process idea: a virtual development team (2026-08-14)

This is about *how the project gets built*, not about the app itself.

**Goal: maximum autonomy.** Nathan wants the project to progress largely on its own, with him checking in periodically rather than driving every step.

**The concept:**

- Look up how a **standard developer team for this kind of project is actually composed** (roles, not guesses) and mirror that structure.
- Each team role is played by a **subagent** with its own specialism.
- **Scheduled tasks** run the cycle — Nathan's example was every 5 minutes: each subagent works in its own field, then they "meet" to bring the information together.
- A **boss / coordinator agent** runs the meeting, resolves conflicts, and sets the next cycle's priorities.
- Over several cycles the idea should sharpen from concept into something concrete.
- On demand, Nathan asks for a **summary of current state and progress made**.

**Where does each virtual member "live"?** Proposed: each member gets **their own .md file** containing:

- their personality / role framing
- how they are supposed to work (their remit and rules)
- what they have done so far (their running log)

**Constraints Nathan set:**

- **Token efficiency matters** — keep it to plain text wherever possible.
- There should be a dedicated **records-keeping / librarian agent** whose job is keeping the logs clean and structured, especially as iterations pile up and information volume grows.

### First-pass assessment (2026-08-14)

**Is it possible? Yes, structurally.** Subagents, per-role .md files, a coordinator, and scheduled tasks all exist. The file-per-agent design is the right instinct: it gives each role persistent memory that survives between runs, and plain markdown is about as token-cheap as persistent state gets.

**The real risks, honestly:**

- **Cadence.** Every 5 minutes is far too frequent — each cycle spawns several agents, each re-reading context. It would burn enormous token volume producing churn rather than progress, because there is nothing new to react to between cycles. A meaningful design cycle is more like **daily or a few times a week**. Slower cadence, more substance per cycle.
- **Drift and hallucinated progress.** Agents with no external ground truth will happily generate plausible-sounding "work" and log it as done. Progress needs to be anchored to something real — files that exist, code that runs, decisions Nathan actually approved.
- **Log bloat.** The librarian agent is essential, not optional. Without compaction, cycle N has to read N-1 cycles of history and cost grows quadratically.
- **The boss agent is the token bottleneck** — it must read every member's output. Keeping member reports to a short structured delta (not prose essays) is what keeps this affordable.

**Token-efficiency principles to adopt:**

- Each agent reads *only* its own file plus a short shared state file — never the whole repo.
- Members output **deltas**, not restatements.
- One canonical `STATE.md` as the single source of truth; per-member files hold only their own working context.
- Archive old cycle logs out of the read path; the librarian summarises and prunes.

**Still to do:** actually research real-world team composition for a solo-first mobile app before assigning roles.

## 7. Actuating the team (2026-08-14)

Nathan's question: what's the best way to actually set the subagents going — can he just ask in chat, and can the members be activated together and work in parallel?

**Answer: yes to both.** Three trigger mechanisms, documented in `process/CYCLE.md`:

1. **Ask in chat** — "run a cycle". Claude takes the Team Principal role, sets the agenda, and spawns the named members as subagents in one parallel batch. Recommended default: zero cost when idle, immediate visible outcome.
2. **Name the members** — "get the Race Engineer and Designer to settle the colour tiers". Same machinery, Nathan sets the agenda.
3. **Scheduled task** — a fixed prompt running unattended at the D-003 cadence.

**Parallelism works because of the read-path design.** Members never read each other's files, so nothing orders them — they genuinely run simultaneously. Only the Principal is serial, and only twice per cycle (brief, then meeting).

The binding constraint: a subagent returns only its final message. That is why the member output contract is a fixed 15-line block — it is the entire bandwidth between a member and the team.

## 8. Nathan's decisions (2026-08-14)

- **Cadence (D-003): on demand for now.** No schedule. Cycles run when Nathan asks.
- **Feedback (D-006): live, like Formula 1.** Sector times and colours appear *during* the ride, not only afterwards.

Consequence worth flagging: D-006 moved the hard part of the project. Sectors must now be detected in real time on an unsmoothed trace, with no chance to re-fit after the ride — which rules out post-hoc sectoring and makes GPS noise a live correctness problem. The Designer's safety objection was overruled but kept as binding constraints (no interaction while moving, audio/haptic preferred, and no countdown ticking against a target).

## 9. Prior art and open-source resources (2026-08-14)

Nathan: it's probably interesting to look at what has been done already — what open-source resources exist that could help.

First-pass findings (backlog item raised for a proper survey):

- **Segment mechanics exist in the wild.** Strava's own "segments" are the closest prior art to sectors — worth studying the mechanic even though it's closed source. Open, federated [Open Pace](https://github.com/myfear/open-pace) supports GPX, segments and leaderboards.
- **Open trackers to learn from (or scavenge):** [OpenTracks](https://github.com/topics/strava-alternative) (Android, FOSS GPS logging), FitoTrack, and several [self-hosted Strava alternatives](https://selfhostyourself.com/alternative-to/strava).
- **Building blocks rather than whole apps may be the real win:**
  - [gpxpy](https://pypi.org/project/gpxpy/) — Python GPX parsing; ideal for the offline trace-replay validation the Race Engineer needs (B-16/B-17) before any mobile code exists.
  - [leaflet-gpx](https://github.com/justb4/leaflet-gpx) — track display with moving-time/pause handling already solved.
  - Map-matching libraries (various, incl. Kalman-filter approaches) — directly relevant to D-011's distance-along-route projection.
- **Implication:** the validation pipeline (parse Nathan's GPX traces → sector them → measure variance) can be built as a small desktop Python tool with existing libraries, long before the mobile app exists. That converts B-17 from "waiting" into testable work.

## 10. How to record the traces (2026-08-14)

Nathan asked what "export the GPX" means and whether he needs a watch or special tool.

Answer: a GPX file is a plain text file of GPS points (lat/lon/timestamp) that any tracking app saves. **Phone only, no watch** — deliberately: the phone has the same GPS chip the app will run on, so the measured noise is the real noise. Options: Strava (record → activity page → Export GPX), OpenTracks (Android, FOSS, direct export), Open GPX Tracker (iOS, FOSS). One recording per commute, 5–10 rides, files go into the Qualifire folder → unblocks B-17.

## 11. Strava history as the dataset (2026-08-14)

Nathan already logs his activities on Strava — potentially **hundreds of commutes** ready to go, not just 5–10.

- Export confirmed free, two routes: per-activity (website → activity → three-dot menu → Export GPX) or **bulk archive** (Settings → My Account → Download or Delete Your Account → Request Your Archive; ZIP with full history arrives by email in hours). ([Strava support](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export))
- Archive may contain **.fit** files as well as .gpx depending on recording device — pipeline must handle both (fitparse for Python, alongside gpxpy).
- Impact on B-17: upgraded from "record 5–10 rides" to "mine years of real commute data" — real variance across seasons, weather and traffic. This substantially strengthens the noise-floor estimation (D-008's σ_s and k).

## 12. The dataset, classified (2026-08-14)

- Nathan's archive: 624 GPX rides, Aug 2024 → Aug 2026, all typed `ebikeride`. Each file carries full metadata: start timestamp, per-second GPS points, name, type — but Strava's auto-names ("Actividad por la tarde") are useless, hence renaming.
- Start/end clustering found three recurring locations and a **route switch on 2026-04-13** — Nathan confirmed: he moved house around April. Old commute ~43 min; current commute ~15 min.
- Nathan gave 5 reference rides (13/12/11 Aug home→work; 8/7 Aug work→home); **all 5 matched the automatic classification** — the clustering is trustworthy.
- Naming: Nathan's shorthands collided ("hm"/"hw"/"wh"), so files use explicit `home2work` / `work2home` / `other`.
- Result: `data/activities/` with all 624 files renamed `YYYYMMDD-HHMM-<route>-<stravaID>.gpx`, plus `data/activity-index.csv`. Target route = current commute (D-014): 68 + 63 = 131 rides.

## 13. Route variants — the dataset's first insight (2026-08-14)

Nathan asked whether the home/work classification caught route *variants* — he knows he has alternative ways and suspected one dominant route.

- Path-overlap clustering answered: **morning is one route** (64/68 rides, 4 detours). **Evening splits into two completely different roads** — A = the morning corridor reversed (32 rides), B = an alternative with only 2% overlap (29 rides).
- Nathan doubted the near-50/50 evening split, so the clusters were rendered on an OpenStreetMap view (`data/routes-check.html`). His verdict: *"your evening A and B paths are correct, i just never realized i took path B as much."* — the project's first genuine self-knowledge moment, delivered before any app exists.
- Consequence (D-015): three tracks, each with own sectors and benchmarks; track auto-detected at ride start; unmatched rides uncoloured. Comparing different physical roads would make every colour a lie.

## 14. The lap is scored too (2026-08-14)

Nathan, watching cycle 004 land: "usually the whole ride should also get a colour right — in Formula 1, after each sector, the total lap also gets scored."

Recorded as D-022: at the final gate the lap gets its own tier (moving time vs rolling 7/28-day lap bests, same noise-floor rule — lap σ already measured at ~20–30 s). Lap tier at the live handover moment and heading the post-ride board; final-gate earcon = sector sound then lap sound. The quarantined "ideal lap" line stays untiered.

## 15. The timing tower — ranked finish vs past selves (2026-08-15)

Nathan, watching F1 qualifying: "whats nice about the qualifying is that you have multiple people right and at the end of the lap you will like shoot up into a certain position. I think we could still have that right, but just compared to your previous versions. So if we have a 28 rolling day comparison that we use. Instead of plotting the points, lets have it ranked and at the end of your run you will shoot up in a certain position based on past selfs?"

- The 28-day rolling window (D-021/D-022) becomes a **timing tower of past selves**: today's lap slots into a ranked position at ride end ("P2 of your last 19 commutes") instead of showing an abstract delta plot.
- Needs thinking before implementation (Nathan's words). Composes with Quali Day — defending the reference = defending pole.

## 16. Live screen = big ticking counter + sector blocks (2026-08-15)

Nathan, same session: the live counter on a flying lap ticks up at **0.1 s precision** ("1:38.1" — that level is enough) and takes the **majority of the screen**; sectors are **blocks below** it that light up in the earned colour when completed, each briefly showing the checkpoint time by **overriding the live counter in that colour**.

- Tension flagged: B-15's current spec (under D-006) says *no ticking countdown* — glanceable, audio-first for on-bike safety. Nathan's frame supersedes that for the visual layer; proposed reconciliation (unratified): audio stays the primary on-bike channel, the rich ticking display is the glance/stopped view.
- Nathan offered F1 broadcast screenshots as reference if needed; Designer should take them for the LAYOUT pass.

## 17. Post-run screen rethink; demo = accelerated race mode (2026-08-15)

Nathan, same session, ratifying the direction of §15–16:

- The demo ride "should be an emulation of the real race mode screen when started so we can actually test what it would look like but just faster instead of an actual 15 minute ride" — and must be **kept always in sync with the latest design**. (Structurally guaranteed since cycle 006: demo and real screen share one render path; scripts are data only. The obligation is to keep it that way.)
- **"Sector of the day" is redundant** on the post-run board — the four sector rows are already visible right below it. Drop it.
- The post-run screen will change once the timing tower (§15) exists; Nathan: "lets think about what we actually want to show post run."

## 18. Marketing tool reference: HyperFrames, if app + website ever happen (2026-08-16)

Nathan, speculating about a possible future app + website for Qualifire: flagged [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) as a possibly-useful marketing tool, to note for later.

- HyperFrames (HeyGen, Apache 2.0) turns HTML/CSS into deterministic MP4 video via headless Chrome + FFmpeg — no React/Remotion required, agent-friendly (Claude Code / Cursor / Codex skills), non-interactive CLI.
- Directly relevant piece: its `/product-launch-video` skill takes a website's URL/brief/script and produces a marketing/launch video or site-tour clip, agent-driven end to end.
- Not actionable now — no website exists yet (D-001: personal app, no store-distribution work). Revisit if/when a Qualifire website gets built.

## 18. Red-light handling: auto-pause toggle, or a manual red-light button? (2026-08-16)

Nathan, deferring the moving-time formalization to a proper meeting: "My idea was to have a toggle to include or exclude the auto pause option at red lights. Other ideas could be instead of autopause having a red-light button on your screen when in race mode that allows you to stop it yourself when you are arrested?"

- Two candidate mechanisms: (a) settings toggle — auto-pause (stop detection) on/off; (b) manual red-light button on the race screen — rider stops the clock personally, F1 red-flag style.
- To weigh next cycle (with B-20's gate-move pros/cons, also deferred by Nathan): auto-pause is measured and untouchable mid-ride (D-006 inert screen, colour-trust); a manual button adds ceremony but makes stopped time self-reported and touches the inert-screen rule. Not decided.

## 19. Colour-logic rethink: rolling last-N average (2026-08-16 batch — NOT acted on, next cycle)

Nathan: "rethink entirely the way we track previous result." Look at the last ~10 times a route was ridden and compute the average: **green = above (better than) average, yellow = below average, purple = best of the last N**. Same logic for the whole-ride colour.

- CONFLICTS with D-007/D-008 (green = 7-day best, purple = 28-day best, neutral tier) and touches D-028's tower framing — this is a proposed replacement, not an addition. Team to lay out side-by-side pros/cons (noise-floor behaviour, how often each colour fires, what "yellow" means emotionally vs the current neutral).
- Note the tower (§15) already ranks the last-N laps — this idea makes the colour system and the tower share one comparison set.

## 20. "Ways": expand from 3 commute tracks to many known rides (2026-08-16 batch)

Nathan often rides more than home↔work. New reference folder: `data/activities/TEST in app rides/` — 4 app-recorded rides from 2026-08-16: 10:05 home→work (test run), 10:20 work→church, 12:16 church→"fosh" (the central bike parking in Leuven), 19:26 Leuven station→home.

- Likely most of these trajects (or parts) already exist in the 624-ride archive — mine it to seed each new way.
- Expansion = more (start, end) pairs, each with own gates/benchmarks, same per-track honesty rules (D-015).

## 21. Landmarks + start-place autodetection + ghost count (2026-08-16 batch)

First step for §20: define **landmarks** — home, work, church, fosh, Leuven station, Puttestraat (family home in Tervuren; the old ~43-min commute started there), plus whatever else the archive shows Nathan visits often (frequency analysis task, next cycle).

- Flow idea: press START → app autodetects the starting landmark (+ option to correct a wrong guess) → rider picks a destination → app says "**X rides found**" so you know how many ghosts you're competing against.
- Gates per way defined in advance and pretty fixed — permuted only early on for optimization, then stable.
- Small comparison sets are fine: fewer than 10 rides → still compute mean and compare. Where more exist, cap the window at the last 10 (or 20 — **team to discuss the N**; Nathan's reasoning: a rolling window means an unbeatable freak time expires — e.g. at ~daily riding, every ~20 days a fresh chance to set a new benchmark).

## 22. Gates closer to the true start/finish (2026-08-16 batch)

Begin/end gates can sit much closer to the actual start and finish positions — "the best feeling of really pushing to the end and starting the hot lap close to the beginning." (Current START gates sit ~160 m out for GPS-arming reasons — Race Engineer to check how close is safe with real app data.)

## 23. GPX+ diagnostic export (2026-08-16 batch)

What does the GPX export contain — only location? Idea: a "**GPX+**" export adding development/troubleshooting info: which gates were detected and when, time from pressing START to first fix/first gate, connection or location losses, and (once §20–21 exist) the detected starting landmark, the auto-guess, and any manual correction. Standard GPX supports extensions — keep it importable by Strava/viewers.

## 24. Live-screen space feedback (2026-08-16 batch)

- STOP button is too big (~quarter of the screen) — shrink it.
- The ongoing-check lines ("detecting route…"/route locked, fix count, "GPS live") shouldn't stack vertically: one compact rotating status slot (don't label it "status" on screen), cycling one item every 5–10 s.

## 25. Real maps (2026-08-16 batch)

"A big upgrade for everything related to maps" — think through a real map overlay on the live ride if possible, and in the routes/setup section. (MapLibre already sits optional on the D-026 build-3 slate; needs a native module → rebuild.)

## 26. Kill the Preview tab; the app IS the latest version (2026-08-16 batch)

Stop maintaining a separate Preview: the real tabs should simply look like the latest implemented design (if a routes tab exists, it goes in the bottom bar). Keep ONLY the demo as its own tab — quick testing of sound/colour/flow. And update the demo with the §20–21 expansion: in the demo you can try start-detection, pick an endpoint, then run it accelerated.

## 27. Beta-tester agents (2026-08-16 batch)

New agents outside the core team: ~10 **beta testers**, each with a profile of a plausible user, walking through every step of app usage the way Nathan would, reporting improvements, gaps, and feedback — hoping to speed up development. (Team note: costs tokens per run; propose a cheap format — e.g. run 3–4 per cycle on the mockup — before committing to 10.)

## 28. What does a freshly shipped app look like for someone else? (2026-08-17)

No preseeding of Strava data. Should a few reference rides suffice to make up the whole workflow? Then there should be in-app options to set the landmarks and pick reference trajects + alternatives and so on.

## 29. Google-Maps-style: type a destination and race it (2026-08-17)

The idea of having it like a Google Maps where you just type where you want to go and it will calculate the fastest way there + segment the ride into sections to compete against — based on previous runs that share portions, if available. If it's a completely new ride, no comparison, but still able to set the gates and segments so a next run can be comparable.

## 30. Live vector maps — parked, waiting on the tooling (2026-08-17)

Nathan, closing the map thread: *"maybe future technological upgrades and tools will make this easier, lets keep it at that for now, an idea."*

Parked deliberately, not rejected. The team costed it fully first (cycle 010, cycle 011's `product/MAPLIBRE-SPIKE.md`, cycle 012) and the shape of the answer was: technically clean, strategically premature. `@maplibre/maplibre-react-native` 11.3.6 is developed against this project's exact Expo 56 / RN 0.85.3 / React 19.2.3 combination, so installing it is a two-line change. What it costs is not the install — it is losing Fast Refresh on the map surface permanently, an unmeasured battery draw on a foreground-service GPS loop, and a PMTiles file that has to be copied to `filesDir` on first run. And what it buys today is a route outside the three ratified assets, which only exists if §29 is adopted, which in turn needs a routing engine that has no maintained Expo binding (B-49).

So the thing to watch is not MapLibre. It is whether the surrounding tooling gets easier: a maintained Expo routing binding, an offline-first map component that does not cost a rebuild to iterate on, or a phone that makes the battery question uninteresting. Any of those flips this from "costed and declined" to "obvious".

What stands in the meantime: D-031/D-038's pre-rendered Esri crop under each route — a real map, offline by construction, no native module — and D-033, no map on the live ride screen, which three roles reached independently and which nothing here changes.

---

## Open questions (to resolve later)

- Reference lap: fixed at first ride, or rolling personal best per section?
- How are section boundaries defined — auto-split, distance-based, or manual?
- Does a "theoretical best lap" (best of each section combined) exist, F1-style?
