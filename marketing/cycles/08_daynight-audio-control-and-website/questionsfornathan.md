# Questions for Nathan — cycle 08

Each has the default the briefs already assume, so execution is not blocked on an
answer; an answer just changes what gets rendered or built first.

**Q1 — Day pilots.** The day/night brief starts with `gates-saving` (map scene) and
`brandmark/opening` (non-map) to prove the mechanism, then rolls out to the rest on
request. Do you want a different first pair — e.g. `colours` (the text-heavy one where a
light background changes the most), or everything at once?
*Default if unanswered:* the two pilots, then rollout after you've seen them.

**Q2 — Python on your PC.** The single biggest "control" unlock on the audio side is a
`regen.ps1` that runs a scene's `soundtrack.py` + ffmpeg mux locally, so you can nudge a
number and hear it in seconds. It needs Python 3 with `numpy` and `scipy` on your
machine (a `pip install numpy scipy` if Python is already there). Do you have / want
that? If yes, it's a small follow-up brief.
*Default if unanswered:* not built; the beat-sheet convention alone ships.

**Q3 — Day palette source.** The brief takes the day colours from the website's light
theme (`#FDFCF9` background, `#17171b` ink, etc.) and the `positron` basemap for the
map scenes. If the *app's* own day mode uses different surface colours or a different
map style, say which and the token table in `BRIEF-daynight-renders.md` §2 is the one
place to change.
*Default if unanswered:* website light-theme values + positron.
