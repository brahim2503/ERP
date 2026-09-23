const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const handleData = require('./api/data');
const handleReset = require('./api/reset');
const handleRestoreReal = require('./api/restore-real');

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url.split('?')[0];

  // API endpoints delegated directly to Vercel Serverless Functions
  if (reqUrl === '/api/data') {
    return handleData(req, res);
  }

  if (reqUrl === '/api/reset') {
    return handleReset(req, res);
  }

  if (reqUrl === '/api/restore-real') {
    return handleRestoreReal(req, res);
  }

  // =========================================================================
  // Static File Serving
  // =========================================================================
  let fileUrl = reqUrl === '/' ? '/index.html' : reqUrl;
  const safePath = path.normalize(fileUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running with Real Database API at http://localhost:${PORT}`);
  });
}

module.exports = server;
