# Cycle 21 — open items

## Blocker

Nothing has been rendered, previewed, linted, or visually checked yet. Every step below
needs npm/a browser, which only exists on your PC (neither cloud sandbox nor the
device_bash VM can reach the npm registry).

## 1. Lint + check (no browser console needed — this replaces watching for a console line)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes lint
```

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes check
```

Both print plain text straight into the PowerShell window — no dev tools needed. **In
progress (2026-09-26):** a run reported `Lint: 7 error(s), 7 warning(s)` as a summary line
only; the full per-error output from `npx.cmd hyperframes lint` itself is still needed before
these can be triaged. Also seen during a run: several `hyperframes:registry skipped item
"<name>": TimeoutError` lines (`lt-neon-border`, `orbit-card`, `vfx-iphone-device`,
`wireframe-portal-title`, `colorama-wipe`, `extended-keyframe`, `text-match-cut`) — none of
those names appear anywhere in `teaser-full`, so this looks like HyperFrames probing its
own built-in effect catalog on startup (network timeouts on optional templates), not an
error in this composition. Treat as unrelated noise unless it recurs alongside a real
problem.

## 2. The scoping-proof frames — this is the one thing that genuinely needs your eyes

Everything about CSS/JS scoping was verified by two independent passes reading the actual
text (Sonnet built it, Opus independently re-derived every check from scratch) — but
neither of us can run a real browser, so nobody has actually *looked* at a rendered frame
yet.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\teaser-full"
npx.cmd hyperframes snapshot --at 3.9,7.9,12.5,26.01,30.0,35.7,44.5
```

This writes PNG files directly into the folder — just open them like any picture, no
preview/console needed. Two are the load-bearing checks:
- **7.9s** must show start-ride's THIN route (the thinner casing/core stroke) with no gate
  ticks visible yet.
- **35.7s** must show a WHITE "Today" row climbing — not purple. (Ranking's Today row sits
  right next to two other scenes' stale purple color rule; both reports traced the CSS
  cascade by hand and confirmed it can't leak, but this is exactly the kind of thing worth
  actually seeing once.)

The rest (3.9, 12.5, 26.01, 30.0, 44.5) should visually match the equivalent moment in each
scene's own existing render — a general "does this still look like the scene I know"
check.

## 3. First real render, once 1 and 2 look right

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name teaser-full -Render
```

ffprobe duration should read 47.300000 (1419 frames @ 30fps). Then, once you're happy with
the night render:

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name teaser-full -Theme day -Render
```

## 4. Decision, whenever you're ready (not blocking anything above)

Now that the concat-seam constraint is gone, start-ride's 1.0s blackout/reveal beat is a
one-file text edit away from being shortened or removed — see cycle 20's OPEN-ITEMS.md for
the exact button-appear/click numbers each option lands on. No multi-file cascade needed
this time; it's contained entirely inside `teaser-full/index.html` now.

## 5. Not done yet, and worth deciding once you've seen a render

Whether `teaser-full/` becomes the new `teaser/` (retiring the old concat pipeline and the
legacy `teaser/index.html`) or stays a permanent alternative alongside it — `structure.md`
still needs updating either way once you've decided. Not touched in this cycle on purpose,
so the two can be compared side by side first.

## Leave feedback

Once you've previewed/rendered, feedback on `teaser-full` goes wherever feels natural —
this cycle's folder, or a `rounds/v1/FEEDBACK.md` inside `teaser-full/` itself if it looks
like it's becoming the permanent version.
