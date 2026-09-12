import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSession } from '@/lib/server/session';
import { assertSameOrigin, checkRateLimit } from '@/lib/server/security';

const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  gradeLevel: z.string().min(1).max(20),
  roomNumber: z.string().min(1).max(20),
  username: z.string().min(3).max(50),
  password: z.string().min(4).max(100),
  userType: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  schoolName: z.string().max(100).optional(),
});

function generateRandomStudentId(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    if (!checkRateLimit(`register:${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { firstName, lastName, gradeLevel, roomNumber, username, password, userType, schoolName } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();

    // 1. Check duplicate username in students and teachers
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

    // 2. Resolve or create classroom
    const className = `${gradeLevel.trim()}/${roomNumber.trim()}`;
    let classroomId: string | null = null;

    if (userType === 'INTERNAL') {
      const { data: existingClass } = await supabaseAdmin
        .from('classrooms')
        .select('id')
        .eq('class_name', className)
        .maybeSingle();

      if (existingClass) {
        classroomId = existingClass.id;
      } else {
        const { data: newClass, error: classErr } = await supabaseAdmin
          .from('classrooms')
          .insert([{ class_name: className, grade_level: gradeLevel.trim(), room_number: roomNumber.trim() }])
          .select('id')
          .single();
        if (!classErr && newClass) {
          classroomId = newClass.id;
        }
      }
    }

    // 3. Hash password with bcrypt immediately (Zero plaintext credential created!)
    const passwordHash = await bcrypt.hash(password, 10);
    const studentUuid = crypto.randomUUID();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    let insertedStudent: any = null;
    let lastError: any = null;

    // Retry insertion for student_id uniqueness
    for (let attempt = 1; attempt <= 5; attempt++) {
      const candidateStudentId = generateRandomStudentId();
      const { data, error } = await supabaseAdmin
        .from('students')
        .insert([{
          id: studentUuid,
          student_id: candidateStudentId,
          student_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          grade_level: gradeLevel.trim(),
          room_number: roomNumber.trim(),
          username: cleanUsername,
          password: passwordHash, // Bcrypt hash stored
          classroom_id: classroomId,
          user_type: userType,
          school_name: schoolName || null,
          is_active: true,
          is_verified: userType === 'INTERNAL' ? true : false,
        }])
        .select()
        .single();

      if (!error && data) {
        insertedStudent = data;
        break;
      }
      lastError = error;
    }

    if (!insertedStudent) {
      console.error('Failed to create student:', lastError);
      return NextResponse.json({ error: 'ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
    }

    // 4. Initialize learning_paths row atomically via supabaseAdmin
    await supabaseAdmin
      .from('learning_paths')
      .insert([{
        student_id: insertedStudent.id,
        current_stage: 1,
        coins: 0,
        exp: 0,
        total_exp: 0,
        free_pull_tickets: 0,
        current_rank: 1,
        rank_score: 0,
        streak_days: 0,
      }]);

    // 5. Create secure HttpOnly session
    await createSession(insertedStudent.id, 'STUDENT', 'STUDENT');

    // 6. Return sanitized student profile (no password)
    const sanitizedStudent = {
      id: insertedStudent.id,
      student_id: insertedStudent.student_id,
      student_name: insertedStudent.student_name,
      first_name: insertedStudent.first_name,
      last_name: insertedStudent.last_name,
      username: insertedStudent.username,
      classroom_id: insertedStudent.classroom_id,
      user_type: insertedStudent.user_type,
      school_name: insertedStudent.school_name,
      role: 'STUDENT',
    };

    return NextResponse.json({
      success: true,
      student: sanitizedStudent,
    });
  } catch (error: any) {
    if (error?.message === 'CROSS_ORIGIN_REQUEST_DENIED' || error?.message === 'ORIGIN_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
