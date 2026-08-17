# Cold start — what the app is with nothing in it

Product Owner, cycle 011. **Design lens only** (Nathan's ruling): Qualifire stays single-user, no accounts, no sync, no store, no multi-user code (D-001, D-012). "Someone else" is used here as the sharpest test of one capability the app needs anyway — the path shared by a new way with no history (§20), riding in a new city, and the day the phone is wiped. Every proposal below is **UNBUILT**.

---

## 1. Minimum viable truth — what a rider must supply

Everything else in the app is derived. These are the only facts the app cannot compute for itself:

| # | User-supplied fact | When | Why it can't be derived |
|---|---|---|---|
| 1 | Location permission + foreground-service consent | install | — |
| 2 | START / STOP | ride 1 | The app does not know a ride is a ride. |
| 3 | A name for where this ride began, and where it ended | **after** ride 1 (see §3) | Coordinates are known; that they mean "home"/"work" is not. Two names = two landmarks = one way. |
| 4 | Confirmation that ride 2 is the same way as ride 1 | ride 2 | The app can propose the match from trace overlap; only the rider can say the intent was the same. |
| 5 | *(optional, ever)* sector names, gate nudges, reference promotion | any time | Cosmetic or taste. |

That is the whole list. N=10, MIN_HISTORY=5 and the palette are settled and are **not** settings (D-030).

**Counts — what "a few reference rides" actually is.** Nathan's "a few" splits into two different numbers:

| Rides | What it buys |
|---|---|
| **2** | The whole *workflow* exists: a way that has been proven to repeat, a matched corridor, provisional sectors, a first delta, a tower with two real rows. Two rides is the answer to "should a few reference rides suffice to make up the whole workflow" — **yes, for structure.** |
| **5** | The first *verdict*. `MIN_HISTORY = 5` (`app/src/ui/colourModel.ts:30`) gates both colour and rank; cycle 009 already ruled "below it: no colour, no rank". |
| **10** | `WINDOW_N = 10` — the window is full, purple means what it means on Nathan's routes, and §21's freak-time-expiry property switches on. |

**Consistency with the settled rules:** this answer does **not** contradict MIN_HISTORY = 5 or D-015's per-way honesty rule; it honours both. Three contradictions it *does* surface are in §5.

---

## 2. The staged-honesty ladder (UNBUILT)

House rule: never present a confidence the app has not earned. The corollary the app currently misses is that **stating what it does not yet know is itself honest, and it is motivating.**

| Stage | Lap | Sectors | Position / tower | Live screen | The line the app says |
|---|---|---|---|---|---|
| **Ride 1** | Time shown, plain ink, no tier | Times shown in plain ink if provisional gates exist — otherwise one whole-ride block | None. No "P1 of 1" (a rank of one is a joke, not a fact) | No route lock — there is nothing to lock to. Clock + gate flashes only | *"Baseline. Ride 1 of 5 on this way — times recorded, no verdicts yet."* |
| **Rides 2–4** | Time + **delta vs the previous ride on this way**, as a number in ink, never a tier | Per-sector deltas; gates confirmed by the second traversal | Tower rows accumulate, **unranked and uncoloured**; a *fastest-so-far* marker as a fact, not a tier | Route lock becomes possible from ride 2 | *"Ride 3 of 5. Two more before colours."* |
| **Rides 5–9** | Full tier: purple / green / yellow (`tierFor`) | Same, per sector, per clean history | Ranked: "P3 of 6" | Full live tier flashes and earcons | Once, at ride 5: *"Colours are on."* |
| **Ride 10+** | Steady state | Steady state | Steady state | Steady state | Once, at ride 10: *"Window full — from here the oldest ride drops out each time."* |

**The ride-1 crux: not "record only", but *verdict-free*.** Three things are legitimately earned on a first lap and should be shown:

1. **The times.** Elapsed and moving time need no comparison to be true.
2. **The shape.** Where the ride was fast and slow *within itself* is visible in the trace, but must not be coloured — comparing sector 1 to sector 2 compares different roads, which D-010's principle forbids. So: shown as a profile, never as a verdict. [ASSUMPTION: that a speed profile reads as information rather than judgement — Designer to test.]
3. **The countdown.** "1 of 5" is the ride-1 product. It converts an empty app from *broken* into *loading*, and it makes each of rides 2, 3, 4 unlock something visible instead of four identical grey screens. This is the single design move that makes a cold start survivable.

**Refused on ride 1:** any rank; any tier; any map-derived "expected time" (§29's flavour — no source, and D-001 rules out other riders' times); any "you were 12% slower than average" where the average is one number.

---

## 3. In-app setup, in the order a rider meets it (UNBUILT)

The key inversion: on a virgin install **setup is retroactive, not prospective.** §21's flow (press START → app detects the landmark → pick a destination → "X rides found") assumes landmarks already exist. On install the destination list is empty, so ride 1 must be *ride first, name after*.

| Order | Step | Mode | Survives a cold start? |
|---|---|---|---|
| 1 | Permissions | Manual | Yes |
| 2 | START | Manual | Yes |
| 3 | Start-landmark autodetect (§21) | Proposed-then-confirmed | **No** — no landmarks exist. Ride 1: silent. From ~2 visits to a point, the app proposes it. |
| 4 | Destination pick + "X rides found" (§21) | Proposed-then-confirmed | **No** — reads "0 rides found" on install. Must be skippable, and the empty state must not read as an error. |
| 5 | Naming start + end at STOP | **Manual** — the only true onboarding step | Yes. This is where landmarks are born on a cold start. |
| 6 | Way creation from the (start, end) pair | Automatic | Yes |
| 7 | Way match on ride 2 | Proposed-then-confirmed | Yes |
| 8 | Gates / sectors | Today: **measured offline over the archive** (B-02/B-19) | **No.** Cold-start substitute: after ride 2, propose an equal-chainage split of the matched corridor, editable later, replaced by measured gates once ≥10 rides exist. [ASSUMPTION: equal-chainage split, count per §4 item 4.] |
| 9 | Reference traject (§28 "pick reference trajects") | Ride 1 **is** the reference by default; afterwards, promote any clean complete lap from a list | Yes |
| 10 | Alternatives (§28 "+ alternatives") | Two ways sharing the same endpoint pair (Nathan's Evening A / Evening B). **Auto-matched from the trace at ~route-lock, not picked up front** — the rider should not have to declare which road they'll take. Grouped in the UI, never colour-compared (D-010, D-015) | Yes, once ≥2 ways share a pair |
| 11 | Sector naming | Manual, optional | Yes |

**Features that quietly do not survive a cold start** (all archive-dependent): landmark frequency proposal (§21/B-32); START autodetect; "X rides found"; measured gates and σ_s; route lock on ride 1; §20's "mine the archive to seed each new way"; the timing tower; Quali Day / reference *defence* (D-021 — there is no incumbent to defend); `results.seed.json` itself, which on a cold start is `[]`.

---

## 4. What of today's design is secretly Nathan-shaped

| Assumption | Load-bearing? | Consequence when it is false |
|---|---|---|
| **E-bike** (D-014) | Structure: incidental. Numbers: **load-bearing.** | Motor assist compresses variance. D-030's model is mean-relative, so it degrades gracefully — but any absolute noise floor (k·σ_s) is calibrated to e-bike spread and would fire wrongly for a rider with wide variance. |
| **A commute that repeats daily** | **Load-bearing.** | N is counted in *rides* in code (good), but D-028's tower window is written in *days* (28). On a way ridden weekly, a calendar window is empty and §21's "freak time expires every ~20 days" becomes ~20 weeks. See finding F-3. |
| **Two directions** | Incidental. | Generalizes cleanly to (start, end) pairs. Only the *naming* is Nathan-shaped: "Morning"/"Evening A" are times of day standing in for endpoints. Ways should be named after their landmarks. |
| **A ~15–25 min ride** | **Load-bearing** at the extremes. | Four fixed sectors over 15 min ≈ 3–4 min each. The same four over a 4-minute errand are 60 s sectors dominated by GPS noise; over a 2-hour ride they are useless. Sector *count* should scale with the way's length. |
| **Belgium / dense urban junctions** | Honesty machinery: **load-bearing.** Mechanic: incidental. | D-011's gates-downstream-of-junction-exits rule and the whole interrupted/red-light apparatus exist because of city traffic. Worse: `sectorValues` counts **clean sectors only**, so in heavy traffic a way's *lap* can reach n=5 and colour while its busiest sector never does. That asymmetry is the real new-city failure mode and it exists today. |
| **Three routes** | Incidental in design, **load-bearing in code.** | Route identity is hardcoded: `FALLBACK_ROUTE` and literal route IDs in `ResultScreen.tsx`, plus a shipped `results.seed.json`. These must become data before any way is user-created. |
| **The 624-ride archive** | **The most load-bearing assumption in the project.** | Gates, landmarks, σ, ghosts, tower rows and the seed file all descend from it. Every §3 "No" above traces back here. |
| **One device, never reinstalled** | **Load-bearing, and already violated.** | `recordedResults()` is memory-only (`lastRide.ts:26`). The comparison window resets on every app restart, not just on reinstall — so Nathan already lives a miniature cold start daily. The benchmark store (STATE open work #2) is the fix; cold-start is a second, independent argument for it. |

---

## 5. Findings and conflicts (logged, not smoothed)

- **F-1 — today's own lap sits inside its own comparison history.** `ResultScreen.tsx:53` sets `others = laps` for a real finished ride, and `laps` comes from `ghostsFor()` which includes `recordedResults()` — which `rememberRide` has already pushed. Consequences: `value < st.best` can never be true, so **a personal best can never render purple on the Result screen**; `positionAmong` counts the rider twice ("P1 of 11" from 10 rides); and MIN_HISTORY is reached one ride early. This changes the §1 counts, which is why it is here rather than in a QA note.
- **F-2 — sector colour lags lap colour by an unbounded number of rides** in traffic (clean-only sector history vs any-quality lap history). Correct per D-008, but on a new way it means the lap goes purple while the sectors stay grey, which reads as a bug to the rider. Needs a stated explanation on the board.
- **F-3 — D-028 says 28 days, `WINDOW_N` says 10 rides.** The code already unified them (`towerSource.ts` → `ghostsFor`); the decision text is stale. Principal to reconcile, per my cycle-008 triage §1.
- **F-4 — the cycle-003 conflict is still open after D-030.** Nathan's §3 flow is "ride Monday → ride Tuesday → sectors light up". Under MIN_HISTORY = 5 they light up on ride 5. My ladder proposes the reconciliation — on day two something *does* appear, but it is a delta in ink, not a tier — and I am recording that this remains a deviation from Nathan's own words, not a resolution of it.

---

## 6. Proposed backlog additions

**ID warning for the Principal:** my cycle-008 triage §4 also proposed B-31…B-38 and those are not yet in `BACKLOG.md` (max live ID is B-30). If that table is adopted this cycle, renumber the rows below from B-39. Status fields are the Principal's; shown as PROPOSED.

| ID | Item | Owner role | Status |
|---|---|---|---|
| B-31 | Cold-start ladder: verdict-free ride-1 board + the "ride n of 5" progress line + the two one-time announcements at n=5 and n=10 (§28) | Product Owner + Designer | PROPOSED |
| B-32 | Retroactive way creation: name start/end at STOP when no landmarks exist; landmarks born from visited endpoints rather than from the archive (§28) | Mobile Dev + Backend Dev | PROPOSED |
| B-33 | Provisional gates from 2 matched traces (equal-chainage split), superseded by measured gates once history allows (§28, §22) | Race Engineer + Backend Dev | PROPOSED |
| B-34 | Sector count scales with a way's length/duration instead of a fixed four | Race Engineer | PROPOSED |
| B-35 | De-hardcode route identity: `FALLBACK_ROUTE`, literal route IDs and `results.seed.json` become data; empty-seed install path | Mobile Dev + Backend Dev | PROPOSED |
| B-36 | Persist the comparison window across app restarts — fold into the benchmark store item; cold-start is a second argument for it | Backend Dev | PROPOSED |
| B-37 | Alternatives: multiple ways sharing one endpoint pair, auto-matched at route lock rather than pre-declared, grouped but never colour-compared (§28, D-010/D-015) | Backend Dev + Product Owner | PROPOSED |
| B-38 | Reference traject pick: ride 1 is the reference by default; promote any clean complete lap afterwards (§28) | Product Owner + Mobile Dev | PROPOSED |
| B-39 | Empty-state pass: "0 rides found", no route lock on ride 1, tower below MIN_HISTORY, sector-grey-while-lap-coloured explanation (F-2) | Designer | PROPOSED |
| B-40 | **Bug (F-1):** today's lap is inside its own comparison history — PB can never go purple, position counts n+1 (`ResultScreen.tsx:53`) | QA + Mobile Dev | PROPOSED |
| B-41 | Reconcile D-028's 28-day tower window with D-030 / `WINDOW_N = 10` (F-3) — decision text only, code already unified | Team Principal + Product Owner | PROPOSED |
