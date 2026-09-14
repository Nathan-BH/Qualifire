# Cycle 09 — website round v2 content edits

**Status (2026-09-14): executed and landed.** Unlike cycles 06/07, this one did not
stall on `device_bash` — the stage/edit-locally/commit fallback was sufficient for
every step (text edits to one HTML file, an image downscale, asset commits). The
only thing this session could not do is open the page in an actual browser to watch
it render; that is the one item left for Nathan.

## What this cycle covers

Nathan's 2026-09-14 content-edit list for `marketing/website` (round v2), executed
from `website/rounds/v2/BRIEF-content-edits.md` — a fully self-contained,
already-written brief (Tier: Execute (Sonnet), stop-on-ambiguity) present on disk
before this cycle started, so there was no Digest/Plan step here: the thinking was
already done and recorded in the brief itself (its "Fable call" annotations on C1,
E2 are that record).

Summary of what the brief changed (see `website/rounds/v2/FEEDBACK.md` for the full
per-part account): deleted the hero pitch paragraph and tagline, deleted the mocked
"race mode" section and its dead CSS/JS, deleted the stray "time posted" philosophy
line, swept every em-dash/en-dash out of the file (title, meta, CSS comments,
aria-label, copy), rewrote the three "how it works" step paragraphs and the three
colour-swatch paragraphs to be terser and formal, replaced the flat placeholder
schematic with a real map render (OpenFreeMap dark basemap + SVG route/gates/rider,
geometry copied verbatim from `silent-studio/gates-saving/`), added a
pause-off-screen script for the new rider animation, retitled two section headings,
and rewrote the "after you ride" intro to explain the rolling ten-ride window.

## Implementation order and why

1. **Straight to Execute, no Digest/Plan.** The brief already existed complete and
   self-contained (round v2's `BRIEF-content-edits.md`) — dispatching a Digest or a
   fresh Fable to re-derive it would have re-done work already on disk. Per the
   protocol's analysis-vs-build split, once a brief exists the next step for an
   actual change is straight to a Sonnet executor.
2. **Execute (Sonnet), single subagent.** One file (`index.html`) with
   sequentially-dependent edits (e.g. the CSS rule for the deleted `.schematic`
   block has to go before the new `.map-render` CSS lands in the same region) does
   not parallelize usefully across subagents, so this stayed one dispatch.
3. **Inspect (Fable), fresh context.** Re-staged the brief and every landed file
   independently, re-derived all of Part F2's acceptance tests itself (not by
   reading the executor's numbers), and additionally re-checked the SVG geometry,
   dangling-reference sweep, and HTML well-formedness by hand.
4. **One nit, fixed directly by the coordinator.** The only finding was a
   documentation mismatch, not a page defect (see below) — under the ~10-line chore
   threshold, so it did not go back through another Sonnet+Fable round.

## What shipped

| File | What it is |
|---|---|
| `website/index.html` | Live page, edited in place per Parts A-E. |
| `website/assets/map.png` | New. Real route render, 1920x1080, downscaled from the 3840x2160 OpenFreeMap capture used by `silent-studio/gates-saving/`. |
| `website/rounds/v2/index_v2.html` | Frozen snapshot, byte-identical to `index.html`. |
| `website/rounds/v2/assets/map.png` | Copy of the asset, for the snapshot to open standalone. |
| `website/rounds/v2/FEEDBACK.md` | Round doc: what changed since v1, what to check, Nathan's-feedback placeholder. |
| `website/README.md` | v2 row updated from "pending" to "Built, awaiting Nathan's review". |

## Model-tier readout

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Execute | Sonnet | Land every instruction in `BRIEF-content-edits.md` Parts A-F on `website/index.html`, stop-on-ambiguity, via the stage/edit/commit fallback | 113,899 | All of Parts A-F landed, zero stops (every quoted string matched exactly once), all Part F2 acceptance tests passed on its own staged copies, all 6 files committed to the device with no rejections. |
| Inspect | Fable (fresh context) | Independently re-stage the landed files and the brief, re-derive every acceptance test and the substantive Part A-E checks from scratch, look for defects the executor might have missed | 102,746 | **Verdict: CONFIRMED** — every acceptance test independently reproduced, every substantive change traced against the brief and found correct (SVG geometry, gate coordinates, dangling-reference sweep, HTML well-formedness, `.map-render` transform math all checked by hand). One non-page finding: `map.png`'s two on-disk copies are pixel-identical but not byte-identical (each carries its own Anthropic C2PA manifest chunk stamped at commit time, +5,770 bytes over the PIL output), and the round's `FEEDBACK.md` had recorded the pre-commit PIL size rather than the on-disk size. |
| (chore) | Coordinator, no subagent | One-line fix: corrected the map.png byte size and noted the C2PA-chunk discrepancy in `website/rounds/v2/FEEDBACK.md` | — | Fixed directly (5 lines), re-committed. |

## After Nathan reviews (not done here)

- Neither this session nor the inspector could open the page in a real browser
  (`device_bash` unreachable → no way to launch one, and no Claude Browser tool was
  invoked). Everything checked here is static (grep-equivalent counts, XML/HTML
  well-formedness, hand-traced geometry) — see `OPEN-ITEMS.md` for the one visual
  check that's still open.
- Once Nathan reviews, his notes go in `website/rounds/v2/FEEDBACK.md` under
  "Nathan's feedback"; anything that should apply to every future round goes in
  the top-level `website/FEEDBACK.md` instead.
