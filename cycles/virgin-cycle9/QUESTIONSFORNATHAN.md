# Questions for Nathan — cycle 9 (sector strip → thin bars)

The strip redesign is fully briefed (`BRIEF-sector-strip-bars.md`) with engineering defaults
for every open point, so it can be executed and put on your phone before you answer anything
below. The questions are the taste calls where a default was picked that you may want to
overrule once you've seen it running; answers can arrive after the first build, and any
change is a one-line follow-up, not a re-brief.

## Ready to execute now — no answer needed

- Replacing the four boxes with label + 4px bar per sector, both grey until the sector is
  completed with a real tier, then both in the tier colour.
- Estimated sectors ("S1 ~") stay grey; interrupted sectors ("S1 ‖") colour normally.
- Current sector: label goes from dim grey to normal text colour, bar stays grey, no accent
  colour used (accent and the yellow tier are the same hex now, so an accent bar would be
  confusable with a completed yellow sector).
- Completed sector times no longer shown in the strip (they remain on the ride-detail
  screen).
- Map/route line: already done — `sectorColours` defaults off, toggle in Settings
  (`54aae2d`).

## Open questions

1. **Bar thickness.** Your mockup is 4px and that's what the brief uses (a single constant,
   `STRIP_BAR_HEIGHT`). On a phone, glanced at while riding, 4px is close to a hairline; 5 or
   6 may read better. Once you've seen it on the device: keep 4, or pick a number?

   **Answer:**

2. **Completed sector times.** Dropped from the strip per your drawing. Do you want them
   back anywhere on the live screen — e.g. the status line showing the last completed
   sector's time for a few seconds — or is the ride-detail screen enough?

   **Answer:**

3. **Current-sector cue.** Default is the brightened label only. Do you want more (a subtle
   dot under the bar, a lighter grey bar), less (no cue at all, since the line above the
   clock already names it), or is the default right?

   **Answer:**

4. **Discrete vs progressive fill — later.** The bar flips colour on completion. A true
   F1-style bar that fills as you ride through the sector would need the engine to expose
   in-sector progress, which it doesn't today; it's a real feature, not a tweak. Is that
   something you want queued as a future item, or is discrete the end state?

   **Answer:**
