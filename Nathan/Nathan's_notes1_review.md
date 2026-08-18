# Qualifire — where things actually stand vs. your notes (2026-08-18)

I read your notes, then went through the project folder itself (the status file, the backlog, the decisions log, the process docs, the website, the route-review pages, the analysis folder, and the app code) to check each point against what really exists. Short version: **you are right about most of it, and in several places the project already contains the thing you're asking for — it just never reached you in plain words.** That last part is the real problem, and it comes up in almost every theme below.

---

## 1. Project documents & navigation — "are all these md files still needed?"

**What's actually going on**

- The `product/` folder holds 17 documents. They fall into three very different kinds, but nothing tells you which is which:
  - **Live, actively maintained (keep):** the backlog (65 open/closed items), the decisions log (42 numbered decisions), the concept summary, the data-model design.
  - **Design proposals that were written but never built** (labelled "UNBUILT" or "PROPOSAL" in their own first line): the setup/onboarding design, the cold-start design, the "type a destination" routing design, the map contract, the GPX+ export spec, the triage of your ideas 18-27, the build pipeline plan. These are *ideas on paper*, exactly as you sensed.
  - **Stale (you're right):** `LAYOUT.md`'s own header still says "no tab bar, five screens" and "the timing tower is UNBUILT" — the app has had six tabs and a working tower for days. `BRAND.md` still says "three tracks", "the lap begins 162 m later", "colour is the scarcest resource" and compares against 7-day/28-day windows (replaced by last-10 rides). The old MapLibre spike doc is flagged stale by the status file itself. `README-dev.md` inside the app folder opens with a status from cycle 5. `BUILD-3-RUNBOOK.md` in the root describes a build that failed and was superseded.
- The status file (`STATE.md`) — supposedly the single source of truth — has a paragraph near the bottom literally saying "this file is due a full regeneration, flagging drift rather than rewriting." It quotes 58 backlog items; there are 65. It still says three routes; there are 19.
- Only the root has a README explaining the folder layout, and it only lists 6 of the 14 top-level folders (it predates `data/`, `demos/`, `marketing/`, `app/`, `scripts/`, `safe_to_delete/`, `Nathan/`). No sub-folder has its own README except `app/core` and `app/src/storage`.

**Verdict:** correct on all counts. The clutter is mostly design proposals mixed in with live records, plus a handful of genuinely stale headers.

**Options you could pick**
1. **A one-pass cleanup**: move stale/proposal docs into a `product/proposals/` and `product/superseded/` split (nothing deleted — moved), regenerate the status file, and fix the stale headers. Half a day of agent work, needs your yes/no on ~5 files.
2. **A README in every folder** (as you suggested): 1-5 lines per file saying "live / proposal / stale, last touched, who reads it." Small job; can be done together with option 1.
3. **A standing "plain-language status" page for you** — one screen, no IDs: what works on the phone today, what's next, what's waiting on you. Regenerated at the end of every work cycle. This is the fix for theme 2 as well.

---

## 2. Direction & communication — "I don't know the next steps; the beta-tester file was never brought to me"

**What's actually going on**

- The project *does* have a next-steps list (in the status file and backlog), but it is written for agents, not for you: everything is a code name (B-40, D-041, section 29...). The rule "translate the backlog into a plain menu for Nathan" was only added on 2026-08-17 — one day ago.
- The **beta-tester panel** you found is a real, valuable review: four invented users walked through the app and produced 30-ish concrete findings plus a ranked top 5. It was written on 2026-08-17 against the app as it stood after cycle 8. Since then, without you being told, several of its findings were actually fixed:
  - the post-ride board dying on restart → fixed (comparison history now survives a restart);
  - route pills that did nothing → fixed (you now pick the route on the Record tab; the map preview follows the pick);
  - the "9:60"-style time formatting bug → fixed;
  - the screen layout clipping the STOP button → fixed.
  Others are still open and nobody surfaced them to you: the earcon/vibration switch that can't turn the buzz off; three tabs off-screen with no hint they exist; no ride-detail screen; the Rides tab being just a list of fix counts; internal decision IDs printed as user-facing text; the Demo tab never showing purple; and export asking for a folder every single time.
- The real "next steps" as the files see them, in plain words: (a) install the new build on the phone and ride with the real map, then check battery; (b) get all 16 new routes actually *scored* live (today only the three original commute routes are timed — see theme 4); (c) build a real ride-history store; (d) decide two open forks that need *your* call: whether the app should ask you which route up front vs. detect it (two design docs currently contradict each other), and whether to pursue "type a destination and race it."

**Verdict:** you're right that direction isn't reaching you. It's not that the project lacks a plan — it's that the plan is only readable by agents, and things get fixed or found without a Nathan-facing summary.

**Options**
1. **Adopt the beta-tester top-5 as the next mini-roadmap** — the still-open ones (buzz switch, hidden tabs, ride history, plain-language labels) are all small-to-medium and none needs a decision from you.
2. **End-of-cycle "manager summary" as a rule**: every cycle ends with 5 lines for you — what changed on the phone, what was found, what's next, what needs you. (Same as option 3 in theme 1.)
3. **Rule the two open forks now** so the team stops carrying both: "ask which route up front" (what the app does today, and what you confirmed on 2026-08-16) vs. "auto-detect, don't ask." Your one-sentence answer closes an open contradiction (B-65 / B-41).

---

## 3. Marketing site & brand copy

**What's actually going on** — I read the page line by line. Every point you raised is present in the file:

- Kicker under the logo: "One rider - three tracks - zero rivals." Footer repeats "three tracks." Both stale (19 routes now).
- Hero pitch: "...an F1 qualifying session against yourself. No other riders. No leaderboards. No calories. Just sectors, colour..." — F1 named, triple "no." The page's hidden browser description and the page title also say F1 / "qualifying lap."
- "Same road. New meaning." is there as the "How it works" heading — keep.
- "Press START at the door... begins about 162 metres later..." — present verbatim, plus "Morning, Evening A, Evening B — three known tracks" in step 1.
- A whole section titled **"Colour is the scarcest resource in the app"** with "Purple is rare by design." Also "E-major earcons," "race-mode near-black," and a closing "No red. No streaks. No calories."
- No sticky header: the logo/name appear only in the hero and the footer.
- The page is dark-only; there is no day theme even though the app now has one.

Where the scarcity idea came from: it was written into `BRAND.md` by the Designer role on 2026-08-15 as a *proposal* ("Status: PROPOSED"), and the site was then written from that brand doc. It was never ratified by you. So your instinct is right — it's Claude's framing, not yours, and it lives in a doc that still says "proposed."

**Options**
1. **Rewrite the site copy** to your brief: self-improvement / "a bit better every day"; make repeated daily rides playful; "compare yourself to yourself"; no F1, no "no/no/no", no 162 m, no scarcity; simplify "how it works" to press start -> ride -> save -> next time you have something to race, or load a preferred route and go. Keep "Same road. New meaning." Add a sticky ribbon (logo + name + a "try it" button) that appears on scroll. Add day/night to match the app. Half a day.
2. **Fix `BRAND.md` first** (drop scarcity, drop 162 m, drop "three tracks", state colours are used because they're intuitive, night/day now with more themes later), *then* regenerate the site from it — so the wrong idea can't leak back in from the brand doc.
3. Both, in one pass — my recommendation, since the site is downstream of the brand doc.

---

## 4. The route-review pages (demos/ways) — "my annotations haven't stuck"

**What's actually going on** — this one is more nuanced than "missing":

- **Your review did stick — twice.** Every verdict you gave on 2026-08-16 (keep / ignore / unreviewed, with your notes like "PREFERRED standard — shortest, avoids fosh," "route A/B," "impossible, straight lines over buildings") is recorded, keyed to the ride file, in `data/analysis/ride_curation.json`, and a write-up confirmed each of your claims against the GPS traces (you were right on everything except one pair of ride numbers). Then **on 2026-08-18 (this morning) the app's route catalog was expanded from 3 routes to 19 routes across 13 landmark-to-landmark ways, built directly from your tags** — including home->station preferred vs via-fosh, work<->station A/B, the "rain/asphalt" home->work seed, church/fosh routes, etc.
- **But** — and this is what you're feeling — **the live timing engine still only knows the three original commute routes** (Morning, Evening A, Evening B). The 16 new routes show up in the app, you can pick them, the map draws them, but when you ride one, nothing locks, nothing is timed, no sectors fire. This was flagged in the cycle report as "must reach Nathan" and evidently didn't. It's tracked as "de-hardcode route identity" (B-39).
- **Gates on the 16 new routes are placeholders** — evenly spaced along the route, explicitly marked unratified. Only the three original routes have measured gates.
- **The review pages are view-only.** They're maps you can look at and hide/show lines on; there is no "mark this one / drag this gate / save" button. Your annotations reached the file only because you said them in chat and Claude transcribed them. Nothing you do on the page is saved back.
- Several of your notes still sit as open questions waiting on you (B-60 to B-64): is home->work "rain/asphalt" a real fourth track or a detour? Are station<->work A and B genuine alternatives? Which of the thin-evidence ways (church<->fosh with 1 ride, fosh->home outbound with 1 ride) are real routes?

**On your four sub-ideas:**
1. *Agree reference routes per landmark pair* — the mechanism exists (a route enters the catalog only when you ratify it), and 19 are in. What's missing is a way for you to see and confirm each one that isn't a chat transcript.
2. *Fixed gates per route, drag & save* — designed but not built. There's a design page (`SETUP-UX`) that argues *against* dragging on the phone (thumb covers the line; suggests tap-then-nudge with +/-10 m / +/-50 m buttons), and a backlog item for a browser page where you eyeball each gate with a Google Maps link and say "move gate 2" (B-31, zero build cost, open since cycle 3). Neither exists yet.
3. *Shared gates where routes overlap near home* — already anticipated in the data-model design ("sector sharing across ways... tempting, deliberately not built yet") and in the routing design (compare per-sector, not per-route, so overlapping stretches share history). Good idea, filed, unbuilt.
4. *Free ride / seed ride* — the cold-start design already says "ride 1 *is* the reference by default; promote any clean lap later" (B-42) and a decision says a new route may keep time but never compare until 5 clean rides (D-036). Nothing in the app implements a "just ride, no scoring" mode though — every ride today tries to lock onto a route. So a "free ride" toggle would be new UI on top of an already-agreed principle. Naming: the docs call it a "reference ride/route"; "seed" is what the catalog file uses internally. Either works — pick one and it becomes the word.

**On "is the map overlay fake?"** — it's real. The map is a real vector map (MapLibre + OpenFreeMap) since build 4, your dot is drawn at the true GPS position, and the route line is drawn from the reference trace. The "OFF ROUTE" badge fires when your true fix is more than ~120 m from the drawn route line; the engine's own corridor is stricter (~40 m). Two things make it fire while you're clearly on route: (a) if you're riding one of the 16 new routes, the engine is comparing you against the three old commute routes only, so of course you're "off route"; (b) even on the old routes, the reference line is a smoothed version of one past ride, and Evening A/B share their first stretch out of work, so the map can show the wrong one until the first gate (this is exactly what you reported after your last commute — logged as B-65). Nothing here is a visual trick.

**Options**
1. **Make the 16 new routes actually score live** — the single change that would make your route work "stick" in the way you meant. Medium job (B-39), no decision needed from you.
2. **A route-and-gate workbench page you can save from**: one browser page per way with a checkbox "this is a reference," draggable/nudgeable gate lines, and a Save button that writes a file Claude reads next cycle. Medium job; combines B-31 with your ask. Would also become the place you answer the B-60-B-64 questions instead of in chat.
3. **A "free ride" mode on the Record tab** (no locking, no scoring, just record and save; optional "make this a reference for X->Y" at STOP). Small-to-medium; needs you to pick the word.
4. **Answer the five open route questions** (B-60-B-64) in one sitting — 10 minutes of yes/no from you unblocks the catalog being finalized.

---

## 5. Data & analysis, ghosts, ride history, and your TEST rides

**What's actually going on**

- **The ghosts are not random.** For each of the three original routes, the app compares you against the last 10 archive rides on that route (e.g. Morning: your Strava rides up to 2026-07-31), computed by the project's own pipeline from raw GPS, plus any ride you finish in the app. So they *are* your real history — but only the most recent 10, and only on Morning / Evening A / Evening B. Two things could make it feel random: the tower shows dates rather than anything recognizable, and if you rode a new route the ghosts don't apply at all (nothing locks). Also, until the restart-persistence fix landed on 2026-08-17, in-app rides dropped out of the comparison every time you reopened the app — so early test rides genuinely never showed up.
- **The comparison window is deliberately last-10, not everything** (your own idea from an earlier note — a freak time expires after ~10 rides). If you now want a bigger window or "all-time" visible somewhere, that's a change of mind worth stating.
- **"Previous rides / look back" — you and the beta panel are right.** The Rides tab is a list of date + duration + fix count with Export and Delete. No route, no lap time, no sectors, not tappable. The Result tab only ever shows the *last* ride. There is no way to look at yesterday. The design for "same board for any past ride" exists on paper (LAYOUT sections 3/4) and the store to back it is the top structural item in the status file ("benchmark/ride-history store — unlocks real tiers, real tower population"). Unbuilt.
- **Feedback on your TEST rides exists but wasn't given to you.** Your six in-app rides in `data/activities/TEST in app rides/` were checked on 2026-08-17 and recorded in the status file as "all triaged healthy — 1-second fixes, complete, in the Leuven box." And the bigger question — is app GPS comparable in quality to Strava's export — was answered back on 2026-08-14 in the comparability study (B-21): **yes, comparable, with guards** (Strava's export is the same phone location stream at 1 Hz, lightly smoothed; timing error from smoothing is under 1 second per gate, well below the noise floor). That became decisions D-018 and D-024. So: your data is good, the recording works, and it's fair to compare against Strava-era ghosts. Nobody told you.
- **GPX+**: your idea is fully specified (`GPX-PLUS-proposal.md`, 2026-08-16): standard GPX plus an extensions block carrying gates detected and when, START-to-first-fix delay, route lock, GPS outages, stops, storage errors, per-point accuracy. It is unbuilt and was triaged as "spec ahead of need — revisit after landmarks/ways exist." Landmarks and ways now exist, so that gate has cleared. One catch worth knowing: the app currently *throws away* GPS accuracy per point at recording time; the spec's open question #1 is whether to start storing it before more rides accumulate without it.
- The `data/analysis` folder is *not* unimplemented — it's the source of the gates, the reference lines, the ghost seed file, the landmarks, and the route images the app uses. What's missing is the *user-facing* side (history, look-back, ride detail), not the analysis feeding the app.

**Options**
1. **Build GPX+ export now** (small-to-medium; also decide the "store per-fix accuracy" question — I'd say yes). You could test it immediately on your next ride.
2. **Ride history / look-back**: make Rides rows tappable, show route + lap + sectors + tier, open the same board for any past ride. Medium; the store work behind it is the biggest structural item on the list.
3. **A one-page "your data" report for you** in plain language: what the six test rides look like, how they compare to Strava rides, and which archive rides are currently your ghosts per route. Cheap, read-only, answers your question directly.
4. **Say whether last-10 is still what you want** as the comparison window, or whether you'd like a bigger/all-time view alongside it.

---

## 6. App architecture — "I don't know what 'the store' is"

**What's actually going on** — here's the app in one paragraph, no code names:

The app folder has four working parts. **The engine** (`app/core`) is the pure timing brain: it takes GPS points, projects them onto a route line, detects gate crossings, and computes sector/lap times — proven against 125 archive rides. **Location** is the piece that talks to Android GPS in the background and hands fixes to the engine. **Storage** writes every ride's raw GPS to disk, append-only, forever (the "raw is truth" rule) and does GPX export. **The store** (`app/src/store`) is the app's *catalog and results memory*: the list of your landmarks, ways, routes and gate positions (the catalog), plus the derived per-ride results (lap/sector times) that ghosts and colours are computed from. When someone says "the store," they mean that catalog-and-results layer. Then there's **the UI**: six tabs — Record (start/live ride with map), Rides (list), Routes (your places and ways), Result (last ride's board and tower), Settings, Demo. Two things people confuse: the **dev client** on your phone streams the latest code from your PC (no rebuild needed for most changes), whereas a "build" is only needed when native pieces (like the map module) change. And the "mockup" in `demos/` is a browser prototype that is supposed to mirror the app but is not the app.

**Options**
1. **A one-page "how the app is built" explainer for you** in this style, kept in the repo and updated when structure changes. Cheap.
2. **A glossary** (ghost, gate, sector, way vs route, tier, tower, seed, reference ride, dev client vs build) that the team also uses in chat with you — and, per the beta panel, that the *app itself* should stop violating by printing "D-025" at users.
3. **Rule that chat replies to you lead with the plain-language version** and put file names/IDs only in a footnote — it's already a written convention as of yesterday, but it clearly needs enforcing.

---

## Where you're right, and the two places you're slightly wrong

- **Right:** LAYOUT/BRAND/README-dev/status file are stale; product folder mixes proposals with live records; the beta-tester findings and test-ride verdicts never reached you; the site copy is exactly as you describe and the scarcity idea was never yours; the route review pages can't save; the 16 new routes don't score; ride history is missing; GPX+ is unbuilt.
- **Slightly wrong (in your favour):** the ghosts aren't random — they're your last 10 real rides per route; your route review *did* land (curation file + this morning's 19-route catalog); and your test-ride data has already been checked and judged good and comparable to Strava. The failure was communication, not the work.
- **Also worth knowing:** OpenTracks (from your first note) — the prior-art doc already looked at it and concluded it's Java/Android, so its code can't be reused in this app; the useful takeaways were its recording-service structure and its elevation-data caveat. Cloning it would be for reading, not for borrowing.

**Suggested first pick, if you want one:** theme 1 option 3 + theme 2 option 2 together (a standing plain-language status page and a manager summary at every cycle end) — because every other complaint in your notes traces back to that gap.

---

*Prepared by a fresh-context research pass over the project folder (status file, backlog, decisions log, process docs, marketing site, route-review data, and app code), cross-checked against every point in Nathan's_notes1.md.*
