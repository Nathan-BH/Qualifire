# storage/ — ride persistence (schema v1)

**Layout** (under `<documentDirectory>/qualifire/`): `rides/<rideId>.jsonl` + `index.json`.
`rideId` = `YYYYMMDD-HHMMSS-xxxx` (local time + random suffix). One JSON object per line:
`{"kind":"header","schemaVersion":1,"rideId",...,"startedAtMs","recorder"}`, then one
`{"kind":"fix","tUnixMs","lat","lon","ele"?,"accuracyM"?}` per GPS fix (values verbatim as
received — the raw trace is sacred, never rewritten), then `{"kind":"end","endedAtMs","nFixes"}`.

**Crash safety.** Fixes are append-only and flushed per line (synchronous native write behind the
promise). A killed app tears at most the final line; `decodeRideFile` drops unparseable lines, so
at most one fix is lost. A missing `end` record marks a crashed ride; `listRides` still reports it
with meta derived from the fixes on disk. Before resuming appends (fix or end) onto a torn file,
storage heals the missing trailing `\n` so the new record starts its own line — the torn fragment
is isolated, never rewritten. `index.json` is a pure cache — if corrupt or missing it
is rebuilt by scanning `rides/`, so the JSONL files are the only source of truth.

**GPX export** emits GPX 1.1 shaped exactly for `app/core`'s parser (trkpt with `lat` then `lon`
attributes, `<ele>` before `<time>`, no exponent numbers). Derived view only: missing `ele` carries
the last known value; `accuracyM` stays JSONL-only. Round-trip verified against `core/src/gpx.ts`.

**Testing seam.** `core.ts`, `jsonl.ts`, `gpxExport.ts`, `rideIndex.ts`, `fsAdapter.ts` (incl. an
in-memory adapter) import no expo — run headless via `node --experimental-strip-types`. Only
`expoFsAdapter.ts` (and thus `index.ts`) touches expo-file-system (SDK 56 `File`/`Directory` API).

**Standing questions, as they shape v2:**
1. *Same-sector identity across rides:* never GPS points — a sector is `(trackId, gate pair)` at
   fixed chainage on the reference polyline (core's `Gate`). Ride files stay track-agnostic; track
   match and sector times are derived and recomputable, so gate moves (B-20) are pure backfill.
2. *Benchmarks:* v1 stores none — they are recomputed from raw JSONL (strongest "reference, not
   computed time"). v2 may cache `{rideId, sector, window}` pointers, never bare seconds.
3. *Per-direction routes:* directions/tracks (D-010/D-015) are three route configs over the same
   raw rides; direction is derived metadata, never written into the trace.
