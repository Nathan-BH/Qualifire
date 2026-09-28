# 07 — Replay dot drifts off the yellow line in bends: why, and what (if anything) to change

**Source: Nathan, 2026-09-27.** His words: "On the three rides i have done today, i also
notice that the replay is significantly off the yellow traced route especially in bends and
corners where it is noticeable, investigate what happens since i am using raw gps data it
should be spot on?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-27 by the Plan
tier (Fable) from a Haiku digest plus one anchor check (grep of the working tree, branch
`virgin`; HEAD not recorded — the executor writes it into the readout). Seventh brief of
`virgin-cycle15`; independent of briefs 01-06 (none of them touch `replayModel.ts`,
`selfRaceModel.ts`, `wayAssetRuntime.ts`, `wayMapGeo.ts` or `ReplayScreen.tsx`). This brief
is different in kind from 01-06: **Phase 0 is an investigation that produces numbers, and
the code change (if any) is picked from a menu after Nathan has read those numbers.** The
executor does not choose the option.

## Executor rules (binding)

- **Stop-on-ambiguity.** Anchors marked *(verified)* were grep-confirmed on 2026-09-27;
  anchors marked *(digest)* come from the Haiku digest and were not re-read — treat both
  the same way: if a quoted name/line is not where the brief says, **stop and report the
  mismatch verbatim** (file, line, expected, found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside, never deleted. Never delete anything —
  `safe_to_delete/` is the bin.
- No new dependency, native or JS.
- **Phase 0 lands no behaviour change.** It adds one test file and prints numbers. Only
  after Nathan picks from the menu (§ Decisions) does an executor run the matching
  "Files to touch" block — and only that block.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`,
  `Nathan/`, briefs 01-06, or anything under `cycles/virgin-cycle14/`.
- Do not touch `app/src/live/engine.ts`, `app/src/store/derive.ts`,
  `app/src/store/resultsStore.ts`, `core/` — gate scoring and results are not in question
  here and must not move by a millisecond.

## Goal

Answer Nathan's question honestly, with measurements, and then — if he wants — make the
replay screen show the truth more clearly. The truth is that **the yellow line and the
moving dot are not the same GPS trace drawn twice**, so "it should be spot on" was never
what the code promised. The rest of this brief explains why, gives a way to measure how much
of the gap is which cause, and lays out four fixes with their trade-offs.

## Explanation for Nathan (plain language)

Three separate things are going on, and they add up.

1. **Two different data sources.** The yellow line is the *way's* reference geometry — the
   line the route was created from (a reference ride, or a RefLine). The moving dot is
   *today's ride's* own GPS fixes. They are two different recordings (or a recording and a
   drawn line). Wherever you rode a slightly different line through a bend than the
   reference did — inside vs outside of the corner, which side of the road, a wider arc —
   the dot is *correctly* off the yellow line. That part is not a bug; it is the app
   showing you rode somewhere else. On a bike this is typically 1-5 m in bends.
2. **Straight lines between dots — on both lines.** The phone gives one fix per second. At
   30 km/h that is one fix every 8 m. Between two fixes the app draws the dot along a
   straight line (linear interpolation), so through a curve the dot takes the chord, not
   the arc. How big is that? For a 1-second gap it is the "sagitta" of the chord:

   | speed | gap between fixes | 5 m-radius corner | 10 m radius | 20 m radius |
   |---|---|---|---|---|
   | 20 km/h | 5.6 m | 0.9 m inside | 0.4 m | 0.2 m |
   | 30 km/h | 8.3 m | 2.2 m inside | 0.9 m | 0.4 m |
   | 40 km/h | 11 m | (more than a half-circle in 1 s — not a real corner) | 1.7 m | 0.8 m |

   So pure interpolation error is **under 1 m in almost every bend and ~2 m only in a tight
   corner taken fast**. That alone should not read as "significantly off".
   **But the yellow line has the same problem, possibly worse:** the way's runtime path is
   thinned to a target of ~180 vertices (`RUNTIME_PATH_TARGET_VERTICES = 180`,
   `wayAssetRuntime.ts:24`, by a fixed stride, line 38). If the reference is a recorded ride
   of, say, 20 minutes (1200 fixes), the stride is ~7 → one vertex every 7 s ≈ **40-60 m
   between vertices at riding speed**. A polyline with vertices 50 m apart does not go
   *round* a 10 m-radius bend at all — it cuts straight across it. If that is what is drawn,
   then in bends **the yellow line is the coarse one and the dot is the accurate one**, which
   is exactly what "off the yellow line in bends and corners" would look like. Phase 0 step 1
   checks whether the drawn line is the thinned path or the full reference.
3. **"Raw GPS" is not as raw as it sounds.** The fixes come from the phone's location
   provider, which already runs its own filter; when your heading changes fast the filtered
   position lags a few fixes behind and cuts the inside of the corner. On top of that, a
   phone's horizontal error is 3-5 m in the open, more between buildings. Both lines
   (reference and today's) carry this, independently. Nothing in the app can undo it;
   it can only draw what it has honestly.

So: the dot is not projected onto the route — it never was — and the gap you see is a mix
of (1) a real difference in the line you rode, (2) straight segments on one or both lines,
and (3) GPS noise and lag. Which one dominates is measurable (Phase 0), and only after that
is it worth deciding whether to change anything. One warning up front: the "obvious" fix —
gluing the dot to the yellow line — would make the replay *lie* in the other direction, by
showing you on the route where you actually were not.

## Current state (anchors)

- **Yellow line.** `WayAsset.path` = the way's runtime geometry, thinned to
  `RUNTIME_PATH_TARGET_VERTICES = 180` *(verified, `app/src/ui/wayAssetRuntime.ts:24`)* by
  stride decimation `const stride = Math.max(1, Math.round((n - 1) / RUNTIME_PATH_TARGET_VERTICES));`
  *(verified, line 38)*. Source is the reference ride's geometry or a RefLine
  (`way.referenceRideId` or `'runtime'`, *digest* `wayAssetRuntime.ts:~117`). Rendered as a
  GeoJSON `LineString` by `wayLineFeature` *(digest, `app/src/ui/wayMapGeo.ts:41-49`)*.
- **Moving dot.** `ReplayScreen.tsx:113` *(verified)*
  `() => (ready ? riderPositionAt(rider as ReplayRider, clockS) : null)` →
  `riderPositionAt` *(verified, `app/src/ui/replayModel.ts:101-102`)*, which is one line:
  `return interpAt(r.fixes, r.startMs + clockS * 1000);` — the doc comment at line 100 says so
  verbatim. `interpAt` *(verified, `app/src/ui/selfRaceModel.ts:119`,
  `export function interpAt(`)* interpolates **linearly in lat/lon** between the two fixes
  bracketing the timestamp and returns `{ lat, lon, sM }`. The fixes are the ride's own,
  undecimated *(digest, `replayModel.ts:49`)*, sampled ~1 Hz *(digest,
  `app/src/location/index.ts:356`)*.
- **`interpAt` is shared with the live self-race ghost** *(verified, `selfRaceModel.ts:155,
  159, 162`)*. Any change to its numerics changes the ghost during a live ride too — hence
  the rule below to add a sibling function rather than edit it.
- **Chainage already exists but does not drive the dot.** `deriveGateCrossings`
  *(verified, `app/src/store/derive.ts:155`)* calls `projectRideOffline(x, y, inp.ref)`
  *(verified, line 163)* and returns per-fix `chainageM` *(verified, comment line 147:
  "chainage in metres along `ref` per input fix")*; `replayModel.ts:61` *(verified)*
  destructures `{ startS, finishS, chainageM, gateS }` from it, and `interpAt`'s `sM` is the
  interpolated chainage. So a "position along the route" for the dot is already computed —
  it is used for gates and sector colours, not for where the dot is drawn.
- **Projection caveat (matters for option B).** `resultsStore.ts:321` *(verified)*:
  "`projectRideOffline()` re-acquires GLOBALLY and non-monotonically" — on an out-and-back
  or a loop that touches itself, the projected chainage can jump. `CORRIDOR_M` is imported
  next to it (`resultsStore.ts:48`) — fixes outside the corridor project to nothing.
- **Cross-track distance is already computed for export.** `gpxPlusExport.ts:335`
  *(verified)* `const { xtd } = projectRideOffline(x, y, ref);` — the GPX+ export has, per
  fix, the perpendicular distance from the ride to the reference. Whether it is written to
  the file, and in what field, is *not* verified (Phase 0 step 3 checks).
- **Tests.** `replay_suite.ts` covers timing, gate crossings and sector colours; one test
  (`riderPositionAt interpolates`, *digest*) asserts linear interpolation happens. **No test
  measures positional error of the dot against any geometry.**
- Baseline: STATE.md (2026-09-26) — 676 tests, 673 pass, 0 fail, 3 skip; `tsc --noEmit`
  clean. Briefs 01-06 may have landed since: the executor re-reads `STATE.md` for the
  current numbers before starting.

## Phase 0 — measure first (executor, no behaviour change)

1. **Which line is drawn?** Read `wayMapGeo.ts` `wayLineFeature` and its caller in
   `ReplayScreen.tsx`: is the `LineString` built from the thinned `WayAsset.path`
   (`wayAssetRuntime.ts:38` stride) or from the full-resolution reference? Report: source
   field, and for one of Nathan's real ways (any of the seeded ones — `STATE.md`/the seed
   names it) the vertex count and the resulting mean vertex spacing in metres (route length
   / vertices). If the answer is "thinned path, ~40+ m spacing", say so in bold in the
   readout — that is the headline finding and points at option E.
2. **Synthetic chord-error test**, new file `app/tests/replay_drift_suite.ts`, registered
   in `tests/run.ts` next to `replay_suite.ts`, same `assert`/`test` helpers from `./lib.ts`:
   build a quarter-circle arc of radius r (5, 10, 20 m) at a lat/lon near Leuven, generate
   fixes along it at exactly 1 Hz for v = 20, 30 km/h (position = arc point at t·v),
   then for t at half-second offsets evaluate `interpAt(fixes, startMs + t)` and compute the
   great-circle distance from the true arc point. Assert the max error is `<= sagitta(r, v)
   + 0.05 m` using the formula `r - sqrt(r² - (v·1s/2)²)` — this pins the interpolation
   artifact to the numbers in the table above and stops anyone later blaming the dot for a
   yellow-line problem. Name the tests `replayDrift: …`. No RN import.
3. **Real-ride numbers (optional, needs Nathan's files).** Check what `gpxPlusExport.ts`
   writes near line 335: if `xtd` per fix is in the file, tell Nathan which field, so he can
   export today's three rides and read the cross-track distance through the bends he means.
   If it is not written, report that and stop — do not add it in Phase 0 (option D'
   below covers it).
4. Readout: the Phase 0 table (r × v → measured max error), the answer to step 1 with the
   numbers, the answer to step 3, HEAD hash, test/tsc counts.

## Decisions — a menu for Nathan (nothing here is decided)

The Plan tier's recommendation is at the end of this section. The options are not
exclusive; D combines with any of the others.

**Option E — draw the yellow line at full resolution (or corner-preserving simplification).**
*Only if Phase 0 step 1 shows the drawn line is the ~180-vertex stride-thinned path.*
Replace stride decimation for the *drawn* line with either the untouched reference
geometry or a Douglas-Peucker pass with a ~1 m tolerance (keeps every corner, drops
straight-road points). Trade-off: fixes the likeliest dominant cause at its source; the
map layer draws a few thousand vertices without trouble; but `WayAsset.path` may be used
for more than drawing (the 180 target exists for a reason the digest did not capture —
executor must find every reader of `.path` before changing it and, if any reader is not
the map, add a separate `drawPath` instead of changing `path`). ~30 lines.

**Option A — smoother dot: Catmull-Rom through neighbouring fixes instead of straight lines.**
New `interpAtSmooth(fixes, tMs)` in `selfRaceModel.ts` next to `interpAt` (never edit
`interpAt`: the live ghost uses it), centripetal Catmull-Rom (α = 0.5, no overshoot/cusps
on uneven spacing) through fixes i-1, i, i+1, i+2 for lat/lon only; `sM` stays linear; fall
back to linear at the ends, across any gap > 3 s (GPS dropout), and when two consecutive
fixes coincide (stationary). `riderPositionAt` calls the new function. Trade-off: cheap, no
extra data, always available, removes the ≤1-2 m chord artifact — but it is a *guess* at
the path between real fixes, and it does nothing about causes (1) and (3), which are the
bigger ones if Phase 0 says so. If Phase 0 step 2 measures ≤ 1 m for the realistic cases,
this option buys little that the eye can see. ~60 lines + 3 tests.

**Option D — draw today's ride as its own thin line under the dot.** A second GeoJSON
`LineString` from `r.fixes`, thin (1.5 px), dim (`t.textDim` or white at 50 %), beneath the
dot and above the yellow line. Trade-off: changes nothing about *where* the dot is, but
makes the question "is the dot off the yellow line because I rode elsewhere or because of
interpolation?" answerable at a glance on the phone — the dot always sits on its own trace,
and the trace shows the real line vs the reference. Also the honest way to show cause (1):
you rode there. ~25 lines, no test (rendering).

**Option B — snap the dot to the yellow line using the existing chainage (`sM`).**
`riderPositionAt` maps `sM` to the point at that chainage along the reference polyline
(`pointAtChainage(ref, sM)` — executor checks `core/src` for an existing helper before
writing one) and only falls back to raw lat/lon when `sM` is null (outside `CORRIDOR_M`).
Trade-off: the dot tracks the yellow line perfectly *by construction* — that is the
problem. It hides cause (1) entirely (rode the wrong side of the road? dot says you did
not), inherits the non-monotonic re-acquisition caveat at `resultsStore.ts:321` (dot can
jump at loops / out-and-backs), and snaps-then-unsnaps at the corridor edge. It changes the
meaning of the replay from "where I was" to "how far along the route I was". The Plan tier
recommends **against** this as a default; it is listed because it is the option that would
literally make the dot "spot on" the yellow line, which is what Nathan asked for.

**Option C — no code change; document it.** Phase 0's numbers go into
`guides/`/`OPEN-ITEMS.md` (coordinator's files, dated per Nathan's rule) as "expected
behaviour: replay dot vs reference line differ by GPS noise + real line difference; chord
error ≤ ~1 m". Trade-off: free; Nathan keeps seeing the gap.

**Plan tier's recommendation.** Run Phase 0 first — it is cheap and its step 1 answer
changes everything. Then: **D regardless** (it is the honest overlay and turns every future
"is this real?" into a glance); **E if step 1 says the yellow line is the thinned path**
(that is the corner-cutting Nathan is most likely seeing, and it is the line's fault, not
the dot's); **A only if Nathan still finds the dot visibly polygonal after E + D**; **not
B** unless Nathan explicitly wants the replay to mean "position along the route" rather
than "where I was" — that is his judgment call, flagged as open question 1.

## Files to touch (per option — an executor runs Phase 0 plus only the block(s) Nathan picked)

- **Phase 0:** new `app/tests/replay_drift_suite.ts`; `app/tests/run.ts` (+1 registration
  line). Nothing under `src/`.
- **E:** `app/src/ui/wayAssetRuntime.ts` (decimation → DP or bypass for the drawn line; or a
  new `drawPath` field if `.path` has non-map readers), `app/src/ui/wayMapGeo.ts`
  (`wayLineFeature` reads the new/denser geometry). Tests: one in `replay_drift_suite.ts`
  asserting a synthetic arc reference keeps its corner (max distance from any true arc
  point to the drawn polyline ≤ 1 m) after simplification.
- **A:** `app/src/ui/selfRaceModel.ts` (append `interpAtSmooth`), `app/src/ui/replayModel.ts`
  (`riderPositionAt` line 102 calls it; comment line 100 updated), `replay_drift_suite.ts`
  (+3: arc error shrinks vs linear; gap > 3 s falls back to linear; two coincident fixes do
  not NaN). `interpAt` itself: **unchanged**.
- **D:** `app/src/ui/wayMapGeo.ts` (+ `rideTraceFeature(fixes)` sibling of
  `wayLineFeature`), `app/src/ui/ReplayScreen.tsx` (one more layer under the dot; executor
  locates where `wayLineFeature` is added to the map and adds the sibling directly after
  it). D' (if Phase 0 step 3 found `xtd` is not exported): `gpxPlusExport.ts` writes it
  as an extension field — separate ruling, not part of D.
- **B:** `app/src/ui/replayModel.ts` (`riderPositionAt`), possibly `core/src` for
  `pointAtChainage` — which contradicts the "do not touch `core/`" rule above, so B needs
  its own brief if chosen.
- **C:** none in `app/`.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count goes up by the new tests
cd app && ./node_modules/.bin/tsc --noEmit                  # clean, exit 0
grep -n "interpAt(" app/src/ui/selfRaceModel.ts             # option A: the ORIGINAL interpAt body is byte-identical (diff against HEAD)
git status --short                                          # exactly the files of the chosen block(s), nothing under live/, store/derive.ts, resultsStore.ts, core/
```

Record before/after test counts against the current `STATE.md` baseline. If `tsc` blows the
call budget on this mount, retry once with a longer timeout, then report — do not
substitute a syntax-only check without saying so.

## On-device checklist (Nathan, after OTA — not the executor)

Pick one of today's three rides that has a sharp bend you remember (a 90° street corner is
ideal). Open its replay, zoom the map right into that corner.

1. **Before any fix (now):** note where the dot passes relative to the yellow line at the
   apex, and whether the *yellow line itself* has a visible vertex at the corner or cuts
   straight across it. If it cuts across: that is option E's evidence.
2. **After D:** the thin trace of your ride is visible under the dot; the dot never leaves
   its own trace. Where the trace and the yellow line differ, you now see *both* lines —
   decide whether that difference looks like the line you actually rode.
3. **After E:** the yellow line goes round the corner instead of across it. Straight
   stretches look unchanged. Scrub the replay: no stutter (a few thousand vertices should
   not cost anything; if the map stutters, report the ride length and vertex count).
4. **After A (if picked):** scrub slowly through the corner: the dot follows a curve, not a
   sequence of straight hops; it never swings outside the corner further than the raw trace
   (no overshoot); at a spot where the GPS dropped (tunnel, if any), the dot still moves in
   a straight line between the two fixes around the gap.
5. Both themes: the ride trace (D) is legible on light and dark maps and does not hide the
   yellow line.

## Out of scope

- Gate scoring, sector times, results, the live engine, the live ghost (`interpAt` at
  `selfRaceModel.ts:119` stays byte-identical; the live map's own reference line —
  cycle 025's EveningA fix — is a separate renderer and is not touched).
- Changing the GPS sample rate or the location provider's filtering
  (`app/src/location/index.ts`): the fixes are what Android gives at ~1 Hz.
- Re-recording or editing any reference line. If one route's reference genuinely runs on
  the wrong side of the road, that is a reference-ride problem, not a replay problem.
- Any change to what is stored in a ride file.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — parked. **Phase 0 changes nothing on the phone at all** (tests only). Each
option is JS-only, so whichever lands ships to the Preview APK over EAS Update via
`scripts/publish-preview.cmd` — no new numbered build, no reinstall. Visible only on the
REPLAY screen: D adds a thin line of the ride under the dot; E makes the yellow line round
corners properly; A makes the dot move on a curve instead of straight hops; B would glue the
dot to the yellow line (recommended against); C changes nothing visible.

## Open questions / assumptions (logged, not blocking Phase 0)

1. **What should the replay dot *mean*?** "Where I was" (raw, options A/D/E) or "how far
   along the route I was" (option B)? Everything else in the app — gates, sectors — is
   chainage-based, so B is not absurd; but the map is the one place the rider can see that
   they left the line. Nathan's call.
2. **Is the drawn yellow line the 180-vertex thinned path?** The digest says the yellow line
   is `WayAsset.path` and that `path` is thinned; if both hold, the reference line is
   coarser than the ride in most bends. Phase 0 step 1 settles it; until then the
   explanation above is framed as "possibly".
3. **Why 180 vertices?** Presumably a performance guard from an earlier cycle (the digest did
   not find the rationale). Option E's executor must find every reader of `.path` before
   touching the decimation.
4. **Does the GPX+ export write `xtd` per fix?** Line 335 computes it; whether the writer
   emits it is unverified (Phase 0 step 3).
5. **Reference-line quality on today's three routes** is unknown: if one of them was created
   from a reference ride that itself cut the corner (phone lag, cause 3), no rendering
   change fixes that — only re-recording the reference would, and that is out of scope here.
