# @qualifire/core — the timing engine

Platform-free TypeScript (zero runtime dependencies, no Node/DOM/RN APIs in
`src/`). This is the BUILD-PIPELINE Phase-0 module: it was validated on the PC
against the 125 archived commute rides (**see PARITY.md — that file is the
proof this module works**) and is imported unchanged by the Expo app.

## Modules

| file | what |
|---|---|
| `src/types.ts` | shared types (RidePoints, RefLine, Gate, SectorResult, GateEvent) |
| `src/geo.ts` | equirectangular track frame + numpy-compatible primitives (searchsorted, interp, resample) |
| `src/gpx.ts` | GPX parsing, mirrors `data/analysis/01_parse.py` point-acceptance exactly |
| `src/reference.ts` | medoid ride selection + smoothed 5 m reference polyline with chainage |
| `src/projection.ts` | D-011 offline chainage projection (windowed, corridor 40 m, global re-acq) |
| `src/kinematics.ts` | speed + sustained-stop detection (<1 m/s for >3 s), moving time |
| `src/timing.ts` | interpolated gate crossings + sector times with clean/interrupted/excluded flags |
| `src/gates.ts` | the approved D-016 gate set (verbatim from `data/analysis/gates_proposal.csv`) |
| `src/live.ts` | **the 1 Hz live loop**: forward-only LiveProjector + GateDetector latch, D-016 amendments (time-aware forward re-acquisition, START arming), estimated-fire marking |
| `harness/parity.ts` | replays the 125 rides, compares vs Python, runs the live sim |
| `harness/dump_py_sector_times.py` | dumps the Python reference numbers for the comparison |

## Use

Offline (post-ride, Phase 2): `projectRideOffline` -> `computeKinematics` ->
`sectorTimes`. Live (Phase 3): one `LiveProjector` + one `GateDetector` per
track candidate; feed each 1 Hz fix `proj.update(x, y, t)` then
`det.update(t, fix.s)`; returned `GateEvent`s carry interpolated crossing
times and the `estimated` flag (D-013: estimated => no colour, no earcon).

Run the parity proof: commands in PARITY.md. Node >= 22.6 runs the TS
directly (`node --experimental-strip-types`; on Node >= 22.18 the flag is
default-on). `npm install` is only needed for the dev-time typechecker
(`npm run typecheck`) — never at runtime.

## Known live-vs-offline semantic gap (deliberate, documented)

Stop detection marks a slow run "stopped" only once it exceeds 3 s — offline
knows the future, live learns it ~3 s late. A stop straddling a gate crossing
can therefore differ slightly live vs post-ride. Gates sit in measured
zero-stop zones (D-016), so this is theoretical; Phase 2 recomputes every ride
offline as the system of record, live numbers are provisional by design.
