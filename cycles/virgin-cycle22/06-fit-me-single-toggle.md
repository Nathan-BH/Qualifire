# 06 — Map zoom bar: ONE FIT/ME toggle labelled with the action the next tap performs (MapLibre rung)

**Source: Nathan, 2026-10-05 22:58 (README "Decision from Nathan (2026-10-05 22:58) — item 6", points
1-7 are the spec; Haiku digest D10 + its COORDINATOR ERRATA).** The MapLibre zoom bar (top-right, a
vertical stack of 30 pt buttons with a 5 pt gap) has `+`, `−`, FIT, the compass `↑` (only when
rotation is enabled) and, on live surfaces, ME. FIT and ME become ONE button whose label is the ACTION
the next tap performs, never the current state: mode `follow` -> "FIT" (tap -> `setMode('fit')`);
mode `fit` or `free` -> "ME" (tap -> `setMode('follow')`). `+`/`−` keep setting `follow` (so right
after a zoom tap it reads FIT). Browse surfaces (`showRider` false) keep a plain FIT. Saves 35 pt
(30 + 5) of bar height on live surfaces. Written by the Plan tier (Fable) on 2026-10-05; every
anchor re-verified against the current tree (D10's layout section was wrong — see § D10 errata).
Nothing is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.

**Run order: AFTER 05.** 05 removes the PNG rung (and its own three-button bar) from the same file;
this brief then edits the ONLY remaining `<View style={st.zoomBar}>`. If `grep -c "st.zoomBar"
app/src/ui/wayMapView.tsx` is not 2 (one use + the style definition) 05 has not landed: STOP. Every
anchor below is by content and survives 05 unchanged (05 does not touch the zoom bar, `mode`,
`cameraProps` or wayMapGeo.ts); line numbers are the PRE-05 tree and shift by about +30 after 05.

## 0. What the code does today (verified 2026-10-05; pre-05 line numbers)

- `app/src/ui/wayMapView.tsx`, `MapLibreWayMap`:
  - `:389-395` `const initialMode: 'follow' | 'fit' = variant === 'browse' || liveState === 'prestart'
    ? 'fit' : liveState === 'finished' ? 'follow' : (props.zoom ?? 4) <= 1 ? 'fit' : 'follow';`
    `const [mode, setMode] = useState<'follow' | 'fit' | 'free'>(initialMode);` and `:397-400` the
    reset effect `setMode(initialMode)` on `[props.zoom, variant, phaseKey, props.wayId]` (`phaseKey`
    folds `stopped` onto `moving`, so a red light never resets the mode).
  - `:663` `onRegionWillChange`: `if (e?.nativeEvent?.userInteraction) setMode('free');` (drag/pinch/
    two-finger rotate).
  - `:620-630` `const cameraProps: Partial<CameraStop> = cameraTargetFor({ mode, here: ..., bounds,
    zoom: camZoom, bearing: effectiveBearing, userBearing: rotateEnabled ? userBearing : null });`
    — `here` is null until a fix (`props.lat/lon` null) and on `showRider` false.
  - `:897-931` the zoom bar (exact text):
    ```tsx
          <View style={st.zoomBar}>
            <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
              onPress={() => { setCamZoom((z) => Math.min(18, z + 1)); setMode('follow'); }}>
              <Text style={[st.zoomText, { color: t.text }]}>+</Text>
            </Pressable>
            <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
              onPress={() => { setCamZoom((z) => Math.max(11, z - 1)); setMode('follow'); }}>
              <Text style={[st.zoomText, { color: t.text }]}>−</Text>
            </Pressable>
            <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
              onPress={() => setMode('fit')}>
              <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
            </Pressable>
            {/* WP-M: compass reset — ... */}
            {rotateEnabled ? ( <Pressable ... onPress={resetNorth} accessibilityLabel="Reset map to north up"> ... ↑ ... ) : null}
            {showRider ? (
              <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
                onPress={() => setMode('follow')}>
                <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>ME</Text>
              </Pressable>
            ) : null}
          </View>
    ```
    Order top->bottom today: `+`, `−`, FIT, `↑`, ME. Styles `:1176-1181`: `zoomBar: { position:
    'absolute', right: 6, top: 6, gap: 5 }`, `zoomBtn: { width: 30, height: 30, ... }`, FIT/ME text
    `fontSize: 10.5`. No `accessibilityLabel` on FIT or ME today.
- `app/src/ui/wayMapGeo.ts` `cameraTargetFor` (:415-446): `free` -> `{}`; `fit` + bounds -> fit the
  bounds, `bearing: userBearing ?? 0`; otherwise `here` -> centre on the rider at `zoom` with
  `bearing` (course-up while moving/stopped); else bounds -> centre of the bounds at `zoom`; else `{}`.
  So **`follow` with no fix is not frozen when there is a way**: it centres the way at `camZoom`
  (D10 §3 says so too); it is frozen only with no way AND no fix (rider-only before the first fix).
  `rotateEnabledFor` (:460-465): browse/prestart/finished -> true; moving/stopped -> false.
- Tests: `tests/waymapgeo_suite.ts` imports from wayMapGeo at :10-15 (`bearingBetween, cameraTargetFor,
  ... placeBounds`), tests `cameraTargetFor` (:412+) and `rotateEnabledFor` (:495). `tests/waymap_suite.ts`
  has (after 05) the test `'routemap: exactly one zoom bar (MapLibre) with exactly one compass reset
  button — the PNG rung is gone (virgin-cycle22 05)'`.
- `app/tests/ui-strings.allow.json`: `src/ui/wayMapView.tsx` kind `text`: `"FIT"` (:3877-3884) and `"ME"`
  (:3897-3904). The scanner (tests/ui_strings_extract.ts :132-139) records JSX TEXT nodes
  (`<Text>FIT</Text>`) and JSX string-literal expressions; a `{cond ? 'FIT' : 'ME'}` expression is NOT
  recorded (3-letter literals are not "prose"), so the two entries would go STALE and the suite would
  fail. The JSX below therefore keeps two literal `<Text>` branches. No new string.

## Behaviour (the spec, with the race edge cases decided — see decisions)

| surface / moment | mode | label | tap does |
|---|---|---|---|
| RECORD armed (prestart, `zoom={1}`) first render | `fit` (initialMode) | **ME** | follow the rider at camZoom 16 (centre of the way until the first fix) |
| START pressed (same mount; `phaseKey` prestart->moving, `zoom={4}`) | reset to `follow` | **FIT** | fit the whole way, north-up (`userBearing ?? 0`) |
| racing, after FIT | `fit` | **ME** | back to follow, course-up resumes (`effectiveBearing`) |
| racing, after a drag/pinch | `free` | **ME** | back to follow |
| racing, `+`/`−` | `follow` | **FIT** | fit |
| red light (`stopped`) | unchanged (phaseKey) | unchanged | unchanged |
| no GPS fix yet (`waiting for GPS` badge) | as above | **as above** (label follows `mode` only) | ME = what the old ME did: centre the way at camZoom, or hold if there is no way either |
| finished | `follow` (initialMode) | **FIT** | fit |
| browse (ROUTES, ACTIVITIES, gate card, `showRider` false) | `fit` | **FIT**, always | fit (there is no rider to follow) |
| DEMO (live, showRider) | as racing | as racing | as racing |

Compass `↑` and `rotateEnabled`/`touchRotate` untouched; a held `userBearing` still survives FIT/ME/+/−
through `cameraTargetFor` as today.

## Scope / non-scope

IN: `app/src/ui/wayMapGeo.ts` (one pure function), `app/src/ui/wayMapView.tsx` (the zoom bar + one
`const`), `app/tests/waymapgeo_suite.ts` (one test), `app/tests/waymap_suite.ts` (one test),
`cycles/virgin-cycle22/06-fit-me-preview.html` (new, a static mock for Nathan to look at).
OUT: `cameraTargetFor`, `rotateEnabledFor`, `initialMode`, the mode-reset effect, `onRegionWillChange`,
the compass button, `st.*`, every WayMapView caller, `core/`, ui-strings.allow.json (no change
expected), IDEAS.md, STATE.md, OPEN-ITEMS.md.

## Target invariants

1. The MapLibre zoom bar renders `+`, `−`, the FIT/ME toggle, then `↑` (when rotation is enabled) —
   four buttons at most on live surfaces, three on browse; never a fifth.
2. The toggle's label is derived from `fitMeNextMode(mode, showRider)` (wayMapGeo.ts, pure, tested):
   `'fit'` -> "FIT", `'follow'` -> "ME"; its `onPress` sets exactly that mode.
3. `showRider` false -> `fitMeNextMode` is always `'fit'` -> plain FIT.
4. The allow-list entries `FIT` and `ME` stay valid (two literal `<Text>` branches), nothing added.

## Steps (anchors by quoted content)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short`; `grep -c "st.zoomBar" app/src/ui/wayMapView.tsx`
-> 2 (else STOP: 05 not landed). Baseline tests: the post-05 count (**0 fail / 3 skip**; 860 total if
01-05 all landed, 857 if the flash brief 04 did not — record what you measure) and tsc exit 0.

**Step 1 — tests first (failed-before).**

a. `app/tests/waymapgeo_suite.ts`: add `fitMeNextMode, ` to the import list from `'../src/ui/wayMapGeo.ts'`
(e.g. after `cameraTargetFor,` on the line `  bearingBetween, cameraTargetFor, gatesFeatureCollection,`).
Append after the last test in the file:
```ts
test('virgin-cycle22 06: fitMeNextMode — the one FIT/ME button names the ACTION of the next tap, never the state', () => {
  // Nathan 2026-10-05: follow -> "FIT" (tap fits the way); fit or free (after a drag/pinch) -> "ME"
  // (tap follows the rider); browse surfaces have no rider, so always FIT.
  assert(fitMeNextMode('follow', true) === 'fit', 'following -> next tap fits (label FIT)');
  assert(fitMeNextMode('fit', true) === 'follow', 'fitted -> next tap follows (label ME)');
  assert(fitMeNextMode('free', true) === 'follow', 'after a gesture -> next tap follows (label ME)');
  for (const m of ['follow', 'fit', 'free'] as const) {
    assert(fitMeNextMode(m, false) === 'fit', `browse surface (${m}) -> plain FIT`);
  }
});
```
b. `app/tests/waymap_suite.ts`: append after the last test:
```ts
test('virgin-cycle22 06: the MapLibre zoom bar has ONE FIT/ME toggle (fitMeNextMode) and no separate ME button', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'wayMapView.tsx'), 'utf8');
  const barStart = src.indexOf('<View style={st.zoomBar}>');
  const barEnd = src.indexOf('<Credit rung="maplibre"', barStart);
  assert(barStart >= 0 && barEnd > barStart, 'MapLibre zoom bar not found');
  const bar = src.slice(barStart, barEnd);
  assert((bar.match(/setMode\(fitMeNext\)/g) ?? []).length === 1, 'exactly one toggle press sets fitMeNext');
  assert(!bar.includes("setMode('fit')"), 'no standalone FIT button left');
  assert(!/onPress=\{\(\) => setMode\('follow'\)\}/.test(bar), 'no standalone ME button left');
  assert((bar.match(/setMode\('follow'\)/g) ?? []).length === 2, "+ and − still set 'follow' (and nothing else does)");
  assert((bar.match(/>FIT</g) ?? []).length === 1 && (bar.match(/>ME</g) ?? []).length === 1,
    'FIT and ME each appear once, as literal JSX text (ui-strings entries stay valid)');
  assert(bar.includes("fitMeNext === 'fit'"), 'the label branches on fitMeNext');
  assert((bar.match(/onPress=\{resetNorth\}/g) ?? []).length === 1, 'compass untouched');
  assert(src.includes('const fitMeNext = fitMeNextMode(mode, showRider);'), 'fitMeNext comes from the pure helper');
  assert(src.includes('fitMeNextMode') && src.includes("from './wayMapGeo.ts'"), 'helper imported from wayMapGeo.ts');
  const pressables = (bar.match(/<Pressable/g) ?? []).length;
  assert(pressables === 4, `four Pressables in the bar (+, −, FIT/ME, ↑), got ${pressables}`);
});
```
c. Run the suite: the waymapgeo suite fails to load (`fitMeNextMode` is not exported yet — if the runner
aborts on the import instead of reporting one FAIL, record that) and the new waymap test FAILs; record both.

**Step 2 — `app/src/ui/wayMapGeo.ts`.** Append right after `rotateEnabledFor` (after its closing `}`
at ~:465, before the line `// ==================================================== WP-sector-coloured-trail P1 (2026-08-26 ruling)`):
```ts

/** virgin-cycle22 06 (Nathan 2026-10-05): the ONE zoom-bar button where FIT and
 * ME used to be is labelled with the ACTION the next tap performs, never the
 * current state. Returns the mode that tap sets — 'fit' (label "FIT") or
 * 'follow' (label "ME"):
 *  - follow -> 'fit': the rider is being followed; the only other thing to do
 *    is fit the whole way.
 *  - fit or free (after FIT, or a drag/pinch/rotate) -> 'follow': the way back
 *    to the rider is "ME".
 *  - showRider false (browse surfaces) -> always 'fit': nothing to follow.
 * Deliberately NOT a function of the GPS fix: with no fix yet, 'follow' does
 * exactly what the old ME button did (cameraTargetFor centres the way bounds
 * at the follow zoom, or holds when there is no way either), and a label that
 * flipped the moment a fix arrived would change under a moving thumb
 * mid-race. Pure, so the headless suite pins the table. */
export function fitMeNextMode(mode: 'follow' | 'fit' | 'free', showRider: boolean): 'fit' | 'follow' {
  return showRider && mode !== 'follow' ? 'follow' : 'fit';
}
```

**Step 3 — `app/src/ui/wayMapView.tsx`.**

3a. Import: in the wayMapGeo import block add `fitMeNextMode, ` so the line
`  bearingBetween, cameraTargetFor,` reads `  bearingBetween, cameraTargetFor, fitMeNextMode,`.

3b. Insert, immediately BEFORE the comment block that starts `  // WP-D §3.1c: the camera-target rule itself lives in routeMapGeo.ts`
(the one above `const cameraProps: Partial<CameraStop> = cameraTargetFor({`):
```ts
  // virgin-cycle22 06: what the ONE FIT/ME button does on its next tap (and
  // therefore reads) — see fitMeNextMode's doc. Not a hook (sits after the
  // riderOnly early return above).
  const fitMeNext = fitMeNextMode(mode, showRider);

```
3c. In the zoom bar replace the FIT button (four lines):
```tsx
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setMode('fit')}>
          <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
        </Pressable>
```
with:
```tsx
        {/* virgin-cycle22 06 (Nathan 2026-10-05): ONE button where FIT and ME
            were, labelled with the ACTION the next tap performs, never the
            current state (fitMeNextMode): follow -> "FIT", fit/free -> "ME";
            +/− above still set follow, so right after a zoom tap it reads FIT.
            Browse surfaces (no rider) always read FIT. Two literal <Text>
            branches on purpose: the ui-strings scanner only sees JSX text, so
            the existing "FIT"/"ME" allow-list entries stay valid. */}
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setMode(fitMeNext)}>
          {fitMeNext === 'fit'
            ? <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
            : <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>ME</Text>}
        </Pressable>
```
3d. Delete the ME block (six lines), from `        {showRider ? (` (the one directly followed by a
`<Pressable` whose `onPress={() => setMode('follow')}`) to its `        ) : null}` — it sits between the
compass block's `) : null}` and `      </View>`. Do not touch the compass block.
3e. In the compass comment change `north-up already, dim like FIT/ME; a button that only appears` to
`north-up already, dim like the FIT/ME toggle; a button that only appears`. (Comment only.)

**Step 4 — the mock for Nathan: `cycles/virgin-cycle22/06-fit-me-preview.html`.** Create a single
self-contained HTML file (no external resources) titled "virgin-cycle22 06 — zoom bar mock (NOT the
app)". Content: a one-line note "Static mock of the MapLibre zoom bar only, drawn from the same rule as
the code (fitMeNextMode). The map, dot and line are not drawn. The real check is on the phone
(COMMANDS.md)."; then four frames side by side on a dark (#17171b) background, each a 180×240 px
rounded box (border 1px #41414c) with the bar at `right: 6px; top: 6px`, buttons 30×30 px, radius 8,
border 1px #41414c, background #212127, text #F4F2EC for `+`/`−`, #9a978f for the small labels (font
10.5px bold) — exactly `st.zoomBtn`/`st.zoomText`:
1. "live · mode follow" -> `+`, `−`, `FIT` (no `↑`: moving);
2. "live · mode fit" -> `+`, `−`, `ME`;
3. "live · mode free (after a drag)" -> `+`, `−`, `ME`;
4. "browse (ROUTES)" -> `+`, `−`, `FIT`, `↑`;
and a fifth frame "today (before 06) · live" -> `+`, `−`, `FIT`, `ME` for the height comparison, with
the caption "35 pt shorter". Plain HTML + inline CSS, under 120 lines. This file is a MOCK, say so in
its title and body; it is not evidence that the app does this — the phone check is.

**Step 5 — run everything.** Tests: both Step-1 tests pass; **+2 vs the post-05 baseline** (862 / 859 /
0 / 3 if 01-05 all landed). ui-strings suite green with NO allow-list change (`git diff app/tests/ui-strings.allow.json`
-> empty). tsc exit 0. `git diff --stat`: exactly wayMapGeo.ts, wayMapView.tsx, waymapgeo_suite.ts,
waymap_suite.ts (+ the new html, untracked) beyond the pre-existing modifications.

## Failed-before procedure (never git stash)
Step 1c is the record. To re-prove later: `cp app/src/ui/wayMapView.tsx safe_to_delete/wayMapView.c22-06.bak`,
re-add a line `<Pressable onPress={() => setMode('follow')}><Text>ME</Text></Pressable>` inside the bar,
run (the waymap test FAILs on "no standalone ME button"), restore with `cp` and `cmp`.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0.
- `grep -n "setMode(" app/src/ui/wayMapView.tsx` -> reset effect, `onRegionWillChange` ('free'), `+`, `−`
  ('follow'), the toggle (`fitMeNext`); nothing else.
- `grep -c "<Pressable" app/src/ui/wayMapView.tsx` -> exactly 6 (credit card, credit "i", `+`, `−`,
  toggle, compass); 7 before this brief (post-05).
- `grep -n '"text": "FIT"\|"text": "ME"' app/tests/ui-strings.allow.json` -> both still present, file unchanged.
- `grep -n "fitMeNextMode" app/src/ui/wayMapGeo.ts app/src/ui/wayMapView.tsx app/tests/waymapgeo_suite.ts` -> export, import + call, test.
- `git diff app/src/ui/wayMapGeo.ts` -> one added function only (cameraTargetFor/rotateEnabledFor untouched).
- `cycles/virgin-cycle22/06-fit-me-preview.html` exists and opens in a browser (Nathan).

## Added visible text
None. `FIT` and `ME` already allow-listed and still emitted as literal JSX text. No accessibilityLabel added
(decision 3).

## What changes on the phone / what does not
Changes (after OTA publish, COMMANDS.md): on every map the top-right bar is `+`, `−`, one small button,
and (when the map can rotate) `↑`. While a ride is being followed the small button reads **FIT**; after
tapping it (whole way shown, north-up) or after dragging/pinching the map it reads **ME**; tapping ME
returns to following you (course-up while riding). `+`/`−` zoom and follow you, so the button reads FIT
again. Before START (RECORD armed map) it reads ME first — the way is shown whole; ME shows where you
are. Before the first GPS fix ME centres the way (as the old ME did); the `waiting for GPS` badge says
why. ROUTES/ACTIVITIES/gate-editor maps: plain FIT as before, one button fewer is NOT the case there (they
never had ME). The live bar is 35 pt shorter.
Does NOT change: zoom steps, the compass, two-finger rotation, course-up, red-light dimming, FIT's
north-up fit, what a drag does, any stored data, any string.

## Out of scope (do not do)
- Making the label depend on the GPS fix, hiding the toggle before the first fix, or any
  `cameraTargetFor`/`initialMode` change (decision 1-2).
- An `accessibilityLabel` on the toggle (decision 3).
- The compass button, `rotateEnabledFor`, `touchRotate`.
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs. Coordinator: STATE.md gets one line under "Maps:"
  after 05's clause: "zoom bar `+`/`−`/FIT-or-ME toggle/`↑` (virgin-cycle22 06)".

## D10 digest errata found by Plan
- D10 §7 layout (bar "left/bottom-left", buttons "40-50 pt", "no height saving") is wrong; the
  coordinator errata already corrected it (`right: 6, top: 6, gap: 5`, 30×30, 35 pt saved).
- D10 §2 "`initialMode = mode ?? 'follow'`" is wrong: it is the browse/prestart -> 'fit', finished ->
  'follow', else zoom<=1 -> 'fit' rule quoted in § 0 (errata partly right: prestart starts in 'fit').
- D10 §3 "`mode === 'fit' && no bounds` -> `{}`" is wrong: it falls through to `here` (follows the rider)
  and only then to `{}`. Irrelevant to the label rule, relevant to the "no fix" row above.
- D10 §5 "`Reset map to north up` ... as accessibilityLabel" is right; FIT/ME have no accessibilityLabel.

## Decisions taken by the Plan tier (logged, not asked)
1. **Label follows `mode` only, never the GPS state.** With no fix, `follow` is not a dead button when
   there is a way (`cameraTargetFor` centres the way bounds at the follow zoom), and in the rider-only
   case it holds — exactly what the old ME button did, so nothing is lost; the badge `waiting for GPS`
   already tells the rider why nothing moves. A label that flipped when the first fix arrived is the
   one thing Nathan's point 4 forbids (a label changing under a moving thumb).
2. **initialMode untouched**: RECORD's armed map starts in `fit` (zoom 1) and therefore reads ME; at
   START the existing reset effect flips it to `follow` -> FIT. Consistent with the rule, no new state.
3. **No `accessibilityLabel`** on the toggle: today's FIT/ME have none, adding one means two new
   rider-facing strings Nathan would have to own; the visible label already names the action.
4. The toggle takes FIT's slot (third), the compass stays last, so browse bars are visually unchanged
   (`+`, `−`, FIT, `↑`) and live bars lose only the bottom button.
5. The rule lives in `wayMapGeo.ts` (pure, headless-tested) rather than inline JSX, so the table in
   § Behaviour is pinned by a test, not by a screenshot; the JSX keeps two literal `<Text>` branches
   because the ui-strings scanner cannot see a conditional string expression.
6. The HTML mock is produced because Nathan asked for a preview of the three states before "done"
   (README point 7); it is labelled a mock, and the real acceptance is the DEMO-tab/RECORD checks and
   a real ride on the phone (COMMANDS.md § on-device, added by the coordinator).
