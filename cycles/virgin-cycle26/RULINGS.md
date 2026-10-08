# virgin-cycle26 — Fable rulings on executor escalations

## 2026-10-08 — brief 01, tsc TS2367 on the sentinel-differ assert

**Escalation (Sonnet executor of `06-brief-01-record-picker-loop.md`):** `tsc --noEmit` exits 2 with
`tests/recordflow_suite.ts(634,33): error TS2367: types '"~loop"' and '"~new"' have no overlap`.
The line is test code supplied verbatim by the brief (§4.3), so the executor did not touch it.

**Cause.** `export const LOOP_ID = '~loop'` (`app/src/ui/recordFlow.ts:150`) and the test-local
`const NEW = '~new'` are both literal-typed consts. TypeScript already knows the two literals can never
be equal, so it rejects `LOOP_ID !== NEW` as an unintentional comparison. The runtime intent (sentinel
is `'~loop'` and differs from the NEW sentinel) is still worth asserting: it guards against someone
later retyping either sentinel to the other's value.

**Ruling.** Widen one operand to `string` at the comparison site; nothing else changes. The `=== '~loop'`
half stays literal (it is the value pin). No rider-facing string is involved; coverage is unchanged.

- File: `app/tests/recordflow_suite.ts`, line 634
- Old line (exact):
  `  assert(LOOP_ID === '~loop' && LOOP_ID !== NEW, 'sentinels must differ');`
- New line (exact):
  `  assert(LOOP_ID === '~loop' && (LOOP_ID as string) !== NEW, 'sentinels must differ');`

Rejected alternative: `const NEW: string = '~new'` would also compile but edits a different line than
the one flagged and widens every later `r.toId === NEW` comparison for no gain.

**Sweep of the other supplied test code.** Grepped briefs 01-04 and `app/tests/*.ts` for `===`/`!==`
between two const-literal operands. Only this one site exists. `resultsmodel_suite.ts:251`
(`PLOT_N === WINDOW_N && WINDOW_N === 10`) and `towermodel_suite.ts:154` (`TOWER_MAX_VISIBLE === WINDOW_N`)
compare numeric literals that ARE equal, so TS2367 does not fire; left alone. Briefs 02, 03 and 04 supply
no such comparison; nothing to amend there. The brief 02 tsc log shows the identical single error, i.e.
it is inherited from brief 01's test, not a brief 02 defect.

**Brief amended in place:** `06-brief-01-record-picker-loop.md` line 213 now carries the new line, so the
brief and the file agree.

**Executor next step:** apply the one-line replacement, rerun `npx tsc --noEmit` from `app/`, expect exit 0,
rerun the brief 01 test suite, then finish `report-brief-01.md`.

## 2026-10-08 — brief 04, the dasharray/gradient whole-file assertion can never pass

**Escalation (Sonnet executor of `06-brief-04-map-pass-display.md`):** the brief's `waymap_suite` test
asserts `!src.includes('line-dasharray') && !src.includes('line-gradient')` over all of `wayMapView.tsx`.
Both words already sit in pre-existing comments (`:584`, `:866-867`; 3 matches at HEAD, 4 now because the
sector-spans comment line moved), so the assertion fails regardless of the edit. The three wiring asserts
after it were never reached. Also raised: two anchors matched twice (`: { name: g.name };` and the
`CASING`/`colors.neutral` paint lines), and the brief's `grep -c GeoJSONSource` on the diff gives 4, not 0.

**Cause.** Brief defect: a string-presence check on the whole source file for words the file's own comments
are required to carry (the 2026-08-24 bug class is documented in exactly those comments). The intent — no
`line-dasharray` / `line-gradient` *paint property* is introduced — is right; the probe was too wide.

**Ruling 1 — the assertion.** Test for the quoted property key, which is how any MapLibre paint key or
`setPaintProperty` argument must be written and how no comment in the file writes it. Comment stripping
was rejected: it needs a JSX-aware scrubber for the `{/* … */}` block at `:866` and is more code than the
guard it protects. The regex still fails when someone adds `'line-dasharray': [...]` (or the
double-quoted form) to any layer.

- File: `app/tests/waymap_suite.ts`, line 435 (the brief's §4.6 `waymap_suite` block, 7th assert)
- Old line (exact):
  `  assert(!src.includes('line-dasharray') && !src.includes('line-gradient'), 'no dasharray / gradient (2026-08-24 device bug class)');`
- New line (exact):
  `  assert(!/['"]line-(dasharray|gradient)['"]/.test(src), 'no dasharray / gradient paint property (2026-08-24 device bug class; comments may name them)');`

Verified at HEAD and at the current working tree: `grep -nE "['\"]line-(dasharray|gradient)['\"]" app/src/ui/wayMapView.tsx`
→ no hits; the two comments are not hits.

**Ruling 2 — the wiring asserts (Record / Demo / Replay progressM).** Run on a scratch copy of `app/`
(outside the repo, node_modules symlinked) with only the line above changed: the brief 04 `waymap_suite`
test PASSES in full, i.e. `progressM={live.chainageM}` (`RecordScreen.tsx:1428`),
`progressM={progressAtTime(ASSET, script.gateAt, clockS)}` (`DemoScreen.tsx:669`) and
`progressM={pos ? pos.sM : null}` (`ReplayScreen.tsx:241`) are all present, exactly one hit per file.
The other five brief 04 tests PASS too. No further fix is needed. (The scratch run showed 9 unrelated
FAILs — lockscreen/ridenotif Kotlin files and `.easignore` — that are artefacts of the scratch copy
omitting `modules/*/android` and the repo root; in the real tree the executor reports them passing, 950/954.)

**Ruling 3 — `trail-casing` / `trail-core`.** The brief meant the `route-*` occurrence only. Evidence: §1
("Paint, not geometry") names exactly five layers — `route-casing`, `route-core`, `sector-spans-core`,
`gate-ticks-casing`, `gate-ticks`; §4.5(e) addresses each by layer id; §8 non-goals list "trail" as
untouched; the trail source (`trailFC`) carries no `faint` property, so an opacity expression there would be
dead. The executor's choice (edit `route-*`, leave `trail-*` at `:822-829`) is correct and the trail must
NOT change. Likewise `: { name: g.name };` at `wayMapGeo.ts:78` (`gatesFeatureCollection`) stays; only
the `gateTicksFeatureCollection` occurrence (`:367`) was meant, as the brief's `:361-365` anchor said.

**Ruling 4 — the `GeoJSONSource` diff check.** `git diff | grep -c "GeoJSONSource"` counts unified-diff
context lines; the route paint hunk is bracketed by `<M.GeoJSONSource key="route"…>` / `</M.GeoJSONSource>`
and the sector/gate hunks by their closing tags, so 4 context hits are the expected shape of a correct
edit. The check that carries the intent (no source line added/removed) is on changed lines only:
`GIT_OPTIONAL_LOCKS=0 git diff -- app/src/ui/wayMapView.tsx | grep -c "^[+-].*GeoJSONSource"` → 0
(verified: 0 now). Brief §6 step 5 and §7 amended; the inspector must use the `^[+-]` form.

**Ruling 5 — sweep of the brief's other whole-file negative asserts.** `!src.includes("'line-opacity': 1,")`
and `!src.includes('features?.[0]?.properties?.name')` each had exactly one occurrence at HEAD (`:914`,
`:902`), both are the lines the brief replaces, and both are 0 in the working tree — they fail before and
pass after, as intended. The positive asserts (`progressM?: number | null;`, the 5× opacity expression,
builder calls, `nextGateOnTap(hits, …)`) are new strings absent at HEAD. Briefs 05 and 06 were not
re-swept here (their reports are in). Nothing else to amend.

**Brief amended in place:** `06-brief-04-map-pass-display.md` line 523 (the assert), line 568 (`^[+-]`
grep), lines 574-575 (acceptance: quoted-key grep; trail unchanged).

**Executor next step:** replace `app/tests/waymap_suite.ts:435` with the new line above (one line, nothing
else), rerun `cd app && node --experimental-strip-types tests/run.ts | tail -1` → expect `954 tests: 951 pass,
0 fail, 3 skip`; `./node_modules/.bin/tsc --noEmit` → 0; redo §6 step 5 with the `^[+-]` grep → 0; then
finish `report-brief-04.md` (status: DONE, cite this ruling), keeping the trail-*/`:78` deviations as recorded.
