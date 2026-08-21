# WP-J — SVG recompositions of every app tab + race-mode states (cycle 024 execution brief)

**Executor model:** Sonnet. **You see only this brief.** If ANY ambiguity or surprise arises, STOP and escalate — never guess. Never delete files. Dates absolute. No bare backlog/decision IDs in anything Nathan reads (the SVGs and their README are Nathan-facing).

## 0. Goal, in Nathan's words

`Nathan/Nathan's_notes2.md` (2026-08-19): "I lack a lot of control on the design choices. What would be nice is having a folder with svg image recompositions of every tab of the current app (+ also race mode and other things that are rendered in a way). So I could make quick implementations, drag move and add things and claude can directly see the changes and apply them to match my vision." He edits in **Inkscape**. Deliverable: one labelled, semantically grouped SVG per screen mirroring the app's real layout, regenerable from a canonical maker script, plus a round-trip convention so his hand-edits flow back.

## 1. Where files live (pre-resolved)

**`Nathan/` is write-forbidden to agents** (`Nathan/README.txt`, verified 2026-08-20: "Claude should never write to this folder, except if asked explicitly"). So the folder is a NEW top-level **`design/`**:

```
design/
├── README.md                  the round-trip convention doc (§6)
├── make_screens.py            canonical maker script — the ONLY source of canonical/
├── canonical/                 agent-written, regenerable; Nathan never edits here
│   ├── record_setup_day.svg   … record_setup_night.svg
│   ├── record_armed_{day,night}.svg
│   ├── record_running_{day,night}.svg
│   ├── record_finished_{day,night}.svg
│   ├── rides_{day,night}.svg
│   ├── routes_{day,night}.svg
│   ├── result_{day,night}.svg
│   ├── settings_{day,night}.svg
│   └── demo_{day,night}.svg          (18 SVGs total)
└── edited/                    NATHAN-ONLY writes; agents READ-ONLY
    └── PUT-EDITED-SVGS-HERE.txt   (one line: "Save your edited copies here, same filename. Claude diffs them against canonical/ each cycle.")
```

Both day and night variants are emitted per screen (pre-resolved over a colour-swap layer: two plain files are easier for Nathan to open and edit; a swap layer complicates every element). Commit via device_commit_files (it creates directories); repo mount also available rw at `$HOME/mnt/Qualifire` via device_bash.

## 2. Source of truth per screen (pre-resolved — say this in design/README.md too)

Cycle 024's WP-A is porting the cycle-022 mockup redesign (`demos/mockup.html`) of RECORD/RIDES/RESULT into the real app. The SVGs must show the state the app is landing on, not the state it is leaving:

| SVG | Source of truth | What it shows |
|---|---|---|
| `record_setup` | **mockup** (`demos/mockup.html` `R.phase==='setup'`, ~line 323) for flow/buttons + **real app** `app/src/ui/RecordScreen.tsx` idle branch (lines ~487–602) for element styling | theme pill top-right; logo mark (ink ring + yellow slash, 122 px wrap); map preview (~200 h); "STARTING FROM" / "GOING TO" pill rows (detected ✓); "WHICH ROUTE TODAY?" pill row + intent sub-line; ghosts line ("N rides found — you are racing N ghosts"); big **RECORD** slab (yellow, was START — cycle-022 rename); 6-tab bar visible |
| `record_armed` | **mockup only** (`R.phase==='armed'`, ~line 366 — the app gains this via WP-A) | full-screen: picked route + from→to header, big live map (route line, gates, rider dot, not moving), **START** button; NO tab bar |
| `record_running` | **real app** — cycle-020 race column, `RecordScreen.tsx` lines ~385–484 + `app/src/ui/liveView.tsx` pane | full-height race column on `t.race.bg`: map ≈ top half (route line behind/ahead, gate ticks, rider dot, ME recentre + zoom bar); context line "S2"; big lap clock `7:41.3` (92 pt, weight 800, tabular, ink — NEVER tier-coloured); 4-slot sector strip (S1 done green outlined w/ time, S2 current accent-border, S3/S4 empty); rotating status line ("MORNING · ROUTE LOCKED"); PAUSE bar (amber border, "recording continues · resume or end"); NO tab bar |
| `record_finished` | **real app** — liveView lap-terminal state + `routeMapView` `liveState='finished'` | as running but: big slot = LAP result chip (tier colour, time, delta) + P-position chip beside it; strip fully scored; map unlocked/labels back; END state after the ride |
| `rides` | **mockup** (cycle-022 redesign, `ridesScreen()` ~line 592) | header; expandable rows: route name + date + lap time + `P3 of 10` badge; ONE row drawn expanded showing sector splits colour-coded vs the ghost tower + secondary Export GPX+ / Delete actions; tab bar |
| `result` | **mockup** (cycle-022 redesign, `resultScreen()` ~line 516) | "Your last ride" top card; Personal Bests accordion, one route expanded (ranking rows dates-not-IDs + best sector times); tab bar |
| `routes` | **real app** `app/src/ui/RoutesScreen.tsx` | YOUR PLACES card (landmark rows, dormant marked, lat/lon/radius sub-line); WAYS accordion, one way open with a route entry + map (260 h) + gate ticks; footer honesty note; tab bar |
| `settings` | **real app** `app/src/ui/settings.tsx` | APPEARANCE (theme seg night/day) · ON THE BIKE (red lights seg auto/button/off; live map switch; earcons switch) · STARTING A RIDE (start place seg detect/choose) · SCORING (timing tower switch); footer note; tab bar |
| `demo` | **real app** `app/src/ui/DemoScreen.tsx` | DEMO RIDE header + sub; browse map with dot mid-route + coloured crossed gates; LiveSectorPane mid-ride; RUN DEMO RIDE button; note line; tab bar |

Before drawing, READ each named file (stage from the device — the snapshot at `/mnt/user-data/uploads/Qualifire/` may be stale after WP-A/WP-E land; **re-stage `RecordScreen.tsx`, `RidesScreen.tsx`, `ResultScreen.tsx`, `liveView.tsx`, `chips.tsx`, `tower.tsx`, `theme.ts`, `App.tsx`, `demos/mockup.html` at execution time** and draw what the post-024 code actually renders — the table above is the planner's 2026-08-20 reading; where the landed code differs, the landed code wins; if it differs so much a row above becomes meaningless, STOP and escalate).

Gates on maps: draw as **thin line ticks perpendicular across the route** in a dim theme-aware neutral when unscored, tier-coloured once scored — that is WP-E's target rendering (and the honesty rule: gates ahead visible but verdict-free). Rider dot: distinct colour from gates (WP-E). Route line: solid behind the rider, dotted ahead (running/finished only).

## 3. Canvas, theme tokens, typography

- ViewBox `0 0 390 844` (phone portrait), one screen per file, no device frame. Tab bar: 6 uppercase letterspaced labels (RECORD RIDES ROUTES RESULT SETTINGS DEMO), active tab = top accent bar + bright text (`App.tsx` ~lines 105–120, 147–178); bar hidden on `record_armed`/`record_running` (cycle-022 fullscreen rule).
- **All colours from `app/src/ui/theme.ts` — never invent.** Verified values (re-check at execution time):
  - shared: ink `#F4F2EC`, inkDim `#9a978f`, grey (NO-DATA only) `#6f6e6a`, purple `#A667F0`, green `#3ED598`, neutral/accent yellow `#F5C542`, amber (warnings/STOP — never red anywhere) `#E8A33D`.
  - night: bg `#17171b`, card `#212127`, cardBorder `#41414c`, text2 `#b5b3ac`, accentText `#F5C542`, race bg `#0A0A0A` / card `#141414` / border `#232323`.
  - daylight: bg `#FAF7EE`, card `#FFFFFF`, cardBorder `#E0D9C4`, text `#201F24`, textDim `#8A8577`, text2 `#6D6759`, accentText `#B98A0A`, onAccent `#17171b`, race bg `#FFFFFF` / card `#F5F1E6` / border `#E4DECB`.
- Tier chip language (`chips.tsx` / LAYOUT §6): purple = FILLED chip, green = OUTLINED, neutral = flat warm text, estimated = dashed grey `~`, interrupted = tier + `‖`.
- **Real `<text>` elements, never text-as-paths** (Nathan must retype in Inkscape). `font-family="Inter, 'Segoe UI', system-ui, sans-serif"`; numbers `font-weight="800"` with `font-variant-numeric: tabular-nums` where supported; labels uppercase + letterspaced. Use plausible sample data (times like `14:31`, dates like `Tue 19 Aug`) — clearly sample, never fabricated "records".
- Map areas: schematic — theme ground rect, 3–4 dim street strokes, and the REAL route polyline scaled into the rect (read `app/assets/routes/routes.json` → `routes.Morning.line` or equivalent field; inspect the JSON first; scale lon/lat to the rect, y-flipped). Group it as `*_map` with an inner leaf `map_placeholder_note` comment-free but labelled so Nathan knows it is schematic.

## 4. SVG structure conventions (binding — this is what makes them editable)

- **Every drawable leaf AND every group carries BOTH `id` and `inkscape:label`**, identical value, `snake_case`. Root carries `xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"` (+ sodipodi ns if used).
- Top level = semantic layers (`<g inkscape:groupmode="layer">`) in z-order, e.g. for record_running: `bg`, `map`, `live_pane`, `status`, `controls`; for list screens: `bg`, `header`, `content`, `tabbar`.
- Children parent-prefixed: `map_route_line`, `map_gate_tick_1`, `map_rider_dot`, `live_pane_clock`, `strip_slot_s2_border`, `tabbar_record_label` …
- **Max 3 levels deep** (layer → group → leaf). Never label into `<defs>`/clipPaths.
- Names describe drawn role/position only — never claim an identity not drawn ("gate_tick_3", not "vaartdijk_gate").
- All naming is GENERATED by helper functions in the maker script (e.g. `el(tag, id_, **attrs)` that stamps both attributes, and a `layer(id_)` helper), never hand-typed per element — so a re-run reproduces ids exactly.

## 5. The maker script

`design/make_screens.py` — Python 3, **stdlib only** (no PyPI on the sandbox or Nathan's VM; verified 2026-08-20: pip 403s). Requirements:
- One function per screen taking a `theme` dict; a `THEMES = {'day': …, 'night': …}` table transcribed from `theme.ts` (with a comment naming the source file + the rule "theme.ts is canonical — re-transcribe, never fork").
- Reads `app/assets/routes/routes.json` for the map polyline via a relative path with a CLI override (`--repo-root`), so it runs both in the sandbox (against staged files) and on Nathan's machine (`python3 design/make_screens.py` from repo root).
- Emits all 18 SVGs into `design/canonical/`, deterministic output (stable ordering, fixed floats) so diffs are meaningful.
- Self-validates before writing: every element has id+label, ids unique per file, nesting ≤3, no `<image>` elements, all colours drawn from the theme table; exits non-zero listing violations.
- Header docstring: "Canonical source of design/canonical/*.svg. Nathan's hand-edits live in design/edited/ and are mirrored back into THIS script (his edited file is the truth until mirrored). Re-run: python3 design/make_screens.py".

## 6. `design/README.md` — the round-trip convention (Nathan-facing, plain language)

Must state: what this folder is; canonical/ is regenerated from make_screens.py (never edit those in place — edits are overwritten); **his workflow**: open a canonical SVG in Inkscape → move/resize/add/relabel → save into `design/edited/` with the SAME filename → tell Claude (or just leave it — every cycle starts with a check); the team then (a) reads the edited SVG, (b) turns the differences into design changes in the app, (c) mirrors the agreed result back into make_screens.py so canonical/ catches up, (d) never overwrites anything in edited/; which screens show the app as-built vs the ratified cycle-022 target (the §2 table, in plain words); that day/night are separate files; that gate ticks/rider dot/route line mirror the real map rendering. The matching cycle-start check ("diff edited/ vs canonical/") is written into `process/CONVENTIONS.md` **by WP-I, not by you** — do not touch process files (single writer per file per cycle).

## 7. Verification (all mandatory before reporting done)

Environment facts (verified 2026-08-20): the cloud sandbox has NO rsvg-convert and cannot install it (`apt` → 403) and NO ImageMagick use is permitted anyway (it drops markers/text). **Render with Playwright Chromium, which is installed and smoke-tested in the sandbox:**
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844})
    pg.goto(f'file://{svg_path}'); pg.screenshot(path=png_path); b.close()
```
1. Run `make_screens.py` → 18 SVGs, validator clean; run twice → byte-identical output (determinism).
2. Render every SVG to PNG as above; **open each PNG with the Read tool and eyeball it** against the source screen: layout proportions, all text legible and horizontal, tab bar present/absent per §2, night variant on dark ground, day on light, no missing elements (a blank region = a bug, not a style).
3. For record_setup/armed/rides/result: also screenshot the corresponding `demos/mockup.html` state with Playwright (drive its tabs/phases via clicks; it is self-contained JS) and compare side by side with the SVG PNG.
4. XML well-formedness: `python3 -c "import xml.etree.ElementTree as ET; ET.parse(path)"` per file.
5. Commit `design/**` via device_commit_files; then via device_bash `ls -R $HOME/mnt/Qualifire/design` to confirm all 21 files landed on Nathan's disk.
6. App untouched: `cd $HOME/mnt/Qualifire/app && node --experimental-strip-types tests/run.ts` and `npx tsc --noEmit` — identical to your pre-work baseline (run it first; the planner's 2026-08-20 reference was 145 tests: 142/0/3, but derive your own).
7. `demos/mockup.html` untouched (read-only reference — this WP ships no design change to it).

## 8. Files touched

Created only: `design/README.md`, `design/make_screens.py`, `design/canonical/*.svg` (18), `design/edited/PUT-EDITED-SVGS-HERE.txt`. Nothing edited, nothing moved, zero app/doc files.

## 9. Conflicts with cycle 023 / other WPs

- Zero file overlap with cycle 023 (new folder only). READ dependencies: WP-A (record/rides/result final layouts), WP-E (gate-tick/rider-dot/route-line rendering) — run AFTER those land and draw what landed; WP-B's "new" free-ride option is NOT drawn this cycle (unratified layout — leave it out; note in README under "not drawn yet").
- WP-I writes `process/CONVENTIONS.md` (round-trip cycle step) and lists `design/` in the root README — coordinate order: WP-J before WP-I is fine and expected.

## 10. Pre-resolved ambiguities

- Location `design/` at root (Nathan/ is agent-write-forbidden; demos/ is D-020's browser-HTML folder).
- Two theme variants as separate files, not a swap layer.
- Renderer = Playwright Chromium (librsvg unavailable in sandbox; ImageMagick forbidden).
- Mockup vs app source-of-truth per screen = §2 table; landed cycle-024 code wins on conflict.
- Sample times/dates are placeholders, not data claims; race-mode SVGs carry no colour a sector hasn't "earned" in the depicted moment (S3/S4 ahead stay uncoloured in record_running — the honesty rule applies even to pictures).
- One drawn state per file; PAUSE (not the expanded RESUME|END row) on record_running.

## 11. NEEDS-NATHAN

1. Folder name/location `design/` is a chosen default — rename is a one-line `mv` if he prefers (surface in the cycle summary, not a blocker).
2. Confirm the edited/-same-filename workflow suits him (README asks him directly).

## 12. Rollback

Additive only: remove the `design/` folder (Nathan: move to `safe_to_delete/` or `git clean`) and nothing else in the repo changes.
