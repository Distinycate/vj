import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { calculateNormalizedGain } from '@/utils/analyticsUtils';

const assessmentSchema = z.object({
  type: z.enum(['PRE_TEST', 'POST_TEST']),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  timeSpentSec: z.number().int().min(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit assessments' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = assessmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid assessment payload' }, { status: 400 });
    }

    const { type, score, totalQuestions, timeSpentSec } = parsed.data;
    const studentId = session.subjectId;

    if (type === 'PRE_TEST') {
      // 1. Insert into pre_tests table
      await supabaseAdmin.from('pre_tests').insert([{
        student_id: studentId,
        score,
        total_questions: totalQuestions,
        time_spent_sec: timeSpentSec,
      }]);

      // 2. Query previous pretests to see total completed
      const { data: allPretests } = await supabaseAdmin
        .from('pre_tests')
        .select('score, time_spent_sec')
        .eq('student_id', studentId);

      const count = allPretests?.length || 1;
      let completedAll = false;
      let newRank = 1;
      let newStage = 1;

      if (count >= 5) {
        completedAll = true;
        const totalScore = (allPretests || []).reduce((sum, p) => sum + Number(p.score || 0), 0);
        const avgScore = totalScore / count;

        if (avgScore >= 20) { newRank = 5; newStage = 41; }
        else if (avgScore >= 15) { newRank = 4; newStage = 31; }
        else if (avgScore >= 10) { newRank = 3; newStage = 21; }
        else if (avgScore >= 5) { newRank = 2; newStage = 11; }
        else { newRank = 1; newStage = 1; }

        await supabaseAdmin
          .from('learning_paths')
          .update({
            initial_rank: newRank,
            current_rank: newRank,
            current_stage: newStage,
            last_active_date: new Date().toISOString(),
          })
          .eq('student_id', studentId);

        const totalDuration = (allPretests || []).reduce((sum, p) => sum + Number(p.time_spent_sec || 0), 0);

        const { data: analytics } = await supabaseAdmin
          .from('analytics_summary')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();

        await supabaseAdmin.from('analytics_summary').upsert({
          student_id: studentId,
          pretest_score: avgScore,
          total_time_on_task_sec: Number(analytics?.total_time_on_task_sec || 0) + totalDuration,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });

        // Ensure stage is unlocked and insert initial attempt
        const { data: stageRecord } = await supabaseAdmin
          .from('stages')
          .select('id')
          .eq('stage_number', newStage)
          .limit(1);

        if (stageRecord && stageRecord.length > 0) {
          const stageId = stageRecord[0].id;
          await supabaseAdmin.from('attempts').insert([{
            student_id: studentId,
            stage_id: stageId,
            score: 0,
            total_questions: 10,
            time_spent_sec: 0,
            is_passed: false
          }]);
        }
      }

      return NextResponse.json({
        success: true,
        completedAll,
        count,
        newRank: completedAll ? newRank : undefined,
        newStage: completedAll ? newStage : undefined,
      });
    } else {
      // POST_TEST
      await supabaseAdmin.from('post_tests').insert([{
        student_id: studentId,
        score,
        total_questions: totalQuestions,
        time_spent_sec: timeSpentSec,
      }]);

      const { data: analytics } = await supabaseAdmin
        .from('analytics_summary')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      const preScore = Number(analytics?.pretest_score || 0);
      const postScore = score;
      const normalizedGain = calculateNormalizedGain(preScore, postScore, totalQuestions);
      const absoluteGain = postScore - preScore;

      await supabaseAdmin.from('analytics_summary').upsert({
        student_id: studentId,
        posttest_score: postScore,
        learning_gain: absoluteGain,
        normalized_gain: normalizedGain,
        total_time_on_task_sec: Number(analytics?.total_time_on_task_sec || 0) + timeSpentSec,
        last_updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });

      await supabaseAdmin
        .from('learning_paths')
        .update({
          posttest_date: new Date().toISOString(),
          last_active_date: new Date().toISOString(),
        })
        .eq('student_id', studentId);

      return NextResponse.json({
        success: true,
        preScore,
        postScore,
        normalizedGain,
        absoluteGain,
      });
    }
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Assessment submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
