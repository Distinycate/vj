import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('school overview does not present cumulative wrong_words as semester results', () => {
  const route = readFileSync('src/app/api/admin/school-overview/route.ts', 'utf8');
  assert.doesNotMatch(route, /\.from\('wrong_words'\)/);
  const view = readFileSync('src/components/admin/SchoolLevelDashboard.tsx', 'utf8');
  assert.match(view, /SchoolTermWrongWords/);
});
