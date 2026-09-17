import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSession } from '@/lib/server/session';
import { assertSameOrigin, checkRateLimit } from '@/lib/server/security';

const networkTeacherLoginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้').max(50),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(100),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    if (!checkRateLimit(`network-teacher-login:${ip}`, 15, 60000)) {
      return NextResponse.json(
        { error: 'เข้าสู่ระบบบ่อยเกินไป กรุณารอ 1 นาที' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = networkTeacherLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.issues }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();

    // Query teacher by username
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .select('id, name, username, password, role, is_active, teacher_type')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if (teacher.is_active === false) {
      return NextResponse.json({ error: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' }, { status: 403 });
    }

    // STRICT BOUNDARY CHECK: Only NETWORK teachers can authenticate here
    const teacherType = (teacher as any).teacher_type || 'INTERNAL';
    if (teacherType !== 'NETWORK') {
      return NextResponse.json(
        { error: 'บัญชีนี้เป็นครูโรงเรียนหลัก กรุณาเข้าสู่ระบบผ่านหน้าหลัก' },
        { status: 403 }
      );
    }

    // Verify password with bcrypt
    const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(teacher.password);
    let isPasswordValid = false;

    if (isBcrypt) {
      isPasswordValid = await bcrypt.compare(password, teacher.password);
    } else {
      if (teacher.password === password) {
        isPasswordValid = true;
        const newHash = await bcrypt.hash(password, 10);
        await supabaseAdmin.from('teachers').update({ password: newHash }).eq('id', teacher.id);
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Create session (12 hours lifetime)
    await createSession(teacher.id, 'TEACHER', 'TEACHER');

    return NextResponse.json({
      success: true,
      user: {
        id: teacher.id,
        username: teacher.username,
        name: teacher.name,
        role: 'TEACHER',
        teacherType: 'NETWORK',
      },
    });
  } catch (error: any) {
    if (error?.status === 403) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
    console.error('Network teacher login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
