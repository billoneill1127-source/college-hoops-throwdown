# combine_teams.ps1
#
# Combines individual team JSON files (produced by extract_team.js) into
# big_ten_output.json, merging in team metadata from big_ten_teams.json.
#
# USAGE:
#   1. Move all downloaded team JSON files into import\team-data\
#   2. Run: powershell -ExecutionPolicy Bypass -File "import\combine_teams.ps1"
#   3. Output: import\big_ten_output.json
#   4. In data.json, replace the Big Ten entry with big_ten_output.json contents.

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir    = Join-Path $scriptDir "team-data"
$configPath = Join-Path $scriptDir "big_ten_teams.json"
$outputPath = Join-Path $scriptDir "big_ten_output.json"

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    Write-Host "Created folder: $dataDir"
    Write-Host "Place your downloaded team JSON files there, then run this script again."
    exit 0
}

$teamsConfig = Get-Content $configPath -Raw | ConvertFrom-Json
$teamFiles   = Get-ChildItem $dataDir -Filter "*.json" | Sort-Object Name

if (-not $teamFiles) {
    Write-Warning "No JSON files found in $dataDir"
    Write-Host "Download team data using import\extract_team.js, move files here, then re-run."
    exit 1
}

$teamsList = @()

foreach ($file in $teamFiles) {
    $data   = Get-Content $file.FullName -Raw | ConvertFrom-Json
    $srSlug = $data.srSlug
    $cfg    = $teamsConfig | Where-Object { $_.srSlug -eq $srSlug } | Select-Object -First 1

    if (-not $cfg) {
        Write-Warning "No config found for srSlug '$srSlug' ($($file.Name)) - skipping"
        continue
    }

    Write-Host "$($cfg.name) - $($data.players.Count) players" -ForegroundColor Cyan

    $teamsList += [ordered]@{
        name         = $cfg.name
        nickname     = $cfg.nickname
        primaryColor = $cfg.primaryColor
        record       = $cfg.record
        logo         = $cfg.logo
        players      = $data.players
    }
}

$output = [ordered]@{ conference = "Big Ten"; teams = $teamsList }
$json   = $output | ConvertTo-Json -Depth 10
Set-Content -Path $outputPath -Value $json -Encoding UTF8

Write-Host ""
Write-Host "Done! $($teamsList.Count) team(s) written to:" -ForegroundColor Green
Write-Host "  $outputPath"
Write-Host ""
Write-Host "Update record fields in big_ten_teams.json, then paste big_ten_output.json"
Write-Host "into data.json replacing the Big Ten entry."
