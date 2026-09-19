# Cycle 12 — Interstellar piano: two-source cross-check, tool bugfix, and Nathan's bass/melody-into-the-ride idea

**Status (2026-09-19): investigation + folder restructure done and checkable; the new
idea below is not built — logged for review, open questions first.**

## What this cycle covers

Nathan downloaded a new piece — the Interstellar "Time" theme, ripped from a YouTube
"Easy Piano Tutorial" via audioforges (`.wav`), then transcribed it two independent ways:
`muscriptor.kyutai.org` (`.mid`) and `piano2notes.klang.io` (`.pdf`). Asked to (1) check
whether the two transcriptions agree, and (2) give `audio-studio/piano/` a real
multi-project structure now that it was "all centred around the ratpac idea" — it had one
piece's rounds hardcoded into its top-level README.

### 1. Restructured `audio-studio/piano/`

Moved the original piece's `sources/` and all five `round-0N-*` folders into
`projects/ratpac/`, gave that folder its own README (the piece-specific content that used
to live at the piano root), and rewrote the piano-root README as a generic index: the
standing A0-F5 constraint, the `named-keys.html` tool, the shared `tools/` — the parts
that apply to any future piece — plus a `projects/` list. Fixed every `../tools/` and
`../named-keys.html` reference inside the moved rounds' `NOTES.md` files for the new
depth (`../../`). Checked: nothing in `projects/ratpac/` changed content-wise, only
location — its round docs still open and read the same.

### 2. Interstellar: sources filed, both transcriptions cross-checked

New `projects/interstellar/`, holding the three downloaded files under `sources/`.

Running the existing PDF-pitch-reading tool (built in round 4, for the *other* piece) on
this PDF exposed a real bug: its codepoint table for reading LilyPond's font glyphs was
hardcoded from round 4's specific PDF, and font subsetting assigns codes per file — this
PDF assigns the clef glyphs to different codes, so every staff silently defaulted to
treble and any true bass note came out an octave-plus too high. Fixed
`tools/extract_klangio_pdf.py` to read each font's own `/Differences` array instead of
trusting a borrowed table (and fixed a second, unrelated bug in the same file: its
printed pitch-range summary sorted note names as strings, not by pitch — round 4's own
doc has been carrying a wrong range, "A3-G5" instead of "C3-G5", since it was written;
now amended, see `projects/ratpac/round-04-klangio-score/NOTES.md`). Regression-tested
against round 4's original PDF: identical reading order, confirming the fix changed
nothing that was already correct.

**Verdict, once that bug was fixed: the two transcriptions agree.** Same bass notes
(F2, G2, A2), same melody notes (A4-E5), no accidentals in either source. Full
comparison: `projects/interstellar/NOTES.md`.

**One real discrepancy, unrelated to the pitch check:** the WAV is 15.01 s (`ffprobe`);
the Kyutai MIDI's own note timeline runs to 19.86 s — about a third long. Pitches still
check out against the PDF, so this looks like a tempo-estimate drift in the
transcription, not a wrong-notes problem. Matters for the idea below — flagged there and
in OPEN-ITEMS.md.

### How it was built

Done directly — file moves, a bug diagnosis grounded in reading the actual PDF bytes
(the font's `/Differences` array, confirmed by hand before writing the fix), and a
mechanical fix to one existing script. Under the chore threshold; no subagents.

## Nathan's idea — bass track under the ride, melody pulse timing the gates

Nathan, after listening to the piece: it has "a low pitch and high pitch track playing
together," and asked (1) whether the two can be separated so he can hear just the longer
bass notes on their own, (2) whether that bass track could sit under
`silent-studio/all-renders/start-ride_v4.mp4`, and (3) whether
`gates-saving_v6.mp4`'s speed could be adjusted so passing the gates lands exactly on the
melody's regular-interval higher notes. Both files exist in `all-renders/` as named.

**My read: this fits the material well, and the hard part — clean separation — is
already done, in the MIDI.** The transcription splits cleanly by register without any
audio source separation: a held bass note (F2, then G2, A2, G2) under a melody that keeps
returning to E5, both confirmed against the PDF above. So the right way to get "just the
bass" is not to try to isolate it out of the (YouTube-tutorial-quality) WAV — it's to
re-synthesize the bass notes from the already-clean MIDI pitch/timing data, the same way
`audio-studio`'s existing `soundtrack.py` scripts already build every other scene's
soundtrack (numpy/scipy synthesis + ffmpeg mux, no ML stem separation, no external-tool
account). The same approach gives a clean melody-only track for free, which is a nice
bonus — could be worth having on hand even beyond this idea.

**"Regular interval" — two candidates in the data, worth confirming which one you mean
before building anything:**

- The melody's E5 returns roughly every 1.9-2.0 s of the MIDI's own clock (onsets at
  0.92, 2.78, 4.65, 6.61, 8.57, 10.68, 12.50, 14.51 s) — a steady pulse under the whole
  main phrase. Scaled to the real recording's clock (see below): roughly every 1.4-1.6 s.
- A fast, strictly even repeated bass+treble pulse (G2+D5 struck together, ~0.23-0.24 s
  apart, 20 repeats) arrives at the end of the clip — the driving ticking figure the
  Interstellar theme is known for. Scaled: roughly every 0.17 s, over the last ~3.6 s of
  the 15 s clip.

I think this is a genuinely good idea for the material — the bass pedal tone as an
ambient swell under a slow establishing shot, the ticking pulse as a natural rhythmic
anchor for something as event-driven as passing gates. Three things need resolving
before I'd build it, in OPEN-ITEMS.md.

## Round 1, built (2026-09-19)

Nathan confirmed the source video is ~15s (matches the clean phrase) and said to proceed.

- **`audio-studio/piano/projects/interstellar/soundtrack.py`** — new, synthesizes
  `bass_only.wav` and `melody_only.wav` (15.04s each) straight from the clean, cross-
  checked note data, using the shared `synth.py` toolkit (`pad()` for the bass swell,
  `pluck()` for the melody). Required one small fix to `synth.py` first: its
  `from scipy.signal import lfilter` import was unconditional, so the whole toolkit
  failed to import in this shell (scipy isn't installed here, and `pip install` is
  blocked — already documented in `APPROACH.md`). Made the import lazy
  (`lfilter = None` on failure, `comb()`/`allpass()` raise a clear error only if
  actually called) — every other scene's existing `soundtrack.py` is unaffected, and
  reverb still works wherever scipy is present.
- **`audio-studio/start-ride/soundv3/`** — built and complete. Bass line trimmed to the
  video's 14.0s (0.5s fade-out), muxed onto `start-ride_v4.mp4`. Ready for Nathan to
  watch: `soundv3/FEEDBACK.md`.
- **`audio-studio/gates-saving/soundv4/`** — analysis + a plain melody preview only, not
  a finished render. Checked the real numbers (gate crossings at 6.46/9.15/10.60s from
  the v6 FEEDBACK.md, melody beats every ~1.9s) and found a single uniform video-speed
  change cannot land all three gates on a melody beat exactly — the gates are unevenly
  spaced, the melody pulse is nearly perfectly even. Three options laid out in
  `soundv4/FEEDBACK.md`, needs Nathan's call before any video gets retimed.

## Open item

Which of `soundv4/FEEDBACK.md`'s three options for gates-saving (uniform speed / accept
one 0.7s miss, a variable-speed remap that changes the ride's pacing feel, or explicitly
prioritising just the first gate) — nothing further gets built there until that's picked.

## Round 2, corrected (2026-09-19)

Nathan corrected round 1's read of the brief, twice:

1. He meant the melody's two *treble* voices split between the scenes, not bass-vs-
   melody: start-ride gets the slower-moving voice (A4, A4, B4, B4, C5, D5, C5, D5, D5);
   gates-saving gets the repeated E5 pulse, re-triggered at the real gate-crossing times
   (6.46/9.15/10.60s) rather than the video being retimed to match the melody's own
   clock — which also resolves round 1's "uniform speed can't hit all three gates
   exactly" finding by sidestepping it entirely (trigger the note by the gate's time,
   don't force the gate to the note's time).
2. Follow-up: the held bass (F2->G2->A2->G2) is **always on, in both versions** — not a
   third alternative, a constant layer under whichever treble part each scene gets.

Rebuilt both: `start-ride/soundv4/` (bass + voice A) and `gates-saving/soundv4/` (bass +
the existing soundv3 chord progression, kept as-is + three E5 gate-chimes), gates-saving's
video left at native speed throughout. `soundtrack.py` extended with `VOICE_A`, `VOICE_E5`
and a `gate_chimes(times, ...)` helper (triggers a note at arbitrary times rather than the
transcription's own clock — likely reusable elsewhere). `start-ride/soundv3` and
`gates-saving`'s first soundv4 attempt marked superseded in their own FEEDBACK.md rather
than deleted.

## Round 3, scoped down (2026-09-19)

Nathan: music should only play during each scene's actual "ride," silent the rest of the
render — and gates-saving's existing chord progression should be removed entirely (not
kept underneath), the Interstellar material fully replacing it in its window.

Pulled the real beat timings from each scene's own `silent-studio` round docs (not
eyeballed): start-ride's ride is 5.3-13.8s (`rounds/v4/FEEDBACK.md`), gates-saving's
second ride is 4.4-11.7s (`rounds/v6/FEEDBACK.md`). Both scenes now restart the theme
from its own beginning right as the ride starts (not whatever fragment would land there
at the old alignment), faded in/out at the window edges, silence (~-91dB, confirmed
with `volumedetect`) everywhere else. `start-ride/soundv5/`, `gates-saving/soundv5/`
(chords fully dropped, bass + gate-chimes only).

## Round 4, Klangio-corrected + all three layers in gates-saving (2026-09-19)

Two more corrections from Nathan on round 3's output:

1. **Klangio as the absolute pitch reference.** Nathan heard something wrong around
   t=10s and asked that the Klangio PDF (independently transcribed, glyph-exact) be
   treated as the tie-breaker over the Muscriptor MIDI whenever they disagree on pitch.
   Re-walked the full melody line against the PDF's reading order note by note (not just
   the flagged spot): every one of the PDF's 16 melody notes matches the MIDI in order
   and pitch except one — a 0.05s D5 grace-note blip in the raw MIDI at t=9.97s that has
   no counterpart in the PDF at all, and is short enough to be a plausible decoder
   artifact on its own. Dropped it from `soundtrack.py`'s `MELODY`/`VOICE_A`, regenerated
   the four layer WAVs. Bass was already checked against the PDF's bass staff in round 1
   and needed no change. Full writeup:
   `../../audio-studio/piano/projects/interstellar/NOTES.md`.
2. **gates-saving wants all three components, not two.** Round 2/3 only gave gates-saving
   the bass + E5-pulse layers (start-ride got the moving voice_a line instead). Nathan:
   gates-saving should have voice_a too, alongside bass and the E5 gate-chimes — all
   three together.

Rebuilt both scenes as soundv6, same ride-only windows as soundv5 (start-ride
5.3-13.8s, gates-saving 4.4-11.7s, everything else silent, confirmed via `volumedetect`):
`start-ride/soundv6/` (bass + corrected voice_a, unchanged direction, corrected notes),
`gates-saving/soundv6/` (bass + voice_a + E5 chimes, three-way mix — new for this scene).

## Round 5, clean MIDI export + piano-realism investigation (2026-09-19)

Two asks: (1) a clean MIDI file of just the notes we actually use, no post-15s repeat
tail — built `piano/projects/interstellar/interstellar_corrected.mid` straight from
`soundtrack.py`'s corrected note lists via a new pure-stdlib SMF writer
(`write_midi.py`); round-tripped it through `parse_midi.py` to confirm 20 notes,
15.04s, nothing past that. (2) Nathan flagged our synthesized piano as sounding much
worse than midiviewer.io's and Klang.io's own players and asked what they use.

Answer: both are sample-based (real recorded piano — most of that ecosystem runs on
Salamander Grand Piano, a multi-sampled Yamaha C5), not synthesized from scratch like
our Karplus-Strong `pluck()`. Tried to fetch those exact samples — blocked, this
session's network allowlist doesn't reach the hosts (GitHub raw/jsdelivr/unpkg) they're
served from. Found a workable substitute already on the cloud sandbox instead:
`libfluidsynth3` + a bundled (smaller, older) GM soundfont — same sample-playback
approach, lower-fidelity sample set. Rendered an A/B trial of both scenes' current
soundv6 mixes through it and sent both to Nathan alongside the old versions; not
adopted into either scene's rounds yet, pending his listen. Full writeup:
`../../audio-studio/piano/projects/interstellar/NOTES.md`.


## Round 6, FluidSynth adopted, rolled out to named-keys.html (2026-09-19)

Nathan approved the FluidSynth A/B trial from round 5 ("fluidsynth is already a step
so i would roll with it"). Adopted as production:

- Interstellar's 5 audio layers regenerated via FluidSynth (`fluid_soundtrack.py`),
  `start-ride/soundv7` and `gates-saving/soundv7` built from them (same mixes/windows
  as soundv6, instrument only changed).
- `piano/named-keys.html`'s own "Play" preview upgraded the same way — real piano
  samples (30 notes, embedded base64) instead of an oscillator ping, nearest-sample +
  pitch-shift for notes in between.
- Asked whether "the ratpac files and renders" also needed this — Nathan clarified he
  meant literally `piano/projects/ratpac/` only; checked, it has no renders (analysis-
  only), so nothing to do there. Noted in that folder's own README for the record.
- Delivered `get_salamander_samples.ps1` for Nathan to run on his own machine (not
  through Cowork -- both its shells hit a 403 on the host these samples are served
  from) as a path to the real Salamander Grand Piano quality later, if wanted.

Full writeup: `../../audio-studio/piano/projects/interstellar/NOTES.md`.


## Round 7, gate-chime retired -- the ride adapts to the melody instead (2026-09-20)

Investigated Nathan's "extra note around 6 seconds" report on soundv7 thoroughly: onset
analysis (every attack in the file cross-checked against the exact expected schedule,
both gates-saving and start-ride) found nothing wrong with the render -- the E5
gate-chime (at the real gate-crossing time, 6.46s) lands 80ms from voice_a's own next
note (A4 at 6.54s), a coincidence that existed in soundv6 too but wasn't audible with
the old Karplus-Strong pluck's soft attack. FluidSynth's real piano attack makes both
land distinctly, reading as two notes.

Nathan's call: not a mix problem to patch, a direction to drop. Audio should be the
real melody with nothing added; instead adapt the VIDEO. Edited
`silent-studio/gates-saving/index.html`: the ride's rider now moves at a
piecewise-linear varying speed (`RIDE_WARP`) instead of constant speed, so the 3 gates
(fixed route positions, real geography) are crossed exactly when the melody's own E5
pulses land, instead of evenly spaced in time. Also fixed a knock-on bug this exposed --
the sector recolour-on-crossing was still keyed to the old uniform-speed formula and
would have desynced from where the warped rider actually is.

Cannot render the result here (`npx hyperframes render` needs npm; same network wall
as the Salamander samples). `gates-saving/soundv8/` has the finished audio
(bass + untouched melody, no chime) and a "to finish this round" handoff for Nathan to
render and send back.


### Round 7 complete (2026-09-20) — rendered, muxed, verified

Nathan ran `render.ps1 -Name gates-saving -Render` himself and the silent video landed
in `silent-studio/gates-saving/renders/`. Finished from there:

- Copied the render into that composition's round history as
  `silent-studio/gates-saving/rounds/v7/gates-saving_v7.mp4` (12.3s, unchanged
  duration from v6 — the warp only redistributes speed within the existing ride
  window, nothing else on the timeline moved).
- Muxed it with `soundtrack_v8.wav` (bass + the real, untouched melody — no
  gate-chime layer) → `audio-studio/gates-saving/soundv8/gates-saving_v7_with_sound_v8.mp4`.
  **This is the current pick for the scene.**
- Verified the retiming actually landed, two independent ways rather than trusting the
  math alone: extracted video frames at the three target gate-crossing times
  (5.32s / 7.18s / 9.05s) and confirmed the rider dot sits exactly on each gate tick in
  all three; separately ran the same onset-detection scan used for the soundv7
  investigation on `soundtrack_v8.wav` and got attacks at 5.30 / 7.18 / 9.03s — video
  and audio agree, both matching the melody's own beat within detector resolution.
- Result: the gate crossings that used to land at 6.46 / 9.15 / 10.60s (evenly spaced,
  arbitrary relative to the music) now land on three of the melody's own E5 pulses.
  Total ride duration, gate route-positions, and everything else on the timeline are
  unchanged.

Full before/after numbers and round docs:
`silent-studio/gates-saving/rounds/v7/FEEDBACK.md` (video side),
`audio-studio/gates-saving/soundv8/FEEDBACK.md` (audio side, update at the bottom).

**One open item, not yet resolved:** the first ride leg (start → gate 1) now covers
24% of the route in 0.52s — about 3x the old pace — before slowing down for the rest.
Confirmed by frame-check that this is working exactly as designed (the dot is on the
gate), but nobody has watched it at real playback speed yet to judge whether the
sudden speed-up reads as exciting or jarring. If it's the latter, the fix is a real
easing curve instead of the current hard per-gate speed breaks in `RIDE_WARP`.

This closes out the "extra note at 6s" investigation from earlier in this round: it
was correctly diagnosed as a real (if coincidental) collision, and Nathan's chosen fix
(retime the video, not the audio) is now built, rendered, and verified end to end.
