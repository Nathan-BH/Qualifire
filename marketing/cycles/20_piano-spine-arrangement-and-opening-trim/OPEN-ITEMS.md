# Cycle 20 — open items

## Blocker

Nothing in this cycle has been rendered. `npx.cmd hyperframes render` / `render.ps1`
need npm, and neither the cloud sandbox nor the device_bash VM can reach the npm
registry (confirmed: 403 from the proxy on `registry.npmjs.org`). Everything below
needs Nathan's own PC.

## 1. Render + rebuild (do these in order)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\opening -Render
```

Then:
- Copy the new render into `all-renders\` — check both `silent-studio\all-renders\`
  and `audio-studio\all-renders\` (see `silent-studio/structure.md`'s all-renders
  section) so the silent and with-sound "current" sets don't drift apart.
- Update/rebuild `teaser/rounds/v9/concat.txt` (or cut a v10) with the new 6.2s
  opening, and re-concatenate the full teaser (47.3s total now, down from 47.6s).
- Re-run `tools/teaser-lanes/prep_kit.py` so the teaser-lanes kit matches the new
  video. The two `rides-options/*.json` files assume this new, shorter video —
  opened against today's kit they'll read 0.3s off past the opening until this runs.

## 2. Decision needed: push button/click timing closer to the original 6.3s/8.7s targets?

Current result after the opening cut: button-appear 7.4s, click 9.4s (targets were
6.3s / 8.7s).

Getting closer needs a second, separate edit to `start-ride/index.html` — shrinking
its own internal "blank lead-in" (currently `tl.shiftChildren(1.0, true)` plus a
0.4s blackout hold + 0.6s reveal, 1.0s total before the button starts appearing).
This is bigger than it looks: shrinking that lead-in doesn't just move the button
earlier, it shortens start-ride's *own total duration* by the same amount — which
would cascade a **second time** through gates-saving, ranking, and closing (on top
of the -0.3s cascade already applied from the opening cut), meaning another full
re-shift pass on the gate-chime and piano-restart timings in both rides-options files.

Measured options (`S` = the new blank-lead-in length, replacing today's 1.0s;
hold:reveal kept at today's 0.4:0.6 ratio):

| S (new lead-in) | button-appear | click | scene shortens by | extra cascade needed |
|---|---|---|---|---|
| 1.0s (today, unchanged) | 7.4s | 9.4s | — | none |
| 0.3s | 6.7s | **8.7s (exact)** | 0.7s | yes — full re-shift pass again |
| 0.2s | 6.6s | 8.6s | 0.8s | yes — full re-shift pass again |
| 0s (removes the blackout/reveal beat entirely) | **6.4s** | 8.4s | 1.0s | yes — full re-shift pass again |

None of these are free: each trades the current soft 1.0s fade-up from black for a
shorter one (down to none at S=0, a hard cut instead), and each requires redoing the
-0.3s cascade math on top of whatever new amount gets cut. `S=0.3` lands the click
exactly on 8.7s and gets button-appear to within 0.4s of target (vs. today's 1.1s
off) — the best single trade if it's worth pushing further. Whether the tighter sync
is worth a visibly shorter reveal and another cascade pass is Nathan's call. Not done
pending that call.

## 3. Your turn: pick between the two Rides options

`rides-options/option-A-piano-then-bed.json` (piano + all four B-stems together) vs.
`option-B-piano-plus-stems.json` (piano looped + strings/drums/bass, no "other").
Open both in `tools/teaser-lanes/teaser-lanes.html` once the kit is rebuilt (item 1
above) and say which one, or what to blend from each.

## 4. Future round, not committed to

Gate-crossing chimes (currently at 24.30 / 26.31 / 28.15 / 30.01 / 31.88s) aren't
aligned to the piano's ~2.45s note spacing. Feasible to tighten in a later pass;
explicitly deferred, not part of this cycle.

## Leave feedback

Per-beat listening feedback on the rides options, the opening trim, and the button
timing goes in `audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md`,
this folder's existing convention.
