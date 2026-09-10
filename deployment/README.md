# deployment/ — how Qualifire gets onto phones

Standing folder for everything about **distributing** the app: how builds are made today,
what the realistic routes forward are (keep sideloading, EAS internal distribution, Google
Play internal/closed testing, a public Play listing, iOS someday), what each would cost, and
what Nathan still has to decide before any of it moves.

This is deliberately **not** a `cycles/<name>/` folder. Cycle folders are one-shot: a feature
or cleanup gets briefed, built, inspected, and the folder is then history. Deployment is a
thread that keeps coming back — every time a build goes out, a tester is added, or a store
question comes up — so it lives here and gets **updated in place** rather than re-created per
cycle. If a specific deployment task grows big enough to need a brief and an inspection pass
(e.g. "set up the Play internal-testing track"), that task still gets its own `cycles/`
folder; this folder just keeps the standing state, the options, and the running logs.

Nothing in here changes app behaviour. The app's ground rules (`STATE.md`, root) still win
if anything here disagrees with them. **Status as of 2026-09-10: route and signing are fully
decided** (Google Play closed testing, 5–10 Android testers, clean package name, Play
generates the signing key) — `QUESTIONS-FOR-NATHAN.md` is fully answered, nothing left open.
What's left is execution: the repo-prep and Play Console steps in `DEPLOYMENT-OPTIONS.md` §0.

## Files

| File | What it is |
|---|---|
| `README.md` | This index. |
| `CURRENT-STATE.md` | Factual inventory of where deployment stands today: Expo/EAS config, build + OTA scripts, what's proven vs. untested, what does not exist at all (no store presence, no CI, no crash reporting). Facts not directly quoted from the repo are tagged `[UNVERIFIED]`. |
| `DEPLOYMENT-OPTIONS.md` | The actual thinking: each distribution route as its own section — what it requires, what it buys, what it costs in money, time and ongoing commitment. Now staged as a concrete plan (§0) since the route is decided: Google Play closed testing, clean package, Play-generated signing key. |
| `QUESTIONS-FOR-NATHAN.md` | All ten questions, all answered — the canonical, fully-resolved record (quotes + what each settled). Kept even though nothing's open, as the decision log; a future question would get appended here rather than starting a new file. |
| `TOKEN-USAGE.md` | Running readout table (tier / model / mandate / tokens / outcome) for every agent dispatch spent on deployment work. The coordinator appends a row per dispatch. |
| `CYCLE-LOG.md` | Most-recent-first log of deployment work sessions: what was done, what landed, what's still open. |

## How to use this folder

- **Starting a deployment session:** read `CURRENT-STATE.md`, then the top entry of
  `CYCLE-LOG.md`, then check whether `QUESTIONS-FOR-NATHAN.md` has unanswered blockers.
- **After a session:** update `CURRENT-STATE.md` if anything factual changed (a new build
  went out, a keystore was exported, a Play account was created), add a `CYCLE-LOG.md`
  entry, append the dispatch rows to `TOKEN-USAGE.md`.
- **When Nathan answers a question:** the coordinator moves the ruling into `STATE.md` (if
  it's a ground rule) or `OPEN-ITEMS.md` (if it's a work item) and marks the question
  answered here. The question file is the inbox, not the record.

**Housekeeping note (2026-09-10):** `QUESTIONS-FOR-NATHAN2.md` and
`QUESTIONS-FOR-NATHAN(answered before update).md` are stray leftovers from answering
in-place — their content is fully folded into the canonical `QUESTIONS-FOR-NATHAN.md` above.
No agent this session could reach `device_bash` to move them to `safe_to_delete/`; safe for
Nathan to delete or move whenever convenient.

Related, elsewhere in the repo:
- `scripts/README.md` — the build-script lineage (build3 → build7, publish-preview).
- `scripts/OTA-TROUBLESHOOTING.md` — EAS Update fingerprint debugging.
- `app/README-dev.md` — one-time developer machine setup.
- `app/eas.json`, `app/app.json`, `app/app.config.js` — the actual build/update config.
