import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { summarizePretests, type AssessmentRecord } from '@/lib/assessmentState';
import { calculateNormalizedGain } from '@/utils/analyticsUtils';

function summarize(pre: AssessmentRecord[], post: AssessmentRecord[]) {
  const baseline = summarizePretests(pre);
  const latest = [...post].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const postScore = latest?.total_questions > 0 ? latest.score / latest.total_questions * 25 : null;
  return { count: baseline.count, preScore: baseline.score, postScore,
    gain: baseline.score !== null && postScore !== null ? calculateNormalizedGain(baseline.score, postScore, 25) : null };
}

export async function GET() {
  try {
    await requireInternalTeacherRole(['ADMIN', 'TEACHER', 'EXECUTIVE']);
    const { data, error } = await supabaseAdmin.from('learning_campaign_archives')
      .select('student_id, captured_at, learning_path, pre_tests, post_tests, students(student_name, classroom_id, classrooms(class_name))')
      .eq('campaign_key', '2569-T2-restart-1').order('student_id');
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || /learning_campaign_archives/.test(error.message)) {
        return NextResponse.json({ students: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }
    if (!data?.length) return NextResponse.json({ students: [] });
    const ids = data.map(row => row.student_id);
    const [paths, pre, post] = await Promise.all([
      supabaseAdmin.from('learning_paths').select('student_id, current_stage').in('student_id', ids),
      supabaseAdmin.from('pre_tests').select('student_id, score, total_questions, created_at').in('student_id', ids),
      supabaseAdmin.from('post_tests').select('student_id, score, total_questions, created_at').in('student_id', ids),
    ]);
    if (paths.error) throw paths.error;
    if (pre.error) throw pre.error;
    if (post.error) throw post.error;
    // Only whitelisted report fields leave the server, never raw archived learning paths.
    const students = data.map((row: any) => {
      const student = Array.isArray(row.students) ? row.students[0] : row.students;
      const classroom = Array.isArray(student?.classrooms) ? student.classrooms[0] : student?.classrooms;
      return { id: row.student_id, name: student?.student_name || 'ไม่ระบุชื่อ',
        classroom: classroom?.class_name || 'ไม่ระบุห้อง', capturedAt: row.captured_at,
        before: { ...summarize(row.pre_tests || [], row.post_tests || []), stage: row.learning_path.current_stage },
        current: { ...summarize((pre.data || []).filter(test => test.student_id === row.student_id), (post.data || []).filter(test => test.student_id === row.student_id)),
          stage: paths.data?.find(path => path.student_id === row.student_id)?.current_stage ?? null } };
    });
    return NextResponse.json({ students }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const status = error?.status === 401 || error?.status === 403 ? error.status : 500;
    console.error('Campaign archive:', error);
    return NextResponse.json({ error: 'โหลดประวัติรอบการเรียนไม่สำเร็จ กรุณาตรวจ migration หรือลองใหม่' }, { status });
  }
}
