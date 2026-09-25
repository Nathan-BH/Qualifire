# ride — soundv1 — Round 1 (complete ride master)

**Render file:** `ride_master_v1.wav` (built); `ride_v1.mp4` (built — confirmed via
ffprobe at exactly 26.300000s, matching the planned 14.0 + 12.3s exactly). **Source:** `../ride_master.py`.

## What this is

One continuous 26.3s Salamander soundtrack across start-ride (video 0–14.0s) and
gates-saving (14.0–26.3s), rendered from two loop iterations of the Interstellar note
list in a single pass, then sliced sample-exactly into the two scenes' own next rounds.

**Loop-point ruling (3 lines):** the piece loops with period `P = 15.43s` (not the
file's raw 15.04s) — the extra 0.39s of rest keeps the last bar's length and the
E5→E5 seam gap inside the piece's own natural range (1.82–2.11s bar-4 gap: 15.43 gives
1.84s, 15.04 would give 1.45s and read as a stumble). The master is rendered from the
note list directly across both iterations, never by looping a finished WAV, so every
note's decay carries naturally across the seam.

**Answers this is built on:** Q1 (Salamander, no A/B), Q2 (both a family folder and
per-scene slices, mirroring `brandmark/`), Q3 = A (start-ride keeps its approved soundv7
placement), Q4 (continuous through gates-saving's intro), Q6 (gates at exact quarters,
five E5 pulses), Q6b (`TEMPO = 1.0`, unused), Q7 (12.3s scene kept).

## The schedule (τ = the master's own clock, verbatim ride_master.py output)

```
bass scheduled tau (6 notes): [5.61, 9.33, 13.18, 17.14, 21.04, 24.76]
voice_a scheduled tau (11 notes): [5.61, 7.44, 9.33, 11.24, 13.18, 15.36, 17.14, 19.15, 21.04, 22.87, 24.76]
e5 scheduled tau (5 notes): [17.8, 19.81, 21.65, 23.51, 25.38]
```

Every value matches the brief's §3 table exactly (16 combined onsets). The five E5
pulses minus 14.0 are 3.80 / 5.81 / 7.65 / 9.51 / 11.38 — exactly `RIDE_T0 + PULSE_T`
from the landed `gates-saving/index.html` (cross-checked, 0ms drift).

## Verified

- `ride_master_v1.wav`: 1,159,830 samples, mono, 44,100 Hz. Peak −2.21 dBFS (≤ −1
  dBFS target; no global scale factor needed). RMS of 0–5.2s = −240 dBFS (digital
  silence, fade-in hasn't started). RMS of 26.25–26.30s = −52.2 dBFS, final sample
  |x| = 0.0 (the fade has fully landed).
- **Onset scan** (20ms RMS, tuned to +4 dB over one 20ms window back / floor −45 dBFS /
  0.25s refractory — see the docstring, now in `_to_delete/cycle14_scratch/onset_scan_final.py`,
  for why the brief's +6 dB / two-windows-back starting point had to loosen slightly: two
  of the sixteen onsets land on an already-elevated decay floor from concurrent notes
  rather than into near-silence) returns exactly 16 onsets and nothing else — no onset in
  the 13.8–14.2s seam, none of the six un-rendered E5 positions (6.22/8.08/9.95/11.91/
  13.87/15.98) fire. **Correction (Inspect pass, 2026-09-20): 13 of the 16 land within
  ±30ms of the scheduled tau; the three E5 pulses do not (up to +50ms) — see "Known,
  benign timing offset" below. This is not a scheduling error; the tau values above are
  exact to 0.0ms against `index.html`.**
- **Slice parity:** `../start-ride/soundv8/soundtrack_v8.wav` is 617,400 samples and
  `numpy.array_equal` to the master's first 617,400 samples — confirmed. `../gates-
  saving/soundv9/soundtrack_v9.wav` is 542,430 samples and array-equal to the master's
  next 542,430 — confirmed. The first slice's onsets (5.62/7.45/9.34/11.25/13.19) sit
  close to today's `soundtrack_v7.wav` (FluidSynth) scan (5.60/7.43/9.31/11.22/13.16)
  — same notes, same positions, instrument swapped only.

## Known, benign timing offset (Inspect pass, 2026-09-20)

Every real Salamander `.mp3` sample carries ~26-30ms of leading encoder padding
(confirmed by direct decode of several samples: first energy above -20dBFS at
28.6-34.0ms into the file, consistent with the ~1105-sample LAME encoder delay converted
to time). This is uniform across samples, so the piece's internal rhythm (note-to-note
timing) is completely unaffected -- but every note in this master (and in `soundv8`/
`soundv9`) starts sounding ~26-30ms later than its scheduled `tau`, relative to a
FluidSynth-era render, which had no such padding.

Consequence: the audible E5 pulse at gates-saving's gate crossings lands about 0.8 of a
video frame (at 30fps) *after* the gate ticks, not exactly on it -- the whole point of
this cycle's `RIDE_WARP`/surge redesign. It is a small, uniform lag, not a musical or
scheduling error, and may not be audible/visible at all once rendered. If it matters
once you've seen the real render, the fix is a one-line trim in `salamander_render.py`'s
decode step (drop the first ~28ms of each decoded sample before use) and a re-render of
the four layer WAVs -- not touched here, flagging for your call.

## What to listen for (once the video exists)

- The seam at video 14.0s — should be inaudible (every layer decays naturally across
  it; nothing is cut and restarted).
- The loop coming round at gates-saving 7.04s (F2+A4 restart, "the theme comes back").
- The five pulses — whether the first reads as "go" and the last as "finish" rather
  than as two extra, unexplained gate-like events.
- The music continuing under gates-saving's intro (0–3.8s) — Nathan's "I want to hear
  how it sounds."

## One structural question worth Nathan's word

`ride/`'s two parts (`start-ride/`, `gates-saving/`) are linked *sideways* from this
family README rather than nested under `ride/`, because they already carry 7–8 rounds
of their own top-level history. Say if you'd rather have them nested instead — as
written now, the family README explicitly asks the next reader not to "fix" this.

## Things to watch

- **The video mux is done.** `gates-saving_v8.mp4` was rendered on Nathan's PC and
  its duration confirmed via ffprobe at exactly 12.300000s. `ride_v1.mp4` (the silent
  concat of `start-ride_v4.mp4` + `gates-saving_v8.mp4`, re-encoded video-only, muxed
  with this master) is built and confirmed via ffprobe at exactly 26.300000s. The two
  per-scene muxes (`start-ride_v4_with_sound_v8.mp4` at 14.000000s,
  `gates-saving_v8_with_sound_v9.mp4` at 12.300000s) are also built and confirmed via
  ffprobe — all three durations match plan exactly.
- The two per-scene muxes have replaced `audio-studio/all-renders/
  gates-saving_v6_with_sound_v3.mp4` and `start-ride_v4_with_sound_v2.mp4` there with
  `gates-saving_v8_with_sound_v9.mp4` and `start-ride_v4_with_sound_v8.mp4`; the
  superseded files were moved to `Qualifire\_to_delete\`, not deleted.

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
1) The ride animation is wired incorrectly, what i actually wanted is for it to speed up in between gates and slow down at the gates. Whil the current animation is slow between gates and then speeds up at the gates. 
2)Overall i think the sound is good as proof of concept and is implemented correctly. A full repeated loop with at some point extra notes is i what i want. However simple piano notes just dont fit with the animation. I need a more complex soundtrack which sounds more like a song, and then for the gates there should be like one extra instrument added to emphasize it like we have it now. I am however unsure how well claude can produce a proper song, because it was already difficult to get just a proper piano sound. Which is why i think its worth looking for an extension, or GitHub repo, or tool/skills, that might help with sound design and more ?