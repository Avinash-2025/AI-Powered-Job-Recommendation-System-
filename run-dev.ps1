$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Resolve-Python {
  $bundled = Join-Path $HOME ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
  if (Test-Path $bundled) {
    return $bundled
  }

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    return $python.Source
  }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) {
    return $py.Source
  }

  throw "Python was not found. Install Python, then run: pip install -r backend\requirements.txt"
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  throw "npm.cmd was not found. Install Node.js before starting the frontend."
}

$pythonExe = Resolve-Python
$backendLog = Join-Path $PSScriptRoot "backend.log"
$frontendLog = Join-Path $PSScriptRoot "frontend.log"

function Quote-PowerShellArg($value) {
  return "'" + ($value -replace "'", "''") + "'"
}

function Start-LoggedPowerShell($scriptText, $logPath) {
  if (Test-Path $logPath) { Remove-Item $logPath -Force }

  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($scriptText))
  return Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded" `
    -WorkingDirectory $PSScriptRoot `
    -WindowStyle Hidden `
    -PassThru
}

$rootArg = Quote-PowerShellArg $PSScriptRoot
$pythonArg = Quote-PowerShellArg $pythonExe
$npmArg = Quote-PowerShellArg $npm.Source
$backendLogArg = Quote-PowerShellArg $backendLog
$frontendLogArg = Quote-PowerShellArg $frontendLog

$backendScript = "`$ErrorActionPreference = 'Continue'; Set-Location -LiteralPath $rootArg; & $pythonArg 'backend\app.py' *> $backendLogArg"
$frontendScript = "`$ErrorActionPreference = 'Continue'; Set-Location -LiteralPath $rootArg; & $npmArg 'run' 'dev' '--' '--host' '0.0.0.0' *> $frontendLogArg"

$backend = Start-LoggedPowerShell $backendScript $backendLog
$frontend = Start-LoggedPowerShell $frontendScript $frontendLog

Write-Host "Backend PID:  $($backend.Id) -> http://localhost:5000/api/health"
Write-Host "Frontend PID: $($frontend.Id) -> http://localhost:8080"
Write-Host "Logs: backend.log, frontend.log"
