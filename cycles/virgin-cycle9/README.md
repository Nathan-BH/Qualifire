# virgin-cycle9 — sector strip → thin bars + live-map colour default (Nathan's colour-overload feedback)

**Status (2026-09-16): partially landed.** The live-map colour default flip is executed and
committed (`54aae2d`). The sector-strip redesign is fully briefed, ready for an Execute
dispatch, not yet run. See `CONTEXT.md` for the full chat log and reasoning behind every
decision below; this file is the index.

## What this cycle is for

Nathan decided (`marketing/hex-colours/SUMMARY.md`) to keep cycle8's tier hex
(`#6D4E9C`/`#8BCD39`/`#FFDE6D`) permanently, closing the open reconsider-cycle7's-hex
question — but found the colours are used too aggressively on screen. Two independent asks
followed: (1) stop colouring the live map's route line by sector, and (2) replace the
four-box "sector strip" under the lap clock with a thinner, F1-style bar-per-sector, drawn
from his own mockup (`design/canonical/record_running_night_nbh.svg`).

## Landed this cycle

| Change | What | Status |
|---|---|---|
| `settings.sectorColours` default → `false` | One-line chore (+ doc comment) in `app/src/ui/settings.tsx`; the toggle stays available as an opt-in. Reverts the live map, ride-detail trace and RIDES row to a plain yellow line by default. | **Executed**, tests 583/583 pass (3 skip), tsc clean, commit `54aae2d` |

## Briefed, not yet executed

| Brief | What | Status |
|---|---|---|
| `BRIEF-sector-strip-bars.md` | `StripSlot` (chips.tsx): four filled/outlined boxes → label + 4px bar per sector, grey until completed with an earned tier, current sector cued by a brightened label only. Confined to `chips.tsx` (+ at most one `liveView.tsx` line). No screen changes needed (`RecordScreen.tsx`/`DemoScreen.tsx` consume the shared component as-is). | **Ready to execute** — not blocked on `QUESTIONSFORNATHAN.md` |

Open taste-call questions (none blocking): `QUESTIONSFORNATHAN.md`.

## Digest → Plan readout (Execute / Inspect not run yet)

| Tier | Model | Tokens | Outcome |
|---|---|---|---|
| Digest | Haiku | 77,045 | Line-anchored digest of `chips.tsx`, `liveView.tsx`, `RecordScreen.tsx`, `settings.tsx`, `wayMapView.tsx`, `wayMapStyle.ts`, `theme.ts`, `demoModel.ts`/`DemoScreen.tsx`, `RideDetailScreen.tsx`/`rideDetailModel.ts`, `selfRaceModel.ts`, and 4 test files — confirmed the single shared `sectorColours` toggle and the `StripSlot`/`liveView.tsx` component boundary |
| Plan | Fable | 64,412 | Assessment of Nathan's idea (relayed in chat), `BRIEF-sector-strip-bars.md`, `QUESTIONSFORNATHAN.md`, this README's summary — no code touched, per the pipeline's rules. Noted its container didn't have the repo mounted, so brief anchors are the digest's, not independently re-verified — Execute must confirm them |
| Execute | — | — | Not dispatched yet |
| Inspect | — | — | Not dispatched yet |

The `settings.sectorColours` default flip above was a mechanical one-line chore and
deliberately skipped the pipeline (`process/CONVENTIONS.md`'s size threshold), done directly
by the coordinator.

## Files in this folder

- `CONTEXT.md` — full chat log, the three decisions made, and the reasoning behind each
- `BRIEF-sector-strip-bars.md` — self-contained implementation brief for the strip redesign
- `QUESTIONSFORNATHAN.md` — taste-call questions, none blocking execution
