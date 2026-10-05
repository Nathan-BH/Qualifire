
## Follow-up (2026-10-05, after Nathan's DEMO test)

**Correction:** §5 was wrong. DEMO never flashes. The S1 purple / S2 green / S3 yellow fixture drives only the **strip bars** (and the map spans when the setting is ON), never a flash. I inferred the flash from the fixture without reading `demoLiveViewModel`. Withdrawn.

### F1. Why DEMO shows no flash
- DemoScreen does mount the shared pane: `DemoScreen.tsx:673` `<LiveSectorPane vm={vm} showLap clockSize={56} />` (TENTH/SECOND; FIRST shows a text line instead).
- Its view model is hand-built with **no flash at all**. `app/src/ui/demoModel.ts:354-376`:
  ```ts
  clock: { anchorRealMs: nowMs, anchorClockMs: clockS * 1000, rate: 1, running: false },
  ...
  flash: null,
  flashKey: 0,
  ```
  `LiveSectorPane`'s effect (`liveView.tsx:264-266`) sees `flashKey <= 0` and sets `flashOn=false`. With `vm.flash === null` the `LiveBigChip` branch (`liveView.tsx:295`) can never render. No gate counter exists in the demo.
- What drives the timer: DemoScreen's own sim clock (`demoSimSAt`, demoModel.ts:392) is re-rendered by its tick. Each render passes a frozen timebase (`running:false`, anchored at the current `clockS`). `LapClock` therefore shows `fmtClock(anchorClockMs)` in `t.text` (white in dark mode) and advances only because the parent re-renders.
- `flash: null, flashKey: 0` dates from commit `8df1119` (virgin-cycle11 brief A, DEMO overhaul; also quoted in `cycles/virgin-cycle11/DIGEST-demo-tab-overhaul.md:38-39`). No ruling, test or comment says the demo should skip the flash. The doc comment (demoModel.ts:346-352) even claims "what the demo shows IS what the rider sees". **Verdict: a fidelity gap / omission in the demo, not a deliberate design.** (A second divergence: the demo's LAP chip is forced `'neutral'` (demoModel.ts:365, cycle11 R5), but the real screen has shown the real lap tier since cycle20 brief 07.)
- Not caused by the setting: none of the demo vm inputs read `settings`.

### F2. A real A/B Nathan can run
- **REPLAY cannot be used either.** `app/src/ui/replayModel.ts:147-175` `replayLiveViewModel` also returns `flash: null, flashKey: 0` (lap forced neutral too), so a replay never flashes. The legacy `ui/preview/PreviewScreen.tsx:274` is not mounted anywhere in `App.tsx`.
- **So the real race screen (RecordScreen) is the ONLY surface that ever flashes.** The setting cannot be flipped mid-ride either: while recording, RECORD is fullscreen and the tab bar is hidden (`recordFlow.ts:54-56` `isFullscreen` covers armed/running/ending; App.tsx:199-205).
- **Minimal real-ride procedure (two short rides, same way):**
  1. Use a way that already has **≥ 2 stored rides** (needed for green to be reachable; with only 1 prior ride a sector can be purple or yellow, never green). Start each ride with that way **picked at START**: no pick means `track===null` and everything is neutral.
  2. Ride A, setting **OFF**, dark mode. Turn on Android's built-in screen recorder (quick settings) before START.
  3. Ride B, setting **ON**, same way, same recorder.
  4. In each recording, at every gate compare the 2.5 s flash with **that sector's strip bar**, which stays on screen afterwards and is tiered by the identical `tierOf` (`liveView.tsx:167-171`). Expected in both rides: purple bar = filled purple box; green bar = green outline; yellow bar = bare yellow text; grey bar (no verdict) = bare yellow text too in dark mode (neutral = `#F5C542`, identical to yellow); estimated = grey dashed.
  5. If every flash matches its own bar in both rides, the setting does not affect the flash and the earlier difference was the tier. If a flash contradicts its own bar only when ON (e.g. a box for a yellow bar), that is a real coupling and the recording shows it.
- A quicker partial check is possible: compare the flash to the strip bar on any ONE ride with ON. A mismatch there would already prove the setting interferes.

### F3. Fresh re-check: can the map re-render interfere with the flash?
- **Props/layout conditioned on the setting in RecordScreen:** only `sectorColours` (1109-1118) → `WayMapView sectorColours=` (1411). `LiveSectorPane` gets `vm` and `showLap` only (1424-1433). `showLap` and `flashMsg` (the quiet slot, 1437-1439 `flashMsg ?? (gpsLive ? 'GPS live' : '')`) never read the setting. Map container style `{ flex: 1, minHeight: 220 }` (1404) and `raceColumn` (1701-1704) are fixed. Nothing else in the running branch reads `settings.sectorColours` directly or indirectly.
- **Correction to §1e's last bullet:** the map is fed fresh GeoJSON every render in **both** states. `wayMapView.tsx:603-605` rebuilds `sectorSpansFC` unmemoized on every render (its own comment, 590-594, says these builders are unmemoized by design), and RecordScreen re-renders on its own timers anyway. With OFF the spans are all transparent (`ALL_YELLOW = []`). With ON, gates that earned a tier carry a colour. So the only ON-vs-OFF difference reaching MapLibre is the *content* of one width-4 line layer, `sector-spans-core` (774-781), not extra renders. This is negligible as a flash-timing effect.
- **Z-order/overlap:** the map and the pane are separate siblings in a column (`raceColumn` gap 8). The flash sits in `bigSlot` (minHeight 190) below the map's own box and is not drawn over the map. No absolute positioning links them. The map's `onLayout` (wayMapView.tsx:1016) only reads the map's own size.
- **Timer masking:** the flash timer is keyed only on `vm.flashKey = live.gateFires` (`liveView.tsx:211, 263-271`). A re-render with the same `gateFires` does not restart or cancel it. Nothing toggle-dependent remounts `LiveSectorPane` (no `key`).
- **Conclusion unchanged and strengthened:** nothing in RecordScreen's layout, props, timers or the quiet slot depends on the setting. The flash on the real screen is set entirely by the tier (and theme). Still open: what exactly Nathan saw differ, and on which surface. Note that DEMO and REPLAY show a *never-flashing* white timer, while a real ride flashes. If one of his two observations came from DEMO/REPLAY and the other from a real ride, that alone explains a "difference".
