import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSession } from '@/lib/server/session';
import { assertSameOrigin, checkRateLimit } from '@/lib/server/security';

const teacherRegisterSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล').max(100),
  username: z.string().min(3, 'Username ต้องมีอย่างน้อย 3 ตัวอักษร').max(50),
  password: z.string().min(4, 'Password ต้องมีอย่างน้อย 4 ตัวอักษร').max(100),
  schoolName: z.string().min(1, 'กรุณากรอกชื่อโรงเรียน').max(100),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    if (!checkRateLimit(`teacher-register:${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = teacherRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, username, password, schoolName } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();

    // Check duplicate username across students and teachers
    const [{ data: existingStudent }, { data: existingTeacher }] = await Promise.all([
      supabaseAdmin.from('students').select('id').ilike('username', cleanUsername).maybeSingle(),
      supabaseAdmin.from('teachers').select('id').ilike('username', cleanUsername).maybeSingle(),
    ]);

    if (existingStudent || existingTeacher) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น' },
        { status: 409 }
      );
    }

    // Hash password using standard bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const teacherId = crypto.randomUUID();

    // Insert new Network Teacher (role strictly forced to 'TEACHER', teacher_type forced to 'NETWORK')
    const { data: newTeacher, error: insertError } = await supabaseAdmin
      .from('teachers')
      .insert({
        id: teacherId,
        username: cleanUsername,
        password: passwordHash,
        name: name.trim(),
        role: 'TEACHER', // Never ADMIN, EXECUTIVE, or CARD_TEACHER
        teacher_type: 'NETWORK', // Explicit server-side assignment
        is_active: true,
      })
      .select('id, username, name, role, teacher_type, created_at')
      .single();

    if (insertError) {
      console.error('Teacher registration DB error:', insertError);
      return NextResponse.json({ error: 'Failed to create teacher account' }, { status: 500 });
    }

    // Create session and set cookie
    await createSession(newTeacher.id, 'TEACHER', 'TEACHER');

    return NextResponse.json({
      success: true,
      teacher: {
        id: newTeacher.id,
        username: newTeacher.username,
        name: newTeacher.name,
        role: newTeacher.role,
        schoolName: schoolName.trim(),
      },
    });
  } catch (error: any) {
    if (error?.status === 403) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
    console.error('Network teacher register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
