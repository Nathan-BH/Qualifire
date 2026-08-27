# BRIEF — MapLibre "`id` cannot be changed" crash on free-mode (new-landmark) rides

Execution brief for the Sonnet executor. Self-contained: everything you need is in this
document. Written 2026-08-27 by the Fable planner after reading every cited file at HEAD.

> **If any ambiguity or surprise arises, STOP and report back — never guess.**

## 0. Environment

- The repo is mounted at `$HOME/mnt/Qualifire` and is reached ONLY through the
  `mcp__remote-devices__device_bash` tool. Every call is a fresh shell (no cwd/env
  carryover) with a ~45 s timeout: always prefix commands with
  `cd "$HOME/mnt/Qualifire" && ...` and split long work into multiple calls.
  If a command might exceed the timeout, redirect output to a file under
  `cycles/cycle-025-briefs/` and read it in a follow-up call.
- Do NOT run any `git` command. Commits are the coordinator's job.
- Never delete anything; this task requires no deletions anyway.
- Touch ONLY the two files named in sections 2 and 3. Explicitly off-limits:
  `app/src/storage/gpxPlusExport.ts`, `app/src/live/engine.ts`,
  `app/src/location/index.ts`, `app/src/ui/RecordScreen.tsx`, `demos/mockup.html`.

## 1. The bug (diagnosis, already verified at HEAD — context, not a task)

`@maplibre/maplibre-react-native` freezes each map child's `id` prop on first render
(`useFrozenId`) and throws `` `id` cannot be changed `` if a later render passes a
different `id` to the same mounted component instance. This is fatal to the whole map
component tree (React Native Render Error).

In `app/src/ui/routeMapView.tsx`, inside `MapLibreRouteMap`'s returned JSX
(lines ~429–468 at HEAD), one child slot of `<M.Map>` is a ternary:

```
{gatesOnly ? (
  <M.GeoJSONSource id="gates" data={gatesFC!}> ... </M.GeoJSONSource>
) : (
  <M.GeoJSONSource id="gate-ticks" data={gateTicksFC!}> ... </M.GeoJSONSource>
)}
```

Both branches are the SAME component type at the SAME position with NO `key`, so when
`gatesOnly` flips between renders React updates the mounted `M.GeoJSONSource` in place
with the other branch's props — the `id` prop changes (`"gates"` ↔ `"gate-ticks"`) and
maplibre throws.

`gatesOnly` really does flip while the map is mounted. `RecordScreen.tsx` line 653
passes `gatesOnly={live.mode === 'free'}`, and free mode is exactly the
new-landmark ride path (RecordScreen line ~491: a `NEW_ID` landmark endpoint produces a
free ride). The proven flip window is ride END: `onEnd` (RecordScreen ~line 338) runs
`await stopTracking()` → `liveEngine.stop()` (engine.ts line ~405) resets
`this.mode = 'route'` and emits → `setLive` re-renders while `phase` is still
`'running'` (setSession(null)/setPhase('ending') happen only after the await), so the
still-mounted map re-renders with `gatesOnly` true→false → crash. A symmetric window
can exist at ride start / headless-relaunch recovery. The fix below covers both
directions.

This matches the field evidence: both crash rides were rides to a freshly created
landmark (= free rides), exported with `routeLock="none"` plus real gate fires — which
is NORMAL free-mode output, and the crash fired at ride end, after the data was safely
on disk.

## 2. Change 1 — `app/src/ui/routeMapView.tsx`: key every `M.GeoJSONSource` to its id

Give every `<M.GeoJSONSource>` a React `key` equal to its `id`, so React can never
rebind a mounted native source to a different id — a branch flip unmounts one source
subtree and mounts the other (its `M.Layer` children go with it). This deliberately
does NOT extend the existing `key={styleUrl}` on `<M.Map>` (line 393): a whole-map
remount would discard camera state (the known B-71 cost); per-source keys keep the
map and camera alive.

Four one-line edits (line numbers at HEAD; match on content, not line number):

- Line 420: `<M.GeoJSONSource id="route" data={routeFC}>`
  → `<M.GeoJSONSource key="route" id="route" data={routeFC}>`
- Line 430: `<M.GeoJSONSource id="gates" data={gatesFC!}>`
  → `<M.GeoJSONSource key="gates" id="gates" data={gatesFC!}>`
- Line 458: `<M.GeoJSONSource id="gate-ticks" data={gateTicksFC!}>`
  → `<M.GeoJSONSource key="gate-ticks" id="gate-ticks" data={gateTicksFC!}>`
- Line 470: `<M.GeoJSONSource id="rider" data={riderFeature(props.lat as number, props.lon as number)}>`
  → `<M.GeoJSONSource key="rider" id="rider" data={riderFeature(props.lat as number, props.lon as number)}>`

(The `route` and `rider` sources only ever alternate with `null` today, so they are
keyed for the invariant's sake — the load-bearing keys are `gates`/`gate-ticks`.)

Also insert this comment block immediately ABOVE the `{gatesOnly ? (` line
(currently line 429), at the same indentation as the existing
`{/* Reverted 2026-08-24: ... */}` comment above the route source:

```
{/* Cycle 025: every source carries key === id. MapLibre freezes a child's
    `id` on first render (useFrozenId) and throws "`id` cannot be changed"
    if the same mounted element later gets a different id. The ternary
    below swaps id="gates" <-> id="gate-ticks" at ONE React position when
    RecordScreen's gatesOnly (live.mode === 'free') flips while the map is
    mounted — proven at free-ride END (engine.stop() resets mode to 'route'
    and emits before RecordScreen leaves phase 'running'), killing the whole
    map tree on new-landmark rides. Distinct keys make React unmount/remount
    the source (and its layers) instead of rebinding the id. Sources only:
    <M.Map>'s own key={styleUrl} (cycle 023) is left alone — a whole-map
    remount here would pay B-71's camera-state cost for nothing. */}
```

Edit mechanics: use `python3` (or `sed`) via device_bash to do exact-string
replacements — never retype the file. Example pattern:

```
cd "$HOME/mnt/Qualifire" && python3 - <<'PY'
import io
p = 'app/src/ui/routeMapView.tsx'
s = open(p, encoding='utf8').read()
old = '<M.GeoJSONSource id="gates" data={gatesFC!}>'
assert s.count(old) == 1, old
s = s.replace(old, '<M.GeoJSONSource key="gates" id="gates" data={gatesFC!}>')
open(p, 'w', encoding='utf8', newline='').write(s)
PY
```

(Repeat per edit, always asserting `count == 1` first. If any assert fails, STOP and
report — the file differs from what this brief expects.)

## 3. Change 2 — regression test in `app/tests/routemap_suite.ts`

The MapLibre rung cannot be mounted headlessly (no RN test harness in this repo). The
suite already has the established answer for exactly this class of fix: the static
source guard at the END of `app/tests/routemap_suite.ts` (test
`'routemap: MapLibre <M.Map> remounts on a style-URL change (cycle 023 fix 1 day-mode race)'`,
with a comment block explaining the static-guard doctrine). Append the following new
test at the very end of that file, below the existing cycle-023 guard:

```ts
test('routemap: every MapLibre GeoJSONSource carries key === id (frozen-id crash guard, cycle 025)', () => {
  // Same static-guard doctrine as the cycle 023 test above (the component
  // cannot be rendered headlessly). MapLibre freezes a child's `id` prop on
  // first render (useFrozenId) and throws "`id` cannot be changed" if a
  // later render hands the same mounted element a different id — which is
  // exactly what the gatesOnly ternary did when a free (new-landmark) ride
  // ended: id="gates" reconciled in place into id="gate-ticks" and the whole
  // map tree crashed. key === id on EVERY source makes React unmount/remount
  // across any such swap instead of rebinding the id.
  const src = fs.readFileSync(
    path.join(TESTS_DIR, '..', 'src', 'ui', 'routeMapView.tsx'), 'utf8');
  const tags = src.match(/<M\.GeoJSONSource[^>]*>/g) ?? [];
  assert(tags.length >= 4,
    `expected at least 4 <M.GeoJSONSource> tags (route, gates, gate-ticks, rider), got ${tags.length}`);
  for (const tag of tags) {
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const key = /\bkey="([^"]+)"/.exec(tag)?.[1];
    assert(id !== undefined, `GeoJSONSource without a literal id: ${tag}`);
    assert(key === id,
      `GeoJSONSource id="${id}" must carry key="${id}" so React never rebinds a mounted source's frozen id: ${tag}`);
  }
});
```

`fs`, `path`, `TESTS_DIR`, `test`, `assert` are already imported at the top of the
suite — add no imports. (The regex is safe: no `>` occurs inside any source's opening
tag at HEAD, and `</M.GeoJSONSource>` cannot match `/<M\.GeoJSONSource/`.)

**Order of work (rule 3 — a checkable artifact):** add the test FIRST, run the suite,
and confirm this one test FAILS (report its exact failure line). Then apply Change 1
and confirm the whole suite passes. If the new test does not fail before the fix, STOP
and report.

## 4. Explicit non-tasks (findings already settled by the planner — do not act)

- **Diagnostics ("flight recorder") — NO change.** `routeMatchDiagnostics` capture is
  subscribed at MODULE scope in `app/src/location/index.ts` (~line 428,
  `liveEngine.subscribeDiagnostics(...)` → sidecar JSONL) — fully independent of the
  map component tree; it survives any UI crash. The crash rides had no
  `routeMatchDiagnostics` because they were FREE rides: `engine.ts feed()` branches to
  `feedFree()` before any `emitDiagnostic` call (line ~443) — free mode emits no
  anchor/retry/lock diagnostics BY DESIGN (WP-B: no lock state machine). Nothing to fix.
- **`gpxPlusExport.ts` lock-event export — DO NOT TOUCH.** `evs.find` currently exports
  only the first lock event (lines ~156/171); a separate, later work package
  (relaunch-crash-recovery) owns changing that to "every lock event". Nothing in this
  brief touches that file, so there is no conflict. Leave it exactly as-is.
- **`demos/mockup.html` — do NOT regenerate.** This is a crash fix with zero
  user-visible design change (same sources, layers, styles; the remount happens at a
  moment the swap was crashing before). CONVENTIONS.md's mockup rule applies only to
  shipped design changes.

## 5. Acceptance criteria

1. New static-guard test fails at HEAD (before Change 1) and passes after — captured
   output for both runs.
2. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts`
   → zero FAIL (paste the summary line and any FAIL lines verbatim).
3. `cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit` → clean (no output = clean;
   paste whatever appears verbatim, or state "no output").
4. Only two files modified: `app/src/ui/routeMapView.tsx` (4 one-line key additions +
   1 comment block) and `app/tests/routemap_suite.ts` (1 appended test).
5. All four `M.GeoJSONSource` tags carry `key` equal to their `id`; `<M.Map>`'s
   `key={styleUrl}` is unchanged; no other JSX, prop, style, or logic changed.

The on-device behavioural claim ("a ride to a freshly created destination landmark no
longer crashes the map") cannot be proven headlessly — Nathan verifies it on the phone;
the static guard plus the mechanism note above is this pass's checkable artifact. Say
this plainly in your report; do not claim device verification you did not do.

## 6. Report format (return exactly these sections)

1. **Files changed** — per file: the exact lines added/modified (quote them).
2. **Test-first evidence** — the new test's failing output before the fix, verbatim.
3. **Verification output** — the full final `tests/run.ts` summary (and any FAIL
   lines) and the `tsc --noEmit` result, both verbatim.
4. **Deviations** — anything that did not match this brief (expected: none).
5. **Escalations** — any point where you stopped under the ambiguity rule, with the
   exact surprise encountered.

> **If any ambiguity or surprise arises, STOP and report back — never guess.**
