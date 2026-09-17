import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingPage = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const networkStudentPage = readFileSync(new URL('../app/network/page.tsx', import.meta.url), 'utf8');
const networkTeacherAuthPage = readFileSync(new URL('../app/network/teacher/page.tsx', import.meta.url), 'utf8');
const teacherDashboardPage = readFileSync(new URL('../app/network/teacher/dashboard/page.tsx', import.meta.url), 'utf8');

test('Part 2: Main landing page should have a single clean entry button for Network Schools (VJ Lite)', () => {
  // Check for discoverability section for network schools
  assert.match(landingPage, /โรงเรียนเครือข่ายและพันธมิตร/);
  assert.match(landingPage, /นักเรียนโรงเรียนเครือข่าย/);
  assert.match(landingPage, /ครูโรงเรียนเครือข่าย/);
  
  // Check unified direct router destination to VJ Lite homepage
  assert.match(landingPage, /router\.push\('\/network'\)/);
  // Verify main page does NOT have cluttered direct teacher button anymore (routed via /network)
  assert.doesNotMatch(landingPage, /router\.push\('\/network\/teacher'\)/);
});

test('Part 3 & 5: Network Student login page should contain self-service guidance and clear steps', () => {
  // Header & guidance
  assert.match(networkStudentPage, /VOCAB JOURNEY • สำหรับโรงเรียนเครือข่าย/);
  assert.match(networkStudentPage, /รับ Username และ Password จากคุณครู/);
  
  // Student guidance steps
  assert.match(networkStudentPage, /วิธีใช้งานสำหรับนักเรียน/);
  assert.match(networkStudentPage, /กรอก Username และ Password ที่ได้รับจากคุณครู/);
  assert.match(networkStudentPage, /Pre-test/);
  assert.match(networkStudentPage, /ฝึกคำศัพท์ตามลำดับด่าน โดยเริ่มจากด่านที่ 1/);
  assert.match(networkStudentPage, /คำถามแบบ 4 ตัวเลือก/);
  assert.match(networkStudentPage, /สะสมดาวและผ่านด่านให้ครบ 100 ด่าน/);
  assert.match(networkStudentPage, /Post-test/);

  // 3 distinct gateways on VJ Lite Homepage
  assert.match(networkStudentPage, /เข้าสู่ระบบนักเรียน/);
  assert.match(networkStudentPage, /เข้าสู่ระบบคุณครู/);
  assert.match(networkStudentPage, /สมัครสมาชิกครูใหม่/);
  assert.match(networkStudentPage, /mode=login/);
  assert.match(networkStudentPage, /mode=register/);

  // Innovator profile mirrored from main VJ
  assert.match(networkStudentPage, /นายณัฐภัทร พรมปรุ/);
  assert.match(networkStudentPage, /Mr\. Nattapat Prompru/);
  assert.match(networkStudentPage, /โรงเรียนบ้านโคกยาง/);
  assert.match(networkStudentPage, /สพป\.บุรีรัมย์ เขต 3/);

  // Pedagogical & Color Theory
  assert.match(networkStudentPage, /ลดภาระทางปัญญา/);
  assert.match(networkStudentPage, /Cognitive Load/);
  assert.match(networkStudentPage, /Dual Coding/);
  assert.match(networkStudentPage, /จิตวิทยาสี/);

  // Link for teachers
  assert.match(networkStudentPage, /\/network\/teacher/);
  assert.match(networkStudentPage, /เข้าสู่ระบบหรือสมัครใช้งานสำหรับคุณครู/);
});

test('Part 4: Teacher Dashboard should contain 8-part Self-Service Guide modal', () => {
  // Help button in navigation
  assert.match(teacherDashboardPage, /คู่มือการใช้งาน/);
  assert.match(teacherDashboardPage, /คู่มือการใช้งานสำหรับคุณครูโรงเรียนเครือข่าย/);

  // 8 topics
  assert.match(teacherDashboardPage, /การสมัครใช้งาน/);
  assert.match(teacherDashboardPage, /การสร้างห้องเรียน/);
  assert.match(teacherDashboardPage, /การสร้างบัญชีนักเรียน \(เดี่ยว \/ ชุด\)/);
  assert.match(teacherDashboardPage, /วิธีให้นักเรียนเข้าใช้งาน/);
  assert.match(teacherDashboardPage, /การเรียนและการฝึกคำศัพท์ของนักเรียน/);
  assert.match(teacherDashboardPage, /การติดตามผลการเรียน/);
  assert.match(teacherDashboardPage, /การรีเซ็ตรหัสผ่าน \(Reset Password\)/);
  assert.match(teacherDashboardPage, /การส่งออกรายงาน \(Export CSV\)/);

  // Crucial reminders
  assert.match(teacherDashboardPage, /รหัสผ่านจะแสดงให้เห็นบนหน้าจอเพียงครั้งเดียว/);
  assert.match(teacherDashboardPage, /คำถามแบบ 4 ตัวเลือก/);
  assert.match(teacherDashboardPage, /รีเฟรชข้อมูล/);
});

test('Part 6: Language review - user-facing UI uses natural Thai terminology and avoids raw technical jargon', () => {
  // Should NOT expose raw backend terminology in user labels
  assert.ok(!networkStudentPage.includes('MCQ'));
  assert.ok(!networkStudentPage.includes('RBAC'));
  assert.ok(!networkStudentPage.includes('Session ID'));

  // Should use friendly terminology
  assert.match(teacherDashboardPage, /โรงเรียนเครือข่าย \(Lite\)/);
  assert.ok(!teacherDashboardPage.includes('EXTERNAL (Lite)'));
});

test('Part 7: Mobile readiness check - table has compact card view and modals are scrollable', () => {
  // Verifies responsive conditional rendering for table & mobile card view
  assert.match(teacherDashboardPage, /hidden md:block/);
  assert.match(teacherDashboardPage, /block md:hidden/);
  assert.match(teacherDashboardPage, /max-h-\[70vh\] overflow-y-auto/);
});
