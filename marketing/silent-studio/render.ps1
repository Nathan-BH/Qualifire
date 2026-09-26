<#
.SYNOPSIS
    Preflight-checks Node.js and FFmpeg, then previews or renders a
    Qualifire HyperFrames composition (marketing\silent-studio\<name>).

.DESCRIPTION
    HyperFrames (github.com/heygen-com/hyperframes) needs Node.js 22+ and
    FFmpeg on PATH. This script checks both with clear error messages, then
    runs `npx hyperframes preview` (default, live-reload in the browser) or
    `npx hyperframes render` (renders <name>\ to an MP4) with -Render.

    Windows-only; run from a PowerShell prompt on Nathan's PC (the cloud
    sandbox that authored this repo cannot reach npm).

.PARAMETER Name
    Which composition folder under marketing\silent-studio\ to preview or
    render (e.g. teaser-full, scenes\start-ride). Defaults to
    'teaser-full' (changed 2026-09-26, marketing cycle 24: the old 'teaser' concat folder is archived).

.PARAMETER Render
    Render the composition to MP4 instead of opening the live preview.

.PARAMETER Theme
    'night' (default) or 'day'. Sets data-theme via the composition's
    theme.js before previewing/rendering and restores 'night' afterward, so
    the canonical index.html is never touched. Requires the composition to
    have a theme.js (all seven tokenised compositions do as of cycle 08).

.EXAMPLE
    .\render.ps1
    .\render.ps1 -Render
    .\render.ps1 -Name scenes\start-ride
    .\render.ps1 -Name scenes\gates-saving -Theme day
    .\render.ps1 -Name teaser-full -Theme day -Render
#>

[CmdletBinding()]
param(
    [string]$Name = 'teaser-full',
    [switch]$Render,
    [ValidateSet('night', 'day')][string]$Theme = 'night'
)

$ErrorActionPreference = 'Stop'

function Test-CommandExists {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

Write-Host "Qualifire HyperFrames $Name -- preflight checks" -ForegroundColor Cyan

# --- Node.js 22+ ---------------------------------------------------------
if (-not (Test-CommandExists -Name 'node')) {
    Write-Error 'Node.js was not found on PATH. HyperFrames needs Node.js 22 or newer -- install it from https://nodejs.org/ and re-run this script.'
    exit 1
}

$nodeVersionRaw = (node --version).Trim()   # e.g. "v22.11.0"
if ($nodeVersionRaw -match '^v(\d+)\.') {
    $nodeMajor = [int]$Matches[1]
}
else {
    Write-Error "Could not parse a version number from Node's reported version '$nodeVersionRaw'. HyperFrames needs Node.js 22 or newer."
    exit 1
}

if ($nodeMajor -lt 22) {
    Write-Error "Node.js $nodeVersionRaw is installed, but HyperFrames needs Node.js 22 or newer. Install a newer Node.js from https://nodejs.org/ and re-run this script."
    exit 1
}

Write-Host "  Node.js $nodeVersionRaw -- OK" -ForegroundColor Green

# --- FFmpeg ----------------------------------------------------------------
if (-not (Test-CommandExists -Name 'ffmpeg')) {
    Write-Error "FFmpeg was not found on PATH. HyperFrames' renderer uses it to encode the MP4 -- install it (e.g. 'winget install Gyan.FFmpeg' or from https://ffmpeg.org/download.html), make sure it is on PATH, and re-run this script."
    exit 1
}

Write-Host '  FFmpeg -- OK' -ForegroundColor Green

# --- Run HyperFrames in the target composition folder -----------------------
$targetDir = Join-Path -Path $PSScriptRoot -ChildPath $Name
if (-not (Test-Path -Path $targetDir)) {
    Write-Error "Could not find the '$Name' composition folder at '$targetDir'."
    exit 1
}

$themeJsPath = Join-Path -Path $targetDir -ChildPath 'theme.js'
$themeEnabled = Test-Path -Path $themeJsPath

if ($Theme -eq 'day' -and -not $themeEnabled) {
    Write-Error "'$Name' is not theme-enabled yet (no theme.js). See marketing/cycles/08_*/BRIEF-daynight-renders.md."
    exit 1
}

if ($themeEnabled) {
    "document.documentElement.setAttribute('data-theme','$Theme');" | Set-Content -Path $themeJsPath -NoNewline -Encoding ASCII
}

Push-Location -Path $targetDir
try {
    $renderStart = Get-Date

    if ($Render) {
        Write-Host "Rendering $Name to MP4 (npx hyperframes render)..." -ForegroundColor Cyan
        npx --yes hyperframes render
    }
    else {
        Write-Host "Opening $Name preview (npx hyperframes preview)..." -ForegroundColor Cyan
        npx --yes hyperframes preview
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "hyperframes exited with code $LASTEXITCODE."
        exit $LASTEXITCODE
    }

    if ($Render -and $Theme -eq 'day') {
        $rendersDir = Join-Path -Path $targetDir -ChildPath 'renders'
        $newMp4s = Get-ChildItem -Path $rendersDir -Filter '*.mp4' -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -gt $renderStart }
        if ($newMp4s.Count -eq 1) {
            $dayName = [System.IO.Path]::GetFileNameWithoutExtension($newMp4s[0].Name) + '_day.mp4'
            Rename-Item -Path $newMp4s[0].FullName -NewName $dayName
            Write-Host "  Renamed $($newMp4s[0].Name) -> $dayName" -ForegroundColor Green
        }
        else {
            $found = if ($newMp4s.Count -eq 0) { '(none)' } else { ($newMp4s | ForEach-Object { $_.Name }) -join ', ' }
            Write-Warning "Expected exactly one new render in '$rendersDir' with LastWriteTime after $renderStart, found $($newMp4s.Count): $found. Leaving files as they are -- rename manually."
        }
    }
}
finally {
    if ($themeEnabled) {
        "document.documentElement.setAttribute('data-theme','night');" | Set-Content -Path $themeJsPath -NoNewline -Encoding ASCII
    }
    Pop-Location
}
