import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { normalizeAnswer, parseAcceptableAnswers } from '@/lib/quizUtils';

/**
 * POST /api/game/complete
 * Phase 3.2F — V3 Stage Completion
 *
 * Security boundary:
 *   Browser → Next.js API route (session-validated) → supabaseAdmin (service_role) → V3 RPC
 *   Client supplies ONLY: attemptId + raw answers + response times.
 *   Server evaluates correctness server-side using authoritative question_ids from DB.
 *   V3 RPC receives only the trusted server-evaluated wordAttempts payload.
 *
 * Privileged fields that the client must NEVER supply:
 *   student_id, accuracy, score, correctCount, passed, earnedCoins, earnedExp,
 *   rewardMultiplier, usedHints (now DB-authoritative via attempt_hint_events)
 *
 * Fallback policy:
 *   complete_stage_with_progression_v3 → primary (V3 contract)
 *   complete_stage_with_mastery_v2     → fallback ONLY when V3 function is absent
 *                                        (PostgreSQL error code 42883 = undefined_function)
 *   Any other V3 error → FAIL CLOSED (no fallback, no silent bypass)
 *
 * When Production migration is confirmed deployed, the V2 fallback must be removed.
 */

// Schema strictly accepts only student's answers and attempt ID.
// usedHints removed — it is now DB-authoritative from attempt_hint_events.
const completeGameSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(
    z.object({
      wordId: z.string(),
      answer: z.string(),
      responseTime: z.number().optional().default(0),
    })
  ),
});

/** PostgreSQL error code for "function does not exist". */
const PG_UNDEFINED_FUNCTION = '42883';

/**
 * Returns true ONLY when the V3 top-level function itself is absent from the DB.
 * Both conditions must be true:
 *   1. PostgreSQL error code is 42883 (undefined_function)
 *   2. The error message names 'complete_stage_with_progression_v3' specifically
 *
 * Why both conditions are required:
 *   A bare code-42883 check is insufficient. If a dependency called INSIDE the V3 function
 *   (e.g., record_word_attempt_v2) is missing, PostgreSQL also returns 42883. Falling back
 *   to V2 in that case would silently hide a migration defect rather than surfacing the error.
 *   Only the case where complete_stage_with_progression_v3 itself is not found authorizes fallback.
 */
function isV3FunctionAbsent(error: any): boolean {
  const code: string = error?.code ?? '';
  const msg: string = error?.message ?? '';
  const hint: string = error?.hint ?? '';
  const details: string = error?.details ?? '';

  const is42883 = code === PG_UNDEFINED_FUNCTION;
  const mentionsV3 =
    msg.includes('complete_stage_with_progression_v3') ||
    hint.includes('complete_stage_with_progression_v3') ||
    details.includes('complete_stage_with_progression_v3');

  return is42883 && mentionsV3;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const rawBody = await request.json().catch(() => null);

    // Explicitly reject any attempt to forge privileged fields
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
      'usedHints',   // Phase 3.2F: removed from client contract; DB-authoritative
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

    const { attemptId, answers } = parsed.data;

    // ── Load attempt and verify ownership (IDOR/BOLA prevention) ────────────
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('stage_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Stage attempt not found' }, { status: 404 });
    }

    if (attempt.student_id !== session.subjectId) {
      return NextResponse.json(
        { error: 'Forbidden: Attempt belongs to another student' },
        { status: 403 }
      );
    }

    // ── Idempotency: already completed ──────────────────────────────────────
    if (attempt.status === 'COMPLETED') {
      const { data: pathData } = await supabaseAdmin
        .from('learning_paths')
        .select('coins, total_exp, current_stage, campaign_completed_at')
        .eq('student_id', session.subjectId)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        passed: (attempt.accuracy || 0) >= 60,
        score: attempt.score,
        accuracy: attempt.accuracy,
        stars: attempt.stars ?? 0,
        earnedCoins: attempt.coins_awarded || 0,
        earnedExp: attempt.exp_awarded || 0,
        currentStage: pathData?.current_stage || attempt.stage_number,
        campaignCompleted: pathData?.campaign_completed_at != null,
      });
    }

    // ── Verify not expired ───────────────────────────────────────────────────
    if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
      await supabaseAdmin
        .from('stage_attempts')
        .update({ status: 'EXPIRED' })
        .eq('id', attemptId);
      return NextResponse.json({ error: 'Stage attempt has expired' }, { status: 410 });
    }

    // ── Authoritative server-side scoring ────────────────────────────────────
    // Correctness is derived from authoritative question_ids stored in the DB at /start time.
    // Client answers are looked up against the server-held correct_answer per question.
    const originalQuestions: any[] = Array.isArray(attempt.question_ids)
      ? attempt.question_ids
      : [];

    const answerMap = new Map<string, string>();
    const responseTimeMap = new Map<string, number>();
    const responseTimeList: number[] = [];

    for (const ans of answers) {
      answerMap.set(ans.wordId, ans.answer);
      if (typeof ans.responseTime === 'number' && ans.responseTime > 0) {
        responseTimeMap.set(ans.wordId, ans.responseTime);
        responseTimeList.push(ans.responseTime);
      }
    }

    const wordAttempts: Array<{
      word_id: string;
      is_correct: boolean;
      response_time_ms: number;
    }> = [];

    for (const q of originalQuestions) {
      const qKey = q.id || q.word_id;
      const submitted = answerMap.get(q.id) ?? (q.word_id ? answerMap.get(q.word_id) : '') ?? '';
      // Clamp response time: mirrors V3 SQL GREATEST(300, LEAST(60000, ...))
      const rawTime = responseTimeMap.get(q.id) ?? (q.word_id ? responseTimeMap.get(q.word_id) : 1500) ?? 1500;
      const clampedTime = Math.max(300, Math.min(60000, rawTime));

      const normSub = normalizeAnswer(submitted);
      const normCorrect = normalizeAnswer(q.correct_answer || '');
      const normWord = normalizeAnswer(q.word || '');
      const normMeaning = normalizeAnswer(q.meaning_th || q.meaning || '');
      const normBlank = normalizeAnswer(q.blank_answer || '');

      const acceptable = [
        ...parseAcceptableAnswers(q.correct_answer),
        ...parseAcceptableAnswers(q.word),
        ...parseAcceptableAnswers(q.blank_answer),
        ...parseAcceptableAnswers(q.meaning_th || q.meaning),
      ].filter(Boolean);

      // Check if submitted text matches a correct choice from choices array
      const matchingChoice = Array.isArray(q.choices)
        ? q.choices.find((c: any) => c && normalizeAnswer(c.text) === normSub)
        : null;
      const isChoiceCorrect = matchingChoice
        ? (matchingChoice.is_correct === true || matchingChoice.word_id === q.id || matchingChoice.word_id === q.correct_word_id)
        : false;

      const isCorrect = Boolean(normSub) && (
        acceptable.includes(normSub) ||
        normSub === normCorrect ||
        normSub === normWord ||
        normSub === normMeaning ||
        (Boolean(normBlank) && normSub === normBlank) ||
        isChoiceCorrect
      );

      wordAttempts.push({
        word_id: qKey,
        is_correct: isCorrect,
        response_time_ms: clampedTime,
      });
    }

    // ── Call V3 RPC (primary) ────────────────────────────────────────────────
    // The V3 RPC receives:
    //   - p_attempt_id: the authoritative attempt identity
    //   - p_student_id: session-bound (cannot be forged)
    //   - p_word_attempts: server-evaluated correctness + clamped response times
    //   - p_now: server timestamp
    //
    // The RPC derives internally (never trusts caller for):
    //   - stage_number, stage_type, accuracy, score, passed
    //   - hint_count (from attempt_hint_events ledger)
    //   - stars, trusted_performance_tier, primary_reason, bonus_flags
    //   - economy rewards
    const { data: v3Data, error: v3Err } = await supabaseAdmin.rpc(
      'complete_stage_with_progression_v3',
      {
        p_attempt_id: attempt.id,
        p_student_id: session.subjectId,
        p_word_attempts: wordAttempts,
        p_now: new Date().toISOString(),
      }
    );

    if (!v3Err) {
      // ── V3 success path ────────────────────────────────────────────────────
      return NextResponse.json({
        success: true,
        passed: v3Data.passed,
        score: v3Data.score,
        accuracy: v3Data.accuracy,
        stars: v3Data.earned_stars ?? 0,
        earnedCoins: v3Data.earned_coins ?? 0,
        earnedExp: v3Data.earned_exp ?? 0,
        newCoins: v3Data.new_coins,
        newTotalExp: v3Data.new_total_exp,
        currentStage: v3Data.current_stage,
        primaryReason: v3Data.primary_reason,
        bonusFlags: v3Data.bonus_flags ?? [],
        bossDefeated: v3Data.boss_defeated ?? false,
        bossDamage: v3Data.boss_damage ?? 0,
        bossRemainingHp: v3Data.boss_remaining_hp ?? 100,
        campaignCompleted: v3Data.campaign_completed ?? false,
      });
    }

    // ── V3 failure handling ──────────────────────────────────────────────────
    // FAIL CLOSED for all errors EXCEPT the specific case where V3 function
    // does not exist (pre-migration environment).
    if (!isV3FunctionAbsent(v3Err)) {
      // V3 is installed but returned a runtime error (constraint violation, atomicity
      // failure, security issue, logic bug, etc.). Do NOT fall through to V2.
      // Falling through would silently bypass V3 guarantees.
      console.error('complete_stage_with_progression_v3 runtime error:', v3Err);
      return NextResponse.json(
        { error: 'Failed to record stage completion' },
        { status: 500 }
      );
    }

    // ── V2 Fallback (pre-migration environments only) ────────────────────────
    // This path is ONLY reached when V3 function does not exist in the DB.
    // TODO: REMOVE THIS FALLBACK after Production migration (C1–C6 gates pass).
    console.warn(
      '[Phase 3.2F] complete_stage_with_progression_v3 not found — falling back to V2. ' +
      'This means MIGRATION_GAME_PROGRESSION_V3.sql has not been applied to this environment.'
    );

    const correctCount = wordAttempts.filter(w => w.is_correct).length;
    const totalQuestions = originalQuestions.length || 1;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const passed = accuracy >= 60;
    const avgResponseTime =
      responseTimeList.length > 0
        ? Math.round(responseTimeList.reduce((a, b) => a + b, 0) / responseTimeList.length)
        : 1500;

    const wrongWordIds = wordAttempts.filter(w => !w.is_correct).map(w => w.word_id);
    const correctWordIds = wordAttempts.filter(w => w.is_correct).map(w => w.word_id);

    const { data: v2Data, error: v2Err } = await supabaseAdmin.rpc(
      'complete_stage_with_mastery_v2',
      {
        p_attempt_id: attempt.id,
        p_student_id: session.subjectId,
        p_stage_number: attempt.stage_number,
        p_score: correctCount,
        p_total_questions: totalQuestions,
        p_accuracy: accuracy,
        p_passed: passed,
        p_used_hints: attempt.hint_count ?? 0, // use DB ledger value if available
        p_response_time_avg: avgResponseTime,
        p_mission_level: attempt.mission_level || 1,
        p_wrong_word_ids: wrongWordIds,
        p_correct_word_ids: correctWordIds,
        p_word_attempts: wordAttempts,
      }
    );

    if (v2Err) {
      console.error('complete_stage_with_mastery_v2 fallback error:', v2Err);
      return NextResponse.json({ error: 'Failed to record stage completion' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      passed,
      score: correctCount,
      accuracy,
      stars: 0, // V2 does not compute stars in V3 format
      earnedCoins: v2Data.earned_coins || 0,
      earnedExp: v2Data.earned_exp || 0,
      newCoins: v2Data.new_coins,
      newTotalExp: v2Data.new_total_exp,
      currentStage: v2Data.current_stage,
      primaryReason: null,
      bonusFlags: [],
      bossDefeated: false,
      bossDamage: 0,
      bossRemainingHp: 100,
      campaignCompleted: false,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Complete game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
