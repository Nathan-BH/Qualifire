# Deployment round 2 -- PLAN (Fable, 2026-10-05)

Responds to: `review.md` (approved in full by Nathan, 2026-10-05) and `ideas.md`, same folder.
Inputs read: `DIGEST.md` (Haiku), `review.md`, `ideas.md`. Raw files opened beyond the digest,
each for exact anchors only: `scripts/publish-preview.ps1` (full text -- the brief expresses
`publish-play.ps1` as line-by-line differences against it, which the digest's structured summary
cannot anchor), `deployment/CURRENT-STATE.md` lines 40-100, `deployment/README.md` (whole, 55
lines), `OPEN-ITEMS.md` lines 156-192, `scripts/README.md` lines 1-12, `scripts/publish-preview.cmd`.
Also checked: all target files are LF-terminated ASCII/UTF-8; the device shell has `node`,
`python3`, `jq`, no `pwsh`; the working tree is already dirty with cycle-22 app files.

Executor brief: `BRIEF-01-play-profile-and-publish-script.md` (same folder).

---

## 1. Decisions carried in from the review (Nathan, 2026-10-05)

| # | Decision | Status this round |
|---|---|---|
| 1 | `app/fingerprint.config.js` (skip app name + Android package, probably `version`) so `.preview` and Play builds hash the same | **Deferred** to the native-build cycle (see §4). Not created now. |
| 2 | Stay on EAS Free; revisit if >12 builds/month regularly | Docs note only (CURRENT-STATE §Cost paragraph gets one sentence). |
| 3 | Optional chore: download the `.preview` credentials once as backup | Recorded as optional, Nathan-only, interactive. Not done. |
| -- | `app.json` version bump to 0.1.x/0.2.0 | **Deferred**, same cycle as 1. |

## 2. What is executed now, and why each is safe

### 2a. `app/eas.json`: add a `play` build profile

```json
"play": {
  "distribution": "store",
  "channel": "play",
  "autoIncrement": true,
  "android": { "buildType": "app-bundle" },
  "env": { "EXPO_PUBLIC_SEED_MODE": "empty" }
}
```

- `channel: "play"` -- the one channel every Play release (internal and closed track) listens to
  (review §1c). `publish-play.ps1` publishes to it.
- `buildType: "app-bundle"` -- Play requires an `.aab` for new apps (CURRENT-STATE §3 already
  states that no profile produces one).
- `autoIncrement: true` -- under `cli.appVersionSource: "remote"` EAS bumps `versionCode` per
  build server-side; Play rejects a re-used `versionCode`, so this is the one knob that must be on.
- `distribution: "store"` -- explicit, although it is the EAS default when `distribution` is
  omitted. Written out so the profile table reads unambiguously next to the three `internal` ones.
- `env`: `EXPO_PUBLIC_SEED_MODE=empty` only. **No `APP_VARIANT`**: `app.config.js` (digest §3,
  line 18) returns the base config when `APP_VARIANT` is neither `preview` nor `virgin`, which
  yields the clean `com.nathanbonher.qualifire` / "Qualifire" identity decided in round 1.
- No `environment` key: EAS picks `production` for a store profile by default, and this project
  keeps its env in `eas.json`, not in EAS-hosted environment variables, so the choice is inert.
- **`submit` section: not added.** Reasons: (i) `eas submit` needs a Google service-account JSON
  that does not exist yet (no Play Console app exists, CURRENT-STATE §3 "No Play upload has been
  made yet"); (ii) Google requires the first `.aab` of a new app to be uploaded by hand in the
  Console before any API upload works, so the first release is manual regardless; (iii) a
  `submit` profile with a dangling `serviceAccountKeyPath` would make `eas.json` lie. Add it in the
  Play-Console-setup task once the key file exists.

### 2b. `scripts/publish-play.ps1`: OTA publish to channel `play`

Modelled line-for-line on `publish-preview.ps1` (same preflight: node 22+, `tsc --noEmit`, test
runner, dirty-tree warning, message fallback + quote fix, `eas-cli whoami`/login, `-DryRun`,
`-SkipTests`, `-Message`). Differences, all enumerated in the brief:

- Step 0 checks `eas.json build.play.channel == "play"`, `build.play.android.buildType ==
  "app-bundle"`, and that `build.play.env.APP_VARIANT` is absent (the guard that protects the
  clean identity).
- Step 5 **removes** `APP_VARIANT` from the process environment (`Remove-Item Env:APP_VARIANT`)
  instead of setting it -- a stale `APP_VARIANT=preview` in Nathan's shell would otherwise bundle
  under the `.preview` fingerprint and the Play build would ignore the update silently. Sets
  `EXPO_PUBLIC_SEED_MODE=empty` to match the profile env.
- Publishes with `npx.cmd -y eas-cli update --channel play --message "..." --environment production
  --platform android`. `--environment` must name one of EAS's fixed environments
  (`development|preview|production`); `play` is a channel, not an environment, so `production` is
  the only correct value for the store line. Same "if eas-cli rejects it, report back, don't
  hand-edit" note as the preview script carries.
- Header usage lines use the **full absolute path** form
  (`powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-play.ps1" ...`),
  per Nathan's standing rule. (The existing preview header's `.\publish-preview.ps1` form is
  legacy and is not touched this round -- out of scope, noted in §6.)
- Header + Done step say plainly that until a `play`-profile `.aab` has been built and uploaded
  to a Play track, this publish lands on nothing.
- **`-Promote` mode (`eas update:republish --destination-channel play`): not added now.** Until
  `fingerprint.config.js` lands (deferred, §4), the `.preview` and Play fingerprints differ, so a
  republished preview group carries a runtime version no Play build has -- the Play app would
  ignore it silently, the exact failure mode `OTA-TROUBLESHOOTING.md` §3 documents. Shipping a
  switch that can only misfire today is worse than none. It goes on the deferred checklist (§4),
  to be added once `eas fingerprint:compare` shows both builds equal.
- No `publish-play.cmd` double-click launcher: minimal first; trivial to add later by cloning
  `publish-preview.cmd` if Nathan wants it.
- The executor **does not run** the script and makes no `eas`/network call. The device shell has
  no `pwsh`, so the check is: write the file, `diff` it against `publish-preview.ps1`, confirm every
  hunk is one of the enumerated differences and nothing else, plus brace/paren balance via a short
  python count. Nathan's first real run is `-DryRun`.

### 2c. Docs

- `scripts/README.md`: one table row for `publish-play.ps1` after the `publish-preview.ps1` row
  (line 7).
- `deployment/CURRENT-STATE.md`: title date -> 2026-10-05; `play` row in the Build-profiles table;
  the "All three profiles are `distribution: internal`..." paragraph (lines 72-73) rewritten
  to the new truth (three internal apk + one store aab, none built yet); `publish-play.ps1` row in
  the tooling table after line 95; one sentence in §Cost on the EAS-Free decision.
- `deployment/README.md`: Files table gains the round-2 files; status paragraph (lines 17-20)
  gets one sentence on round 2; "Related" bullet for `scripts/README.md` mentions publish-play.
- `OPEN-ITEMS.md` Distribution section: **one new bullet appended after line 185** (the deferred
  native-build cycle with its checklist); no other bullet rewritten.

## 3. Fingerprint-risk analysis (why the executed items cannot move the installed build's fingerprint)

The installed Preview APK is build 7 (cycle-18 rebuild), fingerprint `610cfe837448add1ccdd3c045eb550c3ac6dcdd3`
(digest §6). It keeps receiving `publish-preview.ps1` updates only while the project's computed
fingerprint under `APP_VARIANT=preview` stays equal to that hash.

`@expo/fingerprint` (the `runtimeVersion.policy: "fingerprint"` engine) hashes: the **resolved
Expo config** (`app.json` through `app.config.js`, with the env of the moment), native project
files (none -- managed workflow), the native-relevant parts of `package.json` dependencies,
config plugins and patches. It does **not** hash `eas.json`, anything under `scripts/`, or
Markdown. Therefore:

| Executed item | Fingerprint source? | Effect on `610cfe83...` |
|---|---|---|
| `eas.json` new `play` profile | **WRONG in the original plan: yes.** `@expo/fingerprint` hashes `eas.json` as a whole file (found by inspection, `INSPECTION.md` D1). | moves the preview hash; **backed out** 2026-10-05, deferred to the native-build cycle |
| `scripts/publish-play.ps1` | No (outside `app/`, not a config input) | none |
| Docs (`README`s, CURRENT-STATE, OPEN-ITEMS) | No | none |
| Nothing is built or published this round | -- | none |

Untouched by design: `app.json`, `app.config.js`, `package.json`, any `app/src`, and no
`fingerprint.config.js` -- the one file that *would* change the hash (that is its whole purpose),
hence deferred. The `play` profile's own env (`APP_VARIANT` unset) only matters at the moment a
`play` build runs; it does not alter what the `preview` profile computes.

Residual: `eas-cli` could in some future version start folding `eas.json` into the fingerprint.
Not the case for the pinned toolchain today; `eas fingerprint:compare` in the deferred cycle is
the check that would catch it, and `OTA-TROUBLESHOOTING.md` already documents the recovery.

## 4. Executed now vs deferred

| Item | Now / Deferred | Trigger |
|---|---|---|
| `eas.json` `play` profile | **Now** | -- |
| `scripts/publish-play.ps1` (no `-Promote`) | **Now** | -- |
| Docs + OPEN-ITEMS pointer | **Now** | -- |
| EAS Free decision | **Now** (doc note) | Revisit when builds exceed ~12/month for two consecutive months |
| `app/fingerprint.config.js` | **Deferred** | The next native build. Exact trigger: the first `build*.ps1` run after this round, i.e. the Sentry / disclosure-UI build. Must land in the **same** build as those, because it changes the fingerprint and every installed build (preview and, later, Play) must be rebuilt once anyway. |
| `app.json` `version` bump (0.1.0 -> first Play version) | **Deferred** | Same cycle |
| `-Promote` switch on `publish-play.ps1` | **Deferred** | After `eas fingerprint:compare` shows preview == play |
| `submit` section in `eas.json` | **Deferred** | Play Console app exists + service-account JSON downloaded |
| `.preview` credentials download | **Optional, Nathan-only** | Whenever; interactive `eas credentials` |

### Ready checklist for the deferred native-build cycle (copy into its `cycles/<name>/` brief)

1. Own `cycles/` folder; Digest -> Plan -> Execute -> Inspect as usual.
2. `app/fingerprint.config.js`: `module.exports = { ignorePaths: [...] }` /
   `sourceSkips` so the resolved-config `name`, `android.package` (and `version`) do not enter the
   hash. Verify the exact option names against the pinned `@expo/fingerprint` version in
   `app/node_modules` before writing (the review flagged `version` default as [UNVERIFIED]).
3. `app.json` `expo.version`: bump (first Play-facing marketing version).
4. Sentry: add the native dependency + config plugin (Q8, OPEN-ITEMS lines 172-174).
5. Background-location prominent-disclosure UI (Play policy; rider-facing strings go through
   `app/tests/ui-strings.allow.json` with an `## Added visible text` table in the brief).
6. Build `preview` (`build8.ps1` or its successor) **and** `play` (`eas build --profile play`,
   first `.aab`); record both fingerprints in `scripts/OTA-TROUBLESHOOTING.md`.
7. `eas fingerprint:compare <preview-fingerprint>` against the `play` build: must be identical.
   If not, the config in step 2 is wrong -- fix before any OTA.
8. Upload the `.aab` by hand to the Play internal track (first release is manual by Google's rule).
9. Add `-Promote` to `publish-play.ps1` (`eas update:republish --channel preview --destination-channel play`)
   and the `submit` section to `eas.json` once the service-account JSON exists.
10. OTA loop from then on: `publish-preview.ps1` -> check on Nathan's phone -> `publish-play.ps1 -Promote`.

## 5. Risks

- **`--environment production` rejected by eas-cli** (low): the fixed environment set is
  `development|preview|production`; if a future CLI changes this, the script's header says to
  report back, not edit. Nathan sees it on the first `-DryRun`, which prints the exact command.
- **Nothing to land on**: a `play` OTA before any `play` build exists simply creates an update
  group nobody downloads. Harmless; the script says so in its header and Done step.
- **Stale `APP_VARIANT` in Nathan's shell**: handled by `Remove-Item Env:APP_VARIANT` in step 5.
- **Dirty tree during execution**: `git status` already shows cycle-22 app files modified. The
  executor records `git status --porcelain` before and after and must show that the only *new*
  changes are the six intended files; it does not commit.
- **JSON edit of `eas.json`**: a trailing-comma slip is the classic failure; the brief gives the
  complete new file and a `node -e JSON.parse` check.
- **Scope creep in OPEN-ITEMS/CURRENT-STATE**: edits are anchored and additive; the brief forbids
  rewording other bullets.

## 6. Out of scope, noted

- `publish-preview.ps1` header lines 7-10 still show the relative `.\publish-preview.ps1` form
  (pre-dates the standing rule). Not touched this round; a two-line chore for a later cycle.
- `deployment/README.md` lines 45-49 housekeeping note about stray question files -- left as is.

## Executed

Pipeline run 2026-10-05/06: Haiku Digest (`DIGEST.md`) -> Fable Plan (this file + `BRIEF-01`) -> Sonnet Execute (`EXECUTION.md`) -> Opus Inspect (`INSPECTION.md`).

| Item | Outcome |
|---|---|
| `scripts/publish-play.ps1` | **Landed, kept.** Inspector: byte-identical to brief, only intended diffs vs `publish-preview.ps1`, never sets `APP_VARIANT`. Never run. Its step 0 stops until the `play` profile is back in `eas.json` (fail-safe). |
| `scripts/README.md` row, CURRENT-STATE, deployment/README, OPEN-ITEMS | **Landed**, then corrected after inspection to say the `play` profile is not in `eas.json` yet. |
| `app/eas.json` `play` profile | **Executed, then backed out.** Inspection D1 (critical): `eas.json` is hashed whole (measured locally: preview hash `b64062a9...` with the edit vs `f52e438f...` without), so the edit would have silently stopped preview OTAs reaching installed build 7. Restored to the committed version (`git diff` empty). Draft kept in `DEFERRED-eas.json-with-play-profile.json` for the native-build cycle. |
| `fingerprint.config.js`, version bump, `-Promote`, `submit` | Deferred as planned (section 4). |
| Tests / tsc | 848 tests, 0 fail, 3 skip; `tsc --noEmit` exit 0 (executor and inspector both). |

Lesson recorded: a Plan-tier claim that "X is not a fingerprint source" must be verified against `@expo/fingerprint` (or measured) before it is used to justify executing now. `eas.json` and `.fingerprintignore` / `fingerprint.config.js` all move the hash, so every such edit belongs in a native-build cycle.

Inspection D2 (low): `EXECUTION.md` summarises the script diff and git status instead of including them in full; inspector re-derived both and they match. Accepted.

Checklist addition for the deferred cycle: step 0 = restore the `play` profile from `DEFERRED-eas.json-with-play-profile.json` in the same commit as `fingerprint.config.js`.
