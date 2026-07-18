$game = Get-Content -Path 'game.js' -Raw
$html = Get-Content -Path 'index.html' -Raw
$html = $html.Replace('<script src="game.js?v=3"></script>', "<script>`r`n$game`r`n</script>")
[IO.File]::WriteAllText('c:\Users\LG\Documents\GAME2\index.html', $html)
