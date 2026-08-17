# Beta-tester panel

IDEAS §27, run cheap. Owner: whoever the Principal names in the cycle agenda. First round: 2026-08-17, against the app as it stands after cycle 008.

---

## How this panel is run and re-run

**Shape.** Four invented personas, never Nathan. One round per cycle, one agent, one pass — not ten agents and not one agent per persona. The whole round is a single read of the screens plus this file's output.

**Read path.** `product/CONCEPT.md`, the current `cycles/cycle-NNN.md`, `app/App.tsx`, and `app/src/ui/*`. Supporting reads (`live/`, `location/`, `store/`) only when a screen's behaviour cannot be decided from the screen file — a claim about what the user sees must be traceable to code, not to a doc.

**The binding rule.** Judge only what the code does. A feature described in `CONCEPT.md`, a cycle log, or a component's own docstring but absent from the render path is a finding, not a feature. (Docstrings in this codebase are already stale in places — `settings.tsx` still opens "In-memory only for now" above a file that persists.)

**Output.** Rewrite this file each round: personas may be reused or replaced, findings are replaced wholesale, the ranked list is re-derived. This is not an append-only log; a fixed finding should vanish, not accumulate a "RESOLVED" tag.

**Cost control.** No test writing, no code changes, no other file touched. If a round costs more than a specialist's normal cycle turn, it was run wrong.

**Kill criterion.** The panel earns its place only if a round surfaces something a normal cycle would not — i.e. findings that live in the *seams between screens* (two screens disagreeing, a setting that does not reach its consumer, a signpost pointing at the wrong tab). A round that only reproduces what QA's tests already lock, or only restates open items already in the cycle log, is a round that should not have been run; say so in the report and skip the next one.

---

## The panel

**Ines Devos — 34, data-minded commuter.** Cycles 12 km each way, keeps a spreadsheet of everything, exports from every app she owns. Trusts a number only once she can see how it was derived.
Wants: consistent definitions, per-ride history, raw export. Intolerant of: two numbers for the same thing.

**Tom Willems — 47, casual rider who wants it simple.** Rides to work because it is faster than the car. Will press one button and put the phone in a pocket; will not read a hint line.
Wants: press start, ride, see if it was a good one. Intolerant of: anything he has to configure or hunt for.

**Roos Maes — 26, competitive club cyclist.** Races on weekends, reads F1 timing screens fluently, knows what purple means. Uses the commute as a repeat interval.
Wants: honest tiers, a real position, PBs, deltas. Intolerant of: a number the app cannot back up.

**Marc Peeters — 63, non-technical.** Recently switched to an e-bike. Uses maybe four apps. Reads every label literally and assumes a switch does what it says.
Wants: plain words, big targets, no surprises. Intolerant of: jargon, and controls that do nothing.

---

## Findings

### Ines — data-minded commuter

- **Record (recording) vs Result — three different "ride times", none reconciled.** The big live clock is `realTimebase(session.startedAtMs)`, i.e. elapsed since she pressed START. The LAP result is gate-to-gate (START gate sits 162 m in, per `catalog.seed.json`). The Rides row is wall-clock `endMs - startMs`. On one commute she read 15:41 on the clock, a LAP of 13:52, and "14m32s" in Rides. Nothing on any screen explains the differences.
- **Result — the board is a single in-memory slot.** `lastRide.ts` holds one module-level variable. Lock the bike, phone kills the app, reopen: Result silently falls back to the newest seeded ghost, captioned `"TODAY" is the most recent ghost`. Her actual ride's board is gone and there is no ride-detail screen anywhere to get it back.
- **Rides — the list is a fix counter, not a ride list.** Each row is date, wall-clock duration, fix count. No route, no lap, no sectors, no tier, and the row is not pressable. The only per-ride action is Export GPX.
- **Result — the tower window is not a window.** `ghostsFor()` filters by `routeId` only; no date filter exists. The header reads "TIMING TOWER — LAST N RIDES" where N is simply the seed count for that route (9 Morning / 10 EveningA / 8 EveningB). `CONCEPT.md`'s trailing-28-day set is not implemented, and the sector "avg" column is the all-time seed mean under a heading that implies recency.
- **Result / Demo — time formatter rounds across the minute boundary and prints impossible strings.** `colourModel.fmt()` computes `rest = s - m*60`, then rounds `rest` but tests the *unrounded* value for the leading zero: 549.6 s renders `9:010`, 599.7 s renders `9:60`. `DemoScreen.fmtMS` has the same defect. (`liveView.fmtSec` rounds first and is correct — so the same second renders differently on the live pane and on the board.) Roughly 1 number in 30; the board renders ~10 plus one per tower row.
- **Rides — export friction.** `saveGpx` calls `requestDirectoryPermissionsAsync()` on every single export; the folder is never remembered. Exporting a week is seven folder pickers. Cancelling the picker does not abort — it silently falls through to the plain-text share sheet.
- **Nowhere — no CSV/JSON, no sector export.** GPX only; the derived sector times she actually wants exist only on a screen.

### Tom — casual rider who wants it simple

- **Tab bar — he never found three of the six tabs.** Six tabs at `minWidth: 92` is ≥ 552 dp of content in a `ScrollView` with `showsHorizontalScrollIndicator={false}` and no fade or arrow. On a ~400 dp phone `result`, `settings` and `demo` sit off the right edge with zero affordance that they exist. He used the app for a week believing it had three tabs.
- **Record — after STOP the app points at the wrong tab.** The confirmation reads "Ride saved: N fixes, m:ss. Find it in Rides." The post-run board is on **Result**. Rides shows him a fix count.
- **Record (idle) — the FROM / GOING TO pills do nothing.** `from` and `to` are `useState` values read only by their own highlight styling; neither is passed to `startTracking()`, the engine, or the ghost lookup. Picking "Leuven station → church" changes nothing about the ride or the screen.
- **Record (idle) — "DETECTED START" is not detected.** With Settings → Start place = *detect*, the only difference is the label text; the pills still show the hardcoded default `home`. Standing at the station, the app told him in capitals that it had detected he was at home.
- **Record (idle) — the ghost count ignores his pick.** `ghostsFor(live.track ?? 'Morning')`; before a ride `live.track` is always `null`, so "you are racing N ghosts" is permanently the Morning count no matter which pills are lit.
- **Record — STOP is one tap, no confirm, no undo, no pause.** A slim bar, tapped through a jacket pocket, ends and seals the ride. The only pause-like control is the Red-light button, which is off by default and is self-reported anyway.
- **Anywhere — the hardware back button is the only navigation and it always dumps him on Record.** Reading the board, back → Record. Back again → app backgrounds. There is no way back to what he was reading.
- **First launch — no onboarding of any kind.** Logo, five place pills, START. Pressing START fires two system permission dialogs back to back; Android 11+ throws him into the OS settings page for "Allow all the time", and the app's explanation of why only appears *after* he returns.

### Roos — competitive club cyclist

- **Result vs Record — the two screens disagree on whether an estimated lap ranks.** `getLiveTowerPosition()` returns `null` when `st.lap.estimated` (D-028), so the live handover correctly shows no position chip. `ResultScreen` calls `positionAmong(mine, others)` with no estimated guard and prints "P4 of 10" plus a full tower row for the exact same lap. One of the two screens is lying about her ride and there is no way to tell which.
- **Result — tier colours are inverted relative to the live screen.** `chips.tsx` maps `yellow → #F5C542` (F1 yellow) and `neutral` (no verdict) → `accentText`. `ResultScreen.tierColour` maps `yellow → t.textDim` (grey) and `neutral → t.accentText`. So an ordinary *measured* lap that glowed F1 yellow at the finish line is drawn in dim grey ten seconds later on the board — in the exact colour `theme.ts` reserves ("`grey` is reserved for NO-DATA states only"). Her scored lap reads as missing data.
- **Result — a sector she never rode renders as the fastest number on the board.** `rememberRide` writes `rawS: 0` for any sector with `kind !== 'done'`; `ResultScreen` prints `~${fmt(sec.rawS)}` when `movingS` is null. A missed gate shows `~0:00`.
- **Result — stopping short of the finish gate leaves yesterday's ride on the board, labelled as today's.** `rememberRide` early-returns on `st.lap === null` *without clearing* `last`. She aborted a ride at the halfway point, opened Result, and read the previous day's lap under the caption `"TODAY" is the ride you just finished on Morning`.
- **Record (live) — no delta, no PB, ever.** `bigFromSector` hardcodes `delta: ''` and the lap chip likewise; `BigChipModel.pb` exists and is never set by any caller. The chip renders a `●` badge that nothing can trigger. So the live surface can never answer "by how much".
- **Record (live) — touch targets on the racing screen.** `RouteMapView` renders `+`, `−` and `FIT` buttons unconditionally, including while recording, against D-006's "no interaction while moving". They are also the only controls on that screen other than STOP, so a fumbled tap is a zoom rather than a stop.
- **Result — no ideal lap, no reference, no REF badge.** All three are in `CONCEPT.md`; none is in the render path.

### Marc — non-technical

- **Settings — the only switch he touched does not do what it says.** "Earcons" off still buzzes. `location/index.ts` subscribes to the engine at module scope and calls `Vibration.vibrate(70)` on every gate fire with **no settings check at all**; `RecordScreen` adds a *second* `Vibration.vibrate(60)` gated on `settings.earcons`. Net: switch on = two buzzes per gate, switch off = one. There is no position of that switch that stops the phone buzzing.
- **Settings — internal decision IDs used as user-facing copy.** "one buzz + tier sound at each gate (D-019)"; "(§18, unsettled)". The Result screen prints "(D-013)" and "Nothing is invented here (D-025)". He asked what D-025 was.
- **Settings / everywhere — vocabulary he does not have.** "Earcons", "ghosts", "tier", "sector", "lap", "Timing tower", "the race surface follows it". Nothing in the app defines any of them.
- **Demo — the big clock never moves.** `DemoScreen`'s view model sets `clock.running: false`, so `clockMsAt` returns `anchorClockMs` (0) and `LapClock` starts no interval: the largest element on the screen reads `0:00.0` for the entire 34-second replay. `vm.flash` is hardcoded `null` and `flashKey: 0`, so no sector result ever flashes either. The tab built to show him what riding looks like omits both of the live screen's headline behaviours.
- **Demo — the lap is never coloured.** `tierOf(0, script.lap)` calls `sectorValues(ROUTE, 0)`; there is no sector index 0, so the history is empty, `tierFor` returns `neutral` under the <5-rides rule, and the lap chip is always colourless. `RecordScreen.tierOf` special-cases index 0 to `lapValues`; `DemoScreen` does not.
- **Demo — purple is unreachable.** The scripted ride is the newest archived Morning lap and is compared against a history that still contains itself (no self-exclusion, unlike `ResultScreen`'s `.filter(v => v !== sec.movingS)`), so `value < best` can never hold. The demo cannot show the one colour he was told to look for.
- **Demo — no stop.** The button disables itself for the full run; there is no way out but leaving the tab.
- **Routes — his home shown as raw coordinates.** "50.83650, 4.63820 · 120 m", no name, no map, no context, and the explanatory paragraph is about p90 endpoint spread. He read it as an error code.
- **Routes — promises a question START never asks.** The work→home card says "2 routes · asks which one at START". The Record screen has no route question; only place pills, which do nothing.
- **Record — likely no room for STOP while recording.** The screen is a plain `View` with `justifyContent: 'center'` and no `ScrollView`. Recording with Live map on and Red lights = *button* stacks fixed heights: map 190 + pane ≥ 291 + status + red-light ~50 + STOP 56 + 40 padding + 44 gaps ≈ 690 dp, against ~640 dp of content area on a mid-size phone once status bar and the 48 dp-padded tab bar are removed. Overflow in a centred container spills off *both* ends, taking the bottom of the STOP bar with it. Needs on-device confirmation — cycle 008 recorded that none of this has been seen on hardware.

---

## Top 5 issues worth fixing

Ranked by how much each would hurt a real user, not by how hard it is to fix.

1. **The payoff screen is volatile, stale-prone, and signposted to the wrong tab.** `lastRide` is one in-memory variable, so the post-ride board dies with the process (the screen `CONCEPT.md` calls "the screen Nathan sees after locking the bike"); an aborted ride leaves the *previous* ride on it captioned as today's; and Record's own confirmation sends the user to Rides, which cannot show a board at all. The single most important moment in the product is the least reliable thing in it.
2. **The Earcons switch cannot turn the buzz off, and doubles it when on.** The unconditional module-scope `Vibration.vibrate(70)` in `location/index.ts` ignores Settings entirely, and `RecordScreen` adds a second buzz on top. Haptics are the *only* channel that works on a bike (no audio assets exist), it is wrong in both switch positions, and it is untouchable from the UI.
3. **Half the app is undiscoverable.** Six tabs at ≥ 92 dp overflow every phone width, the scroll indicator is disabled, and nothing hints at more. `result`, `settings` and `demo` — including the board from issue 1 and the switch from issue 2 — are simply off-screen on first launch.
4. **The Result board misreports the ride it is describing.** It ranks estimated laps that the live screen correctly refuses to rank (direct D-028 contradiction between two screens); it paints ordinary measured laps in the grey `theme.ts` reserves for no-data, inverting the live screen's palette; it prints unridden sectors as `~0:00`; and `fmt()` renders times like `9:010` and `9:60`. Every one of these attacks the same thing — whether the numbers can be trusted.
5. **The start flow is decorative and states things that are not true.** `from`/`to` are read by nothing; the label says "DETECTED START" while showing a hardcoded `home`; the ghost count is always Morning's because `live.track` is null before a ride. It is the screen the user touches every single day, and three of its four elements are inert or wrong.

*Below the line, worth a cheap pass:* the Demo tab demonstrates neither the ticking clock nor the gate flash and can never show purple; the live map's zoom buttons put touch targets on the racing screen against D-006; the Record screen may clip STOP off the bottom with the map and red-light button both on; GPX export re-asks for a folder every time.
