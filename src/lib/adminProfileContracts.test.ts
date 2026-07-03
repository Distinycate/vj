import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profileSource = readFileSync(
  new URL('../components/admin/IndividualStudentProfile.tsx', import.meta.url),
  'utf8',
);
const adminSource = readFileSync(
  new URL('../app/admin/page.tsx', import.meta.url),
  'utf8',
);

test('individual profile reads real gameplay and wrong-word tables', () => {
  assert.match(profileSource, /\.from\('attempts'\)/);
  assert.match(profileSource, /\.from\('wrong_words'\)/);
  assert.match(profileSource, /analytics_summary\(\*\)/);
  assert.match(profileSource, /learning_paths\(\*\)/);
});

test('individual charts do not fabricate retention or fixed start dates', () => {
  assert.doesNotMatch(profileSource, /Ebbinghaus/);
  assert.doesNotMatch(profileSource, /2024-05-10/);
  assert.doesNotMatch(profileSource, /Math\.max\(day/);
});

test('admin team tab includes selected-classroom and school leaderboards', () => {
  assert.match(adminSource, /TeamLeaderboard scope="class" classroomId=\{selectedClassroom\}/);
  assert.match(adminSource, /TeamLeaderboard scope="school"/);
});
