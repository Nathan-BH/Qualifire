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
