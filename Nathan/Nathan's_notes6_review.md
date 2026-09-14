# Review — Nathan's_notes6.md (2026-09-14)

Everything below is **written and ready**, sitting in this cloud session, not yet on
your PC. Midway through pushing the files your wifi dropped (as you flagged it
would) and the device bridge went down. Nothing was lost — I finished all the
thinking and writing work regardless, since that runs in the cloud — but the actual
file-copy step to your disk is pending until you're reconnected. See **Deployment
status** at the bottom for exactly what to do.

## How this ran

Per the Qualifire model-tier protocol: three Haiku/Sonnet **Digest** passes read the
relevant files and condensed them, then four **Fable** passes did the actual
thinking and wrote the briefs below from those digests (not from raw files). I
coordinated (Sonnet) and did not do any of the reading or design thinking myself,
per the protocol's "never rule on ambiguity as Sonnet" rule — every judgment call
below is Fable's, not mine. One exception: I wrote the website's `rounds/v1`
move/skeleton directly (no subagent) since by the time content was fully decided,
placing it was pure file mechanics with zero design judgment left in it — the kind
of thing the protocol carves out for direct handling rather than spinning up a
Sonnet executor to shuffle files it has to re-derive nothing about.

## 1. App — gates render white

**Folder:** `cycles/app-backlog/` (new — see naming note below)
**Files:** `README.md`, `BRIEF-gates-white.md`

Your v4 marketing feedback ("gates as white colour... draw the gates across the
line like the logo") shipped in marketing cycle 06 as a stroke-draw-on white
animation. You want the same in the real app. The brief rules: **port the colour,
not the animation** — the stroke-draw effect was a video flourish; your app ask
named the colour. It points a Sonnet executor at the four likely files
(`theme.ts`, `wayMapGeo.ts`, `wayMapView.tsx`, `gateAdjustCard.tsx`) with a concrete
plan (new `white` token, threaded through the gate feature builder) and hard
stop-on-ambiguity conditions (e.g. if gate colour currently encodes per-gate score,
don't silently discard that).

**Naming call I made:** you asked for "a new folder cycle... which we can fill with
briefs for multiple updates" — since the existing convention is numbered
`virgin-cycleN` (one folder = one executed body of work), and you separately
reserved `virgin-cycle6` for the self-racing brief below, I named this one
`app-backlog` instead of `virgin-cycle6` or `virgin-cycle7`, since it's meant to be
an accumulating holding pen, not a single cycle. Rename it if you'd rather it fit
the numbered sequence.

**Not executed** — this is a brief, waiting with the others until you say go.

## 2. App — live self-racing (past rides as dots)

**Folder:** `cycles/virgin-cycle6/`
**Files:** `README.md`, `BRIEF-live-self-racing.md`, `QUESTIONS.md`

This is the "race your last ten versions of yourself" idea from the main branch,
built out for the virgin (blank-seed) app. The brief digs into the actual engine
code and finds the mechanism already half-exists: the app already has a
"comparison window" of your last 9 rides on a route (`colourModel.ts`'s
`ghostsFor`, which already drives sector colours). The brief's central ruling
reuses that window directly rather than inventing a new counter — which is also
exactly why your incremental-ramp idea (1 self, then 2, then 3...) falls out for
free: ride 1 has an empty window (0 selfs), ride 2's window has 1 entry, and so on
up to the existing cap of 9.

Key design calls made (all reversible, listed as `QUESTIONS.md` if you want to
weigh in after seeing it on a phone):
- A self is positioned by **elapsed time since the START gate** (not distance),
  replaying that ride's own raw GPS — so a dot ahead of you really means "that day's
  you was faster to here," consistent with how sector colours already work.
- Named **"self,"** never "ghost" — the codebase already uses "ghost" for something
  else (archive-seeded demo data) and reusing the word would make every future grep
  ambiguous.
- The window-best self renders purple ("the one to beat"), others muted; no text,
  no gap readout, no labels — matching the live screen's existing no-clutter rule.
- No GPS simulator exists in the app, so the brief's test plan is a headless test
  suite (proving the model) plus an on-device ride checklist for you (proving the
  actual progression 0→1→2→...→9 rides true).

**Not executed** — brief only, per your "once we have enough we can execute" note.

## 3. Marketing — cycle 08 (day/night renders, guide verdict, audio control)

**Folder:** `marketing/cycles/08_daynight-audio-control-and-website/`
**Files:** `README.md`, `BRIEF-daynight-renders.md`, `BRIEF-guide-staleness-verdict.md`,
`BRIEF-audio-studio-control.md`, `questionsfornathan.md`

Three separate asks, one cycle folder as you specified.

**Day/night for silent-studio renders — your question answered:** neither of your
two options as stated. Not a forked day folder (duplicates every timeline,
guaranteed to drift — the same class of problem `structure.md` already documents
for `all-renders/`), and not a bare "periodic one-off render" either (without a
mechanism, every day render is a fragile hand-edit of ~40 colour literals per
composition). Instead: each composition's `index.html` gets a CSS-variable palette
(same trick your website already uses for its own day/night toggle), selected by a
`render.ps1 -Theme day` flag. Day renders are stored as variants *inside* the
existing night round (`rounds/vN/<comp>_vN_day.mp4`), not a parallel folder tree.
Two pilots first (`gates-saving`, `brandmark/opening`) to prove night output is
unchanged before rolling out to the other five compositions. Audio-studio day
renders: deferred per your own "not a priority," with the one-line ffmpeg command
recorded for when you want it.

**Guide files — verdict:** you were right that `COMMANDS.md` is more recently
edited, but recency wasn't actually the question that mattered — the two files
answer different questions (`VIDEO-EDITING-GUIDE.md` is a one-time strategic
answer to your software/workflow questions; `COMMANDS.md` is the day-to-day
copy-paste cheat-sheet). Keep both. One real finding along the way: `COMMANDS.md`
is content-stale in two spots — it still references the pre-rename composition
names `gate`/`purple`/`tour` (which no longer exist; running `render.ps1 -Name
gate` today would error) and an outdated `rounds\v2` path. Both fixes are folded
into the day/night brief since it touches the same file anyway.

**Audio-side control — recommendation:** a per-scene `AUDIO-BRIEF.md` "beat sheet"
that Claude pre-fills with the composition's visual beats and timestamps, and you
fill in a direction column *before* the first soundtrack draft, rather than only
giving feedback after hearing v1. This targets the actual gap: your feedback today
is good but arrives one round late. Two alternatives (a config-file layer over the
Python scripts; local regeneration on your own PC) were considered and are
recorded as smaller follow-ups rather than the primary move — the second one
(local regen) only needs Python+numpy+scipy on your machine, flagged as an open
question.

**Not executed** — briefs only, per your "I dont have time to execute now."

## 4. Website — moved out of marketing/index.html, versioned, content briefed

**Folder:** `marketing/website/`

Unlike the other three items, you asked for the *restructuring itself* to actually
happen now (the "just make briefs" qualifier in your notes applied only to the
content changes list, not to the move). So this part is built, not just briefed:

- `marketing/website/README.md`, `marketing/website/FEEDBACK.md` (your standing
  rules — no em-dashes, never "failure," never "time posted," etc. — read before
  every future round), `marketing/website/rounds/v1/` (the page frozen exactly as
  it was, `BRIEF-move.md` + `FEEDBACK.md`), and
  `marketing/website/rounds/v2/BRIEF-content-edits.md` (the actual content-edit
  brief, **not executed**, per your "just make briefs for now").
- **Placement:** my first pass put this at a top-level `website/`, reasoning it
  wasn't marketing collateral like the silent-studio renders. You corrected that
  the same day — you want it under `marketing/`, and moved the folder there
  yourself, cleaning up the `marketing/index.html` duplicate my fallback move had
  left behind in the process. Every doc in the folder now points at
  `marketing/website/`.

The v2 content brief is thorough and resolves nearly everything on your list into
concrete, ready-to-paste rewrites rather than leaving them as fuzzy instructions:
- Both quoted clutter paragraphs (hero pitch, "Quali + fire" tagline) — deleted,
  with a specific CSS fix so the hero doesn't look broken without them.
- **All 22 em-dashes in the file** — found and individually rewritten (not just
  "remove the dash"), including 5 structural placeholder dashes in the timing
  tower table that needed a different fix (empty cells, not rewritten sentences).
- "How it works": the abstract flat-line schematic is replaced with the *actual*
  route geometry from the `gates-saving` marketing render (real captured basemap,
  real gate positions, a rider looping via a native browser animation) rather than
  embedding a video — and the three step paragraphs are rewritten shorter and more
  formal, as asked.
- **"While you ride — race mode": cut entirely.** You said your gut said it wasn't
  needed; the brief actually made that call rather than parking it as a question —
  reasoning given (it's a mocked, unverified HUD; the rest of the page already
  covers the full loop).
- "Earned colour" → "The colours"; the three swatch descriptions rewritten to your
  literal preferred wording (best / better than average / below average), and the
  "not failure... most laps are yellow" line is gone, with "failure" never
  reintroduced anywhere.
- "After you ride": the "No delta plot" sentence replaced with an explanation of
  the rolling window and why there's always something to go for soon — your own
  framing, written out.
- "A slow lap is time posted.": this one actually **does** exist in the file — the
  earlier automated read missed it because a `<span>` tag splits the sentence in
  the markup. Found and it's now in the deletion list.
- One thing flagged, not fixed, along the way: the *original* schematic's dot
  animation was never paused when scrolled off-screen (a small existing bug,
  unrelated to your list) — the replacement fixes this by construction.

**A few small extra calls Fable made that you didn't explicitly ask for** (listed
in the v2 brief's own "Things to check" so they surface for your review, not
silently shipped): the "How it works" and "Colours" section headlines were
tightened since the pitch removal left one of them duplicating the hero title
verbatim.

## Open questions across everything (all have a stated default; none block work)

From `marketing/cycles/08_.../questionsfornathan.md`:
1. Which two compositions should the day/night pilot start with? (Default: the
   two already picked — `gates-saving`, `brandmark/opening`.)
2. Do you have/want Python+numpy+scipy on your PC, to unlock local audio
   regeneration? (Default: not built yet.)
3. Should the day-mode colour palette come from anywhere other than the website's
   own light theme? (Default: yes, reuse it.)

From `cycles/virgin-cycle6/QUESTIONS.md`, all best answered after you've actually
seen the dots on a phone:
1. Purple-highlight the fastest self, or leave all dots identical?
2. Any text at all (a gap readout, an off-screen indicator), or dots only?
3. Should selfs pause when you're stopped, in moving-time mode?

## Deployment status

Everything above is on disk, verified by directory listing. The one loose end —
`device_bash` (the shell on your PC) has been unreachable all session, a known
Sept 8 Windows-update issue unrelated to the earlier wifi drop, so nothing here
has been `git add`/`git commit`ed. Whenever you're at the machine:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire"
git add cycles/app-backlog cycles/virgin-cycle6 marketing/cycles/08_daynight-audio-control-and-website marketing/website Nathan/Nathan's_notes6_review.md
git commit -m "notes6: app-backlog + virgin-cycle6 briefs, marketing cycle08, website restructure"
```

## Model-tier readout

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Digest | Haiku | app cycles conventions + gates-white context | 80,362 | delivered |
| Digest | Haiku | marketing cycles conventions + guide diff + audio-studio | 56,456 | delivered |
| Digest | Sonnet (exact-text exception) | website index.html full content extraction | 96,572 | delivered |
| Plan (Fable) | Fable | app-backlog brief: gates white | 51,395 | 2 files written |
| Plan (Fable) | Fable | virgin-cycle6 brief: live self-racing | 146,532 | 3 files written, prior-art search folded into brief's Task 0 |
| Plan (Fable) | Fable | marketing cycle08: day/night, guide verdict, audio control | 154,610 | 5 files written |
| Plan (Fable) | Fable | website restructure + v2 content brief | 142,862 | 6 files + v1 executed directly (coordinator, mechanical) |
| Execute (Sonnet) | — | — | — | not dispatched (all four items explicitly deferred by Nathan) |
| Inspect (fresh Fable) | — | — | — | not dispatched (nothing landed yet to inspect) |

**Total subagent tokens this task: ~728,800.**
