import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

const leaderboardQuery = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('school') }),
  z.object({ scope: z.literal('classroom'), classroomId: z.uuid() }),
]);

export async function GET(request: Request) {
  try {
    const session = await requireRole(['STUDENT', 'ADMIN', 'TEACHER', 'EXECUTIVE']);
    const query = leaderboardQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return NextResponse.json({ error: 'กรุณาเลือกประเภทการแข่งขันหรือห้องเรียนให้ถูกต้อง' }, { status: 400 });

    const scope = query.data;
    if (session.subjectType === 'STUDENT' ?
      session.user.userType !== 'INTERNAL' ||
        (scope.scope === 'classroom' && session.user.classroomId !== scope.classroomId) :
      session.teacherType !== 'INTERNAL') {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูตารางคะแนนนี้' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.rpc('team_scope_leaderboard_v1', {
      p_scope: scope.scope,
      p_classroom_id: scope.scope === 'classroom' ? scope.classroomId : null,
    });
    if (error || !data) throw error ?? new Error('Missing leaderboard');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูตารางคะแนนนี้' }, { status });
    }
    console.error('Team leaderboard unavailable:', (error as { code?: string })?.code);
    return NextResponse.json({ error: 'โหลดตารางคะแนนไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 });
  }
}
