# Questions for Nathan — cycle 9 (sector strip → thin bars)

**Status: all answered 2026-09-16, folded into `BRIEF-sector-strip-bars.md` (see its
"Revision note"). Kept here as the record of the Q&A, not as open blockers anymore.**

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
