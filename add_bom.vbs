Dim stream
Set stream = CreateObject("ADODB.Stream")

Sub AddBom(filename)
    stream.Open
    stream.Type = 2 ' adTypeText
    stream.Charset = "utf-8"
    stream.LoadFromFile filename
    Dim text
    text = stream.ReadText
    stream.Position = 0
    stream.WriteText text
    stream.SaveToFile filename, 2 ' adSaveCreateOverWrite
    stream.Close
End Sub

AddBom "index.html"
AddBom "game_v3.js"
AddBom "style_v2.css"
