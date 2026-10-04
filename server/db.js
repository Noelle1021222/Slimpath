// SQLite persistence layer (Node >= 22.5 built-in `node:sqlite`, no native deps).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- One row per calendar day. The full form lives in "data" (JSON);
    -- the headline metrics are mirrored into columns so they can be queried.
    CREATE TABLE IF NOT EXISTS entries (
      date            TEXT PRIMARY KEY,           -- YYYY-MM-DD
      data            TEXT NOT NULL,              -- full daily log as JSON
      weight          REAL,
      body_fat        REAL,
      water_glasses   INTEGER,
      sleep_hours     INTEGER,
      mood            TEXT,
      exercise_kcal   INTEGER,
      relax_mins      INTEGER,
      checklist_done  INTEGER NOT NULL DEFAULT 0,
      checklist_total INTEGER NOT NULL DEFAULT 0,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      meal       TEXT NOT NULL,                   -- breakfast | lunch | dinner | snack
      filename   TEXT NOT NULL,
      mime       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS photos_by_date ON photos(date);
  `);
  return db;
}

export function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const { key, value } of rows) out[key] = JSON.parse(value);
  return out;
}

export function putSettings(db, patch) {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const del = db.prepare('DELETE FROM settings WHERE key = ?');
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) del.run(key);
    else stmt.run(key, JSON.stringify(value));
  }
  return getSettings(db);
}

const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

export function putEntry(db, date, data) {
  const checklist = data.checklist || {};
  const keys = Object.keys(checklist);
  const row = {
    date,
    data: JSON.stringify(data),
    weight: num(data.weight),
    body_fat: num(data.bodyFat),
    water_glasses: num(data.water),
    sleep_hours: num(data.sleep),
    mood: data.mood || null,
    exercise_kcal: num(data.exerciseKcal),
    relax_mins: num(data.relaxMins),
    checklist_done: keys.filter((k) => checklist[k]).length,
    checklist_total: keys.length,
    updated_at: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO entries (date, data, weight, body_fat, water_glasses, sleep_hours, mood,
                         exercise_kcal, relax_mins, checklist_done, checklist_total, updated_at)
    VALUES (:date, :data, :weight, :body_fat, :water_glasses, :sleep_hours, :mood,
            :exercise_kcal, :relax_mins, :checklist_done, :checklist_total, :updated_at)
    ON CONFLICT(date) DO UPDATE SET
      data = excluded.data, weight = excluded.weight, body_fat = excluded.body_fat,
      water_glasses = excluded.water_glasses, sleep_hours = excluded.sleep_hours,
      mood = excluded.mood, exercise_kcal = excluded.exercise_kcal, relax_mins = excluded.relax_mins,
      checklist_done = excluded.checklist_done, checklist_total = excluded.checklist_total,
      updated_at = excluded.updated_at
  `).run(row);
  return getEntry(db, date);
}

export function getEntry(db, date) {
  const row = db.prepare('SELECT data, updated_at FROM entries WHERE date = ?').get(date);
  const photos = listPhotos(db, date);
  return { date, data: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at ?? null, photos };
}

export function listEntries(db, from, to) {
  const rows = db.prepare(`
    SELECT date, weight, body_fat, water_glasses, sleep_hours, mood, exercise_kcal, relax_mins,
           checklist_done, checklist_total, updated_at,
           (SELECT COUNT(*) FROM photos p WHERE p.date = e.date) AS photo_count
    FROM entries e WHERE date BETWEEN ? AND ? ORDER BY date
  `).all(from, to);
  return rows;
}

export function listPhotos(db, date) {
  return db.prepare('SELECT id, date, meal, filename, mime, created_at FROM photos WHERE date = ? ORDER BY id').all(date);
}

export function addPhoto(db, { date, meal, filename, mime }) {
  const info = db.prepare(
    'INSERT INTO photos (date, meal, filename, mime, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(date, meal, filename, mime, new Date().toISOString());
  return db.prepare('SELECT * FROM photos WHERE id = ?').get(info.lastInsertRowid);
}

export function deletePhoto(db, id) {
  const row = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
  if (row) db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  return row;
}

export function exportAll(db) {
  return {
    exportedAt: new Date().toISOString(),
    settings: getSettings(db),
    entries: db.prepare('SELECT date, data, updated_at FROM entries ORDER BY date').all()
      .map((r) => ({ date: r.date, updatedAt: r.updated_at, data: JSON.parse(r.data) })),
    photos: db.prepare('SELECT id, date, meal, filename, mime, created_at FROM photos ORDER BY id').all(),
  };
}
