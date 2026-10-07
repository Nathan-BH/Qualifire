# Brief 05 — "Not ranked" cards + no "lap" wording (virgin-cycle23)

Written by the Plan tier (Fable) 2026-10-07 22:50 UTC from Nathan's second phone feedback (`00-nathan-decisions.md` § "Feedback 2 (2026-10-07 22:35)"). Executor: Sonnet, `EXECUTOR-RULES.md` applies in full (stop-on-ambiguity, no git writes, python read-modify-write on exact anchors, no large heredocs). JS-only, display-only: no storage, engine, derive or results-store change; no native change; no new dependency. Nathan is unavailable: every call below is settled by Fable; the ones he should look at again are listed in § 10.

## Goal

Three binding decisions from Nathan, applied to the ACTIVITIES feed card, the activity detail page and the rider-facing wording:

A. **Feed card: no quality words, no estimates.** The words `interrupted`, `estimated`, `missed`, `ignored` never appear on a card. An interrupted activity has a real moving time and is an ordinary ranked card (normal hero, normal sector strip). An activity that CANNOT be ranked (lap quality `estimated` or `missed`, or the rider chose "Ignore in ranking") shows NO time, NO rank, NO `~` prefix, NO `no lap`: the hero slot carries a dim label **Not ranked** and the sector strip row is left empty (reserved, same height). Title (way name / From → To) and date stay; the activity is NOT turned into a free activity; data/storage/engine untouched. `Ignore in ranking` / `Count in ranking` stay in the ⋯ menu (they are the way back).

B. **Detail page: same principle.** For an unranked route activity the big time/rank is replaced by the dim **Not ranked** label; the one-line reason under it stays (the rider opens the detail to learn what happened) but is reworded so it never says `no lap`, `no time` or `estimated`; sector rows are shown as today, except that a sector with no real time shows no time at all (today it shows `~m:ss`). The four entry points, back labels and every pinned test survive.

C. **No "lap" in rider-facing text.** Nathan: "this is not a formula one race, there is no lap on an activity from A to B". Every rider-visible `lap` string in the REAL app screens goes; code identifiers (`lapS`, `lapLabel`, `lapTier`, `lapCellLabel`, `lapValues`, ...) are NOT renamed. Inventory and verdict per string in § 4.

Baseline on 2026-10-07 20:47 UTC, tree at `592a44f` + brief 04 (uncommitted, inspected PASS): `914 tests: 911 pass, 0 fail, 3 skip`; tsc exit 0. Expected after this brief: baseline + 6 tests, zero FAIL, same 3 skips (other sessions may move the baseline; what matters is zero FAIL before and after and +6 from this brief).

## 0. Context (verified anchors, read 2026-10-07 20:30-20:47 UTC)

The tree is shared with other sessions (cycles 25 RESULTS tab, 26 loops). Before EVERY edit re-read the region (`sed -n`) and compare with the anchor quoted here; a mismatch = STOP and report verbatim. Touch only the files this brief names. Line numbers are for orientation; anchors are by content.

### Why an activity is "unranked" (store facts, do not touch)

- `app/store/derive.ts:84-96`: one `missed` sector makes the lap `missed`; else one `estimated` sector makes it `estimated`; else one `interrupted` sector makes it `interrupted`; else `clean`. `:114`: `movingS` is a real number only for `clean` | `interrupted`, null for `estimated` | `missed`.
- `app/src/store/timing.ts:36-40` `scoredS()` returns null whenever `movingS === null` (both timing modes). So for a route result: `lapS === null` ⇔ quality `estimated` | `missed`.
- `app/src/store/results.ts:92-97` `ranks(r)`: false for `estimated` | `missed`, `tripwireDemoted`, `ignoredFromRanking === true`, or `scoredS(lap) === null`.
- `app/src/ui/rideDetailModel.ts:130` `canToggleIgnore: ranks({ ...res, ignoredFromRanking: false })` — the toggle exists only for a lap that WOULD rank if not ignored (so an estimated/missed lap has no toggle; an ignored clean lap has `Count in ranking`).
- `rideHistoryModel.ts:175` `const quality = lap.quality === 'clean' ? null : lap.quality;` → `RideRowModel.quality` is null | `'interrupted'` | `'estimated'` | `'missed'`.

So the ONE rule (new pure function, § 2a): **unranked ⇔ ignored OR quality ∈ {estimated, missed}**. `interrupted` and `clean` are ranked for display. A ride whose time is real but which has no position (`too few to rank`, tripwire `no rank`) keeps its time: it is a good time, only the rank line says there is no position (Nathan named exactly "estimated or missed, OR ignored"; see § 10 item 2).

### `app/src/ui/feedModel.ts` (124 lines, pure)

- `:7-11` imports (`RideMeta`, `RideRowModel`/`SectorRowModel`, `RideDetailModel`, `UiTier` as types; `fmt` value import from colourModel).
- `:17-37` `FeedCardModel`: `:24-28`
  ```
    /** 'route': lap label; 'plain': the ride's wall-clock duration, or '' when endMs <= startMs */
    heroLabel: string;
    heroTier: UiTier;         // 'route': detail.lapTier (neutral while ignored); 'plain': 'neutral'
    rankLabel: string | null; // 'P3/10' or null
    subLabel: string | null;  // non-clean quality ('estimated' | 'missed' | 'interrupted'), or 'ignored', else null
    ignored: boolean;
  ```
- `:61-82` `buildFeedCard`: `:64` `const sub = row.quality ?? (detail.ignored ? 'ignored' : null);` · `:71` `heroLabel: route ? row.lapLabel : durationLabel(meta),` · `:73` `rankLabel: route ? (row.rank ? `P${row.rank.pos}/${row.rank.of}` : null) : null,` · `:74` `subLabel: route ? sub : null,` · `:78` `sectors: route ? detail.sectorRows.map((r) => ({ label: r.label, timeLabel: sectorChipLabel(r, sectorQuality(r.index)), tier: r.tier })) : [],`
- `:118-124` `sectorGapLabel` is the last function in the file.

### `app/src/ui/activityCard.tsx` (149 lines)

- `:23` `import { CARD_MAP_HEIGHT, CARD_PAD_TOP, CARD_PAD_BOTTOM, FEED_DIVIDER_DP, type FeedCardModel } from './feedModel';`
- `:74-80` the hero row:
  ```
        <View style={[st.hero, card.ignored && st.dim]}>
          <Text style={[st.lap, { color: hero }]} numberOfLines={1}>{card.heroLabel}</Text>
          <View style={st.heroCol}>
            {card.rankLabel !== null ? <Text style={st.rank} numberOfLines={1}>{card.rankLabel}</Text> : null}
            {card.subLabel !== null ? <Text style={st.qual} numberOfLines={1}>{card.subLabel}</Text> : null}
          </View>
        </View>
  ```
- `:100-109` the strip:
  ```
        {card.variant === 'route' ? (
          <View style={st.strip}>
            {card.sectors.map((sec) => (
              ...
            ))}
          </View>
        ) : null}
  ```
- `:129` `hero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 46 },` · `:130` `lap: { fontSize: 34, ... lineHeight: 40 },` · `:133` `qual: { color: t.textDim, fontSize: 12.5, lineHeight: 16 },` · `:134` `dim: { opacity: 0.45 },` · `:144` `strip: { flexDirection: 'row', gap: 22, paddingHorizontal: 16, marginTop: 10, height: 24, alignItems: 'center' },`
- Geometry: hero row height 46 and strip row marginTop 10 + height 24 are fixed; nothing in this brief changes a height, so `CARD_HEIGHT_ROUTE` 307 / `CARD_HEIGHT_PLAIN` 273 and `getItemLayout` stay exact. `numberOfLines={1}` count is 8 today and stays 8 (one Text swapped for another, see § 2b).

### `app/src/ui/rideHistoryModel.ts` (315 lines)

- `:32-47` `lapCellLabel` doc comment + body:
  ```
  export function lapCellLabel(lapS: number | null, estimated: boolean, rawS: number | null): string {
    if (lapS !== null) return fmt(lapS, 1);
    if (estimated && rawS !== null) return `~${fmt(rawS)}`;
    return 'no lap';
  }
  ```
- `:166` `          lapLabel: 'no lap',` (the "no result / no way" row; a 'plain' feed card never reads it, `heroLabel` is `durationLabel(meta)` for that variant).
- `:174` `      const lapLabel = lapCellLabel(lapS, lap.quality === 'estimated', lap.rawS);`
- `:107` doc-comment mention of `"new → new · no lap"` (comment, leave).

### `app/src/ui/rideDetailModel.ts` (151 lines)

- `:13` `import { lapCellLabel, buildSectorRows, type SectorRowModel } from './rideHistoryModel.ts';`
- `:19-44` `RideDetailModel`: `:25` `lapLabel: string;` · `:26` `lapTier: UiTier;` · `:27` `rankLine: string;` · `:28` `ignored: boolean;`
- `:60-87` `rankLineFor`: `:69` `if (r.ignored) return 'not ranked';` · `:86` `return r.estimated ? 'no time' : 'no lap';` (the `lapS !== null` branch `:70-85` returns `'no rank'` / `P{…} of {…} on this way` / `'too few to rank'` — unchanged).
- `:111-112` the free/none return: `return { ...base, kind, wayId: null, lapLabel: '–', lapTier: 'neutral', rankLine: '',` / `ignored: false, canToggleIgnore: false, promoteTarget: null, sectorRows: [], sectorColours: [] };`
- `:126` `    lapLabel: lapCellLabel(lapS, estimated, res.lap.rawS),` · `:128` `    rankLine: rankLineFor({ lapS, estimated, ignored }, hist, d.barred(wayId)),` · `:129` `    ignored,`
- `:143-151` `sectorHighlightColours` is the last function.
- Consumers of `lapLabel`: `RideDetailScreen.tsx:477` (big time) and `ReplayScreen.tsx:136/140` (lap flash time at the finish) and `:223` (`replay over · ${detail.rankLine || detail.lapLabel}`; `rankLine` is never '' for kind 'route', so the fallback is only reached for free/none, where lapLabel is '–').

### `app/src/ui/RideDetailScreen.tsx` (667 lines)

- `:39` `import { rideDetailFor, sectorHighlightColours } from './rideDetailModel.ts';`
- `:72` `import { durationLabel, sectorGapLabel } from './feedModel.ts';`
- `:477-478` (route branch, inside `<View style={styles.pad}>` after the name + date lines):
  ```
              <Text style={[st.big, { color: tierTextColour(model.lapTier, t) }, model.ignored && styles.dim]}>{model.lapLabel}</Text>
              <Text style={[styles.rankLine, { color: t.text2 }]}>{model.rankLine}</Text>
  ```
- `:554` `              <Text style={[styles.secTime, { color: tierTextColour(sec.tier, t) }]}>{sec.timeLabel}</Text>` — the pin `[styles.secTime, { color: tierTextColour(sec.tier, t) }]` (recordflow_suite:470) must survive byte for byte.
- `:636` `  name: { fontSize: 22, fontWeight: '800', marginTop: 16 },` · `:643` `  dim: { opacity: 0.45 },` (only use is `:477`).
- `st.big` `:655` `big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 10 },`
- Pins that must keep passing: recordflow_suite `virgin-cycle22 03` (`tierTextColour(` count >= 3, the secTime/secPos/secAvg style arrays, `todayTier={model.lapTier}`); `virgin-cycle23 03` (menu labels, back labels, `sectorGapLabel(sec.gapS)`, one `>Replay</Text>`, `height={320}`, no hex); `virgin-cycle20 08` (`>ref</Text>`, gone-list, em-dash scan over visible strings of RideDetailScreen/rideDetailModel/rideHistoryModel: **no em dash in any new rider string**).

### `app/src/ui/tower.tsx` (`:174-183`, the `ceremony` branch)

```
    if (ceremony) {
      // §3a.3: ranking a ride that just BECAME the definition is noise.
      const today = rowsAll.find((r) => r.today) ?? rowsAll[0];
      return (
        <View style={s.cerRow}>
          <Text style={s.cerLbl}>LAP</Text>
          <Text style={s.cerTime}>{today?.time ?? ''}</Text>
          <Text style={s.cerToday}>TODAY · unranked</Text>
        </View>
      );
    }
```
No caller passes `ceremony` today (`grep -rn "ceremony" app/src/ui/*.tsx` → tower.tsx only + a DemoScreen comment), so the row is unreachable in the real app; it is still a budgeted rider string and the word goes (§ 4).

### `app/src/ui/preview/PreviewScreen.tsx` + `preview/data.ts`

`PreviewScreen` is imported by NOTHING (`grep -rn "PreviewScreen\|preview/" app/src App.tsx` → only a comment in App.tsx:119 and theme.ts:94; the DEMO tab is `DemoScreen.tsx`, which does not import `preview/`). Dev-only dead mockup: its `IDEAL LAP`, `lap moving time ...`, `🔊 lap voice ...` strings are NOT rider-visible. **Left untouched** (allow-list entries stay).

### Tests that pin the current strings (all updated by § 3)

- `app/tests/feedmodel_suite.ts:24-27` import destructure; `:53-66` route test (`c.subLabel === null`); `:68-75` ignored test (`c.subLabel === 'ignored'`); `:77-80` "non-clean quality wins over ignored" (`c.subLabel === 'estimated'`).
- `app/tests/ridehistory_suite.ts:122-130` estimated → `~` pin; `:132-144` missed → `'no lap'` pin; `:236-240` pick-label fallback `lapLabel === 'no lap'`; `:259-273` `lapCellLabel` test.
- `app/tests/ridedetail_suite.ts:95` `m.rankLine === 'not ranked'`; `:110` `m.rankLine === 'no time'`; `:130-137` `rankLineFor` ignored-wins test (`line === 'not ranked'`).
- `app/tests/recordflow_suite.ts:320` `for (const kept of ["'not ranked'", "'no rank'", "'too few to rank'", "'no time'", "'no lap'"]) assert(model.includes(kept), ...)`; `:519-522` the tower `LAP` allow-list pin:
  ```
    // the stale allow-list entry went with the chip; the tower keeps its own LAP
    const allow = read('tests', 'ui-strings.allow.json');
    assert(!allow.includes('"file": "src/ui/chips.tsx"'), 'no chips.tsx allow-list entry left (LAP went with LiveLapChip)');
    assert(allow.includes('"file": "src/ui/tower.tsx",\n      "kind": "text",\n      "text": "LAP"'), 'tower.tsx keeps its LAP entry');
  ```
- `app/tests/replay_suite.ts:313/:327` pin `~3:20` on a SECTOR row's `timeLabel` (buildSectorRows is NOT changed by this brief; those pins stay).

## 1. Design decisions (settled by Fable; copy, do not re-derive)

1. **ONE pure rule, two consumers.** `unrankedForDisplay(quality, ignored)` lives in `feedModel.ts` (the coordinator's instruction) and is imported by `rideDetailModel.ts` (a value import from feedModel is safe: feedModel imports only TYPES from rideDetailModel, so there is no runtime cycle). Feed: `unrankedForDisplay(row.quality, detail.ignored)`; detail: `unrankedForDisplay(res.lap.quality, ignored)`. The function treats `null` and `'clean'` alike, so both callers pass what they already have. It reuses the existing `ignored` (= `ignoredFromRanking === true`) and leaves `canToggleIgnore` / `ignoreToggle` untouched (the way back).
2. **Where "Not ranked" sits on the card: the HERO slot, strip row reserved empty.** Reason: the hero row is the verdict line under the title; an empty 46 dp band between title and map reads as a broken layout, while 34 dp of extra air UNDER the map reads as bottom padding. Heights unchanged (hero 46, strip 10 + 24), so 307/273 and `getItemLayout` are untouched. Nathan's words were "the sector strip is replaced by a dim label": if he wants the label under the map instead, it is a one-line move (render `NOT_RANKED_LABEL` inside the reserved strip `View` and leave the hero `View` empty) — § 10 item 1.
3. **Label typography rule: the label takes the size of the title above it, in dim ink.** Card: fontSize 17 / weight 700 / `t.textDim` (the card title is 17). Detail: fontSize 22 / weight 700 / `t.textDim` (the name is 22), `marginTop: 10` like `st.big`. No opacity dimming on top (the old `dim` 0.45 overlay is removed on both surfaces: a dim colour on a dim colour would be unreadable at night).
4. **One string, one home.** `export const NOT_RANKED_LABEL = 'Not ranked';` in `feedModel.ts`; both screens render `{NOT_RANKED_LABEL}` (a JSX expression with an identifier is not scanned, so the allow-list carries exactly ONE new entry `src/ui/feedModel.ts | literal | Not ranked`).
5. **No quality words on the card, period.** `FeedCardModel.subLabel` is REMOVED (not emptied) so no future card can show one; the `qual` style goes with it. `rankLabel` stays (`P3/10`) for ranked cards; `sectors` is `[]` for an unranked card.
6. **Detail reason line, reworded** (`rankLineFor`): ignored → `ignored in ranking` (was `not ranked`: it would duplicate the big label and it does not say WHY; the menu item it mirrors is `Count in ranking`); `estimated` → `GPS gap at a gate` (an "estimated" crossing is a gate fired from a gap in the trace, derive.ts header; no "estimated" word); `missed` → `a gate was missed` (covers both `excluded_nocross` and the off-route detour). `no rank` (tripwire) and `too few to rank` unchanged (those rides keep their time). Nathan to review the three wordings (§ 10 item 3).
7. **`lapCellLabel` keeps its name and 3-parameter signature, returns `''` instead of `~raw` / `no lap`.** Callers unchanged. A ranked time still formats `fmt(lapS, 1)`. `RideRowModel.lapLabel` for a "no result" row becomes `''` (never read by the feed: a 'plain' card's hero is `durationLabel(meta)`). `RideDetailModel.lapLabel` for an unranked route becomes `''`: the detail never renders it (it renders the label), and REPLAY's finish flash (`replayLiveViewModel` `time: lapLabel`) shows an empty flash instead of `~12:34` / `no lap` for such a ride — honest, no estimate; replay's own sector flashes (`~m:ss`, a LIVE concept mirrored from the bike) are out of scope and `buildSectorRows` is not touched.
8. **Detail sector cell** (`sectorTimeCell(row)` in rideDetailModel.ts): `row.tier === 'est' ? '' : row.timeLabel`. `tierFor(null)` is the ONLY producer of `'est'` (colourModel.ts:173), and buildSectorRows sets it exactly for `missed` / `estimated` rows, so `'est'` ⇔ no real time. The style array on that Text is kept byte for byte (pinned). `avg` and gap columns unchanged.
9. **`LAP` → `TIME` on the tower ceremony row** (unreachable today, still budgeted): same kind `text`, 4 chars; allow-list entry text edited in place + re-sort; the recordflow pin on that entry is updated to `TIME`.
10. **Preview mockup strings left alone** (dev-only, not mounted — § 0).
11. **Nothing else is reworded.** `Interrupted · saved as free activity` (RecordScreen:117) is the RECORDING-interrupted banner text, not the lap quality; `P{…} of {…} on this way`, `no rank`, `too few to rank`, `TODAY · unranked`, `NO TIME` (RESULTS tab, cycle 25's file) are not touched by this brief.

## 2. Changes, file by file (in this order)

### 2a. `app/src/ui/feedModel.ts`

1. Interface `FeedCardModel`: replace the two lines
   ```
     subLabel: string | null;  // non-clean quality ('estimated' | 'missed' | 'interrupted'), or 'ignored', else null
     ignored: boolean;
   ```
   with
   ```
     /** brief 05 (Nathan 2026-10-07): a route activity that cannot be ranked (unrankedForDisplay):
      * the card shows NOT_RANKED_LABEL in the hero slot, no time, no rank, no quality word, and
      * leaves the strip row empty. Always false for 'plain'. */
     unranked: boolean;
     ignored: boolean;
   ```
   and change the `heroLabel` doc line `:24` to
   ```
     /** 'route': the time (fmt m:ss.d), '' when unranked; 'plain': the ride's wall-clock duration, or '' when endMs <= startMs */
   ```
2. After the `CARD_HEIGHT_PLAIN` line (`export const CARD_HEIGHT_PLAIN = 273;`) insert:
   ```

   /** The one rider-facing verdict for an activity that cannot be ranked (feed card hero slot and
    * the detail page's big slot). brief 05, Nathan 2026-10-07: "either a ride is good and ranked,
    * or it is not, gets no time, no rank". */
   export const NOT_RANKED_LABEL = 'Not ranked';

   /** brief 05: the ONE rule for "no time, no rank, 'Not ranked'" on the feed card and the detail
    * page. `quality` is the lap quality as stored (store/derive.ts: 'clean' | 'interrupted' |
    * 'estimated' | 'missed') or RideRowModel.quality (null for clean). Unranked ⇔ the rider
    * ignored it (ignoredFromRanking) OR the lap has no real time (estimated / missed: scoredS is
    * null by construction, results.ts ranks() refuses it). 'interrupted' has a real moving time
    * and is ranked like clean. A ranked time without a position ('too few to rank', tripwire
    * 'no rank') is NOT unranked: the time is real, only the rank line says there is no position. */
   export function unrankedForDisplay(quality: string | null, ignored: boolean): boolean {
     return ignored || quality === 'estimated' || quality === 'missed';
   }
   ```
3. `buildFeedCard`: replace the body so that it reads (the whole function; keep the signature line as is):
   ```
   export function buildFeedCard(row: RideRowModel, detail: RideDetailModel, meta: RideMeta | null,
     sectorQuality: (index: number) => string): FeedCardModel {
     const route = detail.kind === 'route';
     const unranked = route && unrankedForDisplay(row.quality, detail.ignored);
     return {
       rideId: row.rideId,
       startMs: row.startMs,
       dateLabel: row.dateLabel,
       title: row.wayName,
       variant: route ? 'route' : 'plain',
       heroLabel: route ? (unranked ? '' : row.lapLabel) : durationLabel(meta),
       heroTier: route ? detail.lapTier : 'neutral',
       rankLabel: route && !unranked && row.rank ? `P${row.rank.pos}/${row.rank.of}` : null,
       unranked,
       ignored: detail.ignored,
       wayId: route ? detail.wayId : null,
       sectorColours: detail.sectorColours,
       sectors: route && !unranked ? detail.sectorRows.map((r) => ({ label: r.label, timeLabel: sectorChipLabel(r, sectorQuality(r.index)), tier: r.tier })) : [],
       needsTrail: !route,
       ignoreToggle: detail.canToggleIgnore ? (detail.ignored ? 'count' : 'ignore') : null,
     };
   }
   ```
   (The `const sub = ...` line is gone; `'ignored'` no longer appears as a literal in this file. `wayId`, `sectorColours` are unchanged so an unranked card still draws the reference line in sector colours — the MAP is not a verdict.)
4. Header comment `:1-6`: no change needed.

### 2b. `app/src/ui/activityCard.tsx`

1. `:23` → `import { CARD_MAP_HEIGHT, CARD_PAD_TOP, CARD_PAD_BOTTOM, FEED_DIVIDER_DP, NOT_RANKED_LABEL, type FeedCardModel } from './feedModel';`
2. Hero row `:74-80` → 
   ```
         <View style={st.hero}>
           {card.unranked
             ? <Text style={st.notRanked} numberOfLines={1}>{NOT_RANKED_LABEL}</Text>
             : <Text style={[st.lap, { color: hero }]} numberOfLines={1}>{card.heroLabel}</Text>}
           <View style={st.heroCol}>
             {card.rankLabel !== null ? <Text style={st.rank} numberOfLines={1}>{card.rankLabel}</Text> : null}
           </View>
         </View>
   ```
   (`grep -c "numberOfLines={1}"` is 8 today: the header comment + title, date, lap, rank, qual, chipLabel, chipTime. After: the `qual` Text is gone and the `notRanked` Text is added → still 8. Verified in § 6.)
3. Strip `:100-109` → 
   ```
         {card.variant === 'route' ? (
           <View style={st.strip}>
             {card.sectors.map((sec) => (
               <View key={sec.label} style={st.chip}>
                 <Text style={st.chipLabel} numberOfLines={1}>{sec.label}</Text>
                 <Text style={[st.chipTime, { color: tierTextColour(sec.tier, t) }]} numberOfLines={1}>{sec.timeLabel}</Text>
               </View>
             ))}
           </View>
         ) : null}
   ```
   i.e. NO change to the JSX: `card.sectors` is `[]` for an unranked card, so the strip `View` renders empty at its reserved height (marginTop 10 + height 24). Add the comment line directly above `{card.variant === 'route' ? (`:
   ```
         {/* brief 05: an unranked card has sectors [] — the row stays, empty, so every route card is 307 dp */}
   ```
4. Styles: replace `:133-134`
   ```
     qual: { color: t.textDim, fontSize: 12.5, lineHeight: 16 },
     dim: { opacity: 0.45 },
   ```
   with
   ```
     notRanked: { color: t.textDim, fontSize: 17, fontWeight: '700', lineHeight: 22 },
   ```
5. Header comment: append one line to the doc block (after `by the SETTINGS toggle exactly like the detail page.`, before ` */`):
   ```
    * brief 05 (Nathan 2026-10-07): an activity that cannot be ranked shows "Not ranked" in the
    * hero slot and an empty strip row; no time, no rank, no quality word (feedModel.unrankedForDisplay).
   ```
   Unchanged: `MenuButton`, `useRideTrail`, `showMap`, the `<WayMapView` element, `block`/`head`/`mapSlot`/`strip`/`dots` styles, `CARD_MAP_GESTURES`.

### 2c. `app/src/ui/rideHistoryModel.ts`

1. `lapCellLabel` `:32-47`: replace the doc comment + body with
   ```
   /**
    * The time-cell rule, shared by the ACTIVITIES feed (buildRideRows below) and the detail page
    * (rideDetailModel.ts) so the two can never show a contradictory verdict for the same ride.
    * D-025: never display an unearned time as if it were genuine. brief 05 (Nathan 2026-10-07):
    * nothing is ever shown as an estimate either — a lap with no real time (scoredS null:
    * estimated or missed) has NO label at all ('' — the surfaces show NOT_RANKED_LABEL instead,
    * feedModel.unrankedForDisplay); the old `~rawS` / 'no lap' forms are gone. `estimated` and
    * `rawS` are kept in the signature (now unused) so the two callers stay as they are. */
   export function lapCellLabel(lapS: number | null, estimated: boolean, rawS: number | null): string {
     if (lapS !== null) return fmt(lapS, 1);
     return '';
   }
   ```
   (tsconfig has `strict` only, no `noUnusedParameters`: unused parameters are not an error. Do not rename or drop them.)
2. `:166` `          lapLabel: 'no lap',` → `          lapLabel: '',` (the "no result / no way" row; comment on `:107` is a doc comment and stays).
3. `:174` unchanged (`lapCellLabel(lapS, lap.quality === 'estimated', lap.rawS)`).

### 2d. `app/src/ui/rideDetailModel.ts`

1. `:13` keep; ADD after it: `import { unrankedForDisplay } from './feedModel.ts';`
2. `RideDetailModel`: after `  rankLine: string;` (`:27`) insert
   ```
     /** brief 05: no real time (estimated / missed) or ignored → the page shows NOT_RANKED_LABEL
      * instead of lapLabel + rank; feedModel.unrankedForDisplay, the same rule the feed card uses.
      * false for 'free' and 'none'. */
     unranked: boolean;
   ```
3. `rankLineFor`: replace `:69` `  if (r.ignored) return 'not ranked';` with `  if (r.ignored) return 'ignored in ranking';` and `:86` `  return r.estimated ? 'no time' : 'no lap';` with `  return r.estimated ? 'GPS gap at a gate' : 'a gate was missed';`. Update the doc comment `:60-63` by appending ` brief 05 (Nathan 2026-10-07): no 'lap', no 'no time', no 'estimated' — the three unranked lines say what happened (the big slot already says "Not ranked").` to its last line before ` */`.
4. Free/none return `:111-112`: add `unranked: false,` after `rankLine: '',` so it reads `... lapLabel: '–', lapTier: 'neutral', rankLine: '', unranked: false,` (one line, keep the rest).
5. Route return: after `    rankLine: rankLineFor({ lapS, estimated, ignored }, hist, d.barred(wayId)),` insert `    unranked: unrankedForDisplay(res.lap.quality, ignored),`.
6. Append at the end of the file (after `sectorHighlightColours`):
   ```

   /** brief 05: the SECTORS time cell on the detail page. A row without a real time (buildSectorRows
    * gives it tier 'est' — the only producer of 'est' is tierFor(null)) shows nothing, never `~m:ss`
    * or a dash-prose; avg and gap columns are untouched. */
   export function sectorTimeCell(row: Pick<SectorRowModel, 'tier' | 'timeLabel'>): string {
     return row.tier === 'est' ? '' : row.timeLabel;
   }
   ```

### 2e. `app/src/ui/RideDetailScreen.tsx` (shared file: re-read each region first)

1. `:39` → `import { rideDetailFor, sectorHighlightColours, sectorTimeCell } from './rideDetailModel.ts';`
2. `:72` → `import { NOT_RANKED_LABEL, durationLabel, sectorGapLabel } from './feedModel.ts';`
3. `:477` (the big time line, quoted in § 0) → two lines:
   ```
               {model.unranked
                 ? <Text style={[styles.notRanked, { color: t.textDim }]}>{NOT_RANKED_LABEL}</Text>
                 : <Text style={[st.big, { color: tierTextColour(model.lapTier, t) }]}>{model.lapLabel}</Text>}
   ```
   (`:478` the rankLine Text stays directly below, unchanged: it is the reason line.)
4. `:554` → `              <Text style={[styles.secTime, { color: tierTextColour(sec.tier, t) }]}>{sectorTimeCell(sec)}</Text>` (only the child changes; the style array is pinned).
5. `makeStyles` `:643` `  dim: { opacity: 0.45 },` → `  notRanked: { fontSize: 22, fontWeight: '700', marginTop: 10 },` (same slot; `dim` had no other use — verify `grep -c "styles.dim" app/src/ui/RideDetailScreen.tsx` → 0 after the edit).
6. Nothing else: the four entry points / back labels, menu, Replay button, suggestion rows, PbDetail, map props untouched.

### 2f. `app/src/ui/tower.tsx`

`:179` `        <Text style={s.cerLbl}>LAP</Text>` → `        <Text style={s.cerLbl}>TIME</Text>`. Nothing else in the file.

## 3. Tests (add / update; +6 tests net)

Fixtures already in place: `feedmodel_suite.ts` `row()`, `detail()`, `sec()`, `q`; `ridedetail_suite.ts` `mkResult`, `NOOP_DEPS`, `MIN_HISTORY`; `ridehistory_suite.ts` `makeResult`, `fmt`.

### 3a. `app/tests/feedmodel_suite.ts`

1. Import destructure `:24-27`: add `unrankedForDisplay, NOT_RANKED_LABEL,` after `durationLabel, sectorChipLabel,`.
2. Test `:53` rename to `'feedmodel: buildFeedCard route — hero is the time in the detail\'s tier, rank P<pos>/<of>, no quality word, strip = one chip per sector row'`; replace `  assert(c.subLabel === null, 'subLabel null');` with `  assert(c.unranked === false, 'ranked');` and add after it `  assert(!('subLabel' in c), 'no subLabel field at all (brief 05)');`.
3. Test `:68` rename to `'feedmodel: buildFeedCard route — ignored ride is unranked: no time, no rank, no strip, toggle \'count\' is the way back'`; body →
   ```
     const c = buildFeedCard(row({ rank: null, quality: null }), detail({ ignored: true, lapTier: 'neutral', canToggleIgnore: true }), null, q);
     assert(c.unranked === true, 'unranked');
     assert(c.heroLabel === '', `no time, got "${c.heroLabel}"`);
     assert(c.rankLabel === null, 'no rank');
     assert(c.sectors.length === 0, 'no strip');
     assert(c.title === 'Morning', 'title kept');
     assert(c.wayId === 'w1' && c.variant === 'route', 'still a route card (not a free activity)');
     assert(c.ignored === true, 'ignored');
     assert(c.ignoreToggle === 'count', 'count');
   ```
4. REPLACE test `:77-80` (`a non-clean quality wins over 'ignored' in the sub label`) with TWO tests:
   ```
   test('feedmodel: buildFeedCard route — estimated / missed lap is unranked: no time, no ~, no rank, no strip; title + map kept', () => {
     for (const quality of ['estimated', 'missed'] as const) {
       const c = buildFeedCard(row({ quality, lapS: null, lapLabel: '', rank: null }), detail({ lapTier: 'est', canToggleIgnore: false, sectorRows: [sec(1, '~1:30', 'est'), sec(2, '– did not traverse –', 'est')] }), null, q);
       assert(c.unranked === true, `${quality}: unranked`);
       assert(c.heroLabel === '' && c.rankLabel === null && c.sectors.length === 0, `${quality}: nothing but the label`);
       assert(c.title === 'Morning' && c.wayId === 'w1' && c.variant === 'route', `${quality}: title/map kept, still a route card`);
       assert(c.ignoreToggle === null, `${quality}: nothing to toggle (it never ranked)`);
       for (const v of Object.values(c)) assert(typeof v !== 'string' || !/~|no lap|estimated|missed|interrupted|ignored/.test(v), `${quality}: card string "${v}" leaks a quality word or an estimate`);
     }
   });

   test('feedmodel: buildFeedCard route — an interrupted lap is an ordinary ranked card (real moving time): time, rank, strip', () => {
     const c = buildFeedCard(row({ quality: 'interrupted' }), detail(), null, q);
     assert(c.unranked === false, 'ranked');
     assert(c.heroLabel === '5:03.0' && c.rankLabel === 'P1/10' && c.sectors.length === 2, 'normal hero + strip');
     for (const v of Object.values(c)) assert(typeof v !== 'string' || !/interrupted/.test(v), `card string "${v}" says interrupted`);
   });
   ```
5. NEW test, inserted directly after the `durationLabel` test:
   ```
   test('feedmodel: unrankedForDisplay — the one rule: ignored OR estimated OR missed; clean/interrupted/null are ranked; NOT_RANKED_LABEL pinned', () => {
     assert(NOT_RANKED_LABEL === 'Not ranked', 'label text');
     const matrix: [string | null, boolean, boolean][] = [
       [null, false, false], ['clean', false, false], ['interrupted', false, false],
       ['estimated', false, true], ['missed', false, true],
       [null, true, true], ['clean', true, true], ['interrupted', true, true], ['estimated', true, true], ['missed', true, true],
     ];
     for (const [quality, ignored, want] of matrix) assert(unrankedForDisplay(quality, ignored) === want, `unrankedForDisplay(${quality}, ${ignored}) should be ${want}`);
   });
   ```
   Net for this suite: +2 (one replaced by two, one new).

### 3b. `app/tests/ridehistory_suite.ts` (updates only, 0 net)

1. `:122` test: rename to `'ridehistory: buildRideRows — an estimated lap has NO label (brief 05: nothing is shown as an estimate), never gets lapS or a rank'`; `:127` → `  assert(rows[0].lapLabel === '', `estimated lapLabel must be '' (no ~raw), got "${rows[0].lapLabel}"`);`.
2. `:132` test: rename to `'ridehistory: buildRideRows — a missed-gate lap (quality missed) has NO label, never a bare raw number'`; `:141` → `  assert(rows[0].lapLabel === '', `missed-gate lapLabel must be '', got "${rows[0].lapLabel}"`);`.
3. `:239` → `  assert(rows[0].wayName === 'new → new' && rows[0].lapLabel === '', `got ${rows[0].wayName} / ${rows[0].lapLabel}`);`.
4. `:259-273` `lapCellLabel` test: rename to `'ridehistory: lapCellLabel — real time formats fmt(_, 1); anything without a real time is \'\' (brief 05: no ~raw, no "no lap")'`; the four asserts become: `fmt(500, 1)` unchanged; `lapCellLabel(null, true, 900) === ''`; `lapCellLabel(null, false, 900) === ''`; `lapCellLabel(null, false, null) === ''` (keep the explanatory comments, adjust their last words).

### 3c. `app/tests/ridedetail_suite.ts`

1. `:95` → `  assert(m.rankLine === 'ignored in ranking', `unexpected rank line: "${m.rankLine}"`);` and add after it `  assert(m.unranked === true, 'ignored → unranked (brief 05)');`.
2. `:102` test rename `'ridedetail: rideDetailFor — estimated lap → canToggleIgnore false, unranked, reason line says what happened'`; `:110` → `  assert(m.rankLine === 'GPS gap at a gate', `unexpected rank line: "${m.rankLine}"`);` + `  assert(m.unranked === true && m.lapLabel === '', 'estimated → unranked, no label (no ~)');`.
3. `:116` test (tripwire): add after the `no rank` assert: `  assert(m.unranked === false, 'a real time without a position is NOT unranked (brief 05)');`.
4. `:136` → `  assert(line === 'ignored in ranking', `expected the ignored line, got "${line}"`);`.
5. NEW test after the `rankLineFor — ignored wins` test:
   ```
   test('brief 05: rideDetailFor.unranked follows feedModel.unrankedForDisplay — missed/estimated/ignored true, clean/interrupted/free/none false; missed reason line', () => {
     const hist = Array.from({ length: MIN_HISTORY }, () => 900);
     const mk = (quality: 'clean' | 'interrupted' | 'estimated' | 'missed', ignored = false) => rideDetailFor('x', 1, {
       ...NOOP_DEPS, laps: () => hist,
       result: mkResult({ rideId: 'x', startedAtMs: 1, ignoredFromRanking: ignored, lap: { rawS: 900, movingS: quality === 'estimated' || quality === 'missed' ? null : 850, quality } }),
     });
     assert(mk('clean').unranked === false && mk('interrupted').unranked === false, 'real time → ranked');
     assert(mk('estimated').unranked === true && mk('missed').unranked === true, 'no real time → unranked');
     assert(mk('clean', true).unranked === true && mk('interrupted', true).unranked === true, 'ignored → unranked');
     assert(mk('missed').rankLine === 'a gate was missed', `missed reason, got "${mk('missed').rankLine}"`);
     assert(mk('missed').lapLabel === '' && mk('estimated').lapLabel === '', 'no label without a real time');
     assert(rideDetailFor('n', 1, NOOP_DEPS).unranked === false, 'kind none → false');
     for (const m of [mk('estimated'), mk('missed'), mk('clean', true)]) {
       for (const v of [m.lapLabel, m.rankLine]) assert(!/~|no lap|no time|estimated/.test(v), `detail string "${v}" leaks an estimate or the old wording`);
     }
   });

   test('brief 05: sectorTimeCell — tier est (no real time) shows nothing; every other row its own time label', () => {
     assert(sectorTimeCell({ tier: 'est', timeLabel: '~1:30' }) === '', 'estimated row → blank');
     assert(sectorTimeCell({ tier: 'est', timeLabel: '– did not traverse –' }) === '', 'missed row → blank');
     for (const tier of ['purple', 'green', 'yellow', 'neutral'] as const) assert(sectorTimeCell({ tier, timeLabel: '1:41.0' }) === '1:41.0', `${tier} keeps its time`);
   });
   ```
   For `sectorTimeCell`, extend the suite's existing destructure at `:32` to `const { rankLineFor, rideDetailFor, sectorColoursFor, sectorHighlightColours, sectorTimeCell } = await import('../src/ui/rideDetailModel.ts');`. If `mkResult` does not accept a partial `lap` the way the existing `:103-107` test uses it, STOP and quote its signature. Net: +2.

### 3d. `app/tests/recordflow_suite.ts` (shared file: re-read before editing)

1. `:320` → `  for (const kept of ["'ignored in ranking'", "'no rank'", "'too few to rank'", "'GPS gap at a gate'", "'a gate was missed'"]) assert(model.includes(kept), `rankLine lacks ${kept}`);`
2. `:519-522` → 
   ```
     // the stale allow-list entry went with the chip; the tower keeps its own label (LAP → TIME, virgin-cycle23 brief 05)
     const allow = read('tests', 'ui-strings.allow.json');
     assert(!allow.includes('"file": "src/ui/chips.tsx"'), 'no chips.tsx allow-list entry left (LAP went with LiveLapChip)');
     assert(allow.includes('"file": "src/ui/tower.tsx",\n      "kind": "text",\n      "text": "TIME"'), 'tower.tsx keeps its label entry, now TIME');
   ```
3. NEW test, inserted directly after the `virgin-cycle23 04: WayMapView bleed ...` test's closing `});`:
   ```
   test('virgin-cycle23 05: unranked activities show "Not ranked" (feed hero + detail big slot), no quality words, no ~, no "lap" in the real screens', () => {
     const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
     const card = read('src', 'ui', 'activityCard.tsx');
     assert(card.includes('{card.unranked') && card.includes('{NOT_RANKED_LABEL}') && card.includes('st.notRanked'), 'card hero shows the label when unranked');
     for (const gone of ['subLabel', 'st.qual', 'st.dim', 'card.ignored &&']) assert(!card.includes(gone), `card still has ${gone}`);
     assert((card.match(/numberOfLines=\{1\}/g) ?? []).length === 8, 'every text row still single-line (8 incl. the header comment)');
     assert(card.includes('{card.variant === \'route\' ? (') && card.includes('{card.sectors.map((sec) => ('), 'strip row kept (renders empty when sectors is [])');
     const feed = read('src', 'ui', 'feedModel.ts');
     assert(feed.includes("export const NOT_RANKED_LABEL = 'Not ranked';") && feed.includes('export function unrankedForDisplay('), 'label + rule live in feedModel');
     assert(!feed.includes("'ignored'") && !feed.includes('subLabel'), 'no quality word, no subLabel in the feed model');
     const det = read('src', 'ui', 'RideDetailScreen.tsx');
     assert(det.includes('{model.unranked') && det.includes('{NOT_RANKED_LABEL}') && det.includes('styles.notRanked') && det.includes('{sectorTimeCell(sec)}'), 'detail big slot + sector cell');
     assert(!det.includes('styles.dim') && det.includes('[styles.secTime, { color: tierTextColour(sec.tier, t) }]'), 'dim gone; sector time style pinned');
     const model = read('src', 'ui', 'rideDetailModel.ts');
     const hist = read('src', 'ui', 'rideHistoryModel.ts');
     for (const gone of ["'no lap'", "'no time'", "'not ranked'", '`~${']) assert(!model.includes(gone), `old wording/estimate still in rideDetailModel: ${gone}`);
     assert(!hist.includes("'no lap'") && !hist.includes('`~${fmt(rawS)}`'), 'rideHistoryModel: no "no lap", no ~raw lap label (buildSectorRows keeps its own ~ row for replay)');
     assert(model.includes("import { unrankedForDisplay } from './feedModel.ts';") && model.includes('unranked: unrankedForDisplay(res.lap.quality, ignored),'), 'detail model uses the one rule');
     const tower = read('src', 'ui', 'tower.tsx');
     assert(tower.includes('>TIME</Text>') && !tower.includes('>LAP</Text>'), 'tower ceremony label');
     const allow = read('tests', 'ui-strings.allow.json');
     assert(allow.includes('"text": "Not ranked"') && !allow.includes('"text": "no lap"') && !allow.includes('"text": "no time"'), 'allow-list follows the code');
   });
   ```
   (`rideHistoryModel.ts` keeps the `~${fmt(sec.rawS)}` form in `buildSectorRows` for replay, so the history file is only checked for the old lapCellLabel form `~${fmt(rawS)}` and for `'no lap'`.) Net: +1.

### 3e. `app/tests/ui_strings_suite.ts` (shared file: re-read, append at the end)

```
test('virgin-cycle23 brief 05 (Nathan 2026-10-07): no rider-facing "lap" outside the unmounted preview mockup', () => {
  const found = scanFiles(APP_DIR);
  const hits = found.strings.filter((s) => !s.file.startsWith('src/ui/preview/') && /\blaps?\b/i.test(s.text));
  assert(hits.length === 0, `"lap" in a rider string:\n${hits.map((h) => `${h.file}:${h.line} | ${h.kind} | ${h.text}`).join('\n')}`);
});
```
Net: +1. (Before the code edits this test must FAIL with exactly three hits: rideDetailModel.ts `no lap`, rideHistoryModel.ts `no lap`, tower.tsx `LAP` — run it once before § 2 if you want the proof; not required.)

### Summary

| suite | test | change |
|---|---|---|
| feedmodel_suite | route card (renamed) | UPDATED: `unranked === false`, no `subLabel` field |
| feedmodel_suite | ignored card (renamed) | UPDATED: unranked matrix of fields |
| feedmodel_suite | estimated / missed unranked | NEW (replaces "non-clean quality wins") |
| feedmodel_suite | interrupted is ranked | NEW |
| feedmodel_suite | unrankedForDisplay matrix + label pin | NEW |
| ridehistory_suite | estimated, missed, pick fallback, lapCellLabel | UPDATED to `''` |
| ridedetail_suite | ignored, estimated, tripwire, rankLineFor | UPDATED wording + `unranked` |
| ridedetail_suite | unranked matrix via rideDetailFor | NEW |
| ridedetail_suite | sectorTimeCell | NEW |
| recordflow_suite | cycle20 08 kept-list, cycle22 04 tower LAP pin | UPDATED |
| recordflow_suite | virgin-cycle23 05 source pins | NEW |
| ui_strings_suite | no "lap" in rider strings | NEW |

Expected: baseline + 6, zero FAIL, 3 skips unchanged.

## 4. Rider-string inventory and allow-list (`app/tests/ui-strings.allow.json`)

Scanner facts (RULINGS.md R3): keys are `file|kind|text`; Tier-B `literal` strings need two words (`isProse`); a JSX expression that is an identifier (`{NOT_RANKED_LABEL}`) is NOT scanned; single words like `'ignored'` are not prose and were never listed. The scan today lists these `lap` strings outside the preview folder: `src/ui/rideDetailModel.ts | literal | no lap`, `src/ui/rideHistoryModel.ts | literal | no lap`, `src/ui/tower.tsx | text | LAP`. Everything the scan finds that says `lap`, `ranked`, `no time`, `estimated`, `interrupted`, `missed` or `ignored` (run on 2026-10-07 20:40) and the verdict:

| file:line | kind | old text | new text | allow-list action |
|---|---|---|---|---|
| rideHistoryModel.ts:46 | literal | `no lap` | (none: `''`) | REMOVE entry |
| rideHistoryModel.ts:166 | literal (same key as :46, de-duplicated per file) | `no lap` | `''` | covered by the row above |
| rideDetailModel.ts:86 | literal | `no lap` | `a gate was missed` | REMOVE `no lap`; ADD `a gate was missed` |
| rideDetailModel.ts:86 | literal | `no time` | `GPS gap at a gate` | REMOVE `no time`; ADD `GPS gap at a gate` |
| rideDetailModel.ts:69 | literal | `not ranked` | `ignored in ranking` | REMOVE `not ranked`; ADD `ignored in ranking` |
| rideDetailModel.ts:71, :84 | literal | `no rank`, `too few to rank` | unchanged | none |
| rideDetailModel.ts:82 | literal | `P{…} of {…} on this way` | unchanged | none |
| feedModel.ts (new) | literal | (new) | `Not ranked` | ADD |
| feedModel.ts:64 | (one word, never listed) | `'ignored'` | removed | none |
| activityCard.tsx | (rendered data, never literals here) | `subLabel`: `interrupted` / `estimated` / `missed` / `ignored` | gone | none |
| RideDetailScreen.tsx | (rendered data) | `{model.lapLabel}`: `~12:34`, `no lap` | `{NOT_RANKED_LABEL}` identifier | none |
| tower.tsx:179 | text | `LAP` | `TIME` | EDIT text (same entry object; reason/since/by untouched) |
| tower.tsx:181 | text | `TODAY · unranked` | unchanged | none |
| RecordScreen.tsx:117 | literal | `Interrupted · saved as free activity` | unchanged (the RECORDING was interrupted, not a lap quality) | none |
| RideDetailScreen.tsx:424-425, RidesScreen.tsx:205-206 | prop:label | `Count in ranking`, `Ignore in ranking` | unchanged (the way back) | none |
| CatalogDetailScreen.tsx:415 `ranked`; resultsPlot.tsx:104 `no ranked activities yet`; resultsListModel.ts / towerModel.ts `NO TIME`; GateAdjustScreen.tsx alerts | various | unchanged (RESULTS / MAP surfaces, cycles 24-25) | none |
| preview/PreviewScreen.tsx:330 `IDEAL LAP`, :334, :390; preview/data.ts:104 + the `🔊 lap voice` / `lap estimated` captions | text / literal | unchanged: `PreviewScreen` is imported by nothing (dev-only mockup) | none |

Net allow-list diff: **+4 entries added, -4 removed, 1 text edit** (`LAP` -> `TIME`). Entry count stays 455 (`legacyCount` 32 untouched, no `legacy: true` entry touched). All new strings: no em dash, <= 40 chars (`a gate was missed` 17, `GPS gap at a gate` 17, `ignored in ranking` 18, `Not ranked` 10), so no `long` flag.

Do the WHOLE edit with ONE python read-modify-write (the file round-trips byte for byte under `json.dump(indent=2, ensure_ascii=False)` + trailing newline, verified 2026-10-07). Use a heredoc delimiter other than EOF if you nest it in another heredoc:

```
python3 - <<'PY'
import json, os
p = os.path.expanduser('~/mnt/Qualifire/app/tests/ui-strings.allow.json')
raw = open(p, encoding='utf-8').read()
d = json.loads(raw)
assert json.dumps(d, indent=2, ensure_ascii=False) + '\n' == raw, 'file no longer round-trips: STOP'
e = d['entries']
def drop(file, kind, text):
    n = len(e); e[:] = [x for x in e if not (x['file'] == file and x['kind'] == kind and x['text'] == text)]
    assert len(e) == n - 1, f'expected exactly one entry {file}|{kind}|{text}'
drop('src/ui/rideHistoryModel.ts', 'literal', 'no lap')
drop('src/ui/rideDetailModel.ts', 'literal', 'no lap')
drop('src/ui/rideDetailModel.ts', 'literal', 'no time')
drop('src/ui/rideDetailModel.ts', 'literal', 'not ranked')
tower = [x for x in e if x['file'] == 'src/ui/tower.tsx' and x['kind'] == 'text' and x['text'] == 'LAP']
assert len(tower) == 1, 'tower LAP entry'
tower[0]['text'] = 'TIME'
BY = 'Sonnet execute, virgin-cycle23 brief 05'
for file, text, reason in [
    ('src/ui/feedModel.ts', 'Not ranked', 'virgin-cycle23 brief 05 (Nathan 2026-10-07): the one verdict for an activity that cannot be ranked (feed hero slot + detail big slot); replaces ~time / no lap / quality words'),
    ('src/ui/rideDetailModel.ts', 'ignored in ranking', 'virgin-cycle23 brief 05: detail reason line for a rider-ignored activity (was "not ranked"; the big label says that now)'),
    ('src/ui/rideDetailModel.ts', 'GPS gap at a gate', 'virgin-cycle23 brief 05: detail reason line for an estimated lap (was "no time"; no "estimated" word)'),
    ('src/ui/rideDetailModel.ts', 'a gate was missed', 'virgin-cycle23 brief 05: detail reason line for a missed-gate lap (was "no lap"; no "lap" word, Nathan 2026-10-07)'),
]:
    assert not any(x['file'] == file and x['kind'] == 'literal' and x['text'] == text for x in e), f'already listed: {text}'
    e.append({'file': file, 'kind': 'literal', 'text': text, 'reason': reason, 'since': '2026-10-07', 'by': BY})
e.sort(key=lambda x: (x['file'], x['kind'], x['text']))
assert len(e) == 455, len(e)
open(p, 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print('ok', len(e))
PY
```

(Entry field order in the file is `file, kind, text, reason, since, by`; the dict literal above keeps that order so the new entries serialise like their neighbours.) If the suite reports any UNLISTED / STALE string not in this table -> STOP and quote it (another session's edit).

Expected `git diff -- app/tests/ui-strings.allow.json`: a new one-entry `src/ui/feedModel.ts` block (`Not ranked`) at its sorted slot; the `src/ui/rideDetailModel.ts` literal block loses `no lap`, `no time`, `not ranked` and gains `GPS gap at a gate`, `a gate was missed`, `ignored in ranking` (code-unit order: `GPS gap at a gate`, `P{…} of {…} on this way`, `a gate was missed`, `ignored in ranking`, `no rank`, `too few to rank`); `src/ui/rideHistoryModel.ts` loses `no lap`; `src/ui/tower.tsx` `LAP` becomes `TIME` in place (`TI` < `TO`, so it stays before `TODAY`). Nothing else.

## 5. Decisions already made (do not re-open)

See § 1. In short: one rule (`unrankedForDisplay`) in feedModel, imported by rideDetailModel; label in the hero slot, strip row reserved; label size = title size, dim ink, no opacity; one `NOT_RANKED_LABEL` const; `subLabel` removed; reason lines reworded; `lapCellLabel` returns `''`; `sectorTimeCell` blanks `est` rows; `LAP` -> `TIME`; preview untouched; identifiers untouched.

## 6. Verification (all from `$HOME/mnt/Qualifire`, `GIT_OPTIONAL_LOCKS=0`)

Before any edit: `git status --short` (note other sessions' files; do not revert them); `cd app && node --experimental-strip-types tests/run.ts | tail -3` -> baseline count, zero FAIL (tee to `cycles/virgin-cycle23/run-brief05-baseline.log`).

After the edits:
1. `cd app && node --experimental-strip-types tests/run.ts | tail -3` -> zero FAIL, baseline + 6; tee to `cycles/virgin-cycle23/run-brief05.log`; `grep -c "^FAIL" cycles/virgin-cycle23/run-brief05.log` -> 0.
2. `cd app && ./node_modules/.bin/tsc --noEmit; echo EXIT=$?` -> `EXIT=0`, `timeout_ms: 180000`, tee to `cycles/virgin-cycle23/tsc-brief05.log` (empty log + the EXIT=0 line = clean; no EXIT line = timed out, rerun).
3. `grep -n "no lap\|'no time'\|'not ranked'" app/src/ui/*.ts app/src/ui/*.tsx` -> only comment hits (rideHistoryModel.ts doc comment "new -> new · no lap", plus any comment you added); no string literal.
4. `grep -n '~\${' app/src/ui/rideHistoryModel.ts` -> exactly ONE hit, the `buildSectorRows` estimated row; `grep -c '~' app/src/ui/feedModel.ts app/src/ui/rideDetailModel.ts` -> 0 and 0 (the doc comments in § 2 mention `~m:ss` / `~raw` with a backtick: if your comment text makes this count non-zero, that is fine, report the lines; the test in § 3d is the real guard).
5. `grep -n "subLabel\|st\.qual\|st\.dim\|styles\.dim" app/src/ui/activityCard.tsx app/src/ui/RideDetailScreen.tsx app/src/ui/feedModel.ts` -> 0 hits.
6. `grep -c "numberOfLines={1}" app/src/ui/activityCard.tsx` -> 8.
7. `grep -n "NOT_RANKED_LABEL" app/src/ui/*.ts app/src/ui/*.tsx` -> feedModel.ts (export + doc), activityCard.tsx (import + 1 use), RideDetailScreen.tsx (import + 1 use); `grep -rn "'Not ranked'" app/src` -> feedModel.ts only.
8. `grep -c ">LAP</Text>" app/src/ui/tower.tsx` -> 0; `grep -c ">TIME</Text>" app/src/ui/tower.tsx` -> 1.
9. Human scan for the word lap in rider strings: `grep -rn -i -w "lap\|laps" app/src/ui --include=*.tsx --include=*.ts | grep -v "preview/"` -> read every hit: each must be inside a comment or an identifier context, none inside quotes / backticks / JSX text. Quote any doubtful hit. (The ui_strings_suite test is the machine check.)
10. `git diff --stat` -> your files: `app/src/ui/feedModel.ts`, `app/src/ui/activityCard.tsx`, `app/src/ui/rideHistoryModel.ts`, `app/src/ui/rideDetailModel.ts`, `app/src/ui/RideDetailScreen.tsx`, `app/src/ui/tower.tsx`, `app/tests/feedmodel_suite.ts`, `app/tests/ridehistory_suite.ts`, `app/tests/ridedetail_suite.ts`, `app/tests/recordflow_suite.ts`, `app/tests/ui_strings_suite.ts`, `app/tests/ui-strings.allow.json`. NOTE: brief 04 is still uncommitted, so activityCard.tsx, feedModel.ts, wayMapView.tsx, feedmodel_suite.ts, recordflow_suite.ts and the cycle docs already show as modified before you start (`git diff` mixes brief 04's hunks with yours; wayMapView.tsx must show NO hunk of yours). Other sessions' files: list them, do not touch them. Quote `git diff -- app/tests/ui-strings.allow.json` in the report.
11. `git diff -- app/src/ui/tower.tsx` -> one changed line. `git diff -- app/src/ui/RideDetailScreen.tsx` -> 2 import lines, the big-slot line replaced by 3 lines, the sector cell child, the `dim` -> `notRanked` style line; nothing else.
12. Card geometry untouched: `grep -n "height: 46\|marginTop: 10, height: 24" app/src/ui/activityCard.tsx` -> 2 hits; `grep -n "CARD_HEIGHT_ROUTE = 307\|CARD_HEIGHT_PLAIN = 273" app/src/ui/feedModel.ts` -> 2 hits.

Native rendering cannot be checked here: say so. On-device checks go to the coordinator (§ 9).

## 7. Out of scope

`store/derive.ts`, `store/results.ts`, `store/timing.ts`, resultsStore, any storage or engine code (display-only brief); `buildSectorRows` (its `~m:ss` / `– did not traverse –` rows feed REPLAY's flashes and replay_suite pins them); `ReplayScreen` / `replayModel` / `liveView` / the live flashes (`~m:ss` on the bike is a LIVE concept); the RESULTS tab (`resultsListModel.ts` `NO TIME`, `towerModel.ts`, cycle 25's files); `TODAY · unranked`, `no rank`, `too few to rank`, `P{…} of {…} on this way`; `src/ui/preview/*`; renaming any identifier containing `lap`; card heights / `getItemLayout`; `WayMapView`; the ⋯ menus; STATE.md / OPEN-ITEMS.md; commits.

## 8. Stop-on-ambiguity

STOP and report verbatim (no guessing, no ruling) if: any anchor in § 0 or § 2 does not match the file right before editing; `styles.dim` / `st.dim` has a second use; the test fixtures (`mkResult`, `detail()`, `row()`, `sec()`) do not accept the fields the new tests pass; the allow-list does not round-trip (the python assert fires) or the count is not 455 after the edit; the suite reports an UNLISTED / STALE string not in § 4's table; the ui_strings_suite lap-scan test still fails after the edits (quote the hits); tsc reports anything; a test outside § 3's list fails; the baseline run has a FAIL.

## 9. Report format

Concise: steps done/not done; files changed (`git diff --stat`); suite counts before/after + the three log paths; each § 6 check with its result; `git diff -- app/tests/ui-strings.allow.json` quoted; deviations verbatim; what Inspect should look at (the hero/strip JSX, both `unrankedForDisplay` call sites, the allow-list diff, the three reason-line strings, `buildSectorRows` and replay untouched, the `numberOfLines` count, `wayMapView.tsx` has no hunk of yours).

Then one paragraph for the coordinator (you do not edit OPEN-ITEMS/STATE yourself):

"virgin-cycle23 brief 05 (Not ranked + no lap wording), on-device checks owed: (a) an estimated or missed activity card shows the title, 'Not ranked' dim in the hero slot, the map, an empty strip row; the card is still 307 dp (scroll/BACK offsets exact); (b) an ignored activity reads the same way and 'Count in ranking' in its ⋯ menu brings time/rank/strip back; (c) an interrupted activity looks like any ranked card (time, rank, strip; no 'interrupted' word anywhere); (d) the detail of an unranked activity: 'Not ranked' at 22 dp dim under the date, the reason line under it ('ignored in ranking' / 'GPS gap at a gate' / 'a gate was missed'), SECTORS rows with a blank time on sectors that had none; (e) no '~' and no 'lap' anywhere in ACTIVITIES, the detail, RECORD's end screen; (f) night theme: the dim label is readable on the page background."

## 10. Decisions for Nathan to review (Fable ruled while he was away; one line each)

1. **Label position on the card**: hero slot (where the time was), strip row left empty, not under the map as Nathan phrased it (an empty 46 dp band between title and map would read as a hole). One-line move if he prefers it in the strip row.
2. **Scope of "unranked"**: exactly `ignored OR estimated OR missed`, as he listed. A real time with no position (`too few to rank`, tripwire `no rank`) still shows its time. Alternative: fold those in too (one line in `unrankedForDisplay` + the reason lines).
3. **Detail reason lines**: `ignored in ranking`, `GPS gap at a gate`, `a gate was missed`. He did not answer whether the detail should explain at all; the default keeps a reason (the rider taps through to learn why). Alternative: render nothing under the label.
4. **Detail SECTORS time cell blank** on a sector without a real time (was `~1:30` / `– did not traverse –`). Same principle (no estimates), one step beyond his words.
5. **Replay finish flash** for an unranked ride now flashes an empty time (was `~12:34` / `no lap`); replay's per-sector `~m:ss` flashes untouched (they mirror the bike).
6. **`LAP` -> `TIME`** on the tower ceremony row (unreachable today; keeps the string budget honest).
7. **Preview mockup strings left** (`IDEAL LAP`, `lap voice` captions): `PreviewScreen` is mounted nowhere. A separate chore could retire `src/ui/preview/` into `safe_to_delete/` and drop its entries from the allow-list.
