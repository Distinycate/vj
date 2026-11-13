import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import {
  checkGrandmasterEligibility,
  selectGrandmasterQuestionPool,
  buildGrandmasterQuestions,
  GRANDMASTER_QUESTION_COUNT,
} from '@/lib/progression/grandmasterBoss';

export const GRANDMASTER_MISSION_LEVEL = 99;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const [progressRes, vocabRes, reviewRes] = await Promise.all([
      supabaseAdmin
        .from('student_stage_progress')
        .select('stage_number, best_stars, completed')
        .eq('student_id', session.subjectId),
      supabaseAdmin
        .from('vocabulary')
        .select('id, word, meaning, meaning_th, part_of_speech, stage_number, example_sentence')
        .eq('is_active', true)
        .gte('stage_number', 1)
        .lte('stage_number', 100),
      supabaseAdmin
        .from('user_review_words')
        .select('word_id, mastery_status, mastery_score, review_step, wrong_count, attempt_count, next_review_at, last_seen_at')
        .eq('user_id', session.subjectId),
    ]);

    if (progressRes.error) {
      return NextResponse.json(
        { error: 'ไม่สามารถตรวจสอบข้อมูลดาวสะสมได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 500 }
      );
    }

    const stageRecords = (progressRes.data || []).map((r: any) => ({
      stageNumber: Number(r.stage_number),
      bestStars: Number(r.best_stars ?? 0),
      completed: Boolean(r.completed),
    }));

    const eligibility = checkGrandmasterEligibility(stageRecords);
    if (!eligibility.unlocked) {
      return NextResponse.json(
        {
          error: `ต้องผ่านครบ 100 ด่านและเก็บครบ 300 ดาวก่อน (ปัจจุบัน ${eligibility.totalStars}/300 ดาว)`,
          code: 'GRANDMASTER_LOCKED',
          eligibility,
        },
        { status: 403 }
      );
    }

    const allVocab = vocabRes.data || [];
    if (allVocab.length < 10) {
      return NextResponse.json(
        { error: 'คลังคำศัพท์ไม่เพียงพอสำหรับสร้างด่าน Grandmaster Boss' },
        { status: 404 }
      );
    }

    const reviewMap = new Map<string, any>();
    for (const r of reviewRes.data || []) {
      reviewMap.set(r.word_id, r);
    }

    const candidates = allVocab.map((w: any) => {
      const rev = reviewMap.get(w.id);
      return {
        ...w,
        mastery_status: rev?.mastery_status,
        mastery_score: rev?.mastery_score,
        review_step: rev?.review_step,
        wrong_count: rev?.wrong_count,
        attempt_count: rev?.attempt_count,
        next_review_at: rev?.next_review_at,
        last_seen_at: rev?.last_seen_at,
      };
    });

    const selectedPool = selectGrandmasterQuestionPool(candidates, new Date());
    const questions = buildGrandmasterQuestions(selectedPool);

    const authoritativeQuestions = questions.map((q) => ({
      id: q.wordId,
      word_id: q.wordId,
      word: q.word,
      meaning_th: q.meaningTh,
      part_of_speech: q.partOfSpeech,
      prompt: q.promptText,
      promptType: q.promptType,
      firstLetterMask: q.firstLetterMask,
      letterCount: q.letterCount,
      timeLimitSeconds: q.timeLimitSeconds,
      phase: q.phase,
      worldNumber: q.worldNumber,
      correct_answer: q.word,
      qType: 'FILL_BLANK',
      question_type: 'spelling',
      choices: [],
    }));

    const clientQuestions = questions.map((q) => ({
      index: q.index,
      phase: q.phase,
      worldNumber: q.worldNumber,
      id: q.wordId,
      word_id: q.wordId,
      meaning_th: q.meaningTh,
      part_of_speech: q.partOfSpeech,
      prompt: q.promptText,
      promptType: q.promptType,
      firstLetterMask: q.firstLetterMask,
      letterCount: q.letterCount,
      timeLimitSeconds: q.timeLimitSeconds,
      qType: 'FILL_BLANK',
    }));

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('stage_attempts')
      .insert({
        student_id: session.subjectId,
        stage_number: 100,
        mission_level: GRANDMASTER_MISSION_LEVEL,
        status: 'ACTIVE',
        question_ids: authoritativeQuestions,
      })
      .select('id')
      .single();

    if (attemptErr || !attempt) {
      console.error('Failed to create grandmaster attempt:', attemptErr);
      return NextResponse.json(
        { error: 'ไม่สามารถเริ่มด่าน Grandmaster Boss ได้' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      totalQuestions: Math.min(GRANDMASTER_QUESTION_COUNT, clientQuestions.length),
      questions: clientQuestions,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Grandmaster start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

