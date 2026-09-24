# Cycle 17 — av-align UI: fixes still to do after Inspect (written 2026-09-24)

Self-contained hand-off: a fresh chat can pick this up without the original conversation.
Read `BRIEF-av-align-ui-redesign.md` first (spec, palette, hard constraints). This file is
the addendum: what the executor built, what a fresh Opus Inspect found, what remains.

## State on disk

- `marketing/audio-studio/tools/av-align/av-align.html` — restyled (Resolve-style: top bar,
  viewer + transport, right inspector, bottom timeline dock, status bar; dark palette).
  md5 `a0faf5b80c72e418878dfb210a151eaf`, 75,234 B, 1,236 lines, LF, no BOM.
- `README.md` (same folder) md5 `0e08fc6c4a3871ff70c55ff23b3b12f7`.
- `av-align.test.mjs` unchanged; `node av-align.test.mjs` → 36/36 ALL PASS (run on the PC).
- Nothing committed. The redesign itself PASSED Inspect on behaviour (Save-copy round trip,
  60-frame check, nudges, markers, presets, 0 console errors, no page scroll at 1440/1920,
  no horizontal overflow at 1100). Verdict: **PASS with fixes** — the defects below.
- The ride row in the README/preset expects `marketing/silent-studio/all-renders/ride_v1.mp4`.
  That file EXISTS now (item A2 landed), so the README should say it exists, not "created by A2".

## Hard constraints (unchanged)

Single offline file: no external URLs/CDN/fonts, no `xmlns` in SVG icons, no `<link>`, no
`<script src>`; < 120 KB; LF, no BOM; `av-core` script byte-identical to the original; every
JS-relied id kept; Save copy on a clean page byte-identical (files named as in the config);
one changed line after a −1f nudge; `node av-align.test.mjs` 36/36.
Tools: files live on Nathan's PC (`device_bash`, node v22, no Chromium); visual checks need
the cloud container (stage the html, Playwright Chromium at /opt/pw-browsers, do NOT run
`playwright install`; VP9 webm + click wav made with ffmpeg; h264 can't be decoded there).

## Defects to fix (from the Opus Inspect)

1. **(minor, keyboard)** Clicking the already-selected placement card leaves focus on its
   hidden radio; then Left/Right/Space/`,`/`.` do nothing, and Left/Right switch the nudge
   target to T2 (the "do not nudge" placement), after which `.` moves T2. Blur the radio on
   click and never let arrow keys change the target; the target changes only by deliberate
   card click/activation.
2. **(minor)** Icon buttons keep focus after a mouse click (blur-on-click checks
   `e.target.tagName === "BUTTON"`, but the click lands on the inner svg). Use
   `e.target.closest("button")` (transport, play, `?`, file chips).
3. **(cosmetic, brief's Inspect list)** Timeline marker labels overlap near the right edge when
   a label is flipped left of its line (no room check): 1920 "finish pulse" under "video
   ends"; 1100 "gate 3 pulse" under "finish pulse"; 200% zoom "rider stops" under "ride-2
   start pulse". Room-check flipped labels too; drop what does not fit (it stays in the
   Markers tab).
4. **(cosmetic)** Marker time inputs too narrow at 1440 for 4 decimals (show 13.80 / 3.200).
5. **(cosmetic)** Placements list cut through the middle of a card with no scroll hint (with the
   banner, the T2 `at` field is sliced). Add a visible scroll affordance, snap to whole cards,
   guarantee at least one full card + nudge row visible.
6. **(cosmetic)** Timeline text collisions: a lane line runs through "Load audio to see the
   waveform" (empty state); "0.00 s" collides with the "attack" label on the opening preset;
   marker flags cover ruler labels (e.g. 0:04).
7. **(minor)** "config replaced" warning banner never disappears (even after switching back),
   has no close button, costs ~30 px of video. Add ×; auto-clear when the config matches
   the preset again.
8. **(minor)** Status bar can contradict the file chips after a preset switch (status says
   "video opening_v3.mp4" while the chip says ride_v1.mp4 is loaded). Word preset switches as
   expectations ("preset opening expects video … + audio …; loaded: <chips>").
9. **(minor)** Onsets tab at 1440 needs sideways scrolling to reach the T2 column and go
   buttons and shows ~2 rows with settings open. Make the table fit (compact columns / go
   buttons first / sliders in a popover — simplest).
10. **(cosmetic, contrast)** Text-field borders use the hairline colour (1.3–1.5:1); use the
    defined stronger border token (≥ 3:1) for input/select edges.
11. **(docs)** README "How to use" steps 2, 3, 5 still describe the old Video/Audio buttons,
    old checkbox wording and the "config box"; rewrite to the real UI. Ride row: file exists now.

## Re-verify after the fixes

`node av-align.test.mjs` 36/36; Save-copy round trip + one-line diff; the 60-frame readout
check; add assertions for fixes 1, 2, 3 (no overlapping label rects at 1100/1440/1920 and
200% zoom with a 26.3 s video), 7, 8; retake screenshots (empty, ride preset with the 26.3 s
video, opening preset, nudged/dirty, help overlay at 1440x900, 1920x1080, 1100x800) and LOOK at
them; write the final file to the PC with matching md5 on both sides. Then a fresh Opus
Inspect pass (read-only) on the result.

## Not verifiable in the container (Nathan checks in his own Chrome/Edge)

Real audio, real-time sync feel, scrub sound, h264 mp4 decoding, Windows fonts (Segoe UI /
Cascadia), Save copy landing in Downloads, real drag-and-drop.

## Reference material

The UI research (reference tools, palette/WCAG, wireframe) was written to this session's
temporary workspace; a copy is `av-align-ui-research.md` in this folder if present. The
inspect screenshots were temporary and are gone with the session: retake them.
