# start-ride — soundv2

**Render:** start-ride_v4_with_sound_v2.mp4 — the same picked render
(start-ride_v4.mp4, unchanged) with this round's soundtrack muxed on.
**Also here:** `soundtrack_v2.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, see `../structure.md`;
draws on the shared `../synth.py` toolkit).
**Source video:** `../all-renders/start-ride_v4.mp4` (14.0s, 1920x1080, no audio — unchanged)
**Built:** 2026-09-13
**Previous round:** `../soundv1/FEEDBACK.md`

## What this is

soundv1 was built from sampled frames and got the scene's actual structure
wrong (it described a simple "black → dot → route draws" arc with no START
button at all). This round was built by reading `../../hyperframes/start-ride/index.html`'s
actual GSAP timeline directly, so the button-press moment is exact: the
START button fades in at 1.2s, the cursor presses it at **3.2s** (the button
scales down then back up, both button and cursor fade out by 4.0s), the
camera pushes in 3.8-5.1s, the caption lands at 4.6s, and the route draws
behind the rider at constant speed from 5.3-13.8s, holding at the finish to 14.0s.

Nathan's soundv1 feedback, answered directly:
1. **"No sound before clicking the button."** → true silence from 0.0 to 3.2s (verified: peak amplitude in that window is exactly 0.0).
2. **"upon clicking add a clicking sound"** → a punchy `click()` lands exactly at 3.2s, synced to the button's press.
3. **"more upbeat music during the ride... like a mario kart soundtrack"** → the old calm Cmaj9→Am7 pad-and-arpeggio is gone. In its place: a driving four-chord loop (**C - G - Am - F**, using the shared `CMAJ9_ARP`/`GADD9_ARP`/`AM7_ARP`/`FMAJ7_ARP` tones already in `synth.py`) at a fast 155bpm eighth-note arpeggio, plus a light rhythmic pulse underneath, for the full 5.3-13.8s ride — bright and game-like instead of mellow.

## What changed since v1
- 0.0-3.2s: near-silent low tone → true silence.
- 3.2s: nothing → a click synced to the button press.
- 3.4-5.3s: nothing → a small riser bridging the click into the camera push and caption.
- 5.3-13.8s: calm Cmaj9→Am7 pad/arpeggio (96bpm, no resolve) → driving four-chord C-G-Am-F loop at 155bpm with a rhythmic pulse.
- 13.8s: (v1 deliberately had no resolve, since it flowed into gates-saving) → a quick bright resolve chime, since this scene's ride now has its own clear finish rather than trailing off.

## What to listen for
- Whether 155bpm and this chord set actually reads as "Mario Kart"-adjacent, or needs to be faster/brighter still.
- Whether the small riser (3.4-5.3s) bridging the click into the ride feels like a natural lead-in or is an unnecessary addition — it wasn't explicitly asked for, flagging as a judgment call.
- Whether ending on a resolve chime at 13.8s (rather than the old "no resolve, it flows into the next scene" restraint) is the right call now that the ride itself sounds more like a complete musical statement — gates-saving's own soundv3 (built this same round) picks up this exact chord set and tempo-boosts it further, so the two scenes are now musically linked; flag if a full resolve here undercuts that handoff.

## Render on the PC
No render needed — this scene's video is unchanged; the mux above used the existing `start-ride_v4.mp4`.

## Nathan's feedback
<!-- write your notes below -->
