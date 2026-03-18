# scrape_big_ten.ps1
#
# Automatically fetches 2025-26 roster and stats for all Big Ten teams
# from sports-reference.com and writes import\big_ten_output.json.
#
# USAGE:  .\scrape_big_ten.ps1
#
# To scrape only specific teams, pass their slugs as arguments:
#   .\scrape_big_ten.ps1 illinois michigan ohio-state
#
# Output: import\big_ten_output.json
# In data.json, replace the Big Ten conference entry with this output.
# =============================================================================

param([string[]]$OnlySlugs = @())

Add-Type -AssemblyName System.Web

$Year       = "2026"
$BaseUrl    = "https://www.sports-reference.com/cbb/schools"
$DelaySec   = 4        # Pause between requests — be respectful of the server
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "import\big_ten_teams.json"
$outputPath = Join-Path $scriptDir "import\big_ten_output.json"

$teamsConfig = Get-Content $configPath -Raw | ConvertFrom-Json
if ($OnlySlugs.Count -gt 0) {
    $teamsConfig = $teamsConfig | Where-Object { $OnlySlugs -contains $_.slug }
}

# ── HTTP ─────────────────────────────────────────────────────────────────────

function Fetch-Page($url) {
    $headers = @{
        "User-Agent"      = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        "Accept"          = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        "Accept-Language" = "en-US,en;q=0.5"
    }
    try {
        $resp = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 30
        return $resp.Content
    } catch {
        Write-Warning "  HTTP error fetching $url : $_"
        return $null
    }
}

# ── HTML helpers ─────────────────────────────────────────────────────────────

function Decode-Html($s) {
    if (-not $s) { return "" }
    return [System.Web.HttpUtility]::HtmlDecode(($s -replace '<[^>]+>', '').Trim())
}

# Extract a <table id="..."> block, including tables hidden inside HTML comments
function Extract-Table($html, $tableId) {
    # Pattern to match the full table
    $pat = "(?s)<table[^>]+\bid=""$([regex]::Escape($tableId))""[^>]*>.*?</table>"

    # Try in regular HTML first
    if ($html -match $pat) { return $Matches[0] }

    # Sports-reference hides some tables inside HTML comments — strip comment wrappers and retry
    $uncommented = $html -replace '<!--((?!-->).)*-->', { param($m) $m.Value -replace '^<!--' -replace '-->$' }
    if ($uncommented -match $pat) { return $Matches[0] }

    return $null
}

# Parse a sports-reference table into an array of hashtables keyed by data-stat
function Parse-Table($tableHtml) {
    $rows = @()
    if (-not $tableHtml) { return $rows }

    # Match every <tr> that is NOT a header row (skip rows with class "thead")
    $trMatches = [regex]::Matches($tableHtml, "(?s)<tr(?![^>]*class=""thead"")[^>]*>(.*?)</tr>")

    foreach ($trm in $trMatches) {
        $rowHtml = $trm.Groups[1].Value
        $row = @{}
        $hasPlayer = $false

        $cellMatches = [regex]::Matches($rowHtml, "(?s)<t[dh][^>]+data-stat=""([^""]+)""[^>]*>(.*?)</t[dh]>")
        foreach ($cm in $cellMatches) {
            $stat = $cm.Groups[1].Value
            $val  = Decode-Html $cm.Groups[2].Value
            $row[$stat] = $val
            if ($stat -eq "player" -and $val -ne "" -and $val -ne "Player") { $hasPlayer = $true }
        }
        if ($hasPlayer) { $rows += $row }
    }
    return $rows
}

# ── Stat helpers ─────────────────────────────────────────────────────────────

function ParseNum($val) {
    if (-not $val -or $val.Trim() -in @("", ".", "-", "—")) { return $null }
    $f = 0.0
    if ([double]::TryParse($val.Trim(), [System.Globalization.NumberStyles]::Any,
        [System.Globalization.CultureInfo]::InvariantCulture, [ref]$f)) {
        return [math]::Round($f, 4)
    }
    return $null
}

function NormPct($val) {
    $f = ParseNum $val
    if ($f -eq $null) { return $null }
    # SR sometimes exports as 0.423, sometimes as 42.3 — normalise to 0–1
    if ($f -gt 1) { return [math]::Round($f / 100.0, 4) }
    return $f
}

function ConvertHt($ht) {
    if (-not $ht) { return $null }
    if ($ht -match "^(\d+)-(\d+)$") { return [int]$Matches[1] * 12 + [int]$Matches[2] }
    return $null
}

function RepsFactor($mp) {
    $m = if ($mp -ne $null) { [double]$mp } else { 0.0 }
    if ($m -gt 30) { return 1.05 }; if ($m -ge 20) { return 1.02 }
    if ($m -ge 15) { return 1.00 }; if ($m -ge 10) { return 0.98 }
    return 0.95
}

function VetFactor($cls) {
    switch (($cls -replace '\s','').ToUpper()) {
        "SR" { return 1.02 }; "FR" { return 0.98 }; default { return 1.00 }
    }
}

function S($val, $reps, $vet)  { if ($val -eq $null) { return $null }; return [math]::Round([double]$val * $reps * $vet, 4) }
function SI($val, $vet)        { if ($val -eq $null) { return $null }; return [math]::Round([double]$val / $vet, 4) }

# Try several possible data-stat names and return the first non-empty match
function G($row, [string[]]$stats) {
    foreach ($s in $stats) { if ($row.ContainsKey($s) -and $row[$s] -ne "") { return $row[$s] } }
    return $null
}

# ── Main loop ─────────────────────────────────────────────────────────────────

$teamsList = @()

foreach ($cfg in $teamsConfig) {
    $url = "$BaseUrl/$($cfg.srSlug)/men/$Year.html"
    Write-Host ""
    Write-Host "[$($cfg.name)]" -ForegroundColor Cyan
    Write-Host "  $url"

    $html = Fetch-Page $url
    if (-not $html) { Write-Warning "  Skipping — could not fetch page"; continue }

    # ── Extract tables ──────────────────────────────────────────────────────
    # Roster table
    $rosterHtml = Extract-Table $html "roster"
    if (-not $rosterHtml) { Write-Warning "  Could not find roster table" }

    # Per Game table
    $pgHtml = Extract-Table $html "per_game"
    if (-not $pgHtml) { Write-Warning "  Could not find per_game table" }

    # Per 100 Poss table — sports-reference uses 'per_poss' as the table id
    $p100Html = Extract-Table $html "per_poss"
    if (-not $p100Html) { $p100Html = Extract-Table $html "per_100" }
    if (-not $p100Html) { $p100Html = Extract-Table $html "per_100_poss" }
    if (-not $p100Html) { Write-Warning "  Could not find per 100 poss table" }

    # ── Parse tables ────────────────────────────────────────────────────────
    $rosterRows = Parse-Table $rosterHtml
    $pgRows     = Parse-Table $pgHtml
    $p100Rows   = Parse-Table $p100Html

    Write-Host "  Rows — Roster:$($rosterRows.Count)  PerGame:$($pgRows.Count)  Per100:$($p100Rows.Count)"

    # Build name-keyed lookup maps (skip multi-team aggregate rows)
    $pgMap   = @{}
    $p100Map = @{}
    foreach ($r in $pgRows)   { $n = G $r @("player"); if ($n -and $n -notin @("TOT","2TM","3TM")) { if (-not $pgMap.ContainsKey($n))   { $pgMap[$n]   = $r } } }
    foreach ($r in $p100Rows) { $n = G $r @("player"); if ($n -and $n -notin @("TOT","2TM","3TM")) { if (-not $p100Map.ContainsKey($n)) { $p100Map[$n] = $r } } }

    # ── Build player list ───────────────────────────────────────────────────
    $players = @()

    foreach ($r in $rosterRows) {
        $name = G $r @("player")
        if (-not $name -or $name.Trim() -eq "") { continue }

        $class = (G $r @("class_year","class","yr") ) -replace '\s',''
        $pg    = $pgMap[$name]
        $p100  = $p100Map[$name]

        $mp   = ParseNum (G $pg   @("mp_per_g","mp"))
        $reps = RepsFactor $mp
        $vet  = VetFactor $class

        $players += [ordered]@{
            number   = (G $r @("uniform_number","number","no"))
            name     = $name
            position = (G $r @("pos","position"))
            height   = ConvertHt (G $r @("height","ht"))
            weight   = ParseNum  (G $r @("weight","wt"))
            class    = $class.ToUpper()
            # Per Game display stats
            mp       = $mp
            ppg      = ParseNum (G $pg @("pts_per_g","pts"))
            rpg      = ParseNum (G $pg @("trb_per_g","trb"))
            apg      = ParseNum (G $pg @("ast_per_g","ast"))
            bpg      = ParseNum (G $pg @("blk_per_g","blk"))
            spg      = ParseNum (G $pg @("stl_per_g","stl"))
            # Adjusted gameplay stats (Per 100 Poss * factors)
            fga      = S  (ParseNum (G $p100 @("fga_per_poss","fga")))              $reps $vet
            threeP   = S  (NormPct  (G $p100 @("fg3_pct","3p_pct","fg3pct")))       $reps $vet
            twoP     = S  (NormPct  (G $p100 @("fg2_pct","2p_pct","fg2pct")))       $reps $vet
            ftPct    = S  (NormPct  (G $p100 @("ft_pct","ftpct")))                  $reps $vet
            orb      = S  (ParseNum (G $p100 @("orb_per_poss","orb")))              $reps $vet
            drb      = S  (ParseNum (G $p100 @("drb_per_poss","drb")))              $reps $vet
            ast      = S  (ParseNum (G $p100 @("ast_per_poss","ast")))              $reps $vet
            stl      = S  (ParseNum (G $p100 @("stl_per_poss","stl")))              $reps $vet
            blk      = S  (ParseNum (G $p100 @("blk_per_poss","blk")))              $reps $vet
            tov      = SI (ParseNum (G $p100 @("tov_per_poss","tov")))              $vet
            pf       = SI (ParseNum (G $p100 @("pf_per_poss","pf")))                $vet
        }
    }

    Write-Host "  $($players.Count) players built" -ForegroundColor Green

    $teamsList += [ordered]@{
        name         = $cfg.name
        nickname     = $cfg.nickname
        primaryColor = $cfg.primaryColor
        record       = $cfg.record
        logo         = $cfg.logo
        players      = $players
    }

    if ($teamsConfig.Count -gt 1) {
        Write-Host "  Waiting $DelaySec seconds..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $DelaySec
    }
}

# ── Write output ──────────────────────────────────────────────────────────────

$output = [ordered]@{ conference = "Big Ten"; teams = $teamsList }
$json   = $output | ConvertTo-Json -Depth 10
Set-Content -Path $outputPath -Value $json -Encoding UTF8

Write-Host ""
Write-Host "Done!  $($teamsList.Count) team(s) written to:" -ForegroundColor Green
Write-Host "  $outputPath"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review output — check that player counts and stats look right."
Write-Host "  2. If any stats are all null, run with -Verbose to debug table IDs:"
Write-Host "     .\scrape_big_ten.ps1 illinois"
Write-Host "  3. Update 'record' fields in import\big_ten_teams.json."
Write-Host "  4. In data.json, replace the Big Ten entry with big_ten_output.json contents."
