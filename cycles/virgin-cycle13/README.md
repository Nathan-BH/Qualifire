# virgin-cycle13 — live-map + RIDES polish

Small on-device polish tasks from the same chat, logged as separate files per task
(Nathan's request -- no new cycle number per task, just separate docs here):

- `self-dot-tuning.md` -- live-racing openmap: self-dot radius, own-dot opacity, plus the
  reasoning behind the finished-dot fade and the fastest-on-top stacking.
- `record-no-sport-copy.md` -- RECORD screen's zero-sports state: dropped the explanatory
  body sentence, button now reads as normal RECORD with a "no sport selected" subtext.
- `rides-no-way-naming.md` -- RIDES: a ride that's actually a route's reference now shows
  `"<way> — ref"` instead of "no way — recorded only", and a free/unmatched ride falls back
  to its own START pick (`"<from> → <to>"`, e.g. `new → new`) instead of the same generic
  text. Fixes the underlying "reference ride stuck unmatched forever" gap, not just wording.

`COMMANDS.md` in this folder covers all three -- same checks, same OTA publish path
(`publish-preview.cmd`, JS-only, no new build for any of them).
