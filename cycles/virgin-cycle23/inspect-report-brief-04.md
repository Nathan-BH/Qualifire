# Inspect report, brief 04 (feed polish), virgin-cycle23

Inspector: fresh-context Opus, 2026-10-07. Read-only on app code. Every check below was rerun by me; the executor's report was not trusted.

## Verdict: SHIP-TO-DEVICE (PASS WITH NOTES)

JS-only, no native change, no new dependency, no new rider-facing string. Safe to ship OTA (JS only): yes.

## Check table

| # | Check | Result | Evidence |
|---|---|---|---|
| 1a | Test suite | PASS | `914 tests: 911 pass, 0 fail, 3 skip` (log `run-inspect-brief04.log`). Baseline 912/909/0/3 -> +2 tests as specified. The 4 brief-04 tests PASS (log lines 306, 307, 570, 571). |
| 1b | tsc --noEmit | PASS | EXIT=0, `tsc-inspect-brief04.log` is 0 bytes (foreground run, not a timeout). |
| 2 | Brief §6 greps | PASS (wording only) | see "Acceptance greps" below |
| 3 | Height arithmetic | PASS | route 22+24+46+6+150+10+24+22+3 = 307; plain 307-34 = 273; offsets 0/307/580/887 pinned and passing |
| 4 | `bleed` opt-in | PASS | 13 `<WayMapView` elements, only activityCard passes `bleed`; both frame sites switched; `frame` style byte-identical |
| 5 | Read-only card maps | PASS | `CARD_MAP_GESTURES = 'readonly'` (activityCard.tsx:37); 'twoFinger' code path untouched (`oneFingerOn` count 6 at HEAD and now) |
| 6 | ⋯ button | PASS | top = 22+12-20 = 14; centre 34 = header centre 22+12 |
| 7 | Divider | PASS | `borderBottomWidth: FEED_DIVIDER_DP` (3), colour `t.cardBorder` token, no hex (test pin passes) |
| 8 | Detail page untouched | PASS | `git diff -- app/src/ui/RideDetailScreen.tsx` empty |
| 9 | Allow-list / strings / em dashes | PASS | `git diff -- app/tests/ui-strings.allow.json` empty (no entries added/edited/removed); no JSX text changed; em dashes added only in code comments (brief-mandated text), none in rider-facing strings |
| 10 | Honesty | see on-device checklist | |

## Scope of the tree

`git diff --stat`: activityCard.tsx, feedModel.ts, wayMapView.tsx, feedmodel_suite.ts, recordflow_suite.ts, cycles/virgin-cycle23/README.md (brief 04), plus 00-nathan-decisions.md and EXECUTION-ORDER.md (Plan tier, outside the executor's remit, expected). Untracked: cycles/virgin-cycle25/, virgin-cycle26/ (other sessions, not judged). waymap_suite.ts, RideDetailScreen.tsx, allow.json: no diff. Every hunk in the five code files matches brief §2a-2e literally (diffs read in full).

## Acceptance greps (brief §6), rerun

- Check 3 `grep -n bleed app/src/ui/*.tsx`: wayMapView 238 (prop), 317, 712 (frame sites); activityCard 4 (comment), 92 (attribute). Extra hits RecordScreen:804, RoutesScreen:3, catalogMapView:2 are pre-existing prose ("bleed into", "full-bleed"), not props. Wording only.
- Check 4 `grep -c "st\.frame,$"` = 2, not 0: the pattern also matches the new line `props.bleed ? st.frameBleed : st.frame,`. The intended check (no unconditional frame line) is `grep -cE "^\s+st\.frame,$"` = 0, and the new test asserts exactly that. `props.bleed ? st.frameBleed : st.frame,` = 2. Wording only.
- Check 5: `twoFinger` in activityCard.tsx hits once at :34, inside the comment the brief itself dictated in §2c.4 ("'twoFinger' stays a legal WayMapGestures value..."). The brief contradicts itself; the code has no use of it. Wording only. `'twoFinger'` in wayMapView.tsx: comment :205/:208 + type :213. `oneFingerOn` 6 = 6 at HEAD.
- Check 6 `numberOfLines={1}` = 8 (unchanged).
- Check 7: one hit, activityCard.tsx:4 "no radius" in the brief-dictated header comment; zero style hits. The recordflow test (`!card.includes('borderRadius')` etc.) is the real guard and passes. Wording only.
- Check 9 wayMapView diff: exactly the 4 prop lines, 2 frame-line replacements, 1 `frameBleed` line, the comment edit. Nothing else.

## Height arithmetic (check 3), from the real StyleSheet

`block` (the Pressable, FlatList item root, no wrapper in renderItem, no separator/header in RidesScreen FlatList): paddingTop CARD_PAD_TOP 22, paddingBottom 22, borderBottomWidth 3, no explicit height so Yoga height = content + padding + border. Children in column flow: head height 24 (fixed); hero height 46 (fixed, lap lineHeight 40 fits); mapSlot marginTop 6 + height CARD_MAP_HEIGHT 150 (fixed whether or not the map mounts; WayMapView root height 150, absolute placeholder); strip marginTop 10 + height 24 (route only; row, no flexWrap, so chips cannot add height). MenuButton is position absolute: out of flow. Every Text is numberOfLines={1} inside a fixed-height row.
Route = 22+24+46+6+150+10+24+22+3 = 307. Plain = 273. Matches feedModel.ts literals; feedItemLayout([r,p,r]) = 0/307, 307/273, 580/307, past end 887/0, all pinned. Scroll restore (`feedScrollOffset`, module-level) is from the same JS session, so no stale offset from the old 290/256 heights can survive a reload.

## bleed (check 4)

- Callers (13): activityCard x1, CatalogDetailScreen x2, DemoScreen x2, gateAdjustCard x1, RecordScreen x3, ReplayScreen x1, RideDetailScreen x4. Only activityCard passes `bleed` (and `gestures`). `props.bleed` undefined = falsy -> `st.frame`, identical to before for the other 12.
- Frame sites: wayMapView.tsx:317 (ML === null, "map unavailable" badge) and :712 (MapLibre). `frameBleed: { alignSelf: 'stretch', overflow: 'hidden' }` (:1034): no border, no radius, no margin, overflow hidden kept. `borderColor` at the call site is inert without borderWidth.
- Credit: `<Credit>` at :1019 is a sibling of the readonly `mapFill` wrapper (:731), so not under pointerEvents none. Button right 6 / bottom 6, 22x22, hitSlop 6: slop reaches exactly the frame edge, which is now the screen edge: inside the screen, inside the overflow-hidden frame.
- ML null branch also bleeds (badge only), consistent with the card.

## Read-only (check 5)

`gestures='readonly'` -> oneFingerOn false (no zoom bar, no rotate), pinchOn false, `mapFill` pointerEvents 'none'. Touches on the map area fall through mapFill to the frame View (no responder) and bubble to the block Pressable: tap = onOpen, vertical drag = FlatList scroll (Pressable cancels on move). Comments in activityCard.tsx:31-36 and wayMapView.tsx:205-208 no longer claim two-finger works on the feed.

## Findings

1. MINOR (brief wording, not code): brief §6 checks 4, 5, 7 have grep patterns that cannot return the stated counts given the brief's own mandated text (`st\.frame,$` also matches the new ternary line; checks 5 and 7 hit brief-dictated comments). No code change needed; for future briefs use `grep -cE "^\s+st\.frame,$"` and restrict style greps to the StyleSheet block.
2. MINOR (test coverage, pre-existing pattern): the new sum test re-uses literal 24/46/6/10/24 for head/hero/mapSlot/strip; a future edit to e.g. `hero: { height: 46 }` in activityCard.tsx would not fail any test while breaking getItemLayout. Optional minimal fix in a later brief: export HEAD_H/HERO_H/STRIP_H from feedModel.ts and use them in the StyleSheet, or add a source pin in recordflow_suite for `height: 24` / `height: 46` lines. Not blocking.
3. NOTE: the 40x40 ⋯ box spans y 14-54, overlapping the hero row's right edge by 8 dp, exactly as before (6-46 vs header 14-38). Hero content is left-aligned, so no collision; unchanged behaviour.

No BLOCKER, no MAJOR.

## Cannot be verified here (needs the phone)

1. Feed maps are pictures: one finger scrolls the list, a tap on the map opens the detail, nothing on the card map moves (1 or 2 fingers).
2. The detail page map still pans and zooms as before, still inset with border and rounded corners.
3. The 3 dp divider and the extra air above/below read right; cards do not look stretched.
4. Feed maps touch both screen edges, no border, no rounded corners; titles, times and the sector strip keep their side gutter.
5. The small "i" sits in the map's bottom-right, fully visible, and tapping it opens "Map data sources" (and does not open the ride).
6. The ⋯ button sits level with the title row and opens its menu.
7. Android back-swipe from the screen edge over a full-width card map still goes back (does not get eaten).
8. Open a ride from far down the feed, press BACK: the feed returns to the same place.
9. Not checkable on a normal phone build: the "map unavailable" box also bleeds (only shows without the map module).
