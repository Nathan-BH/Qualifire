# BRIEF — Startup stale-fix cleanup: flag pre-START/warm-up fixes, filter every derived consumer (cycle 025 · WP-stale-first-fix-cleanup · D-039 execution tier)

Written 2026-08-30 by the Fable planning pass, from the code at HEAD (commit f9ba39c; every
anchor below read and verified tonight). You are the Sonnet executor. This brief is your ONLY
input — execute exactly what is written here.

**Stop-on-ambiguity rule:** if any anchor string below does not match the file byte-for-byte,
if a test fails for a reason this brief does not predict, or if you need to make ANY decision
this brief does not already make — STOP, change nothing further, and report the exact
discrepancy verbatim to the coordinator. Never rule on ambiguity yourself.

## THE NON-NEGOTIABLE D-023 GUARD (read first)

Raw ride JSONL (`rides/<rideId>.jsonl`) is truth: append-only, immutable, never rewritten,
never filtered at write time. Nathan ruled (2026-08-26): **record-but-flag, not drop.** Every
GPS fix — stale pre-START ones included — keeps being recorded exactly as now. This pass may
change how raw fixes are written in EXACTLY ONE way: **adding two new OPTIONAL fields
(`preStart`, `warmup`) to the encoded fix line, written only when true.** No existing field is
renamed, removed, reordered, or restructured; an unflagged fix's encoded line stays
byte-identical to today's encoder output (a test below pins this). If, while executing, any
edit in this brief appears to require MORE than that additive field (or touches decode-side
tolerance, the header/end records, the events sidecar encoder beyond nothing, or any rewrite
of existing lines) — that is a STOP-ON-AMBIGUITY trigger. Stop and escalate.

## Environment

- Repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`. Every call is a
  fresh shell (no cwd/env carryover); the mount is slow today — prefix commands with
  `timeout 40` and pass `timeout_ms` around 45000 (the full test run needs more: use
  `timeout 170` / `timeout_ms` 178000; it took ~2 min tonight).
- Typecheck with `cd "$HOME/mnt/Qualifire/app" && ./node_modules/.bin/tsc --noEmit`
  (NOT `npx tsc` — too slow on this mount).
- Do NOT run any git write command — the coordinator commits. Read-only git is fine.
- Do NOT run `data/analysis/08_build_route_assets.py` under any circumstances.
- Never delete a file. Nothing in this task requires deleting.

## Mandate (already ruled — not open for reinterpretation)

Every recorded ride day (4-for-4) shows Android handing back a stale cached GPS fix in the
first seconds after START, plus several coarse warm-up points. These pollute everything
DERIVED: phantom outage-log entries, phantom stop-log entries, fake 52.7–92 km/h speed
spikes, phantom distance, negative `firstFixDelayS` (−9.1 s on 2026-08-25), and route-match
candidate anchoring 9 s before the button. Nathan's ruling (2026-08-26): keep recording, flag
the offending fixes, and make every derived consumer exclude flagged fixes. Four parts:

- **P1 (core):** flag pre-START fixes (timestamp precedes the START press) and, separately,
  poor-accuracy fixes during initial warm-up. Exclude flagged fixes from: outage log, stop
  log, speed/max-speed, route-fidelity, `firstFixDelayS`, and matcher anchoring.
- **P2:** `firstFixDelayS` semantics. **Decision made in this brief:** KEEP the name; it now
  measures the delay to the first NON-flagged fix (>= 0 by construction), and the excluded
  points are counted separately in a new `<qf:excludedFixes preStart=".." warmup=".."/>`
  element. Rationale: the only readers of `firstFixDelayS` at HEAD are
  `app/src/storage/gpxPlusExport.ts` (the writer) and one assertion in
  `app/tests/gpxplus_suite.ts` line 234 — no UI, no other export, no rename ripple. The
  "clamp at 0 + log the stale fix separately" option and the "measure from first real fix"
  option collapse into the same thing once the flag defines "first real fix"; the separate
  log is the excludedFixes counter plus the per-trkpt flags.
- **P3:** the app computes NO max-speed figure anywhere today (verified: no maxSpeed/km/h
  figure in `app/src/ui/`, `app/src/store/`, `App.tsx`, or either exporter). So the first
  max-speed figure Qualifire ever ships is born filtered: a new `<qf:maxSpeedKmh>` session
  element computed over non-flagged fixes with the accuracy + gap-adjacency filter. Do NOT
  touch `app/core/src/live.ts`'s re-acquisition bounding (`vMaxReacq`) or
  `app/src/live/engine.ts`'s `REACQ_JUMP_M` advance-discount (B-90 family) — different
  mechanism (lock-race evidence, not summary stats); the new code cites them in a comment.
- **P4:** CONFIRMED, no code change (see "P4 finding" near the end).

Also ruled out of scope for this pass: switching to drop-at-write (explicitly deferred by
Nathan); closing B-75 (`POOR_ACCURACY_M` calibration — leave it open, do not touch the
constant); changing `deriveMeta`/`RideMeta.startMs` (it uses `fixes[0].tUnixMs`, so a listing
row's start time can be a few seconds stale — accepted, because changing it ripples into the
index format and ride-history suites for a seconds-level cosmetic issue).

Note on the WP's "MATCH_RETRY_ACC_M = 30": that constant DOES NOT EXIST at HEAD. The real
matcher constant is `POOR_ACCURACY_M = 50` in `app/src/live/engine.ts` line 158 (the WP named
seams as unverified proposals; this brief's anchors supersede it). You never edit that
constant.

## Baseline at HEAD (measured tonight)

- `cd app && node --experimental-strip-types tests/run.ts` → **255 tests: 252 pass, 0 fail, 3 skip**.
- Working tree has one untracked data folder (`data/activities/TEST in app rides/qualifire-20260830/`) — ignore it, never touch `data/`.

## How it works today (verified by reading, so you don't have to re-derive it)

- The background task in `app/src/location/index.ts` receives `Location.LocationObject`s,
  builds a `Fix` (`lat`, `lon`, `ele?`, `tUnixMs`, `accuracyM?` — `app/src/storage/types.ts`),
  appends it via `appendFix` (serialized, `app/src/storage/core.ts`), then runs the
  elevation-outlier diagnostic and feeds `liveEngine.feed(lat, lon, tUnixMs, accuracyM)`.
- `encodeFix` (`app/src/storage/jsonl.ts`) writes an explicit-field object literal; the
  tolerant decoder `decodeRideFile` pushes parsed fix records VERBATIM (unknown extra fields
  survive automatically — **no decoder change is needed for the new flags**).
- All fix-derived export stats live in `buildSessionBlock` (`app/src/storage/gpxPlusExport.ts`):
  `firstFixAt`/`firstFixDelayS` (from `fixes[0]` + the sidecar's start button event),
  `findOutages` (gap > `OUTAGE_GAP_S` = 5 s), `findStops` (core kinematics), and the
  `routeFidelity` block. There is no GPS-summed distance figure anywhere
  (`qf:routeDistanceM` is gate-chainage arithmetic, unaffected by fixes) — so "distance"
  in P1 is fully covered by the fidelity/outage/stop/speed filtering below.
- Matcher anchoring: each candidate's first fed fix seeds its chainage via a global
  nearest-vertex search inside `engine.feed` → `feedCandidate` — this is exactly where the
  2026-08-25 ride anchored all 20 candidates on the stale fix.
- The session marker (`app/src/location/session.ts`) carries `startedAtMs` (set immediately
  after `startRide()`, milliseconds after the START press `pressedAtMs` that goes into the
  sidecar's `button:'start'` event). Because `pressedAtMs <= startedAtMs`, a fix flagged by
  `tUnixMs < startedAtMs` can never make `firstFixDelayS` negative, and an unflagged first
  fix has `tUnixMs >= startedAtMs >= startEv.tUnixMs`, so the new `firstFixDelayS >= 0`
  always holds for newly recorded rides.
- The four already-recorded ride files have NO flags. The export therefore ALSO applies an
  export-time timestamp test (`fix.tUnixMs < startEv.tUnixMs` → treated as pre-START) so the
  existing ride days clean up when re-exported. This is derived-side only — the raw files
  are never touched. (The WP: "the pre-START timestamp test alone would have caught the
  primary offender on all four days." Warm-up flags cannot be reconstructed for old files —
  accepted, not attempted.)

## The changes

Eight numbered edits (Edit 3 creates a new source file) + five test changes T1–T5
(T2 creates a new test file). Apply every edit with exact old-string → new-string
replacement. All old strings below were copied from HEAD tonight; if
one does not match, STOP.

---

### Edit 1 — `app/src/storage/types.ts` (the additive flag fields)

OLD:

```ts
/** A GPS fix exactly as handed to appendFix. Stored verbatim, never rewritten. */
export interface Fix {
  lat: number;
  lon: number;
  ele?: number;
  tUnixMs: number;
  accuracyM?: number;
}
```

NEW:

```ts
/** A GPS fix exactly as handed to appendFix. Stored verbatim, never rewritten. */
export interface Fix {
  lat: number;
  lon: number;
  ele?: number;
  tUnixMs: number;
  accuracyM?: number;
  /** Cycle 025 (WP-stale-first-fix P1, Nathan 2026-08-26 record-but-flag):
   * this fix's timestamp precedes the START press — a stale cached Android
   * fix delivered after the button (observed on all four ride days; worst:
   * −9.1 s). The fix is still recorded like any other (D-023 — this field is
   * ADDITIVE only, written only when true; nothing existing is renamed,
   * removed, or restructured); every DERIVED consumer (engine feed, export
   * stats, matcher anchoring) excludes it. */
  preStart?: boolean;
  /** Same pass: poor/unknown-accuracy fix during the initial GPS warm-up
   * window, before the first good fix (location/fixFlags.ts: accuracy >
   * WARMUP_ACC_M, capped at WARMUP_MAX_S so a bad-GPS day never flags a
   * whole ride). Written only when true. */
  warmup?: boolean;
}
```

### Edit 2 — `app/src/storage/jsonl.ts` (encoder: write the flags, only when true)

OLD:

```ts
    ...(fix.ele !== undefined ? { ele: fix.ele } : {}),
    ...(fix.accuracyM !== undefined ? { accuracyM: fix.accuracyM } : {}),
  };
  return JSON.stringify(rec) + '\n';
}
```

NEW:

```ts
    ...(fix.ele !== undefined ? { ele: fix.ele } : {}),
    ...(fix.accuracyM !== undefined ? { accuracyM: fix.accuracyM } : {}),
    // Cycle 025 (WP-stale-first-fix P1): ADDITIVE flag fields only — written
    // when true, omitted otherwise, so an unflagged fix's line stays
    // byte-identical to the pre-flag encoder (D-023; pinned by a test).
    // decodeRideFile needs no change: it pushes parsed fix records verbatim,
    // so the flags round-trip automatically.
    ...(fix.preStart === true ? { preStart: true } : {}),
    ...(fix.warmup === true ? { warmup: true } : {}),
  };
  return JSON.stringify(rec) + '\n';
}
```

### Edit 3 — NEW FILE `app/src/location/fixFlags.ts` (the pure classifier)

Create with exactly this content (pattern-match of `elevationOutlier.ts`: pure, no expo, so
it is headless-testable while `location/index.ts` itself is not):

```ts
/**
 * Stale-first-fix / warm-up classification (cycle 025 WP-stale-first-fix P1).
 * Pure — no expo, no Node imports — so it is headless-testable, unlike
 * location/index.ts itself (same pattern as elevationOutlier.ts).
 *
 * Nathan's ruling (2026-08-26): record-but-flag. Every fix is still appended
 * to the raw ride JSONL exactly as received (D-023 — the flags this module
 * produces are ADDITIVE optional fields, written only when true); DERIVED
 * consumers (live engine feed / matcher anchoring, elevation diagnostics,
 * every GPX+ session stat) exclude flagged fixes.
 *
 * Two independent rules:
 *  - preStart: the fix's timestamp precedes the START press (session marker's
 *    startedAtMs) — a stale cached Android fix. Observed on ALL four ride
 *    days to date (firstFixDelayS −6.30 … −11.05 s); this rule alone catches
 *    the primary offender every time. A stale fix's own claimed accuracy is
 *    untrustworthy, so it can never end the warm-up window either.
 *  - warmup: after START but before the first GOOD fix (accuracy <=
 *    WARMUP_ACC_M), a fix with poor or unknown accuracy is warm-up junk
 *    (2026-08-25: six coarse 23–90 m points frozen at the door for 22 s).
 *    Safety cap: the window closes unconditionally WARMUP_MAX_S after START,
 *    so a bad-GPS day degrades to today's behaviour instead of flagging the
 *    whole ride. The cap also makes a headless mid-ride relaunch (fresh
 *    module state, ride minutes old) a non-issue.
 *
 * Threshold reasoning: WARMUP_ACC_M = 20 sits below every observed warm-up
 * accuracy (23–90 m) and above a normal riding fix (3–15 m on this app's
 * rides). Deliberately NOT engine.ts's POOR_ACCURACY_M = 50 — that constant
 * guards matcher anchoring (B-75 owns its calibration); reusing it here
 * would miss the 23–49 m warm-up points outright.
 */

export const WARMUP_ACC_M = 20;
export const WARMUP_MAX_S = 60;

export interface FixFlags {
  preStart?: true;
  warmup?: true;
}

/** Per-ride warm-up memory; create fresh in startTracking. */
export interface WarmupState {
  goodFixSeen: boolean;
}

export function newWarmupState(): WarmupState {
  return { goodFixSeen: false };
}

/** Classifies one fix. Mutates `state` (marks warm-up over once a good
 * post-START fix is seen). Returns {} for a normal fix — spread the result
 * into the Fix object so unflagged fixes carry no new fields at all. */
export function classifyFix(
  tUnixMs: number,
  accuracyM: number | undefined,
  startedAtMs: number,
  state: WarmupState,
): FixFlags {
  if (tUnixMs < startedAtMs) return { preStart: true };
  const good = accuracyM !== undefined && Number.isFinite(accuracyM) && accuracyM <= WARMUP_ACC_M;
  if (good) state.goodFixSeen = true;
  if (state.goodFixSeen) return {};
  if ((tUnixMs - startedAtMs) / 1000 > WARMUP_MAX_S) return {};
  return { warmup: true };
}
```

### Edit 4 — `app/src/location/index.ts` (classify at capture; keep flagged fixes out of diagnostics + engine)

Five sub-edits, all in this one file. It is expo-bound (never headless-tested); the logic
lives in fixFlags.ts, which IS tested.

**4a.** Import — OLD:

```ts
import { checkElevationOutlier, ELEVATION_OUTLIER_RATE_MPS } from './elevationOutlier';
```

NEW:

```ts
import { checkElevationOutlier, ELEVATION_OUTLIER_RATE_MPS } from './elevationOutlier';
import { classifyFix, newWarmupState } from './fixFlags';
```

**4b.** Module state — OLD:

```ts
let prevEle: number | null = null;
let prevEleTUnixMs: number | null = null;
```

NEW:

```ts
let prevEle: number | null = null;
let prevEleTUnixMs: number | null = null;

// Cycle 025 (WP-stale-first-fix P1): warm-up classifier state — reset in
// startTracking. fixFlags.ts's own WARMUP_MAX_S window keeps a headless
// mid-ride relaunch (fresh module state, ride minutes old) from ever
// re-flagging mid-ride fixes as warm-up.
let warmupState = newWarmupState();
```

**4c.** Task-handler loop: classify, record additively, skip flagged fixes in the elevation
diagnostic. OLD:

```ts
    for (const loc of locations) {
      const ele = loc.coords.altitude ?? undefined;
      try {
        await appendFix(s.rideId, {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          ele, // stored VERBATIM — D-023. Never clamped/smoothed here or anywhere upstream of disk.
          tUnixMs: loc.timestamp,
          accuracyM: loc.coords.accuracy ?? undefined,
        });
```

NEW:

```ts
    for (const loc of locations) {
      const ele = loc.coords.altitude ?? undefined;
      // Cycle 025 (WP-stale-first-fix P1, Nathan 2026-08-26 record-but-flag):
      // classify BEFORE appending so the flag is part of the recorded line.
      // ADDITIVE ONLY — the fix's own fields are stored verbatim as ever
      // (D-023); a flagged fix is recorded like any other and only DERIVED
      // consumers (elevation diagnostics below, engine feed, export stats)
      // exclude it.
      const flags = classifyFix(
        loc.timestamp, loc.coords.accuracy ?? undefined, s.startedAtMs, warmupState,
      );
      const flagged = flags.preStart === true || flags.warmup === true;
      try {
        await appendFix(s.rideId, {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          ele, // stored VERBATIM — D-023. Never clamped/smoothed here or anywhere upstream of disk.
          tUnixMs: loc.timestamp,
          accuracyM: loc.coords.accuracy ?? undefined,
          ...flags,
        });
```

**4d.** Elevation-outlier diagnostic skips flagged fixes (a stale→real ele jump would log a
phantom outlier, and a stale prevEle would poison the first real comparison). OLD:

```ts
      if (ele !== undefined && Number.isFinite(ele)) {
```

NEW:

```ts
      // Cycle 025 (WP-stale-first-fix P1): flagged fixes are excluded from
      // this derived diagnostic too — a stale pre-START ele must neither be
      // compared nor become the comparison base for the first real fix.
      if (!flagged && ele !== undefined && Number.isFinite(ele)) {
```

**4e.** Engine feed carries the flag (engine.ts makes flagged fixes inert — Edit 6). OLD:

```ts
        liveEngine.feed(loc.coords.latitude, loc.coords.longitude, loc.timestamp, loc.coords.accuracy ?? undefined);
```

NEW:

```ts
        liveEngine.feed(loc.coords.latitude, loc.coords.longitude, loc.timestamp, loc.coords.accuracy ?? undefined, flagged);
```

### Edit 5 — `app/src/location/index.ts` startTracking reset

OLD:

```ts
  prevEle = null;
  prevEleTUnixMs = null;
  liveEngine.start({
```

NEW:

```ts
  prevEle = null;
  prevEleTUnixMs = null;
  warmupState = newWarmupState();
  liveEngine.start({
```

### Edit 6 — `app/src/live/engine.ts` (flagged fixes are inert to the matcher)

OLD:

```ts
  /** Feed one raw GPS fix (degrees, epoch ms). `accuracyM` (metres, per the
   * fix's reported horizontal accuracy) is optional — undefined is treated as
   * "unknown", never as poor. Never throws into the caller's recording loop —
   * display state is worth strictly less than the raw ride. */
  feed(lat: number, lon: number, tUnixMs: number, accuracyM?: number): void {
    // Headless relaunch mid-ride: module state is fresh but fixes keep coming.
    // Auto-start; gates already behind resolve via D-016(b) arming/skip, so
    // earlier sectors surface honestly as estimated/missed.
    if (this.phase === 'idle') this.start();
```

NEW:

```ts
  /** Feed one raw GPS fix (degrees, epoch ms). `accuracyM` (metres, per the
   * fix's reported horizontal accuracy) is optional — undefined is treated as
   * "unknown", never as poor. `flagged` (cycle 025 WP-stale-first-fix P1,
   * record-but-flag) marks a pre-START / warm-up fix the recording loop
   * already classified: it contributes NOTHING derived — not buffered, no
   * candidate anchoring (on 2026-08-25 all 20 candidates anchored 9 s before
   * START on a stale cached fix), not even the idle auto-start below. The
   * raw JSONL still records it (location/index.ts appends before feeding).
   * Never throws into the caller's recording loop — display state is worth
   * strictly less than the raw ride. */
  feed(lat: number, lon: number, tUnixMs: number, accuracyM?: number, flagged?: boolean): void {
    if (flagged === true) return;
    // Headless relaunch mid-ride: module state is fresh but fixes keep coming.
    // Auto-start; gates already behind resolve via D-016(b) arming/skip, so
    // earlier sectors surface honestly as estimated/missed.
    if (this.phase === 'idle') this.start();
```

### Edit 7 — `app/src/storage/gpxPlusExport.ts` (six sub-edits: the derived-stat filtering, P2, P3)

**7a.** File-header doc honesty — OLD:

```
 * xmlns:qf attribute on <gpx>, an optional per-trkpt <extensions><qf:acc>
 * (only when accuracyM is present), and a file-level <extensions><qf:session>
 * block between </trk> and </gpx>. Everything else — point order, elevation
```

NEW:

```
 * xmlns:qf attribute on <gpx>, an optional per-trkpt <extensions> block
 * (<qf:acc> when accuracyM is present; <qf:preStart/> / <qf:warmup/> when
 * the fix carries a cycle-025 stale-fix flag), and a file-level
 * <extensions><qf:session> block between </trk> and </gpx>. Everything else
 * — point order, elevation
```

**7b.** New constant, directly after the OUTAGE_GAP_S constant — OLD:

```ts
/** Consecutive fixes further apart than this (seconds) count as a GPS outage. */
export const OUTAGE_GAP_S = 5;
```

NEW:

```ts
/** Consecutive fixes further apart than this (seconds) count as a GPS outage. */
export const OUTAGE_GAP_S = 5;

/** Cycle 025 (WP-stale-first-fix P3): accuracy gate for max-speed samples.
 * The 2026-08-23/24/25 reviews' fake 43–92 km/h "sprints" all came from
 * points that were poor-accuracy and/or immediately after an outage resumed
 * — a max-speed figure Qualifire shows must filter on BOTH qf:acc and
 * gap-adjacency (the 24th's rule, re-endorsed by the 25th). 20 m sits below
 * every observed warm-up/catch-up accuracy worth distrusting here and above
 * a normal riding fix; deliberately NOT engine.ts's POOR_ACCURACY_M = 50
 * (matcher-anchoring calibration, owned by B-75). */
export const MAX_SPEED_ACC_M = 20;
```

**7c.** New helper, inserted immediately BEFORE the buildSessionBlock doc comment. Anchor —
OLD:

```ts
/** Builds the ` <extensions>\n  <qf:session>...\n </extensions>\n` block.
 * Always emitted for a GPX+ document, even when every child is omitted. */
```

NEW (helper + the untouched comment):

```ts
/** Cycle 025 (WP-stale-first-fix P3): max speed, km/h, over already-
 * flag-filtered fixes, with the review-mandated filter: the speed sample
 * (fix i-1 -> fix i) is discarded when either endpoint's accuracy is worse
 * than MAX_SPEED_ACC_M, when the pair itself spans an outage gap, or when it
 * is the first sample after an outage resumes (mid-ride re-acquisition
 * catch-up — the fake 50–83 km/h points of 2026-08-24/25 that P1's
 * pre-START rule alone cannot catch). undefined accuracy = "unknown, never
 * poor" (engine.ts's doctrine). Returns null when no sample survives —
 * honest omission, never a fabricated 0. NOT core/src/live.ts's
 * re-acquisition hop bounding (vMaxReacq) nor engine.ts's REACQ_JUMP_M
 * advance discount (B-90 family): those guard the lock race's evidence;
 * this guards a summary statistic. Cite, don't merge (WP ruling). */
function computeMaxSpeedKmh(fixes: FixRecord[]): number | null {
  if (fixes.length < 2) return null;
  const lats = fixes.map((f) => f.lat);
  const lons = fixes.map((f) => f.lon);
  const tSec = fixes.map((f) => f.tUnixMs / 1000);
  const { x, y } = toXY(lats, lons, lats[0], lons[0]);
  const { v } = computeKinematics(tSec, x, y);
  const accOk = (f: FixRecord): boolean => f.accuracyM === undefined || f.accuracyM <= MAX_SPEED_ACC_M;
  const gapAt = (i: number): boolean => tSec[i] - tSec[i - 1] > OUTAGE_GAP_S;
  let best: number | null = null;
  for (let i = 1; i < fixes.length; i++) {
    if (!accOk(fixes[i]) || !accOk(fixes[i - 1])) continue;
    if (gapAt(i)) continue;
    if (i >= 2 && gapAt(i - 1)) continue;
    if (best === null || v[i] > best) best = v[i];
  }
  return best === null ? null : best * 3.6;
}

/** Builds the ` <extensions>\n  <qf:session>...\n </extensions>\n` block.
 * Always emitted for a GPX+ document, even when every child is omitted. */
```

**7d.** The core filter + P2 semantics, inside buildSessionBlock — OLD:

```ts
  const firstFix = fixes.length > 0 ? fixes[0] : null;
  if (firstFix) lines.push(`   <qf:firstFixAt>${isoTime(firstFix.tUnixMs)}</qf:firstFixAt>`);

  if (startEv && firstFix) {
    const delayS = (firstFix.tUnixMs - startEv.tUnixMs) / 1000;
    lines.push(`   <qf:firstFixDelayS>${num(delayS)}</qf:firstFixDelayS>`);
  }
```

NEW:

```ts
  // Cycle 025 (WP-stale-first-fix P1/P2, Nathan 2026-08-26 record-but-flag):
  // every fix-DERIVED stat in this block (firstFixAt/firstFixDelayS, outages,
  // stops, routeFidelity, maxSpeedKmh) excludes flagged fixes — the recorded
  // preStart/warmup flags, PLUS an export-time pre-START timestamp test
  // against the start press, so the four ride files recorded before the
  // flags existed clean up on re-export too. Derived-side only: buildGpxPlus
  // still renders every fix as a trkpt, and the raw JSONL is never rewritten
  // (D-023). firstFixDelayS semantics (P2, decided this pass): the delay to
  // the first NON-flagged fix — >= 0 by construction, never again "how stale
  // was the cached fix"; the excluded points are counted in qf:excludedFixes
  // (and flagged per-trkpt) rather than silently vanishing.
  const isExcluded = (f: FixRecord): boolean =>
    f.preStart === true || f.warmup === true ||
    (startEv !== undefined && f.tUnixMs < startEv.tUnixMs);
  const cleanFixes = fixes.filter((f) => !isExcluded(f));
  const nPreStart = fixes.filter(
    (f) => f.preStart === true || (startEv !== undefined && f.tUnixMs < startEv.tUnixMs),
  ).length;
  const nWarmup = fixes.length - cleanFixes.length - nPreStart;

  const firstFix = cleanFixes.length > 0 ? cleanFixes[0] : null;
  if (firstFix) lines.push(`   <qf:firstFixAt>${isoTime(firstFix.tUnixMs)}</qf:firstFixAt>`);

  if (startEv && firstFix) {
    const delayS = (firstFix.tUnixMs - startEv.tUnixMs) / 1000;
    lines.push(`   <qf:firstFixDelayS>${num(delayS)}</qf:firstFixDelayS>`);
  }
  if (nPreStart + nWarmup > 0) {
    lines.push(`   <qf:excludedFixes preStart="${nPreStart}" warmup="${nWarmup}"/>`);
  }
```

**7e.** routeFidelity over clean fixes — OLD:

```ts
        const ref = refFor(settledLockEv.track);
        const lats = fixes.map((f) => f.lat);
        const lons = fixes.map((f) => f.lon);
        const { x, y } = toXY(lats, lons, ref.lat0, ref.lon0);
        const { xtd } = projectRideOffline(x, y, ref);
        const nFixes = fixes.length;
```

NEW:

```ts
        const ref = refFor(settledLockEv.track);
        // Cycle 025 (WP-stale-first-fix P1): fidelity is a derived stat too —
        // a stale at-the-door fix must not count as an off-route excursion.
        const lats = cleanFixes.map((f) => f.lat);
        const lons = cleanFixes.map((f) => f.lon);
        const { x, y } = toXY(lats, lons, ref.lat0, ref.lon0);
        const { xtd } = projectRideOffline(x, y, ref);
        const nFixes = cleanFixes.length;
```

and (same block, a few lines down) — OLD:

```ts
          const segs = findOffRouteSegments(fixes, xtd, CORRIDOR_M).slice(0, 20);
```

NEW:

```ts
          const segs = findOffRouteSegments(cleanFixes, xtd, CORRIDOR_M).slice(0, 20);
```

**7f.** Outage log, stop log, and the new max-speed element. Two replacements. First — OLD:

```ts
  const outages = findOutages(fixes);
```

NEW:

```ts
  const outages = findOutages(cleanFixes);
```

Second — OLD:

```ts
  const stops = findStops(fixes);
  if (stops.length > 0) {
    lines.push(`   <qf:stops>`);
    for (const s of stops) {
      lines.push(`    <qf:stop fromT="${isoTime(s.fromMs)}" toT="${isoTime(s.toMs)}"/>`);
    }
    lines.push(`   </qf:stops>`);
  }
```

NEW:

```ts
  const stops = findStops(cleanFixes);
  if (stops.length > 0) {
    lines.push(`   <qf:stops>`);
    for (const s of stops) {
      lines.push(`    <qf:stop fromT="${isoTime(s.fromMs)}" toT="${isoTime(s.toMs)}"/>`);
    }
    lines.push(`   </qf:stops>`);
  }

  // Cycle 025 (WP-stale-first-fix P3): the app's ONE max-speed figure — no
  // UI or export computed one before this pass, so the first ever shipped is
  // born filtered (see computeMaxSpeedKmh). Omitted when nothing survives.
  const maxKmh = computeMaxSpeedKmh(cleanFixes);
  if (maxKmh !== null) {
    lines.push(`   <qf:maxSpeedKmh>${maxKmh.toFixed(1)}</qf:maxSpeedKmh>`);
  }
```

### Edit 8 — `app/src/storage/gpxPlusExport.ts` (per-trkpt flag emission in buildGpxPlus)

OLD:

```ts
    const accLine =
      f.accuracyM !== undefined && Number.isFinite(f.accuracyM)
        ? `    <extensions><qf:acc>${num(f.accuracyM)}</qf:acc></extensions>\n`
        : '';
```

NEW:

```ts
    // Cycle 025 (WP-stale-first-fix P1): flagged points are still exported —
    // record-but-flag — carrying their flag inline so any consumer can apply
    // the same exclusion the qf:session stats do. An unflagged fix's output
    // is byte-identical to before (same single-line <extensions> shape).
    const extXml =
      (f.accuracyM !== undefined && Number.isFinite(f.accuracyM)
        ? `<qf:acc>${num(f.accuracyM)}</qf:acc>`
        : '') +
      (f.preStart === true ? '<qf:preStart/>' : '') +
      (f.warmup === true ? '<qf:warmup/>' : '');
    const accLine = extXml === '' ? '' : `    <extensions>${extXml}</extensions>\n`;
```

---

## New tests (9 total: +1 storage, +3 fixflags, +4 gpxplus, +1 live)

No existing test or assertion changes. All 252 currently-passing tests must still pass —
notably `gpxplus_suite.ts`'s pinned session-block test still holds because its fixture has no
flagged fixes and its start press (t0−3000) precedes every fix, and the byte-identical /
round-trip tests hold because unflagged trkpt output is unchanged and `stripGpxPlus` already
strips every `qf:`/`<extensions>` line (the new elements included). If ANY existing test
fails, STOP and report it — this brief predicts zero existing failures.

### T1 — append at the END of `app/tests/storage_suite.ts`

```ts
// ------------------------------------------- cycle 025: stale-first-fix flags (D-023 additive)

test('storage: cycle025 stale-fix — preStart/warmup flags round-trip the JSONL additively; an unflagged fix line is byte-identical to the pre-flag encoder', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.79, lon: 4.59, accuracyM: 12, preStart: true });
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6, accuracyM: 45, warmup: true });
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6, accuracyM: 8 });
  const text = fs.files.get(`rides/${rideId}.jsonl`)!;
  const lines = text.trim().split('\n');
  assert(lines.length === 4, `${lines.length} lines, want 4 (header + 3 fixes)`);
  assert(lines[1].endsWith(',"preStart":true}'), `preStart flag not encoded (or not last field): ${lines[1]}`);
  assert(lines[2].endsWith(',"warmup":true}'), `warmup flag not encoded (or not last field): ${lines[2]}`);
  assert(lines[3] === `{"kind":"fix","tUnixMs":${clock.t},"lat":50.8,"lon":4.6,"accuracyM":8}`,
    `unflagged fix line changed shape — D-023 additive-only violated: ${lines[3]}`);
  const dec = decodeRideFile(text);
  assert(dec.fixes.length === 3 && dec.nDropped === 0, `decode: ${dec.fixes.length} fixes / ${dec.nDropped} dropped`);
  assert(dec.fixes[0].preStart === true && dec.fixes[1].warmup === true
    && dec.fixes[2].preStart === undefined && dec.fixes[2].warmup === undefined,
    'flags did not round-trip verbatim through the tolerant decoder');
});
```

(`decodeRideFile`, `makeEnv`, `test`, `assert` are already imported/defined in that suite.)

### T2 — NEW FILE `app/tests/fixflags_suite.ts` (3 tests)

```ts
/**
 * Stale-first-fix / warm-up classifier suite (cycle 025 WP-stale-first-fix
 * P1) — pure suite for location/fixFlags.ts, the exact function
 * location/index.ts calls per fix before appending it (same pattern as
 * elevation_suite.ts). The flag is record-side ADDITIVE metadata only
 * (D-023); these tests pin the classification rules themselves.
 */
import { assert, test } from './lib.ts';
import { WARMUP_ACC_M, WARMUP_MAX_S, classifyFix, newWarmupState } from '../src/location/fixFlags.ts';

test('fixFlags: a fix timestamped before the START press is preStart-flagged regardless of accuracy, and never ends warm-up', () => {
  const st = newWarmupState();
  const t0 = 1755167000000;
  const stale = classifyFix(t0 - 9000, 5, t0, st); // the 2026-08-25 shape: stale fix, seconds old, "good" claimed accuracy
  assert(stale.preStart === true && stale.warmup === undefined, `stale fix flags: ${JSON.stringify(stale)}`);
  assert(st.goodFixSeen === false, "a stale fix's (untrustworthy) good accuracy must not end warm-up");
  const next = classifyFix(t0 + 1000, 45, t0, st);
  assert(next.warmup === true, 'coarse post-stale fix not warmup-flagged');
});

test('fixFlags: warm-up — poor/unknown accuracy flagged until the first good fix; later noise is never re-flagged', () => {
  const st = newWarmupState();
  const t0 = 1755167000000;
  assert(classifyFix(t0 + 1000, 45, t0, st).warmup === true, 'acc 45 during warm-up not flagged');
  assert(classifyFix(t0 + 2000, undefined, t0, st).warmup === true, 'unknown accuracy during warm-up not flagged');
  assert(classifyFix(t0 + 3000, 90, t0, st).warmup === true, 'acc 90 during warm-up not flagged');
  const good = classifyFix(t0 + 4000, 8, t0, st);
  assert(good.warmup === undefined && good.preStart === undefined, 'the first good fix itself must not be flagged');
  assert(st.goodFixSeen === true, 'good fix did not end warm-up');
  assert(classifyFix(t0 + 5000, 45, t0, st).warmup === undefined,
    'mid-ride accuracy noise re-flagged after warm-up ended');
});

test('fixFlags: WARMUP_MAX_S safety cap — a bad-GPS day never flags a whole ride, and the threshold catches the observed 23–90 m points', () => {
  const st = newWarmupState();
  const t0 = 1755167000000;
  assert(classifyFix(t0 + WARMUP_MAX_S * 1000, 45, t0, st).warmup === true,
    'poor fix AT the cap boundary should still be flagged');
  assert(classifyFix(t0 + WARMUP_MAX_S * 1000 + 1000, 45, t0, st).warmup === undefined,
    'poor fix past the cap must not be flagged (bounded blast radius)');
  assert(WARMUP_ACC_M < 23, `WARMUP_ACC_M ${WARMUP_ACC_M} would miss the observed 23–90 m warm-up points`);
});
```

### T3 — register the new suite in `app/tests/run.ts` — OLD:

```ts
import './elevation_suite.ts';
```

NEW:

```ts
import './elevation_suite.ts';
import './fixflags_suite.ts';
```

### T4 — append at the END of `app/tests/gpxplus_suite.ts` (4 tests)

```ts
// ---------------------------------------------------------------- (q) cycle 025: stale-first-fix cleanup

test('gpx+: cycle025 stale-fix — flagged pre-START/warm-up fixes are excluded from outages, stops, firstFix* (P2 semantics) and counted in qf:excludedFixes; the trkpts themselves stay exported, flagged inline', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0 - 3000);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [
    // the 2026-08-25 shape: one stale cached fix 9 s before START, then five
    // coarse points frozen at the door, then the real ride
    { tUnixMs: t0 - 9000, lat: 50.79, lon: 4.59, accuracyM: 12, preStart: true },
  ];
  for (let i = 1; i <= 5; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8, lon: 4.6, accuracyM: 45, warmup: true });
  for (let i = 0; i < 8; i++) fixes.push({ tUnixMs: t0 + 6000 + i * 1000, lat: 50.8 + i * 0.0001, lon: 4.6, accuracyM: 8 });
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: t0, button: 'start' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  // record-but-flag: every fix still a trkpt, flags visible per point
  assert((gpx.match(/<trkpt /g) ?? []).length === 14, 'flagged fixes must still be exported as trkpts (D-023 record-but-flag)');
  assert((gpx.match(/<qf:preStart\/>/g) ?? []).length === 1, 'preStart point flag missing/miscounted');
  assert((gpx.match(/<qf:warmup\/>/g) ?? []).length === 5, 'warmup point flags missing/miscounted');
  // P2: firstFix* from the first NON-flagged fix; delay >= 0; exclusions counted, not vanished
  assert(gpx.includes(`<qf:firstFixAt>${isoTime(t0 + 6000)}</qf:firstFixAt>`), 'firstFixAt not the first non-flagged fix');
  assert(gpx.includes('<qf:firstFixDelayS>6</qf:firstFixDelayS>'), 'firstFixDelayS not measured from the first non-flagged fix');
  assert(gpx.includes('<qf:excludedFixes preStart="1" warmup="5"/>'), 'excludedFixes counts wrong/missing');
  // the old pipeline logged a phantom 10 s outage (stale->door) and a phantom stop (frozen door points)
  assert(!gpx.includes('<qf:outages>'), 'phantom outage derived from flagged fixes');
  assert(!gpx.includes('<qf:stops>'), 'phantom stop derived from flagged fixes');
  // P3 rider: max speed comes from the clean moving fixes (~11.1 m/s), not the 130 m/s stale jump
  const m = gpx.match(/<qf:maxSpeedKmh>([\d.]+)<\/qf:maxSpeedKmh>/);
  assert(m !== null, 'maxSpeedKmh missing');
  const kmh = Number(m![1]);
  assert(kmh > 35 && kmh < 45, `maxSpeedKmh ${kmh} — expected ~40 from the clean fixes only`);
});

test('gpx+: cycle025 stale-fix — an UNFLAGGED pre-START fix (ride recorded before the flags existed) is still excluded from derived stats via the start-press timestamp', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0 - 3000);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [{ tUnixMs: t0 - 9000, lat: 50.79, lon: 4.59 }]; // no flag on disk — old ride
  for (let i = 0; i < 8; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8 + i * 0.0001, lon: 4.6 });
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: t0, button: 'start' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:outages>'), 'phantom 9 s outage from the unflagged stale fix (the 4 recorded ride days re-export dirty)');
  assert(gpx.includes(`<qf:firstFixAt>${isoTime(t0)}</qf:firstFixAt>`), 'firstFixAt not the first post-press fix');
  assert(gpx.includes('<qf:firstFixDelayS>0</qf:firstFixDelayS>'), 'firstFixDelayS not clamped to the post-press fix');
  assert(gpx.includes('<qf:excludedFixes preStart="1" warmup="0"/>'), 'export-time pre-START exclusion not counted');
  assert(!gpx.includes('<qf:preStart/>'), 'per-trkpt flag fabricated for a fix that carries none on disk');
});

test('gpx+: cycle025 P3 — maxSpeedKmh filters poor-accuracy and gap-adjacent samples (mid-ride re-acquisition spikes)', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [];
  // clean riding at ~5.6 m/s (~20 km/h)
  for (let i = 0; i <= 4; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8 + i * 0.00005, lon: 4.6, accuracyM: 8 });
  // a ~200 km/h jump carried by a 90 m-accuracy point (the 23rd's 500 m-acc class) -> acc prong
  fixes.push({ tUnixMs: t0 + 5000, lat: 50.8007, lon: 4.6, accuracyM: 90 });
  fixes.push({ tUnixMs: t0 + 6000, lat: 50.80075, lon: 4.6, accuracyM: 8 });
  // a 14 s outage, then a good-accuracy catch-up point at ~120 km/h -> gap-adjacency prong
  fixes.push({ tUnixMs: t0 + 20000, lat: 50.80175, lon: 4.6, accuracyM: 8 });
  fixes.push({ tUnixMs: t0 + 21000, lat: 50.80205, lon: 4.6, accuracyM: 8 });
  fixes.push({ tUnixMs: t0 + 22000, lat: 50.8021, lon: 4.6, accuracyM: 8 });
  fixes.push({ tUnixMs: t0 + 23000, lat: 50.80215, lon: 4.6, accuracyM: 8 });
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('<qf:outages>'), 'the real 14 s outage must STILL be logged — the filter is for max-speed only');
  const m = gpx.match(/<qf:maxSpeedKmh>([\d.]+)<\/qf:maxSpeedKmh>/);
  assert(m !== null, 'maxSpeedKmh missing');
  const kmh = Number(m![1]);
  assert(kmh > 15 && kmh < 25,
    `maxSpeedKmh ${kmh} — a poor-acc (~200 km/h) or gap-adjacent (~120 km/h) sample leaked through the filter`);
});

test('gpx+: cycle025 P3 — maxSpeedKmh is omitted (never a fabricated 0) when no sample survives the filter', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6, accuracyM: 90 });
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8001, lon: 4.6, accuracyM: 90 });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:maxSpeedKmh>'), 'maxSpeedKmh emitted although every sample endpoint is poor-accuracy');
});
```

(`Fix`, `isoTime`, `makeEnv`, `test`, `assert` are already imported/defined in that suite.)

### T5 — append at the END of `app/tests/live_suite.ts`

```ts
// --------------------------------------------------------------------------
// cycle 025 (WP-stale-first-fix P1): flagged fixes are inert to the matcher
// --------------------------------------------------------------------------

test('live: cycle025 stale-fix — a flagged fix is inert (not buffered, no auto-start, no anchoring); the matcher anchors on the first REAL fix', () => {
  const ref = refFor('Morning');
  const engine = new LiveEngine(fixtureSpecs());
  const diag: DiagnosticEvent[] = [];
  engine.subscribeDiagnostics((e) => diag.push(e));
  const t0Ms = 1755167000000;
  // the 2026-08-25 shape: a stale cached fix 9 s before the first real one,
  // geometrically far down the track, with GOOD claimed accuracy (so the
  // POOR_ACCURACY_M retry would never rescue a wrong anchor seeded from it)
  const [staleLat, staleLon] = morningLatLonAt(ref, 4000);
  engine.feed(staleLat, staleLon, t0Ms - 9000, 12, true);
  assert(engine.getState().fixesFed === 0, 'flagged fix entered the engine buffer');
  assert(diag.length === 0, `flagged fix produced ${diag.length} diagnostics`);
  // the real ride: chainage 0 -> 800 m, good accuracy
  let tMs = t0Ms;
  for (let i = 0; i <= 40; i++) {
    const [lat, lon] = morningLatLonAt(ref, i * 20);
    engine.feed(lat, lon, tMs, 15);
    tMs += 1000;
  }
  const anchors = diag.filter((d) => d.track === 'Morning' && d.phase === 'anchor');
  assert(anchors.length === 1, `${anchors.length} Morning anchor diagnostics, want 1`);
  assert(anchors[0].atT === t0Ms / 1000,
    `Morning anchored at ${anchors[0].atT}, want ${t0Ms / 1000} — anchored on the flagged pre-START fix?`);
  const final = engine.getState();
  assert(final.track === 'Morning' && final.phase !== 'detecting',
    `lock never reached from the real fixes: phase=${final.phase} track=${final.track}`);
});
```

(`refFor`, `fixtureSpecs`, `DiagnosticEvent`, `LiveEngine`, and the file-scope helper
`morningLatLonAt` all already exist in that suite; function declarations hoist, so appending
at the end is fine.)

---

## P4 finding (no code change — record this in your report verbatim)

`elevationOutliers` omitted-when-empty is **intentional existing behaviour, not a dropped
feature**: in `app/src/storage/gpxPlusExport.ts`, the block is emitted under an explicit
`if (elevationEvs.length > 0) {` guard (the `qf:elevationOutliers` section, directly under
the comment "Cycle 023 fix 3/5b: flagged elevation outliers"), matching the file's
stated honest-omission doctrine ("Only what was actually observed is ever emitted"). It is
already PINNED by an existing test: `app/tests/gpxplus_suite.ts` line 365, "a ride with NO
routeMatchDiagnostic/elevationOutlier events omits both blocks". No fix, no new test needed
— the confirmation is this paragraph.

## Mockup-mirror check (process/CONVENTIONS.md) — N/A

`demos/mockup.html` and `design/canonical/*.svg` show neither `firstFixDelayS`, nor any max
speed / km/h figure, nor anything else this pass touches (verified by grep tonight:
zero matches for firstFixDelay/maxSpeed/km/h in `demos/mockup.html`). Everything here is
recording internals and GPX+ export content — nothing user-visible in the mockup or design
mirrors. Do not touch them.

## Must-not-change list (byte-identical at the end of your pass)

`app/core/**` (especially `core/src/live.ts` — B-90's re-acquisition bounding — and
`core/src/kinematics.ts`) · `app/src/live/engine.ts` beyond Edit 6's single feed() change
(in particular `POOR_ACCURACY_M`, `REACQ_JUMP_M`, `ANCHOR_M`, and all lock/retry logic) ·
`app/src/storage/core.ts` · `app/src/storage/eventsJsonl.ts` · `app/src/storage/gpxExport.ts`
(the standard export NEVER shows flags) · `app/src/storage/rideIndex.ts` · `deriveMeta` in
`app/src/storage/jsonl.ts` (only `encodeFix` changes there) · `app/src/location/session.ts` ·
`app/src/location/elevationOutlier.ts` · `app/src/ui/**` · `app/src/store/**` · `App.tsx` ·
`app/tests/fixtures/**` · every existing test assertion · `data/**` · `demos/**` ·
`design/**` · `STATE.md` · `IDEAS.md` · `product/**`.

## Verification (run all; all must hold)

1. `cd "$HOME/mnt/Qualifire/app" && timeout 170 node --experimental-strip-types tests/run.ts 2>&1 | tail -3`
   (pass `timeout_ms` ≈ 178000; ~2 min on today's slow mount) →
   final line exactly: **`264 tests: 261 pass, 0 fail, 3 skip`**
   (baseline 255/252/0/3; +9 new: 1 storage + 3 fixflags + 4 gpxplus + 1 live; the 3 skips
   are pre-existing and unrelated).
2. `cd "$HOME/mnt/Qualifire/app" && timeout 40 ./node_modules/.bin/tsc --noEmit` → clean, exit 0
   (use `timeout_ms` ≈ 45000; if it exceeds the timeout, rerun once before concluding anything).
3. `cd "$HOME/mnt/Qualifire/app" && grep -c "preStart\|warmup" src/storage/jsonl.ts` → `2`
   (exactly the two spread lines in encodeFix — the added comment lines do not contain
   either word, and NOTHING else in that file mentions the flags; decode side untouched.
   Baseline before your edit: 0).
4. `cd "$HOME/mnt/Qualifire/app" && grep -n "flagged === true" src/live/engine.ts` → exactly
   one match (the feed() early return).
5. D-023 audit: `cd "$HOME/mnt/Qualifire/app" && grep -c "appendText\|writeText" src/storage/core.ts`
   → `10`, exactly as at HEAD tonight (the file is on the must-not-change list; this is a
   tripwire proving no write path moved, not a target).

If verification item 1 reports any FAIL, or a different total, STOP: do not adjust
thresholds, expected values, or existing tests to make it pass — report the full failing
output.

## Report back to the coordinator

- Confirm Edits 1–8 and test changes T1–T5 all landed (or exactly which anchor failed,
  verbatim).
- The final test-run tail line and tsc result.
- The P4 finding paragraph (copy it as written).
- Explicit confirmation that no raw-JSONL write path changed beyond encodeFix's two additive
  spread lines (the D-023 guard), and that `data/**` and the four recorded ride files were
  never touched.
- Anything you noticed but did not change (per stop-on-ambiguity, you changed nothing this
  brief did not spell out).
