**Status: Brief written 2026-09-03 (Digest+Plan pass). Ready to execute — Nathan's Q5 answer is fully incorporated; the map-restoration half is confirmed already satisfied by WP-D (live map renders in setup, `liveMap` defaults `true`). Core design: the setup ScrollView's `content` container drops its vertical centring (`justifyContent: 'center'` → `'flex-start'`); the pills are already flush-left + wrapping, so `pillRow` and `alignItems` need no change.**
**Review doc item: 14. Size: small.**
**Verified against the mount as read 2026-09-03 (`a03b84e`, branch `virgin`).**

---

# WP-M — RECORD setup layout

## 1. Goal

Nathan's Q5 ruling: **"Tight and grows, but most importantly add the openmap view back."** Two halves:

1. **Tight-and-grows** — pills flush-left, wrapping, the setup form starting at the top and growing downward as the catalog fills, instead of a sparse block floating in the middle of the screen.
2. **Map view back** — a live map on the setup screen. Already delivered by WP-D (§2.3 below); no work in this WP.

Only half 1 is real work, and it is one style value.

## 2. Current state (verified against `a03b84e`)

### 2.1 The setup ScrollView and its content container

`app/src/ui/RecordScreen.tsx:1177-1181` — the setup phase's only scroll container; `styles.content` is used nowhere else in the file (armed/race phases use `raceColumn`).

```tsx
<ScrollView
  style={styles.scroll}
  contentContainerStyle={styles.content}
  showsVerticalScrollIndicator={false}
>
```

`RecordScreen.tsx:1327-1332`:

```ts
// flexGrow + centre: short content still sits centred as before; tall
// content (map on) scrolls instead of shoving START under the tab bar.
content: {
  flexGrow: 1, alignItems: 'center', justifyContent: 'center',
  padding: 20, paddingBottom: 36, gap: 22,
},
```

Direct children of `content` (lines 1183-1305): `modePill` (`position: 'absolute'`, line 1333 — out of flow, unaffected by either axis), `problemStates` (a `warn` Text / `warnBox` View with no `alignSelf`, lines 911+, 1441-1442 — these DO rely on the parent's `alignItems: 'center'`), `readout` (line 1364, `alignSelf: 'stretch'`), and `bigBtn` RECORD (line 1451-1452, `alignSelf: 'stretch'`, `height: 150`).

### 2.2 Why the pills already sit flush-left — and why they still look like they float

The pill rows live inside `readout` → `startFlow` → `pillRow` (lines 1191-1281). The alignment chain:

- `readout` (1364): `alignSelf: 'stretch', alignItems: 'center'` — full width; centres its own children (logo, title, `sub` texts — intentional, the brand mark).
- `startFlow` (1430): `alignSelf: 'stretch', gap: 4, marginTop: 6` — overrides `readout`'s centring, so the whole picker block is full width. As a column with no `alignItems`, its children default to `stretch`.
- `flowLabel` (1431) and `pillRow` (1432) therefore span the full width. `pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }` with default `justifyContent: 'flex-start'` → **pills are already flush-left and already wrap.** `git log -S` confirms `pillRow` has been exactly this since the initial import (`2eb81c3`); it was never centred.

So the "centred ScrollView" the stub complains about is the **vertical** centring: `content` has `flexGrow: 1` + `justifyContent: 'center'`, and when the column is shorter than the viewport the whole stack (logo, title, map, pills, RECORD) is pushed down into the middle with blank bands above and below. That is what reads as "floating" with two pills. With the map on the column is roughly 730 pt tall (20 + logo 132 + title ~34 + map 200 + picker ~110 + `sub` ~26 + gap 22 + RECORD 150 + 36) — close to a phone viewport, so the effect is marginal; with the map off it is ~530 pt and the float is obvious. Either way the form does not "grow from the top".

### 2.3 Map half of Q5 — already satisfied by WP-D

`RecordScreen.tsx:1207-1219`, inside `readout`, between the title and the picker:

```tsx
{settings.liveMap ? (
  <View style={{ alignSelf: 'stretch' }}>
    <RouteMapView
      routeId={pickedRoute?.refLineId ?? null}
      lat={status.lastLat}
      lon={status.lastLon}
      zoom={1}
      showRider
      variant="live"
      liveState="prestart"
      height={200}
    />
  </View>
) : null}
```

Real tiles + rider dot, rider-only when nothing drawable is picked (WP-D's comment at 1200-1206). Gate: `settings.liveMap`. `app/src/ui/settings.tsx:32-38` — `DEFAULTS.liveMap: true` (line 36); a missing/corrupt `settings.json` falls back to `DEFAULTS`, and a saved file is merged over `DEFAULTS` (`settings.tsx:65`, `{ ...prev, ...saved }`), so a virgin install and any older `settings.json` lacking the key both show the map. **Confirmed: the virgin experience shows the map by default.** The README's "already satisfied by WP-D" claim stands; nothing to do here. (The wrapper `View` is `alignSelf: 'stretch'`, so it is unaffected by §3.)

## 3. Proposed change

One value, one comment. `RecordScreen.tsx:1327-1332`:

Before:
```ts
// flexGrow + centre: short content still sits centred as before; tall
// content (map on) scrolls instead of shoving START under the tab bar.
content: {
  flexGrow: 1, alignItems: 'center', justifyContent: 'center',
  padding: 20, paddingBottom: 36, gap: 22,
},
```

After:
```ts
// WP-M (Nathan Q5, 2026-09-03: "tight and grows"): the setup form starts at
// the top and grows downward as the catalog fills — no vertical centring,
// no blank band above the logo. Pills are already flush-left + wrapping
// (startFlow stretches; pillRow's default justifyContent is flex-start).
// alignItems stays 'center': it governs only the problem-state texts here
// (readout and RECORD both alignSelf: 'stretch'). Tall content still scrolls.
content: {
  flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start',
  padding: 20, paddingBottom: 36, gap: 22,
},
```

Reasoning for what is NOT changed:

- **`alignItems: 'center'` stays.** It has no effect on the pills (§2.2 chain); switching it to `flex-start` would left-align and shrink-wrap the `warn`/`warnBox` problem states, a regression for no gain.
- **`pillRow` untouched** — already does "flush-left, wrap". `gap: 6` vs the 8 used in Demo/Rides is undocumented and arbitrary; leave it, out of scope.
- **`readout.alignItems: 'center'` untouched** — that centres the logo/title/`sub` line, which is intended; `startFlow` already opts out via `alignSelf: 'stretch'`.
- **`flexGrow: 1` stays** — inert under `flex-start` but harmless, and keeps the diff to the one semantic value.
- **`padding: 20` top stays** as the default. With the stack pinned to the top, the logo's top edge sits at y=20 and the absolute `modePill` at `top: 14, right: 16` — side by side, not overlapping, on any width ≥ ~300 pt. If the on-device check finds the logo crowding the status bar / mode pill, bump to `paddingTop: 28` (Executor's call; note it in the commit).

## 4. Test plan

Honest answer: none headless. This is a single React Native `StyleSheet` value; there is no snapshot/DOM layout testing in this project, and the existing suite has no layout coverage of the setup screen (`tests/recordflow_suite.ts` covers `effectiveFromId()` pick semantics only). No new tests — inventing one would test nothing.

**Acceptance is the on-device visual check** (this cycle's convention for every UI-only WP):

1. Fresh/virgin state, `liveMap` on (default): setup screen — logo + title start near the top, map below, then `STARTING FROM` / `GOING TO` pill rows flush-left with `Home` and `new`, then `Ready to record.`, then RECORD. No blank band above the logo; the mode pill (top-right) does not overlap the logo.
2. Toggle `liveMap` off in SETTINGS: same top-anchored stack, now with visible empty space *below* RECORD rather than split above and below. That is the intended "grows" look.
3. Pick a way with >1 route (e.g. any catalog way with variants) so `WHICH ROUTE TODAY?` appears: the third row adds below, everything else stays put.
4. Force a problem state if convenient (deny location permission): the amber `warnBox` is still centred horizontally.
5. Race and armed phases unchanged (they do not use `styles.content`).

## 5. Verification

```bash
cd app
node --experimental-strip-types tests/run.ts
./node_modules/.bin/tsc --noEmit
```

Both must be clean with 0 new tests and 0 test edits. Then the on-device check above.

## 6. Files touched

- `app/src/ui/RecordScreen.tsx` — `content` style (one value) + its comment, lines 1327-1332. Nothing else.
- `cycles/virgin-cycle1/README.md` — status row for WP-M (Executor, on landing).

## 7. Open questions (none block execution; defaults given)

1. **Top padding** — default keep `padding: 20`; raise to `paddingTop: 28` only if the visual check shows the logo crowding the mode pill / status bar.
2. **"openmap view"** — read as the live tile map that WP-D restored (real OSM-style tiles + rider dot, pannable). It is present and on by default. If Nathan meant something else by "openmap" (e.g. a full-screen map, or the map above the logo rather than below it), that is a new request, not this WP — worth one line in the next NEEDS-NATHAN batch, not a blocker.
