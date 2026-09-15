# BRIEF — colours round 2 (Nathan's final picks) + phone dev-loop script

**Tier:** Execute (Sonnet). **Repo:** `C:\Users\natha\Claude personal projects\Qualifire`, reachable ONLY through
`mcp__remote-devices__device_bash` (mounted at `$HOME/mnt/Qualifire`). Everything below runs there. Do not use the
cloud container's Bash for repo work.

**Rule of the brief:** if any ambiguity or surprise arises, STOP and report back — never guess.

**Do NOT:** commit, stage (`git add`), touch `STATE.md` / `OPEN-ITEMS.md`, touch `marketing/hex-colours/SUMMARY.md`
(it is Nathan's own modified working-tree file — leave it exactly as found), or edit anything in the OUT OF SCOPE list
(section 7). Bookkeeping stays with the coordinator.

**Git in this VM:** the sandbox cannot delete files, so any git command that takes an index lock leaves a stale
`.git/index.lock` behind. Use `git --no-optional-locks status` / `git --no-optional-locks diff` for read-only checks
and nothing else from git. If you ever see `.git/index.lock` exist, do not try to remove it — mention it in the report.

**Deleting anything:** never. If something must go, `mv` it into `safe_to_delete/` and say so in the report. (This
brief needs no deletions.)

---

## 0. What Nathan asked (verbatim, one message, one landing)

1. "from … qualifire_colour_gradient_v3.png i would pick yellow7, green6, purple5" — final picks are
   **purple `#6D4E9C`**, **green `#8BCD39`**, **yellow `#FFDE6D`**. They replace the current app colours
   `#9000C8` / `#00D000` / `#F5C542` everywhere the old hex lives, same policy as commit `c9db5d5` (cycle 7) — live
   code, live marketing pieces and live product docs are updated; frozen round snapshots and closed brand explorations
   stay historical record.
2. "is it possible to make a script that will load a test app in the qualifire development app on my phone so i can
   test the new colours on my phone demo. The updated yellow7 should also be used everywhere in the app from the logo to
   the buttons"

## 1. The colour map (the only numbers you need; all derived, verified by Plan)

| Role | OLD (current) | NEW | Note |
|---|---|---|---|
| purple (filled tier) | `#9000C8` | `#6D4E9C` | RGB(109,78,156), HSL hue ≈ 264° (was ≈283°) |
| purpleDeep | `#65008C` | `#4C376D` | theme.ts rule "channels ×0.7 of `purple`": 109×0.7=76.3→76=0x4C, 78×0.7=54.6→55=0x37, 156×0.7=109.2→109=0x6D |
| green (outlined tier) | `#00D000` | `#8BCD39` | RGB(139,205,57), hue ≈ 87° (was 120°) |
| yellow / `neutral` | `#F5C542` | `#FFDE6D` | RGB(245,197,66) → RGB(255,222,109), hue ≈ 46° |

Hex tokens in the repo are ALL uppercase (`#9000C8`, `#00D000`, `#F5C542`, `#65008C`) — Plan grepped for lowercase
variants in live files: none. Replacements are exact, case-sensitive, whole-token (`#F5C542` → `#FFDE6D` etc.).
The website additionally spells the yellow as an rgba triple `245,197,66` → `255,222,109` (section 3.3).

**D-030 firewall hue bands (wayMapStyle.ts).** The firewall protects the app's own two tier hues with a ±20° band
around each (same construction c9db5d5 used: 120→[100,140], 283→[263,303]). Re-centred on the new hues:

| Band | OLD | NEW |
|---|---|---|
| GREEN_HUE_MIN / MAX | 100 / 140 | **67 / 107** (87 ± 20) |
| PURPLE_HUE_MIN / MAX | 263 / 303 | **244 / 284** (264 ± 20) |

`SAT_THRESHOLD` (25) and `FLATTENED_SAT` (20) are unchanged. Sanity (for your own confidence, no action): the new
yellow (hue 46) sits 21° below the green band, riderBlue `#2F7DE1` (hue ≈214) and amber `#E8A33D` (hue ≈36) are outside
both bands. Expect the firewall to now flatten more of a basemap's warm yellow-green land colours (hue 67–107) — by
design, no code change.

---

## 2. Part A — app code (4 files)

Before editing each file, `sed -n` the quoted lines and confirm the anchor text matches. If it does not, STOP.

### 2.1 `app/src/ui/theme.ts` (5 tokens: lines 16–19 and 45)

Current (verified by Plan 2026-09-15):
```
16  purple: '#9000C8', // filled tier — fastest of the ranking pool (colourModel.ts)
17  purpleDeep: '#65008C', // darker purple (channels x0.7 of `purple`) — unreferenced today; keep in step with `purple`
18  green: '#00D000', // outlined tier — above the pool's recent average
19  neutral: '#F5C542', // flat tier / accent — warm, never grey
…
45 * yellow *surfaces* (START, Export) stay #F5C542 everywhere.
```
Edit: `'#9000C8'` → `'#6D4E9C'`; `'#65008C'` → `'#4C376D'`; `'#00D000'` → `'#8BCD39'`; `'#F5C542'` → `'#FFDE6D'`
(line 19 AND the comment on line 45). Comments otherwise untouched.

**Buttons / everything else in `app/src`:** Plan's digest grepped every `.ts`/`.tsx` under `app/src` for tier hexes —
the ONLY definitions are these theme.ts lines; every button, chip, map line and gate colour imports `colors` from
theme.ts. Updating theme.ts alone propagates to every button. Do not go hunting for more; there is nothing.

### 2.2 `app/src/ui/wayMapStyle.ts` (comment lines 13–14, constants lines 25–28)

Current:
```
13 *     colors.green (#00D000, hue 120) and colors.purple (#9000C8, hue
14 *     ~283) in theme.ts are score-only colours — the basemap may never wear
…
25 const GREEN_HUE_MIN = 100;
26 const GREEN_HUE_MAX = 140;
27 const PURPLE_HUE_MIN = 263;
28 const PURPLE_HUE_MAX = 303;
```
New:
```
 *     colors.green (#8BCD39, hue ~87) and colors.purple (#6D4E9C, hue
 *     ~264) in theme.ts are score-only colours — the basemap may never wear
…
const GREEN_HUE_MIN = 67;
const GREEN_HUE_MAX = 107;
const PURPLE_HUE_MIN = 244;
const PURPLE_HUE_MAX = 284;
```
Nothing else in the file changes (`inFirewallBand` / `firewallValue` read the constants).

### 2.3 `app/tests/waymapstyle_suite.ts` (header lines 6–10, swatch line 23, assertion line 79)

The in-band green swatch `'#44CC44'` is hue 120 — OUTSIDE the new green band [67,107], so the "desaturates an in-band
green background" test would fail. Replace it with `'#88CC44'` (RGB 136,204,68: hue exactly 90 by the standard
HSL formula, S ≈57%, L ≈53%) — inside [67,107], above SAT_THRESHOLD. The in-band purple swatch `hsl(270, 60%, 50%)`
(line 38) is still inside [244,284] — leave it. `hsl(200, …)` water and `#DCDCD2` grey stay out-of-band/low-sat — leave.

Current → new, exactly:
```
6  * NOTE on the swatches (virgin-cycle7, 2026-09): the firewall bands are ±20°
7  * around QUALIFIRE's actual tier hues — colors.green #00D000 (hue 120) →
8  * [100,140], colors.purple #9000C8 (hue ~283) → [263,303] — i.e. the firewall
9  * protects the app's own tier colours, not "green"/"purple" in general. The
10 * in-band green swatch below is '#44CC44' (hue 120, S ~57%) for that reason.
```
→
```
 * NOTE on the swatches (virgin-cycle8, 2026-09): the firewall bands are ±20°
 * around QUALIFIRE's actual tier hues — colors.green #8BCD39 (hue ~87) →
 * [67,107], colors.purple #6D4E9C (hue ~264) → [244,284] — i.e. the firewall
 * protects the app's own tier colours, not "green"/"purple" in general. The
 * in-band green swatch below is '#88CC44' (hue 90, S ~57%) for that reason.
```
```
23        paint: { 'background-color': '#44CC44' }, // in-band green (hue 120), S ~57% -> must desaturate
```
→
```
        paint: { 'background-color': '#88CC44' }, // in-band green (hue 90), S ~57% -> must desaturate
```
```
79  assert(Math.abs(parseFloat(h) - 120) < 1, `hue drifted: expected ~120, got ${h}`);
```
→
```
  assert(Math.abs(parseFloat(h) - 90) < 1, `hue drifted: expected ~90, got ${h}`);
```

### 2.4 `app/tests/waymapgeo_suite.ts` (lines 392, 396, 398 — 6 tokens)

These are pass-through strings (any hex would pass); c9db5d5 kept them in step with theme.ts, do the same:
`'#9000C8'` → `'#6D4E9C'` (3×, incl. the two inside the message template strings) and `'#00D000'` → `'#8BCD39'` (3×).
Confirm with `grep -n -E '9000C8|00D000' app/tests/waymapgeo_suite.ts` → no hits afterwards.

---

## 3. Part B — live marketing + product files (same file list as c9db5d5, plus the yellow-only live files it had no reason to touch)

Method per file: confirm the BEFORE token counts below with
`grep -o '#9000C8' FILE | wc -l` (and likewise `#00D000`, `#F5C542`, `245,197,66`), then do an exact whole-token
replace of every occurrence (`sed -i 's/#9000C8/#6D4E9C/g; s/#00D000/#8BCD39/g; s/#F5C542/#FFDE6D/g' FILE` is fine
for these files — they are all text; a BEFORE count that does not match the table means STOP). Afterwards every file
must grep to zero for all three old tokens.

### 3.1 BEFORE token counts (Plan-verified 2026-09-15)

| File | `#9000C8` | `#00D000` | `#F5C542` |
|---|---|---|---|
| `marketing/HYPERFRAMES-PLAN.md` | 1 | 1 | 1 |
| `marketing/PLAN.md` | 1 | 1 | 1 |
| `marketing/guides/VIDEO-EDITING-GUIDE.md` | 1 | 1 | 3 |
| `marketing/silent-studio/_map/map-capture.html` | 3 | 0 | 3 |
| `marketing/silent-studio/_map/route-alt-wet-loop_0904-2144.html` | 3 | 0 | 3 |
| `marketing/silent-studio/_map/route-current_0903-1828.html` | 3 | 0 | 3 |
| `marketing/silent-studio/_map/README.md` | 0 | 0 | 1 |
| `marketing/silent-studio/colours/index.html` | 2 | 2 | 2 |
| `marketing/silent-studio/gates-saving/index.html` | 5 | 4 | 5 |
| `marketing/silent-studio/ranking/index.html` | 3 | 4 | 8 |
| `marketing/silent-studio/start-ride/index.html` | 5 | 4 | 8 |
| `marketing/silent-studio/teaser/index.html` | 1 | 1 | 5 |
| `marketing/silent-studio/brandmark/index.html` | 0 | 0 | 2 |
| `marketing/silent-studio/brandmark/opening/index.html` | 0 | 0 | 1 |
| `marketing/silent-studio/brandmark/closing/index.html` | 0 | 0 | 2 |
| `marketing/website/index.html` | 1 | 1 | 5 (+5× rgba `245,197,66`) |
| `marketing/assets/qualifire_logo_5_monogram_wordmark.svg` | 0 | 0 | 1 |
| `product/MAP-CONTRACT.md` | 0 | 0 | 4 |
| `product/MAP-TILES.md` | 0 | 0 | 2 (+1× `245,197,66`) |
| `product/brand/README.md` | 1 | 1 | 1 |

(The `_map/README.md`, `brandmark/*`, `marketing/assets/*.svg` rows carry yellow only — c9db5d5 did not change
yellow so never touched them; they are live pieces and get the yellow swap now.)

### 3.2 Extra, non-hex edits in the product docs (hand-edit, exact strings)

- `product/MAP-CONTRACT.md` line 110: `may sit in HSL hue 100–140 or 263–303 at S>25%` → `may sit in HSL hue 67–107 or 244–284 at S>25%` (keep the en-dashes as they are in the file).
- `product/MAP-TILES.md` line 86: `grey, NOT hue 100-140 (D-030)` → `grey, NOT hue 67-107 (D-030)`.
- `product/MAP-TILES.md` line 104: `route yellow \`#F5C542\` (RGB 245,197,66)` → `route yellow \`#FFDE6D\` (RGB 255,222,109)` (the hex part is covered by the global replace; the RGB triple is this edit). Leave the rest of that sentence alone.
- `product/MAP-CONTRACT.md` line 99 and 143 say `(#F5C542, unchanged)` — only the hex changes; leave the word "unchanged" (it refers to the route line vs the casing, not to this round).

### 3.3 `marketing/website/index.html` rgba triples (5×)

Lines 144, 188, 190, 276, 337 each contain `rgba(245,197,66,` → `rgba(255,222,109,` (alpha part untouched).
`sed -i 's/245,197,66/255,222,109/g' marketing/website/index.html` after confirming `grep -o '245,197,66' … | wc -l` = 5.
The CSS vars on lines 25/27/28 (`--yellow`, `--green`, `--purple`) are covered by the hex replace.

---

## 4. Part C — launcher icon recolour (yellow only; ring and ground untouched)

### 4.1 Facts (Plan inspected the actual pixels)

- `app/app.json` wires `"icon": "./assets/icon.png"` and `android.adaptiveIcon.foregroundImage: "./assets/adaptive-icon.png"`,
  `backgroundColor "#17171b"`. The separate `app/assets/icon/` staged set is NOT wired — leave it alone.
- Both files: 1024×1024, mode **RGB (no alpha)**, exactly three flat colours + anti-aliasing:
  ground `#17171B`, ink ring `#F4F2EC`, yellow gate stroke `#F5C542`. icon.png: 30 163 pure-yellow px; adaptive-icon.png: 13 151.
- The yellow stroke crosses the ring, so edge pixels blend yellow with EITHER ground or ink → a two-colour recolour
  would tint the ring's grey edges. Use the three-colour (barycentric) decomposition below. Plan dry-ran it on both
  files: max fit residual 6.74/255 (rounding noise), pure yellow maps exactly to `#FFDE6D`, ground/ring pixels
  byte-identical.
- The launcher icon is a NATIVE asset baked into the installed dev-client at build time. Recolouring the PNGs does NOT
  change the icon on Nathan's phone until the next numbered build. Say this in your report; it is expected.
- `product/brand/make_logos.py` / the brand SVGs are closed explorations (still carry pre-cycle-7 GRN/PUR) — do not
  re-run or edit them; the PNGs are recoloured in place, reproducibly, by the script below.
- Tooling in the VM (verified): `/usr/bin/python3`, Pillow 12.3.0, numpy 2.2.6. Run `python3 -c "import PIL, numpy"`
  first; if it fails, STOP (do not pip install).

### 4.2 Create `scripts/recolour-icon.py` (exact content)

```python
#!/usr/bin/env python3
"""
Recolour the yellow gate-stroke of the launcher icon PNGs in place
(app/assets/icon.png, app/assets/adaptive-icon.png -- the two app.json wires).

The icon is three flat colours -- ground BG, ink ring INK, yellow gate YEL --
plus anti-aliased edges, and the yellow stroke crosses the ring, so an edge
pixel may blend yellow with EITHER ground or ink. Each pixel is therefore
decomposed by least squares as a barycentric blend of the three:
    p  = BG + wI*(INK - BG) + wY*(OLD - BG)
and only the yellow weight is re-pointed:
    p' = p + wY*(NEW - OLD)
Ground/ring pixels (wY = 0) stay byte-identical, pure yellow maps exactly to
NEW, edge pixels keep their exact coverage. The max residual of the 3-colour
fit is printed per file; above 16/255 the image is not the flat design this
assumes -> the script refuses. (A genuine 3-colour icon fits to < 7; a re-fit
of the RECOLOURED file lands ~12.5 because the new yellow has R=255, so the
54 yellow/ink edge pixels that overshot R cannot go higher -- invisible, but
it is why the guard is 16 and not 8. A gradient or a different design gives
residuals in the tens to hundreds.)

Run (any python3 with Pillow + numpy; the Cowork VM has both):
    python3 scripts/recolour-icon.py                # recolour in place
    python3 scripts/recolour-icon.py --check        # fit + report only, writes nothing
    python3 scripts/recolour-icon.py --old F5C542 --new FFDE6D   # explicit (these are the defaults)
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "app" / "assets"
FILES = [ASSETS / "icon.png", ASSETS / "adaptive-icon.png"]
BG = "17171B"    # ground (app.json adaptiveIcon.backgroundColor)
INK = "F4F2EC"   # ring (theme.ts colors.ink)
MAX_RESIDUAL = 16.0


def rgb(hexstr: str) -> np.ndarray:
    h = hexstr.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def hexof(v) -> str:
    return "#%02X%02X%02X" % tuple(int(x) for x in v)


def recolour(path: Path, old: np.ndarray, new: np.ndarray, write: bool) -> None:
    img = Image.open(path)
    if img.mode != "RGB":
        sys.exit(f"{path.name}: expected mode RGB, got {img.mode} -- stop and look")
    im = np.asarray(img, dtype=float)
    h, w, _ = im.shape
    bg, ink = rgb(BG), rgb(INK)
    basis = np.stack([ink - bg, old - bg], axis=1)            # 3x2
    weights = (im.reshape(-1, 3) - bg) @ np.linalg.pinv(basis).T   # Nx2 -> (wI, wY)
    fit = weights @ basis.T
    residual = np.linalg.norm((im.reshape(-1, 3) - bg) - fit, axis=1)
    w_y = np.clip(weights[:, 1], 0.0, 1.0)
    out = np.clip(im.reshape(-1, 3) + w_y[:, None] * (new - old), 0, 255)
    out = out.round().astype(np.uint8).reshape(h, w, 3)

    pure_old = int(np.all(im.reshape(-1, 3) == old, axis=1).sum())
    pure_new = int(np.all(out.reshape(-1, 3) == new.astype(np.uint8), axis=1).sum())
    ys, xs = np.where(np.all(im == old, axis=2))
    cx, cy = int(xs.mean()), int(ys.mean())
    print(f"== {path.name} {w}x{h}  max residual {residual.max():.2f}/255  "
          f"pure {hexof(old)} px: {pure_old} -> pure {hexof(new)} px: {pure_new}")
    for (x, y) in [(cx, cy), (0, 0), (w // 2, h // 2)]:
        print(f"   ({x},{y}) {hexof(im[y, x])} -> {hexof(out[y, x])}")
    if residual.max() > MAX_RESIDUAL:
        sys.exit(f"{path.name}: residual {residual.max():.2f} > {MAX_RESIDUAL} -- not a flat 3-colour image, refusing")
    if write:
        Image.fromarray(out, "RGB").save(path, optimize=True)
        print(f"   written {path}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--old", default="F5C542", help="current yellow hex (default F5C542)")
    ap.add_argument("--new", default="FFDE6D", help="target yellow hex (default FFDE6D)")
    ap.add_argument("--check", action="store_true", help="report only, write nothing")
    a = ap.parse_args()
    for f in FILES:
        if not f.exists():
            sys.exit(f"missing {f}")
        recolour(f, rgb(a.old), rgb(a.new), write=not a.check)


if __name__ == "__main__":
    main()
```

### 4.3 Run it

```
cd "$HOME/mnt/Qualifire" && python3 scripts/recolour-icon.py --check     # expect max residual ~6.74, centroid (706,686) #F5C542 -> #FFDE6D for icon.png, (640,627) for adaptive-icon.png
cd "$HOME/mnt/Qualifire" && python3 scripts/recolour-icon.py             # writes both PNGs
cd "$HOME/mnt/Qualifire" && python3 scripts/recolour-icon.py --old FFDE6D --new FFDE6D --check   # re-fit on the written files: pure #FFDE6D px must equal the "pure new" count printed by the write run (30 171 / 13 159 expected); residual ~12.5 (< 16) is the expected R=255 clipping noise, see script docstring
```
Report the printed lines verbatim (the coordinator eyeballs them; you cannot see images). If the `--check` run's
residual is > 16 or the centroid pixel is not `#F5C542`, STOP. (Plan's dry run of this exact script on copies of both
PNGs: `--check` 6.74, write run 6.74, post-write re-check 12.51 — those are the expected numbers.)

Expected after write: `(706,686)` = `#FFDE6D`, `(0,0)` = `#17171B`, `(512,512)` = `#17171B` in icon.png;
`(640,627)` = `#FFDE6D` in adaptive-icon.png. File sizes will change (re-encoded PNG) — fine.

---

## 5. Part D — the phone dev-loop scripts

Context: `app/README-dev.md` "Daily dev loop" — `npx expo start` in `app/`, then open the already-installed Qualifire
dev-client on the phone (same WiFi); every save Fast-Refreshes in ~1 s, no rebuild for JS-only changes such as theme.ts.
`EXPO_PUBLIC_SEED_MODE` is inlined at bundle time: switching seeds needs `--clear` and a full Reload from the
dev-client menu. The retired `safe_to_delete/dev-virgin.*` only forced the (now default) empty seed — do not recreate
that. Names `dev-phone.ps1` / `dev-phone.cmd` collide with nothing in `scripts/`.

`--clear` decision: a theme.ts edit is an ordinary source change — Metro re-transforms it on save; `--clear` is only
needed when the inlined env var changes or the cache is suspect. So: default no `--clear`; `-Clear` opts in;
`-Shipped` forces it (seed switch).

### 5.1 Create `scripts/dev-phone.ps1` (exact content)

```powershell
<#
    Qualifire -- start the Metro/Expo dev server for the phone dev-client:
    app/README-dev.md's "Daily dev loop" as a double-clickable entry point.
    Nothing is built or published. The ALREADY-INSTALLED Qualifire dev-client
    on the phone connects over WiFi and Fast-Refreshes on every save, so a
    JS-only change (theme.ts colours, copy, layout) shows on the phone about
    a second after the file is saved.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\dev-phone.ps1            # virgin/empty seed (the default since 2026-09-08)
        powershell -ExecutionPolicy Bypass -File .\dev-phone.ps1 -Shipped   # Leuven seed: rides, results and tier chips populated (forces --clear)
        powershell -ExecutionPolicy Bypass -File .\dev-phone.ps1 -Clear     # also wipe Metro's transform cache first

    (Or double-click dev-phone.cmd. -ExecutionPolicy Bypass always.)

    -Shipped sets EXPO_PUBLIC_SEED_MODE=shipped for THIS process only. The
    value is inlined at bundle time, so -Shipped always adds --clear and you
    must do a full Reload from the dev-client shake menu once connected
    (Fast Refresh is not enough). Without -Shipped the variable is left as
    the shell has it (normally unset = virgin seed).

    What this does NOT do: change the launcher icon. The icon is a native
    asset baked into the installed dev-client at build time; a recoloured
    app/assets/icon.png only shows after the next numbered build.
#>
[CmdletBinding()]
param(
    [switch]$Shipped,
    [switch]$Clear
)
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'app')

$expoArgs = @('expo', 'start')
if ($Shipped) {
    $env:EXPO_PUBLIC_SEED_MODE = 'shipped'
    $Clear = $true
    Write-Host 'EXPO_PUBLIC_SEED_MODE=shipped -- Leuven seed. Do a full Reload from the dev-client menu once the phone connects.' -ForegroundColor Yellow
}
if ($Clear) { $expoArgs += '--clear' }

Write-Host ''
Write-Host 'PHONE: open the installed Qualifire dev-client (same WiFi as this PC). It connects to this Metro server and Fast-Refreshes on every save.' -ForegroundColor Cyan
Write-Host 'Colour check: DEMO replays a scored ride (tier colours on the map and chips); START / Export are the yellow surfaces; the launcher icon only changes at the next build.' -ForegroundColor Cyan
Write-Host 'Ctrl+C in this window stops the server.' -ForegroundColor Cyan
Write-Host ''

& npx @expoArgs
```

### 5.2 Create `scripts/dev-phone.cmd` (exact content; mirrors `publish-preview.cmd`)

```bat
@echo off
rem Double-clickable launcher for the phone dev loop: Metro/Expo dev server, the installed dev-client connects over WiFi.
rem Usage: dev-phone.cmd            -> virgin/empty seed (default), Fast Refresh on every save
rem        dev-phone.cmd shipped    -> Leuven seed (rides/results/tier chips), forces --clear (-Shipped)
rem        dev-phone.cmd clear      -> wipe Metro's cache first (-Clear)
cd /d "%~dp0"
if /i "%~1"=="shipped" (
  powershell -ExecutionPolicy Bypass -File ".\dev-phone.ps1" -Shipped
) else if /i "%~1"=="clear" (
  powershell -ExecutionPolicy Bypass -File ".\dev-phone.ps1" -Clear
) else (
  powershell -ExecutionPolicy Bypass -File ".\dev-phone.ps1" %*
)
pause
```

Line endings (Plan checked with `file`): `publish-preview.cmd` is CRLF, `publish-preview.ps1` is LF. Match that:
write `dev-phone.cmd` with CRLF (`sed -i 's/$/\r/' scripts/dev-phone.cmd` after writing it, then `file` must say
"with CRLF line terminators") and `dev-phone.ps1` / `recolour-icon.py` with LF.

### 5.3 `scripts/README.md` — add two rows to the table, after the `gatefield-replay` row (the last row)

```
| `dev-phone.ps1`, `dev-phone.cmd` | Phone dev loop: starts the Metro/Expo dev server in `app/` for the installed dev-client (Fast Refresh, no build). `shipped` / `-Shipped` switches to the Leuven seed. |
| `recolour-icon.py` | Recolours the yellow gate-stroke of the two wired launcher PNGs (`app/assets/icon.png`, `adaptive-icon.png`) in place, three-colour barycentric decomposition so ring/ground edges stay clean. `--check` reports without writing. |
```
Same `| File | What it is |` shape as the existing rows; nothing else in the file changes.

---

## 6. Acceptance criteria (all must hold)

1. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts` → `0 fail` (baseline before your
   edits, Plan-verified: 586 tests, 583 pass, 0 fail, 3 skip — same counts expected after).
2. `cd "$HOME/mnt/Qualifire/app" && ./node_modules/.bin/tsc --noEmit` → exit 0, no output.
3. `cd "$HOME/mnt/Qualifire" && git --no-optional-locks grep -n -E '#(9000C8|00D000|F5C542|65008C)' -- app marketing/HYPERFRAMES-PLAN.md marketing/PLAN.md marketing/guides marketing/silent-studio marketing/website/index.html marketing/assets product/MAP-CONTRACT.md product/MAP-TILES.md product/brand/README.md ':(exclude,glob)**/rounds/**' ':(exclude,glob)**/.hyperframes/**'`
   → zero hits. (Before your edits the same command lists exactly the 24 in-scope files of sections 2–3 — Plan-verified.) (Hits remaining elsewhere — `design/`, `product/BRAND.md`, `product/brand/` other than README.md,
   `marketing/hex-colours/`, `rounds/`, `marketing/cycles/`, `process/BETA-TESTERS.md`, `STATE.md`, `Nathan/` — are
   expected and out of scope.)
4. `grep -c '245,197,66' marketing/website/index.html product/MAP-TILES.md` → 0 and 0.
5. `grep -n -E 'HUE_(MIN|MAX)' app/src/ui/wayMapStyle.ts` shows exactly 67 / 107 / 244 / 284.
6. `python3 scripts/recolour-icon.py --old FFDE6D --new FFDE6D --check` on the written PNGs: residual < 16 (≈12.5
   expected), centroid pixels `#FFDE6D`, corners `#17171B`, pure-`#FFDE6D` counts 30 171 / 13 159.
7. `git --no-optional-locks status --short` lists ONLY: the files in sections 2–5 as modified/added, plus the
   pre-existing entries that were already there before you started (` M marketing/hex-colours/SUMMARY.md`,
   `?? cycles/virgin-cycle8/`, `?? marketing/hex-colours/qualifire_colour_gradient_v2.png`, `…_v3.png`). Anything else → report it.

## 7. OUT OF SCOPE — do not touch (mirrors c9db5d5's scope decision)

- Frozen round snapshots: `rounds/v1`, `rounds/v2` under `marketing/website/` and `marketing/silent-studio/*/`,
  `marketing/silent-studio/colours/rounds/`, `marketing/cycles/*`, `marketing/silent-studio/teaser/.hyperframes/backup/*`.
- Closed brand explorations: `product/BRAND.md`, `product/brand/**` EXCEPT the one line in `product/brand/README.md`
  (section 3.1) — no re-running `make_logos.py`, no SVG edits.
- `design/**` (canonical/draft screen mockups; still carry pre-cycle-7 hexes — historical).
- `app/assets/icon/` (unwired build-3 staged set), `app/.expo/` caches.
- `marketing/hex-colours/**` (Nathan's exploration folder, one file already modified in the tree), `process/BETA-TESTERS.md`
  (a dated tester observation), `STATE.md`, `OPEN-ITEMS.md`, `Nathan/**`, `safe_to_delete/**`.
- Any build/publish (`build7.ps1`, `publish-preview.ps1`) — the coordinator decides when a build carries the icon.

## 8. Report format (what you hand back)

1. **Files changed**, one line each: path — what (e.g. "theme.ts — 5 tokens", "wayMapStyle.ts — 4 constants + comment",
   "gates-saving/index.html — 5/4/5 tokens"), plus the three new files under `scripts/` and the README rows.
2. **Tests**: the last line of `tests/run.ts` output, before and after. **tsc**: exit code.
3. **Grep proofs**: the outputs of acceptance items 3, 4, 5 (verbatim, short).
4. **Icon**: the printed lines of the `--check` run, the write run, and the post-write re-check (verbatim), and the
   reminder that the phone's icon changes only at the next build.
5. **Line-ending choice** for the two scripts (LF/CRLF, and why).
6. **Surprises / stops**: anything that did not match this brief (an anchor mismatch, a count off by one, a stale
   `.git/index.lock`, a missing module). If you stopped, say exactly where and leave the tree as it was at that point.
