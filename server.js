const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Default to serving unified.html for root URL
    let url = req.url === '/' ? '/unified.html' : req.url;
    
    // Determine content type based on file extension
    let contentType = 'text/html';
    const ext = path.extname(url);
    switch (ext) {
        case '.js':
            contentType = 'application/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
    }

    // Build filepath
    let filePath = path.join(__dirname, url);
    console.log(`Serving file: ${filePath}`);

    // Check if file exists
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // If requested file not found, try serving unified.html
                if (url !== '/unified.html') {
                    console.log(`File not found: ${filePath}, trying unified.html instead`);
                    fs.readFile(path.join(__dirname, 'unified.html'), (error, content) => {
                        if (error) {
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end('File not found', 'utf-8');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(content, 'utf-8');
                        }
                    });
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('File not found', 'utf-8');
                }
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Successful response
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Welcome to the server');
    console.log(`Opening http://localhost:${PORT} will now serve the unified game!`);
});
