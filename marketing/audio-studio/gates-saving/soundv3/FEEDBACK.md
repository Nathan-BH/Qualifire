# gates-saving — soundv3

**Render:** gates-saving_v4_with_sound_v3.mp4 — this round's soundtrack muxed
onto the existing gates-saving_v4.mp4 render. Note: the visual side of
gates-saving is also being reworked this cycle (white draw-across gates
instead of colour pop-ins — see `../../../silent-studio/gates-saving/rounds/v5/FEEDBACK.md`),
but that change **does not alter this scene's timing at all** (same 12.4s
duration, same beat times), so this audio is already correct for the
upcoming v5 render too — once Nathan renders v5, just re-mux this same
`soundtrack_v3.wav` onto the new video (the audio itself needs no changes).
**Also here:** `soundtrack_v3.wav` — the soundtrack alone.
**Script that made it:** `../soundtrack.py` (canonical — **this round migrated
it off its own inline copy of the synthesis toolkit and onto the shared
`../synth.py`**, closing a long-standing cleanup item from `../../APPROACH.md`).
**Source video:** `../../all-renders/gates-saving_v4.mp4` (12.3s, 1920x1080, no audio)
**Built:** 2026-09-13
**Previous round:** `../soundv2/FEEDBACK.md`

## What this is

Nathan's soundv2 feedback, answered directly:

1. **"if possible some kind of whoosh sound while zooming out"** → a whoosh
   now plays under the 0.0-1.0s zoom-out lead-in (the camera pull-back that
   continues from start-ride's finishing frame).
2. **"for the second ride ideally I want something close to the first ride
   but more upbeat... like in mario kart when you get the star boost, the
   music is more fast paced and happy, while the music is actually the same"**
   → "the first ride" is start-ride's own scene, whose soundv2 (built this
   same round, see `../start-ride/soundv2/FEEDBACK.md`) became a driving
   four-chord loop (C-G-Am-F). This scene's ride (4.4-11.7s) now reuses that
   **exact same four-chord progression and tone set** — not a new melody —
   but boosted: tempo climbs 165→210bpm across the four chords (vs
   start-ride's flat 155), matching Nathan's "same tune, faster and happier"
   description of a Mario Kart star power-up.

## What changed since v2
- 0.0-1.0s: silence → whoosh under the zoom-out.
- 1.05-4.8s: unchanged calm Cmaj9 hold + a "saved" ping, slightly quieter since the whoosh now carries the scene's opening second.
- 4.4-11.7s (the ride): the old Cmaj9→Am7→Fmaj7→Gadd9→resolve progression at 100-124bpm → start-ride's C-G-Am-F progression, boosted to 165-210bpm.
- Gate-crossing event chimes: kept the same idea (a ping per gate, tuned to the tier colour it completes) but re-tuned to the new chord set.
- **`soundtrack.py` migrated from its own inline synthesis-toolkit copy to importing the shared `synth.py`** — no audible change, just removes ~150 lines of duplicated code (flagged as a cleanup item in `APPROACH.md` since the toolkit was first extracted).

## What to listen for
- Whether the "boosted" tempo ramp (165→210bpm) actually reads as a Mario Kart-style speed-up rather than just faster/busier.
- Whether reusing start-ride's exact chord set here (rather than a fresh progression) makes the two scenes feel connected the way Nathan described, or just repetitive back-to-back.
- The whoosh under the zoom-out — timing/length is a judgment call (1.0s, matching the visual lead-in exactly).

## Nathan's feedback
<!-- write your notes below -->
