param(
    [string]$Host = "127.0.0.1",
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "Starting frontend on http://$Host`:$Port" -ForegroundColor Cyan

npm run dev -- --hostname $Host --port $Port
