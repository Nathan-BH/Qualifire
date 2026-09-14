# BRIEF — more control over the audio side, once a visual render is approved

**For:** Sonnet executor. Markdown-only work under `marketing/audio-studio/` plus one
template; no Python edits, no renders. Stop-on-ambiguity applies to every anchor below.
**Status:** executed 2026-09-14 — `AUDIO-BRIEF.md` files (per-scene beat sheets) and the
template landed, plus the `structure.md`/`APPROACH.md` edits this brief calls for.
Alternative C (local regeneration) was spun out into its own brief,
`BRIEF-audio-regen-local.md`, rather than executed here. Git commit for this work is
still pending — `device_bash` (needed for `git add`/`git commit` on this mount) was down
during this execution pass.

## 0. Nathan's question and the ruling

> "is there something we can do for me to have more input/control over the audio-studio
> renders in terms of helping with the audio side only once i like the hyperframes renders?"

### What already exists (and stays)

- The trigger: Nathan drops the picked visual render into `audio-studio/all-renders/`
  (`structure.md` line 8) — that *is* "once I like the HyperFrames render."
- Per round: `soundvN/soundtrack_vN.wav` (audio alone, so he can judge without
  rewatching) + `FEEDBACK.md` with "What to listen for" and a free-text "Nathan's
  feedback" section.
- `soundtrack.py` is canonical and edited in place; `synth.py` holds the shared
  vocabulary (brand chime, stinger, tier tones, chord sets).

### What is missing

Today the first thing Nathan sees for a scene is `soundv1`, composed with **no input
from him** beyond the visuals. His feedback then arrives as prose after the fact
("some kind of whoosh while zooming out", "like Mario Kart star boost — same music, faster
and happier"). That feedback is good and specific — the problem is it comes one round
late, and it has no fixed shape, so each round Claude re-derives the beat timings from
`index.html` and Nathan re-describes what he wanted.

### Ruling — highest-leverage change: a per-scene `AUDIO-BRIEF.md` beat sheet

One file per scene, `audio-studio/<scene>/AUDIO-BRIEF.md`, canonical like
`soundtrack.py` (edited in place, not per round). It is a table of the scene's **visual
beats with exact timestamps, pre-filled by Claude from the composition's GSAP
timeline**, with a **direction column Nathan fills in** — before Claude writes or
rewrites `soundtrack.py`. Plus five global lines (mood, tempo feel, density, where there
must be silence, reference tracks). It mirrors how `rounds/vN/FEEDBACK.md` works for
visuals, but sits *before* the first audio round instead of after it.

Why this over the alternatives:

- **It puts Nathan's input at the moment he actually has it** — right after approving
  the visual, when he has just watched it and knows what each beat should feel like —
  and it makes soundv1 an informed attempt instead of a guess. That saves a round per
  scene, which is the single biggest cost in the current loop.
- **It speaks the language Nathan already uses.** His feedback is event-level ("when it
  zooms out", "the second ride") and reference-based ("Mario Kart star"). A beat sheet
  with a timestamped row per event is exactly that, structured.
- **Claude does the mechanical half.** Extracting beats + timestamps from
  `index.html` (the gates-saving file even has `// Beat 0 (0-1.0): …` comments, lines
  215–258) and summarising what the current `soundtrack.py` plays per beat is cheap,
  precise work; Nathan never has to read a timeline or a Python file.
- **It doesn't touch the `soundtrack.py`-is-canonical convention.** The brief is input;
  the script is still the source of truth; `FEEDBACK.md` is still where a round is
  judged.

### Alternatives considered (not chosen as the primary move)

- **A. Config/knobs layer** (YAML/JSON of tempo, key, per-beat texture that
  `soundtrack.py` reads). Rejected: each scene's script is bespoke composition code,
  not a parameter sweep — a config either stays trivially thin (tempo, reverb wet) or
  grows into a music DSL that Nathan would have to learn. And Nathan cannot run the
  scripts anyway (they run in Claude's sandbox; see C). A lighter cousin is worth doing
  *when a script is next touched*: a `KNOBS` dict at the top of `soundtrack.py`
  (tempo, layer amplitudes, reverb wet, silence windows) so Nathan can *read* the
  levers and name them in feedback ("bed -30%"). Optional, per-script, not this brief.
- **B. Stems per round** (`bed_vN.wav`, `melody_vN.wav`, `events_vN.wav` alongside the
  mix). Genuinely useful for "the bed is fine, the pings are too loud" feedback, and
  feasible (`build()` already layers via `mix_into`). Rejected for now only because it
  needs a small refactor in all seven scripts; flagged as the natural Phase 2 once the
  beat sheet has been used for a scene or two.
- **C. Local regeneration script on Nathan's PC** (`audio-studio/regen.ps1 -Scene x`
  runs `soundtrack.py` + the ffmpeg mux) so he could nudge a number and hear it in
  seconds. Nathan (questionsfornathan.md Q2, 2026-09-14): yes, worth trying, and he
  wants a file that walks him through the setup. Whether Python/numpy/scipy are
  already on his PC is still unknown, so that walkthrough must begin with the check
  (`python --version`, `pip show numpy scipy`) and include the install path.
  **Follow-up brief: `BRIEF-audio-regen-local.md` in this cycle folder**
  (`audio-studio/regen.ps1` + a setup/usage walkthrough); to be written by a separate
  Digest → Plan pass, not yet written, and not part of this brief's execution — this
  brief stays markdown-only. It composes with A's `KNOBS`.

## 1. The `AUDIO-BRIEF.md` template

Create `audio-studio/AUDIO-BRIEF.template.md` at the audio-studio root (next to
`synth.py`, `structure.md`, `APPROACH.md`). Content, verbatim:

```markdown
# <scene> — audio brief

**Visual source:** `../../silent-studio/<scene>/rounds/vN/<scene>_vN.mp4` (<duration> s)
**Filled in by Nathan on:** <date>   **Status:** draft | ready for soundv1 | revised for soundvM
**Current soundtrack round:** none | soundvM (`soundvM/FEEDBACK.md`)

Claude fills the first three columns from the composition's timeline and from what
`soundtrack.py` currently plays. Nathan writes in the last column — plain words, references
welcome ("like the Mario Kart star", "a single soft click", "nothing"). Leave a cell blank to
mean "your call". Write `silence` to mean exactly that.

## Beats

| # | Time (s) | What happens on screen | Sounds like now (Claude) | What I want here (Nathan) |
|---|---|---|---|---|
| 0 | 0.0–1.0 | | | |

## Whole-scene direction (Nathan)

- **Mood in three words:**
- **Tempo / energy:** (calm · steady · driving · accelerating — or a bpm if you know it)
- **Density:** (sparse · medium · full — how much should be playing at once)
- **Must be silent at:** (timestamps or beats; "none")
- **Reference tracks / sounds:** (anything — a game, a film, a brand sting, a song)
- **Continuity with other scenes:** (e.g. "same loop as start-ride, faster" / "no need")
- **Anything else:**

## How this file is used

1. Claude pre-fills the table when a visual round is approved (or when this file is first
   created for an existing scene), including the "Sounds like now" column if a soundtrack
   already exists.
2. Nathan edits the last column and the whole-scene lines, sets Status to
   `ready for soundv1` (or `revised for soundvM`).
3. Claude edits `soundtrack.py` to match, produces the next `soundvN/`, and in that round's
   `FEEDBACK.md` says per beat what was done with each request.
4. Round-by-round feedback still goes in `soundvN/FEEDBACK.md`; this file only changes when
   the *direction* changes. If a visual re-render changes timings, Claude updates the Time
   column and notes it here.
```

## 2. Pre-fill one `AUDIO-BRIEF.md` per scene

For each of the seven scenes — `brandmark/opening`, `brandmark/closing`, `colours`,
`gates-saving`, `ranking`, `start-ride`, `teaser` — create `audio-studio/<scene>/AUDIO-BRIEF.md`
from the template with columns 1–4 filled and column 5 empty:

- **Time / What happens on screen**: from `silent-studio/<scene>/index.html`'s GSAP
  timeline. Use the file's own beat comments where they exist (gates-saving lines
  211–259: "Beat 0 (0-1.0): zoom-out lead-in", "Beat 1 (1.05-1.55): start/end landmark
  rings pop in", "Beat 2 (1.6-4.9): caption + three gate ticks", "Beat 3 (5.2-12.3):
  caption B", "Beat 4 (4.8-11.7): second ride", plus gate-crossing times
  `RIDE_T0 + f*RIDE_DUR` for `GATES = [0.24, 0.63, 0.84]` → 6.46 / 9.15 / 10.60 s).
  Where a file has no beat comments, derive rows from the `tl.fromTo/to/set(…, t)`
  position arguments, grouped into visible events; one row per thing a viewer would
  notice, not per tween. Aim for 5–12 rows per scene.
- **Sounds like now**: from `audio-studio/<scene>/soundtrack.py`'s `build()` comments
  and `mix_into` calls (e.g. gates-saving soundv3: "whoosh 0–1.0", "Cmaj9 pad + 'saved'
  ping 1.05–4.8", "C-G-Am-F pluck loop 165→210 bpm + pulse 4.8–11.7", "green/yellow/
  purple gate chimes at 6.46/9.15/10.60", "Cmaj resolve 11.7"). Plain words; no code.
- **Visual source / duration**: the file `all-renders/` currently holds for that scene
  (as of 2026-09-14: `opening_v3`, `closing_v3`, `colours_v2`, `gates-saving_v5`,
  `ranking_v5`, `start-ride_v4`, `teaser_v6`).
- `teaser`: rows are the five sections of the v6 cut sheet (`silent-studio/teaser/README.md`
  + `rounds/v6/concat.txt`), one row per section with its in/out time, since the teaser
  audio is its own composition echoing each scene's motif (`structure.md` folder map).
- Status: `draft`. Current soundtrack round: the latest `soundvN` for that scene
  (`structure.md` folder map, lines 89–97).

If a timeline anchor cannot be read confidently (e.g. a scene whose `index.html` timing
is computed rather than literal), fill what is certain, put `?` in the Time cell for the
rest, and list those rows in the execution report — do not invent timestamps.

## 3. Structured feedback prompt in future `FEEDBACK.md` rounds

The existing rounds are history — **do not edit any existing `soundvN/FEEDBACK.md`**.
Instead add the convention for future rounds to `structure.md` (§4) and create a
template `audio-studio/FEEDBACK.template.md` whose "Nathan's feedback" section is:

```markdown
## Nathan's feedback
<!-- Per beat: copy the row number from AUDIO-BRIEF.md and say what's off. Whole-scene: pick what applies. -->
**Per beat:**
- #_ :

**Overall:** keep / closer / wrong direction
**Too much / too little:** (density — what should drop out or come in)
**Loudness balance:** (bed vs melody vs event pings — which is too loud/quiet)
**Silence:** (anywhere it should be quieter or silent, or where silence feels empty)
**Mood check:** does it match the three words in AUDIO-BRIEF.md? If not, what does it feel like instead?
**Reference:** (a sound/track that's closer to what you mean, if any)
```

The rest of the template mirrors the existing round layout (header lines Render /
Also here / Script / Source video / Built / Previous round; "What this is"; "What
changed since vN-1"; "What to listen for") — copy the structure from
`gates-saving/soundv3/FEEDBACK.md` lines 1–14 and 20–40, generic placeholders.

## 4. Doc updates

- `audio-studio/structure.md`: in "How a scene's sound is made", after the folder tree
  (line ~65), add `AUDIO-BRIEF.md` to the tree with a one-line description ("beat sheet
  + direction, Nathan's input before a round is composed; canonical, edited in place")
  and a short paragraph: the trigger for creating/refreshing it is a visual round being
  approved; Claude pre-fills, Nathan directs, then `soundtrack.py` is edited. Note the
  two templates at the root. Under "The one rule" add: direction changes go in
  `AUDIO-BRIEF.md`, round verdicts in `soundvN/FEEDBACK.md`.
- `audio-studio/APPROACH.md`: one short section "Nathan's input before a round (2026-09)"
  pointing at the beat-sheet convention and listing alternatives A–C above as
  considered/deferred, so the reasoning isn't lost.
- Root `STATE.md`: coordinator's step, not the executor's.

## 5. Verification (executor)

- Seven `AUDIO-BRIEF.md` files exist, each with ≥5 beat rows, Time cells numeric (or `?`
  and reported), column 5 empty, Status `draft`.
- Two template files exist at the audio-studio root.
- `git diff --stat` shows only: the two templates, seven new briefs, `structure.md`,
  `APPROACH.md`. No `.py` changed, no existing `FEEDBACK.md` changed.
- Spot-check: gates-saving brief's gate-crossing times are 6.46 / 9.15 / 10.60 s
  (`4.8 + [0.24, 0.63, 0.84] * 6.9`).

## 6. What Nathan does after execution

Open any scene's `AUDIO-BRIEF.md`, fill the last column and the direction lines for
the scene he cares about most, set Status. That scene's next `soundvN` is composed
against it. Everything else in the audio loop is unchanged.
