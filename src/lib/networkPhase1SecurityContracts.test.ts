import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const teacherRegisterRoute = readFileSync(new URL('../app/api/network/teacher/register/route.ts', import.meta.url), 'utf8');
const classroomsRoute = readFileSync(new URL('../app/api/network/classrooms/route.ts', import.meta.url), 'utf8');
const studentsRoute = readFileSync(new URL('../app/api/network/students/route.ts', import.meta.url), 'utf8');
const resetPasswordRoute = readFileSync(new URL('../app/api/network/students/reset-password/route.ts', import.meta.url), 'utf8');
const networkLoginRoute = readFileSync(new URL('../app/api/network/auth/login/route.ts', import.meta.url), 'utf8');
const teacherDashboardPage = readFileSync(new URL('../app/network/teacher/dashboard/page.tsx', import.meta.url), 'utf8');
const networkLoginPage = readFileSync(new URL('../app/network/login/page.tsx', import.meta.url), 'utf8');

test('Teacher Registration forces role = TEACHER and never grants ADMIN/EXECUTIVE/CARD_TEACHER', () => {
  assert.match(teacherRegisterRoute, /role:\s*'TEACHER'/);
  assert.match(teacherRegisterRoute, /bcrypt\.hash/);
  // Ensure the insert payload explicitly sets role to 'TEACHER' and does not accept role from payload
  assert.doesNotMatch(teacherRegisterRoute, /role:\s*(?:body\.role|parsed\.data\.role|['"]ADMIN['"]|['"]EXECUTIVE['"])/);
});

test('Classrooms endpoint enforces strict Teacher -> Classroom ownership', () => {
  // GET: teacher only sees their own classrooms
  assert.match(classroomsRoute, /requireNetworkTeacher\(\)/);
  assert.match(classroomsRoute, /\.eq\('teacher_id',\s*session\.subjectId\)/);
  
  // POST: teacher_id set directly from server session
  assert.match(classroomsRoute, /teacher_id:\s*session\.subjectId/);

  // PATCH: verifies classroom ownership before updating
  assert.match(classroomsRoute, /existingClass\.teacher_id !== session\.subjectId/);
  assert.match(classroomsRoute, /Forbidden: You do not own this classroom/);
});

test('Student creation strictly enforces EXTERNAL user_type and prevents privilege escalation', () => {
  // Verifies teacher ownership of target classroom before student insertion
  assert.match(studentsRoute, /classroom\.teacher_id !== session\.subjectId/);
  assert.match(studentsRoute, /Forbidden: You do not own this classroom/);

  // Server forces EXTERNAL regardless of client payload
  assert.match(studentsRoute, /user_type:\s*'EXTERNAL'/);
  assert.match(studentsRoute, /Server strictly enforces EXTERNAL/);

  // Passwords hashed with bcrypt
  assert.match(studentsRoute, /bcrypt\.hash\(password,\s*10\)/);

  // Projection does not leak password or password hash
  assert.doesNotMatch(studentsRoute, /\.select\(['"][^'"]*password[^'"]*['"]\)/);
});

test('Student Password Reset strictly enforces Classroom Ownership and blocks cross-teacher resets', () => {
  assert.match(resetPasswordRoute, /requireNetworkTeacher\(\)/);
  assert.match(resetPasswordRoute, /classroom\.teacher_id !== session\.subjectId/);
  assert.match(resetPasswordRoute, /Forbidden: You do not own this student’s classroom/);
  
  // Bcrypt hash on reset
  assert.match(resetPasswordRoute, /bcrypt\.hash\(newPassword,\s*10\)/);
  // Revokes sessions on password reset
  assert.match(resetPasswordRoute, /user_sessions/);
  assert.match(resetPasswordRoute, /revoked_at/);
});

test('Network Student Login endpoint strictly admits EXTERNAL students and rejects INTERNAL students', () => {
  assert.match(networkLoginRoute, /student\.user_type !== 'EXTERNAL'/);
  assert.match(networkLoginRoute, /บัญชีนี้เป็นนักเรียนโรงเรียนหลัก กรุณาเข้าสู่ระบบผ่านหน้าหลัก/);
  assert.match(networkLoginRoute, /createSession\(student\.id,\s*'STUDENT',\s*'STUDENT'/);
});

test('Teacher Dashboard does not expose old passwords and only allows resets', () => {
  assert.doesNotMatch(teacherDashboardPage, /oldPassword|previousPassword|showOldPassword/i);
  assert.match(teacherDashboardPage, /รีเซ็ตรหัสผ่านนักเรียน/);
  assert.match(teacherDashboardPage, /รหัสผ่านเดิมถูกเข้ารหัสด้วย Hash อย่างปลอดภัย จึงไม่สามารถแสดงรหัสเดิมได้/);
  assert.match(teacherDashboardPage, /\/api\/network\/students\/reset-password/);
});

test('Network student and teacher portals route to correct endpoints', () => {
  assert.match(networkLoginPage, /\/api\/network\/auth\/login/);
  assert.match(teacherDashboardPage, /\/api\/network\/classrooms/);
  assert.match(teacherDashboardPage, /\/api\/network\/students/);
});
