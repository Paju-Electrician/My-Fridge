const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8000;

const server = http.createServer((req, res) => {
    // Determine the file path from the request URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // Page not found - you might want to create a 404.html
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
                return; // Added return
            } else {
                // Server error
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n', 'utf-8'); // Added 'utf-8' encoding
                return; // Added return
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`서버가 시작되었습니다. 웹 브라우저에서 http://localhost:${port}/ 를 열어주세요.`);
});