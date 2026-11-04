import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import { summarizePretests } from '@/lib/assessmentState';

export async function loadAssessmentProgress(studentId: string, isExternal: boolean) {
  const [path, pre, post] = await Promise.all([
    supabaseAdmin.from('learning_paths').select('*').eq('student_id', studentId).maybeSingle(),
    supabaseAdmin.from('pre_tests').select('id, score, total_questions, time_spent_sec, created_at').eq('student_id', studentId).order('created_at', { ascending: false }),
    supabaseAdmin.from('post_tests').select('id, score, total_questions, time_spent_sec, created_at').eq('student_id', studentId).order('created_at', { ascending: false }),
  ]);
  if (path.error) throw path.error;
  if (pre.error) throw pre.error;
  if (post.error) throw post.error;
  const summary = summarizePretests(pre.data || [], isExternal ? 1 : 5);
  return {
    pretests: pre.data || [],
    posttests: post.data || [],
    summary,
    epoch: (path.data as any)?.assessment_epoch || '00000000-0000-0000-0000-000000000000',
    progress: {
      ...(path.data || { current_stage: 1, coins: 0, exp: 0, total_exp: 0, current_rank: 1 }),
      // External onboarding remains optional; INTERNAL completion is based only on saved tests.
      pretest_date: isExternal ? (summary.completedAt || new Date().toISOString()) : summary.completedAt,
      pretest_score: summary.score,
      pretest_count: summary.count,
      posttest_score: post.data?.[0] ? post.data[0].score / post.data[0].total_questions * 25 : null,
      posttest_date: post.data?.[0]?.created_at || null,
    },
  };
}
