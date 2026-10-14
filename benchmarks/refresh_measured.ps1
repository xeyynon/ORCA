# Daily routine for the measured-covariance results (research brief, Exp 1 -> Exp 4 and 5).
#   1. take one Celestrak snapshot of the active group (skip with -NoFetch)
#   2. refit Exp 1 over every snapshot in benchmarks\data
#   3. rerun Exp 4 (pc_comparison) and Exp 5 (end_to_end) for seeds 1-3 with that fit
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File benchmarks\refresh_measured.ps1 [-NoFetch]
# Fetch at most about once a day: Celestrak rate-limits repeated large requests.
param([switch]$NoFetch)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$py = Join-Path (Get-Location) ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { throw "No .venv found. Create it and install requirements.txt first." }

function Invoke-Step([string]$Title, [string[]]$Arguments) {
    Write-Host "`n=== $Title" -ForegroundColor Cyan
    & $py @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Title failed (exit $LASTEXITCODE)" }
}

if (-not $NoFetch) {
    Invoke-Step "Snapshot from Celestrak" @("benchmarks/snapshot_catalog.py", "--celestrak", "active")
}

Invoke-Step "Exp 1 over all snapshots" @("benchmarks/propagation_accuracy.py", "--snapshots", "benchmarks/data/catalog_*.tle")
$fit = Get-ChildItem "benchmarks\results" -Directory -Filter "propagation_*" |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
$model = Join-Path $fit.FullName "covariance_model.json"
Write-Host "covariance model: $model"

foreach ($seed in 1, 2, 3) {
    $recall = "benchmarks/results/screening_recall_n2000_h24_ref10s_seed$seed"
    Invoke-Step "Exp 4, seed $seed" @("benchmarks/pc_comparison.py", "--recall-dir", $recall, "--seed", "$seed", "--covariance-model", $model)
    Invoke-Step "Exp 5, seed $seed" @("benchmarks/end_to_end.py", "--recall-dir", $recall, "--covariance-model", $model)
}
Write-Host "`nDone. Results: benchmarks\results\pc_*_measured and end_to_end_*_measured" -ForegroundColor Green
