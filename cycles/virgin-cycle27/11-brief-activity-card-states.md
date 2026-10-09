# Brief 10 — Unranked activities: keep the total time, say `Not ranked` where the rank goes, retire the last negative lines

Written by the Plan tier (Fable) 2026-10-08 ~02:15 UTC from `10-plan.md` §10 and digest 09, with the current source read directly (this is the one idea where the plan opened the files); every anchor re-read in the working tree (suite baseline `940 tests: 937 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md`. **Status: APPROVED (Nathan 2026-10-09 00:24: execute all briefs; Q10.1 unanswered ⇒ the recommended (a) is in force, see `15-rulings-after-plan.md`). Runs 4th, after briefs 02 (colours), 03 (slogan) and 07 (rename), BEFORE brief 01 (record pairing)** — order changed by `10-plan.md` §15 (shares `ridedetail_suite.ts` with 2 and `RecordScreen.tsx` with 1).

## 0. Rules
- STOP-ON-AMBIGUITY → `cycles/virgin-cycle27/12-brief-10-executor-report.md` `## STOPPED`.
- ~~BLOCKED UNTIL NATHAN RULES~~ **IN FORCE: option (a) — Nathan did not answer Q10.1 and asked for execution with the plan's defaults (Fable 2026-10-09).** Q10.1: the unranked card. (a) the total activity time (wall-clock duration, as a free activity shows) stays visible, neutral colour, and `Not ranked` sits in the rank slot [recommended; this brief — Nathan's 2026-10-08 01:17 suggestion]; (b) keep today's `Not ranked` INSTEAD of the time (his 2026-10-07 brief-05 ruling) — then do only §3.3, §3.4, §3.5 (reason lines + RECORD flash) and skip §3.1/§3.2. He must say which of his two statements wins.
- Non-blocking Q10.2 answered (a): `ignored in ranking`, `no rank`, `too few to rank` stay as they are.
- **What is already true (do not re-do):** "no lap", the `estimated | missed | interrupted` sub-label and every quality word are gone from the feed since `c1f46ad`; an interrupted lap is an ordinary ranked card. The tester's screenshot is from an older build (unverified build id).
- Standing rule: nothing negative. The duration is a FACT (never `~`, never an estimate); the lap's `rawS` is NOT shown anywhere (a gate-to-gate time with a missed gate would be an estimate).
- Visible text: §6's table exactly — 2 allow-list entries REMOVED, 1 EDITED. Anything else → STOP. Never delete; no commit; no publish; strip-only TS; `GIT_OPTIONAL_LOCKS=0`.

## 1. Verified anchors (2026-10-08 ~01:40 UTC)
- `app/src/ui/feedModel.ts`: `:24-26` doc on `heroLabel`; `:27` `heroTier: UiTier;` `:28` `rankLabel: string | null; // 'P3/10' or null` `:29-32` doc on `unranked`; `:57` `export const NOT_RANKED_LABEL = 'Not ranked';` `:66-68` `unrankedForDisplay`; `:70-73` `durationLabel(meta)`; `:80-99` `buildFeedCard(row, detail, meta, sectorQuality)` with `:88` `heroLabel: route ? (unranked ? '' : row.lapLabel) : durationLabel(meta),` `:89` `heroTier: route ? detail.lapTier : 'neutral',` `:90` `rankLabel: route && !unranked && row.rank ? \`P${row.rank.pos}/${row.rank.of}\` : null,`.
- `app/src/ui/activityCard.tsx:76-83`:
  ```tsx
        <View style={st.hero}>
          {card.unranked
            ? <Text style={st.notRanked} numberOfLines={1}>{NOT_RANKED_LABEL}</Text>
            : <Text style={[st.lap, { color: hero }]} numberOfLines={1}>{card.heroLabel}</Text>}
          <View style={st.heroCol}>
            {card.rankLabel !== null ? <Text style={st.rank} numberOfLines={1}>{card.rankLabel}</Text> : null}
          </View>
        </View>
  ```
  styles `:134` `lap`, `:136` `rank`, `:137` `notRanked: { color: t.textDim, fontSize: 17, fontWeight: '700', lineHeight: 22 },`. `NOT_RANKED_LABEL` imported from `./feedModel.ts`.
- `app/src/ui/rideDetailModel.ts:69-91` `rankLineFor` — last line `:91` `return r.estimated ? 'GPS gap at a gate' : 'a gate was missed';`; doc `:64-68`.
- `app/src/ui/RideDetailScreen.tsx:73` `import { NOT_RANKED_LABEL, durationLabel, sectorGapLabel } from './feedModel.ts';` `:118` `const [meta, setMeta] = useState<RideMeta | null>(null);` `:478-481`:
  ```tsx
              {model.unranked
                ? <Text style={[styles.notRanked, { color: t.textDim }]}>{NOT_RANKED_LABEL}</Text>
                : <Text style={[st.big, { color: tierTextColour(model.lapTier, t) }]}>{model.lapLabel}</Text>}
              <Text style={[styles.rankLine, { color: t.text2 }]}>{model.rankLine}</Text>
  ```
  free-activity big slot at `:505` `<Text style={[st.big, { color: t.accentText }]}>{durationLabel(meta)}</Text>`; style `:646` `notRanked`.
- `app/src/ui/RecordScreen.tsx:117` `const INTERRUPTED_MSG = 'Interrupted · saved as free activity';` used at `:518` `flashSub(INTERRUPTED_MSG, INTERRUPTED_FLASH_HOLD_MS);`.
- `app/src/ui/ReplayScreen.tsx:223` `` ? `replay over · ${detail.rankLine || detail.lapLabel}` `` — unchanged (reads the new line).
- Tests: `tests/feedmodel_suite.ts:81-89` (unranked card: `heroLabel === ''`), `:118-127` (`NOT_RANKED_LABEL` pinned — stays); `tests/ridedetail_suite.ts:104-113` (`'GPS gap at a gate'`), `:142-153` (`'a gate was missed'`); `tests/recordflow_suite.ts:319` (kept-strings list), `:393-414` (card/detail pins — still satisfied: `{card.unranked`, `{NOT_RANKED_LABEL}`, `st.notRanked`, `styles.notRanked` remain in use), `:460, :467` (`INTERRUPTED_MSG` constant pinned by text).
- Allow-list: `src/ui/feedModel.ts | literal | Not ranked`; `src/ui/rideDetailModel.ts | literal | GPS gap at a gate`; `… | literal | a gate was missed`; `src/ui/RecordScreen.tsx | literal | Interrupted · saved as free activity`.

## 2. Design
Feed card, unranked route activity: hero = `durationLabel(meta)` (the same figure a free activity shows), colour `tierTextColour('neutral', t)`; the rank slot (`heroCol`) shows `Not ranked` in the `rank` style (15 px, `t.text2`), where `P3/10` would be; strip row stays empty (sectors `[]`). Detail page, unranked: big slot = `durationLabel(meta)` in `t.accentText` (as the free page), rank line = `Not ranked`. `rankLineFor` returns `NOT_RANKED_LABEL` for a lap without a real time (missed or estimated) — one neutral verdict, no reason. RECORD's app-killed flash: `Saved as free activity`.

## 3. Edits
### 3.1 `src/ui/feedModel.ts`
- `:24-26` doc → `/** 'route': the time (fmt m:ss.d) — or, unranked, the wall-clock duration (virgin-cycle27 10: the total activity time stays visible); 'plain': the duration, '' when endMs <= startMs */`
- `:28` doc → `rankLabel: string | null; // 'P3/10'; NOT_RANKED_LABEL when unranked (virgin-cycle27 10); null = nothing`
- `:29-32` doc on `unranked` → `/** virgin-cycle27 10 (Nathan 2026-10-08, supersedes brief 05's "no time"): a route activity that cannot be ranked (unrankedForDisplay) keeps its total time (durationLabel) in neutral, shows NOT_RANKED_LABEL where the rank goes, no quality word, empty strip. Always false for 'plain'. */`
- `:88` → `heroLabel: route ? (unranked ? durationLabel(meta) : row.lapLabel) : durationLabel(meta),`
- `:89` → `heroTier: route && !unranked ? detail.lapTier : 'neutral',`
- `:90` → `rankLabel: route ? (unranked ? NOT_RANKED_LABEL : row.rank ? \`P${row.rank.pos}/${row.rank.of}\` : null) : null,`
### 3.2 `src/ui/activityCard.tsx:76-83`
```tsx
      <View style={st.hero}>
        {/* virgin-cycle27 10: the time is always shown (duration when unranked); the rank slot carries the verdict */}
        <Text style={[st.lap, { color: hero }]} numberOfLines={1}>{card.heroLabel}</Text>
        <View style={st.heroCol}>
          {card.rankLabel !== null ? <Text style={card.unranked ? st.notRanked : st.rank} numberOfLines={1}>{card.rankLabel}</Text> : null}
        </View>
      </View>
```
Style `:137` → `notRanked: { color: t.textDim, fontSize: 15, fontWeight: '700', lineHeight: 18 },` (same metrics as `rank`, dim). Remove the now-unused `NOT_RANKED_LABEL` import from `activityCard.tsx` ONLY if nothing else in the file uses it (check; `recordflow_suite.ts:396` requires `{NOT_RANKED_LABEL}` in the card — see §4.3, which rewrites that pin). Keep `numberOfLines={1}` count at 8 (the pin at `:397`): the hero now has ONE text with `numberOfLines` instead of two branches — count the matches after the edit; if it is 7, update the pin in §4.3 to 7 and say so.
### 3.3 `src/ui/rideDetailModel.ts`
- Import: add `NOT_RANKED_LABEL` to the existing `import { unrankedForDisplay } from './feedModel.ts';` → `import { NOT_RANKED_LABEL, unrankedForDisplay } from './feedModel.ts';` (keep that exact form — `recordflow_suite.ts:404` pins the import line; update that pin, §4.3).
- `:91` → `return NOT_RANKED_LABEL; // virgin-cycle27 10: no reason line — nothing negative; estimated and missed read the same`
- Doc `:64-68`: append ` virgin-cycle27 10 (Nathan 2026-10-08): a lap without a real time says NOT_RANKED_LABEL, never why.`
- `r.estimated` stays in the signature (callers pass it); if tsc flags it unused it is a destructured field, not a variable — fine.
### 3.4 `src/ui/RideDetailScreen.tsx:478-480`
```tsx
            {model.unranked
              ? <Text style={[st.big, { color: t.accentText }]}>{durationLabel(meta)}</Text>
              : <Text style={[st.big, { color: tierTextColour(model.lapTier, t) }]}>{model.lapLabel}</Text>}
```
(`:481` rank line unchanged — it now reads `Not ranked`.) `styles.notRanked` (`:646`) becomes unused: leave it (one line) or remove it; `recordflow_suite.ts:402` pins `styles.notRanked` in the file — §4.3 rewrites that pin; remove the style and the pin together. `NOT_RANKED_LABEL` import at `:73`: remove it from the import if unused after this edit (tsc `noUnusedLocals` may or may not be on — check `tsconfig.json`; if unused imports do not error, still remove it for cleanliness).
### 3.5 `src/ui/RecordScreen.tsx:117` → `const INTERRUPTED_MSG = 'Saved as free activity';` and the doc above (`:114-116`): append ` virgin-cycle27 10: no "Interrupted" — nothing negative.` (constant name unchanged: `recordflow_suite.ts:460` pins the call by name.)
### 3.6 Nothing else
`tower.tsx` (`TODAY · Not ranked`), `rideHistoryModel.ts`, `liveView.tsx`, `ReplayScreen.tsx`, notifications, `results.ts` — untouched.

## 4. Tests
### 4.1 `tests/feedmodel_suite.ts:81-89` — the unranked test: build with a `meta` (`{ rideId: 'r1', startMs: 1000, endMs: 1000 + 1830 * 1000, nFixes: 10 }`, the helper type `RideMeta` is already imported at `:100`'s use) and assert `c.heroLabel === '30:30'` (whatever `durationLabel` yields for 1830 s — compute with the real function: `durationLabel(meta)`), `c.heroTier === 'neutral'`, `c.rankLabel === 'Not ranked'`, `c.sectors.length === 0`; keep the quality-word regex loop but allow the label: change the regex to `/~|no lap|estimated|missed|interrupted|ignored|gap/`. Rename: `'feedmodel: buildFeedCard route — estimated / missed lap is unranked: duration shown, neutral, "Not ranked" in the rank slot, no strip (virgin-cycle27 10)'`. Add: with `meta` null → `c.heroLabel === ''` (never invented).
### 4.2 `tests/ridedetail_suite.ts`
- `:111` → `assert(m.rankLine === 'Not ranked', …)`; `:112` keep.
- `:151` → `assert(mk('missed').rankLine === 'Not ranked' && mk('estimated').rankLine === 'Not ranked', 'no reason line, one neutral verdict (virgin-cycle27 10)');`
### 4.3 `tests/recordflow_suite.ts`
- `:319` kept list → `["'ignored in ranking'", "'no rank'", "'too few to rank'"]` and add `for (const gone of ["'GPS gap at a gate'", "'a gate was missed'"]) assert(!model.includes(gone), \`negative reason line still present: ${gone}\`);`.
- `:393-414` test: rename to `'virgin-cycle27 10: unranked activities keep their duration; "Not ranked" sits in the rank slot (feed) / rank line (detail); no quality words, no reasons'`; replace the card assert at `:396` with `assert(card.includes("{card.rankLabel !== null ? <Text style={card.unranked ? st.notRanked : st.rank}") && !card.includes('{NOT_RANKED_LABEL}'), 'card: verdict in the rank slot, time always shown');`; `numberOfLines` count per §3.2; `:402` detail assert → `assert(det.includes('{model.unranked') && det.includes('{durationLabel(meta)}') && !det.includes('{NOT_RANKED_LABEL}') && det.includes('{sectorTimeCell(sec)}'), 'detail big slot = duration when unranked');`; `:404` import pin → `"import { NOT_RANKED_LABEL, unrankedForDisplay } from './feedModel.ts';"`; keep the rest (feed `NOT_RANKED_LABEL` constant, tower, allow-list asserts); add `assert(!allow.includes('"text": "a gate was missed"') && !allow.includes('"text": "GPS gap at a gate"'), 'negative reason entries removed');`.
- `:467` → `assert(src.includes("const INTERRUPTED_MSG = 'Saved as free activity';"), 'INTERRUPTED_MSG constant (virgin-cycle27 10: no negative word)');`

## 5. Acceptance
1. Suite: 940 → 940 (no new tests; rewritten ones), 0 FAIL; `ui_strings` clean. `tsc` exit 0 (`12-brief-10-tsc.log`).
2. `git diff --stat`: `feedModel.ts`, `activityCard.tsx`, `rideDetailModel.ts`, `RideDetailScreen.tsx`, `RecordScreen.tsx` (one constant + comment; attribute vs briefs 1/3/cycle26), `tests/feedmodel_suite.ts`, `tests/ridedetail_suite.ts`, `tests/recordflow_suite.ts`, `tests/ui-strings.allow.json`.
3. `grep -rn "gate was missed\|GPS gap at a gate\|Interrupted ·" src` → none.
4. `grep -n "rawS" src/ui/feedModel.ts src/ui/activityCard.tsx` → no new use (the raw lap time is never shown).

## 6. Visible text
| file | kind | exact text | action | why |
|---|---|---|---|---|
| src/ui/rideDetailModel.ts | literal | `a gate was missed` | REMOVE entry | negative reason retired |
| src/ui/rideDetailModel.ts | literal | `GPS gap at a gate` | REMOVE entry | negative reason retired |
| src/ui/RecordScreen.tsx | literal | `Interrupted · saved as free activity` → `Saved as free activity` | EDIT in place (`reason`: "virgin-cycle27 10: no negative word; the fact is that it was saved", since 2026-10-08, by "Sonnet execute, virgin-cycle27 brief 10") | nothing negative |
`Not ranked` (feedModel.ts entry) is reused through the constant: no new entry (it is a `literal` in `feedModel.ts`, and the card/detail render the constant, not a new literal). If the scanner reports `Not ranked` UNLISTED for another file, STOP (it would mean a literal was typed instead of the constant).

## 7. What this changes on Nathan's phone (JS-only, OTA)
ACTIVITIES: an activity with a missed/estimated gate, or one he ignored, shows its total time (big, neutral gold) with `Not ranked` small on the right where `P3/10` would be; the strip stays empty; map and title as before. Detail page: the same duration, `Not ranked` under it, no "a gate was missed" / "GPS gap" line. REPLAY's end line reads `replay over · Not ranked`. After an app-killed ride RECORD flashes `Saved as free activity`. NOT changed: ranked cards, the tower, free activities, `ignored in ranking` / `no rank` / `too few to rank` lines.

## 8. Rollback
Restore the three `buildFeedCard` lines, the card hero JSX, `rankLineFor`'s last line, the detail big slot, the RECORD constant, the four test files and the allow-list entries.

## 9. Report
`12-brief-10-executor-report.md`: files, counts, tsc, the three allow-list hunks quoted, `numberOfLines` count, any STOP. OPEN-ITEMS line: "Unranked cards (cycle27 brief 10) — on-device with a missed-gate activity: duration + Not ranked on the card and the detail page; tester build id still unverified."
