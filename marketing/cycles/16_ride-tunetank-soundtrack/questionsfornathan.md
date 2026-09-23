# Questions for Nathan — cycle 16

Each has the default the brief already assumes, so nothing is blocked on an answer; an
answer changes one constant in `audio-studio/ride/ride_tunetank.py`, adds one layer, or
one doc line. Write your answer inline under the question (as in cycles 14–15); the
coordinator adds a resolution line under it.

*Revised 2026-09-23 after Nathan's answers (his lines start with `*`). Each question now
carries a dated resolution; the earlier "provisional" lines are kept for history and marked
where superseded. Full repo-relative paths are used throughout — "soundv1" alone means
nothing, `marketing/audio-studio/ride/soundv1/` does.*

## Q1 — Did you press play on the click, or when the rider starts moving?

You wrote "only after the click, when the actual ride starts" — on the video those are two
moments 2.1 s apart (click 3.20 s, rider moves 5.30 s), and the track has 1.26 s of
near-silence before its first real note. The brief assumes you pressed play **on the
click**: the music then arrives at 4.46 s (during the camera push-in) and its fade begins at
14.3 s, inside the zoom-out — which is the only reading that matches your "fades out exactly
when the rides zoom out". The only other reading that comes close is "the first note lands
as the rider starts moving" (5.30): then the fade begins at 15.14 s, just after the zoom-out
ends, under the rings and the caption instead.

| reading | `T1` | music audible from | fade begins |
|---|---|---|---|
| **play on the click (default)** | **3.20** | 4.46 | **14.30** |
| first note on the rider's start | 4.04 | 5.30 | 15.14 |

*Reasoning:* the cycle README §1 has all five candidates. If the render sounds like the
music comes in too early for you, the second row is the one-number change.

**Coordinator resolution (provisional):** `T1 = 3.20`. *(superseded below)*

*I agree starting play together with the click is too soon. We can press play while the yellow START box is fading out. The default media player I have also does not allow for frame by frame analysis or anything more detailed than a full second, so we might want to build our own tool to properly be able to align the audio and the video (a file you can make, and then I can save a copy of so you can see and compare the diffs before implementing it)

**Coordinator resolution (2026-09-23, after Nathan's answer):** **`T1 = 3.80`** — the file's t = 0 goes at video
3.80 s, inside the START box's fade-out (`silent-studio/start-ride/index.html`: the box fades
from opacity 1 to 0 over **3.55–4.00 s**, `power1.in`; 3.80 is frame 114 at 30 fps, and it is
also where the camera push-in tween starts — the only named beat inside that window). The
music is then audible from **5.06 s** (7 frames before the rider moves at 5.30) and the file's
own decrescendo begins at **14.90 s**, still inside the 14.0–15.0 zoom-out lead-in, so the
earlier "fades out exactly when the rides zoom out" reading survives with 0.1 s to spare.
The whole window, measured on the actual build (`ride_tunetank.py` with only `T1` changed):

| `T1` (frame) | where in the fade-out | audible from | decrescendo begins | −25 dBFS by | master peak |
|---|---|---|---|---|---|
| 3.5667 (107) | first full frame of the fade | 4.83 | 14.67 | 15.26 | −1.37 dBFS |
| **3.80 (114) — default** | opacity ≈ 0.7, push-in starts | **5.06** | **14.90** | 15.44 | **−1.39 dBFS** |
| 4.00 (120) | last frame, box gone | 5.26 | 15.10 (0.1 s after the zoom-out ends) | 15.64 | −1.32 dBFS |
| 4.04 (H4, outside the window) | box already gone | 5.30 | 15.14 | 15.68 | −1.39 dBFS |

Every value is one constant in `marketing/audio-studio/ride/ride_tunetank.py` (`T1`); the
second placement (`T2 = 16.54`, attack on the ride-2 start pulse at 17.80) is positioned
independently of `T1` and does not move. **The alignment tool Nathan asked for is a third
brief in this folder, `BRIEF-av-alignment-tool.md`** — a single offline HTML file that
frame-steps the video, shows the waveform, and "Save copy" writes his chosen offset into
a copy of the file so the coordinator can diff it. He nudges `T1` with that; the build is
re-run with the new constant.

## Q2 — The "overgang" (≈ 15.4–17.8 s): leave it to the track's own tail, or put something there?

Between the first pass fading below −25 dBFS (15.44 s with `T1 = 3.80`; it was 14.84 with
the old 3.20) and the second ride's start pulse (17.80 s) the screen shows the landmark
rings popping (15.05–15.25), then the caption and the gate ticks drawing in (15.6–18.9).
The brief's default puts **nothing** there: the first pass's tail rings out, the second
pass's own quiet 1.26 s head rises into the attack, and the two quiet ends overlap at about
−36 to −39 dBFS around 16.5–17.5 s — a breath before the payoff.
The alternatives, each one added layer in `ride_tunetank.py`:

- **(a) — default:** nothing added. What you heard when you lined it up by hand, plus the
  file's own head as the run-up to ride 2.
- **(b) a soft sustained pad** under 15.0–17.8 s, crossfading into the attack. Needs the
  track's key worked out first (not done — a wrong pad clashes), and a synthesised pad next
  to an orchestral recording can sound like a different instrument walking in.
- **(c) one soft E5 ping per gate tick** as each tick draws in (15.6–18.9), same Salamander
  sample as the ride-2 pulses at a lower velocity — "the gates being saved" before "the gates
  being crossed". Reads against your "add on top *only* … to punctuate the gates" for ride 2,
  so it is here as an option, not the default.
- **(d) no dip at all:** start the second pass earlier (t = 0 at ~15.0 s) so the music never
  drops below ~−20 dBFS. Then the attack no longer lands on the ride-2 start pulse and the
  restart loses its "here we go again" — not recommended, listed for completeness.

**Coordinator resolution (provisional):** (a). Judge it on `ride_v2.mp4`; (b)/(c) are a
small follow-up brief.

*Lets add nothing for now.

**Coordinator resolution (2026-09-23, after Nathan's answer):** **(a) confirmed — nothing added.** (b)/(c)/(d)
stay listed as options for a later round; none is built.

## Q3 — Are the E5 gate pulses loud enough over the track?

They sit +6 to +8 dB above the bed at the three gates (+14 at the start pulse, +5 at the
finish) with `GAIN_E5 = 1.5` (soundv1's chain unchanged) and the bed at 0.45. Louder pulses
push the master over the −1 dBFS ceiling unless the bed comes down too (re-measured with
`T1 = 3.80`: `GAIN_E5 = 1.7` needs `GAIN_BED ≤ 0.40`; `GAIN_E5 = 2.0` needs `GAIN_BED`
below 0.35 — the bed then ≈ 2–3 dB quieter). If the gates need to cut through more, say so
and it is those two constants.

**Coordinator resolution (provisional):** 1.5 / 0.45 as built.

*Lets just build a default, and we can always nudge it in the future. I do not know yet how the combination of the two will sound.

**Coordinator resolution (2026-09-23, after Nathan's answer):** **`GAIN_E5 = 1.5` / `GAIN_BED = 0.45` as built.**
Nudge later, after listening; each is one constant.

## Q4 — Licence: does your Tunetank licence cover this exact track for public / commercial use?

One line, not a research task — the same flag cycle 15 raised for the Interstellar melody.
Tunetank is a stock-music library with per-track / per-plan terms; before this ships in a
public Qualifire video (website, app store, social), confirm the licence you hold covers
`tunetank-emotional-classical-484234` for commercial use and, if you plan to upload, that it
is not Content-ID-registered against your account. Nothing in the build changes either way;
the note belongs in the round's `FEEDBACK.md` once confirmed.

**Coordinator resolution (provisional):** proceed with the build; do not publish until
confirmed. *(gate dropped below)*

* the sound is free and can be used without copyright issues;

**Coordinator resolution (2026-09-23, after Nathan's answer):** Recorded as **Nathan's statement** — "the
sound is free and can be used without copyright issues" (Nathan, 2026-09-23). No agent has
verified any licence; the "do not publish until confirmed" gate is dropped on his word. Both
rounds' `FEEDBACK.md` (`marketing/audio-studio/ride/soundv2/` and
`marketing/audio-studio/brandmark/opening/soundv3/`) carry the one line: *Licence: per Nathan,
2026-09-23 — free, usable without copyright issues (both Tunetank tracks).*

## Q5 — Keep `marketing/audio-studio/ride/ride_master.py` and its round `marketing/audio-studio/ride/soundv1/` as the synthesised alternative, or retire them?

*(Question reworded 2026-09-23 with full paths; the original wording said "soundv1 /
soundv8 / soundv9" and "superseded", which was the problem.)*

`marketing/audio-studio/ride/ride_master.py` is the script that built the **synthesised
piano** ride soundtrack — the Salamander-sampled Interstellar-style notes you heard on
`marketing/audio-studio/ride/soundv1/ride_v1.mp4`. Its outputs are round 1 of the ride
family: `marketing/audio-studio/ride/soundv1/ride_master_v1.wav`, sliced into
`marketing/audio-studio/start-ride/soundv8/soundtrack_v8.wav` (0–14.0 s of it) and
`marketing/audio-studio/gates-saving/soundv9/soundtrack_v9.wav` (14.0–26.3 s of it), each
muxed onto its silent render. The Tunetank build is **round 2** of the same family
(`ride/soundv2/`, sliced into `start-ride/soundv9/` and `gates-saving/soundv10/`) — one
more development round, not a final. The brief leaves `ride_master.py` untouched (it still
rebuilds round 1 byte-for-byte and the new script imports its E5 gate-pulse schedule from
it) and leaves every round-1 file on disk. The only thing that changes hands is
`marketing/audio-studio/all-renders/` (the "latest round per scene" quick-look folder, per
`marketing/audio-studio/structure.md`): the two round-1 muxes there are replaced by the
round-2 muxes, and the replaced copies go to `_to_delete/` — the round folders keep their
own copies. The question was whether round 1 stays as a selectable alternative or is retired —
answered below: it stays, for reference only.

**Coordinator resolution (provisional):** keep on disk, mark superseded, decide later.
*(wording withdrawn — "superseded" is not used any more)*

*Not sure what soundv1 is so explain what this question is more in detail in chat before considering it closed. Also mention full path location instead of just soundv1 otherwise I do not know what you are referring too? I would not consider tunetank, final it is part of just the development, which is why we have cycles, and renders rounds?

**Coordinator resolution (2026-09-23, after Nathan's answer):** OPEN — awaiting the coordinator's chat
explanation. *(superseded the same day, below)*

*i agree to keep the previous round there for reference and just make the tuneank version a round2 of the ride family

**Coordinator resolution (2026-09-23, second revision — CLOSED):** Round 1
(`marketing/audio-studio/ride/soundv1/`, with its slices `start-ride/soundv8/` and
`gates-saving/soundv9/`) stays on disk untouched, for reference. The Tunetank build is
**round 2 of the ride family** (`ride/soundv2/`, slices `start-ride/soundv9/`,
`gates-saving/soundv10/`). And per Nathan's same-day instruction — "i do not wish to move
forward with any of the synthesized sounds" — **no synthesised sound moves forward anywhere**:
the round-1 folders are reference only, not a selectable alternative; the four scenes that
had only synthesised audio (closing, colours, ranking, teaser) get a silent round via
`BRIEF-retire-synth-renders.md`. The two round-1 copies in `marketing/audio-studio/all-renders/`
are replaced by round 2 (the replaced copies go to `_to_delete/`, the round folders keep theirs).

---

# Item B — the Tunetank *piano logo* track on brandmark/opening (Q6–Q9)

Same rules: each question has the default `BRIEF-tunetank-piano-logo-opening.md` already
assumes, so nothing is blocked; an answer changes one constant in
`audio-studio/brandmark/opening/soundtrack.py`, or which brief owns a round number. Q4
(licence) applies to this second track too — `tunetank-piano-logo-484286`.

## Q6 — You meant the **opening** logo animation (`opening_v3.mp4`, 6.5 s), yes?

Your message had the mp3 path pasted twice where the second one was meant to be a render.
The coordinator resolved it from your own sentence "the audio file runs a bit longer but at
that point it is already silent": with both started together, at **opening's** 6.5 s end the
file is at −52 dBFS (its audible part ended at 5.95 s) — already silent, as you said. At
**closing's** 4.0 s end it would still be at −19 dBFS, ringing out mid-decay — so closing
cannot be what you heard. The brief therefore builds `brandmark/opening` and does nothing
to closing.

**Coordinator resolution (provisional):** `brandmark/opening`. If it was something else
entirely (a different scene, the teaser?), say which — the arithmetic in the brief §1.3
redoes itself for any clip length.

*it was the opening so you are correct

**Coordinator resolution (2026-09-23, after Nathan's answer):** **Confirmed — `marketing/audio-studio/brandmark/opening/`.**

## Q7 — This replaces cycle 15's planned logo-reveal-sample round for opening. OK?

Before this message, cycle 15 had an unexecuted plan for opening: keep the synthesised bed
and swap only the two-beat stinger on the "QUALIFIRE" wordmark + tagline for your real
`logo-reveal.mp3` sample (and do the same on closing). Your new track plays across the whole
animation and *has its own* two attacks on those beats (2.93 s and 3.25 s, against the
tweens at 2.95 and 3.35), so putting the logo-reveal sample on top would be a third thing on
the same two beats. The brief's default: **the piano track is opening's soundtrack, on its
own; cycle 15's opening swap is dropped; cycle 15's closing swap goes ahead as planned.**
*(That default is superseded by the resolution below: cycle 15 is cancelled entirely, and
closing gets a silent round — `BRIEF-retire-synth-renders.md`.)* That
means opening and closing will *not* share one sound any more (opening = piano, closing =
silent). If you would rather they match, the options are:

- **(a) — default:** opening = piano track alone; closing = logo-reveal sample (cycle 15).
- **(b)** opening = piano track, and *also* the logo-reveal sample on the wordmark/tagline
  on top of it — both sounds. Not recommended (two attacks 22–97 ms apart on each beat).
- **(c)** keep cycle 15's plan for opening instead and file the piano track as an
  alternative round (`soundv4`), so you can A/B the two renders.
- **(d)** closing should get something piano-flavoured too, to match — a separate small
  brief (this file does not fit closing; it would need a cut of it or a different piece).

*Round numbers:* ~~whichever brief runs first is opening's `soundv3`~~ — moot since cycle 15
is cancelled: `opening/soundv3` is this brief's. The executor still stops if the folder
already exists.

*cycle015 will not be run; it is closed.

**Coordinator resolution (provisional):** (a). *(superseded below)*

**Coordinator resolution (2026-09-23, after Nathan's answer):** **Cycle 15 is cancelled entirely** — nothing
from `marketing/cycles/15_ride-surge-fix-and-audio-tooling/` runs: not its opening swap, not
its closing swap, not its `synth.py` numpy-fallback edits (S1–S3), not `logo_reveal.py`, not
the gates-surge inversion. Nothing from it was ever executed (checked on disk 2026-09-23:
`marketing/audio-studio/synth.py` is unchanged since 2026-09-19, no `brandmark/logo_reveal.py`,
no `opening/soundv3/`). So: **opening = the piano track alone (this brief, `opening/soundv3`);
closing gets no logo-reveal swap.** The round-number collision in the earlier text no
longer exists — `opening/soundv3` is this brief's. *Second revision, same day:* since Nathan
then dropped every synthesised sound, closing does not keep its synthesised
`brandmark/closing/soundv2/` as current either — it gets a **silent round, `closing/soundv3`**,
via `BRIEF-retire-synth-renders.md` (the piano logo does not fit 4.0 s: −19 dBFS at the cut).
Whether closing later gets a piano-flavoured sound to match (option (d)) is listed there as
an option, not decided.

## Q8 — Keep nothing from the old synthesised soundtrack? (default: nothing)

soundv2 had a rising sweep + swoosh under the ring draw, pads, the two-beat stinger and
three soft high plucks under the fade. The brief drops all of it: your "exact perfect match"
reads as the recording being the whole thing, the synthesised parts are C-rooted while the
piece is D major (both transcriptions agree), and the piano already sounds on every beat
the old elements covered. The one thing that *could* survive without clashing in time is
the three trailing plucks (5.0–5.8 s), but they would be C-major over a D-major ring-out.
If, on watching, the first 0.65 s (the ring beginning to draw to a near-silent head) feels
empty, say so — a soft ring-draw sound could go back under it as one layer, but that is a
layer on a track you called complete, so it is off by default.

**Coordinator resolution (provisional):** nothing kept.

*still do not know what soundv2 is. Is it part of the sounds that make the "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\teaser\soundv2\teaser_v6_with_sound_v2.mp4" file. If so, I liked none of the audio for that render, so nothing should be kept.

**Coordinator resolution (2026-09-23, after Nathan's answer):** **Nothing kept — resolved with a caveat.**
The "soundv2" this question meant is
`marketing/audio-studio/brandmark/opening/soundv2/` (`opening_v3_with_sound_v2.mp4`, the
current synthesised opening soundtrack) — a *different file* from the teaser render Nathan
named (`marketing/audio-studio/teaser/soundv2/teaser_v6_with_sound_v2.mp4`; every scene has
its own `soundvN` rounds). Checked on disk: the teaser's first 6.5 s are built in
`marketing/audio-studio/teaser/soundtrack.py` lines 46–53 from the **same synthesised
elements** as the opening's soundv2 (the 220→660 Hz ring-draw sweep, the 0.55 s whoosh at
1.3 s, the sub-hit + chime two-beat stinger at 2.95/3.35 s, the C2 and C3/G3 pads) at
slightly lower amplitudes — so what he disliked in the teaser's opening seconds *is* this
material, and "nothing kept" holds. Caveat for the coordinator to say in chat: his reasoning
was about the teaser file, so he may object once he knows which file was meant. The teaser
gets a **silent round** (`teaser/soundv3`) in this cycle via `BRIEF-retire-synth-renders.md`;
applying the new ride and opening sounds to its cut is a later follow-up.

## Q9 — Level: `GAIN = 0.85` (peak −1.4 dBFS). Right for the brand opening?

The file is mastered to full scale (stereo peak −0.00 dBFS — the piano project's waveform
note quotes −0.58 dBFS, but that is a mono average), so it is scaled to 0.85 to sit under
the studio's −1 dBFS ceiling; 0.89 is the most it can be. Its opening chord and arpeggio
then sit around −10 to −13 dBFS RMS — the loudest moment in any scene so far, and louder
than the ride's Tunetank bed (item A, 0.45). Fine for a brand sting; if the opening should
sit quieter relative to the ride, it is that one constant (0.6 ≈ 3 dB quieter).

**Coordinator resolution (provisional):** 0.85.

*I do not know/understand. Lets just build default know and discuss for nudging later if needed

**Coordinator resolution (2026-09-23, after Nathan's answer):** **`GAIN = 0.85` as designed** (default; nudge
later — one constant in `marketing/audio-studio/brandmark/opening/soundtrack.py`).
