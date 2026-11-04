import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import snapshot from '../../../../../scripts/backup_term1_pilot_snapshot.json';

// The snapshot remains server-side: only the fields necessary for this report leave the server.
export async function GET() {
  try {
    await requireInternalTeacherRole(['ADMIN', 'TEACHER']);
    const valid = (test: { score: number; total_questions: number }) =>
      Number.isFinite(test.score) && Number.isFinite(test.total_questions) && test.total_questions > 0;
    const percent = (test: { score: number; total_questions: number }) => test.score / test.total_questions * 100;
    const report = snapshot.students.filter(s => s.user_type === 'INTERNAL').map(student => {
      const pre = snapshot.preTests.filter(t => t.student_id === student.id && valid(t)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
      const post = snapshot.postTests.filter(t => t.student_id === student.id && valid(t)).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const prePercent = pre.length ? pre.reduce((sum, test) => sum + percent(test), 0) / pre.length : null;
      const postPercent = post.length ? percent(post[0]) : null;
      const gain = prePercent !== null && postPercent !== null && prePercent < 100 ? (postPercent - prePercent) / (100 - prePercent) * 100 : null;
      return { id: student.id, studentCode: student.student_id, name: student.student_name, classroomId: student.classroom_id,
        grade: student.grade_level, room: student.room_number, prePercent, preCount: pre.length, postPercent, gain };
    });
    return NextResponse.json({ success: true, snapshotAt: snapshot.timestamp, students: report });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: error.status });
    console.error('Term one report:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดรายงานได้' }, { status: 500 });
  }
}
