# Qualifire — your three test rides on 2026-08-22, checked against the files

Same approach as the 2026-08-19 review: I read your notes, then pulled the three GPX files apart point by point and cross-checked every claim. The headline this time is different, though: **ride 1 is the first ride ever recorded with GPX+ live, and it mostly passes its first field test with honours** — the session block answered in one glance questions that took a twenty-minute detective story on 2026-08-19. Route lock, gate crossings, stops and button presses are all in the file, timestamped, and every one of them checks out against the raw track to within GPS noise. The one thing GPX+ got wrong is, unfortunately, the most interesting thing that happened: it claims the relaunch you saw never occurred.

All times below are local (CEST = UTC+2); the raw files store UTC.

---

## Anomalies / needs your attention

1. **The relaunch GPX+ says never happened.** Your notes: "at some point the app closed, dont know why. After relaunch I got the message 'recoverd after relaunch...'". The GPX+ session block for ride 1 says `<qf:relaunches count="0"/>`, and the button log contains exactly two presses: start (11:49:47) and end (12:13:58). Those two statements cannot both be true. The track itself offers one candidate moment: the **only** disturbance in the whole recording is a window from 11:57:03 to 11:57:16 — a 4.5-second recording hole (the only gap in 1,447 otherwise one-per-second points), GPS accuracy degrading from its usual ~3.8 m to 12–18 m, and a 69 m position jump as it recovers — at [50.851124, 4.665888](https://maps.google.com/?q=50.851124,4.665888), about 2.83 km into the ride, half a minute after G2. Two readings fit the data: (a) that window *is* the relaunch, the recorder survived almost intact, and the relaunch counter failed to increment — likely because recovery rebuilds session state without carrying the count over; or (b) that window is a mundane GPS obstruction (check the map link — if there's an underpass or heavy cover there, that's the answer) and the relaunch left **no trace at all**, which would be worse. Either way the counter failed its very first real test, on the very question GPX+ was built to answer. Worth a look at the recovery code path before the next test ride — and note that whatever "recovered after relaunch" triggers in the UI clearly knows about the relaunch, so the information exists in the app and simply never reaches the event log.
2. **Ride 3's UI claims are untestable in the file.** Your gate-colouring, sector-lag and end-gate observations from ride 3 are recorded below as testimony, but rides 2 and 3 were ridden on the preview build, which exports plain GPX — no event log, no gate timestamps, nothing to check them against. (Ride 1 does independently corroborate one of them; see the end-gate measurement below.) This is not a conflict, just a boundary: those three observations stay unverified until the preview/standalone build gets the GPX+ export too.

---

## The three rides — what the GPX files actually show

### Ride 1 (11:49, home → work → station, dev build "Qualifire" with GPX+)

**The numbers:** 8.70 km in 24.2 minutes elapsed, start [50.836429, 4.638466](https://maps.google.com/?q=50.836429,4.638466) (home) to end [50.881138, 4.715079](https://maps.google.com/?q=50.881138,4.715079) (the station — 38 m from where ride 2 starts). Average moving speed 23.0 km/h, max sustained ~35 km/h. GPS quality excellent: median accuracy 3.8 m, 90th percentile 3.9 m — only 22 of 1,447 points worse than 10 m, all inside two short windows (the 11:57 disturbance above, and a harmless 14-second stretch at ~10.4 m around 12:05:35).

**The GPX+ session block, field by field, verified against the raw track:**

- `startPressedAt` 11:49:47.478, `firstFixAt` 11:49:47.236 — `firstFixDelayS` is **−0.242**: the first fix is a quarter-second *older* than the button press. That's the cached-fix-at-startup behaviour again, here so fresh it's harmless — but the negative sign is the same phenomenon that produced 2026-08-19's phantom 18-minute "gap", and ride 2 below shows it biting again. A one-line filter (drop fixes older than the START press) would retire it for good.
- `routeLock track="Morning" atChainageM=791.7 atT=11:51:59` — **the chainage claim is measured-true**: integrating the raw track point by point puts you at 798 m when the lock fired, a 6 m agreement, at [50.840630, 4.645796](https://maps.google.com/?q=50.840630,4.645796). This is the auto-switch your notes describe (you had set home>>station preferred; the engine locked the home>>work Morning route instead) — more under point 1 below.
- **Gates — all five crossings logged, all `estimated="false"`, and every timestamp lands exactly on the track:**

  | Gate | Local time | Ride distance | % of FINISH chainage | Position | Sector time |
  |---|---|---|---|---|---|
  | START | 11:50:18.9 | 162 m | 3% | [50.836374, 4.640380](https://maps.google.com/?q=50.836374,4.640380) | — |
  | G1 | 11:53:17.8 | 1,326 m | 24% | [50.843430, 4.651310](https://maps.google.com/?q=50.843430,4.651310) | 2:58.9 |
  | G2 | 11:56:39.3 | 2,677 m | 48% | [50.851138, 4.663999](https://maps.google.com/?q=50.851138,4.663999) | 3:21.5 |
  | G3 | 12:00:36.7 | 4,247 m | 77% | [50.858783, 4.670454](https://maps.google.com/?q=50.858783,4.670454) | 3:57.4 |
  | FINISH | 12:03:59.2 | 5,536 m | 100% | [50.863600, 4.686142](https://maps.google.com/?q=50.863600,4.686142) | 3:22.5 |

  START→FINISH: **13:40.3**. (Distances are metres ridden along your actual track, so the route's own chainage will differ by a hair; percentages are of the ridden distance at FINISH — your G1-24%;G2-48%;G3-77% notation, used here deliberately.) One quirk worth knowing: the START gate is timestamped 1 minute 40 *before* the route locked. So either candidates fire gates pre-lock, or — more likely — the engine backfilled the crossing from track history the moment Morning won. Either way the timestamp is the true crossing time, which is exactly the right behaviour, but "a gate can be logged retroactively yet flagged `estimated=false`" is worth a sentence in the GPX+ spec so a future reader doesn't call it a bug.
- `stops`: 12:07:04→12:08:22 (78 s) and 12:08:40→12:08:44 (4 s). The raw track agrees: one stationary cluster of ~83 s at [50.868561, 4.698219](https://maps.google.com/?q=50.868561,4.698219), 6.73 km in — a traffic light on the work→station leg (see ride 2 for why I'm confident it's a light). Both logged stops fall *after* FINISH, and the track confirms there were zero stops of even 20 s during the scored ride — a genuinely non-stop run. The 4-second entry shows the stop detector's threshold is very low; fine to log, but anything consuming this field should filter.
- `storageErrors count=0`, `appVersion 0.1.0` — and the `buttons` block exists at all, which is the 2026-08-19 review's "log every button press verbatim" addition, shipped. It worked; it just needs the relaunch event added to what it captures (anomaly 1).

**The frozen-result problem, quantified.** FINISH fired at 12:03:59, 149 m short of the work landmark — and you then rode **3.16 km more over just under 10 minutes** to the station with the UI frozen on your result. The important finding: the freeze is presentation-only. The recorder kept its one-per-second cadence the whole way, and the GPX+ stop tracker kept working too (both logged stops are from this post-FINISH stretch). So your proposed fix — don't show result/ranking until END is pressed, keep the live map and counter running — costs nothing at the data layer; it's purely a screen-flow change.

### Ride 2 (17:38, station → work, preview build, no GPX+)

2.99 km, station [50.881472, 4.715177](https://maps.google.com/?q=50.881472,4.715177) to work [50.863405, 4.688238](https://maps.google.com/?q=50.863405,4.688238), ~8.8 minutes of actual riding, average moving 22.8 km/h. No sectors logged — matching your note, and the file matches too: it contains no `qf:` namespace at all, confirming the preview build simply has no GPX+ export.

**The phantom first minute.** The file's first point is timestamped 17:38:24, but the session's internal name is `20260822-173914` — START was pressed at **17:39:14**. The single 17:38:24 point sits 56 m off to the side, is followed by a 49.6-second hole, and produces a fake 93 km/h "jump" when the real stream begins. This is the same stale-cached-fix-at-startup pattern diagnosed on 2026-08-19's ride 1 (and it's again why the file is *named* 1738: the export names files after the earliest point). Your notes say "ride 2 at 17:38" — per the session log you actually started at 17:39; the file name misled you by a minute. Same one-line filter as ride 1's negative `firstFixDelayS` fixes all three sightings of this bug.

**The traffic light, confirmed by repetition.** Two stops: 37 s at [50.868781, 4.698958](https://maps.google.com/?q=50.868781,4.698958) then, after rolling 40 m forward, 28 s at [50.868557, 4.698680](https://maps.google.com/?q=50.868557,4.698680) — i.e. queueing at a signal. This is within ~60 m of ride 1's only stop, from the opposite direction, five hours apart. Two rides, same day, same spot, both stopped: that's the "stop at a known signal = luck" case the OSM traffic-signal extraction item (B-33) was designed for, now with a measured example on the station leg — a leg that will matter once station routes go live.

### Ride 3 (21:40, work → home, preview build, no GPX+)

5.92 km in 15.0 minutes, start [50.863391, 4.688156](https://maps.google.com/?q=50.863391,4.688156) (6 m from the work landmark) to end [50.836605, 4.638296](https://maps.google.com/?q=50.836605,4.638296) (23 m from home). Average 23.7 km/h with **zero stops of even 20 seconds** — your "everything smoothly" is what a flawless run looks like in the data too. Recording is clean one-per-second after a ~7-second warm-up, and unlike ride 2 the session name (214026) and first point (21:40:22) agree — no stale fix this time.

One geometric fact worth having on record: this evening track and ride 1's morning home→work leg are **almost entirely different roads** — 94% of tonight's points lie more than 120 m from the morning track (the evening route also climbs ~10 m higher, topping out at ~94 m elevation vs the morning's ~83 m). So "morning dry" and "evening B" are genuinely two routes, not one road ridden twice; nothing here should ever be cross-compared between them.

Your three observations on this ride — G2's circle staying black after the purple sector while G3's turned green, sector logging lagging the crossing, and the end gate sitting too far from the real ride end — are exactly the kind of thing the file *cannot* confirm, because the preview build logs no events (anomaly 2). But the end-gate complaint gets independent support from the morning data: ride 1's FINISH measurably fired **149 m before** the work landmark. So "gates sit noticeably short of the real endpoints" is now a measured pattern on the morning side, not just a night-time impression — and it strengthens the case for the pick-your-own-gate-positions work you're expecting from cycle024.

---

## Your points, checked

### 1. "I set home>>station but it switched me to the home>>work morning dry route"

**The override is real and precisely logged:** lock onto `Morning` at 791.7 m chainage, 11:51:59, 2 minutes 12 seconds after START — the first GPX+ file has already earned its keep, because on 2026-08-19 this sentence would have been a reconstruction. What the file *also* shows: after the override, the ride matched Morning perfectly — all four sectors scored with clean, plausible times, FINISH fired at work, and only then did you continue to the station. So the detector locked a route whose line you genuinely were riding along; the problem is not a false match but that **auto-detection outranked your explicit manual selection**. That's a policy question, not a geometry bug: when you've picked a route by hand, should the engine be allowed to switch, and if so should it at least ask? Your notes park this on the already-agreed cycle024 fix — I can't verify what cycle024 contains from the ride data, so trust your record there; just make sure the fix addresses the *ranking* (manual pick beats auto-lock), not only the route-availability question. One thing to check when it lands: whether home>>station and Morning share their first ~800 m — if they do, the lock at 792 m is the earliest the engine could even have told them apart, which bounds how much any detector tweak alone can help.

### 2. "Never stop the live map and counter when the route is finished"

**Agreed, and the data shows the fix is cheap.** The recorder demonstrably doesn't stop at FINISH — you have 3.16 km of perfectly recorded post-FINISH riding and two GPX+-logged stops to prove it. Everything you lost (live dot, live counter) was thrown away by the results screen, not by the engine. Your refinement — hold results and ranking until END is pressed — is the right shape, and it also fits the honesty principle: END is the rider saying "the ride is over"; FINISH is just a gate. One design note for whoever builds it: the ranking still becomes *known* at FINISH, so decide explicitly whether a subtle "finished — result ready" hint is shown while the map stays live, or nothing at all until END.

### 3. "Interesting to see if the gpx+ data is able to see what happened there" (the crash)

The honest answer: **GPX+ half-saw it, and what it recorded is wrong** — `relaunches count="0"` against your eyewitness "recovered after relaunch" message. Full write-up in the anomalies section at the top. The constructive framing: this is precisely the kind of bug that only a real crash on a real ride could expose, the recovery path clearly works (at most 4.5 seconds of track lost, possibly zero), and the fix is contained — make the relaunch-recovery path increment the counter and, ideally, drop a timestamped `relaunch` event into the buttons/events log so the *when* is captured, not just a count. Until then, treat `relaunches` as untrustworthy-when-zero.

### 4. The "me" dot must not be blue — use a palette colour (for cycle024)

Noted as a standing instruction; nothing in the GPX data bears on it. It amends the 2026-08-19 review's suggestion of "a distinct rider colour" with a constraint that colour must come from the brand palette — the two compose cleanly (pick the palette colour with the best contrast against the yellow route line and both map themes, rather than any new colour). Flagging it here so it's on the record ahead of cycle024, as you asked.

### 5. Gate circles colouring inconsistently (purple sector left G2 black; G3 turned green)

Recorded, unverifiable from the file (preview build, no event log — anomaly 2). Two things worth carrying: first, this smells like a rendering/state-update bug rather than a scoring bug — your sector times still appeared, so the engine scored; the circle just didn't repaint. Second, the 2026-08-19 review already flagged this exact UI area (near-invisible uncoloured gate rings at night, with an agreed redesign: line-across-the-route markers in a dim theme-aware colour). If that redesign is in cycle024, the inconsistent repaint may vanish with the circles themselves — worth *not* fixing the circle bug separately if the circles are about to die. Test again on the first post-cycle024 night ride.

### 6. "Sector logging is really behind sometimes, should be more instant"

Recorded, and here GPX+ has something to say: in ride 1's file, gate timestamps are the *true crossing times* (they land exactly on the track), even though at least the START gate must have been written retroactively at lock. So the engine's timekeeping is instant even when its *reporting* is late — meaning your lap times are safe, and the lag you saw is in the UI update path. That's good news (no timing debt) but also means the fix is again presentation-layer. When the preview build gets GPX+, the gap between a gate's logged time and when its sector appeared on screen would become directly measurable — worth adding "UI-acknowledged at" to the gate event if you want to hunt this properly.

### 7. "The end gate is too far away from the real ride end"

**Now measured, not just felt:** the morning FINISH sits 149 m short of the work landmark ([50.863600, 4.686142](https://maps.google.com/?q=50.863600,4.686142) vs work at [50.863405, 4.688238](https://maps.google.com/?q=50.863405,4.688238)). You made this complaint about the evening route; the data shows the morning route has the same disease. Your expectation that cycle024's choose-your-own-gate-positions work fixes it is the right destination — and note the 2026-08-19 review's caution still applies: moving a START or FINISH gate breaks lap-history comparability (gate-set versioning already prices this), so relocate end gates *once, deliberately*, ideally when the reference lines are re-ratified, not incrementally.

---

## Where you're right, the nuances, and the corrections

- **Right:** the route override happened exactly as you described and is now logged evidence, not memory; the frozen results screen hides a recorder that's working fine — your keep-it-live-until-END proposal is cheap and correct; the end-gate offset is real and now has a number on it (149 m, morning side); no sectors on ride 2 is expected behaviour, confirmed; the preview-vs-dev build split in your notes header matches the files exactly (ride 1 has the full GPX+ block, rides 2–3 have no extensions at all).
- **Nuance:** the ride-1 route switch is best read as a *precedence* bug (auto-lock beat your manual pick) rather than a detection bug — the lock itself was geometrically sound; the gate-colour inconsistency may be mooted by the already-agreed circle→line marker redesign, so check before double-fixing; sector lag appears to be display-only — the underlying timestamps are exact, so no recorded times need distrust.
- **Corrections:** ride 2 started at 17:39:14, not 17:38 — the file name (and its first point) come from a stale cached GPS fix, the third sighting of that startup bug, which also manufactured a fake 93 km/h speed spike; and the crash you reported is *contradicted* by the file's `relaunches count="0"` — your memory and the app's on-screen message outrank the counter here, which means the counter is the thing that's broken.

**Suggested picks, if you want a shortlist:** (1) fix the relaunch counter and add a timestamped relaunch event — GPX+'s first field failure, small fix, big trust payoff; (2) the startup fix-filter (drop any fix older than the START press) — retires the phantom-first-point bug seen on three rides across two days; (3) fold the results-screen-freeze fix (live map/counter until END) into cycle024 alongside the gate-position and dot-colour work already headed there; (4) when the preview/standalone build next rebuilds, include the GPX+ export — rides 2 and 3 generated four honest observations today that all died with the session for want of an event log.

---

*Prepared 2026-08-25 by a research pass over the three GPX files of 2026-08-22 (point-by-point timing, geometry, accuracy and stop analysis; GPX+ session block cross-verified against the raw track), checked against every claim in qualifire-20260822-notes.md, with the 2026-08-19 review and notes used for continuity. The app code and project records were not available to this pass; statements about backlog items and prior decisions are carried over from the 2026-08-19 review.*
