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

function cleanClassroomLabel(gradeLevel?: string | null, roomNumber?: string | null): string {
  if (!gradeLevel && !roomNumber) return 'ม.3/1';
  const cleanGrade = String(gradeLevel || '3').replace(/^ม\.?/, '').trim();
  const cleanRoom = String(roomNumber || '1').trim();
  return `ม.${cleanGrade}/${cleanRoom}`;
}

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    // 1. Get student classroom info
    const { data: student, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id, grade_level, room_number, academic_year')
      .eq('id', session.subjectId)
      .single();

    if (sErr || !student) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
    }

    const studentClassroom = cleanClassroomLabel(student.grade_level, student.room_number);

    // 2. Fetch O-NET challenge settings
    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'onet-challenge')
      .maybeSingle();

    const openYears = eventRow?.settings?.open_years || {
      '2568': { isOpen: true, allowedClassrooms: ['ม.3/1'] },
    };

    // 3. Fetch student past submissions from economy_transactions
    const { data: txs } = await supabaseAdmin
      .from('economy_transactions')
      .select('metadata, created_at')
      .eq('student_id', session.subjectId)
      .eq('source', 'onet_challenge')
      .order('created_at', { ascending: false });

    const submissionsMap: Record<string, any> = {};
    (txs || []).forEach((tx) => {
      const meta = tx.metadata || {};
      const year = meta.year;
      if (!year || submissionsMap[String(year)]) return;
      submissionsMap[String(year)] = {
        year: Number(year),
        score100: Number(meta.score100 ?? 0),
        correctCount: Number(meta.correctCount ?? 0),
        totalQuestions: Number(meta.totalQuestions ?? 32),
        stars: Number(meta.stars ?? 0),
        isPassed: Boolean(meta.isPassed),
        completedAt: tx.created_at,
      };
    });

    // 4. Compute access status per year (2559 - 2568)
    const allYears = [2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560, 2559];
    const yearAccess: Record<string, { isOpen: boolean; isAllowed: boolean; allowedClassrooms: string[] }> = {};

    allYears.forEach((y) => {
      const cfg = openYears[String(y)];
      const isOpen = Boolean(cfg?.isOpen ?? cfg?.is_open);
      const allowedClassrooms = Array.isArray(cfg?.allowedClassrooms)
        ? cfg.allowedClassrooms
        : Array.isArray(cfg?.allowed_classrooms)
        ? cfg.allowed_classrooms
        : [];
      const isAllowed =
        isOpen &&
        (allowedClassrooms.includes('ALL') || allowedClassrooms.includes(studentClassroom));

      yearAccess[String(y)] = {
        isOpen,
        isAllowed,
        allowedClassrooms,
      };
    });

    return NextResponse.json({
      success: true,
      studentClassroom,
      yearAccess,
      submissions: submissionsMap,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Student ONET GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Check student classroom and year permission
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('grade_level, room_number')
      .eq('id', session.subjectId)
      .single();

    const studentClassroom = cleanClassroomLabel(student?.grade_level, student?.room_number);

    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'onet-challenge')
      .maybeSingle();

    const openYears = eventRow?.settings?.open_years || {
      '2568': { isOpen: true, allowedClassrooms: ['ม.3/1'] },
    };

    const yearConfig = openYears[String(year)];
    const isYearOpen = Boolean(yearConfig?.isOpen ?? yearConfig?.is_open);
    const allowedRooms = Array.isArray(yearConfig?.allowedClassrooms)
      ? yearConfig.allowedClassrooms
      : Array.isArray(yearConfig?.allowed_classrooms)
      ? yearConfig.allowed_classrooms
      : [];
    const hasAccess =
      isYearOpen && (allowedRooms.includes('ALL') || allowedRooms.includes(studentClassroom));

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: `ชุดข้อสอบปี ${year} ยังไม่เปิดให้ห้อง ${studentClassroom} เข้าสอบ (กรุณารอคุณครูเปิดระบบ)`,
        },
        { status: 403 }
      );
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
    const compactQuestionResults: Record<string, { isCorrect: boolean; studentAnswer: any; correctAnswer: any }> = {};
    detailedResults.forEach((r) => {
      compactQuestionResults[String(r.questionNumber)] = {
        isCorrect: r.isCorrect,
        studentAnswer: r.studentAnswer,
        correctAnswer: r.correctAnswer,
      };
    });

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
          answers,
          questionResults: compactQuestionResults,
        },
      });
      if (!error && data) {
        rewardResult = data;
      }
    } catch (e) {
      console.warn('Could not grant reward via RPC:', e);
    }

    // Mark submitted in events table live_progress
    try {
      const { data: eventRow } = await supabaseAdmin
        .from('events')
        .select('settings')
        .eq('slug', 'onet-challenge')
        .maybeSingle();

      const currentSettings = eventRow?.settings || {};
      const liveProgress = currentSettings.live_progress || {};
      const yearProgress = liveProgress[String(year)] || {};

      yearProgress[session.subjectId] = {
        studentId: session.subjectId,
        studentCode: student?.grade_level ? studentClassroom : 'STUDENT',
        classroom: studentClassroom,
        answers,
        questionResults: compactQuestionResults,
        answeredCount: totalQuestions,
        correctCount,
        totalQuestions,
        score100,
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      };

      liveProgress[String(year)] = yearProgress;
      await supabaseAdmin
        .from('events')
        .update({
          settings: {
            ...currentSettings,
            live_progress: liveProgress,
          },
        })
        .eq('slug', 'onet-challenge');
    } catch (err) {
      console.warn('Failed to update live_progress on submit:', err);
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

