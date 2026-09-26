# EXECUTOR REPORT — teaser-full v2 (root + sub-compositions)

Executor: Sonnet, 2026-09-26. Followed `BRIEF-teaser-full-v2.md` exactly; no deviations, no
stops.

## 1. Files written / overwritten / archived

Archived (step 0, before anything else touched):
- `v1-merged-timelines/index.html` (copy of the old v1 `teaser-full/index.html`)
- `v1-merged-timelines/README.md` (copy of the old v1 `teaser-full/README.md`)
- Actual md5 of the v1 file at archive time: `f6c55852a431bb12dc5cbb81c396a9be` — this
  differs from the `c6ab21e685965c2b7af8fbef428f4cbd` the brief expected (per cycle README).
  Per rule 0.1 exception in section 3, this is recorded here, not a STOP; the file was
  archived as found. (The v1 file appears to have been edited after the cycle README's md5
  was recorded — its content still reads as the same manual-merge structure the brief
  describes superseding.)

Rewritten (overwrites the old v1 content, archived above):
- `marketing/silent-studio/teaser-full/index.html` — 57 lines, md5 `a02ce258828402dc2c510a6855c7d08d`
  (the thin root, written verbatim from brief section 4).

New files (final, after the fix in section 1a below):
- `marketing/silent-studio/teaser-full/compositions/opening.html` — 103 lines, md5 `29b39d2c91ae14eebb5a492e6868eef8`
- `marketing/silent-studio/teaser-full/compositions/startride.html` — 267 lines, md5 `5ffad32a83c9905ab6a0bb506dc8ac54`
- `marketing/silent-studio/teaser-full/compositions/gatessaving.html` — 316 lines, md5 `9f9c542b7efd0f41f08f9dd266a1e1c7`
- `marketing/silent-studio/teaser-full/compositions/ranking.html` — 283 lines, md5 `961ec380c701d98903eb46e62da391d2`
- `marketing/silent-studio/teaser-full/compositions/closing.html` — 72 lines, md5 `fdf32150a128e109ce5df2a60a2ce973`

### 1a. Self-caught fidelity bug (fixed before finishing, not in scope of "STOP")

My first build pass through the build script had a real bug: the original `#stage { ... }`
rule was being prefixed as `#<cid> #<cid>-scene #stage { ... }` (appending `#stage` as a
further descendant selector) instead of becoming exactly `#<cid> #<cid>-scene { ... }` per
the brief's own mapping table (section 5.2). Since there is no element with `id="stage"`
anywhere in the new files, that rule would have silently never matched anything, dropping
the scene's base background/overflow/font-family/color — a real visual bug the checker did
not catch (its "every selector starts with the prefix" check is satisfied by
`#<cid> #<cid>-scene #stage` too, since it does start with the prefix). Caught it myself by
diffing my built `closing.html` byte-for-byte against the brief's own section 5.5 worked
example (which I could do exactly since that scene's build is fully specified there) and
finding this and two purely cosmetic differences (a doubled indent, and a stray blank line
at the top of the `<style>` block from an over-eager `.strip()`). Fixed all three in the
build script and rebuilt; `compositions/closing.html` is now byte-for-byte identical to the
brief's worked example, and the checker was re-run clean (257/257) after the fix.
- `marketing/silent-studio/teaser-full/README.md` — 50 lines, md5 `d35432a428baeb6d2ba51643c15cc924`
  (fully rewritten per section 9.1; no command blocks, points to the brief and to cycle 21's
  OPEN-ITEMS.md).

All five files were built by a Python script (`build_teaser_v2.py`, in this cycle folder)
that reads the five original scene files and the exact worked example in brief section 5.5,
and transforms them mechanically (CSS tokenizer that drops/prefixes rules, an attribute
transform for markup, and a plain-text substitution pass for the script body) — no hand
retyping of any tween, CSS declaration or markup content.

Also appended: this cycle's `OPEN-ITEMS.md` (new `## v2 (2026-09-26)` section with the
section 8.2 command blocks + expectations; added the one-line pointer at the top of the v1
"Blocker" section). Not touched: `README.md` / other cycle docs beyond what the brief asked.

## 2. Checker + syntax-check results

`check-teaser-full-v2.py`: **257/257 checks passed** (`ALL CHECKS PASSED`, exit code 0) on the
final build (after the fix in 1a), matching the count the plan tier reported validating the
checker itself against.

`node --check` on each extracted script body: all 5 files passed —
`opening.html js syntax ok`, `startride.html js syntax ok`, `gatessaving.html js syntax ok`,
`ranking.html js syntax ok`, `closing.html js syntax ok`.

## 3. `npx hyperframes lint` attempt (section 8.2)

Tried once, no retries:
```
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/hyperframes
```
**Lint not runnable in VM (network)** — as expected per the brief. Nathan runs the
PowerShell blocks now appended to `OPEN-ITEMS.md`'s v2 section.

## 4. Section 6 finding — `duplicate_media_id [basemap]`

Confirmed merge-caused: each of `start-ride/index.html`, `gates-saving/index.html` and
`ranking/index.html` has exactly one `<img id="basemap">` — not a defect in any single
original. Fixed in the three new composition files only (originals untouched): the `<img>`
id, the `#basemap` CSS rule's selector, and the `byId('basemap').src = 'map-day.png';` line
were each renamed to `<cid>-basemap` (`startride-basemap`, `gatessaving-basemap`,
`ranking-basemap`). Verified by the checker's per-scene "exactly 3 references to
`<cid>-basemap` ... and no bare basemap id/selector left" check (passed for all three).

## 5. Section 7 findings — noted, not fixed

- `gsap_repeated_fromto_without_baseline` on `#trow-today`: confirmed pre-existing in
  `marketing/silent-studio/ranking/index.html` (two `tl.fromTo('#trow-today', ...)` calls at
  `CLIMB_T0` — lines ~267 and ~269 of that file, one for `y`, one for `opacity`). Left as is.
- `svg_measure_before_path_d` on `#route-core`: confirmed pre-existing in
  `marketing/silent-studio/start-ride/index.html` (and structurally identical in
  `gates-saving/index.html` and `ranking/index.html`) — each scene sets `d` on the route
  paths in a `forEach` and immediately calls `core.getTotalLength()`. Left as is.

## 6. Deviations from the brief

None. The only thing worth flagging (not a deviation, not a STOP): the archived v1 file's
md5 didn't match the cycle README's recorded value — noted in section 1 above per the
brief's own instruction for that case.

## 7. Five original scene files — confirmed unchanged

md5, before build (from the brief / this session's own read) and after build (re-checked
just now):

| file | md5 (unchanged, before == after) |
|---|---|
| `marketing/silent-studio/brandmark/opening/index.html` | `84206fff80a1daad77054fa84f0c131f` |
| `marketing/silent-studio/start-ride/index.html` | `ab407498ab6f5d9507dc71c809911e93` |
| `marketing/silent-studio/gates-saving/index.html` | `09869627fdd3df5ddeec65f681639dfa` |
| `marketing/silent-studio/ranking/index.html` | `b11384833cbc2cbff91734e687158f1a` |
| `marketing/silent-studio/brandmark/closing/index.html` | `1d584b84a1e61fbdaa72885769bb1fd5` |

All five match exactly before and after the build ran — none were opened for writing at any
point (the build script only ever calls `open(orig_path, encoding='utf-8')` for reading).

## 8. Token usage

This executor run (reading the brief + checker + 5 originals + current teaser-full state,
writing the build script, iterating once to a clean 257/257 pass, running syntax checks,
the one lint attempt, and the three doc writes): roughly 90-100k tokens of context read/
generated end to end, well under the plan/inspect tiers' ~180-190k each on the v1 cycle.

## STOPPED

Not applicable — no stop was needed.
