@echo off
rem Double-clickable launcher: run the dev client against the empty/virgin seed (B-39).
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\dev-virgin.ps1" %*
pause
