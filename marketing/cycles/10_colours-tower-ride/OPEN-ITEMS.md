> 2026-09-26: some paths below moved in the studio-folders restructure — see
../24_studio-folders-restructure/README.md, section "Path map".

# Cycle 10 — open items for Nathan

## Done (2026-09-16, after Nathan ran the render himself)

Nathan ran `render.ps1 -Name colours -Render` on his PC. With the shell back up,
the rest of the moving steps were completed directly (mechanical, no subagent):

- Output `colours_2026-09-16_23-31-30.mp4` (946,107 bytes) confirmed via `ffprobe`:
  **19.000s, 1920x1080, 30fps** — exact match to plan.
- Copied to `colours\rounds\v3\colours_v3.mp4` and `all-renders\colours_v3.mp4`.
- Superseded `all-renders\colours_v2.mp4` moved (not deleted) to
  `Qualifire\_to_delete\colours_v2_superseded_by_v3.mp4`.
- `colours\README.md` v3 row and `colours\rounds\v3\FEEDBACK.md` updated from
  "not yet rendered" to rendered/verified.
- Checked the current teaser assembly (`teaser\rounds\v8\concat.txt`): it does
  **not** currently include `colours/` at all (opening, start-ride, gates-saving,
  ranking, closing only) — `parts\05-colours\` is marked superseded since
  2026-09-10 and was never re-integrated after the composition was rebuilt from
  60s down to 19s. That's pre-existing and unrelated to this cycle, not something
  this cycle's brief asked for — flagging it below as a possible follow-up, not
  fixing it now.
- **Not touched:** `audio-studio\colours\` and `audio-studio\all-renders\colours_v2_with_sound_v1.mp4`.
  There's no v3 soundtrack yet, so the old with-sound v2 file was left in place
  rather than removed (removing it would leave zero "with sound" version). A new
  soundtrack pass for v3 is a separate follow-up (like the teaser's with-audio
  retiming in past cycles), not a mechanical copy step.

## Leave feedback

`silent-studio\colours\rounds\v3\FEEDBACK.md` has a "What to check" list (ride entry,
step-down cascade readability, row-10 drop-off, colour pop on landing, time-label swap,
final-frame tower fullness, day-theme legibility, no caption overlap) and a "Nathan's
feedback" placeholder section — put your notes there once you've watched it.

## Judgment calls made this cycle (for your awareness, not blocking)

- **Slot mapping P7 -> P3 -> P1** used literally (you gave this as "for example" —
  if you'd rather different ranks, or a different number of total slots, say so and
  it's a small follow-up, not a rebuild).
- **Other tower rows are blank rules, no borrowed flavour dates** from `ranking/`
  ("Mon", "3 Sep", etc.) — those are specific to a real-route product scene; a generic
  explainer showing invented dates would read as more literal/real than intended.
- **Illustrative time label kept from v2** (42.7 -> 39.4 -> 37.1), now shown as three
  stacked labels that swap at each beat's departure rather than tweening the digits.

## Pre-existing, not from this cycle (flagged by the inspector)

`colours/README.md`'s v2 row still says "Not rendered yet" even though
`colours/rounds/v2/colours_v2.mp4` exists on disk (Sep 10). Left untouched since it's
unrelated to the v3 work — worth a one-line fix whenever convenient, but not urgent.

## Cleanup

None needed — nothing was superseded/deleted this cycle (`ranking/` wasn't touched;
one stray scratch backup the executor created was moved to `safe_to_delete\`, not
`_to_delete\` — same holding-folder convention, different name already in use in this
repo; no action needed from you unless you want to consolidate the two holding folders
into one name).
