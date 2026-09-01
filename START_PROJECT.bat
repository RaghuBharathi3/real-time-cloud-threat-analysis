@echo off
setlocal
cd /d "%~dp0"
title [CLOUD-SECURITY] Launcher

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Launcher encountered an unexpected failure.
    pause
)
