param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "Starting frontend on http://$HostName`:$Port" -ForegroundColor Cyan

npx next dev --hostname $HostName --port $Port
