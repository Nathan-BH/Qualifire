<#
.SYNOPSIS
    Preflight-checks Node.js and FFmpeg, then previews or renders the
    Qualifire HyperFrames brand teaser (marketing\hyperframes\teaser).

.DESCRIPTION
    HyperFrames (github.com/heygen-com/hyperframes) needs Node.js 22+ and
    FFmpeg on PATH. This script checks both with clear error messages, then
    runs `npx hyperframes preview` (default, live-reload in the browser) or
    `npx hyperframes render` (renders teaser\ to an MP4) with -Render.

    Windows-only; run from a PowerShell prompt on Nathan's PC (the cloud
    sandbox that authored this repo cannot reach npm).

.PARAMETER Render
    Render the teaser to MP4 instead of opening the live preview.

.EXAMPLE
    .\render.ps1
    .\render.ps1 -Render
#>

[CmdletBinding()]
param(
    [switch]$Render
)

$ErrorActionPreference = 'Stop'

function Test-CommandExists {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

Write-Host 'Qualifire HyperFrames teaser -- preflight checks' -ForegroundColor Cyan

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

# --- Run HyperFrames in the teaser folder -----------------------------------
$teaserDir = Join-Path -Path $PSScriptRoot -ChildPath 'teaser'
if (-not (Test-Path -Path $teaserDir)) {
    Write-Error "Could not find the teaser composition folder at '$teaserDir'."
    exit 1
}

Push-Location -Path $teaserDir
try {
    if ($Render) {
        Write-Host 'Rendering teaser to MP4 (npx hyperframes render)...' -ForegroundColor Cyan
        npx --yes hyperframes render
    }
    else {
        Write-Host 'Opening teaser preview (npx hyperframes preview)...' -ForegroundColor Cyan
        npx --yes hyperframes preview
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "hyperframes exited with code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
