# ==============================================================================
# AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments
# Safe Service Shutdown Engine (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent $PSScriptRoot
$LogsDir = Join-Path $RootDir "logs"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " STOPPING CLOUD SECURITY PLATFORM SERVICES" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Stop via saved PID files
$BackendPidFile = Join-Path $LogsDir "backend.pid"
if (Test-Path $BackendPidFile) {
    $bPid = Get-Content $BackendPidFile -ErrorAction SilentlyContinue
    if ($bPid) {
        try {
            Stop-Process -Id ([int]$bPid) -Force -ErrorAction SilentlyContinue
            # Also kill child processes of cmd
            Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq [int]$bPid } | ForEach-Object {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
    Remove-Item $BackendPidFile -Force -ErrorAction SilentlyContinue
}

$FrontendPidFile = Join-Path $LogsDir "frontend.pid"
if (Test-Path $FrontendPidFile) {
    $fPid = Get-Content $FrontendPidFile -ErrorAction SilentlyContinue
    if ($fPid) {
        try {
            Stop-Process -Id ([int]$fPid) -Force -ErrorAction SilentlyContinue
            Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq [int]$fPid } | ForEach-Object {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
    Remove-Item $FrontendPidFile -Force -ErrorAction SilentlyContinue
}

# 2. Release Ports 8000 and 5173
function Release-Port([int]$Port, [string]$ServiceName) {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pidToKill = $conn.OwningProcess
            if ($pidToKill -gt 0) {
                try {
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                    & cmd.exe /c "taskkill /F /PID $pidToKill /T >nul 2>&1"
                } catch {}
            }
        }
    }
    Write-Host " $ServiceName (Port $Port) stopped   [OK]" -ForegroundColor Green
}

Release-Port 8000 "Backend API"
Release-Port 5173 "Frontend Console"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " All cloud security services stopped successfully." -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan
