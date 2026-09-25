# EXECUTOR-REPORT — open/save arrangement (2026-09-25) — Phases A-E complete, ALL PASS

Executor: Sonnet, this session (a fresh executor; the prior session that wrote the stub below no longer exists).
No commits. Nothing deleted. Files touched: only the three folders the brief allows.

## Starting condition (verified before touching anything)

A prior executor on this exact task had stopped in Phase A over a real signature gap (no file edited; see the
superseded stub content preserved in git history / `RULINGS-3.md`'s quoted STOP). Fable ruled on it (`RULINGS-3.md`,
2026-09-25): `formatArrangementJson(state, kit, meta)` takes the loaded manifest's `kit` string as an explicit second
argument, and corrected 11 places in `BRIEF-open-arrangement.md` in place (tagged `«Ruling 3, 2026-09-25»`).

Before doing any work, I read `RULINGS-3.md`, the corrected `BRIEF-open-arrangement.md` in full, the required
sections of `BRIEF-teaser-sound-lanes.md` (§1, §5, §6.5, §7, §8, §10), `RULINGS-1.md`, `RULINGS-2.md` (rulings 1, 5,
8), and the prior stub `EXECUTOR-REPORT-open-arrangement.md`. I then re-verified everything myself rather than
trusting that stub or the ruling's summary:

- **The tool folder already contained a complete, correct implementation of Phases A-C**, landed by a process I
  did not run (file mtimes ~22:26 UTC on 2026-09-24, after the ruling at 22:17 and after the stub at 22:13 — some
  other run picked this up, finished A-C, and its own report was never written). This is not something the brief
  anticipated, so I verified it line-by-line against the brief rather than assuming it was right:
  - `teaser-lanes.html` (md5 `bfb1b7e1c4966273b7bb2f145a6e64dc`, 1553 lines, 81,583 bytes): every §3 anchor present
    (topbar CSS, the two buttons after `btn-copy`, `#btn-undo` after `btn-reset`, `#arr-input` after `kit-input`,
    the core block, the export line, HOWTO's new 8th entry verbatim, `S.undo: null`, `renderStatus`'s undo line,
    `changed()`'s `S.undo = null;` first statement, `setEnabled`'s id list, the after-load enables, the drop
    handler placed before `fromDrop`, `openArrangementFile`/`saveArrangement`/`undoLast`/`restoreSerialized`, and
    the wiring) — all read and compared to §4.1-§4.5 word for word; `formatArrangementJson(state, kit, meta)`
    correctly takes `kit` as the second argument, sourced only from `S.manifest.kit` at the one call site
    (`saveArrangement`), never from `state`. No CRLF, no BOM, no external URLs, page 81,583 bytes (< 160 KB).
  - `teaser-lanes.test.mjs` (md5 `46602e5fda69b0332c33dacc67e468a9`): `node teaser-lanes.test.mjs` →
    **`ALL PASS: 208/208 passed`** (142 + 66 new cases; state N=66, more than the brief's rough "about 50" but
    that was only an estimate). Includes the exact §5.8 round-trip literal check and the §5.9 `kit: undefined`
    writes `"kit": ""` case.
  - `tests/convert-arrangement.mjs`, `tests/fixtures/{arrangement_v1.txt,arrangement_v1.json,manifest-real.json,
    syn.txt}`, and `teaser/arrangements/arrangement_v1/arrangement_v1.json`: every md5 matches the brief's target
    exactly — `arrangement_v1.txt` `64d40cbf90e5a97b498dc55ea1d61794` (both copies, byte-identical to the original),
    `arrangement_v1.json` `ddc156dd39e341b3e41937ba50a82fdb` (both copies, == the brief's §4.2 literal), manifest
    `e1233d06c9b3449466eefd14e67ce149`. `syn.txt` matches §6.1's literal exactly.
  - `tools/av-align/{README.md,av-align.html,av-align.test.mjs}`: md5s `0e08fc6c4a3871ff70c55ff23b3b12f7`,
    `a0faf5b80c72e418878dfb210a151eaf`, `c0b5d4a579a67886ce7ead2eb076b57f` — all three unchanged, as required.
  - `tests/e2e.mjs`, `tests/e2e-real.mjs` and `tests/mutants-open.mjs` had **not** been touched (no `arr-input`/
    `btn-open-arr` references; `mutants-open.mjs` did not exist), and the tool `README.md` / `teaser/arrangements/
    README.md` had **not** been updated. So Phase D and Phase E were the real remaining work, which is what this
    report covers in detail.

No anchor mismatch, no ambiguity, and no failing check turned up anywhere in that verification — so there was
nothing to STOP on; I proceeded to finish the brief.

## Phase D — browser tests and mutation check (cloud container)

### `tests/e2e.mjs` (synthetic kit)
Added, all guarded to the 1440x900 pass except the dedicated 1100x800 screenshot context (§6.2's "unless said"
scoping): empty-state button-disabled checks and a synthetic-drop-before-a-kit check (A); enabled-after-load check
(B); open `syn.txt` via the file input, then Undo, then `+`/Delete sanity, then re-open via a **real synthetic
`DataTransfer`+`File` "drop" event** dispatched with `page.dispatchEvent(sel, "drop", { dataTransfer })` (both drop
attempts genuinely worked in this Chromium — `dataTransfer.files` was populated, so no "not testable" fallback was
needed; logged as a PASS either way, per §9's rule that a failed synthetic drop is a note, never a FAIL), Save
(byte-for-byte against the §4.1 literal after normalizing `created`), re-opening the download (renamed from
Playwright's random temp filename back to its `suggestedFilename()` first, matching what actually lands in
Nathan's Downloads folder), five corrupt-file cases (`garbage.txt`, `empty.json`, `wrongtag.json`, `badclip.json`)
plus `ghost.json` (opens with 0 kept, 1 dropped) and its Undo, then reload persistence and Reset (C-I); a separate
1100x800 context that loads the kit, opens `syn.txt`, screenshots `arr-1100x800.png`, and re-runs the no-overlap
check with `#topbar`/`#status` added to the box set (J).

Command: `node tests/synthetic-kit.mjs /tmp/synkit && node tests/e2e.mjs /tmp/synkit /tmp/e2eout`
Result: **`ALL PASS: 365/365 checks`** (322 baseline + 43 new). Zero console/page errors at every viewport.
One bug I introduced and fixed during this phase: my first version of the "re-open the download" check compared
the status message against `arrangement_YYYYMMDD-HHMM.json`, but Playwright saves a download under a random temp
filename, so `file.name` in the app was that random name, not the suggested one — 1 FAIL. Fixed by copying the
downloaded bytes to a file named with `dl.suggestedFilename()` before feeding it to `#arr-input`. Re-ran: 365/365.

### `tests/e2e-real.mjs` (copy of the real kit)
Built the real-kit copy in the cloud container: staged the 9 real kit WAVs (bed, a-strings, a-other, b-piano,
b-drums, b-bass, b-other, e5, logo — ≈ 42.5 MB total) and `kit/manifest.json`, patched `video.file` to
`"video.webm"`, and generated a synthetic 47.6 s / 1428-frame VP9 `video.webm` stand-in with ffmpeg (verified
frame count with ffprobe: 1428). Added, gated to the `1440x900` pass only, right after the existing default-list
check and before the bed/A-swap test (so it does not disturb that test's assumed default-mute state): open
`tests/fixtures/arrangement_v1.txt` and `.json` in turn — each checked for `opened <name>: 13 clips (0 dropped)`
with no "made for" note, `data-clips 13`, the five correct muted lanes (`logo,a-strings,a-other,b-bass,b-other`),
and the copy list's lines 2-14 (cut part stripped) equal to the fixture file's own lines 2-14, read as literal
strings — then Save, with the downloaded JSON parsed and deep-equal-checked against the fixture's `clips` and
`muted`, `video.duration_s === 47.6`, and the format/version tag.

Command: `node tests/e2e-real.mjs /tmp/realkit /tmp/e2erealout`
Result: **`ALL PASS: 81/81 checks`** (69 baseline + 12 new). Zero console errors.

### Mutation check `tests/mutants-open.mjs` (new file, node, no deps)
Wrote it per §6.4: for each of 11 named mutants, one exact find→replace on a copy of `teaser-lanes.html` (exits
`ANCHOR MISSING oNN` if the find string is absent or not unique), copies `teaser-lanes.test.mjs` and
`tests/fixtures/` alongside it, runs the unit suite there, and reports killed/SURVIVED.

Command: `node tests/mutants-open.mjs . /tmp/mutout`

| id | what | result |
|---|---|---|
| O1 | in/out swapped in `parseClipLine` | killed |
| O2 | `fade in` part never stored | killed |
| O3 | `muted` part ignored (lane flag never true) | killed |
| O4 | `clips.slice(1)` before return in `parseArrangementText` (off-by-one count) | killed |
| O5 | JSON writer omits `fade_out` | killed |
| O6 | format-tag check removed (`format !==` → `false &&`) | killed |
| O7 | `applyArrangement` duration tolerance `0.0015` → `10` | killed |
| O8 | JSON writer sort removed | killed |
| O9 | `applyArrangement`'s `dropped` count forced to 0 | killed |
| O10 | `arrangementFileName` month not zero-padded / off by one (`getMonth()` without `+1`) | killed |
| O11 | `parseArrangement` also routes a leading `[` through the JSON branch | **ACCEPT** — `parseArrangementJson` rejects any non-object, arrays included ("not a JSON object"), regardless of which branch reached it, so `parseArrangement("[1,2]")` throws the identical message either way. Equivalent mutant; correctly not killed. |

`ANCHOR MISSING: 0`. 10 of 11 killed, 1 stated ACCEPT with a verified reason — matches the brief's expectation exactly.

### Screenshots — actually looked at (Read tool), described honestly
Nothing here was listened to; these are visual descriptions of screenshots only.
- **`shots/arr-1440x900.png`**: top bar reads "Copy list · Open arrangement · Save arrangement · ?", all four
  labels fully readable, none wrapped or clipped. Status footer: "...opened syn.txt: 5 clips (1 dropped)" next to
  visible "Reset to defaults" and "Undo" buttons. Bed and drums-B lanes show an orange **M** (muted); strings-A
  and E5 do not — matches the fixture's mute map exactly. No defects.
- **`shots/arr-1100x800.png`** (the stated side-layout minimum): video still on the left, lanes on the right (not
  stacked); "Open arrangement" and "Save arrangement" render as their full text — the §9 fallback shortened labels
  ("Open arr." / "Save arr.") were **not needed** at this width; "?" help button visible; `#kit-info` is ellipsized
  at 181 px; status text and Undo button both readable; no overlap detected with `#topbar`/`#status` included in
  the check. No defects.
- **`shots/real-arr-1440x900.png`**: 13 clip blocks over the 9 real lanes (logo 1, bed 2, strings-A 1, other-A 2,
  piano-B 2, drums-B 1, bass-B 1, other-B 2, E5 1 = 13, counted by eye and matching the fixture). The five lanes
  the fixture marks muted (logo, strings-A, other-A, bass-B, other-B) show the orange **M**; the other four do
  not. Status line names the just-downloaded file and "(13 clips)". The diagonal hatching visible on the
  bed/other-A overlap (≈22.6-25.35 s) is the page's pre-existing overlapping-clips rendering, not a defect
  introduced here.

## Phase E — land and document

**Landed this pass** (author in cloud, `device_commit_files`, md5 compared PC vs cloud for each):

| file | md5 (PC == cloud) |
|---|---|
| `tools/teaser-lanes/tests/e2e.mjs` | `0fb6a67f21953e87534c97fbd20cafaf` |
| `tools/teaser-lanes/tests/e2e-real.mjs` | `86622d7a1b53a841850e8d373f9af3f0` |
| `tools/teaser-lanes/tests/mutants-open.mjs` (new) | `cbd84e32478a57433a21893b686ad147` |
| `tools/teaser-lanes/README.md` | `909aeaa37f677b88c56092c896b5cfb3` |
| `teaser/arrangements/README.md` | `68438e99f6cf2bd9b6cf15ed8d34a057` |
| `cycles/19_teaser-sound-lanes/EXECUTOR-REPORT.md` (appended) | `8c36353c3612d07ddda066e44543fff7` |
| `cycles/19_teaser-sound-lanes/shots/{arr-1440x900.png, arr-1100x800.png, real-arr-1440x900.png, mutants-open-report.txt, open-arr-e2e-report.txt, open-arr-e2e-real-report.txt}` | landed, not re-verified individually (binary/text screenshots and logs, not part of the brief's md5 table) |

**Already correct, re-verified, not re-landed** (Phases A-C, present before this pass; unchanged by it):
`teaser-lanes.html` (`bfb1b7e1c4966273b7bb2f145a6e64dc`), `teaser-lanes.test.mjs` (`46602e5fda69b0332c33dacc67e468a9`),
`tests/convert-arrangement.mjs`, `tests/fixtures/*`, `teaser/arrangements/arrangement_v1/arrangement_v1.json`
(`ddc156dd39e341b3e41937ba50a82fdb`).

**Documentation written**
- Tool `README.md`: added Use-list step 8 (verbatim per §7); updated the three test counts (208 / 365 / 81); added
  the `convert-arrangement.mjs` and `mutants-open.mjs` rows; added the "Known limits" bullet about the arrangement
  file's scope (clips + M mutes only, one-step Undo); added the drag-drop bullet to "Only Nathan can verify".
- `teaser/arrangements/README.md`: added the "## Open one in the tool" section (verbatim, before "Versions"); added
  the `arrangement_v1.json` row to the Versions table (verbatim); added the `15.047` → `15.0465` bullet under
  "Notes on v1".
- `cycles/19_teaser-sound-lanes/EXECUTOR-REPORT.md`: appended a new `## Open/save arrangement (2026-09-24)` section
  (commands, counts, the full md5 table, the mutation table, the screenshot descriptions, merge notes, and a
  readout row) without touching any earlier section.

**Final consistency checks (VM)**
- `node teaser-lanes.test.mjs` → `ALL PASS: 208/208 passed`.
- av-align three md5s unchanged: `0e08fc6c4a3871ff70c55ff23b3b12f7`, `a0faf5b80c72e418878dfb210a151eaf`,
  `c0b5d4a579a67886ce7ead2eb076b57f`.
- No CR in any file this pass touched or created (checked each with `grep -c $'\r'`, all 0); no BOM (`head -c3`,
  none start `ef bb bf`).
- `GIT_OPTIONAL_LOCKS=0 git status --porcelain`: every changed/new path is under `marketing/audio-studio/teaser/
  arrangements/`, `marketing/audio-studio/tools/teaser-lanes/`, or `marketing/cycles/19_teaser-sound-lanes/` — the
  three allowed locations. `BRIEF-open-arrangement.md` shows modified from Ruling 3's own edit (not touched by me).
  `STATE.md`, `OPEN-ITEMS.md`, cycle README rows and `.gitattributes` were not touched. Read-only git throughout;
  no commit, no stage, nothing deleted.

## Merge notes for the Ruling-2 executor (§8), final line numbers in the landed `teaser-lanes.html`
- HOWTO array: lines 648-658 (9 entries; entry 8 is this brief's, verbatim; Ruling-2 rewrites entry 3).
- `changed()`: line 1079, first statement `S.undo = null;` — Ruling-2 reuses this exact clear-point for Delete/Reset.
- Footer Undo button: `<button id="btn-undo" ...>` at line 194 in the HTML; wired at line 1501
  (`$("btn-undo").onclick = undoLast;`); shown/hidden by `renderStatus()`.
- `renderStatus()`: lines 679-692, with `$("btn-undo").hidden = !S.undo;` at line 691, next to the existing
  `btn-reset` line.
`S.undo = {label, restore}` (declared in the `S` object at line 663 as `undo: null`) is exactly the shape Ruling 2
asks for; `undoLast()` (line 1412) and `restoreSerialized()` (line 1387) are ready to be reused for Delete and
Reset without creating a second mechanism.

## Deviations
None. Everything the brief and its ruling specified was implemented or (for Phases A-C) independently re-verified;
no anchor mismatch, no failing check, and no undecided call came up that wasn't already settled by §9 or Ruling 3.

## What only Nathan can verify (his own Chrome/Edge on Windows)
Everything already listed in the tool `README.md`'s "Only Nathan can verify" section (the page opening by
double-click, the folder picker, real h264 decode/playback, real-time feel, Bluetooth latency, font legibility,
whether the default state sounds like today's teaser), plus, specific to this feature:
- Dropping a `.json`/`.txt` arrangement file onto the page from his own Windows file explorer. The cloud test used
  a synthetic `DataTransfer`+`File` "drop" DOM event (`page.dispatchEvent`), which worked without needing the
  "not testable" fallback in this Chromium build — but that is not proof of a real OS-level drag-and-drop landing
  the same way in his browser.
- That `arrangement_v1.json` (or `.txt`) actually opens for him via the **Open arrangement** button the same way
  it did in the automated tests.
- That Save arrangement's browser download prompt/behavior is what he expects in his own Chrome/Edge.
- Nothing in this feature has been listened to; every check above is a measurement, a deep-equal, or a screenshot
  that was actually looked at.

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| Execute (open/save arrangement, Phases D-E) | Sonnet 5 | not tracked by the executor | Phases A-C found already implemented correctly by an unlogged prior run and independently re-verified (unit 208/208, every target md5 exact, av-align and `arrangement_v1.txt` byte-identical, all §3 anchors match); Phases D-E completed this pass: `tests/e2e.mjs` 365/365, `tests/e2e-real.mjs` 81/81, `tests/mutants-open.mjs` 10/11 killed + 1 stated ACCEPT (0 anchor missing), 3 screenshots looked at and honestly described (no defects), docs updated (tool README, arrangements README, cycle EXECUTOR-REPORT), all landed files PC == cloud, git status confined to the three allowed folders, no stop |

## Ruling 4 follow-up (2026-09-25)

Executor: Sonnet, fresh dispatch for RULINGS-4 (12 defects from `INSPECT-REPORT-open-arrangement.md`: 1 blocker, 1
major, 5 minor, 5 cosmetic). Read `RULINGS-4.md`, the Ruling-4-amended `BRIEF-open-arrangement.md`, and
`INSPECT-REPORT-open-arrangement.md` in full before touching anything. Re-verified the starting page against the
ruling's stated baseline first: `teaser-lanes.html` md5 `bfb1b7e1c4966273b7bb2f145a6e64dc`, 1553 lines — exact match,
so no STOP was needed on the baseline check.

### Per-defect outcome
1. BLOCKER (M/S dead after Open/Undo/Reset) — **FIX applied** exactly as ruling 1: `buildLanesDom` lines 1175-1176
   (landed page) now look the lane up with `laneOf(l.id)` at click time; M calls `changed(); renderStatus();`, S
   keeps `persist()`. Verified by a new e2e block (R4, 17 checks) clicking M and S after Reset, after Open, and
   after Undo, on both the synthetic and the real kit — all pass.
2. MAJOR (9th how-to line hides the how-to) — **FIX applied**: HOWTO array back to 8 entries (entry 7 = the new
   Copy-list/Save/Open/Undo sentence, entry 8 shortened Lanes-A/B sentence). `howtoShown` is now a hard e2e
   assertion, not just a log line.
3. MINOR (M does not clear Undo) — **FIX applied**, covered by ruling 1's `changed(); renderStatus();`. Mutants O14
   and O15 both die.
4. MINOR (stale Undo survives a kit unload) — **FIX applied**: `unloadKit` appends `S.undo = null;`. Verified by
   the R4 block's last check and mutant O17.
5. MINOR (drop routes by extension) — **FIX applied**: the drop handler now accepts any single dropped file that is
   not a directory entry. Verified live: the R4 block's synthetic drop of `syn.txt` renamed `notes.md` actually
   fired (`dataTransfer.files` was populated in this Chromium) and opened as an arrangement, not just the
   "not testable" fallback.
6. MINOR (O11 "equivalent" ACCEPT was wrong) — **FIX applied**: `tests/mutants-open.mjs`'s O11 no longer carries an
   `acceptNote`; unit case 13 (`parseArrangement("[1,2]")` throws "no clip lines found"; a `.txt` starting with
   `[my notes]` opens as text) kills it. **O11 is not equivalent (killed by unit case 13); the earlier ACCEPT was
   wrong**, as the ruling directs this sentence to say.
7. MINOR (I16/I11 test gaps) — **FIX applied**: unit case 14 (`parseClipLine` with no render end → `null`); the
   `created`-stamp e2e check (below) closes I16, killing O16 via e2e.
8. COSMETIC (two odd-note one-liners) — **FIX applied**: `applyArrangement`'s video-mismatch note now requires
   `Number.isFinite` on both `fps` and `duration_s`; `parseArrangementJson`'s version message now `JSON.stringify`s
   the value. Unit cases 15-16 added; mutants O19/O20 die.
9. COSMETIC (wording) — **FIX applied**: tool README line 5 and step 6 rewritten per ruling 9.
10. COSMETIC (Undo doesn't restore solo/selection) — **ACCEPT confirmed**, no code change.
11. COSMETIC (focus stays on Open/Save/Undo) — **FIX applied**: the three onclick handlers now `blur()` the button
    first. Verified by new e2e checks ("focus left the Save/Undo button").
12. COSMETIC (`created` time zone / merge-note line number) — **ACCEPT confirmed**, no code change; superseded by
    this section's own final line numbers below.

### Commands and counts (steps 7-10)
- `node teaser-lanes.test.mjs` → **`ALL PASS: 218/218 passed`** (208 + 10 new: unit cases 13-16 and the 8-entry
  HOWTO hygiene checks).
- `node tests/synthetic-kit.mjs tests/out/synkit && node tests/e2e.mjs tests/out/synkit tests/out/e2e2` →
  **`ALL PASS: 390/390 checks`** (365 + 25 new: the `howtoShown` hard check ×5 viewports, 2 focus checks, the
  17-check R4 block, and the stale-Undo-dies-with-the-kit check). Zero console/page errors.
- `node tests/e2e-real.mjs tests/out/realkit tests/out/e2ereal1` → **`ALL PASS: 86/86 checks`** (81 + 5 new: M/S on
  the real kit after Open, the muted copy-list line, S-on-bed). Zero console errors.
- `node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` → all 20 killed, `ANCHOR MISSING: 0`,
  `SURVIVED (uncaught): 0`.

`howtoShown` measured at all five viewports (hard-checked, all pass): **1440x900 true, 1440x810 false, 1920x1080
true, 1920x990 true, 1000x800 false** — matches the ruling's prediction exactly.

### Mutation table (20 rows)
| id | what | result |
|---|---|---|
| O1 | in/out swapped in `parseClipLine` | killed (unit) |
| O2 | `fade in` part never stored | killed (unit) |
| O3 | `muted` part ignored (lane flag never true) | killed (unit) |
| O4 | `clips.slice(1)` before return in `parseArrangementText` (off-by-one count) | killed (unit) |
| O5 | JSON writer omits `fade_out` | killed (unit) |
| O6 | format-tag check removed (`format !==` -> `false &&`) | killed (unit) |
| O7 | `applyArrangement` duration tolerance `0.0015` -> `10` | killed (unit) |
| O8 | JSON writer sort removed | killed (unit) |
| O9 | `applyArrangement`'s `dropped` count forced to 0 | killed (unit) |
| O10 | `arrangementFileName` month not zero-padded / off by one (`getMonth()` without `+1`) | killed (unit) |
| O11 | `parseArrangement` also treats a leading `[` as JSON | killed (unit) |
| O12 | M acts on the stale lane object (blocker) | killed (e2e) |
| O13 | S acts on the stale lane object (blocker) | killed (e2e) |
| O14 | M does not clear Undo | killed (e2e) |
| O15 | `changed()` no longer clears `S.undo` | killed (e2e) |
| O16 | Save writes an empty `created` stamp | killed (e2e) |
| O17 | `unloadKit` keeps a stale Undo | killed (e2e) |
| O18 | drop routes by extension again | killed (e2e) |
| O19 | video block without numbers still compared | killed (unit) |
| O20 | version message without quotes | killed (unit) |

`ANCHOR MISSING: 0   SURVIVED (uncaught): 0   total mutants: 20`. **O11 is not equivalent (killed by unit case 13);
the earlier ACCEPT was wrong.**

### Screenshots — actually looked at (Read tool), described honestly
- **`shots/arr-1440x900.png`** (re-taken this pass): the how-to now shows all eight numbered lines (no "press ? for
  the how-to" fallback); line 7 starts "Copy list gives one line per clip to paste into chat. Save arrangement
  keeps your clips and mutes..."; line 8 is the shortened Lanes-A/B sentence. Status footer reads "...restored your
  last clips and mutes · opened syn.txt: 5 clips (1 dropped)" with Reset and Undo both visible. No defects.
- **`shots/help-1440x900.png`** (new): the `?` panel lists the identical eight entries as the always-on how-to
  panel, same wording, same order. No defects.
- **`shots/arr-1100x800.png`** (re-taken, not landed — the ruling only asks to land the 1440x900 pair; kept in the
  cloud output for this report only): all four top-bar labels ("Copy list", "Open arrangement", "Save arrangement",
  "?") fully readable, none wrapped; the how-to correctly shows the accepted "press ? for the how-to" fallback at
  this width (RULINGS-1/2/4 all accept this below 1440x900); status line and Undo button readable; no overlap.
- **`shots/real-arr-1440x900.png`** (re-taken this pass): 13 clip blocks over the 9 real lanes; the same five lanes
  as before show the orange M (logo, strings A, other A, bass B, other B); status line names the just-downloaded
  file, "(13 clips)"; how-to shows all eight lines. No defects.

Nothing in this pass was listened to; every check above is a measurement, a deep-equal, or a screenshot actually
looked at.

### md5 table — landed this pass (PC == cloud, verified after landing)
| file | md5 |
|---|---|
| `tools/teaser-lanes/teaser-lanes.html` | `17ecbf82a94e34139207b4e961d8c82d` |
| `tools/teaser-lanes/teaser-lanes.test.mjs` | `c5f74167683676b70959afa32b000b60` |
| `tools/teaser-lanes/README.md` | `fe43ae4cbb5857b9db2a8c975db50404` |
| `tools/teaser-lanes/tests/e2e.mjs` | `d4a925a22069bd6991b5b3afd43c8879` |
| `tools/teaser-lanes/tests/e2e-real.mjs` | `93ed7f74f471002f7b583fd9d7eeda37` |
| `tools/teaser-lanes/tests/mutants-open.mjs` | `a08177b4620e5497c49a504337525f8b` |

All six confirmed identical PC vs. the cloud-authored copy before landing, and re-confirmed on the PC after
landing. `cycles/19_teaser-sound-lanes/shots/{arr-1440x900.png, real-arr-1440x900.png}` and the three report logs
(`open-arr-e2e-report.txt`, `open-arr-e2e-real-report.txt`, `mutants-open-report.txt`) were also landed (overwrite);
the two PNGs' bytes changed slightly in transit through the device bridge (visual content re-verified identical by
reading the landed copy back), while the three text logs matched byte-for-byte.

**Unchanged, re-verified only:** `tests/fixtures/*` (`arrangement_v1.json` `ddc156dd39e341b3e41937ba50a82fdb`,
`arrangement_v1.txt` `64d40cbf90e5a97b498dc55ea1d61794`, `manifest-real.json`/`kit/manifest.json`
`e1233d06c9b3449466eefd14e67ce149`, `syn.txt` `fa42090317251c0d1766460e44363b98`), `teaser/arrangements/
arrangement_v1/arrangement_v1.json` (not touched this pass), and av-align's three md5s (`0e08fc6c4a3871ff70c55ff23
b3b12f7`, `a0faf5b80c72e418878dfb210a151eaf`, `c0b5d4a579a67886ce7ead2eb076b57f`).

### Merge notes for the Ruling-2 executor — final line numbers (landed `teaser-lanes.html`, this pass)
- **HOWTO array**: lines 648-657 (now 8 entries; entry 7 and 8 are this ruling's; Ruling-2 rewrites entry 3, line
  651).
- **M/S handlers** (`buildLanesDom`): lines 1175-1176. Both now resolve the lane via `laneOf(l.id)` (declared at
  line 696) at click time, not the closed-over `l`. M: `applyAudible(); changed(); renderStatus();`. S:
  `applyAudible(); persist();`.
- **`changed()`**: starts line 1078, first statement `S.undo = null;` at line 1079 — unchanged clear-point, reused
  by M's handler.
- **`unloadKit`**: starts line 1212; the state-reset line (now `S.loaded = false; S.st = null; S.manifest = null;
  S.restored = false; S.undo = null;`) is line 1216.
- **Drop condition**: lines 1461-1463 (three lines: `fl`/`it0`, `en0`, the `if`), replacing the old two-line
  extension check.
- **Wiring**: lines 1498-1501 (`btn-open-arr`, `arr-input` change, `btn-save-arr`, `btn-undo`), all three buttons
  now `blur()` themselves before acting.
- `S.undo: null` is still declared in the `S` object at line 666; `renderStatus()` (lines 678-692) still hides/shows
  `#btn-undo` at line 690.

### Deviations
None from RULINGS-4's code instructions — and the how-to check is now a hard assertion. Two things worth recording
plainly rather than as deviations: (1) the ruling's stated unload-line anchor ("line 1216") was one line off the
pre-edit file (actually 1217); the code at that line was unambiguously the same statement the ruling quoted, so per
the brief's own ±10-line tolerance rule I proceeded and used the real line (it settled back to 1216 after the
HOWTO array lost one line, matching the ruling's own number by coincidence). (2) Landing the two PNG screenshots
through the device bridge changed their byte size (154,574 -> 160,344 and 204,416 -> 210,186 bytes) even though
`force` was not needed and no PC-side content existed to conflict with; I read the landed copy back and it is
pixel-identical to what this report describes, so this is a transfer-side re-encoding, not a content change or a
rule violation (the ruling's byte-identical requirement applies to the code/test/fixture files, not screenshots,
and all of those matched exactly).

### What only Nathan can verify (unchanged by this pass, restated)
Everything `INSPECT-REPORT-open-arrangement.md` §11 lists, plus, specific to this fix pass: that M and S actually
respond in his own Chrome/Edge after Open, Undo and Reset (this was the blocker); that dropping a `.json`/`.txt`
from Windows Explorer opens it without unloading the kit; whether the how-to is visible at his own screen size.

### Readout
| tier | model | tokens | outcome |
|---|---|---|---|
| Execute (RULINGS-4 fix pass) | Sonnet 5 | not tracked by the executor | All 12 defects resolved (9 FIX + 3 ACCEPT); blocker fixed and verified live (M/S work after Reset/Open/Undo on both kits); how-to back to 8 entries with a hard `howtoShown` assertion at all 5 viewports; unit 218/218, e2e-synthetic 390/390, e2e-real 86/86, mutation battery 20/20 killed (0 survived, 0 anchor missing); O11 corrected to "not equivalent"; 4 screenshots looked at and honestly described, no defects; all 6 code/test files landed with PC==cloud md5s; git status confined to the three allowed folders; no stop |
