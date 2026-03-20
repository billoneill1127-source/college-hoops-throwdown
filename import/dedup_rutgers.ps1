$file = 'C:\Users\oneil\Desktop\college-hoops-throwdown\import\big_ten_output.json'
$data = Get-Content $file -Raw | ConvertFrom-Json
Write-Host "Teams before dedup: $($data.teams.Count)"
$seen = @{}
$unique = [System.Collections.ArrayList]@()
foreach($t in $data.teams){
    if(-not $seen[$t.name]){
        $seen[$t.name] = $true
        $unique.Add($t) | Out-Null
    } else {
        Write-Host "Removing duplicate: $($t.name)" -ForegroundColor Yellow
    }
}
$data.teams = $unique
Write-Host "Teams after dedup: $($data.teams.Count)"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($data | ConvertTo-Json -Depth 20), $utf8)
Write-Host "Done" -ForegroundColor Green
