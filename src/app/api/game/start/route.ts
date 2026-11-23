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
  getWorldNumber,
  getWorldStageRange,
} from '@/lib/progression/worldHierarchy';
import { isStageUnlocked } from '@/lib/progression/unlockRules';
import { buildCampaignQuestion } from '@/lib/quizUtils';
import { toLiveGameQuestion } from '@/lib/liveGameQuestions';

const startGameSchema = z.object({
  stageNumber: z.number().int().min(1).max(100),
  missionLevel: z.number().int().min(1).max(3).optional().default(1),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    if (request.headers.get('x-vj-game-protocol') !== 'private-v1') {
      return NextResponse.json({ error: 'มีเกมเวอร์ชันใหม่ กรุณารีเฟรชหน้าแล้วเริ่มด่านใหม่' }, { status: 409 });
    }

    const body = await request.json().catch(() => null);
    const parsed = startGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid start game payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { stageNumber, missionLevel } = parsed.data;

    // ── Derive stage type from registry ─────────────────────────────────────
    const stageType = getStageType(stageNumber);
    const isBossMode = isBossStage(stageNumber);
    const isExternalStudent = session.user.userType === 'EXTERNAL';

    // Build stage vocabulary query
    let stageWordsQuery = supabaseAdmin
      .from('vocabulary')
      .select('*')
      .eq('is_active', true);

    if (isBossMode) {
      if (stageNumber === 100) {
        stageWordsQuery = stageWordsQuery.gte('stage_number', 1).lte('stage_number', 100);
      } else {
        const worldNum = getWorldNumber(stageNumber);
        if (worldNum) {
          const { first, last } = getWorldStageRange(worldNum);
          const maxStage = (stageNumber % 10 === 5) ? stageNumber : last;
          stageWordsQuery = stageWordsQuery.gte('stage_number', first).lte('stage_number', maxStage);
        } else {
          stageWordsQuery = stageWordsQuery.eq('stage_number', stageNumber);
        }
      }
    } else {
      stageWordsQuery = stageWordsQuery.eq('stage_number', stageNumber);
    }

    // Run independent queries in parallel to minimize latency
    const [
      pretestRes,
      pathRes,
      progressRes,
      stageWordsRes,
      userReviewRes,
      allVocabRes,
      studentRes,
      answerLedger,
    ] = await Promise.all([
      !isExternalStudent
        ? supabaseAdmin.from('pre_tests').select('id', { count: 'exact', head: true }).eq('student_id', session.subjectId)
        : Promise.resolve({ count: 5, error: null }),
      supabaseAdmin
        .from('learning_paths')
        .select('current_stage, current_rank, coins, total_exp, campaign_completed_at')
        .eq('student_id', session.subjectId)
        .maybeSingle(),
      supabaseAdmin
        .from('student_stage_progress')
        .select('stage_number')
        .eq('student_id', session.subjectId)
        .eq('completed', true),
      stageWordsQuery,
      !isExternalStudent
        ? supabaseAdmin
            .from('user_review_words')
            .select('word_id, mastery_status, mastery_score, review_step, wrong_count, attempt_count, next_review_at, last_seen_at')
            .eq('user_id', session.subjectId)
        : Promise.resolve({ data: null }),
      !isExternalStudent
        ? supabaseAdmin
            .from('vocabulary')
            .select('id, word, meaning, meaning_th')
            .eq('is_active', true)
            .limit(100)
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from('students')
        .select('is_skull')
        .eq('id', session.subjectId)
        .maybeSingle(),
      supabaseAdmin.from('live_game_answers').select('attempt_id', { head: true }).limit(0),
    ]);
    if (answerLedger.error) {
      console.error('Private live game schema unavailable:', answerLedger.error.code);
      return NextResponse.json({ error: 'ยังเปิดเกมรุ่นใหม่นี้ไม่ได้ กรุณาแจ้งผู้ดูแลระบบ' }, { status: 503 });
    }

    // Stale tabs cannot bypass the new campaign's baseline assessment.
    if (!isExternalStudent) {
      if (pretestRes.error) throw pretestRes.error;
      if ((pretestRes.count ?? 0) < 5) {
        return NextResponse.json({ error: 'กรุณาทำ Pre-test รอบปัจจุบันให้ครบ 5 ครั้งก่อนเริ่มด่าน', code: 'PRETEST_REQUIRED' }, { status: 409 });
      }
    }

    // ── Phase 3.2F: Authoritative unlock check ───────────────────────────────
    const path = pathRes.data;
    const legacyCurrentStage = path?.current_stage ?? 1;

    let completedStages: Set<number> | null = null;
    const progressRows = progressRes.data;
    if (progressRows && progressRows.length > 0) {
      completedStages = new Set(progressRows.map((r: any) => r.stage_number as number));
    } else if (progressRows !== null) {
      completedStages = new Set();
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

    let stageWords = stageWordsRes.data;

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

    // ── Map student SRS review data ──
    const reviewMap = new Map<string, any>();
    if (!isExternalStudent && userReviewRes.data) {
      for (const r of userReviewRes.data) {
        reviewMap.set(r.word_id, r);
      }
    }

    const candidateMap = new Map<string, any>();

    if (isExternalStudent) {
      for (const w of stageWords) {
        candidateMap.set(w.id, w);
      }

      // Ensure at least 10 candidates for External student stages (Lite)
      if (candidateMap.size < 10) {
        const worldStart = Math.floor((stageNumber - 1) / 10) * 10 + 1;
        const worldEnd = worldStart + 9;
        const { data: extraWords } = await supabaseAdmin
          .from('vocabulary')
          .select('*')
          .eq('is_active', true)
          .gte('stage_number', worldStart)
          .lte('stage_number', worldEnd)
          .limit(20);
        if (extraWords) {
          for (const w of extraWords) {
            if (!candidateMap.has(w.id)) {
              candidateMap.set(w.id, w);
              if (candidateMap.size >= 10) break;
            }
          }
        }
        if (candidateMap.size < 10) {
          const { data: fallbackExtra } = await supabaseAdmin
            .from('vocabulary')
            .select('*')
            .eq('is_active', true)
            .limit(15);
          if (fallbackExtra) {
            for (const w of fallbackExtra) {
              if (!candidateMap.has(w.id)) {
                candidateMap.set(w.id, w);
                if (candidateMap.size >= 10) break;
              }
            }
          }
        }
      }
    } else {
      // VJ Full Internal Mode: Standard stage candidates MUST strictly belong to this stage
      for (const w of stageWords) {
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
    let distractorPool = allCandidates;
    if (isExternalStudent) {
      if (distractorPool.length < 15) {
        const worldStart = Math.floor((stageNumber - 1) / 10) * 10 + 1;
        const worldEnd = worldStart + 9;
        const { data: chunkVocab } = await supabaseAdmin
          .from('vocabulary')
          .select('id, word, meaning, meaning_th')
          .eq('is_active', true)
          .gte('stage_number', worldStart)
          .lte('stage_number', worldEnd)
          .limit(20);
        if (chunkVocab) {
          distractorPool = [...distractorPool, ...chunkVocab];
        }
      }
    } else {
      distractorPool = allVocabRes.data || stageWords;
    }

    // ── Question selection ───────────────────────────────────────────────────
    // Boss stages: bossEngine.ts 50/30/20 scoped pool (10 questions)
    // Standard stages: 10 questions for External Lite, standard 6 questions for VJ Full
    let shuffledTargets: any[];

    if (isBossMode) {
      const plan = selectBossQuestionPool(stageNumber, allCandidates, new Date());
      shuffledTargets = plan.selectedWords;
    } else if (isExternalStudent) {
      const targetCount = 10;
      const { selectedWords } = selectAdaptiveQuestionPool(allCandidates, {
        totalQuestions: Math.min(allCandidates.length, targetCount),
        stageNumber,
      });
      shuffledTargets = selectedWords;
      if (shuffledTargets.length < 10 && allCandidates.length >= 10) {
        shuffledTargets = allCandidates.slice(0, 10);
      }
    } else {
      // VJ Full Standard Stage: exactly 10 questions from this stage's vocabulary
      const targetCount = Math.min(stageWords.length, 10);
      shuffledTargets = [...stageWords].sort(() => Math.random() - 0.5).slice(0, targetCount);
    }

    // ── Build question objects ───────────────────────────────────────────────
    const authoritativeQuestions: any[] = [];
    const clientQuestions: any[] = [];

    for (let i = 0; i < shuffledTargets.length; i++) {
      const target = shuffledTargets[i];
      const isSkullStudent = Boolean(studentRes?.data?.is_skull);
      const basicType = i % 2 === 0 ? 'meaning_mc' : 'word_mc';
      const mixedTypes = ['meaning_mc', 'word_mc', 'spelling', 'listening_mc', 'context_mc'] as const;
      const preferred = isExternalStudent || isSkullStudent ? basicType
        : missionLevel === 1 && i % 5 === 2 ? 'listening_mc'
        : missionLevel === 1 && i % 5 === 4 ? 'context_mc'
        : missionLevel === 3 && i % 2 === 1 ? 'spelling'
        : missionLevel === 1 ? basicType : mixedTypes[i % mixedTypes.length];
      const built = buildCampaignQuestion(target, distractorPool, preferred)
        ?? buildCampaignQuestion(target, distractorPool, basicType)
        ?? buildCampaignQuestion(target, distractorPool, basicType === 'word_mc' ? 'meaning_mc' : 'word_mc');
      if (!built || authoritativeQuestions.some(q => q.id === built.id)) continue;
      const question = { ...built, public_id: crypto.randomUUID(),
        choices: built.choices.map(choice => ({ ...choice, public_id: crypto.randomUUID() })) };
      authoritativeQuestions.push(question);
      clientQuestions.push(toLiveGameQuestion(question, stageType));
    }
    if (!authoritativeQuestions.length) {
      return NextResponse.json({ error: 'ยังไม่มีชุดข้อสอบที่สมบูรณ์สำหรับด่านนี้' }, { status: 422 });
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
      if (attemptErr?.message.includes('PRETEST_REQUIRED')) {
        return NextResponse.json({ error: 'กรุณาทำ Pre-test รอบปัจจุบันให้ครบก่อนเริ่มด่าน', code: 'PRETEST_REQUIRED' }, { status: 409 });
      }
      console.error('Failed to create stage attempt:', attemptErr);
      return NextResponse.json({ error: 'Failed to start stage attempt' }, { status: 500 });
    }

    const timeLimit = missionLevel === 3 ? 15 : missionLevel === 2 ? 20 : 25;

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      stageNumber,
      stageType,
      missionLevel,
      timeLimit,
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
