import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../MIGRATION_EXTERNAL_NETWORK.sql', import.meta.url), 'utf8');
const networkRegister = readFileSync(new URL('../app/register/network/page.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../components/Dashboard.tsx', import.meta.url), 'utf8');
const studentHero = readFileSync(new URL('../components/StudentHero.tsx', import.meta.url), 'utf8');
const teamBattleEngine = readFileSync(new URL('../utils/teamBattleEngine.ts', import.meta.url), 'utf8');
const cardBattle = readFileSync(new URL('../utils/cardBattle.ts', import.meta.url), 'utf8');
const externalAdmin = readFileSync(new URL('../app/admin/external-network/page.tsx', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
const eventsPage = readFileSync(new URL('../app/events/page.tsx', import.meta.url), 'utf8');

test('external network migration adds isolated user type columns with internal defaults', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'INTERNAL'/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS school_name text NOT NULL DEFAULT 'โรงเรียนบ้านโคกยาง'/);
  assert.match(migration, /CHECK \(user_type IN \('INTERNAL', 'EXTERNAL'\)\)/);
  assert.match(migration, /UPDATE public\.students[\s\S]*user_type = COALESCE\(user_type, 'INTERNAL'\)/);
});

test('network registration forces external users without classroom or team assignment', () => {
  assert.match(networkRegister, /from\('students'\)/);
  assert.match(networkRegister, /user_type: 'EXTERNAL'/);
  assert.match(networkRegister, /school_name: schoolName\.trim\(\)/);
  assert.match(networkRegister, /classroom_id: null/);
  assert.doesNotMatch(networkRegister, /autoAssignTeamForStudent|team_members/);
});

test('external users do not see internal card, gacha, team, leaderboard, or event surfaces', () => {
  assert.match(dashboard, /student\.user_type === 'EXTERNAL'/);
  assert.match(dashboard, /!isExternalUser && \(\s*<div data-demo-guide="leaderboard"/);
  assert.match(dashboard, /activeTab === 'teams' as any && !isExternalUser/);
  assert.match(studentHero, /Guest Network/);
  assert.match(studentHero, /!isExternalUser && \(/);
  assert.match(eventsPage, /session\?\.user_type === 'EXTERNAL'/);
});

test('team and card utilities protect backend calls from external users', () => {
  assert.match(teamBattleEngine, /select\('user_type'\)/);
  assert.match(teamBattleEngine, /EXTERNAL_USER_NOT_ASSIGNED_TO_INTERNAL_TEAMS/);
  assert.match(teamBattleEngine, /EXTERNAL_USER_NOT_RECORDED_IN_INTERNAL_TEAM_SCORE/);
  assert.match(teamBattleEngine, /\.eq\('students\.user_type', 'INTERNAL'\)/);
  assert.match(teamBattleEngine, /pre-migration/);
  assert.match(teamBattleEngine, /legacyQuery/);
  assert.match(cardBattle, /assertInternalCardUser/);
  assert.match(cardBattle, /pre-migration databases have no user_type column/);
  assert.match(cardBattle, /ไม่สามารถใช้ระบบการ์ดหรือกาชา/);
});

test('external admin report lists only external users and supports exports', () => {
  assert.match(admin, /\/admin\/external-network/);
  assert.match(externalAdmin, /\.eq\('user_type', 'EXTERNAL'\)/);
  assert.match(externalAdmin, /school_name/);
  assert.match(externalAdmin, /current_stage/);
  assert.match(externalAdmin, /success_rate/);
  assert.match(externalAdmin, /Export Excel/);
  assert.match(externalAdmin, /Export PDF/);
});
