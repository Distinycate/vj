import 'server-only';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export const SESSION_COOKIE_NAME = 'vj_session';
export const SESSION_LIFETIME_SEC = 12 * 60 * 60; // 12 hours

export type SubjectType = 'STUDENT' | 'TEACHER';
export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'EXECUTIVE' | 'CARD_TEACHER';
export type TeacherType = 'INTERNAL' | 'NETWORK';

export interface ActiveSession {
  sessionId: string;
  subjectId: string;
  subjectType: SubjectType;
  role: UserRole;
  teacherType?: TeacherType;
  user: {
    id: string;
    username: string;
    name: string;
    student_name?: string;
    classroomId?: string | null;
    userType?: string;
    teacherType?: TeacherType;
    schoolName?: string | null;
    isActive: boolean;
    is_verified?: boolean;
  };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  subjectId: string,
  subjectType: SubjectType,
  role: UserRole
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_SEC * 1000).toISOString();

  const { error } = await supabaseAdmin.from('user_sessions').insert({
    subject_type: subjectType,
    subject_id: subjectId,
    role: role,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Failed to create user session:', error);
    throw new Error('SESSION_CREATION_FAILED');
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_LIFETIME_SEC,
  });

  return token;
}

export async function getSession(): Promise<ActiveSession | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!tokenCookie || !tokenCookie.value) return null;

  const tokenHash = hashToken(tokenCookie.value);

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from('user_sessions')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return null;
  }

  // Account status validation against Database (Single Source of Truth)
  if (sessionRow.subject_type === 'STUDENT') {
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select('id, student_name, username, is_active, classroom_id, user_type, school_name, is_verified')
      .eq('id', sessionRow.subject_id)
      .maybeSingle();

    if (studentErr || !student || student.is_active === false) {
      await revokeSession();
      return null;
    }

    return {
      sessionId: sessionRow.id,
      subjectId: student.id,
      subjectType: 'STUDENT',
      role: 'STUDENT',
      user: {
        id: student.id,
        username: student.username,
        name: student.student_name,
        student_name: student.student_name,
        classroomId: student.classroom_id,
        userType: student.user_type || 'INTERNAL',
        schoolName: student.school_name,
        isActive: student.is_active !== false,
        is_verified: student.is_verified ?? false,
      },
    };
  } else {
    const { data: teacher, error: teacherErr } = await supabaseAdmin
      .from('teachers')
      .select('id, name, username, role, is_active, teacher_type')
      .eq('id', sessionRow.subject_id)
      .maybeSingle();

    if (teacherErr || !teacher || teacher.is_active === false) {
      await revokeSession();
      return null;
    }

    // Ensure authoritative role and teacher_type come from the database teacher record
    const authoritativeRole = (teacher.role as UserRole) || 'TEACHER';
    const teacherType: TeacherType = ((teacher as any).teacher_type as TeacherType) || 'INTERNAL';

    return {
      sessionId: sessionRow.id,
      subjectId: teacher.id,
      subjectType: 'TEACHER',
      role: authoritativeRole,
      teacherType,
      user: {
        id: teacher.id,
        username: teacher.username,
        name: teacher.name,
        teacherType,
        isActive: teacher.is_active !== false,
      },
    };
  }
}

export async function requireSession(): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) {
    const error: any = new Error('UNAUTHORIZED');
    error.status = 401;
    throw error;
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<ActiveSession> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    const error: any = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }
  return session;
}

/**
 * Strict check for Full Mode teacher / admin functions.
 * Denies NETWORK teachers from accessing Full Mode school management/card systems.
 */
export async function requireInternalTeacherRole(
  allowedRoles: UserRole[] = ['ADMIN', 'TEACHER', 'CARD_TEACHER', 'EXECUTIVE']
): Promise<ActiveSession> {
  const session = await requireRole(allowedRoles);
  if (session.subjectType === 'TEACHER' && session.teacherType === 'NETWORK') {
    const error: any = new Error('FORBIDDEN_NETWORK_TEACHER');
    error.status = 403;
    throw error;
  }
  return session;
}

/**
 * Strict check for Network Teacher functions.
 * Requires role === TEACHER and teacher_type === NETWORK.
 */
export async function requireNetworkTeacher(): Promise<ActiveSession> {
  const session = await requireRole(['TEACHER']);
  if (session.subjectType !== 'TEACHER' || session.teacherType !== 'NETWORK') {
    const error: any = new Error('FORBIDDEN_NOT_NETWORK_TEACHER');
    error.status = 403;
    throw error;
  }
  return session;
}

export async function revokeSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (tokenCookie && tokenCookie.value) {
      const tokenHash = hashToken(tokenCookie.value);
      await supabaseAdmin
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (err) {
    console.error('Error during revokeSession:', err);
  }
}

export async function revokeAllUserSessions(subjectId: string): Promise<void> {
  await supabaseAdmin
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('subject_id', subjectId)
    .is('revoked_at', null);
}
