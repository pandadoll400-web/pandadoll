Dim stream
Set stream = CreateObject("ADODB.Stream")

stream.Open
stream.Type = 2
stream.Charset = "utf-8"
stream.LoadFromFile "game_v3.js"
Dim gameJs
gameJs = stream.ReadText
stream.Close

stream.Open
stream.Type = 2
stream.Charset = "utf-8"
stream.LoadFromFile "index.html"
Dim html
html = stream.ReadText
stream.Close

html = Replace(html, "<script src=""game_v3.js"" charset=""utf-8""></script>", "<script>" & vbCrLf & gameJs & vbCrLf & "</script>")

stream.Open
stream.Type = 2
stream.Charset = "utf-8"
stream.WriteText html
stream.SaveToFile "index.html", 2
stream.Close
