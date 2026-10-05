# D2: Live Timer Gate Flash Behaviour Digest

**Haiku Digest, 2026-10-04, unverified by Inspect; for Fable to plan from**

## Component Overview

### (1) Components Rendering Timer & Flash

**Timer display (always visible, never coloured):**
- `LapClock` component in `app/src/ui/liveView.tsx` (lines 222-242)
  - Renders `Text` with fixed `fontSize: 92`, `fontWeight: '800'`, black ink (`color: t.text`), redraws at 10 Hz
  - Formats as m:ss.d via `fmtClock()` function

**Flash overlay (masking timer during 2.5 s at gate):**
- `LiveSectorPane` component in `app/src/ui/liveView.tsx` (lines 251-290)
  - Conditionally renders `LiveBigChip` when `flashOn === true` (line 283-289)
  - `flashOn` state starts `true` at gate fire, times out via `setFlashOn(false)` after `FLASH_HOLD_MS`

**Sector chip styling (flash appearance):**
- `LiveBigChip` component in `app/src/ui/chips.tsx` (lines 61-84)
  - Receives `tier` prop (enum: 'none'|'neutral'|'yellow'|'green'|'purple'|'est')
  - Calls `chipColors(tier, t)` to map tier → palette
  - Applies palette's `bg`, `border`, `text`, `dashed` to the `View` wrapper and inner `Text` elements

---

## (2) Behaviour Table: Current State by Toggle & Colour

**Setting: `settings.sectorColours` (boolean)**
- Default: `false` (line 65 in `app/src/ui/settings.tsx`)
- Label: "Sector colours" (ui-strings.allow.json)
- Effect: **ONLY** controls map trail visualization; **does NOT** affect LiveBigChip tier/colours (tierOf() is computed independently)

**The three tier colours/semantics (from `app/src/ui/tierColour.ts`):**
- **`purple` (#9000C8)** = fastest time in the ranking pool (or all-time best)
- **`green` (#00D000)** = above recent average
- **`yellow` (#F5C542)** = ordinary (below average, but not a failure state per D-013)

| sectorColours | Tier | bg colour | border colour | border width | text colour | text | sector label shown? | duration |
|---|---|---|---|---|---|---|---|---|
| ON/OFF | purple | #9000C8 (FILLED) | #9000C8 | 2px | #120521 (PURPLE_INK) | S{i} + m:ss.d | **Yes, "S{i}"** | 2500 ms |
| ON/OFF | green | transparent | #00D000 (outline) | 2px | #00D000 | S{i} + m:ss.d | **Yes, "S{i}"** | 2500 ms |
| ON/OFF | yellow | transparent | transparent (no border) | 2px | #F5C542 (YELLOW_TIER) | S{i} + m:ss.d | **Yes, "S{i}"** | 2500 ms |
| ON/OFF | neutral | transparent | transparent | 2px | t.accentText | S{i} + m:ss.d | **Yes, "S{i}"** | 2500 ms |

**Why purple differs:** In `chipColors()` (chips.tsx:38), purple ALONE uses a **filled background** (`bg: colors.purple`), while green/yellow have `bg: 'transparent'`. All have `borderWidth: 2` in `liveBig` style (chips.tsx line 125).

---

## (3) State & Event Trigger / Reset

**Trigger event:** Gate crossing (engine fires `live.gateFires` counter, RecordScreen feeds to viewModelFromEngine)

**Engine signal:** 
- `live.sectors` array updated with new `LiveSector` (kind='done')
- `live.lastDone` incremented
- `live.gateFires` counter incremented (used as `flashKey` in LiveViewModel)

**Render path:**
1. RecordScreen receives updated engine state
2. Calls `viewModelFromEngine(st, clock, posChip, tierOf, livePos)` (liveView.tsx line 158)
3. Returns `LiveViewModel` with `flash: BigChipModel` (computed from `lastDone` sector) and `flashKey: st.gateFires`
4. LiveSectorPane renders with `vm.flashKey` dependency
5. `useEffect` on `vm.flashKey` (line 261-270):
   - `setFlashOn(true)` immediately
   - Schedules `setTimeout(() => setFlashOn(false), FLASH_HOLD_MS)` after 2500 ms
6. While `flashOn === true`, LiveBigChip masks the clock; when false, clock reappears

**Reset:** 
- Timer naturally expires after `FLASH_HOLD_MS = 2500` ms (line 116, liveView.tsx)
- OR terminal event: lap finish (showLap=true sets lapTakesSlot, cutting flash short per §2a.1 at line 1409 RecordScreen)

---

## (4) Colour Behaviour Difference (Purple vs Others)

**Code location:** `chipColors()` function in `app/src/ui/chips.tsx:37-47`

```typescript
case 'purple':
  return { bg: colors.purple, border: colors.purple, text: PURPLE_INK };
case 'green':
  return { bg: 'transparent', border: colors.green, text: colors.green };
case 'yellow':
  return { bg: 'transparent', border: 'transparent', text: YELLOW_TIER };
```

**Visual result:**
- Purple: full square fill (`bg` set) + border → massive coloured box
- Green: only border drawn (transparent fill) → thin outline square, green text
- Yellow: no border, no fill, only yellow text → appears as just the digits in yellow

---

## (5) Style Constants

**Dimensions & animation:**
- Border width: `borderWidth: 2` (liveBig style, chips.tsx line 125)
- Flash hold duration: `FLASH_HOLD_MS = 2500` (liveView.tsx line 116)
- Flash fade (GPS messages, not sector flash): `GPS_FLASH_FADE_MS` (not used for gate flash — gate flash is binary on/off, no fade)
- Min height of slot: `minHeight: 190` (liveBig style, chips.tsx line 126)
- Border radius: `borderRadius: 18` (liveBig style, chips.tsx line 123)

**Colours:**
- Purple fill: `colors.purple = '#9000C8'` (theme.ts line 16)
- Purple text: `PURPLE_INK = '#120521'` (chips.tsx line 30)
- Green: `colors.green = '#00D000'` (theme.ts line 18)
- Yellow/neutral: `colors.neutral = '#F5C542'` (theme.ts line 19, re-exported as YELLOW_TIER in tierColour.ts)

---

## (6) Tests & UI Strings

**Tests pinning this behaviour:**
- `demo_suite.ts` lines 61-66 (demoModel::demoTier function tests sector tier assignment)
- `demo_suite.ts` lines 212-300 (demoModel::demoSectorColours tests map trail colouring; does NOT test LiveBigChip colours)
- `recordflow_suite.ts` line 287 (keeps GPS/permission flash constants in API surface; sector flash not directly tested)
- No direct LiveBigChip render tests in run.ts; flash rendering tested via integration (demo mode, PreviewScreen)

**UI strings entries involved:**
- `ui-strings.allow.json` entry: "Sector colours" label (from settings.tsx line 642)
- No "S{i}" sector label strings in allow list (hardcoded in liveView.tsx line 145 `lbl = \`S${k}\``)

---

## (7) Exact Lines to Change for Desired Behaviour

**Nathan's desired outcome:** "only the timer digits briefly show the sector time in the right colour, with NO box/square/outline around it and NO extra sector label, then return to default colour"

**Changes needed (no code, just the lines to modify):**

1. **Stop rendering LiveBigChip entirely during flash** 
   - `liveView.tsx` line 283-289: Remove or comment the conditional block that renders `<LiveBigChip ... />`
   - This removes the box/border/label appearance entirely

2. **Instead, apply colour overlay to LapClock digits during flash**
   - `liveView.tsx` line 222-242 (LapClock component): Add conditional `color` prop based on a new flash-colour state
   - Need to pass flash tier from LiveSectorPane → LapClock as new prop

3. **Remove sector label from flash display**
   - Currently baked into BigChipModel.lbl = `\`S${k}\`` (liveView.tsx line 145)
   - This would only matter if keeping LiveBigChip; for text-only flash, ignore

4. **Remove box styling**
   - chips.tsx `liveBig` style (lines 123-129): Only relevant if keeping LiveBigChip; for digits-only, N/A

5. **Flash fade timing**
   - liveView.tsx line 269: Keep `FLASH_HOLD_MS = 2500` as-is, or shorten if wanted (e.g., 800 ms for quick flash)
   - Add fade-out animation (optional): migrate from binary on/off to Animated.timing like GPS flash does (RecordScreen lines 577-586)

**Summary:** Remove LiveBigChip rendering; apply sector time + colour directly to LapClock text during `flashOn` window; remove label text; reset to black after timeout.

