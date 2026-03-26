$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

$python312 = "D:\AI\Data\Assets\Python\cpython-3.12.11-windows-x86_64-none\python.exe"
$venvPath = Join-Path $scriptRoot ".venv312"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

if (!(Test-Path $python312)) {
  throw "Python 3.12 runtime not found at $python312"
}

if (!(Test-Path $venvPython)) {
  Write-Host "Creating Python 3.12 native venv at $venvPath"
  & $python312 -m venv $venvPath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create Python 3.12 venv."
  }
}

Write-Host "Using native SAM3 venv: $venvPython"
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
  throw "Failed to upgrade pip in Python 3.12 venv."
}

& $venvPython -m pip install -r .\requirements.txt
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install base backend requirements."
}

& $venvPython -m pip install -r .\requirements-native.txt
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install native backend requirements."
}

Write-Host "Installing SAM3 from GitHub into Python 3.12 venv..."
& $venvPython -m pip install "git+https://github.com/facebookresearch/sam3.git"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install SAM3 into Python 3.12 venv."
}

Write-Host ""
Write-Host "Native SAM3 environment is ready."
Write-Host "Next:"
Write-Host "  1. Put checkpoint files under python-backend\\models\\sam3"
Write-Host "  2. Optionally put config yaml under python-backend\\models\\sam3"
Write-Host "  3. Launch CreatorsCOCO and verify /api/status shows sam3_checkpoint_ready=true"
