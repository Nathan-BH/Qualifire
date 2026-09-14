# QUESTIONS — virgin-cycle6 (live self-racing)

**Written 2026-09-14 UTC.** None of these blocks execution: the brief rules a default for
each and the executor builds that. They are the calls that are genuinely yours and are
best made **after you have seen the dots on a phone**, not before. Answer inline whenever.

## Q1 — Should the window-best self be visually singled out (purple), or should all selfs look identical?

Brief's default: the fastest self of the window renders purple ("the one to beat"), the
others muted/translucent.

Answer (Nathan, 2026-09-14): I think if possible I would like to have 3 colours. Purple for the fastest, green for the above average and yellow for the below average. However all these dots should be less opaque than the driving blue dot so it stays the main visible one. And if they were to overlap, they blue dot should be "higher" meaning it should be shown in front of any self dot. for the self dots themselves, we can just stack them in position order from 1-9 in terms on which one should be on top of which. Are these three colours feasible ? Does this always make the P1 purple, P2-5 green and p6-P9 yellow or is this not how the average would work but the median ? (anyways it does not change the fact that we should have the dots in front of the average green, and the ones below yellow).

**Ruled 2026-09-14 → `BRIEF-self-racing-followup.md` R5′/R5″/R5‴.** Feasible, and it is the
app's existing rule (`colourModel.ts` `tierFor`): P1 is always purple; green/yellow split at
the window's arithmetic **mean** lap time — not the median and not fixed rank bands, so the
number of greens varies with the spread (one slow outlier makes more dots green; one freak
fast day makes more yellow). Every green is faster than every yellow, always. All selfs at
0.70 opacity (0.35 once finished) under the rider's 1.0; the rider is on top by mount order;
selfs stack P1-on-top via MapLibre `circle-sort-key`. Still yours by eye on the phone: a
yellow dot on the yellow route line (dark casing stroke added for that), and whether P1 on
top was the direction you meant.

## Q2 — Do you want any text at all — a gap readout to the purple self, or an off-screen "ahead/behind" edge marker?

Brief's default: **none**.

Answer (Nathan, 2026-09-14): I would not put any text in terms of selfs. I think just a current position "PX" somewhere is sufficient (maybe just below the openmap if there is some space ? or we have to rethink the race mode configuration ?)

**Ruled 2026-09-14 → follow-up brief R10.** A live `P4` on the pane's context row — the first
row under the map, already there (`S3`), no layout change. It counts how many selfs are
physically further along the route than you right now (engine chainage vs each self's
chainage), appears once you cross START, and hands over to the existing "P3 of 10" chip at
the finish. Ruled a fact (D-028), not a benchmark/delta, so the no-target-near-the-clock
rule stands. No gap text, no edge marker.

## Q3 — When SETTINGS → Timing is on *moving* time, should selfs pause while you are stopped?

Brief's default: **no**.

Answer (Nathan, 2026-09-14): No selfs should never pause if i am paused. I think for this to work people cannot use the pause button, so only clean rides can be used (i think we already have something like this in place anyways: "guessed lap times are not ranked" is something i have seen before. So only clean laps can rank and be used as selfs. I also think in general you dont need to press the pause button and just stop physically and keep the app running, its part of the luck component)

**Ruled 2026-09-14 → follow-up brief R11: nothing to build.** Confirmed: estimated ("guessed")
and missed laps never rank (`results.ts` `ranks()`), so they are never selfs. And PAUSE on the
race screen is not a pause — the recording, the fixes and the clock keep running (it only
logs a button event); a ride where you pressed PAUSE is the same kind of ride as one where
you just stopped. So there is no "paused self" to guard against and selfs keep running on
wall-clock time exactly as you want. Interrupted laps (a real stop) do rank and do race —
the luck component.
