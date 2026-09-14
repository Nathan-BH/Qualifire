# Cycle 08 — day/night renders, audio-side control, guide verdict (+ website restructure)

**Status (2026-09-14): mostly executed.** Nathan: "construct briefs in each task
(fable) to be executed by a sonnet executor later (I dont have time to execute now)" —
that dispatch has now happened for items 1–3. Item 1 (day/night renders) is code-complete:
all seven compositions are tokenised (§3a/§3b/§4) and the surrounding infrastructure
(`render.ps1 -Theme day`, `_map/map-capture.html` day mode, the doc edits, `structure.md`)
is in; only the Nathan's-PC steps remain (§3f — map-day.png capture, the night PSNR
regression check, the actual day renders). Item 2's verdict was given and its two doc
fixes landed as part of item 1's edit pass. Item 3 (audio-studio control) is executed —
`AUDIO-BRIEF.md` files, the template, and the `structure.md`/`APPROACH.md` edits landed;
its alternative C was spun out into `BRIEF-audio-regen-local.md` instead of being executed
inline. Item 4 landed separately the same day. Item 5's brief is written but not yet
executed. `silent-studio/`, `audio-studio/` and `guides/` have all been changed by this
cycle. This README's "What shipped" table below reflects what actually landed;
`OPEN-ITEMS.md` for the remaining Nathan's-PC steps is still to be written. Later the same day, per Nathan ("keep all the commands in the cycle folder so it stays in
one place"), the day-render / day-capture command docs that item 1 had added to
`silent-studio/COMMANDS.md` and `silent-studio/_map/README.md`, plus the two guide
cross-pointers, were taken out of those files again and consolidated into `COMMANDS.md`
in this folder; item 5's walkthrough is redirected there too (its brief was edited, not
executed).

## What this cycle covers

Nathan's "Marketing" heading, 2026-09-14: one cycle for everything marketing —
`silent-studio`, `audio-studio`, and the website (`marketing/index.html` →
`marketing/website/`, handled as its own deliverable — see
`Nathan/Nathan's_notes6_review.md`).

| # | Item | Brief | Status |
|---|---|---|---|
| 1 | Day/night mode for silent-studio renders (audio-studio day renders explicitly deferred) | `BRIEF-daynight-renders.md` | code executed (§3a/§3b/§4 + §3c–§3e/§5 infrastructure); PSNR regression check + actual day renders are Nathan's PC steps, not done |
| 2 | `guides/VIDEO-EDITING-GUIDE.md` vs `silent-studio/COMMANDS.md` — which is stale, which is more useful | `BRIEF-guide-staleness-verdict.md` | executed — verdict given (no independent action needed), the two doc fixes folded into and landed with item 1 |
| 3 | More input/control for Nathan over the audio side once a visual render is approved | `BRIEF-audio-studio-control.md` | executed — `AUDIO-BRIEF.md` files, template and `structure.md`/`APPROACH.md` edits landed; alternative C spun out to `BRIEF-audio-regen-local.md`; git commit still pending |
| 4 | Website restructure into `marketing/website/` | executed separately, same day, outside this folder | done — see `marketing/website/README.md` |
| 5 | Local audio regeneration on Nathan's PC (`regen.ps1` + setup walkthrough) | `BRIEF-audio-regen-local.md` | not yet written — needs Digest of `audio-studio/structure.md`, `APPROACH.md`, `synth.py`, one `soundtrack.py`, an existing mux line; Nathan's Q2 = yes |
| — | Open questions across 1–3 | `questionsfornathan.md` | answered 2026-09-14; folded into the briefs |

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
2. **Day renders are on-request only; all seven compositions are tokenised in one
   pass** (Nathan, Q1: "everything at once"). The night PSNR regression check runs
   per composition before any day render is trusted.
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
2. **Item 1 runs as one pass over all seven compositions** (Nathan's Q1 answer
   overrides the earlier pilots-first plan). The regression control is the
   per-composition PSNR check in the brief's §3f, which Nathan runs before reviewing
   day output.
3. **Item 3 is independent of item 1** and can be executed first or in parallel — it
   only creates/edits markdown under `audio-studio/` and the FEEDBACK template. It is
   the cheaper of the two and the one that changes Nathan's day-to-day workflow most,
   so if only one gets executed soon, execute item 3.
4. **Item 4 (website)** landed at `marketing/website/` the same day as this cycle
   was briefed — see `Nathan/Nathan's_notes6_review.md` for what shipped there.

## What shipped (this folder)

| File | What it is | Executed? |
|---|---|---|
| `README.md` | This file. | — |
| `BRIEF-daynight-renders.md` | Ruling + Sonnet-executable brief for day/night renders, executed in one pass over all seven compositions (Nathan's Q1: "everything at once"), docs, verification. | yes (code; PC steps outstanding) |
| `BRIEF-guide-staleness-verdict.md` | Analysis: both guides current on paths, COMMANDS.md content-stale in two spots, keep both; the two fixes. | yes (fixes folded into and landed with item 1) |
| `BRIEF-audio-studio-control.md` | Ruling + Sonnet-executable brief for `AUDIO-BRIEF.md` beat sheets and the structured FEEDBACK prompt. | yes |
| `questionsfornathan.md` | Three questions, each with the default the briefs assume if unanswered. | answered 2026-09-14 |
| `COMMANDS.md` | Every copy-paste command this cycle adds, in one place per Nathan: day basemap capture, `-Theme day` renders, the night PSNR check, the day-render mux line, and (placeholder until item 5 runs) audio regen. | yes (2026-09-14) |

`marketing/silent-studio/`, `marketing/audio-studio/` and `marketing/guides/` have all
been modified by this cycle's execution (items 1–3). No render, no ffmpeg has been run
by an agent — those remain Nathan's-PC-only steps.

## Model-tier readout

| Tier | Model | Mandate | Outcome |
|---|---|---|---|
| Digest | Haiku | read-pass over `marketing/` (silent-studio structure, audio-studio structure/APPROACH/synth, cycle 07, the two guides) | Digest delivered. Two corrections found at Plan time by direct anchor checks: COMMANDS.md still carries legacy `gate/purple/tour` names + `rounds\v2`; `brandmark/opening|closing/index.html` now exist as real compositions. |
| Plan | Fable | rule on day/night structure, guide verdict, audio-control design; write the five files in this folder | Five files written in full. Rulings 1–4 above. |
| Execute | Sonnet | run `BRIEF-daynight-renders.md` (§3/§4/§3c–§3e/§5) and `BRIEF-audio-studio-control.md` | Executed. All seven compositions tokenised; `render.ps1`/`_map/map-capture.html`/docs/`structure.md` infrastructure landed; `AUDIO-BRIEF.md` files + template + `structure.md`/`APPROACH.md` edits landed. Git commit for the audio-control work still pending (`device_bash` was down). |
| Inspect | Fable (fresh) | adversarially recheck the execution | A fresh pass caught this README, `BRIEF-daynight-renders.md`, `BRIEF-audio-studio-control.md`, `AUDIO-BRIEF.md` and `start-ride/index.html` still claiming "not executed" / stale numbers / a missing theme-header comment — this doc-status cleanup is that pass's fix-up. Full re-verification of the rendered/tokenised code itself is still to be confirmed against a fresh Inspect. |

## After execution (coordinator follow-ups — still outstanding)

- Write this cycle's `OPEN-ITEMS.md` listing the remaining Nathan's-PC steps in
  implementation order, pointing at the numbered sections of `COMMANDS.md` (this
  folder) for the actual commands — do not duplicate the command blocks there.
- Update root `STATE.md`: day/night mechanism exists; which compositions have a day
  variant; `AUDIO-BRIEF.md` is now the audio entry point per scene.
- Commit the audio-studio-control work (`AUDIO-BRIEF.md` files, template,
  `structure.md`/`APPROACH.md` edits) — pending since `device_bash` was down during
  that execution pass.
- Execute item 5 (`BRIEF-audio-regen-local.md`) — written, not yet run.
- `silent-studio/structure.md` table rows for `brandmark/opening` / `brandmark/closing`
  were fixed as part of item 1's execution — no longer outstanding.
