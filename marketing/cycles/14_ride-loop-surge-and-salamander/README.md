# Cycle 14 — one continuous "ride" track, uniform gate surges, real Salamander piano

**Status (2026-09-20, third Plan pass): finalised, ready to execute — nothing executed
yet.** Nathan: "make a new cycle in marketing/cycles for now make some briefs and also
add a questionsfornathan file if you have any questions" — six numbered ideas, quoted in
full in `questionsfornathan.md`'s header. He has since answered all seven questions
inline in that file (his words untouched; a *Coordinator resolution* line under each);
the three briefs are finalised on those answers and no longer branch on anything. Cycle
13's `BRIEF-gates-warp-easing.md` is superseded by this cycle (Q5; marked in its README).
Every number in this folder was re-measured from disk (WAV headers, onset scans, a
least-squares fit of the scene mixes against the layer files, the route polyline) and
the surge model was recomputed from scratch in this pass for the final layout. No
`index.html`, no `.py`, no WAV has been touched.

**The final design in one line:** gates at exact quarters of the route (`GATES = [0.25,
0.50, 0.75]`), the ride carried by **five** consecutive E5 pulses of the continuous track
(start line, three gates, finish line) at gates-saving video **3.80 / 5.81 / 7.65 / 9.51 /
11.38 s** (`GATE_T = [2.01, 3.85, 5.71]`, `RIDE_DUR = 7.58 s`), the 12.3 s scene
unchanged; the master rendered through Salamander directly, continuous through the
intro, start-ride's placement kept; `ride/` as a family folder like `brandmark/`.

## What this cycle covers

| # | Nathan's idea | Answer / brief | Status |
|---|---|---|---|
| 1 | Do `start-ride/soundv7/start-ride_v4_with_sound_v7.mp4` and `gates-saving/soundv8/soundtrack_v8.wav` already have the Salamander piano? | **No.** Both are FluidSynth renders of the bundled `TimGM6mb.sf2` GM soundfont (`fluid_render.py` line 37, `fluid_soundtrack.py` docstring). The 29 real Salamander samples Nathan downloaded on 2026-09-20 are only wired into `piano/named-keys.html` (the on-page preview keyboard), not into any scene soundtrack. And yes, Salamander is the better sound — it is the sample set midiviewer.io/Klang.io use; the substitute was adopted only because the real one was unreachable at the time. | `BRIEF-salamander-renderer.md` — a numpy+ffmpeg sampler that runs on Nathan's PC shell (unlike FluidSynth), the shared windowing helper, the gain calibration. **Q1: no A/B — the ride master uses it outright.** Ready to execute. |
| 2, 4, 5 | One continuous track across start-ride → gates-saving ("ride"): the base loop (bass + voice A) runs from the first ride's start straight through, and the E5 "extra notes" join once the second ride begins, landing on the gates. | `BRIEF-ride-loop-track.md` — loop period, why the loop is rendered from the note list (not by looping the WAV), the combined 26.3 s timeline with the five ride pulses, the master + per-scene slices, `ride/` as a `brandmark/`-style family folder, the mux. **Q2 both, Q3 A, Q4 continuous, Q6b TEMPO 1.0.** Ready to execute (after the other two land and Nathan renders gates-saving v8). |
| 3 | Can `interstellar_corrected.mid` loop — after the last E5, start again at F2/A4 "with the correct interval"? | **Yes, with one correction:** the correct interval is the piece's own E5→downbeat gap (1.23 s), which makes the loop period **15.43 s**, not the file's 15.04 s. Back-to-back looping (15.04) shortens the last bar by 0.33 s (8.7 %) and reads as a stumble; also the WAVs are hard-cut at 15.04 s while the last E5 is still at −32 dBFS, so looping the *file* would click. Full arithmetic in `BRIEF-ride-loop-track.md` §1. | ruled (ruling 2), executed inside the ride brief |
| 6 | Make the speed-up/slow-down uniform across all gates; design the ride length and gate layout *from* the E5 interval, then decide whether the current ride fits. | `BRIEF-gates-surge-pacing.md` — E5 interval measured (1.94 ± 0.09 s), the "uniform surge" profile in its five-pulse form, the calculation, why the current gates could not take it, **the final layout: exact quarters on five pulses (Q6), ride 3.80–11.38 s, seven anchored edits in `gates-saving/index.html` including Nathan's "your/self" caption change (Q7)**, round v8 docs, node-verified pass criteria. Ready to execute. |
| — | Seven questions, now all answered by Nathan inline, with a coordinator resolution under each | `questionsfornathan.md` | closed, 2026-09-20 |
| — | Nathan-PC commands | `COMMANDS.md` | placeholder — live once the surge brief lands (gates-saving v8 render + five frame checks) |

**Not in this cycle:** the teaser's own soundtrack (`teaser/soundv2`, an independent
composition from before the Interstellar thread) — once a `ride` master exists it is the
obvious audio for teaser positions 2–3, but that is a later round; `colours`; the
`named-keys.html` playback fixes (handled directly under `piano/piano-cycles/`, outside
this pipeline by Nathan's own preference); cycle 13's colours brief (independent, still
valid).

## Rulings made in this cycle (so nobody re-litigates them)

1. **Piano quality: the scene soundtracks do not have Salamander; the fix is a
   renderer, not a re-download.** The samples are on disk
   (`piano/samples/salamander/`, 29 mp3, mono 44.1 kHz, 6–16 s natural decays, all
   decodable with the PC shell's `ffmpeg`; only `A0` is missing and the lowest note in
   the piece is F2 = MIDI 41, nearest sample `Fs2` one semitone up). A pure-numpy
   sampler with the same `render(notes, dur_s) -> (float32, sr)` API as
   `fluid_render.py` runs on Nathan's PC shell (numpy 2.2.6 + ffmpeg confirmed there
   today), which FluidSynth never could. **Adoption (Q1, Nathan): no A/B round — the
   ride master renders through Salamander outright;** the FluidSynth layer files stay on
   disk as the record of soundv5–v8 and as the level reference for the gain calibration.
2. **Loop period P = 15.43 s** (next iteration's content t=0 placed 15.43 s after the
   previous one's). Derivation: the piece's three internal "last E5 of a bar → next
   downbeat" gaps are 1.25 / 1.27 / 1.16 s (mean 1.227); the last E5 is at 14.51, so the
   next downbeat belongs at 15.74 and the iteration's t=0 at 15.74 − 0.31 = 15.43. That
   gives bar 4 a length of 3.90 s (the real bars are 3.72 / 3.85 / 3.96) and a seam E5→E5
   gap of 1.84 s (the piece's own range is 1.82–2.11). P = 15.04 (file length,
   back-to-back) would give 3.51 s and 1.45 s — both outside the piece's own range.
3. **The loop is rendered from the note list, never by looping a WAV.** Every layer
   WAV is hard-truncated at 15.04 s (`fluid_soundtrack.py`: `audio[: int(DUR * sr)]`);
   measured today, `melody_only.wav` ends at −32 dBFS with a last sample of −0.032 and
   `bass_only.wav` at −45 dBFS — a step to zero at a seam is an audible click. Rendering
   the notes of two iterations (t and t + P) in one pass lets every note decay
   naturally across the seam. Same reason the fixed segment is not "kept as a file" —
   the whole master is one render.
4. **The master is one 26.3 s render on the combined clock (start-ride 0–14.0 s, then
   gates-saving 14.0–26.3 s), sliced sample-exactly into two per-scene WAVs.** That is
   the order the teaser actually plays them (`teaser/rounds/v8/concat.txt`: opening,
   start-ride, gates-saving, ranking, closing — stream-copy concat, no gap). Each scene
   keeps its own round folder and mux (so the per-scene FEEDBACK/round convention
   holds), and the standalone `ride_vN.mp4` is the *silent* concat of the two renders
   muxed with the whole master — not a concat of two AAC muxes, which can click at the
   join.
5. **Levels:** the master uses one gain for every layer, ×1.5 — the fit today shows
   `soundtrack_v7.wav` = 1.5 × (bass_only + voice_a) at 5.3 s and `soundtrack_v8.wav`
   = 1.0 × (bass_only + melody_only) at 4.4 s (scale factor exactly 1.500 / 1.000 across
   the whole sustain in both files, falling off only inside the documented fade-outs —
   soundtrack_v8.wav is bit-identical to bass_only+melody_only in 98.5% of samples, the
   rest being peak limiting, not a wrong recipe).
   Two gains cannot coexist in one continuous track; 1.5 wins because the first ride
   is what the listener calibrates to. Peak check ≤ −1 dBFS is in the brief.
6. **Idea 6 supersedes cycle 13's easing brief (confirmed, Q5).** Cycle 13
   keeps the v7 anchors (gates at ride-relative 0.52 / 2.38 / 4.25 s, route 0.24 / 0.63
   / 0.84) and only smooths between them. Idea 6 moves the gates *and* the times, so
   the anchors cycle 13 preserves no longer exist. They are not compatible; the
   easing brief is not an interim step either, because its one deliverable (a smooth
   curve through those anchors) is thrown away by this one. Nathan: "cycle13 should not
   be followed" — cycle 13's README row now says superseded; `BRIEF-gates-surge-pacing.md`
   is the plan.
7. **Uniform surge needs equal-distance legs, so the gates move — to exact quarters,
   on five pulses (Q6, final).** With the current gates the legs between gates are 0.39
   and 0.21 of the route in ~1.86 s each — a 1.9× mean-speed ratio; any curve with the
   same *relative* peak at both gates drives leg 3's mid-leg speed to 0.006 route/s (the
   rider visibly stalls). The second pass objected to 0.50 because it is the apex of the
   route's hairpin (tick 15 px from the returning leg, heading swings 54°); Nathan waived
   that ("it does not really matter in my opinion") and added the decisive point that
   the pulse count is ours to choose — five, including the ride's 0 % and 100 %. With
   `GATES = [0.25, 0.50, 0.75]` and the ride starting and ending on a pulse, all four
   legs are 0.25 of the route in one E5 interval each (2.01 / 1.84 / 1.86 / 1.87 s):
   `RIDE_DUR = 7.58 s`, ride 3.80–11.38 (inside the 12.3 s scene, 0.92 s finish hold),
   speeds 0.041 → 0.208 → 0.060 → 0.216 → 0.054 → 0.215 → 0.053 route/s, continuous, no
   stall, mean 0.132 ≈ start-ride's 0.118. Recomputed from the note list in this pass;
   the surge shape stays because it *is* the feature and because the legs differ in
   time (a constant-speed rider would still step 9 % at gate 1). The half-cosine chain
   is now symmetric (start and finish speeds derived, no `V_START`/`V_END`, `RIDE_DUR`
   read straight off the music). Checked explicitly that nothing beyond the waived look
   is wrong with quarters: fits the scene, lands every pulse, sensible speeds.
   Tempo-stretch (Q6b): `TEMPO = 1.0`, knob kept in `ride_master.py`; it is a
   length/tempo knob, never a placement knob.
8. **Which scene owns the theme's downbeat: start-ride (Q3 = A, final).** Nathan's idea 5 builds backwards from gates-saving's verified
   gate-aligned segment. But idea 6 re-derives that segment anyway (new gate times),
   so nothing is actually fixed there any more — while start-ride's soundv7
   arrangement ("theme restarts from its own beginning as the ride starts", approved
   by Nathan) *is* fixed and is what the listener hears first. Keeping start-ride's
   content-zero at video 5.3 s makes gates-saving's clock content t = video + 8.7 s;
   its E5 onsets then fall at video 3.80 / 5.81 / 7.65 / 9.51 / 11.38 s — exactly the
   five pulses ruling 7 rides on, with the finish landing 0.52 s before `capB` fades.
   Nathan: "it does not really matter … as long as it all lines up properly with the
   gates, and the start-ride" — A is the variant worked out in most detail and the one
   that changes nothing he already approved; B is dropped.
9. **Music runs continuously through the 4.0 s between the rides** (start-ride's
   finish hold 13.8–14.0 + gates-saving's intro 0–3.8): Nathan's "it keeps playing",
   confirmed in Q4 ("I want to hear how it sounds"). This reverses round 3's "silent
   outside the ride" rule for gates-saving's intro; start-ride's 0–5.3 s stays silent.
   **Extended in this pass:** the finish pulse at 11.38 must be heard, so the 0.5 s
   fade-out now ends at the scene's end (12.3) rather than at the ride's end — there is
   no after-ride silence in gates-saving any more (0.92 s of ring + fade instead).
10. **Digest corrections found at Plan time.** (a) The scene-level
    `start-ride/soundtrack.py` and `gates-saving/soundtrack.py` are the *old*
    chord-progression scripts (mtime 2026-09-13/14) — they did not build soundv5–v8;
    those mixes were made by windowing the interstellar layer WAVs (recipe recovered
    by fitting, ruling 5). (b) The "browser caching" issue in `NOTES.md`'s tail is
    closed by a later entry in `piano/README.md`: the file was correct, the real
    problem was playback (decode-on-play, fade shape, clipping), three fixes applied,
    audible verification still Nathan's. (c) `start-ride/soundv7/FEEDBACK.md`'s "real
    piano samples" wording overstates — see the informational notes in
    `questionsfornathan.md`.

## Implementation order and why

1. **`BRIEF-salamander-renderer.md` first.** It is the engine the ride master renders
   through, plus the shared `window_mix.py` and the gain constants the ride brief
   imports. Independent of the video side; can run at once.
2. **`BRIEF-gates-surge-pacing.md` second** (video side): seven anchored edits in one
   `index.html`, the round-v8 docs, then a render on Nathan's PC (`COMMANDS.md` §2). It
   fixes the pulse *times* the master has to hit, so it is settled before the audio is
   cut — and the mux in step 3 needs its render.
3. **`BRIEF-ride-loop-track.md` third** (audio side): renders the master through
   Salamander on the five pulse times from 2, slices, muxes, builds `ride_v1.mp4`. Its
   verification (onset scan at the five E5 times against the landed `index.html`) is the
   end-to-end check for the whole cycle.
4. Each brief is followed by a fresh-context Inspect pass per its verification section
   before the next is dispatched. The two briefs that describe the same timeline (2 and
   3) carry identical numbers — 3.80 / 5.81 / 7.65 / 9.51 / 11.38, `GATE_T = [2.01, 3.85,
   5.71]`, `RIDE_DUR = 7.58` — and each tells the executor to stop if the other's landed
   values differ by more than 10 ms.

## What shipped (this folder)

| File | What it is | Executed? |
|---|---|---|
| `README.md` | This file. | — |
| `BRIEF-salamander-renderer.md` | Answer to idea 1 + Sonnet-executable brief: `audio-studio/salamander_render.py` (numpy + ffmpeg sampler over the 29 real samples, `fluid_render.py`-compatible API), `window_mix.py`, `salamander_soundtrack.py` (gain calibration against the FluidSynth layers, exported constants), doc pointers; no A/B round (Q1). | no — ready |
| `BRIEF-ride-loop-track.md` | Rulings 2–5, 8, 9 + brief: `audio-studio/ride/` as a `brandmark/`-style family folder (README with sideways links to the two scene folders), `ride_master.py` (two-iteration note lists, Salamander, five E5s, `TEMPO` knob at 1.0, placement, fades, gain, slice), per-scene rounds `start-ride/soundv8` + `gates-saving/soundv9`, `ride_v1.mp4`, verification numbers (16 onsets, five-pulse parity). | no — ready, after the other two |
| `BRIEF-gates-surge-pacing.md` | Rulings 6–8 + brief: the measured E5 interval, the five-pulse surge model, the calculation Nathan asked for, the geometry at the three quarter points (recorded, waived), the final `index.html` block (`GATES`, `PULSE_T`, `GATE_T`, `RIDE_PROFILE`, `rideFrac`, time-driven `ride()`), the "your/self" caption swap, round v8 docs, node verification with the exact output to match. | no — ready |
| `questionsfornathan.md` | Seven questions, Nathan's inline answers (verbatim), a coordinator resolution under each, plus six informational doc-staleness notes. | closed |
| `COMMANDS.md` | What Nathan will run once each brief lands (gates-saving v8 render, the five frame checks, the ride ffprobe); live after the surge brief executes. | not run |

Outside this folder, the third Plan pass edited exactly one line:
`13_gates-easing-and-loose-ends/README.md`, item 1's status cell (superseded). Nothing
else outside this folder has been modified.

## Model-tier readout

| Tier | Model | Mandate | Outcome |
|---|---|---|---|
| Digest | Haiku | read-pass over cycle 12/13 folders, `NOTES.md`, `fluid_soundtrack.py`, both scene FEEDBACK tails, the interstellar note lists, `gates-saving/index.html`'s `RIDE_WARP` | Digest delivered (in the dispatching chat). Three corrections at Plan time by direct disk check — ruling 10. |
| Plan | Fable | rule on the loop point, the merged-track construction, the gate-pacing fork against cycle 13, the piano-quality answer; write the six files | Six files written in full. Rulings 1–10. Verified at Plan time on Nathan's PC shell: WAV lengths/levels/tails, onset scans of `soundtrack_v7/v8.wav` (offsets 5.3 / 4.4 s confirmed to 10 ms), least-squares fit of both mixes to the layers (gains 1.5 / 1.0), Salamander sample format/decodability, route hairpin clearance per candidate gate, surge curve under node. |
| Plan (2nd pass) | Fable | Nathan's follow-ups: quarters vs thirds, tempo stretch | Geometry table re-derived; C7 added; §2b written; Q6/Q6b posed. |
| Plan (3rd pass, final) | Fable | read Nathan's seven inline answers; finalise all three briefs on them; recompute the surge model for exact quarters on five pulses; record the caption edit; mark cycle 13 superseded | All three briefs finalised and status "ready to execute"; E5 gaps re-derived from the note list, five-pulse model computed under node 22 on Nathan's PC (every pulse exact, monotone, min speed 0.041, `RIDE_DUR` 7.58, fits the scene), the brief's own code block re-extracted and re-run to confirm it reproduces the pass criteria verbatim; gate-point geometry re-measured (128/87/132, 46/15/31 px, 18/54/4°); all seven `index.html` anchors re-checked byte-for-byte on disk (one line-range correction: the `ride()` block is 250–264, not 250–263); the two timeline briefs cross-checked to identical numbers. |
| Execute | Sonnet | — | not dispatched. **Plan: finalised, ready to execute — order in "Implementation order".** |
| Inspect | Fable/Opus (fresh) | — | not dispatched; due after each brief is executed, per each brief's verification section. |

## After execution (coordinator follow-ups)

- Write this cycle's `OPEN-ITEMS.md` pointing at `COMMANDS.md` for the render steps.
- (Done in the third Plan pass: cycle 13's README row for `BRIEF-gates-warp-easing.md`
  marked superseded by this cycle.)
- Fix the informational doc-staleness nits in `questionsfornathan.md` directly (the
  cycle-13 answers Nathan gave — stale lines, colours brief — are unblocked too).
- Update `STATE.md` (marketing section) once the ride master exists: which scene
  round is current, that `ride/` is an assembled track like `teaser/`.
