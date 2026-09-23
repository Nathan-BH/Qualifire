# brandmark — sound design

Two sub-scenes, mirroring `../../silent-studio/brandmark/`: `opening/` (the teaser's
intro lockup) and `closing/` (the sign-off lockup). Each has its own `soundtrack.py`
and rounds, same shape as any other scene folder — see `../structure.md`.

Both share a **brand chime** defined once in `../synth.py` (`BRAND_CHIME_RISE` /
`BRAND_CHIME_LAND`) so the sound itself, not just the visual, is recognizably the
same brand across opening, closing, and the teaser's own bookends. Since cycle
16 (opening soundv3) the opening no longer uses the synthesised brand chime/stinger at all
— it is Nathan's Tunetank piano logo recording end to end (see `opening/README.md`); the
shared chime stays in `synth.py` for the earlier rounds only — no new round uses it
(Nathan, 2026-09-23). Closing's soundv3 (cycle 16) is silent: no synthesised sound moves forward and no cycle-16 recording fits 4.0 s.

| Sub-scene | Status | Feedback goes to |
|---|---|---|
| [opening/](opening/README.md) | in progress — soundv3 | `opening/soundv3/FEEDBACK.md` |
| [closing/](closing/README.md) | soundv3 — silent round (cycle 16) | `closing/soundv3/FEEDBACK.md` |
