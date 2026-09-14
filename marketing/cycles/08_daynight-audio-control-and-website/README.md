# Cycle 08 — day/night renders, audio-side control, guide verdict (+ website restructure)

**Status (2026-09-14): briefed, NOT executed.** Nathan: "construct briefs in each task
(fable) to be executed by a sonnet executor later (I dont have time to execute now)."
Every item below is a self-contained brief a Sonnet executor can run alone under the
stop-on-ambiguity rule. Nothing in `silent-studio/`, `audio-studio/` or `guides/` has
been changed by this cycle yet. When execution happens, this README's "What shipped"
table and an `OPEN-ITEMS.md` (per `cycles/README.md`: one ordered copy-paste path for
every command Nathan has to run) get written at that point — not before, since there is
nothing to run yet.

## What this cycle covers

Nathan's "Marketing" heading, 2026-09-14: one cycle for everything marketing —
`silent-studio`, `audio-studio`, and the website (`marketing/index.html` → new
`website/` folder, handled as its own deliverable — see `Nathan/Nathan's_notes6_review.md`).

| # | Item | Brief | Status |
|---|---|---|---|
| 1 | Day/night mode for silent-studio renders (audio-studio day renders explicitly deferred) | `BRIEF-daynight-renders.md` | briefed, not executed |
| 2 | `guides/VIDEO-EDITING-GUIDE.md` vs `silent-studio/COMMANDS.md` — which is stale, which is more useful | `BRIEF-guide-staleness-verdict.md` | verdict given; two small doc fixes briefed, not executed |
| 3 | More input/control for Nathan over the audio side once a visual render is approved | `BRIEF-audio-studio-control.md` | briefed, not executed |
| 4 | Website restructure into `website/` | executed separately, same day, outside this folder | done — see the website `README.md` |
| — | Open questions across 1–3 | `questionsfornathan.md` | awaiting Nathan (each has a stated default, so execution is not blocked) |

## Staleness verdict (item 2, short form)

Both files are current on **paths** (post-cycle-07 `marketing/silent-studio/` everywhere).
`VIDEO-EDITING-GUIDE.md` (2026-09-09, 270 lines) is fully current for what it is: a
one-time strategic answer to four workflow/software questions. `COMMANDS.md`
(mtime 2026-09-14 14:06, 117 lines) is the day-to-day cheat-sheet and the one Nathan
actually reaches for — **but it is content-stale in two places**: its "Any composition"
section still uses the legacy names `gate` / `purple` / `tour` (lines 18–38) and its
product-scene section still says "copy to `rounds\v2`" (line 64; current rounds are
v4–v6). `structure.md` line 91 already lists exactly this as pending cleanup. Neither
file supersedes the other; keep both; fix the two spots in COMMANDS.md (folded into
item 1's execution, since that brief edits COMMANDS.md anyway). Full reasoning in
`BRIEF-guide-staleness-verdict.md`.

## Rulings made in this cycle (so nobody re-litigates them)

1. **Day/night = one parameterised `index.html` per composition, not a forked day
   folder.** A theme is a CSS-custom-property palette block (mirrors the website's
   `:root[data-theme="light"]` mechanism); `render.ps1 -Theme day` selects it via a
   one-line `theme.js` sidecar it writes and restores. Day renders are **variants of an
   approved night round**, stored *inside* that round (`rounds/vN/<comp>_vN_day.mp4`),
   never a separate rounds tree. Night stays the reference that iterates.
2. **Day renders are on-request only**, starting with two pilots (`gates-saving`,
   `brandmark/opening`) to prove the mechanism and check that night output is
   unchanged after tokenisation. Rollout to the other five compositions is Phase 2 of
   the same brief.
3. **Audio-studio day renders: not now** (Nathan's own "not a priority"). When a day
   render exists, the existing `soundtrack_vN.wav` muxes onto it with one ffmpeg line;
   the brief records that line and stops.
4. **Audio control = a per-scene `AUDIO-BRIEF.md` beat sheet** that Claude pre-fills
   from the composition's timeline and Nathan edits *before* Claude touches
   `soundtrack.py`, plus a structured "Nathan's feedback" prompt in every future
   `soundvN/FEEDBACK.md`. No config-file layer over `soundtrack.py` (rejected — see the
   brief for why), stems and local regeneration listed as later options.

## Implementation order and why

1. **Item 2's two COMMANDS.md fixes ride along with item 1** — item 1 adds a
   `-Theme` section to COMMANDS.md, so the stale names get corrected in the same edit
   pass and the same inspection.
2. **Item 1 Phase 1 (pilots) before Phase 2 (rollout).** Tokenising a composition
   touches every colour literal in its `index.html`; the night render must come out
   visually identical afterwards (PSNR check in the brief). Prove that on one map
   scene and one non-map scene, have Nathan render both themes, *then* roll out.
   Doing all seven at once multiplies the regression surface before the mechanism is
   proven.
3. **Item 3 is independent of item 1** and can be executed first or in parallel — it
   only creates/edits markdown under `audio-studio/` and the FEEDBACK template. It is
   the cheaper of the two and the one that changes Nathan's day-to-day workflow most,
   so if only one gets executed soon, execute item 3.
4. **Item 4 (website)** landed the same day as this cycle was briefed — see
   `Nathan/Nathan's_notes6_review.md` for what shipped there.

## What shipped (this folder)

| File | What it is | Executed? |
|---|---|---|
| `README.md` | This file. | — |
| `BRIEF-daynight-renders.md` | Ruling + Sonnet-executable brief for day/night renders (Phase 1 pilots, Phase 2 rollout, docs, verification). | no |
| `BRIEF-guide-staleness-verdict.md` | Analysis: both guides current on paths, COMMANDS.md content-stale in two spots, keep both; the two fixes. | no (fixes folded into item 1) |
| `BRIEF-audio-studio-control.md` | Ruling + Sonnet-executable brief for `AUDIO-BRIEF.md` beat sheets and the structured FEEDBACK prompt. | no |
| `questionsfornathan.md` | Three questions, each with the default the briefs assume if unanswered. | awaiting |

Nothing under `marketing/silent-studio/`, `marketing/audio-studio/` or
`marketing/guides/` was modified by this cycle. No render, no ffmpeg, no git write.

## Model-tier readout

| Tier | Model | Mandate | Outcome |
|---|---|---|---|
| Digest | Haiku | read-pass over `marketing/` (silent-studio structure, audio-studio structure/APPROACH/synth, cycle 07, the two guides) | Digest delivered. Two corrections found at Plan time by direct anchor checks: COMMANDS.md still carries legacy `gate/purple/tour` names + `rounds\v2`; `brandmark/opening|closing/index.html` now exist as real compositions. |
| Plan | Fable | rule on day/night structure, guide verdict, audio-control design; write the five files in this folder | Five files written in full. Rulings 1–4 above. |
| Execute | Sonnet | — | not dispatched (Nathan: no time to execute now) |
| Inspect | Fable (fresh) | — | not dispatched; required before either brief is marked done |

## After execution (coordinator follow-ups, not done here)

- Write this cycle's `OPEN-ITEMS.md` with the combined PowerShell block (map-day
  capture, `render.ps1 -Theme day` calls, copy + `ffprobe` loop, PSNR regression
  check) in implementation order.
- Update root `STATE.md`: day/night mechanism exists; which compositions have a day
  variant; `AUDIO-BRIEF.md` is now the audio entry point per scene.
- `silent-studio/structure.md` table rows for `brandmark/opening` / `brandmark/closing`
  still say "not yet — code in `teaser/index.html`"; they have their own `index.html`
  now. Doc nit, fix when structure.md is next edited (item 1 edits it).
