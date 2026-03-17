# parse_big_ten.ps1
#
# INSTRUCTIONS
# ============
# For each Big Ten team, create a subfolder under import\big-ten\ using the team
# slug found in import\big_ten_teams.json (e.g. import\big-ten\michigan).
#
# Inside each team folder, save the following three files exported from
# sports-reference.com/cbb — on each table click "Share & more" then
# "Get table as CSV", copy the text, and save as a .csv file:
#
#   roster.csv     Roster table          (has: No., Player, Pos, Ht, Wt, Class)
#   per_game.csv   Per Game table        (has: Player, MP, PTS, TRB, AST, BLK, STL)
#   per_100.csv    Per 100 Poss table    (has: Player, FGA, 3P%, 2P%, FT%,
#                                              ORB, DRB, AST, STL, BLK, TOV, PF)
#
# Sports-reference team page format:
#   https://www.sports-reference.com/cbb/schools/<school-name>/men/2026.html
#   e.g. https://www.sports-reference.com/cbb/schools/michigan/men/2026.html
#
# After placing all files, run:
#   .\parse_big_ten.ps1
#
# Output: import\big_ten_output.json
# Paste the "teams" array from that file into data.json under the Big Ten entry.
# ============================================================================

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "import\big_ten_teams.json"
$importDir  = Join-Path $scriptDir "import\big-ten"
$outputPath = Join-Path $scriptDir "import\big_ten_output.json"

$teamsConfig = Get-Content $configPath -Raw | ConvertFrom-Json

# ── Helpers ──────────────────────────────────────────────────────────────────

function ConvertHeightToInches($ht) {
    if (-not $ht) { return $null }
    $s = $ht.Trim()
    if ($s -match "^(\d+)-(\d+)$") { return [int]$Matches[1] * 12 + [int]$Matches[2] }
    return $null
}

function CleanName($name) {
    if (-not $name) { return "" }
    return $name.Trim().TrimEnd('*').Trim()
}

function ParseNum($val) {
    if (-not $val) { return $null }
    $s = $val.Trim()
    if ($s -eq "" -or $s -eq "." -or $s -eq "-") { return $null }
    $f = 0.0
    if ([double]::TryParse($s, [System.Globalization.NumberStyles]::Any,
        [System.Globalization.CultureInfo]::InvariantCulture, [ref]$f)) {
        return [math]::Round($f, 4)
    }
    return $null
}

function NormPct($val) {
    # Sports-reference sometimes exports percentages as 0.423 or 42.3 — normalise to 0-1
    $f = ParseNum $val
    if ($f -eq $null) { return $null }
    if ($f -gt 1) { return [math]::Round($f / 100.0, 4) }
    return $f
}

function RepsFactor($mp) {
    $m = if ($mp -ne $null) { [double]$mp } else { 0.0 }
    if ($m -gt 30)  { return 1.05 }
    if ($m -ge 20)  { return 1.02 }
    if ($m -ge 15)  { return 1.00 }
    if ($m -ge 10)  { return 0.98 }
    return 0.95
}

function VetFactor($class) {
    switch ($class.Trim().ToUpper()) {
        "SR"    { return 1.02 }
        "FR"    { return 0.98 }
        default { return 1.00 }
    }
}

function ApplyStat($val, $reps, $vet) {
    if ($val -eq $null) { return $null }
    return [math]::Round([double]$val * $reps * $vet, 4)
}

function ApplyInvVet($val, $vet) {
    if ($val -eq $null) { return $null }
    return [math]::Round([double]$val * (1.0 / $vet), 4)
}

# Load a CSV and drop blank rows and repeated header rows
function LoadCsv($path) {
    if (-not (Test-Path $path)) { return @() }
    try {
        $rows = Import-Csv $path
        return $rows | Where-Object {
            $playerCol = $_.PSObject.Properties | Where-Object { $_.Name -match "(?i)^player$" } | Select-Object -First 1
            $val = if ($playerCol) { $playerCol.Value } else { "" }
            $val -and $val.Trim() -ne "" -and $val.Trim() -ne "Player"
        }
    } catch {
        Write-Warning "  Could not parse $path : $_"
        return @()
    }
}

# Get a property value case-insensitively
function GetProp($obj, $colName) {
    $prop = $obj.PSObject.Properties | Where-Object { $_.Name -eq $colName } | Select-Object -First 1
    if ($prop) { return $prop.Value }
    # Try case-insensitive fallback
    $prop = $obj.PSObject.Properties | Where-Object { $_.Name -ieq $colName } | Select-Object -First 1
    if ($prop) { return $prop.Value }
    return $null
}

# ── Main loop ─────────────────────────────────────────────────────────────────

$teamsList = @()
$teamDirs  = Get-ChildItem $importDir -Directory -ErrorAction SilentlyContinue

if (-not $teamDirs) {
    Write-Warning "No team folders found in $importDir. See instructions at top of script."
    exit 1
}

foreach ($dir in ($teamDirs | Sort-Object Name)) {
    $slug   = $dir.Name
    $config = $teamsConfig | Where-Object { $_.slug -eq $slug } | Select-Object -First 1

    if (-not $config) {
        Write-Warning "No config entry for slug '$slug' in big_ten_teams.json — skipping"
        continue
    }

    Write-Host "Processing: $($config.name) [$slug]" -ForegroundColor Cyan

    $rosterRows  = LoadCsv (Join-Path $dir.FullName "roster.csv")
    $perGameRows = LoadCsv (Join-Path $dir.FullName "per_game.csv")
    $per100Rows  = LoadCsv (Join-Path $dir.FullName "per_100.csv")

    if (-not $rosterRows)  { Write-Warning "  roster.csv missing or empty" }
    if (-not $perGameRows) { Write-Warning "  per_game.csv missing or empty" }
    if (-not $per100Rows)  { Write-Warning "  per_100.csv missing or empty" }

    # Build name-keyed lookup maps (prefer team-specific rows over TOT/2TM)
    $pgMap   = @{}
    $p100Map = @{}

    foreach ($r in $perGameRows) {
        $n = CleanName (GetProp $r "Player")
        if (-not $n -or $n -in @("TOT","2TM","3TM")) { continue }
        if (-not $pgMap.ContainsKey($n)) { $pgMap[$n] = $r }
    }
    foreach ($r in $per100Rows) {
        $n = CleanName (GetProp $r "Player")
        if (-not $n -or $n -in @("TOT","2TM","3TM")) { continue }
        if (-not $p100Map.ContainsKey($n)) { $p100Map[$n] = $r }
    }

    $players = @()

    foreach ($r in $rosterRows) {
        $name = CleanName (GetProp $r "Player")
        if (-not $name) { continue }

        $class  = (GetProp $r "Class") -replace '\s',''
        if (-not $class) { $class = "" }

        $pg   = $pgMap[$name]
        $p100 = $p100Map[$name]

        $mp   = ParseNum (if ($pg) { GetProp $pg "MP" } else { $null })
        $reps = RepsFactor $mp
        $vet  = VetFactor $class

        $htRaw = GetProp $r "Ht"
        $wtRaw = GetProp $r "Wt"
        $noRaw = GetProp $r "No."
        if (-not $noRaw) { $noRaw = GetProp $r "Num" }

        $players += [ordered]@{
            number   = if ($noRaw)  { $noRaw.Trim() }                               else { "" }
            name     = $name
            position = if ((GetProp $r "Pos")) { (GetProp $r "Pos").Trim() }         else { "" }
            height   = ConvertHeightToInches $htRaw
            weight   = if ($wtRaw -and $wtRaw.Trim() -match "^\d+$") { [int]$wtRaw.Trim() } else { $null }
            class    = $class.ToUpper()
            # Per Game display stats
            mp       = $mp
            ppg      = ParseNum (if ($pg)   { GetProp $pg   "PTS" } else { $null })
            rpg      = ParseNum (if ($pg)   { GetProp $pg   "TRB" } else { $null })
            apg      = ParseNum (if ($pg)   { GetProp $pg   "AST" } else { $null })
            bpg      = ParseNum (if ($pg)   { GetProp $pg   "BLK" } else { $null })
            spg      = ParseNum (if ($pg)   { GetProp $pg   "STL" } else { $null })
            # Adjusted gameplay stats
            fga      = ApplyStat  (ParseNum  (if ($p100) { GetProp $p100 "FGA" } else { $null })) $reps $vet
            threeP   = ApplyStat  (NormPct   (if ($p100) { GetProp $p100 "3P%" } else { $null })) $reps $vet
            twoP     = ApplyStat  (NormPct   (if ($p100) { GetProp $p100 "2P%" } else { $null })) $reps $vet
            ftPct    = ApplyStat  (NormPct   (if ($p100) { GetProp $p100 "FT%" } else { $null })) $reps $vet
            orb      = ApplyStat  (ParseNum  (if ($p100) { GetProp $p100 "ORB" } else { $null })) $reps $vet
            drb      = ApplyStat  (ParseNum  (if ($p100) { GetProp $p100 "DRB" } else { $null })) $reps $vet
            ast      = ApplyStat  (ParseNum  (if ($p100) { GetProp $p100 "AST" } else { $null })) $reps $vet
            stl      = ApplyStat  (ParseNum  (if ($p100) { GetProp $p100 "STL" } else { $null })) $reps $vet
            blk      = ApplyStat  (ParseNum  (if ($p100) { GetProp $p100 "BLK" } else { $null })) $reps $vet
            tov      = ApplyInvVet (ParseNum (if ($p100) { GetProp $p100 "TOV" } else { $null })) $vet
            pf       = ApplyInvVet (ParseNum (if ($p100) { GetProp $p100 "PF"  } else { $null })) $vet
        }
    }

    Write-Host "  $($players.Count) players loaded" -ForegroundColor Green

    $teamsList += [ordered]@{
        name         = $config.name
        nickname     = $config.nickname
        primaryColor = $config.primaryColor
        record       = $config.record
        logo         = $config.logo
        players      = $players
    }
}

# ── Output ───────────────────────────────────────────────────────────────────

$output = [ordered]@{
    conference = "Big Ten"
    teams      = $teamsList
}

$json = $output | ConvertTo-Json -Depth 10
Set-Content -Path $outputPath -Value $json -Encoding UTF8

Write-Host ""
Write-Host "Done! $($teamsList.Count) team(s) written to:" -ForegroundColor Green
Write-Host "  $outputPath"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the output file to verify player data looks correct."
Write-Host "  2. Update 'record' fields in import\big_ten_teams.json with current W-L records."
Write-Host "  3. In data.json, replace the Big Ten entry with the contents of big_ten_output.json."
