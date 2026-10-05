// Minimal static file server for local development (the app itself is fully static).
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = resolve(ROOT, '.' + path);
  if (!file.startsWith(ROOT)) return res.writeHead(400).end();
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) file = join(file, 'index.html');
  else if (!info) file = join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).on('error', () => res.end()).pipe(res);
}).listen(PORT, HOST, () => console.log(`Slimpath → http://${HOST}:${PORT}`));
