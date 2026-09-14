# Verdict — `guides/VIDEO-EDITING-GUIDE.md` vs `silent-studio/COMMANDS.md`

**Type:** analysis, not an execution brief. Two small doc fixes fall out of it; they are
folded into `BRIEF-daynight-renders.md` §3e because that brief edits `COMMANDS.md`
anyway. **Status:** verdict final; fixes briefed, not executed.

## Nathan's question

> "check what the differences are between the marketing/guides/VIDEO-EDITING-GUIDE.md
> and the marketing/silent-studio/COMMANDS.md files and which one is actually more
> useful right now? i thought the commands file was more recent?"

## The two files

| | `guides/VIDEO-EDITING-GUIDE.md` | `silent-studio/COMMANDS.md` |
|---|---|---|
| Size / length | 16,768 B, 270 lines | 4,945 B, 117 lines |
| mtime (2026-09-14 check) | 2026-09-14 (cycle-07 path rewrite touched it); self-dated **"Written 2026-09-09 after you watched the first teaser render"** | **2026-09-14 14:06** — the most recently edited file in the whole `marketing/` read-pass |
| What it is | Answers four questions you asked once: can I get Inkscape-like control, what free editor, how do we split work, is editing like PowerPoint. Recommends DaVinci Resolve (free) for footage pieces, CapCut as fallback, explains HyperFrames-as-editable-code for graphics pieces. | Copy-paste PowerShell: execution-policy bypass, `render.ps1 -Name … [-Render]`, basemap capture + copy loop for the three map scenes, scaffolding a new composition, checkpoint-then-experiment in Studio, why double-clicking `index.html` does nothing. |
| Audience moment | Read once, when deciding tools and workflow. | Open every time you sit down to render. |
| Paths | All `marketing/silent-studio/…` — current. | All `marketing/silent-studio/…` — current. |
| Content currency | Current. Nothing in it has been superseded (Resolve/CapCut facts were checked 2026-09-09; the HyperFrames workflow description still matches `structure.md`). | **Two stale spots** (details below). |

## Verdict

1. **They are not competing versions of the same document.** One is strategic ("what
   software, how do we collaborate"), the other tactical ("what do I type"). Recency is
   not the axis — you were right that COMMANDS.md is more recent, and it is also the one
   you reach for day-to-day, but VIDEO-EDITING-GUIDE.md is not made stale by that; it
   answered a different question and still answers it correctly.
2. **More useful right now: `COMMANDS.md`** — it is the operational path to every
   render, and the day/night work in this cycle adds to it. Keep it as the living
   cheat-sheet.
3. **Keep `VIDEO-EDITING-GUIDE.md` as-is** as a one-time reference. It will only become
   relevant again when a footage-based video (its "ideas 5 and 7") starts. No edit
   needed.
4. **But COMMANDS.md is content-stale in two places** — the cycle-07 rename fixed its
   *paths* and deliberately left composition *names* for a later pass
   (`structure.md` line 91: "update `render.ps1` help text and any `gate`/`purple`/`tour`
   references in `COMMANDS.md` / `STUDIO-GUIDE.md`"):
   - Lines 18–38, section "Any composition — teaser, gate, purple, tour": `gate`,
     `purple`, `tour` are legacy names (`structure.md` legacy table); `tour/` no longer
     exists at all. Running `render.ps1 -Name gate` today errors with "Could not find
     the 'gate' composition folder". Fix: retitle and use `gates-saving`, `colours`,
     `brandmark\opening`.
   - Line 64: "Copy the finished MP4s to `<scene>\rounds\v2\<scene>_v2.mp4`" — rounds
     are at v4 (start-ride), v5 (gates-saving, ranking), v6 (teaser). Fix: "to
     `<scene>\rounds\vN\` (next free N)".
   `STUDIO-GUIDE.md` was grepped too: no `gate`/`purple`/`tour` occurrences; it is clean.
   `render.ps1`'s own comment help (lines 17, 26–29) still says `gate`/`purple`/`tour`;
   same fix, same brief.

## Optional cross-pointer (ruled: yes, one line each)

Worth doing since the two files get confused: add to the top of `COMMANDS.md` (after
line 4) — "For the *why* and the tool choices (Resolve, CapCut, how we split footage
work), see `../guides/VIDEO-EDITING-GUIDE.md`; this file is only the commands." — and
to `VIDEO-EDITING-GUIDE.md` line 5 area — "For the current copy-paste render commands
see `../silent-studio/COMMANDS.md`." Two lines, no pipeline needed; ride along with the
COMMANDS.md edit in `BRIEF-daynight-renders.md` §3e.

## Evidence used

- `device_list_dir` mtimes, 2026-09-14: `COMMANDS.md` 1789370394728 ms (14:06 UTC),
  `VIDEO-EDITING-GUIDE.md` 1789370394293 ms (same cycle-07 rewrite pass), the guide's
  own line 3 self-date 2026-09-09.
- `grep -n -i "gate\b|purple|tour\b|rounds\\v" COMMANDS.md STUDIO-GUIDE.md VIDEO-EDITING-GUIDE.md`
  — hits only in COMMANDS.md (lines 18, 26, 29, 32, 64) and `render.ps1` help text; the
  guide's "Gate bumper"/"Gate sting" mentions (lines 175, 185, 201) refer to the video
  *idea*, not the folder, and are fine.
