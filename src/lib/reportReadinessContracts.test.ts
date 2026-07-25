import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync('src/app/page.tsx', 'utf8');
const dashboardSource = readFileSync('src/components/Dashboard.tsx', 'utf8');
const pretestSource = readFileSync('src/components/PreTest.tsx', 'utf8');
const adaptiveEngineSource = readFileSync('src/utils/adaptiveEngine.ts', 'utf8');
const teamBattleSource = readFileSync('src/utils/teamBattleEngine.ts', 'utf8');
const adminSource = readFileSync('src/app/admin/page.tsx', 'utf8');

test('landing page explains Vocab Journey and separates live features from roadmap claims', () => {
  assert.match(homeSource, /ก้าวข้ามขีดจำกัดการท่องจำ/);
  assert.match(homeSource, /นวัตกรรมการจัดการเรียนรู้เชิงรุก/);
  assert.match(homeSource, /Adaptive Rank/);
  assert.match(homeSource, /Ebbinghaus Forgetting Curve/);
  assert.match(homeSource, /สถานะฟีเจอร์สำหรับนำไปเขียนรายงาน/);
  assert.match(homeSource, /Certificate \/ Hall of Fame/);
  assert.match(homeSource, /เตรียมเชื่อมต่อ/);
  assert.match(homeSource, /การ์ด Thief ข้ามห้อง/);
});

test('pre-test is gated by five attempts and uses the average score for initial rank', () => {
  assert.match(pretestSource, /newCount >= 5/);
  assert.match(pretestSource, /averageScore/);
  assert.match(pretestSource, /pretest_date: new Date\(\)\.toISOString\(\)/);
  assert.match(homeSource, /pretestCount !== null && pretestCount >= 5/);
});

test('stage map treats every tenth stage as a boss and stage 100 as Final Boss', () => {
  assert.match(dashboardSource, /stageNum % 10 === 0/);
  assert.match(dashboardSource, /stageNum === 100/);
  assert.match(dashboardSource, /Final Boss ผู้พิชิต O-NET/);
  assert.match(adaptiveEngineSource, /const isBoss = stageNumber % 10 === 0/);
  assert.match(adaptiveEngineSource, /10, 20, 30, 40, 50, 60, 70, 80, 90, 100/);
});

test('rank formula, stars, SRS, vocabulary collection, and intervention alerts are backed by real tables', () => {
  assert.match(adaptiveEngineSource, /progressScore \* 0\.35/);
  assert.match(adaptiveEngineSource, /recentAccuracy \* 0\.30/);
  assert.match(adaptiveEngineSource, /starScore \* 0\.20/);
  assert.match(adaptiveEngineSource, /bossScore \* 0\.10/);
  assert.match(adaptiveEngineSource, /consistencyScore \* 0\.05/);
  assert.match(adaptiveEngineSource, /\.from\('user_review_words'\)/);
  assert.match(adaptiveEngineSource, /next_review_at/);
  assert.match(adaptiveEngineSource, /reviewIntervals = \[0, 1, 3, 7, 30\]/);
  assert.match(dashboardSource, /\.from\('user_review_words'\)/);
  assert.match(dashboardSource, /setWordCollection/);
  assert.match(dashboardSource, /setStageStars/);
  assert.match(adaptiveEngineSource, /\.from\('intervention_alerts'\)/);
});

test('team battle and teacher dashboard report views are implemented as live sections', () => {
  assert.match(teamBattleSource, /team_battle_seasons/);
  assert.match(teamBattleSource, /\.eq\('scope', 'school'\)/);
  assert.match(dashboardSource, /TeamLeaderboard scope="class"/);
  assert.match(dashboardSource, /TeamLeaderboard scope="school"/);
  assert.match(adminSource, /\.from\('item_analysis'\)/);
  assert.match(adminSource, /calculateRiskScore/);
  assert.match(adminSource, /atRiskStudents/);
  assert.match(adminSource, /ผล Team Battle รายห้อง/);
  assert.match(adminSource, /ผล Team Battle ระดับโรงเรียน/);
});
