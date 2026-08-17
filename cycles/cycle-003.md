# Cycle 003 — 2026-08-14

Trigger: Nathan ("proper cycle, progress on each front"). Members: Race Engineer, Product Owner, Mobile Dev (parallel); Designer added mid-cycle on Nathan's mockup request.

## Agenda

1. B-19 + B-02 — run Phase-0 analysis on real data (RE)
2. CONCEPT.md refresh to D-001…D-015 (PO)
3. B-18 — prior-art survey (MD)
4. (added) HTML mockup of the app (Designer, on Nathan's ask)

## Decisions recorded

- **D-016** — measured numbers adopted: σ/T ≈ 2–3%, gate timing ≤0.5 s (±1–2 s retired), 4 sectors/track, gates proposed; two D-011 amendments (forward-only re-acquisition, START arming); expo-audio not expo-av.

## Member summaries

- **Race Engineer:** first measured numbers — 125 rides replayed; D-011 validated offline (0.5% gate miss, 0 double-fires); noise floor 2–5× better than assumed; e-bike cutoff compression confirmed; gates_proposal.csv delivered. Confidence high on numbers, medium on gate placement.
- **Product Owner:** CONCEPT.md rewritten to current truth; found the **cold-start conflict** (D-008 <5-ride neutrality vs IDEAS "Tuesday lights up"); proposed archive pre-seeding as fix. Escalated, not resolved.
- **Mobile Dev:** PRIOR-ART.md — Strava snaps to nearest fix (our interpolation is their missing fix); Strava Live Segments shows the chase-delta we ban (named differentiator); library slate (togeojson, turf, cheap-ruler); expo-av removed in SDK 55 → expo-audio.
- **Designer:** `product/mockup.html` — first built artefact; five screens, six live states, demo-ride mode, all numbers real from B-19. Invented sector names are placeholders.

## Open after this cycle

- Nathan: D-008 + cold-start ruling, D-009, gate eyeball, mockup reactions, sector names, roster.
- Team: B-20; Phase-1 build plan once Nathan rules; palette CVD acceptance test at build time.

## Records check

STATE.md rewritten. All role logs current. Every claim traces to a file, a decision, or carries UNBUILT. `__pycache__` staged to safe_to_delete/ by RE. File sizes within caps except role logs approaching ~120 (compaction due next cycle).
