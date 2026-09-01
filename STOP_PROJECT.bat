@echo off
setlocal
cd /d "%~dp0"
title [CLOUD-SECURITY] Shutdown

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stopper.ps1"
