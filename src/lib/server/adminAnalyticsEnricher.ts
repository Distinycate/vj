import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Enriches student records (with learning_paths & analytics_summary relations)
 * using live V3 gameplay (stage_attempts, student_stage_progress) and assessment
 * tables (pre_tests, post_tests) so Admin dashboards always display accurate,
 * up-to-date metrics without mutating student gameplay state.
 */
export async function enrichStudentsWithLiveMetrics(students: any[]): Promise<any[]> {
  if (!Array.isArray(students) || students.length === 0) return [];

  const studentIds = students.map((s) => s.id).filter(Boolean);
  if (studentIds.length === 0) return students;

  const [
    { data: preRows },
    { data: postRows },
    { data: stageAttempts },
    { data: stageProgress },
    { data: legacyAttempts },
  ] = await Promise.all([
    supabaseAdmin
      .from('pre_tests')
      .select('student_id, score, total_questions, time_spent_sec, created_at')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('post_tests')
      .select('student_id, score, total_questions, time_spent_sec, created_at')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('stage_attempts')
      .select('student_id, stage_number, status, score, accuracy, stars, started_at, completed_at, question_ids')
      .in('student_id', studentIds)
      .order('started_at', { ascending: false }),
    supabaseAdmin
      .from('student_stage_progress')
      .select('student_id, stage_number, best_stars, best_accuracy, latest_accuracy, attempt_count, completed, last_played_at')
      .in('student_id', studentIds),
    supabaseAdmin
      .from('attempts')
      .select('student_id, score, total_questions, time_spent_sec, is_passed, created_at')
      .in('student_id', studentIds),
  ]);

  const preByStudent = new Map<string, any[]>();
  for (const row of preRows || []) {
    const list = preByStudent.get(row.student_id) || [];
    list.push(row);
    preByStudent.set(row.student_id, list);
  }

  const postByStudent = new Map<string, any[]>();
  for (const row of postRows || []) {
    const list = postByStudent.get(row.student_id) || [];
    list.push(row);
    postByStudent.set(row.student_id, list);
  }

  const stageAttByStudent = new Map<string, any[]>();
  for (const row of stageAttempts || []) {
    const list = stageAttByStudent.get(row.student_id) || [];
    list.push(row);
    stageAttByStudent.set(row.student_id, list);
  }

  const stageProgByStudent = new Map<string, any[]>();
  for (const row of stageProgress || []) {
    const list = stageProgByStudent.get(row.student_id) || [];
    list.push(row);
    stageProgByStudent.set(row.student_id, list);
  }

  const legacyAttByStudent = new Map<string, any[]>();
  for (const row of legacyAttempts || []) {
    const list = legacyAttByStudent.get(row.student_id) || [];
    list.push(row);
    legacyAttByStudent.set(row.student_id, list);
  }

  const normalizeTo25 = (score: number, total: number) => {
    const t = Number(total) > 0 ? Number(total) : 25;
    return (Number(score || 0) / t) * 25;
  };

  return students.map((student) => {
    const rawAn = Array.isArray(student.analytics_summary)
      ? student.analytics_summary[0]
      : student.analytics_summary;
    const rawLp = Array.isArray(student.learning_paths)
      ? student.learning_paths[0]
      : student.learning_paths;

    const sPre = preByStudent.get(student.id) || [];
    const sPost = postByStudent.get(student.id) || [];
    const sStageAtt = stageAttByStudent.get(student.id) || [];
    const sCompletedStageAtt = sStageAtt.filter((a) => a.status === 'COMPLETED');
    const sStageProg = stageProgByStudent.get(student.id) || [];
    const sLegacyAtt = legacyAttByStudent.get(student.id) || [];

    // 1. Pre-test score (25-point scale)
    let pretestScore = Number(rawAn?.pretest_score || 0);
    if (pretestScore <= 0 && sPre.length > 0) {
      const latest5 = sPre.slice(0, 5);
      const avg25 =
        latest5.reduce((sum, r) => sum + normalizeTo25(r.score, r.total_questions), 0) /
        latest5.length;
      pretestScore = Math.round(avg25);
    }

    // 2. Post-test score (25-point scale)
    let posttestScore = Number(rawAn?.posttest_score || 0);
    if (posttestScore <= 0 && sPost.length > 0) {
      const latestPost = sPost[0];
      posttestScore = Math.round(normalizeTo25(latestPost.score, latestPost.total_questions));
    }

    // 3. Attempt count
    const progAttemptSum = sStageProg.reduce((sum, p) => sum + Number(p.attempt_count || 0), 0);
    const attemptCount = Math.max(
      Number(rawAn?.attempt_count || 0),
      sCompletedStageAtt.length + sLegacyAtt.length,
      progAttemptSum
    );

    // 4. Accuracy (success_rate %)
    let successRate = Number(rawAn?.success_rate || 0);
    if (sCompletedStageAtt.length > 0) {
      const avgV3Acc =
        sCompletedStageAtt.reduce((sum, a) => sum + Number(a.accuracy || 0), 0) /
        sCompletedStageAtt.length;
      if (successRate <= 0 || avgV3Acc > 0) {
        successRate = Math.round(avgV3Acc);
      }
    } else if (successRate <= 0 && sStageProg.length > 0) {
      const avgProgAcc =
        sStageProg.reduce((sum, p) => sum + Number(p.latest_accuracy ?? p.best_accuracy ?? 0), 0) /
        sStageProg.length;
      successRate = Math.round(avgProgAcc);
    } else if (successRate <= 0 && sLegacyAtt.length > 0) {
      const totalQ = sLegacyAtt.reduce((sum, a) => sum + Number(a.total_questions || 0), 0);
      const totalC = sLegacyAtt.reduce((sum, a) => sum + Number(a.score || 0), 0);
      if (totalQ > 0) successRate = Math.round((totalC / totalQ) * 100);
    }

    // 5. Learning gain (only when posttestScore > 0)
    let learningGain = Number(rawAn?.learning_gain ?? 0);
    let normalizedGain = Number(rawAn?.normalized_gain ?? 0);
    if (posttestScore > 0 && pretestScore < 25) {
      const hake = Math.round(((posttestScore - pretestScore) / Math.max(1, 25 - pretestScore)) * 100);
      if (!learningGain) learningGain = hake;
      if (!normalizedGain) normalizedGain = hake;
    } else if (posttestScore <= 0) {
      learningGain = 0;
      normalizedGain = 0;
    }

    // 6. Total time on task (seconds)
    const v3TimeSec = sCompletedStageAtt.reduce((sum, a) => {
      if (a.started_at && a.completed_at) {
        const diff = Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000);
        if (diff > 0 && diff < 3600) return sum + diff;
      }
      const qCount = Array.isArray(a.question_ids) ? a.question_ids.length : 10;
      return sum + qCount * 6;
    }, 0);
    const legacyTimeSec = sLegacyAtt.reduce((sum, a) => sum + Number(a.time_spent_sec || 0), 0);
    const totalTimeSec = Math.max(
      Number(rawAn?.total_time_on_task_sec || 0),
      v3TimeSec + legacyTimeSec
    );

    // 7. Last active timestamp
    const candidateDates: number[] = [];
    const pushDate = (d: any) => {
      if (!d) return;
      const t = new Date(d).getTime();
      if (Number.isFinite(t) && t > 0) candidateDates.push(t);
    };
    pushDate(rawLp?.last_active_date);
    pushDate(rawAn?.last_updated_at);
    if (sPre[0]) pushDate(sPre[0].created_at);
    if (sPost[0]) pushDate(sPost[0].created_at);
    if (sStageAtt[0]) pushDate(sStageAtt[0].completed_at || sStageAtt[0].started_at);
    for (const p of sStageProg) pushDate(p.last_played_at);
    if (sLegacyAtt[0]) pushDate(sLegacyAtt[0].created_at);

    const latestTs = candidateDates.length > 0 ? Math.max(...candidateDates) : null;
    const lastActiveIso = latestTs ? new Date(latestTs).toISOString() : (rawLp?.last_active_date || null);

    // 8. Authoritative current_stage from V3 student_stage_progress
    const completedStageNums = sStageProg.filter((p) => p.completed).map((p) => Number(p.stage_number));
    const maxCompletedStage = completedStageNums.length > 0 ? Math.max(...completedStageNums) : 0;
    const currentStage =
      maxCompletedStage > 0
        ? Math.min(100, Math.max(Number(rawLp?.current_stage || 1), maxCompletedStage + 1))
        : Number(rawLp?.current_stage || 1);

    const enrichedAn = {
      ...(rawAn || {}),
      student_id: student.id,
      pretest_score: pretestScore,
      posttest_score: posttestScore,
      pretest_count: sPre.length,
      posttest_count: sPost.length,
      learning_gain: learningGain,
      normalized_gain: normalizedGain,
      success_rate: successRate,
      attempt_count: attemptCount,
      total_time_on_task_sec: totalTimeSec,
      last_updated_at: lastActiveIso,
    };

    const enrichedLp = {
      ...(rawLp || {}),
      student_id: student.id,
      current_stage: currentStage,
      current_rank: Number(rawLp?.current_rank || 1),
      coins: Number(rawLp?.coins || 0),
      exp: Number(rawLp?.exp || rawLp?.total_exp || 0),
      total_exp: Number(rawLp?.total_exp || rawLp?.exp || 0),
      free_pull_tickets: Number(rawLp?.free_pull_tickets || 0),
      last_active_date: lastActiveIso,
    };

    return {
      ...student,
      analytics_summary: Array.isArray(student.analytics_summary) ? [enrichedAn] : enrichedAn,
      learning_paths: Array.isArray(student.learning_paths) ? [enrichedLp] : enrichedLp,
    };
  });
}

