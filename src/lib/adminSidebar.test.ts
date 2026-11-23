import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/app/admin/page.tsx', 'utf8');
const sidebarPath = 'src/components/admin/AdminSidebar.tsx';

test('the shared staff dashboard uses one sidebar instead of stacked navigation', () => {
  assert.match(page, /<AdminSidebar\b/);
  assert.doesNotMatch(page, /Sub-Navigation Pills|Assessment Sub-tabs|Term Switcher Bar/);
});

test('sidebar retains the admin destinations and distinguishes the selected item on mobile', () => {
  assert.ok(existsSync(sidebarPath));
  const sidebar = readFileSync(sidebarPath, 'utf8');
  for (const item of ['school-overview', 'overview', 'students', 'weak-words', 'risks', 'onet', 'pre-post', 'teams', 'events', 'term-archive', 'settings', '/admin/teach', '/admin/worksheets', '/admin/cards', '/admin/external-network']) {
    assert.ok(sidebar.includes(`'${item}'`), item);
  }
  assert.match(sidebar, /aria-current=/);
  assert.match(sidebar, /aria-expanded=/);
});

test('classroom reports do not substitute a fake accuracy or hide failed fetches', () => {
  assert.doesNotMatch(page, /accuracy: attempts > 0 \? acc : 70/);
  assert.match(page, /classroomStatus === 'error'/);
  assert.match(page, /classroomStatus === 'loading'/);
});

test('the pre/post comparison uses evidence from stored tests and preserves a real score of zero', () => {
  const table = readFileSync('src/components/admin/IndividualComparisonTable.tsx', 'utf8');
  const source = readFileSync('src/lib/server/adminAnalyticsEnricher.ts', 'utf8');
  assert.match(table, /s\.assessmentEvidence\?\.postScore \?\? null/);
  assert.match(table, /s\.post !== null/);
  assert.match(source, /preScore: summarizePretests\(sPre\)\.score/);
  assert.match(source, /postScore: latestValidPost \?/);
});
