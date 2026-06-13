# Simple HTTP server to preview the local site
$port = 3000
$dir = "D:\Buis\oniknives-site"

Write-Host "Starting local server at http://localhost:$port"
Write-Host "Open your browser and go to http://localhost:$port"
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

# Use Node.js if available, otherwise use .NET
if (Get-Command node -ErrorAction SilentlyContinue) {
    $serverCode = @'
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const dir = process.argv[1] ? path.dirname(process.argv[1]) : '.';

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
};

http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';
    
    // Strip /collections/all.html to /collections/all.html
    let filePath = path.join(dir, url);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}).listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
'@
    $serverFile = Join-Path $dir "server.js"
    Set-Content -Path $serverFile -Value $serverCode -NoNewline
    node $serverFile
} else {
    # Fallback to .NET HttpListener
    $serverCode = @"
using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;

class SimpleServer {
    static void Main() {
        string dir = @"$dir";
        int port = $port;
        HttpListener listener = new HttpListener();
        listener.Prefixes.Add("http://localhost:" + port + "/");
        listener.Start();
        Console.WriteLine("Server running at http://localhost:" + port + "/");
        
        while (true) {
            var ctx = listener.GetContext();
            var req = ctx.Request;
            var res = ctx.Response;
            
            string url = req.Url.AbsolutePath;
            if (url == "/") url = "/index.html";
            
            string filePath = dir + url.Replace('/', '\\');
            
            try {
                byte[] data = File.ReadAllBytes(filePath);
                string ext = Path.GetExtension(filePath).ToLower();
                string mime = "application/octet-stream";
                switch (ext) {
                    case ".html": mime = "text/html; charset=utf-8"; break;
                    case ".css": mime = "text/css; charset=utf-8"; break;
                    case ".js": mime = "application/javascript; charset=utf-8"; break;
                    case ".png": mime = "image/png"; break;
                    case ".jpg": case ".jpeg": mime = "image/jpeg"; break;
                    case ".gif": mime = "image/gif"; break;
                    case ".svg": mime = "image/svg+xml"; break;
                    case ".ico": mime = "image/x-icon"; break;
                }
                res.ContentType = mime;
                res.OutputStream.Write(data, 0, data.Length);
            } catch {
                res.StatusCode = 404;
                byte[] err = Encoding.UTF8.GetBytes("404 Not Found");
                res.OutputStream.Write(err, 0, err.Length);
            }
            res.Close();
        }
    }
}
"@
    $compiled = Add-Type -TypeDefinition $serverCode -Language CSharp -PassThru
    [SimpleServer]::Main()
}
