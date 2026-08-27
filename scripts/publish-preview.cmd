@echo off
rem Double-clickable launcher for the Qualifire Preview OTA publish (EAS Update).
rem Usage: publish-preview.cmd        -> publish (message = last commit subject)
rem        publish-preview.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\publish-preview.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\publish-preview.ps1" %*
)
pause
