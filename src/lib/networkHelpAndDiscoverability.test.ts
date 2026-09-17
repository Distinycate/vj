import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingPage = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const networkHomePage = readFileSync(new URL('../app/network/page.tsx', import.meta.url), 'utf8');
const networkStudentLoginPage = readFileSync(new URL('../app/network/login/page.tsx', import.meta.url), 'utf8');
const networkTeacherAuthPage = readFileSync(new URL('../app/network/teacher/page.tsx', import.meta.url), 'utf8');
const teacherDashboardPage = readFileSync(new URL('../app/network/teacher/dashboard/page.tsx', import.meta.url), 'utf8');

test('Part 2: Main landing page should have prominent Card Teacher button, single clean entry button for VJ Lite, and demo button at bottom', () => {
  // Check for discoverability section for network schools
  assert.match(landingPage, /โรงเรียนเครือข่ายและพันธมิตร/);
  assert.match(landingPage, /นักเรียนโรงเรียนเครือข่าย/);
  assert.match(landingPage, /ครูโรงเรียนเครือข่าย/);
  
  // Check unified direct router destination to VJ Lite homepage
  assert.match(landingPage, /router\.push\('\/network'\)/);
  // Verify main page does NOT have cluttered direct teacher button anymore (routed via /network)
  assert.doesNotMatch(landingPage, /router\.push\('\/network\/teacher'\)/);

  // Check Card Teacher button is prominent under login
  assert.match(landingPage, /ระบบการ์ดคำศัพท์สำหรับคุณครู/);
  // Check Demo button is present at bottom
  assert.match(landingPage, /โหมดกรรมการ/);
});

test('Part 3 & 5: VJ Lite Homepage and Standalone Student Login page should contain self-service guidance and clear steps', () => {
  // Header & guidance on VJ Lite Homepage
  assert.match(networkHomePage, /VOCAB JOURNEY • สำหรับโรงเรียนเครือข่าย/);
  assert.match(networkHomePage, /รับ Username และ Password จากคุณครู/);
  
  // Student guidance steps
  assert.match(networkHomePage, /วิธีใช้งานสำหรับนักเรียน/);
  assert.match(networkHomePage, /Pre-test/);
  assert.match(networkHomePage, /ฝึกคำศัพท์ตามลำดับด่าน โดยเริ่มจากด่านที่ 1/);
  assert.match(networkHomePage, /คำถามแบบ 4 ตัวเลือก/);
  assert.match(networkHomePage, /สะสมดาวและผ่านด่านให้ครบ 100 ด่าน/);
  assert.match(networkHomePage, /Post-test/);

  // 3 distinct gateways on VJ Lite Homepage
  assert.match(networkHomePage, /เข้าสู่ระบบนักเรียน/);
  assert.match(networkHomePage, /เข้าสู่ระบบคุณครู/);
  assert.match(networkHomePage, /สมัครสมาชิกครูใหม่/);
  assert.match(networkHomePage, /router\.push\('\/network\/login'\)/);
  assert.match(networkHomePage, /mode=login/);
  assert.match(networkHomePage, /mode=register/);

  // Innovator profile mirrored from main VJ
  assert.match(networkHomePage, /นายณัฐภัทร พรมปรุ/);
  assert.match(networkHomePage, /Mr\. Nattapat Prompru/);
  assert.match(networkHomePage, /โรงเรียนบ้านโคกยาง/);
  assert.match(networkHomePage, /สพป\.บุรีรัมย์ เขต 3/);

  // Standalone Student Login page verification
  assert.match(networkStudentLoginPage, /เข้าสู่ระบบนักเรียน/);
  assert.match(networkStudentLoginPage, /กรอก Username และ Password ที่ได้รับจากคุณครู/);
  assert.match(networkStudentLoginPage, /Pre-test/);
  assert.match(networkStudentLoginPage, /คำถามแบบ 4 ตัวเลือก/);
  assert.match(networkStudentLoginPage, /Post-test/);
  assert.match(networkStudentLoginPage, /\/network\/teacher/);
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
  assert.ok(!networkHomePage.includes('MCQ'));
  assert.ok(!networkHomePage.includes('RBAC'));
  assert.ok(!networkHomePage.includes('Session ID'));
  assert.ok(!networkStudentLoginPage.includes('MCQ'));
  assert.ok(!networkStudentLoginPage.includes('RBAC'));
  assert.ok(!networkStudentLoginPage.includes('Session ID'));

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
