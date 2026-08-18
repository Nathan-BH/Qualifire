# Cycle 017 — 2026-08-18

Trigger: Nathan — pre-commute Fast Refresh polish, three RECORD/DEMO map issues found on-device after build 4. Not tied to a BACKLOG id. D-039 tiers run in full (Sonnet coordinator, Fable planner/inspector).

## What shipped

**RecordScreen.tsx** — root `<View style={styles.container}>` (flex:1, centred, no scroll) replaced with `<ScrollView>` + `contentContainerStyle` (flexGrow:1, centred, extra bottom padding). Fixes the yellow START button overlapping the tab-bar footer when the prestart map is shown. `styles.container` removed (zero remaining refs verified); `modePill` (absolute, top-right) now scrolls with content — acceptable, no other pinned elements on the screen.

**routeMapView.tsx** — basemap style is now theme-driven instead of hardcoded dark. `MAP_STYLE` split into `MAP_STYLE_NIGHT` (unchanged dark URL) and `MAP_STYLE_DAY` (OpenFreeMap `positron`), picked in `MapLibreRouteMap` via `useTheme().mode`; style-fetch effect keyed on `[styleUrl]` so it refetches on a theme flip. `patchMapStyle` (routeMapStyle.ts) is layer-id-agnostic, needed no changes.

**DemoScreen.tsx** — map now passed `variant="browse"` (was `liveState="moving"`, inheriting the locked live default) so it's pannable/pinch-zoomable with the zoom bar, matching RECORD's browse surfaces. Redraw tick dropped 100ms → 33ms (10fps → ~30fps) and the simulated clock changed from a per-tick accumulator to a wall-clock-anchored calc (`(Date.now() - startedAtMs)/1000 * RATE`), so total ride duration stays `lap / RATE` real seconds regardless of tick drift.

## Inspector findings

Fresh Fable inspection caught one **blocking defect** before it reached Nathan: the executor's brief-following edit declared `const { t, mode } = useTheme()` inside `MapLibreRouteMap`, which already had `const [mode, setMode] = useState(...)` for camera fit/follow — a duplicate `const mode` in the same scope, hard syntax/type error, bundle would not build. Fixed directly (coordinator chore, <10 lines): theme value renamed to `themeMode`. Verified no other reference to the old name (`grep mode` — only the renamed destructure, the camera-mode state, and its one read at the camera-props line remain).

Non-blocking, flagged not fixed:
1. Palette-firewall desaturation (routeMapStyle.ts) was tuned against the dark style; positron's pale green/purple fills should pass through unchanged but weren't verified on-device.
2. DEMO browse mode starts the camera in `fit` (whole route) rather than following the dot — a consequence of unlocking gestures, not a bug, but a behaviour change worth Nathan's eye.

## Process notes

Full D-039 tiers: Haiku triage (~58k) confirmed all 3 issues + located code; Fable plan (~80k) wrote the brief, no escalation; Sonnet execute (~58k) applied all edits, self-flagged one stale comment (fixed as coordinator chore); fresh Fable inspect (~53k) found the `mode` collision. No tests exist for these three UI files; `tsc`/`npm` unavailable in the cloud sandbox (known limitation) — inspection relied on manual re-read, not a compiler run. **Nathan: run `npx tsc --noEmit` on your PC once before trusting the build fully** — this cycle's only real bug was exactly the class `tsc` would have caught instantly.

No BACKLOG/STATE.md change — ad-hoc polish, no new decision, no backlog id opened or closed.
