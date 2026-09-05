# INSPECT report — WP-C / WP-E / WP-F / WP-G / WP-H (virgin-cycle2, planning-only)

**Tier:** Inspect (fresh-context Fable), adversarial re-verification of five briefs against the real mount.
**Repo state checked:** `5ae4c30`, branch `virgin`, uncommitted = only `cycles/virgin-cycle2/` + data notes (no `app/` changes). Baseline `node --experimental-strip-types tests/run.ts`: **468 tests, 465 pass, 0 fail, 3 skip** (the 3 skips are engine python-parity fixtures, unrelated). `tsc --noEmit --listFilesOnly` confirms **`tests/*.ts` ARE type-checked** by the project `tsc` run (37 test files listed) — relevant to WP-C below.
**Method:** every cited line was re-read with `sed -n`; every "no other consumer" claim re-derived with a fresh `grep -rn` over `app/src` and `app/tests`; nothing edited.

---

## WP-C — raw wall-clock scoring default

**Verdict: PASS WITH FINDINGS** (the brief is accurate and complete on the load-bearing claims; two mechanical gaps and one cross-brief sequencing hazard need a one-paragraph amendment before Execute runs).

### What was confirmed (all re-derived, not trusted)
- **`rawS` already stored, no schema change needed — TRUE.** `types.ts:96` (`rawS: number` on `SectorResult`), `:110` (`lap: { rawS: number; movingS: number | null; quality }`), `derive.ts:74/77` (sector `rawS: raw`, `movingS: … ? null : (r.movingS ?? null)`), `:112-113` (lap `rawS: lapRaw`, `movingS: clean|interrupted ? lapRaw - lapStopped : null`), `lastRide.ts:86-87` (`lapMovingS = st.lap.movingS; lapRawS = st.lap.rawS`), `:96-104` (sectors carry `rawS`), `:160-162` (stored lap `rawS: lapRawS ?? lapMovingS ?? 0`), `engine.ts:172-181` (`LiveSector` 'done' `rawS: number; stoppedS; movingS: number | null`), `:185-190` (`LiveLap { rawS: number | null; … }`), `:1011-1018` (`movingS = rawS - stoppedS`). All verbatim as quoted.
- **`movingS === null` is the estimated/missed marker — TRUE** (`derive.ts:77/:113`, `lastRide.ts:98/:102/:162`). The `scoredS()` design (null passes through in both modes) is sound and keeps eligibility mode-invariant as claimed.
- **Settings module — TRUE.** `settings.tsx:23-33` `RedLight` + `Settings` interface (6 fields incl. `sectorColours`), `:35-42` `DEFAULTS`, `:50` `FILE = …settings.json`, `:66` `setS((prev) => ({ ...prev, ...saved }))`, `:73-74` earcons `useEffect`, `:96-115` `Seg<T extends string>`, `:126` `Row`. Consumers: `RideDetailScreen.tsx:124` `const { s } = useSettings()`, `RecordScreen.tsx:136` `const { s: settings } = useSettings()`, `RidesScreen.tsx` has no `useSettings` import (confirmed). Merge-on-load means a legacy `settings.json` gets `timing: 'raw'` — correct.
- **Call-site list (27 entries, 9 files) — COMPLETE.** A fresh `grep -rn "\.movingS" app/src --include=*.ts --include=*.tsx`, minus `engine.ts`/`derive.ts`/`lastRide.ts`/`resultsStore.ts:81`, yields EXACTLY the lines the brief tabulates: `results.ts:95,108,111,120,146,148`; `colourModel.ts:112,125,152`; `towerSource.ts:33`; `liveView.tsx:137,140,161,163,190,191`; `RecordScreen.tsx:782`; `rideDetailModel.ts:135,136,137`; `rideHistoryModel.ts:114,171,178,180,233,234,236,256,257`; `sectorTrailModel.ts:63,64,84,88`; `towerModel.ts:59,61`. No missed reader. `lapMovingS` readers outside `lastRide.ts` = only `rideDetailModel.ts:83/88/91/137` (as tabled). `tower(` has no `src/` caller (confirmed); `buildTowerModel` has no `src/` caller (confirmed). Spot-checked quotes at #1-#8, #9, #11-#16, #17-#22, #23-#26, #27 — all verbatim.
- **`TowerRow.movingS` at `types.ts:142` — TRUE.**
- **Memo deps — TRUE.** `RecordScreen.tsx:777-787` deps `[live.sectors, live.track, t]`; `:797-806` deps `[live.sectors, live.track, settings.sectorColours]`; `RidesScreen.tsx:93-99` deps `[rides, resultsTick]`; `RideDetailScreen.tsx:178-190` deps `[request.rideId, request.startedAtMs, tick]`; `PbDetail` (`:83-85`) unmemoised. `tierOf` (`:758`) also feeds `viewModelFromEngine(...)` at `:1061-1065` unmemoised — as stated.
- **Test anchors — TRUE.** `store_suite.ts:96-99` mkResult fixture, `:274-282` tower fixture, `:299-303` ranks() cases, `:430/:433/:436/:438/:442` (`.movingS` on `TowerRow`, the 480..2400 bound, `pole`, `hot`, `slow`); `ridedetail_suite.ts:39-42` (900/880, 440/430, 460/450), `:76` (900/850), `:130` `{ lapMovingS: 850 … }`; `towermodel_suite.ts:38` `rawS: movingS`; `ridehistory_suite.ts` uses `rawS === movingS` throughout (checked every fixture line). `tests/lib.ts` exports `skip()`; `lastRide.ts:315` exports `resetRecordedForTests`.
- **The `store_suite.ts:433` bound survives the raw default**: seed laps' raw min/max per route (Morning 817–903, EveningA 810–1278, EveningB 758–813) all lie inside 480..2400, so no bound widening is needed.
- **Good news on flag 4 (§7.4):** under Node `seed.ts:36` resolves `SEED_MODE` to `'shipped'` (env var unset), so `shippedResults()` is NOT `[]` in the headless suite — `lapValues('Morning')` has 9 priors and `live_colour_suite.ts:149`'s guard already passes today. §5.2 test 6 is viable as written; the `skip()` escape hatch will not be needed.

### Findings
1. **(Must amend) `tests/sectortrail_suite.ts` breaks `tsc` under #24 and is not in §5.3's list.** `sectortrail_suite.ts:51` defines `type StoredLike = { index: number; movingS: number | null; quality: string }` (no `rawS`) and passes it to `storedSectorColours(...)` at 12 call sites (`:65-232`). Adding required `rawS: number` to `StoredSectorLike` (#24) makes every one a type error, and `tsc` DOES check `tests/` (verified via `--listFilesOnly`). Runtime would still pass (`scoredS` falls to `t.rawS ?? t.movingS` → `undefined ?? movingS`), which is exactly the kind of green-runtime/red-tsc trap Execute would have to stop on. Fix is mechanical: add `rawS: number` to the local `StoredLike` and to its fixtures (`rawS: movingS ?? 0`, mirroring the `done()` helper at `:151-153`). Add this to §5.3 explicitly.
2. **(Should amend) #5's "After" for `sectorHistory()` does not type-check as written.** `results.ts:146-148`: `const v = s ? scoredS(s) : null; if (v === null) continue;` followed by the untouched `:147 if (s.quality !== 'clean' && …)` — TS does not narrow `s` (`SectorResult | undefined`) through a ternary result, so `s.quality` is TS2532 under `strict`. Either keep `if (!s) continue;` before computing `v`, or order it `if (!s) continue; const v = scoredS(s); if (v === null) continue;`. One-line brief fix; without it a literal Execute hits a tsc error on the first file it touches.
3. **(Sequencing hazard — coordinator decision) WP-C and WP-E both edit `RecordScreen.tsx:769-787`.** WP-E deletes the `gateColours` memo; WP-C's #11 edits `:782` and its `:787` deps inside that same memo. Whichever runs second hits a verbatim anchor mismatch and must STOP. Recommend: land WP-E first and add one line to WP-C §3.4: "if the `gateColours` memo is already gone (WP-E landed), #11 and the `:787` dep change are moot — skip them; the `:805` `sectorColours` dep change still applies." Similarly WP-F edits `rideDetailModel.ts:15-34` (removes ~20 lines) which shifts WP-C's `rideDetailModel.ts:83-137` anchors up by ~20 — beyond §7's "a few lines". Either run WP-C before WP-F, or tell Execute the offset is expected.
4. **(Minor, characterisation)** §3.4 says the `?? rawS` fallbacks cover a case that "today prints raw and colours neutral". True for sectors (`liveView.tsx:137/161` pass `movingS ?? null` → neutral), but NOT for the lap chip: `:190` is `tierOf(0, st.lap.movingS ?? st.lap.rawS ?? null)`, which today colours a movingS-null non-estimated lap BY ITS RAW time. The brief's replacement preserves this verbatim, so behaviour is unchanged — only the prose is slightly off. No action beyond noting it.
5. **(Minor, line drift)** `rideDetailModel.ts` `const hist = d.laps(routeId);` is at `:127`, not `:130` (brief says "after `:130`"; the quoted line is 3 lines away — within tolerance). `settings.tsx` "Red lights" row is at `:278-283` (brief: `:266-271`), SCORING card at `:305-314` (brief: `:294-304`) — ~11-line drift from the WP-K "Sector colours" row; the quoted code is findable by label. `Seg` is `:96-115` (brief: `:97-116`).
6. **(Note, not a defect)** `RecordScreen.tsx` mixes import styles (`'./sectorTrailModel.ts'` at `:46`, extensionless elsewhere); `liveView.tsx` is fully extensionless (confirmed). §3.1's "match the file" instruction is adequate.
7. **(Design sanity, no action)** `setTimingMode(s.timing)` synchronously in `SettingsProvider`'s render body is sound: the provider renders before its consumers in the same pass, the assignment is idempotent, and the initial `useState(DEFAULTS)` render seeds `'raw'` before the async load lands. `Seg` inference with `value={s.timing}` follows the identical `redLight` pattern at `:280-282`, so §7.5's fallback annotation should not be needed.

**Confidence:** High. Every one of the 27 call sites was re-derived by grep and ~20 of them read in full; all four storage-side anchors, the Settings module, all three memo-dep sites, and every test anchor in §5.3 were opened. The only things not executed were the new code itself (planning-only cycle) and a full `tsc --noEmit` (the `--listFilesOnly` run was used to establish that tests are type-checked; the baseline test run was executed and is green).

---

## WP-E — retire tier-coloured gate ticks (`gateColours`)

**Verdict: PASS WITH FINDINGS** (fix is as simple as claimed; one line-range instruction would delete an unrelated comment if followed literally).

### Confirmed
- `RecordScreen.tsx:777-787` is the `gateColours` `useMemo` (its dedicated comment block is `:769-776`); `:1041` is `gateColours={gateColours}` on `<RouteMapView>`. Verbatim.
- **`tierOf` HAS another caller** — `RecordScreen.tsx:1065` (`viewModelFromEngine(live, realTimebase(...), getLiveTowerPosition(live), tierOf)`). The brief's guard ("if `tierOf` has another caller, keep it") is therefore the live branch: **keep `tierOf`**, delete only the memo + its comment + the prop wiring.
- Fresh `grep -rn "gateColours" app/src`: `RecordScreen.tsx:777,1041`; `routeMapGeo.ts:66,74,334,360`; `routeMapView.tsx:197,234(comment),475,881`; `sectorTrailModel.ts:70(comment)`. No other consumer. `grep -rn gateColours app/tests`: only `routemapgeo_suite.ts:56,256` message strings; the suite calls `gatesFeatureCollection`/`gateTicksFeatureCollection` directly with literal colour arrays (`:59,:73,:258,:266`) — unaffected by Option 1.
- Both render rungs fall back cleanly with no array: `routeMapView.tsx:475` → `gateTicksFeatureCollection(asset, props.gateColours)` → `routeMapGeo.ts:360` `gateColours?.[i] ?? null` (colour property omitted); `routeMapView.tsx:881` `props.gateColours?.[i] ?? null` → `backgroundColor: col ?? CASING` (`:893`). As claimed.

### Findings
1. **(Must amend) The Option 1 deletion range is wrong by one comment block.** The brief says delete `769-787` "plus its two immediately-preceding standalone comment blocks (lines ~760-768, ~769-776)". Reality: `:754-757` is `tierOf`'s own comment (must stay — `tierOf` stays), `:765-767` is the **"NOTE: the gate buzz is NOT fired here. src/location/index.ts owns it…"** comment — unrelated to `gateColours` and must stay — and `:769-776` is the only gateColours comment (already inside `769-787`). Rewrite as: delete `:769-787` only (comment + memo), nothing above `:769`.
2. **(Minor)** Function names in the brief are swapped: `routeMapGeo.ts:66-74` is `gatesFeatureCollection` (not `gateTicksFeatureCollection`), and `:334-360` is `gateTicksFeatureCollection` (not "`allGatesFeatureCollection`'s sibling" — `allGatesFeatureCollection` is at `:105` and takes `crossedGates`, not `gateColours`). The MapLibre rung at `:475` only calls `gateTicksFeatureCollection`. No effect on Option 1.
3. **(Tidy-up)** After the memo goes, `chipColors` (imported at `RecordScreen.tsx:45`) has no remaining use in the file; `colors` and `Tier` still do. `tsconfig` has no `noUnusedLocals`, so tsc will not fail, but Execute should drop `chipColors` from the import to avoid leaving a dead import.
4. **(Cross-brief)** See WP-C finding 3 — sequence WP-E before WP-C.
5. **(Side effect worth recording in OPEN-ITEMS)** Retiring the memo also removes the RecordScreen half of the Parked "real contrast bug — pale purple text … the Record screen's gate-colour memo" item.

**Confidence:** High — every cited line opened, both consumer greps re-run over `src` and `tests`.

---

## WP-F — dedupe `lineColourFor` into a pure `tierColour.ts`

**Verdict: PASS WITH FINDINGS** (refactor is sound; the type question the brief defers to Execute is answered below; one more "look-alike" switch exists but is a different function).

### Confirmed
- `chips.tsx:12` `export type Tier = 'none' | 'neutral' | 'yellow' | 'green' | 'purple' | 'est'`; `:17` `export const YELLOW_TIER = colors.neutral;`; `:36-43` `tierLineColour` body exactly as quoted (doc comment is `:21-35`, brief says 18-31 — trivial). `chips.tsx` imports React/RN — cannot load headlessly, as stated.
- `rideDetailModel.ts:16-26` duplication comment, `:27-34` `lineColourFor(tier: UiTier)` body exactly as quoted, `:111` the single call `storedSectorColours(result, hist, lineColourFor)`. `theme.ts` has no imports (pure) — safe for the new module.
- `tierLineColour`/`YELLOW_TIER` value consumers outside chips.tsx: `DemoScreen.tsx:33/162`, `RecordScreen.tsx:45/802`. Everything else is comments. A re-export from `chips.tsx` keeps both untouched.
- **The `Tier` vs `UiTier` question — answered:** they are NOT identical. `colourModel.ts:19` `UiTier = 'purple' | 'green' | 'neutral' | 'yellow' | 'est'` — i.e. `Tier` minus `'none'`. `UiTier` is a strict subtype of `Tier`, so a function typed `(tier: Tier) => string | null` accepts a `UiTier` argument with **no cast**, and is assignable to `sectorTrailModel.ts:29`'s `SpanPaint = (tier: UiTier) => string | null` (parameter contravariance) — `RecordScreen.tsx:802` already passes `tierLineColour` as `SpanPaint` today and compiles. So: type the extracted function on `Tier`, keep `rideDetailModel.ts`'s `UiTier` imports as they are, and the brief's stop-clause on a type mismatch will not fire. Only open choice: where `Tier` lives. `import type { Tier } from './chips'` inside `tierColour.ts` is a type-only import (stripped at runtime, so headless loading is fine) but makes a chips↔tierColour type cycle; cleaner is to move `type Tier` into `tierColour.ts` and `export type { Tier } from './tierColour'` in `chips.tsx`. Either satisfies the brief.

### Findings
1. **(Information for step 4's grep)** A third `case 'purple': return colors.purple;` switch exists at `RideDetailScreen.tsx:59-67` (`tierColour(tier: UiTier, t: PaddockTheme): string`). It is NOT a copy of `tierLineColour`: it returns a TEXT colour (`t.accentText` for `'neutral'`, `t.textDim` default, never `null`). Leave it alone; it is out of this brief's scope. `towerModel.ts:41` returns tier-name strings, also unrelated.
2. **(Cross-brief)** WP-F removes ~20 lines at the top of `rideDetailModel.ts`, shifting WP-C's anchors in that file (see WP-C finding 3).

**Confidence:** High — both files and every consumer opened; type compatibility reasoned from the actual declarations and the existing compiling usage at `RecordScreen.tsx:802`.

---

## WP-G — way-creation polish (loop copy + two "untested branches")

**Verdict: PASS WITH FINDINGS** (G1 is correct and trivially implementable; G2 is materially mis-specified — one proposed test is already covered and the other is described against the wrong code shape).

### G1 — confirmed
- `wayNamingCard.tsx:27-45` props (`startExistingLabel`, `endExistingLabel`, `loop`), `:59` `const needStart = props.startExistingLabel === null;`, `:91-100` the sub-copy ternary with `:98` `'This ride looped from and back to one new place.'` — verbatim. The branch indeed never consults `startExistingLabel`.
- The mis-copy is reachable: a loop from/to an existing landmark with no loop way yet resolves `start`/`end` both `'existing'` (same id) at `wayCreation.ts:191/218`, `loop = true` (`:246`), `existingWayId = null` (`:251-256` finds nothing) → card renders with no input (`needStart`/`needEnd` false) and the "one new place" line. Both callers pass the same props (`RecordScreen.tsx:977-980`, `RideDetailScreen.tsx:517-519`). The proposed condition on `props.startExistingLabel !== null` is the right key; the fix is as simple as claimed.

### G2 — findings
1. **(Must amend) Test 2 ("both endpoints existing, same landmark → `existingWay` resolves") is ALREADY covered** — not by "a loop build needs a loopDiscriminator" (which the brief guessed at) but by **`WP-G 8: an existing loop way drafts a variant, not a second loop way` (`waycreation_suite.ts:500-524`)**: it builds a catalog with a loop way `loop:existing` on landmark `loopplace`, drafts a ride starting and ending there, and asserts `d.loop === true`, `start.kind === 'existing' && end.kind === 'existing' && start.landmarkId === 'loopplace'`, `existingWayId === 'loop:existing'`, and that the build mints no second loop way. Per the brief's own rule, skip it and say so.
2. **(Must amend) Test 1's code-shape description is wrong.** The brief says `end.kind === 'new'` with no `draft` is "the sliver-reuse case … reusing an existing landmark". In `wayCreation.ts:224-235` a sub-MIN sliver against an EXISTING landmark yields `end = { kind: 'existing', landmarkId: squeezer.id }` (`:234`); the ONLY shape with `kind: 'new'` and no `draft` is `:233` — "loop onto the start draft" — which is a loop by construction, so `wayCreation.ts:341`'s `!draft.loop` guard skips the push regardless of `draft.end.draft`. And that shape at build level is already pinned by `waycreation_suite.ts:152-163` (`built.landmarks.length === 1`, `startLandmarkId === endLandmarkId`, discriminator present, validates). So the test as written in the brief would either be a duplicate or would assert on a "reused existing landmark" that does not exist in that shape. What "end-side sliver-reuse" plausibly meant in the original inspection is the `:234` branch on the END side for a NON-loop ride (start-side sliver reuse is tested at `:82-96`; end-side is not — `WP-F 3b` at `:256` is the matched-way slack snap, a different mechanism). A sound replacement: draft a non-loop ride whose LAST fix sits within a sub-MIN sliver of an existing landmark's disc edge → assert `d.end.kind === 'existing'` with that landmark's id, then `buildWayCreationCatalog` → assert no new END landmark is pushed (`landmarks.length === userCat.landmarks.length + 1` for the new start only) and `way.endLandmarkId` equals the existing id. This needs a fresh Fable ruling on the test's intent, not an Execute guess.
3. **(Stale digest)** `waycreation_suite.ts` is **882 lines with 44 tests** (the brief says "94 lines as of this digest"); the brief did hedge, but Execute should be told outright to re-list the file.
4. **(Minor)** The function that directly exercises `:341-343` is the pure `buildWayCreationCatalog` (the existing tests use it); `createWayFromDraft` is the async wrapper tested at `WP-H 17/17b`. The brief's "or whichever function" hedge covers this.

**Confidence:** High for G1 and for the "already covered" finding (test bodies read in full); medium-high on what the original inspection meant by "end-side sliver-reuse" (inferred from the code, since the original note is one clause in OPEN-ITEMS.md).

---

## WP-H — gate-adjust pad overflow + size distinction

**Verdict: PASS WITH FINDINGS** (style block matches exactly; one row element the brief omits changes the arithmetic of the fix).

### Confirmed
- `gateAdjustCard.tsx:82` `style={[st.padBtn, { borderColor: t.cardBorder }]}`, `:86` `<Text style={[st.padText, { color: t.text }]}>{label}</Text>`, `:147` `<View style={st.padRow}>`, `:185-187` `padRow`/`padBtn`/`padText` — byte-identical to the brief's quote (`padRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }`, `padBtn: { …, minWidth: 52, alignItems: 'center' }`, `padText: { fontSize: 15, fontWeight: '700' }`). No `flexWrap`, no `flex`/`flexShrink` — as described.
- Button order/labels (`:148-152`, answering the brief's "confirm at execute time"): `−1%` (`-largeM`), `−0.1%` (`-smallM`), **chainage Text**, `+0.1%` (`smallM`), `+1%` (`largeM`). The big pair is the OUTER pair. `largeM/smallM` come from `nudgeDeltaM(NUDGE_LARGE_PCT|NUDGE_SMALL_PCT, refLengthM)` at `:67-68` — untouched by a style change.
- The "shared sub-component" concern (§stop-on-ambiguity) does not bite: `pad` is a local closure `(label, deltaM) => <Pressable …>` at `:79-88`; adding a third `big` argument or a second style is a 3-line change.
- No layout-dimension test pattern exists in `tests/` (`gateadjustmap_suite.ts` is pure math) — the brief's "needs on-device look" stance is right.

### Findings
1. **(Should amend) The row has FIVE children, not four.** `:150` renders `<Text style={st.chainage}>` between the two pairs, and `chainage` (`:188`) is `{ fontSize: 16, fontWeight: '700', minWidth: 86, textAlign: 'center', fontVariant: ['tabular-nums'] }` — a non-flex, `minWidth: 86` element. With `flex: 1, minWidth: 0` on the four buttons, the buttons split only `rowWidth − 86 − 4×8 gap`; on a ~296 px content width (360 px phone minus card+screen padding) that is ~178 px → ~44 px per button, less than `−0.1%` at 15 px bold plus 24 px horizontal padding. So the overflow fix as literally specified trades overflow for clipped/wrapped labels. The brief's fallback ("smaller `fontSize` / `paddingHorizontal` reduction") is the right lever, but Execute should be told about the chainage element up front so the first attempt accounts for it (e.g. `paddingHorizontal: 6`, and/or `flexShrink: 1` + a smaller `minWidth` on `chainage`).
2. **(Minor)** "Verify visually" is not something Execute can do headlessly; the brief already says to report that plainly. Fine.

**Confidence:** High — the file is 195 lines and was read end to end around every cited anchor.

---

## Cross-brief summary for the coordinator

| Brief | Verdict | Blocking amendments before Execute |
|---|---|---|
| WP-C | PASS WITH FINDINGS | add `sectortrail_suite.ts` fixture update to §5.3; fix #5's `s`-narrowing snippet; state the WP-E/WP-F ordering |
| WP-E | PASS WITH FINDINGS | correct the deletion range to `:769-787` only (keep `:765-767` gate-buzz NOTE and `:754-758` `tierOf`) |
| WP-F | PASS WITH FINDINGS | none blocking — `Tier ⊃ UiTier` answer above removes Execute's type check step |
| WP-G | PASS WITH FINDINGS | G2 test 2 is already covered (`WP-G 8`); G2 test 1 is described against the wrong branch — needs a fresh Fable ruling on intent |
| WP-H | PASS WITH FINDINGS | mention the fifth row child (`chainage`, `minWidth: 86`) so the flex fix is sized correctly |

**Recommended execution order:** WP-E → WP-C → WP-F (E and F both touch files C anchors; E removes a block C edits, F shifts C's `rideDetailModel.ts` lines). WP-G and WP-H are independent of the others.
