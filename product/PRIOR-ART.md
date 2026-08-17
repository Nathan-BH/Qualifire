# Prior Art — what is reusable, not a market overview

Written by the Mobile Developer, cycle 003 (2026-08-14), for B-18. Scope: things Qualifire can adopt, borrow or must deliberately avoid. Web-verified 2026-08-14 unless marked `[UNVERIFIED]`.

---

## 1. Strava segments — the mechanic we are refining

**How matching/timing actually behaves (public knowledge):** Strava picks the recorded GPS fixes *closest to* a segment's start/end as the effort's endpoints — no interpolation between fixes ([Strava: Segment Matching Issues](https://support.strava.com/hc/en-us/articles/216918187-Segment-Matching-Issues)). Consequences Strava itself documents: efforts are timed over slightly-wrong distances; low-rate recordings (5–10 s/fix) make short segments mostly noise; drift near an endpoint can silently drop the match entirely; longer segments are more accurate ([Strava: Optimizing Segment Creation](https://support.strava.com/en-us/articles/15401997-optimizing-segment-creation-how-to-create-good-segments)). Users have asked for endpoint interpolation for years ([community idea thread](https://communityhub.strava.com/t5/ideas/improve-the-timing-precision-of-segment-efforts-by-interpolating/idi-p/6612)). **Our D-011 gate-crossing interpolation + hysteresis is precisely the fix for their two worst behaviours** — nearest-fix endpoint snapping and unstable matching near gates. Their segment-creation guidance (avoid endpoints at intersections/stops) independently confirms D-011's "gates downstream of junction exits" rule.

**Live Segments, and what we deliberately do differently:** during a starred segment Strava shows a continuous ahead/behind delta versus your PR/KOM avatar, updating in real time, with red/blue "chase" colouring ([Strava: Live Segments](https://support.strava.com/en-us/articles/15402065-live-segments)). That is exactly the "live countdown/delta ticking against a target" D-006 bans: it narrates the chase *through* the sector, which is the pull-through-the-amber-light failure mode our Designer pre-registered. Qualifire's differentiation is not more data, it's **withholding**: nothing during a sector, one earcon + colour *at completion*, benchmarks frozen at ride start. Strava validates the appetite; we invert the delivery.

## 2. Open-source apps worth reading

None of these are RN/JS — **code cannot be imported into an Expo app; all are study-only** (patterns, not files). A native-module escape hatch could someday reuse Java, but that's Phase-99.

| App | License | Stack | The ONE thing worth borrowing |
|---|---|---|---|
| [OpenTracks](https://github.com/OpenTracksApp/OpenTracks) | Apache 2.0 | Java, Android | The gold-standard **foreground-service recording pipeline**: sensor/GPS lifecycle, "idle detection", export as GPX/KML. Also a trap worth copying the *awareness* of: UI altitude is EGM2008 but GPX export is raw WGS84 ellipsoid height ([README](https://github.com/OpenTracksApp/OpenTracks/blob/main/README.md)) — our Strava GPX elevations need the same scepticism. |
| [FitoTrack](https://codeberg.org/jannis/FitoTrack) | GPLv3 | Java, Android | **Interval voice announcements during a workout** (pace/distance spoken over the FGS while pocketed) — the closest existing implementation to our sector earcons' delivery problem. GPL is irrelevant for study-only. |
| [OpenPace](https://github.com/edance/openpace) | GPL-3.0 | Elixir/Phoenix web | **Strava bulk-export ingestion**: parses the full Strava archive ZIP into trackpoints/laps — same artifact as our `data/` ZIP. Read `lib/` for edge cases in the export format before hardening the Phase-0 parser. |

Considered, rejected as sources: [FitTrackee](https://github.com/SamR1/FitTrackee) (Python web tracker — nothing our stack needs), Strava-adjacent leaderboard tools like [VeloViewer](https://blog.veloviewer.com/alternative-leaderboard/) (closed, but its critique of Strava matching is good background).

## 3. JS/TS libraries for the harness and the app

All of these run identically in Node (Phase-0 harness) and React Native (the app) — pure-JS, no native code. That is the D-012 payoff.

- **GPX parsing: [@tmcw/togeojson](https://www.npmjs.com/package/@tmcw/togeojson)** — GPX→GeoJSON, zero deps, maintained (Placemark lineage). Preferred: GeoJSON in = turf/cheap-ruler compatible out. Alternative with richer GPX-native stats: [@we-gold/gpxjs](https://github.com/We-Gold/gpxjs) (TS, updated Jul 2026). Avoid `gpxparser` (npm) — last published ~5 years ago, dead.
- **Geospatial math: [@turf/turf](https://github.com/turfjs/turf) 7.3.5** (published ~May 2026, active) — `nearestPointOnLine`, `lineSliceAlong`, `length` cover D-011 projection/chainage for offline work.
- **The live-path workhorse: [cheap-ruler](https://github.com/mapbox/cheap-ruler) v4.0.0** (Jun 2026, first-class TS). City-scale flat-earth approximations, <0.1% error under 500 km; `pointOnLine` ~72× faster than turf's ([README](https://github.com/mapbox/cheap-ruler/blob/main/README.md)). At 1 Hz on-phone gate projection this is the right tool; use turf for the long tail, cheap-ruler in the hot loop. One ruler at our commute's latitude (~50.85°) serves the whole route.
- **Map-matching: deliberately none.** Real map-matchers ([Valhalla Meili](https://valhalla.github.io/valhalla/api/map-matching/api-reference/), [OSRM](https://github.com/topics/map-matching?o=desc&s=stars), [GraphHopper](https://github.com/graphhopper/graphhopper)) are C++/Java HMM engines snapping traces to an OSM road graph — servers, not libraries, and they'd violate D-002 (logic must run on raw traces, no routing API). D-011's projection onto *our own* reference polyline replaces map-matching entirely at one-route scale.

## 4. Audio/haptics in Expo (2026 state)

- **Use `expo-audio`, not `expo-av`**: expo-av is deprecated and **removed in SDK 55** ([Expo AV docs](https://docs.expo.dev/versions/v54.0.0/sdk/av/), [expo/expo #37259](https://github.com/expo/expo/issues/37259)); [`expo-audio`](https://docs.expo.dev/versions/latest/sdk/audio/) is the replacement. For earcons: preload short samples, set audio mode with `staysActiveInBackground: true` so cues fire with screen off during the FGS — flag: ducking behind navigation/music (audio focus) `[UNVERIFIED — test on real device in Phase 3]`.
- **[`expo-haptics`](https://docs.expo.dev/versions/latest/sdk/haptics/)**: current, uses Android's Vibrator service, `VIBRATE` permission auto-added. Caveat: patterns are short UI-feedback presets; whether they're feelable through a jacket pocket on cobbles is a real-ride question, not a docs question. Plan: audio primary, haptic reinforcement.

## 5. The steal list

1. **Gate-endpoint interpolation as *the* differentiator** — Strava's documented nearest-fix snapping is our benchmark to beat; keep D-011 exactly as specced. ([Strava matching docs](https://support.strava.com/hc/en-us/articles/216918187-Segment-Matching-Issues))
2. **Anti-Strava-Live delivery** — no in-sector delta ever; completion-only earcon. Adopt as a named design principle in Phase 3. ([Strava Live Segments](https://support.strava.com/en-us/articles/15402065-live-segments))
3. **OpenTracks' recording-service structure** as the reference when debugging our expo-location FGS behaviour (idle/gap handling, battery), and its WGS84-vs-EGM2008 elevation warning for our GPX data. ([OpenTracks](https://github.com/OpenTracksApp/OpenTracks))
4. **cheap-ruler for the hot loop** — adopt in Phase 0 alongside turf; benchmark both in the harness so the app inherits the fast path. ([cheap-ruler](https://github.com/mapbox/cheap-ruler))
5. **@tmcw/togeojson + GeoJSON as the internal interchange format** from the first line of Phase-0 code — everything downstream (turf, cheap-ruler, MapLibre) speaks it natively. ([@tmcw/togeojson](https://www.npmjs.com/package/@tmcw/togeojson))
