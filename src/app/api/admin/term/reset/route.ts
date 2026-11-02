import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const session = await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'EXECUTIVE']);
    const teacherId = session.subjectId;

    const body = await request.json().catch(() => ({}));
    const seasonName = body.seasonName || 'ภาคเรียนที่ 2/2567 (Season 2)';

    // 1. Close all active team battle seasons
    await supabaseAdmin
      .from('team_battle_seasons')
      .update({ is_active: false, closed_at: new Date().toISOString() })
      .eq('is_active', true);

    // 2. Insert new active season
    const { data: newSeason, error: seasonErr } = await supabaseAdmin
      .from('team_battle_seasons')
      .insert({
        season_name: seasonName,
        scope: 'school',
        status: 'ACTIVE',
        is_active: true,
      })
      .select()
      .single();

    if (seasonErr) {
      console.error('Failed to create new team battle season:', seasonErr);
    }

    // 3. Reset learning_paths current_stage to 1 for all internal students (keep coins, exp, cards intact)
    const { error: lpErr } = await supabaseAdmin
      .from('learning_paths')
      .update({
        current_stage: 1,
        campaign_completed_at: null,
      })
      .neq('current_stage', 0); // targets all rows

    if (lpErr) {
      return NextResponse.json({ error: `รีเซ็ตด่านใน learning_paths ไม่สำเร็จ: ${lpErr.message}` }, { status: 500 });
    }

    // 4. Clear/Reset student_stage_progress so campaign progression begins fresh at stage 1
    // (Historical stage_results remain untouched as immutable historical log)
    const { error: progErr } = await supabaseAdmin
      .from('student_stage_progress')
      .delete()
      .neq('stage_number', 0);

    if (progErr) {
      console.warn('Notice: student_stage_progress clear warning:', progErr.message);
    }

    // 5. Reset pretest/posttest scores in analytics_summary for new term baseline (keep cards, coins, and total_time_on_task_sec intact)
    const { error: analyticsErr } = await supabaseAdmin
      .from('analytics_summary')
      .update({
        pretest_score: null,
        posttest_score: null,
        learning_gain: null,
        normalized_gain: null,
        last_updated_at: new Date().toISOString(),
      })
      .not('student_id', 'is', null);

    if (analyticsErr) {
      console.warn('Notice: analytics_summary reset warning:', analyticsErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'เริ่มต้นฤดูกาลใหม่เรียบร้อยแล้ว ทุกคนเริ่มต้นที่ด่าน 1 (เหรียญและการ์ดยังอยู่ครบ)',
      season: newSeason,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
