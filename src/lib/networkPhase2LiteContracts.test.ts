import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gameStartRoute = readFileSync(new URL('../app/api/game/start/route.ts', import.meta.url), 'utf8');
const studentInitRoute = readFileSync(new URL('../app/api/network/student/init/route.ts', import.meta.url), 'utf8');
const studentDashboardPage = readFileSync(new URL('../app/network/student/page.tsx', import.meta.url), 'utf8');
const networkLoginPage = readFileSync(new URL('../app/network/page.tsx', import.meta.url), 'utf8');
const adaptiveEngine = readFileSync(new URL('../utils/adaptiveEngine.ts', import.meta.url), 'utf8');

test('A & B: Pre-test gate strictly gates first-time EXTERNAL students and allows returning students', () => {
  // student/init checks pre_tests existence
  assert.match(studentInitRoute, /pre_tests/);
  assert.match(studentInitRoute, /hasCompletedPreTest/);
  
  // Dashboard page enforces pre-test screen when not completed
  assert.match(studentDashboardPage, /!assessment\.hasCompletedPreTest/);
  assert.match(studentDashboardPage, /activeView === 'pretest'/);
  assert.match(studentDashboardPage, /PreTest/);

  // Returning student with completed pre-test enters map view
  assert.match(studentDashboardPage, /setActiveView\('map'\)/);
});

test('C: EXTERNAL student gameplay generates 100% Multiple Choice across ALL stage types (Skull Mode)', () => {
  // 1. /api/game/start forces qPattern = i % 2 (MEANING_MC or WORD_MC only) for EXTERNAL students
  assert.match(gameStartRoute, /session\.user\.userType === 'EXTERNAL'/);
  assert.match(gameStartRoute, /isExternalStudent \? \(i % 2\) : \(i % 3\)/);
  
  // FILL_BLANK is only accessible to INTERNAL students (qPattern === 2)
  assert.match(gameStartRoute, /if \(qPattern === 2\)/);

  // 2. adaptiveEngine.ts fallback also enforces MCQ only for EXTERNAL students
  assert.match(adaptiveEngine, /user_type === 'EXTERNAL'/);
  assert.match(adaptiveEngine, /questionTypes = \['meaning_mc', 'word_mc'\]/);
});

test('D: Progression and Stars calculation reuses standard VJ mechanics', () => {
  assert.match(studentInitRoute, /stageStarsMap/);
  assert.match(studentInitRoute, /unlockedStages/);
  assert.match(studentInitRoute, /totalStars/);
  assert.match(studentDashboardPage, /progression\.stageStarsMap/);
  assert.match(studentDashboardPage, /progression\.unlockedStages/);
});

test('E: Post-test is unlocked upon reaching/completing Stage 100 and saves assessment', () => {
  assert.match(studentDashboardPage, /currentStageNum >= 100 \|\| progression\.stageStarsMap\[100\] !== undefined/);
  assert.match(studentDashboardPage, /isPostTestUnlocked/);
  assert.match(studentDashboardPage, /PostTest/);
  assert.match(studentInitRoute, /post_tests/);
  assert.match(studentInitRoute, /hasCompletedPostTest/);
});

test('F: Isolation — Lite Student Dashboard does NOT import, mount, or fetch Full Mode services', () => {
  // The Lite dashboard must not fetch or import cards, shop, teams, gacha, inbox, quests, SRS reviews, or AI insight
  assert.doesNotMatch(studentDashboardPage, /\/api\/student\/cards/);
  assert.doesNotMatch(studentDashboardPage, /\/api\/shop/);
  assert.doesNotMatch(studentDashboardPage, /\/api\/admin\/seasons/);
  assert.doesNotMatch(studentDashboardPage, /\/api\/student\/leaderboard/);
  assert.doesNotMatch(studentDashboardPage, /\/api\/ai-insight/);
  assert.doesNotMatch(studentDashboardPage, /CardCenter|ShopModal|TeamBattle|Gacha/);
});

test('G: Security & Routing — Authenticated EXTERNAL only, INTERNAL rejected from Lite route', () => {
  // /network login redirects to /network/student
  assert.match(networkLoginPage, /\/network\/student/);

  // /api/network/student/init strictly rejects non-EXTERNAL students
  assert.match(studentInitRoute, /session\.user\.userType !== 'EXTERNAL'/);
  assert.match(studentInitRoute, /Forbidden: บัญชีนี้ไม่ใช่นักเรียนโรงเรียนเครือข่าย/);
  assert.match(studentInitRoute, /status:\s*403/);
});
