// Slimpath server: static frontend + JSON API backed by SQLite.
// Zero dependencies — requires Node.js >= 22.5 (built-in node:sqlite).
import { createServer } from 'node:http';
import { readFile, writeFile, unlink, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import * as store from './db.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = resolve(process.env.SLIMPATH_DATA || join(ROOT, 'data'));
const UPLOAD_DIR = join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_JSON = 1 * 1024 * 1024;
const MAX_PHOTO = 12 * 1024 * 1024;

await mkdir(UPLOAD_DIR, { recursive: true });
const db = store.openDatabase(join(DATA_DIR, 'slimpath.db'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};
const PHOTO_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEALS = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const payload = isBuf ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf ? 'application/octet-stream' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const buf = await readBody(req, MAX_JSON);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function assertDate(date) {
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) throw new HttpError(400, 'Invalid date');
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const method = req.method;

  // /api/settings
  if (parts[0] === 'settings' && parts.length === 1) {
    if (method === 'GET') return send(res, 200, store.getSettings(db));
    if (method === 'PUT') {
      const body = await readJson(req);
      if (body.startDate !== undefined && body.startDate !== null) assertDate(body.startDate);
      return send(res, 200, store.putSettings(db, body));
    }
  }

  // /api/entries?from=&to=
  if (parts[0] === 'entries' && parts.length === 1 && method === 'GET') {
    const from = url.searchParams.get('from') || '0000-01-01';
    const to = url.searchParams.get('to') || '9999-12-31';
    return send(res, 200, store.listEntries(db, from, to));
  }

  // /api/entries/:date
  if (parts[0] === 'entries' && parts.length === 2) {
    const date = parts[1];
    assertDate(date);
    if (method === 'GET') return send(res, 200, store.getEntry(db, date));
    if (method === 'PUT') {
      const body = await readJson(req);
      if (typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected object');
      return send(res, 200, store.putEntry(db, date, body));
    }
  }

  // POST /api/entries/:date/photos?meal=lunch   (raw image body)
  if (parts[0] === 'entries' && parts[2] === 'photos' && parts.length === 3 && method === 'POST') {
    const date = parts[1];
    assertDate(date);
    const meal = url.searchParams.get('meal');
    if (!MEALS.has(meal)) throw new HttpError(400, 'Invalid meal');
    const mime = (req.headers['content-type'] || '').split(';')[0].trim();
    const ext = PHOTO_EXT[mime];
    if (!ext) throw new HttpError(415, 'Unsupported image type');
    const buf = await readBody(req, MAX_PHOTO);
    if (!buf.length) throw new HttpError(400, 'Empty body');
    const filename = `${date}_${meal}_${randomUUID()}${ext}`;
    await writeFile(join(UPLOAD_DIR, filename), buf);
    return send(res, 201, store.addPhoto(db, { date, meal, filename, mime }));
  }

  // DELETE /api/photos/:id
  if (parts[0] === 'photos' && parts.length === 2 && method === 'DELETE') {
    const row = store.deletePhoto(db, Number(parts[1]));
    if (!row) throw new HttpError(404, 'Not found');
    await unlink(join(UPLOAD_DIR, row.filename)).catch(() => {});
    return send(res, 200, { ok: true });
  }

  // GET /api/export
  if (parts[0] === 'export' && method === 'GET') {
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="slimpath-${stamp}.json"`);
    return send(res, 200, store.exportAll(db));
  }

  throw new HttpError(404, 'Not found');
}

async function serveFile(res, file, cache) {
  const info = await stat(file).catch(() => null);
  if (!info || !info.isFile()) return false;
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': cache,
  });
  createReadStream(file).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    if (url.pathname.startsWith('/uploads/')) {
      const name = decodeURIComponent(url.pathname.slice('/uploads/'.length));
      if (name.includes('/') || name.includes('..')) throw new HttpError(400, 'Bad path');
      if (await serveFile(res, join(UPLOAD_DIR, name), 'private, max-age=31536000, immutable')) return;
      throw new HttpError(404, 'Not found');
    }

    // Static assets; fall back to index.html for the single-page app.
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = resolve(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR)) throw new HttpError(400, 'Bad path');
    if (await serveFile(res, file, 'no-cache')) return;
    const html = await readFile(join(PUBLIC_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
    res.end(html);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) send(res, status, { error: err.message || 'Server error' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Slimpath ready → http://${HOST}:${PORT}`);
  console.log(`Database      → ${join(DATA_DIR, 'slimpath.db')}`);
});
