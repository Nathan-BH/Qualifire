# start-ride — soundv4

**Render:** start-ride_v4_with_sound_v4.mp4 — `start-ride_v4.mp4` (14.0s) with this
round's audio muxed on.
**Also here:** `soundtrack_v4.wav` — the audio alone.
**Source video:** `../../../silent-studio/all-renders/start-ride_v4.mp4` (14.0s, silent)
**Built:** 2026-09-19
**Previous round:** `../soundv3/FEEDBACK.md` — **superseded, built on a misread of the
brief** (used the full held bass alone; Nathan corrected: he meant the *treble* voice
that isn't the repeated E5 pulse, with the bass always underneath, not standing alone).

## What this is

Corrected per Nathan: "only the rightmost notes, the ones close to A4/E5... for the
start-ride, only use the track A4,A4,B4,B4..." plus a follow-up: "the leftmost bass
tones (F2,G2) track is always on on both versions."

So this is two layers of `../../piano/projects/interstellar/soundtrack.py`'s note data,
mixed together:

- **The held bass** (F2 -> G2 -> A2 -> G2, same as soundv3) — always on, per Nathan.
- **Voice A**: the melody's *other* voice — the slower-moving line that isn't the
  repeated E5 (A4, A4, B4, B4, C5, D5-grace, C5, D5, D5) — this scene's actual assignment.
  The steady E5 pulse itself goes to gates-saving instead, see `../../gates-saving/soundv4/`.

Both trimmed to the video's 14.0s with a 0.4s fade-out (voice A's last D5, started
13.85s, would naturally run to ~14.47s — cut short by the fade like soundv3's bass was).

## What to listen for

- Whether bass + voice A together read as "a piece" or just two things happening at once
  — they were never composed to go together, just extracted from the same score.
- Whether the fade at 14.0s loses anything noticeable from voice A's last note.

## Nathan's feedback
<!-- write your notes below -->
