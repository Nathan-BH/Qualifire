# D12: RECORD Tab Map Cold-Start Rendering Issue

## Problem Summary

After publishing virgin-cycle22 as an OTA update, the RECORD tab's idle/pre-start map exhibits a layer z-order regression that only occurs on cold start (after app clear/force-close + first launch):

- **Symptom (a)**: White GATE markers render BELOW the yellow route line (should be above)
- **Symptom (b)**: On first launch after update, NO yellow route line visible; appears after tab-switch
- **Symptom (c)**: Pressing RECORD button (bigger map remount) or switching tabs fixes it
- **Symptom (d)**: ROUTES, RESULTS, ACTIVITIES maps always correct (no regression)
- **Scope**: Only RECORD idle/pre-start map on first mount after app launch; remount fixes it

This digest identifies the style/layer loading sequence change in cycle-22 that causes the regression.

---

## 1. MapLibre Layer Structure: HEAD vs HEAD~1

### Layer JSX Block (app/src/ui/wayMapView.tsx)

Both versions have **identical layer JSX structure and order**. Layers mount in this JSX order:

| Layer ID | Type | Mount Order |
|----------|------|-------------|
| ride-trace-core | line | 1 (from ride-trace source) |
| route-casing | line | 2 (from route source) |
| route-core | line | 3 (route yellow line) |
| trail-casing | line | 4 (from trail source) |
| trail-core | line | 5 |
| sector-spans-core | line | 6 |
| place-disc-fill | fill | 7 |
| place-disc-line | line | 8 |
| place-centre | circle | 9 |
| gate-ticks-casing | line | 10 (from gate-ticks source) |
| gate-ticks | line | 11 (white gates) |
| gate-selected-ring | circle | 12 |
| self-dot | circle | 13 |
| rider-dot | circle | 14 (last mounted = top) |

**Key comment at wayMapView.tsx:743-744 (HEAD)**: "mount-order z-stacking, not JSX order" — MapLibre paints sources in the order they mount, NOT the order they appear in the style's layers array.

**No layer JSX changes between HEAD~1 and HEAD**.

---

## 2. Style Loading: HEAD vs HEAD~1

### HEAD~1: Plain Fallback (Before Cycle-22)

**app/src/ui/wayMapView.tsx:469-475 (HEAD~1)**:
```javascript
// Runtime style patch: fetch the online style once, memoize BOTH a labels-on 
// and a labels-off copy. A fetch/parse failure falls back to the plain styleUrl 
// (day/night pick) — exactly as before B-51; that is not a map failure.
const [patchedStyles, setPatchedStyles] = useState(null);
useEffect(() => {
  (async () => {
    try {
      const res = await fetch(styleUrl);
      const json = await res.json();
      if (cancelled) return;
      setPatchedStyles({
        labelsOn: patchMapStyle(json, { hideLabels: false }),
        labelsOff: patchMapStyle(json, { hideLabels: true }),
      });
    } catch {
      // acceptable rung — plain online style, unpatched
    }
  })();
  return () => { cancelled = true; };
}, [styleUrl]);

const mapStyle = patchedStyles
  ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
  : styleUrl;  // fallback: plain URL
```

**Map component (HEAD~1):**
```jsx
<M.Map key={styleUrl} mapStyle={mapStyle} onDidFailLoadingMap={onMapFailed} ... >
```

- Fetch fails → mapStyle stays as `styleUrl` (plain URL string)
- MapLibre native loads the styleUrl directly
- No handling for "first open with no signal, nothing cached"

### HEAD: offlineMapStyle Fallback (After Cycle-22 05)

**app/src/ui/wayMapView.tsx:479-530 (HEAD)**:
```javascript
const [patchedStyles, setPatchedStyles] = useState(null);
const [styleFailed, setStyleFailed] = useState(false);
const styleLoadedRef = useRef(false);
useEffect(() => {
  let cancelled = false;
  let timer = null;
  setStyleFailed(false);
  styleLoadedRef.current = false;
  const attempt = async (n) => {
    try {
      const res = await fetch(styleUrl);
      const json = await res.json();
      if (cancelled) return;
      setPatchedStyles({
        labelsOn: patchMapStyle(json, { hideLabels: false }),
        labelsOff: patchMapStyle(json, { hideLabels: true }),
      });
    } catch {
      // offline or server down: retry (STYLE_RETRY_MS = [5000, 15000, 45000])
      if (cancelled || n >= STYLE_RETRY_MS.length) return;
      timer = setTimeout(() => { timer = null; void attempt(n + 1); }, STYLE_RETRY_MS[n]);
    }
  };
  void attempt(0);
  return () => {
    cancelled = true;
    if (timer !== null) clearTimeout(timer);
  };
}, [styleUrl]);

const mapStyle = patchedStyles
  ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
  : styleFailed ? offlineMapStyle(t.race.bg) : styleUrl;  // NEW fallback branch
```

**Map component (HEAD):**
```jsx
<M.Map key={styleUrl} mapStyle={mapStyle}
  onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}
  onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
  ... >
```

**offlineMapStyle definition (app/src/ui/wayMapStyle.ts:172-179)**:
```javascript
export function offlineMapStyle(backgroundColor: string): unknown {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': backgroundColor } }],
  };
}
```

### Cold-Start Sequence (The Problem)

**Scenario: First launch with no network, MapLibre cache empty**

1. **Mount 1**: Map mounts with `mapStyle={styleUrl}` (plain URL)
2. **Fetch starts**: Async fetch(styleUrl) begins
3. **Native load fails**: mapLibre tries to load styleUrl, fails (offline + no cache)
   - `onDidFailLoadingMap` fires
   - `styleLoadedRef.current === false` (no onDidFinishLoadingStyle yet)
   - `setStyleFailed(true)` is called
4. **Rerender 1**: mapStyle becomes `offlineMapStyle(t.race.bg)` (a new object with only background layer)
5. **No remount**: `key={styleUrl}` hasn't changed, so Map component doesn't remount
6. **Style change prop**: mapStyle prop is updated from styleUrl to offlineMapStyle
7. **Critical problem**: MapLibre reloads the style object while GeoJSON sources are already mounted
   - The sources were mounted against the old styleUrl (or failed to load)
   - Now they're painted against the new offlineMapStyle (background-only)
   - But the **layer z-order may not be preserved across the style change**

**Why remount fixes it (Symptoms c)**:
- Pressing START or switching tabs causes a full component remount (different RecordScreen or RouteMapView instance)
- `key={styleUrl}` unchanged, BUT React remounts due to phase/screen change
- New mount: sources mount fresh against offlineMapStyle in the correct order
- Gates now render above route line

---

## 3. RECORD Screen vs Other Screens

### Call Sites of WayMapView

**app/src/ui/RecordScreen.tsx**

| Context | Line | Props | Variant | LiveState | Notes |
|---------|------|-------|---------|-----------|-------|
| Idle/pre-start map | 1267 | wayId, zoom=1, lat/lon (lastLat/lastLon) | live | prestart | **The buggy map** |
| Running/stopped/finished map | 1416 | wayId, zoom=4, gateColours, sectorColours, trail, selfs | live | moving/stopped/finished | Works correctly |

**Key Difference**:
- **Idle map (line 1267)**: Mounts once when entering 'armed' phase; prop updates only (no remount) until START is pressed
- **Running map (line 1416)**: Mounts when 'running' phase starts; lives through moving → stopped → finished transitions

On cold start, the **idle map is the first WayMapView mounted in the app**. If the app launches with no network:
1. Idle map mounts → styleUrl → fetch fails → styleFailed → offlineMapStyle applied to running map
2. Then START is pressed → running map mounts with pre-loaded styleFailed state

### RouteMapView (Browse Maps)

**app/src/ui/RideDetailScreen.tsx, etc.**: variant="browse" maps always render correctly because:
- variant="browse" means unlocked (labels on, zoom bar visible)
- These maps are not affected by the RECORD-specific state
- Likely mount/remount independently and don't carry styleFailed across

---

## 4. Module-Level and Persisted Cache

### Offline Style Cache

**None in working tree**. offlineMapStyle(backgroundColor) is a pure function that returns a new object every call:

```javascript
export function offlineMapStyle(backgroundColor: string): unknown {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': backgroundColor } }],
  };
}
```

**No AsyncStorage or fs cache for styles**. MapLibre's own native cache is used:
- app/src/ui/wayMapView.tsx:486: "from MapLibre's own cache when offline"
- First open with no signal + no cache = native load fails

### No Change in Cache Logic Between HEAD~1 and HEAD

The PNG rung (which had its own image assets cache) was completely removed, but there's no new cache for the offlineMapStyle.

---

## 5. Test Coverage

### app/tests/waymap_suite.ts

**Line 243-255: Cycle-023 remount test**
```javascript
test('routemap: MapLibre <M.Map> remounts on a style-URL change', () => {
  assert(/\bkey=\{styleUrl\}/.test(openTag),
    '<M.Map> must be keyed on styleUrl so a day<->night theme flip fully remounts...');
});
```

**This test pins the behavior but doesn't cover the styleFailed → offlineMapStyle case**.

### app/tests/waymapstyle_suite.ts

**Line 156-169: offlineMapStyle test (NEW in cycle-22)**
```javascript
test('virgin-cycle22 05: offlineMapStyle is a self-contained background-only style', () => {
  const s = offlineMapStyle('#17171b');
  assert(s.version === 8);
  assert(JSON.stringify(s.sources) === '{}', 'no sources');
  const layers = s.layers;
  assert(layers.length === 1 && layers[0].type === 'background');
  assert(layers[0].paint['background-color'] === '#17171b');
});
```

**This test verifies the offlineMapStyle object shape but NOT that layers render correctly on top of it after a style change.**

### Missing Test Coverage

No test covers:
1. Layer render order when mapStyle prop changes from styleUrl to offlineMapStyle (style swap without remount)
2. Declarative source/layer mounting behavior across a style change
3. Cold-start scenario: fetch fails → styleFailed → offlineMapStyle applied while sources already mounted

---

## 6. Root Cause Analysis

### The Core Issue

**File: app/src/ui/wayMapView.tsx**

Line 686: `key={styleUrl}` — Map component only remounts if theme (day/night) changes

Line 520-522:
```javascript
const mapStyle = patchedStyles
  ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
  : styleFailed ? offlineMapStyle(t.race.bg) : styleUrl;
```

When `styleFailed` becomes true (onDidFailLoadingMap fires before onDidFinishLoadingStyle):
- mapStyle prop changes from `styleUrl` to `offlineMapStyle(t.race.bg)`
- **Map component does NOT remount** (key={styleUrl} unchanged)
- MapLibre receives a new style object (offlineMapStyle) while GeoJSON sources remain mounted
- **MapLibre's behavior when style changes mid-render**: The native layer z-order may not be preserved

### Why It Only Affects RECORD Pre-start Map

1. RECORD idle map is typically the **first map mounted** in a new app session
2. On cold start with no network, this map experiences the style-change race condition first
3. Other maps (ROUTES, RESULTS, ACTIVITIES) may mount **after** the fetch retries succeed or the real style loads
4. Running map in RECORD inherits the styleFailed state but its larger zoom/zoom-in gesture helps mask the rendering glitch

---

## 7. Proposed Fix Considerations

The issue is **not a layer ordering problem in JSX** — the order is correct. The problem is **MapLibre's handling of a style change while sources are mounted**.

Possible solutions:

### Option A: Remount the Map on style change
Add `styleFailed` to the Map's key:
```jsx
key={`${styleUrl}-${styleFailed ? 'offline' : 'online'}`}
```
This forces a full remount when styleFailed changes, guaranteeing sources mount fresh in correct order.

### Option B: Prevent the style change race
- Set `styleFailed` only after a longer delay (giving the fetch retry time to succeed)
- Or, defer setting `offlineMapStyle` until after a "stuck" timer expires

### Option C: Verify MapLibre version and layer API
- Check if MapLibre has a method to re-order layers after a style change
- Or use belowLayerID/aboveLayerID on declarative layers to force correct order

---

## Affected Files

- **app/src/ui/wayMapView.tsx**: Map key logic, style selection, callbacks
- **app/src/ui/wayMapStyle.ts**: offlineMapStyle function (new in cycle-22)
- **app/src/ui/RecordScreen.tsx**: RECORD map mount points
- **app/tests/waymap_suite.ts**: Layer/remount tests (need expansion)
- **app/tests/waymapstyle_suite.ts**: offlineMapStyle test (covers object shape, not rendering)

---

## Code Excerpts for Reference

### style-selection logic (HEAD)
**wayMapView.tsx:520-522**
```javascript
const mapStyle = patchedStyles
  ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
  : styleFailed ? offlineMapStyle(t.race.bg) : styleUrl;
```

### Map component key (HEAD)
**wayMapView.tsx:687**
```jsx
<M.Map
  key={styleUrl}
  mapStyle={mapStyle as never}
  ...
```

### Callbacks (HEAD)
**wayMapView.tsx:689-690**
```jsx
onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}
onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
```

### offlineMapStyle (NEW in cycle-22)
**wayMapStyle.ts:172-179**
```javascript
export function offlineMapStyle(backgroundColor: string): unknown {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': backgroundColor } }],
  };
}
```

---

## Summary

The cycle-22 05 change to use offlineMapStyle as a fallback for offline maps introduces a layer z-order regression on cold start when network is unavailable. The root cause is:

1. **Map key doesn't include styleFailed state** → no remount when style changes
2. **mapStyle prop changes** from styleUrl to offlineMapStyle during runtime
3. **MapLibre's layer order** across a style change is not guaranteed to match the declarative source mount order
4. **Remounting the Map** (via tab switch or START press) fixes the issue because sources mount fresh

The fix requires either:
- **Remounting the Map when styleFailed changes** (by including it in the key), or
- **Ensuring layer order is preserved** via explicit belowLayerID/aboveLayerID props, or
- **Deferring the styleFailed state change** to prevent the mid-render style swap

