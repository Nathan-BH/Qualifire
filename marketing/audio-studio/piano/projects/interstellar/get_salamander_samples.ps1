<#
Downloads the real Salamander Grand Piano sample set (the same one midiviewer.io's
and Klang.io's own MIDI-preview players use under the hood -- a Yamaha C5, multi-
sampled every minor third across all 88 keys, CC-BY 3.0 licensed by Alexander Holm)
from a public mirror on GitHub, into this project's samples folder.

WHY THIS EXISTS: neither the Cowork cloud sandbox's shell nor Nathan's own PC shell
(device_bash) can reach raw.githubusercontent.com -- both go through a proxy that
returns 403 for that host (checked 2026-09-19). Claude cannot run this itself. Run it
from a normal PowerShell window on your own machine (not through Cowork/Claude Code),
where your regular internet connection almost certainly isn't behind that same proxy.

USAGE (per this project's convention -- ExecutionPolicy Bypass, plain .\ doesn't run):
    powershell -ExecutionPolicy Bypass -File .\get_salamander_samples.ps1

Downloads ~30 mp3 files (one per sampled note, ~550KB-1MB total) into:
    ..\..\samples\salamander\   (i.e. piano\samples\salamander\, shared across all
    piano projects, not just this one -- matches how audio-studio\synth.py is shared)

If this succeeds, tell Claude -- it can then write a sample-based renderer
(mirroring fluid_render.py's API) that uses these instead of the FluidSynth GM
soundfont, for the real Salamander quality instead of the current substitute.
#>

$ErrorActionPreference = "Continue"
$notes = @(
    "A0","C1","Ds1","Fs1","A1","C2","Ds2","Fs2","A2","C3","Ds3","Fs3","A3",
    "C4","Ds4","Fs4","A4","C5","Ds5","Fs5","A5","C6","Ds6","Fs6","A6",
    "C7","Ds7","Fs7","A7","C8"
)
$base = "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/piano"
$outDir = Join-Path $PSScriptRoot "..\..\samples\salamander"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$ok = 0
$fail = @()
foreach ($n in $notes) {
    $url = "$base/$n.mp3"
    $dest = Join-Path $outDir "$n.mp3"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -TimeoutSec 20 -ErrorAction Stop
        $sizeKB = [math]::Round((Get-Item $dest).Length / 1KB, 1)
        Write-Host "OK   $n.mp3  ($sizeKB KB)"
        $ok++
    } catch {
        Write-Host "FAIL $n.mp3  -- $($_.Exception.Message)"
        $fail += $n
    }
}

Write-Host ""
Write-Host "Done: $ok / $($notes.Count) downloaded to $outDir"
if ($fail.Count -gt 0) {
    Write-Host "Failed: $($fail -join ', ')"
    Write-Host "If ALL of them failed, your network can't reach raw.githubusercontent.com"
    Write-Host "either -- tell Claude and we'll fall back to the FluidSynth version."
}
