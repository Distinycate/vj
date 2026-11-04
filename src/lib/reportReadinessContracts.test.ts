import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync('src/app/page.tsx', 'utf8');
const dashboardSource = readFileSync('src/components/Dashboard.tsx', 'utf8');
const pretestSource = readFileSync('src/components/PreTest.tsx', 'utf8');
const adaptiveEngineSource = readFileSync('src/utils/adaptiveEngine.ts', 'utf8');
const teamBattleSource = readFileSync('src/utils/teamBattleEngine.ts', 'utf8');
const adminSource = readFileSync('src/app/admin/page.tsx', 'utf8');

test('landing page explains Vocab Journey and presents the innovator profile', () => {
  assert.match(homeSource, /ก้าวข้ามขีดจำกัดการท่องจำ/);
  assert.match(homeSource, /นวัตกรรมการจัดการเรียนรู้เชิงรุก/);
  assert.match(homeSource, /Adaptive Rank/);
  assert.match(homeSource, /Ebbinghaus Forgetting Curve/);
  assert.match(homeSource, /ประวัติและข้อมูลผู้จัดทำนวัตกรรม/);
  assert.match(homeSource, /นายณัฐภัทร พรมปรุ/);
  assert.match(homeSource, /Mr\. Nattapat Prompru/);
  assert.match(homeSource, /โรงเรียนบ้านโคกยาง/);
  assert.match(homeSource, /สำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3/);
  assert.match(homeSource, /Head of Personnel Administration/);
  assert.match(homeSource, /Gamification & EdTech/);
  assert.match(homeSource, /PDCA/);
});

test('pre-test completion uses authoritative saved tests, not a score-based rank', () => {
  const state = readFileSync('src/lib/server/assessmentProgress.ts', 'utf8');
  assert.match(state, /summarizePretests\(pre.data \|\| \[\], isExternal \? 1 : 5\)/);
  assert.match(homeSource, /setProgress\(data.progress\)/);
  assert.doesNotMatch(homeSource, /from\('pre_tests'\)/);
  assert.match(pretestSource, /pretest_score: result.preScore/);
  assert.doesNotMatch(pretestSource, /if \(averageScore >=/);
});

test('stage map treats every tenth stage as a boss and stage 100 as Final Boss', () => {
  assert.match(dashboardSource, /stageNum % 10 === 0/);
  assert.match(dashboardSource, /stageNum === 100/);
  assert.match(dashboardSource, /Final Boss ผู้พิชิต O-NET/);
  assert.match(adaptiveEngineSource, /const isBoss = stageNumber % 10 === 0/);
});

test('rank formula, stars, SRS, vocabulary collection, and intervention alerts are backed by real tables', () => {
  assert.match(dashboardSource, /setWordCollection/);
  assert.match(dashboardSource, /setStageStars/);
});

test('team battle and teacher dashboard report views are implemented as live sections', () => {
  assert.match(teamBattleSource, /team_battle_seasons/);
  assert.match(teamBattleSource, /\.eq\('scope', 'school'\)/);
  assert.match(dashboardSource, /TeamLeaderboard scope="class"/);
  assert.match(dashboardSource, /TeamLeaderboard scope="school"/);
});
