# audio-studio — structure

This folder is the sound design for the same Qualifire marketing compositions as
`../hyperframes/`. One folder per teaser ingredient, same names, same set: `brandmark`,
`colours`, `gates-saving`, `ranking`, `start-ride`, `teaser`.

`all-renders/` is the one folder both directions touch. Nathan drops the current picked
visual render there as the starting point for a scene's audio work (e.g.
`gates-saving_v4.mp4`). **Every time Claude builds a new round for a scene — soundv1
included, not just a version worth keeping — the file in `all-renders/` gets replaced**
with that round's render + audio (e.g. `gates-saving_v4_with_sound_v2.mp4`), so
`all-renders/` always holds Claude's latest round per scene for a quick look, silent
only for a scene nobody's touched yet. Nathan did this by hand once, for gates-saving's
soundv2; every other round (including first-pass soundv1s) is Claude's job as soon as
that round is built — no "is it good enough yet" gate.

Created 2026-09-11. `all-renders/` convention added 2026-09-11 after Nathan swapped in
`gates-saving_v4_with_sound_v2.mp4`; corrected the same day to "every round, not just
ones worth keeping" after Nathan flagged that the "worth keeping" gate was never a rule
he'd actually set.

## How a scene's sound is made

There's no external tool in the loop (Pixverse's free tier is one-shot and unusable
for real iteration; see `APPROACH.md` for why and what else was considered). Claude
writes the soundtrack as Python (numpy/scipy — synthesis, envelopes, a hand-rolled
reverb) and mixes it onto the picked render with ffmpeg, in Claude's own sandbox, all
in one pass. That's the one real difference from the hyperframes flow: there's no
render.ps1 / preview-server step, because "render" and "check it" happen in the same
turn — every version Claude produces is already a candidate for your review, not a
disposable preview.

Shared building blocks (envelopes, notes, chords, pluck/pad/reverb, plus the brand
chime and tier-colour tones) live once in `synth.py` at this folder's root, so a
scene's `soundtrack.py` imports from it instead of redefining tones — see
`APPROACH.md` for what's in there and why. `gates-saving/soundtrack.py` predates
that extraction and still has its own inline copy; every other scene imports it.

A scene folder is:
```
<scene>/
  soundtrack.py         canonical synthesis script — plays the same role index.html
                         does for the visuals: the source of truth, edited in place
                         across iterations, not duplicated per round. Imports the
                         shared synth.py (sys.path.insert(0, "..") — or "../.." for
                         a scene nested one level deeper, like brandmark/opening/)
  README.md             sonic direction + status table (mirrors hyperframes' per-scene
                         README)
  soundvN/
    <scene>_..._vN.mp4  the picked render with that round's soundtrack muxed on
    soundtrack_vN.wav   the soundtrack alone, for judging the audio without
                         re-watching the video (hyperframes doesn't need this — sound
                         isn't its deliverable; it is here)
    FEEDBACK.md         everything about this round in one file: what this render is
                         and why (so no README.md alongside it — matches hyperframes'
                         own rounds/vN, which is just the mp4 + FEEDBACK.md), what
                         changed since vN-1, what to listen for, your notes
```
One `soundvN` folder per iteration — same idea as hyperframes' `rounds/vN`, named
`soundvN` per Nathan's steer. When you say what's off, Claude edits `soundtrack.py` in
place, regenerates, and adds the next `soundvN`. No README.md inside a `soundvN` folder
— everything needed to give feedback lives in that round's `FEEDBACK.md`, so review
never means switching files.

**Finishing any round:** also copy that round's muxed mp4 into `../all-renders/`,
replacing whatever's there for that scene (silent original or an older sound version)
— see the `all-renders/` convention above. This happens every round, including a
first-pass soundv1 or a version still mid-iteration — `all-renders/` is meant to be
Nathan's quick-look copy of Claude's latest work, not a gate for "is it good enough."

One exception to "one folder per teaser ingredient": `brandmark/` splits into two
sub-scenes, `brandmark/opening/` and `brandmark/closing/`, each its own full scene
folder (own `soundtrack.py`, `README.md`, `soundvN/`) — matching how
`../hyperframes/brandmark/` is itself split. `sys.path.insert(0, "../..")` from
inside those two reaches the shared `synth.py`, one level further up than usual.

## Folder map

| Folder | Status | Feedback goes to |
|---|---|---|
| `gates-saving/` | in progress — soundv1 (pulse + single chord), soundv2 (chord progression + plucked arpeggio + reverb) | `gates-saving/soundv2/FEEDBACK.md` |
| `brandmark/opening/` | in progress — soundv1 | `brandmark/opening/soundv1/FEEDBACK.md` |
| `brandmark/closing/` | in progress — soundv1 | `brandmark/closing/soundv1/FEEDBACK.md` |
| `colours/` | in progress — soundv1 | `colours/soundv1/FEEDBACK.md` |
| `ranking/` | in progress — soundv1 | `ranking/soundv1/FEEDBACK.md` |
| `start-ride/` | in progress — soundv1 | `start-ride/soundv1/FEEDBACK.md` |
| `teaser/` | in progress — soundv1 (independent composition, not a concat — see `APPROACH.md`) | `teaser/soundv1/FEEDBACK.md` |

## The one rule

Same as hyperframes: feedback for a scene goes in that scene's most recent round's
`FEEDBACK.md`, not in this file. This file and `APPROACH.md` are the only docs meant
to stay high-level and current across the whole project.
