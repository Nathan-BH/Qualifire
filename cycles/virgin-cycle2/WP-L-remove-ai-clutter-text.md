**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Source:** `data/activities/TEST in virgin-app rides/qualifire-20260904/qualifire-20260904-notes.md` ("Lets think about removing all the extra ai clutter text that is in the app, some examples include (but there are probablymore) ..."). Size: **medium** — Part A is a handful of deletions; Part B is a small interaction redesign of one component (`Row`) in `settings.tsx` plus a copy rewrite of every hint.
**Written by:** Plan tier (Fable), 2026-09-04, against the live repo — every line number below was read from the file on that date. Re-anchor by string, not by number, at execute time.

## What it is

Nathan's note names two things:

1. Standalone explanatory prose scattered through ROUTES, the opened RIDE view and DEMO — two-sentence "narration" captions in dim 11.5pt text that explain philosophy or implementation rather than label data. He quoted four; he expects more. These go.
2. SETTINGS: every row carries an always-visible grey explanation line. He wants those hidden behind a small "?" per setting, shown on demand.

The common **visual signature** of the clutter is an inline `<Text style={{ color: t.textDim, fontSize: 11.5 ... }}>` (or a `sub`/`note` style at 11.5–12.5pt in `t.textDim`) holding one or more full sentences, placed at the bottom of a card or screen, with no data in it. Short data labels in the same style (`"3 routes · asks which one at START"`, `"last 5 on this route"`, `"tap G1–G3 to nudge a gate"`) are NOT clutter and stay.

A second, related smell found during the sweep: internal document references leaking into user-facing copy — `(§8a)`, `(§18, unsettled)`, `(D-019)`, `(§21)`. A rider cannot follow those. They are scrubbed wherever they occur in a string a user sees (comments are untouched).

## Current state (verified 2026-09-04)

### A1 — the four strings Nathan quoted (all confirmed, all go)

| # | File:line | Exact string | Style |
|---|---|---|---|
| 1 | `app/src/ui/RoutesScreen.tsx:164–168` | `Dormant places keep seeding history but are never offered at START. Radius is measured, not guessed: p90 of the endpoint spread, capped at half the gap to the nearest place.` | inline `{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }`, last child of the YOUR PLACES card |
| 2 | `app/src/ui/RoutesScreen.tsx:238–241` | `Route lines are pre-rendered from your own rides, with the measured gates marked. Moving a middle gate keeps lap history comparable; moving START or FINISH does not.` | inline `{ color: t.textDim, fontSize: 11.5, marginTop: 4 }`, last child of the ScrollView |
| 3 | `app/src/ui/RideDetailScreen.tsx:546–549` | `Position is a fact; colour is a judgement — a mid-pack ride is never dressed as failure. Purple beats your best, green beats your recent average, yellow is an ordinary lap.` | inline `{ color: t.textDim, fontSize: 11.5, marginTop: 12 }`, last child of the ScrollView, after the primary CLOSE/DONE button |
| 4 | `app/src/ui/DemoScreen.tsx:164–166` (`headerCopy` const) and `:171` (its `<Text style={styles.sub}>`) | second mode: `A real archived commute lap replayed at ${RATE}x — the reference line and gates are already there; each sector paints its colour as you cross the gate that ends it. Nothing is recorded.` / first mode: `The same lap ridden as if for the first time — no route, no gates, just you and the line you are writing. Nothing is recorded.` | `styles.sub` = `{ color: t.textDim, fontSize: 12.5, marginTop: 6 }` |

### A2 — further candidates from the sweep (same pattern; Plan's judgment, flagged for Nathan)

| # | File:line | Exact string | Plan's call |
|---|---|---|---|
| 5 | `app/src/ui/DemoScreen.tsx:216–218` (`styles.note`) | `Sounds are not wired yet — gates buzz only. When the tier tones land they play here first.` | **Clutter, high confidence.** Development-status narration in the UI. Delete, together with the `note` style key. |
| 6 | `app/src/ui/RideDetailScreen.tsx:439–442` | `Free-ride sector times live in their own category — they never mix into a route's history, so your route comparisons stay clean.` | **Clutter, high confidence.** Identical shape to #3 (a philosophical aside under the FREE RIDE card). Delete. |
| 7 | `app/src/ui/settings.tsx:351–354` | `Saved on the phone and restored on launch. A corrupt file falls back to these defaults rather than blocking the app.` | **Clutter, high confidence.** Implementation narration as a screen footer. Delete. |
| 8 | `app/src/ui/RecordScreen.tsx:1273–1275` (`styles.sub`, 15pt `t.text2`, centred — NOT the dim-caption style) | `what you pick stays locked until the end — ride a different road and this ride will not be scored as that road (§8a)` | **Judgment call, medium.** Outside the screens Nathan named; it is a live status slot under the WHICH ROUTE TODAY? picker, and its first clause is a real behavioural fact. Execute does the **minimum**: strip ` (§8a)` and shorten to `your pick is locked for this ride`. Nathan can ask for full removal later. |
| 9 | `app/src/ui/settings.tsx` hint strings on rows Red lights (`(§18, unsettled)`), Earcons (`(D-019)`), Start place (`(§21)`) | doc references inside hint copy | **Scrub, high confidence** — handled by Part B's copy table, not a separate edit. |

### A3 — reviewed and KEPT (not clutter; listed so Execute does not overreach)

- `RoutesScreen.tsx:143–145` coordinates/radius line; `:190–193` `"{n} route(s) · asks which one at START"`; `:204–206` `"{n} ghost lap(s) seeded · 4 sectors · START ~160 m in"`; `:161`/`:173` empty states `No places yet.` / `No ways yet.`
- `RideDetailScreen.tsx:90` `last N on this route`; `:105` `no rides on file yet`; `:109` `personal best sectors`; `:376–378` `reference ride of …`; `:427` `N gates crossed`; `:458–459` `no route — recorded only` / `sector times not on file for this ride`.
- `RidesScreen.tsx:112` `No rides yet. Record one on the Record tab.`; `:125` date · lap · quality line.
- `RecordScreen.tsx:1280–1284` `Ride saved — … Find it in Rides.` / `Ready to record.`
- `gateAdjustCard.tsx:155` `tap G1–G3 to nudge a gate`; `wayNamingCard.tsx:187–191` the conditional "already exists as …" duplicate hint; `DemoScreen.tsx:56` `FIRST_RIDE_STATUS` (`writing history · no known route here`, a live status line, not narration).

### Settings screen today

`app/src/ui/settings.tsx`. All 10 rows render through one shared component, `Row` (lines ~135–158):

```tsx
function Row(props: {
  label: string; hint?: string; t: PaddockTheme; children: React.ReactNode;
  sep?: boolean;
}) {
  return (
    <View style={[st.row, { borderBottomColor: props.t.cardBorder }, props.sep ? {...} : null]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ color: props.t.text, fontSize: 14 }}>{props.label}</Text>
        {props.hint ? (
          <Text style={{ color: props.t.textDim, fontSize: 11.5, marginTop: 2 }}>{props.hint}</Text>
        ) : null}
      </View>
      {props.children}
    </View>
  );
}
```

Every row passes a `hint`, so every row shows the grey line permanently. The screen already imports `useState` and `Pressable`. The app's only existing modal is the map-attribution sheet in `routeMapView.tsx:288–302` (a `Modal` + backdrop + card + CLOSE) — heavier than one sentence of help warrants; there is no tooltip/popover component anywhere. The app's idiom for a small toggling control is a bordered `Pressable` whose "on" state fills with `t.accent` and flips text to `t.onAccent` (`Seg`, `Switch`, the DEMO pills). The "?" follows that idiom.

## The fix

### Part A — delete / trim (7 edits, 4 files)

Each is a straight removal of the `<Text>…</Text>` element (and any now-unused const/style key). Nothing replaces #1, #2, #3, #5, #6, #7. Anchor by the string, not the line.

1. `RoutesScreen.tsx` — remove the `Dormant places keep seeding history…` `<Text>` (the last child inside the YOUR PLACES card `View`). The card's last row keeps its bottom border as today; if the card's bottom looks cramped without the caption's `paddingVertical: 9`, add `paddingBottom: 4` to that card's inline style — cosmetic, Execute's call, mention it in the report.
2. `RoutesScreen.tsx` — remove the `Route lines are pre-rendered…` `<Text>` (last child of the ScrollView). Nothing else changes; `paddingBottom: 40` on the ScrollView already gives the last card breathing room.
3. `RideDetailScreen.tsx` — remove the `Position is a fact…` `<Text>` after the `slimBtn` Pressable. The legend sentence ("Purple beats your best…") is preserved in the Sector colours help text in Part B, so no information is lost.
4. `DemoScreen.tsx` — delete the `headerCopy` const and its `<Text style={styles.sub}>{headerCopy}</Text>`. **Replace with** one short factual line in the same slot: `<Text style={styles.sub}>Nothing is recorded.</Text>` (mode-independent). `RATE` stays — it is still used in `start()`.
5. `DemoScreen.tsx` — delete the `Sounds are not wired yet…` `<Text style={styles.note}>` and the `note` key from `makeStyles`.
6. `RideDetailScreen.tsx` — delete the `Free-ride sector times live in their own category…` `<Text>` inside the FREE RIDE card.
7. `settings.tsx` — delete the `Saved on the phone and restored on launch…` footer `<Text>` after the DATA card.
8. `RecordScreen.tsx` — change the string `what you pick stays locked until the end — ride a different road and this ride will not be scored as that road (§8a)` to `your pick is locked for this ride`. Same element, same style.

### Part B — SETTINGS "?" help affordance

**Interaction:** each row that has help shows a small circled `?` immediately after its label. Tapping it reveals the help text beneath the label (exactly where today's grey line sits); tapping again, or tapping another row's `?`, hides it. One row open at a time (a single `helpOpen: string | null` keyed by the row's `label`). No modal, no new component file, no new dependency — it is the existing `Row`, made collapsible.

**Code — `settings.tsx`:**

```tsx
/** WP-L: which row's help is showing (keyed by label); one at a time. */
interface Help { open: string | null; toggle: (key: string) => void }

function Row(props: {
  label: string; hint?: string; help: Help; t: PaddockTheme; children: React.ReactNode;
  sep?: boolean;   // unchanged (WP-Q separator)
}) {
  const { t } = props;
  const hasHelp = props.hint !== undefined && props.hint !== '';
  const open = hasHelp && props.help.open === props.label;
  return (
    <View style={[
      st.row,
      { borderBottomColor: t.cardBorder },
      props.sep ? { borderTopWidth: 1, borderTopColor: t.cardBorder, marginTop: 4, paddingTop: 14 } : null,
    ]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <View style={st.labelRow}>
          <Text style={{ color: t.text, fontSize: 14 }}>{props.label}</Text>
          {hasHelp ? (
            <Pressable
              onPress={() => props.help.toggle(props.label)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`About ${props.label}`}
              style={[st.helpBtn, { borderColor: t.cardBorder }, open && { backgroundColor: t.accent, borderColor: t.accent }]}
            >
              <Text style={[st.helpText, { color: open ? t.onAccent : t.textDim }]}>?</Text>
            </Pressable>
          ) : null}
        </View>
        {open ? (
          <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 4 }}>{props.hint}</Text>
        ) : null}
      </View>
      {props.children}
    </View>
  );
}
```

Add to `st` (the `StyleSheet.create` at the bottom):
```ts
labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
helpBtn: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
helpText: { fontSize: 11, fontWeight: '700', lineHeight: 13 },
```

In `SettingsScreen`, before the `return`:
```tsx
const [helpOpen, setHelpOpen] = useState<string | null>(null);
const help: Help = {
  open: helpOpen,
  toggle: (k) => setHelpOpen((cur) => (cur === k ? null : k)),
};
```
and pass `help={help}` on every `<Row …>` (10 rows). `hint` stays a prop — its text simply no longer renders until asked for.

**Help copy** (replaces every existing `hint=` string verbatim; internal refs scrubbed, sentences start with a capital, plain language):

| Row | New `hint` |
|---|---|
| Theme | `The map and race surface follow it.` |
| Red lights | `auto: a stop at a light is detected and the clock pauses by itself. button: you press to pause, so stopped time is self-reported. off: the clock never pauses.` |
| Live map | `Show the moving dot on the route while riding.` |
| Sector colours | `Paint each stretch of the route line in the tier its sector earned — on the live map, in the ride view and on the RIDES list. Purple beats your best, green beats your recent average, yellow is an ordinary lap. Off keeps the whole line yellow.` |
| Earcons | `A short buzz at each gate crossing.` (honest to today's code — `location/index.ts:483–490` only vibrates; no tier sounds exist) |
| Start place | `Detect where you are when a ride starts, or choose the place yourself.` |
| Rankings | `Show where each ride placed against your others on that route.` |
| Places & routes | `Share catalog.user.json — every place, way and route created on this phone.` |
| Reference lines | `Share refs.user.json — the reference lines built from your rides. Per-ride GPX+ export lives on RIDES.` |
| Reset to virgin | `Moves every ride, result, place, way and route aside and starts this build over from its first launch. Settings and theme are kept.` |

## Acceptance criteria

1. None of the nine strings in A1/A2 (#1–#8 plus the three doc-reference fragments in #9) appears anywhere under `app/src/` outside a code comment: `grep -rn "Dormant places keep\|pre-rendered from your own\|Position is a fact\|archived commute lap\|Sounds are not wired\|live in their own category\|restored on launch\|(§8a)\|(§18, unsettled)\|(D-019)\|(§21)" app/src/ui/` returns only comment lines (or nothing).
2. DEMO shows the single line `Nothing is recorded.` under DEMO RIDE, in both modes.
3. SETTINGS on first open shows **no** grey explanation under any row. Every row that has help text shows a small circled `?` after its label. Tapping it shows that row's help beneath the label; tapping it again hides it; tapping another row's `?` swaps which one is open. The `?` is visibly "on" (accent fill) while its help is showing.
4. Every setting still switches exactly as before — `set(...)`, `toggleMode`, the two share buttons and `onResetPress` are untouched; the `?` never sits inside the `Switch`/`Seg`/share Pressables.
5. `Row`'s `sep` behaviour (WP-Q's Reset separator) is unchanged.
6. `tsc --noEmit` exit 0; test run zero FAIL.

## Verification

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL — no suite reads UI copy; nothing should move
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0 (unused const/style keys must be removed, not left dangling)
```
Run the grep from acceptance criterion 1 and paste its output in the execution report. Part B's interaction needs Nathan's on-device look (tap targets, `?` legibility at 18px in both themes); say so plainly in the report rather than claiming it from code.

## Stop-on-ambiguity

If any anchor string above is not found verbatim, or a file has changed shape since 2026-09-04, STOP and report verbatim — never guess, never decide in the coordinator's chat; forward to a fresh Fable Plan pass.

Confidence map, so nobody overreaches on what is a taste call:
- **Nathan's own examples, remove without question:** #1, #2, #3, #4.
- **Plan's judgment, high confidence — same pattern, same screens or same file family:** #5 (dev-status note on DEMO), #6 (aside under FREE RIDE), #7 (SETTINGS footer), #9 (doc-reference scrub). Execute applies them; Nathan sanity-checks on device.
- **Plan's judgment, medium — Nathan should confirm:** #8 (RECORD's route-pick status line, outside the named screens — brief chose the minimal trim, not removal); the `Nothing is recorded.` one-liner kept on DEMO (#4 — delete it too if he finds it noise); one-open-at-a-time for the `?` (vs. independent per-row); the `?` placed after the label rather than at the far right of the row after the control (Nathan wrote "at the end" — after the label is the reading that keeps `Row`'s layout intact; moving it after the control is a five-line change if he prefers it).
- **Do NOT touch:** everything in A3, all code comments (they are meant to cite §/D-/B- refs), `IDEAS.md`.
