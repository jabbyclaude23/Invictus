import test from 'node:test';
import assert from 'node:assert/strict';
import { habitSummary, localDayKey, legacyHabitDayKey, formatPnl } from './dashboard.js';

test('empty habits do not imply a completed day', () => {
  assert.deepEqual(habitSummary([]), { completed: 0, total: 0, percent: 0 });
});

test('completion supports binary and target habits without overcounting', () => {
  assert.deepEqual(habitSummary([
    { progress: 1 }, { progress: 0 }, { target: 8, progress: 10 },
    { target: 8, progress: 2 },
  ]), { completed: 2, total: 4, percent: 50 });
});

test('local day uses calendar components instead of UTC conversion', () => {
  const date = { getFullYear: () => 2026, getMonth: () => 9, getDate: () => 20 };
  assert.equal(localDayKey(date), '2026-10-20');
});

test('existing habit records keep their legacy UTC keys', () => {
  assert.equal(legacyHabitDayKey(new Date('2026-10-20T23:30:00-04:00')), '2026-10-21');
});

test('realized losses retain the negative sign and wins have a plus sign', () => {
  assert.equal(formatPnl(-150.5), '-$150.50');
  assert.equal(formatPnl(250), '+$250.00');
  assert.equal(formatPnl(0), '$0.00');
});
