# update_data.ps1
#
# Merges all *_output.json files in this folder into data.json,
# then injects the combined data into index.html and simulate.html.
#
# Each *_output.json must be a { conference, teams } object.
# The matching conference entry in data.json is replaced; new conferences are appended.

$root      = Split-Path -Parent $PSScriptRoot
$dataPath  = Join-Path $root "data.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$data    = Get-Content $dataPath -Raw | ConvertFrom-Json
$updated = $false

$outputFiles = Get-ChildItem $PSScriptRoot -Filter "*_output.json" | Sort-Object Name

if (-not $outputFiles) {
    Write-Warning "No *_output.json files found in $PSScriptRoot"
    exit 1
}

foreach ($file in $outputFiles) {
    $confData = Get-Content $file.FullName -Raw | ConvertFrom-Json

    if (-not $confData.conference) {
        Write-Warning "$($file.Name) has no 'conference' field - skipping"
        continue
    }

    $confName  = $confData.conference
    $teamCount = @($confData.teams).Count
    $found     = $false

    for ($i = 0; $i -lt $data.Count; $i++) {
        if ($data[$i].conference -eq $confName) {
            $data[$i] = $confData
            $found    = $true
            $updated  = $true
            Write-Host "$confName updated: $teamCount teams" -ForegroundColor Cyan
            break
        }
    }

    if (-not $found) {
        $data   += $confData
        $updated = $true
        Write-Host "$confName added: $teamCount teams" -ForegroundColor Yellow
    }
}

if (-not $updated) { Write-Warning "No matching conferences updated in data.json"; exit 1 }

[System.IO.File]::WriteAllText($dataPath, ($data | ConvertTo-Json -Depth 20), $utf8NoBom)
Write-Host "data.json updated successfully" -ForegroundColor Green

# Inject into HTML files
$jsonCompact = $data | ConvertTo-Json -Depth 20 -Compress
$newLine     = "const DATA = $jsonCompact;"

$indexPath = Join-Path $root "index.html"
$indexHtml = [System.IO.File]::ReadAllText($indexPath, $utf8NoBom)
$indexHtml = $indexHtml -replace '(?m)^const DATA = .*$', $newLine
[System.IO.File]::WriteAllText($indexPath, $indexHtml, $utf8NoBom)
Write-Host "index.html DATA updated successfully" -ForegroundColor Green

$simPath = Join-Path $root "simulate.html"
if (Test-Path $simPath) {
    $simHtml = [System.IO.File]::ReadAllText($simPath, $utf8NoBom)
    $simHtml = $simHtml -replace '(?m)^const DATA = .*$', $newLine
    [System.IO.File]::WriteAllText($simPath, $simHtml, $utf8NoBom)
    Write-Host "simulate.html DATA updated successfully" -ForegroundColor Green
}
