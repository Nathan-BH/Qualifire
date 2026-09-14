# Cycle 05 — audio-studio launch (first cycle to track audio alongside visual)

First cycle recorded in this shared log for the new `audio-studio/` sound-design
project, not just `silent-studio/` visual edits — per Nathan's request, `cycles/` is
now the one running track for both.

## Goal
Stand up `audio-studio/` as a working, iterable sound-design project (mirroring
`silent-studio/`'s own conventions), get gates-saving through two real rounds, then
give every other teaser ingredient — `brandmark/opening`, `brandmark/closing`,
`colours`, `ranking`, `start-ride`, and the full `teaser` — a first-pass ("soundv1")
soundtrack so there's a starting point to react to everywhere, not just gates-saving.

## What triggered it
Nathan tried Pixverse's video-to-audio tool on `gates-saving_v4.mp4` and found the
free tier unusable for real back-and-forth (one short trial, no iteration). Asked
for a free, iterable alternative — ideally something Claude could do directly. After
ruling out MMAudio (shared-queue demo, same one-shot problem) and MusicGen/Stable
Audio Open (need multi-GB weights + GPU, too heavy for the sandbox), landed on
Claude writing the soundtrack directly as Python (numpy/scipy synthesis, mixed on
with ffmpeg) — no account, no quota, genuinely iterative. Nathan then created
`audio-studio/` himself (one folder per teaser ingredient, an `all-renders/` for
current-best files) and asked Claude to work it "similarly as in the hyperframes
folder" and keep the docs current as it went.

## How it was built
Done directly in one continuous session — no digest/plan/execute/inspect pipeline,
no subagents; this cycle is small enough (single-agent synthesis + ffmpeg muxing,
not a multi-file codebase edit) that it didn't call for one.

1. **gates-saving, two rounds.** soundv1: isolated cue-sheet approach (chimes/whoosh/
   pulse at each event, no real harmony) — Nathan's feedback was "just a pulse or a
   single chord." soundv2: an actual chord progression (Cmaj9→Am7→Fmaj7→Gadd9→Cmaj)
   mapped to the visual's beats, a Karplus-Strong plucked-string arpeggio that speeds
   up with the runner, and a hand-built Schroeder reverb — the reverb pass turned out
   to be most of what makes it sound "produced" rather than "synthesized." Nathan
   swapped `gates-saving_v4_with_sound_v2.mp4` into `all-renders/` himself.
2. **Folder-convention corrections, twice, both from Nathan reviewing the actual
   layout against `silent-studio/`:** rounds are named `soundv1`/`soundv2` (not
   `rounds/vN`), and a round folder holds only `FEEDBACK.md` (no `README.md`) —
   matching `silent-studio/gates-saving/rounds/v3`, which has no README either, so
   feedback never means switching files. Both corrections applied retroactively to
   gates-saving's existing rounds; the second one also merged each round's README
   content into its FEEDBACK.md.
3. **Extracted a shared toolkit, `synth.py`,** at the `audio-studio/` root once six
   more scenes needed the same envelope/note/chord/pluck/reverb building blocks
   gates-saving had defined inline — plus a shared vocabulary (`BRAND_CHIME_RISE`/
   `LAND`, `YELLOW_TONE`/`GREEN_CHIME`/`PURPLE_CHIME`) so every scene sounds like one
   project instead of independent experiments. `gates-saving/soundtrack.py` itself
   still has its own inline copy (predates the extraction, untouched — low-priority
   cleanup, see Open items).
4. **Built soundv1 for all six remaining silent renders**, reading each one's visual
   beats from extracted frames first (same method as gates-saving), then picking a
   chord/timbre map for that scene's specific arc — full detail and the visual-beat
   tables are in each scene's own `soundv1/FEEDBACK.md`. One finding worth flagging:
   reading the teaser's own frames end-to-end showed `colours_v2.mp4`'s bar-chart
   scene does not appear in the assembled teaser cut — the tier-colour idea shows up
   there through gates-saving's route re-colouring instead, so the teaser's
   soundtrack borrows gates-saving's chord-per-tier idea for that section, not
   colours'.
5. **Corrected the `all-renders/` convention** after Nathan pointed out the "only
   copy a round in once it's worth keeping" rule was never one he'd actually set —
   every round, soundv1 included, now gets copied into `all-renders/` as soon as
   it's built, so that folder is always Claude's latest work per scene for a quick
   look, not a gate.

## What shipped
| Scene | Round | Duration | Status |
|---|---|---|---|
| gates-saving | soundv1 | 12.3s | superseded by soundv2 |
| gates-saving | soundv2 | 12.3s | in `all-renders/`, awaiting Nathan's feedback |
| brandmark/opening | soundv1 | 6.5s | awaiting feedback |
| brandmark/closing | soundv1 | 4.0s | awaiting feedback |
| colours | soundv1 | 19.0s | awaiting feedback |
| ranking | soundv1 | 10.1s | awaiting feedback |
| start-ride | soundv1 | 14.0s | awaiting feedback |
| teaser | soundv1 | 46.9s | awaiting feedback (independent composition, not a concat) |

Plus: `audio-studio/synth.py` (new shared toolkit), `structure.md` and `APPROACH.md`
both rewritten to current state, every scene's top-level `README.md` written or
updated, `brandmark/` split into `brandmark/opening/` + `brandmark/closing/`
sub-scenes (mirroring how `silent-studio/brandmark/` is itself split).

## Known open items and what Nathan needs to do next
See `OPEN-ITEMS.md` in this folder.
