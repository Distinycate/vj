import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { ALL_WORKSHEETS } from '@/data/worksheets/index';

function cleanClassroomLabel(gradeLevel?: string | null, roomNumber?: string | null): string {
  if (!gradeLevel && !roomNumber) return 'ม.1/1';
  const cleanGrade = String(gradeLevel || '1').replace(/^ม\.?/, '').trim();
  const cleanRoom = String(roomNumber || '1').trim();
  return `ม.${cleanGrade}/${cleanRoom}`;
}

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT', 'TEACHER', 'ADMIN']);

    let studentClassroom = 'ม.1/1';
    const isTeacherOrAdmin = session.role === 'ADMIN' || session.role === 'TEACHER';

    if (!isTeacherOrAdmin) {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('grade_level, room_number')
        .eq('id', session.subjectId)
        .maybeSingle();

      if (student) {
        studentClassroom = cleanClassroomLabel(student.grade_level, student.room_number);
      }
    }

    // Fetch unlock settings from events table
    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'a2-oxford-worksheets')
      .maybeSingle();

    const unlockedUnits: Record<string, { isOpen: boolean; allowedClassrooms: string[] }> =
      eventRow?.settings?.unlocked_units || {};

    // Compute access status for each unit
    const unitAccess: Record<string, { isOpen: boolean; isAllowed: boolean }> = {};

    for (const u of ALL_WORKSHEETS) {
      const cfg = unlockedUnits[u.unitId];
      // Default: If no custom teacher lock configured, Unit 1 & Unit 2 are open by default, or if isOpen is true
      const isOpen = cfg !== undefined ? Boolean(cfg.isOpen) : true;
      const allowedRooms = cfg?.allowedClassrooms || ['ALL'];
      const isAllowed =
        isTeacherOrAdmin ||
        (isOpen && (allowedRooms.includes('ALL') || allowedRooms.includes(studentClassroom)));

      unitAccess[u.unitId] = {
        isOpen,
        isAllowed,
      };
    }

    // Fetch student's past submissions
    const submissions: Record<
      string,
      { score: number; maxScore: number; stars: number; accuracy: number; completedAt: string }
    > = {};

    if (!isTeacherOrAdmin) {
      const { data: txs } = await supabaseAdmin
        .from('economy_transactions')
        .select('metadata, created_at')
        .eq('student_id', session.subjectId)
        .eq('source', 'worksheet_submission')
        .order('created_at', { ascending: false });

      for (const tx of txs || []) {
        const meta = tx.metadata || {};
        const uId = meta.unitId;
        if (uId && (!submissions[uId] || (meta.score ?? 0) > submissions[uId].score)) {
          submissions[uId] = {
            score: Number(meta.score || 0),
            maxScore: Number(meta.maxScore || 1),
            stars: Number(meta.stars || 0),
            accuracy: Number(meta.accuracy || 0),
            completedAt: tx.created_at,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      studentClassroom,
      unitAccess,
      submissions,
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (err?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Worksheets GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
