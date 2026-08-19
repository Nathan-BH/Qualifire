# Cycle 020 — 2026-08-19

Trigger: Nathan — "quick fixes to test on today's commute": race-mode layout,
PAUSE instead of STOP, DEMO tab stuck in night, and route B (home↔work) must
be ridable live with route 5 of `demos/ways/home--work.html` as the reference.

## What shipped

**RECORD race mode** (`RecordScreen.tsx`): no more centred ScrollView while
recording — a full-height column: live map on top (`flex:1`, ≈ half the
screen), lap clock + sector blocks, rotating status, red-light button if set,
then **PAUSE** at the bottom above the tab bar. PAUSE is a safety catch (Nathan
ruled 2026-08-19): recording and clock keep running; it splits into RESUME /
END (END = the old STOP: remembers the ride, stops tracking, saves).

**Live map** (`routeMapView.tsx`): `fill` prop; drag/pinch on in every state
(D-006 relaxed for gestures by Nathan); zoom bar always; a gesture → `free`
camera (no re-centring per fix), `ME` resumes course-up follow; red-light
flips no longer reset the mode. Labels still hide while moving.

**DEMO tab follows the theme** (`App.tsx`: chrome no longer forced to night).

**Route B, both directions.** Coordinator measured: the live EveningB
reference (medoid 20260612-2223) already matches route 5 (20260520-2317)
within 40 m everywhere — only the DRAWN path (routes.json, source 20260809-1900)
skipped Beekstraat in its last ~500 m. So: EveningB live track/gates/fixtures
untouched; routes.json EveningB path = route 5. **MorningB is now a live
track**: `TrackId` + `TRACK_IDS` = 4; reference = route 5 reversed, built by
new `tests/build_track_ref.ts` into `tests/fixtures/refs.json` (5860.8 m);
gates = EveningB's reversed + START ~162 m → [163, 1802, 3027, 4352, 5677]
(cold-start, unratified, B-20 owns moves) in `core/gates.ts` and
`catalog.seed.json`; routes.json MorningB rebuilt (path, gates, transform).
`build_fixtures.ts` / `harness/parity.ts` narrowed to the three parity tracks
and build_fixtures now merges non-parity tracks back instead of dropping them.

Checks: tests 134 (131 pass / 0 fail / 3 skip) in sandbox and on Nathan's PC;
`tsc --noEmit` clean on Nathan's PC (run twice, after inspector fixes). Headless
replay: forward route 5 locks EveningB at fix 78 and finishes; reversed locks
MorningB at fix 80 and finishes, 4 sectors done.

## Inspector findings (fresh Fable) — PASS

Independently recomputed the MorningB ref (0 diff), gate chainages (identical),
routes.json transforms/gateIdx (match to 3 dp), 17 other routes byte-identical.
Risks: `onRegionWillChange` payload shape unverified at runtime (hardened with
optional chaining); race column unscrollable — with red-light button + storage
warning on a short screen PAUSE could tuck under the tab bar (on-device check);
`build_fixtures.ts` would have dropped MorningB on a rerun (fixed, merge).
Cosmetic: status line recentred; stale comments; build_track_ref check entry
not idempotent (left). mockup.html regen deferred → B-66; stale EveningB.png → B-67.

Process: full D-039 tiers (Fable brief, Sonnet execute — no escalation, fresh
Fable inspect, Haiku fix-check of 3 coordinator chores). B-60 → PART-DONE.
