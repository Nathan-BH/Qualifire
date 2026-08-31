# Decision Log

Append-only. Written by the Team Principal. Never delete or renumber — supersede instead.

Format:
```
## D-NNN — <title>
Date: YYYY-MM-DD · Status: ACTIVE | PROVISIONAL | SUPERSEDED by D-NNN
Decision: <what was decided, one sentence>
Rationale: <why>
Reversibility: cheap | moderate | expensive
```

`PROVISIONAL` = the team is operating on it, but Nathan has not confirmed it.

---

## D-001 — Personal single-user app first
Date: 2026-08-14 · Status: ACTIVE — **scope reading amended by D-045 (2026-08-26)**
Decision: Qualifire is built for Nathan alone; no multi-user, social or store-distribution work.
Rationale: The motivating use case is his own daily commute. Multi-user concerns (accounts, privacy, leaderboards, moderation) would multiply scope before the core mechanic is proven fun.
Reversibility: moderate — data model should avoid hard-coding "one rider", but nothing else needs to anticipate it.

**AMENDED by D-045 (2026-08-26):** "someone else besides Nathan can use this app" is now an actual goal and a top priority — no longer a keep-in-mind design lens. What is committed is a virgin blank-install app another rider could use, driving the virgin-cold-start epic's priority; this entry's no-accounts/no-social/no-store clauses are not re-ruled by D-045.

## D-002 — The map layer is cosmetic
Date: 2026-08-14 · Status: ACTIVE
Decision: All sectoring, timing and colour logic operates on the raw GPS trace (lat/lon/timestamp), never on map tiles or a provider's routing API.
Rationale: Keeps the map provider a swappable, low-stakes choice; avoids vendor lock-in and cost exposure; makes the core logic testable without a map at all.
Reversibility: cheap now, expensive later — worth fixing early.

## D-003 — Cycles run on demand only
Date: 2026-08-14 · Status: ACTIVE — confirmed by Nathan
Decision: The virtual team runs **only when Nathan asks**. No scheduled cadence for now.
Rationale: A cycle is only productive if something changed since the last one, and in the concept phase the thing that changes is usually Nathan's own thinking. On-demand costs nothing when idle and keeps every cycle tied to a real prompt. Scheduling can be added later without changing anything else.
Reversibility: cheap — it is a scheduling setting.

## D-004 — STATE.md is the single source of truth
Date: 2026-08-14 · Status: ACTIVE
Decision: Current project state lives in exactly one file. Duplication elsewhere is a bug. One writer per file, per the table in `process/CONVENTIONS.md`.
Rationale: Multiple agents writing overlapping state is the fastest route to contradictory records and unbounded read costs.
Reversibility: cheap.

## D-005 — Progress must be grounded
Date: 2026-08-14 · Status: ACTIVE
Decision: A claim of progress must point to a file that exists, a dated decision, or be explicitly labelled `UNBUILT`.
Rationale: Agents reliably narrate work they have not done. Without a grounding rule the logs become confident fiction.
Reversibility: cheap.

## D-006 — Sector feedback is live, F1-style
Date: 2026-08-14 · Status: ACTIVE — Nathan's call, resolves B-06
Decision: Sector times and colours are shown **during the ride**, as each sector completes — the F1 timing-screen experience — not only in a post-ride summary.
Rationale: Nathan's decision. The whole appeal of the qualifying concept is the live feedback loop: knowing mid-lap that you are up or down changes how you ride the next sector. Post-ride-only reduces it to a report card, which is what existing trackers already do and what the app exists to improve on.
Dissent recorded: the **Designer** argued against live feedback on safety grounds — live timing invites chasing a purple through a junction. Overruled on the product argument, but the safety concern is not dismissed; it becomes a binding design constraint (below).
Reversibility: moderate — it shapes the primary screen and the real-time computation path.

**Binding constraints that follow from D-006.** Live feedback is adopted *with* these, not instead of them:

- Feedback must be **glanceable in under a second** and must never require interaction while moving.
- Delivery should favour **non-visual channels** where possible — audio cue or haptic on sector completion — so eyes stay on the road. `[UNBUILT — Designer to propose]`
- **No live countdown or delta ticking against a target.** A number counting down toward a benchmark is precisely the thing that pulls a rider through an amber light. Report the sector *after* it completes; do not narrate the chase.
- The Designer holds a standing mandate to flag any live-feedback design that fails these, and the Principal must record it.

## D-007 — Three colour tiers, all-time PB as a badge
Date: 2026-08-14 · Status: ACTIVE — cycle 001
Decision: Exactly three visual tiers on the live surface: **purple** (beats long-window best), **green** (beats short-window best), **neutral** ("time posted" — styled as F1 yellow, never failure-grey). All-time PB is a badge dot, not a fourth colour. Reference-lap comparison is a delta number, not a tier. Redundant non-colour cues (filled/outlined/flat chips + delta) are mandatory.
Rationale: Race Engineer and Designer converged independently. Designer's subsumption argument: a month-best is necessarily also a week-best, so purple losing green's signal loses nothing. A fourth colour requires recall of a legend, which fails the glance test.
Dissent: none — rare convergence.
Reversibility: cheap on tier count, moderate once screens are built.

## D-008 — Colour benchmarks use ROLLING windows; noise floor is mandatory
Date: 2026-08-14 · Status: ACTIVE — **confirmed by Nathan 2026-08-14** · **AMENDED by D-045 (2026-08-26): noise floor deleted** (tier definitions were already superseded by D-030)
Decision: Green = beats trailing-7-day sector best; purple = beats trailing-28-day sector best. Rolling, not calendar. Colour only when improvement exceeds max(k·σ_s, absolute floor), where σ_s is that sector's ride-to-ride spread; sectors with <5 clean rides stay neutral. Colour on **moving time**; raw time surfaced; stop-containing sectors flagged "interrupted", GPS-gap sectors "estimated"/uncoloured. All benchmarks frozen at ride start (makes live colouring an O(1) comparison, per D-006).
Rationale: Rolling windows kill the Monday-morning cliff where a calendar reset wipes every green — benchmarks age out one ride at a time. The noise floor exists because smartphone GPS gives ±1–2 s sector precision `[UNVERIFIED — k and σ_s need real traces]`; colouring improvements smaller than the rider's own variance is colouring coin flips.
Deviation flagged: Nathan's original sketch had calendar weeks/months. Rolling preserves the intent (fresh weekly target, rarer monthly one) while removing the reset cliff — **needs Nathan's confirmation**.
Reversibility: cheap — a window function.

**AMENDED by D-045 (2026-08-26):** the noise-floor clause ("sectors with <5 clean rides stay neutral") — the one part of this entry D-030 had explicitly kept alive — is deleted; MIN_HISTORY no longer exists and colours run from ride 1 (first-ever ride: all purple). What still survives from this entry is rolling windows, not calendar ones.

## D-009 — Reference lap: automatic, monthly, per direction
Date: 2026-08-14 · Status: **SUPERSEDED by D-017** — Nathan ruled the other way
Decision: The reference lap is set **automatically** from the first complete route-matching ride of each calendar month, per direction, silently. Old references archived, never deleted. Diverted/partial rides ineligible. Must be a real continuous traversal, frozen before comparison — never a composite of best sectors.
Rationale: Product Owner, from Nathan's own words ("ride Monday → that becomes the reference" implies an unprepared ride). A deliberate benchmark day is a scheduled exam that punishes illness and rots into a chore by month three. Race Engineer adds the correctness constraint: comparing against a lap that never happened breaks trust in every colour downstream.
Note: under D-008 the reference is the **delta baseline**, not a colour tier — Nathan's "purple across all sections by definition" on reference day doesn't survive in this model. Flagged for his confirmation.
Reversibility: cheap now.

## D-010 — To-work and from-work are separate boards
Date: 2026-08-14 · Status: ACTIVE — cycle 001
Decision: Each direction is its own route with its own sectors, benchmarks and reference, set independently.
Rationale: Elevation, wind and traffic invert with direction; a shared board makes colours lie. Product Owner confirmed, Designer independently assumed, no member argued otherwise.
Reversibility: moderate — touches the data model.

## D-011 — Sector detection: distance-along-route projection with gate lines
Date: 2026-08-14 · Status: ACTIVE — working direction, entirely UNBUILT
Decision: Real-time sectoring uses monotonic windowed chainage on the reference polyline, with gate-line crossing semantics: boundary timestamp interpolated between bracketing GPS fixes, hysteresis latch disarming the gate until ~D m past. Signal loss → interpolate, mark "estimated". Pure geofence circles and pure gate lines rejected. Constraint exported to sector design: boundaries never at stop lines or junction centres — gates go downstream of junction exits so queues wait before the gate.
Rationale: Projection absorbs lateral drift, the dominant urban GPS error (~4.9 m open sky, ~7–13 m urban canyon `[sources in race-engineer.md log]`). Live constraint (D-006) rules out post-hoc re-fitting.
Reversibility: moderate — but nothing is built, and validation on real traces comes first.

## D-012 — Stack and build pipeline (Android-only, $0)
Date: 2026-08-14 · Status: ACTIVE — cycle 002
Decision: React Native + Expo **dev-build** workflow (not Expo Go — it cannot host Android foreground services), expo-location + expo-task-manager, TypeScript, MapLibre. Dev loop: code on the Windows PC, one dev-build APK installed on Nathan's phone, then live reload over WiFi. Distribution: sideloaded APK via EAS cloud build (free tier 15 Android builds/month) or unlimited local builds; no Play Store. Build order is phased: **Phase 0 is a PC-only GPX validation harness in TypeScript** (logic imports into the app later) → minimal tracker → post-ride sectors → live sectors → map.
Rationale: Mobile Dev verified against 2026 sources: Expo foreground-service background GPS confirmed supported; EAS free tier confirmed; whole pipeline $0. Phase 0 first because the timing model must be validated on recorded data before any phone code exists.
Note: role woken early by Nathan's explicit override (activation trigger B-02 not yet met) — scoped to B-08.
Reversibility: moderate once code lands; cheap today.

**Note (D-045, 2026-08-26):** this entry is cited (with D-001) as grounds for treating "someone else can use this" as a design lens only — e.g. COLD-START's header. That reading is superseded by D-045: other people using the app from a blank install is a top-priority goal. The stack and pipeline recorded here are unchanged.

## D-013 — Screen layout spec accepted as working design
Date: 2026-08-14 · Status: ACTIVE — cycle 002, entirely UNBUILT
Decision: `product/LAYOUT.md` is the working UI spec: five screens, one nav stack, no tab bar; LIVE → post-ride BOARD transition fires automatically at the final gate (no "end ride" button on the happy path). Interrupted sectors keep an earned tier (moving time) with a ‖ glyph; estimated sectors render dashed-grey with delta suppressed and **never** get a tier colour or earcon. Tier ladder doubles as a visual-weight ladder (filled > outlined > flat); palette contains no red; exact hex values deferred behind a colourblindness/contrast acceptance test.
Rationale: Designer, building on D-006/D-007 constraints. The earcon rule protects trust: a chime on interpolated numbers would poison real chimes.
Reversibility: cheap — it is a spec.

## D-014 — Target route identified and dataset classified
Date: 2026-08-14 · Status: ACTIVE — confirmed by Nathan
Decision: Qualifire targets the **current** commute: home (≈50.8365, 4.638) ↔ work (≈50.8634, 4.688), ~15 min by e-bike, ridden since 2026-04-13 (Nathan confirmed he moved house around April 2026). The 624-activity Strava archive is classified against these anchors: **68 home2work + 63 work2home + 493 other**. The older ~43-min A↔B commute (Sep 2025–Apr 2026) is "other" — usable as extra test data, not the target.
Validation: Nathan supplied 5 reference rides by date/time; all 5 matched the automatic start/end-cluster classification exactly.
Data layout: `data/activities/` holds all 624 GPX files renamed to `YYYYMMDD-HHMM-<route>-<stravaID>.gpx` (local time, Europe/Brussels); `data/activity-index.csv` is the machine-readable index; original ZIP kept in `data/`.
Note: rides are typed `ebikeride` — the e-bike (motor cutoff, assist level) may compress time variance; Race Engineer to account for this in σ_s work.
Reversibility: cheap — classification is re-runnable from the untouched originals in the ZIP.

## D-015 — Three tracks, not two boards
Date: 2026-08-14 · Status: ACTIVE — clusters visually confirmed by Nathan
Decision: Qualifire tracks three physical routes, each with its own sectors, benchmarks and boards: **Morning** (home→work corridor, 64 rides), **Evening A** (same corridor reversed, 32 rides), **Evening B** (a completely different road home, 29 rides — 2% path overlap with A). The app auto-detects the track early in the ride by matching the live trace against reference polylines (D-011 projection); rides matching no track go uncoloured. Supersedes the simple two-direction reading of D-010 (its principle — never compare different physical roads — is preserved; this applies it one level deeper).
Basis: path-overlap clustering of all 131 commute rides (grid-cell Jaccard > 0.55), rendered on `data/routes-check.html`; Nathan confirmed both evening paths are correct and was himself surprised by the near-50/50 evening split — the dataset's first real insight.
Data: `data/activity-index.csv` now carries a `variant` column: main/A/B/offroute (64/32/29 + 6 offroute).
Reversibility: moderate — track count shapes the data model; but dropping a track later is deletion, not redesign.

## D-016 — Measured numbers adopted; D-011 amended
Date: 2026-08-14 · Status: ACTIVE — cycle 003, from B-19 analysis (125 rides, scripts re-runnable in `data/analysis/`)
Decision: The timing model now runs on measured values, replacing cycle-001 estimates:
- Noise: σ/T ≈ 2.1–3.3% at all sector lengths; GPS gate-timing error ≤ ~0.5 s (the ±1–2 s assumption is retired). A 3% improvement clears 1·σ_s from ~200 m — the old ≥300–500 m sector floor was 2–5× too conservative. **Sector count is limited by glanceability (D-007), not noise.**
- **Four sectors per track**; proposed gate positions in `data/analysis/gates_proposal.csv` (all in measured zero-stop, high-speed zones). Colour margin at k=1: 4–10 s on 160–240 s sectors. Evening S1s deliberately absorb the traffic lights.
- Moving-time colouring (D-008) confirmed on data: Morning is essentially stop-free; evening stops double raw-time spread.
- E-bike (D-014): 25 km/h assist-cutoff compression confirmed — 66% of moving time at 22–26 km/h. Gains concentrate at junction exits and climbs, which is the right incentive.
- **D-011 amendments** (measured failure modes): (a) bounded forward-only re-acquisition (~400 m, never backward) after off-route excursion + rejoin; (b) START-gate arming rule for late GPS lock. Clean-ride gate miss rate 0.5%, zero double-fires.
- Stack note from prior-art survey: earcons must use **expo-audio** (expo-av removed in Expo SDK 55).
Gate positions: **approved by Nathan 2026-08-14** ("fine for now, can still be updated anytime") — updatable, per B-20's gate-move semantics.
Reversibility: cheap — all derived, re-runnable from raw data.

## D-017 — Reference ride is a deliberate event (semantics to be designed)
Date: 2026-08-14 · Status: ACTIVE — direction set by Nathan; mechanics open
Decision: Against the Product Owner's automatic-monthly proposal, Nathan ruled that a **deliberate reference ride is part of the fun** — "something to look forward to". The reference is therefore an intentional event, not a silent automatic one. Exact mechanics are open for the PO to redesign: declare-before-riding vs promote-after-the-fact ("make this ride my reference"), cadence, and what protects the bad-day principle now that the exam-day objection was overruled.
Dissent recorded: PO argued a scheduled benchmark punishes illness and rots into a chore; overruled on the same grounds as the Designer in D-006 — the anticipation *is* the product. The bad-day concern transfers as a design constraint, not a veto.
Reversibility: cheap until built.

## D-019 — Sector feedback: one buzz, three sounds
Date: 2026-08-14 · Status: ACTIVE — Nathan's ruling on the mockup
Decision: Haptics are a **single buzz** on every sector completion — no per-tier pulse patterns (Designer's 1/2/3-pulse scheme is dropped). Tier differentiation lives in the **earcons**: three distinct sounds for purple, green and neutral. Designer to fold into `LAYOUT.md` and spec the three sounds (B-23).
Rationale: Nathan, after running the mockup demo: counting buzzes while riding is decoding, which the Designer's own glance rule opposes anyway. Sound carries tier identity better than vibration count.
Reversibility: cheap.

## D-020 — All user-testable HTML lives in `demos/`
Date: 2026-08-14 · Status: ACTIVE
Decision: Anything Nathan opens in a browser goes in one folder: `demos/` (currently mockup.html, routes-check.html, gates-check.html). Agents producing a testable HTML artifact write it there, not beside their working files.
Rationale: Nathan shouldn't hunt through the project tree to find what he can test.
Reversibility: cheap.

## D-021 — Reference ride: "Quali Day" design
Date: 2026-08-14 · Status: ACTIVE — cycle 004, implements D-017; two taste items flagged to Nathan
Decision: The deliberate reference (D-017) works as follows, per Product Owner design. **Declare-before is primary**: one-tap arm at ride start; the attempt attaches to whichever track auto-detection matches; diverted/unmatched attempts void silently. **Promote-after exists as a quiet secondary** ("make this ride my reference" on any past clean board; real continuous traversal only, never composite). **Ceremony**: keeping a new reference shows a one-ride all-purple "REFERENCE SET" post-ride frame — restoring Nathan's original "purple by definition" moment as display only; rolling-window tiers and earcons run unchanged underneath. **Grace rule**: post-ride choice reads "New reference set" vs "**Reference defended**" — declining is a race outcome, not a failure; no attempt counters or streaks stored. **Cadence**: free-form, no schedule; reference persists until replaced; age shown, gentle nudge ~28 days. One reference per track; until a track has one, its board shows tiers but no delta. References are never pre-seeded.
Flagged for Nathan's taste: does promote-after deserve to exist, and the 28-day nudge threshold.
Reversibility: cheap until built.

## D-022 — The lap is scored too
Date: 2026-08-14 · Status: ACTIVE — Nathan's ruling, mid-cycle-004
Decision: At the final gate, the **whole lap gets its own tier**, F1-style, alongside the last sector: lap moving time vs rolling 7-day (green) and 28-day (purple) lap bests, same noise-floor rule (lap-level σ is already measured: ~20–30 s MAD per track). Lap tier appears on the live screen's handover moment and heads the post-ride board. Earcon at the final gate: sector sound then lap sound if green/purple — Designer to spec the combination (B-26). The "ideal lap" line remains quarantined and untiered.
Rationale: Nathan — "in Formula 1, after each sector, the total lap also gets scored." Consistent with D-007/D-008 by construction.
Reversibility: cheap.

## D-023 — Storage v1: append-only JSONL, raw-forever, no cached benchmarks
Date: 2026-08-14 · Status: ACTIVE — cycle 005, implemented and test-verified
Decision: On-device storage is one append-only JSONL file per ride (header → verbatim fixes → end record, schemaVersion 1) plus a rebuildable index; each fix is a flushed write, so a killed app loses at most one fix (torn-tail healing added after QA finding F-1). GPX 1.1 export round-trips through the core parser exactly. **v1 stores no benchmark times at all** — everything is recomputed from raw, so timing-model changes reinterpret history for free; v2 may cache `{rideId, sector, window}` pointers, never bare seconds. Sector identity = (track, gate-pair chainage), not GPS points. No native modules beyond expo's own tree — **no rebuild needed**; the existing dev-client APK runs all Phase-1 code.
Rationale: Backend Dev per its raw-is-sacred/design-for-backfill rules; QA's harness (44 tests, 41 pass / 3 benign skips) locks the behaviour, including crash recovery at every cut point.
Reversibility: moderate once real rides accumulate — which is why raw-forever is the load-bearing choice.

## D-018 — Pre-seeding: adopted for the mockup, deferred for the app
Date: 2026-08-14 · Status: **RESOLVED for app too (cycle 004): pre-seed with guards** — see B-21 note below
Decision: The mockup (and any demo surface) uses benchmarks pre-seeded from the 125 archived rides — Nathan explicitly wants to "see the app as if I'd already been using it". Whether the *real* app pre-seeds is deferred pending Nathan's comparability question: Strava-recorded traces vs future app-recorded traces may differ (recording pipeline, sampling, moving-time definition), and seeding benchmarks the new pipeline can't fairly beat would poison the colours. Race Engineer to assess (new backlog item).
Reversibility: cheap.

**B-21 resolution (cycle 004, measured — `data/analysis/B21-comparability.md`):** the archive is Strava phone-app data, 98% 1 Hz, smoothed but not road-snapped; comparability holds **because seeds are recomputed by our own pipeline from raw lat/lon/t, never Strava's numbers**. Residual bias ≲2 s/sector — under the colour margin, cannot mint a false purple. App pre-seeds benchmarks *and* σ_s from clean archive rides (5 pathological rides excluded, IDs in the doc); seeded benchmarks marked with a ghost dot; no expiry needed — rolling windows retire seeds naturally (green fully app-native in 7 days, purple in 28). First-week fingerprint tripwire re-derives σ_s if the app's GPS character differs. This also dissolves the cold-start conflict: day one is colourful.

**D-016(a) amendment ratified (cycle 004):** re-acquisition bound is time-aware — max(400 m, 15 m/s × outage) — after the Mobile Dev measured that the freeze case is a 237 s recording gap, not an excursion; gap-crossed gates fire "estimated". Option-flagged in `app/core`.

## D-024 — App-recorded GPX ratified comparable; pre-seeding stands
Date: 2026-08-15 · Status: ACTIVE — cycle 006, Race Engineer measurement on the first real app export
Decision: The app's first real recording (`qualifire-20260815-0024.gpx`) is **format-comparable** with the Strava archive: parser-compatible with `app/core/src/gpx.ts` (fractional-second times, equal coordinate precision, no extensions), stationary jitter 0.62 m median vs the archive's 0.46 m. **Nothing measurable trips the B-21 tripwire; D-018 pre-seed-with-guards stands.** Explicitly NOT yet judged (94 s stationary test can't show it): cruise dv σ — the actual tripwire metric — urban-canyon noise, and route matching. Those ratify on the first real commute GPX. The constant `<ele>` is benchmark-neutral (timing never reads elevation).
Rationale: measured, file-level evidence; the unknowns are fenced, not assumed.
Reversibility: cheap — the tripwire remains armed until the commute artifact lands.

## D-025 — Live sector display: derived, honest, never persisted
Date: 2026-08-15 · Status: ACTIVE — cycle 006, as built and QA-locked
Decision: The live layer (`app/src/live/engine.ts`) wires app/core's parity-proven detector into the recording loop as **display-only derived state**: live gate events supply the instant of firing and 'estimated' marks; every number shown is recomputed by the offline pipeline (parity-anchored, QA-verified equal at 1e-6 s). Honesty rules surface live: estimated ⇒ raw-only, no colour, no moving time; skipped/off-corridor ⇒ sector 'missed'; no benchmark store yet ⇒ all clean sectors NEUTRAL, deltas blank. **Route auto-lock**: all three tracks run as candidates; lock when the leader advances ≥400 m chainage and leads every rival by ≥200 m (measured: locks 400–405 m in, Evening sibling frozen ≤12 m). Nothing persists — D-023's raw JSONL is untouched. Bug F-2 (concurrent appendFix after mid-ride relaunch scrambled append order — visible in the first real export) fixed with a per-ride append chain; GPX export additionally stable-sorts by timestamp; both regression-locked.
Rationale: the engine is the single source of timing truth; the session side adapts to it, never the reverse.
Reversibility: cheap — pure JS, fast-refresh, no schema.

## D-026 — Build 3 gains a standalone preview-profile APK
Date: 2026-08-15 · Status: ACTIVE — Nathan's ruling
Decision: Build 3's slate (expo-audio earcons, safe-area-context, launcher icon, optional MapLibre) additionally produces a **preview-profile APK with the JS bundle baked in** — a fully standalone app, no dev server, no WiFi dependency, headless relaunch recovery works anywhere. The dev-client build remains the iteration vehicle (Fast Refresh for small updates); the preview APK is the "ride it daily" artifact and the endgame shape of the product. Configure the preview profile with a distinct applicationId suffix so both builds coexist on the phone (to verify in eas.json at build time). Updating the standalone app = install a new APK; OTA updates (expo-updates/EAS Update) noted as a later option, not in build 3.
Rationale: Nathan — "the app is standalone, which in the end is what you want when its finished."
Reversibility: cheap.

## D-027 — D-006 amended: the ticking lap clock joins the live screen; audio stays primary
Date: 2026-08-15 · Status: ACTIVE — Nathan's ruling (IDEAS §16), Principal-adjudicated reconciliation
Decision: The live screen's visual layer is the F1-style **ticking LAP clock** — whole-ride elapsed, m:ss.d at 0.1 s, majority of the screen, sized for "15:00.0" — with sector blocks beneath; each checkpoint time masks the clock ~2.5 s in the earned tier colour (estimated = grey/dashed, colourless; interrupted = earned tier + ‖), then the clock resumes. This supersedes the "no ticking countdown" clause under D-006/B-15. The safety stance survives amended, not abandoned: **audio/haptic remains the primary on-bike channel** (D-019 earcons carry the information); the rich display is the glance/at-a-stop view; the screen stays touch-inert while moving. Nathan chose the lap clock over a sector clock explicitly (popup, 2026-08-15).
Rationale: Nathan's F1-qualifying reference is the product's core metaphor; the broadcast graphic ticks the lap.
Reversibility: cheap — pure display.

## D-028 — Timing tower: semantics and board v2
Date: 2026-08-15 · Status: ACTIVE — cycle 007, PO spec ratified by the Principal; built demo-side same cycle
Decision: Today's lap ranks among past selves: comparison set = trailing-28-day, same-track, moving-time complete laps. Interrupted laps rank with a ‖ flag; **estimated laps never rank** (today's own shows unranked "NO TIME"). P1 = pole of the 28-day session; the Quali reference (D-021) is a distinct **REF badge** — "defending pole" = REF==P1; the PB dot survives (D-007). Archive-seeded laps rank as marked ghosts (○), demoted to unranked if D-024's cruise-σ tripwire fires. Reveal: static position chip at the final-gate handover (no new earcon); the slot-in ceremony (one-shot, ~700 ms, bottom-up, never replayed on manual navigation) lives on the post-run board. **Board v2 order: tower headline → four sector rows → quarantined ideal-lap line → Quali card last, only when armed. "Sector of the day" is dropped** (Nathan: redundant — shrinks B-20 to gate-move semantics only). The tower replaces the history delta plot. Position is a fact: no failure styling on low positions (D-013). Real tower population awaits the benchmark/ride-history store (B-28); until then the real handover shows no chip (null provider stub).
Rationale: converts abstract deltas into position — Nathan's §15 ruling; every element traces to IDEAS §15–17 or cited decisions.
Reversibility: cheap until the store lands.

## D-029 — Standalone preview APK gated on a validated live surface; D-026 timing amended
Date: 2026-08-15 · Status: ACTIVE — Nathan's ruling
Decision: The next build does **not** yet include D-026's standalone preview-profile APK. Nathan keeps iterating on the live v2 surface through the existing dev-client APK (Fast Refresh) — starting with Monday's commute — until a version reads as good on-device. Only then does build 3 execute D-026's full slate (earcons, safe-area-context, launcher icon, standalone preview-profile APK with distinct applicationId, optional MapLibre). D-026's content is unchanged; only its trigger condition is added.
Rationale: Nathan — baking an unvalidated live surface into the standalone artifact risks a second rebuild anyway if the commute surfaces clock jank, flash timing, or slot-in issues; the dev-client's Fast Refresh loop is the cheap place to fix those, not the standalone APK.
Reversibility: cheap.

## D-030 — The colour model is settled: last-N average, F1 palette
Date: 2026-08-16 · Status: ACTIVE — cycle 008, Nathan's ruling after comparing all three models on real data in the app · **AMENDED by D-045 (2026-08-26): the noise floor is deleted**
Decision: ONE model. **Purple** = beats the best of the window; **green** = above the recent average; **yellow** = an ordinary lap, below the average. The window is the last N=10 comparable rides on that route, and it includes the rider's own new rides, not a frozen file. The 'best' (D-007/D-008 shape) and 'hybrid' (±1σ deadband) candidates are deleted, along with the Settings row that offered them — a ratified comparison is not a preference.
Palette: yellow is the brand's own F1 yellow, not a muted or warning tone. In F1 yellow is the DEFAULT colour of a lap time; most laps are ordinary. This is D-013's no-failure-styling rule, honoured rather than worked around.
Supersedes: D-007/D-008's tier definitions. What survives from D-008: rolling windows (not calendar), moving time as the coloured quantity, and the noise floor — **fewer than 5 comparable rides ⇒ no verdict at all**, rendered as plain ink and never as yellow, so "nothing known" cannot be mistaken for "ordinary".
Rationale: Nathan judged the three side by side on the Result tab with his own archive behind them. The average model is the one that says something about every ride; the ceremony (purple) survives untouched.
Reversibility: cheap — one pure function, `tierFor()` in app/src/ui/colourModel.ts. Nothing is stored (D-023), so a different ruling costs no migration.

**AMENDED by D-045 (2026-08-26):** the noise-floor clause above — "fewer than 5 comparable rides ⇒ no verdict at all" — is deleted; MIN_HISTORY no longer exists. Colours run from ride 1: one prior ride ⇒ purple/yellow against that ride; 2+ prior rides ⇒ the full purple/green/yellow model on the average of rides on record; the first ride ever on a route logs all-purple sectors. The last-N average model, N=10 window and F1 palette are unchanged.

## D-031 — A real basemap goes under the route (recorded retroactively)
Date: 2026-08-17 · Status: ACTIVE — implemented before it was recorded; written up by the Principal in cycle 010
Decision: Each ratified route's asset gains a **real map underneath it**. `<route>-base.png` is a raw crop of standard OpenStreetMap raster tiles, captured once at zoom 15 by `demos/basemap-capture.html` and aligned pixel-exactly to the Web-Mercator transform in `app/assets/routes/routes.json`. The crop is an **input** to `data/analysis/08_build_route_assets.py`, never an output — all styling happens in that script, which stays the canonical renderer, and the crop stays re-capturable. Full-colour OSM is approved as *substrate*, not as image: untouched, OSM paints motorways pink-red and forest bright green, so the basemap would ship fake tier colours. **Desaturation is the firewall** — `BASE_SAT 0.45`, `BASE_BRIGHT 1.05`, `BASE_CONTRAST 0.88`, plus a `#FAF7EE` wash at 22%. Light ground; the casing, not the hue, buys contrast (`CASING #14120C`, route `#F5C542`, unscored gate `#E8E4DA`). The 624-trace "ghost ride" context layer is ruled OUT wherever a real crop exists — real streets already answer "where are the roads" — and survives only as the no-crop fallback and under `NOBASE=1`.
Rationale: this is the "fake it" map (Nathan, 2026-08-16) carried to its conclusion. It delivers a real map with **no native module, no tile server, no network on the bike, and no build** — it ships over Fast Refresh. The app-side contract is deliberately just `projectToPixel(asset, lat, lon)` (`app/src/ui/routeMapMath.ts`), so a live map can replace the `<Image>` later without touching the ride screen's logic.
Note on process: `08_build_route_assets.py` cited "D-031" in its own header before any D-031 existed in this file. The work is real — `app/assets/routes/{Morning,EveningA,EveningB}.png` regenerated 2026-08-17 02:40, consumed by `RoutesScreen.tsx` and `DemoScreen.tsx` — but citing an unwritten decision is exactly the drift `process/CYCLE.md`'s anti-hallucination rule exists to catch. Recorded here to close the gap.
Reversibility: cheap — re-run the script; the transform and gate pixels are stable.

## D-032 — Tile source settled: MapLibre + OpenFreeMap, and the native module stays deferred
Date: 2026-08-17 · Status: ACTIVE — cycle 010, Nathan's ruling on the provider question plus the Principal's sequencing call
Decision: **When** this project renders live map tiles, it renders them with **MapLibre** against **OpenFreeMap**'s public instance — free, no API key, no account, no registration, no metered quota, donation-funded and therefore **no SLA**. No paid provider (MapTiler, Stadia, Jawg) enters the stack; a provider account is now a non-goal, not a pending task. **But the native module does not ship yet.** D-031 already delivers a real map that is offline by construction, and `@maplibre/maplibre-react-native` would cost a rebuild of both the dev client and the preview APK to deliver, on the three ratified routes, a worse guarantee: tiles over the network on a bike. MapLibre's trigger condition is a capability the pre-rendered asset genuinely cannot serve — **pan/zoom, or a route outside the three ratified assets** (i.e. the ways/landmarks expansion, IDEAS §20–21). Until then D-026's "optional MapLibre" stays optional and D-029's hold stands.
Verified this cycle (Mobile Dev, against the npm registry and maplibre.org): `@maplibre/maplibre-react-native` 11.3.6 declares peers `expo >=54`, `react >=19.1.0`, `react-native >=0.80.0`, and its own CI pins `expo 56.0.8` / `react 19.2.3` / `react-native 0.85.3` — an exact match to this project's pins. **Compatibility is not the blocker.** The change-set is two lines (`package.json` dep, `app.json` plugins entry); no `eas.json` change, no key, no new permission. Offline packs are viable: OpenFreeMap's vector source is z0–14, so a 12×8 km commute bbox is ~140 tiles, far under MapLibre's 6000-tile cap. Tile byte sizes and battery cost are `[UNVERIFIED]`.
Rationale: Nathan asked whether a provider account meant paying. It does not — and the follow-on question, whether the native module is worth a build slot, answers itself once you notice the asset path already shipped a real map with none of the risk.
Reversibility: cheap. Two lines and a build, the day a surface needs it.

## D-033 — No map on the live ride screen
Date: 2026-08-17 · Status: ACTIVE — cycle 010, unanimous across Designer, Product Owner and Race Engineer
Decision: The live recording screen gets **no basemap** — no inset, no ribbon, no full map under the timing layer, no at-a-stop map. D-027 gives the ticking lap clock the majority of the screen and D-006 keeps the surface touch-inert while moving; a map is the most attention-capturing object available and it competes with the only colours in the product that carry meaning. On a corridor ridden 600+ times it tells Nathan nothing he does not know, and a map at a red light is precisely the surface that keeps the eyes down when the light turns. The sector-block row (`product/LAYOUT.md` §2.4) already **is** the route-progress ribbon, abstract and glanceable. IDEAS §25's "if possible" is read as an invitation to judge, and the judgement is no.
Held in reserve, so nobody improvises them later, the rules that would apply **if** this is ever overruled: heading-up, zoom locked ~16, all labels/POIs/road names suppressed while moving, no pan/zoom controls, route line and own position only, never larger than the sector-block band.
Also settled here, on the Race Engineer's numbers: **map-matching / snapping the trace to the OSM road network is rejected.** Gate timing error is ≤0.5 s with 3/625 missed passages against a per-sector σ_s of 4–10 s (`data/analysis/RESULTS.md`) — snapping attacks a term ~10× below the noise floor it would have to beat to change a colour, and all 624 archive traces are unsnapped (`data/analysis/B21-comparability.md`), so snapping would make the OSM release a hidden drifting input to timing, which is what D-023's recompute-from-raw exists to prevent. Chainage projection is 1-D; lateral accuracy is already discarded.
Rationale: three roles reached the same conclusion independently from different premises — design load, product value, measurement value.
Reversibility: cheap, and the reserve rules above are the price of admission for reversing it.

## D-034 — Offline tiles: a local PMTiles corridor extract, not a hosted style
Date: 2026-08-17 · Status: ACTIVE — cycle 011, amends D-032's tile source; renderer unchanged
Decision: **When** MapLibre ships, it reads a **local PMTiles corridor extract** cut from the Protomaps daily basemap build (`pmtiles extract --bbox`), copied to the app's `filesDir` on first run and opened as `pmtiles://file://`. MapLibre remains the renderer (D-032 unchanged); **OpenFreeMap is demoted from tile source to fallback-only**, for use on WiFi at the kitchen table, never on the bike.
Why the amendment: D-032 assumed an offline pack could be cut from OpenFreeMap's public instance. Its ToS bars collecting "data from the service in automated ways without permission" ([openfreemap.org/tos](https://openfreemap.org/tos/)), which is exactly what cutting a pack is. Protomaps publishes downloadable PMTiles builds under ODbL as a Produced Work with OSM attribution ([docs.protomaps.com/basemaps/downloads](https://docs.protomaps.com/basemaps/downloads)), and MapLibre Native Android has supported `pmtiles://file://` since 11.7.0 — the version the current binding pulls is 13.2.0. Stadia was ruled out outright (bulk downloading/caching prohibited). Sizing from `routes.json`: the shipped corridor is 4.0 × 6.3 km at 4.47 m/px, ≈260 tiles for z0–16, **~10–30 MB [ESTIMATE — not settled until a pack is cut]**.
Known cost, recorded so it is not discovered later: `pmtiles://asset://` is **not** supported (no byte-range reads on Android's `AssetManagerFileSource`), so a copy-to-`filesDir` bootstrap is real `UNBUILT` work, not a config line.
Rationale: the whole argument for the pre-rendered PNG was that it cannot fail on a bike. A tile source that needs a network, or that a provider may revoke, gives that guarantee back up for nothing. Zero provider, zero key, zero monthly ToS risk.
Reversibility: cheap — a style-JSON source swap.
Evidence: `product/MAPLIBRE-SPIKE.md` §3.

## D-035 — MapLibre's trigger condition is ARMED, not fired; four conditions gate the build
Date: 2026-08-17 · Status: ACTIVE — cycle 011
Decision: D-032 set MapLibre's trigger as "a capability the pre-rendered asset genuinely cannot serve — pan/zoom, or a route outside the three ratified assets." IDEAS §29 (type a destination) **is** that capability, and the Mobile Dev reached the same conclusion independently from the asset side: every PNG in `app/assets/routes/` is rendered offline by Python from a ride already ridden, with the Web-Mercator transform baked into a fixed 900×1400 window; a typed destination produces a corridor that is not in that window, for a line no GPX contains. **The trigger is therefore ARMED — and it does not fire until Nathan adopts §29.** Cosmetic improvement alone never fires it.
Four conditions, all of which must hold before a build is spent:
1. **The install spike passes**, on a branch, costing **zero** EAS builds: `expo install` → plugin entry → `expo prebuild --clean --platform android` locally → `tsc --noEmit` → `expo export --platform android` → read the generated `AndroidManifest.xml`. Compatibility is already verified on evidence (`@maplibre/maplibre-react-native@11.3.6` pins `expo 56.0.8` / `react-native 0.85.3` / `react 19.2.3` in its own CI — our exact pins; v11 is new-arch-only and SDK 55+ is new-arch-only). What the spike settles is resolution under this repo's Metro conventions and the dual ESM/CJS exports map.
2. **Battery is measured, not argued.** Two back-to-back commutes, same phone, same brightness, same route, one on the PNG and one on MapLibre, `dumpsys batterystats --reset` before and Battery Historian after — read the *difference*, never the absolute. The Mobile Dev's estimate is **+2 to +5 percentage points over 25 minutes [ESTIMATE]**. Above 5 pp, NO-GO stands.
3. **Tiles are the D-034 local PMTiles file.** No provider goes on the bike.
4. **It ships in a build already being spent for another reason** — never a build of its own.
Permanent cost, accepted in advance: the map stops reaching the phone over Fast Refresh. Today `routeMapView.tsx` is pure JS and lands in ~1 s; under MapLibre any plugin or prop change costs a build. `locationEngine` stays `default` — `google` pulls in `play-services-location` and a second GPS consumer beside `expo-location`.
Migration, so nobody re-derives it: of `routeMapMath.ts`'s five exports, `projectToPixel()` and `cropFor()` are replaced by the camera; `offRouteM()`, `positionAtTime()` and `metresPerPixel()` survive untouched. The engine and `src/live/` are not touched at all. The PNG **stays as the offline fallback** — `routeMapView.tsx` already degrades PNG → drawn segments, and MapLibre becomes a third rung above it, so a missing PMTiles file falls back to a map rather than to a black rectangle.
Reversibility: cheap in code, expensive in build slots — which is what the four conditions are for.
Evidence: `product/MAPLIBRE-SPIKE.md`.

## D-036 — A planned route may keep time; it may never compare, until five clean rides
Date: 2026-08-17 · Status: ACTIVE — cycle 011. Conditional: binding on any implementation of IDEAS §29, whether or not §29 is adopted · **AMENDED by D-045 (2026-08-26): the five-clean-rides comparison gate is deleted**
Decision: A route the rider has never ridden — produced by typing a destination — enters the catalog as `Route.provenance: 'planned'` with `GateSet.origin: 'geometric'`, and from ride 1 it **may** run the lap clock, fire gates, record raw sector times and show them as bare numbers. Until it has **≥ 5 clean rides** (D-008's existing threshold, deliberately reused rather than a second one invented) it may **not**: claim a benchmark or a PB; colour a sector any tier; enter the timing tower or produce a position; be offered as a way at START (routes are ratified, not discovered — a one-off diversion must not mint a permanent ghost route); or be seeded with archive ghosts as if the history were its own (D-018). Promotion to `ratified` is Nathan's, not the algorithm's: at 5 clean rides the app *offers* the route, with a re-measured gate proposal attached.
Sectors cut from geometry alone are a **starting grid, not a benchmark**, and the app says so. The first rides on a `geometric` gate set are explicitly a placement experiment; once ≥5 clean rides exist the measured procedure re-runs on real `stop_frac` and mints a new `gateSetVersion`.
**No routing engine's ETA is ever stored, shown, or compared against.** The only seconds in this app come from the offline pipeline (D-023). Relatedly, the default profile is never labelled "fastest": `RESULTS §5` measures 66.3% of moving time inside 22–26 km/h against a 25 km/h assist cutoff, so road class barely moves this bike's clock — the label is "a sensible way".
Rationale: timing without comparison is honest; comparison without history is not. This is D-025's live-layer honesty extended one step earlier, to a route that does not exist yet.
Reversibility: cheap — it is a constraint on unbuilt work.
Evidence: `product/ROUTING-AND-SEGMENTATION.md` §3, §5.

**AMENDED by D-045 (2026-08-26):** the "≥ 5 clean rides" gate and its "may never compare" consequence are deleted with MIN_HISTORY. A planned route colours from its very first rides: the first ride ever logs all-purple sectors; one prior ride ⇒ purple/yellow; 2+ ⇒ the full model on the average on record. Everything else here stands (no routing ETA ever, ratification is Nathan's not the algorithm's, geometric gates are a starting grid). Open follow-up: the "at 5 clean rides the app *offers* the route" promotion trigger reused D-008's threshold, which no longer exists — the offer trigger needs its own number or its own ruling.

## D-037 — The comparison window is the last 10 rides, not 28 days; D-028's window text is corrected
Date: 2026-08-17 · Status: ACTIVE — cycle 011, Principal reconciling a documentation drift found by the Product Owner · **AMENDED by D-045 (2026-08-26): the window is previous-9-plus-current**
Decision: D-028 defines the tower's comparison set as "trailing-28-day"; D-030 and the shipped code define it as the last **N = 10 rides** (`app/src/ui/colourModel.ts:26` `WINDOW_N = 10`, applied in `ghostsFor()` via `.slice(-WINDOW_N)`, which `towerSource.ts` and both boards consume). **The code is right and D-028's wording is stale.** Every reference to a 28-day window in D-028 now reads "the last `WINDOW_N` ranking rides on this route". Nothing in code changes; the tower and the colour model already share one window, which is what D-030 required. A calendar window was also the wrong shape for its own reason: it is Nathan-shaped. On a way ridden weekly rather than daily, 28 days is nearly empty and §21's "a freak time expires every ~20 rides" becomes ~20 weeks.
Settled with it, because it is the same number: the Designer's **depth strip** (`product/SETUP-UX.md` §5) has **ten slots** — one per window place — not one per rung of the Product Owner's honesty ladder. The strip's meaning is "how full is the comparison window", and drawing anything else beside a tier colour would make the receipt disagree with the claim.
Rationale: two documents describing one number differently is exactly the drift `STATE.md`'s precedence rule exists to catch. The detailed record wins over the summary; here the *code* is the detailed record.
Reversibility: free — text only.

**AMENDED by D-045 (2026-08-26):** the window is **previous-9-plus-current** — the current ride is compared against the 9 most recent previous rides, a pool of 10 in which the current ride is always the 10th slot; never a global ranking, never 10 independent historical rides. Position chips read "P4 of 10", never "of 11". The depth strip's ten slots still match the pool size.

## D-038 — The basemap crop: Esri, less desaturation, antialiased overlay, attribution in the app
Date: 2026-08-17 · Status: ACTIVE — cycle 012, folded into this file by the Principal on the next pass as that cycle required
Amends D-031 on four points; everything else in D-031 is unchanged.
1. **Source.** `<route>-base.png` is a crop of **Esri World Street Map**, not `tile.openstreetmap.org`. OSM's tile usage policy forbids scripted/bulk fetching, and it enforces the block by returning **HTTP 200 with an "Access blocked" placeholder image** — a refusal that a missing-tile check cannot see. The first capture reported "63 tiles, 0 missing" and produced three PNGs of the refusal text. Fixed structurally, not by retrying: `demos/basemap-capture.html` now SHA-1s every tile body and aborts if more than 3 are byte-identical — a server that is refusing you repeats itself; a real map never does. Working around the block was never on the table. Attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors". Nathan picked Esri Street from a four-way render of the actual Morning frame (Esri Street / Esri Topo / Carto Voyager / Esri Imagery).
2. **Treatment.** `BASE_SAT 0.45 → 0.80`, `BASE_BRIGHT 1.05 → 1.02`, `BASE_CONTRAST 0.88 → 0.94`, wash `22% → 8%`. D-031's numbers were written for raw OSM carto; Esri Street is already muted cartography and the same treatment washed it to paper — and "colours, forest and everything" was the request. Backed off to the least desaturation that still keeps every basemap fill clearly outside the tier palette.
3. **Rendering.** Route, gates and landmark rings are drawn at **2× into an RGBA overlay and downscaled LANCZOS** (`SS = 2`). Pillow does not antialias wide polylines and bulges an ellipse at every vertex; on a 163-vertex GPS trace that read as a serrated edge. Geometry is unchanged — antialiasing, not smoothing; the trace stays raw (D-023).
4. **Attribution lives in the app, not the asset** — `routeMapView.tsx`, bottom-right, 8.5 dp `#2B2B2B` on a 60% white plate, suppressed only in the MAP-IMAGE-FAILED state. Deliberately not a palette colour: a credit in a tier colour would read as a signal. A moving window would crop a baked-in credit off the asset entirely, which is the Designer's reason it may never be baked.
Also shipped with it: gate rings and the rider dot move from `#fff` to `CASING #14120C` in `routeMapView.tsx` — the asset is a light map in both themes now, and a white ring vanished into beige.
Scope note: this governs a **build-time crop that never touches the phone's network**. It is independent of D-032/D-034, which govern what MapLibre would read *on the bike*.
Rationale: Nathan asked for a real map look — "roads, colors, forest and everything" — under the trace. Recorded also because the OSM block is the kind of failure that returns success.
Reversibility: cheap — re-capture and re-run; the transform and gate pixels are stable (`routes.json` verified byte-identical, `diff -q` clean).

## D-039 — Every task runs the model-tier protocol: frontier plans and inspects, cheap models execute
Date: 2026-08-17 · Status: ACTIVE — Nathan's ruling, after the cycle-013 experiment · **AMENDED by D-046 (2026-08-31): the Plan tier no longer bulk-reads raw files itself**
Decision: All work in this project routes through four model tiers — Haiku triage, frontier (Fable) planning, Sonnet execution from a self-contained brief, fresh-context frontier inspection — with a size threshold exempting chores. The binding text lives in `process/CONVENTIONS.md` → "Model tiers"; `process/CYCLE.md` maps the tiers onto the cycle phases; the repo-root `CLAUDE.md` points every new chat session at both.
Rationale: maximise frontier-model thinking per token by never spending it on mechanical execution. Cycle 013 is the evidence: triage cost ~28k tokens, execution ~158k on Sonnet, inspection ~57k; the stop-on-ambiguity rule caught a planner error (brief claimed 10 Morning seed ghosts, the seed has 9) before it became a wrong hardcoded test, and the fresh-context inspector found two real defects the in-spec executor sailed past.
Reversibility: cheap — process text only; no code depends on it.
Evidence: `cycles/cycle-013.md`.

**AMENDED by D-046 (2026-08-31):** Fable is the most expensive tier per token; its job is the thinking, not the reading. See D-046.

## D-040 — Scheduled cycles: a supervised trial, superseding D-003's "on demand only" for the trial window
Date: 2026-08-17 · Status: ACTIVE — Nathan's ruling ("lets first do overday task, and then in the evening i can ask for an overnight task")
Decision: One scheduled, unattended day-cycle runs 2026-08-17 ~15:00 under D-039 tiers on one small unblocked backlog item, Nathan watching. Unattended rules: never stall on a question — pick the stated default, log the assumption; an executor stop-on-ambiguity ends the cycle gracefully with a report. Commits stay local (no push credentials in the sandbox); Nathan pushes via GitHub Desktop. An overnight recurring cadence is a separate ruling, expected the evening of 2026-08-17 after this trial is judged.
Rationale: D-003's bar for scheduling was "cycles consistently ending with real artifacts landing"; cycle 013 met it once. One supervised run is the cheapest honest test of the second time.
Reversibility: free — delete the scheduled task.

## D-041 — A real map on every screen, including the live ride: MapLibre + OpenFreeMap online-first; D-033 overruled, D-032/D-034/D-035 relaxed
Date: 2026-08-17 · Status: ACTIVE — cycle 014. Nathan's rulings recorded verbatim in scope; the stack choice is the Principal's call on three members' evidence, fresh-inspected. Nathan may override; the first act (the install spike) is his to run.
Nathan's rulings (2026-08-17, in chat, cycle-014 brief): (1) the map goes **on every screen, including the live ride screen** — this overrules **D-033**; D-033's reserve rules become binding design (heading-up, zoom locked ~16, labels/POIs/road names suppressed while moving, no pan/zoom controls while moving, route line + own position only, never larger than the sector-block band). (2) **Free options only; a free-tier account/key is acceptable if flagged** — relaxes D-032's "no provider account". (3) **Online-first is fine** ("I usually have 5G on") — relaxes D-034's "no provider goes on the bike" to "must degrade gracefully with no signal: cached tiles or the route line on a plain ground, never blank, never an error". (4) **One dev-client rebuild is fine.** IDEAS §30's parking is lifted by its author.
Decision — the stack, settled: **`@maplibre/maplibre-react-native` (v11.3.6, MIT, no account, no key) rendering OpenFreeMap vector styles online (`https://tiles.openfreemap.org/styles/dark` or `/positron`; attribution "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"), MapLibre's ambient tile cache covering signal gaps on the ridden corridor, and a Protomaps PMTiles corridor extract (`build.protomaps.com/YYYYMMDD.pmtiles`, z0–15 only) as the optional true-offline layer if the cache proves insufficient on a real dead-zone commute.** Route, gates and rider dot become GeoJSON layers (`#F5C542` line on `#14120C` casing, gate circles filled only once scored). The pre-rendered PNG stays as the failure fallback rung. Rejected: expo-maps (alpha, Google key + billing account, no palette control), @rnmapbox/maps (Strava's stack; account + token for zero gain at one user since satellite/terrain are LATER/NON-GOAL), WebView + MapLibre GL JS (second engine, bridge traffic at 1 Hz, worse battery), status-quo PNG (cannot heading-up, cannot leave its baked window). Satellite layer: **LATER** (Esri World Imagery now needs a key; no keyless free source found). 3D terrain: **NON-GOAL** (Leuven is flat; MapLibre Native Terrain3D is a roadmap item, not shipped). Layer switcher: LATER with satellite. "Map data sources" sheet: ADOPT.
D-035's four conditions, revised: (1) the install spike still runs first and still costs zero EAS builds — now as `scripts/spike-maplibre.ps1` on Nathan's PC (this sandbox cannot reach npm); (2) the battery A/B (B-47) is required **before the preview APK ships with the map**, not before dev-client work starts; (3) tiles: OpenFreeMap online + ambient cache, PMTiles optional (was: PMTiles mandatory); (4) "only in a build already being spent" is dropped — Nathan allows a build for this.
Contracts: `product/MAP-STACK-OPTIONS.md` (option matrix, change-set), `product/MAP-TILES.md` (styles, ToS, degradation, PMTiles, palette firewall with real positron layer ids), `product/MAP-CONTRACT.md` (per-surface behaviour, four live states, Strava verdicts, acceptance test, live ground = dark). Open, for Nathan: B-32 light vs dark is now a style-URL swap; the Designer rules dark for the live ribbon and leaves the browsing surfaces to his eye.
Rationale: three seats reached MapLibre independently (fit, cost, control over the palette firewall); the fresh inspector argued the strongest counter-case (expo-maps simplicity, WebView Fast Refresh, Mapbox managed styles) and still landed on MapLibre. What made it "definite" was Nathan's online-first ruling: the whole cycle-011 argument for keeping the PNG rested on a no-network guarantee he does not need.
Reversibility: cheap in code (the D-031 PNG path is kept as fallback), one build slot in cost.
Evidence: the three contracts above; inspector corrections logged in `cycles/cycle-014.md`.

## D-042 — Sector and lap timing default to RAW time: luck is part of the race; moving-time modes become opt-in
Date: 2026-08-17 · Status: ACTIVE — Nathan's ruling, cycle 016 ("I want the element of luck involved; if you have to stop for someone or something, so be it. It will make the smooth rides even special."). NOT YET IMPLEMENTED — scheduled for the next build cycle, deliberately not this one.
Decision: The red-light setting's three values get real semantics, and the DEFAULT flips to raw time:
1. **`off` (default): raw wall-clock time.** Stops count against the lap and sector. No stop subtraction anywhere — colours, ranks, averages and the ticking clock all use raw time. A red light is racing luck; a clean run through every green is what makes a special lap special.
2. **`auto`: the timer pauses automatically while not moving** (stationary detection — the ≥10 m / 6 s machinery from cycle 016's map dim is the natural detector, thresholds to be tuned on device).
3. **`button` (manual): the rider pauses/resumes the clock himself** with the existing RED LIGHT button, which today is cosmetic.
Consequences to implement next build (not now): the colour model, tower ranks, posChip and Result board currently compare **moving** time (`movingS`) — under `off` they must compare raw time; comparison sets must be mode-consistent (a raw-time lap must never rank against a moving-time window — mixing modes fabricates a comparison, D-025); the "interrupted sectors excluded from sector averages" rule needs re-examination under `off` (a stopped sector is now just a slow sector); the live clock display follows the mode. Engine records BOTH raw and moving per sector already — no data loss, this is a comparison-layer change.
Rationale: Nathan had not known the maths silently subtracted stopped time; the honesty rule (D-025) cuts both ways — the app was quietly flattering laps that hit red lights. His call: the default tells the truth of the commute, luck included.
Reversibility: cheap — both quantities are recorded; the mode only selects which one compares.
Evidence: engine sector records carry rawS + movingS (`lastRide.ts`, `colourModel.ts` as of cycle 016); Nathan's ruling in chat, 2026-08-17 evening.

## D-043 — A standalone "Qualifire Preview" commute APK is allowed again, as a rebuildable riding build beside the dev client
Date: 2026-08-19 · Status: ACTIVE — Nathan's ruling, cycle 021, amending his 2026-08-17 "no standalone APK until finalized" rule.
Decision: The dev client stays the development build (Fast Refresh from Metro). In addition, the `preview` EAS profile (`Qualifire Preview`, package `com.nathanbonher.qualifire.preview`, D-026) is rebuilt whenever Nathan wants the current tree on the bike with no PC / Metro / network dependency — the dev client lost its JS when Android evicted it during the day (2026-08-18 evening) and could not re-fetch it. The preview APK bakes the working tree's JS at build time, so: commit (or at least check `git status`) before building; rebuild after any change that must ride. `scripts/build5.ps1` (a wrapper for `build4.ps1 -BuildProfile preview -Standalone`) is the command; `-Standalone` is separate from `-Force` so preflight failures still stop a build.
Rationale: build 3's failure was a stale bundle frozen *before* the changes, not a flaw of standalone builds; a build that is rebuilt on demand is a riding tool, not "the final app".
Reversibility: free — stop rebuilding it.
Evidence: `scripts/build4.ps1` sections 0 and 8; `BUILD-4-RUNBOOK.md` §7.

## D-044 — MorningB v2 gate chainages ratified; re-acquisition teleports no longer count as lock evidence
Date: 2026-08-20 · Status: ACTIVE — cycle 024, WP-D1. Adjudicated by the reviewer standing in for Fable, on two escalations the WP-D1 executor correctly stopped on rather than guessed past.
Decision: Two rulings, both landed the same day, both load-bearing for every route-lock decision the live engine makes from cycle 024 onward.
1. **MorningB's gate chainages are `[204, 1835, 3081, 4403, 5733]` m** (v2; v1 retained in the catalog for the record), measured on the 5927.06 m line `buildReference` actually stores after resampling and `collapseStationaryRuns`. The brief's own expected numbers (`≈[215, 1850, 3120, 4450, 5785] ±15 m`) were wrong — read off a pre-resampling, pre-collapse line to the nearest 5 m, not computed — and the WP-D1 executor's measured numbers were correct. Direction/reversal checked and confirmed not-reversed.
2. **`engine.ts` gains `REACQ_JUMP_M` (= `windowFwd`, later widened to `windowFwd + 5`): a single-fix chainage jump larger than the projector's own search window can only be a re-acquisition teleport, and no longer counts as corridor-verified `adv`.** Root cause: D-016(a)'s time-aware re-acquisition let a candidate jump ~578 m in one GPS fix and have that jump read as 607.8 m of honest advance — enough to out-race a genuinely-ridden candidate and hard-lock the wrong route. Confirmed on real fixture data (`clean_morning`); confirmed this was **not** a bug WP-D2's own briefed design would have fixed, simulated with the fix in place (both candidates anchored, so D2's anchored-clause never fires) — the defect was in the engine's advance accounting, not in the lock-arbitration rule WP-D2 was about to rewrite. `LOCK_MIN_ADVANCE_M`/`LOCK_MARGIN_M` untouched; gate firing, chainage and displayed times untouched — this is a lock-race rule only.
Rationale: holding the MorningB promotion back solved nothing (the defect was in the engine, and WP-D2 was about to make all 20 catalog routes live candidates regardless), and landing red and waiting for WP-D2 was worse than described, because WP-D2's design would still have hard-locked the wrong candidate under this failure mode. Fixing the actual defect was the only option that didn't either withhold a ratified promotion or ship a known-wrong lock.
Reversibility: moderate — `REACQ_JUMP_M` is a small, isolated change to `feedCandidate`'s advance accounting with its own regression test, but every fixture's lock timing depends on it now.
Evidence: `cycles/cycle-024-briefs/WP-D1-ADDENDUM-adjudication-2026-08-20.md` (full investigation, before/after numbers per fixture, Google Maps links for the ratified gate positions); `cycles/cycle-024.md` (near-miss #4).
Follow-up, not yet closed: a residual — re-acquisition hops ≤240 m (now ≤245 m) still slip through this discount uncounted; the fix is cheap (expose `reacquired: boolean` on `LiveFix`, discount all re-acquisitions regardless of size) but out of WP-D1's scope. Filed as **B-90**.

## D-045 — Cycle-025 Q&A rulings: MIN_HISTORY abolished, first-ever ride is all purple; the ranking window is previous-9-plus-current; "others can use this" is a top-priority goal; always four sectors
Date: 2026-08-26 · Status: ACTIVE — Nathan's rulings, recorded from `cycles/cycle-025-briefs/QUESTIONS-FOR-NATHAN.md` (round 1) and `QUESTIONS-FOR-NATHAN2.md` (round 2), both processed 2026-08-26. Four rulings bundled per D-044's precedent; already baked into the cycle-025 WP files — this entry exists so every amended decision and backlog item points at one record.
Decision:
1. **MIN_HISTORY is deleted. There is no noise floor and no colour-silent period.** Nathan: "I dont remember ever agreeing on a min history rule so lets delete that rule. There is no need for 5 clean rides." Replacement scheme: with exactly **1 prior ride** on a route, sectors score **purple/yellow** against that one ride; with **2+ prior rides** the full **purple/green/yellow** model runs on the average of the rides on record — the same D-030 model, with the history requirement starting at 1 instead of 5. And the **first ride ever ridden on a route logs ALL PURPLE sectors** — never yellow, never colour-silent: "that's how it is in F1; if youre the first one, you will have all purple sectors." Amends D-030 and D-036; deletes the one clause of D-008 that D-030 had kept alive. Kills B-35 (no colour-silent period left to count down through); rescopes B-43; B-42 gains the all-purple ride-1 fact; retires B-48's segmentation-clamp numbers alongside ruling 4 below.
2. **The ranking universe is a recency window, never a global ranking: the current ride is compared against the 9 most recent PREVIOUS rides — previous-9-plus-current, a pool of 10 in which the current ride is always the 10th slot.** Amends D-037's "last 10 rides" reading (pool size 10 survives; "10 independent historical rides" does not). Position chips read "P4 of 10", never "of 11" — propagated to WP-live-ghost-position.
3. **"Someone else besides Nathan can use this app" is an actual goal and a top priority** — no longer the keep-in-mind design lens of D-001/D-012 and COLD-START's header. It drives the virgin-cold-start epic's priority. Nathan: "This is an actual goal that is a top priority." D-001's other content (no accounts, no social, no store distribution) is not re-ruled here.
4. **Every route has exactly four sectors (gates at 25/50/75%), for every route regardless of length or owner.** Length-scaled sector counts are rejected: "keep only 4 sectors total and not scale … in F1 sector times are different based on tracks, but you always have 4 sectors." Kills B-38; also retires B-48's `n = clamp(L/1400, 3, 6)` segmentation numbers.
Rationale: Nathan's own answers, verbatim in the two Q&A files.
Reversibility: cheap — comparison-layer rules and scope text; nothing is stored (D-023), so re-ruling costs no migration.
Evidence: `cycles/cycle-025-briefs/QUESTIONS-FOR-NATHAN.md` (Q19, Q22, and the ranking answer under WP-relaunch/WP-result-ranking); `cycles/cycle-025-briefs/QUESTIONS-FOR-NATHAN2.md` (the countdown-ladder answer).
## D-046 — Plan-tier token diet: a cheap Digest sub-step reads and condenses files; Fable thinks and writes the brief, it does not bulk-read
Date: 2026-08-31 · Status: ACTIVE — Nathan's ruling, mid-session, after watching the B-39 planning
pass cost ~320k tokens on Fable reading files directly.
Decision: The Plan tier (D-039) is split into two steps. **Digest** (Haiku, or Sonnet only where
Haiku's read would be unreliable) does the file reading: locates the files a task needs, and
produces a condensed, factual, line-anchored digest — exact quotes, line numbers, current
behaviour — with no design opinion in it. **Plan (Fable)** receives that digest, not raw file
access, as its starting input, and spends its tokens on the thinking: designing the fix and
writing the brief. Fable may still open a specific file directly to spot-check an anchor the
digest leaves ambiguous, or to dry-run/verify the finished brief before handing it off (the
existing "dry-run the whole edit set" step in brief-writing is unchanged) — the rule is against
Fable doing its own broad exploratory reading, not against it ever touching a file. `CONVENTIONS.md`
→ "Model tiers" carries the binding table update.
Rationale: Nathan, in chat: "really limit fable usage so it is only applied for the thinking of
the implementation... Fable should not read a lot of files, use other models to summarize files
and current state before handing the thinking to fable" — flagged directly after the B-39 Plan
dispatch (`cycles/cycle-025-briefs/BRIEF-b39-empty-seed-install.md`) came back having spent
320,574 tokens and 76 tool calls, most of it Fable's own file reads rather than design thinking.
Reversibility: cheap — process text only; no code or in-flight brief depends on it. The already-
written B-39 brief is not redone under the new flow — it was dry-run verified and paid for
already; the diet applies going forward.
Evidence: this chat, 2026-08-31; `cycles/cycle-025-briefs/BRIEF-b39-empty-seed-install.md`'s
recorded token cost.
