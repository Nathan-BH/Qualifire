# B-19 / B-02 first measurements — Race Engineer, cycle 003 (2026-08-14)

All numbers MEASURED from 125 rides (Morning 64, EveningA 32, EveningB 29) unless labelled.
Scripts: `01_parse.py`, `02_analysis.py`, `03_gates.py`. Raw printouts: `02_output.txt`, `03_output.txt`.
Definitions: stopped = speed < 1.0 m/s sustained > 3 s. σ = 1.4826·MAD across rides. "clean" = no stop and no off-corridor fix inside the sector. Corridor = 40 m cross-track.

## 1. D-011 chainage projection, validated offline
Reference = medoid ride per track: Morning 5651 m, EveningA 5556 m, EveningB 5838 m.
Cross-track of on-route fixes: p50 0.8–1.1 m, p95 4.1 m (A) / 5.3 m (B) / 19.4 m (Morning — parallel-path offsets).
With offline re-acquisition after divergence, 125/125 rides cross >95% of trial gates (100 m spacing).
Bug found: pure windowed search FREEZES after a divergence longer than the window; re-acquisition is mandatory (see §6).

## 2. Total time per track (median / MAD-σ)
| track    | raw          | moving       | stopped med / p90 | rides >10 s stopped |
|----------|--------------|--------------|-------------------|-----|
| Morning  | 15.10 min / 20.8 s | 15.01 min / 20.8 s | 0.0 s / 19.4 s  | 25% |
| EveningA | 15.32 min / 55.6 s | 15.07 min / 30.4 s | 9.0 s / 154.1 s | 47% |
| EveningB | 15.97 min / 57.8 s | 15.60 min / 29.7 s | 8.0 s / 109.0 s | 41% |
Morning is nearly stop-free; evening stops double the raw-time spread → colouring on moving time (D-008) is confirmed necessary.

## 3. Noise floor: σ_s vs sector length (`sigma_vs_length.csv`)
σ_clean (median over ~100 m-stepped positions): 0.39–0.49 s @100 m → 1.10–1.29 s @300 m → 1.62–2.02 s @500 m → 5.2–5.3 s @1500 m.
σ_s grows ~linearly with sector time: σ/T ≈ 2.1–2.6% (Morning), 2.3–3.3% (A), 2.3–3.1% (B), roughly scale-free.
**Minimum sector length where a 3% improvement > 1·σ_s: ~100 m (Morning), ~200 m / ~30 s (both evenings). 5% clears 1σ at every tested length.**
Cycle-001 guess (≥60 s / 300–500 m) was conservative by 2–5×. GPS gate-timing error is bounded by the 100 m σ ⇒ ≤ ~0.5 s, better than the ±1–2 s [now retired] assumption.
Consequence: noise does NOT limit sector count on this commute; glanceability (D-006) and junction placement do. 4 sectors/track chosen (~200 s each; F1-like; sector σ ≈ 4–10 s comfortably above GPS noise).

## 4. Proposed gates (B-02 first pass; `gates_proposal.csv`; all in high-speed stop_frac=0.00 bins per D-011)
Morning:  START 162 m (50.83636,4.64036) · G1 1312 (50.84342,4.65127) · G2 2662 (50.85111,4.66399) · G3 4212 (50.85875,4.67050) · FIN 5487 (50.86360,4.68614)
EveningA: START 162 m (50.86329,4.68479) · G1 1487 (50.85802,4.66880) · G2 2987 (50.85146,4.66265) · G3 4037 (50.84481,4.65294) · FIN 5387 (50.83633,4.64031)
EveningB: START 162 m (50.86211,4.68696) · G1 1487 (50.85318,4.67684) · G2 2812 (50.84241,4.66960) · G3 4037 (50.83719,4.65665) · FIN 5237 (50.83801,4.64333)

Per-sector (median moving s / σ_clean s / interrupted %):
Morning  S1 185.5/6.4/12.7 · S2 203.2/3.8/0.0 · S3 240.7/5.3/1.6 · S4 203.3/7.1/3.1
EveningA S1 210.7/10.0/15.6 · S2 230.4/5.0/3.1 · S3 159.0/4.2/0.0 · S4 222.6/6.2/10.3
EveningB S1 212.0/6.5/34.5 · S2 201.1/5.4/0.0 · S3 184.6/4.7/0.0 · S4 183.8/4.9/3.6
⇒ D-008 green/purple margin at k=1: 4–10 s per sector. Evening S1s carry the traffic lights (interrupted flag will be common there — by design, not a flaw).

## 5. E-bike assist-cutoff check (D-014 note) — VERDICT
Strong compression confirmed: 66.3% of all moving time sits in 22–26 km/h; median 23.5, p90 25.2, only 3.6% above 27 km/h. The 25 km/h assist cutoff acts as a governor: variance collapses just below it, so cruising stretches contribute almost no time spread. This is *why* σ/T is only ~2–3%: the differences between rides live almost entirely in junction exits, climbs-into-cutoff and stops. Implication: sector gains are won at the slow points; the colour model will reward clean junction exits, not top-speed risk — which is the incentive we want. Also means gates in cruise zones see very stable crossing speeds ⇒ precise gate timing.

## 6. Live-detectability sim (D-011: forward-only projection + monotonic gate latch)
625 gate-passages on rides without detours: **3 missed (0.5%); 0 double-fires; 0 raw multi-crossings** (chainage never re-crossed a gate — projection is that stable).
Detour rides missed 48 gate-passages — correct behaviour (off-track ⇒ uncoloured per D-015), not failure.
The 3 clean-ride misses are 2 modes, both fixable:
 (a) mid-ride excursion + rejoin freezes the forward-only window (1 ride, 2 gates) → D-011 needs bounded FORWARD re-acquisition (search [s, s+~400 m] after ~5 s off-corridor; never backward, preserving the latch);
 (b) GPS lock acquired late, first fix already past START (2 cases) → arming rule: if first fix lands < ~50 m past a gate, fire it "estimated"; else mark sector 1 estimated.
