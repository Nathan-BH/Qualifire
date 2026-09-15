# QUESTIONS — virgin-cycle7

**Written 2026-09-15 UTC.** Q1 gates a brief; Q2–Q4 are follow-ups that need Nathan's eye or
his product call and do not block the two ready briefs. Answer inline whenever.

## Q1 — Remove the "Red lights" setting and the RED LIGHT – HOLD CLOCK button? (gates `BRIEF-red-light-removal.md`)

My recommendation (README §D): **yes**. The setting has one consumer (whether to draw the
button) and the button changes nothing but its own label — `'auto'`, `'button'` and `'off'`
score a ride identically. Its hint promises an auto-pause that does not exist. Removing it
deletes no behaviour and one false promise; the wall-clock default plus automatic stop
*measurement* already is the "luck counts, no pause" app you describe.

Brief's default: **not executed** until you say so.

Answer (Nathan):  agree to delete it. It costs nothing since it was not a real actionnable toggle.

## Q2 — Does SETTINGS → Timing → *moving* survive the same rule?

Not part of any brief. `moving` drops detected stopped time from the scored lap
(`store/timing.ts` `scoredS()`), which is the one real "pause" the app has, and it is
threaded through every verdict. If "no pause, because ride-to-ride comparability" is the
rule, this opt-in is the thing that contradicts it — but taking it out is a bigger, riskier
change than Q1 (colour model, ranks, RIDES/RESULTS all read `scoredS`) and it is a legitimate
preference for someone who rides a route with a level crossing on it. My lean: keep it as
the opt-in it is, and say so in STATE.md, unless you'd rather the app have exactly one clock.

Brief's default: **untouched**.

Answer (Nathan): I guess this one we could keep. But rename this setting as a luck factor, instead of "Timing". And you can either activate luck (default) or remove it if you want to be paused automatically

## Q3 — Did the phone buzz in hand on DEMO? (earcons)

README §C: the buzz is implemented and on by default (`Vibration.vibrate(70)` on each gate
fire). Please try DEMO in hand past a gate with SETTINGS → Earcons ON.
- Buzzes in hand → the bike is the problem (70 ms is a notification-tick) and the follow-up
  is a stronger pattern, e.g. `[0, 150, 80, 150]`, in `location/index.ts:503`, `DemoScreen.tsx:85`
  and `PreviewScreen.tsx:84`. Five lines; a chore, not a brief, once you say the length.
- Does not buzz in hand → phone model + Android version, and it becomes a bug brief.

Answer (Nathan): I tried it and it does buzz, but it is so short you barely feel it ? maybe it can be a bit longer or like a double buzz ?

## Q4 — Is F1 purple `#9000C8` legible as *text* on the night race surface?

Lines, dots and fills will be fine. Purple numerals/labels on `#0A0A0A` drop from ~5.5:1 to
~2.9:1 contrast. The brief swaps 1:1 as you asked; look at a purple lap time / `P1` chip on
the phone in night mode after it lands. If it reads dim, the fix is a separate lighter
*text* token (F1 does the same — purple fill, white text), not a different purple.

Brief's default: **1:1 swap, judged by eye afterwards**.

Answer (Nathan): purple reads fine in dark mode as well.
