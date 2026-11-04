import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('pretest score does not assign a starting stage or rank', () => {
  const route = readFileSync('src/app/api/student/assessment/route.ts', 'utf8');
  assert.doesNotMatch(route, /newStage\s*=\s*(11|21|31|41)/);
  assert.doesNotMatch(route, /newRank\s*=\s*[2-5]/);
  const pretest = readFileSync('src/components/PreTest.tsx', 'utf8');
  assert.doesNotMatch(pretest, /if \(averageScore >=/);
});
