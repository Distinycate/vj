import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSession } from '@/lib/server/session';
import { assertSameOrigin, checkRateLimit } from '@/lib/server/security';

const networkLoginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้').max(50),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(100),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    if (!checkRateLimit(`network-login:${ip}`, 15, 60000)) {
      return NextResponse.json(
        { error: 'เข้าสู่ระบบบ่อยเกินไป กรุณารอ 1 นาที' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = networkLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.issues }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();

    // Query student by username
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, student_id, username, password, student_name, classroom_id, user_type, school_name, is_active, grade_level, room_number')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if (!student.is_active) {
      return NextResponse.json({ error: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' }, { status: 403 });
    }

    // STRICT NETWORK ENFORCEMENT: Only EXTERNAL students are allowed on this route
    if (student.user_type !== 'EXTERNAL') {
      return NextResponse.json(
        { error: 'บัญชีนี้เป็นนักเรียนโรงเรียนหลัก กรุณาเข้าสู่ระบบผ่านหน้าหลัก' },
        { status: 403 }
      );
    }

    // Verify password with bcrypt (with legacy fallback support)
    const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(student.password);
    let isPasswordValid = false;

    if (isBcrypt) {
      isPasswordValid = await bcrypt.compare(password, student.password);
    } else {
      if (student.password === password) {
        isPasswordValid = true;
        // Transparent upgrade
        const newHash = await bcrypt.hash(password, 10);
        await supabaseAdmin.from('students').update({ password: newHash }).eq('id', student.id);
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Create session (12 hours lifetime handled internally)
    await createSession(student.id, 'STUDENT', 'STUDENT');

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentId: student.student_id,
        username: student.username,
        studentName: student.student_name,
        classroomId: student.classroom_id,
        userType: 'EXTERNAL',
        schoolName: student.school_name,
        gradeLevel: student.grade_level,
        roomNumber: student.room_number,
      },
    });
  } catch (error: any) {
    if (error?.status === 403) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
    console.error('Network student login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
