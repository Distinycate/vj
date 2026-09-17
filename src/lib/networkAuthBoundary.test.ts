import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const authLoginRoute = readFileSync(new URL('../app/api/auth/login/route.ts', import.meta.url), 'utf8');
const networkStudentLoginRoute = readFileSync(new URL('../app/api/network/auth/login/route.ts', import.meta.url), 'utf8');
const networkTeacherLoginRoute = readFileSync(new URL('../app/api/network/teacher/login/route.ts', import.meta.url), 'utf8');
const networkTeacherRegisterRoute = readFileSync(new URL('../app/api/network/teacher/register/route.ts', import.meta.url), 'utf8');
const sessionModule = readFileSync(new URL('./server/session.ts', import.meta.url), 'utf8');
const adminStudentsRoute = readFileSync(new URL('../app/api/admin/students/route.ts', import.meta.url), 'utf8');
const adminAnalyticsRoute = readFileSync(new URL('../app/api/admin/analytics/route.ts', import.meta.url), 'utf8');
const adminCardsRoute = readFileSync(new URL('../app/api/admin/cards/route.ts', import.meta.url), 'utf8');
const adminWorkflowsRoute = readFileSync(new URL('../app/api/admin/card-workflows/route.ts', import.meta.url), 'utf8');
const adminSeasonsRoute = readFileSync(new URL('../app/api/admin/seasons/route.ts', import.meta.url), 'utf8');
const exportReportRoute = readFileSync(new URL('../app/api/export-report/route.ts', import.meta.url), 'utf8');
const aiInsightRoute = readFileSync(new URL('../app/api/ai-insight/route.ts', import.meta.url), 'utf8');
const networkClassroomsRoute = readFileSync(new URL('../app/api/network/classrooms/route.ts', import.meta.url), 'utf8');
const networkStudentsRoute = readFileSync(new URL('../app/api/network/students/route.ts', import.meta.url), 'utf8');
const networkResetPasswordRoute = readFileSync(new URL('../app/api/network/students/reset-password/route.ts', import.meta.url), 'utf8');
const migrationSql = readFileSync(new URL('../../MIGRATION_ADD_TEACHER_TYPE.sql', import.meta.url), 'utf8');

test('1. Additive Migration specifies teacher_type column with default INTERNAL', () => {
  assert.match(migrationSql, /ALTER TABLE public\.teachers/);
  assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS teacher_type text NOT NULL DEFAULT 'INTERNAL'/);
  assert.match(migrationSql, /CHECK \(teacher_type IN \('INTERNAL', 'NETWORK'\)\)/);
});

test('2. Main login strictly rejects EXTERNAL students (Cross-Entry Protection)', () => {
  assert.match(authLoginRoute, /if \(subjectType === 'STUDENT' && account\.user_type === 'EXTERNAL'\)/);
  assert.match(authLoginRoute, /status: 403/);
  assert.match(authLoginRoute, /บัญชีนี้เป็นนักเรียนโรงเรียนเครือข่าย/);
});

test('3. Network student login strictly rejects INTERNAL students', () => {
  assert.match(networkStudentLoginRoute, /if \(student\.user_type !== 'EXTERNAL'\)/);
  assert.match(networkStudentLoginRoute, /status: 403/);
  assert.match(networkStudentLoginRoute, /บัญชีนี้เป็นนักเรียนโรงเรียนหลัก/);
});

test('4. Main login strictly rejects NETWORK teachers from obtaining Full Mode sessions', () => {
  assert.match(authLoginRoute, /if \(subjectType === 'TEACHER' && account\.teacher_type === 'NETWORK'\)/);
  assert.match(authLoginRoute, /status: 403/);
  assert.match(authLoginRoute, /บัญชีนี้เป็นครูโรงเรียนเครือข่าย/);
});

test('5. Dedicated Network Teacher login route strictly verifies teacher_type === NETWORK and rejects INTERNAL teachers', () => {
  assert.match(networkTeacherLoginRoute, /if \(teacherType !== 'NETWORK'\)/);
  assert.match(networkTeacherLoginRoute, /status: 403/);
  assert.match(networkTeacherLoginRoute, /บัญชีนี้เป็นครูโรงเรียนหลัก/);
});

test('6. Network Teacher registration forces teacher_type = NETWORK server-side', () => {
  assert.match(networkTeacherRegisterRoute, /teacher_type:\s*'NETWORK'/);
  assert.match(networkTeacherRegisterRoute, /role:\s*'TEACHER'/);
});

test('7. Session module provides requireInternalTeacherRole and requireNetworkTeacher guards', () => {
  assert.match(sessionModule, /export async function requireInternalTeacherRole/);
  assert.match(sessionModule, /session\.subjectType === 'TEACHER' && session\.teacherType === 'NETWORK'/);
  assert.match(sessionModule, /FORBIDDEN_NETWORK_TEACHER/);
  
  assert.match(sessionModule, /export async function requireNetworkTeacher/);
  assert.match(sessionModule, /session\.subjectType !== 'TEACHER' \|\| session\.teacherType !== 'NETWORK'/);
  assert.match(sessionModule, /FORBIDDEN_NOT_NETWORK_TEACHER/);
});

test('8. Full Mode Teacher APIs are protected with requireInternalTeacherRole', () => {
  // admin students
  assert.match(adminStudentsRoute, /requireInternalTeacherRole\(\['ADMIN', 'TEACHER', 'CARD_TEACHER', 'EXECUTIVE'\]\)/);
  
  // admin analytics
  assert.match(adminAnalyticsRoute, /requireInternalTeacherRole\(\['TEACHER', 'ADMIN', 'EXECUTIVE'\]\)/);
  
  // admin cards
  assert.match(adminCardsRoute, /requireInternalTeacherRole\(\['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE'\]\)/);
  
  // admin card workflows
  assert.match(adminWorkflowsRoute, /requireInternalTeacherRole\(\['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE'\]\)/);
  
  // admin seasons
  assert.match(adminSeasonsRoute, /requireInternalTeacherRole\(\['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE'\]\)/);
  
  // export report
  assert.match(exportReportRoute, /requireInternalTeacherRole\(\['TEACHER', 'ADMIN', 'EXECUTIVE'\]\)/);
  
  // ai insight
  assert.match(aiInsightRoute, /requireInternalTeacherRole\(\['TEACHER', 'ADMIN', 'EXECUTIVE'\]\)/);
});

test('9. Network APIs strictly require requireNetworkTeacher and enforce classroom ownership', () => {
  // classrooms
  assert.match(networkClassroomsRoute, /requireNetworkTeacher\(\)/);
  assert.match(networkClassroomsRoute, /eq\('teacher_id',\s*session\.subjectId\)/);
  
  // students
  assert.match(networkStudentsRoute, /requireNetworkTeacher\(\)/);
  assert.match(networkStudentsRoute, /classroom\.teacher_id !== session\.subjectId/);
  
  // reset password
  assert.match(networkResetPasswordRoute, /requireNetworkTeacher\(\)/);
  assert.match(networkResetPasswordRoute, /classroom\.teacher_id !== session\.subjectId/);
});
