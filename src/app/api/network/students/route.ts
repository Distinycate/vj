import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireNetworkTeacher } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const createStudentSchema = z.object({
  studentName: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล').max(100),
  username: z.string().min(3, 'Username ต้องมีอย่างน้อย 3 ตัวอักษร').max(50),
  password: z.string().min(4, 'Password ต้องมีอย่างน้อย 4 ตัวอักษร').max(100),
  classroomId: z.string().uuid('Invalid classroomId'),
  gradeLevel: z.string().max(20).optional(),
  roomNumber: z.string().max(20).optional(),
  schoolName: z.string().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireNetworkTeacher();

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    if (!classroomId) {
      return NextResponse.json({ error: 'Missing classroomId' }, { status: 400 });
    }

    // Ownership check: Verify classroom belongs to this teacher
    const { data: classroom } = await supabaseAdmin
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.teacher_id !== session.subjectId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this classroom' }, { status: 403 });
    }

    // Query students in this classroom with progression and tests
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        student_id,
        username,
        student_name,
        classroom_id,
        user_type,
        school_name,
        grade_level,
        room_number,
        is_active,
        created_at,
        learning_paths(current_stage, current_rank),
        pre_tests(score, total_questions, created_at),
        post_tests(score, total_questions, created_at),
        stage_results(stars)
      `)
      .eq('classroom_id', classroomId)
      .eq('user_type', 'EXTERNAL')
      .order('student_name', { ascending: true });

    if (error) throw error;

    // Process sanitized student records with stars and scores summary
    const sanitized = (students || []).map((s: any) => {
      const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
      const preList = s.pre_tests || [];
      const postList = s.post_tests || [];
      const latestPre = preList.length > 0 ? preList[preList.length - 1] : null;
      const latestPost = postList.length > 0 ? postList[postList.length - 1] : null;
      
      const totalStars = (s.stage_results || []).reduce((sum: number, r: any) => sum + (r.stars || 0), 0);

      return {
        id: s.id,
        student_id: s.student_id,
        username: s.username,
        student_name: s.student_name,
        classroom_id: s.classroom_id,
        user_type: s.user_type,
        school_name: s.school_name,
        grade_level: s.grade_level,
        room_number: s.room_number,
        is_active: s.is_active,
        created_at: s.created_at,
        current_stage: lp?.current_stage || 1,
        total_stars: totalStars,
        pre_test_score: latestPre ? `${latestPre.score}/${latestPre.total_questions}` : '-',
        post_test_score: latestPost ? `${latestPost.score}/${latestPost.total_questions}` : '-',
      };
    });

    return NextResponse.json({ success: true, students: sanitized });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network students GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireNetworkTeacher();

    const body = await request.json().catch(() => null);
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid student details', details: parsed.error.issues }, { status: 400 });
    }

    const { studentName, username, password, classroomId, gradeLevel, roomNumber, schoolName } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();

    // Ownership check: Verify classroom belongs to this teacher
    const { data: classroom } = await supabaseAdmin
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.teacher_id !== session.subjectId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this classroom' }, { status: 403 });
    }

    // Check duplicate username across students and teachers
    const [{ data: existingStudent }, { data: existingTeacher }] = await Promise.all([
      supabaseAdmin.from('students').select('id').ilike('username', cleanUsername).maybeSingle(),
      supabaseAdmin.from('teachers').select('id').ilike('username', cleanUsername).maybeSingle(),
    ]);

    if (existingStudent || existingTeacher) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น' }, { status: 409 });
    }

    // Hash password using standard bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const generatedStudentId = `EXT-${Math.floor(100000 + Math.random() * 900000)}`;

    // Insert student (FORCING user_type = 'EXTERNAL')
    const { data: newStudent, error: insertError } = await supabaseAdmin
      .from('students')
      .insert({
        student_id: generatedStudentId,
        username: cleanUsername,
        password: passwordHash,
        student_name: studentName.trim(),
        classroom_id: classroomId,
        academic_year: '2567',
        user_type: 'EXTERNAL', // Server strictly enforces EXTERNAL
        school_name: schoolName?.trim() || 'โรงเรียนเครือข่าย',
        grade_level: gradeLevel?.trim() || null,
        room_number: roomNumber?.trim() || null,
        is_active: true,
        is_verified: true,
      })
      .select('id, student_id, username, student_name, classroom_id, user_type, school_name, created_at')
      .single();

    if (insertError) {
      console.error('Create student DB error:', insertError);
      return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }

    // Initialize learning path
    await supabaseAdmin
      .from('learning_paths')
      .insert({
        student_id: newStudent.id,
        initial_rank: 1,
        current_rank: 1,
        current_stage: 1,
        total_stages: 100,
      });

    return NextResponse.json({
      success: true,
      student: newStudent,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network students POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
