import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    await requireRole(['TEACHER', 'ADMIN', 'EXECUTIVE']);

    const [
      { count: totalStudents },
      { count: totalTeachers },
      { data: rawClassData },
    ] = await Promise.all([
      supabaseAdmin.from('students').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('teachers').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('classrooms')
        .select('*, students(id, student_name, classroom_id, user_type, is_active, learning_paths(coins, exp, total_exp, current_stage, last_active_date), analytics_summary(pretest_score, posttest_score, success_rate, normalized_gain, learning_gain))')
        .order('class_name', { ascending: true }),
    ]);

    const validClasses = (rawClassData || []).filter(
      (c) => c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3')
    );

    return NextResponse.json({
      success: true,
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      classroomsData: validClasses,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
