import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { REMEDIAL_TEMPLATES, getRemedialTemplate, calculateTargetStages } from '@/lib/events/remedialEventsRegistry';

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();

    if (session.subjectType === 'STUDENT') {
      // Students only see event runs where they are an assigned participant
      const { data: participations, error: partErr } = await supabaseAdmin
        .from('event_participants')
        .select(`
          id,
          event_run_id,
          original_score,
          target_stages,
          completed_stages,
          status,
          total_attempts,
          completed_at,
          event_runs (
            id,
            template_id,
            title,
            grade_level,
            status,
            created_at
          )
        `)
        .eq('student_id', session.subjectId);

      if (partErr) {
        console.error('Failed to load student event participations:', partErr);
        return NextResponse.json({ success: true, runs: [] });
      }

      const activeRuns = (participations || [])
        .filter((p: any) => p.event_runs && p.event_runs.status !== 'closed')
        .map((p: any) => {
          const tmpl = getRemedialTemplate(p.event_runs.template_id);
          return {
            runId: p.event_runs.id,
            templateId: p.event_runs.template_id,
            title: p.event_runs.title,
            theme: tmpl?.theme || 'General',
            icon: tmpl?.icon || '⭐',
            titleTh: tmpl?.titleTh || p.event_runs.title,
            gradeLevel: p.event_runs.grade_level,
            status: p.status, // 'not_started' | 'in_progress' | 'passed'
            targetStages: p.target_stages,
            completedStages: p.completed_stages,
            totalAttempts: p.total_attempts,
            completedAt: p.completed_at,
            createdAt: p.event_runs.created_at,
          };
        });

      return NextResponse.json({ success: true, runs: activeRuns });
    }

    // Teacher / Admin: load all runs with stats
    const { data: runs, error: runsErr } = await supabaseAdmin
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
        ),
        event_participants (
          id,
          status,
          teacher_seen
        )
      `)
      .order('created_at', { ascending: false });

    if (runsErr) {
      console.error('Failed to load runs for teacher:', runsErr);
      return NextResponse.json({ success: true, runs: [], templates: REMEDIAL_TEMPLATES });
    }

    let unreadCount = 0;
    const formattedRuns = (runs || []).map((r: any) => {
      const parts = r.event_participants || [];
      const total = parts.length;
      const passed = parts.filter((p: any) => p.status === 'passed').length;
      const inProgress = parts.filter((p: any) => p.status === 'in_progress').length;
      const notStarted = parts.filter((p: any) => p.status === 'not_started').length;
      const unread = parts.filter((p: any) => p.status === 'passed' && p.teacher_seen === false).length;
      unreadCount += unread;

      const tmpl = getRemedialTemplate(r.template_id);

      return {
        id: r.id,
        templateId: r.template_id,
        title: r.title,
        titleTh: tmpl?.titleTh || r.title,
        theme: tmpl?.theme || 'General',
        icon: tmpl?.icon || '⭐',
        className: r.classrooms?.class_name || r.grade_level || 'ทั่วไป',
        status: r.status,
        createdAt: r.created_at,
        summary: {
          total,
          passed,
          inProgress,
          notStarted,
          unreadPassed: unread,
        },
      };
    });

    return NextResponse.json({
      success: true,
      runs: formattedRuns,
      unreadPassedTotal: unreadCount,
      templates: REMEDIAL_TEMPLATES.map(t => ({
        eventId: t.eventId,
        title: t.title,
        titleTh: t.titleTh,
        theme: t.theme,
        icon: t.icon,
        description: t.description,
        stageCount: t.rules.stageCount,
      })),
    });
  } catch (err: any) {
    console.error('GET /api/events/runs error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

const createRunSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1),
  classroomId: z.string().uuid().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  participants: z.array(
    z.object({
      studentId: z.string().uuid(),
      originalScore: z.number().nullable().optional(),
      targetStages: z.number().int().min(1).max(15).optional(),
    })
  ).min(1, 'ต้องเลือกนักเรียนอย่างน้อย 1 คน'),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.subjectType !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can create event runs' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const { templateId, title, classroomId, gradeLevel, participants } = parsed.data;

    // Verify template exists
    const template = getRemedialTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // 1. Create Event Run
    const { data: run, error: runErr } = await supabaseAdmin
      .from('event_runs')
      .insert({
        template_id: templateId,
        title,
        classroom_id: classroomId || null,
        grade_level: gradeLevel || null,
        status: 'active',
        created_by: session.subjectId,
      })
      .select('id')
      .single();

    if (runErr || !run) {
      console.error('Error inserting event_run:', runErr);
      return NextResponse.json({ error: 'Failed to create event run' }, { status: 500 });
    }

    // 2. Insert Participants
    const participantRows = participants.map(p => {
      const derivedTarget = p.targetStages && p.targetStages >= 1 && p.targetStages <= 15
        ? p.targetStages
        : calculateTargetStages(p.originalScore);

      return {
        event_run_id: run.id,
        student_id: p.studentId,
        original_score: p.originalScore ?? null,
        target_stages: derivedTarget,
        completed_stages: 0,
        status: 'not_started',
        total_attempts: 0,
        teacher_seen: true,
      };
    });

    const { error: partErr } = await supabaseAdmin
      .from('event_participants')
      .insert(participantRows);

    if (partErr) {
      console.error('Error inserting event_participants:', partErr);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      participantsCount: participantRows.length,
    });
  } catch (err: any) {
    console.error('POST /api/events/runs error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
