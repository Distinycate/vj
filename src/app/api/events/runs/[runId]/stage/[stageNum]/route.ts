import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getRemedialTemplate, getRemedialStage } from '@/lib/events/remedialEventsRegistry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string; stageNum: string }> }
) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can play stages' }, { status: 403 });
    }

    const { runId, stageNum: stageNumStr } = await params;
    const stageNum = parseInt(stageNumStr, 10);
    if (isNaN(stageNum) || stageNum < 1 || stageNum > 15) {
      return NextResponse.json({ error: 'Invalid stage number' }, { status: 400 });
    }

    // 1. Verify participant
    const { data: participant, error: partErr } = await supabaseAdmin
      .from('event_participants')
      .select('id, target_stages, completed_stages, status')
      .eq('event_run_id', runId)
      .eq('student_id', session.subjectId)
      .maybeSingle();

    if (partErr || !participant) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }

    // 2. Load run info
    const { data: run, error: runErr } = await supabaseAdmin
      .from('event_runs')
      .select('template_id, status')
      .eq('id', runId)
      .maybeSingle();

    if (runErr || !run || run.status === 'closed') {
      return NextResponse.json({ error: 'Event run is not active' }, { status: 400 });
    }

    // 3. Verify unlock status
    if (stageNum > 1) {
      const { data: prevProgress } = await supabaseAdmin
        .from('event_progress')
        .select('passed')
        .eq('event_run_id', runId)
        .eq('student_id', session.subjectId)
        .eq('stage_number', stageNum - 1)
        .maybeSingle();

      if (!prevProgress || !prevProgress.passed) {
        return NextResponse.json({ error: 'Stage is locked. Complete previous stage first.' }, { status: 403 });
      }
    }

    // 4. Load stage questions from template
    const stageData = getRemedialStage(run.template_id, stageNum);
    if (!stageData) {
      return NextResponse.json({ error: 'Stage questions not found' }, { status: 404 });
    }

    // Return sanitized questions (without correctIndex)
    const sanitizedQuestions = stageData.questions.map((q, idx) => ({
      index: idx,
      id: q.id,
      prompt: q.prompt,
      choices: q.choices,
      image: q.image || null,
    }));

    return NextResponse.json({
      success: true,
      stageNumber: stageNum,
      title: stageData.title,
      questions: sanitizedQuestions,
      passScore: 7,
      totalQuestions: stageData.questions.length,
    });
  } catch (err: any) {
    console.error('GET stage error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

const submitAnswersSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(10, 'ต้องตอบให้ครบ 10 ข้อ'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; stageNum: string }> }
) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit stage answers' }, { status: 403 });
    }

    const { runId, stageNum: stageNumStr } = await params;
    const stageNum = parseInt(stageNumStr, 10);
    if (isNaN(stageNum) || stageNum < 1 || stageNum > 15) {
      return NextResponse.json({ error: 'Invalid stage number' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = submitAnswersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid answers', details: parsed.error.issues }, { status: 400 });
    }

    const { answers } = parsed.data;

    // 1. Verify participant
    const { data: participant, error: partErr } = await supabaseAdmin
      .from('event_participants')
      .select('id, target_stages, completed_stages, status, total_attempts')
      .eq('event_run_id', runId)
      .eq('student_id', session.subjectId)
      .maybeSingle();

    if (partErr || !participant) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }

    // 2. Load run info
    const { data: run, error: runErr } = await supabaseAdmin
      .from('event_runs')
      .select('template_id, status')
      .eq('id', runId)
      .maybeSingle();

    if (runErr || !run || run.status === 'closed') {
      return NextResponse.json({ error: 'Event run is not active' }, { status: 400 });
    }

    // 3. Load authoritative stage data
    const stageData = getRemedialStage(run.template_id, stageNum);
    if (!stageData) {
      return NextResponse.json({ error: 'Stage questions not found' }, { status: 404 });
    }

    // 4. Authoritative server evaluation
    let correctCount = 0;
    const reviewDetails: any[] = [];

    stageData.questions.forEach((q, idx) => {
      const selectedIdx = answers[idx];
      const isCorrect = selectedIdx === q.correctIndex;
      if (isCorrect) correctCount++;

      reviewDetails.push({
        id: q.id,
        prompt: q.prompt,
        selectedChoice: q.choices[selectedIdx] || '',
        correctChoice: q.choices[q.correctIndex] || '',
        isCorrect,
      });
    });

    const isPassed = correctCount >= 7;

    // 5. Update stage progress
    const { data: existingProg } = await supabaseAdmin
      .from('event_progress')
      .select('best_score, attempts, passed')
      .eq('event_run_id', runId)
      .eq('student_id', session.subjectId)
      .eq('stage_number', stageNum)
      .maybeSingle();

    const newAttempts = (existingProg?.attempts || 0) + 1;
    const newBest = Math.max(existingProg?.best_score || 0, correctCount);
    const hasEverPassed = Boolean(existingProg?.passed || isPassed);

    await supabaseAdmin
      .from('event_progress')
      .upsert({
        event_run_id: runId,
        student_id: session.subjectId,
        stage_number: stageNum,
        best_score: newBest,
        attempts: newAttempts,
        passed: hasEverPassed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event_run_id,student_id,stage_number' });

    // 6. Recount total passed stages for this student in this run
    const { data: allPassed } = await supabaseAdmin
      .from('event_progress')
      .select('stage_number')
      .eq('event_run_id', runId)
      .eq('student_id', session.subjectId)
      .eq('passed', true);

    const totalPassedStages = allPassed?.length || 0;
    const isEventFinished = totalPassedStages >= participant.target_stages;

    let newStatus = participant.status;
    let completedAt: string | null = null;
    let teacherSeen = true;

    if (isEventFinished) {
      newStatus = 'passed';
      completedAt = new Date().toISOString();
      teacherSeen = false; // Trigger new badge for teacher!
    } else if (participant.status === 'not_started') {
      newStatus = 'in_progress';
    }

    await supabaseAdmin
      .from('event_participants')
      .update({
        completed_stages: totalPassedStages,
        total_attempts: (participant.total_attempts || 0) + 1,
        status: newStatus,
        completed_at: completedAt || (participant.status === 'passed' ? undefined : null),
        teacher_seen: teacherSeen,
        updated_at: new Date().toISOString(),
      })
      .eq('id', participant.id);

    return NextResponse.json({
      success: true,
      stageNumber: stageNum,
      score: correctCount,
      targetPassScore: 7,
      passed: isPassed,
      completedStages: totalPassedStages,
      targetStages: participant.target_stages,
      isEventCompleted: isEventFinished,
      eventStatus: newStatus,
      reviewDetails,
    });
  } catch (err: any) {
    console.error('POST stage submit error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
