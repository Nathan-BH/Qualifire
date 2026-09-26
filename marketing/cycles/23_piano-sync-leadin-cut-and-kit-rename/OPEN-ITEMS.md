> 2026-09-26: cycle 24 (studio-folders restructure) ran, but the `audio-studio/teaser/arrangements/...`
paths this file references below did NOT move — the move was blocked by a Windows permission error.
No action needed on this file's own commands; see ../24_studio-folders-restructure/OPEN-ITEMS.md,
"Cycle 23 (piano-sync) paths that changed" and "Escalations", for the full story.

# Cycle 23 — open items

**Steps 1-4 are DONE (2026-09-26)** -- Nathan rendered, the render was found in
`teaser-full/renders/teaser-full_2026-09-26_13-15-48.mp4` (confirmed 46.5s/1395 frames via
ffprobe, matching this cycle's edit exactly), copied to `all-renders/teaser-full_v2.mp4`
(md5 `a454b2a525a41cd9495221d6cfce3d8b`), added to `prep_kit.py`, and built as **kitv3**
(`PREP OK`, all checks pass, listed as the new default in `kits.json`). Steps below are
left as a record of what ran; only step 5 (listening) is still yours.

## 1. Render the updated composition

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File ".\render.ps1" -Name teaser-full -Render
```

This renders `teaser-full\` (root + its 5 `compositions\*.html`, now carrying the
0.2s lead-in and the -0.8s cascade) to a fresh MP4 — 46.5s / 1395 frames, down
from 47.3s / 1419. `render.ps1` prints where the new file lands (a `render\`
folder under `teaser-full\`).

## 2. Copy it into all-renders as the new version

```powershell
Copy-Item -Path "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full\render\teaser-full.mp4" -Destination "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\all-renders\teaser-full_v2.mp4"
```

(Adjust the source filename to whatever `render.ps1` actually printed if it
differs — it names the output after the composition folder.) Leave
`teaser-full_v1.mp4` in place, same "don't overwrite, compare side by side"
convention cycle 21 used.

## 3. Add the new video to prep_kit.py, then build kitv3

Get the new file's MD5 first:

```powershell
Get-FileHash -Algorithm MD5 "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\all-renders\teaser-full_v2.mp4"
```

Then in `marketing\audio-studio\tools\teaser-lanes\prep_kit.py`, add this entry to
the `VIDEOS` dict (right after `"teaser-full_v1"`), filling in the hash from the
command above:

```python
    "teaser-full_v2": dict(
        kit_dir="kitv3", kit_id="teaser-full-v2",
        source="marketing/silent-studio/all-renders/teaser-full_v2.mp4",
        md5="<PASTE THE HASH HERE, LOWERCASE>",
        frames=1395, proxy="teaser-full_v2-proxy.mp4",
        ride_offset_s=6.2, opening_len_s=6.2,
        extra_notes=[
            "Cycle 23: start-ride's blank lead-in cut 1.0s->0.2s so the button/click land on the "
            "piano's own note onsets (button-appear 6.6s, click 8.6s = the 4th onset exactly). "
            "Everything from start-ride onward is 0.8s earlier than teaser-full_v1's kit (kitv2). "
            "Default clips here are the same provisional placeholder chain as kitv2, just "
            "re-cascaded -- the rides-options A/B pick (cycle 20 OPEN-ITEMS #3) is still open.",
        ],
    ),
```

Then build it:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes"
python prep_kit.py teaser-full_v2
```

This writes `kitv3\manifest.json` + `kitv3\prep-report.txt`. Check the report for
`PREP OK` and no alignment-guard surprises, same as every prior kit build.

## 4. List kitv3 in the picker

Add it to `marketing\audio-studio\tools\teaser-lanes\kits.json`:

```json
{
  "format": "teaser-lanes-kits",
  "version": 1,
  "default": "kitv3",
  "kits": [
    { "dir": "kitv3", "label": "kitv3 -- teaser-full v2 \u00b7 46.5 s (piano-synced, default)" },
    { "dir": "kitv2", "label": "kitv2 -- teaser-full v1 \u00b7 47.3 s" },
    { "dir": "kitv1", "label": "kitv1 -- teaser v9 \u00b7 47.6 s (old concat teaser)" }
  ]
}
```

(Making kitv3 default is a suggestion, not done for you here — flip `"default"`
back to `"kitv2"` if you'd rather keep comparing side by side first.)

## 5. Look at it

Open `teaser-lanes.html` (or `serve.ps1`), pick kitv3, and either **Open
arrangement** on one of the already-recascaded
`audio-studio/teaser/arrangements/arrangement_v1/rides-options/option-{A,B}.json`
files, or just scrub to 6.6s / 8.6s and confirm the button-appear/click land where
you expect against the piano.

## 6. Still open from before (unrelated to this cycle, not touched)

- Cycle 20 `OPEN-ITEMS.md` #3: rides-section A vs B pick, still yours.
- Cycle 20 `OPEN-ITEMS.md` #4: gate-crossing chimes not yet aligned to the piano's
  ~2.45s note spacing — explicitly deferred, still deferred.
- Cycle 21's item (b): the gates-saving/ranking gate-position mismatch, pre-existing,
  untouched.

## Leave feedback

Per-beat listening feedback goes in
`audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md`, this project's
existing convention — including whether 6.6s reads as close enough to the 3rd
note (6.15s) or whether you'd rather trade the soft reveal for a harder cut
(S=0, button 6.4s) to tighten that one further.
