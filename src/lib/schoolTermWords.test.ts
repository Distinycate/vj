import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bangkokMonth, reportingTerms } from './reportingTerms.ts';

test('school overview does not present cumulative wrong_words as semester results', () => {
  const route = readFileSync('src/app/api/admin/school-overview/route.ts', 'utf8');
  assert.doesNotMatch(route, /\.from\('wrong_words'\)/);
  const view = readFileSync('src/components/admin/SchoolLevelDashboard.tsx', 'utf8');
  assert.match(view, /SchoolTermWrongWords/);
});

test('semester cutover is midnight in Bangkok and school test trend excludes network students', () => {
  assert.equal(reportingTerms['1'].end, reportingTerms['2'].start);
  assert.equal(bangkokMonth('2026-10-31T16:59:59.999Z'), '2026-10');
  assert.equal(bangkokMonth(reportingTerms['2'].start), '2026-11');
  const route = readFileSync('src/app/api/admin/school-overview/route.ts', 'utf8');
  assert.match(route, /students!inner\(user_type\)/);
  assert.match(route, /\.eq\('students.user_type', 'INTERNAL'\)/);
  assert.match(route, /if \(pre !== null\)/);
});
