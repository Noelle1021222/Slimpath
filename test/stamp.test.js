// Unit tests for label colour helpers (pure functions; no DOM needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, textFor, stampText } from '../public/js/stamp.js';

test('contrast ratio', () => {
  assert.equal(Math.round(contrast('#FFFFFF', '#000000')), 21);
  assert.equal(contrast('#FFD54A', '#FFD54A'), 1);
  assert.ok(contrast('#FFFFFF', '#1B2130') > 10);
  assert.ok(contrast('#FFFFFF', '#FFD54A') < 2.2); // white on lemon is too faint
});

test('readable text colour for a background', () => {
  assert.equal(textFor('#1B2130'), '#FFFFFF');
  assert.equal(textFor('#FFFFFF'), '#1B2130');
  assert.equal(textFor('#FFD54A'), '#1B2130');
  assert.equal(textFor('#8EC5FF'), '#1B2130');
});

test('label text', () => {
  assert.equal(stampText('2026-10-05', '早餐'), '2026.10.05（一）早餐');
});
