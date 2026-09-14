# Questions for Nathan — cycle 08

Each has the default the briefs already assume, so execution is not blocked on an
answer; an answer just changes what gets rendered or built first.

**Q1 — Day pilots.** The day/night brief starts with `gates-saving` (map scene) and
`brandmark/opening` (non-map) to prove the mechanism, then rolls out to the rest on
request. Do you want a different first pair — e.g. `colours` (the text-heavy one where a
light background changes the most), or everything at once?
*Default if unanswered:* the two pilots, then rollout after you've seen them.

*answer: I would do everything at once should not be a big issue as we already know how to do it in the website + in the actual app.

**Q2 — Python on your PC.** The single biggest "control" unlock on the audio side is a
`regen.ps1` that runs a scene's `soundtrack.py` + ffmpeg mux locally, so you can nudge a
number and hear it in seconds. It needs Python 3 with `numpy` and `scipy` on your
machine (a `pip install numpy scipy` if Python is already there). Do you have / want
that? If yes, it's a small follow-up brief.
*Default if unanswered:* not built; the beat-sheet convention alone ships.

*answer: I think its worth trying you can make a file that runs me through the steps. Is this also in line or part of the proposition in the "C:\Users\natha\Claude personal projects\Qualifire\marketing\cycles\08_daynight-audio-control-and-website\BRIEF-audio-studio-control.md" file ?

*Claude: yes — it is alternative C in BRIEF-audio-studio-control.md §0, now promoted to `BRIEF-audio-regen-local.md`.*

**Q3 — Day palette source.** The brief takes the day colours from the website's light
theme (`#FDFCF9` background, `#17171b` ink, etc.) and the `positron` basemap for the
map scenes. If the *app's* own day mode uses different surface colours or a different
map style, say which and the token table in `BRIEF-daynight-renders.md` §2 is the one
place to change.
*Default if unanswered:* website light-theme values + positron.

*answer: have a look at both how the website and how the current app does it. if its significantly different just choose one and note which one you choose, we can always pick the other one afterwards.
