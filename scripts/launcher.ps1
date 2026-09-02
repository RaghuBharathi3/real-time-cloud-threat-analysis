# ==============================================================================
# AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments
# One-Click Automated Startup Engine (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent $PSScriptRoot
$LogsDir = Join-Path $RootDir "logs"

if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AI MULTI-CLOUD SECURITY OPERATIONS PLATFORM" -ForegroundColor Cyan
Write-Host " Automated Startup & Health Verification System" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# STEP 1: Environment & Tooling Verification
# ------------------------------------------------------------------------------
Write-Host "[1/6] Checking system environment..." -NoNewline

# Check Python
$PythonExe = Join-Path $RootDir "backend\venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $SysPython = Get-Command python -ErrorAction SilentlyContinue
    if (-not $SysPython) {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host "`nERROR: Python was not found on your system PATH." -ForegroundColor Red
        Write-Host "Please install Python 3.10+ and add it to your system PATH." -ForegroundColor Yellow
        Pause
        Exit 1
    }
    Write-Host "`nCreating Python virtual environment in backend\venv..." -ForegroundColor Yellow
    & python -m venv (Join-Path $RootDir "backend\venv")
    $PythonExe = Join-Path $RootDir "backend\venv\Scripts\python.exe"
}

# Check Node.js
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "`nERROR: Node.js was not found on your system PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 18+ (https://nodejs.org) and try again." -ForegroundColor Yellow
    Pause
    Exit 1
}

# Check .env
$EnvFile = Join-Path $RootDir ".env"
if (-not (Test-Path $EnvFile)) {
    $EnvExample = Join-Path $RootDir ".env.example"
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Host "`nCreated default .env from .env.example (DEMO_MODE=true)." -ForegroundColor Yellow
    }
}

Write-Host "             [OK]" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 2: Dependency Verification
# ------------------------------------------------------------------------------
Write-Host "[2/6] Verifying project dependencies..." -NoNewline

# Check Frontend node_modules
$FrontendModules = Join-Path $RootDir "frontend\node_modules"
if (-not (Test-Path $FrontendModules)) {
    Write-Host "`nInstalling frontend npm dependencies (first run)..." -ForegroundColor Yellow
    Push-Location (Join-Path $RootDir "frontend")
    & npm install --silent
    Pop-Location
}

# Check backend packages
$UvicornExe = Join-Path $RootDir "backend\venv\Scripts\uvicorn.exe"
if (-not (Test-Path $UvicornExe)) {
    Write-Host "`nInstalling backend Python requirements (first run)..." -ForegroundColor Yellow
    & $PythonExe -m pip install -r (Join-Path $RootDir "backend\requirements.txt") --quiet
}

Write-Host "         [OK]" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 3: Port Conflict Management & Cleanup
# ------------------------------------------------------------------------------
function Free-Port([int]$Port) {
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
}

Free-Port 8000
Free-Port 5173

# ------------------------------------------------------------------------------
# STEP 4: Launch Backend Service (Port 8000)
# ------------------------------------------------------------------------------
Write-Host "[3/6] Starting Backend API (Port 8000)..." -NoNewline

$BackendExe = Join-Path $RootDir "backend\venv\Scripts\uvicorn.exe"
$BackendDir = Join-Path $RootDir "backend"

$BackendProcess = Start-Process -FilePath $BackendExe `
    -ArgumentList "app.main:app", "--app-dir", "`"$BackendDir`"", "--host", "127.0.0.1", "--port", "8000", "--reload" `
    -WorkingDirectory $BackendDir `
    -PassThru `
    -WindowStyle Minimized

Set-Content -Path (Join-Path $LogsDir "backend.pid") -Value $BackendProcess.Id

Write-Host "        [OK]" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 5: Launch Frontend Console (Port 5173)
# ------------------------------------------------------------------------------
Write-Host "[4/6] Starting Frontend Console (Port 5173)..." -NoNewline

$FrontendDir = Join-Path $RootDir "frontend"

$FrontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm", "run", "dev" `
    -WorkingDirectory $FrontendDir `
    -PassThru `
    -WindowStyle Minimized

Set-Content -Path (Join-Path $LogsDir "frontend.pid") -Value $FrontendProcess.Id

Write-Host "   [OK]" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 6: Health Checks & Service Readiness Verification
# ------------------------------------------------------------------------------
Write-Host "[5/6] Verifying pipeline health..." -NoNewline

$BackendReady = $false
$Retries = 20

while ($Retries -gt 0 -and -not $BackendReady) {
    Start-Sleep -Milliseconds 800
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response -and $response.status -eq "healthy") {
            $BackendReady = $true
            break
        }
    } catch {
        $Retries--
    }
}

if (-not $BackendReady) {
    Write-Host "            [FAILED]" -ForegroundColor Red
    Write-Host "`nWARNING: Backend is taking longer than expected to initialize." -ForegroundColor Yellow
    Write-Host "Check backend logs or manually inspect the minimized Backend window." -ForegroundColor Yellow
} else {
    Write-Host "            [OK]" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# STEP 7: Automatic Browser Launch
# ------------------------------------------------------------------------------
Write-Host "[6/6] Launching Security Operations Console..." -ForegroundColor DarkCyan
Start-Sleep -Seconds 1
Start-Process "http://127.0.0.1:5173"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " MULTI-CLOUD SECURITY PLATFORM READY" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Operations Dashboard : http://127.0.0.1:5173" -ForegroundColor White
Write-Host " Backend REST API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host " Active Architecture  : AWS + Azure + GCP + OCI + Random Forest ML" -ForegroundColor Gray
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " To stop the project  : Double-click STOP_PROJECT.bat" -ForegroundColor Yellow
Write-Host " To restart services  : Double-click RESTART_PROJECT.bat" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan
