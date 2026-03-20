# migrate_field_names.ps1
# One-time migration: renames player stat fields to match design doc spec.
# Run once from the import\ directory.

$renameMap = @{
  'mp'     = 'minutes_per_game'
  'fga'    = 'fga_per_100'
  'threeP' = 'three_point_pct'
  'twoP'   = 'two_point_pct'
  'ftPct'  = 'free_throw_pct'
  'orb'    = 'offensive_rebounds_per_100'
  'drb'    = 'defensive_rebounds_per_100'
  'ast'    = 'assists_per_100'
  'stl'    = 'steals_per_100'
  'blk'    = 'blocks_per_100'
  'tov'    = 'turnovers_per_100'
  'pf'     = 'personal_fouls_per_100'
}

function Rename-PlayerFields($player) {
  $out = [ordered]@{}
  foreach ($prop in $player.PSObject.Properties) {
    $key = if ($renameMap.ContainsKey($prop.Name)) { $renameMap[$prop.Name] } else { $prop.Name }
    $out[$key] = $prop.Value
  }
  # Add three_pa_per_100 as null if not present (populated on next scrape)
  if (-not $out.Contains('three_pa_per_100')) { $out['three_pa_per_100'] = $null }
  return [PSCustomObject]$out
}

function Migrate-JsonFile($path) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  $raw  = [System.IO.File]::ReadAllText($path, $utf8NoBom)
  $data = $raw | ConvertFrom-Json

  # Handle both array-of-conferences (data.json) and single-conference (big_ten_output.json)
  # and bare player-list files (team-data/*.json)
  $changed = $false

  if ($data -is [array]) {
    # data.json — array of conference objects
    foreach ($conf in $data) {
      foreach ($team in $conf.teams) {
        $team.players = @($team.players | ForEach-Object { Rename-PlayerFields $_ })
        $changed = $true
      }
    }
  } elseif ($data.PSObject.Properties['teams']) {
    # big_ten_output.json — single conference object
    foreach ($team in $data.teams) {
      $team.players = @($team.players | ForEach-Object { Rename-PlayerFields $_ })
      $changed = $true
    }
  } elseif ($data.PSObject.Properties['players']) {
    # team-data/*.json — { srSlug, players }
    $data.players = @($data.players | ForEach-Object { Rename-PlayerFields $_ })
    $changed = $true
  }

  if ($changed) {
    [System.IO.File]::WriteAllText($path, ($data | ConvertTo-Json -Depth 20), $utf8NoBom)
    Write-Host "Migrated: $path" -ForegroundColor Green
  } else {
    Write-Host "Skipped (unrecognized structure): $path" -ForegroundColor Yellow
  }
}

$root       = Split-Path -Parent $PSScriptRoot
$importDir  = $PSScriptRoot

# Migrate data.json
Migrate-JsonFile (Join-Path $root "data.json")

# Migrate big_ten_output.json
$bigTenPath = Join-Path $importDir "big_ten_output.json"
if (Test-Path $bigTenPath) { Migrate-JsonFile $bigTenPath }

# Migrate all team-data/*.json
Get-ChildItem (Join-Path $importDir "team-data") -Filter "*.json" | ForEach-Object {
  Migrate-JsonFile $_.FullName
}

Write-Host "`nDone. Run update_data.ps1 to re-inject into index.html." -ForegroundColor Cyan
