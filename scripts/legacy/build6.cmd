@echo off
rem Double-clickable launcher for build 6 (Qualifire Preview APK with the OTA updater).
rem Usage: build6.cmd        -> npm install + queue the build
rem        build6.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\build6.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\build6.ps1" %*
)
pause
