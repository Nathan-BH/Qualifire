# BRIEF — one continuous "ride" track across start-ride → gates-saving (loop point, master, slices, mux)

**Status: ready to execute (2026-09-20, third Plan pass — every question answered).**
Written 2026-09-20 (Plan tier, Fable). Sonnet-executable: one new Python script +
markdown under `marketing/audio-studio/`, WAV/mp4 outputs, ffmpeg on the PC shell.
**Order:** after `BRIEF-salamander-renderer.md` (the engine) and after
`BRIEF-gates-surge-pacing.md` has landed *and been rendered by Nathan* (for the mux; the
WAV master can be built before the render exists). Stop-on-ambiguity applies.

**Finalised answers (Nathan, `questionsfornathan.md`):** Q1 — engine is **Salamander**
(`salamander_render.py`), no A/B first. Q2 — **both**: a `ride/` family folder with the
complete renders *and* per-scene slices in the scenes' own folders, mirroring how
`brandmark/` is split (§4). Q3 — **A**: start-ride keeps its approved soundv7 placement
(Nathan: "it does not really matter … as long as it all lines up properly with the gates,
and the start-ride"; A is the one worked out in most detail and the one that changes
nothing the listener already approved). Q4 — **continuous** through gates-saving's intro
("I want to hear how it sounds"). Q6 — gates at exact quarters on **five** E5 pulses
(surge brief §3). Q6b — `TEMPO = 1.0`, knob present, unused. Q7 — scene stays 12.3 s.

## 0. What this is, in one paragraph

Nathan (ideas 2, 4, 5): "a complete track across start-ride and gates saving … merge
them together as one continuous render we can call 'ride'": the base loop (bass +
voice A — what `start-ride/soundv7` plays) starts with the first ride and keeps
playing; when the second ride starts, the E5 "extra notes" join (making it sound like
`gates-saving/soundv8`) and land on the gates. This brief builds that as **one 26.3 s
master WAV on the combined clock** (start-ride's 14.0 s followed by gates-saving's
12.3 s — the order the teaser plays them, `teaser/rounds/v8/concat.txt`), rendered in
a single pass from two iterations of the note list through the Salamander sampler, then
**sliced sample-exactly** into one WAV per scene (so each scene keeps its own round and
mux) and muxed once more onto the silent concat of the two renders as `ride_v1.mp4`.

## 1. Idea 3 — does the piece loop? Yes, with the interval corrected (ruling 2)

Note data (`piano/projects/interstellar/soundtrack.py` lines 25–29 and 39–44, confirmed
by `tools/parse_midi.py` on `interstellar_corrected.mid`: 20 notes, 15.04 s): bars start
at 0.31 / 4.03 / 7.88 / 11.84 (bar lengths 3.72 / 3.85 / 3.96 — the player broadens
slightly); each bar is short–long–short–long: voice-A note (~0.62 s) then E5 (~1.24 s),
twice. The last E5 (14.51 s) is written as 0.53 s only because the *recording* stops at
15.04 s — its musical length is ~1.24 s like the other seven.

Nathan's rule "after the last E5, start again with F2/A4, leave the correct interval":
the correct interval is what the piece itself does at every bar line — last E5 of the
bar → next downbeat = 1.25 / 1.27 / 1.16 s (mean **1.227 s**). So the next iteration's
downbeat goes at 14.51 + 1.23 = 15.74 and, since the downbeat is 0.31 s into the
content, the next iteration's t=0 is at **P = 15.43 s**. Checks:

| loop period P | seam gap E5→E5 | bar-4 length | E5→next downbeat |
|---|---|---|---|
| 15.04 (file length, back-to-back) | 1.45 | 3.51 | 0.84 |
| **15.43 (ruled)** | **1.84** | **3.90** | **1.23** |
| 15.50 | 1.91 | 3.97 | 1.30 |
| piece's own range | 1.82–2.11 | 3.72–3.96 | 1.16–1.27 |

Back-to-back puts every seam value outside the piece's own range — that is the "rhythm
broken" case. P = 15.43 is inside the range on all three. So: **agree, provided the loop
is placed at 15.43 s, i.e. 0.39 s of extra rest after the file's end, not immediately.**

**Why the WAV must not simply be looped (ruling 3):** every layer file is cut at exactly
15.04 s (`fluid_soundtrack.py` line 46/49/52/56: `audio[: int(DUR * sr)]`). Measured:
`melody_only.wav` last 20 ms at −32 dBFS, last sample −0.032; `bass_only.wav` −45 dBFS,
+0.004. Any file loop steps from those values to 0 → a click on every seam. Rendering the
note list of two iterations (`t` and `t + 15.43`) in one buffer lets the last E5 and the
held G2 decay naturally under the next F2/A4. The 0.53 s duration of the last E5 stays
as written (its note-off only starts the damper release), so no note data changes.

## 2. Where the two scenes actually meet (checked, not assumed)

`marketing/silent-studio/teaser/README.md` cut sheet v8 and `rounds/v8/concat.txt`:
`opening_v3` (6.5 s) → `start-ride_v4` (14.0 s) → `gates-saving_v6` (12.3 s) →
`ranking_v7` → `closing_v4`; stream-copy concat, no gap. So start-ride → gates-saving
is a real back-to-back cut in the one assembled video, and the combined clock is
τ = start-ride video time for 0–14.0, τ = 14.0 + gates-saving video time after.
Standalone, each scene is also shown on its own (each has its own `all-renders/`
entry) — which is why the master is sliced per scene rather than replacing the
per-scene rounds (ruling 4). `marketing/website/index.html` embeds no mp4, so nothing
else consumes these clips.

## 3. The master (final: Q3 = A, Q4 = continuous, five pulses)

Content clock `c` (the note lists' own seconds), loop period P = 15.43, **c = τ − 5.3**
(start-ride's soundv7 placement, unchanged), so on gates-saving `c = v + 8.7`.
Recomputed from the note list in this pass (node) — every row below is
`c + 5.3`, iteration 1 = iteration 0 + 15.43:

| c | τ | scene time | event | layer |
|---|---|---|---|---|
| 0.31 | 5.61 | SR 5.61 | F2 + A4 (theme opens as the first ride starts) | bass, voice A |
| 2.14 | 7.44 | SR 7.44 | A4 | voice A |
| 4.03 | 9.33 | SR 9.33 | G2 + B4 | bass, voice A |
| 5.94 | 11.24 | SR 11.24 | B4 | voice A |
| 7.88 | 13.18 | SR 13.18 | A2 + C5 | bass, voice A |
| — | 13.8–14.0 | SR finish hold | music continues (was faded out in soundv7) | |
| 10.06 | 15.36 | GS 1.36 | C5 | voice A |
| 11.84 | 17.14 | GS 3.14 | G2 + D5 | bass, voice A |
| **12.50** | **17.80** | **GS 3.80** | **E5 — pulse 1, the ride starts on it (start line)** | **E5** |
| 13.85 | 19.15 | GS 5.15 | D5 | voice A |
| **14.51** | **19.81** | **GS 5.81** | **E5 — pulse 2, gate 1 (route 0.25)** | E5 |
| 15.74 | 21.04 | GS 7.04 | F2 + A4 (the loop comes round) | bass, voice A |
| **16.35** | **21.65** | **GS 7.65** | **E5 — pulse 3, gate 2 (route 0.50)** | E5 |
| 17.57 | 22.87 | GS 8.87 | A4 | voice A |
| **18.21** | **23.51** | **GS 9.51** | **E5 — pulse 4, gate 3 (route 0.75)** | E5 |
| 19.46 | 24.76 | GS 10.76 | G2 + B4 (now inside the ride — heard) | bass, voice A |
| **20.08** | **25.38** | **GS 11.38** | **E5 — pulse 5, the finish line** | E5 |
| — | 25.80–26.30 | GS 11.80–12.30 | fade-out 0.5 s ending at the scene's end | all |

E5 pulses that exist in the loop but are **not** rendered: the six before c = 12.50
(τ 6.22 / 8.08 / 9.95 / 11.91 / 13.87 / 15.98 — the "basic soundtrack" span: first ride
and the gates-saving intro) and c ≥ 22.04 (τ ≥ 27.34, past the master anyway). The
**five** rendered E5s are the start line, the three gates and the finish line — video
3.80 / 5.81 / 7.65 / 9.51 / 11.38 = `RIDE_T0 + PULSE_T` of `BRIEF-gates-surge-pacing.md`
§3 (3.80 + 0 / 2.01 / 3.85 / 5.71 / 7.58), `GATE_T = [2.01, 3.85, 5.71]`, `RIDE_DUR =
7.58`, ride end 11.38. The two briefs carry the same numbers by construction; the
executor takes the values from the *landed* `index.html`, not from here, and stops if
they disagree with this table by more than 10 ms.

**Ruling 9 extended (this pass):** the finish pulse must be *heard*, so the fade no
longer ends at the ride's end (that would silence pulse 5 at 25.38 exactly). The
fade-out is 0.5 s ending at τ = 26.3 = the scene's end (starts 25.80, 0.42 s after the
finish pulse — its attack and first ring are at full gain, the decay is shaped by the
fade). After-ride silence therefore no longer exists in gates-saving; only start-ride's
0–5.3 s is silent.

**Layers rendered** (three `salamander_render.render()` calls, each on the 26.3 s
clock, buffer `dur_s = 26.3` → 28.3 s with tail):
- `bass`: `BASS` at `c + 5.3` for k = 0 and 1 (`c + 5.3 + 15.43`); schedule only notes
  with τ < 26.3 — **6** sound (iteration 1's A2 at τ 28.61 and G2 at 32.57 are dropped;
  print the list).
- `voice_a`: `VOICE_A` likewise, τ < 26.3 only — **11** sound (iteration 1's B4 at
  τ 26.67 and everything after it are dropped; print the list).
- `e5`: exactly the five E5s at c = 12.50 / 14.51 / 16.35 / 18.21 / 20.08, durations
  from `MELODY` (1.28 / 0.53 / 1.22 / 1.25 / 1.23 — iteration-1 notes reuse iteration-0
  durations).
Velocities 95 / 105 / 105 as `fluid_soundtrack.py`; per-layer `gain` = the values the
Salamander brief hard-codes in `salamander_soundtrack.py` (bass / voice_a / voice_e5 —
the numbers that put each layer's peak at the FluidSynth reference −12.3 / −9.2 /
−9.5 dBFS). Reuse those constants by import, do not re-measure.

**`TEMPO` (Q6b, default 1.0):** one constant applied in the scheduling step — every
`start`, `dur` and P are multiplied by `1 / TEMPO` before rendering (a real pianist
playing slower does not stretch the decay; the sampler triggers the same samples at new
times). At 1.0 it is a no-op. If it is ever changed, the surge brief's `PULSE_T` scale
as 1/TEMPO and both briefs' tables are regenerated with the same code; nothing in this
cycle sets it ≠ 1.

**Windowing** (`window_mix.py` from the Salamander brief): sum the three layers ×
**1.5** (ruling 5) into a 26.3 s buffer (1 159 830 samples); fade-in 0.15 s starting
at τ = 5.3; fade-out 0.5 s ending at τ = 26.3; digital silence before 5.3. Peak must be
≤ −1 dBFS; if not, scale the whole master by one factor to −1 dBFS and report the factor
(never per-segment).

**Slices:** `start-ride` = samples `[0, 617 400)` (14.000 s exactly), `gates-saving`
= `[617 400, 617 400 + 542 430)` (12.300 s). Both are cuts of the same buffer — no
re-fade at the seam, that is the point.

**Not taken (for the record):** variant B (gates-saving owns the downbeat, first ride
starts mid-phrase) and the silent-intro variant of Q4 — both worked out in the second
pass, both declined by Nathan's answers; nothing of either survives into the code.

## 4. Files — mirroring `brandmark/`'s family split (Q2)

Nathan: "we can do like the … brandmark folders which are further split in opening &
closing. We can have ride folder with the complete ride renders, and then also folders
for each separately." On disk `audio-studio/brandmark/` is: a **family `README.md`**
(what the family is, a *Sub-scene | Status | Feedback goes to* table pointing at each
part's README and current round) and one folder per part, each an ordinary scene folder
(`README.md`, `soundtrack.py`, `AUDIO-BRIEF.md`, `soundvN/`). `ride/` mirrors that with
one deliberate difference: its two parts, `start-ride/` and `gates-saving/`, **already
exist as top-level scene folders with seven and eight rounds** — nesting them under
`ride/` would break every existing link and round number for no gain — so the family
README points *sideways* at `../start-ride/` and `../gates-saving/` instead of down into
subfolders, and the per-scene slices become those folders' next rounds. Say this in
`ride/README.md` so the next reader does not "fix" it.

### 4a. `marketing/audio-studio/ride/` (new family folder — an *assembled* track, like `teaser/`)

- `README.md` — shape of `audio-studio/brandmark/README.md`: what `ride` is (the two
  product-scene rides as one continuous soundtrack, not a HyperFrames composition — no
  `silent-studio/ride/` twin; the silent concat is an intermediate), the combined clock
  (start-ride 0–14.0, gates-saving 14.0–26.3), the loop-point ruling in two lines, the
  engine (Salamander, cycle 14), then the family table:

      | Part | Status | Feedback goes to |
      |---|---|---|
      | **complete ride** (this folder) | soundv1 — built, awaiting Nathan's listen | `soundv1/FEEDBACK.md` |
      | [start-ride/](../start-ride/README.md) | soundv8 = slice 0–14.0 s of the master | `../start-ride/soundv8/FEEDBACK.md` |
      | [gates-saving/](../gates-saving/README.md) | soundv9 = slice 14.0–26.3 s of the master | `../gates-saving/soundv9/FEEDBACK.md` |

  plus the round table for the complete ride (`soundv1` row) and the paragraph above on
  why the parts are sideways links.
- `ride_master.py`: constants block at the top (`P = 15.43`, `SR_OFFSET = 5.3`,
  `SCENE_SPLIT = 14.0`, `GS_LEN = 12.3`, `RIDE_T0 = 3.80`, `RIDE_DUR = 7.58`,
  `E5_CONTENT = [12.50, 14.51, 16.35, 18.21, 20.08]`, `GAIN = 1.5`, `TEMPO = 1.0`,
  `FADE_IN = (5.3, 0.15)`, `FADE_OUT_END = 26.3`, `FADE_OUT_LEN = 0.5`, `ENGINE =
  "salamander"`), imports `BASS`, `VOICE_A`, `MELODY` from
  `piano/projects/interstellar/soundtrack.py`, `_midi`/`_events` from
  `fluid_soundtrack.py` (or copies them — 8 lines), the per-layer gains from
  `salamander_soundtrack.py`, builds the three layers, windows, slices, writes:
  `soundv1/ride_master_v1.wav`, `../start-ride/soundv8/soundtrack_v8.wav`,
  `../gates-saving/soundv9/soundtrack_v9.wav`. Prints: the τ of every note it scheduled
  per layer (so the report can be checked against §3's table), each layer's peak, the
  master peak and any global scale factor.
- `soundv1/FEEDBACK.md`: the §3 table, the loop-point ruling in three lines, the
  answers it is built on (Q1–Q4, Q6, Q6b, Q7 as above), what to listen for (the seam at
  τ = 14.0 — should be inaudible; the loop coming round at GS 7.04; the five pulses —
  whether the first reads as "go" and the last as "finish" rather than as extra gates;
  the music under gates-saving's intro, Nathan's "I want to hear how it sounds"), and
  the one structural question worth his word ("parts are sideways links, not nested —
  say if you want them nested"). Empty "Nathan's feedback".
- `soundv1/concat.txt`, `soundv1/ride_v1_silent.mp4`, `soundv1/ride_v1.mp4` — §4c.

### 4b. Per-scene rounds (the slices)

`start-ride/soundv8/` and `gates-saving/soundv9/` — the next free round folders today
(start-ride has soundv1–7, gates-saving soundv1–8; the Salamander brief no longer creates
any round, so these numbers are fixed — stop trigger if either exists). Each holds the
slice WAV, the mux, a short `FEEDBACK.md` that says "slice [0–14.0 s] / [14.0–26.3 s] of
`ride/soundv1/ride_master_v1.wav`, rendered with Salamander — judge the join in
`ride/soundv1/ride_v1.mp4`; this file exists so the scene's own round table stays
complete", and a row in each scene README's table (`start-ride/README.md` after line 17;
`gates-saving/README.md` as a new `**Update:** soundv9 (2026-09-20)` paragraph after the
soundv8 one at line 64). Mux lines (from each round folder), same as every round:

    ffmpeg -y -i ..\..\..\silent-studio\all-renders\start-ride_v4.mp4 -i soundtrack_v8.wav -c:v copy -c:a aac -b:a 192k -shortest start-ride_v4_with_sound_v8.mp4
    ffmpeg -y -i ..\..\..\silent-studio\gates-saving\rounds\v8\gates-saving_v8.mp4 -i soundtrack_v9.wav -c:v copy -c:a aac -b:a 192k -shortest gates-saving_v8_with_sound_v9.mp4

where `rounds/v8/gates-saving_v8.mp4` is the surge brief's round *as rendered by Nathan*
(its `FEEDBACK.md` says "Render file: … (rendered)"). Stop trigger: that render does not
exist, or `ffprobe` says its duration is not 12.300000. Also replace
`audio-studio/all-renders/gates-saving_v6_with_sound_v3.mp4` and
`start-ride_v4_with_sound_v2.mp4` with the two new muxes (the `all-renders/` convention
in `structure.md` — every round, no quality gate); superseded files go to
`Qualifire\_to_delete\`, never deleted.

### 4c. `ride_v1.mp4`

    # ride/soundv1/concat.txt
    file '../../../silent-studio/all-renders/start-ride_v4.mp4'
    file '../../../silent-studio/gates-saving/rounds/v8/gates-saving_v8.mp4'

    ffmpeg -y -f concat -safe 0 -i concat.txt -c copy ride_v1_silent.mp4
    ffmpeg -y -i ride_v1_silent.mp4 -i ride_master_v1.wav -c:v copy -c:a aac -b:a 192k -shortest ride_v1.mp4

Both sources are 1920x1080 / 30 fps / h264 from the same `render.ps1` pipeline (the
teaser's v7/v8 stream-copy concat of these same kinds of renders is the precedent).
Do **not** concat the two per-scene muxes — AAC framing at the join is not
sample-exact. Copy `ride_v1.mp4` to `audio-studio/all-renders/ride_v1.mp4`.

## 5. Stop-on-ambiguity triggers

`ride/`, `start-ride/soundv8/` or `gates-saving/soundv9/` exists; `window_mix.py`,
`salamander_render.py` or `salamander_soundtrack.py` (with its gain constants) is
missing (Salamander brief not landed → stop); the landed `index.html`'s `RIDE_T0 +
PULSE_T` differ from §3's five E5 video times by > 10 ms, or its `GATES` are not
`[0.25, 0.50, 0.75]`; `rounds/v8/gates-saving_v8.mp4` missing or duration ≠ 12.300000;
the master peaks above −1 dBFS after the single global scale; the onset scan in §6
misses any expected onset or finds an extra one.

## 6. Verification (executor — numbers)

1. `ride_master_v1.wav`: 1 159 830 samples, mono, 44 100 Hz, peak ≤ −1 dBFS (report it
   and any global scale factor). RMS of 0–5.2 s = −180 dBFS (digital silence); RMS of
   26.25–26.30 s ≤ −40 dBFS and the final sample |x| < 0.001 (the fade has landed).
2. **Onset scan** (20 ms RMS, +6 dB over two windows back, floor −45 dBFS, 0.25 s
   refractory — the same scan as the Salamander brief §4.3) on the master must return,
   within ±30 ms, exactly these **16**: 5.61, 7.44, 9.33, 11.24, 13.18, 15.36, 17.14,
   17.80, 19.15, 19.81, 21.04, 21.65, 22.87, 23.51, 24.76, 25.38 — and **nothing else**
   ≥ −45 dBFS (in particular no onset in 13.8–14.2 = the seam, and none at 6.22 / 8.08 /
   9.95 / 11.91 / 13.87 / 15.98 = the un-rendered E5 positions).
3. **Pulse parity:** the five E5 onsets 17.80 / 19.81 / 21.65 / 23.51 / 25.38 minus 14.0
   must equal `RIDE_T0 + PULSE_T[k]` from the landed `index.html` to ±10 ms (3.80 / 5.81
   / 7.65 / 9.51 / 11.38). Report all ten values.
4. **Slice parity:** `soundtrack_v8.wav` = 617 400 samples and byte-identical to the
   master's first 617 400 samples (numpy `array_equal`); `soundtrack_v9.wav` = 542 430
   samples, identical to the master's next 542 430. The first slice's onsets (5.61 / 7.44
   / 9.33 / 11.24 / 13.18) match today's `soundtrack_v7.wav` scan (5.60 / 7.44 / 9.32 /
   11.24 / 13.18) — the first ride is musically unchanged (instrument aside).
5. `ffprobe` durations: `ride_v1_silent.mp4` and `ride_v1.mp4` 26.300000; frame count
   789 at 30 fps (`-count_frames -show_entries stream=nb_read_frames`); the two
   per-scene muxes 14.000000 / 12.300000.
6. **Not applicable, do not run:** `app/` tests, `tsc`.
7. Listening is Nathan's; the executor reports no opinion on the seam or the loop.

## 7. Report format

Files created (paths); the constants block of `ride_master.py` verbatim; the scheduled
note list per layer (τ) verbatim; §6.1–6.5 outputs verbatim; one sentence per §5
trigger.
