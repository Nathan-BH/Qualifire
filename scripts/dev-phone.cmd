@echo off
rem Double-clickable launcher for the phone dev loop: Metro/Expo dev server, the installed dev-client connects over WiFi.
rem Usage: dev-phone.cmd            -> virgin/empty seed (default), Fast Refresh on every save
rem        dev-phone.cmd shipped    -> Leuven seed (rides/results/tier chips), forces --clear (-Shipped)
rem        dev-phone.cmd clear      -> wipe Metro's cache first (-Clear)
cd /d "%~dp0"
if /i "%~1"=="shipped" (
  powershell -ExecutionPolicy Bypass -File ".\dev-phone.ps1" -Shipped
) else if /i "%~1"=="clear" (
  powershell -ExecutionPolicy Bypass -File ".\dev-phone.ps1" -Clear
) else (
  powershell -ExecutionPolicy Bypass -File ".\dev-phone.ps1" %*
)
pause
