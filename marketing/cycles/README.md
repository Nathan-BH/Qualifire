# marketing/cycles — conventions

A cycle folder (`NN_short-name/`) records one batch of feedback implementation —
usually several compositions' worth at once, sometimes a whole new capability (see
`05_audio-studio-launch/`). Two files per cycle:

- **`README.md`** — what the cycle implemented, the implementation order chosen and
  why, the model-tier readout table (or the cycle-05-style direct-execution note for
  audio-studio work), and what shipped.
- **`OPEN-ITEMS.md`** — everything Nathan still needs to do or review. See below for
  what goes here.

## OPEN-ITEMS.md: one place for every script

**Every PowerShell/render/ffmpeg command Nathan needs to run for the cycle goes in
`OPEN-ITEMS.md`, consolidated in one ordered list — never scattered as one-off
snippets inside each updated composition's own `rounds/vN/FEEDBACK.md`.**

A `rounds/vN/FEEDBACK.md` still gets its own "Render on the PC" block (that's the
per-composition convention and stays useful on its own, e.g. if Nathan revisits that
one round later) — but when a cycle touches several compositions, `OPEN-ITEMS.md` is
the single copy-paste path through all of them in the right order, so Nathan never
has to hop between FEEDBACK.md files to find the next command. Structure it like
`06_feedback-pass-and-audio-round2/OPEN-ITEMS.md`:

1. A **"Blocker"** heading naming what's not done and why (usually: `device_bash`
   unreachable, so nothing rendered).
2. **One combined PowerShell block** with every `render.ps1` call the cycle needs,
   in implementation order.
3. **One combined copy + `ffprobe` block** (a `foreach` loop, not N separate blocks)
   moving each new render into its `rounds/vN/` folder and confirming its duration
   against the planned value.
4. If the cycle also touches `teaser/`: a **teaser assembly step** (concat.txt +
   ffmpeg command), and, separately, a note on the **with-audio teaser** — that one
   is a Claude follow-up (retiming `audio-studio/teaser/soundvN`), not a script for
   Nathan to run, so say so explicitly rather than handing him an ffmpeg command for
   it.
5. A **"leave feedback"** reminder pointing at each round's `FEEDBACK.md`.

Below the render steps, keep whatever sections apply: defects the inspector caught
and the coordinator fixed directly, design questions a fresh Fable ruled on, other
judgment calls logged for Nathan's review, cleanup he needs to do by hand (anything
`device_bash` would normally delete/move), and doc-only nits not worth fixing yet.
`04_second-feedback-pass/OPEN-ITEMS.md` and `06_feedback-pass-and-audio-round2/OPEN-ITEMS.md`
are the reference examples for this whole structure.
