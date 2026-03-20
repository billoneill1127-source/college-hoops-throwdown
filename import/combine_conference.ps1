# combine_conference.ps1
#
# Generic version of combine_teams.ps1 — works with any conference.
# The config file must be a JSON object with "conference" and "teams" fields.
#
# HOW TO USE:
#   1. Place downloaded team JSON files in import\team-data\
#   2. Run: .\import\combine_conference.ps1 -Config .\import\big_east_teams.json
#      Or:  .\import\combine_conference.ps1 -Config .\import\acc_teams.json
#   3. Then run .\import\update_data.ps1 to inject into the game
#
# EXAMPLE team config format (big_east_teams.json):
#   { "conference": "Big East", "teams": [ { "srSlug": "depaul", "name": "DePaul", ... } ] }

param(
    [Parameter(Mandatory=$true, HelpMessage="Path to the conference config JSON (e.g. .\import\big_east_teams.json)")]
    [string]$Config
)

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir    = Join-Path $scriptDir "team-data"

if (-not (Test-Path $Config)) {
    Write-Error "Config file not found: $Config"
    exit 1
}

$configObj = Get-Content $Config -Raw | ConvertFrom-Json

if (-not $configObj.conference) {
    Write-Error "Config file must have a top-level 'conference' field. Got: $(($configObj | Get-Member -MemberType NoteProperty).Name -join ', ')"
    exit 1
}

$conferenceName = $configObj.conference
$teamsConfig    = $configObj.teams

# Output file named after the conference slug, e.g. "Big East" -> big_east_output.json
$confSlug   = $conferenceName.ToLower().Replace(' ', '_').Replace('-', '_')
$outputPath = Join-Path $scriptDir ($confSlug + "_output.json")

Write-Host "Conference : $conferenceName" -ForegroundColor White
Write-Host "Config     : $Config"
Write-Host "Output     : $outputPath"
Write-Host ""

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    Write-Host "Created folder: $dataDir"
    Write-Host "Place your downloaded team JSON files there, then run this script again."
    exit 0
}

$teamFiles = Get-ChildItem $dataDir -Filter "*.json" | Sort-Object Name

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
        # Not in this conference's config — silently skip
        continue
    }

    Write-Host "$($cfg.name) - $($data.players.Count) players" -ForegroundColor Cyan

    $t = $data.team
    $teamsList += [ordered]@{
        name                   = $cfg.name
        nickname               = $cfg.nickname
        primaryColor           = $cfg.primaryColor
        record                 = $cfg.record
        logo                   = $cfg.logo
        head_coach             = if ($t.head_coach)             { $t.head_coach }             else { "" }
        city                   = if ($cfg.city)                 { $cfg.city }                 else { "" }
        possessions_per_game   = if ($t.possessions_per_game)   { $t.possessions_per_game }   else { $null }
        offensive_rebound_pct  = if ($t.offensive_rebound_pct)  { $t.offensive_rebound_pct }  else { $null }
        defensive_rebound_pct  = if ($t.defensive_rebound_pct)  { $t.defensive_rebound_pct }  else { $null }
        assist_rate            = if ($t.assist_rate)            { $t.assist_rate }            else { $null }
        team_fouls_per_game    = if ($t.team_fouls_per_game)    { $t.team_fouls_per_game }    else { $null }
        home_fg_bonus          = if ($t.home_fg_bonus)          { $t.home_fg_bonus }          else { 0.02 }
        players                = $data.players
    }
}

if ($teamsList.Count -eq 0) {
    Write-Warning "No matching teams found. Check that your team-data JSON files have srSlugs that match $Config"
    exit 1
}

$output = [ordered]@{ conference = $conferenceName; teams = $teamsList }
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outputPath, ($output | ConvertTo-Json -Depth 10), $utf8NoBom)

Write-Host ""
Write-Host "Done! $($teamsList.Count) team(s) written to:" -ForegroundColor Green
Write-Host "  $outputPath"
Write-Host ""
Write-Host "Next: run .\import\update_data.ps1 to inject into the game."
