# virgin-cycle28 · Execution order (Opus PLAN tier, 2026-10-09)

Strictly sequential is the recommended order. One Sonnet executor per brief, then a fresh Opus inspector per
brief (or one inspector for the whole batch, quoting each brief's ledger), before the next brief starts.

| Step | Brief | Depends on | Files it touches (app/) | allow-list |
|------|-------|-----------|--------------------------|-----------|
| 1 | `11-brief-01-02-gate-card.md` (ideas 1 + 2) | none | `src/ui/gateAdjustCard.tsx`, `src/ui/gateAdjustModel.ts`, `src/ui/wayMapView.tsx`, `src/ui/wayMapGeo.ts`, `tests/gateseeding_suite.ts`, `tests/waymapgeo_suite.ts`, `tests/waymap_suite.ts` | byte-identical |
| 2 | `11-brief-03-rename-way.md` (idea 3) | none in code; must land before 4 | `src/store/catalogMerge.ts`, `src/ui/catalogDetailModel.ts`, `src/ui/CatalogDetailScreen.tsx`, `tests/catalogmerge_suite.ts`, `tests/catalogdetail_suite.ts`, `tests/ui-strings.allow.json` | +1 entry: `CatalogDetailScreen.tsx|text|rename way` |
| 3 | `11-brief-04-record-new-way-pill.md` (idea 4) | brief 03 landed and inspected (Nathan 4c: "Original" relies on rename existing) | `src/ui/recordFlow.ts`, `src/ui/RecordScreen.tsx`, `src/store/waySpecs.ts`, `src/store/routeCreation.ts`, `tests/recordflow_suite.ts`, `tests/routecreation_suite.ts` | byte-identical |

## Parallelism

- File sets of 01-02, 03 and 04 are pairwise DISJOINT, so 01-02 and 03 MAY run in parallel. Caveat: they share one
  working tree and one test run; an executor's baseline/after runs would see the other's half-applied edits and
  may STOP on a failure that is not theirs. Only parallelise if the coordinator accepts that; default: sequential.
- 04 never runs before 03 is inspected (dependency, not file overlap).
- **cycle29 conflict:** `cycles/virgin-cycle29/04-brief-01-cover-first-frame-and-visible-only.md` (draft, not yet
  approved) also edits `app/src/ui/wayMapView.tsx`. Never run cycle28 brief 01-02 at the same time as any cycle29
  brief. Whichever lands second re-anchors by content; a mismatch is a STOP.

## Per step

1. Coordinator narrates the dispatch (tier, model, mandate) and passes the executor `EXECUTOR-RULES.md` + the brief.
2. Executor writes `12-brief-NN-executor-report.md` (+ tsc logs) in this folder.
3. Fresh Opus inspector with `INSPECTOR-RULES.md`, writes `13-inspect-report-NN.md`.
4. Coordinator runs the verification commands itself, updates STATE.md / OPEN-ITEMS.md, commits (never the executor).

## Verification (every step)

```
cd app && node --experimental-strip-types tests/run.ts      # zero FAIL
cd app && ./node_modules/.bin/tsc --noEmit                   # exit 0
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/tests/ui-strings.allow.json
```
