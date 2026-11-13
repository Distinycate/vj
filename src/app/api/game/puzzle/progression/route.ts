import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { PUZZLE_MISSION_LEVEL, PUZZLE_TOTAL_STAGES } from '@/lib/puzzle/puzzleEngine';

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const { data: attempts, error } = await supabaseAdmin
      .from('stage_attempts')
      .select('stage_number, stars, score, completed_at')
      .eq('student_id', session.subjectId)
      .eq('mission_level', PUZZLE_MISSION_LEVEL)
      .eq('status', 'COMPLETED')
      .order('stage_number', { ascending: true });

    if (error) {
      console.error('Error fetching puzzle progression:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const stageStars: Record<number, number> = {};
    let highestCompleted = 0;
    let totalStars = 0;

    for (const a of attempts || []) {
      const sn = Number(a.stage_number);
      const st = Math.max(0, Math.min(3, Number(a.stars || 1)));
      if (!stageStars[sn] || st > stageStars[sn]) {
        stageStars[sn] = st;
      }
      if (sn > highestCompleted) {
        highestCompleted = sn;
      }
    }

    for (const stars of Object.values(stageStars)) {
      totalStars += stars;
    }

    // Unlocked stage is max completed + 1, min 1, max 100
    const unlockedStage = Math.min(PUZZLE_TOTAL_STAGES, highestCompleted + 1);

    return NextResponse.json({
      success: true,
      unlockedStage,
      highestCompleted,
      totalStars,
      completedCount: Object.keys(stageStars).length,
      stageStars,
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (err?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Puzzle progression error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

