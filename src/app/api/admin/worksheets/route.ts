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
    await requireRole(['ADMIN', 'TEACHER']);

    // 1. Fetch internal students
    const { data: students, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id, student_id, student_name, grade_level, room_number')
      .eq('user_type', 'INTERNAL')
      .order('student_id', { ascending: true });

    if (sErr) {
      console.error('Failed to fetch students for worksheet admin:', sErr);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // 2. Fetch worksheet unlock settings from events
    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'a2-oxford-worksheets')
      .maybeSingle();

    const unlockedUnits: Record<string, { isOpen: boolean; allowedClassrooms: string[] }> =
      eventRow?.settings?.unlocked_units || {};

    // 3. Fetch all worksheet submissions from economy_transactions
    const { data: txs } = await supabaseAdmin
      .from('economy_transactions')
      .select('student_id, metadata, created_at')
      .eq('source', 'worksheet_submission')
      .order('created_at', { ascending: false });

    // Map submissions by studentId -> unitId -> submission
    const studentSubmissions: Record<
      string,
      Record<string, { score: number; maxScore: number; stars: number; accuracy: number; completedAt: string }>
    > = {};

    for (const tx of txs || []) {
      const meta = tx.metadata || {};
      const sId = tx.student_id;
      const uId = meta.unitId;
      if (!sId || !uId) continue;

      if (!studentSubmissions[sId]) studentSubmissions[sId] = {};
      if (!studentSubmissions[sId][uId] || (meta.score ?? 0) > studentSubmissions[sId][uId].score) {
        studentSubmissions[sId][uId] = {
          score: Number(meta.score || 0),
          maxScore: Number(meta.maxScore || 1),
          stars: Number(meta.stars || 0),
          accuracy: Number(meta.accuracy || 0),
          completedAt: tx.created_at,
        };
      }
    }

    const classroomsSet = new Set<string>();
    const studentList = (students || []).map((s) => {
      const classroom = cleanClassroomLabel(s.grade_level, s.room_number);
      classroomsSet.add(classroom);
      return {
        id: s.id,
        studentId: s.student_id,
        studentName: s.student_name,
        classroom,
        submissions: studentSubmissions[s.id] || {},
      };
    });

    return NextResponse.json({
      success: true,
      units: ALL_WORKSHEETS.map((u) => ({
        unitId: u.unitId,
        grade: u.grade,
        unitNumber: u.unitNumber,
        title: u.title,
        type: u.type,
        questionCount: u.questions.length,
      })),
      unlockedUnits,
      classrooms: Array.from(classroomsSet).sort(),
      students: studentList,
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (err?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Worksheets admin GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireRole(['ADMIN', 'TEACHER']);

    const body = await request.json().catch(() => null);
    if (!body || (!body.unitId && !body.unitIds)) {
      return NextResponse.json({ error: 'Missing unitId or unitIds' }, { status: 400 });
    }

    const { unitId, unitIds, isOpen, allowedClassrooms } = body;
    const targetUnitIds: string[] = unitIds || (unitId ? [unitId] : []);
    const openStatus = Boolean(isOpen);
    const rooms = Array.isArray(allowedClassrooms) && allowedClassrooms.length > 0 ? allowedClassrooms : ['ALL'];

    // Get or create event row for a2-oxford-worksheets
    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('id, settings')
      .eq('slug', 'a2-oxford-worksheets')
      .maybeSingle();

    const currentSettings = eventRow?.settings || {};
    const unlockedUnits = { ...(currentSettings.unlocked_units || {}) };

    for (const id of targetUnitIds) {
      unlockedUnits[id] = {
        isOpen: openStatus,
        allowedClassrooms: rooms,
      };
    }

    const nextSettings = {
      ...currentSettings,
      unlocked_units: unlockedUnits,
    };

    if (eventRow) {
      await supabaseAdmin
        .from('events')
        .update({
          settings: nextSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventRow.id);
    } else {
      await supabaseAdmin.from('events').insert({
        slug: 'a2-oxford-worksheets',
        title: 'แบบฝึกหัดคำศัพท์ สพป. บุรีรัมย์ เขต 3 (A2 Oxford 3000)',
        description: 'ใบงานแบบฝึกหัดคำศัพท์ ม.1 - ม.3 สำหรับฝึกทักษะและเก็บคะแนน',
        event_type: 'worksheet',
        status: 'active',
        settings: nextSettings,
      });
    }

    return NextResponse.json({
      success: true,
      updatedCount: targetUnitIds.length,
      unlockedUnits,
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (err?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Worksheets admin POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

