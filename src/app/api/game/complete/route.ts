import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { normalizeAnswer, parseAcceptableAnswers } from '@/lib/quizUtils';
import { calculateRankFromStage, getPassScoreForStage } from '@/utils/adaptiveConfig';

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

    await supabaseAdmin.rpc('record_team_score_event', {
      p_student_id: studentId,
      p_event_type: baseEventType,
      p_points: basePoints,
      p_metadata: { stageNumber, accuracy, attemptId },
    });

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
      await supabaseAdmin.rpc('record_team_score_event', {
        p_student_id: studentId,
        p_event_type: bonusEventType,
        p_points: bonusPoints,
        p_metadata: { stageNumber, accuracy, attemptId },
      });
    }
  } catch (teamErr) {
    console.error('[TeamScore] Failed to record team score event:', teamErr);
  }
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
        earnedCoins: attempt.coins_awarded || 0,
        earnedExp: attempt.exp_awarded || 0,
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
    const { data: v3Data, error: v3Err } = await supabaseAdmin.rpc(
      'complete_stage_with_progression_v3',
      {
        p_attempt_id: attempt.id,
        p_student_id: session.subjectId,
        p_word_attempts: wordAttempts,
        p_now: new Date().toISOString(),
      }
    );

    const isExternalStudent = session.user?.userType === 'EXTERNAL';

    if (!v3Err) {
      // ── V3 success path ────────────────────────────────────────────────────
      const correctCount = wordAttempts.filter(w => w.is_correct).length;
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

      if (isActuallyPassed && !isExternalStudent) {
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
        score: v3Data.score,
        accuracy: v3Data.accuracy,
        stars: v3Data.earned_stars ?? 0,
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

    // ── V3 failure handling: Authoritative Server-Side Fallback ────────────
    // If the V3 SQL function encounters a DB error (e.g. migration column mismatch 42703,
    // missing dependency, etc.), execute authoritative server-side progression directly
    // via supabaseAdmin to ensure student progress is never lost.
    console.warn(
      'complete_stage_with_progression_v3 returned error, executing authoritative server fallback:',
      v3Err?.message || v3Err
    );

    const correctCount = wordAttempts.filter(w => w.is_correct).length;
    const totalQuestions = originalQuestions.length || wordAttempts.length || 1;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const requiredPassScore = getPassScoreForStage(attempt.stage_number);
    const isActuallyPassed = accuracy >= requiredPassScore && correctCount > 0;

    // Authoritative hint count
    let hintCount = attempt.hint_count || 0;
    try {
      const { count } = await supabaseAdmin
        .from('attempt_hint_events')
        .select('id', { count: 'exact', head: true })
        .eq('stage_attempt_id', attempt.id);
      if (typeof count === 'number' && count > 0) {
        hintCount = count;
      }
    } catch (_) {}

    // Clamped avg response time
    const avgResponseTime = responseTimeList.length > 0
      ? Math.round(responseTimeList.reduce((a, b) => a + b, 0) / responseTimeList.length)
      : 1500;

    // Stars calculation
    let earnedStars = 0;
    if (isActuallyPassed) {
      if (accuracy >= 100 && hintCount === 0 && avgResponseTime <= 12000) {
        earnedStars = 3;
      } else if (accuracy >= requiredPassScore && hintCount <= 1) {
        earnedStars = 2;
      } else {
        earnedStars = 1;
      }
    }

    // Boss & stage classification
    const stageNum = attempt.stage_number;
    const isFinalBoss = stageNum === 100;
    const isWorldBoss = stageNum % 10 === 0 && !isFinalBoss;
    const isMiniBoss = stageNum % 10 === 5;
    const isBoss = isFinalBoss || isWorldBoss || isMiniBoss;
    const bossDefeated = isBoss && isActuallyPassed;
    const bossDamage = isBoss ? Math.min(100, Math.round((correctCount * 100) / totalQuestions)) : 0;
    const bossRemainingHp = isBoss ? Math.max(0, 100 - bossDamage) : 100;
    const campaignCompleted = stageNum === 100 && isActuallyPassed;

    // Economy calculation
    let baseRewardCoins = 10;
    let baseRewardExp = 20;
    if (isFinalBoss) {
      baseRewardCoins = 100;
      baseRewardExp = 200;
    } else if (isWorldBoss) {
      baseRewardCoins = 50;
      baseRewardExp = 100;
    } else if (isMiniBoss) {
      baseRewardCoins = 25;
      baseRewardExp = 50;
    }

    let bonusCoins = 0;
    const bonusFlags: string[] = [];
    if (accuracy === 100) {
      bonusFlags.push('PERFECT_ACCURACY');
      bonusCoins += 15;
    }
    if (hintCount === 0) {
      bonusFlags.push('NO_HINTS');
      bonusCoins += 10;
    }
    if (isFinalBoss && isActuallyPassed) {
      bonusFlags.push('FINAL_BOSS_CLEAR');
    }

    // Resolve authoritative stage_id
    let stageId = attempt.stage_id;
    if (!stageId) {
      const { data: stRow } = await supabaseAdmin
        .from('stages')
        .select('id')
        .eq('stage_number', stageNum)
        .maybeSingle();
      if (stRow?.id) {
        stageId = stRow.id;
      }
    }

    // Read current learning path
    const { data: lpData } = await supabaseAdmin
      .from('learning_paths')
      .select('*')
      .eq('student_id', session.subjectId)
      .maybeSingle();

    const curCoins = Number(lpData?.coins || 0);
    const curExp = Number(lpData?.exp || 0);
    const curTotalExp = Number(lpData?.total_exp || 0);
    const curStage = Number(lpData?.current_stage || 1);
    const curRank = Number(lpData?.current_rank || 1);

    // Read existing stage progress
    let existingProgress: any = null;
    if (stageId) {
      const { data: epData } = await supabaseAdmin
        .from('student_stage_progress')
        .select('*')
        .eq('student_id', session.subjectId)
        .eq('stage_id', stageId)
        .maybeSingle();
      existingProgress = epData;
    }

    const wasCompleted = existingProgress?.completed === true;
    let earnedCoins = 0;
    let earnedExp = 0;
    let primaryReason = 'FAILED';

    if (!isActuallyPassed) {
      earnedCoins = 0;
      earnedExp = 0;
      primaryReason = 'FAILED';
    } else if (!wasCompleted) {
      earnedCoins = baseRewardCoins + bonusCoins;
      earnedExp = baseRewardExp;
      primaryReason = 'FIRST_CLEAR';
    } else {
      const prevBestStars = Number(existingProgress?.best_stars || 0);
      const newBestStars = Math.max(prevBestStars, earnedStars);
      if (newBestStars > prevBestStars) {
        earnedCoins = (newBestStars - prevBestStars) * 5;
        primaryReason = 'STAR_IMPROVEMENT';
      } else {
        earnedCoins = Math.floor(baseRewardCoins * 0.2);
        primaryReason = 'REPLAY_CLEAR';
      }
      earnedExp = Math.floor(baseRewardExp * 0.2);
    }

    const nextStage = (isActuallyPassed && stageNum === curStage && curStage < 100)
      ? curStage + 1
      : curStage;
    const calculatedRank = calculateRankFromStage(nextStage);
    const updatedRank = Math.max(curRank, calculatedRank);

    const newCoins = isExternalStudent ? curCoins : (curCoins + earnedCoins);
    const newExp = isExternalStudent ? curExp : (curExp + earnedExp);
    const newTotalExp = isExternalStudent ? curTotalExp : (curTotalExp + earnedExp);

    // 1. Update stage_attempts
    await supabaseAdmin
      .from('stage_attempts')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        score: correctCount,
        accuracy,
        stars: earnedStars,
        coins_awarded: isExternalStudent ? 0 : earnedCoins,
        exp_awarded: isExternalStudent ? 0 : earnedExp,
      })
      .eq('id', attempt.id);

    // 2. Upsert student_stage_progress
    if (stageId) {
      const prevBestAccuracy = Number(existingProgress?.best_accuracy || 0);
      const prevBestScore = Number(existingProgress?.best_score || 0);
      const prevBestStars = Number(existingProgress?.best_stars || 0);

      await supabaseAdmin
        .from('student_stage_progress')
        .upsert({
          student_id: session.subjectId,
          stage_id: stageId,
          stage_number: stageNum,
          completed: wasCompleted || isActuallyPassed,
          best_stars: Math.max(prevBestStars, earnedStars),
          latest_stars: earnedStars,
          best_accuracy: Math.max(prevBestAccuracy, accuracy),
          latest_accuracy: accuracy,
          best_score: Math.max(prevBestScore, correctCount),
          attempt_count: Number(existingProgress?.attempt_count || 0) + 1,
          hint_count_last: hintCount,
          first_passed_at: existingProgress?.first_passed_at || (isActuallyPassed ? new Date().toISOString() : null),
          last_played_at: new Date().toISOString(),
          last_attempt_id: attempt.id,
          progress_source: 'DIRECT_COMPLETION',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'student_id,stage_id'
        });
    }

    // 3. Update learning_paths
    const lpUpdatePayload: any = {
      coins: newCoins,
      exp: newExp,
      total_exp: newTotalExp,
      current_stage: nextStage,
      current_rank: updatedRank,
      last_active_date: new Date().toISOString().split('T')[0],
    };
    if (calculatedRank > curRank) {
      lpUpdatePayload.rank_updated_at = new Date().toISOString();
    }
    if (campaignCompleted) {
      lpUpdatePayload.campaign_completed_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('learning_paths')
      .update(lpUpdatePayload)
      .eq('student_id', session.subjectId);

    // 4. Insert stage_results (history log)
    await supabaseAdmin
      .from('stage_results')
      .insert({
        user_id: session.subjectId,
        stage_number: stageNum,
        rank_at_play: curRank,
        score: correctCount,
        accuracy,
        response_time_avg: avgResponseTime,
        passed: isActuallyPassed,
        used_hints: hintCount,
        stars: earnedStars,
        created_at: new Date().toISOString(),
      });

    // 5. Spaced repetition word mastery (non-blocking)
    for (const wa of wordAttempts) {
      try {
        await supabaseAdmin.rpc('record_word_attempt_v2', {
          p_student_id: session.subjectId,
          p_stage_attempt_id: attempt.id,
          p_word_id: wa.word_id,
          p_is_correct: wa.is_correct,
          p_response_time_ms: wa.response_time_ms,
          p_now: new Date().toISOString(),
        });
      } catch (_) {}
    }

    // 6. Record team score
    if (isActuallyPassed && !isExternalStudent) {
      await recordTeamScoreForCompletion(
        session.subjectId,
        stageNum,
        accuracy,
        attempt.id
      );
    }

    return NextResponse.json({
      success: true,
      passed: isActuallyPassed,
      score: correctCount,
      accuracy,
      stars: earnedStars,
      earnedCoins: isExternalStudent ? 0 : earnedCoins,
      earnedExp: isExternalStudent ? 0 : earnedExp,
      newCoins: isExternalStudent ? 0 : newCoins,
      newTotalExp: isExternalStudent ? 0 : newTotalExp,
      currentStage: nextStage,
      currentRank: updatedRank,
      primaryReason,
      bonusFlags,
      bossDefeated,
      bossDamage,
      bossRemainingHp,
      campaignCompleted,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Complete game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
