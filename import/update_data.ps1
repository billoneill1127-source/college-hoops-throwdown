# Merges big_ten_output.json into data.json
$root       = Split-Path -Parent $PSScriptRoot
$bigTenPath = Join-Path $PSScriptRoot "big_ten_output.json"
$dataPath   = Join-Path $root "data.json"

$bigTen = Get-Content $bigTenPath -Raw | ConvertFrom-Json
$data   = Get-Content $dataPath   -Raw | ConvertFrom-Json

$updated = $false
for ($i = 0; $i -lt $data.Count; $i++) {
    if ($data[$i].conference -eq "Big Ten") {
        $data[$i] = $bigTen
        $updated  = $true
        break
    }
}

if (-not $updated) { Write-Warning "Big Ten entry not found in data.json"; exit 1 }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($dataPath, ($data | ConvertTo-Json -Depth 20), $utf8NoBom)
Write-Host "data.json updated successfully" -ForegroundColor Green
