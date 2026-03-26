param(
  [string]$PortableExePath = "D:\Other\CreatorsCOCO\release\CreatorsCOCO 1.0.0.exe",
  [string]$SmokeRoot = "",
  [int]$StartupTimeoutSeconds = 40
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $PortableExePath)) {
  throw "Portable exe not found: $PortableExePath"
}

if ([string]::IsNullOrWhiteSpace($SmokeRoot)) {
  $SmokeRoot = Join-Path $env:TEMP "CreatorsCOCO-smoke"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $SmokeRoot $timestamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$portableCopyPath = Join-Path $runDir "CreatorsCOCO 1.0.0.exe"
Copy-Item $PortableExePath $portableCopyPath -Force
$portableFile = Get-Item $portableCopyPath
$portableHash = (Get-FileHash -Path $portableCopyPath -Algorithm SHA256).Hash

Write-Host "Portable smoke directory: $runDir"
Write-Host "Launching portable exe: $portableCopyPath"

$process = $null
$launchError = $null
try {
  $process = Start-Process -FilePath $portableCopyPath -WorkingDirectory $runDir -PassThru
} catch {
  $launchError = $_.Exception.Message
  Write-Warning "Portable exe launch failed: $launchError"
}

$statusUrl = "http://127.0.0.1:8765/api/status"
$statusPayload = $null
$statusError = $null

if ($null -ne $process) {
  for ($attempt = 0; $attempt -lt $StartupTimeoutSeconds; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $statusPayload = Invoke-RestMethod -Uri $statusUrl -TimeoutSec 2
      if ($statusPayload) {
        break
      }
    } catch {
      $statusError = $_.Exception.Message
    }
  }
}

if ($launchError -and [string]::IsNullOrWhiteSpace($statusError)) {
  $statusError = $launchError
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  portableExePath = $portableCopyPath
  portableExeSha256 = $portableHash
  portableExeSizeBytes = $portableFile.Length
  portableExeVersion = $portableFile.VersionInfo.FileVersion
  smokeRoot = $runDir
  startupTimeoutSeconds = $StartupTimeoutSeconds
  statusUrl = $statusUrl
  launchOk = $null -ne $process
  launchError = $launchError
  statusOk = $null -ne $statusPayload
  statusError = $statusError
  backendStatus = $statusPayload
}

$reportPath = Join-Path $runDir "portable-smoke-report.json"
$report | ConvertTo-Json -Depth 10 | Set-Content -Path $reportPath -Encoding UTF8

Write-Host "Smoke report written to: $reportPath"
if ($statusPayload) {
  Write-Host "Backend status reached successfully."
  $report | ConvertTo-Json -Depth 10
} else {
  Write-Warning "Backend status did not become available before timeout."
}

Get-Process | Where-Object { $_.ProcessName -like "CreatorsCOCO*" -or $_.ProcessName -eq "CreatorsCOCOBackend" } | Stop-Process -Force -ErrorAction SilentlyContinue
