# Brief 06 — follow-ups to brief 05: no estimates anywhere, no "lap", "Not ranked" on RESULTS (virgin-cycle23)

Written by the Plan tier (Opus; Nathan asked that Fable NOT be used for this round) 2026-10-07 from `inspect-report-brief-05.md` findings 1-4 and Nathan's rule (`00-nathan-decisions.md` § "Feedback 3"). Executor: Sonnet, `EXECUTOR-RULES.md` applies in full (stop-on-ambiguity, no git writes, python read-modify-write on exact anchors, no large heredocs, never delete). JS-only, display-only: no engine (`src/live/*`), storage, `store/derive.ts`, `store/results.ts`, `store/timing.ts` or scoring change; no native change; no new dependency. OTA-publishable. Nathan is unavailable: every call below is settled (one-line reasoning each in § 1); do not re-open them.

## Goal

Nathan's binding rule (2026-10-07): **nothing is ever shown as an estimate in rider-facing UI** — a ride, sector or finish either has a real time (and rank where applicable) or shows nothing / `Not ranked`; and **the word "lap" never appears in rider-facing text**. Brief 05 applied it to the ACTIVITIES feed and the detail page. This brief closes the four places the brief 05 Inspect found where it still leaks:

1. GATE alert text built in `src/store/routeFromRide.ts` says `its lap comes out 'estimated'` and carries em dashes (CLAUDE.md rule 9).
2. REPLAY of an unranked ride blanks the big clock for 2.5 s at the finish (empty lap flash).
3. `~m:ss` estimates still flash on RECORD (live) and REPLAY (per-sector), and `S2 ~` on the live strip.
4. RESULTS says `NO TIME` / `TODAY · unranked` where ACTIVITIES says `Not ranked`.

Baseline (measured by Plan 2026-10-07, tree = HEAD + cycle-23 briefs 04/05 uncommitted): `920 tests: 917 pass, 0 fail, 3 skip`; tsc exit 0 per the brief 05 Inspect. Expected after this brief: **`923 tests: 920 pass, 0 fail, 3 skip`** (+3 new tests; other sessions may move the baseline: what matters is zero FAIL before and after and +3 from this brief). Allow-list: **455 -> 452 entries**.

## 0. Context (verified anchors, read 2026-10-07)

The tree is shared with other sessions (cycle 25 RESULTS redesign and cycle 26 loops are digest-only untracked folders today). Before EVERY edit re-read the region (`sed -n`) and compare with the anchor quoted here; a mismatch = STOP and report verbatim. Line numbers are orientation only; anchors are by content.

### Why these strings reach the rider

- `app/src/ui/GateAdjustScreen.tsx:75` `Alert.alert('Could not save the gates', out.errors.join('\n'));` shows `editWayGates`' errors verbatim; `RideDetailScreen.tsx:382` (`Could not set the reference`) shows `promoteRideToReference`'s. The rider-string scanner (`tests/ui_strings_extract.ts:185-198` `listScanFiles`) scans only `App.tsx`, `src/ui/**` and `src/location/*.ts`, so `src/store/routeFromRide.ts` literals are invisible to the allow-list and to the brief 05 lap scan (`tests/ui_strings_suite.ts:238-242`).
- Run on today's tree, `extractFromSource('src/store/routeFromRide.ts', …)` returns 16 strings, 4 of them breaking the rules (Plan probe):
  - `:101` literal `"{…}" is not one of your own ways — a shipped way cannot be re-referenced` (em dash)
  - `:377` literal `its lap comes out '{…}'` ("lap" + raw quality word)
  - `:483` literal `"{…}" is not one of your own ways — a shipped way's gates cannot be edited` (em dash)
  - `:514` literal `{…} — move that gate somewhere the reference activity actually passed` (em dash)
- The assembled `:514` body today is `the reference activity cannot be timed against these gates: its lap comes out 'estimated' — move that gate somewhere the reference activity actually passed` = 24 words (> the 20-word alert budget).

### `app/src/store/routeFromRide.ts` (555 lines)

- `:100-102`
  ```
    if (!way) {
      return { ok: false, errors: [`"${wayId}" is not one of your own ways — a shipped way cannot be re-referenced`] };
    }
  ```
- `:371-379` (end of `deriveReferenceAgainst`)
  ```
    if (result.wayId === wayId && (result.lap.quality === 'clean' || result.lap.quality === 'interrupted')) {
      return { result, readable: true, reason: null };
    }
    const missed = result.sectors.filter((s) => s.quality === 'missed').map((s) => s.index);
    const which = missed.length > 0
      ? `sector ${missed.join(' and ')} (between gate ${missed.map((i) => `${i - 1}→${i}`).join(', ')}) is not timed in its recording`
      : `its lap comes out '${result.lap.quality}'`;
    return { result: null, readable: true, reason: `the reference activity cannot be timed against these gates: ${which}` };
  }
  ```
  `reason` is read in exactly one place: `:514` (`grep -rn "\.reason\b" app/src` → only `:514` in this file plus unrelated storage hits). The `readable: false` reason (`:362`) is never shown (`:511` requires `next.readable`).
- `:482-484`
  ```
    if (!way) {
      return { ok: false, errors: [`"${wayId}" is not one of your own ways — a shipped way's gates cannot be edited`] };
    }
  ```
- `:514` `        return { ok: false, errors: [`${next.reason} — move that gate somewhere the reference activity actually passed`] };`
- Tests on it: `app/tests/routecreation_suite.ts:1295-1307` `c18-02 2 (editWayGates)` asserts `out.errors[0].includes('cannot be timed')` (`:1303`) — the new wording keeps that phrase; `:1023` asserts an error includes `"wph-b"` (createRouteFromDraft path, untouched). `app/tests/recordflow_suite.ts:225-273` `virgin-cycle20 05` scans this file for the word "ride" in strings (the new strings say "activity": fine).

### `app/src/ui/replayModel.ts` (201 lines)

- `:142-148` doc comment of `replayLiveViewModel` (mentions `timeLabel, m:ss.d / ~m:ss`).
- `:166` `  const lap = allDone && r.finishMs !== null ? { tier: lapTier, time: lapLabel } : null;`
- `:170-172`
  ```
    // A sector the ride never traversed has no time to show (its label is `– did not traverse –`): no flash,
    // the clock just keeps running (Nathan 2026-10-06: never show the rider a failure). Real labels carry digits.
    const flash = lastRow && /\d/.test(lastRow.timeLabel) ? { tier: lastRow.tier as Tier, time: lastRow.timeLabel } : null;
  ```
  `:172` is pinned by `tests/replay_suite.ts:457-460` (regex `lastRow && /\d/.test(lastRow.timeLabel)`) and `tests/recordflow_suite.ts:588` (`time: lastRow.timeLabel`): it stays byte-identical.
- `lapLabel` comes from `ReplayScreen.tsx:135-136` `replayLiveViewModel(rider, detail.sectorRows, detail.lapLabel, …, detail.lapTier)`; brief 05 made `detail.lapLabel` `''` for every ride without a real time (`rideHistoryModel.ts:41-44` `lapCellLabel`), so today an unranked replay hands `LiveSectorPane` a lap flash with `time: ''` (`liveView.tsx:330-331` renders it over the clock for `FLASH_HOLD_MS`).

### `app/src/ui/rideHistoryModel.ts` — `buildSectorRows` (`:217-246`)

```
      if (sec.quality === 'missed') {
        return {
          index: sec.index, label: `S${sec.index}`,
          timeLabel: '– did not traverse –', tier: 'est', avgLabel, gapS: null,
        };
      }
      const v = scoredS(sec);
      if (sec.quality === 'estimated' || v === null) {
        return {
          index: sec.index, label: `S${sec.index}`,
          timeLabel: `~${fmt(sec.rawS)}`, tier: 'est', avgLabel, gapS: null,
        };
      }
```
Consumers of `SectorRowModel.timeLabel` (verified by grep): (a) `replayModel.ts:159` strip slot `time` (NOT rendered: `chips.tsx:62-81` `StripSlot` draws only `label` + a bar) and `:172` the gate flash; (b) `RideDetailScreen.tsx:556` via `rideDetailModel.sectorTimeCell` (already `''` for tier `est`); (c) `feedModel.ts:97` `sectorChipLabel` — only for a RANKED card (`route && !unranked`), and a ranked lap (clean/interrupted) has no estimated/missed sector (`store/derive.ts:84-96`), so the est rows never reach a chip. `buildSectorRows` has one caller (`rideDetailModel.ts:139`).

### `app/src/ui/liveView.tsx` (354 lines; RECORD's live pane; DEMO uses its own `demoModel` view model with clean data only)

- `:76-80` `FlashModel` doc comment (mentions `~m:ss for an estimated sector … – – for a missed gate`).
- `:89` `  /** frozen final time on completed blocks (m:ss / ~m:ss) — §2 rule 4 */` (StripSlotModel.time).
- `:140-152` `bigFromSector`:
  ```
  function bigFromSector(k: number, sec: LiveSector, tierOf: TierSource): FlashModel {
    if (sec.kind === 'done') {
      if (sec.estimated) {
        // D-011/D-013: gap-derived — ~raw, no decimal; 'est' -> textDim, no verdict.
        return { tier: 'est', time: `~${fmtSec(sec.rawS)}` };
      }
      // cycle 008: real tier from the ghost history, via the injected source.
      // virgin-cycle22 04: the time alone; no label row, nothing to compare against (D-021: no reference yet).
      return { tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ?? sec.rawS, 1) };
    }
    // 'missed' (skipped gate / offroute): no data — dim dashes.
    return { tier: 'est', time: '– –' };
  }
  ```
- `:165-167` strip, `case 'done':`
  ```
        case 'done':
          return sec.estimated
            ? { tier: 'est' as Tier, label: `${label} ~`, time: `~${fmtSec(sec.rawS)}` }
  ```
- `:181-184` `flash` = `null` before the first gate, else `bigFromSector(…)` (`flash: FlashModel | null` already).
- `:188-199` the lap:
  ```
    let lap: FlashModel | null = null;
    if (st.lap !== null) {
      lap = st.lap.estimated
        ? {
            tier: 'est',
            time: st.lap.rawS !== null ? `~${fmtSec(st.lap.rawS)}` : '– –',
          }
        : {
            // lap tier: sector index 0 is the convention for "the whole lap"
            tier: tierOf(0, scoredS(st.lap) ?? st.lap.rawS ?? null),
            time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0),
          };
    }
  ```
  Engine fact (`src/live/engine.ts:576-594`, do not touch): `estimated` is true when any sector is missed/estimated or a gate event is estimated; `movingS` is null when estimated (and also if no stop detector — then `scoredS` is null).
- `LiveSectorPane` (`:270-338`): `lapScored = vm.lap !== null` drives the lap flash; `flashOn && vm.flash ? <LiveFlash …/> : <LapClock …/>` — a `null` flash already means "the clock keeps running". No pane change is needed.
- Pins on this file: `tests/recordflow_suite.ts:501-530` `virgin-cycle22 04` — `:511` asserts the `~${fmtSec(sec.rawS)}` estimated flash line, `:513` the `'– –'` missed flash line (both UPDATED by § 3), `:512` the done-flash line (kept: that line does not change), `:514-516` the `bigFromSector` slice must not contain `delta`/`lbl`/`pb`/`waiting`/`glyph` (mind your comment words), `:517-519` the lap slice must contain `time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0)` and no `delta`.

### RESULTS wording (cycle 25 owns the redesign later: wording only here)

- `app/src/ui/feedModel.ts:57` `export const NOT_RANKED_LABEL = 'Not ranked';` (the one home; brief 05).
- `app/src/ui/resultsListModel.ts` imports `:6-10` (last: `import { fmt } from './colourModel.ts';`); `:205` doc `  /** true for an estimated/missed lap (lap.quality) — timeLabel is 'NO TIME'. */`; `:248` `      timeLabel: noTime ? 'NO TIME' : fmt(row.timeS),`. Rendered by `ResultsDetailScreen.tsx:163` (`histTime`, fontSize 14, no fixed width; `histDate` is `flex: 1`): REACHABLE (RESULTS → a way → history row of an estimated/missed ride). Colour (`row.noTime ? colors.grey`) unchanged.
- `app/src/ui/towerModel.ts` imports `:2-6` (last: `import { scoredS } from '../store/timing.ts';`); `:116-120` `    // D-028: unranked, LAST …` / `    rows.push({` / `      pos: null,` / `      time: 'NO TIME',`. Only runtime caller `rankingRevealModel.ts:39` (`buildTowerModel`), which returns null before building a board for an estimated / unscored / unranked today (`:78-88`): the `NO TIME` today row is UNREACHABLE in the app today (RECORD reveal and DEMO both). Aligned anyway (budgeted string).
- `app/src/ui/tower.tsx:53` doc `  /** 'm:ss', or 'NO TIME' for an unranked estimated lap */`; `:181` `        <Text style={s.cerToday}>TODAY · unranked</Text>` inside the `ceremony` branch, which no caller passes (brief 05 § 0): UNREACHABLE, aligned anyway. tower.tsx is a screen file: literal JSX text with its own allow-list entry (no import).
- Comments that say `NO TIME`/`unranked` (tower.tsx:16/51/89/294, towerModel.ts:10/15/116, resultsListModel.ts:216-218, ResultsDetailScreen.tsx:66, demoModel.ts:314) are not strings: leave them.
- Tests: `app/tests/resultsmodel_suite.ts:276` `ignoredRow.timeLabel !== 'NO TIME'`, `:279` `estRow.timeLabel === 'NO TIME'`; `app/tests/towermodel_suite.ts:87` `last.time === 'NO TIME'`.

### Allow-list facts (`app/tests/ui-strings.allow.json`, 455 entries, legacyCount 32, sorted by (file, kind, text))

Entries this brief touches (verified present): `src/ui/rideHistoryModel.ts | literal | – did not traverse –`; `src/ui/resultsListModel.ts | literal | NO TIME`; `src/ui/towerModel.ts | literal | NO TIME`; `src/ui/tower.tsx | text | TODAY · unranked`. None is `legacy`. `src/ui/preview/data.ts | literal | NO TIME` belongs to the unmounted preview mockup: untouched. The `~` templates (`~{…}`, `{…} ~`) and `– –` are not scanned (no two-letter word / not prose), so they have no entries.

## 1. Decisions (settled by Plan; copy, do not re-derive)

1. **Gate alert wording.** `reason` becomes one constant: `the reference activity cannot be timed on these gates`; the `:514` suffix becomes ` · move that gate where the activity passed`. Full body = 17 words, no "lap", no quality word, no em dash. The sector detail (`sector 3 (between gate 2→3) …`) is dropped: with it the body passes 20 words, and the rider has just moved that gate. `cannot be timed` is kept so `c18-02 2` still matches.
2. **The other two em dashes in the same file (`:101`, `:483`) go too** (` · `). They reach the same alerts, and fixing them lets one pin cover the whole file. The same em-dash pattern exists in other store error strings (`catalogMerge.ts:21,54`, `routeCreation.ts:342,346`). Those are outside Nathan's four findings and are only reported (§ 6).
3. **Coverage of assembled strings.** The scanner is NOT widened to `src/store` (that would mark every store literal UNLISTED and add an allow-list migration). Instead: (a) a file-level pin in `ui_strings_suite.ts` runs the real extractor on `routeFromRide.ts` and fails on any "lap" or em dash; (b) `c18-02 2` gains one assertion on the assembled body (no lap, no em dash, <= 20 words).
4. **Replay finish.** No lap flash when `lapLabel === ''` (an unranked ride). The clock keeps running, as for a gate without a time. This is the inspector's fix.
5. **Sector rows: fix at the single producer.** `buildSectorRows` gives every row without a real time (estimated or missed) `timeLabel: ''` (was `~m:ss` / `– did not traverse –`). Tier `est`, `avgLabel` and `gapS: null` are unchanged. Effects: replay's existing digit rule (`:172`, byte-identical) now skips those gate flashes; the detail's `sectorTimeCell` already blanks them; the feed never shows them; the strip `time` is not rendered. One edit replaces four surface patches.
6. **Live (RECORD): only a real time ever flashes.** `bigFromSector` returns `null` for an estimated sector AND for a missed gate (was `~m:ss` / `– –`). A dash pair over the clock is also a non-time, and REPLAY already shows nothing for a never-traversed sector (Nathan 2026-10-06: "never show the rider a failure"). The live lap flash exists only when `!st.lap.estimated && scoredS(st.lap) !== null`. The second condition also closes the corner where an un-estimated lap has no moving time and would have flashed raw time as if real. The tier/time expressions of the real lap are byte-identical. Strip slot of an estimated sector: `{ tier: 'est', label }` (no ` ~` suffix on the label, no time). Tier `est` stays, so the slot stays grey: colour/tier logic untouched.
7. **DEMO** is unaffected (`demoModel.ts` builds clean flashes only; `grep -c '~' app/src/ui/demoModel.ts` shows no template). RECORD and DEMO share `LiveSectorPane`, which needs no change.
8. **RESULTS wording.** `NO TIME` becomes `NOT_RANKED_LABEL`, imported in `resultsListModel.ts` and `towerModel.ts` (model files, so one string has one home). `TODAY · unranked` becomes the literal `TODAY · Not ranked` in `tower.tsx` (a screen file, so it gets its own allow-list entry, edited in place). Colours (`noTime` grey, tier `est`), order and logic are unchanged. An ignored-but-clean ride keeps its real time in RESULTS: that is a real time, not an estimate, and changing it would be a logic change for cycle 25.
9. **Width.** `Not ranked` (10 ch) in the RESULTS history row fits (no fixed width). In the tower's today cell (`timeToday` width 160, fontSize 40) it would wrap, but that row is unreachable (§ 0). No layout change, per Nathan; listed as a risk for whoever wires an unranked today into the tower.
10. **tsc noise.** If `tsc` errors ONLY on files under `app/safe_to_delete/` (another session's probes, inspect-05 finding 5), identically before and after, count it as clean, report it, and do not move the file. Any other tsc error means STOP.

## 2. Changes, file by file (in this order)

### 2a. `app/src/store/routeFromRide.ts` (4 edits)

1. `:101` before ``      return { ok: false, errors: [`"${wayId}" is not one of your own ways — a shipped way cannot be re-referenced`] };``
   after ``      return { ok: false, errors: [`"${wayId}" is not one of your own ways · a shipped way cannot be re-referenced`] };``
2. `:374-378` replace the five lines from `  const missed = result.sectors.filter(` through `  return { result: null, readable: true, reason: `the reference activity cannot be timed against these gates: ${which}` };` with exactly:
   ```
     // virgin-cycle23 brief 06 (Nathan 2026-10-07): this reason is shown verbatim in the gate alert
     // (editWayGates below), so it names no quality word and no "lap"; with the suffix there the
     // alert body stays at 17 words (CLAUDE.md rule 9: <= 20, no em dash).
     return { result: null, readable: true, reason: 'the reference activity cannot be timed on these gates' };
   ```
   (`result.sectors` and the arrow `→` are no longer used here; nothing else in the function changes.)
3. `:483` before ``      return { ok: false, errors: [`"${wayId}" is not one of your own ways — a shipped way's gates cannot be edited`] };``
   after ``      return { ok: false, errors: [`"${wayId}" is not one of your own ways · a shipped way's gates cannot be edited`] };``
4. `:514` before ``        return { ok: false, errors: [`${next.reason} — move that gate somewhere the reference activity actually passed`] };``
   after ``        return { ok: false, errors: [`${next.reason} · move that gate where the activity passed`] };``

Do not touch the doc comments of this file (their em dashes are comments).

### 2b. `app/src/ui/rideHistoryModel.ts` (`buildSectorRows` only)

1. In the `sec.quality === 'missed'` branch: `          timeLabel: '– did not traverse –', tier: 'est', avgLabel, gapS: null,` -> `          timeLabel: '', tier: 'est', avgLabel, gapS: null,`
2. In the `sec.quality === 'estimated' || v === null` branch: ``          timeLabel: `~${fmt(sec.rawS)}`, tier: 'est', avgLabel, gapS: null,`` -> `          timeLabel: '', tier: 'est', avgLabel, gapS: null,`
3. Directly above `      if (sec.quality === 'missed') {` insert one comment line:
   `      // virgin-cycle23 brief 06 (Nathan 2026-10-07): a sector without a real time shows NO time anywhere (no ~raw, no dash prose).`
   (Do NOT write the words "did not traverse" in this comment: the § 3c pin rejects them anywhere in the file.)
   The two branches stay separate (no merge), `const v = scoredS(sec);` stays where it is.

### 2c. `app/src/ui/replayModel.ts`

1. `:166` -> `  const lap = allDone && r.finishMs !== null && lapLabel !== '' ? { tier: lapTier, time: lapLabel } : null;`
   and directly above it insert:
   `  // virgin-cycle23 brief 06: an unranked ride has no real lap time (lapLabel '') → no finish flash; the clock keeps running.`
2. `:170` comment line: replace `(its label is `– did not traverse –`)` with `(buildSectorRows gives it timeLabel '', brief 06)` — i.e. the line becomes
   `  // A sector without a real time (missed or estimated: buildSectorRows gives it timeLabel '', brief 06): no flash,`
   `:171` and `:172` unchanged (byte-identical; pinned).
3. Doc comment `:146-147`: replace `time: lapLabel} : null;` with `time: lapLabel} : null (also null when lapLabel is '': unranked);` and `timeLabel, m:ss.d / ~m:ss) or null before gate 1,` with `timeLabel m:ss.d) or null before gate 1 or when the row has no real time,`. If the comment wraps differently from these fragments, apply the same meaning and quote what you did.

### 2d. `app/src/ui/liveView.tsx`

1. `FlashModel` doc (`:79`): replace `` (`time` = `m:ss.d`; `~m:ss` for an estimated sector, D-011/D-013; `– –` for a missed gate)`` with `` (`time` = `m:ss.d`; an estimated sector or a missed gate has no flash at all, brief 06)``.
2. `StripSlotModel.time` doc (`:89`): `(m:ss / ~m:ss)` -> `(m:ss; none without a real time)`.
3. Replace the whole `bigFromSector` function (`:140-152`, quoted in § 0) with exactly:
   ```
   function bigFromSector(k: number, sec: LiveSector, tierOf: TierSource): FlashModel | null {
     // virgin-cycle23 brief 06 (Nathan 2026-10-07: nothing is ever shown as an estimate): only a real
     // sector time flashes. An estimated sector or a missed gate flashes nothing; the clock keeps running.
     if (sec.kind !== 'done' || sec.estimated) return null;
     // cycle 008: real tier from the ghost history, via the injected source.
     // virgin-cycle22 04: the time alone; no label row, nothing to compare against (D-021: no reference yet).
     return { tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ?? sec.rawS, 1) };
   }
   ```
   (Check the slice rule: the new function text must not contain `delta`, `lbl`, `pb`, `waiting`, `glyph`.)
4. Strip `case 'done':` (`:167`): ``          ? { tier: 'est' as Tier, label: `${label} ~`, time: `~${fmtSec(sec.rawS)}` }`` -> `          ? { tier: 'est' as Tier, label } // brief 06: no ~ and no time without a real time; tier est keeps the slot grey`
5. The lap block (`:188-199`, quoted in § 0) becomes exactly:
   ```
     let lap: FlashModel | null = null;
     // virgin-cycle23 brief 06: the finish flashes only a real lap time; an estimated lap (or one without
     // a moving time) flashes nothing and the clock keeps running.
     if (st.lap !== null && !st.lap.estimated && scoredS(st.lap) !== null) {
       lap = {
         // lap tier: sector index 0 is the convention for "the whole lap"
         tier: tierOf(0, scoredS(st.lap) ?? st.lap.rawS ?? null),
         time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0),
       };
     }
   ```
   (The two `?? …` fallbacks are now dead but stay byte-identical: `recordflow_suite.ts:519` pins the time expression.)
6. Nothing else in liveView.tsx changes (`LiveSectorPane`, `LiveFlash`, constants, `viewModelFromEngine`'s `flash` ternary). `fmtSec` remains used.

### 2e. RESULTS wording

1. `app/src/ui/resultsListModel.ts`: after `import { fmt } from './colourModel.ts';` add `import { NOT_RANKED_LABEL } from './feedModel.ts';`. `:248` -> `      timeLabel: noTime ? NOT_RANKED_LABEL : fmt(row.timeS),`. `:205` doc -> `  /** true for an estimated/missed lap (lap.quality) — timeLabel is NOT_RANKED_LABEL ('Not ranked', brief 06). */`.
2. `app/src/ui/towerModel.ts`: after `import { scoredS } from '../store/timing.ts';` add `import { NOT_RANKED_LABEL } from './feedModel.ts';`. In the `todayUnranked` push: `      time: 'NO TIME',` -> `      time: NOT_RANKED_LABEL, // brief 06: same words as ACTIVITIES (row unreachable today: the reveal never builds an unranked today)`.
3. `app/src/ui/tower.tsx`: `:181` `        <Text style={s.cerToday}>TODAY · unranked</Text>` -> `        <Text style={s.cerToday}>TODAY · Not ranked</Text>`; `:53` doc -> `  /** 'm:ss', or 'Not ranked' (NOT_RANKED_LABEL) for an unranked estimated lap */`. No import in tower.tsx.
4. Do not touch `ResultsDetailScreen.tsx`, `resultsWayList.tsx`, `ResultsScreen.tsx`, `resultsPlot*`, `rankingRevealModel.ts`, any style, or any comment not named here.

## 3. Tests (+3 new, the rest updates; re-read every region before editing — shared files)

### 3a. NEW `app/tests/ui_strings_suite.ts` (append at the end)

Add `import * as fs from 'node:fs';` directly after `import * as path from 'node:path';` (line 6). Append:
```ts
test('virgin-cycle23 brief 06 (Nathan 2026-10-07): routeFromRide.ts error copy (shown verbatim in the gate / reference alerts) has no "lap" and no em dash', () => {
  // src/store is outside listScanFiles, but these errors reach the rider through
  // Alert.alert(…, out.errors.join('\n')) in GateAdjustScreen / RideDetailScreen / RecordScreen.
  const rel = 'src/store/routeFromRide.ts';
  const found = extractFromSource(rel, fs.readFileSync(path.join(APP_DIR, rel), 'utf8')).strings;
  assert(found.length >= 10, `the extractor saw only ${found.length} strings in ${rel}`);
  const bad = found.filter((s) => /\blaps?\b/i.test(s.text) || s.text.includes('—'));
  assert(bad.length === 0, `"lap" or an em dash in ${rel}:\n${bad.map((h) => `${h.line} | ${h.text}`).join('\n')}`);
});
```
Expected: fails on the pre-brief tree with the 4 hits of § 0 (`:101`, `:377`, `:483`, `:514`), passes after (14 strings found).

### 3b. NEW `app/tests/replay_suite.ts` (insert directly after the test `virgin-cycle22 08: the replay flashes each crossed gate …`, i.e. after its closing `});` just before `// ============================================================ priorWindowFor`)

```ts
test('virgin-cycle23 brief 06: an unranked replay (lapLabel \'\') has no finish flash and a sector without a real time (est, timeLabel \'\') no gate flash; real times still flash', () => {
  const sectorRows = [
    { index: 0, label: 'S1', timeLabel: '3:05.2', tier: 'purple' as const, avgLabel: '3:10', gapS: null },
    { index: 1, label: 'S2', timeLabel: '', tier: 'est' as const, avgLabel: '', gapS: null },
  ];
  const r: ReplayRider = {
    rideId: 'vm-unranked', startMs: 0, finishMs: 200000, endMs: 200000,
    gateMs: [0, 100000, 200000],
    fixes: [{ tUnixMs: 0, lat: 0, lon: 0, sM: 0 }, { tUnixMs: 200000, lat: 0, lon: 0, sM: 0 }],
  };
  const tb = replayTimebase({ clockS: 0, realMs: 0, rate: 10, playing: true });
  const one = replayLiveViewModel(r, sectorRows, '', 100, tb, null, 'est');
  assert(one.flashKey === 1 && one.flash !== null && one.flash.time === '3:05.2', `a real sector still flashes, got ${JSON.stringify(one.flash)}`);
  const done = replayLiveViewModel(r, sectorRows, '', 200, tb, null, 'est');
  assert(done.flashKey === 2 && done.flash === null, `no real time at gate 2 → no flash, got ${JSON.stringify(done.flash)}`);
  assert(done.lap === null, `lapLabel '' → no finish flash (the big clock is never blanked), got ${JSON.stringify(done.lap)}`);
  const ranked = replayLiveViewModel(r, sectorRows, '6:40.1', 200, tb, null, 'green');
  assert(ranked.lap !== null && ranked.lap.time === '6:40.1' && ranked.lap.tier === 'green', 'a real lap label still flashes at the finish');
});
```
(`ReplayRider`, `replayTimebase`, `replayLiveViewModel`, `assert`, `test` are already imported in this suite: verify; if any is not, STOP.)

### 3c. NEW `app/tests/recordflow_suite.ts` (append at the end of the file)

```ts
test('virgin-cycle23 06 (Nathan 2026-10-07): no estimate on any flash or strip, no em dash / "lap" in the gate errors, RESULTS says Not ranked', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  const lv = read('src', 'ui', 'liveView.tsx');
  assert(!lv.includes('`~${'), 'liveView builds no ~m:ss (sector flash, lap flash, strip)');
  assert(!lv.includes("time: '– –'") && !lv.includes('label: `${label} ~`'), 'no – – flash, no ~ on the strip label');
  assert(lv.includes("if (sec.kind !== 'done' || sec.estimated) return null;"), 'only a real sector time flashes');
  assert(lv.includes('if (st.lap !== null && !st.lap.estimated && scoredS(st.lap) !== null) {'), 'only a real lap time flashes at the finish');
  const hist = read('src', 'ui', 'rideHistoryModel.ts');
  assert(!hist.includes('`~${') && !hist.includes('did not traverse'), 'buildSectorRows: no ~raw, no did-not-traverse prose');
  const rm = read('src', 'ui', 'replayModel.ts');
  assert(rm.includes("const lap = allDone && r.finishMs !== null && lapLabel !== '' ? { tier: lapTier, time: lapLabel } : null;"), 'replay: no finish flash without a real lap label');
  const rfr = read('src', 'store', 'routeFromRide.ts');
  assert(!rfr.includes('its lap comes out') && rfr.includes("reason: 'the reference activity cannot be timed on these gates'"), 'gate alert reason reworded');
  const tm = read('src', 'ui', 'towerModel.ts');
  const rl = read('src', 'ui', 'resultsListModel.ts');
  const tw = read('src', 'ui', 'tower.tsx');
  assert(!tm.includes("'NO TIME'") && tm.includes('time: NOT_RANKED_LABEL,'), 'tower today row: Not ranked');
  assert(!rl.includes("'NO TIME'") && rl.includes('timeLabel: noTime ? NOT_RANKED_LABEL : fmt(row.timeS),'), 'RESULTS history: Not ranked');
  assert(!tw.includes('TODAY · unranked') && tw.includes('>TODAY · Not ranked</Text>'), 'tower ceremony: Not ranked');
});
```
(`fs`, `path`, `TESTS_DIR` are already in scope in this suite — the neighbouring tests use them; verify.)

### 3d. Updates (0 net)

| file | where | before | after |
|---|---|---|---|
| `tests/recordflow_suite.ts` | `virgin-cycle22 04` `:511` | ``assert(lv.includes("return { tier: 'est', time: `~${fmtSec(sec.rawS)}` };"), 'estimated flash: ~m:ss, dim, nothing else');`` | ``assert(lv.includes("if (sec.kind !== 'done' || sec.estimated) return null;"), 'brief 06: an estimated sector or a missed gate flashes nothing (no ~m:ss, no – –)');`` |
| same | `:513` | ``assert(lv.includes("return { tier: 'est', time: '– –' };"), 'missed flash: – –');`` | ``assert(!lv.includes("time: '– –'"), 'brief 06: no – – flash');`` |
| `tests/replay_suite.ts` | `virgin-cycle22 08` fixture row S3 (`:313`) | `timeLabel: '~3:20'` | `timeLabel: ''` (rest of the row unchanged) |
| same | `:327` | ``assert(three.flashKey === 3 && three.flash !== null && three.flash.tier === 'est' && three.flash.time === '~3:20', `gate 3 estimated: est ~m:ss, got ${JSON.stringify(three.flash)}`);`` | ``assert(three.flashKey === 3 && three.flash === null, `gate 3 without a real time: no flash (brief 06), got ${JSON.stringify(three.flash)}`);`` |
| `tests/ridehistory_suite.ts` | test title `:277` | `'ridehistory: buildSectorRows — estimated ~raw, missed did-not-traverse, clean gets a real tier + avg'` | `'ridehistory: buildSectorRows — estimated and missed rows show no time (brief 06), clean gets a real tier + avg'` |
| same | `:292` | ``assert(s2.timeLabel === `~${fmt(300)}`, `S2 (estimated) must show ~raw, got ${s2.timeLabel}`);`` | ``assert(s2.timeLabel === '', `S2 (estimated) must show no time (no ~raw), got ${s2.timeLabel}`);`` |
| same | `:297` | ``assert(s3.timeLabel === '– did not traverse –', `S3 (missed) wording wrong: ${s3.timeLabel}`);`` | ``assert(s3.timeLabel === '', `S3 (missed) must show no time, got ${s3.timeLabel}`);`` |
| `tests/resultsmodel_suite.ts` | `:276` | `ignoredRow.timeLabel !== 'NO TIME'` | `ignoredRow.timeLabel !== 'Not ranked'` |
| same | `:279` | ``assert(estRow.noTime && estRow.timeLabel === 'NO TIME', `estimated ride must show NO TIME, got '${estRow.timeLabel}'`);`` | ``assert(estRow.noTime && estRow.timeLabel === 'Not ranked', `estimated ride must show Not ranked, got '${estRow.timeLabel}'`);`` |
| `tests/towermodel_suite.ts` | `:87` | `assert(last.time === 'NO TIME', …)` | `assert(last.time === 'Not ranked', …)` (message unchanged) |
| `tests/routecreation_suite.ts` | `c18-02 2`, insert after `:1303` | — | ``  // virgin-cycle23 brief 06: the assembled alert body has no "lap", no em dash and stays <= 20 words (CLAUDE.md rule 9)`` / ``  assert(!/\blaps?\b|—/i.test(out.errors[0]) && out.errors[0].split(/\s+/).length <= 20, `alert body breaks the text rules: ${out.errors[0]}`);`` |

`fmt` stays imported in ridehistory_suite (other tests use it; if tsc reports it unused, STOP). Test titles in resultsmodel/towermodel that say `NO TIME` stay (titles, not assertions). `feedmodel_suite.ts` fixtures with `'~1:30'` / `'– did not traverse –'` (`:45`, `:83`, `:186-187`) are hand-made rows fed to pure functions; they stay untouched (no producer emits those labels any more).

### Summary
New: 3 (ui_strings 1, replay 1, recordflow 1). Updated: recordflow `virgin-cycle22 04` (2 lines), replay `virgin-cycle22 08` (2 lines), ridehistory buildSectorRows test (title + 2 lines), resultsmodel (2 lines), towermodel (1 line), routecreation `c18-02 2` (+1 assertion). Expected `923 tests: 920 pass, 0 fail, 3 skip`.

## 4. Rider-string inventory and allow-list (`app/tests/ui-strings.allow.json`)

| # | file:line | string today | after | rider sees it? | allow-list action |
|---|---|---|---|---|---|
| 1 | `src/store/routeFromRide.ts:377-378,514` | `the reference activity cannot be timed against these gates: its lap comes out 'estimated' — move that gate somewhere the reference activity actually passed` (or the `sector N (between gate …)` variant) | `the reference activity cannot be timed on these gates · move that gate where the activity passed` (17 words) | yes, GATES alert | none (store not scanned); guarded by § 3a + § 3d routecreation |
| 2 | `src/store/routeFromRide.ts:101` | `"…" is not one of your own ways — a shipped way cannot be re-referenced` | `… ways · a shipped way …` | defensive (UI never offers it on a shipped way) | none |
| 3 | `src/store/routeFromRide.ts:483` | `"…" is not one of your own ways — a shipped way's gates cannot be edited` | `… ways · a shipped way's …` | defensive | none |
| 4 | `src/ui/rideHistoryModel.ts` buildSectorRows | `– did not traverse –` | `''` | was: replay strip (unrendered), replay flash (skipped); detail blanked it | **REMOVE** `src/ui/rideHistoryModel.ts \| literal \| – did not traverse –` |
| 5 | `src/ui/rideHistoryModel.ts` buildSectorRows | `~m:ss` | `''` | was: REPLAY gate flash | none (not scanned) |
| 6 | `src/ui/liveView.tsx` | `~m:ss` sector flash, `– –` missed flash, `~m:ss` / `– –` lap flash, strip label `S2 ~` | no flash; label `S2` | was: RECORD | none (not scanned) |
| 7 | `src/ui/replayModel.ts:166` | lap flash `''` (blank clock 2.5 s) | no lap flash | was: REPLAY | none |
| 8 | `src/ui/resultsListModel.ts:248` | `NO TIME` | `Not ranked` via `NOT_RANKED_LABEL` | yes, RESULTS history | **REMOVE** `src/ui/resultsListModel.ts \| literal \| NO TIME` |
| 9 | `src/ui/towerModel.ts:119` | `NO TIME` | `Not ranked` via `NOT_RANKED_LABEL` | unreachable today | **REMOVE** `src/ui/towerModel.ts \| literal \| NO TIME` |
| 10 | `src/ui/tower.tsx:181` | `TODAY · unranked` | `TODAY · Not ranked` | unreachable today | **EDIT text in place** `src/ui/tower.tsx \| text \| TODAY · unranked` -> `TODAY · Not ranked` (reason/since/by unchanged, as brief 05 did for LAP -> TIME) |

Do it as ONE python read-modify-write (json.load -> remove 3 by exact (file, kind, text) key, assert each was found exactly once -> edit 1 `text` (assert found once) -> `entries.sort(key=lambda e: (e['file'], e['kind'], e['text']))` -> `json.dump(indent=2, ensure_ascii=False)` + `'\n'`). First assert that dumping the unmodified file round-trips byte for byte; if not, STOP. Expected: **452 entries** (455 - 3), `legacyCount` 32 unchanged, no other entry changed, `src/ui/preview/data.ts | literal | NO TIME` still present. No entry is added: `Not ranked` in resultsListModel/towerModel is an imported constant, not a literal. If the suite reports any UNLISTED/STALE not in this table, STOP.

## 5. Verification (all from `$HOME/mnt/Qualifire`, `GIT_OPTIONAL_LOCKS=0`)

Before any edit: `git status --short` (other sessions' files: list, do not touch) and the baseline `cd app && node --experimental-strip-types tests/run.ts 2>&1 | tee ../cycles/virgin-cycle23/run-brief06-baseline.log | tail -3` -> `920 tests: 917 pass, 0 fail, 3 skip` (or the current baseline with 0 FAIL; a FAIL here = STOP).

After the edits:
1. `cd app && node --experimental-strip-types tests/run.ts 2>&1 | tee ../cycles/virgin-cycle23/run-brief06.log | tail -3` -> `923 tests: 920 pass, 0 fail, 3 skip` (baseline + 3); `grep -c "^FAIL" cycles/virgin-cycle23/run-brief06.log` -> 0.
2. `cd app && ./node_modules/.bin/tsc --noEmit 2>&1 | tee ../cycles/virgin-cycle23/tsc-brief06.log; echo EXIT=${PIPESTATUS[0]}` with `timeout_ms: 180000` -> `EXIT=0` and an empty log = clean (no EXIT line = timed out: rerun). § 1 item 10 for `app/safe_to_delete/` noise.
3. Mutation check for the new tests (prove they bite), each reverted right after: (a) temporarily put `its lap comes out` back into a routeFromRide.ts string literal -> the § 3a test FAILS; (b) temporarily drop `&& lapLabel !== ''` from replayModel.ts:166 -> the § 3b test FAILS. Do the edit/revert with python on the exact line; confirm `git diff` of those two files is back to your intended version afterwards.
4. `grep -n '~\${' app/src/ui/liveView.tsx app/src/ui/rideHistoryModel.ts app/src/ui/replayModel.ts app/src/ui/feedModel.ts app/src/ui/rideDetailModel.ts` -> 0 hits.
5. `grep -n "'– –'\|did not traverse\|NO TIME'" app/src/ui/liveView.tsx app/src/ui/rideHistoryModel.ts app/src/ui/towerModel.ts app/src/ui/resultsListModel.ts` -> 0 hits (comments that merely mention NO TIME without a closing quote are fine; quote any hit).
6. `grep -n "NOT_RANKED_LABEL" app/src/ui/*.ts app/src/ui/*.tsx` -> adds resultsListModel.ts (import + 1 use + doc) and towerModel.ts (import + 1 use) to brief 05's set; `grep -rn "'Not ranked'" app/src` -> `feedModel.ts` only (+ the doc comment in resultsListModel.ts / tower.tsx `'Not ranked'` inside a comment: quote those lines; they are comments).
7. `grep -c "TODAY · Not ranked" app/src/ui/tower.tsx` -> 1; `grep -c "TODAY · unranked" app/src/ui/tower.tsx` -> 0.
8. `python3 -c "import json;a=json.load(open('app/tests/ui-strings.allow.json'));print(len(a['entries']),a['legacyCount'])"` -> `452 32`. `git diff -- app/tests/ui-strings.allow.json` (quote it): 3 entry blocks removed + 1 `text` line changed (the file already carries brief 05's uncommitted hunks: before your edit copy it to `cycles/virgin-cycle23/scratch/allow-pre-brief06.json` and report the (file, kind, text) set difference against that copy: exactly the 3 removals + 1 text edit of § 4).
9. `git diff --stat` -> your files: `app/src/store/routeFromRide.ts`, `app/src/ui/rideHistoryModel.ts`, `app/src/ui/replayModel.ts`, `app/src/ui/liveView.tsx`, `app/src/ui/resultsListModel.ts`, `app/src/ui/towerModel.ts`, `app/src/ui/tower.tsx`, `app/tests/ui_strings_suite.ts`, `app/tests/replay_suite.ts`, `app/tests/recordflow_suite.ts`, `app/tests/ridehistory_suite.ts`, `app/tests/resultsmodel_suite.ts`, `app/tests/towermodel_suite.ts`, `app/tests/routecreation_suite.ts`, `app/tests/ui-strings.allow.json`. Briefs 04/05 are still uncommitted, so rideHistoryModel.ts, tower.tsx, recordflow_suite.ts, ridehistory_suite.ts, ui_strings_suite.ts and the allow-list already show as modified before you start; say which hunks are yours. `git diff -- app/src/live app/src/store/derive.ts app/src/store/results.ts app/src/store/timing.ts app/src/storage app/src/ui/ResultsDetailScreen.tsx app/src/ui/ReplayScreen.tsx app/src/ui/chips.tsx app/src/ui/demoModel.ts app/src/ui/rankingRevealModel.ts` -> empty.
10. `git diff -- app/src/store/routeFromRide.ts` -> exactly the 4 edits of § 2a (3 one-line swaps + 5 lines -> 4 lines).
11. `git diff -- app/src/ui/replayModel.ts` -> `:166` + one inserted comment line + the `:170` comment + the doc fragments; `:171-172` unchanged.

Native rendering cannot be checked here: say so.

## 6. Out of scope

Engine (`src/live/*`), `store/derive.ts`, `store/results.ts`, `store/timing.ts`, storage, scoring, resultsStore; the ranking/ignore logic (an ignored-but-clean ride keeps its real time in RESULTS); `LiveSectorPane` / `LiveFlash` / `StripSlot` / any style, colour, tier or height; RESULTS layout (cycle 25); `rideDetailModel.sectorTimeCell` (stays, now redundant for real data); `feedModel.sectorChipLabel` and its fixtures; `src/ui/preview/*`; em dashes in other store error strings (`catalogMerge.ts:21,54`, `routeCreation.ts:342,346`) and the legacy `GateAdjustScreen` strings (`Gates saved — reference not re-timed`, the 30-word re-time alert body: `legacy: true` waivers); widening `listScanFiles`; renaming any `lap*` identifier; the `app/safe_to_delete/` probe file; STATE.md / OPEN-ITEMS.md; commits.

## 7. Stop-on-ambiguity

STOP and report verbatim (no guessing, no ruling) if: any anchor in § 0 / § 2 / § 3d does not match right before editing; the baseline has a FAIL; the allow-list does not round-trip, a removed/edited key is not found exactly once, or the count is not 452; the suite reports an UNLISTED / STALE string not in § 4; a test outside § 3 fails; tsc reports anything outside `app/safe_to_delete/`; a mutation check in § 5.3 does not fail; any other file than § 5.9's list would need a change; `bigFromSector`'s new text trips the `virgin-cycle22 04` slice rule.

## 8. Report format

Concise: steps done/not done; files changed (`git diff --stat`, yours marked); suite counts before/after + the three log paths; each § 5 check with its result (incl. both mutation checks); `git diff -- app/tests/ui-strings.allow.json` quoted (your hunks); the final wording of the gate alert body quoted with its word count; deviations verbatim; what Inspect should look at (bigFromSector + lap block, buildSectorRows' two `''` rows, replayModel:166, the routeFromRide reason/suffix, the two NOT_RANKED_LABEL imports, the allow-list diff, that liveView's pane/`LiveFlash` and ReplayScreen have no hunk).

Then one paragraph for the coordinator (you do not edit OPEN-ITEMS/STATE yourself):

"virgin-cycle23 brief 06 (no estimates on flashes, no lap in gate alert, RESULTS 'Not ranked'), on-device checks owed: (a) RECORD on a ride with a GPS gap or a missed gate: no '~' time and no '– –' ever flashes over the clock; the clock just keeps running through that gate; a real sector still flashes its time in tier colour; the strip label reads 'S2', never 'S2 ~'; (b) RECORD finish of an estimated ride: no finish flash, the clock keeps running; a clean ride still flashes its time; (c) REPLAY of an unranked (estimated/missed) activity: the big clock never goes blank; no '~' at any gate; the end line reads 'replay over · GPS gap at a gate' / '· a gate was missed'; (d) REPLAY of a ranked activity: unchanged (gate flashes, finish flash); (e) GATES: move a gate into the reference recording's GPS hole -> alert 'Could not save the gates' / 'the reference activity cannot be timed on these gates · move that gate where the activity passed' (no 'lap', no dash); (f) RESULTS -> a way -> history: an estimated/missed activity reads 'Not ranked' in grey where 'NO TIME' was, the row does not wrap; (g) DEMO run unchanged."

## 9. Decisions for Nathan to review (Plan ruled while he was away; one line each)

1. Gate alert drops the sector detail (`sector 3 (between gate 2→3)`) to stay within 20 words; alternative: `… on these gates (sector 3) · move …` (19-20 words, longer with 2 sectors).
2. A missed gate on the bike no longer flashes `– –` (nothing flashes; same as REPLAY since cycle 22); alternative: keep `– –` as a non-estimate.
3. Estimated strip slot on the bike: label `S2` grey bar (was `S2 ~`); alternative: hide the label.
4. Em dashes also removed from the two defensive "not one of your own ways" errors in the same file; the same pattern in `catalogMerge.ts` / `routeCreation.ts` is left for a chore.
5. RESULTS: an ignored-but-clean ride still shows its real time (not 'Not ranked') because RESULTS shows real times; ACTIVITIES shows it as 'Not ranked'. Cycle 25 can align this (logic change).
6. Tower today row 'Not ranked' at 40 sp would wrap in its 160 dp cell; unreachable today, no layout change made.
