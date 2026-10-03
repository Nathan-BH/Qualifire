@echo off
rem Double-clickable launcher for build 8 -- Qualifire Preview rebuilt in place (blank seed for travel + OTA fingerprint re-anchor).
rem Usage: build8.cmd        -> check config, then queue the build
rem        build8.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\build8.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\build8.ps1" %*
)
pause
