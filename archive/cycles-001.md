# Cycle 001 — 2026-08-14 (archived verbatim by Librarian at cycle 006 — live cap is 5 cycle files)

Trigger: Nathan, on demand. Members run: Race Engineer, Designer, Product Owner (parallel).

## Agenda

1. B-01 — colour model (RE: correctness; Designer: legibility)
2. B-16 (+B-02 constraints) — real-time sector detection (RE)
3. B-03 — reference lap semantics (PO)

## Decisions recorded

- **D-007** — three colour tiers (purple/green/neutral), all-time PB as badge, redundant non-colour cues. RE and Designer converged independently.
- **D-008** — rolling 7/28-day windows + mandatory noise floor + moving-time colouring. Deviates from Nathan's calendar sketch; flagged for his confirmation.
- **D-009** — reference lap automatic, monthly, per direction. PROVISIONAL, awaiting Nathan.
- **D-010** — separate boards per direction.
- **D-011** — sectoring via distance-along-route projection + gate lines + hysteresis. Working direction, UNBUILT.

## Member summaries

- **Race Engineer:** grounded GPS noise numerically (±1–2 s sector precision → sectors ≥ ~60 s); designed noise-floor rule; chose projection scheme over geofences; exported "no gates at junctions" constraint to B-02. Confidence medium — all numbers need real traces.
- **Designer:** proved three tiers lose nothing (purple subsumes green); designed live boundary events (haptic/earcon per tier, fired only on completion), glance screen, post-ride board with "sector of the day". Pre-registered refusal of upcoming-benchmark display. Confidence high.
- **Product Owner:** reference lap automatic (deliberate = scheduled exam, punishes the bad day); monthly cadence; confirmed per-direction boards. Confidence high.

## Open after this cycle

- B-17 (new): Nathan's GPX traces — blocks all quantitative validation.
- B-02: concrete sector placement, now constrained by D-011.
- Escalations to Nathan: confirm D-008 deviation, confirm D-009, provide traces, approve roster.

## Records check

STATE.md rewritten; within caps. Role logs updated by each member, correctly formatted. No ungrounded progress claims — every proposal carries UNBUILT. One ownership note: B-17 added to BACKLOG.md by the Principal transcribing a member request; PO to ratify wording next cycle.
