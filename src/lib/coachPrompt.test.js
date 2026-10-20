import test from 'node:test';
import assert from 'node:assert/strict';
import { COACH_PROMPT, selectCoachPrompt, compactDailyCheckins, compactGoals } from './coachPrompt.js';

test('plan generation keeps its complete explicit system prompt unchanged', () => {
  const workout = 'Generate a workout as JSON only. Return this exact JSON structure: {"weekly_schedule": []}';
  const nutrition = 'Return ONLY valid JSON: {"calories": number}';
  assert.equal(selectCoachPrompt(workout), workout);
  assert.equal(selectCoachPrompt(nutrition), nutrition);
});
test('general coaching is psychologically informed without claiming clinical expertise', () => {
  assert.equal(selectCoachPrompt(undefined), COACH_PROMPT);
  assert.match(COACH_PROMPT, /self-compassion/);
  assert.match(COACH_PROMPT, /Do not diagnose/);
  assert.match(COACH_PROMPT, /not a human psychologist or therapist/);
  assert.match(COACH_PROMPT, /Don't invent wins, streaks, emotions, motives, or progress/i);
});
test('daily context preserves unknown values and bounds personal text', () => {
  const rows = compactDailyCheckins(Array.from({ length: 10 }, () => ({ date: '2026-10-20', energy: 2, sleepHours: null, priorities: [{ text: 'Take a walk', done: true }], reflection: 'x'.repeat(1000) })));
  assert.equal(rows.length, 7);
  assert.equal(rows[0].sleepHours, null);
  assert.equal(rows[0].focusMinutes, null);
  assert.deepEqual(rows[0].priorities, [{ text: 'Take a walk', done: true }]);
  assert.equal(rows[0].reflection.length, 900);
});
test('goal context keeps narrative intent and legacy progress, excluding archived records', () => {
  assert.deepEqual(compactGoals([{ name: 'Feel stronger', why: 'More energy', nextAction: 'Walk outside', status: 'active' }, { name: 'Old target', target: 5, progress: 5 }, { name: 'Archived', archived: true }]), [
    { name: 'Feel stronger', why: 'More energy', nextAction: 'Walk outside', targetDate: '', status: 'active' },
    { name: 'Old target', why: '', nextAction: '', targetDate: '', status: 'achieved', target: 5, progress: 5 },
  ]);
});
