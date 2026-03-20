$lines = Get-Content 'C:\Users\oneil\Desktop\college-hoops-throwdown\index.html'
$dataLine = $lines[240]
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('C:\Users\oneil\Desktop\college-hoops-throwdown\import\data_line.txt', $dataLine, $utf8NoBom)
Write-Host "done, length=$($dataLine.Length)"
