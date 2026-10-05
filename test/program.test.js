// Unit tests for the programme model (phases, dates, auto-checks).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_DAYS, schedule, locate, addDays, normalizeEntry, derivedChecks, checklistScore,
  checklistFor, waterGoalMl, inBedBy23, CHECKLIST, ADAPT_CHECKLIST,
} from '../public/js/program.js';

test('three phases span 12 weeks back to back', () => {
  const s = schedule('2026-10-05');
  assert.equal(TOTAL_DAYS, 84);
  assert.deepEqual(s.map((p) => [p.name, p.start, p.end]), [
    ['調適期', '2026-10-05', '2026-10-18'],
    ['戒斷期', '2026-10-19', '2026-11-29'],
    ['穩定期', '2026-11-30', '2026-12-27'],
  ]);
});

test('locate gives phase, week and day', () => {
  assert.equal(locate('2026-10-05', '2026-10-04'), null);
  assert.equal(locate('2026-10-05', addDays('2026-10-05', 84)), null);
  const d = locate('2026-10-05', '2026-10-19');
  assert.equal(d.phase.id, 'detox');
  assert.equal(d.day, 15);
  assert.equal(d.week, 3);
  assert.equal(d.dayOfWeek, 1);
  assert.equal(d.phaseWeek, 1);
  assert.equal(locate('2026-10-05', '2026-12-27').phase.id, 'stable');
});

test('date math survives month and DST boundaries', () => {
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(addDays('2026-03-07', 2), '2026-03-09');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('normalizeEntry fills missing fields', () => {
  const e = normalizeEntry({ weight: '70', meals: { lunch: { veg: { green: 2 } } } });
  assert.equal(e.weight, '70');
  assert.equal(e.meals.lunch.veg.green, 2);
  assert.equal(e.meals.lunch.veg.red, 0);
  assert.deepEqual(e.meals.dinner.protein, []);
  assert.equal(e.checklist.lemon, false);
});

test('derived checks follow the journal', () => {
  const e = normalizeEntry({ water: 8, sleep: 7, bedtime: '22:30', weight: '70', bodyFat: '30', relaxMins: '15' });
  for (const [i, c] of ['green', 'red', 'yellow', 'purple', 'white'].entries()) e.meals[['breakfast', 'lunch', 'dinner', 'breakfast', 'lunch'][i]].veg[c] = 1;
  for (const m of ['breakfast', 'lunch', 'dinner']) e.meals[m].kcal = '550';
  const photos = ['breakfast', 'lunch', 'dinner'].map((meal) => ({ meal }));
  assert.deepEqual(derivedChecks(e, photos), {
    weigh: true, water: true, sleep7: true, bed23: true, sleep: true, veg5: true, photos: true, relax: true, kcal: true,
  });
  e.meals.lunch.kcal = '650';
  assert.equal(derivedChecks(e, photos).kcal, false);
  const empty = derivedChecks(normalizeEntry(null), []);
  assert.ok(Object.values(empty).every((v) => !v));
});

test('water goal scales with weight above 70kg', () => {
  assert.equal(waterGoalMl(60), 2000);
  assert.equal(waterGoalMl(70), 2000);
  assert.equal(waterGoalMl(80), 2400);
  assert.equal(waterGoalMl('72.5'), 2200); // 2175 rounded up to 50ml
  const heavy = normalizeEntry({ weight: '80', water: 8 });
  assert.equal(derivedChecks(heavy, []).water, false);
  heavy.water = 10;
  assert.equal(derivedChecks(heavy, []).water, true);
});

test('bedtime before 23:00', () => {
  assert.equal(inBedBy23('22:59'), true);
  assert.equal(inBedBy23('23:00'), false);
  assert.equal(inBedBy23('00:30'), false);
  assert.equal(inBedBy23(''), false);
});

test('checklist depends on phase', () => {
  assert.equal(checklistFor('adapt'), ADAPT_CHECKLIST);
  assert.equal(ADAPT_CHECKLIST.length, 12);
  assert.equal(checklistFor('detox'), CHECKLIST);
  assert.equal(checklistFor(undefined).length, 9);
  const e = normalizeEntry(null);
  e.checklist.podcast = true;
  e.checklist.chew = true;
  assert.equal(checklistScore(e, ADAPT_CHECKLIST), 2 / 12);
  assert.equal(checklistScore(e, CHECKLIST), 0);
});
