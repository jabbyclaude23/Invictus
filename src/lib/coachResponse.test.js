import test from 'node:test';
import assert from 'node:assert/strict';
import { readCoachReply } from './coachResponse.js';

test('extracts a successful coach reply', () => assert.equal(readCoachReply('{"reply":"Your next step."}', true), 'Your next step.'));
test('rejects HTTP failures even when a reply exists', () => assert.throws(() => readCoachReply('{"reply":"Error details"}', false), /unavailable/));
test('rejects HTML, malformed JSON, and missing or empty replies', () => {
  for (const response of ['<html>error</html>', '{}', '{"reply":""}', '{"reply":42}']) {
    assert.throws(() => readCoachReply(response, true), /unavailable/);
  }
});
