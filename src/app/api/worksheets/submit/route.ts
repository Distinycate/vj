import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getWorksheetUnit, calculateWorksheetStars } from '@/data/worksheets/index';
import { normalizeAnswer } from '@/lib/quizUtils';

const submitWorksheetSchema = z.object({
  unitId: z.string(),
  answers: z.record(z.string(), z.string()),
  durationSeconds: z.number().int().min(0).optional().default(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const rawBody = await request.json().catch(() => null);
    const parsed = submitWorksheetSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลคำตอบไม่ถูกต้อง', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { unitId, answers, durationSeconds } = parsed.data;
    const unit = getWorksheetUnit(unitId);
    if (!unit) {
      return NextResponse.json({ error: 'ไม่พบแบบฝึกหัดชุดนี้' }, { status: 404 });
    }

    let correctCount = 0;
    const results: Array<{
      questionId: string;
      prompt: string;
      submitted: string;
      expected: string;
      isCorrect: boolean;
      thaiMeaning?: string;
      explanationTh?: string;
    }> = [];

    const wrongWordsToTrack: Array<{ word: string; meaning: string }> = [];

    for (const q of unit.questions) {
      const submitted = (answers[q.id] || '').trim();
      const normSub = normalizeAnswer(submitted);
      const normExp = normalizeAnswer(q.answer);

      let isCorrect = Boolean(normSub) && normSub === normExp;

      // Check acceptable alternative forms (e.g. circles / circle)
      if (!isCorrect && q.acceptableAnswers) {
        isCorrect = q.acceptableAnswers.some((alt) => normalizeAnswer(alt) === normSub);
      }

      if (isCorrect) {
        correctCount++;
      } else {
        wrongWordsToTrack.push({
          word: q.answer,
          meaning: q.thaiMeaning || '',
        });
      }

      results.push({
        questionId: q.id,
        prompt: q.prompt,
        submitted: submitted || '(ไม่ได้ตอบ)',
        expected: q.answer,
        isCorrect,
        thaiMeaning: q.thaiMeaning,
        explanationTh: q.explanationTh,
      });
    }

    const totalQuestions = Math.max(1, unit.questions.length);
    const score = correctCount;
    const maxScore = totalQuestions;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const stars = calculateWorksheetStars(score, maxScore);

    // Check if first time submission for this unit
    const { data: pastSubmissions } = await supabaseAdmin
      .from('economy_transactions')
      .select('id')
      .eq('student_id', session.subjectId)
      .eq('source', 'worksheet_submission')
      .contains('metadata', { unitId })
      .limit(1);

    const isFirstTime = !pastSubmissions || pastSubmissions.length === 0;
    const earnedCoins = stars >= 2 ? (isFirstTime ? 30 : 5) : 5;
    const earnedExp = stars >= 2 ? (isFirstTime ? 50 : 10) : 10;

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

    // Record submission into economy_transactions with metadata
    await supabaseAdmin.from('economy_transactions').insert({
      student_id: session.subjectId,
      amount: earnedCoins,
      source: 'worksheet_submission',
      description: `ทำแบบฝึกหัด ${unit.title} ได้ ${score}/${maxScore} (${stars} ดาว)`,
      metadata: {
        unitId,
        grade: unit.grade,
        unitNumber: unit.unitNumber,
        score,
        maxScore,
        stars,
        accuracy,
        durationSeconds,
        wrongCount: wrongWordsToTrack.length,
      },
    });

    // Save wrong words into wrong_words table for Spaced Repetition (SRS)
    if (wrongWordsToTrack.length > 0) {
      for (const ww of wrongWordsToTrack.slice(0, 10)) {
        try {
          await supabaseAdmin.from('wrong_words').upsert(
            {
              student_id: session.subjectId,
              word_id: `ws_${unitId}_${ww.word.toLowerCase()}`,
              word: ww.word,
              meaning: ww.meaning,
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
      unitId,
      score,
      maxScore,
      stars,
      accuracy,
      earnedCoins,
      earnedExp,
      isFirstTime,
      results,
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (err?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Worksheet submit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

