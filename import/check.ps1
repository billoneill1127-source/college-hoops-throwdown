$lines = Get-Content 'C:\Users\oneil\Desktop\college-hoops-throwdown\index.html'
Write-Host "Total lines: $($lines.Count)"
$dataLine = $lines | Where-Object { $_ -match '^const DATA = ' }
if ($dataLine) { Write-Host "DATA line found, length: $($dataLine.Length)" } else { Write-Host "DATA line NOT found" }
