# Concept

> **Reading this on the `virgin` branch — note added 2026-09-08 (virgin-cycle5).** This is a dated
> design record from before the branch was cut (2026-08-31). `D-0xx` / `B-xx` ids and role names
> (Product Owner, Designer, Backend Dev, Race Engineer, Principal …) refer to `main`'s
> `product/DECISIONS.md`, `product/BACKLOG.md` and its named-role process — none of which exist on
> this branch. **Since 2026-09-06 (WP-3) the words "route" and "way" mean the opposite of what they
> mean below:** a *route* is now the from→to path between two landmarks (the parent) and a *way* is
> one variant of riding it (the child, which owns the line, gates, results and ghosts) — see
> `GLOSSARY.md`. Morning / Evening A / Evening B, the 624-ride archive and the Leuven landmarks are
> Nathan's own seed data; a fresh install ships none of it (empty-seed default since 2026-09-08).

The structured version of the app idea. Source material is `IDEAS.md` (Nathan's raw words); this file is the team's working interpretation. Where they conflict, `IDEAS.md` is the intent and this file is wrong.

Owner: Product Owner. Last revised: 2026-08-15 (cycle 007 — added the timing tower, IDEAS §15/§17).

## Status on the `virgin` branch (2026-09-08, virgin-cycle5 — supersedes the 2026-08-24 block)

The body below is the original 2026-08-15 design record and is not rewritten. What is true today:

- **The app exists** and has run on Nathan's phone since 2026-08-14 (dev client) and as the
  standalone "Qualifire Preview" APK (build 7, 2026-09-06/07). The body's "no application code
  exists yet" and every "UNBUILT" heading in it are historical.
- **A fresh install is empty.** No sports, landmarks, routes, ways or ghosts ship (empty-seed default
  since 2026-09-08). The body's "three tracks" (Morning / Evening A / Evening B) were Nathan's own
  seed catalog; on this branch that data only appears if a developer opts in with
  `EXPO_PUBLIC_SEED_MODE=shipped`. Everything a rider races against is created by riding: a ride
  between unknown places is recorded as a free ride, and a naming card at STOP turns it into a
  route + way with that ride as the reference (built 2026-08-31).
- **Vocabulary (WP-3, 2026-09-06):** the body's "track" is today's **way** — one variant of riding a
  **route** (the from→to path between two landmarks). Ways own the line, gates, history and colours;
  colours never compare two ways. See `GLOSSARY.md`.
- **Sports (WP-1, 2026-09-06):** every landmark, route, way and ride belongs to one user-named sport;
  sports never cross-compare; none is pre-seeded — RECORD blocks until the rider names one.
- **Colour model:** the last-10-rides rolling window (purple beats the best of the previous 9
  comparable rides on that way, green beats their average, yellow = time posted), not the body's
  7-day/28-day tiers. Scoring compares **raw wall-clock time** by default (luck counts); moving time is
  opt-in (SETTINGS → Timing, built cycle2 WP-C). Nathan's D-045 ruling (2026-08-26) removed the "<5
  clean rides stay neutral" noise floor — **built** (NW-1, 2026-09-08: `MIN_HISTORY = 1`,
  `app/src/ui/colourModel.ts`). A way's reference ride (ride 1, `Way.referenceRideId`) gets no
  colour verdict on the day it's ridden — it never raced anyone yet — but it does earn a rank once
  stored, and like any stored ride it re-enters the judged pool once later rides exist (the window
  excludes the judged ride by id, not by time), so revisiting it later can show a colour. The ride
  right after it can only be purple or yellow (green needs a pool of 2+), and green opens up from
  the ride after that.
- **Reference lap:** not the body's automatic monthly reference. The first ride saved on a new route
  is its way's reference; any later clean lap can be promoted from the RIDE detail screen.
- **Timing tower:** built (2026-08-17). The post-ride surface is now the RIDE detail screen (sector-
  coloured trail + tower) and the RESULTS tab (per-way board → ranked history + last-9-rides plot,
  cycle3 WP-2). The "ideal lap" line the body and LAYOUT §3 describe was never built.
- **Gates:** four sectors, gates at 25/50/75 % of the way's distance, nudged ≥150 m clear of where the
  reference ride stood still (a one-ride proxy for traffic signals, flagged `origin: 'geometric'`);
  adjustable tap-then-nudge on a real map; start/finish at 1 %/99 %. The body's "pending σ_s
  measurement" never happened and the shipped model does not need it.
- **Map:** MapLibre + OpenFreeMap on every screen including the live ride (heading-up, locked, no
  labels while moving) — see `MAP-CONTRACT.md`.
- **Non-goals** below still hold (single user, no accounts, sideloaded APK). "Anything that isn't the
  commute" has widened: the app is for anyone's repeated ride in any sport, not Nathan's commute.

---

## One-line pitch

Turn a repeated bike commute into an F1 qualifying session against yourself.

## The problem it solves

Nathan e-bikes a ~15-minute commute every day (D-014). The route is fixed and the ride is routine. Existing trackers log it and show a total time — a blunt signal that says the ride was slower without saying *where*, and gives nothing to chase on a bad day. Qualifire's job is to make the unremarkable daily ride worth riding, and to still be worth opening in month three.

## The core mechanic — as decided

1. **Ride.** The app auto-detects which track this is (D-015) and logs the GPS trace.
2. **The track is split into sectors.** Detection is live: distance-along-route projection with gate lines, hysteresis, interpolated crossing timestamps (D-011). Gates sit downstream of junction exits, never at stop lines.
3. **Feedback is live, F1-style** (D-006): each sector's time and colour appear *as it completes*, mid-ride — not only in a post-ride report.
4. **Sectors are coloured against past-Nathan over time windows**, since solo riding has no rivals. Full model below (D-007/D-008).

Three tracks, not one route (D-015): **Morning** (home→work), **Evening A** (same corridor reversed), **Evening B** (a different road home, ~2% overlap with A). Each has its own sectors, benchmarks and boards — colours never compare different physical roads (principle from D-010, applied per-track). A ride matching no track goes uncoloured.

*Superseded on `virgin` (2026-09-08 note): the principle — one set of sectors, benchmarks and colours per physical path, never compared across paths — is exactly today's rule, with "track" = way. The three named tracks were Nathan's seed data and do not ship.*

## Colour model — settled

Three tiers on the live surface (D-007):

| Tier | Meaning (D-008) |
|---|---|
| **Purple** | Beats the trailing **28-day** sector best |
| **Green** | Beats the trailing **7-day** sector best |
| **Neutral** | Time posted — styled as F1 yellow, never as failure |

- **Rolling windows, not calendar** (D-008): benchmarks age out one ride at a time; no Monday-morning cliff wiping every green. *Deviation from Nathan's calendar sketch — awaiting his confirmation.*
- **Noise floor** (D-008): a colour fires only when improvement exceeds max(k·σ_s, absolute floor); sectors with <5 clean rides stay neutral. Colouring within GPS noise is colouring coin flips. k and σ_s are unmeasured `[UNVERIFIED — B-19]`.
- **Moving time** colours; raw time is surfaced. Stop-containing sectors are flagged "interrupted" but keep an earned tier; GPS-gap sectors are "estimated" and never coloured or chimed (D-008, D-013).
- **All-time PB is a badge dot**, not a fourth colour; reference comparison is a delta number, not a tier (D-007).
- **Reference lap** (D-009, **PROVISIONAL**): set automatically from the first complete matching ride of each calendar month, per track, silently — no benchmark exam day. Old references archived. Under this model the reference is the delta baseline; Nathan's "purple by definition" reference day does not survive — flagged for his confirmation.
- All benchmarks are **frozen at ride start**, making live colouring an O(1) comparison (D-008, enabling D-006).

Why this shape serves the bad day: neutral reads as "time posted", not failure; there is no red anywhere (D-013); rolling windows mean fatigue or a headwind week lowers the bar it must beat 7 days later, so the app never punishes a cold twice.

## The timing tower — ratified direction 2026-08-15 (BUILT 2026-08-17; heading kept as written)

IDEAS §15: the post-ride result is no longer a delta plot but a **ranked finish among past selves** — the trailing-28-day lap set for this track is a qualifying classification, and today's lap slots into a position at ride end ("P2 of your last 19 commutes"). Proposed semantics (cycle 007, pending Principal/Nathan):

- **Who ranks:** same track only (D-015); complete moving-time laps from the trailing 28 days. Interrupted laps rank (moving time already excludes the stop; flag carried — consistent with D-008's sector treatment). Estimated (GPS-gap) laps never rank; today's own estimated lap appears unranked as "NO TIME", no earcon (D-013).
- **P-language:** P1…Pn, n = laps in the window. **Pole = P1 of the 28-day session** — positional and earned. The Quali Day reference (D-021) is a distinct deliberate benchmark: it carries a REF badge wherever it ranks (a detached line if older than 28 days). "Defending pole" is the state where REF and P1 coincide. The all-time PB stays a badge dot (D-007).
- **Reveal:** the final-gate handover shows the position as a static chip beside the D-022 lap tier — no animation, no new earcon (tier sounds remain the entire audio vocabulary). The shoot-up slot-in ceremony lives on the post-run board, the screen Nathan sees after locking the bike.
- **Board v2 order (§17):** tower headline → four sector rows ("Sector of the day" dropped, Nathan's word) → quarantined ideal-lap line (untiered, D-022); Quali ceremonial frame wraps the board only when armed. The tower **replaces** the delta plot ("instead of plotting the points").
- **Seeding:** archive-seeded laps (D-018/D-024) rank as marked **ghosts**; if the D-024 cruise-σ tripwire fires they demote to unranked.
- **Bad-day guard:** position is a fact, never a verdict — colour comes only from the lap tier, bottom-half positions carry no failure styling, and the window forgets a bad fortnight in 28 days.

## The e-bike reality (D-014)

All 624 archive rides are e-bike. Motor assist and cutoff likely compress ride-to-ride variance, which directly shapes σ_s and how hard a green is to earn — the Race Engineer accounts for this in the measurement work. The dataset (68+63 commute rides across the three tracks) is classified and awaiting analysis.

## Safety — binding constraints (D-006)

Live feedback was adopted *with* constraints, over the Designer's recorded dissent: glanceable in under a second; no interaction while moving; audio/haptic preferred; **no live countdown or delta ticking against a target** — sectors are reported after they complete; the app never narrates the chase. Showing the upcoming sector's benchmark live is likewise refused as chase-narration.

## Genuinely open questions

- **Sector placement.** The approach is decided (D-011); the actual gates are not — pending σ_s measurement on real traces (B-19 → B-02). Also open: what happens to history when a gate moves (B-20).
- **Cold start.** With <5 clean rides per sector, everything stays neutral — but Nathan's own example flow is "ride Monday → ride Tuesday → sectors light up". The day-two experience under D-008 shows only deltas, no colours. Unreconciled; see conflict note in cycle-003 report.
- **Ideal lap.** Does a "theoretical best lap" (best sectors combined) exist F1-style, and over which window? Raised in `IDEAS.md`, no decision yet. Related open detail: how the all-time-PB badge interacts with it.
- **Nathan's confirmations outstanding:** rolling vs calendar windows (D-008) and the automatic monthly reference / loss of "purple by definition" (D-009).
- **Numbers.** k, σ_s, the absolute floor, gate hysteresis distance D, track-detection threshold — all unmeasured `[UNVERIFIED]`.

## Explicit non-goals (for now)

- Multi-user, social features, leaderboards against other people (D-001).
- Publishing to app stores (D-012: sideloaded APK).
- Anything that isn't the commute.

## Technical shape (decided, unbuilt)

React Native + Expo dev-build, TypeScript, MapLibre, Android-only, $0 pipeline (D-012). The map is cosmetic — all logic runs on the raw trace (D-002). Build order: Phase-0 PC validation harness on the GPX archive first; mobile code after the numbers are real. ~~**No application code exists yet; every design above is UNBUILT.**~~ *(False since 2026-08-14 — see the status block at the top. `HOW-THE-APP-IS-BUILT.md` describes what runs.)*
