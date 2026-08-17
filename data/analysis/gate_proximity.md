# Gate proximity analysis (IDEAS §22) — 2026-08-16, 64 cached Morning rides

Question: how close can START/FINISH gates move toward the true start/finish "to get the best feeling of really pushing to the end and starting the hot lap close to the beginning"?

## Measured

| | min | p10 | median | p90 | max |
|---|---|---|---|---|---|
| first recorded fix → START gate | 46 m | 124 m | **146 m** | 153 m | 165 m |
| FINISH gate → last recorded fix | 112 m | 120 m | **182 m** | 197 m | 209 m |

Time to stable GPS: median **0 s** (p90 0 s) — archive fixes are clean from the very first sample; the app ride 20260816-1005 likewise delivered ordered 1 Hz fixes from the doorstep.

## Readings

1. Nathan's start point is extremely consistent (p10–p90 spread only ~30 m — recording starts at the home door). The current START gate (chainage 162 m) wastes ~146 m of ridden road; FINISH (chainage 5487 of 5651) wastes ~182 m at the work end.
2. GPS stability is NOT the binding constraint — fixes are stable immediately. The binding constraints are (a) the engine's 50 m arming window before a gate, and (b) the min-46 m outlier: one ride began recording only 46 m before the current gate; gates too close to the door will be missed on late-start rides (missed START ⇒ estimated per D-016(b), not catastrophic).
3. **Proposal for RE ratification (UNBUILT):** START gate at ~60–75 m chainage (≈75–90 m closer to the door; still ≥ the 50 m arming window even for the p10 ride, only the 46 m outlier would go estimated) and FINISH gate at ~5580–5600 m (≈100–115 m closer to work, keeping ~50 m of post-gate fixes so the crossing interpolation stays clean). Net: ~200 m more timed road, the lap "pushes to the end".
4. Same analysis needed per-track (Evening A/B) and per-way once §20 lands — start-consistency will differ at parkings (see landmark-radius note in landmarks_proposal.md).

Method: cache/*.npz endpoints vs gates_proposal.csv coordinates; planar metres; stability = 5 s of consecutive plausible inter-fix speeds.
