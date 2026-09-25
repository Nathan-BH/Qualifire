# 05 — Map credits folded into an "i" button

**Source: Nathan, idea #8 (tester feedback; tester not named).** "Fold in the whole
OpenFreeMap credits text; in Strava it is folded in a simple 'i' info button in a map
corner instead of being written in full across the whole map."

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from anchor checks against the working tree (`wayMapView.tsx` at 1204 lines,
git-clean, last touched by `23f60c2` cycle13). Executor: Sonnet, cold, this file only.
Medium-small task: one component rewritten in place, one new pure module, ~6 anchor edits,
one new test suite + one static guard.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor was read from the tree on 2026-09-26. If a quoted line
  is not where the brief says, **stop and report the mismatch verbatim** (file, line,
  expected, found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside, never deleted. Never delete anything —
  `safe_to_delete/` is the bin.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  or any `cycles/virgin-cycle1..13/` doc.
- **Write UTF-8.** `wayMapView.tsx` contains `©`, `—`, `−`, `↑`, `→`. Cycle12 fixed a
  mojibake regression in another file; after editing run
  `grep -c "â" app/src/ui/wayMapView.tsx` and expect `0`.
- **Attribution is a licence obligation, not decoration.** OpenStreetMap / OpenMapTiles /
  OpenFreeMap credit must stay reachable on every map the user sees. The collapsed "i"
  pattern (MapLibre's own AttributionControl, Strava) is acceptable; removing or shortening
  the credit text is not. The wording of every credit string stays byte-identical.

## Goal

Every map in the app shows a small round "i" button in its bottom-right corner instead of
the current always-visible one-line credit pill. Tapping "i" opens a small card anchored to
that corner with the full, unchanged credit rows ("Map data sources"); it closes on tapping
"i" again, tapping the card, or by itself after 8 s. Theme tokens only; no new dependency;
no native prop; ships OTA.

## Context

### The one place credits live

Every map surface in the app renders through `app/src/ui/wayMapView.tsx` (`WayMapView`,
line 285), which picks the MapLibre rung (`MapLibreWayMap`, line 346) or the PNG fallback
rung (`PngWayMap`, line 945). **Both rungs already share one `Credit` component**
(lines 292-342) — so "every map variant uses it" is already true, and the change is
confined to that component, its two call-site consts, its styles, and one string constant.
No screen file needs touching.

MapLibre's own native attribution control and logo are **off** on `<M.Map>`:

```tsx
        attribution={false}          // wayMapView.tsx:674
        logo={false}                 // :675
        compass={false}              // :676
```

so the JS `Credit` overlay is the **only** attribution on the tile map. That is why it must
keep existing (see the new static guard below), and why this change is JS-only — no native
prop is touched, no rebuild needed.

### Current `Credit` (wayMapView.tsx:292-342, verbatim head)

```tsx
// --------------------------------------------------------------- attribution

/** Shared by both rungs (design contract C): the credit becomes a Pressable
 * that opens a "Map data sources" sheet — except while the live ribbon is
 * actually locked (moving/stopped), where it stays a flat, non-interactive
 * label so it never reads as one more control on the D-006 no-controls
 * surface. */
function Credit(props: { rung: 'maplibre' | 'png'; interactive: boolean }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const label = props.rung === 'maplibre'
    ? 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'
    : ATTRIBUTION;
  const rows = props.rung === 'maplibre'
    ? [
      { source: 'OpenFreeMap', role: 'tiles' },
      { source: '© OpenMapTiles', role: 'schema' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ]
    : [
      { source: 'Esri, HERE, Garmin', role: 'imagery' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ];
```

Lines 316-341: a `<Pressable disabled={!props.interactive} onPress={() => setOpen(true)}
style={st.credit} hitSlop={4}>` wrapping `<Text style={st.creditText} numberOfLines={1}>{label}</Text>`
(line 323) — **this is the always-visible pill the tester objects to** — followed by a
`<Modal visible={open} transparent animationType="fade" …>` (line 325) with a backdrop
`Pressable` (`st.sheetBackdrop`), a card (`st.sheetCard`, title "Map data sources", one
`Text` per row `{r.source} — {r.role}`, a CLOSE button). Component ends line 342 `}`.

So a tap-to-open sheet already exists; today it is only reachable on unlocked maps and the
trigger is the full text itself. The brief keeps the sheet's content and replaces the
trigger + the Modal.

### Styles (wayMapView.tsx:1181-1203, verbatim)

```tsx
  // Deliberately NOT a palette colour: a credit that used a tier colour would
  // read as a signal.
  credit: {
    position: 'absolute', right: 6, bottom: 6, maxWidth: '80%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, overflow: 'hidden',
  },
  creditText: { fontSize: 8.5, color: '#2B2B2B' },
  badge: {
    position: 'absolute', bottom: 6, left: 6, fontSize: 10.5, letterSpacing: 1.2,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
  },
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheetCard: {
    borderRadius: radius.card, borderWidth: 1, padding: 18, gap: 8, minWidth: 240, maxWidth: '90%',
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  sheetRow: { fontSize: 13 },
  sheetClose: { marginTop: 10, alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6 },
  sheetCloseText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 1.5 },
```

The pill is hard-coded: 60 % white background, `#2B2B2B` text, 8.5 px. On the night theme
(dark basemap) that is legible but loud — a bright white strip on a black map, which is
exactly the tester's "written in full across the whole map". `st.badge` (bottom-**left**) is
the OFF ROUTE / "waiting for GPS" badge — unrelated, untouched, and it is why the button
stays bottom-right. `st.zoomBar` is `right: 6, top: 6` (line 1176): top-right is taken.

### The PNG rung's string (wayMapView.tsx:938-943, verbatim)

```tsx
/**
 * Required by the tile licence, and it is drawn HERE rather than baked into
 * the PNG on purpose: the live screen crops the asset at zoom 4, so a baked
 * corner would be off-screen exactly when the map is being used.
 */
const ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors';
```

Used only at line 304. On the phone (build 7, MapLibre present, empty seed → `IMAGES` is
`{}`) the PNG rung's credit is practically unreachable (line 1154 renders it only when a
bundled PNG loaded); the gatesOnly degraded frame (line 988) still renders it. Both get the
same button — same component.

### Call sites and the two consts

```tsx
  const interactiveCredit = !(variant === 'live' && (liveState === 'moving' || liveState === 'stopped'));   // :374 (MapLibre rung)
      <Credit rung="maplibre" interactive={interactiveCredit} />                                              // :923
  const interactiveCredit = !locked;                                                                          // :968 (PNG rung; `locked` defined :966)
        <Credit rung="png" interactive={interactiveCredit} />                                                 // :988 (gatesOnly degraded frame)
      {!imgFailed && img ? <Credit rung="png" interactive={interactiveCredit} /> : null}                     // :1154
```

Line 964 comment mentions "the non-interactive credit while" — update the words (change E).

### Every map surface (all through `WayMapView`; none has its own map)

| screen | file:line | variant / state | note |
| --- | --- | --- | --- |
| RECORD, ready-not-started (big) | `RecordScreen.tsx:1079` | live / prestart, `fill` | |
| RECORD, live race | `RecordScreen.tsx:1212` | live / moving·stopped·finished, `fill`; `gatesOnly` on a free ride | HUD (`LiveSectorPane`) is **below** the map frame, not overlaid |
| RECORD, idle 200-px map | `RecordScreen.tsx:1359` | live / prestart, height 200 | |
| RIDES → ride detail | `RideDetailScreen.tsx:432, 489, 517, 538` | browse, height 300 | route map + three trail-only variants |
| ROUTES → place detail | `CatalogDetailScreen.tsx:188` | browse, `gatesOnly`, height 260 | |
| ROUTES → route detail | `CatalogDetailScreen.tsx:322` | browse, height 260 | |
| Gate-adjust card (save flow + ROUTES edit) | `gateAdjustCard.tsx:147` | browse, height 280, `gateSelect` | chip row is below the map |
| DEMO full-screen run | `DemoScreen.tsx:382, 385` | live / moving·finished, `fill` | FIRST / SECOND / TENTH |
| Brief 02 replay (parked) | reuses `WayMapView` `variant="live"` | inherits automatically | |

`PreviewScreen.tsx` and `ResultsDetailScreen.tsx` have no map. Static-guard tests in
`tests/waymap_suite.ts:320-343` read `wayMapView.tsx` as text and look for the literal
`<Credit rung="maplibre"` after the first `st.zoomBar` — **keep that tag text exactly**
(component name `Credit`, prop `rung="maplibre"` first) and the tests stay green.

### Map export / share (report only)

No image capture exists: `grep -rn "captureRef\|view-shot\|takeSnapshot" app/src` → nothing.
Share flows are GPX / GPX+ text (`storage/gpxExport.ts`, `gpxPlusExport.ts`, `ui/saveGpx.ts`)
and the DATA-section JSON shares. Nothing to attribute on export. Should a screenshot/share
feature ever land, the "i" button is inside the map frame and will be in the capture.

## Decisions (already made — do not reopen)

1. **Bottom-right, 22 px circle.** Same corner the pill uses today (`right: 6, bottom: 6`);
   bottom-left is the badges, top-right the zoom bar, top-left free but far from where the
   pill was. Nothing in any host screen overlays the map frame's bottom-right.
2. **Card opens in-frame, no `Modal`, no backdrop.** An absolutely-positioned card just above
   the button, inside the map frame (`overflow: 'hidden'` clips it). Rejected: the existing
   full-screen `Modal` — on the live race it would cover the HUD, and "tap outside to
   dismiss" needs a backdrop that steals map gestures while open. Rejected: a
   frame-filling tap-catcher — same gesture problem (cycle 020: race-mode pan/zoom stays on).
3. **Dismiss = tap "i" again, tap the card, or auto-hide after 8 s** (`CREDIT_AUTO_HIDE_MS`).
   Auto-hide is what makes "no backdrop" safe: an accidental tap while riding self-heals,
   and the map never gains a tap-eating layer. 8 s reads three short rows comfortably.
4. **Interactive on every map, including moving/stopped.** The old "flat, non-interactive
   while locked" rule made sense for a text label; an inert "i" is a broken control. The
   zoom bar has been interactive while moving since cycle 020 (D-006 relaxed), so a 22 px
   corner button is not a new kind of exception. While locked the button drops to
   `opacity: 0.6` (small, low-contrast, never hidden — attribution stays reachable).
   Gesture footprint: 22 px + `hitSlop` 6 = a 34 px corner square where a pan cannot start,
   smaller than one zoom-bar button (30 px + gaps); accepted, same trade as the zoom bar.
5. **Theme tokens only**: button `t.race.card` / `t.cardBorder` / glyph `t.textDim`
   (the zoom-bar recipe, so it reads as the map's own chrome in both themes); card
   `t.race.card` / `t.cardBorder`, title `t.text`, rows `t.text2`. The hard-coded
   `rgba(255,255,255,0.6)` / `#2B2B2B` go. Never a tier colour (the old comment's rule
   stays true).
6. **Strings move to a pure module** `app/src/ui/mapCreditModel.ts` (no RN import, so the
   headless suite can load it): the two credit lines and the row tables, byte-identical to
   today's. The one-line label is no longer painted; it becomes the button's
   `accessibilityLabel`, so a screen reader still gets the full credit without opening.
7. **`Credit` stays in `wayMapView.tsx`**, same name, same two call sites × rungs. A separate
   `mapCredits.tsx` component file was considered and dropped: both rungs already share
   this one function and the static tests anchor on its tag; a file move buys nothing.

## Changes

### A. New file `app/src/ui/mapCreditModel.ts` (create)

```ts
/**
 * Map attribution strings — the ONE place the credit wording lives.
 * virgin-cycle14 brief 05 (Nathan #8): the always-visible credit pill on
 * every map became a corner "i" button (wayMapView.tsx `Credit`); the
 * wording itself is a licence obligation (OpenStreetMap / OpenMapTiles /
 * OpenFreeMap on the tile rung, Esri/HERE/Garmin + OSM on the PNG rung)
 * and must never be shortened or dropped. Pure and RN-free so
 * tests/mapcredit_suite.ts can lock it headless.
 */
export type MapRung = 'maplibre' | 'png';
export type CreditRow = { source: string; role: string };
export type MapCredit = { label: string; rows: readonly CreditRow[] };

/** Tile rung: OpenFreeMap tiles, OpenMapTiles schema, OSM data. */
export const MAPLIBRE_CREDIT = 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap';
/** PNG fallback rung. Drawn as an overlay rather than baked into the PNG on
 * purpose: the live screen crops the asset at zoom 4, so a baked corner
 * would be off-screen exactly when the map is being used. */
export const PNG_CREDIT = 'Esri, HERE, Garmin, © OpenStreetMap contributors';

/** How long the opened credit card stays up before hiding itself. */
export const CREDIT_AUTO_HIDE_MS = 8000;

const CREDITS: Record<MapRung, MapCredit> = {
  maplibre: {
    label: MAPLIBRE_CREDIT,
    rows: [
      { source: 'OpenFreeMap', role: 'tiles' },
      { source: '© OpenMapTiles', role: 'schema' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ],
  },
  png: {
    label: PNG_CREDIT,
    rows: [
      { source: 'Esri, HERE, Garmin', role: 'imagery' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ],
  },
};

export function creditFor(rung: MapRung): MapCredit {
  return CREDITS[rung];
}
```

### B. `wayMapView.tsx` — imports

Line 85 is exactly
`import { Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';`
→ remove `Modal, ` (the credit sheet was the file's only `Modal`; `grep -n Modal` shows
lines 85, 325, 339 only). Directly after line 102
(`import { useTheme } from './themeContext.tsx';`) add
`import { CREDIT_AUTO_HIDE_MS, creditFor, type MapRung } from './mapCreditModel.ts';`.
`useEffect` is already imported (line 84).

### C. `wayMapView.tsx` — replace the `Credit` block (lines 292-342, from the
`// ---- attribution` rule through the component's closing `}`) with:

```tsx
// --------------------------------------------------------------- attribution

/** Shared by both rungs. virgin-cycle14 brief 05 (Nathan #8, tester
 * feedback): the credit is a small round "i" in the bottom-right corner,
 * not a line of text across the map. Tapping it opens the "Map data
 * sources" card in-frame (no Modal, no backdrop — nothing may eat map
 * gestures, cycle 020); the card closes on a tap of "i" or of itself, or
 * by itself after CREDIT_AUTO_HIDE_MS. Interactive on every surface — an
 * inert "i" is a broken control — and merely dimmed while the live ribbon
 * is locked, the same relaxation D-006 already made for the zoom bar. The
 * wording (mapCreditModel.ts) is a licence obligation and is never
 * shortened; MapLibre's own attribution control is off on <M.Map>, so this
 * overlay is the only credit on the tile rung. Never a tier colour: a
 * credit in purple/green/yellow would read as a signal. */
function Credit(props: { rung: MapRung; locked: boolean }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const { label, rows } = creditFor(props.rung);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), CREDIT_AUTO_HIDE_MS);
    return () => clearTimeout(id);
  }, [open]);
  return (
    <>
      {open ? (
        <Pressable
          style={[st.creditCard, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close map data sources"
        >
          <Text style={[st.creditTitle, { color: t.text }]}>Map data sources</Text>
          {rows.map((r) => (
            <Text key={r.source} style={[st.creditRow, { color: t.text2 }]}>
              {r.source} — {r.role}
            </Text>
          ))}
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          st.creditBtn,
          { backgroundColor: t.race.card, borderColor: t.cardBorder },
          props.locked && st.creditBtnLocked,
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Map data sources: ${label}`}
      >
        <Text style={[st.creditBtnText, { color: t.textDim }]}>i</Text>
      </Pressable>
    </>
  );
}
```

(The `—` in `{r.source} — {r.role}` is the same em dash as today's line 331.)

### D. `wayMapView.tsx` — call sites

- Line 374 (exact text in Context) → `  const creditLocked = variant === 'live' && (liveState === 'moving' || liveState === 'stopped');`
- Line 923 `      <Credit rung="maplibre" interactive={interactiveCredit} />` → `      <Credit rung="maplibre" locked={creditLocked} />`
- Line 968 `  const interactiveCredit = !locked;` → remove the line (the PNG rung's `locked` const at 966 is passed directly).
- Line 988 `        <Credit rung="png" interactive={interactiveCredit} />` → `        <Credit rung="png" locked={locked} />`
- Line 1154 `      {!imgFailed && img ? <Credit rung="png" interactive={interactiveCredit} /> : null}` → `      {!imgFailed && img ? <Credit rung="png" locked={locked} /> : null}`

(Line numbers 923+ are pre-change; change C shortens the file by a few lines — match on
text.)

### E. `wayMapView.tsx` — the PNG string and one comment

- Lines 938-943 (quoted in Context) → replace the six lines with the two-line comment
  `// The PNG rung's credit string lives in mapCreditModel.ts (PNG_CREDIT) — drawn as an`
  `// overlay by <Credit>, never baked into the PNG (see that file for why).`
  `ATTRIBUTION` has no other reader (`grep -n ATTRIBUTION` → only 304 and 943 today).
- Line 964 `  // honours showRider, the stopped-dim and the non-interactive credit while`
  → `  // honours showRider, the stopped-dim and the dimmed credit button while`.

### F. `wayMapView.tsx` — styles

Replace the `credit` + `creditText` entries (lines 1181-1189, the comment through
`creditText: …`) with:

```tsx
  // virgin-cycle14 brief 05: the "i" credit button + its in-frame card. Theme
  // tokens at the call site; deliberately NOT a palette colour — a credit
  // that used a tier colour would read as a signal.
  creditBtn: {
    position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  creditBtnLocked: { opacity: 0.6 },
  creditBtnText: { fontSize: 12, fontWeight: '700', fontStyle: 'italic', lineHeight: 14 },
  creditCard: {
    position: 'absolute', right: 6, bottom: 32, maxWidth: '85%', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8, gap: 2,
  },
  creditTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  creditRow: { fontSize: 11 },
```

and remove the six `sheet*` entries (lines 1194-1203, `sheetBackdrop` … `sheetCloseText`).
`st.badge` (between them) stays exactly as is. Card height ≈ 75-90 px + 32 px bottom
offset: fits the smallest frame (190 px default, 200 px idle RECORD map).

### G. Tests

**G1. New `app/tests/mapcredit_suite.ts`** (create; pattern of `towermodel_suite.ts`: static
imports, `test`/`assert` from `./lib.ts`):

```ts
/**
 * QA — virgin-cycle14 brief 05: map credit wording. The pill became an "i"
 * button; the WORDING is a licence obligation and must not drift. Headless,
 * pure (mapCreditModel.ts has no RN import).
 */
import { assert, test } from './lib.ts';
import { creditFor, MAPLIBRE_CREDIT, PNG_CREDIT, CREDIT_AUTO_HIDE_MS } from '../src/ui/mapCreditModel.ts';

test('mapcredit: tile-rung wording is byte-identical to the pre-brief-05 credit line and names all three projects', () => {
  const c = creditFor('maplibre');
  assert(c.label === 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap', `label drifted: ${c.label}`);
  assert(c.label === MAPLIBRE_CREDIT, 'creditFor("maplibre").label must be MAPLIBRE_CREDIT');
  const sources = c.rows.map((r) => r.source);
  assert(sources.includes('OpenFreeMap'), 'OpenFreeMap row missing');
  assert(sources.includes('© OpenMapTiles'), 'OpenMapTiles row missing');
  assert(sources.includes('© OpenStreetMap contributors'), 'OSM contributors row missing');
  assert(c.rows.every((r) => r.role.length > 0), 'every row carries a role');
});

test('mapcredit: PNG-rung wording is byte-identical and still credits OpenStreetMap contributors', () => {
  const c = creditFor('png');
  assert(c.label === 'Esri, HERE, Garmin, © OpenStreetMap contributors', `label drifted: ${c.label}`);
  assert(c.label === PNG_CREDIT, 'creditFor("png").label must be PNG_CREDIT');
  assert(c.rows.some((r) => r.source === '© OpenStreetMap contributors' && r.role === 'data'), 'OSM data row missing');
  assert(c.rows.some((r) => r.source === 'Esri, HERE, Garmin' && r.role === 'imagery'), 'imagery row missing');
});

test('mapcredit: auto-hide is long enough to read three rows and short enough to self-heal on the bike', () => {
  assert(CREDIT_AUTO_HIDE_MS >= 5000 && CREDIT_AUTO_HIDE_MS <= 15000, `CREDIT_AUTO_HIDE_MS out of band: ${CREDIT_AUTO_HIDE_MS}`);
});
```

Register in `app/tests/run.ts`: add `import './mapcredit_suite.ts';` directly after the
**last** `import './…_suite.ts';` line (today line 51, `import './virginmanifest_suite.ts';`;
briefs 01/02 add their own lines there too — go after whichever is last, before the blank
line and `import { runAll } from './lib.ts';`).

**G2. Static guard in `app/tests/waymap_suite.ts`.** Append after the file's last test (the
compass test ending at line 343 `});`), same "static-guard doctrine" as its neighbours:

```ts
test('routemap: map credits are an "i" button, never an always-visible label, and the native attribution stays off (virgin-cycle14 brief 05)', () => {
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  assert(!src.includes('numberOfLines={1}>{label}'), 'the old always-visible credit label is back');
  assert(!src.includes('st.creditText') && !src.includes("'#2B2B2B'"), 'old credit pill style is back');
  assert(!src.includes('<Modal'), 'the credit card must be in-frame — no Modal in wayMapView.tsx');
  assert(src.includes('accessibilityLabel={`Map data sources: ${label}`}'), 'the "i" button must carry the full credit as its accessibility label');
  assert(src.includes('CREDIT_AUTO_HIDE_MS'), 'the opened card must auto-hide');
  assert((src.match(/<Credit rung="maplibre"/g) ?? []).length === 1, 'MapLibre rung must mount exactly one <Credit>');
  assert((src.match(/<Credit rung="png"/g) ?? []).length === 2, 'PNG rung must mount <Credit> in both its gatesOnly frame and its image frame');
  const mapStart = src.indexOf('<M.Map');
  const openTag = src.slice(mapStart, src.indexOf('<M.Camera', mapStart));
  assert(/attribution=\{false\}/.test(openTag) && /logo=\{false\}/.test(openTag),
    'native attribution/logo must stay off — the JS <Credit> is the only credit, so both halves of this test guard the licence together');
});
```

No RN render test exists in this repo (same doctrine as the tests above it); the button's
look and the tap behaviour are on-device checks, listed below. Nothing else in the change
is unit-testable and no test is invented for it.

## Verification (executor runs all; report the actual numbers)

```
cd app && grep -n "numberOfLines={1}>{label}\|st.creditText\|#2B2B2B\|sheetBackdrop\|<Modal\|ATTRIBUTION\|interactiveCredit" src/ui/wayMapView.tsx   # expect: no output
cd app && grep -n "<Credit rung=" src/ui/wayMapView.tsx        # exactly 3 lines: maplibre ×1, png ×2
cd app && grep -c "â" src/ui/wayMapView.tsx src/ui/mapCreditModel.ts   # 0 and 0 (UTF-8 intact)
cd app && node --experimental-strip-types tests/run.ts        # 0 FAIL
cd app && ./node_modules/.bin/tsc --noEmit                     # clean, exit 0
GIT_OPTIONAL_LOCKS=0 git status --short                        # wayMapView.tsx M, waymap_suite.ts M, run.ts M, mapCreditModel.ts ??, mapcredit_suite.ts ??
```

Baseline (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip. Expected after:
**642 tests, 639 pass, 0 fail, 3 skip** (+3 from G1, +1 from G2), assuming 01/02 have not
landed their suites first — if they have, add their counts. If `tsc` blows the call budget,
retry once with a longer timeout, then report — never substitute a syntax-only check
silently. A `tsc` error about an unused `Modal` import or `interactiveCredit` means a step of
B/D was skipped — fix that step, do not add `// @ts-ignore`.

## On-device checklist (Nathan, after OTA — not the executor)

Do each in **daylight and night** (SETTINGS → APPEARANCE):

1. RECORD, ready-not-started: a small round "i" bottom-right of the map, no text pill. Tap →
   card with "Map data sources" and the three rows (OpenFreeMap — tiles / © OpenMapTiles —
   schema / © OpenStreetMap contributors — data), complete and readable in both themes.
   Tap "i" again → closes. Open it and wait ~8 s → closes by itself. Tap the card → closes.
2. Live race (route mode): the "i" is dimmer while moving, still tappable; the card never
   covers the lap clock / sector bars (they are below the map). Pan and pinch the map with
   the card open — gestures still work; the card does not intercept them. Stop at a light:
   the whole frame dims as before, "i" included.
3. Free ride (new>>new, gates-only map): same button; OFF ROUTE / "waiting for GPS" badges
   still bottom-left, never overlapping the button.
4. RIDES → a ride → the route map and the trail-only map: "i" present, works, sits inside
   the rounded frame corner.
5. ROUTES → a place, and a route: same. Gate-adjust (edit gates on a saved way): "i" does
   not collide with a selected gate ring or the chip row.
6. DEMO → FIRST and TENTH RIDE: same button on the full-screen run map.
7. Zoom bar (+ − FIT ↑ ME) unaffected, still top-right.

## Out of scope / follow-up

- Any change to the credit wording, the row set, or the "Map data sources" title.
- MapLibre's native attribution control (stays off; turning it on would be a native-prop
  change and a different design).
- The PNG rung beyond the shared component (no separate styling; it is unreachable on
  build 7 with an empty seed except the gatesOnly degraded frame).
- A map screenshot / image-share feature (none exists; noted in Context).
- Legacy `product/` or `cycles/virgin-cycle1..13/` docs that mention the credit pill.
- `STATE.md` / `OPEN-ITEMS.md` / this folder's `README.md` — the coordinator's.

## Interaction with briefs 01 / 02 / 03 / 04

01, 03, 04 edit `settings.tsx` (and 01 adds a `TimeRow`, theme-context lines and a suite);
this brief touches `wayMapView.tsx`, `mapCreditModel.ts` (new), `waymap_suite.ts`,
`mapcredit_suite.ts` (new) and one line of `tests/run.ts`. Disjoint — any order. The only
shared anchor is `tests/run.ts`: 01, 02 and 05 each append one import "after the last
suite import"; whichever runs later goes after the earlier one's line (match on text, not
line 51). **02 (replay) reuses `WayMapView variant="live"` and does not edit
`wayMapView.tsx`**, so the replay map inherits the "i" button automatically; landing 05
before 02 means 02's on-device check sees the final map chrome, but nothing breaks either
way.

## What this changes on Nathan's phone

Nothing yet — parked. Once executed: JS-only (one component, one new pure module, styles),
no dependency change, no native prop (`attribution={false}` / `logo={false}` already off and
untouched), so it ships to the Preview APK via `scripts/publish-preview.cmd` (EAS Update) —
no numbered build, no reinstall. Visible change: every map's bottom-right credit strip
becomes a 22 px "i" that opens the same credits on tap.

## Open questions / assumptions (logged, not blocking)

- **Corner.** Bottom-right chosen (decision 1). If Nathan prefers bottom-left, swap
  `right: 6` → `left: 6` on `creditBtn`/`creditCard` and move `st.badge` to the right —
  a two-line follow-up, not this brief.
- **Interactive while moving** (decision 4) rather than hidden/inert. If Nathan wants it
  hidden during the race, the honest alternative is to keep it mounted at
  `opacity: 0.6` anyway — attribution must stay reachable — so "hidden" would mean a
  design conversation, not a flag.
- **8 s auto-hide** — the number is one constant (`CREDIT_AUTO_HIDE_MS`), band-tested
  5-15 s.
- **Glyph** is a plain italic bold `i` in `t.textDim`, matching FIT/ME's dim text weight.
  Rejected `ⓘ`/`ℹ` — glyph coverage varies by device font, and cycle12 showed how a
  non-ASCII character can travel badly through this mount.
- **The one-line label is no longer painted** anywhere; it survives as the button's
  `accessibilityLabel` and as the tested constant. If Nathan wants the sentence visible in
  the card too, add one `Text` line above the rows — one line.
- Tester not named in the source; recorded as such.
