# D7: Settings.sectorColours Toggle Effect on Flash + Labels Investigation

**Haiku Digest, 2026-10-05** | Verifies D2 claim that sectorColours does NOT affect flash display

---

## A. Every sectorColours Read & Data Flow

### sectorColours Setting Definition
- **File**: `app/src/ui/settings.tsx:40, 65`
- **Default**: `false`
- **Storage**: persisted in settings.json
- **Label**: "Sector colours" (hardcoded in settings.tsx:642)
- **Scope**: affects map trail only, NOT live flash tier/colors

### Where sectorColours Is Read (Complete Audit)

| File | Line | Context | Effect |
|------|------|---------|--------|
| `app/src/ui/settings.tsx` | 642 | Toggle UI (Switch component) | Read for toggle state |
| `app/src/ui/RecordScreen.tsx` | 1110-1117 | `useMemo` dependency | Passed to `liveSectorColours()` for map trail feature |
| `app/src/ui/DemoScreen.tsx` | 579-581 | Demo map rendering | Passed to RouteMapView sectorColours prop |
| `app/src/ui/ReplayScreen.tsx` | 143-144 | Replay map rendering | Passed to `replaySectorColours()` for map trail |
| `app/src/ui/RideDetailScreen.tsx` | 507-509 | Historical ride map | Passed to RouteMapView sectorColours prop |

**None of these affect `tierOf` or `LiveBigChip` rendering.**

### The tierOf → Flash Tier Path

**RecordScreen.tsx:1092-1093** — tierOf definition:
```typescript
const tierOf = (sectorIndex: number, timeS: number | null): Tier =>
  liveTierFor(live.track, sectorIndex, timeS, session?.rideId);
```

**No sectorColours parameter is passed.** tierOf depends ONLY on:
- `live.track` (route ID)
- `sectorIndex` (sector 0-N)
- `timeS` (scored time from engine)
- `session?.rideId` (to exclude current ride from history)

### liveTierFor Function (colourModel.ts:194-200)
```typescript
export function liveTierFor(
  wayId: string | null, sectorIndex: number, timeS: number | null, excludeRideId?: string,
): UiTier {
  if (wayId === null || timeS === null) return 'neutral';
  const history = sectorIndex === 0 ? lapValues(wayId, excludeRideId) : sectorValues(wayId, sectorIndex, excludeRideId);
  return tierFor(timeS, history);
}
```

**Does not call any function that reads sectorColours.** Tier is determined by comparing `timeS` against `history` (all stored times for that sector/lap on the route).

### chipColors → Flash Visual Appearance (chips.tsx:37-47)

```typescript
export function chipColors(tier: Tier, t: PaddockTheme): ChipPalette {
  switch (tier) {
    case 'purple': return { bg: colors.purple, border: colors.purple, text: PURPLE_INK };
    case 'green': return { bg: 'transparent', border: colors.green, text: colors.green };
    case 'yellow': return { bg: 'transparent', border: 'transparent', text: YELLOW_TIER };
    case 'neutral': return { bg: 'transparent', border: 'transparent', text: t.accentText };
    case 'est': return { bg: 'transparent', border: colors.grey, text: colors.grey, dashed: true };
    default: return { bg: 'transparent', border: 'transparent', text: colors.grey };
  }
}
```

**Does NOT read sectorColours or any settings.** Color palette depends ONLY on `tier` (computed via liveTierFor) and theme `t`.

**CRITICAL FINDING**: The digest's claim is CODE-CORRECT. There is no code path where sectorColours affects `tierOf`, tier assignment, or flash colors. **Contradiction with Nathan's device observation remains unresolved.**

---

## B. Current Flash Rendering (Precise)

### Display Conditions & Lifetime
- **Trigger**: Gate crossing (engine increments `live.gateFires`, liveView.tsx:261)
- **Duration**: 2500 ms (`FLASH_HOLD_MS`, liveView.tsx:116)
- **Masking**: Replaces LapClock during flash window; clock reappears after timeout
- **Terminal condition**: Lap result (`vm.lap !== null && showLap = true` at liveView.tsx:284) cuts flash short

### LiveBigChip Rendering (chips.tsx:55-84, called from liveView.tsx:296-304)

**What renders per tier:**

| Tier | Box Style | Text Colour | Border | Background | Sector Label | Size |
|------|-----------|-------------|--------|------------|--------------|------|
| **purple** | filled square | #120521 (PURPLE_INK) | #9000C8, 2px solid | #9000C8 (FILLED) | S{i} | 190min height |
| **green** | outline square | #00D000 | #00D000, 2px solid | transparent | S{i} | 190min height |
| **yellow** | text only | #F5C542 (YELLOW_TIER) | none | transparent | S{i} | 190min height |
| **neutral** | text only | t.accentText (theme) | none | transparent | S{i} | 190min height |
| **est** | dashed outline | #808080 (grey) | #808080, 2px dashed | transparent | S{i} | 190min height |

**Components in LiveBigChip**:
- Row 1: `<Text style={s.slbl}>` → sector label S{i} + optional glyph '‖'
- Row 2: `<Text style={s.sdelta}>` → delta (blank in live context per liveView.tsx:151)
- Row 3: `<Text style={s.stime}>` → sector time m:ss.d (e.g., "3:29.3") + optional PB marker '●'

**Clock hidden during flash**: LapClock (liveView.tsx:307-309) only renders when `!flashOn`, replaced by conditional in bigSlot.

### Styling Constants
- Border radius: 18px (chips.tsx:123)
- Border width: 2px (chips.tsx:125)
- Min height: 190 (chips.tsx:126)
- Text font (time): 92px, weight 800, black (liveView.tsx:223-227 for clock, applied to flash via chipColors.text)
- Glyph font weight: 400 (chips.tsx:82)

---

## C. Pause Glyph '‖' (U+2016) — Complete Readers

### Generation Sites

| File | Line | Code | Context |
|------|------|------|---------|
| `app/src/ui/liveView.tsx` | 146 | `glyph: sec.interrupted ? '‖' : ''` | Live flash (bigFromSector) |
| `app/src/ui/liveView.tsx` | 173 | `label: sec.interrupted ? `${label} ‖` : label` | Strip slots (live sector row) |
| `app/src/ui/preview/PreviewScreen.tsx` | 204 | `glyph: st.glyph` | Preview/demo flash (passes through) |
| `app/src/ui/preview/data.ts` | 55, 119 | Hardcoded `glyph: '‖'` | Demo fixture data |

### Rendering Sites

| File | Line | Code | Context |
|------|------|------|---------|
| `app/src/ui/chips.tsx` | 82 | `{props.glyph ? <Text …> {props.glyph}</Text> : null}` | LiveBigChip render (row 1 label) |
| `app/src/ui/preview/PreviewScreen.tsx` | 496 | `<Text style={s.rcGlyph}>{props.glyph}</Text>` | Preview mode equivalent |

### Interrupted Flag Readers (Live Sectors)

| File | Context | Reads `interrupted` Flag? | Action |
|------|---------|---------------------------|--------|
| `app/src/ui/liveView.tsx:146, 173` | Flash & strip slot labels | YES | Appends glyph |
| `app/src/live/engine.ts:554` | Engine sector construction | Sets from store row.flag === 'interrupted' | Input source |
| `app/src/store/derive.ts:85-96` | Lap quality calc | YES | Marks lap interrupted if ANY sector is |
| `app/src/store/results.ts:116, 125` | RideResult construction | YES | Sets lap.interrupted flag |
| `app/src/ui/rideDetailModel.ts` | Historical ride detail screen | NO direct read of interrupted | (not checked on review) |
| `app/src/ui/ReplayScreen.tsx` | Replay rendering | NO direct check found | (map/replay may display differently) |
| `app/src/live/towerSource.ts:9` | Comment mentions interrupted | Context only (no code impact) | |

**No other UI components conditionally hide/show the glyph based on interrupted flag — only display it in flash and strip.**

---

## D. 'GPS live' Label — Exact Sources

### String & Rendering
- **File**: `app/src/ui/RecordScreen.tsx`
- **Line**: 1438
- **String**: `'GPS live'` (hardcoded, NOT in ui-strings.allow.json)
- **Code**: `<Animated.Text ...>{flashMsg ?? (gpsLive ? 'GPS live' : '')}</Animated.Text>`

### Display Condition (RecordScreen.tsx:1073)
```typescript
const gpsLive = status.lastFixMs != null && lastFixAgeS != null && lastFixAgeS <= 5;
```

**Condition breakdown**:
- `status.lastFixMs != null` — location service has provided at least one fix
- `lastFixAgeS <= 5` — last fix is ≤ 5 seconds old (rule from virgin-cycle20 brief 08)

### Styling & Animation
- **Style**: `styles.trackLine` (defined RecordScreen.tsx, applied with optional opacity animation)
- **Animation**: Only animated if `flashMsg !== null` (opacity animation for permission/error messages; 'GPS live' is static)
- **Position**: Below LiveSectorPane, above storage-error warnings
- **Related labels shown next to it**: None explicitly tied to 'GPS live' in the code — storage errors appear below as separate `<Text>`

### Tests Referencing 'GPS live'
- **File**: `app/tests/recordflow_suite.ts`
- **Hits**: 0 direct grep for 'GPS live' string
- **Reference**: Line 287 mentions `gpsFlash` and `flashGpsOff` constants (related GPS permission flash, not status text)
- **Implication**: No pinned test for the 'GPS live' label itself; covered by integration tests only

---

## E. Tests Pinning Flash Styling & Glyphs

### Tier Colour Tests (demo_suite.ts:61-66)
- **Test name**: "demoModel: demoTier pins the fixture — S1 purple, S2 green, S3 yellow, S4 green, lap green"
- **File**: `app/tests/demo_suite.ts`
- **Lines**: 61-66
- **Assertions**:
  ```
  demoTier(1, 185) === 'purple'
  demoTier(2, 207) === 'green'
  demoTier(3, 237) === 'yellow'
  demoTier(4, 207) === 'green'
  demoTier(0, 836) === 'green' [lap]
  ```
- **Coverage**: Tier assignment, NOT chipColors or flash rendering

### Estimated Tier Test (demo_suite.ts:69-76)
- **Test name**: "demoModel: demoTier(i, null) is always est, regardless of sector"
- **Assertion**: When `timeS === null`, tier is 'est' (no history yet)

### Sector Colours Map Trail Tests (demo_suite.ts:79-91)
- **Test names**: 
  - "demoModel: demoSectorColours before any gate is all null"
  - "demoModel: demoSectorColours at gatesDone=2 paints indices 1-2 only"
- **Coverage**: Map trail colours ONLY, NOT flash display

### Live Colour Model Tests (live_colour_suite.ts)
- **Test**: "virgin-cycle20 07: liveTierFor — the lap chip gets its real tier at the line"
  - **Line**: Reference to lap chip colour, not flash glyph
- **Test**: "virgin-cycle20 10: founded route... strip chips earn purple"
  - **Line**: Strip chip tiers, not glyph rendering

**No direct tests pin LiveBigChip box styles, border appearance, or glyph rendering as code assertions.**
**Flash appearance is covered only by integration tests (demo mode, PreviewScreen visual inspection).**

---

## Contradictions & Open Questions

### Primary Contradiction
**D2 Claim**: "sectorColours... does NOT affect LiveBigChip tier/colours (tierOf() is computed independently)"  
**Nathan's Device Observation**: Flash appearance changes visually when sectorColours toggle is ON vs OFF

**Investigation Result**: 
- Code audit confirms D2: no sectorColours parameter flows to `tierOf`, `chipColors`, or flash tier assignment
- No conditional rendering based on `settings.sectorColours` in LiveSectorPane or LiveBigChip
- tierOf is computed from `liveTierFor(track, sectorIndex, timeS)` — no settings dependency

**Possible Explanations** (unconfirmed):
1. Nathan is observing a change in the map or surrounding UI (sectorColours affects map trail, which may alter perception of flash timing/clarity)
2. An indirect effect: sectorColours toggles some other visual state that affects how the flash appears (e.g., map zoom, clipping, redraw order)
3. A code path exists outside the primary render tree (e.g., an effect hook, a hidden state variable, or a timing issue)
4. Device/app state: the toggle was pressed mid-session and something re-rendered (e.g., theme switch, re-mount of components)

### Open Questions
1. **Does liveTierFor depend on any other setting?** (Answer: No — only depends on track, sectorIndex, timeS, and stored history)
2. **Is there a separate colour-blind mode or tier remapping?** (Answer: Not found in settings.tsx or colourModel.ts)
3. **Does the theme/colours object vary based on sectorColours?** (Answer: No — theme is independent; colors are constants)
4. **Are there any commented-out or legacy code paths that affect the flash?** (Not examined; search would be required)
5. **Did Nathan observe on a specific route, tier, or phase (setup/recording/stopped)?** (Not specified; may be context-dependent)

---

## Summary Table: Flash Appearance by Tier (Nathan's Real Device)

Per D2, this table should be **independent of sectorColours toggle**, but Nathan's observation suggests otherwise.

| sectorColours | Tier | Flash Box | Text Colour | Glyph | Duration | **Issue** |
|---|---|---|---|---|---|---|
| ON/OFF | purple | Filled #9000C8 | #120521 | S{i} (optional ‖) | 2500ms | Should NOT differ; Nathan sees difference |
| ON/OFF | green | Outline #00D000 | #00D000 | S{i} (optional ‖) | 2500ms | Should NOT differ; Nathan sees difference |
| ON/OFF | yellow | Text only | #F5C542 | S{i} (optional ‖) | 2500ms | Should NOT differ; Nathan sees difference |

---

## Recommendation

**To resolve the contradiction**: 
1. Inspect the app on a real device with settings.sectorColours ON, then OFF, while the flash triggers (gate crossing)
2. Check if the change is in the flash box itself (tierOf output) or in the surrounding map/UI
3. If the flash tier changes, search for any state variable or effect hook that reads sectorColours and modifies tierOf
4. If the surrounding UI changes, the effect may be perceptual (map trail visibility affecting flash contrast)

---

**Generated by Haiku Digest, 2026-10-05 | Awaiting Fable verification and Nathan's device feedback**
