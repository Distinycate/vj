import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getOnetYearConfig } from '@/data/onet/onetData';

const onetSubmitSchema = z.object({
  year: z.number().int().min(2550).max(2580),
  answers: z.record(z.string(), z.any()),
  durationSeconds: z.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    const body = await request.json().catch(() => null);

    const parsed = onetSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ข้อมูลคำตอบไม่ถูกต้อง', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { year, answers, durationSeconds } = parsed.data;
    const config = getOnetYearConfig(year);
    if (!config) {
      return NextResponse.json({ error: 'ไม่พบชุดข้อสอบปีที่ระบุ' }, { status: 404 });
    }

    // Evaluate answers
    let correctCount = 0;
    const detailedResults = config.questions.map((q) => {
      const studentAns = answers[String(q.number)];
      let isCorrect = false;

      if (q.type === 'single') {
        isCorrect = String(studentAns || '').toUpperCase() === String(q.correctAnswer).toUpperCase();
      } else if (q.type === 'ordering') {
        // Ordering comparison (array of letters)
        if (Array.isArray(studentAns) && Array.isArray(q.correctAnswer)) {
          isCorrect =
            studentAns.length === q.correctAnswer.length &&
            studentAns.every((val, idx) => String(val).toUpperCase() === String(q.correctAnswer[idx]).toUpperCase());
        }
      }

      if (isCorrect) correctCount++;

      return {
        questionNumber: q.number,
        type: q.type,
        studentAnswer: studentAns || null,
        correctAnswer: q.correctAnswer,
        isCorrect,
        points: q.points,
        explanation: q.explanation || null,
      };
    });

    const totalQuestions = config.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const score100 = Number(((correctCount / totalQuestions) * 100).toFixed(1));

    // Calculate stars
    let stars = 0;
    if (percentage >= 80) stars = 3;
    else if (percentage >= 60) stars = 2;
    else if (percentage >= 40) stars = 1;

    const isPassed = percentage >= 50;

    // Rewards: coins & EXP based on performance
    // กฎรางวัล: ถ้าทำคะแนนได้เกินครึ่ง (>= 50%) รับ 5 ตั๋วสุ่มการ์ดทันที
    const coinsReward = isPassed ? 50 + (stars * 10) : 10;
    const expReward = isPassed ? 100 + (stars * 25) : 25;
    const ticketsReward = isPassed ? 5 : 0;

    // Grant reward via server RPC
    let rewardResult: any = null;
    try {
      const { data, error } = await supabaseAdmin.rpc('grant_student_reward', {
        p_student_id: session.subjectId,
        p_source: 'onet_challenge',
        p_reference_id: `onet_${year}_${session.subjectId}_${Date.now()}`,
        p_coins_delta: coinsReward,
        p_exp_delta: expReward,
        p_tickets_delta: ticketsReward,
        p_metadata: {
          year,
          correctCount,
          totalQuestions,
          score100,
          stars,
          isPassed,
          durationSeconds,
        },
      });
      if (!error && data) {
        rewardResult = data;
      }
    } catch (e) {
      console.warn('Could not grant reward via RPC:', e);
    }

    return NextResponse.json({
      success: true,
      year,
      correctCount,
      totalQuestions,
      score100,
      percentage,
      stars,
      isPassed,
      rewards: {
        coins: coinsReward,
        exp: expReward,
        tickets: ticketsReward,
        currentCoins: rewardResult?.coins ?? null,
        currentExp: rewardResult?.total_exp ?? null,
      },
      results: detailedResults,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Onet submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

