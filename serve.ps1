$port = 8080
$path = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "====================================="
Write-Host "  서버 실행 중: http://localhost:$port/"
Write-Host "  파일 변경시 3초 안에 자동 반영됩니다"
Write-Host "====================================="

function Get-LastModified {
    $files = Get-ChildItem -Path $path -File | Where-Object { $_.Name -ne "serve.ps1" }
    if ($files.Count -eq 0) { return 0 }
    $latest = ($files | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTimeUtc
    return $latest.Ticks
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
}

# Auto-reload script injected into HTML (polls every 3 seconds)
$autoReloadScript = @"
<script>
(function() {
    var lastTick = null;
    setInterval(function() {
        fetch('/poll?t=' + Date.now())
            .then(function(r) { return r.text(); })
            .then(function(t) {
                if (lastTick === null) { lastTick = t; return; }
                if (lastTick !== t) {
                    console.log('[자동업데이트] 파일 변경 감지! 새로고침합니다...');
                    location.reload();
                }
            })
            .catch(function() {});
    }, 3000);
})();
</script>
"@

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    try {
        $reqPath = $req.Url.LocalPath

        # Poll endpoint: returns last-modified ticks
        if ($reqPath -eq "/poll") {
            $res.ContentType = "text/plain; charset=utf-8"
            $res.AddHeader("Access-Control-Allow-Origin", "*")
            $res.AddHeader("Cache-Control", "no-cache")
            $ticks = Get-LastModified
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($ticks.ToString())
            $res.ContentLength64 = $buffer.Length
            $res.OutputStream.Write($buffer, 0, $buffer.Length)
            $res.Close()
            continue
        }

        if ($reqPath -eq "/") { $reqPath = "/index.html" }

        $filePath = Join-Path $path ($reqPath.TrimStart('/').Replace('/', '\'))

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mimeTypes[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }

            $res.ContentType = $contentType
            $res.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

            $content = [System.IO.File]::ReadAllBytes($filePath)

            # Inject auto-reload script before </body> in HTML files
            if ($ext -eq ".html") {
                $html = [System.Text.Encoding]::UTF8.GetString($content)
                $html = $html -replace "</body>", "$autoReloadScript</body>"
                $content = [System.Text.Encoding]::UTF8.GetBytes($html)
            }

            $res.ContentLength64 = $content.Length
            $res.OutputStream.Write($content, 0, $content.Length)
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $reqPath")
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        # Ignore errors silently
    } finally {
        try { $res.Close() } catch {}
    }
}
