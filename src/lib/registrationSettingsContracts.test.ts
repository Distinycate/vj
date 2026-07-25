import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settingsSource = readFileSync('src/components/admin/SettingsTab.tsx', 'utf8');
const homeSource = readFileSync('src/app/page.tsx', 'utf8');
const adminSource = readFileSync('src/app/admin/page.tsx', 'utf8');
const migrationSource = readFileSync('MIGRATION_REGISTRATION_SETTINGS_FIX.sql', 'utf8');

test('registration toggle uses the custom teacher RPC instead of relying on Supabase Auth uid', () => {
  assert.match(settingsSource, /teacher_set_registration_open/);
  assert.match(settingsSource, /p_teacher_id:\s*teacher\.id/);
  assert.match(migrationSource, /SECURITY DEFINER/);
  assert.match(migrationSource, /role IN \('ADMIN', 'TEACHER'\)/);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.teacher_set_registration_open/);
});

test('student registration re-checks the latest database setting before insert', () => {
  assert.match(homeSource, /fetchRegistrationOpen/);
  assert.match(homeSource, /\.maybeSingle\(\)/);
  assert.match(homeSource, /latestRegistrationOpen/);
  assert.match(homeSource, /ระบบปิดรับลงทะเบียนชั่วคราว/);
});

test('student admin tab renders room and id organization even when analytics metrics are missing', () => {
  assert.match(adminSource, /activeTab === 'students'/);
  assert.doesNotMatch(adminSource, /activeTab === 'students' && classroomMetrics/);
  assert.match(adminSource, /รายชื่อนักเรียน \/ ไอดี แยกตามห้อง/);
  assert.match(adminSource, /classroomStudentCounts/);
  assert.match(adminSource, />รหัสนักเรียน</);
  assert.match(adminSource, />Username</);
  assert.match(adminSource, /ยังไม่มีนักเรียนในห้องนี้/);
});
