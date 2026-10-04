// Integration test: boots the real server on a temp database and exercises the API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'slimpath-'));
let server;

before(async () => {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
    env: { ...process.env, PORT: String(PORT), SLIMPATH_DATA: dir },
    stdio: 'pipe',
  });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => d.toString().includes('ready') && resolve());
    server.on('exit', (code) => reject(new Error(`server exited ${code}`)));
  });
});

after(() => {
  server?.kill();
  rmSync(dir, { recursive: true, force: true });
});

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('settings round-trip', async () => {
  const saved = await (await fetch(`${BASE}/api/settings`, json('PUT', { startDate: '2026-10-05', sex: 'female' }))).json();
  assert.equal(saved.startDate, '2026-10-05');
  const bad = await fetch(`${BASE}/api/settings`, json('PUT', { startDate: 'nope' }));
  assert.equal(bad.status, 400);
});

test('daily entry is stored and summarised', async () => {
  const entry = { weight: '70.5', bodyFat: '31.2', water: 8, sleep: 7, mood: 'great', checklist: { lemon: true, water: true, relax: false } };
  const res = await (await fetch(`${BASE}/api/entries/2026-10-06`, json('PUT', entry))).json();
  assert.equal(res.data.weight, '70.5');
  const list = await (await fetch(`${BASE}/api/entries?from=2026-10-01&to=2026-10-31`)).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].weight, 70.5);
  assert.equal(list[0].checklist_done, 2);
  assert.equal(list[0].water_glasses, 8);
});

test('photos upload, list and delete', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const up = await fetch(`${BASE}/api/entries/2026-10-06/photos?meal=lunch`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
  assert.equal(up.status, 201);
  const photo = await up.json();
  const img = await fetch(`${BASE}/uploads/${photo.filename}`);
  assert.equal(img.status, 200);
  const day = await (await fetch(`${BASE}/api/entries/2026-10-06`)).json();
  assert.equal(day.photos.length, 1);
  assert.equal((await fetch(`${BASE}/api/photos/${photo.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(`${BASE}/uploads/${photo.filename}`)).status, 404);
  const badMeal = await fetch(`${BASE}/api/entries/2026-10-06/photos?meal=brunch`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
  assert.equal(badMeal.status, 400);
});

test('static files and path traversal guard', async () => {
  assert.match(await (await fetch(`${BASE}/`)).text(), /Slimpath/);
  const r = await fetch(`${BASE}/uploads/..%2Fslimpath.db`);
  assert.equal(r.status, 400);
});
