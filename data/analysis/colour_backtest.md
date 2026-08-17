# Colour-system backtest (IDEAS §19) — 2026-08-16

58 clean Morning rides (cache/, closest-approach gates ≤30 m, ordered), chronological replay of both systems. Raw sector times (not moving-time — approximation), no noise floor applied, ≥3 rides history required before scoring.

| | neutral/yellow | green | purple |
|---|---|---|---|
| **Sector — current (D-007/D-008: green=7d best, purple=28d best)** | 80% neutral | 13% | 8% |
| **Sector — proposed (§19: last-10 avg; green=above avg, yellow=below, purple=best of 10)** | 43% yellow | 49% | 8% |
| **Lap — current** | 84% neutral | 11% | 5% |
| **Lap — proposed** | 35% yellow | 60% | 5% |

## Readings

1. **Purple is identical (8% / 5%) in both systems** — at Nathan's riding cadence, "best of last 10" ≈ "28-day best". The rare big moment survives the rethink untouched.
2. **The entire difference is what happens to the 80% neutral mass.** Current: most rides pass without verdict; green is rare and earned (13%). Proposed: every ride gets judged — half the sectors green, ~43% *yellow*, i.e. explicitly below average. §19 turns a mostly-quiet app into one that hands out a negative-leaning verdict several times per ride.
3. **By construction ~50% green**: "above average" fires half the time forever — it cannot become rarer as Nathan improves (the average improves with him). Whether frequent mild feedback or rare earned moments is wanted is a taste call, now quantifiable.
4. **Hybrid worth tabling (unratified):** last-10 average as the anchor, but with the measured noise floor (σ_s) as a deadband — within ±1σ of average = neutral, green only above avg+σ, yellow only below avg−σ. Keeps §19's "how am I doing vs my recent self" while restoring a quiet middle; the 43% yellow would shrink to genuinely-slow rides only. Backtestable with one more run once the team picks the band.

## Hybrid backtest (added same day — last-10 avg ± measured σ_s deadband, purple = best of 10)

| | neutral | yellow | green | purple |
|---|---|---|---|---|
| Sector | 58% | 16% | 17% | 8% |
| Lap | 71% | 7% | 16% | 5% |

The deadband does exactly what was hoped: yellow collapses 43%→16% (only genuinely slow sectors), green tightens 49%→17% (clearly-above-average only, still ~2× the current system's 13%), purple untouched, and a quiet middle returns (58%). Reads as: §19's "vs my recent self" anchor with D-008's noise-floor discipline. All three systems now priced on identical data — a pure taste call for Nathan/PO.

## Caveats
Raw (not moving) times; no D-008 noise floor in the current-system sim either (real current system would show slightly less green/purple); simple closest-approach gates, 58/64 rides passed filters. Directionally solid, not decimal-precise.
