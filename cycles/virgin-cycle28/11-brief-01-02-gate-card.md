# Brief 01-02 · Gate card: chip tap brings the gate into view; nudge pad without percent

virgin-cycle28 · written by the Opus PLAN tier 2026-10-09 · executor: Sonnet · inspector: fresh Opus.
Read `cycles/virgin-cycle28/EXECUTOR-RULES.md` first. This brief is self-contained: you do not need the digests.

## Goal

On the gate editor card (`GateAdjustCard`, mounted by RecordScreen, RideDetailScreen, DemoScreen and the ROUTES
full-screen editor GateAdjustScreen):

- **A (idea 1).** Tapping a gate CHIP below the map that selects a gate pans/zooms the map to that gate. Tapping a
  gate on the map behaves exactly as today (no camera move). A chip tap that DEselects does not move the map.
- **B (idea 2).** The four nudge buttons keep their exact behaviour (same deltas, clamps, hold-to-repeat) but lose the
  percent wording: big outer `−` / `+`, small inner `−` / `+` (U+2212 minus). The readout drops the percent and
  shows metres moved since the card opened: `G2 · 1 842 m` or `G2 · 1 842 m · +36 m`.

## What this will NOT change on the phone

No change to how far a nudge moves a gate, to the 50 m gap clamp, to what is saved, to SAVE/KEEP, to map taps,
to any other map in the app (the new map prop is optional and only the card passes it), to the zoom bar or FIT.
The camera does NOT follow a gate while you nudge it. JS-only (OTA-able); nothing native.

## Files you may touch (nothing else)

`app/src/ui/gateAdjustCard.tsx`, `app/src/ui/gateAdjustModel.ts`, `app/src/ui/wayMapView.tsx`,
`app/src/ui/wayMapGeo.ts`, `app/tests/gateseeding_suite.ts`, `app/tests/waymapgeo_suite.ts`, `app/tests/waymap_suite.ts`.
`app/tests/ui-strings.allow.json` must stay byte-identical (see Visible text).

## Pre-flight

1. `cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git status --short && GIT_OPTIONAL_LOCKS=0 git log --oneline -1`
2. Baseline: `cd app && node --experimental-strip-types tests/run.ts` (record PASS/FAIL counts; must be zero FAIL)
   and `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0; `timeout_ms: 180000`, tee to
   `../cycles/virgin-cycle28/12-brief-01-02-tsc-before.log`).
3. Confirm each anchor below occurs EXACTLY once in its file (`grep -c -F`). Any count other than 1: STOP.

Use python read-modify-write with exact string replacement for every edit (`assert src.count(old) == 1`).

## Part A: chip tap focuses the map

### A1 · `app/src/ui/wayMapGeo.ts`: append at the END of the file

```ts

/** virgin-cycle28 01 (Nathan 2026-10-09): the camera stop that brings ONE gate into view when the rider
 * taps its chip on the gate card. Centre on the gate; never zoom OUT a rider who is already closer than
 * GATE_FOCUS_ZOOM. Pure, so the suite pins it. */
export const GATE_FOCUS_ZOOM = 17;
export function gateFocusStop(
  gate: { lat: number; lon: number },
  liveZoom: number | null,
): { center: [number, number]; zoom: number; duration: number } {
  return { center: [gate.lon, gate.lat], zoom: Math.max(liveZoom ?? 0, GATE_FOCUS_ZOOM), duration: 500 };
}
```

### A2 · `app/src/ui/wayMapView.tsx`: import

Anchor (exact line):
```
  buildPassModel, faintVertices, gateFaint, routeRunsFeatureCollection, FAINT_OPACITY,
} from './wayMapGeo.ts';
```
Replace with:
```
  buildPassModel, faintVertices, gateFaint, routeRunsFeatureCollection, FAINT_OPACITY, gateFocusStop,
} from './wayMapGeo.ts';
```

### A3 · `app/src/ui/wayMapView.tsx`: the prop (in `WayMapProps`)

Anchor (exact line, currently ~308):
```
  gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };
```
Replace with:
```
  gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };
  /** virgin-cycle28 01 (Nathan 2026-10-09): bring gate `index` of the drawn asset into view. A new `seq`
   * = a new request (the gate card bumps it per chip tap, so a repeat tap re-centres). Sets the camera
   * mode to 'free' first (as a drag does) so the declarative fit push stops pulling back; FIT re-fits.
   * Absent/null = no request (every other caller). */
  focusGate?: { index: number; seq: number } | null;
```

### A4 · `app/src/ui/wayMapView.tsx`: the effect, right after `resetNorth`

Anchor (exact, the end of `resetNorth`, currently ~505-511):
```
      // map not initialised yet — the declarative push below will apply
      // userBearing=0 on the next render instead.
    }
  };
```
Replace with (the anchor kept, then the new block):
```
      // map not initialised yet — the declarative push below will apply
      // userBearing=0 on the next render instead.
    }
  };

  // virgin-cycle28 01 (Nathan 2026-10-09): the gate card's chip row asks for one gate to be brought into
  // view (focusGate.seq changes per tap). 'free' first, so the declarative fit push stops pulling the
  // camera back to the whole route (the same state a drag leaves); FIT re-fits as ever. Above the
  // riderOnly early return (Rules of Hooks).
  const focusSeq = props.focusGate?.seq ?? null;
  useEffect(() => {
    if (focusSeq === null || !props.focusGate || !asset) return;
    const gate = asset.gates[props.focusGate.index];
    if (!gate) return;
    setMode('free');
    try {
      cameraRef.current?.setStop({ ...gateFocusStop(gate, liveZoom), easing: 'ease' });
    } catch {
      // map not initialised yet: nothing to move
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);
```
Check after editing: this block sits ABOVE the line `if (riderOnly && !showRider && !hasTrail && !place) return null;`
(`asset`, `liveZoom`, `setMode` and `cameraRef` are all declared above it). If `asset` or `liveZoom` is NOT declared
above the insertion point, STOP.

### A5 · `app/src/ui/gateAdjustCard.tsx`: focus state

Anchor: `  const [selected, setSelected] = useState<number | null>(null);`
Replace with:
```
  const [selected, setSelected] = useState<number | null>(null);
  // virgin-cycle28 01: a chip tap asks the map to bring that gate into view (seq: a repeat tap re-centres).
  const [focus, setFocus] = useState<{ index: number; seq: number } | null>(null);
```

### A6 · `app/src/ui/gateAdjustCard.tsx`: pass it to the map

Anchor: `          gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}`
Replace with:
```
          gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}
          focusGate={focus}
```
(The map-tap `onPress` itself is NOT changed.)

### A7 · `app/src/ui/gateAdjustCard.tsx`: chip handler

Anchor: `              onPress={() => setSelected((cur) => (cur === i ? null : i))}`
Replace with:
```
              onPress={() => {
                const next = selected === i ? null : i;
                setSelected(next);
                if (next !== null) setFocus((f) => ({ index: next, seq: (f?.seq ?? 0) + 1 }));
              }}
```

## Part B: nudge pad without percent

### B1 · `app/src/ui/gateAdjustModel.ts`: append after `fmtPct` (after its closing `}`)

Anchor (exact):
```
  return `${((chainageM / refLengthM) * 100).toFixed(1)} %`;
}
```
Replace with:
```
  return `${((chainageM / refLengthM) * 100).toFixed(1)} %`;
}

/** virgin-cycle28 02 (Nathan 2026-10-09): how far a gate has moved since the card opened, in the
 * readout's own metre format: "+36 m" further along the route, "−4 m" back (U+2212, like the pad).
 * '' when it rounds to 0 m. Display only: the nudge model above is unchanged. */
export function fmtMoved(currentM: number, initialM: number): string {
  const d = Math.round(currentM - initialM);
  if (d === 0) return '';
  return `${d > 0 ? '+' : '−'}${fmtChainage(Math.abs(d))}`;
}
```
Do NOT edit `NUDGE_SMALL_PCT`, `NUDGE_LARGE_PCT`, `nudgeDeltaM`, `MIN_GATE_GAP_M`, `clampNudge`, `fmtPct`.

### B2 · `app/src/ui/gateAdjustCard.tsx`: import

Anchor: `  NUDGE_LARGE_PCT, NUDGE_SMALL_PCT, clampNudge, fmtChainage, fmtPct, gateName, nudgeDeltaM,`
Replace with: `  NUDGE_LARGE_PCT, NUDGE_SMALL_PCT, clampNudge, fmtChainage, fmtMoved, gateName, nudgeDeltaM,`

### B3 · comments (non-visible) in `gateAdjustCard.tsx`

- Anchor `` * `−1% −0.1% │ 1 842 m │ +0.1% +1%` nudge pad sits in the bottom third of `` → replace with
  `` * `− − │ 1 842 m │ + +` nudge pad (big outer, small inner: virgin-cycle28 02) sits in the bottom third of ``
- Anchor `const REPEAT_MS = 120;      // ~8 nudges/s: ±1 % → 8 %/s, ±0.1 % → 0.8 %/s` → replace with
  `const REPEAT_MS = 120;      // ~8 nudges/s, either step size`

### B4 · `pad()` gets an explicit key

Anchor (exact, two lines):
```
  const pad = (label: string, deltaM: number, size: 'big' | 'small') => (
    <Pressable
      key={label}
```
Replace with:
```
  // virgin-cycle28 02: `id` is the React key — two pads now share a glyph.
  const pad = (id: string, label: string, deltaM: number, size: 'big' | 'small') => (
    <Pressable
      key={id}
```

### B5 · moved-by value, just before `return (` of the component

Anchor (exact, the line before the component's JSX):
```
  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
```
Replace with:
```
  const moved = selected !== null ? fmtMoved(chainageM[selected], props.initialChainageM[selected]) : '';

  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
```

### B6 · readout and pad row

Anchor (exact):
```
            {gateName(selected, n)} · {fmtChainage(chainageM[selected])} · {fmtPct(chainageM[selected], props.refLengthM)}
          </Text>
          <View style={st.padRow}>
            {pad('−1%', -largeM, 'big')}
            {pad('−0.1%', -smallM, 'small')}
            {pad('+0.1%', smallM, 'small')}
            {pad('+1%', largeM, 'big')}
          </View>
```
Replace with:
```
            {gateName(selected, n)} · {fmtChainage(chainageM[selected])}{moved !== '' ? ` · ${moved}` : ''}
          </Text>
          <View style={st.padRow}>
            {pad('backBig', '−', -largeM, 'big')}
            {pad('backSmall', '−', -smallM, 'small')}
            {pad('onSmall', '+', smallM, 'small')}
            {pad('onBig', '+', largeM, 'big')}
          </View>
```
The `−` in these lines is U+2212 (as before). Verify with python that the file contains `'−'` in both
`pad('back...` calls and NO `%'`.

### B7 · glyph sizes (styles)

- Anchor `  padTextBig: { fontSize: 17, fontWeight: '800' },` → `  padTextBig: { fontSize: 30, fontWeight: '800', lineHeight: 34 },`
- Anchor `  padTextSmall: { fontSize: 13, fontWeight: '700' },` → `  padTextSmall: { fontSize: 18, fontWeight: '700', lineHeight: 22 },`

Do not touch `padBtnBig` / `padBtnSmall` (flex 1.25 / 0.75), `REPEAT_MS`'s value, `LONG_PRESS_MS`, `nudge`,
`startRepeat`, `stopRepeat`, the hint line, SAVE/KEEP, `mapInset`/`CARD_PAD`, or anything in `st.card`.

## Tests

### T1 · `app/tests/waymapgeo_suite.ts`
Add `gateFocusStop, GATE_FOCUS_ZOOM,` to the existing `import { ... } from '../src/ui/wayMapGeo.ts';` list and add:
```ts
test('virgin-cycle28 01: gateFocusStop centres the gate as [lon, lat] and never zooms out', () => {
  const g = { lat: 10, lon: 20 };
  const a = gateFocusStop(g, null);
  assert(a.center[0] === 20 && a.center[1] === 10, `center ${JSON.stringify(a.center)}`);
  assert(GATE_FOCUS_ZOOM === 17 && a.zoom === 17, `zoom ${a.zoom}`);
  assert(gateFocusStop(g, 14).zoom === 17, 'zooms in from a wider view');
  assert(gateFocusStop(g, 18.4).zoom === 18.4, 'keeps a closer rider zoom');
  assert(a.duration === 500, `duration ${a.duration}`);
});
```
(Do not use the literals 4.68 / 50.85 anywhere: an existing test forbids them in the source files.)

### T2 · `app/tests/gateseeding_suite.ts`
Add `fmtMoved` to the existing gateAdjustModel import and add:
```ts
test('virgin-cycle28 02: fmtMoved reads metres moved since the card opened', () => {
  assert(fmtMoved(1000, 1000) === '', 'unmoved: empty');
  assert(fmtMoved(1000.4, 1000) === '', 'rounds to 0: empty');
  assert(fmtMoved(1036, 1000) === '+36 m', `got ${fmtMoved(1036, 1000)}`);
  assert(fmtMoved(996, 1000) === '−4 m', `got ${fmtMoved(996, 1000)}`);
  assert(fmtMoved(3234, 2000) === '+1 234 m', `got ${fmtMoved(3234, 2000)}`);
});
```
The existing `fmtPct` and `nudgeDeltaM` tests stay as they are.

### T3 · `app/tests/waymap_suite.ts` (source scans; this suite already imports fs/path/TESTS_DIR)
```ts
test('virgin-cycle28 01-02: a gate chip tap brings that gate into view; map taps unchanged; pad has no percent, same deltas', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'gateAdjustCard.tsx'), 'utf8');
  assert(src.includes('focusGate?: { index: number; seq: number } | null;'), 'focusGate prop');
  assert(/setMode\('free'\);\s*try \{\s*cameraRef\.current\?\.setStop\(\{ \.\.\.gateFocusStop\(gate, liveZoom\), easing: 'ease' \}\);/.test(src), "free first, then the imperative stop");
  assert(src.includes('}, [focusSeq]);'), 'effect keyed on seq');
  assert(src.indexOf('const focusSeq =') < src.indexOf('if (riderOnly && !showRider && !hasTrail && !place) return null;'), 'hook above the early return');
  assert(card.includes('focusGate={focus}'), 'card passes focus');
  assert(card.includes('gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}'), 'map-tap path unchanged');
  assert(card.includes('if (next !== null) setFocus((f) => ({ index: next, seq: (f?.seq ?? 0) + 1 }));'), 'a selecting chip tap bumps seq');
  assert((card.match(/setFocus\(/g) ?? []).length === 1, 'only the chip row moves the map');
  assert(!card.includes("%'") && !card.includes('fmtPct('), 'no percent label, no percent readout');
  for (const call of ["pad('backBig', '−', -largeM, 'big')", "pad('backSmall', '−', -smallM, 'small')", "pad('onSmall', '+', smallM, 'small')", "pad('onBig', '+', largeM, 'big')"]) {
    assert(card.includes(call), `pad call ${call}`);
  }
  assert(card.includes('const smallM = nudgeDeltaM(NUDGE_SMALL_PCT, props.refLengthM);') && card.includes('const largeM = nudgeDeltaM(NUDGE_LARGE_PCT, props.refLengthM);'), 'step sizes unchanged');
});
```

Existing tests that must still pass unchanged: `recordflow_suite.ts` gate-card checks (`'Tap a gate to move it'`,
`<WayMapView ... bleed`, `marginHorizontal: -(CARD_PAD + props.mapInset)`, the four `mapInset` mounts),
`gateseeding_suite.ts` clamp/fmtPct tests, `waymap_suite.ts` `nextGateOnTap(hits, props.gateSelect!.selected)`. If any
existing assertion fails: STOP and report it verbatim.

## Visible text

| file | kind | exact text | why it earns its place |
|------|------|-----------|------------------------|
| gateAdjustCard.tsx | pad label | `−` `−` `+` `+` (size = step) | replaces `−1%` `−0.1%` `+0.1%` `+1%`; no letters, so the scanner never sees it |
| gateAdjustCard.tsx | readout | `<gate> · <n> m` + optional ` · +36 m` | percent replaced by metres moved; no 2-letter run, not scanned |

Allow-list: **byte-identical**. If the ui-strings suite reports ANY UNLISTED/STALE line: STOP and report it.

## Acceptance (run all, report each)

1. `cd app && node --experimental-strip-types tests/run.ts`: zero FAIL; PASS count = baseline + 3.
2. `cd app && ./node_modules/.bin/tsc --noEmit`: exit 0 (tee to `../cycles/virgin-cycle28/12-brief-01-02-tsc.log`; empty log = timeout, not a pass).
3. `GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/tests/ui-strings.allow.json`: empty.
4. `GIT_OPTIONAL_LOCKS=0 git diff --stat`: only the 7 files listed above.
5. `grep -c "focusGate" app/src/ui/*.tsx`: only `wayMapView.tsx` and `gateAdjustCard.tsx` mention it.
6. `grep -n "NUDGE_SMALL_PCT = 0.001\|NUDGE_LARGE_PCT = 0.01\|MIN_GATE_GAP_M = 50" app/src/ui/gateAdjustModel.ts`: all three unchanged.
7. No hunk under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.

## STOP-ON-AMBIGUITY

Any anchor that does not match exactly once, any undecided call, any check failing for a reason this brief did not
anticipate: STOP and report verbatim. Never guess. Escalations go to a fresh Opus (via the coordinator).

## Report

Write `cycles/virgin-cycle28/12-brief-01-02-executor-report.md` per EXECUTOR-RULES.md. OPEN-ITEMS line to hand the
coordinator: "design mock `design/make_screens.py:2683` and `design/canonical/gate_adjust_*.svg` still show percent
nudge labels (cycle28 01-02 changed the app only)."
