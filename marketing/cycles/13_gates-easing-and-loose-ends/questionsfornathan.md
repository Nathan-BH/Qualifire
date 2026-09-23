# Questions for Nathan — cycle 13

Each has the default the briefs already assume, so execution is not blocked on an
answer; an answer just changes whether a brief gets executed, or which variant.

**Q1 — Did the fast first leg of gates-saving v7 actually read as jarring?** Round 7
made the rider cover 24 % of the route in 0.52 s (about 3x the old pace) to hit the
melody's first E5, then drop to less than half that speed at gate 1 — and both
`silent-studio/gates-saving/rounds/v7/FEEDBACK.md` and
`audio-studio/gates-saving/soundv8/FEEDBACK.md` say the full-speed feel "hasn't been
watched yet." Nobody has confirmed either way. Two sub-points:
- If it felt *exciting* rather than abrupt, `BRIEF-gates-warp-easing.md` can simply
  not be executed — nothing else depends on it.
- If the problem is the leg-1 *pace itself* (not the jolt at gate 1), easing cannot fix
  that: the crossing times are pinned to the music, so leg 1 must average 0.52 s. The
  fix for *that* would be a later ride start (`RIDE_T0`) or moving the first anchor,
  which means a new audio round — say so and it becomes a separate brief.
*Default if unanswered:* execute the easing brief anyway. It is video-only, reversible
(one function), keeps every gate time to the millisecond, and leaving a hard speed
discontinuity in is not obviously the better choice.

*Answer: I think the first leg read pretty smoothly although it is fast, so no real rendering issue there. I do not think this needs much further consideration as this render will be updated in this cycle by either changing the ride itself or adapting the speed further to match the audio.

*Extra,

**Q2 — start-ride v4 and brandmark/opening v3: do you consider those rounds reviewed?**
The Digest reported both renders as still owed (their FEEDBACK.md files say "not
rendered yet — device_bash was unreachable this session"), but on disk both mp4s exist
from 2026-09-10 and are already mirrored into both `all-renders/` folders. So the only
thing wrong is two stale status lines — no render is needed. What is *not* recorded
anywhere is whether you actually watched them and are happy (their "Nathan's feedback"
sections are empty).
*Default if unanswered:* treated as reviewed-by-silence; no brief; the two stale
lines get fixed directly by the coordinator (informational note below). `COMMANDS.md`
lists the two-line `ffprobe` check only in case you want to confirm the files play.

*Answer: yes change the stale line, they can be considered reviewed.

**Q3 — Colours cosmetic polish now, or after you've looked at v4?** Cycle 11 left the
"avg" label (outside the card's right edge) and the dashed line (10 px past the border)
alone on purpose — "worth a glance on the actual render, not fixed pre-emptively."
`colours_v4.mp4` has existed since 2026-09-17; if you have looked and it reads as
intentional, skip the brief.
*Default if unanswered:* execute `BRIEF-colours-cosmetic-polish.md` — it is two CSS
declarations, fully scoped by cycle 11, and cheap to revert.

*Answer: I think it looks good now with the dashed line in place and the avg label past the border, leave it as is.

**Q4 — Where should the "avg" label live once it's inside the card?** The brief's
default puts it *on* the dashed line, left of the time-number column, with a
card-coloured background so the dashes break around it (the classic "label on a
rule" look). The alternative is to keep v4's outboard-pointer idea but make it clean:
label outside the card, and the dashed line extended to *touch* the label instead of
stopping 16 px short of it (that is `#avg { right: -68px }` with the label left where
it is — one number). A third option, label floating just *above* the line in the
empty middle of the row with no background, is also one line and is spelled out in
the brief as alternative B.
*Default if unanswered:* on the line, knocked out (alternative A in the brief).

*Answer: keep as it is now
---

## Informational — no question, no action needed from you

Doc-staleness the Digest turned up. Each is one or two lines, under the ~10-line
chore threshold, so the coordinator fixes them directly (no brief):

1. `audio-studio/gates-saving/soundv8/FEEDBACK.md` opens with "**Audio only, for now** …
   No muxed render yet" although `gates-saving_v7_with_sound_v8.mp4` sits in that same
   folder and is the current pick per cycle 12's README and
   `silent-studio/gates-saving/rounds/v7/FEEDBACK.md`.
2. `silent-studio/start-ride/rounds/v4/FEEDBACK.md` line 3 and
   `silent-studio/brandmark/opening/rounds/v3/FEEDBACK.md` line 3 both say "not rendered
   yet — device_bash was unreachable this session"; the renders exist (2026-09-10). Also
   `brandmark/opening/README.md`'s v2 row still says "Not rendered yet" (same pattern as
   the `colours/README.md` v2 nit cycle 10 logged).
3. `silent-studio/all-renders/gates-saving_v6.mp4` and
   `audio-studio/all-renders/gates-saving_v6_with_sound_v3.mp4` are one round behind
   the current pick (v7 silent, v7 + sound v8 muxed). Copy commands are in
   `COMMANDS.md` §1 — this one *is* a Nathan-PC step, since it moves files on the
   mount.
