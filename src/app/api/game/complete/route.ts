import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { normalizeAnswer } from '@/lib/quizUtils';

// Schema strictly accepts only student's answers and attempt ID
// Privileged fields are disallowed
const completeGameSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(
    z.object({
      wordId: z.string(),
      answer: z.string(),
      responseTime: z.number().optional().default(0),
    })
  ),
  usedHints: z.number().int().min(0).optional().default(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const rawBody = await request.json().catch(() => null);

    // Explicitly reject if client attempts to forge privileged fields
    const forbiddenFields = [
      'student_id',
      'studentId',
      'earnedCoins',
      'earnedExp',
      'passed',
      'accuracy',
      'rawScore',
      'correctCount',
      'rewardMultiplier',
    ];
    for (const field of forbiddenFields) {
      if (rawBody && field in rawBody) {
        return NextResponse.json(
          { error: `Forbidden field '${field}' provided in request.` },
          { status: 400 }
        );
      }
    }

    const parsed = completeGameSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid game completion payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { attemptId, answers, usedHints } = parsed.data;

    // Load attempt and verify ownership
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('stage_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Stage attempt not found' }, { status: 404 });
    }

    // IDOR / BOLA Prevention: Verify ownership
    if (attempt.student_id !== session.subjectId) {
      return NextResponse.json(
        { error: 'Forbidden: Attempt belongs to another student' },
        { status: 403 }
      );
    }

    // Idempotency check: If already completed, return cached result
    if (attempt.status === 'COMPLETED') {
      const { data: path } = await supabaseAdmin
        .from('learning_paths')
        .select('coins, total_exp, current_stage')
        .eq('student_id', session.subjectId)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        passed: (attempt.accuracy || 0) >= 60,
        score: attempt.score,
        accuracy: attempt.accuracy,
        earnedCoins: attempt.coins_awarded || 0,
        earnedExp: attempt.exp_awarded || 0,
        currentStage: path?.current_stage || attempt.stage_number,
      });
    }

    // Verify not expired
    if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
      await supabaseAdmin
        .from('stage_attempts')
        .update({ status: 'EXPIRED' })
        .eq('id', attemptId);
      return NextResponse.json({ error: 'Stage attempt has expired' }, { status: 410 });
    }

    // Authoritative Server-Side Scoring
    const originalQuestions: any[] = Array.isArray(attempt.question_ids)
      ? attempt.question_ids
      : [];

    const answerMap = new Map<string, string>();
    const responseTimeMap = new Map<string, number>();
    const responseTimeList: number[] = [];

    for (const ans of answers) {
      answerMap.set(ans.wordId, ans.answer);
      if (typeof ans.responseTime === 'number') {
        responseTimeMap.set(ans.wordId, ans.responseTime);
        responseTimeList.push(ans.responseTime);
      }
    }

    let correctCount = 0;
    const wrongWordIds: string[] = [];
    const correctWordIds: string[] = [];
    const wordAttempts: Array<{ word_id: string; is_correct: boolean; response_time_ms: number }> = [];

    for (const q of originalQuestions) {
      const submitted = answerMap.get(q.id) || '';
      const responseTime = responseTimeMap.get(q.id) || 1500;
      const isCorrect =
        normalizeAnswer(submitted) === normalizeAnswer(q.correct_answer || '');

      wordAttempts.push({
        word_id: q.id,
        is_correct: isCorrect,
        response_time_ms: responseTime,
      });

      if (isCorrect) {
        correctCount += 1;
        correctWordIds.push(q.id);
      } else {
        wrongWordIds.push(q.id);
      }
    }

    const totalQuestions = originalQuestions.length || 1;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const passed = accuracy >= 60;
    const avgResponseTime =
      responseTimeList.length > 0
        ? Math.round(responseTimeList.reduce((a, b) => a + b, 0) / responseTimeList.length)
        : 10;

    // Call atomic RPC: complete_stage_with_mastery_v2 (Type A: Single Atomic Transaction)
    // Bundles stage_attempt + economy_transactions + user_review_words + word_attempt_history
    let txResult: any = null;
    const { data: unifiedData, error: unifiedErr } = await supabaseAdmin.rpc(
      'complete_stage_with_mastery_v2',
      {
        p_attempt_id: attempt.id,
        p_student_id: session.subjectId,
        p_stage_number: attempt.stage_number,
        p_score: correctCount,
        p_total_questions: totalQuestions,
        p_accuracy: accuracy,
        p_passed: passed,
        p_used_hints: usedHints,
        p_response_time_avg: avgResponseTime,
        p_mission_level: attempt.mission_level || 1,
        p_wrong_word_ids: wrongWordIds,
        p_correct_word_ids: correctWordIds,
        p_word_attempts: wordAttempts,
      }
    );

    if (unifiedErr) {
      // Graceful fallback for pre-migration environments
      console.warn('complete_stage_with_mastery_v2 pending migration, falling back:', unifiedErr.message);
      const { data: legacyData, error: legacyErr } = await supabaseAdmin.rpc(
        'complete_stage_transaction',
        {
          p_attempt_id: attempt.id,
          p_student_id: session.subjectId,
          p_stage_number: attempt.stage_number,
          p_score: correctCount,
          p_total_questions: totalQuestions,
          p_accuracy: accuracy,
          p_passed: passed,
          p_used_hints: usedHints,
          p_response_time_avg: avgResponseTime,
          p_mission_level: attempt.mission_level || 1,
          p_wrong_word_ids: wrongWordIds,
          p_correct_word_ids: correctWordIds,
        }
      );

      if (legacyErr) {
        console.error('complete_stage_transaction fallback RPC error:', legacyErr);
        return NextResponse.json({ error: 'Failed to record stage completion' }, { status: 500 });
      }
      txResult = legacyData;

      if (wordAttempts.length > 0) {
        try {
          await supabaseAdmin.rpc('record_word_attempts_batch_v2', {
            p_student_id: session.subjectId,
            p_stage_attempt_id: attempt.id,
            p_attempts: wordAttempts,
          });
        } catch (err) {
          console.warn('[Mastery V2] Deferred telemetry batch:', err);
        }
      }
    } else {
      txResult = unifiedData;
    }

    return NextResponse.json({
      success: true,
      passed,
      score: correctCount,
      accuracy,
      earnedCoins: txResult.earned_coins || 0,
      earnedExp: txResult.earned_exp || 0,
      newCoins: txResult.new_coins,
      newTotalExp: txResult.new_total_exp,
      currentStage: txResult.current_stage,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Complete game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
