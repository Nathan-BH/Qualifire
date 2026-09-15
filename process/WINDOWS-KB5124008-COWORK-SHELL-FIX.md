# Windows KB5124008 broke the Cowork shell — rollback log (2026-09-14)

## Symptom
Every `device_bash` call in Cowork failed immediately with:

    sandbox-helper: no Plan9 drive shares mounted under /mnt/.virtiofs-root/shared

The app also showed: "A Windows update released September 8 prevents Claude's workspace
from reaching your files." `device_list_dir` / `device_stage_files` / `device_commit_files`
kept working; only the in-VM shell was dead. So: no tests, no tsc, no git, no PowerShell
builds on the PC from Cowork.

## Cause
Tracked upstream: https://github.com/anthropics/claude-code/issues/92958
The September 2026 Windows cumulative update (KB5124008 on x64 24H2/25H2, build 26100.9445 /
26200.9445) changed `vmcompute.dll`; the Cowork Hyper-V VM's Plan9 share attach then fails
with EINVAL. Not an app bug; Anthropic must harden the attach path. Not fixed as of today.

NOT a fix: `"sandbox": {"enabled": false}` in `~/.claude/settings.json` — that only affects
the Claude Code CLI's command sandbox, not the Cowork VM.

## What I did (personal PC, pc-mamba, Windows 11 x64)
1. Confirmed the build in admin PowerShell:
       Get-WindowsPackage -Online | Where-Object PackageName -like "*RollupFix*9445*" | Select PackageName
   -> Package_for_RollupFix~31bf3856ad364e35~amd64~~26100.9445.1.26
2. Paused Windows Update (Settings > Windows Update > Pause updates, 5 weeks).
3. Removed the update:
       Remove-WindowsPackage -Online -NoRestart -PackageName "Package_for_RollupFix~31bf3856ad364e35~amd64~~26100.9445.1.26"
   -> RestartNeeded : True
4. Restarted the PC.

## Outcome
Works. After the restart the VM took ~2 min to boot (one "failed to start" on the way, then
fine). `device_bash` runs, `$HOME/mnt/Qualifire` mounts and lists normally. The desktop app
also self-updated to 1.52386.6 during the restart.

Trade-off: KB5124008 patches actively exploited CVEs; the PC is unpatched until Anthropic
ships a fix and the update is reinstalled.

## TODO — check periodically
- [ ] Check https://github.com/anthropics/claude-code/issues/92958 for an Anthropic fix.
- [ ] Once fixed: un-pause Windows Update, let the KB reinstall, restart, and re-test
      `device_bash` (a bare `echo ok` is enough).
- [ ] The pause expires after 5 weeks (~2026-10-19). If the KB reinstalls before the fix,
      the shell dies again with the same "no Plan9 drive shares" message — repeat steps 1–4.
