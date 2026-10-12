// 每日三件事 / 四種快樂: data compatibility, weekly stats, and the autosave queue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEntry, emptyEntry, checklistScore, ADAPT_CHECKLIST, CHECKLIST,
  weekStart, weekDates, joyWeek, JOY_KINDS,
} from '../public/js/program.js';
import { createAutosave } from '../public/js/autosave.js';

test('new fields have full defaults', () => {
  const e = emptyEntry();
  assert.deepEqual(e.reflection, { careMoment: '', goal: '', strengths: '', ease: '' });
  for (const k of JOY_KINDS) assert.deepEqual(e.joy[k.id], { felt: false, note: '' });
});

test('old journals without the new fields still load', () => {
  const old = { weight: '70', tomorrow: '早點睡', meals: { lunch: { kcal: '500' } }, checklist: { lemon: true } };
  const e = normalizeEntry(old);
  assert.equal(e.weight, '70');
  assert.equal(e.tomorrow, '早點睡');
  assert.equal(e.meals.lunch.kcal, '500');
  assert.equal(e.reflection.careMoment, '');
  assert.equal(e.joy.being.felt, false);
});

test('partial and malformed nested data is filled in safely', () => {
  const e = normalizeEntry({
    reflection: { goal: '寫完一段', ease: 42, extra: 'x' },
    joy: { life: { felt: true }, adventure: { note: '走新路' }, goal: 'yes', being: { felt: 'true', note: null } },
  });
  assert.deepEqual(e.reflection, { careMoment: '', goal: '寫完一段', strengths: '', ease: '' });
  assert.deepEqual(e.joy.life, { felt: true, note: '' });
  assert.deepEqual(e.joy.adventure, { felt: false, note: '走新路' });
  assert.deepEqual(e.joy.goal, { felt: false, note: '' });
  assert.deepEqual(e.joy.being, { felt: false, note: '' }); // only a real `true` counts
  assert.deepEqual(normalizeEntry({ reflection: null, joy: [] }).joy, emptyEntry().joy);
});

test('normalizing does not share nested objects between entries', () => {
  const a = normalizeEntry(null);
  const b = normalizeEntry(null);
  a.joy.life.felt = true;
  a.reflection.goal = 'x';
  assert.equal(b.joy.life.felt, false);
  assert.equal(b.reflection.goal, '');
});

test('reflection and joy never change the checklist score', () => {
  const e = normalizeEntry({ checklist: { lemon: true } });
  const before = [checklistScore(e, CHECKLIST), checklistScore(e, ADAPT_CHECKLIST)];
  for (const k of JOY_KINDS) e.joy[k.id] = { felt: true, note: 'note' };
  Object.assign(e.reflection, { careMoment: 'a', goal: 'b', strengths: 'c', ease: 'd' });
  assert.deepEqual([checklistScore(e, CHECKLIST), checklistScore(e, ADAPT_CHECKLIST)], before);
});

test('weeks run Monday to Sunday', () => {
  assert.equal(weekStart('2026-10-12'), '2026-10-12'); // Monday
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // Sunday belongs to the week before it
  assert.equal(weekStart('2026-10-19'), '2026-10-19');
  assert.deepEqual(weekDates('2026-10-14'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
});

test('week boundaries across months and years', () => {
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // Sunday → previous month
  assert.deepEqual(weekDates('2026-11-01').slice(-2), ['2026-10-31', '2026-11-01']);
  assert.equal(weekStart('2027-01-01'), '2026-12-28'); // Friday → previous year
  assert.deepEqual(weekDates('2027-01-03'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});

test('weekly joy counts each date at most once per kind', () => {
  const dates = weekDates('2026-10-14');
  const rows = [
    { date: '2026-10-12', joy: { life: { felt: true }, being: { felt: true, note: '' } } },
    { date: '2026-10-12', joy: { life: { felt: true } } }, // duplicate date
    { date: '2026-10-15', joy: { life: { felt: true }, goal: { felt: false, note: '只寫了字' } } },
    { date: '2026-10-18', joy: { adventure: { felt: true } } }, // Sunday is in the week
    { date: '2026-10-19', joy: { life: { felt: true } } }, // next Monday is not
    { date: '2026-10-11', joy: { being: { felt: true } } }, // previous Sunday is not
    { date: '2026-10-13' }, // no joy data at all
  ];
  assert.deepEqual(joyWeek(rows, dates), {
    life: ['2026-10-12', '2026-10-15'],
    adventure: ['2026-10-18'],
    goal: [],
    being: ['2026-10-12'],
  });
  assert.deepEqual(joyWeek([], dates), { life: [], adventure: [], goal: [], being: [] });
});

// ---------- autosave queue ----------
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('autosave runs one save at a time and ends with the newest content', async () => {
  let value = 0;
  const stored = [];
  let active = 0;
  let maxActive = 0;
  const a = createAutosave({
    delay: 5,
    snapshot: () => value,
    save: async (v) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await tick(v === 1 ? 40 : 5); // the first save is slow
      stored.push(v);
      active--;
    },
  });
  value = 1;
  a.touch();
  await tick(15); // first save now in flight
  value = 2;
  a.touch();
  value = 3;
  a.touch();
  await a.flush();
  await a.idle();
  assert.equal(maxActive, 1);
  assert.equal(stored.at(-1), 3);
  assert.deepEqual(stored, [1, 3]);
  assert.equal(a.hasUnsaved(), false);
});

test('a failed save keeps the edits as unsaved until retry succeeds', async () => {
  let fail = true;
  const states = [];
  const stored = [];
  const a = createAutosave({
    delay: 1,
    snapshot: () => 'draft',
    save: async (v) => {
      if (fail) throw new Error('offline');
      stored.push(v);
    },
    onState: (s) => states.push(s),
  });
  a.touch();
  await a.flush();
  assert.equal(states.at(-1), 'error');
  assert.equal(a.hasUnsaved(), true);
  assert.deepEqual(stored, []);
  fail = false;
  await a.retry();
  assert.equal(states.at(-1), 'saved');
  assert.deepEqual(stored, ['draft']);
  assert.equal(a.hasUnsaved(), false);
});

test('flush saves immediately and does nothing when there is nothing new', async () => {
  let calls = 0;
  const a = createAutosave({ delay: 10_000, snapshot: () => 1, save: async () => void calls++ });
  await a.flush();
  assert.equal(calls, 0);
  a.touch();
  await a.flush(); // no need to wait for the 10s debounce
  assert.equal(calls, 1);
  await a.flush();
  assert.equal(calls, 1);
});
