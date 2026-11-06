import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getOnetYearConfig } from '@/data/onet/onetData';

const liveProgressSchema = z.object({
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

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const body = await request.json().catch(() => null);
    const parsed = liveProgressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { year, answers, durationSeconds } = parsed.data;
    const config = getOnetYearConfig(year);
    if (!config) {
      return NextResponse.json({ error: 'Exam year not found' }, { status: 404 });
    }

    // 1. Get student info
    const { data: student, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id, student_id, student_name, grade_level, room_number')
      .eq('id', session.subjectId)
      .single();

    if (sErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const classroom = cleanClassroomLabel(student.grade_level, student.room_number);

    // 2. Evaluate answers in real-time
    const questionResults: Record<string, { isCorrect: boolean; studentAnswer: any; answered: boolean }> = {};
    let correctCount = 0;
    let answeredCount = 0;

    config.questions.forEach((q) => {
      const qKey = String(q.number);
      const studentAns = answers[qKey];
      const hasAnswer = studentAns !== undefined && studentAns !== null && studentAns !== '';

      if (hasAnswer) {
        answeredCount++;
        let isCorrect = false;

        if (q.type === 'single') {
          isCorrect = String(studentAns).toUpperCase() === String(q.correctAnswer).toUpperCase();
        } else if (q.type === 'ordering' && Array.isArray(studentAns) && Array.isArray(q.correctAnswer)) {
          isCorrect =
            studentAns.length === q.correctAnswer.length &&
            studentAns.every(
              (val, idx) => String(val).toUpperCase() === String(q.correctAnswer[idx]).toUpperCase()
            );
        }

        if (isCorrect) correctCount++;
        questionResults[qKey] = { isCorrect, studentAnswer: studentAns, answered: true };
      } else {
        questionResults[qKey] = { isCorrect: false, studentAnswer: null, answered: false };
      }
    });

    const nowIso = new Date().toISOString();

    // 3. Update live_progress in events table
    const { data: eventRow } = await supabaseAdmin
      .from('events')
      .select('settings')
      .eq('slug', 'onet-challenge')
      .maybeSingle();

    const currentSettings = eventRow?.settings || {};
    const liveProgress = currentSettings.live_progress || {};
    const yearProgress = liveProgress[String(year)] || {};

    const existing = yearProgress[session.subjectId];
    if (existing && existing.status === 'submitted') {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        message: 'Exam already submitted',
      });
    }

    yearProgress[session.subjectId] = {
      studentId: session.subjectId,
      studentCode: student.student_id,
      studentName: student.student_name,
      classroom,
      answers,
      questionResults,
      answeredCount,
      correctCount,
      totalQuestions: config.questions.length,
      durationSeconds,
      status: 'in_progress',
      updatedAt: nowIso,
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

    return NextResponse.json({
      success: true,
      answeredCount,
      correctCount,
      totalQuestions: config.questions.length,
      updatedAt: nowIso,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Student ONET Live sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
