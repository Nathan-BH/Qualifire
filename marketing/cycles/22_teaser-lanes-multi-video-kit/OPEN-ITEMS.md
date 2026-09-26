# Cycle 22 — OPEN ITEMS

## Blocking items found by the executor — RESOLVED via `RULING-v1.md`
Both items below were genuine brief-internal contradictions (confirmed by a fresh-context Fable ruling, not
misreadings). `RULING-v1.md` gives the exact, verified-working resolution for each; both have now been applied to
`teaser-lanes.html`, `tests/e2e-served.mjs` was written and passes (18/18), and the full §8 checklist passes
end to end — see the "RESUMED after RULING-v1" section of `EXECUTOR-REPORT-v1.md`. Kept below for the record.

1. **§5.4 `fetchKitEntries` vs §7.3's synthetic-kit test scenario are mutually incompatible as literally
   specified.** `fetchKitEntries` (brief §5.4, implemented verbatim) throws on ANY non-ok fetch, including a
   single missing per-track file, aborting the whole served-mode load with an error status. But §7.3 requires
   serving "a copy of the synthetic kit" (from `tests/synthetic-kit.mjs`, unmodified) and reaching
   `ready · 5 lanes` via auto-load — and that synthetic kit deliberately omits `b-drums.wav` on disk (confirmed
   by running `synthetic-kit.mjs`: it writes only `logo.wav`, `bed.wav`, `a-strings.wav`, `e5.wav`, `video.webm`,
   `manifest.json`; console says "b-drums.wav deliberately absent"). Fetching it over HTTP 404s, `fetchKitEntries`
   throws, and the served page never reaches "ready" — so the test as specified in §7.3 cannot pass against the
   fetchKitEntries code as specified in §5.4. By contrast, the existing file:// path (`openKit`/`fromInput`)
   tolerates a missing per-track file gracefully (marks that one lane `status: "missing"`, still reaches
   `ready · N lanes`) — `fetchKitEntries` does not mirror that. Resolving this means deciding served-mode's
   missing-file behavior (e.g. treat a per-track 404 as "missing" like the file:// path, only the manifest fetch
   is hard-required), which is a product decision the executor did not make on its own.
   **Resolved by `RULING-v1.md` Ruling 1**: only `manifest.json`'s fetch is hard-required; any other kit file's
   404 leaves it out of `entries` so `openKit` treats it exactly like a picked folder missing that file. Applied to
   `fetchKitEntries`; `tests/e2e-served.mjs` written per §7.3 + Ruling 1's two amendments (favicon 204, allow-listed
   console errors) — 18/18 checks pass, §8 row 8 now run.

2. **The literal §5.3 `HOWTO[0]` replacement text breaks the protected test `tests/e2e.mjs`, which §10 says must
   not change and §0 rule 5 says must still fully pass.** Verified by running `node tests/e2e.mjs tests/out/synkit
   tests/out/e2e`: 389/390 checks pass; the one failure is
   `1440x900 how-to full text shown iff the viewport is at least 1440x900 [shown: false]`. Root cause (confirmed
   by reading `fitHowto()`): the new `HOWTO[0]` text is much longer than the original, so the full how-to block's
   `scrollHeight` now exceeds its `clientHeight` at 1440x900, and `fitHowto()` falls back to the short "press ? for
   the how-to" hint even though the viewport meets the stated "at least 1440x900" threshold. `HOWTO[0]` was
   implemented exactly as given in §5.3 and was NOT shortened or reworked by the executor, since doing so (or
   changing the howto container's CSS, or changing the protected test) is a design call outside the executor's
   authority per §0 rule 1.
   **Resolved by `RULING-v1.md` Ruling 2**: a shorter `HOWTO[0]` string (verified by Fable to fit at 1440x900 and
   to pass `tests/e2e.mjs` at 390/390). Applied verbatim; re-run confirms `node tests/e2e.mjs` → `ALL PASS: 390/390`.

## Documentation-only discrepancy (not blocking, noted for the record)
3. **§7.1's "Expected total: 218 + 15 = 233 passing" does not match its own literal code block**, which contains
   13 new assertions (1 `ok` + 7 `throwsWith` + 2 `eq` + 3 more `ok`), not 15. Implemented the code block verbatim;
   actual, verified result is `ALL PASS: 231/231` (both on the device VM and in the cloud sandbox).

## Only-Nathan checks (his own Chrome/Edge on Windows)
- `serve.ps1` on his PC: Python on PATH, port 8765 free, the browser opens, the default kit (`kit-teaser-full/`)
  auto-loads, the header menu switches kits, and the last-picked kit is remembered on reload.
- The h264 proxy video decodes and plays for both kits on his machine (the cloud tests used VP9 webm stand-ins).
- The new kit's default state sounds like the shipped ride sound, shifted to the new picture (logo 0–6.2 s,
  bed/stems at 10.0 s and 22.74 s, E5 pulses at 24.0 s).
- Opening cycle 20's `option-A-piano-then-bed.json` / `option-B-piano-plus-stems.json` on the new kit: confirm no
  "made for a different video" note appears (they were re-stamped for teaser-full this cycle) and the clip timing
  looks right.

## Day render note
`marketing/silent-studio/teaser-full/renders/teaser-full_2026-09-26_09-39-29.mp4` is the day render (frame mean
luma ≈ 250/255) but was not renamed `_day` by `render.ps1` (its rename step needs exactly one new mp4 in the
folder, and there were two). It is not used anywhere in this cycle. Renaming it to
`teaser-full_2026-09-26_09-39-29_day.mp4` is a one-line move for Nathan when he wants it — not done here.

## The calls in BRIEF-v1.md §12 (verbatim, for Nathan)
1. **How "pre-load as default" should feel** — served (zero-click) vs double-click (one click + folder dialog).
   Both are shipped; default implemented: both documented, double-click first. Question: should served mode become
   *the* way you open the tool (README leads with it), or stay a side option?
2. **Remembered pick vs fixed default in served mode** — the kit menu remembers your last pick in that browser;
   `kits.json`'s default only applies on first load (or after clearing site data). Default implemented: remembered
   pick. Alternative: always load `kit-teaser-full` on open, ignoring the last pick.
3. **Re-stamping cycle 20's two option files** — done this cycle (see EXECUTOR-REPORT-v1.md): `kit` and
   `video` header fields re-stamped to `teaser-full` / `teaser-full_v1.mp4` / 47.3 s / 1419 frames; clip timing
   numbers and all other content untouched. This removes the "made for a different video" note without deciding
   the A/B pick itself.
4. **Opening soundtrack for the 6.2 s opening** — `brandmark/opening/soundv3` is 6.5 s; the new kit's logo clip
   just ends at 6.2 s with the same 0.5 s fade. A re-cut of the opening's own sound is a separate, later item —
   flagged, not scheduled, not touched this cycle.

## Cycle 20 OPEN-ITEMS #3 (rides A/B pick)
Still open. Pointer only — see `marketing/cycles/20_.../OPEN-ITEMS.md` (unchanged by this cycle).
