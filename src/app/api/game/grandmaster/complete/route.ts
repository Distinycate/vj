import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { normalizeAnswer } from '@/lib/quizUtils';
import { GRANDMASTER_PASS_ACCURACY } from '@/lib/progression/grandmasterBoss';
import { GRANDMASTER_MISSION_LEVEL } from '../start/route';

const completeGrandmasterSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(
    z.object({
      wordId: z.string(),
      answer: z.string(),
      responseTime: z.number().optional().default(0),
    })
  ),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const rawBody = await request.json().catch(() => null);
    const parsed = completeGrandmasterSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลคำตอบไม่ถูกต้อง', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { attemptId, answers } = parsed.data;

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('stage_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรอบการท้าทายนี้' }, { status: 404 });
    }

    if (attempt.student_id !== session.subjectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (attempt.mission_level !== GRANDMASTER_MISSION_LEVEL) {
      return NextResponse.json({ error: 'Invalid attempt type' }, { status: 400 });
    }

    if (attempt.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        passed: Number(attempt.accuracy ?? 0) >= GRANDMASTER_PASS_ACCURACY,
        score: attempt.score ?? 0,
        totalQuestions: Array.isArray(attempt.question_ids) ? attempt.question_ids.length : 50,
        accuracy: Number(attempt.accuracy ?? 0),
        earnedCoins: attempt.coins_awarded ?? 0,
        earnedExp: attempt.exp_awarded ?? 0,
      });
    }

    const originalQuestions: any[] = Array.isArray(attempt.question_ids)
      ? attempt.question_ids
      : [];

    const answerMap = new Map<string, string>();
    const timeMap = new Map<string, number>();

    for (const ans of answers) {
      answerMap.set(ans.wordId, ans.answer || '');
      timeMap.set(ans.wordId, Math.max(300, Math.min(60000, Number(ans.responseTime || 2000))));
    }

    let correctCount = 0;
    const wrongWordsReport: Array<{
      wordId: string;
      word: string;
      meaningTh: string;
      submitted: string;
      worldNumber: number;
    }> = [];

    for (const q of originalQuestions) {
      const qId = q.id || q.word_id;
      const rawSubmitted = (answerMap.get(qId) || '').trim();
      const normSub = normalizeAnswer(rawSubmitted);
      const normTarget = normalizeAnswer(q.word || q.correct_answer || '');

      // Strict spelling check: must match the target English word exactly (case-insensitive)
      const isCorrect = Boolean(normSub) && normSub === normTarget;

      if (isCorrect) {
        correctCount++;
      } else {
        wrongWordsReport.push({
          wordId: qId,
          word: q.word,
          meaningTh: q.meaning_th || '',
          submitted: rawSubmitted || '(ไม่ได้ตอบ)',
          worldNumber: q.worldNumber || 1,
        });
      }
    }

    const totalQuestions = Math.max(1, originalQuestions.length);
    const accuracy = Math.round((correctCount / totalQuestions) * 10000) / 100;
    const passed = accuracy >= GRANDMASTER_PASS_ACCURACY && correctCount >= 40;

    // Check if first time clearing Grandmaster Boss
    const { count: prevClearsCount } = await supabaseAdmin
      .from('stage_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', session.subjectId)
      .eq('mission_level', GRANDMASTER_MISSION_LEVEL)
      .eq('status', 'COMPLETED')
      .gte('accuracy', GRANDMASTER_PASS_ACCURACY);

    const isFirstClear = (prevClearsCount ?? 0) === 0;
    const earnedCoins = passed ? (isFirstClear ? 500 : 50) : 10;
    const earnedExp = passed ? (isFirstClear ? 300 : 30) : 5;

    // Mark attempt completed
    await supabaseAdmin
      .from('stage_attempts')
      .update({
        status: 'COMPLETED',
        score: correctCount,
        accuracy,
        stars: passed ? 3 : 0,
        coins_awarded: earnedCoins,
        exp_awarded: earnedExp,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attemptId);

    // Award coins & EXP to learning_paths
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

    // Record wrong words into wrong_words table so teacher and SRS can track them
    if (wrongWordsReport.length > 0) {
      for (const ww of wrongWordsReport.slice(0, 25)) {
        try {
          await supabaseAdmin.from('wrong_words').upsert(
            {
              student_id: session.subjectId,
              word_id: ww.wordId,
              word: ww.word,
              meaning: ww.meaningTh,
              wrong_count: 1,
              last_wrong_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,word_id', ignoreDuplicates: false }
          );
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      passed,
      isFirstClear: passed && isFirstClear,
      score: correctCount,
      totalQuestions,
      accuracy,
      earnedCoins,
      earnedExp,
      wrongWords: wrongWordsReport,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Grandmaster complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

