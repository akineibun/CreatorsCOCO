$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

if (Test-Path ".\.venv312\Scripts\python.exe") {
  $pythonExe = Resolve-Path ".\.venv312\Scripts\python.exe"
} elseif (Test-Path ".\.venv\Scripts\python.exe") {
  $pythonExe = Resolve-Path ".\.venv\Scripts\python.exe"
} else {
  $pythonExe = "python"
}

Write-Host "Building CreatorsCOCO backend with Python runtime: $pythonExe"
& $pythonExe -m PyInstaller --noconfirm CreatorsCOCOBackend.spec
