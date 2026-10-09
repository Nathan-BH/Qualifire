# Brief 6 — Every map edge to edge (the ACTIVITIES rule everywhere)

Written by the Plan tier (Fable) 2026-10-08 ~02:10 UTC from `10-plan.md` §6 and digest 05; every anchor re-read in the working tree (suite baseline `940 tests: 937 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md`. **Status: APPROVED (Nathan 2026-10-09 00:24) — read the AMENDMENT at the end first (rulings 6.1 + 6.2: detail map AND gate editor bleed). Runs LAST of all nine briefs, after brief 8-9** (cycle26 04 is committed) (both edit `wayMapView.tsx` and the map mounts; re-read every §2 anchor by content first — line numbers are from before those briefs).

## 0. Rules
- STOP-ON-AMBIGUITY → `cycles/virgin-cycle27/12-brief-06-executor-report.md` `## STOPPED`.
- ~~BLOCKED UNTIL NATHAN RULES~~ **RULED 2026-10-08 (6.1 = a, 6.2 = b) — see the AMENDMENT section A0; kept for the record:**
  - Q6.1 The ACTIVITY DETAIL page map: cycle23 kept it framed on purpose (`cycles/virgin-cycle23/00-nathan-decisions.md:39`; `brief-03-detail-page-redesign.md:304, :322` "full-bleed deferred"). (a) it bleeds too — Nathan's "all maps" supersedes [recommended; this brief]; (b) keep it framed (then skip §3.4).
  - Q6.2 The GATE EDITOR map lives inside a bordered card with its chip row (`gateAdjustCard.tsx:140-147, :215-218`). (a) keeps its framed card — an editor tool, not a map page [recommended; this brief does NOT touch it]; (b) it bleeds too (then the coordinator supplies the card-border amendment; do not improvise).
- Nathan's words (2026-10-08 01:01): "for consistency, all maps should be edge to edge now, as it is already the case for the ACTIVITIES maps". "Edge to edge" = the map's horizontal extent reaches both screen edges with no border and no corner radius (`WayMapView`'s `bleed` frame). Text, pills, panels around the map keep their gutters.
- **Rider-facing text: ZERO strings**; allow-list diff empty.
- Mechanism only: pass `bleed` at each mount and cancel the parent's horizontal inset with a wrapper `marginHorizontal: -<inset>`. Do NOT change `WayMapView`'s frame styles (`frame` / `frameBleed`) or its default; do NOT change any inset that affects text. Never delete; no commit; no publish; strip-only TS; `GIT_OPTIONAL_LOCKS=0`.

## 1. Purpose
Today only the ACTIVITIES cards (`activityCard.tsx:95 bleed`) and the MAP tab (`catalogMapView.tsx:364` frame, no border) run edge to edge; every other `WayMapView` mount takes the default frame (radius 16, 1 dp border) inside a parent inset of 12 / 16 / 20 dp. The overlays (zoom bar `right: 6, top: 6`, credit `i` `right: 6, bottom: 6`, badges `left: 6, bottom: 6`) are positioned inside the frame and therefore end up 6 dp from the screen edge — the same as on the ACTIVITIES cards, which Nathan has seen.

## 2. Verified anchors (2026-10-08 ~01:40 UTC; pre-cycle26-04 / pre-brief-8-9 line numbers — match by content)
- `app/src/ui/wayMapView.tsx:238` `bleed?: boolean;` `:317` and `:712` `props.bleed ? st.frameBleed : st.frame,` `:1033-1034` the two frame styles. Unchanged by this brief.
- `app/src/ui/RecordScreen.tsx`: armed map `:1269-1270` `<View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>` / `<WayMapView` (inside `styles.raceColumn`, `paddingHorizontal: 12` at `:1722-1725`); running map `:1417-1418` same wrapper + `<WayMapView`; setup map `:1537-1548` `<View style={{ alignSelf: 'stretch' }}>` / `<WayMapView … height={330} />` inside the ScrollView whose `contentContainerStyle={styles.content}` has `padding: 20` (`:1705-1708`).
- `app/src/ui/ReplayScreen.tsx:230-232` `<View style={styles.raceColumn}>` / `<View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>` / `<WayMapView`; `raceColumn` `paddingHorizontal: 12` (`:280-283`).
- `app/src/ui/DemoScreen.tsx:660-667` `<View style={styles.raceColumn}>` / `<View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>` / two `<WayMapView` mounts (`:663`, `:666`); `raceColumn` `paddingHorizontal: 12` (`:856-859`). The DEMO gate-adjust card at `:726` is `GateAdjustCard` (Q6.2 — untouched).
- `app/src/ui/RideDetailScreen.tsx`: four `<View style={styles.mapWrap}>` at `:449, :498, :510, :526`, each wrapping a `<WayMapView … height={320} …>`; `:640` `mapWrap: { marginHorizontal: 16 },`; ScrollView `:439` has `paddingBottom: 40` only.
- `app/src/ui/CatalogDetailScreen.tsx:99` `<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>`; place map `:235-236` `<View style={{ marginTop: 12 }}>` / `<WayMapView variant="browse" place={…}` (height 260); way map `:406-408` `<View style={{ marginTop: 16 }}>` … `<WayMapView variant="browse" wayId={r.refLineId} lat={null} lon={null} zoom={1} height={260} showRider={false} />`.
- `app/src/ui/gateAdjustCard.tsx:146-147` `<View style={st.mapWrap}>` / `<WayMapView` — **not touched** (Q6.2 a).
- `app/tests/recordflow_suite.ts:377-388` test `'virgin-cycle23 04: WayMapView `bleed` is opt-in — default frame untouched, only the feed card passes it'` — loops over `['RecordScreen.tsx', 'ReplayScreen.tsx', 'CatalogDetailScreen.tsx', 'DemoScreen.tsx', 'gateAdjustCard.tsx', 'RideDetailScreen.tsx']` asserting NO mount passes `bleed`.

## 3. Edits (each: add `bleed` to the mount, cancel the inset on its wrapper)
Use one comment at the first edit of each file: `// virgin-cycle27 06 (Nathan 2026-10-08): the map runs edge to edge like the ACTIVITIES cards — bleed frame, parent inset cancelled on the map only.`

### 3.1 `RecordScreen.tsx`
- Armed (`:1269`): wrapper → `<View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch', marginHorizontal: -12 }}>`; add `bleed` to that `<WayMapView`.
- Running (`:1417`): same wrapper change, `bleed` on the mount.
- Setup (`:1537`): wrapper → `<View style={{ alignSelf: 'stretch', marginHorizontal: -20 }}>`; `bleed` on the mount (`height={330}` stays).
### 3.2 `ReplayScreen.tsx:231-232`: wrapper gets `marginHorizontal: -12`; `bleed` on the mount.
### 3.3 `DemoScreen.tsx:661-667`: wrapper gets `marginHorizontal: -12`; `bleed` on BOTH mounts (`:663`, `:666`). The DEMO idle chooser (`:806` ScrollView) has no map; `GateAdjustCard` untouched.
### 3.4 `RideDetailScreen.tsx` (Q6.1 a): `:640` `mapWrap: { marginHorizontal: 16 },` → `mapWrap: { marginHorizontal: 0 },` (keep the style so the four wrappers stay), add `bleed` to all four mounts (`:450`, `:499`, `:511`, `:527`).
### 3.5 `CatalogDetailScreen.tsx`: place map wrapper `:235` → `<View style={{ marginTop: 12, marginHorizontal: -16 }}>`; way map wrapper `:406` → `<View style={{ marginTop: 16 }}>` stays but wrap ONLY the `<WayMapView` at `:408` in `<View style={{ marginHorizontal: -16 }}>…</View>` (the `WAY ·` title and the rows below keep the 16 dp gutter); `bleed` on both mounts.
### 3.6 Nothing else
No change to `wayMapView.tsx`, `catalogMapView.tsx`, `activityCard.tsx`, `gateAdjustCard.tsx`, `feedModel.ts`, any text padding, `styles.content` / `raceColumn` / `mapWrap` beyond §3.4.

## 4. Tests — `tests/recordflow_suite.ts:377-388`
Rewrite the test: name `'virgin-cycle27 06: every WayMapView mount bleeds edge to edge (bleed prop), except the gate editor's framed card; the two frame styles are unchanged'`. Keep the four asserts on `wayMapView.tsx` (`bleed?: boolean;`, two frame sites, no unconditional `st.frame`, both style strings pinned). Replace the loop with:
```ts
  for (const f of ['RecordScreen.tsx', 'ReplayScreen.tsx', 'CatalogDetailScreen.tsx', 'DemoScreen.tsx', 'RideDetailScreen.tsx', 'activityCard.tsx']) {
    const els = read('src', 'ui', f).match(/<WayMapView[\s\S]*?\/>/g) ?? [];
    assert(els.length > 0, `${f} mounts WayMapView`);
    for (const el of els) assert(/\bbleed\b/.test(el), `${f} must pass bleed (virgin-cycle27 06): ${el.slice(0, 60)}`);
  }
  const gate = read('src', 'ui', 'gateAdjustCard.tsx').match(/<WayMapView[\s\S]*?\/>/g) ?? [];
  assert(gate.length === 1 && !/\bbleed\b/.test(gate[0]), 'the gate editor map keeps its framed card (Q6.2 a)');
  assert(read('src', 'ui', 'RideDetailScreen.tsx').includes('mapWrap: { marginHorizontal: 0 },'), 'detail page inset cancelled (Q6.1 a, supersedes cycle23)');
  for (const [f, n] of [['RecordScreen.tsx', 3], ['ReplayScreen.tsx', 1], ['DemoScreen.tsx', 1], ['CatalogDetailScreen.tsx', 2]] as const) {
    const neg = (read('src', 'ui', f).match(/marginHorizontal: -(12|16|20)/g) ?? []).length;
    assert(neg === n, `${f}: ${n} map wrapper(s) cancel the parent inset, got ${neg}`);
  }
```
(Note `DemoScreen.tsx` has ONE wrapper for two mounts → 1.) The `:369-375` card test stays.

## 5. Acceptance
1. Suite: count unchanged (rewritten test, no new one), 0 FAIL. `tsc` exit 0 (`12-brief-06-tsc.log`).
2. `git diff --stat`: `RecordScreen.tsx`, `ReplayScreen.tsx`, `DemoScreen.tsx`, `RideDetailScreen.tsx`, `CatalogDetailScreen.tsx`, `tests/recordflow_suite.ts`. Allow-list diff empty. `wayMapView.tsx` and `gateAdjustCard.tsx` NOT in the diff (beyond earlier briefs' hunks).
3. `grep -c "bleed" src/ui/RecordScreen.tsx` ≥ 3, `ReplayScreen.tsx` ≥ 1, `DemoScreen.tsx` ≥ 2, `RideDetailScreen.tsx` ≥ 4, `CatalogDetailScreen.tsx` ≥ 2; `gateAdjustCard.tsx` 0.

## 6. What this changes on Nathan's phone (JS-only, OTA)
The RECORD setup / armed / running maps, REPLAY, DEMO's running map, the activity detail map and the place / way maps on the ROUTES detail page all reach both screen edges with no border and no rounded corners; the zoom bar and the `i` sit 6 dp from the edge like on ACTIVITIES. The gate editor keeps its card. Panels, titles, pills and the text around each map keep their gutters. Only a phone shows whether a bleeding map next to a 20 dp-padded setup form reads right — Nathan judges; the revert is per file.

## 7. Rollback
Per file: drop `bleed` and the negative margin; `mapWrap` back to 16; restore the test. No data, no native.

## 8. Report
`12-brief-06-executor-report.md`: files, counts, tsc, allow-list diff (empty), any STOP. OPEN-ITEMS line: "Maps edge to edge (cycle27 brief 06) — on-device: every screen listed in §6, day + night, notch/side insets, overlay buttons tappable at the edge."


---

# AMENDMENT (Fable, 2026-10-09 ~22:50 UTC) — rulings 6.1 + 6.2: the DETAIL map bleeds (§3.4 stands) AND the GATE EDITOR map bleeds too. Status: APPROVED (Nathan 2026-10-09 00:24: execute all briefs). Runs LAST in the cycle order (`10-plan.md` §15), after brief 8-9.

This amendment is part of the brief; execute §§0-5 above AND this section in one run. Where the two conflict, THIS section wins. Anchors re-read 2026-10-09 ~22:30 UTC (cycle26 brief 04 IS committed in `a7834cd`/`c0eaacf`; `wayMapView.tsx` frame anchors unchanged: `bleed?: boolean;` `:240`, `props.bleed ? st.frameBleed : st.frame,` at `:327` and `:729`). Brief 8-9 edits the zoom bar of `wayMapView.tsx` and `catalogMapView.tsx` only — no mount; your §2 mount anchors are unaffected by it but re-read by content anyway.

## A0. Rulings now in force (replace §0's BLOCKED block — nothing is blocked)
- **Q6.1 = (a)** the activity DETAIL map bleeds (Nathan: "yes"; supersedes cycle23's framed-map decision). §3.4 executes as written.
- **Q6.2 = (b)** the GATE EDITOR map bleeds too (Nathan: "yes"). §2's "not touched" note and §3.6's exclusion of `gateAdjustCard.tsx` are VOID; A2 below is the card-border amendment the brief said the coordinator would supply.
- **Fable ruling on HOW the editor bleeds (reasons, not open):** the editor card keeps its background, padding, title, chips and pads exactly as they are; it loses its 1 dp border and corner radius (a bleeding map cannot cut through a framed card — the same reason the ACTIVITIES cards have "no frame of their own", `recordflow_suite.ts:371`). The map wrapper cancels the card's own 16 dp padding PLUS the inset of whichever screen mounts the card, passed in as a new numeric prop `mapInset` (each of the four mounts sits in a different inset: 12 / 12 / 16 / 16). `mapInset` is REQUIRED on the prop type so a future mount cannot forget it.

## A1. Extra anchors (verified 2026-10-09)
- `app/src/ui/gateAdjustCard.tsx:42` `export interface GateAdjustCardProps {` … `:62` `  mapHeight?: number;`; `:139` `    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>`; `:145-146` `      <View style={st.mapWrap}>` / `        <WayMapView` (props through `:154` `/>`; `showRider={false}` at `:151`); `:215` `  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },`; `:218` `  mapWrap: { marginTop: 10 },`.
- The four mounts and their parent horizontal insets:
  - `RecordScreen.tsx:1335` `<GateAdjustCard` — inside `<View style={styles.raceColumn}>` (`paddingHorizontal: 12`, `:1723-1726`) → `mapInset={12}`.
  - `DemoScreen.tsx:727` `<GateAdjustCard` — inside `styles.raceColumn` (`paddingHorizontal: 12`, `:857-860`) → `mapInset={12}`.
  - `RideDetailScreen.tsx:617` `<GateAdjustCard` — inside `<View style={styles.pad}>` (`pad: { paddingHorizontal: 16 }`, `:642`) → `mapInset={16}`.
  - `GateAdjustScreen.tsx:112` `<GateAdjustCard` — inside the ScrollView `contentContainerStyle={{ padding: 16, paddingBottom: 40 }}` (`:103`) → `mapInset={16}`.
  Confirm each by reading the enclosing JSX upward to the nearest horizontal padding; a mount whose inset you cannot establish → STOP.
- `tests/recordflow_suite.ts:377-388` (the test §4 rewrites): its loop lists `gateAdjustCard.tsx` — the rewrite in §4 must now INCLUDE it in the bleed loop (A3).

## A2. Extra edits
1. `gateAdjustCard.tsx` props: after `:62` `mapHeight?: number;` add
```ts
  /** virgin-cycle27 06 (Nathan 2026-10-08, ruling 6.2): the editor map runs edge to edge like every
   * map. The horizontal inset of the SCREEN that mounts this card (dp) — cancelled, together with
   * the card's own padding, on the map wrapper only. Required so no mount forgets it. */
  mapInset: number;
```
2. `:139` the card View: style stays `[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]` (leave the line; `borderColor` on a 0-width border is harmless and keeps the diff small).
3. `:145` `      <View style={st.mapWrap}>` → `      <View style={[st.mapWrap, { marginHorizontal: -(CARD_PAD + props.mapInset) }]}>` and add `bleed` to the `<WayMapView` (`:146-154`, e.g. after `showRider={false}`).
4. Styles: add `const CARD_PAD = 16;` above `const st = StyleSheet.create({` with the comment `// virgin-cycle27 06: the card's padding, cancelled on the map wrapper (bleed)`; `:215` → `  card: { padding: CARD_PAD, gap: 6 }, // virgin-cycle27 06: no border / radius — the map bleeds through the card like the ACTIVITIES cards`; `:218` unchanged.
5. The four mounts: add `mapInset={12}` (RecordScreen, DemoScreen) / `mapInset={16}` (RideDetailScreen, GateAdjustScreen) as the first prop after `<GateAdjustCard`. `GateAdjustScreen.tsx` is therefore ALSO in the diff (add it to §5.2's file list).
6. `radius` import in `gateAdjustCard.tsx`: still used by `chip` / `padBtn` / `saveBtn` (`:219`, `:224`, `:230`) — keep.

## A3. Tests — replace the `gate` lines of §4 with
```ts
  const gate = read('src', 'ui', 'gateAdjustCard.tsx');
  const gateEls = gate.match(/<WayMapView[\s\S]*?\/>/g) ?? [];
  assert(gateEls.length === 1 && /\bbleed\b/.test(gateEls[0]), 'the gate editor map bleeds too (ruling 6.2)');
  assert(gate.includes('marginHorizontal: -(CARD_PAD + props.mapInset)') && gate.includes('card: { padding: CARD_PAD, gap: 6 }') && !gate.includes('borderWidth: 1, borderRadius: radius.card'), 'editor card: no frame, map wrapper cancels card padding + screen inset');
  for (const [f, inset] of [['RecordScreen.tsx', 12], ['DemoScreen.tsx', 12], ['RideDetailScreen.tsx', 16], ['GateAdjustScreen.tsx', 16]] as const) {
    assert(new RegExp(`<GateAdjustCard[\\s\\S]{0,60}mapInset=\\{${inset}\\}`).test(read('src', 'ui', f)), `${f} passes mapInset={${inset}} as the first prop`);
  }
```
and ADD `'gateAdjustCard.tsx'` to the bleed loop's file list in §4 (so the loop covers all seven files). The `marginHorizontal: -(12|16|20)` count loop of §4 is unchanged (the editor's negative margin is an expression, not a literal, so it is not counted — say so in the report).

## A4. Acceptance additions
- §5.2: `gateAdjustCard.tsx` and `GateAdjustScreen.tsx` ARE in the diff now; `wayMapView.tsx` still NOT (beyond brief 8-9's hunks).
- §5.3: `grep -c "bleed" src/ui/gateAdjustCard.tsx` ≥ 1; `grep -n "mapInset=" src/ui/*.tsx` → exactly four lines.
- Allow-list diff still EMPTY (`Tap a gate to move it`, chip texts etc. are untouched).

## A5. On Nathan's phone (adds to §6)
The gate editor (end-of-ride adjust, DEMO adjust, detail-page adjust, EDIT GATES screen) shows its map edge to edge, cutting the card into a top part (title, hint) and a bottom part (gate chips, nudge pads, save); the card has no border any more. One-line revert per item: `card:` back to `borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6` and drop the wrapper margin.
