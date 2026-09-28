# 06 — Retire the Q mark on RECORD; keep "QUALIFIRE"; give the map the room

**Source: Nathan, 2026-09-28.** His words: "i am also thinking about retiring the big Q logo
always being present on the RECORD tab; instead lets just keep the QUALIFIRE white text.
This way we can also make the openmap there bigger because it is rather small on that
screen currently"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 06 of
`virgin-cycle16`. **Independent of briefs 01–05**: no edited region overlaps theirs, so this
can land before, between or after them. **This brief touches exactly one file:
`app/src/ui/RecordScreen.tsx`** — one JSX block and one style block.

**Line numbers below are against HEAD `2c21265` with none of 01–05 applied.** Briefs 01 and
05 both edit lines above the regions this brief touches, so if any of them has landed
first, expect every anchor to sit a few lines off (never more than ~50). The **quoted
content** is the anchor; the line number is a hint. Stop only when the quoted content
itself is not found or reads differently.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. If a quoted
  block is not in the file, or a name/style key differs from what is quoted, **stop and
  report the mismatch verbatim** (file, line, what you expected, what you found). Never
  guess, never patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` (repo root) is the bin (`mv`, never
  `rm`), and **never call `device_request_delete_permission`**, for any reason.
- No new dependency, no new import. Nothing is added; two things are removed and one
  number changes.
- Do not touch `app/src/ui/theme.ts` (the `t.text` colour stays theme-driven — Decision 2),
  `app/src/ui/wayMapView.tsx`, `app/src/ui/PreviewScreen.tsx` (it has its own `appTitle`
  and no mark — leave it), `product/brand/` (the logo PNGs and rationale docs stay; only
  the RECORD screen stops drawing the mark), any test file, `STATE.md`, `OPEN-ITEMS.md`,
  `IDEAS.md`, `Nathan/`, any other `NN-*.md` brief in this folder, or anything under
  `cycles/virgin-cycle15/`.
- **Only the `readout` block of the setup phase is edited.** The race-phase readout and
  every other `WayMapView` in the app
  (`CatalogDetailScreen.tsx:319` `height={260}`, `gateAdjustCard.tsx:154`, the race-mode
  `fill` map) are untouched.
- **No test is edited or added by this brief.** The change is JSX + a style object; the
  node test runner does not render `RecordScreen.tsx` (`grep -rn "import.*RecordScreen"
  app/tests` → no hits; two suites mention the name in comments/assert strings only —
  check and report if an actual import has appeared).

## Goal

The RECORD tab's idle header no longer draws the Q mark (the ink ring + yellow slash). The
"QUALIFIRE" word stays exactly as it is, and the live map under it grows from 200 to
330 px tall, so the block occupies about the same vertical space as before — the mark's
room goes to the map, nothing below it shifts noticeably.

## Current state (verified 2026-09-28 against the tree)

**Scope is exactly one screen, one block.** `logoWrap`/`logoRing`/`logoSlash` exist only
in `app/src/ui/RecordScreen.tsx` (`grep -rn "logoWrap\|logoRing\|logoSlash" app/src` →
lines 1458, 1459, 1460, 1718, 1720, 1733 of that file, nothing else). There is no shared
header component. `PreviewScreen.tsx` has its own `appTitle` text and no mark. The mark is
**drawn from style props, not an image** — no asset file is loaded at render, so nothing
under `product/brand/logos/` is referenced by code for this (the PNG is named only in a
comment, as the thing the measurements were taken from).

**The title colour question ("white text").** `styles.appTitle` uses `color: t.text`
(line 1709). `t.text` resolves per theme (`app/src/ui/theme.ts`): **night** `text:
colors.ink` = `#F4F2EC` (near-white — this is the "white text" Nathan sees); **daylight**
`text: '#201F24'` (near-black, on a `#FAF7EE` ground). So in the night theme the word is
already white and needs no change; in daylight it is dark by design (white on `#FAF7EE`
would be unreadable). This brief **does not** hardcode white — Decision 2, logged as
assumption 1.

### `app/src/ui/RecordScreen.tsx`

- **The header block, lines 1451–1462** (inside the setup-phase `ScrollView`,
  `contentContainerStyle={styles.content}`, `content` = `{ flexGrow: 1, alignItems:
  'center', justifyContent: 'flex-start', padding: 20, paddingBottom: 36, gap: 22 }`):

  ```tsx
      {/* Idle readout */}
      <View style={styles.readout}>
        {/* The mark, measured off product/brand/logos/qualifire_logo_1_gate_q.png
            rather than eyeballed: on a 512 canvas the ring is 309 px across
            with a 34 px stroke, and the slash is a 238 px diagonal 36 px thick
            whose bbox starts at the ring's centre — a Q's tail, not a bar
            through the whole mark. Scaled here to a 122 px wrap. */}
        <View style={styles.logoWrap}>
          <View style={styles.logoRing} />
          <View style={styles.logoSlash} />
        </View>
        <Text style={styles.appTitle}>Qualifire</Text>
  ```

- **The map, lines 1463–1486** (directly after the `appTitle` line):

  ```tsx
        {/* B-51: at the rack, before START — real pannable streets, the
            candidate route (whichever way/route is picked so far). WP-D
            (2026-09-02): when nothing is picked yet — or the pick is a
            user-created route with no drawable asset (WP-P's "HomeWork") —
            RouteMapView now renders rider-only (real tiles + the dot, no
            route line) instead of a blank space; it no longer falls back to
            drawing some other route from the asset manifest. Cycle-2 WP-A
            removed the catalog-wide defaultRouteId() fallback in
            routeMapView.tsx, so a null pick draws rider-only even once the
            catalog holds drawable routes. */}
        {settings.liveMap ? (
          <View style={{ alignSelf: 'stretch' }}>
            <WayMapView
              wayId={pickedWay?.refLineId ?? null}
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

  `WayMapView`'s `height` prop is `height?: number` (`wayMapView.tsx:217`, default 190
  at `:380`/`:1030`); it is applied as `{ height: h }` on the outer box, so any number
  works and nothing else in the map scales off it.

- **Styles (inside `makeStyles`, line 1664 `const makeStyles = (t: PaddockTheme) =>
  StyleSheet.create({`), lines 1707–1745:**

  ```tsx
    readout: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
    appTitle: {
      color: t.text,
      fontSize: 19,
      letterSpacing: 6,
      textTransform: 'uppercase',
      textAlign: 'center',
      fontWeight: '800',
      marginBottom: 4,
    },
    // Logo mark, drawn: ink ring, yellow gate slash crossing it (BRAND P4).
    logoWrap: { width: 122, height: 122, marginBottom: 10 },
    // ring: 309/512 of the canvas, 34/512 stroke, centred (101..410 of 512)
    logoRing: {
      position: 'absolute',
      left: 24,   // 101/512 * 122
      top: 22,    //  91/512 * 122
      width: 74,  // 309/512 * 122
      height: 74,
      borderRadius: 37,
      borderWidth: 8, // 34/512 * 122
      borderColor: t.text,
    },
    // slash: 238/512 long, 36/512 thick, running from the ring centre down-right.
    // Rotating about the centre, so left/top place its MIDPOINT at the midpoint
    // of the reference bbox (269..437, 259..427 of 512).
    logoSlash: {
      position: 'absolute',
      left: 56,   // midpoint x 353/512*122 = 84, minus half the 57 px length
      top: 78,    // midpoint y 343/512*122 = 82, minus half the 9 px thickness
      width: 57,  // 238/512 * 122
      height: 9,  //  36/512 * 122
      borderRadius: 5,
      backgroundColor: t.accent,
      transform: [{ rotate: '45deg' }],
    },
    // Race readout: colours follow the theme's race surface. The ticking lap
    // clock IS the elapsed display now (LAYOUT §2 v2) — no second clock.
    readoutLive: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  ```

- **Vertical budget today** (readout, `gap: 6`): logoWrap 122 + marginBottom 10 + gap 6 →
  appTitle (~23 line + marginBottom 4) + gap 6 → map 200. Removing the mark frees
  **138 px** (122 + 10 + 6). The map at 330 takes back 130 of it; the header block ends
  up 8 px shorter than today, so the RECORD button and everything under the map sit
  essentially where they are now.

## Decisions (pre-resolved — do not re-open)

1. **The mark goes entirely: JSX, the measurement comment above it, and all three style
   objects with their comments.** Not commented out, not kept behind a flag. Dead style
   keys would be flagged by Inspect; a flag nobody asked for is scope creep. The brand
   PNGs and `product/brand/LOGO-RATIONALE.md` are untouched — retiring the mark from one
   screen is not retiring the brand.
2. **`appTitle` keeps `color: t.text` — not hardcoded white.** In night it already renders
   `#F4F2EC` (what Nathan calls white); in daylight it is dark on a cream ground, and a
   hardcoded white would vanish there. Nathan's "white text" describes what he sees, not
   a request to break the day theme. Not one character of `appTitle` changes.
3. **Map height 200 → 330.** Reasoning: (a) the freed space is 138 px, so +130 hands
   almost all of it to the map and leaves the block 8 px shorter — nothing under it moves
   in a way Nathan would notice, and the scroll distance to RECORD is unchanged;
   (b) 330 is a clean number; (c) on Nathan's phone (~360–412 dp wide, minus the 40 dp
   content padding) the map box comes out ~320–372 wide, so 330 makes it roughly square —
   a sensible shape for a rider-centred map with `zoom={1}`; (d) it is larger than the
   browse map on `CatalogDetailScreen` (260), which is right — this is the map he looks
   at every ride. Not `fill`/flex: the block sits in a `ScrollView`, where `flex: 1` has no
   height to fill; a fixed number is the only thing that works here.
4. **Every other prop on `WayMapView`, the `settings.liveMap` conditional, the
   `alignSelf: 'stretch'` wrapper, the B-51 comment, `readout`'s `gap: 6`, and the
   `content` padding stay byte-for-byte.** Only `height={200}` → `height={330}`.
5. **`readout` keeps `alignItems: 'center'`.** The title is `textAlign: 'center'` and the
   map wrapper is `alignSelf: 'stretch'`, so the layout is correct without the mark; no
   compensating change.

## Files to touch

### 1. `app/src/ui/RecordScreen.tsx`

**Edit A — remove the mark's JSX and its comment.** Lines 1453–1461. Replace

```tsx
      <View style={styles.readout}>
        {/* The mark, measured off product/brand/logos/qualifire_logo_1_gate_q.png
            rather than eyeballed: on a 512 canvas the ring is 309 px across
            with a 34 px stroke, and the slash is a 238 px diagonal 36 px thick
            whose bbox starts at the ring's centre — a Q's tail, not a bar
            through the whole mark. Scaled here to a 122 px wrap. */}
        <View style={styles.logoWrap}>
          <View style={styles.logoRing} />
          <View style={styles.logoSlash} />
        </View>
        <Text style={styles.appTitle}>Qualifire</Text>
```

with

```tsx
      <View style={styles.readout}>
        {/* virgin-cycle16 06 (Nathan 2026-09-28): the drawn Q mark that used to
            sit above the word is retired — the word alone heads the tab and
            the freed height went to the map below (200 → 330). */}
        <Text style={styles.appTitle}>Qualifire</Text>
```

The `{/* Idle readout */}` line above and the B-51 comment below are untouched.

**Edit B — map height.** Line 1483, inside the `WayMapView` at 1475–1484:

```tsx
              height={200}
```

→

```tsx
              height={330}
```

This is the only `height={200}` in the file today (`grep -n "height={200}"
app/src/ui/RecordScreen.tsx` → one hit, line 1483 — if there is more than one, stop and
report; do not pick).

**Edit C — remove the three style objects and their comments.** Lines 1717–1743. Delete
everything from the line

```tsx
  // Logo mark, drawn: ink ring, yellow gate slash crossing it (BRAND P4).
```

through the closing

```tsx
    transform: [{ rotate: '45deg' }],
  },
```

of `logoSlash` (inclusive — that is the `// Logo mark…` comment, `logoWrap`, the
`// ring: …` comment, `logoRing`, the three `// slash: …` comment lines, and `logoSlash`),
so that the `appTitle` object's closing `},` (line 1716) is directly followed by

```tsx
  // Race readout: colours follow the theme's race surface. The ticking lap
  // clock IS the elapsed display now (LAYOUT §2 v2) — no second clock.
  readoutLive: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
```

`readout`, `appTitle`, `readoutLive` and everything after are untouched. (`readoutLive`
is a pre-existing style key with no JSX user — `grep -n readoutLive` → the definition
only. Not this brief's business: leave it exactly as it is, do not tidy it.)

That is the whole brief: one file, three edits, net −33 lines or so.

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL (nothing here is
under test; the run is the regression guard). `./node_modules/.bin/tsc --noEmit` → exit 0.
The one plausible complaint: if `tsc` reports `View` as unused — it is not (the `readout`
`View`, the map wrapper and dozens more still use it); report, don't remove.

Then, in `app/src/ui/RecordScreen.tsx`:

- `grep -n "logoWrap\|logoRing\|logoSlash" app/src/ui/RecordScreen.tsx` → **no hits**.
- `grep -rn "logoWrap\|logoRing\|logoSlash" app/src` → **no hits** (confirms nothing else
  referenced them).
- `grep -n "qualifire_logo_1_gate_q\|BRAND P4\|309/512\|238/512" app/src/ui/RecordScreen.tsx`
  → **no hits** (the measurement comments went with the styles).
- `grep -n "height={330}" app/src/ui/RecordScreen.tsx` → exactly **one** hit; `grep -n
  "height={200}" app/src/ui/RecordScreen.tsx` → **no hits**.
- `grep -n "styles.appTitle" app/src/ui/RecordScreen.tsx` → exactly **one** hit, and
  `grep -n -A8 "appTitle: {" app/src/ui/RecordScreen.tsx` still shows `color: t.text,`
  (the title was not recoloured).
- `grep -n "virgin-cycle16 06" app/src/ui/RecordScreen.tsx` → exactly **one** hit (Edit A's
  comment).
- `grep -n "readoutLive" app/src/ui/RecordScreen.tsx` → exactly **one** hit, the style
  definition, same as before the edit (it was not touched).
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly one file changed; `git diff` shows
  removals plus one comment block and one number, no other additions.

## On-device checklist (Nathan, after publish)

1. RECORD tab, idle, night theme: no ring/slash above the word. **QUALIFIRE** sits at the
   top of the block, white, spaced out as before. Directly under it the map — visibly
   taller than before (roughly square now), rider dot centred, tiles pannable.
2. The block under the map (sport row, way/route pickers, RECORD button) sits at about
   the same scroll position as before — you should not have to scroll noticeably further
   to reach RECORD.
3. Toggle the day theme: QUALIFIRE is dark ink on the cream ground (unchanged from today,
   just without the mark). Toggle back.
4. Settings → live map off: the word alone heads the block, no empty gap where the map
   was, and the sport row follows straight after (the `settings.liveMap` null branch was
   not touched).
5. Press RECORD → armed screen, START → race: the armed/race screens are unchanged;
   the race map still fills its column as before.
6. PREVIEW tab: still says Qualifire at the top, unchanged (it never had the mark).

## Out of scope

- Any change to `appTitle`'s size, weight, spacing or colour (Decision 2).
- Making the map `fill`/flex, or changing `zoom`, `showRider`, `variant` or `liveState`.
- The race-mode map, the browse map on `CatalogDetailScreen`, the gate-adjust map.
- Removing the brand PNGs, `LOGO-RATIONALE.md`, or the mark from the launch animation /
  app icon / marketing — Nathan named the RECORD tab only.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships to the Preview APK over
EAS Update via `scripts/publish-preview.cmd` — no new numbered build. Visible: the RECORD
tab's idle header loses the drawn Q mark; the word QUALIFIRE stays exactly as it was; the
live map under it is 330 px tall instead of 200 (about the mark's old footprint), so the
block is the same height overall. Nothing else on any screen changes.

## Open questions / assumptions (logged, not blocking)

1. **"White text" read as night-theme `t.text` (`#F4F2EC`), not a hardcoded white**
   (Decision 2). If Nathan actually wants white in the day theme too, that is one line
   (`color: t.text` → `color: colors.ink`) — but it would be near-invisible on `#FAF7EE`,
   so the brief does not do it silently.
2. **330 is a first number** (Decision 3). It is one literal; if the map feels too tall or
   too short on the phone, change `height={330}` and republish. 300 and 360 are the
   obvious neighbours (block 38 px shorter / 22 px taller than today, respectively).
3. **The mark's measurement comments are gone with the styles.** The measurements
   themselves live in `product/brand/LOGO-RATIONALE.md` and the PNGs, so nothing is lost;
   if the drawn mark is ever wanted back, HEAD `2c21265` has it verbatim.
4. **Line drift from briefs 01–05.** Anchors are content-quoted. Brief 01 edits the map
   props around 1324–1381 (the *armed/running* map, not this one) and lines above; brief
   05 edits 18, 91, ~467–528, 1117–1126, 1184, 1636–1647 — none inside 1451–1486 or
   1707–1745, so the quoted content here is unaffected whichever order lands.
