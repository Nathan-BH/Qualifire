# BRIEF — Tier colours to the F1 broadcast values (purple `#9000C8`, green `#00D000`)

**Written 2026-09-15 UTC (Plan tier, fable).** Anchors were read from the live working tree
on Nathan's PC on 2026-09-15 (cycle 6 committed as `92bd6ea`, marketing cycle 09 as `003d4df`). Executor: Sonnet,
stop-on-ambiguity. **Any anchor mismatch or undecided call → stop and report verbatim (file,
line, what is actually there); do not guess, do not rule on it yourself — escalate to a fresh
Fable.** Never rule on an open call from the coordinator's chat.

## Origin

Nathan (2026-09-14): "Change the app's 'Overall Fastest' purple and 'Personal Best' green to
the exact F1 official broadcast hex codes: Purple = #9000C8, Green = #00D000. Keep the
existing Yellow ('No Improvement') as-is. Apply everywhere these colors are used: app,
marketing, renders, and website."

Today: purple `#A667F0`, green `#3ED598`, yellow `#F5C542`. One app source of truth
(`theme.ts`); every app consumer (`tierColour.ts`, `chips.tsx`, `resultsPlot.tsx`,
`wayMapView.tsx`, `RideDetailScreen.tsx`, `ResultsDetailScreen.tsx`, `selfRaceModel`) reads
the token, so the app change is the token plus the D-030 firewall that is keyed to the hue.
The website and each marketing render carry their own literal copies.

## File anchors (read every one before editing; re-read line numbers on disk)

App
- `app/src/ui/theme.ts:16` `purple: '#A667F0', // filled tier — …`
- `app/src/ui/theme.ts:17` `purpleDeep: '#7b3fd1',`
- `app/src/ui/theme.ts:18` `green: '#3ED598', // outlined tier — …`
- `app/src/ui/theme.ts:19` `neutral: '#F5C542'` — **unchanged**; `:45` comment mentions
  `#F5C542` — unchanged.
- `app/src/ui/wayMapStyle.ts:12–18` header comment (quotes old hex + hues);
  `:25` `GREEN_HUE_MIN = 130`, `:26` `GREEN_HUE_MAX = 165`, `:27` `PURPLE_HUE_MIN = 260`,
  `:28` `PURPLE_HUE_MAX = 290`; `:109–111` `inFirewallBand` (inclusive `>=`/`<=`, unchanged).
- `app/tests/waymapstyle_suite.ts:6–19` header "DEVIATION" comment (quotes old band + hex);
  `:32` `'background-color': '#40bf6a'` in-band green swatch; `:60` expression swatch
  `'#40bf6a'` (leave); `:88` `expected ~140`; `:114` (leave).
- `app/tests/waymapgeo_suite.ts:392, 396, 398` — `'#A667F0'` / `'#3ED598'` passed in and
  asserted back out of `sectorSpansFeatureCollection` (opaque strings; semantics unchanged
  by a swap).

Website (live page only)
- `marketing/website/index.html:27` `--green: #3ED598;` and `:28` `--purple: #A667F0;`

Marketing render sources (live compositions, HyperFrames)
- `marketing/silent-studio/colours/index.html:110, 117` (inline `style="color:…"`),
  `:158, 164` (`tierBeat(…, '#3ED598' / '#A667F0', …)`)
- `marketing/silent-studio/gates-saving/index.html:80, 85, 93` (CSS `color:`), `:115, 117,
  118` (SVG `stroke=`), `:152` (`var SECTOR_COLORS = [...]`)
- `marketing/silent-studio/ranking/index.html:93, 114, 116, 117, 176`
- `marketing/silent-studio/start-ride/index.html:78, 83, 91, 114, 116, 117, 153`
- `marketing/silent-studio/teaser/index.html:220` (`SECTOR_COLORS`)
- `marketing/silent-studio/_map/map-capture.html:45` (`SECTOR_COLORS`)
- `marketing/silent-studio/_map/route-alt-wet-loop_0904-2144.html:38`
- `marketing/silent-studio/_map/route-current_0903-1828.html:38`

Docs that state the palette as fact (one line each)
- `marketing/PLAN.md:349`, `marketing/HYPERFRAMES-PLAN.md:293` — "earned green `#3ED598`,
  earned purple `#A667F0`"
- `marketing/guides/VIDEO-EDITING-GUIDE.md:43` — example `SECTOR_COLORS` line
- `product/brand/README.md:20` — quotes `theme.ts`'s three values

**Not edited, by ruling (R6/R7) — listed so nobody "finds" them later:**
`marketing/website/rounds/v1/index_v1.html:27–28`, `marketing/website/rounds/v2/index_v2.html:27–28`,
`marketing/silent-studio/colours/rounds/v1/index_v1-source.html:122,129,143,201,202,217,218`,
`marketing/cycles/04_second-feedback-pass/{README,OPEN-ITEMS}.md`,
`marketing/cycles/08_daynight-audio-control-and-website/BRIEF-daynight-renders.md`,
`design/make_screens.py:100,102` and every SVG under `design/`,
`product/brand/make_brandboard.py:23,138`, `product/brand/make_logos.py:22–23`,
`product/brand/logos/qualifire_logo_3_lap_ring.svg`.

## Rulings

### R1 — The values
- `purple` → `#9000C8` (hue 283.2°, S 100%, L 39%).
- `green` → `#00D000` (hue 120.0°, S 100%, L 41%).
- `neutral` stays `#F5C542`. Nothing else in `colors` changes.
Write hex in **uppercase** (file convention). Comments on the two lines stay as they are.

### R2 — `purpleDeep` is kept and re-derived
`purpleDeep` is referenced nowhere in `app/` (grep `purpleDeep` over `app/src` + `app/tests`
finds only its definition, 2026-09-15). Never delete: set it to **`#65008C`** — each channel of
`#9000C8` × 0.7, rounded (144→101=`65`, 0→`00`, 200→140=`8C`) — and change the line to:
```ts
  purpleDeep: '#65008C', // darker purple (channels x0.7 of `purple`) — unreferenced today; keep in step with `purple`
```
If grep on the day finds a consumer, that is **not** a stop: the derivation still holds; just
mention the consumer in the report.

### R3 — The D-030 palette firewall follows the hues
The firewall exists to stop the basemap wearing the *tier* hues. With the tier green at hue
120 the current band `[130, 165]` protects nothing. Re-centre both bands at **±20° around the
actual tier hue**, integers:
- `GREEN_HUE_MIN = 100`, `GREEN_HUE_MAX = 140`
- `PURPLE_HUE_MIN = 263`, `PURPLE_HUE_MAX = 303`
`SAT_THRESHOLD`, `FLATTENED_SAT`, `inFirewallBand` and everything else: untouched. Replace the
header comment's job-2 paragraph (`wayMapStyle.ts:12–18`) with:
```
 *  2. Palette firewall (D-030, ALWAYS applied, independent of hideLabels):
 *     colors.green (#00D000, hue 120) and colors.purple (#9000C8, hue
 *     ~283) in theme.ts are score-only colours — the basemap may never wear
 *     a colour close enough to read as a tier verdict. Any '*-color' paint
 *     value landing within ±20° of either hue, with enough saturation to
 *     actually read as a colour rather than a near-grey, gets its
 *     saturation flattened; hue, lightness and alpha are left alone.
```

### R4 — Tests follow the firewall, nothing else
`app/tests/waymapstyle_suite.ts`:
1. `:32` swatch `'#40bf6a'` → `'#44CC44'` (hue 120.0, S ~57%, L ~53% — squarely in the new
   band; `#40bf6a` is hue 139.8, one fifth of a degree from the new edge, too fragile to keep
   as the in-band example). Update the trailing comment to
   `// in-band green (hue 120), S ~57% -> must desaturate`.
2. `:88` `Math.abs(parseFloat(h) - 140) < 1` → `- 120`, and the message `expected ~140` →
   `expected ~120`.
3. `:60` and `:114` (the `['interpolate', …, '#40bf6a']` expression): **leave** — that test
   proves expressions pass through byte-for-byte, which is band-independent.
4. `:6–19` header comment: replace the whole "DEVIATION …" paragraph with:
```
 * NOTE on the swatches (virgin-cycle7, 2026-09): the firewall bands are ±20°
 * around QUALIFIRE's actual tier hues — colors.green #00D000 (hue 120) →
 * [100,140], colors.purple #9000C8 (hue ~283) → [263,303] — i.e. the firewall
 * protects the app's own tier colours, not "green"/"purple" in general. The
 * in-band green swatch below is '#44CC44' (hue 120, S ~57%) for that reason.
```
`app/tests/waymapgeo_suite.ts:392, 396, 398`: swap `'#A667F0'` → `'#9000C8'` and `'#3ED598'`
→ `'#00D000'` 1:1 (including inside the assertion messages). The test round-trips whatever
strings it is given; this is hygiene so a repo-wide grep of the old hex comes back empty.
No other test mentions the hex (grep, 2026-09-15). **If the suite shows a FAIL that is not one
of these three files, stop and report it verbatim.**

### R5 — Website and marketing sources: literal 1:1 swap, no new shared constant
In every live file listed under *Website* and *Marketing render sources*: replace `#A667F0` →
`#9000C8` and `#3ED598` → `#00D000`, case-insensitively, wherever they occur — CSS custom
properties, inline `style`, SVG `stroke`, JS `SECTOR_COLORS` arrays, `tierBeat(...)` args.
`#F5C542` entries in the same arrays stay. **Do not** introduce a shared constants file, a
CSS include, or a `theme.js` lookup across the compositions: each file owns its own copy today
and unifying them is a refactor Nathan did not ask for (scope boundary — mention it in the
report as an option, don't do it). Do not touch any other value, opacity, timing or copy in
those files.

### R6 — Frozen snapshots are not edited
`marketing/website/rounds/*` and `marketing/silent-studio/*/rounds/*` are what Nathan saw at
each feedback round; `marketing/cycles/*` are cycle records. Recolouring them would falsify
the record. Leave every file in the *Not edited* list alone. If Nathan later says "rounds
too", it is the same substitution over those three HTML files — a chore, no brief needed.

### R7 — `design/` and `product/brand/` are closed explorations
`product/brand/README.md` itself says the explorations are closed; `design/` mockups were
generated by Python scripts whose outputs are archived SVG/PNG. Editing the scripts without
regenerating the outputs would leave source and output disagreeing; regenerating needs Python
on Nathan's PC and is a separate chore if he ever wants it. Leave both trees alone. The one
exception is `product/brand/README.md:20`, which states what `theme.ts` holds — update that
line's three values so it stays true (`#F5C542` / `#9000C8` / `#00D000`).

### R8 — Docs: keep the written palette true
`marketing/PLAN.md:349`, `marketing/HYPERFRAMES-PLAN.md:293`,
`marketing/guides/VIDEO-EDITING-GUIDE.md:43`: swap the hex 1:1 in that one line each. Nothing
else in those documents.

### R9 — Renders are Nathan's step, not yours
`marketing/silent-studio/all-renders/*.mp4` and `marketing/website/assets/map.png` are
rasters of the old colours. Do not try to re-render (HyperFrames needs Node 22 + FFmpeg +
Chrome on his PC). List them in the report under "needs Nathan's PC":
`render.ps1 -Name <composition> -Render` per composition, and `_map/map-capture.html` in
Chrome for `map.png`.

### R10 — Contrast is Nathan's eye, not a stop
`#9000C8` on the night race ground `#0A0A0A` is ~2.9:1 (old ~5.5:1); on white ~7:1 (old
~1.9:1 for the green, now ~2.1:1). Lines/dots/fills are fine; purple *text* on night surfaces
may read dim. **Swap 1:1 anyway** — Nathan asked for the exact values. Do not invent a lighter
text variant. Note it in the report; `QUESTIONS.md` Q4 owns the follow-up.

## Rules
- Touch only the files listed under *App*, *Website*, *Marketing render sources* and *Docs*
  above (14 source/test files + 4 doc lines + `product/brand/README.md:20`). Anything else
  with the old hex in it → it is in the *Not edited* list, or you stop and report it.
- Never delete; move to `safe_to_delete/`. Git via `device_bash` with `GIT_OPTIONAL_LOCKS=0`;
  `mv` stale `.git/*.lock` aside, never delete.
- Independent of `BRIEF-settings-help-toggle.md` (different files). Either order; separate
  commits.
- Footprint: ~35 changed lines across the app + tests, ~40 across marketing/website/docs. Past
  ~100, something is off — stop.

## Tasks
1. Re-read every anchor. Run, and paste into the report, the *before* grep:
   `grep -rn -i -E "A667F0|3ED598|7b3fd1" app/src app/tests marketing/website/index.html marketing/silent-studio --include=*.html --include=*.ts --include=*.tsx`
   (expect exactly the anchors above plus the frozen `rounds/` snapshot).
2. R1 + R2 in `theme.ts`. 3. R3 in `wayMapStyle.ts`. 4. R4 in the two test files.
5. R5 across `marketing/website/index.html` and the eight `silent-studio` files.
6. R7 (README line) + R8 (three doc lines).
7. Verify (below). 8. Commit.

## Acceptance criteria
- `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0 (not bare `npx tsc`).
- `cd app && node --experimental-strip-types tests/run.ts` — **zero FAIL**; pass/skip counts
  in the report (cycle-6 baseline, measured in a sandbox before `92bd6ea`, was 586 / 583 pass / 3 skip).
- The *after* grep (same command as Task 1) returns **only** lines under
  `marketing/silent-studio/colours/rounds/v1/` — and the same command over
  `marketing/website/rounds` returns the two snapshots untouched.
- `grep -n "9000C8\|00D000\|65008C" app/src/ui/theme.ts` shows all three.
- `theme.ts:19` still `#F5C542`; every `SECTOR_COLORS` array still has its `#F5C542` entries.
- Nothing under `design/`, `product/brand/` (except `README.md:20`), `marketing/cycles/`, or
  any `rounds/` folder changed (`git status --short` proves it).
- One commit: `app+marketing: tier colours to F1 broadcast values (#9000C8 / #00D000); D-030 firewall re-centred`,
  ending with the attribution lines from the session reminder.

## Report back
Plain text. The before/after grep output; every file:line changed; tsc + test counts; commit
hash; the "needs Nathan's PC" render list (R9); the contrast note (R10); anything stopped on,
verbatim.

## Ground-rule wording for the coordinator (STATE.md / GLOSSARY.md, after landing)
"Tier colours are the F1 broadcast values: purple `#9000C8`, green `#00D000`, yellow `#F5C542`
(unchanged). D-030 firewall bands are ±20° around those hues (`[100,140]`, `[263,303]`).
Frozen round snapshots and closed design explorations keep the pre-cycle-7 values on purpose."
