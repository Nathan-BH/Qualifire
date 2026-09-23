# Cycle 16 — the Tunetank track as the ride's soundtrack (start-ride + gates-saving), E5 pulses kept for the gates

> **Executed 2026-09-23 (all four briefs; Inspect PASS).** Items A, B, D and the alignment tool landed and were independently re-run by fresh Opus inspectors; a fix pass corrected the tool's shown-frame readout, time readout, last-frame clamp, nudge drift and some FEEDBACK wording. `audio-studio/all-renders/` now holds 3 sounded (Tunetank) + 4 silent renders, no synthesised audio. Remaining for Nathan: listen to `ride/soundv2/ride_v2.mp4` and `brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4`; nudge T1 = 3.80 with the tool if needed.


## Revised 2026-09-23 after Nathan's answers (`questionsfornathan.md`)

- **Q1 → `T1` is now 3.80 s, not 3.20.** Nathan: play is pressed while the yellow START box
  fades out (3.55–4.00 s in `silent-studio/start-ride/index.html`), not on the click. 3.80 =
  frame 114 at 30 fps, where the camera push-in starts; music audible from 5.06, decrescendo
  begins 14.90 (still inside the zoom-out). Every derived number in this README and in
  `BRIEF-tunetank-ride-soundtrack.md` (§2, §3 code, §6 expected output, md5s) re-measured on
  Nathan's PC with the new constant. §1 below keeps the old candidate table as history.
- **Q1 → a third brief, `BRIEF-av-alignment-tool.md`:** Nathan's media player cannot step
  frames, so he asked for a tool to align audio against video himself — a single offline HTML
  file with frame stepping, a waveform, an offset control and "Save copy" (his chosen numbers
  baked into a copy the coordinator can diff). Independent of the two renders.
- **Q2 → (a) confirmed**, overgang left empty (now ≈ 15.4–17.8 s).
- **Q3 → `GAIN_E5 = 1.5` / `GAIN_BED = 0.45`** as built; nudge later.
- **Q4 → licence:** per Nathan, both Tunetank tracks are free and usable without copyright
  issues — his statement, recorded as such; the "do not publish until confirmed" gate is
  dropped. No agent verified a licence.
- **Q5 → CLOSED (second revision, below).** First revision: Nathan wanted it explained in chat
  with full paths; the wording changed so nothing is "superseded" — Tunetank is one more
  development round; `marketing/audio-studio/ride/soundv1/` (the synthesised round) stays on disk.
- **Q6 → confirmed:** item B targets `marketing/audio-studio/brandmark/opening/`.
- **Q7 → cycle 15 is cancelled entirely** (`../15_ride-surge-fix-and-audio-tooling/`, nothing
  of it ever ran): opening = the piano track alone, no logo-reveal swap on closing, no
  `synth.py` edits, no surge inversion. Every "cycle 15's closing swap goes ahead" line below
  is reversed; the soundv3 collision is gone. (Closing's own fate: second revision, below.)
- **Q8 → nothing kept**, with a caveat: Nathan judged the *teaser's* soundv2, a different file
  from opening's soundv2 (same synthesised elements, though — verified in `teaser/soundtrack.py`).
- **Q9 → `GAIN = 0.85`** as designed; nudge later.
- `all-renders/` handling and `_to_delete/` names reworded in both briefs ("replaced in
  all-renders by", never "superseded"); the round folders keep every earlier round.

**Second revision, 2026-09-23 (later the same day), after two more instructions from Nathan:**

- *"i do not wish to move forward with any of the synthesized sounds, so the renders that
  contain should be superseeded with a new round that either removes it or applies any of the
  new sounds i have decided on in cycle016."* → **no synthesised (`synth.py`) sound moves
  forward anywhere.** All seven files in `marketing/audio-studio/all-renders/` carry it today
  (verified: every one has an aac stream from a `synth.py` round). Ride (item A) and opening
  (item B) already replace theirs with the cycle-16 recordings; the other four scenes —
  closing, colours, ranking, teaser — get a **silent round** via the new
  `BRIEF-retire-synth-renders.md` (item D), because no cycle-16 sound fits them (the piano
  logo is still at −19 dBFS at closing's 4.0 s cut; nothing was chosen for colours/ranking;
  the teaser's cut is being re-sounded piecemeal). Older rounds stay on disk, untouched, as
  reference. Per-scene end state: the table below.
- Q5 → **CLOSED**: *"i agree to keep the previous round there for reference and just make the
  tuneank version a round2 of the ride family."* Round 1 (`ride/soundv1/` + its slices
  `start-ride/soundv8/`, `gates-saving/soundv9/`) stays as reference, not as a selectable
  alternative; Tunetank = **round 2** (`ride/soundv2/`, `start-ride/soundv9/`, `gates-saving/soundv10/`).
- Item B's "closing untouched / opening and closing now sound different" lines → closing gets
  the silent round; the "brand chime stays in `synth.py` for closing and the teaser" wording
  is withdrawn (it stays in the file, unused by any new round).
- Item A: one explicit line that its E5 gate pulses are **Salamander piano samples**
  (`piano/samples/salamander/`, real recordings rendered by `salamander_render.py`), not
  `synth.py`; `ride_master.py` imports only the `NOTES` pitch table from `synth.py`. Nathan
  confirmed the pulses in Q3.
- Decision notes (2–4 lines, dated) added at the top of `marketing/audio-studio/structure.md`
  and `marketing/audio-studio/APPROACH.md`: the `synth.py` direction is dropped, no new round
  uses it, earlier rounds stay for reference, pointer here.

### Final state after cycle 16, all seven scenes

| scene | new round (folder / file) | sound source | replaces in `audio-studio/all-renders/` | brief |
|---|---|---|---|---|
| start-ride | `start-ride/soundv9/start-ride_v4_with_sound_v9.mp4` | Tunetank ride track (slice 0–14.0 s of `ride/soundv2/ride_master_v2.wav`) | `start-ride_v4_with_sound_v8.mp4` | A |
| gates-saving | `gates-saving/soundv10/gates-saving_v8_with_sound_v10.mp4` | Tunetank ride track + Salamander-sample E5 pulses (slice 14.0–26.3 s of the same master) | `gates-saving_v8_with_sound_v9.mp4` | A |
| brandmark/opening | `brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4` | Tunetank piano logo | `opening_v3_with_sound_v2.mp4` | B |
| brandmark/closing | `brandmark/closing/soundv3/closing_v4_no_sound_v3.mp4` | none (silent; picture moves v3 → v4) | `closing_v3_with_sound_v2.mp4` | D |
| colours | `colours/soundv2/colours_v4_no_sound_v2.mp4` | none (silent; picture moves v2 → v4) | `colours_v2_with_sound_v1.mp4` | D |
| ranking | `ranking/soundv4/ranking_v7_no_sound_v4.mp4` | none (silent; picture v7 unchanged) | `ranking_v7_with_sound_v3.mp4` | D |
| teaser | `teaser/soundv3/teaser_v8_no_sound_v3.mp4` | none (silent; picture moves v6 → v8; applying A's and B's sounds to the cut is a later follow-up) | `teaser_v6_with_sound_v2.mp4` | D |

(`ride/soundv2/ride_v2.mp4`, the standalone 26.3 s concat, is item A's family-level output
and is not an `all-renders/` file.) Every replaced file goes to `_to_delete/` under the
`all-renders_<old>_replaced_in_all-renders_by_…` naming; every earlier `soundvN/` folder is
left as it is.

### Briefs in this folder and the order to run them

| Brief | Builds | Depends on | Order |
|---|---|---|---|
| `BRIEF-tunetank-ride-soundtrack.md` (item A) | `ride/soundv2`, `start-ride/soundv9`, `gates-saving/soundv10`, `ride_v2.mp4` | nothing open (`T1 = 3.80` default) | first — Nathan needs a render to judge `T1` against |
| `BRIEF-tunetank-piano-logo-opening.md` (item B) | `brandmark/opening/soundv3` | nothing open | any time; disjoint files from A |
| `BRIEF-retire-synth-renders.md` (item D) | silent rounds `brandmark/closing/soundv3`, `colours/soundv2`, `ranking/soundv4`, `teaser/soundv3` | nothing — copies of existing silent renders + docs | any time; disjoint from A, B and C |
| `BRIEF-av-alignment-tool.md` (item C) | `audio-studio/tools/av-align/av-align.html` (+ README, tests) | nothing; loads any video + WAV from pickers | any time — before or after A. Built **after** A, Nathan opens `ride_v2_silent.mp4` + `ride_master_v2.wav` in it and nudges; built **before** A, he can only judge the raw mp3 against the silent concat, which works too (the tool takes an mp3). Either way a nudge is a one-constant re-run of A's §4 (`T1`, line 66 of `ride_tunetank.py`), no new round number unless the coordinator says so. |

> **Two items in this folder** *(now four — see the table above; the text below predates the
> revision where it says "two")*. Item A (this section, `BRIEF-tunetank-ride-soundtrack.md`) is the
> ride. **Item B** — a different composition, `brandmark/opening`, Nathan's second Tunetank
> track (the piano logo) as its whole soundtrack, `BRIEF-tunetank-piano-logo-opening.md` — is
> filed below the rule at the end of this file (added 2026-09-23, second Plan pass), together
> with the cross-cycle-15 conflict it raises. Questions Q6–Q9 in `questionsfornathan.md` are item B's.

**Status (2026-09-23, Plan pass, revised twice the same day after Nathan's answers): four
finished briefs, ready to execute — nothing built, no WAV, no mp4, nothing under
`audio-studio/` or `silent-studio/` touched.** Nathan watched
`audio-studio/ride/soundv1/ride_v1.mp4` (the 26.3 s start-ride + gates-saving clip under
`ride_master.py`'s synthesised Salamander piano) and found a stock track he likes better:
`audio-studio/piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3`
(481 489 bytes, 15.047 s, stereo). His words, verbatim:

> i think this soundtrack would actually be a great fit for ride_v1.mp4. It should start
> only after the click, when the actual ride starts, and when i do it manually it runs
> exactly for the duration of the rides and the sound fades out exactly when the rides zoom
> out for gates saving, so it is perfect for the first part. Then there is some overgang i
> dont know what to do with. But then the sound should start playing again for the second
> ride, for which we can add on top only the "second track, of the interstellar notes we
> already have just to punctuate the gates". Thats my idea so far.

("Overgang" = the transition between the two rides. He is explicitly flagging that he has
no plan for it — so this cycle gives it a default and asks, rather than deciding.)

## What this cycle covers

| # | Nathan's point | Answer / file | Status |
|---|---|---|---|
| 1 | "start only after the click, when the actual ride starts … fades out exactly when the rides zoom out" — and, Q1 answer: "starting play together with the click is too soon. We can press play while the yellow START box is fading out" | Timing worked out numerically (§1 below): the file's t = 0 goes at **`T1 = 3.80` s**, inside the START box's fade-out (3.55–4.00 s; frame 114, where the camera push-in starts); its 1.26 s quiet intro rises under the push-in, the music is audible from **5.06 s** (7 frames before the rider moves at 5.30), the body runs under the whole ride, and its own decrescendo (file 11.1–15.0 s) lands on **14.9–18.85 s** — it starts fading inside gates-saving's 1.0 s zoom-out lead-in (14.0–15.0), with 0.1 s to spare. No fade applied on ride 1; the tail is the file's own. Nathan nudges `T1` with the alignment tool (item C) if the feel is off. | in `BRIEF-tunetank-ride-soundtrack.md` §2.1; `questionsfornathan.md` Q1 resolved |
| 2 | "some overgang i dont know what to do with" | Between the first pass fading below −25 dBFS (15.44 s) and the second ride's start pulse (17.80 s) there are ~2.4 s where only the file's own tail rings. **Nothing added** (Q2: "Lets add nothing for now") — the second placement's own quiet intro is used as the pre-roll into the attack, so the "overgang" is the two quiet ends of the same file overlapping at about −36 to −39 dBFS around 16.5–17.5 s. Two alternatives stay named for later (a key-matched pad; a soft ping per gate tick drawing in). | confirmed — `questionsfornathan.md` Q2 |
| 3 | "start playing again for the second ride … add on top only the second track of the interstellar notes … to punctuate the gates" | Same file placed again with its first full-scale transient **on** the ride-2 start pulse (file t = 0 at 17.80 − 1.26 = **16.54 s**). `ride_master.py`'s five E5 pulses (17.80 / 19.81 / 21.65 / 23.51 / 25.38 — start, three gates, finish) layered on top through the same sample/gain chain, *imported* from `ride_master.py` so they cannot drift. **These pulses are Salamander piano samples** (real recordings in `piano/samples/salamander/`, rendered by `salamander_render.py`), not `synth.py` synthesis — `ride_master.py` takes only the `NOTES` pitch table from `synth.py`; Nathan confirmed them in Q3, and they are unaffected by his "no synthesised sounds" decision. The file would still be at full level when the video ends, so this instance gets a manual 1.0 s fade to 26.3 s. | in the brief §2.3–2.4 |
| 4 | gain (not asked, needed) | The coordinator's "+3.07 dBFS" peak was ffmpeg's −3 dB-per-channel sum downmix ((L+R)/√2 = 2.0138/1.414 = 1.4239 — checked); the file's real stereo peak is 1.0435 (+0.37 dBFS). Bed gain **0.45** (layer peak −6.4 dBFS), E5 chain unchanged (peak −6.0 dBFS): master peak **−1.39 dBFS** (0.8520) at 17.871 s, under the −1 dBFS ceiling with no guard scaling. Stereo master. Q3: defaults confirmed, nudge later. | in the brief §2.5 |
| — | licensing | Per Nathan (Q4, 2026-09-23): "the sound is free and can be used without copyright issues" — his statement, recorded in the rounds' `FEEDBACK.md`; no agent verified a licence; the earlier publish gate is dropped on his word. | `questionsfornathan.md` Q4 |
| — | `marketing/audio-studio/ride/ride_master.py` and round 1 (`ride/soundv1/`) | Kept on disk, untouched, **for reference** (Nathan, Q5); the new module is a sibling, not a flag on it. Tunetank is **round 2** of the ride family. No synthesised sound moves forward. | `questionsfornathan.md` Q5 — closed |

## 1. Where the track starts — the worked comparison

Every time below is on the video's combined clock (start-ride 0–14.0 s, gates-saving
14.0–26.3 s), read from the two `index.html` files on disk: START click 3.20 s, camera
push-in 3.8–5.1, rider moves 5.3–13.8, scene cut 14.0, gates-saving zoom-out lead-in
14.0–15.0, landmark rings 15.05–15.25, caption A + gate ticks 15.6–18.9, ride 2 17.80–25.38.

The file, re-measured on Nathan's PC in stereo at 1–100 ms resolution (the coordinator's
0.5 s table was right in shape, this is the finer version):

| file time | what |
|---|---|
| 0.00–0.88 | digital-quiet head (first sample above −20 dBFS at 0.88 s; nothing above −40 before 0.44) |
| **1.26** | first full-scale transient — the audible "start" |
| 1.26–11.1 | sustained body, 100 ms RMS −5 … −10 dBFS, no internal arc |
| 11.1 → 15.0 | one clean decrescendo: −7 dBFS at 11.0, −13 at 11.5, −19 at 12.0, −24 at 12.5, −26 at 13.0, −31 at 13.4, −34 at 14.0, −40 at 14.5, −45 at 15.0 |
| 15.047 | end of file |

"Fades out exactly when the rides zoom out for gates saving" = the decrescendo *starts*
inside the 14.0–15.0 zoom-out. That pins the file's t = 0 to **T ∈ [2.9, 3.9]**
(T + 11.1 ∈ [14.0, 15.0]). Candidates *(Plan-pass table, kept as history — Nathan's Q1
answer ruled the click out; the revised table and ruling follow it)*:

| hypothesis | file t = 0 at | audible attack | fade starts (T + 11.1) | −19 dBFS (T + 12.0) | file ends | verdict |
|---|---|---|---|---|---|---|
| **H1 — play pressed on the click** | **3.20** | 4.46 (during the push-in, 0.84 s before the rider moves) | **14.30 — inside the zoom-out** | 15.20 | 18.25 | **fits both sentences**; the body (4.46–14.3) brackets the ride (5.3–13.8) by < 1 s each side |
| H1′ — click + human reaction | 3.4–3.5 | 4.7 | 14.5–14.6 | 15.4–15.5 | 18.5 | same as H1; 3.20 is the only *named* beat in the window, so the brief uses it |
| H2 — play pressed as the rider moves | 5.30 | 6.56 | 16.40 — during caption A | 17.30 | 20.35 | no: still fading when ride 2 starts at 17.80 |
| H3 — the *attack* on the click (intro trimmed) | 1.94 | 3.20 | 13.04 — while the rider is still riding | 13.94 | 16.99 | no: fade is 1.0 s early and mostly over at the cut; contradicts "runs exactly for the duration of the rides" |
| H4 — the *attack* as the rider moves | 4.04 | 5.30 | 15.14 — 0.14 s after the zoom-out ends | 16.04 | 19.09 | close second: fits "when the actual ride starts" literally, but at the zoom-out the track is still at full level and the fade then runs under the rings / caption A instead |

~~**Ruling: H1, T1 = 3.20.**~~ *Plan-pass ruling, withdrawn 2026-09-23 — kept as history.*
Nathan's answer to Q1: "starting play together with the click is too soon. We can press
play while the yellow START box is fading out." The box fades 3.55–4.00 s (`index.html` line
240, `opacity → 0, 0.45 s, power1.in` from pre-shift 2.55), so the new window is
**`T1 ∈ [3.55, 4.00]`**; his earlier fade sentence (decrescendo starts inside 14.0–15.0)
keeps `T1 ≤ 3.90`. Measured on the real build, one constant changed each time:

| `T1` (frame @ 30 fps) | START box | audible from | decrescendo begins | < −25 dBFS | file ends | ride-2 attack | master peak |
|---|---|---|---|---|---|---|---|
| 3.5667 (107) — window start | first full frame of the fade | 4.83 | 14.67, inside the zoom-out | 15.26 | 18.61 | 17.80 (unchanged) | 0.8540 (−1.37) |
| **3.80 (114) — new default** | opacity ≈ 0.7; camera push-in starts | **5.06** | **14.90, inside the zoom-out** | 15.44 | 18.85 | 17.80 (unchanged) | **0.8520 (−1.39)** |
| 4.00 (120) — window end | last frame, box gone | 5.26 | 15.10 — 0.1 s after the zoom-out ends | 15.64 | 19.05 | 17.80 (unchanged) | 0.8595 (−1.32) |
| 4.04 — H4, just outside | box gone; attack on the rider's start | 5.30 | 15.14 | 15.68 | 19.09 | 17.80 (unchanged) | 0.8519 (−1.39) |

**Ruling (revised): `T1 = 3.80`.** It is inside Nathan's window, it is the only named beat
there (the camera push-in tween starts at 3.8 "as the START overlay clears"), it is a whole
frame, the box is unmistakably mid-fade (opacity ≈ 0.7), the attack lands seven frames
before the rider moves, and the decrescendo still begins inside the zoom-out. The honest
cost: with a later `T1` more of the audible fade happens under the rings (15.05–15.25) and
caption A than under the zoom-out itself; if that reads late on `ride_v2.mp4`, 3.5667 is the
earliest value that still obeys his rule. The second pass is anchored to the ride-2 start
pulse (`T2 = 17.80 − 1.26`), not to `T1`, so it does not move. Nathan picks the final value
with the alignment tool (item C) — a one-constant re-run.

## 2. The design, in numbers (all dry-run on Nathan's PC — the brief's §6 output)

- **Bed, ride 1:** whole file, stereo, t = 0 at **3.80 s** (sample 167 580), gain 0.45, no
  fade. Master RMS: −52 dBFS at 3.8–4.6 (the quiet head), −16 at 5.0–5.2 (attack), −17.3
  at 14.0–14.5, −17.1 at 14.5–15.0, −22 at 15.0–15.5, −27 at 15.5–16.0, −36 at 16.5–17.0,
  −39 at 17.0–17.5. (Re-measured 2026-09-23 with the new `T1`.)
- **Overgang (confirmed empty):** nothing added. The first pass's tail and the ride-2
  placement's own head overlap at −36…−39 dBFS (16.5–17.5) and rise through −29
  (17.5–17.8) to the attack.
- **Bed, ride 2:** whole file again, t = 0 at 16.54 s (sample 729 414) so the 1.26 s
  attack lands at 17.800 (the ride-2 start pulse); gain 0.45; linear 1.0 s fade ending at
  26.3 (26.0–26.2 = −30 dBFS, 26.25–26.3 = −46, last frame 0). At the video's end the
  file is at its own 9.76 s — still in the body, so the manual fade is required (its
  natural decrescendo would fall at 27.6–31.5 s).
- **E5 layer:** `ride_master.py`'s five pulses via the same `_e5_events()` /
  `salamander_render.render(velocity=105, gain=GAIN_VOICE_E5)` × `GAIN = 1.5`, faded 0.5 s
  to 26.3 like soundv1's master. Measured lift at each pulse (60 ms after vs 60 ms
  before): +14.3 / +8.0 / +7.4 / +6.1 / +5.1 dB — audible over the bed, not dominant.
- **Levels:** bed layer peak 0.4803 (−6.37 dBFS), E5 layer 0.5025 (−5.98), master
  0.8520 (**−1.39 dBFS**) at 17.871 s, no guard scaling. The sweep behind 0.45: bed
  0.60 → −0.01 dBFS (over), 0.50 → −0.90 (over by 0.1 dB), 0.45 → −1.39 (clear), 0.40 →
  −1.91, all with the E5 chain as is; E5 at 1.7× clears only with the bed ≤ 0.40, E5 at
  2.0× not even at 0.35.
- **Outputs:** stereo 16-bit 44.1 kHz — `ride/soundv2/ride_master_v2.wav` (1 159 830
  frames = 26.300000 s), slices `start-ride/soundv9/soundtrack_v9.wav` (617 400) and
  `gates-saving/soundv10/soundtrack_v10.wav` (542 430), array-equal to the master's halves.
  The muxes and the standalone `ride_v2.mp4` were also dry-run (26.300000 s, aac stereo).

## Implementation order

1. **Execute `BRIEF-tunetank-ride-soundtrack.md`** (Sonnet, stop-on-ambiguity, **on
   Nathan's PC through `device_bash`** — the mp3 decode needs ffmpeg and the outputs must
   land there). One new module + one check script, three WAVs, three muxes, round docs,
   `all-renders/` swap. Inspect (fresh Opus) reruns §6 itself.
2. **Execute `BRIEF-av-alignment-tool.md`** (Sonnet; one HTML file + a README + a node
   test file; executor-verifiable parts are unit tests, the sync feel is Nathan's). Can run
   before step 1 too — see the table at the top.
3. Nathan watches `ride/soundv2/ride_v2.mp4`; if `T1` feels off he opens the tool with
   `ride/soundv2/ride_v2_silent.mp4` + `ride/soundv2/ride_master_v2.wav`, nudges, presses
   "Save copy", and the coordinator diffs his copy → one-constant re-run of step 1's §4.
4. **Execute `BRIEF-retire-synth-renders.md`** (Sonnet, on Nathan's PC; copies + docs only)
   — any time, independent of 1–3. After it and A and B, `audio-studio/all-renders/` holds
   no synthesised audio (table at the top).

**Not in this cycle:** any change to either `index.html` (the animation is untouched; all
timings are read from disk); **anything from cycle 15** (`../15_ride-surge-fix-and-audio-tooling/`
— cancelled by Nathan 2026-09-23 in full, nothing of it ever executed: no surge inversion,
no `gates-saving_v9` render, no logo-reveal swap on opening *or* closing, no `synth.py`
numpy fallback; the folder is history); a *sounded* teaser (item D makes it silent; applying
A's and B's recordings to its cut is a later follow-up); the ~28 ms Salamander lead (unchanged, still
Nathan's call); `SOUNDTRACK-RICHNESS-OPTIONS.md` paths A–D (Nathan's Tunetank find answers
that question for the ride in practice).

## Rulings made in this cycle

1. ~~**T1 = 3.20 (the click)**~~ → **`T1 = 3.80`, inside the START box's fade-out** — §1,
   revised on Nathan's Q1 answer; the tool (item C) is how he nudges it.
2. **The overgang is left empty** — Q2 confirmed by Nathan. Adding a pad would need
   a key analysis of the track and risks a clash; adding pings per gate-tick contradicts
   "add on top *only* the second track … to punctuate the gates" for ride 2.
3. **Ride 2 uses the file's own head as its pre-roll** (t = 0 at 16.54) rather than a hard
   cut-in at the attack: it costs nothing, avoids a synthetic fade-in, and the attack is
   still sample-placed on the start pulse.
4. **Stereo master.** The file is real stereo (L/R correlation 0.52); the E5 layer is
   mono and goes to both channels. The mono slices convention (soundv1) changes for this
   round only; the muxes become aac stereo.
5. **New sibling module `ride_tunetank.py`, not an `ENGINE` flag on `ride_master.py`.**
   Different construction (a recording placed twice vs a note list rendered), and
   `ride_master.py` must keep reproducing round 1 (`ride/soundv1/`) byte-for-byte. The E5
   timing and gains are imported from it — one source of truth. Round 1 stays on disk for
   reference (Q5, closed); "superseded" is not a word this cycle uses.
6. **Gain 0.45 chosen so the −1 dBFS guard is not needed**, mirroring cycle 15's rule that
   the guard is a safety net, not the mix.

## Model-tier readout (this pass)

| Tier | Model | Tokens (approx) | Outcome |
|---|---|---|---|
| Digest | — | — | not dispatched: the coordinator read `ride_master.py`, `window_mix.py`, both `index.html` files and ran the first ffmpeg/numpy pass on the track itself, and handed those facts to Plan |
| Plan | Fable (claude-fable-5-1) | ~70k in context, ~14k written | 3 files in this folder. On Nathan's PC: track re-measured in stereo (the +3.07 dBFS was a downmix artefact), attack pinned to 1.26 s, five start-time hypotheses tabulated, bed/E5 gain sweep against the ceiling, the whole module dry-run from a scratch mirror (three WAVs, three muxes, concat, all probed), the §6 check script run to produce the pass values now in the brief. ~20 tool calls. |
| Plan (revision 2) | Fable (claude-fable-5-1) | (coordinator's figure) | 2026-09-23, after "no synthesised sounds" + Q5 closed: `BRIEF-retire-synth-renders.md` written (four silent rounds; bases, md5s, round numbers and anchors verified on disk), per-scene end-state table, Q5/Q7/Q8 wording, Salamander line, decision notes in `structure.md` / `APPROACH.md`. |
| Plan (revision) | Fable (claude-fable-5-1) | (coordinator's figure) | 2026-09-23, after Nathan's answers: `T1` window read from `index.html`, eight `T1` values built and measured from a fresh scratch mirror (`$HOME/tt16/mirror/`), the new `ride_tunetank.py` / `check_tunetank.py` run and their md5s + §6 output recorded; gain sweep re-run; cycle-15 state checked on disk; `BRIEF-av-alignment-tool.md` written; all four docs revised. |
| Execute | Sonnet | — | not yet dispatched |
| Inspect | Opus | — | not yet dispatched |

Checkable artifacts of this pass: the three files here; every number in the brief's §1,
§2 and §6 is reproducible on Nathan's PC from the brief's own code (the executor's §6 run
must reproduce §6.1 to the digit).

---

# Cycle 16, item B — the Tunetank *piano logo* track as brandmark/opening's whole soundtrack

**Status (2026-09-23, second Plan pass; revised the same day after Nathan's Q6–Q9): a
second finished brief in this folder, `BRIEF-tunetank-piano-logo-opening.md`, ready to
execute — nothing built, nothing under `audio-studio/` or `silent-studio/` touched.
Q6 confirmed (opening), Q7 resolved by cancelling cycle 15 entirely, Q8 nothing kept
(with a caveat), Q9 0.85.** Filed here at Nathan's request. It is a
**different composition** from item A above (`brandmark/opening`, 6.5 s — not the ride) and
independent of it: the two briefs share a folder and a music library, nothing else. Nathan's
message, verbatim (he pasted the mp3 path twice; the second was evidently meant to be a
render path):

> use the "C:\Users\natha\Downloads\tunetank-piano-logo-484286.mp3" for the "[same path]"
> render. If applied correctly which i think is just starting the two at the same time it is
> an exact perfect match. The audio file runs a bit longer but at that point it is already
> silent (you can confirm by looking at the "...audio-studio/piano/projects/tunetank" folder
> waveform analysis which is already done)

## Item B coverage

| # | Nathan's point | Answer / file | Status |
|---|---|---|---|
| B1 | which render (path pasted twice) | **`brandmark/opening` (`opening_v3.mp4`, 6.5 s)** — by his own "runs a bit longer but at that point it is already silent": at 6.5 s the file is at −52 dBFS (audible window ended 5.95 s); closing's 4.0 s cut would land at −19 dBFS, mid-ring-out. §A below. | brief §1.3; Q6 **confirmed** by Nathan ("it was the opening") |
| B2 | "just starting the two at the same time … an exact perfect match" | Confirmed numerically: file t = 0 on video t = 0, no trim, no offset. The piece's own last two re-strikes land 22 ms before the wordmark tween (2.95) and 97 ms before the tagline (3.35); its opening chord (0.668) falls halfway through the ring draw; its decay carries the hold and is at −37…−44 dBFS under the fade to black. Beat table in the brief §1.4. | brief §1.4, §2.1 |
| B3 | "runs a bit longer" (8.44 s file, 6.5 s clip) | 1.94 s of tail cut, all below −43 dBFS. The file is *not* digital silence at the cut (largest sample −37.7 dBFS in the last 50 ms), so a 0.5 s fade into 6.5 makes the last sample a true 0 — nothing he heard changes. | brief §2.4 |
| — | gain (not asked, needed) | The piano project's `WAVEFORM-NOTES.md` peak (0.9359, −0.58 dBFS) is a **mono average**; the stereo file peaks at **0.9997 (−0.00 dBFS)**, brickwall-limited (536 samples above 0.891). `GAIN = 0.85` → master peak 0.8497 (**−1.41 dBFS**); 0.89 is the ceiling. Stereo master (L/R correlation 0.06). | brief §2.3; Q9 **confirmed** (default, nudge later) |
| — | what happens to the synthesised `brandmark/opening/soundv2/` | **Nothing kept** — the recording is the whole soundtrack. §C below. Nathan's "nothing should be kept" was said of the *teaser's* soundv2 (a different file, same synthesised elements) — caveat in Q8. | brief §2.2; Q8 resolved-with-caveat |
| — | cycle 15's not-yet-executed brandmark plan | **Gone: cycle 15 cancelled entirely by Nathan** — no opening swap, no closing swap, no `synth.py` edits. Closing keeps `brandmark/closing/soundv2/`. §B below. | Q7 resolved |
| — | licensing | Per Nathan (Q4): free, usable without copyright issues — his statement, both tracks. | Q4 |

## A. Which render — the numeric argument (checked on Nathan's PC in stereo)

| candidate | clip length | file at the cut (50 ms RMS) | "already silent"? |
|---|---|---|---|
| **opening** (`opening_v3.mp4`) | **6.5 s** | **−52 dBFS**; audible window (−30 dBFS+) 0.34–5.95 s | **yes** — 1.94 s of tail cut, all under −43 dBFS |
| closing (`closing_v4.mp4`) | 4.0 s | −19 dBFS (3.2–4.0 s mean −15) | no — cut mid-ring-out |

And opening's timeline has no lead-in blackout (the ring draws from literal t = 0), so
"starting the two at the same time" is unambiguous: file t = 0 = video t = 0. Every beat
that results is in the brief §1.4; the short version is that the two text beats are hit by
the piece's own last two attacks (2.928 / 3.253 s vs tweens at 2.95 / 3.35), which is
presumably what made it sound like a perfect match by hand.

## B. The cross-cycle-15 conflict — resolved by Nathan: cycle 15 is cancelled

*(The Plan-pass text proposed "item B supersedes cycle 15 for opening only; cycle 15's
closing swap goes ahead as planned". Nathan's Q7 answer — "cycle015 will not be run; it is
closed" — cancels cycle 15 **entirely**, so that proposal is withdrawn.)*

What cycle 15 (`../15_ride-surge-fix-and-audio-tooling/`) planned, and its state on disk
2026-09-23:

| cycle-15 item | planned | executed? | cycle 16 now |
|---|---|---|---|
| part 1 `BRIEF-gates-surge-inversion.md` (re-shape `RIDE_PROFILE`, re-render `gates-saving_v9`) | yes | **no** — `silent-studio/all-renders/` still has `gates-saving_v8.mp4`, no v9 | cancelled; the ride brief's silent sources are fixed at `start-ride_v4` / `gates-saving_v8` |
| part 2 `SOUNDTRACK-RICHNESS-OPTIONS.md` | research doc only | n/a | closed doc; Nathan's Tunetank find answers it for the ride |
| part 3 `BRIEF-brandmark-logo-reveal-sfx.md`: opening swap O1–O6 | yes | **no** — `opening/soundtrack.py` still the 2026-09-13 file (sha256 in item B's §3) | cancelled; item B's `opening/soundv3` has no competitor |
| part 3: closing swap C1–C6 | yes | **no** — `closing/soundtrack.py` untouched, `closing/soundv2/` current | **cancelled** — no logo-reveal sample anywhere; closing gets a silent round (`closing/soundv3`, item D) instead of keeping the synthesised soundv2 |
| part 3: `synth.py` numpy-fallback edits S1–S3 | yes | **no** — `synth.py` mtime 2026-09-19, `lfilter = None` guard only (its lines 14–17) | cancelled; neither cycle-16 brief imports `synth.py`'s reverb (the ride brief imports `synth.NOTES` through `ride_master`, which works without scipy — verified) |
| part 3: new `brandmark/logo_reveal.py` | yes | **no** — file does not exist | cancelled; must not be created |
| `brandmark/sfx/logo-reveal.mp3` (Nathan's sample) | copied in | **yes — the file exists** (untracked) | left where it is, unused |

What cycle 16 *does* rely on, and none of it is cycle 15's: `audio-studio/window_mix.py`
and `audio-studio/salamander_render.py` (both cycle 14, 2026-09-20), `ride/ride_master.py`
(cycle 14), `synth.py` as of 2026-09-19 (its existing scipy guard). All present and unchanged.

Consequences, in both briefs: opening = the piano track alone (`opening/soundv3`); closing =
a **silent round** (`closing/soundv3`, item D — its synthesised soundv2 does not move forward
either, per Nathan's second instruction); no round-number rule between cycles is
needed any more (the two cycle-16 briefs use different scenes: `ride/soundv2` +
`start-ride/soundv9` + `gates-saving/soundv10` vs `brandmark/opening/soundv3`). The only
round-number rule left is the generic one: an executor stops if its target `soundvN/`
already exists. Opening (piano) and closing (silent) no longer share a sound — whether
closing later gets something to match (Q7 option (d)) is listed in item D §7, not decided.

## C. What was kept from the synthesised soundv2: nothing

Every soundv2 element occupies real estate the piano now fills: sweep + C2 pad under the
opening chord, swoosh under the arpeggio, the stinger on the very beats the piece's own
re-strikes hit, C3/G3 pad and plucks under the decay. Three reasons to keep none of it, in
order of weight: (1) "an exact perfect match" describes the recording as the composition;
(2) soundv2 is C-rooted mono synthesis, the piece is a wide-stereo D-major piano recording —
they clash in key and character; (3) the synthesised bed needs `synth.finish()` → scipy,
which Nathan's PC does not have (cycle 15's planned numpy fallback is cancelled) — keeping
none of it makes the new `soundtrack.py` scipy-free and `synth.py`-free. *Alternative
logged (Q8):* keep only the three trailing plucks (5.0–5.8 s) under the fade — they would
be audible over the −32…−37 dBFS decay, which is the problem (C-major plucks over a
D-major ring-out, on top of a track called complete). Not built; three lines later if
asked. `brandmark/opening/soundv2/` stays on disk as the earlier round and reproducible from git.

**Nathan's answer (Q8): "nothing should be kept" — with a caveat.** He did not know what
"soundv2" referred to and judged it by
`marketing/audio-studio/teaser/soundv2/teaser_v6_with_sound_v2.mp4`, which is a different
file from `marketing/audio-studio/brandmark/opening/soundv2/opening_v3_with_sound_v2.mp4`
(each scene has its own `soundvN` rounds). Checked in `audio-studio/teaser/soundtrack.py`
(lines 46–53): the teaser's first 6.5 s are built from the **same synthesised elements** as
the opening's soundv2 — the 220→660 Hz ring-draw sweep, the 0.55 s whoosh at 1.3 s, the
sub-hit + chime stinger at 2.95/3.35 s, the C2 / C3–G3 pads — at slightly lower amplitudes,
so his dislike transfers. The coordinator tells him in chat that a different file was
meant and lets him object; until then, nothing kept.

## Item B design, in numbers (dry-run on Nathan's PC from `$HOME/scratch16/`)

- **Placement:** whole file, stereo, `T0 = 0.0`, clipped at 6.5 s by `window_mix.place`;
  `GAIN = 0.85`; `window_mix.fade_out` over 6.0–6.5 s. No `synth.finish()`, no reverb, no
  limiter.
- **Output:** `brandmark/opening/soundv3/soundtrack_v3.wav`, stereo 16-bit 44.1 kHz,
  286 650 frames = 6.500000 s, peak 0.8497 (−1.41 dBFS) at 1.1912 s, last sample 0. Mux
  `opening_v3_with_sound_v3.mp4` dry-run: h264 + aac stereo, `duration=6.500000`.
- **Onsets in the master** (5 ms high-passed energy): 0.668, 1.477, 1.636, 2.125, 2.928,
  3.253 s — the Kyutai MIDI's 0.65 / 1.46 / 1.62 / 2.11 / 2.92 / 3.25 to ±10 ms.
- **Levels in the master** (mono-average, 50 ms RMS): −13.6 dBFS at 0.65, −15.3 at 2.95,
  −19.9 at 3.35, −34.8 at 5.1, −38.8 at 5.5, −43.9 at 5.95, −60.9 at 6.3 (in the fade);
  head 0.0–0.3 s −53 dBFS.
- **The check script** (brief §6.1) prints nine PASS lines and `ALL PASS`; its output at
  Plan time is in the brief and must be reproduced to the digit.

## Implementation order (item B)

1. ~~Decide Q7 first~~ — decided: cycle 15 cancelled, `opening/soundv3` is item B's.
2. **Execute `BRIEF-tunetank-piano-logo-opening.md`** (Sonnet, stop-on-ambiguity, **on
   Nathan's PC through `device_bash`**). One whole-file replacement (anchored by sha256 +
   line count + mtime), one build, one mux, four doc edits, one `all-renders/` swap.
   Inspect (fresh Opus) reruns §6 itself.
3. Independent of item A (`BRIEF-tunetank-ride-soundtrack.md`) — either order, or both in
   one session; they touch disjoint files.
4. Nathan watches `brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4` (Q6–Q9 are
   answered; what remains is his listen, and the Q8 caveat said in chat).

**Not in item B:** `brandmark/closing/` (item D gives it a silent round; nothing from this
brief); `synth.py` (untouched as a file — no new round uses it); any
`index.html`; `piano/projects/tunetank/` (its `WAVEFORM-NOTES.md` mono-average peak is
noted as understating the stereo peak but not edited — someone else's analysis); the teaser
(item D makes it silent; putting this piano under its 0–6.5 s is a later follow-up).

## Rulings made in item B

1. **Target = `brandmark/opening`** (§A). Correctable by Q6; closing is ruled out by the
   arithmetic, not just by preference.
2. **File t = 0 on video t = 0, no trim, no nudge** — the numbers confirm Nathan's own
   placement; the 97 ms lead on the tagline is the file's own spacing and what he heard.
3. **Nothing synthesised kept** (§C).
4. **`GAIN = 0.85`**, set by the file's brickwall ceiling, not by taste; the −1 dBFS guard
   is met without any scaling logic in the script.
5. **0.5 s end fade** so the master ends on a true zero; no fade-in.
6. **Whole-file replacement of `opening/soundtrack.py`** rather than six anchored edits:
   nothing of the old `build()` survives, so the honest anchor is the whole file (sha256,
   line count, mtime all quoted). The synthesised soundv2 is in git.
7. **The mp3 is referenced from `piano/projects/tunetank/sources/`, not copied** to
   `brandmark/sfx/` — one source of truth, same as item A does with its track.
8. ~~Item B supersedes cycle 15 for opening only~~ → **cycle 15 cancelled entirely by
   Nathan (Q7); item B stands alone; closing gets a silent round via item D** (§B).

## Model-tier readout (item B pass)

| Tier | Model | Tokens (approx) | Outcome |
|---|---|---|---|
| Digest | — | — | not dispatched: the coordinator handed Plan the verified facts (opening timeline, current `soundtrack.py`, the piano project's waveform notes, the render-target arithmetic) |
| Plan | Fable (claude-fable-5-1) | ~75k in context, ~13k written | 1 new file + 2 appends in this folder. On Nathan's PC: read the existing cycle-16 files, cycle 15's brandmark brief, `opening/soundtrack.py`, `window_mix.py`, the piano project's notes and MIDI; decoded the track in stereo (found the −0.00 dBFS peak the mono notes missed), onset-detected it against the MIDI and the animation beats, swept the gain, wrote and ran the new `soundtrack.py` from a scratch mirror, ran the §6.1 check script (ALL PASS) and the mux/ffprobe dry-run. ~12 tool calls. |
| Execute | Sonnet | — | not yet dispatched |
| Inspect | Opus | — | not yet dispatched |

Checkable artifacts of this pass: `BRIEF-tunetank-piano-logo-opening.md`, this section, Q6–Q9
in `questionsfornathan.md`; every number in the brief's §1, §2 and §6 is reproducible on
Nathan's PC from the brief's own code.
