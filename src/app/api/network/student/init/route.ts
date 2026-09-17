import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { isStageUnlocked } from '@/lib/progression/unlockRules';

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    // STRICT EXTERNAL ENFORCEMENT
    if (session.user.userType !== 'EXTERNAL') {
      return NextResponse.json(
        { error: 'Forbidden: บัญชีนี้ไม่ใช่นักเรียนโรงเรียนเครือข่าย' },
        { status: 403 }
      );
    }

    const studentId = session.subjectId;

    // Parallel fetch only minimal required learning entities
    const [
      { data: student, error: studentErr },
      { data: learningPath },
      { data: preTests },
      { data: postTests },
      { data: stageResults },
      { data: stageProgressRows },
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, student_id, student_name, username, school_name, grade_level, room_number, classroom_id, user_type, is_active, classrooms(class_name)')
        .eq('id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('learning_paths')
        .select('current_stage, current_rank, campaign_completed_at')
        .eq('student_id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('pre_tests')
        .select('score, total_questions, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('post_tests')
        .select('score, total_questions, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('stage_results')
        .select('stage_number, stars, accuracy, passed')
        .eq('user_id', studentId),
      supabaseAdmin
        .from('student_stage_progress')
        .select('stage_number, best_stars, completed')
        .eq('student_id', studentId),
    ]);

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const hasCompletedPreTest = (preTests && preTests.length > 0) || false;
    const hasCompletedPostTest = (postTests && postTests.length > 0) || false;
    const legacyCurrentStage = learningPath?.current_stage || 1;

    // Build stage stars map
    const stageStarsMap: Record<number, number> = {};
    const completedStagesSet = new Set<number>();

    // 1. From student_stage_progress (if exists)
    if (stageProgressRows && stageProgressRows.length > 0) {
      for (const row of stageProgressRows) {
        if (row.completed) {
          completedStagesSet.add(row.stage_number);
        }
        stageStarsMap[row.stage_number] = Math.max(stageStarsMap[row.stage_number] || 0, row.best_stars || 0);
      }
    }

    // 2. From stage_results (fallback/supplement)
    if (stageResults && stageResults.length > 0) {
      for (const row of stageResults) {
        const sNum = Number(row.stage_number);
        if (!sNum) continue;
        const stars = Number(row.stars) || (row.passed ? 1 : 0);
        stageStarsMap[sNum] = Math.max(stageStarsMap[sNum] || 0, stars);
        if (row.passed || stars > 0) {
          completedStagesSet.add(sNum);
        }
      }
    }

    // Calculate total stars
    const totalStars = Object.values(stageStarsMap).reduce((sum, s) => sum + s, 0);

    // Compute unlocked stages
    const unlockedStages: number[] = [];
    for (let s = 1; s <= 100; s++) {
      if (
        isStageUnlocked({
          targetStageNumber: s,
          completedStages: completedStagesSet.size > 0 ? completedStagesSet : null,
          legacyCurrentStage,
        })
      ) {
        unlockedStages.push(s);
      }
    }

    const classroomName = Array.isArray(student.classrooms)
      ? student.classrooms[0]?.class_name
      : (student.classrooms as any)?.class_name || null;

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentId: student.student_id,
        studentName: student.student_name,
        username: student.username,
        schoolName: student.school_name || 'โรงเรียนเครือข่าย',
        classroomName: classroomName || (student.grade_level ? `${student.grade_level}/${student.room_number || ''}` : 'ห้องเรียน'),
        gradeLevel: student.grade_level,
        roomNumber: student.room_number,
        userType: 'EXTERNAL',
      },
      progression: {
        currentStage: legacyCurrentStage,
        totalStars,
        stageStarsMap,
        unlockedStages,
        campaignCompleted: learningPath?.campaign_completed_at != null || completedStagesSet.has(100),
      },
      assessment: {
        hasCompletedPreTest,
        hasCompletedPostTest,
        preTestCount: preTests?.length || 0,
        latestPreTest: preTests && preTests.length > 0 ? preTests[preTests.length - 1] : null,
        latestPostTest: postTests && postTests.length > 0 ? postTests[postTests.length - 1] : null,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Network student init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
