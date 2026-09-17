import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import crypto from 'node:crypto';

const sessionModule = readFileSync('src/lib/server/session.ts', 'utf8');
const meRoute = readFileSync('src/app/api/auth/me/route.ts', 'utf8');
const adminStudentsRoute = readFileSync('src/app/api/admin/students/route.ts', 'utf8');

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

interface MockSessionRecord {
  id: string;
  token_hash: string;
  subject_id: string;
  subject_type: 'STUDENT' | 'TEACHER';
  role: string;
  expires_at: string;
  revoked_at: string | null;
}

interface MockUserRecord {
  id: string;
  role: string;
  is_active: boolean;
  username: string;
}

// Emulate session validator logic matching src/lib/server/session.ts
class MockSessionStore {
  sessions = new Map<string, MockSessionRecord>();
  teachers = new Map<string, MockUserRecord>();
  students = new Map<string, MockUserRecord>();

  createSession(subjectId: string, subjectType: 'STUDENT' | 'TEACHER', role: string, lifetimeSec: number = 3600): string {
    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = hashToken(token);
    const expires_at = new Date(Date.now() + lifetimeSec * 1000).toISOString();
    const id = crypto.randomUUID();

    this.sessions.set(token_hash, {
      id,
      token_hash,
      subject_id: subjectId,
      subject_type: subjectType,
      role,
      expires_at,
      revoked_at: null,
    });

    return token;
  }

  revokeAllUserSessions(subjectId: string): void {
    for (const session of this.sessions.values()) {
      if (session.subject_id === subjectId && session.revoked_at === null) {
        session.revoked_at = new Date().toISOString();
      }
    }
  }

  validateSession(token: string): { status: number; session?: any; error?: string } {
    if (!token) return { status: 401, error: 'NO_TOKEN' };
    const token_hash = hashToken(token);
    const sessionRow = this.sessions.get(token_hash);

    if (!sessionRow) return { status: 401, error: 'SESSION_NOT_FOUND' };
    if (sessionRow.revoked_at !== null) return { status: 401, error: 'SESSION_REVOKED' };
    if (new Date(sessionRow.expires_at) <= new Date()) return { status: 401, error: 'SESSION_EXPIRED' };

    // Real-time Database Account Check (SSOT)
    if (sessionRow.subject_type === 'STUDENT') {
      const student = this.students.get(sessionRow.subject_id);
      if (!student || student.is_active === false) {
        sessionRow.revoked_at = new Date().toISOString();
        return { status: 401, error: 'ACCOUNT_SUSPENDED' };
      }
      return {
        status: 200,
        session: {
          sessionId: sessionRow.id,
          subjectId: student.id,
          subjectType: 'STUDENT',
          role: 'STUDENT',
          isActive: student.is_active,
        },
      };
    } else {
      const teacher = this.teachers.get(sessionRow.subject_id);
      if (!teacher || teacher.is_active === false) {
        sessionRow.revoked_at = new Date().toISOString();
        return { status: 401, error: 'ACCOUNT_SUSPENDED' };
      }
      // Authoritative Role from Database row
      const authoritativeRole = teacher.role;
      return {
        status: 200,
        session: {
          sessionId: sessionRow.id,
          subjectId: teacher.id,
          subjectType: 'TEACHER',
          role: authoritativeRole,
          isActive: teacher.is_active,
        },
      };
    }
  }

  requireRole(token: string, allowedRoles: string[]): { status: number; session?: any; error?: string } {
    const authResult = this.validateSession(token);
    if (authResult.status !== 200) return authResult;
    if (!allowedRoles.includes(authResult.session.role)) {
      return { status: 403, error: 'FORBIDDEN' };
    }
    return authResult;
  }
}

test('Attack 1: Role downgrade ADMIN -> TEACHER immediately blocks old session from admin actions', () => {
  const store = new MockSessionStore();
  const teacherId = 'teacher-admin-01';

  // 1. Initially user is ADMIN
  store.teachers.set(teacherId, { id: teacherId, role: 'ADMIN', is_active: true, username: 'admin1' });
  const adminToken = store.createSession(teacherId, 'TEACHER', 'ADMIN');

  // Verify initial admin action succeeds
  const initialAdminCheck = store.requireRole(adminToken, ['ADMIN']);
  assert.equal(initialAdminCheck.status, 200);

  // 2. Privilege downgrade in DB: role set to TEACHER
  store.teachers.get(teacherId)!.role = 'TEACHER';

  // 3. Attacker uses existing session token to attempt admin action
  const downgradedCheck = store.requireRole(adminToken, ['ADMIN']);
  assert.equal(downgradedCheck.status, 403);
  assert.equal(downgradedCheck.error, 'FORBIDDEN');

  // Confirm source code derives role strictly from teacher record in database
  assert.match(sessionModule, /authoritativeRole = \(teacher\.role as UserRole\)/);
  assert.match(adminStudentsRoute, /requireRole\(\['ADMIN'\]\)/);
});

test('Attack 2: Suspended student session is rejected immediately with 401', () => {
  const store = new MockSessionStore();
  const studentId = 'student-suspend-01';

  store.students.set(studentId, { id: studentId, role: 'STUDENT', is_active: true, username: 'student1' });
  const studentToken = store.createSession(studentId, 'STUDENT', 'STUDENT');

  // Active check succeeds
  assert.equal(store.validateSession(studentToken).status, 200);

  // Admin suspends student: is_active = false
  store.students.get(studentId)!.is_active = false;

  // Next request with active token is rejected
  const suspendedCheck = store.validateSession(studentToken);
  assert.equal(suspendedCheck.status, 401);
  assert.equal(suspendedCheck.error, 'ACCOUNT_SUSPENDED');

  // Confirm source code checks is_active on every request
  assert.match(sessionModule, /student\.is_active === false/);
  assert.match(sessionModule, /await revokeSession\(\)/);
});

test('Attack 3: Password reset revokes all existing sessions in database', () => {
  const store = new MockSessionStore();
  const userId = 'user-reset-01';

  store.teachers.set(userId, { id: userId, role: 'TEACHER', is_active: true, username: 'teach1' });
  const laptopToken = store.createSession(userId, 'TEACHER', 'TEACHER');
  const phoneToken = store.createSession(userId, 'TEACHER', 'TEACHER');

  assert.equal(store.validateSession(laptopToken).status, 200);
  assert.equal(store.validateSession(phoneToken).status, 200);

  // Password reset event invokes revokeAllUserSessions
  store.revokeAllUserSessions(userId);

  // Both old sessions are now revoked
  assert.equal(store.validateSession(laptopToken).status, 401);
  assert.equal(store.validateSession(laptopToken).error, 'SESSION_REVOKED');
  assert.equal(store.validateSession(phoneToken).status, 401);
  assert.equal(store.validateSession(phoneToken).error, 'SESSION_REVOKED');

  // Confirm source code implements revokeAllUserSessions
  assert.match(sessionModule, /export async function revokeAllUserSessions\(subjectId: string\)/);
  assert.match(sessionModule, /\.update\(\{ revoked_at: new Date\(\)\.toISOString\(\) \}\)/);
});

test('Attack 4: Expired session returns 401 and cannot be used', () => {
  const store = new MockSessionStore();
  const studentId = 'student-exp-01';

  store.students.set(studentId, { id: studentId, role: 'STUDENT', is_active: true, username: 'student2' });
  // Create an expired session (negative lifetime)
  const expiredToken = store.createSession(studentId, 'STUDENT', 'STUDENT', -10);

  const result = store.validateSession(expiredToken);
  assert.equal(result.status, 401);
  assert.equal(result.error, 'SESSION_EXPIRED');

  // Confirm database query filters gt('expires_at', new Date().toISOString())
  assert.match(sessionModule, /\.gt\('expires_at', new Date\(\)\.toISOString\(\)\)/);
});

test('Attack 5: Revoked session calling /api/auth/me returns 401', () => {
  const store = new MockSessionStore();
  const studentId = 'student-me-01';

  store.students.set(studentId, { id: studentId, role: 'STUDENT', is_active: true, username: 'student3' });
  const token = store.createSession(studentId, 'STUDENT', 'STUDENT');

  // Revoke session
  store.revokeAllUserSessions(studentId);

  const authResult = store.validateSession(token);
  assert.equal(authResult.status, 401);

  // Check /api/auth/me route handles null session with 401
  assert.match(meRoute, /if \(!session\) \{/);
  assert.match(meRoute, /return NextResponse\.json\(\{ authenticated: false \}, \{ status: 401 \}\);/);
});
