import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { z } from 'zod';

const seasonAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), seasonName: z.string().trim().min(1).max(100), classroomId: z.uuid().optional() }),
  z.object({ action: z.literal('preview_rewards'), seasonId: z.uuid() }),
  z.object({ action: z.literal('close_and_reward'), seasonId: z.uuid(), revision: z.string().regex(/^[a-f0-9]{32}$/) }),
  z.object({ action: z.literal('shuffle_teams'), confirmation: z.literal('SHUFFLE') }),
]);

export async function GET() {
  try {
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE']);
    const [seasons, classrooms] = await Promise.all([
      supabaseAdmin.from('team_battle_seasons')
        .select('id,season_name,scope,classroom_id,status,is_active,created_at')
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('classrooms').select('id,class_name').order('class_name'),
    ]);
    if (seasons.error || classrooms.error) throw seasons.error ?? classrooms.error;
    return NextResponse.json({ success: true, seasons: seasons.data, classrooms: classrooms.data });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireInternalTeacherRole(['ADMIN']);
    const parsed = seasonAction.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลฤดูกาลไม่ถูกต้อง' }, { status: 400 });
    const action = parsed.data;
    if (action.action === 'shuffle_teams') {
      const { data, error } = await supabaseAdmin.rpc('shuffle_teams_when_idle_v1');
      if (error?.message.includes('TEAM_SEASON_IN_PROGRESS')) {
        return NextResponse.json({ error: 'สุ่มทีมใหม่ไม่ได้ระหว่างมีฤดูกาลแข่งขัน' }, { status: 409 });
      }
      if (error) throw error;
      return NextResponse.json({ success: true, result: data });
    }
    if (action.action === 'create') {
      const { data, error } = action.classroomId
        ? await supabaseAdmin.rpc('open_classroom_team_season_v1', { p_name: action.seasonName, p_classroom_id: action.classroomId })
        : await supabaseAdmin.rpc('open_school_team_season_v2', { p_name: action.seasonName });
      if (error?.message.includes('ACTIVE_CLASSROOM_SEASON')) {
        return NextResponse.json({ error: 'ห้องนี้มีฤดูกาลอยู่แล้ว กรุณาปิดก่อนเปิดใหม่' }, { status: 409 });
      }
      if (error?.message.includes('INVALID_CLASSROOM')) return NextResponse.json({ error: 'ไม่พบห้องเรียน' }, { status: 404 });
      if (error) throw error;
      return NextResponse.json({ success: true, season: data });
    }

    const { data, error } = action.action === 'preview_rewards'
      ? await supabaseAdmin.rpc('team_reward_preview_v1', { p_season_id: action.seasonId })
      : await supabaseAdmin.rpc('close_team_season_v3', {
        p_season_id: action.seasonId, p_actor_id: session.subjectId, p_revision: action.revision,
      });
    if (error?.message.includes('SEASON_NOT_FOUND')) return NextResponse.json({ error: 'ไม่พบฤดูกาล' }, { status: 404 });
    if (error?.message.includes('STALE_TEAM_PREVIEW')) return NextResponse.json({ error: 'คะแนนหรือสมาชิกเปลี่ยน กรุณาดูผลล่าสุดแล้วกดยืนยันอีกครั้ง' }, { status: 409 });
    if (error?.message.includes('LEGACY_REWARD_REVIEW_REQUIRED')) return NextResponse.json({ error: 'พบประวัติการแจกในฤดูกาลนี้ ต้องตรวจยอดเดิมก่อนจ่ายเพิ่ม' }, { status: 409 });
    if (error?.message.includes('SEASON_NOT_ACTIVE')) return NextResponse.json({ error: 'ฤดูกาลนี้ไม่ได้เปิดอยู่' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'เฉพาะแอดมินจัดการฤดูกาลได้' }, { status: error.status });
    console.error('Atomic Team Battle action failed:', error?.code);
    return NextResponse.json({ error: 'ทำรายการไม่สำเร็จ ระบบไม่เปลี่ยนฤดูกาลหรือแจกของบางส่วน' }, { status: 503 });
  }
}
