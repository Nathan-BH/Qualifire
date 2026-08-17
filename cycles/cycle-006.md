# Cycle 006 — 2026-08-15 (completed next session after a mid-cycle session-limit cutoff)

Trigger: Nathan, on demand, after his on-phone acceptance test produced the first real app export (`qualifire-20260815-0024.gpx` — a 94 s stationary doorstep test, not a commute; Principal + Nathan ran the cycle anyway rather than wait for Monday). Members: Mobile Dev, Race Engineer, QA (after MD). Mobile Dev was cut off by the session limit and relaunched to finish — same pattern as cycle 005.

## Agenda

1. B-24 close-out + live-sector wiring into the recording loop (Mobile Dev)
2. App-GPX comparability + live-detection parameters (Race Engineer)
3. Replay-harness extension (QA)

## Decisions recorded

- **D-024** — app GPX is format-comparable with the archive; D-018 pre-seeding stands; cruise-σ tripwire stays armed until the first commute GPX.
- **D-025** — live layer is display-only/derived — the offline pipeline supplies all shown numbers; route auto-lock at ≥400 m advance + ≥200 m margin; F-2 fixed.

Backlog: B-24 DONE, B-12 DONE, B-16 CODE COMPLETE (headless), B-09 updated.

## Member summaries

- **Race Engineer:** measured the export vs archive (jitter 0.62 m vs 0.46 m, parser-compatible, nothing trips B-21); found F-2 — last 19 trkpts out of chronological order (storage read-back, not recording); confirmed live wiring constants from app/core.
- **Mobile Dev (two instances):** app/src/live engine.ts + refs.ts, ui/chips.tsx + liveView.tsx, RecordScreen live subscription; Preview drives the SAME render path (scripts are data only); F-2 root cause = concurrent appendFix promise race after mid-ride JS relaunch, fixed with per-ride append chain + export stable-sort; typecheck clean; README-dev acceptance step 9 added.
- **QA:** suite 44 → 63 tests (60 pass / 0 fail / 3 benign oracle skips): live_suite.ts (15 — auto-lock verified on all 3 tracks, displayed times == offline parity at 1e-6 s, honesty rules locked), +4 F-2 regression tests (race reproduced, fixed order asserted), real export added as fixture.

## Open after this cycle

- Monday commute: on-device validation (acceptance step 9) + the commute GPX that ratifies D-024's pending tripwire; then benchmark store; then build 3 (batched rebuild).
- QA flag to Mobile Dev (cosmetic): src/live uses Metro-style import specifiers — headless runs need a registerHooks shim until normalized.
- Outside member work: Nathan's two ideas transcribed to IDEAS.md §15 (timing-tower ranked finish vs past selves) and §16 (big 0.1 s ticking live counter + sector blocks — tension with B-15/D-006 no-ticking rule flagged, unreconciled); palette reference saved to product/brand/. Product Owner + Designer wake next cycle.

## Records check

RE, MD, QA role logs all carry a cycle-006 entry; all role files under the ~120-line cap. Cycle file count hit 6 — cycle-001 relocated verbatim to archive/cycles-001.md (compaction due since cycle 005; relocation, not deletion), leaving cycles/ at the cap with 002–006.
