import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { assertSameOrigin } from '@/lib/server/security';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    if (session.user.userType !== 'INTERNAL') {
      return NextResponse.json({ error: 'เฉพาะนักเรียนในโรงเรียน' }, { status: 403 });
    }
    if (session.user.classroomId) {
      const { error } = await supabaseAdmin.rpc('ensure_student_team_memberships', { p_student_id: session.subjectId });
      if (error) throw error;
    }
    const { data, error } = await supabaseAdmin.from('team_members')
      .select('teams(id,team_name,team_icon,team_color,classroom_id,team_type,is_active)')
      .eq('user_id', session.subjectId).eq('is_active', true);
    if (error) throw error;
    const teams = (data ?? []).flatMap(member => member.teams ?? [])
      .filter(team => team.is_active && (team.team_type === 'school' || team.classroom_id === session.user.classroomId));
    return NextResponse.json({ teams }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูทีมนี้' }, { status });
    console.error('Student teams unavailable:', (error as { code?: string })?.code);
    return NextResponse.json({ error: 'โหลดทีมของนักเรียนไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 });
  }
}
