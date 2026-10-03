<#
    virgin-cycle19 -- measure.ps1: the measurement steps of COMMANDS.md as one script,
    so nothing has to be quoted by hand. Reads only (writes under safe_to_delete\ only).
    Needs Nathan's PC (npx / eas-cli). Written 2026-09-30 (Plan tier). ASCII only.

        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Archive
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Apk
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -ApkContents
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Fingerprint
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Export
        powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\cycles\virgin-cycle19\measure.ps1" -Export -Shipped

    -Archive      what EAS would upload (eas build:inspect --stage archive), size + top-level listing
    -Apk          last finished preview build: id, status, fingerprint, APK size (downloads the APK)
    -ApkContents  size per folder inside that downloaded APK (lib\<abi>, assets, ...)
    -Fingerprint  fingerprint of the tree as it is now (preview variant, empty seed)
    -Export       expo export (empty seed) -> are the Leuven PNGs / seed strings in the bundle?
    -Export -Shipped   same with the shipped seed (must still contain them)
#>
[CmdletBinding()]
param(
    [switch]$Archive,
    [switch]$Apk,
    [switch]$ApkContents,
    [switch]$Fingerprint,
    [switch]$Export,
    [switch]$Shipped
)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$app  = Join-Path $repo 'app'
$bin  = Join-Path $repo 'safe_to_delete'
if (-not (Test-Path $app)) { throw "app folder not found at $app" }
if (-not (Test-Path $bin)) { New-Item -ItemType Directory -Path $bin | Out-Null }

function Say ($m) { Write-Host "  $m" }
function Head ($m) { Write-Host "`n$m" -ForegroundColor Cyan }
function MB ($bytes) { '{0:N1} MB' -f ([double]$bytes / 1MB) }

if (-not ($Archive -or $Apk -or $ApkContents -or $Fingerprint -or $Export)) {
    Write-Host 'Pick one switch: -Archive | -Apk | -ApkContents | -Fingerprint | -Export [-Shipped]' -ForegroundColor Yellow
    return
}

Push-Location $app
try {
    if ($Archive) {
        Head '1. Upload archive (eas build:inspect --stage archive) -- what EAS would upload, no build spent'
        $out = Join-Path $bin 'eas-archive-inspect'
        npx.cmd eas-cli build:inspect --platform android --profile preview --stage archive --output $out --force
        $sum = (Get-ChildItem -Recurse -File -Force $out | Measure-Object Length -Sum).Sum
        Say ("ARCHIVE " + (MB $sum))
        Get-ChildItem -Force $out | ForEach-Object {
            $s = (Get-ChildItem -Recurse -File -Force $_.FullName | Measure-Object Length -Sum).Sum
            Say ('{0,10}  {1}' -f (MB $s), $_.Name)
        }
    }

    if ($Apk -or $ApkContents) {
        Head '2. Last finished preview build'
        $json = npx.cmd eas-cli build:list --platform android --build-profile preview --limit 1 --json --non-interactive 2>$null
        $b = ($json | ConvertFrom-Json)[0]
        Say ("build id     " + $b.id)
        Say ("status       " + $b.status)
        Say ("fingerprint  " + $b.runtimeVersion + "   <- this is the value for scripts\OTA-TROUBLESHOOTING.md")
        $apkPath = Join-Path $bin 'last-preview.apk'
        $url = $b.artifacts.applicationArchiveUrl
        if (-not $url) { Say 'no applicationArchiveUrl on this build (not finished?)'; return }
        Invoke-WebRequest -Uri $url -OutFile $apkPath -UseBasicParsing
        Say ("APK          " + (MB (Get-Item $apkPath).Length) + "   (" + $apkPath + ")")
        if ($ApkContents) {
            $zip = Join-Path $bin 'last-preview.zip'
            $dir = Join-Path $bin ('last-preview-unzipped-' + (Get-Date -Format 'yyyyMMdd-HHmm'))   # fresh folder each run, nothing deleted
            Copy-Item $apkPath $zip -Force
            Expand-Archive $zip $dir -Force
            Head '   size per folder inside the APK (lib\<abi> = brief 02 section 5b)'
            Get-ChildItem -Recurse -File $dir |
                Group-Object { $_.DirectoryName.Substring($dir.Length).TrimStart('\') } |
                ForEach-Object { [pscustomobject]@{ Bytes = ($_.Group | Measure-Object Length -Sum).Sum; Folder = $_.Name } } |
                Sort-Object Bytes -Descending | Select-Object -First 25 |
                ForEach-Object { Say ('{0,10}  {1}' -f (MB $_.Bytes), $_.Folder) }
        }
    }

    if ($Fingerprint) {
        Head '3. Fingerprint of the tree NOW (preview variant, empty seed)'
        $env:APP_VARIANT = 'preview'
        $env:EXPO_PUBLIC_SEED_MODE = 'empty'
        npx.cmd expo-updates fingerprint:generate --platform android
        Say 'same hash before and after a brief = OTA-able with publish-preview.ps1; different = needs build8.ps1'
    }

    if ($Export) {
        $mode = if ($Shipped) { 'shipped' } else { 'empty' }
        Head ("4. expo export, seed mode = " + $mode)
        $env:APP_VARIANT = 'preview'
        $env:EXPO_PUBLIC_SEED_MODE = $mode
        $out = Join-Path $bin ("export-check-" + $mode)
        npx.cmd expo export --platform android --output-dir $out --clear
        $map = Get-Content (Join-Path $out 'assetmap.json') -Raw
        $pngs = @('Morning', 'EveningA', 'EveningB') | Where-Object { $map.Contains('"name":"' + $_ + '"') }
        Say ("PNGs named in assetmap : " + ($pngs -join ','))
        $hbc = Get-ChildItem (Join-Path $out '_expo\static\js\android') -Filter *.hbc | Select-Object -First 1
        $txt = [Text.Encoding]::GetEncoding(28591).GetString([IO.File]::ReadAllBytes($hbc.FullName))
        $hits = @('seed:2026', 'puttestraat', 'web-mercator') | Where-Object { $txt.Contains($_) }
        Say ("seed strings in bundle : " + ($hits -join ','))
        Say ("bundle bytes           : " + ('{0:N0}' -f $hbc.Length) + "   (2026-09-29 empty export: 2,622,188)")
        Get-ChildItem (Join-Path $out 'assets') | Where-Object { $_.Length -gt 500KB } |
            ForEach-Object { Say ('assets over 500 KB     : {0:N0} bytes  {1}' -f $_.Length, $_.Name) }
        if ($mode -eq 'empty') {
            if ($pngs.Count -eq 0 -and $hits.Count -eq 0) { Say 'VERDICT: Leuven seed NOT in the bundle' }
            else { Say 'VERDICT: Leuven seed IS in the bundle (expected before brief 01)' }
        } else {
            if ($pngs.Count -eq 3) { Say 'VERDICT: shipped mode intact (all three PNGs present)' }
            else { Say 'VERDICT: shipped mode is missing PNGs -- brief 01 broke the dev path' }
        }
    }
}
finally { Pop-Location }
