import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSession, UserRole, SubjectType } from '@/lib/server/session';
import { assertSameOrigin, checkRateLimit } from '@/lib/server/security';

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  role: z.string().optional(),
});

function isBcryptHash(val: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(val);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    // Rate limiting: 10 attempts per minute per IP / client
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    if (!checkRateLimit(`login:${ip}`, 15, 60000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
    }

    const { username, password, role: requestedRole } = parsed.data;
    const cleanUsername = username.trim();

    let account: any = null;
    let subjectType: SubjectType = 'STUDENT';
    let authoritativeRole: UserRole = 'STUDENT';

    // Domain lookup based on requested role hint, but authoritative role comes from DB
    const isTeacherIntent = ['TEACHER', 'ADMIN', 'EXECUTIVE', 'CARD_TEACHER'].includes(
      (requestedRole || '').toUpperCase()
    );

    if (isTeacherIntent) {
      const { data: teacher } = await supabaseAdmin
        .from('teachers')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (teacher) {
        account = teacher;
        subjectType = 'TEACHER';
        authoritativeRole = (teacher.role as UserRole) || 'TEACHER';
      }
    }

    // Fallback or student lookup
    if (!account && (!isTeacherIntent || !requestedRole)) {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (student) {
        account = student;
        subjectType = 'STUDENT';
        authoritativeRole = 'STUDENT';
      }
    }

    // If still not found and was student intent, also check teachers just in case
    if (!account && !isTeacherIntent) {
      const { data: teacher } = await supabaseAdmin
        .from('teachers')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (teacher) {
        account = teacher;
        subjectType = 'TEACHER';
        authoritativeRole = (teacher.role as UserRole) || 'TEACHER';
      }
    }

    if (!account) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Check account status
    if (account.is_active === false) {
      return NextResponse.json({ error: 'Account is disabled or suspended' }, { status: 403 });
    }

    // Verify password with transparent bcrypt migration
    const storedCred = account.password || '';
    let passwordValid = false;

    if (isBcryptHash(storedCred)) {
      passwordValid = await bcrypt.compare(password, storedCred);
    } else {
      // Legacy plaintext password check
      if (storedCred === password) {
        passwordValid = true;
        // Transparently upgrade to bcrypt hash immediately
        const newHash = await bcrypt.hash(password, 10);
        const table = subjectType === 'STUDENT' ? 'students' : 'teachers';
        await supabaseAdmin
          .from(table)
          .update({ password: newHash })
          .eq('id', account.id);
      }
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Create session (HttpOnly, Secure cookie)
    await createSession(account.id, subjectType, authoritativeRole);

    // Fetch progress if student
    let progress: any = null;
    if (subjectType === 'STUDENT') {
      const { data: path } = await supabaseAdmin
        .from('learning_paths')
        .select('*')
        .eq('student_id', account.id)
        .maybeSingle();

      progress = path || {
        current_stage: 1,
        coins: 0,
        exp: 0,
        total_exp: 0,
        current_rank: 1,
        study_streak: 0,
      };
    }

    // Sanitize user object (exclude password and sensitive hashes)
    const sanitizedUser = {
      id: account.id,
      username: account.username,
      name: subjectType === 'STUDENT' ? account.student_name : account.name,
      classroom_id: account.classroom_id || null,
      user_type: account.user_type || 'INTERNAL',
      school_name: account.school_name || null,
      role: authoritativeRole,
    };

    return NextResponse.json({
      success: true,
      role: authoritativeRole,
      user: sanitizedUser,
      progress,
    });
  } catch (error: any) {
    if (error?.message === 'CROSS_ORIGIN_REQUEST_DENIED' || error?.message === 'ORIGIN_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
