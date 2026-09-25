# Executor report — teaser-full build (Sonnet, 2026-09-26)

## Step 0 — device access
Confirmed working. `get_device_info` showed the connected folder
`C:\Users\natha\Claude personal projects\Qualifire` mounted at `$HOME/mnt/Qualifire` on
device `pc-mamba` (Windows). All work done directly on that mount via `device_bash` — no
simulation, no fallback needed.

## Brief read
Read the full 623-line brief at `BRIEF-teaser-full.md` in this folder, then read all 5
source scene files in full via `cat -n` directly from disk (not trusting the brief's
digest): `brandmark/opening/index.html` (119 lines), `start-ride/index.html` (283),
`gates-saving/index.html` (332), `ranking/index.html` (299), `brandmark/closing/index.html`
(87).

## Pre-flight verification (brief 3.1)
`map.png`/`map-day.png` md5s compared across `start-ride/`, `gates-saving/`, `ranking/` —
identical in all three (`34f23820af597ab54e966e36c622ba3e` / `2e89309c56845c7a529aedfc10ec508c`).
No stop needed.

## Assembly method
Wrote a Python script (`~/build_teaser_full.py`, 251 lines, run via `device_bash`) that:
1. Reads all 5 source files fresh from disk.
2. Extracts the shared CSS block and asserts byte-equality across all five before using
   it once — passed, confirming the brief's "byte-identical" claim.
3. Extracts each scene's specific CSS block by exact line range and prefixes every
   selector with `#scene-<name>` using a small state-machine parser (handles single-line
   and multi-line rules plus comments without touching declaration bodies).
4. Extracts each scene's body markup and script body by exact line range, strips all
   `data-hf-id` attributes, and rewrites each clip's `data-start`/`data-duration`/
   `data-track-index` to the new absolute values while leaving all other markup
   byte-identical.
5. Wraps each scene script in the exact IIFE + `document` shim + `gsap.context` pattern
   from brief 3.5, and appends the master script (paused-child fix, `master.add` calls,
   visibility sets, `console.log` line, `gsap.context` existence guard) verbatim from the
   brief.
6. Asserts every extracted scene script still contains its own
   `window.__timelines.<name> = tl;` export line before using it (sanity check against a
   bad line-range slice).

Ran the script once; succeeded with no assertion failures. Read the generated 1012-line
`index.html` back in full and spot-checked the specific regression cases the brief
flagged: the `.caption { top: 990px }` (gates-saving) vs `top: 920px`
(start-ride/ranking) rule correctly scoped per-scene; the purple
`.trow.today { color: #9000C8 }` rule from start-ride/gates-saving correctly scoped away
from `#scene-ranking`; `svg.full-svg`, `#tower .rows`, `#start-btn`'s `flex-direction:column`
variant all scoped correctly; both scenes' distinct `GATES` arrays survive untouched
inside their own IIFEs. Brace count 349/349, script tag count 8/8, div count 59/59
balanced (pre-fix numbers; see INSPECT-REPORT.md and the follow-up fix note in README.md
for the one post-inspection correction).

## Files created (all under `marketing/silent-studio/teaser-full/`)
| file | lines | md5 (at build time) |
|---|---|---|
| `index.html` | 1012 | `fcf80a416e6f06e76eca6b45d51f5a28` |
| `theme.js` (copy of start-ride's) | 1 (60 bytes, no trailing newline) | `5f661ed5029e6bc9af703e4e00ca4213` |
| `map.png` (copy) | — | `34f23820af597ab54e966e36c622ba3e` |
| `map-day.png` (copy) | — | `2e89309c56845c7a529aedfc10ec508c` |
| `README.md` | 29 | `863e8c54c5a4dfef5f8282bf7b1327ad` |
| `renders/.gitkeep` | 0 | `d41d8cd98f00b204e9800998ecf8427e` |

(`index.html`'s md5 changed to `c6ab21e685965c2b7af8fbef428f4cbd`/1014 lines after the
post-inspection guard-ordering fix — see README.md.)

## Scene-boundary math confirmed
Opening 0/6.2, start-ride 6.2/20.2, gates-saving 20.2/32.5, ranking 32.5/43.3, closing
43.3/47.3 — matches exactly. All 8 clips (`open`, `map`+`ui`x3, `close`) got sequential
`data-track-index` 0-7 in DOM order, and gates-saving's stale `data-duration="12.4"` was
corrected to `12.3` on its two clips (an attribute fix per the brief's table, not a tween
edit, so no stop was needed).

## Open decisions (3.7) — implemented as-is per stated defaults
(a) start-ride's 1.0s blackout/reveal beat kept unchanged (`shiftChildren(1.0, true)` and
`#blackout` div both present verbatim). (b) gates-saving/ranking gate-position mismatch
left untouched. (c) built as sibling `teaser-full/`; `teaser/index.html`, `render.ps1`,
`structure.md`, `teaser/README.md` all confirmed untouched (checked mtimes — none from
build day; only ever read).

## Nothing required a stop
No tween line inside any scene needed editing; the only changes to copied code were the
permitted CSS-selector prefixing, JS IIFE/context wrapping, `data-hf-id` stripping, and
the three specified clip attributes. Section 3.8's fallback (id-prefixing inside tween
lines) was never triggered.

## Deviation from the brief, noted
Brief 3.5 says "One `<script>` per scene" and "Master script (last)" as separate items;
built as 6 separate `<script>` tags (5 scene IIFEs + 1 master), each exactly matching the
brief's code shape, rather than concatenating into fewer tags — a literal reading of 3.5,
not a semantic change. Also, 3.2's clip table says track-index "0-8 in DOM order" but
there are only 8 clips total (1+2+2+2+1), so indices run 0-7 — used 0-7 sequentially in
DOM order, which is what "unique, in DOM order" requires; flagged as a minor imprecision
in the brief's own wording, not a unilateral decision.

## Out of scope, left for Nathan (brief 3.6)
No rendering, previewing, linting, or snapshotting was attempted — no npm/browser access
in this environment. Verification steps 3.6.1-3.6.4 (`render.ps1 -Name teaser-full`
preview, `npx hyperframes lint/check`, snapshot frame comparison at the specified
timestamps including the two scoping-proof frames at 7.9s and 35.7s, and the final
`-Render`/`-Theme day -Render` pass) are entirely for Nathan to run on his own PC.

| tier | model | tokens | outcome |
|---|---|---|---|
| execute | Sonnet | ~178k | `teaser-full/` built; no stops; 2 minor brief-wording notes, 0 tween edits |
