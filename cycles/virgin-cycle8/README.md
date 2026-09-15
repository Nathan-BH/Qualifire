# virgin-cycle8 — colour round 2 (Nathan's own picks) + phone dev-loop script

**Status (2026-09-15): executed, inspected (PASS WITH NOTES), committed (`6da58a2`) —
then REJECTED by Nathan on phone testing.** "although they are closer to the pc colours, on
the phone they are too faint. So i would just keep the current colours we have." He asked
only to log the verdict, not to revert the code yet ("no change needed for now"). So as of
this writing **the app still ships cycle8's round-2 hex** (`#6D4E9C`/`#8BCD39`/`#FFDE6D`) even
though Nathan wants cycle7's F1-broadcast hex (`#9000C8`/`#00D000`/`#F5C542`,
`purpleDeep` `#65008C`) back — the revert is logged as open (`OPEN-ITEMS.md`), not executed.
Nathan also floated a follow-up: "I think we can use the colours in a better way" — no spec
yet, not actioned.

## What this cycle is for

cycle7 (`c9db5d5`) swapped tier purple/green to F1's official broadcast hex. Nathan then
noticed the same colours read differently on his phone vs. his PC screen (screen rendering,
not a hex bug — `marketing/hex-colours/SUMMARY.md` has the full back-and-forth: a first
numbered gradient anchored on the app's exact hex, then a second gradient centred on colours
Nathan colour-wheel-matched on his phone against the PC screen, then a third round revising
the green centre). Nathan picked from the third gradient (`qualifire_colour_gradient_v3.png`):
**yellow 7, green 6, purple 5** — and asked for (1) those colours applied everywhere the old
ones lived, including the launcher icon (not just `theme.ts`), and (2) a script to get the
change onto his phone's dev-client build for testing.

## Brief in this folder

| Brief | What | Status |
|---|---|---|
| `BRIEF-colours-round2.md` | purple `#9000C8`→`#6D4E9C`, green `#00D000`→`#8BCD39`, yellow `#F5C542`→`#FFDE6D`, `purpleDeep` re-derived to `#4C376D` (×0.7 of new purple); D-030 hue-band firewall re-centred (green 100–140°→67–107°, purple 263–303°→244–284°, since these picks land on different hues, not just different saturation/lightness); applied across the same file set `c9db5d5` touched plus a few yellow-only spots that round didn't need (brandmark HTML, the monogram/wordmark SVG, `marketing/website/index.html`'s rgba triples); launcher icon (`app/assets/icon.png`, `adaptive-icon.png`) recoloured in place via a new `scripts/recolour-icon.py` (3-colour decomposition so the anti-aliased ring edge isn't tinted); two new dev-loop scripts, `scripts/dev-phone.ps1`/`.cmd` | **Executed, Inspected: PASS WITH NOTES** |

`cycles/virgin-cycle8/DIGEST-colours-round2.md` has the line-anchored source digest the brief
was planned from, if the file-by-file reasoning is ever needed again.

## Digest → Plan → Execute → Inspect readout

| Tier | Model | Tokens | Outcome |
|---|---|---|---|
| Digest | Haiku | 81,080 | `DIGEST-colours-round2.md` written, 690 lines |
| Plan | Fable | 130,747 | `BRIEF-colours-round2.md` written, ~475 lines; dry-run clean |
| Execute | Sonnet | 97,449 | All edits applied per brief; 0 stops; tests 583/583 pass, 3 skip; tsc clean |
| Inspect | Fable (fresh) | 97,274 | Independently re-verified all 8 acceptance items; **PASS WITH NOTES** (2 cosmetic, see below) |

## Inspect's two notes (both cosmetic, addressed / accepted)

1. `product/MAP-TILES.md`'s route-yellow line claimed to "match `08_build_route_assets.py`'s
   constants exactly" — that script is retired (`safe_to_delete/virgin-branch-cut-20260831/…`)
   and still has the pre-cycle8 hex, so the claim was stale. **Fixed directly** (coordinator,
   mechanical wording edit, <10 lines) — the line now states the current app/render values and
   notes the retired script is not live source.
2. `scripts/recolour-icon.py` raises an ugly `ValueError` (not a clear message) if re-run with
   default args against already-recoloured PNGs, because it then finds zero old-colour pixels
   to sample. It fails safe (crashes before writing, so it can't double-apply), just not
   gracefully. **Left as a follow-up chore** — not blocking, noted here for whoever touches
   the script next.

## What did NOT change (deliberately, mirroring `c9db5d5`'s own scope call)

Frozen round snapshots (`rounds/v1`, `rounds/v2`, `marketing/cycles/*`) and closed brand
explorations (`product/brand/**` except `README.md` — `make_logos.py`'s `YEL`/`GRN`/`PUR`
constants still hold the *original*, pre-cycle7 values, untouched through two colour rounds
now). `app/assets/icon/` (a separate, never-wired "staged for build 3" icon set) — left alone,
`app.json` doesn't reference it.

## One thing for Nathan to know

The launcher icon (the recoloured PNGs) is a **native asset** — it only reaches the phone at
the next numbered EAS build, not through `dev-phone.ps1`'s Fast Refresh. Everything else
(in-app tier colours, buttons, the DEMO tab) updates live over Metro.
