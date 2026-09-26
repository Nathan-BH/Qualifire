#!/usr/bin/env python3
"""
apply_v2_edits.py -- marketing cycle 24 v2 (2026-09-26): every content edit for
  (1) the tool rename  marketing/audio-studio/tools/teaser-lanes/ -> .../tools/videotrack-mapper/
  (2) the move         marketing/audio-studio/teaser/arrangements/ -> .../tools/videotrack-mapper/arrangements/
Written by the Plan tier (Opus) for BRIEF-v2.md. Dry-run tested by Plan on a copy of the repo before handoff.

Run from the repo root, AFTER the git mv steps of BRIEF-v2.md section 2 have all succeeded:

  python3 marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py code          # tool + docs
  python3 marketing/cycles/24_studio-folders-restructure/apply_v2_edits.py cycle-docs    # cycle 24 OPEN-ITEMS/README (only after verification passes)

Add --check to compute and verify everything without writing anything. --root DIR runs against another tree.

Safety: every replacement asserts its exact expected occurrence count, and every file asserts its final count of
"teaser-lanes" (and a few other strings). ALL files are computed in memory first; if ANY assertion fails, the script
prints every failure, writes NOTHING, and exits 1. Files are read and written as UTF-8 with newline='' so line
endings are preserved byte for byte.
"""
import os
import sys

T = "marketing/audio-studio/tools/videotrack-mapper"
A = T + "/arrangements"
C24 = "marketing/cycles/24_studio-folders-restructure"


def R(old, new, count):
    return ("replace", old, new, count)


def INS_AFTER(anchor, text):
    """Insert text right after the (unique) anchor."""
    return ("replace", anchor, anchor + text, 1)


def INS_BEFORE(anchor, text):
    """Insert text right before the (unique) anchor."""
    return ("replace", anchor, text + anchor, 1)


def FINAL(substring, count):
    return ("final", substring, None, count)


# ------------------------------------------------------------------------------------------------------------------
# Phase "code": the tool, its tests, the arrangement data files, and the live docs that point at them.
# ------------------------------------------------------------------------------------------------------------------
CODE = {
    # ---------------- the page ----------------
    T + "/videotrack-mapper.html": [
        R("<title>Teaser sound lanes</title>", "<title>Videotrack mapper</title>", 1),
        R("<h1>Teaser sound lanes</h1>", "<h1>Videotrack mapper</h1>", 1),
        R("Evaluated by teaser-lanes.test.mjs", "Evaluated by videotrack-mapper.test.mjs", 1),
        # copy-list header (first line of what "Copy list" puts on the clipboard)
        R('["teaser-lanes · " + v.file', '["videotrack-mapper · " + v.file', 1),
        # localStorage key for remembered clips/mutes: new prefix + a read-only legacy key
        R('  const stateKey = manifest => "teaser-lanes:" + manifest.kit + ":" + manifest.video.file + ":" + manifest.tracks.map(t => t.id).join(",");\n',
          '  const stateKey = manifest => "videotrack-mapper:" + manifest.kit + ":" + manifest.video.file + ":" + manifest.tracks.map(t => t.id).join(",");\n'
          '  // Key this browser used before the 2026-09-26 rename (the tool was "teaser-lanes"): read as a fallback so remembered clips/mutes survive it; never written.\n'
          '  const legacyStateKey = manifest => "teaser-lanes:" + manifest.kit + ":" + manifest.video.file + ":" + manifest.tracks.map(t => t.id).join(",");\n', 1),
        R('buildState, stateKey, serializeState, restoreState,', 'buildState, stateKey, legacyStateKey, serializeState, restoreState,', 1),
        # kits.json format tag (kits.json ships with the tool and is changed in the same pass: no legacy tag)
        R('m.format !== "teaser-lanes-kits" || m.version !== 1) throw new Error("kits.json: format must be teaser-lanes-kits version 1");',
          'm.format !== "videotrack-mapper-kits" || m.version !== 1) throw new Error("kits.json: format must be videotrack-mapper-kits version 1");', 1),
        # arrangement format tag: write the new one, still accept the old one
        R('  const ARRANGEMENT_FORMAT = "teaser-lanes-arrangement"; // version 1\n',
          '  const ARRANGEMENT_FORMAT = "videotrack-mapper-arrangement"; // version 1\n'
          '  const LEGACY_ARRANGEMENT_FORMAT = "teaser-lanes-arrangement"; // tag written before the 2026-09-26 rename: still opened, never written\n', 1),
        R(r'if (obj.format !== ARRANGEMENT_FORMAT) throw new Error("not a teaser-lanes arrangement (expected \"format\": \"teaser-lanes-arrangement\")");',
          r'if (obj.format !== ARRANGEMENT_FORMAT && obj.format !== LEGACY_ARRANGEMENT_FORMAT) throw new Error("not a videotrack-mapper arrangement (expected \"format\": \"videotrack-mapper-arrangement\")");', 1),
        # restore: new key first, then the pre-rename key
        R('const saved = store.get(C.stateKey(manifest));',
          'const saved = store.get(C.stateKey(manifest)) || store.get(C.legacyStateKey(manifest));', 1),
        # Reset to defaults must clear BOTH keys, or a reload would bring the legacy state back
        R('store.del(C.stateKey(S.manifest));',
          'store.del(C.stateKey(S.manifest)); store.del(C.legacyStateKey(S.manifest));', 2),
        # served-mode kit pick
        R('store.set("teaser-lanes:kit-pick", sel.value)', 'store.set("videotrack-mapper:kit-pick", sel.value)', 1),
        R('const remembered = store.get("teaser-lanes:kit-pick");',
          'const remembered = store.get("videotrack-mapper:kit-pick") || store.get("teaser-lanes:kit-pick"); // second key = the one used before the 2026-09-26 rename, read-only fallback', 1),
        # save status message
        R('move it into teaser/arrangements/");', 'move it into this tool\'s arrangements/ folder");', 1),
        FINAL("teaser-lanes", 4),          # legacy comment, legacyStateKey, LEGACY_ARRANGEMENT_FORMAT, kit-pick fallback
        FINAL("teaser/arrangements", 0),
        FINAL("Teaser sound lanes", 0),
        FINAL("\r", 0),
    ],
    # ---------------- unit tests ----------------
    T + "/videotrack-mapper.test.mjs": [
        R("teaser-lanes.test.mjs", "videotrack-mapper.test.mjs", 2),
        R("teaser-lanes.html", "videotrack-mapper.html", 2),
        R('"teaser-lanes · ', '"videotrack-mapper · ', 3),
        R('"teaser-lanes:teaser-lanes:video.webm:logo,bed,a-strings,b-drums,e5");\n',
          '"videotrack-mapper:teaser-lanes:video.webm:logo,bed,a-strings,b-drums,e5");\n'
          '  ok("legacyStateKey (pre-rename key, read-only fallback)", C.legacyStateKey(man) === "teaser-lanes:teaser-lanes:video.webm:logo,bed,a-strings,b-drums,e5");\n', 1),
        R(r"<title>Teaser sound lanes<\/title>", r"<title>Videotrack mapper<\/title>", 1),
        R("not a teaser-lanes arrangement", "not a videotrack-mapper arrangement", 1),
        R("teaser-lanes-arrangement", "videotrack-mapper-arrangement", 9),
        R("teaser-lanes-kits", "videotrack-mapper-kits", 6),
        # new cases, inserted AFTER the global tag replacement above so the legacy literal survives
        INS_BEFORE("  throwsWith(\"parseArrangementJson: '{' not valid JSON\"",
                   '  ok("parseArrangementJson: legacy \\"teaser-lanes-arrangement\\" tag (pre-2026-09-26 files) still opens", (() => { try { return C.parseArrangementJson({ format: "teaser-lanes-arrangement", version: 1, clips: [{ track: "bed", in: 0, out: 1, at: 0 }] }).clips.length === 1; } catch (e) { return false; } })());\n'
                   '  ok("ARRANGEMENT_FORMAT (the tag Save writes) is videotrack-mapper-arrangement", C.ARRANGEMENT_FORMAT === "videotrack-mapper-arrangement");\n'),
        # left on purpose: kitv1's kit id "teaser-lanes" in synthetic manifests, fixture checks and formatArrangementJson calls
        FINAL("teaser-lanes", 13),
        FINAL("\r", 0),
    ],
    T + "/tests/convert-arrangement.mjs": [
        R("teaser-lanes.html", "videotrack-mapper.html", 2),
        FINAL("teaser-lanes", 0),
    ],
    T + "/tests/e2e.mjs": [
        R("teaser-lanes.html", "videotrack-mapper.html", 2),
        R('"teaser-lanes · ', '"videotrack-mapper · ', 2),
        R("not a teaser-lanes arrangement", "not a videotrack-mapper arrangement", 1),
        R("teaser-lanes-arrangement", "videotrack-mapper-arrangement", 3),
        FINAL("teaser-lanes", 2),          # "kit": "teaser-lanes" in LITERAL_4_1, kit: "teaser-lanes" in the ghost file
    ],
    T + "/tests/e2e-real.mjs": [
        R("teaser-lanes.html", "videotrack-mapper.html", 1),
        R('"teaser-lanes · ', '"videotrack-mapper · ', 1),
        R("teaser-lanes-arrangement", "videotrack-mapper-arrangement", 1),
        FINAL("teaser-lanes", 1),          # TABLE key = kitv1's manifest.kit
    ],
    T + "/tests/e2e-served.mjs": [
        R("teaser-lanes-served-", "videotrack-mapper-served-", 1),
        R("teaser-lanes.html", "videotrack-mapper.html", 6),
        R("teaser-lanes-kits", "videotrack-mapper-kits", 1),
        R('"teaser-lanes · ', '"videotrack-mapper · ', 1),
        R("teaser-lanes:kit-pick", "videotrack-mapper:kit-pick", 2),
        FINAL("teaser-lanes", 2),          # "kit: teaser-lanes · video.webm" (#kit-info shows the synthetic kit's id) x2
    ],
    T + "/tests/mutants-open.mjs": [
        # O6 anchor must match the page's new format-check line exactly once
        R(r"""    find: 'if (obj.format !== ARRANGEMENT_FORMAT) throw new Error("not a teaser-lanes arrangement (expected \\"format\\": \\"teaser-lanes-arrangement\\")");',""",
          r"""    find: 'if (obj.format !== ARRANGEMENT_FORMAT && obj.format !== LEGACY_ARRANGEMENT_FORMAT) throw new Error("not a videotrack-mapper arrangement (expected \\"format\\": \\"videotrack-mapper-arrangement\\")");',""", 1),
        R(r"""    replace: 'if (false && obj.format !== ARRANGEMENT_FORMAT) throw new Error("not a teaser-lanes arrangement (expected \\"format\\": \\"teaser-lanes-arrangement\\")");' },""",
          r"""    replace: 'if (false && obj.format !== ARRANGEMENT_FORMAT && obj.format !== LEGACY_ARRANGEMENT_FORMAT) throw new Error("not a videotrack-mapper arrangement (expected \\"format\\": \\"videotrack-mapper-arrangement\\")");' },""", 1),
        R("teaser-lanes.html", "videotrack-mapper.html", 3),
        R("teaser-lanes.test.mjs", "videotrack-mapper.test.mjs", 6),
        FINAL("teaser-lanes", 0),
    ],
    T + "/tests/synthetic-kit.mjs": [
        FINAL("teaser-lanes", 1),          # kit id only; file not edited
    ],
    T + "/tests/fixtures/arrangement_v1.json": [
        R('"format": "teaser-lanes-arrangement",', '"format": "videotrack-mapper-arrangement",', 1),
        FINAL("teaser-lanes", 1),          # "kit": "teaser-lanes"
    ],
    T + "/kits.json": [
        R('"format": "teaser-lanes-kits",', '"format": "videotrack-mapper-kits",', 1),
        FINAL("teaser-lanes", 0),
    ],
    T + "/serve.ps1": [
        R("teaser-lanes", "videotrack-mapper", 4),   # incl. the functional $url = ".../teaser-lanes.html"
        FINAL("videotrack-mapper.html", 2),
    ],
    T + "/verify_default_mix.py": [
        R("teaser-lanes", "videotrack-mapper", 1),
    ],
    T + "/prep_kit.py": [
        R("builds tools/teaser-lanes/kitv1/, kitv2/ (or a future kitv3/) for teaser-lanes.html",
          "builds tools/videotrack-mapper/kitv1/, kitv2/ (or a future kitv3/) for videotrack-mapper.html", 1),
        R("cd marketing/audio-studio/tools/teaser-lanes && python3 prep_kit.py",
          "cd marketing/audio-studio/tools/videotrack-mapper && python3 prep_kit.py", 1),
        # THE functional line (kitv3's default arrangement). Nathan approved this edit in conversation, 2026-09-26.
        R('default_arrangement="marketing/audio-studio/teaser/arrangements/arrangement_v2/arrangement_v2.json",',
          'default_arrangement="marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v2/arrangement_v2.json",', 1),
        FINAL('kit_dir="kitv1", kit_id="teaser-lanes",', 1),   # kept on purpose
        FINAL('kit_id="teaser-full",', 1),
        FINAL('kit_id="teaser-full-v2",', 1),
        FINAL("teaser-lanes", 1),
        FINAL("teaser/arrangements", 2),   # the two extra_notes provenance strings (audit trail, not edited)
    ],
    T + "/README.md": [
        R("# teaser-lanes: sound lanes for the silent teaser (cycle 19; multi-video kit picker, cycle 22)",
          '# videotrack-mapper: a video render and its sound lanes on one playhead (cycle 19 as "teaser-lanes"; multi-video kit picker, cycle 22; renamed 2026-09-26)', 1),
        R("One page, `teaser-lanes.html`.", "One page, `videotrack-mapper.html`.", 1),
        INS_AFTER("piano-note-synced re-render -- will be `kitv3`, whatever the underlying video ends up being called.\n",
                  "\n"
                  "Added 2026-09-26 (marketing cycle 24 v2): this tool was called `teaser-lanes` (page `teaser-lanes.html`)\n"
                  "until today; older cycle folders and notes use that name. Arrangement files now live next to it in\n"
                  "`arrangements/` (moved from `audio-studio/teaser/arrangements/`; see `arrangements/README.md`). Save writes\n"
                  "`\"format\": \"videotrack-mapper-arrangement\"`; files with the old `teaser-lanes-arrangement` tag still open, and\n"
                  "clips/mutes a browser remembered under the old name are still found. `kitv1`'s internal kit id stays\n"
                  "`teaser-lanes` on purpose: it names that kit (stamped into its manifest, `arrangement_v1.json` and the tests),\n"
                  "not the tool.\n"),
        R("double-click `teaser-lanes.html`", "double-click `videotrack-mapper.html`", 1),
        R("keep it in `audio-studio/teaser/arrangements/<version>/` (a 2026-09-26 cycle-24 move to `teaser-full/arrangements/`\n"
          "   was planned but is currently blocked by a Windows permission error — see cycle 24's OPEN-ITEMS.md).",
          "keep it in `arrangements/<version>/` in this folder (updated 2026-09-26, cycle 24 v2: moved here from\n"
          "   `audio-studio/teaser/arrangements/`).", 1),
        R("`cd marketing/audio-studio/tools/teaser-lanes && python prep_kit.py", "`cd marketing/audio-studio/tools/videotrack-mapper && python prep_kit.py", 1),
        R("`node teaser-lanes.test.mjs`", "`node videotrack-mapper.test.mjs`", 1),
        FINAL("teaser-lanes", 5),          # title "(cycle 19 as ...)" + dated paragraph: old name, old page, legacy tag, kitv1 id
        FINAL("teaser/arrangements", 2),
    ],
    # ---------------- arrangement data files (format tag only; notes/kit fields untouched) ----------------
    A + "/arrangement_v1/arrangement_v1.json": [
        R('"format": "teaser-lanes-arrangement",', '"format": "videotrack-mapper-arrangement",', 1),
        FINAL("teaser-lanes", 1),          # "kit": "teaser-lanes" (kitv1's id)
    ],
    A + "/arrangement_v2/arrangement_v2.json": [
        R('"format": "teaser-lanes-arrangement",', '"format": "videotrack-mapper-arrangement",', 1),
        FINAL("teaser-lanes", 0),
    ],
    A + "/arrangement_v1/rides-options/option-A-piano-then-bed.json": [
        R('"format": "teaser-lanes-arrangement",', '"format": "videotrack-mapper-arrangement",', 1),
        FINAL("teaser-lanes", 2),          # dated provenance inside "note" (not edited)
    ],
    A + "/arrangement_v1/rides-options/option-B-piano-plus-stems.json": [
        R('"format": "teaser-lanes-arrangement",', '"format": "videotrack-mapper-arrangement",', 1),
        FINAL("teaser-lanes", 2),
    ],
    # ---------------- arrangement docs ----------------
    A + "/README.md": [
        INS_AFTER("# teaser arrangements\n",
                  "\n"
                  "> Moved 2026-09-26 (marketing cycle 24 v2) from `audio-studio/teaser/arrangements/` into the tool folder\n"
                  "> `audio-studio/tools/videotrack-mapper/` (the tool was renamed from `teaser-lanes` the same day). Relative links\n"
                  "> below were updated for the new location; dated rows keep the names they were written with.\n"),
        R("made by hand in `../../tools/teaser-lanes/`", "made by hand in `../` (the `videotrack-mapper` tool folder this one sits in)", 1),
        R("a built round would be a later `../soundvN/` folder", "a built round would be a later `../../../teaser-full/soundvN/` folder (not created yet)", 1),
        R("In `../../tools/teaser-lanes/teaser-lanes.html`, open the kit", "In `../videotrack-mapper.html`, open the kit", 1),
        R("made from the .txt by `tools/teaser-lanes/tests/convert-arrangement.mjs`, nothing edited.",
          "made from the .txt by `tools/teaser-lanes/tests/convert-arrangement.mjs` (now `../tests/convert-arrangement.mjs`), nothing edited.", 1),
        FINAL("teaser-lanes", 2),          # the banner + the dated provenance row
    ],
    A + "/arrangement_v1/FEEDBACK-v1.md": [
        INS_AFTER("# FEEDBACK-v1 — teaser arrangement, response to IDEA-v1.md\n",
                  "\n"
                  "> Note added 2026-09-26 (marketing cycle 24 v2): the tool this file calls `teaser-lanes` is now\n"
                  "> `audio-studio/tools/videotrack-mapper/` (page `videotrack-mapper.html`), and this `arrangements/` folder now lives\n"
                  "> inside it. Everything below is left exactly as written on its own dates; paths in it (e.g. `tools/teaser-lanes/kit/`,\n"
                  "> `brandmark/opening`) are as they were then.\n"),
    ],
    A + "/arrangement_v1/rides-options/README.md": [
        R("open `tools/teaser-lanes/teaser-lanes.html`, load the kit",
          "open `tools/videotrack-mapper/videotrack-mapper.html` (renamed 2026-09-26 from `tools/teaser-lanes/teaser-lanes.html`), load the kit", 1),
        FINAL("teaser-lanes", 2),
    ],
    # ---------------- external live docs ----------------
    "marketing/audio-studio/APPROACH.md": [
        R("Current workflow: tools/teaser-lanes/ — see structure.md.",
          "Current workflow: tools/videotrack-mapper/ (named teaser-lanes until 2026-09-26, cycle 24 v2) — see structure.md.", 1),
        FINAL("teaser-lanes", 1),
    ],
    "marketing/audio-studio/structure.md": [
        INS_AFTER("is archived at ../archive/pre-teaser-full-studios/audio-studio/structure.md.\n",
                  "\n"
                  "> Updated 2026-09-26 (cycle 24 v2): the sound tool `tools/teaser-lanes/` was renamed `tools/videotrack-mapper/` and\n"
                  "> `teaser/arrangements/` moved inside it; paths below are updated.\n"),
        R("happens in `tools/teaser-lanes/teaser-lanes.html` (video left, nine", "happens in `tools/videotrack-mapper/videotrack-mapper.html` (video left, nine", 1),
        R("`tools/teaser-lanes/kitvN/`, numbered by build iteration, built by `tools/teaser-lanes/prep_kit.py`",
          "`tools/videotrack-mapper/kitvN/`, numbered by build iteration, built by `tools/videotrack-mapper/prep_kit.py`", 1),
        R("See `tools/teaser-lanes/README.md` for the", "See `tools/videotrack-mapper/README.md` for the", 1),
        R("`teaser/arrangements/arrangement_vN/` (planned move to `teaser-full/arrangements/` on 2026-09-26,\n"
          "cycle 24, blocked by a Windows permission error — see `../cycles/24_studio-folders-restructure/OPEN-ITEMS.md`,\n"
          "\"Escalations\", before retrying). A built sound round",
          "`tools/videotrack-mapper/arrangements/arrangement_vN/`, inside the tool that opens and saves them (moved there on\n"
          "2026-09-26, cycle 24 v2, from `teaser/arrangements/`; see `../cycles/24_studio-folders-restructure/BRIEF-v2.md`).\n"
          "A built sound round", 1),
        FINAL("teaser-lanes", 1),
    ],
    "marketing/silent-studio/structure.md": [
        R("`teaser-lanes`'s `kitv1` is built from it.",
          "`videotrack-mapper`'s `kitv1` is built from it (tool named `teaser-lanes` until 2026-09-26).", 1),
        FINAL("teaser-lanes", 1),
    ],
}

# ------------------------------------------------------------------------------------------------------------------
# Phase "cycle-docs": cycle 24's own OPEN-ITEMS.md and README.md. Run ONLY after BRIEF-v2 section 6 verification passed.
# ------------------------------------------------------------------------------------------------------------------
CYCLE_DOCS = {
    C24 + "/OPEN-ITEMS.md": [
        # §1 smoke-check: live copy-paste command + the "Open arrangement" pointer
        R('cd "C:\\Users\\natha\\Claude personal projects\\Qualifire\\marketing\\audio-studio\\tools\\teaser-lanes"',
          'cd "C:\\Users\\natha\\Claude personal projects\\Qualifire\\marketing\\audio-studio\\tools\\videotrack-mapper"', 1),
        R("Then **Open arrangement** from `marketing\\audio-studio\\teaser\\arrangements\\arrangement_v1\\` — **note:\n"
          "this is still the OLD path**, see the Escalations entry below; it was not moved to\n"
          "`teaser-full\\arrangements\\` this cycle.\n",
          "Then **Open arrangement** from `marketing\\audio-studio\\tools\\videotrack-mapper\\arrangements\\arrangement_v1\\`\n"
          "(updated 2026-09-26, cycle 24 v2: tool renamed from `teaser-lanes`, arrangements moved inside it — see the resolved\n"
          "Escalations entry below).\n", 1),
        # §2: dated follow-up paragraph (original text kept)
        INS_AFTER("`kits.json` steps are unaffected either way.\n",
                  "\n"
                  "**Update 2026-09-26 (cycle 24 v2):** these paths DID change now — `FEEDBACK-v1.md` and `rides-options/` are at\n"
                  "`marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v1/`. Cycle 23's own files are historical\n"
                  "and were not edited: read their `audio-studio/teaser/arrangements/…` and `tools/teaser-lanes/…` paths as\n"
                  "`audio-studio/tools/videotrack-mapper/arrangements/…` and `audio-studio/tools/videotrack-mapper/…`.\n"),
        # §3: dated addition to the stale-reference list
        INS_BEFORE("## Escalations (for a fresh Opus ruling)\n",
                   "Added 2026-09-26 (cycle 24 v2 — `teaser-lanes` -> `videotrack-mapper` rename + arrangements move), left as is on\n"
                   "purpose:\n"
                   "\n"
                   "- `silent-studio/scenes/opening/index.html` ~line 107 and `teaser-full/compositions/opening.html` ~line 92: comment\n"
                   "  says \"the teaser-lanes arrangement's …\" — same generated-composition rule as the ~99/~84 item above (fix both\n"
                   "  together in the later cycle that re-runs the build). That ~99/~84 `FEEDBACK-v1.md` path is now one move further\n"
                   "  off (real path: `audio-studio/tools/videotrack-mapper/arrangements/arrangement_v1/FEEDBACK-v1.md`).\n"
                   "- `silent-studio/teaser-full/index.html` ~line 46: dated 2026-09-26 comment ends \"see teaser-lanes/README.md\"\n"
                   "  (render source, comment only, dated narrative).\n"
                   "- `silent-studio/teaser-full/rounds/v1/FEEDBACK.md` line 6: round-v1 record naming\n"
                   "  `audio-studio/tools/teaser-lanes/kit-teaser-full/` (historical; that kit is `kitv2/` since cycle 23).\n"
                   "- `tools/videotrack-mapper/prep_kit.py` kitv3 `extra_notes` (~lines 74-75): provenance strings still say\n"
                   "  `audio-studio/teaser/arrangements/…` (audit trail). The functional `default_arrangement` line WAS updated, and\n"
                   "  the note prep_kit.py generates from it prints the real path. `kitv3/manifest.json` + `prep-report.txt`\n"
                   "  (generated, git-ignored) show the old path until kitv3 is next rebuilt.\n"
                   "- `kitv1`'s kit id stays `teaser-lanes` (prep_kit.py `kit_id`, `kitv1/manifest.json`, `arrangement_v1.json`'s\n"
                   "  `\"kit\"`, the tests' synthetic manifests/tables): it names that kit, not the tool. Renaming it would orphan\n"
                   "  kitv1's remembered browser state and make `arrangement_v1.json` open with a \"made for kit …\" note.\n"
                   "- `arrangements/arrangement_v1/FEEDBACK-v1.md` body, `arrangement_v1.txt` (Nathan's verbatim paste; its tool\n"
                   "  fixture copy too) and the `note` fields of the two `rides-options/*.json`: dated/verbatim records; only a dated\n"
                   "  banner was added to FEEDBACK-v1.md.\n"
                   "- The tool's unit suite already had 2 FAILs before v2 (`kits.json in the tool folder parses and defaults to\n"
                   "  kit-teaser-full`, `html: HOWTO entry 1 names both kits`): stale expectations from cycle 23's kit rename, not\n"
                   "  touched by v2. The page's HOWTO entry 1 also still calls kitv2 the default (kits.json defaults to kitv3).\n"
                   "- Root `02-commit-cycle22.ps1`, `07-batch-commit-template.ps1`, `POWERSHELL-SCRIPTS-README.md`,\n"
                   "  `SCRIPTS-QUICK-REFERENCE.txt` (and their `Claude outputs/` copies) name `22_teaser-lanes-multi-video-kit` —\n"
                   "  correct, that cycle folder keeps its name.\n"
                   "\n"),
        # Escalation 1: status line under the heading + a resolution block at its end (history above it untouched)
        INS_AFTER("**1. Row 39 — `mv` failed with Windows `Permission denied`. Corrected after Inspect (Opus) review: do NOT just retry this.**\n",
                  "\n"
                  "**Status: RESOLVED 2026-09-26 (cycle 24 v2) — see \"Resolution\" at the end of this entry. Everything between here\n"
                  "and it is the v1 record, kept as written.**\n"),
        INS_BEFORE("## Nits (found by Inspect, not fixed live — low priority, next pass)\n",
                   "- **Resolution (2026-09-26, cycle 24 v2 — `BRIEF-v2.md`, `EXECUTOR-REPORT-v2.md`):** landed, with a **different\n"
                   "  destination** than this entry and BRIEF-v1 row 39 planned. Nathan, in conversation the same day: keep the\n"
                   "  arrangements with the tool that opens and saves them instead of in `audio-studio/teaser-full/arrangements/`,\n"
                   "  and rename the tool — \"teaser-lanes\" does not say what it does (load a video render + a kit + an arrangement\n"
                   "  together to review and scrub) — to **`videotrack-mapper`** (his final decision). So:\n"
                   "  `marketing/audio-studio/tools/teaser-lanes/` -> `marketing/audio-studio/tools/videotrack-mapper/` (page\n"
                   "  `videotrack-mapper.html`, unit tests `videotrack-mapper.test.mjs`), and `marketing/audio-studio/teaser/arrangements/`\n"
                   "  -> `marketing/audio-studio/tools/videotrack-mapper/arrangements/`. `marketing/audio-studio/teaser/` is gone (row\n"
                   "  40 done by the same move). `teaser-full/arrangements/` is superseded and will not be created.\n"
                   "- **`prep_kit.py` was edited with Nathan's explicit approval** (given in conversation, 2026-09-26 — condition (b)\n"
                   "  above): the one functional line, kitv3's `default_arrangement` (line 77; Inspect's \"75/77\" — line 75 is an\n"
                   "  `extra_notes` provenance string, left as is), now reads\n"
                   "  `marketing/audio-studio/tools/videotrack-mapper/arrangements/arrangement_v2/arrangement_v2.json`.\n"
                   "- **Condition (a), cycle 25:** when the move ran, `cycles/25_rides-ranking-arrangement-v3/` held only\n"
                   "  `questionsfornathan.md` with both answers blank, no `arrangement_v3` existed, and nothing under `arrangements/`\n"
                   "  had changed in the preceding 30 minutes (checked; see EXECUTOR-REPORT-v2), so no cycle-25 work was mid-write.\n"
                   "  When cycle 25 builds arrangement v3 it must read `option-A-piano-then-bed.json` from, and write\n"
                   "  `arrangement_v3/` into, `marketing/audio-studio/tools/videotrack-mapper/arrangements/`.\n"
                   "- Arrangement files are now tagged `\"format\": \"videotrack-mapper-arrangement\"`. The page still opens files with the\n"
                   "  old `teaser-lanes-arrangement` tag, and still finds clips/mutes and the kit pick a browser remembered under the\n"
                   "  old `teaser-lanes:` keys (Reset to defaults clears both).\n"
                   "\n"),
    ],
    C24 + "/README.md": [
        INS_AFTER("| Inspect | Opus | | |\n",
                  "\n"
                  "## Addendum v2 (2026-09-26): tool renamed `videotrack-mapper`, arrangements moved inside it\n"
                  "\n"
                  "Resolves rows 39/40 with a destination Nathan chose after v1 ran: `audio-studio/tools/teaser-lanes/` ->\n"
                  "`audio-studio/tools/videotrack-mapper/`, and `audio-studio/teaser/arrangements/` ->\n"
                  "`audio-studio/tools/videotrack-mapper/arrangements/` (not `teaser-full/arrangements/`). Rows 39/40 in the §5 table\n"
                  "above keep their v1 status as the record of v1; the \"Why\" and \"What stayed\" sections above use the tool's name at\n"
                  "the time, `teaser-lanes`. See `BRIEF-v2.md` (plan), `apply_v2_edits.py` (the scripted content edits),\n"
                  "`EXECUTOR-REPORT-v2.md` (what was done) and `OPEN-ITEMS.md` \"Escalations\" 1 (resolution).\n"
                  "\n"
                  "| tier | model | tokens | outcome |\n"
                  "|---|---|---|---|\n"
                  "| Digest (v2) | Haiku | | inventory of `teaser-lanes` references |\n"
                  "| Plan (v2) | Opus | | BRIEF-v2.md + apply_v2_edits.py |\n"
                  "| Execute (v2) | Sonnet | | see EXECUTOR-REPORT-v2.md |\n"
                  "| Inspect (v2) | Opus | | |\n"),
    ],
}


def run(spec, root, write):
    failures, results = [], {}
    for rel, ops in spec.items():
        path = os.path.join(root, rel)
        if not os.path.isfile(path):
            failures.append("%s: FILE NOT FOUND" % rel)
            continue
        with open(path, encoding="utf-8", newline="") as f:
            text = f.read()
        orig = text
        for kind, a, b, n in ops:
            if kind == "replace":
                got = text.count(a)
                if got != n:
                    failures.append("%s: expected %d x %r, found %d" % (rel, n, a[:90], got))
                    continue
                text = text.replace(a, b)
            else:
                got = text.count(a)
                if got != n:
                    failures.append("%s: FINAL expected %d x %r, found %d" % (rel, n, a, got))
        if text != orig:
            results[path] = text
    if failures:
        print("NOT WRITTEN -- %d assertion failure(s):" % len(failures))
        for x in failures:
            print("  " + x)
        return 1
    for path, text in results.items():
        if write:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(text)
        print(("edited  " if write else "would edit  ") + os.path.relpath(path, root))
    print("OK: %d file(s) %s, all counts as expected" % (len(results), "written" if write else "checked (--check, nothing written)"))
    return 0


if __name__ == "__main__":
    args = sys.argv[1:]
    write = "--check" not in args
    root = "."
    if "--root" in args:
        root = args[args.index("--root") + 1]
    if "code" in args:
        sys.exit(run(CODE, root, write))
    if "cycle-docs" in args:
        sys.exit(run(CYCLE_DOCS, root, write))
    print(__doc__)
    sys.exit(2)
