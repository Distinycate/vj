import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizePretests } from './assessmentState.ts';

test('fractional average is retained, including the missing-summary regression', () => {
  const result = summarizePretests([14, 13, 13, 15, 9].map(score => ({ score, total_questions: 25, created_at: '2026-11-04T00:00:00Z' })));
  assert.equal(result.score, 12.8);
  assert.equal(result.completed, true);
});
test('no history is not a zero score or a completed baseline', () => {
  assert.deepEqual(summarizePretests([]), { count: 0, score: null, completed: false, completedAt: null });
});
test('partial pretest remains incomplete even when a summary exists', () => {
  assert.equal(summarizePretests([{ score: 25, total_questions: 25, created_at: '2026-11-04' }]).completed, false);
});
test('five genuine zero scores complete the assessment', () => {
  const result = summarizePretests(Array.from({ length: 5 }, () => ({ score: 0, total_questions: 25, created_at: '2026-11-04' })));
  assert.equal(result.score, 0);
  assert.equal(result.completed, true);
});
test('history is normalized onto the 25-point reporting scale', () => {
  assert.equal(summarizePretests([{ score: 10, total_questions: 20, created_at: '2026-11-04' }]).score, 12.5);
});
