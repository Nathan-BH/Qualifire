# BRIEF — Gate markers render white

**Written 2026-09-14 (UTC) — Fable Plan tier, from a Haiku digest. Status: backlog, not dispatched.**
**Folded into `virgin-cycle6` on 2026-09-14** per Nathan's request (originally drafted in a
separate `cycles/app-backlog/` holding folder; that folder now points here — see its README).
Independent of this cycle's other brief, `BRIEF-live-self-racing.md`; execute either on its own.

## Origin

Nathan's v4 feedback on the marketing gates-saving render:

> I would like to try having the gates as white colour (the idea is to mimick how the qualifier
> logo gets drawn now: yellow line color and then a white gate across). I would also try to draw
> the gates across the line similarly to how the logo is drawn (instead of dropping them into
> place or whatever it is doing now)

Marketing cycle 06 shipped it (`gates-saving/index.html`: gate ticks as a white
stroke-draw-on animation). Nathan liked it and wants it "implemented in the real app as well."

## Rulings

1. **Gates render plain white in the app. That is the whole change.** The stroke-draw-on
   animation was a HyperFrames video flourish; Nathan's app ask names the colour ("updating the
   gates lines to a white colour"). Do not build an animation. If, after the colour lands, an
   animation turns out to be a one-liner in the existing map layer (it almost certainly isn't in
   MapLibre), mention it in the report — don't do it.
2. **Geometry stays as it is.** The digest says gates are GeoJSON *Points* built in
   `gatesFeatureCollection()`, so they may render as circles/symbols rather than "lines across
   the route." Whatever shape they are today, keep it; only the colour changes. Report the actual
   shape so Nathan can decide separately whether he wants tick-lines like the marketing render.
3. **White is `#FFFFFF`**, added as a named theme token. Gates are structural markers, not
   score indicators — they must not reuse `colors.purple`, `colors.green` or `colors.neutral`.
4. **No new halos/outlines.** If the gate layer already has an outline/halo property, leave it
   unchanged. If white gates turn out to be illegible against the basemap, report it with a
   screenshot rather than inventing a fix.

## Rules

- Stop-on-ambiguity, per `CLAUDE.md`. This brief was written from a digest, not the code. Stop
  and report verbatim (no guessing, no rulings of your own) if any of these hold:
  - the gate colour is hardcoded somewhere **not** in the file list below;
  - `gateAdjustCard.tsx` has its own independent gate drawing that doesn't go through the same
    builder/theme (a second edit point you'd have to design yourself);
  - the existing `colour` property on gate features currently encodes **per-gate score/tier**
    (e.g. each gate coloured purple/green/neutral by the split hit there). Making that white
    would delete information, and whether to keep it elsewhere is Nathan's call, not yours;
  - anything else where two reasonable implementations exist and the brief doesn't pick one.
- Never delete; move to `safe_to_delete/`. Git via `device_bash` with `GIT_OPTIONAL_LOCKS=0`;
  `mv` stale `.git/*.lock` files aside, never delete them.
- Don't touch `app/core/src/gates.ts` — it's pure gate data (chainage + lat/lon), no colour.
- Don't touch the marketing folder.
- This brief is independent of `BRIEF-live-self-racing.md` in the same folder — different files,
  no shared state. Execute in either order, or in parallel; each gets its own commit.

## Tasks

### 1. Read the rendering path first (no edits yet)

Read, in this order, and note line numbers for the report:

- `app/src/ui/theme.ts` — is there already a white / ink / paper token? If yes, reuse it
  (don't add a duplicate). If no, you'll add `colors.white`.
- `app/src/ui/wayMapGeo.ts` — `gatesFeatureCollection()` (~lines 65–86). What sets the
  `colour` property on gate features today, and who supplies it? Establish whether it is a
  constant, a tier colour, or per-gate scoring (see stop condition above).
- `app/src/ui/wayMapView.tsx` — find the MapLibre layer(s) for gate features. Determine whether
  the paint spec reads `['get', 'colour']` (data-driven) or hardcodes a colour string. Also check
  the PNG fallback path: if it draws gates too, that's a second edit point *within scope* (same
  white).
- `app/src/ui/gateAdjustCard.tsx` — does the nudge card render gates through the same
  builder/layer, or its own thing? Shared → covered by the change. Own thing → stop and report.
- `app/src/ui/wayMapStyle.ts` — sanity check only: the D-030 palette firewall guards green/purple
  hue bands, so white doesn't collide with it. Just confirm nothing in the basemap patching
  already forces a white/near-white element that gates would now blend into (e.g. white road
  casings at the zoom gates are shown). Note findings; don't change the firewall.

If the read-pass trips a stop condition, stop here and report.

### 2. Add the token

In `app/src/ui/theme.ts`, add `white: '#FFFFFF'` to `colors` (or use the existing equivalent
found in step 1), with a one-line comment: `// structural markers (gates) — not a tier colour`.

### 3. Thread it to the gate features

In `wayMapGeo.ts`, make `gatesFeatureCollection()` emit `colour: colors.white` (or the equivalent
property name it actually uses) for every gate. If the function currently takes a colour
argument from callers, change the callers in `wayMapView.tsx` / `gateAdjustCard.tsx` to pass the
white token rather than leaving a dead parameter; if that fan-out grows beyond the listed files,
stop and report.

### 4. Confirm the layer paints it

In `wayMapView.tsx`:
- If the gate layer is data-driven (`['get', 'colour']` or similar), no change needed beyond
  step 3.
- If the gate colour is hardcoded in the layer paint spec, **that spec is the real edit point**:
  replace the literal with the theme token (import it; don't paste `'#FFFFFF'`).
- Apply the same to the PNG fallback if it draws gates.

Expected footprint: ~5–15 lines across 2–3 files. If you're past 30, something's off — stop.

## Verify, then commit

1. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0 (not bare `npx tsc`).
2. `cd app && node --experimental-strip-types tests/run.ts` — zero FAIL. If any test asserts
   the old gate colour, update the assertion (that's the intended behaviour change) and say so.
3. **Visual check — needs a running app, likely on Nathan's PC** (`device_bash` may be
   unreachable this session; if so, list this as pending and Nathan does it):
   - live route map: gates are white, route line and tier colours (purple / green / neutral)
     unchanged;
   - gate-adjust / nudge card: gates white there too (if it draws them);
   - a leg of each tier still renders its own colour — no regression from the token addition.
   - one screenshot of each view goes in the report.
4. Commit only after 1–2 pass: `app: render gate markers white (theme.white token)`, ending
   with the attribution lines from the session reminder. One commit, this change only — do not
   combine with `BRIEF-live-self-racing.md`'s commit even if both are executed the same session.

## Report back

Plain text, no summary file. Include:

- the actual gate geometry/shape as rendered (Point circle? symbol? line?) — Nathan decides
  separately whether he wants tick-lines like the marketing render;
- what the `colour` property encoded before the change, with `file:line`;
- every file:line changed, and the token name used;
- tsc and test output (pass/fail counts), commit hash;
- visual-check status: done (with screenshots) or pending-on-Nathan's-PC;
- any legibility concern against the basemap (white on light tiles), stated, not fixed;
- anything you stopped on, quoted verbatim.
