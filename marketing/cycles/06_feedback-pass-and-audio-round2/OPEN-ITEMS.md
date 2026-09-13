# Cycle 06 — open items

## Status: everything rendered, muxed, and assembled — nothing left blocking

All three compositions are rendered, `teaser_v6.mp4` is built and confirmed at
47.6s, and both teasers (with and without audio) now exist. What's left is
review (yours) and cleanup (also yours — `device_bash` was unreachable all
session, so nothing here could move or delete files on your PC).

### What got rendered/built (all confirmed by actual ffprobe, not estimates)
| Composition | Render | Duration |
|---|---|---|
| gates-saving | `gates-saving/rounds/v5/gates-saving_v5.mp4` | 12.3s |
| ranking | `ranking/rounds/v5/ranking_v5.mp4` | 10.8s |
| brandmark/closing | `brandmark/closing/rounds/v3/closing_v3.mp4` | 4.0s |
| teaser (silent) | `teaser/rounds/v6/teaser_v6.mp4` | 47.6s |

(gates-saving's duration was originally documented here as 12.4s — that was a
doc typo on my part, not a real change; fixed everywhere once the actual
render confirmed 12.3s.)

### What got muxed with audio this cycle (all in `audio-studio/all-renders/`)
| File | Audio round |
|---|---|
| `opening_v3_with_sound_v2.mp4` | `brandmark/opening/soundv2` |
| `start-ride_v4_with_sound_v2.mp4` | `start-ride/soundv2` |
| `gates-saving_v5_with_sound_v3.mp4` | `gates-saving/soundv3` (re-muxed onto the new v5 render — same audio, timing was unchanged) |
| `ranking_v5_with_sound_v2.mp4` | `ranking/soundv2` (new droplet crescendo, now muxed onto the real v5 render) |
| `closing_v3_with_sound_v2.mp4` | `brandmark/closing/soundv2` (full two-beat BRAND_STINGER, now muxed onto the real v3 render) |
| `teaser_v6_with_sound_v2.mp4` | `audio-studio/teaser/soundv2` — a full rebuild of the teaser's independent composition, retimed to 47.6s and echoing each scene's current sound at the exact right instant (see `audio-studio/teaser/soundv2/FEEDBACK.md`) |

This is the literal "update both teasers, with and without audio" ask —
`teaser/rounds/v6/teaser_v6.mp4` (silent) and
`audio-studio/all-renders/teaser_v6_with_sound_v2.mp4` (with audio) are both
current.

### Leave feedback
For every rendered scene and the teaser, drop notes in its `rounds/vN/FEEDBACK.md`
(video) or `soundvN/FEEDBACK.md` (audio) the same way as before.

## Cleanup you'll need to do by hand (can't delete or move this session)

**`audio-studio/all-renders/` — superseded "with sound" files, safe to delete
once you've confirmed the new versions look right:**
- `opening_v3_with_sound_v1.mp4` — superseded by `opening_v3_with_sound_v2.mp4`
- `start-ride_v4_with_sound_v1.mp4` — superseded by `start-ride_v4_with_sound_v2.mp4`
- `gates-saving_v4_with_sound_v2.mp4` — superseded by `gates-saving_v5_with_sound_v3.mp4`
- `gates-saving_v4_with_sound_v3.mp4` — superseded by `gates-saving_v5_with_sound_v3.mp4` (same audio, newer video)
- `ranking_v4_with_sound_v1.mp4` — superseded by `ranking_v5_with_sound_v2.mp4`
- `closing_v2_with_sound_v1.mp4` — superseded by `closing_v3_with_sound_v2.mp4`
- `teaser_v5_with_sound_v1.mp4` — superseded by `teaser_v6_with_sound_v2.mp4`

Left alone (untouched this cycle): `colours_v2_with_sound_v1.mp4`.

**Each composition's own `renders/` folder — raw render.ps1 output, not the
`rounds/vN/` copies (those are permanent history, never cleaned up).** These
accumulate every timestamped render and are now genuinely cluttered — you
asked about this directly: yes, the non-audio (silent) renders are superseded
here too, just in a different place than the with-sound ones above:
- `gates-saving/renders/`: 4 old renders (`..._2026-09-10_15-09-40.mp4` through
  `..._2026-09-10_23-56-00.mp4`) are superseded by the one now copied into
  `rounds/v5/` (`..._2026-09-14_00-24-17.mp4`).
- `ranking/renders/`: same pattern, 4 old (`2026-09-10` dated) superseded by
  `..._2026-09-14_00-30-36.mp4`.
- `brandmark/closing/renders/`: 1 old (`..._2026-09-10_23-53-37.mp4`)
  superseded by `..._2026-09-14_00-31-41.mp4`.

Move the superseded ones to `safe_to_delete/` per the project's never-delete
rule (I can't do this myself — `mv` needs a shell on your PC, which was down
all session).

**Note on what's** ***not*** **superseded:** `rounds/vN/` folders (every
composition's, including gates-saving's old v1-v4, ranking's v1-v4, closing's
v1-v2) are permanent history by convention — nothing to clean up there, ever.

## Judgment calls flagged for your review (from the individual FEEDBACK.md files, consolidated here)
- **gates-saving/soundv3**: whether the 165→210bpm "boost" actually reads as
  Mario Kart star-power rather than just faster/busier; whether reusing
  start-ride's exact chord set back-to-back feels connected or repetitive.
- **start-ride/soundv2**: whether 155bpm + this chord set reads as "Mario Kart"
  enough; the bridging riser (3.4-5.3s) wasn't explicitly asked for — flag if it
  feels unnecessary; ending on a full resolve chime now that the ride is
  musically linked to gates-saving's boosted continuation.
- **brandmark/opening/soundv2**: whether the ring-draw pitch sweep reads as "the
  logo being drawn" (first use of this technique); whether the two-beat stinger's
  0.4s gap actually lands as "Netflix-like."
- **brandmark/closing/soundv2**: whether reusing the *exact* same stinger (not a
  variation) reads as closing the loop, or feels repetitive this close to opening
  in a short teaser — now that it's actually muxed onto the real v3 render.
- **ranking/soundv2**: whether the droplet run (9 drops, A3→~G6, ratio 0.82) reads
  as "droplet crescendo"; whether the purple landing chime at 5.4s carries enough
  weight as the arrival moment — now that it's actually muxed onto the real v5 render.
- **hyperframes/ranking v5**: Inspect flagged the STEP_DOWN transitions are
  centered on each row-crossing point (start = crossing − duration/2) rather than
  starting exactly at the crossing — a definition nuance, not a bug; worth a look
  now that it's rendered.
- **teaser/soundv2**: the start-ride section's hush (6.6-9.7s) uses a very quiet
  trailing pad rather than true silence, unlike the standalone scene's actual
  zero-amplitude hush — a deliberate compromise so the "one continuous piece"
  doesn't drop out mid-teaser; flag if it should go all the way to silence
  instead. Also flag general balance across the full 47.6s — built and
  level-checked in isolation, not yet heard back-to-back against picture at
  full length.

## Doc-only nits not fixed this cycle (cosmetic, low priority)
- `gates-saving/README.md` and `ranking/README.md`'s "Feedback rounds" tables and
  top-line `Duration:` still stop at v3 (10.0s / 14.8s) — don't reflect v5's new
  round or the actual confirmed durations (12.3s / 10.8s). `brandmark/closing/README.md`'s
  table stops at v2.
- `hyperframes/teaser/README.md` — not checked this cycle, may still describe v5
  as the current cut.
- None of these affect rendering or Nathan-visible behaviour — left for a future
  pass rather than spending more mechanical-edit budget on them now.
