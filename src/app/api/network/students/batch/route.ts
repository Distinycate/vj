import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { requireNetworkTeacher } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const batchCreateSchema = z.object({
  classroomId: z.string().uuid('Invalid classroomId'),
  students: z.array(
    z.object({
      studentName: z.string().min(1).max(100),
      username: z.string().min(3).max(50),
    })
  ).min(1).max(100),
  defaultPassword: z.string().min(4).max(100),
  schoolName: z.string().max(100).optional(),
  gradeLevel: z.string().max(20).optional(),
  roomNumber: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireNetworkTeacher();

    const body = await request.json().catch(() => null);
    const parsed = batchCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.issues }, { status: 400 });
    }

    const { classroomId, students: studentList, defaultPassword, schoolName, gradeLevel, roomNumber } = parsed.data;

    // Verify classroom ownership
    const { data: classroom } = await supabaseAdmin
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.teacher_id !== session.subjectId) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงห้องเรียนนี้' }, { status: 403 });
    }

    // Hash password ONCE for the whole batch (huge performance speedup)
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Fetch existing usernames to prevent collisions
    const candidateUsernames = studentList.map(s => s.username.trim().toLowerCase());
    const [{ data: existingStudents }, { data: existingTeachers }] = await Promise.all([
      supabaseAdmin.from('students').select('username').in('username', candidateUsernames),
      supabaseAdmin.from('teachers').select('username').in('username', candidateUsernames),
    ]);

    const usedUsernames = new Set([
      ...(existingStudents || []).map(s => s.username.toLowerCase()),
      ...(existingTeachers || []).map(t => t.username.toLowerCase()),
    ]);

    const studentRows: any[] = [];
    const learningPathRows: any[] = [];
    const createdCreds: Array<{ studentName: string; username: string; password: string }> = [];
    const skippedList: string[] = [];

    for (const item of studentList) {
      const cleanUser = item.username.trim().toLowerCase();
      if (usedUsernames.has(cleanUser)) {
        skippedList.push(`${item.studentName} (${cleanUser}): ชื่อผู้ใช้นี้ซ้ำในระบบ`);
        continue;
      }
      usedUsernames.add(cleanUser);

      const studentUuid = crypto.randomUUID();
      const generatedStudentId = `EXT-${Math.floor(100000 + Math.random() * 900000)}`;

      studentRows.push({
        id: studentUuid,
        student_id: generatedStudentId,
        username: cleanUser,
        password: passwordHash,
        student_name: item.studentName.trim(),
        classroom_id: classroomId,
        academic_year: '2567',
        user_type: 'EXTERNAL',
        school_name: schoolName?.trim() || 'โรงเรียนเครือข่าย',
        grade_level: gradeLevel?.trim() || null,
        room_number: roomNumber?.trim() || null,
        is_active: true,
        is_verified: true,
      });

      learningPathRows.push({
        student_id: studentUuid,
        initial_rank: 1,
        current_rank: 1,
        current_stage: 1,
        total_stages: 100,
      });

      createdCreds.push({
        studentName: item.studentName.trim(),
        username: cleanUser,
        password: defaultPassword,
      });
    }

    if (studentRows.length === 0) {
      return NextResponse.json({
        error: 'ไม่สามารถสร้างบัญชีได้ เนื่องจากชื่อผู้ใช้ซ้ำทั้งหมด',
        skipped: skippedList,
      }, { status: 409 });
    }

    // Multi-row atomic insert into students
    const { error: studentInsertErr } = await supabaseAdmin
      .from('students')
      .insert(studentRows);

    if (studentInsertErr) {
      console.error('Batch insert students DB error:', studentInsertErr);
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลนักเรียน' }, { status: 500 });
    }

    // Multi-row atomic insert into learning_paths
    const { error: lpInsertErr } = await supabaseAdmin
      .from('learning_paths')
      .insert(learningPathRows);

    if (lpInsertErr) {
      console.error('Batch insert learning_paths DB error:', lpInsertErr);
    }

    return NextResponse.json({
      success: true,
      createdCount: studentRows.length,
      creds: createdCreds,
      skipped: skippedList,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network students batch POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
