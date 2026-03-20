# combine_teams.ps1
#
# Combines individual team JSON files (from import\team-data\) into one
# *_output.json per conference, using each *_teams.json as the config.
#
# USAGE:
#   1. Place downloaded team JSON files in import\team-data\
#   2. Run: powershell -ExecutionPolicy Bypass -File "import\combine_teams.ps1"
#   3. One *_output.json is written per conference config found
#   4. Then run update_data.ps1 to merge everything into data.json

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir   = Join-Path $scriptDir "team-data"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    Write-Host "Created folder: $dataDir"
    Write-Host "Place your downloaded team JSON files there, then run this script again."
    exit 0
}

# Build a lookup of all team-data files by srSlug
$teamDataMap = @{}
foreach ($file in (Get-ChildItem $dataDir -Filter "*.json")) {
    $raw = Get-Content $file.FullName -Raw | ConvertFrom-Json
    if ($raw.srSlug) {
        $teamDataMap[$raw.srSlug] = $raw
    }
}

if ($teamDataMap.Count -eq 0) {
    Write-Warning "No usable JSON files found in $dataDir (each must have an srSlug field)"
    exit 1
}

# Process each *_teams.json config
$configFiles = Get-ChildItem $scriptDir -Filter "*_teams.json" | Sort-Object Name

if (-not $configFiles) {
    Write-Warning "No *_teams.json config files found in $scriptDir"
    exit 1
}

foreach ($cfgFile in $configFiles) {
    $raw = Get-Content $cfgFile.FullName -Raw | ConvertFrom-Json

    # Support both plain-array format (big_ten_teams.json) and wrapped format
    # { "conference": "...", "teams": [...] }
    if ($raw -is [System.Array]) {
        $teamsConfig = $raw
        # Derive conference name from filename: big_ten_teams.json -> "Big Ten"
        $baseName    = [System.IO.Path]::GetFileNameWithoutExtension($cfgFile.Name)  # big_ten_teams
        $confSlug    = $baseName -replace '_teams$', ''                               # big_ten
        $confName    = (Get-Culture).TextInfo.ToTitleCase(($confSlug -replace '_', ' '))
    } else {
        $teamsConfig = $raw.teams
        $confName    = $raw.conference
        $confSlug    = ($confName -replace '[^a-zA-Z0-9]', '_').ToLower() -replace '_+', '_'
        $confSlug    = $confSlug.Trim('_')
    }

    $outputPath = Join-Path $scriptDir "${confSlug}_output.json"

    Write-Host ""
    Write-Host "=== $confName ===" -ForegroundColor Yellow

    $teamsList   = @()
    $missingList = @()

    foreach ($cfg in $teamsConfig) {
        $slug = $cfg.srSlug
        if (-not $teamDataMap.ContainsKey($slug)) {
            $missingList += $cfg.name
            continue
        }

        $data = $teamDataMap[$slug]
        $t    = $data.team

        Write-Host "  $($cfg.name) - $($data.players.Count) players" -ForegroundColor Cyan

        $teamsList += [ordered]@{
            name                  = $cfg.name
            nickname              = $cfg.nickname
            primaryColor          = $cfg.primaryColor
            record                = $cfg.record
            logo                  = $cfg.logo
            head_coach            = if ($t.head_coach)            { $t.head_coach }            else { "" }
            city                  = if ($cfg.city)                { $cfg.city }                else { "" }
            possessions_per_game  = if ($t.possessions_per_game)  { $t.possessions_per_game }  else { $null }
            offensive_rebound_pct = if ($t.offensive_rebound_pct) { $t.offensive_rebound_pct } else { $null }
            defensive_rebound_pct = if ($t.defensive_rebound_pct) { $t.defensive_rebound_pct } else { $null }
            assist_rate           = if ($t.assist_rate)           { $t.assist_rate }           else { $null }
            team_fouls_per_game   = if ($t.team_fouls_per_game)   { $t.team_fouls_per_game }   else { $null }
            home_fg_bonus         = if ($t.home_fg_bonus)         { $t.home_fg_bonus }         else { 0.02 }
            players               = $data.players
        }
    }

    if ($missingList.Count -gt 0) {
        Write-Host "  Missing team-data for: $($missingList -join ', ')" -ForegroundColor DarkYellow
    }

    if ($teamsList.Count -eq 0) {
        Write-Host "  No teams built - skipping output" -ForegroundColor Red
        continue
    }

    $output = [ordered]@{ conference = $confName; teams = $teamsList }
    [System.IO.File]::WriteAllText($outputPath, ($output | ConvertTo-Json -Depth 10), $utf8NoBom)
    Write-Host "  $($teamsList.Count) team(s) -> $([System.IO.Path]::GetFileName($outputPath))" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Run update_data.ps1 to merge all output files into data.json." -ForegroundColor Green
