# brief-03 — Full-screen activity detail redesign (RideDetailScreen)

**Cycle:** virgin-cycle23. **Source:** `00-nathan-decisions.md` § "Detail page REDESIGN" + § "Visual language" + § "FIRST VERSION direction" (binding), `03-preview-B-inset.html` detail view (visual target). Written by the Plan tier (Fable) 2026-10-06 night; anchors re-read at `d03f5df` and stated BY CONTENT because brief 01 shifts line numbers in this file (it removes `fmtWhen`/`fmtDur` and shortens three handlers). Nothing is executed yet.

**Tier:** Execute = Sonnet, alone, under `cycles/virgin-cycle23/EXECUTOR-RULES.md`. STOP-ON-AMBIGUITY.

**Run order: AFTER brief 02** (needs `activityMenu.tsx`'s `MenuButton`/`ActivityMenu`, brief 01's `rideActions.ts`, `feedModel.ts`'s `sectorGapLabel`/`durationLabel`, `SectorRowModel.gapS`). Pre-flight: `grep -n "confirmDeleteRide" app/src/ui/RideDetailScreen.tsx` → 1 hit and `ls app/src/ui/activityMenu.tsx` exists, else STOP.

## Goal

The detail keeps every entry point (`request.source`: post-stop / rides / routes / results — the bottom primary button keeps its four labels), every action (Replay, Export GPX+, Delete, Ignore/Count, Make this the reference of this way, Make this the reference of a new route / Save as a new way on …, Save as free activity, Not a free activity) and all data, but is laid out as ONE continuous scroll on the page background: a slim top row with a round ‹ (back) and a round ⋯ (menu: Export GPX+, Ignore/Count, Delete), then the map FIRST (320 dp, in the map component's own bordered rounded frame, 16 dp margins), then name + date, lap time 34 pt in its tier colour + the rank line, Replay as the single full-width primary button, SECTORS as plain rows (label, time in tier colour, avg, gap to avg), ON THIS WAY as plain rows, then the applicable suggestion rows (plain rows with a › chevron), then (unchanged) the naming / gate cards when open, then the bottom primary button. No nested rounded boxes anywhere except the map frame. Tapping a SECTORS row highlights that stretch on the map in riderBlue (tap again to clear).

## 0. What the code does today (post-brief-01 tree; anchors by content)

- `app/src/ui/RideDetailScreen.tsx`:
  - imports: `import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`, `import { PaddockTheme, colors, radius } from './theme.ts';`, `import { dateTimeLabel, buildPbDetail } from './rideHistoryModel.ts';`, `import { ALL_YELLOW } from './sectorTrailModel.ts';`, `import { tierTextColour } from './tierColour.ts';` (must stay byte-identical: recordflow_suite pins it), after brief 01: `import { confirmDeleteRide, exportRideGpx, toggleIgnoreRide } from './rideActions.ts';`.
  - `function PbDetail(props: { wayId; lastRideId; todayTier; t })` with the hint line `<Text style={[st.hint, { color: t.textDim }]}>last {detail.ranking.length} on this way</Text>` and rows `st.pbRow` / `st.pbPos` / `st.pbNum`, and the pinned line `const todayColour = tierTextColour(todayTier, t);`.
  - state: `tick, fixes, replaying, canReplay, busy, exporting, meta, draft, naming, adjust, pickLabel`.
  - `const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : … 'BACK TO ACTIVITIES';`
  - the `replaying` early return `<ReplayScreen … detail={model} onClose={() => setReplaying(false)} />`.
  - the JSX: `<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>`, `<View style={styles.topBar}>` with `‹ BACK` / `ACTIVITY` / date; four branches `model.kind === 'route' ? (<View style={[st.card, …]}> … ) : model.referenceOf !== null ? (…) : model.kind === 'free' && model.free ? (…) : (…)`, each with ONE `<WayMapView … />` (route: `sectorColours=`/`leadColour=`, no `trail=`; the other three: `wayId={null}` + `trail={fixes ?? undefined}`); then `<Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>` + `styles.pillRow` with Replay / Export GPX+ / Delete / Ignore-Count, then the promote / offer / save-free / unsave-free `Pressable`s, then the `naming` and `adjust` cards, then `<Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.closeRide()}><Text …>{primaryLabel}</Text></Pressable>`.
  - styles `makeStyles(t)`: `topBar, backText, topTitle, topDate, secRow, secPos, secTime, secAvg, pillRow, exportBtn, busy, exportText, deleteBtn, promoteBtn, deleteText`; `st`: `h2, card, big, slimBtn, slimBtnText, pbDetail, hint, pbRow, pbPos, pbNum`.
- Pinned by tests (keep these EXACT substrings in RideDetailScreen.tsx): `loadReplayRider`, `canReplay`, `>ref</Text>` (recordflow_suite "Replay gated; ref marker kept"); `import { tierTextColour } from './tierColour.ts';`, ≥3 `tierTextColour(` calls, `[styles.secPos, { color: t.text }]`, `[styles.secTime, { color: tierTextColour(sec.tier, t) }]`, `[styles.secAvg, { color: t.textDim }]`, `todayTier={model.lapTier}`, `const todayColour = tierTextColour(todayTier, t);`, NOT `row.today ? t.accentText`, NOT `chipColors`, NOT `from './chips.tsx'`, NOT `function tierColour(` (cycle22 03); exactly 4 `<WayMapView` with the sectorColours/trail split and the regex `if \(model\.kind === 'route'\) \{\s*setFixes\(null\);\s*return;\s*\}` (cycle22 01); no `‖`; none of `personal best sectors`, `pbSectors`, `on file yet`, `not compared to anything`, `sector times not on file`, `recorded only`, `s.tower`, `— ref`, `no lap time on file`; no visible em dash. `tests/ui_strings_suite.ts` scans this file.
- `app/src/ui/rideDetailModel.ts` `:19-44` `RideDetailModel`, `:100-102` `sectorColoursFor`; `app/tests/ridedetail_suite.ts` imports `{ rankLineFor, rideDetailFor, sectorColoursFor }` dynamically at `:32`; last test ends at `:276`.
- `app/src/ui/feedModel.ts` (brief 01): `sectorGapLabel(gapS)`, `durationLabel(meta)`. `SectorRowModel.gapS` (brief 01).
- `app/src/ui/activityMenu.tsx` (brief 02): `ActivityMenu({ anchor, items, onClose })`, `MenuButton({ onOpen, style? })`, `MenuAnchor`, `MenuItem`.
- Allow-list entries for `src/ui/RideDetailScreen.tsx` after brief 01 (brief 01 moved the alert strings to rideActions.ts): `literal` `BACK TO ACTIVITIES`, `BACK TO RESULTS`, `BACK TO ROUTE`, `RECORD ANOTHER`, `Count in ranking`, `Ignore in ranking`, `Export GPX+`, `Make this the reference of a new route`, `Save as a new way on {…}`, `this route`, `There are no past results on this way yet.` (long), `rides/{…}.events.jsonl`, `saved as a free activity`, and the frozen `legacy` promote strings; `alert-title` `Could not create the route`, `Could not save the gates`, `Could not set the reference`, `Overwrite the reference of "{…}"?`, `That way already exists`; `alert-body` `Pick it on RECORD next time instead of adding it again.` + the legacy one; `prop:text` `Overwrite`, `Cancel`; `text` `ACTIONS`, `ACTIVITY`, `Delete`, `FREE ACTIVITY`, `Make this the reference of this way`, `Not a free activity`, `ON THIS WAY`, `Replay`, `SECTORS`, `Save as free activity`, `last`, `on this way`, `ref`, `reference activity of`, `‹ BACK`.

## 1. Changes

### 1a. `app/src/ui/rideDetailModel.ts` — sector highlight (pure)

Append at the end of the file:
```ts
/** virgin-cycle23 brief 03: the map's sectorColours while ONE sector is selected
 * on the detail page — that sector in `colour` (riderBlue: selection, never a
 * verdict, same rule as the gate-adjust ring), every other slot null so the
 * base line shows through. Gate-indexed like storedSectorColours (slot i =
 * sector i). [] when nothing is selected (caller falls back to the verdict colours). */
export function sectorHighlightColours(
  rows: readonly { index: number }[], selected: number | null, colour: string,
): (string | null)[] {
  if (selected === null) return [];
  const n = rows.reduce((m, r) => Math.max(m, r.index), 0) + 1;
  const out: (string | null)[] = new Array<string | null>(n).fill(null);
  if (selected >= 1 && selected < n) out[selected] = colour;
  return out;
}
```

### 1b. `app/src/ui/RideDetailScreen.tsx` — the redesign

Keep everything above the JSX (effects, handlers, offer/draft logic, `confirmPromote`, `onNamingSave`, `onSaveFree`, `onUnsaveFree`, `onAdjustSave`, `onToggleIgnore`, `onExport`, `onDelete`) UNCHANGED except:

1. Imports: add `import { FREE_RIDE_ROW_NAME } from './rideHistoryModel.ts';` (extend the existing rideHistoryModel import: `import { FREE_RIDE_ROW_NAME, dateTimeLabel, buildPbDetail } from './rideHistoryModel.ts';`), `import { sectorHighlightColours } from './rideDetailModel.ts';` (extend the existing `rideDetailFor` import), `import { durationLabel, sectorGapLabel } from './feedModel.ts';`, `import { ActivityMenu, MenuButton, type MenuAnchor, type MenuItem } from './activityMenu.tsx';`. `Alert` stays imported (naming/promote alerts).
2. State: add `const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);` and `const [selectedSector, setSelectedSector] = useState<number | null>(null);`. Remove the `exporting` state and its two uses (`setExporting` inside `onExport` — the handler becomes `async function onExport() { if (!meta) return; await exportRideGpx(meta); }`).
3. `PbDetail`: delete the hint `<Text …>last {detail.ranking.length} on this way</Text>` line (and the `st.hint` style). Rows become full-width plain rows: `st.pbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 }` — add `{ borderTopColor: t.cardBorder }` inline on each row (PbDetail receives `t`). The `today` row additionally gets `{ backgroundColor: t.card }`. Keep `const todayColour = tierTextColour(todayTier, t);` and the three coloured cells exactly as they are. `st.pbDetail` → `{ paddingBottom: 4 }`.
4. Menu items (same `label:` literal shape as brief 02 so the scanner sees `prop:label`):
   ```ts
   const menuItems: MenuItem[] = [];
   if (meta) menuItems.push({ label: 'Export GPX+', onPress: () => void onExport() });
   if (model.canToggleIgnore) {
     menuItems.push(model.ignored
       ? { label: 'Count in ranking', onPress: () => void onToggleIgnore() }
       : { label: 'Ignore in ranking', onPress: () => void onToggleIgnore() });
   }
   if (meta) menuItems.push({ label: 'Delete', onPress: onDelete });
   ```
5. Replace the whole returned JSX (from `<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>` to its closing `</ScrollView>`) with:
   ```tsx
   <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
     <View style={styles.topBar}>
       <Pressable style={styles.roundBtn} onPress={() => tabNav.closeRide()} hitSlop={6}>
         <Text style={[styles.roundGlyph, { color: t.text }]}>‹</Text>
       </Pressable>
       <MenuButton style={styles.roundBtn} onOpen={setMenuAnchor} />
     </View>

     {model.kind === 'route' ? (
       <>
         <View style={styles.mapWrap}>
           <WayMapView
             variant="browse"
             wayId={model.wayId}
             lat={null}
             lon={null}
             zoom={1}
             height={320}
             showRider={false}
             // WP-K / virgin-cycle22 01 comments kept from the previous version (copy them here).
             // virgin-cycle23 brief 03: while a SECTORS row is selected the map shows only that
             // stretch, in riderBlue (selection, not a verdict — the gate-adjust ring's rule).
             sectorColours={selectedSector !== null
               ? sectorHighlightColours(model.sectorRows, selectedSector, colors.riderBlue)
               : (s.sectorColours ? model.sectorColours : ALL_YELLOW)}
             leadColour={selectedSector === null && s.sectorColours ? colors.grey : undefined}
           />
         </View>
         <View style={styles.pad}>
           <Text style={[styles.name, { color: t.text }]}>{wayLabelIn(currentCatalog(), model.wayId as string)}</Text>
           <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
           <Text style={[st.big, { color: tierTextColour(model.lapTier, t) }, model.ignored && styles.dim]}>{model.lapLabel}</Text>
           <Text style={[styles.rankLine, { color: t.text2 }]}>{model.rankLine}</Text>
           {model.referenceOf ? (
             <Text style={[styles.rankLine, { color: t.textDim }]}>
               reference activity of {wayLabelIn(currentCatalog(), model.referenceOf.id)}
             </Text>
           ) : null}
         </View>
       </>
     ) : model.referenceOf !== null ? (
       <>
         {/* virgin-cycle13 comment kept (ride founded a way, own result unmatched) */}
         <View style={styles.mapWrap}>
           <WayMapView variant="browse" wayId={null} lat={null} lon={null} zoom={1} height={320} showRider={false} trail={fixes ?? undefined} />
         </View>
         <View style={styles.pad}>
           <Text style={[styles.name, { color: t.text }]}>{wayLabelIn(currentCatalog(), model.referenceOf.id)}</Text>
           <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
           <Text style={[st.big, { color: t.accentText }]}>{durationLabel(meta)}</Text>
           <Text style={[styles.rankLine, { color: t.textDim }]}>ref</Text>
         </View>
       </>
     ) : model.kind === 'free' && model.free ? (
       <>
         <View style={styles.mapWrap}>
           <WayMapView variant="browse" wayId={null} lat={null} lon={null} zoom={1} height={320} showRider={false} trail={fixes ?? undefined} />
         </View>
         <View style={styles.pad}>
           <Text style={[styles.name, { color: t.text }]}>{FREE_RIDE_ROW_NAME}</Text>
           <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
           <Text style={[st.big, { color: t.accentText }]}>{durationLabel(meta)}</Text>
           <Text style={[styles.rankLine, { color: t.textDim }]}>{pickLabel ?? 'saved as a free activity'}</Text>
         </View>
       </>
     ) : (
       <>
         {/* virgin-cycle13 comment kept (pickLabel fallback) */}
         <View style={styles.mapWrap}>
           <WayMapView variant="browse" wayId={null} lat={null} lon={null} zoom={1} height={320} showRider={false} trail={fixes ?? undefined} />
         </View>
         <View style={styles.pad}>
           {pickLabel !== null ? <Text style={[styles.name, { color: t.text }]}>{pickLabel}</Text> : null}
           <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
           <Text style={[st.big, { color: t.accentText }]}>{durationLabel(meta)}</Text>
         </View>
       </>
     )}

     {replayWayId !== null && canReplay ? (
       <View style={styles.pad}>
         <Pressable style={[styles.replayBtn, { backgroundColor: t.accent }]} onPress={() => setReplaying(true)}>
           <Text style={[styles.replayText, { color: t.onAccent }]}>Replay</Text>
         </Pressable>
       </View>
     ) : null}

     {model.kind === 'route' ? (
       <>
         <Text style={[st.h2, styles.h2, { color: t.textDim }]}>SECTORS</Text>
         {model.sectorRows.map((sec) => (
           // virgin-cycle22 03 comment kept. virgin-cycle23: a row is a Pressable; tapping it
           // selects the sector on the map (tap again clears); gap = this time vs the sector average.
           <Pressable key={sec.index}
             style={[styles.secRow, { borderTopColor: t.cardBorder }, selectedSector === sec.index && { backgroundColor: t.card }]}
             onPress={() => setSelectedSector((cur) => (cur === sec.index ? null : sec.index))}>
             <Text style={[styles.secPos, { color: t.text }]}>{sec.label}</Text>
             <Text style={[styles.secTime, { color: tierTextColour(sec.tier, t) }]}>{sec.timeLabel}</Text>
             <Text style={[styles.secAvg, { color: t.textDim }]}>{sec.avgLabel}</Text>
             <Text style={[styles.secGap, { color: t.textDim }]}>{sectorGapLabel(sec.gapS)}</Text>
           </Pressable>
         ))}
         <Text style={[st.h2, styles.h2, { color: t.textDim }]}>ON THIS WAY</Text>
         <PbDetail wayId={model.wayId as string} lastRideId={request.rideId} todayTier={model.lapTier} t={t} />
       </>
     ) : null}

     {model.promoteTarget !== null ? (
       <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={confirmPromote}>
         <Text style={[styles.sugText, { color: t.text }]}>Make this the reference of this way</Text>
         <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
       </Pressable>
     ) : null}
     {offer !== null && !naming && adjust === null ? (
       <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={() => setNaming(true)}>
         <Text style={[styles.sugText, { color: t.text }]}>{offerLabel}</Text>
         <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
       </Pressable>
     ) : null}
     {model.kind === 'none' && model.referenceOf === null && !naming && adjust === null ? (
       <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={onSaveFree}>
         <Text style={[styles.sugText, { color: t.text }]}>Save as free activity</Text>
         <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
       </Pressable>
     ) : null}
     {model.kind === 'free' ? (
       <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={onUnsaveFree}>
         <Text style={[styles.sugText, { color: t.text }]}>Not a free activity</Text>
         <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
       </Pressable>
     ) : null}

     {naming && offer !== null ? ( <View style={styles.pad}> …the existing <RouteNamingCard …/> block, props unchanged… </View> ) : null}
     {adjust !== null ? ( <View style={styles.pad}> …the existing <GateAdjustCard …/> block, props unchanged… </View> ) : null}

     <Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.closeRide()}>
       <Text style={[st.slimBtnText, { color: t.onAccent }]}>{primaryLabel}</Text>
     </Pressable>
     <ActivityMenu anchor={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
   </ScrollView>
   ```
   Copy the existing explanatory comments of each map (WP-K two-line pattern, virgin-cycle22 01 "no trail here", virgin-cycle13 pick-label fallback) into the new positions — they are documentation the Inspect pass reads; do not drop them. The ‹ and › glyphs have no letters (not scanned).
6. The fixes effect keeps `if (model.kind === 'route') { setFixes(null); return; }` byte-identical (pinned).
7. Also reset the sector selection when the ride changes: in the existing `model` memo's neighbourhood add `useEffect(() => { setSelectedSector(null); }, [request.rideId, tick]);`.
8. Styles — replace `makeStyles` and `st` bodies:
   ```ts
   const makeStyles = (t: PaddockTheme) => StyleSheet.create({
     topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 52 },
     roundBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.cardBorder, backgroundColor: t.race.card, alignItems: 'center', justifyContent: 'center' },
     roundGlyph: { fontSize: 26, lineHeight: 28, fontWeight: '700' },
     mapWrap: { marginHorizontal: 16 },
     pad: { paddingHorizontal: 16 },
     name: { fontSize: 22, fontWeight: '800', marginTop: 16 },
     date: { fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
     rankLine: { fontSize: 13, marginTop: 2 },
     dim: { opacity: 0.45 },
     replayBtn: { marginTop: 16, paddingVertical: 14, borderRadius: radius.btn, alignItems: 'center' },
     replayText: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
     h2: { paddingHorizontal: 16, marginTop: 28, marginBottom: 8 },
     secRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 },
     secPos: { width: 44, fontSize: 15, fontWeight: '700' },
     secTime: { width: 72, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
     secAvg: { flex: 1, fontSize: 13.5, fontVariant: ['tabular-nums'] },
     secGap: { minWidth: 48, fontSize: 15, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
     sugRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1 },
     sugText: { fontSize: 15, fontWeight: '700', flex: 1 },
     sugChev: { fontSize: 18, marginLeft: 8 },
     busy: { opacity: 0.5 },
   });

   const st = StyleSheet.create({
     h2: { fontSize: 12, letterSpacing: 2 },
     big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 10 },
     slimBtn: { alignSelf: 'center', marginTop: 24, marginBottom: 4, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.btn },
     slimBtnText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
     pbDetail: { paddingBottom: 4 },
     pbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 },
     pbPos: { width: 44, fontSize: 15, fontWeight: '700' },
     pbNum: { fontVariant: ['tabular-nums'], textAlign: 'right', width: 72, fontSize: 15 },
   });
   ```
   Removed styles: `backText, topTitle, topDate, pillRow, exportBtn, exportText, deleteBtn, promoteBtn, deleteText, card, hint`. `grep -n "st.card\|styles.exportBtn\|styles.deleteBtn\|st.hint" app/src/ui/RideDetailScreen.tsx` → nothing. No hex literal anywhere in the file.
9. Header comment: add one line "virgin-cycle23 brief 03: redesigned as one flat scroll — map first in its frame, text on the page background, SECTORS/ON THIS WAY/suggestions as plain rows, quick actions in the ⋯ menu (activityMenu.tsx), sector tap highlights the stretch on the map."

### 1c. `app/src/ui/RideDetailScreen.tsx` ⇄ `App.tsx`

No App.tsx change: hardware BACK already closes the detail (`App.tsx :132-135`), and brief 02's module-scope offset restores the feed.

## 2. Tests

1. `app/tests/ridedetail_suite.ts`: extend the dynamic import at `:32` to `const { rankLineFor, rideDetailFor, sectorColoursFor, sectorHighlightColours } = await import('../src/ui/rideDetailModel.ts');` and append:
   - `'virgin-cycle23 03: sectorHighlightColours — only the selected sector carries the colour, gate-indexed, slot 0 never'`: rows [{index:1},{index:2},{index:3},{index:4}], selected 2, colour 'X' → `[null,null,'X',null,null]` (length 5); selected 4 → slot 4 'X'; selected 0 → all null (length 5); selected 9 → all null.
   - `'virgin-cycle23 03: sectorHighlightColours — null selection = [] so the caller falls back to the verdict colours'`: `(rows, null, 'X')` → length 0.
2. `app/tests/recordflow_suite.ts`: add right after brief 02's `'virgin-cycle23 02: …'` test:
   ```ts
   test('virgin-cycle23 03: the activity detail is one flat scroll — map first, no card boxes, Replay the single primary, ⋯ menu for Export/Ignore/Delete, sector rows tap-to-highlight, back labels per source kept', () => {
     const det = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RideDetailScreen.tsx'), 'utf8');
     assert(!det.includes('st.card') && !det.includes('ACTIONS') && !det.includes('‹ BACK') && !det.includes('>ACTIVITY<'), 'old header/card/ACTIONS block gone');
     assert(det.includes('<MenuButton') && det.includes('<ActivityMenu'), 'the ⋯ menu');
     for (const l of ["label: 'Export GPX+'", "label: 'Ignore in ranking'", "label: 'Count in ranking'", "label: 'Delete'"]) assert(det.includes(l), `menu item ${l}`);
     for (const l of ["'RECORD ANOTHER'", "'BACK TO ROUTE'", "'BACK TO RESULTS'", "'BACK TO ACTIVITIES'"]) assert(det.includes(l), `back label ${l} kept`);
     assert(det.includes('sectorHighlightColours(model.sectorRows, selectedSector, colors.riderBlue)'), 'selected sector highlighted in riderBlue');
     assert(det.includes('sectorGapLabel(sec.gapS)'), 'gap to average on each sector row');
     assert((det.match(/>Replay<\/Text>/g) ?? []).length === 1 && det.includes('styles.replayBtn'), 'Replay is the one primary button');
     assert(!det.includes('last {detail.ranking.length} on this way'), 'ON THIS WAY hint line gone');
     assert(det.includes('height={320}') && !det.includes('height={300}'), 'detail map is 320 dp');
     assert(!/#[0-9A-Fa-f]{3,8}\b/.test(det.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no hard-coded hex');
   });
   ```
3. Run order check: the pinned tests listed in §0 must still pass unchanged — do not edit them. If one fails, STOP and quote it (it means the layout above broke a pinned substring; report, do not work around).

## 3. Visible text (all in `src/ui/RideDetailScreen.tsx`)

| kind | exact text | status | action |
|---|---|---|---|
| text | `ACTIONS` | REMOVED | remove entry |
| text | `ACTIVITY` | REMOVED | remove entry |
| text | `‹ BACK` | REMOVED | remove entry |
| text | `FREE ACTIVITY` | REMOVED (name is the shared "Free activity" constant) | remove entry |
| text | `last` | REMOVED (hint line) | remove entry |
| text | `on this way` | REMOVED (hint line) | remove entry |
| text → prop:label | `Delete` | MOVED into the menu | edit the entry's `kind` to `prop:label` |
| literal → prop:label | `Export GPX+` | MOVED into the menu | edit `kind` |
| literal → prop:label | `Ignore in ranking` | MOVED into the menu | edit `kind` |
| literal → prop:label | `Count in ranking` | MOVED into the menu | edit `kind` |
| text | `Replay`, `SECTORS`, `ON THIS WAY`, `Make this the reference of this way`, `Save as free activity`, `Not a free activity`, `ref`, `reference activity of` | unchanged | none |
| literal | the four back labels, `saved as a free activity`, offer labels, `this route`, promote strings (legacy), `rides/{…}.events.jsonl` | unchanged | none |

No NEW rider-facing text. If the suite names anything else: STOP. Scanner facts (RULINGS.md R3): a string is keyed `file|kind|text` and de-duplicated per file, so a `text`/`literal` entry only goes STALE once NO occurrence of that key is left in RideDetailScreen.tsx (e.g. if `'Export GPX+'` still appeared as a bare literal anywhere, the suite would report the new `prop:label` as UNLISTED and the old entry as NOT stale — then the brief's code has a leftover, find it, do not add an entry). Sorted entries: `tests/ui_strings_suite.ts:212` asserts (file, kind, text) code-unit order, so a `kind` edit MOVES the entry: the four `prop:label` entries land after RideDetailScreen's last `literal` entry and before `prop:text | Cancel`, ordered `Count in ranking`, `Delete`, `Export GPX+`, `Ignore in ranking`. One python read-modify-write (`json.load` → 6 removals + 4 kind edits → `entries.sort(key=lambda e: (e['file'], e['kind'], e['text']))` → `json.dump(indent=2, ensure_ascii=False)` + trailing newline; round-trips byte-for-byte). After brief 01, `prop:text | Cancel` and `prop:text | Overwrite` stay in RideDetailScreen.tsx (brief 01 appended a separate rideActions.ts `Cancel`). (If the scanner records `Delete`/`Export GPX+` under a different kind than `prop:label` because of code shape, STOP and report the exact kind it printed — do not guess.)

## 4. Decisions already made

- Back and menu sit in a 52 dp row ABOVE the map, not floating over it: the map's own zoom bar occupies the top-right corner of the frame and the map must stay fully gesturable (Nathan: "over/near it" — near).
- The map keeps its bordered rounded frame (preview B; full-bleed deferred). 320 dp.
- Plain kinds (free / none / reference-without-result) show the wall-clock duration as the 34 pt hero (never a distance; '' when it cannot be derived), in `t.accentText` like the feed's plain cards.
- Sector gap is dim text (the time already carries the verdict colour; a second colour on the gap would be noise), ASCII sign, rounded seconds.
- Sector highlight = riderBlue on the selected sector only (selection colour, as the gate-adjust ring), other sectors transparent while selected; verdict colours return when cleared. Cheap: no WayMapView change.
- Suggestion rows have no section header (fewer words); each is a plain row with a › chevron.
- `exporting` state dropped (a menu row cannot show it; the alert reports the outcome). `busy` stays on the suggestion rows.
- The four WayMapView branches are kept (one map per kind) rather than unified, to keep virgin-cycle22 01's pinned test valid without rewriting it.

## 5. Acceptance

1. Pre-flight passes; tsc exit 0; run.ts 0 FAIL, count = post-brief-02 count + 3 (2 ridedetail + 1 recordflow).
2. `git diff -- app/tests/ui-strings.allow.json`: 6 entries removed, 4 `kind` edits (the four entries move to their sorted slot, reason/since/by untouched), nothing appended; entry count = before − 6.
3. `grep -c "<WayMapView" app/src/ui/RideDetailScreen.tsx` → 4; `grep -n "height={320}" …` → 4 hits.
4. `grep -n "st.card\|pillRow\|exportBtn\|deleteBtn\|'ACTIONS'\|>ACTIONS<\|‹ BACK" app/src/ui/RideDetailScreen.tsx` → nothing.
5. `git status --short`: `M app/src/ui/RideDetailScreen.tsx`, `M app/src/ui/rideDetailModel.ts`, `M app/tests/ridedetail_suite.ts`, `M app/tests/recordflow_suite.ts`, `M app/tests/ui-strings.allow.json` plus the earlier briefs' files.

## 6. Out of scope

ReplayScreen, RouteNamingCard, GateAdjustCard internals; App.tsx; any store change; full-bleed map (deferred by Nathan).

## 7. For the coordinator (OPEN-ITEMS line, put in the report)

"virgin-cycle23 brief 03 (detail), on-device checks owed: (a) Android edge swipe-back vs the 16 dp map margin; (b) sector row tap highlights the stretch in blue on the map and a second tap clears it; (c) ⋯ menu anchors under the button on both themes; (d) the bottom primary button still reads RECORD ANOTHER / BACK TO ROUTE / BACK TO RESULTS / BACK TO ACTIVITIES per entry point; (e) night contrast of rank line / avg / gap text on the bare background."

## 8. Stop-on-ambiguity / report

As EXECUTOR-RULES.md. Quote every allow-list edit, the test counts, `git status --short`, the §7 paragraph.
