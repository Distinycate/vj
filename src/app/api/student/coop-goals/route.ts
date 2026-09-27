import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

/**
 * Weekly Co-op Goals (Class & School)
 *
 * Collective community progression:
 * - Classroom Goal: e.g. 300 correct answers by classroom members this week.
 * - School Goal: e.g. 2,000 correct answers by all school students this week.
 * - Idempotency guaranteed via grant_student_reward RPC and economy_transactions.
 */

function getWeekReference(): { startOfWeekISO: string; weekKey: string } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);

  const year = d.getUTCFullYear();
  // Get ISO week number
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getUTCDay() + 1) / 7);

  return {
    startOfWeekISO: d.toISOString(),
    weekKey: `${year}-W${String(weekNum).padStart(2, '0')}`,
  };
}

const CLASS_TARGET = 300;
const SCHOOL_TARGET = 2000;

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    const studentId = session.subjectId;

    // Load student's classroom and school
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select('id, classroom_id, school_name, classrooms(class_name)')
      .eq('id', studentId)
      .maybeSingle();

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const { startOfWeekISO, weekKey } = getWeekReference();
    const classroomId = student.classroom_id;

    // Fetch class members if classroom assigned
    let classroomMemberIds: string[] = [];
    if (classroomId) {
      const { data: classStudents } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('classroom_id', classroomId);

      if (classStudents) {
        classroomMemberIds = classStudents.map(s => s.id);
      }
    }

    // Query weekly stage results for school & class
    const { data: weeklyResults } = await supabaseAdmin
      .from('stage_results')
      .select('score, user_id')
      .gte('created_at', startOfWeekISO);

    let schoolScore = 0;
    let classScore = 0;

    if (weeklyResults && weeklyResults.length > 0) {
      for (const res of weeklyResults) {
        const pts = Number(res.score) || 0;
        schoolScore += pts;
        if (classroomMemberIds.includes(res.user_id)) {
          classScore += pts;
        }
      }
    }

    // Check if current student has already claimed rewards this week
    const classRef = `coop-class-${weekKey}-${classroomId || 'default'}`;
    const schoolRef = `coop-school-${weekKey}`;

    const { data: claims } = await supabaseAdmin
      .from('economy_transactions')
      .select('source, reference_id')
      .eq('student_id', studentId)
      .in('reference_id', [classRef, schoolRef]);

    const hasClaimedClass = (claims || []).some(c => c.reference_id === classRef);
    const hasClaimedSchool = (claims || []).some(c => c.reference_id === schoolRef);

    const isClassCompleted = classScore >= CLASS_TARGET;
    const isSchoolCompleted = schoolScore >= SCHOOL_TARGET;

    return NextResponse.json({
      success: true,
      weekKey,
      className: (student.classrooms as any)?.class_name || 'ห้องเรียนของฉัน',
      classGoal: {
        target: CLASS_TARGET,
        current: classScore,
        percent: Math.min(100, Math.round((classScore / CLASS_TARGET) * 100)),
        isCompleted: isClassCompleted,
        hasClaimed: hasClaimedClass,
        canClaim: isClassCompleted && !hasClaimedClass,
        rewardCoins: 50,
        rewardExp: 100,
      },
      schoolGoal: {
        target: SCHOOL_TARGET,
        current: schoolScore,
        percent: Math.min(100, Math.round((schoolScore / SCHOOL_TARGET) * 100)),
        isCompleted: isSchoolCompleted,
        hasClaimed: hasClaimedSchool,
        canClaim: isSchoolCompleted && !hasClaimedSchool,
        rewardCoins: 100,
        rewardExp: 200,
        rewardTickets: 1,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Co-op goals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const claimSchema = z.object({
  goalType: z.enum(['class', 'school']),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    const studentId = session.subjectId;

    const body = await request.json().catch(() => null);
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid claim payload' }, { status: 400 });
    }

    const { goalType } = parsed.data;
    const { startOfWeekISO, weekKey } = getWeekReference();

    // Verify student and classroom
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, classroom_id')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const classroomId = student.classroom_id;

    // Verify current score
    const { data: weeklyResults } = await supabaseAdmin
      .from('stage_results')
      .select('score, user_id')
      .gte('created_at', startOfWeekISO);

    let schoolScore = 0;
    let classScore = 0;

    let classroomMemberIds: string[] = [];
    if (classroomId) {
      const { data: classStudents } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('classroom_id', classroomId);
      if (classStudents) classroomMemberIds = classStudents.map(s => s.id);
    }

    if (weeklyResults) {
      for (const res of weeklyResults) {
        const pts = Number(res.score) || 0;
        schoolScore += pts;
        if (classroomMemberIds.includes(res.user_id)) {
          classScore += pts;
        }
      }
    }

    let source = '';
    let referenceId = '';
    let coinsDelta = 0;
    let expDelta = 0;
    let ticketsDelta = 0;

    if (goalType === 'class') {
      if (classScore < CLASS_TARGET) {
        return NextResponse.json({ error: 'ภารกิจห้องเรียนยังไม่สำเร็จ' }, { status: 400 });
      }
      source = 'COOP_CLASS_GOAL';
      referenceId = `coop-class-${weekKey}-${classroomId || 'default'}`;
      coinsDelta = 50;
      expDelta = 100;
    } else {
      if (schoolScore < SCHOOL_TARGET) {
        return NextResponse.json({ error: 'ภารกิจโรงเรียนยังไม่สำเร็จ' }, { status: 400 });
      }
      source = 'COOP_SCHOOL_GOAL';
      referenceId = `coop-school-${weekKey}`;
      coinsDelta = 100;
      expDelta = 200;
      ticketsDelta = 1;
    }

    // Call atomic grant_student_reward RPC
    const { data: rewardData, error: rpcErr } = await supabaseAdmin.rpc('grant_student_reward', {
      p_student_id: studentId,
      p_source: source,
      p_reference_id: referenceId,
      p_coins_delta: coinsDelta,
      p_exp_delta: expDelta,
      p_tickets_delta: ticketsDelta,
      p_metadata: { goalType, weekKey },
    });

    if (rpcErr || !rewardData) {
      console.error('grant_student_reward error:', rpcErr);
      return NextResponse.json({ error: 'Failed to claim reward' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alreadyGranted: rewardData.already_granted || false,
      newCoins: rewardData.coins,
      newTotalExp: rewardData.total_exp,
      newTickets: rewardData.free_pull_tickets,
      message: rewardData.already_granted
        ? 'คุณได้รับรางวัลของสัปดาห์นี้ไปแล้ว'
        : 'รับรางวัลรวมพลังสำเร็จ! ยินดีด้วยครับ 🎉',
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Co-op goals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
