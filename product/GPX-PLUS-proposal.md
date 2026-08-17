# GPX+ diagnostic export — v1 spec PROPOSAL (IDEAS §23) · 2026-08-16 · UNBUILT

Status: Principal-drafted proposal for next cycle (Mobile Dev + Race Engineer review). Nathan's ask: "a 'gpx+' export which contains other information useful for developing the app and troubleshooting."

## Answer to Nathan's question first
The current export (`app/src/storage/gpxExport.ts`) contains ONLY: lat, lon, elevation, timestamp per fix, plus track name and type. Nothing else survives the export today — gate events, route lock, errors all live in memory and die with the session.

## Mechanism
GPX 1.1 has an official `<extensions>` element, legal at both the file level (`<gpx><extensions>`) and per-trackpoint. Strava/viewers ignore unknown extensions — **one file stays both Strava-importable and diagnostic**. Namespace: `xmlns:qf="https://qualifire.local/gpx/1"`.

## v1 fields — file-level `<extensions><qf:session>`
- `qf:appVersion`, `qf:buildId` — which code recorded this
- `qf:startPressedAt` — wall time of the START tap
- `qf:firstFixAt` / `qf:firstFixDelayS` — GPS acquisition time (tap → first fix)
- `qf:routeLock` — `track`, `atChainageM`, `atT` (or `none`)
- `qf:gates` — one `qf:gate` each: `name`, `t`, `estimated` flag, `interpolatedMs`
- `qf:outages` — one `qf:outage` each: `fromT`, `toT`, `maxGapS` (any inter-fix gap > 5 s)
- `qf:storageErrors` — count + last message (from TrackerStatus)
- `qf:relaunches` — count of headless relaunch recoveries mid-ride
- `qf:stops` — one `qf:stop` each: `fromT`, `toT` (engine stop rule 1.0 m/s / 3.0 s) — feeds the §18 red-light discussion with real stop data
- Once §20/§21 land: `qf:startLandmark` (`guessed`, `corrected`, `final`), `qf:endLandmark`, `qf:wayId`, `qf:ghostCount`

## v1 fields — per-trkpt (sparingly; file stays small)
- `qf:acc` — reported GPS accuracy (metres) — currently DISCARDED at recording time (LocationObjectCoords.accuracy is available; storage schema v1 doesn't keep it — see open question 1)

## Rules
1. **Raw stays raw (D-023):** GPX+ is derived at export time from the JSONL + an events sidecar; the ride file format does not change. Events the engine emits during recording are appended to a separate `<rideId>.events.jsonl` — same append-only discipline, replayable.
2. Plain GPX export remains the default share artifact; GPX+ is a second button ("Export GPX+ (diagnostics)").
3. Every field must be honestly sourced: no field is emitted unless the recorder actually observed it (no defaults pretending to be measurements).

## Open questions for the cycle
1. Store per-fix GPS accuracy? Needs a storage schema v2 field (D-023 allows additive columns) — decide before more rides accumulate without it.
2. Do events belong in the ride JSONL itself (one file per ride) or a sidecar? Sidecar keeps the raw file bit-identical to today; inline keeps one artifact. Backend Dev's call.
3. Should the QA harness parse GPX+ as a fixture format? (Gate events in the file = free oracle for replay tests.)
