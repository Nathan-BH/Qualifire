# audio-studio — approach

Ideas and decisions so far, kept current as we iterate. Per-scene detail belongs in
that scene's `README.md` / `FEEDBACK.md`; this file is the cross-project thinking.

## Why not an AI video-to-audio tool

Tried Pixverse's video-to-audio first. Its free tier is a short one-off trial — not
usable for a back-and-forth. Looked for a free alternative that would let us iterate:

- **MMAudio** (open-source, video-conditioned audio generation — the closest thing to
  what Pixverse does) — free demo is a shared Hugging Face Spaces queue, no API. Same
  one-shot problem, not a fit for "generate, listen, adjust, regenerate."
- **MusicGen / AudioCraft (Meta), Stable Audio Open** — real open-source music
  generation, but need multi-GB model weights and ideally a GPU. Too heavy for
  Claude's sandbox; only realistic if run on Nathan's own machine.

Decided instead to have Claude write the soundtrack directly as code (numpy/scipy),
mixed on with ffmpeg. No account, no quota, no queue, and genuinely iterative — one
Python file per scene, edit a number, regenerate, listen.

## A note on realism: soundfonts didn't work (for now)

Wanted to try composing real MIDI (`pretty_midi`) rendered through `fluidsynth` with an
actual instrument soundfont (piano/strings), instead of hand-synthesized tones — a
soundfont is already sitting on the sandbox at `/usr/share/sounds/sf2/default-GM.sf2`.
Blocked: both `pip install` and `apt-get install` are currently refusing *any* new
package in Claude's sandbox (403s on totally unrelated packages too — a sandbox network
policy thing right now, not specific to audio). Worth retrying later; if it opens up,
`fluidsynth` + that soundfont would be a straightforward upgrade path for warmer,
more "real instrument" timbres without changing the composition approach below.

## The synthesis toolkit (numpy/scipy only, no external packages)

Originally built up inline in `gates-saving/soundtrack.py`; extracted into
`synth.py` at this folder's root once the other five scenes needed the same
building blocks, so a scene's `soundtrack.py` now does
`sys.path.insert(0, "..")` (or `"../.."` for `brandmark/opening`/`closing`,
which are nested one level deeper) and imports from it rather than
redefining tones per scene. `gates-saving/soundtrack.py` itself still has
its own inline copy of this logic (predates the extraction) — worth
migrating it to import `synth.py` too next time that file gets touched, but
not required.

`synth.py` also holds the shared note/chord vocabulary so scenes read as one
sonic world instead of five unrelated experiments: `BRAND_CHIME_RISE` /
`BRAND_CHIME_LAND` (the brandmark identity, reused in the teaser's
bookends) and `YELLOW_TONE` / `GREEN_CHIME` / `PURPLE_CHIME` (the tier
colours, shared by gates-saving, colours, and ranking).

Toolkit functions:

- **envelope / note** — attack-release shaping, two slightly detuned sine oscillators
  per note for warmth (avoids the "pure sine" thin sound).
- **chime** — a few notes fired in quick succession, for UI-style cues (a caption
  landing, a state change).
- **whoosh** — filtered noise with a rise-and-fall envelope, for transitions.
- **pad** — sustained multi-note chords, slow attack/release, for the ambient bed.
- **pluck** — Karplus-Strong plucked-string synthesis (a classic physical-modelling
  algorithm — feed a short noise burst into a decaying delay loop tuned to the note's
  period). Gives an actual music-box/kalimba melodic tone instead of a flat pulse.
- **arpeggio** — plays a chord's notes in a pattern at a set tempo using `pluck`,
  speeding up over a scene to track motion in the visual.
- **reverb** — a small Schroeder reverb (four parallel comb filters + two allpass
  filters, via `scipy.signal.lfilter`) applied to the whole mix at the end. This one
  change is most of what makes v2 sound "produced" rather than "synthesized."
- **soften** — a cheap repeated 3-point moving-average low-pass, takes the digital
  edge off pure-sine harmonics.

## Composition idea that generalizes across scenes

For gates-saving, the chord progression and its timing were mapped directly to the
on-screen narrative, not chosen abstractly:

| Visual beat | Chord | Feel |
|---|---|---|
| static route, "Save your route as reference" | Cmaj9 | calm, at rest |
| dot starts moving | Am7 | quiet lift, motion begins |
| green trail extends | Fmaj7 | build |
| purple / personal-best segment | Gadd9 | brightest, most open |
| clip ends | resolve to Cmaj | settled |

This principle carried into every other scene's soundv1 (built 2026-09-11, all
starting points, none reviewed yet): read what the visual is doing beat-by-beat
first (pulling frames the same way as gates-saving), then pick a chord/timbre map
for that specific arc, rather than reusing gates-saving's chords wholesale.

- `start-ride` — held-back and quiet (nothing's been judged yet in the story);
  Cmaj9 → Am7, gentle build, no resolve at the end since it flows into
  gates-saving next. See `start-ride/README.md`.
- `colours` — three labelled plateaus (Yellow → Green → Purple), each a chord
  (Fmaj7 → Am7 → Gadd9) plus the shared tier tones, rather than one continuous
  shimmering pad as originally guessed — the visual turned out to be discrete
  reveals, not a continuous shift. See `colours/README.md`.
- `ranking` — mostly a quiet hold, with one built event (the "Today" purple
  highlight) rather than a percussive/rhythmic treatment throughout — the visual
  itself is mostly static except for that one moment. See `ranking/README.md`.
- `brandmark` — two sub-scenes (`opening/`, `closing/`), both built around one
  shared two-part brand chime (a rise + a landing chord) rather than a single
  unstructured "hit." See `brandmark/README.md`.
- `teaser` — built as an **independent composition** (Nathan's steer, not a
  concat) sharing the brand chime and tier chimes so it still feels like one
  sonic world; see `teaser/README.md` and `teaser/soundv1/FEEDBACK.md` for the
  scene-timing breakdown and one notable finding (the `colours` scene doesn't
  actually appear in this cut).

## Nathan's input before a round (2026-09)

Nathan asked for more input/control over the audio side once he's approved a scene's
visual render. Ruling: a per-scene `AUDIO-BRIEF.md` beat sheet (canonical, like
`soundtrack.py`) — Claude pre-fills the visual beats with exact timestamps and what the
current soundtrack plays, Nathan fills in a "what I want here" column plus five
whole-scene direction lines, and only then does Claude write or rewrite
`soundtrack.py`. This puts Nathan's input at the moment he actually has it (right after
watching the approved visual), speaks the language his feedback already uses
(event-level, reference-based), and doesn't touch the `soundtrack.py`-is-canonical
convention — the brief is input, the script is still the source of truth,
`soundvN/FEEDBACK.md` is still where a round is judged. See `structure.md`'s "How a
scene's sound is made" for the mechanics and the two templates
(`AUDIO-BRIEF.template.md`, `FEEDBACK.template.md`) at this folder's root.

Alternatives considered/deferred:
- **A. Config/knobs layer** — rejected as the primary move (each scene's script is
  bespoke composition code, not a parameter sweep, and Nathan can't run the scripts
  himself anyway). A lighter cousin — a `KNOBS` dict at the top of `soundtrack.py`
  (tempo, layer amplitudes, reverb wet, silence windows) so Nathan can read and name
  the levers in feedback — is worth doing next time a script is touched, but is
  optional and per-script, not part of this move.
- **B. Stems per round** (`bed_vN.wav`, `melody_vN.wav`, `events_vN.wav` alongside the
  mix) — genuinely useful, feasible via `build()`'s existing `mix_into` layering, but
  needs a small refactor across all seven scripts; flagged as the natural Phase 2 once
  the beat sheet has been used for a scene or two.
- **C. Local regeneration script on Nathan's PC** (`audio-studio/regen.ps1 -Scene x` +
  a setup walkthrough, so he can nudge a number and hear it in seconds) — Nathan said
  yes, worth trying (2026-09-14). Separate follow-up brief
  (`cycles/08_daynight-audio-control-and-website/BRIEF-audio-regen-local.md`), not yet
  written, not part of this move. Composes with A's `KNOBS`.

## Open questions

- Soundfont/fluidsynth route — retry once sandbox package installs work again.
- ~~Whether `teaser`'s audio should be a straight concat or a fresh
  composition~~ — resolved: Nathan asked for it independent, so it's a fresh
  composition built directly against the full cut's own timeline.
- `gates-saving/soundtrack.py` still has its own inline copy of the toolkit
  instead of importing `synth.py` (see above) — low priority, but worth fixing
  next time that file's touched so there's only one copy of these functions.
