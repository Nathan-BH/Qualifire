# Brief 04 — feed polish after Nathan's first on-device test (virgin-cycle23)

Written by the Plan tier (Fable) 2026-10-07 from Nathan's phone feedback (recorded in `00-nathan-decisions.md` § "Feedback 2026-10-07"). Executor: Sonnet, `EXECUTOR-RULES.md` applies in full (stop-on-ambiguity, no git writes, python read-modify-write, no heredocs). JS-only, no native change, no new dependency, no new rider-facing string.

## Goal

Three visual/behavioural corrections to the ACTIVITIES feed card (`app/src/ui/activityCard.tsx`), nothing else:

1. **Card maps are read-only by design.** `CARD_MAP_GESTURES` becomes `'readonly'`; the comments say why; the test pins the new value. The `'twoFinger'` code path in `wayMapView.tsx` stays untouched (still a legal value of `WayMapGestures`).
2. **Thicker divider + more breathing room.** The divider between cards goes from 1 dp to 3 dp; the block's top/bottom padding goes from 14/15 to 22/22. The fixed card heights are recomputed (route 290 → **307**, plain 256 → **273**) and every test pin follows.
3. **Feed maps run edge to edge.** Same 150 dp height, but no 16 dp side margins, no border, no corner radius (like the MAP tab's full-width map). Implemented as a new opt-in `bleed?: boolean` prop on `WayMapView` (default `false` = every existing caller byte-for-byte unchanged in behaviour). The detail page's big map is NOT touched.

Item 4 of Nathan's feedback (the word "interrupted" on some cards) is a question, not a change: see § 9 (report) — you change nothing for it.

## 0. Context (verified anchors, tree at commit `592a44f` "vcycle23+24", `git status --short app` clean on 2026-10-07 20:20 UTC)

The tree is shared with other sessions (cycles 24, 25, 26 folders exist; cycle 23 + 24 app code is committed). Before EVERY edit to a file below, re-read the region you are about to change (`sed -n`) and compare it with the anchor quoted here; a mismatch = STOP and report verbatim. Do not touch any file this brief does not name.

### `app/src/ui/activityCard.tsx` (147 lines)

- `:1-14` header doc comment. `:3-4` says "a 1 dp divider below, the map in WayMapView's own bordered rounded frame with 16 dp side margins" — becomes false after this brief.
- `:17` `import WayMapView, { type WayMapGestures } from './wayMapView';`
- `:20` `import { colors, radius, type PaddockTheme } from './theme';` — `radius` is used ONLY at `:137` (`borderRadius: radius.card,` in `placeholder`), which this brief removes.
- `:22` `import { CARD_MAP_HEIGHT, type FeedCardModel } from './feedModel';`
- `:29-32`:
  ```
  /** Nathan 2026-10-06: two-finger first; flip to 'readonly' if one finger on the
   * map blocks the feed scroll or the tap on his phone (00-nathan-decisions.md §3).
   * ONE line to switch. */
  export const CARD_MAP_GESTURES: WayMapGestures = 'twoFinger';
  ```
- `:65` `<Pressable style={st.block} onPress={() => props.onOpen(card)}>` — the whole block is one Pressable; this is what claimed the touches on the phone (RN's responder system: the block becomes responder on the first finger; the native map never gets a chance). That is now the WANTED behaviour.
- `:77-94` the map slot: `<View style={st.mapSlot}>`, `<View style={st.placeholder} />`, then `<WayMapView variant="browse" ... height={CARD_MAP_HEIGHT} showRider={false} gestures={CARD_MAP_GESTURES} trail=... sectorColours=... leadColour=... />`.
- `:105` `<MenuButton style={st.dots} onOpen={(anchor) => props.onMenu(card, anchor)} />` — MenuButton is a 40×40 box (`activityMenu.tsx:55` `btn: { width: 40, height: 40 }`), positioned absolutely by `st.dots` so that its centre (top 6 + 20 = 26) sits on the header row's centre (paddingTop 14 + 24/2 = 26). It must keep tracking the header row after the padding change.
- `:117-118` the sum comment: `// Heights add up to feedModel's CARD_HEIGHT_ROUTE (290) / CARD_HEIGHT_PLAIN (256):` / `// route = 14 + 24 + 46 + (6 + 150) + (10 + 24) + 15 + 1 ; plain = same minus the strip (34).`
- `:120` `block: { paddingTop: 14, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: t.cardBorder },`
- `:121` `head: { ..., height: 24 },` · `:124` `hero: { ..., height: 46 },` · `:130` `mapSlot: { marginTop: 6, marginHorizontal: 16, height: CARD_MAP_HEIGHT },` · `:142` `strip: { ..., marginTop: 10, height: 24, ... },`
- `:131-141`:
  ```
    placeholder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      backgroundColor: t.race.bg,
    },
  ```
- `:146` `dots: { position: 'absolute', top: 6, right: 4 },`

### `app/src/ui/feedModel.ts` (pure, no React)

- `:39-41`:
  ```
  export const CARD_HEIGHT_ROUTE = 290; // see brief 02 §1c layout table; includes the 1 dp divider
  export const CARD_HEIGHT_PLAIN = 256;
  export const CARD_MAP_HEIGHT = 150;
  ```
- `:83-85` `feedCardHeight` and `:88-93` `feedItemLayout` read only the two constants — no edit needed there.

### `app/src/ui/wayMapView.tsx` (1058 lines; shared with cycle 24's `export function Credit` at `:337`)

- `:203-212` the `WayMapGestures` doc comment (`'twoFinger' = a feed card: ...`, `The ONE place the feed picks between the last two is CARD_MAP_GESTURES in activityCard.tsx (brief 02).`), `:212` `export type WayMapGestures = 'full' | 'twoFinger' | 'readonly';`
- `:230-233`:
  ```
    height?: number;
    /** fill the parent instead of a fixed height — race mode (Cycle 020,
     * Nathan 2026-08-19). Takes precedence over `height` when true. */
    fill?: boolean;
  ```
- `:300-302` the last props: `  /** virgin-cycle23 brief 01: see WayMapGestures. Default 'full'. */` / `  gestures?: WayMapGestures;` / `};`
- The frame style is applied at exactly TWO places, both as a line that is only whitespace + `st.frame,`:
  - `:310-316` (ML === null branch): `<View style={[` / `st.frame,` / `props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },` / `{ backgroundColor: t.race.bg, borderColor: t.cardBorder },` / `]}>`
  - `:706-711` (MapLibre branch): `<View style={[` / `st.frame,` / `props.fill ? ... : { height: h },` / `{ backgroundColor: t.race.bg, borderColor: t.cardBorder },` / `dimmed && st.dimmedFrame,` / `]}>`
- `:726` `<View style={st.mapFill} pointerEvents={gestures === 'readonly' ? 'none' : 'auto'}>` — the readonly wrapper; `:1014` `<Credit rung="maplibre" locked={creditLocked} />` is a SIBLING outside that wrapper, so the "i" stays tappable in readonly mode (inspect-report check 3a').
- `:1027-1029`:
  ```
  const st = StyleSheet.create({
    frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
    mapFill: { flex: 1, alignSelf: 'stretch' },
  ```
- `:1043` `creditBtn: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, ...` — unchanged; 6 dp from the screen edge + `hitSlop={6}` is the same placement the MAP tab already uses full-width (`catalogMapView.tsx:350` mounts the same `<Credit>` in a `frame: { flex: 1, alignSelf: 'stretch' }` with no border/radius, `:362`).
- Callers of `<WayMapView` (none passes `bleed`, only activityCard passes `gestures`): RecordScreen ×3, ReplayScreen, CatalogDetailScreen ×2, DemoScreen ×2, gateAdjustCard, RideDetailScreen ×4, activityCard ×1.

### Screen chain for edge-to-edge

`App.tsx:235-236` `styles.root` / `styles.content` have no horizontal padding; `RidesScreen.tsx:264` `container: { flex: 1 }`, `:267` `feed: { paddingBottom: 24 }` (FlatList `contentContainerStyle`), the list has `style={{ flex: 1 }}`. So dropping the card's own `marginHorizontal: 16` is enough for a true edge-to-edge map; nothing in RidesScreen changes.

### Tests that pin the current values

- `app/tests/feedmodel_suite.ts:110-123` test `'feedmodel: feedItemLayout — offsets are the running sum of fixed heights, route 290 / plain 256'`: asserts `CARD_HEIGHT_ROUTE === 290 && CARD_HEIGHT_PLAIN === 256`, then for `cards = [r, p, r]`: `l0 0/290`, `l1 290/256`, `l2 546/290`, `l3 length 0 offset 836`. Import block `:24-27` destructures `CARD_HEIGHT_ROUTE, CARD_HEIGHT_PLAIN` from the dynamic import.
- `app/tests/recordflow_suite.ts:341-359` test `'virgin-cycle23 02: ACTIVITIES is a flat feed — FlatList of ActivityCards, fixed layout, no FREE ACTIVITIES section, two-finger card maps switchable in one line'`: `:351` `assert(/export const CARD_MAP_GESTURES: WayMapGestures = '(twoFinger|readonly)';/.test(card), 'one-line gesture switch');` · `:352` `gestures={CARD_MAP_GESTURES}` · `:354` `assert(card.includes('borderBottomWidth: 1') && !card.includes('borderLeftWidth'), 'divider, no accent bar');`
- `app/tests/waymap_suite.ts`: 18 tests, none pins `st.frame`, `borderRadius`, `gestures` or the frame style line. `tests/catalogmap_suite.ts`, `tests/ridedetail_suite.ts`: no pin on these either (grep `frame|gestures|alignSelf` → nothing relevant).
- Suite baseline (inspect run 2026-10-07): `911 tests: 908 pass, 0 fail, 3 skip`; the fix round made it `912: 909 pass, 0 fail, 3 skip`. Run your own baseline; the number may have moved with cycle 24-26 work — what matters is zero FAIL before and after, and +2 tests from this brief.

## 1. Height arithmetic (decided; copy, do not re-derive)

Row heights that do NOT change: head 24, hero 46, mapSlot marginTop 6 + map 150, strip marginTop 10 + 24 (route only).

| token | before | after |
|---|---|---|
| block paddingTop | 14 | **22** (`CARD_PAD_TOP`) |
| block paddingBottom | 15 | **22** (`CARD_PAD_BOTTOM`) |
| block borderBottomWidth (the divider) | 1 | **3** (`FEED_DIVIDER_DP`) |
| dots top | 6 | **14** (= CARD_PAD_TOP + 24/2 − 40/2, keeps the ⋯ centred on the header row) |

Route: 22 + 24 + 46 + (6 + 150) + (10 + 24) + 22 + 3
= 22 + 24 = 46 → + 46 = 92 → + 156 = 248 → + 34 = 282 → + 22 = 304 → + 3 = **307**.

Plain: 22 + 24 + 46 + (6 + 150) + 22 + 3
= 248 (same as above up to the map) → + 22 = 270 → + 3 = **273**.

Difference route − plain = 34 (the strip), as before. `feedItemLayout` for `[route, plain, route]`: index 0 → offset 0 length 307; index 1 → offset 307 length 273; index 2 → offset 580 length 307; index 3 (past the end) → length 0, offset 887.

The four new exported constants live in `feedModel.ts` (pure, headless-testable) and the StyleSheet references them, so the arithmetic is pinned by a unit test rather than by a comment.

## 2. Changes, file by file (in this order)

### 2a. `app/src/ui/feedModel.ts`

Replace lines `:39-41` (quoted in §0) with:

```
/** Feed block geometry (virgin-cycle23 brief 04, Nathan's 2026-10-07 phone feedback:
 * thicker divider, more air above/below). activityCard.tsx's StyleSheet uses
 * these; the card heights below are their sum and are pinned by feedmodel_suite. */
export const CARD_PAD_TOP = 22;
export const CARD_PAD_BOTTOM = 22;
export const FEED_DIVIDER_DP = 3;
export const CARD_MAP_HEIGHT = 150;
// route = CARD_PAD_TOP + head 24 + hero 46 + (6 + CARD_MAP_HEIGHT) + strip (10 + 24) + CARD_PAD_BOTTOM + FEED_DIVIDER_DP
export const CARD_HEIGHT_ROUTE = 307;
// plain = the same without the strip (34)
export const CARD_HEIGHT_PLAIN = 273;
```

(Literal numbers on purpose: `getItemLayout` must never depend on arithmetic that a future style edit could silently change; the test in §3 asserts the sum.)

### 2b. `app/src/ui/wayMapView.tsx` — new opt-in `bleed` prop (shared file: re-read each region first)

1. Props type: after `:233` `  fill?: boolean;` insert:
   ```
     /** virgin-cycle23 brief 04: no border, no corner radius (the feed card's
      * edge-to-edge map, like the MAP tab). Default false = the bordered rounded
      * frame every other surface has. Height/fill behave exactly as without it. */
     bleed?: boolean;
   ```
2. Both frame sites (`:312` and `:707`, each a line of whitespace + `st.frame,`): replace with `props.bleed ? st.frameBleed : st.frame,` (keep the indentation). Do it with one python read-modify-write using the regex `^(\s+)st\.frame,$` (multiline) and assert the count is exactly 2 before writing. Nothing else in those two style arrays changes (`borderColor: t.cardBorder` stays; with `borderWidth` absent it has no effect).
3. StyleSheet (`:1028`): after the `frame:` line insert
   ```
     frameBleed: { alignSelf: 'stretch', overflow: 'hidden' },
   ```
   (`overflow: 'hidden'` kept so the in-frame credit card is clipped to the map as before.)
4. Doc comment `:203-212`: replace the two lines
   ```
    * 'twoFinger' = a feed card: one finger does nothing on the map (so the list
    * scrolls and a tap reaches the card), two fingers pinch-zoom (a pinch also
    * pans); no double-tap zoom, no rotation, no zoom bar.
   ```
   with
   ```
    * 'twoFinger' = one finger does nothing on the map, two fingers pinch-zoom (a
    * pinch also pans); no double-tap zoom, no rotation, no zoom bar. Built for the
    * feed card (brief 02); the feed now uses 'readonly' (brief 04, Nathan
    * 2026-10-07) and no surface passes 'twoFinger' today — the code path stays.
   ```
   and the line `The ONE place the feed picks between the last two is CARD_MAP_GESTURES in` / `activityCard.tsx (brief 02). */` stays as is (still true).

   Everything else in wayMapView.tsx is untouched: no change to `gestures` handling, `mapFill`, `Credit`, zoom bar, `creditBtn` position.

### 2c. `app/src/ui/activityCard.tsx`

1. Header comment `:1-14`: replace lines `:2-6`
   ```
    * virgin-cycle23 brief 02: one block of the ACTIVITIES feed (preview B). Flat
    * on the page background, a 1 dp divider below, the map in WayMapView's own
    * bordered rounded frame with 16 dp side margins. Fixed height per variant
    * (feedModel.ts CARD_HEIGHT_*) so the list's getItemLayout is exact —
    * every text row has an explicit height and numberOfLines={1}.
   ```
   with
   ```
    * virgin-cycle23 brief 02 + 04: one block of the ACTIVITIES feed. Flat on the
    * page background, a FEED_DIVIDER_DP divider below, the map edge to edge
    * (WayMapView `bleed`, no border, no radius; text keeps its 16 dp side
    * padding — Nathan 2026-10-07). Fixed height per variant (feedModel.ts
    * CARD_HEIGHT_*) so the list's getItemLayout is exact — every text row has
    * an explicit height and numberOfLines={1}.
   ```
2. `:20` → `import { colors, type PaddockTheme } from './theme';` (`radius` no longer used; verify with `grep -n "radius" app/src/ui/activityCard.tsx` → only the import line before the edit, nothing after).
3. `:22` → `import { CARD_MAP_HEIGHT, CARD_PAD_TOP, CARD_PAD_BOTTOM, FEED_DIVIDER_DP, type FeedCardModel } from './feedModel';`
4. `:29-32` → 
   ```
   /** Nathan 2026-10-07 (brief 04), after the first phone test: a card map is a
    * PICTURE. The block's outer Pressable claims every touch anyway (RN responder
    * system: the native map never sees a finger), and Nathan wants exactly that —
    * one finger scrolls the feed, a tap opens the movable detail map, nothing
    * moves on the card. 'twoFinger' stays a legal WayMapGestures value for other
    * surfaces; the feed does not use it. */
   export const CARD_MAP_GESTURES: WayMapGestures = 'readonly';
   ```
5. `:80-92` the `<WayMapView` element: add one prop line `bleed` directly after `showRider={false}` (so the element reads `... height={CARD_MAP_HEIGHT}` / `showRider={false}` / `bleed` / `gestures={CARD_MAP_GESTURES}` / ...). Write it as the bare boolean attribute `bleed` (JSX `bleed` === `bleed={true}`).
6. `:117-118` sum comment → 
   ```
   // Heights add up to feedModel's CARD_HEIGHT_ROUTE (307) / CARD_HEIGHT_PLAIN (273):
   // route = CARD_PAD_TOP 22 + 24 + 46 + (6 + 150) + (10 + 24) + CARD_PAD_BOTTOM 22 + FEED_DIVIDER_DP 3 ; plain = same minus the strip (34).
   ```
7. `:120` → `  block: { paddingTop: CARD_PAD_TOP, paddingBottom: CARD_PAD_BOTTOM, borderBottomWidth: FEED_DIVIDER_DP, borderBottomColor: t.cardBorder },`
8. `:130` → `  mapSlot: { marginTop: 6, height: CARD_MAP_HEIGHT },` (drop `marginHorizontal: 16`).
9. `:131-141` placeholder → drop the three lines `borderRadius: radius.card,`, `borderWidth: 1,`, `borderColor: t.cardBorder,`; result:
   ```
     placeholder: {
       position: 'absolute',
       top: 0,
       left: 0,
       right: 0,
       bottom: 0,
       backgroundColor: t.race.bg,
     },
   ```
10. `:146` → `  dots: { position: 'absolute', top: CARD_PAD_TOP + 12 - 20, right: 4 },` (= 14; written as the expression so it tracks the padding; a comment is not needed).

Unchanged: `head`/`hero`/`strip` keep `paddingHorizontal: 16` (text keeps its gutter); `numberOfLines={1}` ×8 untouched; `MenuButton`, `useRideTrail`, `showMap`, trail/sectorColours/leadColour props untouched.

### 2d. `app/tests/feedmodel_suite.ts`

1. `:25-26` import destructure: add `CARD_PAD_TOP, CARD_PAD_BOTTOM, FEED_DIVIDER_DP, CARD_MAP_HEIGHT` after `CARD_HEIGHT_PLAIN,`.
2. Test `:110-123`: rename to `'feedmodel: feedItemLayout — offsets are the running sum of fixed heights, route 307 / plain 273'`; `assert(CARD_HEIGHT_ROUTE === 307 && CARD_HEIGHT_PLAIN === 273, 'constants');`; `l0.offset === 0 && l0.length === 307`; `l1.offset === 307 && l1.length === 273`; `l2.offset === 580 && l2.length === 307`; `l3.length === 0 && l3.offset === 887`.
3. New test, inserted directly after that test:
   ```
   test('feedmodel: card heights are the sum of the block geometry (brief 04: 22/22 padding, 3 dp divider)', () => {
     assert(CARD_PAD_TOP === 22 && CARD_PAD_BOTTOM === 22 && FEED_DIVIDER_DP === 3 && CARD_MAP_HEIGHT === 150, 'geometry tokens');
     assert(FEED_DIVIDER_DP >= 2, 'divider at least twice the old 1 dp');
     const common = CARD_PAD_TOP + 24 + 46 + (6 + CARD_MAP_HEIGHT) + CARD_PAD_BOTTOM + FEED_DIVIDER_DP;
     assert(CARD_HEIGHT_PLAIN === common, `plain ${CARD_HEIGHT_PLAIN} != ${common}`);
     assert(CARD_HEIGHT_ROUTE === common + 10 + 24, `route ${CARD_HEIGHT_ROUTE} != ${common + 34}`);
   });
   ```

### 2e. `app/tests/recordflow_suite.ts` (shared file: re-read `:341-359` first)

1. Test title `:341`: replace the trailing `two-finger card maps switchable in one line'` with `read-only edge-to-edge card maps'`.
2. `:351` → `assert(card.includes("export const CARD_MAP_GESTURES: WayMapGestures = 'readonly';"), 'card maps are read-only by design (brief 04)');`
3. `:354` → `assert(card.includes('borderBottomWidth: FEED_DIVIDER_DP') && card.includes('paddingTop: CARD_PAD_TOP') && card.includes('paddingBottom: CARD_PAD_BOTTOM') && !card.includes('borderLeftWidth'), 'divider + padding from feedModel tokens, no accent bar');`
4. Insert after the (new) `:354` line:
   ```
     assert(!card.includes('marginHorizontal') && !card.includes('borderRadius') && !card.includes('borderWidth'), 'brief 04: the card map bleeds edge to edge, no frame of its own');
     assert(/showRider=\{false\}\s+bleed\s+gestures=\{CARD_MAP_GESTURES\}/.test(card), 'the card map asks WayMapView for the bleed frame');
   ```
5. New test, inserted directly after this test's closing `});` (before `test('virgin-cycle23 03: ...`):
   ```
   test('virgin-cycle23 04: WayMapView `bleed` is opt-in — default frame untouched, only the feed card passes it', () => {
     const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
     const map = read('src', 'ui', 'wayMapView.tsx');
     assert(map.includes('bleed?: boolean;'), 'prop declared');
     assert((map.match(/props\.bleed \? st\.frameBleed : st\.frame,/g) ?? []).length === 2, 'both frame sites (ML null + MapLibre) pick the frame by the prop');
     assert(!/^\s+st\.frame,$/m.test(map), 'no unconditional st.frame left');
     assert(map.includes("frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },"), 'default frame style unchanged');
     assert(map.includes("frameBleed: { alignSelf: 'stretch', overflow: 'hidden' },"), 'bleed frame: no border, no radius');
     for (const f of ['RecordScreen.tsx', 'ReplayScreen.tsx', 'CatalogDetailScreen.tsx', 'DemoScreen.tsx', 'gateAdjustCard.tsx', 'RideDetailScreen.tsx']) {
       const els = read('src', 'ui', f).match(/<WayMapView[\s\S]*?\/>/g) ?? [];
       assert(els.length > 0, `${f} mounts WayMapView`);
       for (const el of els) assert(!/\bbleed\b/.test(el), `${f} must not pass bleed`);
     }
   });
   ```
   (The six names were verified with `ls app/src/ui` on 2026-10-07: exact case as written. `RecordScreen.tsx:804` has the word "bleed" in a prose comment — that is why the check is per `<WayMapView ... />` element, not per file. If `els.length` is 0 for one of them, STOP: that caller's element may be written differently; report the file.)

### 2f. Cycle docs (trivial, do them)

- `cycles/virgin-cycle23/README.md`: in the line starting `- `00-nathan-decisions.md`:` append ` + § "Feedback 2026-10-07" (brief 04: read-only card maps, 3 dp divider, edge-to-edge feed maps).` — one line. Nothing else in that file.
- Do NOT edit brief-02, EXECUTION-ORDER.md, 00-nathan-decisions.md (already updated by the Plan tier), STATE.md, OPEN-ITEMS.md.

## 3. Tests summary (add/update)

| suite | test | change |
|---|---|---|
| feedmodel_suite | `feedItemLayout — ... route 307 / plain 273` | UPDATED pins (307/273, offsets 0/307/580/887) |
| feedmodel_suite | `card heights are the sum of the block geometry (brief 04 ...)` | NEW |
| recordflow_suite | `virgin-cycle23 02: ... read-only edge-to-edge card maps` | UPDATED: `'readonly'` pinned literally; divider/padding tokens; no marginHorizontal/borderRadius/borderWidth in the card; `bleed` between `showRider={false}` and `gestures=` |
| recordflow_suite | `virgin-cycle23 04: WayMapView bleed is opt-in ...` | NEW |

Expected count: baseline + 2 tests, zero FAIL, the 3 pre-existing skips unchanged.

## 4. Visible text / allow-list

None. No rider-facing string is added, removed or moved; `app/tests/ui-strings.allow.json` must show NO diff. If the suite reports any UNLISTED/STALE string → STOP (something outside this brief changed).

## 5. Decisions already made (do not re-open)

- `'readonly'`, not an overlay or a responder tweak: Nathan wants the card map to be a picture; `'readonly'` is the built-in picture mode (pointerEvents none + touchZoom off), and the outer Pressable already owns the touches.
- Divider 3 dp (≥ 2× the old 1 dp as asked; 3 reads as a clear rule without becoming a bar); padding 22/22 (symmetric, +8/+7 over the old 14/15, which is "clearly more air" without inflating a 307 dp card further).
- Geometry tokens exported from `feedModel.ts`, heights stay literal: the unit test proves the sum; `getItemLayout` cannot drift.
- `bleed` is a separate boolean prop, NOT a change to `st.frame`, NOT a new `gestures` value, NOT tied to `variant`: every other caller keeps the bordered rounded frame with zero diff in behaviour; the detail page's 320 dp inset map is untouched (Nathan's default: leave the detail page as is).
- `frameBleed` keeps `overflow: 'hidden'` (clips the in-frame credit card) and keeps `backgroundColor: t.race.bg` from the call site (placeholder colour while tiles load).
- Credit "i" position unchanged (right 6 / bottom 6, hitSlop 6): same placement the full-width MAP tab already ships; it is inside the screen and outside the readonly wrapper, so it stays tappable.
- `dots.top` written as `CARD_PAD_TOP + 12 - 20` so the ⋯ follows the padding.
- `'twoFinger'` code path and its tests (none pin it beyond the removed regex) stay; only comments say the feed no longer uses it.
- "interrupted" sub-label: NOT changed (Nathan has not decided), see § 9.

## 6. Verification (all from `$HOME/mnt/Qualifire`, `GIT_OPTIONAL_LOCKS=0`)

Before any edit: `git status --short` (expect only `?? cycles/...` entries or other sessions' files — note them), `cd app && node --experimental-strip-types tests/run.ts | tail -3` (baseline count, zero FAIL).

After the edits:
1. `cd app && node --experimental-strip-types tests/run.ts | tail -3` → zero FAIL, baseline + 2 tests; tee to `cycles/virgin-cycle23/run-brief04.log`.
2. `cd app && ./node_modules/.bin/tsc --noEmit; echo EXIT=$?` → `EXIT=0`, `timeout_ms: 180000`, tee to `cycles/virgin-cycle23/tsc-brief04.log` (an empty log = timed out, rerun).
3. `grep -n "bleed" app/src/ui/*.tsx` → hits only in `wayMapView.tsx` (prop decl, 2 frame sites, `frameBleed`, comment) and `activityCard.tsx` (the attribute + header comment).
4. `grep -c "st\.frame,$" app/src/ui/wayMapView.tsx` → 0; `grep -c "props.bleed ? st.frameBleed : st.frame," app/src/ui/wayMapView.tsx` → 2.
5. `grep -n "twoFinger" app/src/ui/activityCard.tsx` → 0 hits (comment included); `grep -n "'twoFinger'" app/src/ui/wayMapView.tsx` → the type line + the comment (code path intact: `grep -c "oneFingerOn" app/src/ui/wayMapView.tsx` unchanged from before your edit, record both numbers).
6. `grep -c "numberOfLines={1}" app/src/ui/activityCard.tsx` → 8 (unchanged).
7. `grep -n "marginHorizontal\|borderRadius\|borderWidth\|radius" app/src/ui/activityCard.tsx` → 0 hits.
8. `git diff --stat` → exactly: `app/src/ui/activityCard.tsx`, `app/src/ui/feedModel.ts`, `app/src/ui/wayMapView.tsx`, `app/tests/feedmodel_suite.ts`, `app/tests/recordflow_suite.ts`, `cycles/virgin-cycle23/README.md` (+ the two new logs untracked). `git diff -- app/tests/ui-strings.allow.json` → empty. If other files show as modified that you did not touch, say so in the report (another session) — do not revert them.
9. `git diff -- app/src/ui/wayMapView.tsx` → only: 4 inserted prop lines, 2 one-line frame replacements, 1 inserted `frameBleed` line, the comment edit. Nothing else (quote the diff in the report).

Native rendering cannot be checked here: say so. The on-device checks go to the coordinator (§ 9).

## 7. Out of scope

RideDetailScreen's map (stays inset, bordered, 320 dp); any `gestures` behaviour change in wayMapView.tsx; the "interrupted" sub-label; sector strip wrapping (inspect F6); `removeClippedSubviews` (F7); allow-list; STATE/OPEN-ITEMS; cycles 24-26 files; commits.

## 8. Stop-on-ambiguity

STOP and report verbatim (no guessing, no ruling) if: any anchor in §0 or §2 does not match the file as you read it right before editing; `st.frame,` occurs other than exactly twice; `radius` is used anywhere else in activityCard.tsx; a caller file in §2e.5 is missing or named differently; the baseline suite has a FAIL; the allow-list shows a diff; tsc reports anything; a test outside the four in §3 fails after your edits.

## 9. Report format

Concise: steps done/not done; files changed (`git diff --stat`); suite counts before/after + the two log paths; every check in §6 with its result; `git diff -- app/src/ui/wayMapView.tsx` quoted; deviations verbatim; what Inspect should look at (the bleed sites, the dots offset, the height sum, the unchanged callers).

Then two paragraphs for the coordinator (you do not edit OPEN-ITEMS/STATE yourself):

"virgin-cycle23 brief 04 (feed polish), on-device checks owed: (a) feed maps are pictures: one finger scrolls, a tap opens the detail, nothing moves on the card; (b) the detail map still pans/zooms; (c) divider 3 dp + 22/22 air reads right, cards do not look stretched; (d) feed maps reach both screen edges with no border or radius, the text keeps its gutter, the 'i' credit sits 6 dp from the right edge and still opens its card; (e) Android edge swipe-back over a full-width card map; (f) BACK still lands at the same feed offset (heights changed, offsets are recomputed from the same constants); (g) the map 'map unavailable' badge frame also bleeds (ML null branch) — only visible without the native module."

"NOTE for the coordinator (Nathan's question 4, no change made): the word 'interrupted' on some feed cards is the lap-level quality label — `store/derive.ts` marks a lap 'interrupted' when at least one sector was interrupted (moving time still real); `feedModel.ts` `subLabel` shows any non-clean quality ('estimated' | 'missed' | 'interrupted') or 'ignored', exactly as the old collapsed rows did. It is NOT a leftover of the ‖ pause glyph removed in cycle 22 (that was the sector-row glyph, `rideHistoryModel.ts:244`). Whether the feed should word or hide it is Nathan's call; nothing changed in brief 04."
