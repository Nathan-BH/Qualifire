# BRIEF D — DEMO tab: FIRST RIDE continues into the gate-adjust card, and nothing is saved

**Written 2026-09-19 UTC (Plan tier, fable), after Nathan's `QUESTIONSFORNATHAN.md` answers
(item 7 opened this scope). Brief 4 of 4 for the DEMO tab overhaul — build order A → B → C →
D; D may run before C, never before B.** Depends on `BRIEF-demo-fullscreen-run.md` (A,
landed as `8df1119`) and on `BRIEF-demo-tenth-ride-reveal.md` (B, revised) being committed:
B renames A's `saved` to `savedLine: string | null` and wraps the ending's card slot in
`revealDone ? … : null` with a comment marking where this brief's branch goes. This brief
touches only FIRST RIDE's ending and adds to `demoModel.ts`; it does not depend on brief C
and collides with nothing in it.

Nathan's ask (item 7, unedited): *"add the gate adjust to the demo as well, but same as the
fake confirmation line. let me tweak it, but dont save It again."* And item 6, which shapes
the sequence: *"Dont already write home>>work, let me fill it in, but just dont save it after
I save it."*

Anchors were read from the live `virgin` tree at HEAD `8df1119` on 2026-09-19:
`ui/gateAdjustCard.tsx` (235 lines; `GateAdjustCardProps` `:42–63`, the KEEP/SAVE button
`:196–209`), `ui/RecordScreen.tsx` (`adjust` state `:190–192`, `onNamingSave` `:639–676`,
`onAdjustKeep` `:682–685`, `onAdjustSave` `:687–708`, the ending's card slot `:1139–1162`),
`store/routeFromRide.ts` (`GateAdjustDraft` `:197–203`, `createRouteFromDraft` `:220–236`,
`saveAdjustedGates` `:245–262`), `live/userRefs.ts` (`RefFixInput` `:36–43`,
`buildRefFromRideFixes` `:68–103`), `store/gateSeeding.ts` (`seedGateChainages` `:40–79`, no
imports), `core/src/types.ts` (`RefLine` `:19–29`), `core/src/reference.ts`
(`collapseStationaryRuns(ride, radiusM = 15, minDurationS = 20)` `:132`),
`ui/wayAssetRuntime.ts` (`buildRuntimeWayAsset(ref, gateChainageM, sourceRide)` `:34`),
`ui/demoWayFixture.ts` (`gateIdx: [7,40,76,120,157]` `:31`, `path` 163 points `:39–`),
`ui/DemoScreen.tsx` and `ui/demoModel.ts` at `8df1119` plus B's brief for the shapes B adds.
`DemoScreen.tsx` / `demoModel.ts` line numbers below are `8df1119`'s — after B they will have
moved; anchor against B's committed file. Executor: Sonnet, stop-on-ambiguity — any anchor
mismatch, any call this brief leaves open: STOP and report file, line, and what is actually
there. Never guess; it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — The real sequence is naming card → SAVE → gate-adjust card → KEEP/SAVE → reverse mark; the demo now mirrors it, with theatre at both saves

`RecordScreen.tsx`'s `onNamingSave` (`:639–676`) runs `createRouteFromDraft`, then `setNaming(null)`
and — when a reference line and gate seed were built — `setAdjust(out.adjust)`; only
`onAdjustKeep` / `onAdjustSave` start the reverse mark (`:682–708`). **There is no
confirmation line between the two cards in the real app.** Brief A stopped at a line because
the gate card needs a `RefLine`; Nathan now wants the card. Ruling — the demo's FIRST RIDE
ending becomes:

1. `Ride saved — m:ss.` + the real `RouteNamingCard`, both inputs blank (A; item 6 confirmed
   by brief B R7 — nothing pre-written).
2. Nathan types two names → **CREATE ROUTE** → `busy` for `DEMO_FAKE_SAVE_MS` (the button
   dims exactly as a real save does) → the naming card is replaced by the real
   **`GateAdjustCard`** on a reference line built from the very path the dot just rode (R2),
   gates seeded by the real seeder (R3). No line yet — the real screen shows none here.
3. Nathan taps gates, nudges them with the pad, holds to repeat — the card's own behaviour,
   untouched.
4. **KEEP GATES** (nothing moved) → one confirmation line at once. **SAVE GATES** (moved) →
   `busy` for `DEMO_FAKE_SAVE_MS` → the same one line. **discard nudges — keep the proposal**
   is the card's own `onKeep` and behaves as KEEP. The line (R4) names what he did and says
   nothing was saved; it holds `DEMO_SAVED_HOLD_MS`, then the reverse mark → the chooser.

Nothing is written at either step — no `createRouteFromDraft`, no `saveAdjustedGates`, no
`saveUserRef`, no store import in `DemoScreen.tsx` (A's grep, kept). *"let me tweak it, but
dont save It again"* — exactly.

### R2 — The fake `RefLine` is built by the real builder from the lap the dot rode

`GateAdjustCard` needs `refLine: RefLine`, `refLengthM`, `initialChainageM`, `wayId`
(`gateAdjustCard.tsx:42–63`). The demo has no ride file. Ruling: **feed the real
`buildRefFromRideFixes` (`live/userRefs.ts:68`) the fixture's own path** — the START→FINISH
slice of `DEMO_WAY_ASSET.path` (`path.slice(gateIdx[0], gateIdx[4] + 1)`, 151 vertices, the
same geometry `positionAtTime` moves the dot along, `DemoScreen.tsx:137`), each vertex a
`RefFixInput` with a synthetic `tUnixMs = startMs + i * 1000`. Why this and not a hand-made
polyline: the card then draws the exact same shape as a real first ride would produce —
the same flag-filter → stationary-collapse → `meanOrigin` → `buildReference` (5 m resample)
→ mm-round recipe (`userRefs.ts:1–13`), so what Nathan nudges on is a real reference line,
not a look-alike. Why the START→FINISH slice and not the whole path: a real ride's
`preStart`/`warmup` fixes are filtered out (`:69–71`); the fixture's seven points before
`gateIdx[0]` are the demo's own warm-up and the dot never rides them.

The synthetic timestamps only matter to `collapseStationaryRuns` (≥ 20 s inside 15 m): the
fixture's consecutive vertices are tens of metres apart, so at 1 s spacing nothing collapses
and `stopChainageM` is `[]` — a first ride with no recorded stop. Task 3 pins that fact so a
future fixture edit that *does* create a stop shows up as a test change, not a surprise.

`buildRefFromRideFixes` returns `null` below `MIN_TRACK_LENGTH_M` (200 m) or with < 2
vertices — impossible with the shipped fixture (≈ 5 km) but handled: a `null` draft falls
back to A's behaviour (line at once, R4 with `gates: null`). `wayId` is `DEMO_FIRST_RIDE_ID`
(`'demo:first-ride'`) — the card's map keys its mode-reset on it and the PNG rung's lookup
misses, so the polyline rung draws the line exactly as the demo's own maps already do.

### R3 — The proposed gates are the real seed: `seedGateChainages(ref.length, stopChainageM)`

`store/gateSeeding.ts:40` is pure with no imports (its own header: "no fs, no Date, no
imports beyond nothing at all"). With no stops it returns the five quantiles
`[0.01, 0.25, 0.50, 0.75, 0.99] × L` — what a real first ride with no stop proposes. The
demo does **not** copy the fixture's own five gates onto the card: those are where a curated
route's gates ended up, not what the seeder proposes on ride 1, and the card's title is
"Sector gates — proposed". Nathan nudging the proposal toward where the real gates sit is
precisely the tweak he asked to try.

### R4 — One confirmation line, after the gate card, naming the outcome

`demoSavedLine(names, gates)` gains an optional second parameter `gates?: 'kept' | 'adjusted'
| null`:

- `null`/omitted → `Home → Work created · demo only, nothing saved` (A's text — the fallback
  when no draft could be built; the existing test keeps passing).
- `'kept'` → `Home → Work created · gates kept · demo only, nothing saved`.
- `'adjusted'` → `Home → Work created · gates adjusted · demo only, nothing saved`.

("Home → Work" here is whatever Nathan typed — the line echoes the inputs.) Same `trackLine`
style, same `DEMO_SAVED_HOLD_MS`, same reverse mark, same `savedLine` state B introduced.

### R5 — Purity, imports, and where the builder lives

`demoModel.ts` gets `demoGateAdjustDraft(script, startMs, asset = DEMO_WAY_ASSET):
DemoGateAdjustDraft | null` — pure, headless-testable (`tests/userrefs_suite.ts` already
proves `live/userRefs.ts` imports headless; `demo_suite.ts` has the JSON hook). Allowed value
imports for it: `buildRefFromRideFixes` from `'../live/userRefs.ts'`, `seedGateChainages` from
`'../store/gateSeeding.ts'` — **the one value import from `app/src/store/**` this cycle
permits in `demoModel.ts`, because the module is import-free and pure; `DemoScreen.tsx`'s own
rule (no value import from `store/**`) is unchanged and its grep still runs.** Type imports:
`RefLine` from `'../../core/src/index.ts'`. `DemoGateAdjustDraft` is the demo's own three-field
interface (`ref`, `refLengthM`, `chainageM`) — not the store's `GateAdjustDraft` (which carries
a real `wayId` and is the shape a real save produces; the demo has no way).

### R6 — Naming

`DemoGateAdjustDraft`, `demoRefFixes`, `demoGateAdjustDraft`, `DemoGatesOutcome` in
`demoModel.ts`; `adjust` / `setAdjust` / `pendingNames` / `onDemoAdjustKeep` /
`onDemoAdjustSave` in `DemoScreen.tsx` (the real screen's `adjust` name; `pendingNames` holds
the typed names between the two cards).

### R7 — Docs in the same commit

`STATE.md` (Known-stubs DEMO bullet: "**Brief D:** …", test line, cycle-history pointer),
`GLOSSARY.md` (**DEMO tab** entry, one clause), `OPEN-ITEMS.md` (item 7, the FIRST RIDE
sequence extended). Small anchored edits.

### R8 — Out of scope (do not build, do not ask)

Any change to `gateAdjustCard.tsx`, `gateAdjustModel.ts`, `wayAssetRuntime.ts`,
`userRefs.ts`, `gateSeeding.ts`, `RecordScreen.tsx`, `routeNamingCard.tsx`, `wayMapView.tsx`,
`app/src/store/**`, `app/core/**`; the other naming-card variants in FIRST RIDE (start known /
end known / loop — Nathan did not ask; item 7's second question went unanswered and stays in
`QUESTIONSFORNATHAN.md`); a gate card after SECOND/TENTH's WP-G card (a real ADD WAY on an
existing route does continue into one — `createRouteFromDraft` builds a ref for the variant
too — but Nathan's item 7 is about FIRST RIDE, and one gate card per demo session is enough
to test the card; named as a follow-up, not built); persisting anything; a `saveUserRef`.

---

## 1. Rules

- Touch only: `app/src/ui/demoModel.ts`, `app/src/ui/DemoScreen.tsx`, `app/tests/demo_suite.ts`,
  `STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md`, this cycle folder.
- Never edit `App.tsx`, `IDEAS.md`, `CLAUDE.md`, `Nathan/`, `cycles/virgin-cycle1..10/`,
  `app/core/**`, `app/src/store/**`, `app/src/live/**`, `app/src/ui/RecordScreen.tsx`,
  `app/src/ui/gateAdjustCard.tsx`, `app/src/ui/gateAdjustModel.ts`, `app/src/ui/wayAssetRuntime.ts`,
  `app/src/ui/routeNamingCard.tsx`, `app/src/ui/wayMapView.tsx`, `app/src/ui/tower.tsx`,
  `app/src/ui/demoWayFixture.ts`, `app/tests/run.ts`, `app/tests/userrefs_suite.ts`. If a task
  seems to need one → STOP and report why.
- Never delete. `mv` to `safe_to_delete/` only. `git add <path>` by name. Every git command
  with `GIT_OPTIONAL_LOCKS=0`; a stray `.git/*.lock` gets `mv`'d aside.
- HEAD at start must be B's commit (subject "DEMO tab — TENTH RIDE, the whole-board reveal,
  the card beneath it (brief B)") or C's on top of it ("… self dots race alongside … (brief
  C)"); quote it. `git status --short` clean apart from this cycle folder (uncommitted briefs are
  expected there; any modification under `app/` or the three root docs → STOP).
- `demoModel.ts` stays pure (no react / expo / react-native imports). R5 lists its two new
  value imports exactly; nothing else from `store/**` or `live/**`.
- `DemoScreen.tsx`: `GateAdjustCard` from `'./gateAdjustCard'` at value level (as
  `RecordScreen.tsx:72` does); still nothing from `../store/**` or `../storage/**` at value
  level — the grep runs at the end of Task 2.
- Stop-on-ambiguity on every "confirm" step. Nothing is done because it compiles.

Confirm before Task 1 and quote in the report:

1. `app/src/ui/gateAdjustCard.tsx:42–63` is `GateAdjustCardProps` with exactly `wayId: string;
   refLine: RefLine; refLengthM: number; initialChainageM: number[]; busy: boolean; onKeep: ()
   => void; onSave: (chainageM: number[]) => void; title?; subtitle?; discardLabel?;
   mapHeight?`; `:199` is `onPress={() => (dirty ? props.onSave(chainageM) : props.onKeep())}`
   and `:206` the discard `Pressable` calling `props.onKeep`.
2. `app/src/live/userRefs.ts:36–43` is `RefFixInput { lat; lon; ele?; tUnixMs; preStart?;
   warmup? }`; `:68` is `export function buildRefFromRideFixes(fixes: readonly RefFixInput[]):
   BuiltRideRef | null` with `BuiltRideRef { ref: RefLine; stopChainageM: number[] }` at
   `:45–52`; the module imports only `../../core/src/index.ts`, `../store/routeCreation.ts`
   (`MIN_TRACK_LENGTH_M`) and a type from `../storage/fsAdapter.ts`.
3. `app/src/store/gateSeeding.ts` has no `import` line at all; `:40–43` is `export function
   seedGateChainages(refLengthM: number, stopChainageM: readonly number[]): number[]`; with
   `stopChainageM.length === 0` it returns `[start, ...quantiles, finish]` (`:49–51`).
4. `app/core/src/types.ts:19–29` is `RefLine { rx; ry; ch; lat0; lon0; length }` (all
   `Float64Array` but the three numbers); `app/core/src/reference.ts:132–134` is
   `collapseStationaryRuns(ride, radiusM = 15, minDurationS = 20)`.
5. `app/src/ui/demoWayFixture.ts:31` is `gateIdx: [7,40,76,120,157],` and the `path` literal
   has 163 `[lat, lon]` pairs.
6. `app/src/ui/RecordScreen.tsx:1139–1162`: the ending's card slot is `revealDone ? (adjust
   !== null ? <GateAdjustCard wayId refLine={adjust.ref} refLengthM initialChainageM busy
   onKeep onSave /> : naming !== null ? <RouteNamingCard …/> : null) : null`; `:664–670`
   is `if (out.adjust) { setAdjust(out.adjust); } else { setShowAnim('rev'); }` with no line
   in between.
7. In B's committed `DemoScreen.tsx`: `savedLine: string | null` state; `onDemoNamingSave`
   sets `setSavedLine(demoSavedLine(names))` after the `DEMO_FAKE_SAVE_MS` timeout; the
   ending render's `revealDone ? (savedLine !== null ? <Text/> : mode === 'first' ?
   <RouteNamingCard (cold-start)/> : <RouteNamingCard (WP-G)/>) : null` with B's "brief D
   inserts its `adjust !== null` branch" comment. In B's `demoModel.ts`: `demoSavedLine(names:
   RouteNames): string` unchanged from A.

If item 7's shapes are not there (B not landed, or landed differently), STOP — this brief is
written against them.

---

## 2. Task 1 — `demoModel.ts`: the fixes, the draft, the line

Add (keep every existing export byte-identical except `demoSavedLine`'s new optional
parameter):

```ts
import type { RefLine } from '../../core/src/index.ts';
import { buildRefFromRideFixes, type RefFixInput } from '../live/userRefs.ts';
import { seedGateChainages } from '../store/gateSeeding.ts';   // pure, import-free (brief D R5)
import { DEMO_WAY_ASSET } from './demoWayFixture.ts';          // B may already import DEMO_WAY_ID from here
import type { WayAsset } from './wayMapMath.ts';

/** Brief D R2: the lap the dot rode — the START→FINISH slice of the fixture path — as
 *  RefFixInputs with synthetic 1 Hz timestamps. The timestamps only feed the stationary-run
 *  collapse; consecutive vertices are tens of metres apart, so nothing collapses. */
export function demoRefFixes(asset: WayAsset = DEMO_WAY_ASSET, startMs = 0): RefFixInput[];

/** What the demo's GateAdjustCard needs — the store's GateAdjustDraft minus the real wayId
 *  (the demo has no way). */
export interface DemoGateAdjustDraft { ref: RefLine; refLengthM: number; chainageM: number[] }

/** Brief D R2/R3: the real reference-line builder over the fixture's lap, then the real gate
 *  seeder over it. null only if the builder refuses (< 2 vertices / < MIN_TRACK_LENGTH_M —
 *  impossible with the shipped fixture; the screen then falls back to the line at once). */
export function demoGateAdjustDraft(startMs: number, asset: WayAsset = DEMO_WAY_ASSET): DemoGateAdjustDraft | null {
  const built = buildRefFromRideFixes(demoRefFixes(asset, startMs));
  if (built === null) return null;
  return {
    ref: built.ref,
    refLengthM: built.ref.length,
    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),
  };
}

/** Brief D R4: what happened on the gate card. */
export type DemoGatesOutcome = 'kept' | 'adjusted';
export function demoSavedLine(names: RouteNames, gates: DemoGatesOutcome | null = null): string {
  const g = gates === null ? '' : gates === 'kept' ? 'gates kept · ' : 'gates adjusted · ';
  return `${names.start.trim()} → ${names.end.trim()} created · ${g}demo only, nothing saved`;
}
```

`demoRefFixes`: `const idx = asset.gateIdx; const path = asset.path;` guard both present and
`idx.length >= 2` and `path.length > idx[idx.length - 1]` (else return `[]` — the builder then
returns null); `return path.slice(idx[0], idx[idx.length - 1] + 1).map(([lat, lon], i) => ({ lat,
lon, tUnixMs: startMs + i * 1000 }))`. `WayAsset.path` is `[number, number][]` and `gateIdx`
`number[]`, both optional (`wayMapMath.ts:35–37`) — hence the guard.

Check: `tsc` clean; `grep -nE "from 'react|expo" app/src/ui/demoModel.ts` prints nothing;
`grep -n "from '\.\./store/\|from '\.\./live/" app/src/ui/demoModel.ts` shows exactly:
the type imports B/A already had, `gateSeeding.ts` (value) and `userRefs.ts` (value) — nothing
else. The existing `demo_suite.ts` passes unchanged (the `demoSavedLine` test still holds with
the default).

## 3. Task 2 — `DemoScreen.tsx`: the second card in FIRST RIDE's ending

Anchor against B's committed file.

1. **Imports.** `GateAdjustCard` from `'./gateAdjustCard'`; `demoGateAdjustDraft, type
   DemoGateAdjustDraft` added to the `demoModel.ts` import.
2. **State**, beside `savedLine`:
   ```ts
   const [adjust, setAdjust] = useState<DemoGateAdjustDraft | null>(null);   // brief D: the gate card's draft
   const [pendingNames, setPendingNames] = useState<RouteNames | null>(null); // typed on card 1, echoed after card 2
   ```
   Both nulled in `exitToIdle` and at `start()`'s reset.
3. **`onDemoNamingSave`** becomes (same theatre, different continuation):
   ```ts
   const onDemoNamingSave = useCallback((names: RouteNames) => {
     setBusy(true);
     holdRef.current = setTimeout(() => {
       holdRef.current = null;
       setBusy(false);
       const draft = demoGateAdjustDraft(Date.now());
       if (draft === null) {
         // belt-and-braces: no line could be built — A's behaviour, the line at once
         setSavedLine(demoSavedLine(names));
         holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
         return;
       }
       setPendingNames(names);
       setAdjust(draft);           // R1 step 2: the gate card, no line yet — as the real screen
     }, DEMO_FAKE_SAVE_MS);
   }, []);
   ```
   The WP-G card's `onDemoAddWaySave` (B) is untouched.
4. **The gate card's exits** — `RecordScreen.tsx:682–708`'s shape, persistence replaced by the line:
   ```ts
   const finishWithLine = useCallback((gates: DemoGatesOutcome) => {
     setAdjust(null);
     setSavedLine(demoSavedLine(pendingNamesRef.current ?? { start: '', end: '' }, gates));
     holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
   }, []);
   const onDemoAdjustKeep = useCallback(() => finishWithLine('kept'), [finishWithLine]);
   const onDemoAdjustSave = useCallback((_chainageM: number[]) => {
     setBusy(true);                                        // the button dims as a real save does
     holdRef.current = setTimeout(() => { holdRef.current = null; setBusy(false); finishWithLine('adjusted'); }, DEMO_FAKE_SAVE_MS);
   }, [finishWithLine]);
   ```
   `pendingNamesRef` is the `useRef` mirror of `pendingNames` (`pendingNamesRef.current =
   pendingNames;` right after the state, RecordScreen's `adjustRef` pattern `:191–192`) so the
   `[]`-deps callbacks never read a stale closure. The moved `chainageM` is received and
   ignored on purpose (nothing to save); name the parameter with the underscore so the intent
   is visible.
5. **Ending render.** At B's comment, insert the branch **between** `savedLine !== null` and
   `mode === 'first'`:
   ```tsx
   ) : adjust !== null ? (
     <GateAdjustCard
       wayId={DEMO_FIRST_RIDE_ID}
       refLine={adjust.ref}
       refLengthM={adjust.refLengthM}
       initialChainageM={adjust.chainageM}
       busy={busy}
       onKeep={onDemoAdjustKeep}
       onSave={onDemoAdjustSave}
     />
   ```
   Default `title` / `subtitle` / `discardLabel` / `mapHeight` — the just-created-route copy,
   exactly what a real first ride shows. The slot order is then `savedLine → adjust → naming
   (first) → naming (WP-G)`, the real screen's `adjust → naming` order with the demo's line in
   front.
6. **Hardware back / exit.** `exitToIdle` already leaves 'ending' without ceremony; it must
   also `setAdjust(null); setPendingNames(null)`. The unmount effect clears `holdRef` (A).
7. **Header comment.** One added sentence in the brief-A paragraph: FIRST RIDE's SAVE continues
   into the real `GateAdjustCard` on a reference line built from the demo path; KEEP/SAVE are
   theatre too.

Checks: `tsc` clean. `grep -nE "from '\.\./(store|storage)/" app/src/ui/DemoScreen.tsx` prints
nothing. `grep -n "saveAdjustedGates\|createRouteFromDraft\|saveUserRef\|saveUserCatalog"
app/src/ui/DemoScreen.tsx app/src/ui/demoModel.ts` prints nothing. Read the FIRST RIDE ending
top to bottom once and confirm: card 1 → (busy) → card 2 → (KEEP: line at once | SAVE: busy →
line) → hold → reverse mark; STOP/back at any point → chooser, nothing left in state.

## 4. Task 3 — Tests: extend `app/tests/demo_suite.ts`

Add to the dynamic import: `demoRefFixes, demoGateAdjustDraft`; also `const { DEMO_WAY_ASSET } =
await import('../src/ui/demoWayFixture.ts')`, `const { START_FRAC, FINISH_FRAC, SECTOR_FRACS,
seedGateChainages } = await import('../src/store/gateSeeding.ts')`, `const { MIN_TRACK_LENGTH_M }
= await import('../src/store/routeCreation.ts')`. Cases:

- **The ref fixes are the lap the dot rode, 1 Hz.** `f = demoRefFixes(DEMO_WAY_ASSET, 5000)`:
  `f.length === 157 - 7 + 1`; `f[0].lat/lon` equal `DEMO_WAY_ASSET.path[7]`, `f.at(-1)` equals
  `path[157]`; `tUnixMs` strictly increasing by 1000 from 5000; no `preStart`/`warmup` set.
- **A fixture with no gateIdx yields no fixes, and no draft.** `demoRefFixes({ ...DEMO_WAY_ASSET,
  gateIdx: undefined }, 0)` is `[]`; `demoGateAdjustDraft(0, { ...DEMO_WAY_ASSET, gateIdx: undefined })`
  is `null` (the builder refuses < 2 fixes).
- **The draft is a real reference line over the demo path.** `d = demoGateAdjustDraft(T)`:
  non-null; `d.ref.ch[0] === 0`; `d.ref.length === d.refLengthM`; `d.refLengthM >
  MIN_TRACK_LENGTH_M`; `d.refLengthM` between 3000 and 8000 (a Leuven commute — pin the
  bracket, report the actual value); `d.ref.rx.length === d.ref.ch.length`; `ch`
  non-decreasing.
- **No stops on the scripted lap, so the proposal is the pure quantiles (R3).** `d.chainageM`
  deep-equals `seedGateChainages(d.refLengthM, [])` and equals `[START_FRAC, ...SECTOR_FRACS,
  FINISH_FRAC].map(f => f * d.refLengthM)` within 1e-6; strictly increasing; length 5.
- **The draft is deterministic in geometry, not in time.** `demoGateAdjustDraft(T).chainageM`
  deep-equals `demoGateAdjustDraft(T + 86_400_000).chainageM` and the two `ref.length` are equal.
- **The line names the outcome.** `demoSavedLine({ start: ' Home ', end: 'Work' })` ===
  `'Home → Work created · demo only, nothing saved'` (the existing test, kept);
  `demoSavedLine(n, 'kept')` === `'Home → Work created · gates kept · demo only, nothing saved'`;
  `demoSavedLine(n, 'adjusted')` === `'Home → Work created · gates adjusted · demo only, nothing saved'`.

Zero FAIL on the whole suite.

## 5. Task 4 — Docs (same commit as the code)

- `STATE.md`
  - Known-stubs DEMO bullet: append "**Brief D:** FIRST RIDE's CREATE ROUTE continues into
    the real `GateAdjustCard` — reference line built by the real `buildRefFromRideFixes` over
    the demo path, gates by the real `seedGateChainages` (`demoModel.ts`
    `demoGateAdjustDraft`); KEEP/SAVE GATES are theatre, one line names the outcome, nothing
    is written."
  - Test line refresh; cycle-history line: append ", brief D (`BRIEF-demo-gate-adjust.md`)".
- `GLOSSARY.md` **DEMO tab** entry: after "…and the naming card" add "and the gate-adjust
  card".
- `OPEN-ITEMS.md` item 7, the FIRST RIDE sentence: "type two names → CREATE ROUTE dims the
  button ~0.6 s → the 'Sector gates — proposed' card with the demo's line and five seeded
  gates on the map; tap a gate, nudge it with the pad (hold to repeat), zoom the map → KEEP
  GATES (or SAVE GATES, which dims ~0.6 s) → one confirmation line naming kept/adjusted →
  the reverse mark → back to the chooser. Nothing is saved at either step." — replacing A's
  shorter "SAVE dims the button ~0.6 s → one confirmation line".

---

## 6. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; totals before (B's or
   C's) and after.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.
3. `git diff --stat`: only §1 files.
4. Commit by name (`git add app/src/ui/demoModel.ts app/src/ui/DemoScreen.tsx
   app/tests/demo_suite.ts STATE.md GLOSSARY.md OPEN-ITEMS.md cycles/virgin-cycle11/`). Message:

```
virgin-cycle11: DEMO tab — FIRST RIDE continues into the gate-adjust card (brief D)

Nathan (QUESTIONSFORNATHAN item 7): "add the gate adjust to the demo as
well, but same as the fake confirmation line. let me tweak it, but dont
save It again." FIRST RIDE's CREATE ROUTE now mirrors the real sequence:
busy, then the real GateAdjustCard — no line in between, as on the real
screen — on a reference line the real buildRefFromRideFixes builds from
the START→FINISH slice of the demo path (the lap the dot rode), gates
seeded by the real seedGateChainages (pure quantiles: the scripted lap
has no stops). Tap, nudge, hold-to-repeat, zoom: the card's own. KEEP
GATES / SAVE GATES are theatre — one line names kept/adjusted with the
typed names, holds, reverse mark. Nothing is written at either step;
DemoScreen still imports nothing from store/** at value level.
demoModel.ts gains demoRefFixes / demoGateAdjustDraft (pure, tested
headless) and demoSavedLine's optional outcome. gateAdjustCard,
userRefs, gateSeeding, RecordScreen untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ssts3UN9gbxYxTjHH8sEWW
```

Push is expected to fail from this device (403, cycle precedent) — say so, one retry at most.

---

## 7. Report back

1. HEAD at start (quote the subject), `git status --short`, commit hash at end.
2. The seven §1 anchor confirmations, quoted.
3. Task 1: `demoRefFixes` and `demoGateAdjustDraft` as committed; the two new import lines;
   the `demoModel.ts` import grep.
4. Task 2: `onDemoNamingSave`, `finishWithLine`, the two adjust handlers and the ending's
   FIRST RIDE branch as committed; both greps.
5. Test totals before/after; `tsc`; the actual `refLengthM` and the five seeded chainages.
6. **Plain-language walk-through for Nathan** of FIRST RIDE from RUN to the chooser: the
   34 s ride, the roll-out, the naming card (blank), CREATE ROUTE, the gate card (what the
   map shows, where the five proposed gates sit — 1/25/50/75/99 % — how to nudge), KEEP vs
   SAVE, the line he will read, and the reverse mark; and one sentence that nothing was
   written anywhere.
7. Tokens (this tier); the tier | model | tokens | outcome row.
8. Every STOP you hit and did not resolve.
