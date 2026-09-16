# virgin-cycle9 — tier-colour revert + sector strip → thin bars (Nathan's colour-overload feedback)

**Status (2026-09-16): app work done**, pending Nathan's own on-device look; a second sub-task (marketing scenes) is briefed, revised after Nathan's Q5 answer, executed, and fresh-Inspect PASSed — all renders landed, teaser v8 delivered, docs updated, pending commit. Every code change landed
and passed a fresh-context Inspect. See `CONTEXT.md` for the full chat log and reasoning
behind every decision below — including a correction: this file and `STATE.md`/
`OPEN-ITEMS.md` briefly stated the wrong outcome on the tier-hex question earlier in this
cycle (fixed the same session, see CONTEXT.md's "Decision 1").

## What this cycle is for

Nathan wants cycle7's F1-broadcast tier hex back (`#9000C8`/`#00D000`/`#F5C542`,
`purpleDeep` `#65008C`) — he'd already rejected cycle8's phone-matched picks
(`#6D4E9C`/`#8BCD39`/`#FFDE6D`) on phone testing 2026-09-15, and this cycle is where that
revert actually got executed (it had only been logged before). Separately, and regardless of
which hex ships, he found the colours used too aggressively on screen. Two more asks
followed: (1) stop colouring the live map's route line by sector, and (2) replace the
four-box "sector strip" under the lap clock with a thinner, F1-style bar-per-sector, drawn
from his own mockup (`design/canonical/record_running_night_nbh.svg`). A mid-cycle extra:
the sector-spans map layer's line-width bump (thickening a completed sector's line) removed
too.

## Landed this cycle

| Change | What | Status |
|---|---|---|
| `settings.sectorColours` default → `false` | One-line chore (+ doc comment) in `app/src/ui/settings.tsx`; the toggle stays available as an opt-in. Reverts the live map, ride-detail trace and RIDES row to a plain yellow line by default. | **Executed**, commit `54aae2d` |
| Sector strip: boxes → thin bars | `StripSlot` (chips.tsx): four filled/outlined boxes → label + 6dp bar per sector, grey until completed with an earned tier, no current-sector cue (Nathan: the `contextLabel` line above the clock already names it). Confined to `chips.tsx`; `liveView.tsx`/`RecordScreen.tsx`/`DemoScreen.tsx` needed no changes. | **Executed + fresh-Inspect PASS**, commits `f60b6d0`/`80b4145`/`7d097eb` |
| Sector-spans map line-width bump removed | `wayMapView.tsx`'s `sector-spans-core` layer: width 6 → 4 (matches the base route/trail core). Was visibly thickening the line the instant a sector completed — Nathan noticed on DEMO, "not a feature I asked for." | **Executed**, commit `eb8ad99` |
| Tier colours reverted to cycle7's F1-broadcast hex | `theme.ts`, `wayMapStyle.ts`'s D-030 hue-band firewall + its 2 test suites, the launcher icon PNGs, and every marketing/product file cycle8's colour swap touched — all restored byte-for-byte from before that commit (sha256-verified). Cycle8's own docs/scripts kept. | **Executed**, commit `950a72e` |
| Marketing scenes: render-remake pass | `BRIEF-marketing-sector-update.md` (revised after Nathan's Q5 answer, which overruled the first draft's plain-yellow-route + strip plan) — `gates-saving/index.html` + `ranking/index.html`: painted route kept, its 9px overlays → the core's 6px (colour flips, no thickening), gate ticks white throughout, no strip; `ranking` also: Today row green (P2), climb `power2.out` at the same 2.2s with recomputed row step-downs, one caption instead of two; `brandmark/closing/index.html`: rebuilt as opening's wordmark + tagline beat (no mark), still 4.0s. `start-ride`, `colours`, `opening`, `teaser/index.html` out of scope. Renders are Nathan's step (three compositions); rounds/all-renders/teaser v7/audio are a follow-up. | **All three renders (gates-saving, ranking, closing) landed and picked into rounds/ + both all-renders mirrors. Audio fixed and remuxed for gates-saving and ranking (GREEN_CHIME, not PURPLE_CHIME, for the P2 settle). Ranking got one further refinement (white during the climb, green only on landing at 5.4s) - rendered, verified frame-by-frame, and picked as v7. Teaser assembled and delivered twice: v7 (all three fixes) then v8 (ranking's white-then-green swap). Closing's own audio pairing not yet re-composed (deferred, not requested).** |

Taste-call questions: `QUESTIONSFORNATHAN.md` — Q1-Q5 all answered (Q5's answer overruled the marketing brief's default; brief revised).

## Digest → Plan → Execute → Inspect readout (sector-strip redesign)

| Tier | Model | Tokens | Outcome |
|---|---|---|---|
| Digest | Haiku | 77,045 | Line-anchored digest of `chips.tsx`, `liveView.tsx`, `RecordScreen.tsx`, `settings.tsx`, `wayMapView.tsx`, `wayMapStyle.ts`, `theme.ts`, `demoModel.ts`/`DemoScreen.tsx`, `RideDetailScreen.tsx`/`rideDetailModel.ts`, `selfRaceModel.ts`, and 4 test files |
| Plan | Fable | 64,412 | Assessment of Nathan's idea, `BRIEF-sector-strip-bars.md`, `QUESTIONSFORNATHAN.md`. Its container had no repo mount, so its "tier colour source" design decision (`chipColors().border`) turned out wrong — see Inspect below |
| (Q&A fold-in) | direct | — | Nathan's `QUESTIONSFORNATHAN.md` answers folded into the brief directly (no current-sector cue, bar thickness bumped, discrete-only confirmed) — applying answered questions, not new design |
| Execute | Sonnet | 102,965 | Implemented the brief; correctly stopped on one stale, self-contradicting brief instruction (a doc-comment note) rather than guessing |
| (ambiguity ruling) | Fable | 49,713 | Ruled on the correct `StripSlot` doc-comment wording; applied directly (mechanical) |
| Inspect #1 | Fable (fresh) | 90,763 | **FAIL** — found `chipColors(tier,t).border` is `'transparent'` for yellow, so yellow/neutral sectors rendered fully invisible |
| (bugfix) | direct | — | Switched to `tierLineColour(tier)`, this file's own established source of truth for a tier's colour — mechanical, Inspect fully specified the fix |
| Inspect #2 | Fable (fresh) | 71,271 | **PASS** — all six `Tier` values traced correctly, nothing else regressed, tests 583/583, tsc clean |

The `settings.sectorColours` default flip, the line-width removal, and the tier-colour revert
were all mechanical fixes with a fully-known target state and were done directly by the
coordinator rather than through Digest/Plan/Execute, per `process/CONVENTIONS.md`'s size
threshold and because no design decision was actually open in any of the three.

## Files in this folder

- `CONTEXT.md` — full chat log, every decision made (including the tier-colour correction),
  and the reasoning behind each
- `BRIEF-sector-strip-bars.md` — the strip redesign's implementation brief (as executed —
  revised twice: once for Nathan's Q&A, once for the doc-comment ambiguity)
- `BRIEF-marketing-sector-update.md` — sub-task 2: the marketing render-remake pass
  (briefed 2026-09-16, revised the same day on Nathan's Q5 answer + four extra feedback
  items; executed + Inspect PASS; renders are Nathan's step)
- `QUESTIONSFORNATHAN.md` — taste-call questions; Q1-Q5 all answered
