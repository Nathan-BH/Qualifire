# D1 — ACTIVITIES ride-detail map overlay (Haiku Digest, 2026-10-04)

Status: Haiku Digest, NOT verified by Inspect. For Fable to plan from next week. Sections 1-5 are code facts
reported by the digest agent; the "Root cause" at the end was the agent's INFERENCE and is doubted (see D0 + README).

## Symptom (Nathan, 2026-10-04, bus ride qualifire-20261004-0906)
ROUTES tab -> the way looks correct. ACTIVITIES tab -> ride-detail overlay is wrong: the roundabout looks circled
4-5 times (real: 2 passes, see D5) and sections driven once look drawn twice.

## 1. Screen + layers
ReplayScreen.tsx:232-246 renders `<WayMapView variant="live" rideTrace={rider.fixes} sectorColours={...} />`.
Layers (bottom to top), wayMapView.tsx:
- ride-trace :696-703 — LineString from `trailLineFeature(props.rideTrace)`, blue, width 2, opacity .85
- route :707-716 — reference line, casing grey 7 + core yellow 4, from `wayLineFeature(asset)`
- trail :719-729 — live rider trail (NOT rendered in replay)
- sector-spans :752-767 — coloured sector segments, width 4, `sectorSpansFeatureCollection(asset, sectorColours)`
- place, gates, selfs, rider-dot mounted after.

## 2. Coordinates per layer
- Rider trail = raw GPS fixes `rider.fixes` (replayModel.ts:70-98): `{tUnixMs, lat, lon, sM}`; no snapping; drawn via
  trailLineFeature (trailModel.ts:62-78). Window START-2s..FINISH+2s; preStart/warmup fixes dropped.
- Projection to the reference (derive.ts:155-171 -> projectRideOffline, core/src/projection.ts:79-119): windowed
  search [sp-60 m, sp+240 m] around current chainage; after 5 consecutive off-corridor misses (>20 m) global
  nearest-vertex re-acquire. Affects sM / gates / sectors, NOT the drawn blue trace.

## 3. Sector spans
sectorSpansFeatureCollection (wayMapGeo.ts:501-555): sector i = `path.slice(gateIdx[i-1], gateIdx[i]+1)`, one
LineString per sector. No guard against a path revisiting the same place.

## 4. Gates
crossTime(t,s,g) (timing.ts:16-27): first index with s[i] < g && s[i+1] >= g, forward-only, no lap concept.

## 5. ROUTES vs ACTIVITIES
Both use WayMapView + wayLineFeature(WayAsset.path). ACTIVITIES additionally draws the blue raw-fix rideTrace.
No documented limitation for looped / out-and-back routes in STATE.md, cycles/, guides/, process/.

## Agent's inferred root cause (DOUBTED)
"WayAsset.path revisits the roundabout at two indices so sector spans overlap." Problem: ROUTES draws the same
path and looks right, so this cannot be the difference. The real differences are (a) the raw blue rideTrace,
(b) sector-span colouring, (c) which asset/path ACTIVITIES loads for a ride (not checked!). Open for Plan.

## Questions for the Plan tier
1. Which WayAsset does ReplayScreen load for this ride — the ride's own just-created virgin reference, or a catalog way?
2. Does `rider.fixes` for this ride contain duplicates / out-of-order fixes (compare the saved JSONL with the GPX in D5: GPX has 1233 clean fixes, 2 roundabout passes)?
3. Reproduce: render trailLineFeature(rider.fixes) + sectorSpans for this ride offline and count roundabout circles.

---
# CORRECTION + NEW FINDINGS (coordinator, 2026-10-04 evening; verified by direct grep/sed, still not Inspect-verified)

1. **Wrong screen digested.** The ACTIVITIES ride detail is `ui/RideDetailScreen.tsx` (map at :497, variant="browse"), NOT
   ReplayScreen (that is the separate Replay button). Sections 1-5 above describe ReplayScreen. Do not plan from them.
2. **What RideDetailScreen draws** (:497-512): `<WayMapView variant="browse" wayId=... sectorColours={s.sectorColours ? model.sectorColours : ALL_YELLOW} leadColour=... trail={fixes ?? undefined} />`
   -> base reference line (grey casing + yellow core) + SECTOR SPANS layer + the rider's `trail` (the YELLOW breadcrumb layer, same
   layer as the live trace). There is NO blue rideTrace here (that prop is ReplayScreen-only). Matches Nathan: only yellow lines.
3. **`fixes`** = `readRideFixes(rideId)` (store/routeFromRide.ts:53, chronological) with every fix pushed through `appendTrailPoint`
   (5 m decimation) (RideDetailScreen.tsx:165-178). No preStart/warmup filtering, no accuracy filter.
4. **The GPX+ export of this ride (gpxPlusExport.ts uses chronologicalFixes, writes preStart/warmup as per-point tags) has 1233 clean
   fixes, 0 flagged, 2 roundabout passes (D5).** So the trail layer, built from the same fixes, should show 2 circles, not 4-5.
   => the extra circles/doubling are most likely NOT the trail layer.
5. **ROUTES vs ACTIVITIES difference found:** `sectorColours` is passed to WayMapView only by RecordScreen, DemoScreen, ReplayScreen and
   RideDetailScreen (grep). CatalogDetailScreen (ROUTES) renders the same base line with NO sector spans. So the SECTOR SPANS layer
   (wayMapGeo.ts:501-555: one `path.slice(gateIdx[i-1], gateIdx[i]+1)` LineString per sector) exists on ACTIVITIES and not on ROUTES.
   With sectors uncoloured (ALL_YELLOW / first ride => yellow-tier = same hex as the base core, wayMapView.tsx ~:745-750 comment) the
   spans are yellow too, indistinguishable from the base line.
6. **Leading hypothesis (UNPROVEN):** gate indices (`gateIdx`) on a path that revisits the same roundabout/retraces 100 m are
   non-monotone or land on the wrong pass (gates were derived/adjusted by projection onto a self-overlapping path), so one or more
   sector slices span several loops of the path => repeated roundabout circles and doubled stretches drawn in yellow over the base line.
   Test for Plan/Execute: dump `asset.path.length` and `gateIdx` for this ride's route and check ascending order and slice lengths;
   compare each sector slice's coordinates with the loop.
7. **Cheapest discriminating check for Nathan:** Settings -> turn the sector-colours toggle ON and look at the Activities map: coloured
   sector segments will reveal which stretches each slice covers (a slice covering the roundabout several times will be obvious).
