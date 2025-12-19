const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const serveFile = (filePath, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const safePath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(ROOT, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, res);
    return;
  }

  // SPA fallback: return index for any unknown path
  serveFile(path.join(ROOT, 'index.html'), res);
});

server.listen(PORT, () => {
  console.log(`MaxStream running at http://localhost:${PORT}`);
});
