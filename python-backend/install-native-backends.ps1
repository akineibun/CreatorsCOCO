$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

if (Test-Path ".\.venv\Scripts\python.exe") {
  $pythonExe = Resolve-Path ".\.venv\Scripts\python.exe"
} else {
  $pythonExe = "python"
}

Write-Host "Installing optional native backend dependencies for CreatorsCOCO..."
Write-Host "Using Python runtime: $pythonExe"

& $pythonExe -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
  throw "Failed to upgrade pip for native backend install."
}

& $pythonExe -m pip install -r .\requirements-native.txt
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install native backend base dependencies."
}

Write-Host "Installing SAM3 from the official GitHub repository..."
$sam3InstallSucceeded = $true
& $pythonExe -m pip install "git+https://github.com/facebookresearch/sam3.git"
if ($LASTEXITCODE -ne 0) {
  $sam3InstallSucceeded = $false
  Write-Warning "SAM3 install failed. CreatorsCOCO will continue using heuristic SAM3 fallback."
  Write-Warning "On Python 3.14 this currently tends to fail because a transitive NumPy build path still expects a local compiler toolchain."
  Write-Warning "If you need native SAM3, use a dedicated Python 3.12 environment and follow the official SAM3 setup/checkpoint steps."
}

Write-Host "Native backend install finished."
if ($sam3InstallSucceeded) {
  Write-Host "SAM3 install completed. If checkpoints are still missing, follow the official SAM3 repository steps to request/download them."
} else {
  Write-Host "SAM3 native install was skipped after failure. NudeNet native packages may still be available."
}
