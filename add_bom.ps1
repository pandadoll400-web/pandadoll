$utf8BOM = New-Object System.Text.UTF8Encoding $true
$contentIndex = Get-Content 'c:\Users\LG\Documents\GAME2\index.html' -Raw -Encoding UTF8
[System.IO.File]::WriteAllText('c:\Users\LG\Documents\GAME2\index.html', $contentIndex, $utf8BOM)

$contentGame = Get-Content 'c:\Users\LG\Documents\GAME2\game_v3.js' -Raw -Encoding UTF8
[System.IO.File]::WriteAllText('c:\Users\LG\Documents\GAME2\game_v3.js', $contentGame, $utf8BOM)

$contentStyle = Get-Content 'c:\Users\LG\Documents\GAME2\style_v2.css' -Raw -Encoding UTF8
[System.IO.File]::WriteAllText('c:\Users\LG\Documents\GAME2\style_v2.css', $contentStyle, $utf8BOM)
