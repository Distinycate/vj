import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import {
  calculatePuzzleStars,
  PUZZLE_MISSION_LEVEL,
  PUZZLE_TOTAL_STAGES,
  PUZZLE_REWARD_COINS,
  PUZZLE_REWARD_EXP,
} from '@/lib/puzzle/puzzleEngine';
import { getStagePuzzle } from '@/data/puzzles/stagePuzzlesData';

const completePuzzleSchema = z.object({
  stageNumber: z.number().int().min(1).max(PUZZLE_TOTAL_STAGES),
  hintsUsed: z.number().int().min(0).optional().default(0),
  durationSeconds: z.number().int().min(0).optional().default(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const rawBody = await request.json().catch(() => null);
    const parsed = completePuzzleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { stageNumber, hintsUsed, durationSeconds } = parsed.data;

    // Verify stage exists in dataset
    const puzzle = getStagePuzzle(stageNumber);
    if (!puzzle) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลด่านนี้' }, { status: 404 });
    }

    // Verify sequential unlock permission
    if (stageNumber > 1) {
      const { data: prevAttempt } = await supabaseAdmin
        .from('stage_attempts')
        .select('id')
        .eq('student_id', session.subjectId)
        .eq('stage_number', stageNumber - 1)
        .eq('mission_level', PUZZLE_MISSION_LEVEL)
        .eq('status', 'COMPLETED')
        .limit(1)
        .maybeSingle();

      if (!prevAttempt) {
        return NextResponse.json(
          { error: `คุณต้องผ่านด่าน ${stageNumber - 1} ก่อนจึงจะปลดล็อกด่าน ${stageNumber} ได้` },
          { status: 403 }
        );
      }
    }

    // Check if first time clearing this stage
    const { data: existingClears } = await supabaseAdmin
      .from('stage_attempts')
      .select('id, stars')
      .eq('student_id', session.subjectId)
      .eq('stage_number', stageNumber)
      .eq('mission_level', PUZZLE_MISSION_LEVEL)
      .eq('status', 'COMPLETED')
      .limit(1)
      .maybeSingle();

    const isFirstClear = !existingClears;
    const stars = calculatePuzzleStars(hintsUsed);
    const earnedCoins = isFirstClear ? PUZZLE_REWARD_COINS : 5;
    const earnedExp = isFirstClear ? PUZZLE_REWARD_EXP : 10;

    // Record stage attempt
    await supabaseAdmin.from('stage_attempts').insert({
      student_id: session.subjectId,
      stage_number: stageNumber,
      mission_level: PUZZLE_MISSION_LEVEL,
      status: 'COMPLETED',
      score: puzzle.words.length,
      accuracy: 100,
      stars,
      hint_count: hintsUsed,
      coins_awarded: earnedCoins,
      exp_awarded: earnedExp,
      completed_at: new Date().toISOString(),
    });

    // Update student learning_paths balance
    const { data: pathRow } = await supabaseAdmin
      .from('learning_paths')
      .select('coins, exp, total_exp')
      .eq('student_id', session.subjectId)
      .maybeSingle();

    if (pathRow) {
      await supabaseAdmin
        .from('learning_paths')
        .update({
          coins: Number(pathRow.coins || 0) + earnedCoins,
          exp: Number(pathRow.exp || 0) + earnedExp,
          total_exp: Number(pathRow.total_exp || 0) + earnedExp,
          last_active_date: new Date().toISOString(),
        })
        .eq('student_id', session.subjectId);
    }

    const nextStage = Math.min(PUZZLE_TOTAL_STAGES, stageNumber + 1);

    return NextResponse.json({
      success: true,
      stageNumber,
      stars,
      hintsUsed,
      earnedCoins,
      earnedExp,
      isFirstClear,
      nextStage,
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (err?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Puzzle complete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

