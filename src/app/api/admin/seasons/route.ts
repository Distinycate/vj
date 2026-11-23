import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { z } from 'zod';

const seasonAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), seasonName: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal('close_and_reward'), seasonId: z.uuid() }),
]);

export async function GET(request: Request) {
  try {
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE']);
    const { data: seasons, error } = await supabaseAdmin
      .from('team_battle_seasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, seasons: seasons || [] });
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
    if (action.action === 'create') {
      const { data, error } = await supabaseAdmin.rpc('open_school_team_season_v2', { p_name: action.seasonName });
      if (error) throw error;
      return NextResponse.json({ success: true, season: data });
    }
    const { data, error } = await supabaseAdmin.rpc('close_team_season_v2', {
      p_season_id: action.seasonId, p_actor_id: session.subjectId,
    });
    if (error?.message.includes('SEASON_NOT_FOUND')) return NextResponse.json({ error: 'ไม่พบฤดูกาล' }, { status: 404 });
    if (error?.message.includes('NO_ELIGIBLE_TEAMS')) return NextResponse.json({ error: 'ไม่พบทีมที่เข้าเกณฑ์' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'เฉพาะแอดมินจัดการฤดูกาลได้' }, { status: error.status });
    console.error('Atomic Team Battle action failed:', error?.code);
    return NextResponse.json({ error: 'ทำรายการไม่สำเร็จ ระบบไม่เปลี่ยนฤดูกาลหรือแจกของบางส่วน' }, { status: 503 });
  }
}
