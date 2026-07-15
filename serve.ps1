$port = 8080
$path = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server started at http://localhost:$port/"

# Keep track of last modified time of all files
function Get-LastModified {
    $files = Get-ChildItem -Path $path -File -Recurse | Where-Object { $_.Name -ne "serve.ps1" }
    $latest = ($files | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    return $latest.Ticks
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    
    $reqPath = $req.Url.LocalPath
    
    if ($reqPath -eq "/poll") {
        $res.ContentType = "text/plain"
        $res.AddHeader("Access-Control-Allow-Origin", "*")
        $ticks = Get-LastModified
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($ticks.ToString())
        $res.ContentLength64 = $buffer.Length
        $res.OutputStream.Write($buffer, 0, $buffer.Length)
        $res.Close()
        continue
    }
    
    if ($reqPath -eq "/") { $reqPath = "/index.html" }
    
    $filePath = Join-Path $path $reqPath
    
    if (Test-Path $filePath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        
        # Inject auto-reload script into HTML
        if ($filePath -match "\.html$") {
            $html = [System.Text.Encoding]::UTF8.GetString($content)
            $script = "<script>
                setInterval(async () => {
                    try {
                        let r = await fetch('/poll');
                        let t = await r.text();
                        if (!window.lastModifiedTicks) window.lastModifiedTicks = t;
                        if (window.lastModifiedTicks !== t) location.reload();
                    } catch(e) {}
                }, 1000);
            </script>"
            $html = $html -replace "</body>", "$script</body>"
            $content = [System.Text.Encoding]::UTF8.GetBytes($html)
            $res.ContentType = "text/html; charset=utf-8"
        }
        elseif ($filePath -match "\.js$") { $res.ContentType = "application/javascript" }
        elseif ($filePath -match "\.css$") { $res.ContentType = "text/css" }
        
        $res.ContentLength64 = $content.Length
        $res.OutputStream.Write($content, 0, $content.Length)
    } else {
        $res.StatusCode = 404
    }
    $res.Close()
}
