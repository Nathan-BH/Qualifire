<#
    Qualifire -- build 5: the standalone "Qualifire Preview" commute APK (D-043,
    2026-08-19). Same engine as build 4 (build4.ps1 does all the preflight and
    the EAS call); this wrapper only fixes the arguments so the name matches
    the build number:

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\build5.ps1 -DryRun   # preflight only -- spends nothing
        powershell -ExecutionPolicy Bypass -File .\build5.ps1           # queue the preview APK on EAS (~10-20 min); reuse the keystore

    (Nathan's machine needs the -ExecutionPolicy Bypass prefix every time --
    always write the commands that way. Or double-click build5.cmd, which
    does exactly that for you.)

    Which app it overwrites: the -BuildProfile preview argument selects the
    `preview` profile in app/eas.json, which sets APP_VARIANT=preview, which
    makes app/app.config.js name the app "Qualifire Preview" with package id
    com.nathanbonher.qualifire.preview. Android replaces the installed app
    that has that SAME package id and signing key -- i.e. the old Qualifire
    Preview icon -- and leaves the dev client (com.nathanbonher.qualifire)
    untouched. Build 4 / .\build4.ps1 (default profile = development) rebuilds
    the dev client instead.

    What rides: whatever JS is in app/ when you run this. Commit first.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$NoWait
)
& (Join-Path $PSScriptRoot 'build4.ps1') -BuildProfile preview -Standalone `
    -DryRun:$DryRun -SkipTests:$SkipTests -NoWait:$NoWait
