# teaser — round v8 (built, confirmed)

**Built and confirmed** (2026-09-16): `teaser_v8.mp4` exists; ffprobe reads 47.600000s,
matching the five-part sum exactly and unchanged from v7 (ranking's total duration
didn't change — only its internal colour timing did).

## What changed since v7

Only one ingredient swapped: `ranking_v6.mp4` -> `ranking_v7.mp4`. Today's row now
comes up white during the 0-5.4s climb and flips to green only on landing in slot 2,
instead of being green from the start. See `../../ranking/rounds/v7/FEEDBACK.md` for
the full verification of that change. Opening, start-ride, gates-saving, and closing
are all unchanged from v7.

## Recipe

`concat.txt` in this folder, stream-copy concat (no re-encode) since all five source
files share identical codec/resolution/framerate (h264, 1920x1080, 30fps).

## Known gaps (unchanged from v7)

- No with-sound version of the full teaser exists — only per-scene with-sound files
  (`audio-studio/all-renders/`). A combined mix would be a separate follow-up if/when
  Nathan wants one.
- `brandmark/closing`'s audio-studio pairing has not been rebuilt for its new content
  (it changed from a mark-draw to reusing the opening's wordmark+tagline beat) — the
  visual is confirmed but no audio has been composed for it yet.
