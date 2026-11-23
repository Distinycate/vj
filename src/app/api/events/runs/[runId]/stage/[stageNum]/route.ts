import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getRemedialStage } from '@/lib/events/remedialEventsRegistry';

async function verifyStageAccess(runId: string, studentId: string, stageNum: number, targetStages: number) {
  if (stageNum > targetStages) return NextResponse.json({ error: 'ด่านนี้อยู่นอกชุดกิจกรรมของนักเรียน' }, { status: 403 });
  if (stageNum <= 1) return null;
  const { data, error } = await supabaseAdmin.from('event_progress')
    .select('passed').eq('event_run_id', runId).eq('student_id', studentId)
    .eq('stage_number', stageNum - 1).maybeSingle();
  if (error) throw error;
  return data?.passed ? null : NextResponse.json({ error: 'กรุณาผ่านด่านก่อนหน้า' }, { status: 403 });
}

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
    const stageNum = Number(stageNumStr);
    if (!Number.isInteger(stageNum) || stageNum < 1 || stageNum > 15) {
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

    if (runErr || !run || run.status !== 'active') {
      return NextResponse.json({ error: 'Event run is not active' }, { status: 400 });
    }

    // 3. Verify unlock status
    const denied = await verifyStageAccess(runId, session.subjectId, stageNum, participant.target_stages);
    if (denied) return denied;

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
  answers: z.array(z.number().int().min(0).max(3).nullable()).length(10),
  submissionId: z.string().uuid().optional(),
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
    const stageNum = Number(stageNumStr);
    if (!Number.isInteger(stageNum) || stageNum < 1 || stageNum > 15) {
      return NextResponse.json({ error: 'Invalid stage number' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = submitAnswersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid answers', details: parsed.error.issues }, { status: 400 });
    }

    const { answers, submissionId } = parsed.data;

    // 2. Load run info
    const { data: run, error: runErr } = await supabaseAdmin
      .from('event_runs')
      .select('template_id')
      .eq('id', runId)
      .maybeSingle();

    if (runErr) throw runErr;
    if (!run) {
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
        selectedChoice: selectedIdx == null ? '' : (q.choices[selectedIdx] || ''),
        correctChoice: q.choices[q.correctIndex] || '',
        isCorrect,
      });
    });

    const isPassed = correctCount >= 7;

    const { data: saved, error: saveError } = await supabaseAdmin.rpc('submit_remedial_stage_v1', {
      p_run_id: runId,
      p_student_id: session.subjectId,
      p_template_id: run.template_id,
      p_stage: stageNum,
      p_score: correctCount,
      // Tabs opened before release still submit the original payload.
      p_submission_id: submissionId ?? randomUUID(),
    });
    if (saveError || !saved) throw saveError ?? new Error('Missing remedial result');
    if (saved.error) {
      switch (saved.error) {
        case 'LOCKED':
          return NextResponse.json({ error: 'กรุณาผ่านด่านก่อนหน้า' }, { status: 403 });
        case 'OUT_OF_RANGE':
        case 'NOT_ASSIGNED':
          return NextResponse.json({ error: 'ด่านนี้ไม่อยู่ในชุดกิจกรรมของนักเรียน' }, { status: 403 });
        case 'INACTIVE':
          return NextResponse.json({ error: 'กิจกรรมนี้ไม่ได้เปิดให้ส่งผลแล้ว' }, { status: 409 });
        case 'ATTEMPT_CONFLICT':
          return NextResponse.json({ error: 'คำตอบไม่ตรงกับการส่งครั้งก่อน กรุณาเริ่มทำด่านใหม่' }, { status: 409 });
        default:
          return NextResponse.json({ error: 'ข้อมูลผลด่านไม่ถูกต้อง' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      stageNumber: stageNum,
      score: correctCount,
      targetPassScore: 7,
      passed: isPassed,
      completedStages: saved.completedStages,
      targetStages: saved.targetStages,
      isEventCompleted: saved.isEventCompleted,
      eventStatus: saved.eventStatus,
      reviewDetails,
    });
  } catch (err) {
    console.error('POST stage submit error:', err);
    return NextResponse.json({ error: 'บันทึกผลไม่สำเร็จ กรุณาลองส่งอีกครั้ง' }, { status: 500 });
  }
}
