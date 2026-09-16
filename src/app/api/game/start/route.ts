import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { selectAdaptiveQuestionPool } from '@/lib/learning/adaptiveSelector';
import { selectBossQuestionPool } from '@/lib/progression/bossEngine';
import {
  getStageType,
  isBossStage,
  isCampaignStage,
  isLegacyOverflow,
} from '@/lib/progression/worldHierarchy';
import { isStageUnlocked } from '@/lib/progression/unlockRules';

const startGameSchema = z.object({
  stageNumber: z.number().int().min(1).max(100),
  missionLevel: z.number().int().min(1).max(3).optional().default(1),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const body = await request.json().catch(() => null);
    const parsed = startGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid start game payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { stageNumber, missionLevel } = parsed.data;

    // ── Phase 3.2F: Campaign boundary guard ─────────────────────────────────
    // Reject LEGACY_OVERFLOW stages 101–105 explicitly.
    // (The schema max(100) already blocks this, but explicit guard matches V3 invariant.)
    if (!isCampaignStage(stageNumber) || isLegacyOverflow(stageNumber)) {
      return NextResponse.json(
        { error: 'Stage is outside the Main Campaign (1–100).' },
        { status: 400 }
      );
    }

    // ── Phase 3.2F: Authoritative unlock check ───────────────────────────────
    // Load V3 progression authority first, then fall back to legacy current_stage
    // ONLY when V3 migration data is unavailable.

    // Load legacy learning_path for coins/exp context and fallback unlock
    const { data: path } = await supabaseAdmin
      .from('learning_paths')
      .select('current_stage, current_rank, coins, total_exp, campaign_completed_at')
      .eq('student_id', session.subjectId)
      .maybeSingle();

    const legacyCurrentStage = path?.current_stage ?? 1;

    // Try to load V3 progression data (student_stage_progress)
    let completedStages: Set<number> | null = null;
    try {
      const { data: progressRows } = await supabaseAdmin
        .from('student_stage_progress')
        .select('stage_number')
        .eq('student_id', session.subjectId)
        .eq('completed', true);

      if (progressRows && progressRows.length > 0) {
        completedStages = new Set(progressRows.map((r: any) => r.stage_number as number));
      } else if (progressRows !== null) {
        // Table exists and query succeeded but no rows — V3 migration is present,
        // student just hasn't completed anything. Use empty set (V3 authority).
        completedStages = new Set();
      }
      // If progressRows is null (query error / table missing), completedStages stays null
      // → legacy fallback will be used.
    } catch {
      // V3 migration table absent — fall back to legacy pointer
      completedStages = null;
    }

    const unlocked = isStageUnlocked({
      targetStageNumber: stageNumber,
      completedStages,
      legacyCurrentStage,
    });

    if (!unlocked) {
      return NextResponse.json(
        { error: 'Stage locked. You must complete all prerequisite stages first.' },
        { status: 403 }
      );
    }

    // ── Derive stage type from registry ─────────────────────────────────────
    const stageType = getStageType(stageNumber);
    const isBossMode = isBossStage(stageNumber);

    // ── Fetch active vocabulary ──────────────────────────────────────────────
    let { data: stageWords } = await supabaseAdmin
      .from('vocabulary')
      .select('*')
      .eq('stage_number', stageNumber)
      .eq('is_active', true);

    if (!stageWords || stageWords.length < 4) {
      const { data: fallbackWords } = await supabaseAdmin
        .from('vocabulary')
        .select('*')
        .eq('is_active', true)
        .limit(30);
      stageWords = fallbackWords || [];
    }

    if (!stageWords || stageWords.length === 0) {
      return NextResponse.json(
        { error: 'No vocabulary available for this stage' },
        { status: 404 }
      );
    }

    // ── Fetch student SRS review data ────────────────────────────────────────
    const { data: userReviewData } = await supabaseAdmin
      .from('user_review_words')
      .select('word_id, mastery_status, mastery_score, review_step, wrong_count, attempt_count, next_review_at, last_seen_at')
      .eq('user_id', session.subjectId);

    const reviewMap = new Map<string, any>();
    if (userReviewData) {
      for (const r of userReviewData) {
        reviewMap.set(r.word_id, r);
      }
    }

    // ── Merge stage words with review metadata ───────────────────────────────
    let reviewWordDetails: any[] = [];
    if (userReviewData && userReviewData.length > 0) {
      const reviewWordIds = userReviewData.map((r: any) => r.word_id).filter(Boolean);
      if (reviewWordIds.length > 0) {
        const { data: revDetails } = await supabaseAdmin
          .from('vocabulary')
          .select('*')
          .in('id', reviewWordIds.slice(0, 30))
          .eq('is_active', true);
        reviewWordDetails = revDetails || [];
      }
    }

    const candidateMap = new Map<string, any>();
    for (const w of [...stageWords, ...reviewWordDetails]) {
      if (!candidateMap.has(w.id)) {
        const review = reviewMap.get(w.id);
        candidateMap.set(w.id, {
          ...w,
          mastery_status: review?.mastery_status,
          mastery_score: review?.mastery_score,
          review_step: review?.review_step,
          wrong_count: review?.wrong_count,
          attempt_count: review?.attempt_count,
          next_review_at: review?.next_review_at,
          last_seen_at: review?.last_seen_at,
        });
      }
    }

    const allCandidates = Array.from(candidateMap.values());

    // ── Distractor pool ──────────────────────────────────────────────────────
    const { data: allVocab } = await supabaseAdmin
      .from('vocabulary')
      .select('id, word, meaning, meaning_th')
      .eq('is_active', true)
      .limit(100);

    const distractorPool = allVocab || stageWords;

    // ── Question selection ───────────────────────────────────────────────────
    // Boss stages: bossEngine.ts 50/30/20 scoped pool (10 questions)
    // Standard stages: existing adaptive selector
    let shuffledTargets: any[];

    if (isBossMode) {
      const plan = selectBossQuestionPool(stageNumber, allCandidates, new Date());
      shuffledTargets = plan.selectedWords;
    } else {
      const targetCount = Math.min(allCandidates.length, 6);
      const { selectedWords } = selectAdaptiveQuestionPool(allCandidates, {
        totalQuestions: targetCount,
        stageNumber,
      });
      shuffledTargets = selectedWords;
    }

    // ── Build question objects ───────────────────────────────────────────────
    const authoritativeQuestions: any[] = [];
    const clientQuestions: any[] = [];

    for (const target of shuffledTargets) {
      const meaningText = target.meaning_th || target.meaning || '';
      const distractors = distractorPool
        .filter((d) => d.id !== target.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((d) => ({
          word_id: d.id,
          text: d.meaning_th || d.meaning || '',
        }));

      const allChoices = [
        { word_id: target.id, text: meaningText },
        ...distractors,
      ].sort(() => Math.random() - 0.5);

      authoritativeQuestions.push({
        id: target.id,
        word: target.word,
        correct_answer: meaningText,
        correct_word_id: target.id,
        choices: allChoices,
      });

      clientQuestions.push({
        id: target.id,
        word_id: target.id,
        word: target.word,
        part_of_speech: target.part_of_speech,
        correct_answer: meaningText,
        qType: 'MEANING_MC',
        stageType,
        choices: allChoices.map((c) => ({
          word_id: c.word_id,
          text: c.text,
        })),
      });
    }

    // ── Create authoritative ACTIVE attempt ──────────────────────────────────
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('stage_attempts')
      .insert({
        student_id: session.subjectId,
        stage_number: stageNumber,
        mission_level: missionLevel,
        status: 'ACTIVE',
        question_ids: authoritativeQuestions,
      })
      .select('id')
      .single();

    if (attemptErr || !attempt) {
      console.error('Failed to create stage attempt:', attemptErr);
      return NextResponse.json({ error: 'Failed to start stage attempt' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      stageNumber,
      stageType,
      missionLevel,
      isBossMode,
      questions: clientQuestions,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
