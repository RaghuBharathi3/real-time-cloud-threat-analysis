@echo off
setlocal
cd /d "%~dp0"
title [CLOUD-SECURITY] Restarting Services

echo ============================================================
echo  RESTARTING MULTI-CLOUD SECURITY PLATFORM
echo ============================================================
echo [1/2] Stopping active services...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stopper.ps1"

ping 127.0.0.1 -n 3 >nul

echo [2/2] Launching platform services...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1"
