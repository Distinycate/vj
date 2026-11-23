import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { isConfiguredAnswerCorrect, normalizeAnswer, parseAcceptableAnswers } from '@/lib/quizUtils';
import { calculateRankFromStage, getPassScoreForStage } from '@/utils/adaptiveConfig';

/**
 * POST /api/game/complete
 * Phase 3.2F — V3 Stage Completion
 *
 * Security boundary:
 *   Browser → Next.js API route (session-validated) → supabaseAdmin (service_role) → V3 RPC
 *   Private attempts accept only the attempt ID; frozen answers are read in SQL.
 *   Legacy in-flight attempts retain their original answer format.
 *   V3 RPC receives only the trusted server-evaluated wordAttempts payload.
 *
 * Privileged fields that the client must NEVER supply:
 *   student_id, accuracy, score, correctCount, passed, earnedCoins, earnedExp,
 *   rewardMultiplier, usedHints (now DB-authoritative via attempt_hint_events)
 *
 * The V3 transaction must be installed before deployment. Never fall back to
 * separate writes for progress and economy.
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
  ).max(150).default([]),
});


/**
 * Record Team Battle score events when an internal student passes a stage.
 * Non-fatal so that issues with team season or scoring never block game progression.
 */
async function recordTeamScoreForCompletion(
  studentId: string,
  stageNumber: number,
  accuracy: number,
  attemptId: string
) {
  try {
    const isBoss = stageNumber % 10 === 0;
    const baseEventType = isBoss ? 'boss_completed' : 'stage_completed';
    const basePoints = isBoss ? 30 : 10;

    const { error: baseError } = await supabaseAdmin.rpc('record_team_score_event', {
      p_student_id: studentId,
      p_event_type: baseEventType,
      p_points: basePoints,
      p_metadata: { stageNumber, accuracy, attemptId },
    });
    if (baseError) throw baseError;

    let bonusEventType: string | null = null;
    let bonusPoints = 0;
    if (accuracy >= 100) {
      bonusEventType = 'perfect_bonus';
      bonusPoints = 25;
    } else if (accuracy >= 90) {
      bonusEventType = 'accuracy_bonus';
      bonusPoints = 15;
    } else if (accuracy >= 80) {
      bonusEventType = 'accuracy_bonus';
      bonusPoints = 10;
    } else if (accuracy >= 70) {
      bonusEventType = 'accuracy_bonus';
      bonusPoints = 5;
    }

    if (bonusEventType && bonusPoints > 0) {
      const { error: bonusError } = await supabaseAdmin.rpc('record_team_score_event', {
        p_student_id: studentId,
        p_event_type: bonusEventType,
        p_points: bonusPoints,
        p_metadata: { stageNumber, accuracy, attemptId },
      });
      if (bonusError) throw bonusError;
    }
  } catch (teamErr) {
    console.error('[TeamScore] Failed to record team score event:', teamErr);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    const isExternalStudent = session.user?.userType === 'EXTERNAL';

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
        .select('coins, total_exp, current_stage, current_rank, campaign_completed_at')
        .eq('student_id', session.subjectId)
        .maybeSingle();

      const requiredPassScore = getPassScoreForStage(attempt.stage_number);
      const isPassed = (attempt.accuracy || 0) >= requiredPassScore && (attempt.score || 0) > 0;
      const effectiveRank = pathData?.current_rank || calculateRankFromStage(pathData?.current_stage || attempt.stage_number);

      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        passed: isPassed,
        score: attempt.score,
        accuracy: attempt.accuracy,
        stars: attempt.stars ?? 0,
        earnedCoins: isExternalStudent ? 0 : (attempt.coins_awarded || 0),
        earnedExp: isExternalStudent ? 0 : (attempt.exp_awarded || 0),
        currentStage: pathData?.current_stage || attempt.stage_number,
        currentRank: effectiveRank,
        campaignCompleted: pathData?.campaign_completed_at != null,
      });
    }

    // ── Verify not expired ───────────────────────────────────────────────────
    if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
      await supabaseAdmin
        .from('stage_attempts')
        .update({ status: 'EXPIRED' })
        .eq('id', attemptId).eq('status','ACTIVE');
      return NextResponse.json({ error: 'Stage attempt has expired' }, { status: 410 });
    }

    // ── Authoritative server-side scoring ────────────────────────────────────
    // Correctness is derived from authoritative question_ids stored in the DB at /start time.
    // Client answers are looked up against the server-held correct_answer per question.
    const originalQuestions: any[] = Array.isArray(attempt.question_ids)
      ? attempt.question_ids
      : [];
    const privateProtocol = typeof originalQuestions[0]?.public_id === 'string';

    const answerMap = new Map<string, string>();
    const responseTimeMap = new Map<string, number>();

    for (const ans of answers) {
      answerMap.set(ans.wordId, ans.answer);
      if (typeof ans.responseTime === 'number' && ans.responseTime > 0) {
        responseTimeMap.set(ans.wordId, ans.responseTime);
      }
    }

    const wordAttempts: Array<{
      word_id: string;
      is_correct: boolean;
      response_time_ms: number;
    }> = [];

    for (const q of privateProtocol ? [] : originalQuestions) {
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

      const isCorrect = q.answer_language ? isConfiguredAnswerCorrect(q, submitted) : Boolean(normSub) && (
        acceptable.includes(normSub) ||
        (Boolean(normCorrect) && normSub === normCorrect) ||
        (Boolean(normWord) && normSub === normWord) ||
        (Boolean(normMeaning) && normSub === normMeaning) ||
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
    const { data: v3Data, error: v3Err } = privateProtocol
      ? await supabaseAdmin.rpc('complete_private_game_stage', { p_attempt: attempt.id, p_student: session.subjectId })
      : await supabaseAdmin.rpc(
      'complete_stage_with_progression_v3',
      {
        p_attempt_id: attempt.id,
        p_student_id: session.subjectId,
        p_word_attempts: wordAttempts,
        p_now: new Date().toISOString(),
      }
    );


    if (!v3Err && v3Data?.success) {
      // ── V3 success path ────────────────────────────────────────────────────
      const correctCount = v3Data.score ?? wordAttempts.filter(w => w.is_correct).length;
      const requiredPassScore = getPassScoreForStage(attempt.stage_number);
      const isActuallyPassed = Boolean(v3Data.passed) && correctCount > 0 && (v3Data.accuracy || 0) >= requiredPassScore;

      // Auto-promote rank in learning_paths if stage advanced
      const nextStage = v3Data.current_stage || attempt.stage_number;
      const calculatedRank = calculateRankFromStage(nextStage);
      let updatedRank = calculatedRank;

      try {
        const { data: curLp } = await supabaseAdmin
          .from('learning_paths')
          .select('current_rank')
          .eq('student_id', session.subjectId)
          .maybeSingle();

        const curRank = curLp?.current_rank || 1;
        if (calculatedRank > curRank) {
          await supabaseAdmin
            .from('learning_paths')
            .update({
              current_rank: calculatedRank,
              rank_updated_at: new Date().toISOString(),
            })
            .eq('student_id', session.subjectId);
          updatedRank = calculatedRank;
        } else {
          updatedRank = curRank;
        }
      } catch (rankErr) {
        console.warn('Failed to auto-update current_rank:', rankErr);
      }

      if (isActuallyPassed && !isExternalStudent && !v3Data.already_completed) {
        await recordTeamScoreForCompletion(
          session.subjectId,
          attempt.stage_number,
          v3Data.accuracy || 0,
          attempt.id
        );
      }

      return NextResponse.json({
        success: true,
        passed: isActuallyPassed,
        alreadyCompleted: Boolean(v3Data.already_completed),
        score: v3Data.score ?? correctCount,
        accuracy: v3Data.accuracy,
        stars: v3Data.earned_stars ?? v3Data.stars ?? 0,
        earnedCoins: isExternalStudent ? 0 : (v3Data.earned_coins ?? 0),
        earnedExp: isExternalStudent ? 0 : (v3Data.earned_exp ?? 0),
        newCoins: isExternalStudent ? 0 : v3Data.new_coins,
        newTotalExp: isExternalStudent ? 0 : v3Data.new_total_exp,
        currentStage: v3Data.current_stage,
        currentRank: updatedRank,
        primaryReason: v3Data.primary_reason,
        bonusFlags: v3Data.bonus_flags ?? [],
        bossDefeated: v3Data.boss_defeated ?? false,
        bossDamage: v3Data.boss_damage ?? 0,
        bossRemainingHp: v3Data.boss_remaining_hp ?? 100,
        campaignCompleted: v3Data.campaign_completed ?? false,
      });
    }

    console.error("Atomic stage completion failed:", v3Err?.code);
    return NextResponse.json({ error: "ยังบันทึกผลด่านไม่ได้ กรุณาลองส่งผลอีกครั้ง" }, { status: 503 });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Complete game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
