# Questions for Nathan — cycle 9 (sector strip → thin bars)

**Status: all five questions answered 2026-09-16. Q1-Q4 folded into
`BRIEF-sector-strip-bars.md` (see its "Revision note"). Q5 (added later the same day, for the
marketing sub-task) was answered the same day and OVERRULED the brief's default — Nathan's
answer and his four extra feedback items are folded into the revised
`BRIEF-marketing-sector-update.md`. Kept as the record of that Q&A.**

## Ready to execute — no answer needed (unchanged from the first draft)

- Replacing the four boxes with label + bar per sector, both grey until the sector is
  completed with a real tier, then both in the tier colour.
- Estimated sectors ("S1 ~") stay grey; interrupted sectors ("S1 ‖") colour normally.
- Completed sector times no longer shown in the strip (they remain on the ride-detail
  screen).
- Map/route line: already done — `sectorColours` defaults off, toggle in Settings
  (`54aae2d`).

## Questions and answers

1. **Bar thickness.** Your mockup is 4px and that's what the brief uses (a single constant,
   `STRIP_BAR_HEIGHT`). On a phone, glanced at while riding, 4px is close to a hairline; 5 or
   6 may read better. Once you've seen it on the device: keep 4, or pick a number?

   **Answer:** Agree lets see it on device first, but if you already think 4px is too small, you can already ship it a bit bigger on the first try. Also think about how wide each bar should be and what the total strip width is in relation to the other UI elements. I just drew the strip manually in the svg without consideration.

   → Folded in: `STRIP_BAR_HEIGHT` shipped at 6 (up from 4), with a comment inviting a
   further on-device retune. Execute is asked to sanity-check the strip's overall width and
   inset against the rest of the screen rather than copy the mockup's raw pixel geometry.

2. **Completed sector times.** Dropped from the strip per your drawing. Do you want them
   back anywhere on the live screen — e.g. the status line showing the last completed
   sector's time for a few seconds — or is the ride-detail screen enough?

   **Answer:** I think currently the "content_pane_clock" shows the last completed
   sector's time for a few seconds? that is enough for me.

   → Confirmed: that's the existing gate-flash over the clock (`liveView.tsx`'s
   `BigChipModel`/flash mechanism), untouched by this brief. No new display needed.

3. **Current-sector cue.** Default is the brightened label only. Do you want more (a subtle
   dot under the bar, a lighter grey bar), less (no cue at all, since the line above the
   clock already names it), or is the default right?

   **Answer:** I would not have any current sector cue. Since they are all grey and will
   turn the correct colour upon completion you already know which sector you are in, so I
   do not want the brightened-label default either. I think what we can do is just update
   the sector in the "content_pane_context" — this keeps the distraction minimal.

   → Folded in: the brief's original "brightened label" default is REMOVED. The current
   sector now renders identically to a not-yet-reached sector — no cue at all in the strip.
   Confirmed separately: `content_pane_context` (`LiveViewModel.contextLabel`, the small
   "S3"-style line above the clock) already updates to the current sector today — no code
   change needed there, it already does what you're asking for.

4. **Discrete vs progressive fill — later.** The bar flips colour on completion. A true
   F1-style bar that fills as you ride through the sector would need the engine to expose
   in-sector progress, which it doesn't today; it's a real feature, not a tweak. Is that
   something you want queued as a future item, or is discrete the end state?

   **Answer:** No I do not want a progressive fill, just flip upon completion.

   → Confirmed as the end state, not a stepping stone. Not queued anywhere as a future item.

## Q5, 2026-09-16 — marketing scenes (`BRIEF-marketing-sector-update.md`) — ANSWERED

Was framed as non-blocking ("Execute proceeds on the default below"); Nathan answered before
Execute ran and rejected the default (keep the painted route, no strip, only the thickening
goes, ticks white). The brief was rewritten accordingly the same day — its old Task 1/Task 2
no longer exist. His answer, and the four extra items he added for the same remake pass, are
kept verbatim below.

5. **Route-line colouring in the marketing scenes.** The app's new default is a plain yellow
   line with the tiers shown only in the thin-bar strip (sector-coloured lines are now an
   opt-in). Today `gates-saving` paints each sector of the route in its tier colour as the
   rider crosses the gate (and, unnoticed until now, thickens the line 6→9px doing it — the
   same effect you had removed from the app), and `ranking` opens on the fully painted route
   under its dim. The DEMO screen in-app still shows sector colours regardless of the toggle,
   so there's a case for treating these showcase renders the same way.

   **Default the brief instructs:** follow the new default — (a) the route stays plain yellow
   in both scenes, and gates-saving gets the app's real strip (S1-S4 label + thin bar, 2x the
   app's values, above the caption) that flips slot by slot as the gates are crossed; ranking
   just drops the painted backdrop. (b) The little gate ticks still recolour on crossing as
   they do today — that's not app behaviour (real ticks stay white) but it's a 44px tick, not
   the line, and it links the map instant to the strip flip; kept because removing it wasn't
   asked. (c) The strip fades out with the last caption so gates-saving's final frame still
   matches ranking's first frame (the existing match-cut) — no strip in ranking.

   Alternatives if you disagree: keep the painted route in the marketing scenes as the
   showcase moment (with or without the strip on top — with both, note that's the "too much
   colour" you named); or drop the gate-tick recolour too so the strip is the only tier cue.
   Which do you want — the default, or one of these?

   **Answer:** for the renders I would actually keep the race line colouring when you cross it (so do not change it to yellow all along). And I would not add the strips, as for the video it would not read nice. So the only update really needed to the renders is removing the line thickening. And also remove the gates themselves being coloured, it was never a feature I wanted but I never corrected it. So I would just keep the gates white all along

While you are remaking the video renders, I have other feedback you can fold in:
- for the ranking render. 1) the ride that gets added at position2 should be coloured green not purple since it is a P2 not a P1. 2) I would make go up fast and then slow down as it gets to its correct position (I think now it is constant speed) while the total time it takes should be the same as now.
-I would remove the "compare directly against your previous ride". And just keep the "compare against yourselfs" line
- I would also update the current closing render. I would just use the second part of the opening render (so not the logo drawing, but only the qualifier text + the slogan beneath it)
