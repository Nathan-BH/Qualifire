# BRIEF — One switch for every "?" help icon in SETTINGS (`showHelp`)

**Written 2026-09-15 UTC (Plan tier, fable).** Anchors were read from the live working tree
on Nathan's PC on 2026-09-15 (cycle 6 committed as `92bd6ea`, marketing cycle 09 as `003d4df`; `settings.tsx` is 656
lines). Executor: Sonnet, stop-on-ambiguity. **Any anchor mismatch or undecided call → stop
and report verbatim (file, line, what is actually there); do not guess, do not rule on it
yourself — escalate to a fresh Fable.** Never rule on an open call from the coordinator's chat.

## Origin

Nathan (2026-09-14): "Replace the current per-option '?' help icons with ONE single global
toggle in Settings that shows/hides all of them at once."

Today (`app/src/ui/settings.tsx`): every `Row` with a `hint` draws a small "?" button; tapping
it expands that row's hint under the label; one row open at a time (`Help.open`, WP-L). That
open/closed state is ephemeral (`useState`, `:529`), reset every time the screen mounts. There
is no per-row on/off preference to "replace" — what Nathan is asking for is a persisted
**master switch** that decides whether the "?" affordance exists at all. When it is off, no
row shows a "?" and no hint can be expanded; when on, today's behaviour, unchanged.

## File anchors (`app/src/ui/settings.tsx` only)

- `:30–50` `export interface Settings { … }` — last field `showSportPillOnRecord: boolean;`
  (`:49`), with its doc-comment pattern at `:45–48`.
- `:52–62` `const DEFAULTS: Settings = { … showSportPillOnRecord: true, };` (`:61`).
- `:70–82` `FILE` + `load()` — saved JSON is spread over `DEFAULTS` at `:99`
  (`setS((prev) => ({ ...prev, ...saved }))`), so a missing key keeps its default.
- `:154–155` `/** WP-L: which row's help is showing (keyed by label); one at a time. */`
  `interface Help { open: string | null; toggle: (key: string) => void }`
- `:157–195` `function Row(props: { label; hint?; help: Help; t; children; sep? })`:
  `:165` `const hasHelp = props.hint !== undefined && props.hint !== '';`
  `:166` `const open = hasHelp && props.help.open === props.label;`
  `:176–186` the "?" `Pressable`, rendered iff `hasHelp`; `:188–190` the hint `Text`, iff `open`.
- `:322` `function SportsSection({ t, help }: { t: PaddockTheme; help: Help })` — passes
  `help` to its own `Row`s (`:416`, `:515`). No other consumer of `Help`.
- `:526–533` `SettingsScreen`: `const { s, set } = useSettings();` (`:528`),
  `const [helpOpen, setHelpOpen] = useState<string | null>(null);` (`:529`),
  `const help: Help = { open: helpOpen, toggle: (k) => setHelpOpen((cur) => (cur === k ? null : k)) };` (`:530–533`).
- `:536–542` APPEARANCE card: `<Text style={[st.h2, …]}>APPEARANCE</Text>` then the `Theme`
  `Row` (`:538–542`) with a `Seg` inside; the card's `</View>` at `:542`.
- `:134–141` `function Switch({ on, onToggle, t })` — the toggle control every boolean row uses,
  e.g. `:554` `<Switch on={s.liveMap} onToggle={() => set('liveMap', !s.liveMap)} t={t} />`.
- `:651` `helpBtn` style — the only "?" affordance in the app (`grep helpBtn app/src` → this
  file only, 2026-09-15). No other screen has help icons.

## Rulings

### R1 — One persisted boolean, default on
Add to `Settings` after `showSportPillOnRecord` (`:49`):
```ts
  /** virgin-cycle7: master switch for the "?" help buttons on this screen.
   * Off hides every row's "?" (and collapses any open hint); on is the
   * pre-cycle-7 behaviour. Persisted like every other field. Default true. */
  showHelp: boolean;
```
and to `DEFAULTS` (`:61`): `showHelp: true,`. Nothing changes in `load()`, the provider or
the write effect — the existing spread-over-defaults handles old `settings.json` files
(no key → `true` → today's behaviour). Non-disruptive by construction.

### R2 — The gate lives in `Row`, via `Help`
Extend the interface (`:155`) and its comment:
```ts
/** WP-L: which row's help is showing (keyed by label); one at a time.
 * virgin-cycle7: `show` is the master switch — false hides every "?" and
 * every hint, whatever `open` says. */
interface Help { show: boolean; open: string | null; toggle: (key: string) => void }
```
and change `:165` to
```ts
  const hasHelp = props.help.show && props.hint !== undefined && props.hint !== '';
```
That is the whole behavioural change: `:166`'s `open` already depends on `hasHelp`, so with
`show === false` the "?" (`:176`) and the hint (`:188`) both stop rendering, in every `Row`,
including `SportsSection`'s — no call site changes, no prop threading.

### R3 — Build the `help` object from the setting
`:530–533` becomes
```ts
  const help: Help = {
    show: s.showHelp,
    open: helpOpen,
    toggle: (k) => setHelpOpen((cur) => (cur === k ? null : k)),
  };
```

### R4 — The switch row: APPEARANCE, under Theme, no hint of its own
Insert after the `Theme` `Row`'s closing `</Row>` (`:542`), inside the same card `View`:
```tsx
        <Row label="Help icons" t={t} help={help}>
          <Switch on={s.showHelp}
            onToggle={() => { set('showHelp', !s.showHelp); setHelpOpen(null); }} t={t} />
        </Row>
```
- **No `hint` prop, deliberately.** A hint that explains the "?" would disappear together
  with the "?" — the label has to carry the meaning on its own. Do not add one.
- `setHelpOpen(null)` on every toggle: switching off collapses whatever is open (R2 does
  that already through `hasHelp`, this just keeps the state honest); switching back on
  starts with nothing expanded, which is what a fresh mount does today.
- Label is `Help icons` — sentence case like `Live map` / `Sector colours`. If Nathan wants
  the literal `?` in the label it is a one-word change; not the executor's call.
- Placement under APPEARANCE: it is about how the screen looks, not what the bike does.

### R5 — Nothing else changes
No change to `Seg`, `Switch`, the `helpBtn`/`helpText` styles, the per-row `hint` strings,
`SportsSection`'s signature, or any other screen. The per-row "?" mechanism is not replaced
by anything — it is gated.

## Rules
- Touch only `app/src/ui/settings.tsx`. If the change appears to need a second file, stop
  and report why.
- Never delete; move to `safe_to_delete/`. Git via `device_bash` with `GIT_OPTIONAL_LOCKS=0`;
  `mv` stale `.git/*.lock` aside, never delete.
- Independent of `BRIEF-colours-update.md` (different files). Either order; separate commits.
- Footprint: ~14 lines added, 2 changed. Past 30, something is off — stop.

## Tasks
1. Re-read every anchor above against the file on disk; note actual line numbers for the
   report. 2. R1. 3. R2. 4. R3. 5. R4. 6. Verify. 7. Commit.

## Acceptance criteria
- `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0 (not bare `npx tsc`). In
  particular `Help` now requires `show`, so any object literal the compiler flags is a call
  site you missed — there should be exactly one (`SettingsScreen`).
- `cd app && node --experimental-strip-types tests/run.ts` — **zero FAIL**, counts in the
  report (no test imports `ui/settings`, so the counts should match the pre-change run).
- On the phone (Nathan, or the executor if a device is reachable; otherwise "pending"):
  1. Fresh launch: every row that had a "?" still has it; `Help icons` row is ON.
  2. Open a hint (e.g. Timing), then switch `Help icons` OFF: the hint collapses and no "?"
     is visible anywhere on SETTINGS, including the SPORTS section.
  3. Kill and relaunch the app: still OFF (persisted). Switch ON: all "?" return, none open.
  4. The `Help icons` row itself never shows a "?" in either state.
- One commit: `app: settings — one "Help icons" switch gates every "?" (showHelp, default on)`,
  ending with the attribution lines from the session reminder.

## Report back
Plain text. Actual line numbers edited; tsc + test counts; commit hash; on-device check
status (done with a screenshot per state, or pending on Nathan's phone); anything stopped
on, verbatim.

## Ground-rule wording for the coordinator (STATE.md, after landing)
"SETTINGS → APPEARANCE → `Help icons` (`showHelp`, default on) is the only control over the
'?' hints; per-row hints are gated, not removed."
