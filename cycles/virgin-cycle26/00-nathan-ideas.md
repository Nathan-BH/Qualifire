# Nathan's ideas — cycle26 (2026-10-07)

> "how to get the app working as well for people that are not going places like AtoB but maybe
> runners on a tour going from HometoHome?"

> "How about if your tour overlaps partially, if you run out of your street and make a tour then
> the beginning and end portions might overlap significantly?"

## Process
- Haiku/Sonnet digesting and note keeping only.
- Fable planning at night, off-peak.

## Open questions (for the brainstorm, not yet decided)
1. Is a Home-to-Home tour one route (start = end landmark), and what does "gates" mean when the
   start and finish are the same place?
2. When the end of the tour retraces the start, how does the app tell "finished" from "just passing
   the start gate again"?
3. Overlapping stretches: do gates / sectors / ghost comparison treat first pass and last pass as
   the same ground or as different sectors?
4. Does the existing `loopDiscriminator` on Route already cover part of this? (see digest 01)

## Nathan's rulings (2026-10-07, 23:37)
1. **No warnings, no blocks, ever.** The app must never warn or tell the rider about a self-overlapping
   tour or a Home-to-Home loop. It just handles it. Riders use the app carefree. (Supersedes the
   Sonnet coordinator's "doesn't warn" wording, which framed it as a gap. It is by design.)
2. **Goal of the cycle:** make sure loop and overlap behaviour is supported properly; make the
   necessary changes where it is not. Fable plans, expected to be solvable cleanly.
3. **Correction:** Home-to-Home is NOT supported today. On the RECORD screen the rider cannot pick
   the same landmark as start and finish place. The digest's "loops are supported" claim only
   covered the store/naming/results side, not this picker. Treat loops as broken at the entry point.

## Nathan's idea (2026-10-08, 00:07): "loop" option in GOING TO
Instead of offering the same landmark as both start and finish, the GOING TO list gets a
"loop" entry (name not final: "loop" or similar). Picking it means "finish where I start".
Not a ruling yet; to be folded into the Fable plan as the proposed picker design.
Points for the planner to weigh: (1) removes the hidden-state path, because the same landmark is
never shown twice; (2) one new rider-facing string, so it needs a ui-strings.allow.json entry;
(3) must still resolve to the existing loop Route for that start landmark, or start a free ride
that becomes one at STOP, without asking the rider anything; (4) no warnings or blocks.

## Nathan's idea (2026-10-08, 00:10): live ride / race display on overlapping sections
How should overlapping sections behave during a live ride or race? Proposal to evaluate: make the
return route and its gates more transparent (faint) while the rider is still on the way "out", to
avoid distraction. Planner notes (Sonnet coordinator, not decided): drive it from the engine's
forward-only chainage (it already knows which pass the rider is on); on the overlapped stretch only
the current pass's gates are bright; return gates brighten when chainage nears them (distance is a
tuning call); dim the return line rather than hide it so a rider who strays can still see it;
tier colours/flashes only for the current pass; no new strings; same behaviour in DEMO and REPLAY
and against a ghost on retraced ground.

## Nathan's rulings (2026-10-08, 00:57)
1. Loop route label: not "Home → Home". Use "Home loop" with any further specifications after it,
   separated by the dot the app already uses (e.g. "Home loop · <spec>").
2. The other plan decisions (05-plan.md) are accepted as sound, to be confirmed on device. Execute
   briefs now and have Opus inspect straight away. Open questions Q1/Q2 stay at their defaults;
   Q3 (pill word) stays `loop`.
