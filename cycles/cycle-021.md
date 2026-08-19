# Cycle 021 — 2026-08-19

Trigger: Nathan — "the highest value implementation is GPX+, implement it now"
(following up on the two same-day ride reviews: `Nathan's_notes1_review.md`
and `data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-review.md`,
both of which flagged GPX+ as the top pick). Ad hoc — not tied to a cycle-brief
agenda item.

## What shipped

**GPX+ diagnostics export (B-68, IDEAS §23 — gate cleared 2026-08-18 once
landmarks/ways existed).** A new append-only sidecar per ride,
`rides/<id>.events.jsonl` (`eventsJsonl.ts` encode/decode, `core.ts`
`appendEvent`/`exportGpxPlus`), logs button presses (start/end wired; pause/
resume exported as `noteButtonPress()` but not yet called from the UI), route
lock, gate crossings (locked candidate only — traced, no leak from losing
candidates), GPS outages (>5 s gap), stops (1.0 m/s / 3.0 s, reusing
`core/kinematics.ts`), storage errors, and relaunches. The ride JSONL itself
is never rewritten (D-023). `gpxPlusExport.ts` emits GPX 1.1 + a
`<qf:session>` extensions block plus sparse per-fix `<qf:acc>` — GPS accuracy
was already recorded on disk, only export was dropping it. Standard
`exportGpx()` output proven byte-identical (source diff + regression test).
`rebuildIndex()` now skips `*.events.jsonl` so the sidecar can't get misfiled
as a ride.

**Nathan then simplified the UI plan:** rather than a second "Export GPX+
(diagnostics)" button as the proposal spec'd, `RidesScreen.tsx`'s existing
"Export GPX" button now calls `exportGpxPlus()` directly and reads
**"Export GPX+"** — GPX+ is a strict superset (unknown `<extensions>` are
invisible to Strava and to the app's own parser), so one path is enough.
3-line change, done directly by the coordinator (chore exception).

Checks: 145 tests (was 134): 142 pass / 0 fail / 3 skip (same 3 pre-existing
skips), run headless with zero npm/PyPI access in both the cloud sandbox and
independently by the inspector.

## Inspector findings (fresh Fable) — PASS

Independently re-ran the full suite from a fresh reconstruction of the tree;
traced `feed()` for double-emission / losing-candidate leaks (none); confirmed
`appendEvent` never touches the ride file; confirmed optional GPX+ fields are
omitted, not fabricated, when their source event is absent. Two low-severity,
non-blocking observations filed as **B-69**: `escapeXml()` doesn't escape `"`
(unreachable via normal app data today), and a hand-corrupted sidecar line
could throw during export (only reachable via manual file editing, not normal
use).

Process: full D-039 tiers — Haiku triage, Fable brief (read the code, wrote
the self-contained execution brief), Sonnet execute (no escalation needed,
brief pre-resolved all four ambiguity candidates), fresh Fable inspect (PASS).
B-68 → DONE. Nathan commits to GitHub himself next — nothing pushed by the
team this cycle.
