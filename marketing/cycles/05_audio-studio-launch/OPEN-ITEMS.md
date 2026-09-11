# Cycle 05 — open items

## Blocker: the device bridge can't run commands or delete files on Nathan's PC
`device_bash` reported "Workspace unavailable... A Windows update released
September 8 prevents Claude's workspace from reaching your files" partway through
this cycle — the same failure mode as `hyperframes` cycles 01-04, now with a named
cause. All file writes this cycle went through the stage/edit-locally/commit
fallback (`device_stage_files` / `device_commit_files`), which has no delete
capability. Two clean-up items are stuck behind this:

### 1. Delete two stub `README.md` files (superseded by the FEEDBACK.md merge)
```
audio-studio\gates-saving\soundv1\README.md
audio-studio\gates-saving\soundv2\README.md
```
Both were stubbed to a one-line "safe to delete" note rather than left stale, since
Claude can't remove them directly. Nathan said he'd delete these himself.

### 2. Delete six now-duplicate silent originals in `all-renders/`
Once the `all-renders/` convention was corrected to "every round, not just ones
worth keeping" (see README.md), Claude pushed all six soundv1 renders in
alongside the pre-existing silent files, which have different filenames and so
weren't overwritten:
```
audio-studio\all-renders\opening_v3.mp4        (superseded by opening_v3_with_sound_v1.mp4)
audio-studio\all-renders\closing_v2.mp4        (superseded by closing_v2_with_sound_v1.mp4)
audio-studio\all-renders\colours_v2.mp4        (superseded by colours_v2_with_sound_v1.mp4)
audio-studio\all-renders\ranking_v4.mp4        (superseded by ranking_v4_with_sound_v1.mp4)
audio-studio\all-renders\start-ride_v4.mp4     (superseded by start-ride_v4_with_sound_v1.mp4)
audio-studio\all-renders\teaser_v5.mp4         (superseded by teaser_v5_with_sound_v1.mp4)
```
Safe for Nathan to delete the six silent ones once he's confirmed the `_with_sound_v1`
versions play correctly.

## What Nathan needs to do next
1. Listen to all seven current rounds (gates-saving soundv2, plus soundv1 for the
   other six scenes) and leave notes directly in each round's `FEEDBACK.md` — that's
   the one file per round meant to carry feedback, no README alongside it.
2. Do the two deletions above once convenient (or wait for `device_bash` to recover
   on its own — no fix on Claude's side, per the tool's own error message).
3. Nothing needs re-rendering — every round this cycle built genuinely produced a
   playable `.mp4` in Claude's own sandbox (unlike `hyperframes` cycles 01-04, which
   were blocked from rendering entirely). Audio doesn't depend on `render.ps1` or
   Nathan's PC at all — that's the one structural difference from the visual side of
   `cycles/`.

## Judgment calls made without interrupting Nathan (logged for review, not defects)
- **Read `colours_v2.mp4`'s and the teaser's frames independently** rather than
  assuming the teaser is a concat of the individually-scored scenes — this is what
  surfaced that `colours` doesn't appear in the teaser cut at all. Treated as a
  finding to flag (in `teaser/soundv1/FEEDBACK.md`), not something to silently paper
  over by scoring the teaser as if `colours` were in it.
- **`brandmark` was split into `brandmark/opening/` and `brandmark/closing/`**
  sub-scene folders rather than one flat `brandmark/` folder with two soundtracks
  inside it, matching how `hyperframes/brandmark/` is itself already split. Each
  nested sub-scene reaches the shared `synth.py` with `sys.path.insert(0, "../..")`
  instead of the usual `".."`, documented in `structure.md`.
- **Every soundv1 stays deliberately restrained** relative to what a full "final"
  score might do — e.g. `start-ride` ends without a musical resolve, `brandmark/
  closing` only plays half of the shared brand chime — because these scenes flow
  into each other in the teaser and a hard resolve on every one would fight against
  that continuity. Worth Nathan's explicit read on whether that restraint reads as
  intentional or just underwhelming.

## Doc-only nits not fixed this cycle (cosmetic, low priority)
- `gates-saving/soundtrack.py` still has its own inline copy of the synthesis
  toolkit instead of importing the now-shared `synth.py` — harmless (nothing reads
  both), just a second copy of the same functions. Worth migrating next time that
  file gets touched for a new gates-saving round.
- The visual-beat timing tables in each `soundv1/FEEDBACK.md` (and the teaser's
  scene-order table) come from sampling extracted frames at ~1-2fps, not
  frame-exact cut points — flagged inline in each file; anything that sounds
  off-beat once watched is more likely a timing miss than an intentional choice.
