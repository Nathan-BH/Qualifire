@echo off
rem Double-clickable launcher for build 5 (Qualifire Preview commute APK, D-043).
rem Usage: build5.cmd        -> queue the build
rem        build5.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\build5.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\build5.ps1" %*
)
pause
