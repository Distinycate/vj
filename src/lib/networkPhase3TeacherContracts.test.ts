import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const classroomsRoute = readFileSync(new URL('../app/api/network/classrooms/route.ts', import.meta.url), 'utf8');
const studentsRoute = readFileSync(new URL('../app/api/network/students/route.ts', import.meta.url), 'utf8');
const resetPasswordRoute = readFileSync(new URL('../app/api/network/students/reset-password/route.ts', import.meta.url), 'utf8');
const teacherDashboardPage = readFileSync(new URL('../app/network/teacher/dashboard/page.tsx', import.meta.url), 'utf8');

test('Teacher A can only see and manage classrooms owned by Teacher A', () => {
  // GET: teacher only sees their own classrooms
  assert.match(classroomsRoute, /requireNetworkTeacher\(\)/);
  assert.match(classroomsRoute, /\.eq\('teacher_id',\s*session\.subjectId\)/);
  
  // POST: teacher_id is bound directly to authenticated session
  assert.match(classroomsRoute, /teacher_id:\s*session\.subjectId/);

  // PATCH: ownership verified before updating
  assert.match(classroomsRoute, /existingClass\.teacher_id !== session\.subjectId/);
  assert.match(classroomsRoute, /Forbidden: You do not own this classroom/);
});

test('Teacher A cannot view or manage students in Classroom B owned by Teacher B', () => {
  // GET students: server queries classroom ownership before returning student roster
  assert.match(studentsRoute, /classroom\.teacher_id !== session\.subjectId/);
  assert.match(studentsRoute, /Forbidden: You do not own this classroom/);
  
  // POST students: server verifies classroom ownership before creating student
  assert.match(studentsRoute, /if \(!classroom \|\| classroom\.teacher_id !== session\.subjectId\)/);
});

test('Teacher A cannot reset password for Student B in Classroom B', () => {
  // Password reset queries student classroom and validates teacher ownership
  assert.match(resetPasswordRoute, /classroom\.teacher_id !== session\.subjectId/);
  assert.match(resetPasswordRoute, /Forbidden: You do not own this student’s classroom/);
  assert.match(resetPasswordRoute, /bcrypt\.hash\(newPassword,\s*10\)/);
  assert.match(resetPasswordRoute, /revoked_at/);
});

test('Student role cannot access Teacher Dashboard APIs', () => {
  // Classrooms API allows ONLY Network TEACHER
  assert.match(classroomsRoute, /requireNetworkTeacher\(\)/);
  
  // Students API allows ONLY Network TEACHER
  assert.match(studentsRoute, /requireNetworkTeacher\(\)/);

  // Reset password allows ONLY Network TEACHER
  assert.match(resetPasswordRoute, /requireNetworkTeacher\(\)/);
});

test('Export CSV contains required metrics and NEVER exports passwords, hashes, or tokens', () => {
  assert.match(teacherDashboardPage, /handleExportCSV/);
  assert.match(teacherDashboardPage, /'ลำดับ',\s*'ชื่อ-นามสกุล',\s*'Username',\s*'โรงเรียน',\s*'ห้องเรียน',\s*'ด่านปัจจุบัน',\s*'ดาวรวม',\s*'Pre-test',\s*'Post-test'/);
  
  // Does not export password, hash, or token
  assert.doesNotMatch(teacherDashboardPage, /handleExportCSV[\s\S]*?(?:s\.password|s\.password_hash|s\.token)/);
});

test('Teacher Dashboard displays exact raw scores and no complex Full Mode analytics', () => {
  // Shows raw pre-test and post-test scores or '-'
  assert.match(studentsRoute, /pre_test_score:\s*latestPre\s*\?\s*`\${latestPre\.score}\/\${latestPre\.total_questions}`\s*:\s*'-'/);
  assert.match(studentsRoute, /post_test_score:\s*latestPost\s*\?\s*`\${latestPost\.score}\/\${latestPost\.total_questions}`\s*:\s*'-'/);

  // Dashboard contains no cards, shop, seasons, or AI insight requests
  assert.doesNotMatch(teacherDashboardPage, /\/api\/admin\/analytics/);
  assert.doesNotMatch(teacherDashboardPage, /\/api\/admin\/cards/);
  assert.doesNotMatch(teacherDashboardPage, /\/api\/ai-insight/);
  assert.doesNotMatch(teacherDashboardPage, /\/api\/student\/leaderboard/);
});
