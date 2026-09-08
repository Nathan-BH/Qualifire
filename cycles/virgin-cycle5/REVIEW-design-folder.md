# REVIEW — `design/` folder, state as of 2026-09-08 (branch `virgin`)

**Written by:** Plan tier (Fable), review only — nothing in `design/` was edited or regenerated. Every claim below was checked on the device tree today (`ls`, `grep`, `diff`, `git log`), not taken from the digest that preceded this pass.
**Companion:** `BRIEF-design-folder-plan.md` (the forward plan, same folder).

---

## 1. The short version

`design/canonical/` is a genuinely good idea that has quietly gone stale. It is a **build output of a script that reads the app's own source** — colours from `theme.ts`, places from the seed catalog, the map polyline from the bundled way asset, layouts transcribed screen-by-screen from the `.tsx` files — which is the right architecture and worth keeping. But the script (`make_screens.py`, 1,696 lines) was last run on 2026-08-31, and since then the `virgin` branch has renamed the files it reads, inverted the way/route vocabulary, removed the screen one of its nine mockups depicts, added four full-screen screens and one whole tab, and retired a drawing convention the README still documents as "literally what your phone draws today." Right now the script **would not run** (§3.1). None of this is a design problem; it is a maintenance debt that has accrued because three fast cycles landed while nobody re-ran the generator.

Around the canonical set sit three side-folders. One (`drafts/`) is a finished palette exploration waiting on a decision Nathan has not made. One (`ChatGPT attempt…`) is historical exploration that needs no action beyond a tidy. One (`edited/`) holds one agent-made test fixture masquerading as a Nathan edit.

## 2. What is good and should be kept

- **Code-driven, not hand-drawn.** `make_screens.py` reads `theme.ts`, `chips.tsx`, `settings.tsx` and the map-view file for its colour allow-list, `catalog.seed.json` for the places, the way manifest for the real ridden polyline, and mirrors named app functions (`routeLabel()`, `chipColors()`, `<StripSlot>`, `isFullscreen()`) with a comment saying which one. A mockup drift is therefore a *script* drift, fixable once and regenerable forever. This is rare and worth protecting; most projects' mockups are dead pixels within a week.
- **Self-validating output.** Every element carries `id` == `inkscape:label` (so Inkscape's Objects panel is usable), ids are unique per file, nesting is capped at 3, no `<image>`, and every colour is cross-checked against the hex literals *actually present in the app source* — not against the script's own transcription, so a typo in the transcription cannot pass. All files are validated before any is written. This is exactly the discipline Nathan's own `svg-labelling-conventions` and `scientific-figure-building` skills ask for.
- **Determinism.** Frozen `now` for the dormant check, fixed-precision floats, stable ordering — `canonical/` is byte-stable across runs, so a diff between runs is a real change.
- **The round-trip contract in `design/README.md`** (open `canonical/x.svg` in Inkscape → save as `edited/x.svg` same filename → team diffs at cycle start → agreed change goes into the app *and* back into the script) is clear, honest about who writes where, and correctly treats Nathan's edited file as the truth until mirrored.
- **The palette-draft tooling** (`make_draft_screens.py` + `draft_palettes.py` + `check_draft_contrast.py`) is small (267 lines total), reuses the canonical builders rather than forking them, recolours *chrome only* (verdict colours are held fixed as "the app's vocabulary"), and computes WCAG contrast rather than eyeballing. Whatever Nathan decides about the palettes, the tooling is reusable.
- **Nine screens × day/night** covered the whole app *as of 2026-08-31*, including the three full-screen recording phases with the tab bar correctly absent and the scrolling six-tab bar drawn at real size with real clipping. The README's explanation of both of those is good and still true.

## 3. What has gone stale (facts, with the current file/line)

### 3.1 The generator no longer runs

| Script reads | Status on `virgin` today | Effect |
|---|---|---|
| `app/assets/routes/routes.json`, key `manifest["routes"]["Morning"]` (`make_screens.py:326-329`) | Directory is gone. It is now `app/assets/ways/ways.json`, top-level key `"ways"` (keys: `Morning, EveningA, EveningB, MorningB, WorkStationA`; per-way fields incl. `path`, `gates`, `gateIdx`) | **`FileNotFoundError` — hard crash** before any SVG is built |
| `app/src/ui/routeMapView.tsx` in `load_allowed_colors()` (`:147`) | Renamed to `wayMapView.tsx`; `CASING = '#14120C'` now lives at `wayMapView.tsx:171` and appears nowhere in `theme.ts` | Silently skipped (`if not os.path.exists: continue`), so `#14120C` drops out of the allow-list and the validator would **reject every map-bearing screen** even after the crash above is fixed |
| `ResultScreen.tsx` (docstring `:16`, comments `:976`) | Gone. Its per-ride board was absorbed into `RideDetailScreen.tsx` (WP-H, cycle 1); the tab slot is now `ResultsScreen.tsx` + `ResultsDetailScreen.tsx` (WP-2, cycle 3) | The `result_*.svg` builder mirrors a screen that no longer exists |
| `store/defaultRoute.ts` (`:627, :635`) | Renamed `defaultWay.ts` (WP-3) | Comment-only; the mirrored `routeLabel()`/`routeVariantLabel()` logic needs re-checking against the renamed functions |
| `App.tsx` (tab bar) | Still `app/App.tsx`; six tabs, but the sixth is now **RESULTS** ("WP-2 re-added RESULTS, in RESULT's old slot", `App.tsx:215`) | Tab label text in every screen's bar is stale by one word |

### 3.2 The vocabulary is inverted relative to WP-3

WP-3 (cycle 3, 2026-09-05/06) swapped the words: a **route** is now the from→to path between two landmarks (parent); a **way** is one named variant of riding it (child, the thing rides and results are keyed by). `design/README.md:44` still says `routes` shows "YOUR PLACES + **WAYS (the routes between them**…)". Under WP-3 that reads exactly backwards. The live screen today has headings `YOUR PLACES` and `ROUTES` (`RoutesScreen.tsx:48, :80`), and `ResultsScreen.tsx` lists "every **way** he's actually ridden". The digest flagged this line as *possibly* matching WP-3 by coincidence; it does not — it clashes.

### 3.3 A documented drawing convention was retired

`README.md` "Gate markers on the map": ticks turn "a bolder, full-strength tier colour (purple / green / amber-yellow) once that sector has been ridden and judged … this is literally what your phone draws today." **WP-E (cycle 2, landed 2026-09-05, commit `d7e925b`)** removed exactly that — Nathan's rule "gates should not change colour" — because sector-coloured *trail spans* between gates (WP-K, 2026-09-04) now carry that signal. `record_running`/`record_finished` draw tier-coloured ticks that the phone no longer draws, and draw no coloured trail spans that it does.

### 3.4 Screens that exist with no mockup at all

| Screen | Landed | File | Notes |
|---|---|---|---|
| RESULTS tab (way list) | WP-2, cycle 3 | `ResultsScreen.tsx` | Whole tab; sport-scoped, most-ridden first |
| RESULTS detail (scatterplot + all-time board) | WP-2, cycle 3 | `ResultsDetailScreen.tsx`, `resultsPlot.tsx` | Plot is plain Views from a pure model (`resultsPlotModel.ts`) — easy to mirror deterministically |
| Ride detail (full-screen, post-STOP and from RIDES row) | WP-H, cycle 1 | `RideDetailScreen.tsx` | Absorbed the old RESULT board + ridden trace on map + "make reference" |
| Catalog detail (a place or a way, from ROUTES) | WP-K, cycle 2 | `CatalogDetailScreen.tsx` | Absorbed ROUTES' old expand-in-place card; ROUTES is now tap-only |
| Gate editor (full-screen) | WP-J, cycle 2 | `GateAdjustScreen.tsx` | Nathan-requested "open in a new tab with a proper map render" |
| SETTINGS → SPORTS section | WP-1, cycle 3 | `settings.tsx:309-317` | Sport switcher + `showSportPillOnRecord` toggle |
| RECORD sport-pill row | WP-1, cycle 3 | `RecordScreen.tsx:1264-1273` | Shown with 2+ sports AND the toggle on; absent from all four `record_*` SVGs |

So the gap is wider than "RESULTS has no mockup": **five full-screen surfaces and two in-screen additions** post-date the last generator run. The canonical set covers the six tab roots (minus RESULTS) and nothing beneath them.

### 3.5 The data source has changed meaning

`catalog.seed.json` still exists and still holds the six Leuven landmarks the mockups draw. But since 2026-09-08 (`seed.ts`) the **default seed mode is `empty`** — a fresh install has no landmarks, ways, routes, gate sets, ghosts, or bundled way assets/PNGs; the curated catalog is opt-in via `EXPO_PUBLIC_SEED_MODE=shipped`. Two consequences: (a) the README's line "your places on the Routes screen are your real catalog data" is now "the *opt-in shipped fixture*", which is fine as placeholder data but should say so; (b) the app now has **empty states** on ROUTES/RIDES/RESULTS/RECORD that no mockup shows — and for a "stranger with a blank install" (D-045 ruling 3) those are the first screens they see.

## 4. Decisions left hanging

**The palette.** `design/drafts/` holds three complete chrome palettes (pink / lightblue / green), 27 day-mode SVGs, a passing WCAG report (Gate A 33/33, Gate B 42/42), and a README that is careful to say "not canonical, an exploration for Nathan to look at". There is **no record anywhere of which one (if any) he picked**. Separately, `product/brand/README.md:19` says "palette decision OPEN — Nathan comparing `palettes/brandboard_*.png`" — a *second*, brand-level palette exploration (trials A–F) that predates the drafts. Two parallel palette explorations, both open, neither cross-referencing the other. Nothing in `theme.ts` changed as a result of either. This is the one item in `design/` that only Nathan can close.

## 5. What is fine as historical material

- **`design/ChatGPT attempt at improved design/`** (2026-08-29, three commits). An external tool's reconstruction of the same nine screens at 408×900 with a device frame, plus a contact sheet and its own README. Nothing from it was adopted — `make_screens.py` is unchanged after those commits and the next design commit is the palette drafts. It is legitimate exploration and should stay in history, but it does not belong beside the canonical set as if it were an alternative source of truth. **The four real phone screenshots inside it are the one genuinely useful asset** — they are the only ground-truth renders in the folder — and are buried under a folder name with spaces and the word "ChatGPT".
- **`design/__pycache__/`** exists on disk but is not tracked by git. Harmless.

## 6. `design/edited/` — one stray file, and it is not Nathan's

`edited/record_armed_draft-pink.svg` differs from `drafts/record_armed_draft-pink.svg` only in an inserted line-2 comment — `<!-- hand-edit (simulated Inkscape re-save), cycle 025 palette draft pass -->` — and in the accent changing `#C2185B → #D81B60` on the route line, five gate ticks and the START button. That is an **agent-authored fixture** used to prove the edited-vs-canonical diff during the cycle-025 palette pass, not an edit Nathan made. It also cannot ever be picked up by the workflow it sits in: the cycle-start check diffs `edited/<name>.svg` against `canonical/<name>.svg`, and no `canonical/record_armed_draft-pink.svg` exists. It has no `sodipodi`/`inkscape:version` markers, confirming it never passed through Inkscape. Clutter; not pending anyone's attention.

Beyond that fixture, `edited/` has never been used — which is consistent with the workflow being sound but the canonical set having drifted before Nathan had a reason to open one.

## 7. Summary table

| Area | Verdict |
|---|---|
| Architecture (code-driven generator, validator, determinism, round-trip contract) | Good — keep, protect |
| `make_screens.py` runnable today | **No** — two path renames (§3.1) |
| Vocabulary vs WP-3 | Inverted in README + script comments |
| Gate-tick convention vs WP-E | Stale — SVGs draw retired behaviour |
| `result_*.svg` | Depicts a removed screen |
| RESULTS / RideDetail / CatalogDetail / GateAdjust / SPORTS / sport pills | No mockup exists |
| Empty-state screens (default seed mode) | No mockup exists |
| Palette drafts | Done, decision open (Nathan) |
| ChatGPT folder | Historical; tidy only |
| `edited/` stray file | Agent fixture; delete |
