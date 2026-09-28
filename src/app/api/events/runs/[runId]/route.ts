import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getRemedialTemplate } from '@/lib/events/remedialEventsRegistry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { runId } = await params;

    // Load Event Run
    const { data: run, error: runErr } = await supabaseAdmin
      .from('event_runs')
      .select(`
        id,
        template_id,
        title,
        classroom_id,
        grade_level,
        status,
        created_at,
        classrooms (
          class_name
        )
      `)
      .eq('id', runId)
      .maybeSingle();

    if (runErr || !run) {
      return NextResponse.json({ error: 'Event Run not found' }, { status: 404 });
    }

    const template = getRemedialTemplate(run.template_id);
    if (!template) {
      return NextResponse.json({ error: 'Event template data not found' }, { status: 404 });
    }

    if (session.subjectType === 'STUDENT') {
      // 1. Verify student is participant
      const { data: participant, error: partErr } = await supabaseAdmin
        .from('event_participants')
        .select(`
          *,
          students (
            id,
            student_id,
            student_name,
            username,
            classroom_id,
            classrooms (
              class_name
            )
          )
        `)
        .eq('event_run_id', runId)
        .eq('student_id', session.subjectId)
        .maybeSingle();

      if (partErr || !participant) {
        return NextResponse.json({ error: 'You are not assigned to this event' }, { status: 403 });
      }

      // 2. Fetch student's stage progress for this run
      const { data: progressRows } = await supabaseAdmin
        .from('event_progress')
        .select('stage_number, best_score, attempts, passed')
        .eq('event_run_id', runId)
        .eq('student_id', session.subjectId);

      const passedStagesSet = new Set(
        (progressRows || []).filter(p => p.passed).map(p => p.stage_number)
      );

      // Determine stage statuses (1 to 15)
      // Stage 1 is always unlocked.
      // Stage N is unlocked if stage N-1 is passed.
      const stages = Array.from({ length: 15 }, (_, i) => {
        const stageNum = i + 1;
        const isPassed = passedStagesSet.has(stageNum);
        const isUnlocked = stageNum === 1 || passedStagesSet.has(stageNum - 1);
        const stageDetail = template.stages.find(s => s.stage === stageNum);
        const progress = (progressRows || []).find(p => p.stage_number === stageNum);

        return {
          stageNumber: stageNum,
          title: stageDetail?.title || `ด่านที่ ${stageNum}`,
          passed: isPassed,
          unlocked: isUnlocked,
          bestScore: progress?.best_score || 0,
          attempts: progress?.attempts || 0,
        };
      });

      const studentData = (participant as any).students || {};

      return NextResponse.json({
        success: true,
        run: {
          id: run.id,
          templateId: run.template_id,
          title: run.title,
          titleTh: template.titleTh,
          theme: template.theme,
          icon: template.icon,
          description: template.description,
          status: run.status,
          className: (run.classrooms as any)?.class_name || run.grade_level || '',
        },
        student: {
          id: studentData.id,
          name: studentData.student_name || session.user.name || 'นักเรียน',
          studentId: studentData.student_id || '',
          className: studentData.classrooms?.class_name || (run.classrooms as any)?.class_name || run.grade_level || '',
        },
        participant: {
          targetStages: participant.target_stages,
          completedStages: participant.completed_stages,
          status: participant.status,
          totalAttempts: participant.total_attempts,
          completedAt: participant.completed_at,
          isPassed: participant.status === 'passed',
        },
        stages,
      });
    }

    // ── Teacher / Admin view: Detailed inspection table ─────────────────────
    const { data: participants, error: partsErr } = await supabaseAdmin
      .from('event_participants')
      .select(`
        id,
        student_id,
        original_score,
        target_stages,
        completed_stages,
        status,
        total_attempts,
        completed_at,
        teacher_seen,
        updated_at,
        students (
          id,
          student_id,
          student_name,
          username,
          classroom_id,
          classrooms (
            class_name
          )
        )
      `)
      .eq('event_run_id', runId);

    if (partsErr) {
      console.error('Error loading participants for teacher:', partsErr);
      return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 });
    }

    const formattedParticipants = (participants || []).map((p: any) => {
      const student = p.students || {};
      const room = student.classrooms?.class_name || run.grade_level || '-';
      const displayName = student.student_name || student.username || student.student_id || 'ไม่ระบุชื่อ';

      return {
        id: p.id,
        studentId: p.student_id,
        name: displayName,
        studentCode: student.student_id || '-',
        className: room,
        originalScore: p.original_score,
        targetStages: p.target_stages,
        completedStages: p.completed_stages,
        totalAttempts: p.total_attempts,
        status: p.status, // 'not_started' | 'in_progress' | 'passed'
        teacherSeen: p.teacher_seen,
        completedAt: p.completed_at,
        lastActive: p.updated_at,
      };
    });

    const total = formattedParticipants.length;
    const passed = formattedParticipants.filter(p => p.status === 'passed').length;
    const inProgress = formattedParticipants.filter(p => p.status === 'in_progress').length;
    const notStarted = formattedParticipants.filter(p => p.status === 'not_started').length;
    const unread = formattedParticipants.filter(p => p.status === 'passed' && !p.teacherSeen).length;

    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        templateId: run.template_id,
        title: run.title,
        titleTh: template.titleTh,
        theme: template.theme,
        icon: template.icon,
        description: template.description,
        status: run.status,
        createdAt: run.created_at,
        className: (run.classrooms as any)?.class_name || run.grade_level || 'ทุกห้อง',
      },
      summary: {
        total,
        passed,
        inProgress,
        notStarted,
        unreadPassed: unread,
      },
      participants: formattedParticipants,
    });
  } catch (err: any) {
    console.error('GET /api/events/runs/[runId] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
