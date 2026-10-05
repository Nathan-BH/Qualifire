# D8: Does 'Sector colours' change the live gate flash? Opus investigation, 2026-10-05

Investigator: Opus, fresh context. Read-only: no code edits, nothing planned. Traced independently of D2/D7.
Tree read: branch `virgin`, HEAD `38002ff` plus the uncommitted working tree (10 src files modified;
**liveView.tsx, chips.tsx, tierColour.ts, theme.ts, settings.tsx are NOT among them**, so HEAD and working tree agree on every file in the flash path).

## Answer

**There is no code path from `settings.sectorColours` to the gate flash, not in the current tree and not at any point in git history.**
The flash's appearance is a pure function of (tier, theme). The tier is a pure function of (way picked, today's sector time, stored ride history).
The toggle only swaps the array given to the live MAP's sector-spans layer.
D2/D7 are right on this point. What Nathan saw is real, but it is most likely **the tier changing between the gates/rides he compared**, not the toggle (see the ranked list below).
The flash changes shape a lot from one tier to the next, and in dark mode two of the tiers look identical, which makes this easy to misread.
Confidence: **high (~90%)** that the toggle has no effect in code. **Medium** on which non-code explanation applies, because we don't know exactly what Nathan saw differ.

## 1. The causal chain, link by link

### 1a. The flash's inputs (RecordScreen -> pane)
`app/src/ui/RecordScreen.tsx:1092-1093`
```ts
const tierOf = (sectorIndex: number, timeS: number | null): Tier =>
  liveTierFor(live.track, sectorIndex, timeS, session?.rideId);
```
`RecordScreen.tsx:1424-1432`. The only props are `vm` and `showLap`. Neither depends on `settings`:
```tsx
<LiveSectorPane
  vm={viewModelFromEngine(live, realTimebase(session.startedAtMs), null, tierOf, livePos)}
  showLap={showLap} />
```
(`livePos` comes from `settings.selfDots`, i.e. Race yourself, not Sector colours. It only adds the `· P3` text on the context row above the slot.)

### 1b. Tier computation
`app/src/ui/liveView.tsx:135-150` `bigFromSector`: `tier: tierOf(k, scoredS(sec))`, with 'est' for estimated/missed.
`liveView.tsx:183-186`: `flash = bigFromSector(lastDone, st.sectors[lastDone - 1], tierOf)`.
`app/src/ui/colourModel.ts:194-200`
```ts
export function liveTierFor(wayId, sectorIndex, timeS, excludeRideId?) {
  if (wayId === null || timeS === null) return 'neutral';
  const history = sectorIndex === 0 ? lapValues(wayId, excludeRideId) : sectorValues(wayId, sectorIndex, excludeRideId);
  return tierFor(timeS, history);
}
```
`colourModel.ts:172-178` `tierFor`: history n<1 -> 'neutral'; < best -> 'purple'; < mean -> 'green'; else 'yellow'.
History = `ghostsFor(way)` = shipped seed + `recordedResults()` (the phone's stored rides). No settings involved.

### 1c. Render
`liveView.tsx:295-304`: `flashOn && vm.flash ? <LiveBigChip tier=… /> : <LapClock/>`. `flashOn` is driven only by `vm.flashKey` (= `st.gateFires`) and `FLASH_HOLD_MS = 2500` (`liveView.tsx:116, 263-271`).
`app/src/ui/chips.tsx:37-55` `chipColors(tier, t)` reads only `tier` and theme `t`. `LiveBigChip` (`chips.tsx:59-97`) reads only its props and `useTheme()`.

### 1d. Every reader of the toggle (grep `sectorColours` across app/src)
| File:line | Reader | Feeds |
|---|---|---|
| settings.tsx:40, 65, 642 | type, default `false`, Switch | — |
| RecordScreen.tsx:1109-1118 | `settings.sectorColours ? liveSectorColours(…) : ALL_YELLOW` | `WayMapView sectorColours=` (1411) **only** |
| DemoScreen.tsx:581-583 | same pattern | `WayMapView` (666) only; flash vm is `demoLiveViewModel(...)` (574), no settings |
| ReplayScreen.tsx:143-144, 239 | same + `leadColour` | `WayMapView` only; vm `replayLiveViewModel(...)` (134-140), no settings |
| RideDetailScreen.tsx:508-509 | same | browse map only |
All other hits (`sectorTrailModel.ts`, `wayMapGeo.ts`, `wayMapView.tsx`, `rideDetailModel.ts`, `demoModel.ts`) are the map-span prop/model, not settings reads.
`liveSectorColours` (`sectorTrailModel.ts:79-97`) is pure: it reads `sectors` and never mutates them, so it cannot change engine state that the flash later reads.

### 1e. Indirect routes checked and ruled out
- **History check**: `git log -S sectorColours -- liveView.tsx chips.tsx colourModel.ts` returns nothing. No build ever coupled the toggle to the flash.
- **Settings load/merge**: `settings.tsx:94-103` does `{...DEFAULTS, ...saved}`, so a missing key resolves to `false`, never `undefined`. Even if it were `undefined`, only the map reads it.
- **Theme coupling**: the theme lives in a *different* file (`themeContext.tsx:16-18` `<document>/qualifire/settings.json`, `{themeMode}` only). App settings are in `<documentDirectory>settings.json` (`settings.tsx:82`). Toggling Sector colours re-renders the `SettingsProvider` value but cannot change `mode`/`t`.
- **Layout**: the map container (`RecordScreen.tsx:1404`, `flex:1, minHeight:220`) and the pane's `bigSlot` (`minHeight:190`, `liveView.tsx:328`) have no toggle-dependent sizing. `sectorColours` is always truthy (`ALL_YELLOW = []`, `sectorTrailModel.ts:42`), so WayMapView mounts the same layers in both states.
- **Mount/remount**: no `key=` on WayMapView or LiveSectorPane depends on the toggle, so the flash timer state is never reset by it.
- **The one real runtime difference**: ON gives the map a new array at every engine emit that changes `live.sectors` (i.e. at every gate), which makes MapLibre rebuild the `sector-spans` GeoJSON source right as the flash starts. OFF passes a constant `[]`. That is extra native work at the gate. In theory it could delay or stutter the first frames of the flash. It cannot change the flash's colour, box, text or duration.

## 2. What the flash shows (both toggle states identical)

Dark mode (`theme.ts`: night `accentText = colors.neutral = #F5C542 = YELLOW_TIER`):
| Situation at the gate | tier | Flash look | ON | OFF |
|---|---|---|---|---|
| no START pick / no reference (`track===null`) | neutral | yellow text only, no box | same | same |
| first ride of a way, or sector with 0 comparable history | neutral | yellow text only (**identical pixels to yellow in dark mode**) | same | same |
| faster than best of window | purple | **filled purple box**, near-black text `#120521` | same | same |
| < window mean | green | green 2px outline box, green text | same | same |
| >= mean | yellow | yellow text only, no box | same | same |
| estimated / missed sector | est | grey dashed outline, `~m:ss` or `– –` | same | same |
| interrupted sector | its tier | as above + ` ‖` after `S{k}` | same | same |
| final gate | — | LAP chip replaces the flash once `showLap` (~1.1 s) | same | same |
Only the MAP differs. ON paints purple/green/yellow spans for clean, earned sectors. OFF shows the plain yellow line.
(Daylight: neutral = `#B98A0A` dark-gold text vs yellow `#F5C542` text, so neutral and yellow can be told apart there.)

## 3. Intended contract (docs/tests)
- `settings.tsx:34-39`: "paint each sector of the route line in the tier it earned (live map, ride-detail trace, RIDES row) — off keeps the line all yellow". The settings hint is "Colour sectors on live map" (cycle20 brief 08 D10).
- cycle20 brief 10 (`10-second-ride-sector-colours.md:14`): "The STRIP chips are tiered whatever that setting says". The sector flash is listed as tiered by history, separately from the "secondary, only if that setting is ever turned on" map line.
- No test asserts any toggle-dependence of LiveBigChip/chipColors. No suite renders LiveBigChip.
So the toggle was **intended** to be map-only, and the code matches that intent.

## 4. Most plausible explanations for what Nathan saw (ranked)
1. **The tier changed, not the toggle (most likely).** The flash shape depends on the tier: purple = filled box, green = outline, yellow/neutral = bare text. Two gates, or the same gate on two rides, often land on different tiers. History also grows after every stored ride: ride 1 is all neutral (bare yellow text), ride 2 is purple/yellow only, green appears from ride 3. Nathan never enabled the toggle before (cycle20 brief 10). If he switched it ON around the same time as his rides on a young route started to earn verdicts, "ON" lines up with the first purple boxes and green outlines he ever saw.
2. **Neutral vs yellow look identical in dark mode.** "OFF" rides on a way with no comparable history (or no START pick) show only bare yellow text. "ON" rides on a way with history show boxes. Both have the same text colour, so the cause is invisible.
3. **Perception from the map above.** With ON, the same tier colour also appears on the route right above the flash, so the purple/green chip reads as part of a coloured scheme. With OFF, everything else is yellow. The chip is the same, the context is not.
4. **Stutter at the gate with ON** (see 1e, last bullet). The flash may appear a frame or so late or hitch while MapLibre rebuilds the span source. It looks the same but feels different.
5. **Comparing different surfaces.** DEMO/REPLAY flashes come from scripted or stored data. If one observation was on DEMO and one on a real ride, they differ for that reason, not because of the toggle.

## 5. A 2-minute on-device test that settles it
Use **DEMO > TENTH RIDE** (deterministic fixture: S1 purple, S2 green, S3 yellow, S4 green, lap green, `demo_suite.ts:61-66`). It uses the same `LiveSectorPane`/`LiveBigChip` and the same toggle on its map (DemoScreen.tsx:581).
1. Dark mode. SETTINGS > Sector colours **OFF**. DEMO > TENTH RIDE. Screenshot each flash at S1, S2, S3 (pausing with the play/pause button helps).
2. Sector colours **ON**. Same run, same screenshots.
3. Compare S1 vs S1 and S2 vs S2.
   - Identical chips, only the map differs: the toggle does not touch the flash, and the real-ride difference was the tier (hypothesis 1/2).
   - Chips differ: a real coupling exists that this read missed. Report what differs (box? colour? label? timing?).
For a real-ride check: ride the same picked way twice in a row, one ride OFF and one ON, and note the tier at each gate. Expect the flash style to follow the tier ladder, not the toggle.

## 6. Code-level diagnostic (described, not implemented)
One line in `LiveSectorPane`'s flash effect (`liveView.tsx:268`), e.g.
`console.log('[flash]', vm.flashKey, vm.flash?.lbl, vm.flash?.tier, vm.flash?.time)`. Plus logging `settings.sectorColours` once per render in RecordScreen near 1109. Read with `adb logcat | grep flash` during a ride. If the tier logged at a gate fully predicts the chip's look in both toggle states, the case is closed.

## Open questions for Nathan
- What exactly differed: box vs no box, colour, label, size, or timing/stutter?
- Same way, same gate, same ride count when compared? Real ride or DEMO/REPLAY?
- Was a START pick set (no pick means all neutral) on both rides?
