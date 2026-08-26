# Qualifire — review of your notes3 (entries 2026-08-22 → 2026-08-25), checked against the project on 2026-08-25

Same drill as the notes1 review: I read your notes, then went through the repo (STATE, the backlog, the cycle-023 and 024 records, the WP-B free-ride brief, the relaunch-crash investigation brief, and the app code itself) to check each point against what actually exists. Headline: **two of your entries are already built or already answered — including one idea that landed in the app the same day you wrote it down — and the genuinely new material is three ideas (live ghost dots, sector-coloured trail, route renaming) that are all coherent with how the app already works.** Point by point below, in your order.

---

## 1. Live ghost dots + live position on the race screen (2026-08-22)

**Is it already true / tracked?** No — this is genuinely new. Nothing in IDEAS.md or the 152-item backlog proposes showing the ghosts *as moving dots during the ride*. Today the ghosts exist only as finished times: the race screen colours your sectors against the last-10 window as you cross gates, and the position ranking (the tower) appears on the Result tab after the ride. Mid-ride, there is no "you are currently P3" anywhere.

**What it would take — there are really two features hiding in this idea, at very different prices:**

- **Live position readout (cheap-to-medium).** "Where am I versus my ghosts *right now*" can be computed at every gate crossing from data the app already stores: each ghost's per-sector times are in the results store, so at gate *k* your cumulative time can be ranked against each ghost's cumulative time at the same gate. That gives you a live "P4 of 11" that updates at each gate — no new data, no new pipeline. A position chip already exists as a UI component (it's on the Result board); putting a live version on the race screen is mostly wiring.
- **Moving dots on the map (medium-to-large).** Dots need each ghost's *position as a function of time*, not just its splits. That data exists in raw form — the 125 parsed archive rides are cached at 1-second resolution on your PC, and in-app rides keep their full GPS trace — but the app itself does not carry per-ghost time→position curves today; the catalog ships splits, not traces. So this tier means: build resampled time-distance curves per ghost into the seed/results pipeline, ship them to the phone, and animate up to 10 extra markers on the live MapLibre map. Two flags before anyone builds it: (a) the battery/stability A/B (B-47) is still open and the one unexplained crash so far happened with the live map on screen — 10 animated markers goes in the same risk bucket, so B-47 should come first; (b) MapLibre rendering quirks have already bitten twice on-device (the dotted-ahead line had to be reverted), so this needs an on-device eyeball pass, not just tests.

**One decision hiding inside it that needs you:** where is a ghost dot when *you* are stopped at a red light? Raw wall-clock time as the scoring default is decided (D-042) but still not implemented (B-59) — colours and ranks today still compare moving time. Ghost dots make that discrepancy *visible on a map*: on raw time the ghost sails past you at the light; on moving time it politely freezes. I'd say this feature should wait for (or land together with) B-59 so the dots and the colours tell the same story.

**Toggle vs separate app — recommendation: toggle, clearly.** Your instinct to make it removable is right, and the settings screen already exists as the home for exactly this kind of switch (it was built as "the toggles Nathan asked to have flexible"). A separate app would fork the engine, the storage, the map stack, and the catalog — you'd pay the maintenance twice to learn the same thing a toggle teaches you for free. The one real argument for separation is distraction/safety while riding, but a toggle defaulting to OFF answers that too. (Worth considering as a middle path: the earcons could carry position *changes* — a sound when you gain or lose a place — so the information arrives without your eyes leaving the road.)

**Verdict: good idea, actionable in two stages.** Stage 1 (live position at gate crossings, behind a toggle) is a reasonable WP candidate now. Stage 2 (moving dots) should be written up but sequenced after B-47 (battery) and ideally B-59 (raw time).

---

## 2. Colour the sectors behind you instead of the gates (2026-08-22)

**Is it already true?** No, but it's close to the grain of what's there. Today, on the live map, crossed gates get theme-aware coloured tick marks (that landed in cycle 024's map pass), and the route line behind you is a single solid colour. Nothing colours the *line* per sector.

**Assessment: you're right that it's the more honest visual.** Sectors are the scored and coloured unit — the gate is just the boundary. Colouring the gate-1→gate-2 stretch purple when sector 1 comes back purple maps the colour onto the thing that earned it, and the end-of-lap "whole route painted in your sector colours" picture falls out for free. Technically it's feasible with what exists: the engine knows each gate's position along the route line, so the behind-line can be split at sector boundaries and each span painted with the already-computed sector colour. It also composes fine with free-ride mode (that map is gates-only, no line — unaffected).

**Three cautions:**
1. **On-device verification is mandatory, not optional.** The route line has already produced one real device-only rendering bug (the dotted-ahead line had to be reverted to solid because of a MapLibre dash quirk that only showed on the phone). Multi-segment coloured line layers are exactly the kind of thing that needs the same both-themes on-device eyeball.
2. **Replace or add?** You asked whether this replaces gate colouring or joins it. I'd trial it as *additive* first (coloured sector spans + the existing gate ticks), because the ticks also mark gates *ahead* of you, which a behind-only trail can't do. If the combined picture is too busy on the phone, then choose — but choose after seeing it, not on paper.
3. **Your toggle question — "or does this complicate things?"** Honest answer: a settings toggle for this one is cheap and low-risk (it's a pure rendering choice; nothing about scoring or storage changes), so a toggle is fine. But unlike idea 1, this isn't a distraction-risk feature — it's a presentation preference — so you could equally just pick one look after an on-device trial and not carry the switch. Your call; I'd lean "trial both, then hard-pick, no permanent toggle" to keep settings from accumulating.

**Bonus:** the same sector-coloured line would arguably be even more valuable on the *Result* map (the VIEW TRACE view of a finished ride), where there's no live-rendering or battery concern at all. If you want a cheap first taste of the idea, that's the place to build it first.

**Verdict: good idea, concrete, actionable now.** Small-to-medium WP; suggest Result-map first, live map second.

---

## 3. The workout / circuit "race your previous selves" app (2026-08-22)

You said it yourself: an idea to log somewhere, needing deep thought and a separate team. Agreed on all counts — it's out of Qualifire's scope, and I won't pretend to review a product that doesn't exist yet. Two short observations for whenever you pick it up: (a) the core mechanic you describe (tap to mark a set done, compare elapsed time at each checkpoint against your previous sessions, colour by faster/slower than average) is structurally *identical* to Qualifire's gate/sector/ghost model — "tap" replaces "GPS gate crossing" and everything downstream (windows, colours, tiers, tower) transfers conceptually; (b) precisely because of that, the right first step someday is a one-page concept note, not code. **Verdict: observation, logged, no action.** (It's now recorded here and in your notes; nothing further needed.)

---

## 4. "Where did the elevation-outliers idea come from?" (2026-08-22)

**Answered — and you're right that it didn't come from you.** The origin is in the cycle-023 record: the triage subagent that reviewed your three GPX+ test rides of 2026-08-20 found, *in the data itself*, a ±5–13 m elevation spike happening within one second in **every one** of the three rides (+10.7 m, −13.5 m, +4.9 m) — a barometer/GPS blend glitch. So it was a data-driven finding from your own rides, not a response to any report of yours, and not invented. (There was also standing prior-art awareness: the PRIOR-ART notes flag that GPX elevation data deserves scepticism in general.)

One part of this story you should know because it's a good sign about the process: the *first* implementation of the fix clamped the elevation values in the raw ride file — which would have violated the "raw is truth" rule (D-023). The inspection pass caught it and stopped it, and the shipped version flags outliers in the sidecar instead, leaving raw data untouched. Also worth knowing: the flagging is record-time only, so the very rides that motivated it can never be flagged retroactively — that gap is tracked (B-126), low priority.

**Verdict: question answered; no action needed** (unless you want B-126's retroactive flagging pulled forward, which I wouldn't — it's analysis-side polish).

---

## 5. Ride-3 route-lock failure — "I started in an underground parking, my fault" (2026-08-22)

**Agreed, and the evidence matches your account exactly:** ride 3's first fix sat at 97.7 m accuracy for ~13 seconds — textbook underground-parking GPS — and the lock failed on that initial reading. So yes: not an app fault, and it's honest of you to say so.

But here's the good news you may not have seen: the app was improved on exactly this case anyway. Cycle 023 keyed the calibration guard to *initial* accuracy only, and cycle 024's GPX+ work added route-match diagnostics (accuracy at match time, per-candidate deviation, retries) **and a retry of the route match once accuracy settles**. Translated: starting in the parking should now produce a *late* lock instead of *no* lock.

**One cheap, concrete suggestion:** deliberately repeat the failure — start a recording in that same underground parking on the current build and see whether the app locks once you surface. That's a 5-minute on-device check only you can do, and it could ride along with the force-kill relaunch test the crash-investigation brief already asks of you (its P1 protocol), so one commute validates two fixes. **Verdict: your reading is correct; small actionable on-device check.**

---

## 6. Token-usage section in every cycle summary (2026-08-23)

**Mostly already adopted — one small gap left.** The file you added was used: `cycles/cycle-024.md` contains a full "Subagent token usage" section built from it — planning tier-by-tier (≈1.24M), execution per-WP (≈6.64M), combined ≈7.88M — and the conventions doc has carried your 2026-08-17 rule that every task ends with a tier/model/tokens/outcome readout table.

What's *not* yet true: nothing in `process/CYCLE.md` makes the token section a standing requirement of the cycle summary itself — cycle 024 did it because your file prompted it, not because the process demands it. That's a two-line process edit. One refinement worth writing into the same edit, learned from cycle 024's own attempt: some work has **no token figure at all** (coordinator-direct chores, and continuation runs where a fix was relayed to an already-running executor). The convention should say those are listed as "no figure exists" — never estimated or invented — which is exactly how cycle 024 handled it.

**Verdict: agree; tiny actionable process change** (add the requirement + the no-figure rule to CYCLE.md).

---

## 7. Free-ride directional gate filtering (2026-08-24)

**Does it make sense? Yes — and it's already in the app, built the same day, from your words.** This is the pleasant surprise of these notes. The chain of custody is fully on record:

- Your 2026-08-20 free-ride notes are quoted **verbatim** as the goal of the WP-B brief ("Goal, in Nathan's words").
- Your endpoint-filtering idea entered as a **coordinator addendum dated 2026-08-24** — the day you pasted it into the cycle-024 chat — and the code comment in the record screen cites it by that name and date.
- The implementation does exactly what you described: `freeRideRouteIds` in the catalog module takes the known endpoint and, for **new>>home**, returns only routes on ways that *end* at home; for **work>>new**, only routes on ways that *start* at work. So the duplicated near-miss gates from the opposite direction (your home>>work vs work>>home concern) never appear. The filter is frozen at START so the mid-ride map always shows the same set the engine was actually started with.

So your authorship is recorded in the repo itself, not just in this notes file — brief, addendum, and code comment all trace to you. **Verdict: already built; nothing to ask for.** The only open thread is an eyeball check: next time you ride a one-end-"new" free ride, confirm the gates-only map shows only the set you'd expect (this pairs naturally with the already-listed free-ride map polish item B-140 — that map still has the old faint-circle gate style, so gates may be hard to see at night until that lands).

**Your point 2 — genuinely two new endpoints:** also already handled the way you wanted: it's backlog item **B-139**, explicitly recorded as *your* named deferral, and it sits at #1 in STATE.md's open-work list as a future design pass. Currently new>>new just runs unfiltered (all gates shown), which is the sane placeholder. Nothing to do now.

---

## 8. Route naming consistency — Morning/MorningB/EveningA/EveningB → "HomeWorkA"-style (2026-08-25)

**You're right that it's inconsistent** — the four oldest routes carry legacy time-of-day names while the sixteen newer ones follow the FromToVariant pattern (`WorkStationA`, `HomeChurch`, `StationHomeWet`, …). Two of the newer ones even break the letter pattern in their own way (`StationWorkAlt`/`StationWorkStd`, `StationHomePreferred`/`StationHomeWet`), so if you standardize, decide how far the standard goes.

**But this is a bigger job than a rename, and here's why:** the route id **is** the name. There is no separate display-name field — the label you see is generated by splitting the id on capital letters ("EveningA" → "Evening A"). And the id is a *key* used everywhere: the engine's candidate list, the gate tables, the seed results, the on-phone ride-history and free-ride caches (every past result and free-ride crossing stores its routeId), the GPX+ exports you've already made (`track="Morning"` is baked into those files), the analysis scripts, the workbench files, and 624 archive filenames/index rows that carry route tags. Renaming the id therefore means either rewriting history (which "raw is truth" forbids for exports and raw data) or carrying a legacy-id alias map forever.

**Three ways to do it, cheapest first:**
1. **Add a display-name field** (or a small label-override table) to the route schema: ids stay `Morning`/`MorningB` internally, the app *shows* "Home Work A" etc. Small, zero data migration, all 20 routes get consistent display names in one pass. Downside: the inconsistency lives on in the internals and in every export/log, and you'll keep *seeing* the old names in GPX+ files and reviews.
2. **Rename the 4 legacy ids with a one-time migration**: catalog + engine refs + gates + seeds, plus a migration step for the on-phone caches, plus a permanent old→new alias for reading historical exports and analysis data. Medium job, done once, clean forever going forward. Past exports keep their old names (correctly — they're records of what was).
3. **Do nothing internal, fix only user-facing surfaces** — weakest option, listed for completeness.

I'd recommend **option 2 if the naming genuinely bothers you** (now is the cheapest it will ever be — every week adds more rides, caches, and exports keyed to the old ids), **option 1 if you mainly care what the app shows you**.

**Where I have to stop and ask rather than guess (two things):**
- **The exact mapping.** "HomeWorkA type names" — I assume `Morning`→`HomeWorkA`, `MorningB`→`HomeWorkB`, `EveningA`→`WorkHomeA`, `EveningB`→`WorkHomeB`, but that makes "A" mean "the original/preferred one," and for MorningB specifically, B is the rain/asphalt alternative — confirm that's the A/B semantics you want (rather than, say, `HomeWork` + `HomeWorkWet`, which is the pattern `StationHomeWet` already uses).
- **How far the standard reaches.** Do `StationWorkAlt`/`Std` and `StationHomePreferred`/`Wet` get folded into the same A/B scheme, or is descriptive-suffix naming acceptable for variants that aren't simple A/B pairs? Your one-line answer defines the whole convention.

**Verdict: agreed and actionable, but it needs your two naming rulings above before anyone writes a brief.**

---

## Summary — what's actionable, what's a question, what's just noted

**Concrete, actionable (WP-brief candidates):**
1. **Live position vs ghosts at gate crossings** (idea 1, stage 1) — behind a toggle, default off; uses existing per-ghost splits; cheap-to-medium.
2. **Sector-coloured route trail** (idea 2) — build on the Result/VIEW TRACE map first (no live-render risk), then the live map with a mandatory on-device both-themes check; small-to-medium.
3. **Token-usage section as a standing CYCLE.md requirement**, including the "no figure exists → say so, never estimate" rule; tiny.
4. **Route renaming** (point 8) — brief-able the moment you answer the two naming questions; recommend the rename-with-migration option.
5. **Two on-device checks for your next rides** (5 minutes each): (a) start a recording in the underground parking and confirm the lock now recovers when you surface; (b) the force-kill relaunch test the crash brief already asks for (P1). They can share one commute.

**Deliberately sequenced later, not now:**
- **Live ghost dots on the map** (idea 1, stage 2) — after the battery A/B (B-47) and ideally after raw-time scoring lands (B-59), so the dots don't contradict the colours.

**Open questions needing your one-line answers:**
- Ghost-dot timing base: should a ghost keep moving while you're stopped (raw time, per D-042) — i.e., does this feature wait for B-59?
- Sector trail: additive to gate ticks, replacement, or trial-then-pick (my lean)?
- Renaming: the exact A/B mapping for the four legacy routes, and whether Alt/Std/Preferred/Wet variants join the same scheme.

**Already done / answered — no action:**
- Free-ride directional filtering: **built 2026-08-24, credited to you** in the brief, the addendum, and the code comment.
- new>>new: already B-139, recorded as your deferral, #1 in the open-work list.
- Elevation outliers: data-driven finding from your own 2026-08-20 rides (a ±5–13 m spike in each), not from any report of yours; fixed flag-only, raw untouched.
- Ride-3 lock failure: your underground-parking reading is correct; the retry-on-settled-accuracy fix has since landed anyway.
- Token usage: cycle 024's summary already has the full section; only the standing process rule is missing.

**Just noted:**
- The workout-circuit app — logged; structurally a Qualifire cousin (tap = gate); revisit as a one-page concept note someday, separate team, as you said.

---

*Prepared by a fresh-context research pass over the repo (STATE.md, BACKLOG.md, cycle-023/024 records, the WP-B free-ride brief, the relaunch-crash investigation brief, process/CONVENTIONS.md and CYCLE.md, and the app code: RecordScreen, catalog, engine, routeMapView, defaultRoute), cross-checked against every point in Nathan's_notes3.md. Overlap with notes2 was checked: notes3's free-ride entries extend (not repeat) notes2's 2026-08-20 free-ride idea, which is being reviewed separately.*
