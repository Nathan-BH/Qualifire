# Qualifire reconstructed canonical SVGs

These SVGs are a fresh canonical pass based on the current React Native source on `main` as inspected 2026-08-29.

## Files

- record_setup_day/night
- record_armed_day/night
- record_running_day/night
- record_finished_day/night
- rides_day/night
- routes_day/night
- result_day/night
- settings_day/night
- demo_day/night

## Source-derived rules applied

- 408×900 device frame.
- Android status region represented at 36 px for the supplied Honor Magic7 Lite layout reference; the running app itself uses `RNStatusBar.currentHeight`.
- Fullscreen recording hides the six-tab bar; other screens show the six-tab horizontal scroller.
- Tab width is 92 px minimum, matching `App.tsx`.
- Paddock colors, race colors, typography weights, radii and major dimensions follow `theme.ts` and screen style blocks.
- Record setup uses the 122 px measured mark, 200 px pre-start map and 150 px RECORD button.
- Armed/running use the full-height race column; armed has START + amber cancel; running has map → live sector pane → rotating status → PAUSE.
- Rides uses the current row/card redesign; Routes uses places + ways + 260 px route preview; Result uses last ride + Personal Bests; Settings uses the current segmented controls and 44×25 switches; Demo uses the current 25× Morning replay composition.

## Deliberate placeholders

The live MapLibre/tile renderer is represented by a clean vector route-map stand-in. This preserves the geometry of the UI and gate/rider affordances without embedding dynamic map tiles. Example ride times/ranks in Rides and Result are design fixture data, not claims about current stored history.

The Android status bar clock/icons and 24 px gesture region are a device-frame visualization. The app code computes the actual bottom safe-area inset dynamically and floors it at 12 dp.
