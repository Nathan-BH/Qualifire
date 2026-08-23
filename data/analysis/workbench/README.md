# data/analysis/workbench/

What lands here: JSON files saved from `demos/workbench.html` (Save button),
one per route per save, named `workbench-<routeId>-<YYYYMMDD-HHMM>.json`.
Nathan downloads them from the workbench page and moves them here by hand —
a browser page can't write into the repo.

Who reads it: the coordinator, at the start of every cycle. A file here is a
*proposal* — a moved gate, a named point, or a promoted reference ride — not
yet a change to `catalog.seed.json`/`refs.json`. It only becomes real when a
cycle executes it (gate-set versioning keeps the history honest).

Nothing here auto-runs. Once a cycle has acted on a save, move it to
`safe_to_delete/` rather than deleting it.
