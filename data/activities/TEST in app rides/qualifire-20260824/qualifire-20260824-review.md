# Qualifire — your three test rides on 2026-08-24, the day the map died and the recorder didn't

Same approach as the 19th and the 23rd: I read your notes, then pulled the three GPX+ files apart point by point — track geometry, timing, and the full qf: event blocks. (This review replaces an earlier pass that was written against a stray duplicate of the 23rd's notes; your corrected notes are now in, and everything below is cross-referenced against them.) Short version: **your crash report is verified — the screenshot is a maplibre render error (`` `id` cannot be changed ``), and both "new"-landmark rides show its fingerprints in their files — but the headline is what *didn't* break: on both crash rides the recorder kept a flawless one-fix-per-second track to a clean END, zero storage errors, and on ride 3 the gate engine caught all five gates of the evening route while the map you couldn't see was dead.** The crash cost you the screen, not the data. It did cost the files something specific, though: both crash rides are missing their route-match diagnostics entirely, and ride 3's session block contradicts itself — five real gate crossings above a `routeLock` that says `none`.

A scope note up front, same as last time: this pass analyzed the three GPX+ files, your corrected notes, the crash screenshot, and the 2026-08-19 and 2026-08-23 reviews + notes as precedent. It did **not** re-read the app code or the project records, so statements about *why* maplibre threw are hypotheses marked as such, and claims about UI behaviour come from your notes.

---

## Anomalies / needs your attention

1. **Ride 3 fired five real gates with no recorded route lock — the session block contradicts itself.** The file says `routeLock="none"`, yet the gates block lists START, G1, G2, G3, FINISH, all `estimated="false"`, at sane times and places (full table below) — and they are unmistakably an evening work→home gate set: ride 3's FINISH sits **3 m** from ride 1's morning START gate ([map](https://maps.google.com/?q=50.836349,4.640304)), and each of its gates mirrors a morning gate to within 100–200 m. On the 23rd I flagged that gate events precede lock events and the ordering semantics needed pinning; this is that anomaly's escalation to the limit case: **gates with no lock at all, ever.** Either the engine really does fire gates on a leading candidate lock-free (then the export should say which candidate), or a lock happened and the event was lost — plausibly to the same crash that ate the diagnostics (next item). Needs a code pass to say which.
2. **Both crash rides are missing `routeMatchDiagnostics` entirely.** Every non-crash GPX+ file to date — all three from the 23rd, and ride 1 today — carries a full anchor/retry/lock attempt log (ride 1: 61 attempts across all 20 candidates). Rides 2 and 3 have **none**, not even the anchor attempts that fire within seconds of START — and ride 2 started at work, where EveningA/B and three Work\* routes all anchor trivially. The correlation is exact: map view crashed ⇔ diagnostics absent. My working hypothesis: diagnostics (and possibly the lock event of anomaly 1) are collected in or near the component that crashed, while the recorder and the gate detector live elsewhere and survived. If that's right, GPX+ collection should be moved somewhere crash-proof — the whole point of a flight recorder is to survive the crash.
3. **I can't name your "new" destination from the data — confirm what it is.** Rides 2 and 3 pivot on a point at 50.870719, 4.691999 ([map](https://maps.google.com/?q=50.870719,4.691999)) — ride 2 ends there, ride 3 starts 6 m away. Ride 1's candidate list (the only one recorded today) is the **same 20 tracks as the 23rd** — Morning through ChurchFosh, nothing new — so whatever landmark you created isn't in that snapshot. That's consistent with you creating it in the 78-minute gap between ride 1 (ended 18:06) and ride 2 (started 19:24), but the two files that would show the grown catalog are exactly the two with no diagnostics. Please confirm: what's it called, and was it created between the rides?
4. **The startup stale-fix artifact is now 3-for-3 and pollutes three different stats.** All three files open with a cached fix (accuracy ~100 m) timestamped *before* the START press: `firstFixDelayS` = −10.54, −7.23, −6.30. Flagged on the 23rd as anomaly 4, still unfixed — and today shows the full blast radius: each file's outage log and stop log open with a **phantom** entry spanning first-stale-fix→first-real-fix (ride 1's only "stop" is this artifact — you actually rode nonstop), and the stale→real jump reads as a fake speed spike (**92 km/h** at 19:24:30 in ride 2, going nowhere). One fix — drop or flag the pre-START point — cleans all three.
5. **Post-outage catch-up spikes.** Ride 1's one real GPS outage (5.0 s at 17:58:16 local, position frozen at 50.851211, 4.665836 ([map](https://maps.google.com/?q=50.851211,4.665836))) is followed by two catch-up points reading 50 and 83 km/h. Together with anomaly 4's spikes, this settles it: any max-speed figure Qualifire ever shows must filter on `qf:acc` and gap-adjacency, or your e-bike will keep clocking motorway speeds. (Honest sustained maxima today: 28.6 / 27.1 / 29.8 km/h.)
6. Trivial but for the record twice over: the notes file is named `qualifire-2026084-notes.md` — missing a digit (should be `20260824`); worth renaming before some future sort hides it. And your notes say the app crashed "for the last two rides" — the files agree those were the two involving the new destination, so notes and data are in full accord on the story of the day.

---

## Since the 23rd — what these files show changed

- **Gates got names.** The 23rd's files said `gate0…gate4`; today's say **START / G1 / G2 / G3 / FINISH**. Small, but it makes the event log read like a race and the start/finish special-casing explicit.
- **`routeLock` can now say `none`** — an explicit no-lock record rather than a missing element. (All three rides on the 23rd locked, so this is the first sighting; whether it's new or just newly exercised, the files can't say.)
- **The catalog held at 20 candidate tracks** — same list as the 23rd, `StationHomeWet` included. Your new destination is not among them (anomaly 3).
- **The 400-metre lock rule is now visible twice.** Ride 1 locked `Morning` at chainage **402.1 m**; the 23rd's ride 2 locked ChurchFosh at 402 m. Two locks, both a rounding error past 400 — the rule from the 19th's review, caught in the act on consecutive ride days.
- **And the resilience result:** `storageErrors count=0`, `relaunches count=0` on all three sessions — including the two where the map view was a red error screen. The background recorder is provably independent of the UI now.

---

## The three rides — what the GPX+ files actually show

### Ride 1 (17:50, home → work on the Morning route — the healthy control)

**The numbers:** 5.71 km in 15 min 36 s button-to-button, **zero real stops** (the logged one is anomaly 4's phantom — you rode it clean through), average 22.1 km/h moving, honest sustained max 28.6 km/h on the descent at 50.858604, 4.671504 ([map](https://maps.google.com/?q=50.858604,4.671504)) — within 40 m of where the 23rd's ride 1 clocked its max, evidently *the* fast stretch of this road. Median GPS accuracy 3.8 m, ~38 m of smoothed climbing. Start at 50.836513, 4.638210 ([map](https://maps.google.com/?q=50.836513,4.638210)) — home (ride 3 ends 4 m from it); end at 50.863288, 4.687817 ([map](https://maps.google.com/?q=50.863288,4.687817)) — work (ride 2 starts 53 m away).

**This is what a fully healthy GPX+ session looks like, and it's the yardstick the crash rides get measured against.** The event timeline:

- 17:50:27.6 — START pressed (first fix is the stale one from 10 s earlier — anomaly 4).
- 17:50:30.9 — first real fix; all 20 candidates anchor, four of them plausibly (`Morning` xtd 2.7 m, `MorningB` 0.1 m, `EveningA` 0.3 m, plus the Home\* family — everything through your front door).
- 17:51:04.8 — **START gate fires real** at 50.836366, 4.640329 ([map](https://maps.google.com/?q=50.836366,4.640329)), 0.17 km in — before any lock, consistent with the pre-lock gate behaviour first seen on the 23rd.
- 17:51:44.6 — **`Morning` locks at chainage 402.1 m** (route length 5,325 m). MorningB and EveningA never got the 200 m lead, Morning did — correct pick, on the road you were on.
- G1 17:54:16 at 50.843425, 4.651262 ([map](https://maps.google.com/?q=50.843425,4.651262)) · G2 17:57:49 at 50.851113, 4.664002 ([map](https://maps.google.com/?q=50.851113,4.664002)) · G3 18:01:57 at 50.858773, 4.670533 ([map](https://maps.google.com/?q=50.858773,4.670533)) · FINISH 18:05:28 at 50.863576, 4.686184 ([map](https://maps.google.com/?q=50.863576,4.686184)) — all real, at 3.0 / 23.4 / 47.2 / 74.6 / 97.0% of your ridden track, the same shape as the 23rd's spread.
- Sector times: **3:12 / 3:33 / 4:08 / 3:31**, START→FINISH 14:24. (Sector 3 contains the day's only real outage and the uphill grind.)
- 18:06:02.8 PAUSE → 18:06:03.4 END, 0.6 s apart — the shared-menu end flow, once again visible in the button log.

Two blemishes, both already filed as anomalies: the 5-second outage at 17:58 with its 83 km/h catch-up, and an app-flagged elevation outlier (−15.1 m in one second at 17:51:58 — the `elevationOutliers` block catching its own sensor, which is the right instinct). One wry footnote: the route named `Morning` was ridden at ten to six in the evening and locked without complaint — route names carry time-of-day meaning to you but not to the engine, which is fine until a "morning vs evening on the same road" comparison someday takes the name literally.

### Ride 2 (19:24, work → the new destination — first crash ride)

**The numbers:** 1.28 km in 3 min 48 s button-to-button, average 21.2 km/h moving, honest sustained max 27.1 km/h at 50.869323, 4.689317 ([map](https://maps.google.com/?q=50.869323,4.689317)), median accuracy 3.8 m, one brief arrival standstill (6 s) before the PAUSE→END pair. Start 53 m from ride 1's end at work; end at the new destination, 50.870719, 4.691999 ([map](https://maps.google.com/?q=50.870719,4.691999)).

**Per your notes this ride crashed — no live map, no blue dot — and the file corroborates it by what's missing rather than what's present.** The session block records: `routeLock="none"`, no gates, and — the tell — **no routeMatchDiagnostics whatsoever** (anomaly 2). Starting at work, at least five catalogued routes should have logged anchor attempts within seconds; total silence from the matcher on a ride that starts on its home turf isn't a quiet ride, it's an absent subsystem. Meanwhile the recorder itself never blinked: 227 points at one per second, clean track, clean END. Your "the app crashed" is thus more precisely "the map view crashed" — the session outlived it, which is exactly the separation you'd want, minus the diagnostics it took down with it.

One small thing the file adds to your account: the ride is short and unremarkable as riding — a 1.3 km hop north-east of work, no stops en route. As a future route it's barely two gates long; worth deciding whether work→new-destination is meant to become a catalogued way or stays a free hop.

### Ride 3 (19:41, new destination → home — second crash ride, and the day's most interesting file)

**The numbers:** 6.69 km in 18 min 15 s button-to-button, ~24 s standing at the start then nonstop to the door, average 22.4 km/h moving, honest sustained max 29.8 km/h in the opening stretch at 50.868262, 4.688079 ([map](https://maps.google.com/?q=50.868262,4.688079)), median accuracy 3.8 m, ~27 m smoothed climbing, one app-flagged elevation outlier (−4.6 m at 19:44:59). Starts 6 m from ride 2's end; ends at 50.836480, 4.638188 ([map](https://maps.google.com/?q=50.836480,4.638188)) — home, 4 m from ride 1's start.

**The shape of the ride:** a 1.22 km prologue from the new destination back to the work area, then the morning road ridden in reverse, home. Against ride 1's track the shared portion sits at a median separation of 9 m — same road, opposite direction — with the prologue accounting for essentially all of the divergence (80% of ride 3's points are within 40 m of ride 1's track).

**And here is the day's best data point: the map was dead, and the gate engine caught everything anyway.**

| gate | local time | ridden km | % of track | where |
|---|---|---|---|---|
| START | 19:45:22 | 1.22 | 18.2% | 50.863309, 4.684773 ([map](https://maps.google.com/?q=50.863309,4.684773)) |
| G1 | 19:48:53 | 2.55 | 38.1% | 50.858029, 4.668807 ([map](https://maps.google.com/?q=50.858029,4.668807)) |
| G2 | 19:52:48 | 4.10 | 61.3% | 50.851499, 4.662655 ([map](https://maps.google.com/?q=50.851499,4.662655)) |
| G3 | 19:55:29 | 5.15 | 77.0% | 50.844834, 4.652953 ([map](https://maps.google.com/?q=50.844834,4.652953)) |
| FINISH | 19:59:10 | 6.51 | 97.4% | 50.836349, 4.640304 ([map](https://maps.google.com/?q=50.836349,4.640304)) |

All five `estimated="false"` — real crossings, evenly spaced along the post-prologue route. The START gate fires 3 min 49 s into the ride, right as you reach the work area (103 m from ride 1's FINISH gate) — i.e. this is an evening work→home gate set, picked up mid-track exactly the way the engine is designed to (progress counts from where you join the line, as established on the 19th). Sector times: **3:31 / 3:55 / 2:41 / 3:41**, START→FINISH 13:48. Ride 1's morning run over the same road took 14:24 gate-to-gate the other way — your first same-day, both-directions gated comparison, courtesy of a ride you thought wasn't being followed at all.

But — anomaly 1 — the file simultaneously claims `routeLock="none"` and carries no diagnostics. So the session block says "I never locked anything" while its own gates block reads out a complete evening-route scorecard. Until the semantics are pinned down in code, treat ride 3's gate record as real but its lock record as unreliable.

---

## Your notes, point by point

### 1. "The app crashed each time … `` ERROR [Error: `id` cannot be changed] ``" — verified

The screenshot is exactly what you describe: a React Native **Render Error** overlay, `` `id` cannot be changed ``, thrown from `useFrozenId.js:12` inside `@maplibre/maplibre-react-native`, surfacing at **`routeMapView.tsx:211`** — with the phone's status bar reading 10:56 on the 25th, so it's the error log reviewed the next morning ("Log 1 of 1"), not a mid-ride capture. The mechanism, from the library's own source shown in the capture: maplibre freezes the `id` prop of a map child on first render and **throws if any later render passes a different id**. Your observation that it happens "on the rides where one of the landmarks was 'new'" fits that mechanism precisely: a landmark or its route rendered once under a provisional identity (a "new"/placeholder id, or an id minted after save) and re-rendered under its real one would trip exactly this check. That's a hypothesis until someone reads `routeMapView.tsx` and the landmark-creation flow side by side — but it's a narrow, checkable one, and the fix shape is standard (stabilize the id: never rebind an existing maplibre source/layer to a new id — remount it under a React `key` instead). Worth knowing: this error class is fatal to the whole map component tree, which is why you lost the map, the blue dot, *and* live GPS following in one blow — one thrown render, everything under it gone.

### 2. "No live map during the ride, no blue dot, no live GPS following me" — consistent, and the files add the consolation

Nothing in a GPX file can show what your screen showed, but everything above corroborates the account: the two rides you report riding blind are precisely the two with amputated session blocks. The consolation the files *can* prove: you lost the view, not the ride. Both crash rides recorded at one fix per second door to door, both ended cleanly from the button menu you pressed blind, and ride 3's gates all fired. When the map dies again before the fix lands, the data says: keep riding, press END at the door, the file will be whole — except, for now, its diagnostics (anomaly 2, which is the part worth fixing urgently precisely so that crash rides stop being the worst-documented ones).

### 3. "Colour the ride behind me yellow, like actual routes" — good idea, and it's the free-ride sibling of an existing one

The 19th's review filed your dotted-ahead / solid-behind proposal for *routes*; this is the same instinct pointed at the *ridden track itself*, and it's actually the simpler half: the recorder already holds every point of the current session in memory, so drawing them as a polyline behind the blue dot needs no route, no lock, no catalog — it works on a free ride to a brand-new destination, which is exactly the situation you were in. Two design notes to carry into it: (a) pick the colour deliberately — you said yellow "similar to how actual routes are," but on a ride *with* a locked route the behind-trail and the route line would then be the same colour where they overlap (which is arguably correct — behind-you is ridden — but it erases the distinction between "the route" and "where I actually went"; the 19th's off-route discussions suggest you'll want to see deviations); (b) it's only useful if the map is alive — on the 24th no trail colour would have saved you, so this lands *after* the crash fix, not instead of it.

### 4. "Just gates positioned on the map which I can catch — the idea of these 'new' features" — the gate-field idea returns, with two new facts in its favour

This is the third appearance of your gates-without-routes instinct (the 19th's point 4 filed it as "gates shared across routes" with an offline-replay-first recommendation, which still stands). What's new today:

- **The crash screenshot accidentally documents that some plumbing already exists**: line 214 of `routeMapView.tsx`, visible in the capture, reads `const gatesOnly = props.gatesOnly ?? fa…` — a `gatesOnly` prop on the map view. I can't see from a screenshot what it does or whether anything sets it, but the concept has evidently reached the code. Worth asking the next code pass to report what `gatesOnly` currently does.
- **Ride 3 is an unplanned proof-of-concept of the data layer**: five gates caught, correctly placed and timed, on a ride with no recorded route lock. Whatever the engine was doing internally, the observable behaviour — "gates positioned in the world that fire as you pass them, no route ceremony" — is the very UX you're asking for. The open questions from the 19th (direction-sensitivity, comparability of times between free-floating gates) are all still open; but "can the engine catch gates without a committed route" now has an empirical yes sitting in a file.

---

## Where you're right, the nuances, and the corrections

- **Right:** the crash is real, reproducible (two for two on "new"-landmark rides), and correctly attributed — your quoted error, the screenshot, and the file evidence all agree; the no-map/no-blue-dot experience is the expected blast radius of that error class; both feature asks (behind-trail, catchable gates) are sound and connect to ideas already in the project's ledger — one of them apparently already half-plumbed.
- **Nuance:** "the app crashed" is more precisely "the map view crashed" — the recording session survived both times, ended cleanly, and lost no track data; what it *did* lose is the diagnostics (and possibly ride 3's lock event), which is a real, fixable regression in GPX+'s crash-worthiness rather than in recording.
- **Corrections:** genuinely none against your notes this time — everything you asserted checks out. The contradictions today are the *files'* own (ride 3's gates-vs-lock, anomaly 1), not yours. Your notes are sparse on the rides themselves (no times, distances, or route intentions), so the ride narratives above are data-only reconstructions — if ride 2's destination or ride 3's intended route differ from what I inferred, that's worth a line in the next notes file.

**Suggested picks, if you want a shortlist:** (1) the crash fix — a code pass on `routeMapView.tsx:211` and the landmark-creation flow to stabilize whatever id changes for "new" landmarks; it's blocking every ride to any newly created destination. (2) Make GPX+ collection crash-proof — move diagnostics/lock-event capture out of the crashable component, so the flight recorder survives the crash it exists to explain; pin the gates-without-lock semantics in the spec while in there. (3) The startup stale-fix cleanup (anomaly 4) — one small fix, three stats healed, now 3-for-3 across ride days. (4) The behind-trail polyline once the map lives again — small, and your best defence against ever riding blind blind. (5) Answer anomaly 3 in your next notes: the name of the landmark at 50.870719, 4.691999, so the record stops calling it "the new destination."

---

*Prepared 2026-08-25 by a research pass over the three GPX+ files (point-by-point timing/geometry analysis plus the full qf: event blocks — buttons, locks, gates, stops, outages, diagnostics), cross-checked against every claim in the corrected qualifire-2026084-notes.md and the crash screenshot, with the 2026-08-19 and 2026-08-23 reviews and notes as precedent. This document replaces the earlier 2026-08-24 review, which was written while the notes file was a duplicate of the 23rd's. App code and project records were not re-read this pass; the crash mechanism and the role of `gatesOnly` are hypotheses from the screenshot's visible source, marked as such. All cited coordinates are recorded track points (gate positions are the nearest track point to each gate's timestamp) with Google Maps links; landmark identities (home / work) are inferred from ride endpoints agreeing across rides to within 4–53 m, not from catalog data; times are local (CEST, UTC+2). Honest maxima are 5-second sustained speeds over points with accuracy < 10 m; single-second GPS spikes (44–92 km/h) were excluded as jitter or outage catch-up.*
