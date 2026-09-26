# INSPECT REPORT: teaser-full v2 (root + 5 sub-compositions)

Inspector: Opus, fresh context, 2026-09-26. I re-ran or re-derived every claim myself. The
executor report (`EXECUTOR-REPORT-v2.md`) was read but not relied on.

## Verdict: PASS WITH FINDINGS (all minor, none blocking)

The build is faithful to `BRIEF-teaser-full-v2.md`. Every tween, value, ease and helper in all
five scenes is unchanged from its original, both as text and in behaviour. The `#stage` fix
really is in all five files. Nothing in the build blocks Nathan from running lint, snapshots
and renders on his PC.

## What I reproduced myself (not taken from the executor report)

| # | Check | How I verified it | Result |
|---|---|---|---|
| 1 | Brief + checker read in full | read | done |
| 2 | Static checker | ran `check-teaser-full-v2.py` | **257 PASS / 0 FAIL, exit 0, `ALL CHECKS PASSED`** |
| 3 | 5 original scene files unmodified | md5 now **and** `git show HEAD:<file> \| md5sum` (independent of the executor's before/after claim). All mtimes are Sep 16-25, before the build (Sep 25 23:38+) | all 5 md5s == git HEAD == executor's table (`84206fff…`, `ab407498…`, `09869627…`, `b1138483…`, `1d584b84…`); `git status` shows none of them modified |
| 4 | `#stage` fix is real | grep: zero occurrences of `stage` in any `compositions/*.html`; each file has a bare `#<cid> #<cid>-scene {` rule with `position: absolute; top: 0; left: 0;` + width 1920 / height 1080 / `background: var(--bg)` / `overflow: hidden` / font-family / `color: var(--ink)` (lines 6-14 of all five files) | confirmed in all 5 |
| 5 | `closing.html` vs brief 5.5 | extracted the brief's fenced block and ran `diff` and `cmp` against the real file | **byte-identical**. I also ran `build_teaser_v2.py` into a temp dir: it builds `closing.html` from the ORIGINAL scene file, not from the brief (the build script never opens the brief), so this match is a real reproduction, not a copy |
| 5b | Root `index.html` vs brief section 4 | extracted fenced block, `diff` | **byte-identical** |
| 6 | Per-file fidelity: I did all 5, not just 2 | my own reverse-transform script (independent of the checker): strip the `#<cid> #<cid>-scene ` prefix, map the scene rule back to `#stage`/`position: relative`, map `<cid>-basemap` back to `basemap`, track-index -1, gatessaving 12.3 back to 12.4, `byId(` back to `document.getElementById(`, then compare against the original | CSS, markup and script **all equal the original** for all 5. Script bodies match **exactly, including indentation** (stricter than the checker's whitespace-tolerant compare); markup matches exactly at +4 indent |
| 6b | Behavioural tween equivalence | node harness with a mock GSAP + DOM runs the original script and the new composition script. It logs every `gsap.set` / `tl.to` / `fromTo` / `set` / `shiftChildren` call (targets, from-vars, to-vars, position) plus every `setAttribute` and `.src` write, in **both night and day themes**, and compares the two logs | **identical call logs for all 5 scenes × 2 themes** (e.g. startride 506 GSAP calls, gatessaving 271, ranking 34). Timeline durations from GSAP semantics: **6.2 / 14.0 / 12.3 / 10.8 / 4.0**, so gates-saving really is 12.3 and the slot table is right |
| 6c | basemap rename | grep | each map scene has exactly `id="<cid>-basemap"` (HTML) + `#<cid> #<cid>-scene #<cid>-basemap` (CSS) + `byId('<cid>-basemap').src = 'map-day.png'` (JS). No `id="basemap"`, `#basemap`, `'basemap'` or `"basemap"` left anywhere; the remaining "basemap" hits are only in comments. The day-theme harness confirms the swap hits `<cid>-basemap` |
| 6d | `data-hf-id` stripped | grep | 0 in all 5 compositions and in the root (originals: start-ride 30 inside `#stage`, gates-saving 32) |
| 6e | Theme tokens | grep for `:root` and for any `--token:` declaration in compositions | none. Tokens are declared only in the root's `:root` / `:root[data-theme="day"]`, so nothing shadows the day override. `document.documentElement.getAttribute('data-theme')` is left untouched in the 3 map scenes |
| 7 | Root recipe | read + parse | 5 empty slot divs: opening 0/6.2/t0, startride 6.2/14.0/t1, gatessaving 20.2/12.3/t2, ranking 32.5/10.8/t3, closing 43.3/4.0/t4 = 47.3. Every `data-composition-src` file exists. GSAP CDN loaded once (plus `theme.js`). Only inline script: `window.__timelines.teaser = gsap.timeline({ paused: true });`. The only `.add(` text is inside the brief-mandated HTML comment ("manual master.add() merge"). No `gsap.context` |
| 8 | v1 archived, intact | md5 of `v1-merged-timelines/index.html` and `README.md` vs `git show HEAD:marketing/silent-studio/teaser-full/{index.html,README.md}` | **both equal the committed v1** (`f6c55852…`, 1014 lines; README `863e8c54…`). The brief's expected `c6ab21e6…` was simply stale: HEAD itself is `f6c55852…` |
| 9a | Structure | HTMLParser tag-balance per file | every file = `<template>` > `div#<cid>` > [`style`, `div#<cid>-scene`, `script`], balanced, with no unclosed tags. No element id equals any composition id, and there are no duplicate ids within a file |
| 9b | JS syntax | `node --check` on all 5 extracted scripts + the root script | all OK |
| 9c | Registrations | grep + harness | each file registers exactly one `window.__timelines.<cid>`, with the correct id |
| 9d | Leftover v1 patterns | grep `master`, `.add(`, `shim`, `#scene-` in `index.html`, `compositions/`, `README.md` | only prose mentions of v1 in the root comment and the README; no code |
| 9e | Deterministic build | re-ran `build_teaser_v2.py` into a temp dir, `diff -r` | output identical to the committed files |
| 10 | Pre-existing lint findings | grep in the ORIGINALS | `#trow-today` double `fromTo` at `CLIMB_T0`: `ranking/index.html` lines 267 and 269 (also present 5× in the HEAD v1 merge). `setAttribute('d', dAttr)` then `core.getTotalLength()`: start-ride 164/166, gates-saving 163/165, ranking 190/192. Both are pre-existing and carried over byte-identically |

### Extra check: the brief's runtime facts, verified against the HyperFrames source

HyperFrames lint cannot run anywhere I can reach (the VM and the cloud sandbox both get 403 from
npm). Instead I shallow-cloned `github.com/heygen-com/hyperframes` (HEAD `77b2260`, 2026-09-25)
and read the code that mounts sub-compositions:
`packages/core/src/runtime/compositionLoader.ts`, `runtime/flattenedRoot.ts`,
`compiler/compositionScoping.ts`, `compiler/inlineSubCompositions.ts` and
`parsers/src/rewriteSubCompPaths.ts`.

- **F3 (asset paths): confirmed.** A plain relative path such as `src="map.png"` is left as-is,
  unless a sibling file `compositions/map.png` exists on disk (none does). It therefore resolves
  to `teaser-full/map.png`. The runtime `.src = 'map-day.png'` resolves against the root
  document too. No `../` fix is needed.
- **F5 / CSS prefix: confirmed that it survives the id rename.** At mount time,
  `markFlattenedInnerRoot` REMOVES `id="<cid>"` from the composition div and demotes it to
  `data-hf-authored-id`. `scopeCssToComposition` then rewrites the root-id token.
  `#opening #opening-scene #open .inner` becomes
  `[data-composition-id="opening"] [data-hf-authored-id="opening"] #opening-scene #open .inner`
  in the live-mount path. In the producer path (`compoundAuthoredRoot`) the two attribute
  selectors are joined onto the same element. Both forms match the mounted DOM. `#opening-scene`
  is not rewritten, because the next character is `-`.
- **Scripts:** HyperFrames re-injects each composition's inline script into `<body>`, wrapped
  with a scoped `document`, `gsap` and `window` proxy (`wrapScopedCompositionScript`). The
  `document.querySelector('#<cid>-scene')` fallback therefore resolves inside the slot.
  `gsap.timeline()` tweens get their string targets pre-resolved within the slot.
  `window.__timelines.<cid>` writes to the real registry, because the runtime id equals the
  authored id. This scoping is compatible with the brief's `gsap.context(fn, R)` layer; the two
  layers agree.

## Findings

**F-1 (minor, informational, brief-level): the `closest()` branch never fires.**
In every file, e.g. `compositions/startride.html` line 123:
`document.currentScript.closest('#startride-scene')` always returns null. The script is a
**sibling** after `#<cid>-scene`, not a descendant. At runtime HyperFrames also re-injects it as
a new `<script>` in `<body>`. `R` is always resolved by the `document.querySelector('#<cid>-scene')`
fallback. That fallback is correct: the ids are unique per document, and HyperFrames' scoped
`document` proxy filters to the slot. Nothing is broken. Just don't let a later cleanup delete
the fallback as "redundant".

**F-2 (minor, checker gap, already fixed in the build): `#stage` blind spot.**
`check-teaser-full-v2.py` line 92 only checks that each selector *starts with* the prefix, so it
passes the wrong `#<cid> #<cid>-scene #stage` too. The executor's self-caught bug was real, and
the fix is confirmed (table row 4). Suggest adding two checks to the checker for future cycles:
(a) the string `#stage` appears in no composition; (b) a bare `#<cid> #<cid>-scene {` rule
containing `position: absolute; top: 0; left: 0;` exists. No action needed on the files.

**F-3 (minor, report accuracy): the executor report misdescribes its own build script.**
`EXECUTOR-REPORT-v2.md` section 1a says the build script "reads … the exact worked example in brief
section 5.5". It does not: `build_teaser_v2.py` never opens the brief and builds `closing.html`
from the original scene file. The error understates the result: the byte-match with the brief is
an independent reproduction, not a copy. Also, the v1 md5 mismatch is explained there as "edited
after the cycle README's md5 was recorded". In fact the archive equals git HEAD, so the cycle
README's `c6ab21e6…` was just a stale value.

**F-4 (cosmetic, brief-level): wrong `data-hf-id` counts in the brief.**
Brief section 5.6 says start-ride has 24 `data-hf-id` stamps and gates-saving 25. The originals
actually carry 30 and 32 inside `#stage` (31 and 33 in the file). All were stripped, so this has
no effect.

**F-5 (cosmetic): dangling "archived below" in the README.**
`teaser-full/README.md` line 14 says "v1 (archived below)", but the README never says where
below. The archive path is in the root `index.html` comment and in `OPEN-ITEMS.md`. Optional
one-line fix.

## Taken on faith / not verifiable from here

- HyperFrames lint, check, snapshots and renders: not runnable in the VM or the cloud sandbox
  (npm 403). They are Nathan's steps (OPEN-ITEMS v2 section). My source read of the runtime
  (above) lowers the risk on F2, F3 and F5 but is not a render.
- The mock-GSAP harness is not real GSAP. It proves the call sequences are identical and
  computes durations with GSAP's documented rules (0.5 s default duration, numeric positions
  only; I checked that no `+=`, `<`, labels, stagger or repeat appear in any script). The actual
  pixels still need Nathan's snapshots at 7.9 s and 35.7 s, as the brief says.

## Token usage (inspector)

About 210k tokens end to end. That covers reading the brief, checker and report, the 5-file
reverse-transform and harness runs, and cloning and reading the HyperFrames runtime.
