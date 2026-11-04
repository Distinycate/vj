import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { loadAssessmentProgress } from '@/lib/server/assessmentProgress';

const assessmentSchema = z.object({
  type: z.enum(['PRE_TEST', 'POST_TEST']),
  submissionId: z.string().uuid().optional(),
  epoch: z.string().uuid().optional(),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1).max(500),
  timeSpentSec: z.number().int().min(0).max(86400),
}).refine(body => body.score <= body.totalQuestions);

export async function GET() {
  try {
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const state = await loadAssessmentProgress(session.subjectId, session.user.userType === 'EXTERNAL');
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const status = error?.status === 401 || error?.status === 403 ? error.status : 500;
    console.error('Assessment state error:', error);
    return NextResponse.json({ error: 'โหลดสถานะข้อสอบไม่สำเร็จ กรุณาลองใหม่' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const parsed = assessmentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลข้อสอบไม่ครบ กรุณาโหลดหน้าใหม่ก่อนสอบ' }, { status: 400 });
    const { type, score, totalQuestions, timeSpentSec } = parsed.data;
    const submissionId = parsed.data.submissionId || crypto.randomUUID();

    const isExternal = session.user.userType === 'EXTERNAL';
    const requiredRounds = isExternal ? 1 : 5;

    if (type === 'PRE_TEST') {
      const [insertRes, fetchRes, lpRes, analyticsRes] = await Promise.all([
        supabaseAdmin.from('pre_tests').upsert([{
          id: submissionId,
          student_id: session.subjectId,
          score,
          total_questions: totalQuestions,
          time_spent_sec: timeSpentSec,
        }], { onConflict: 'id', ignoreDuplicates: true }),
        supabaseAdmin.from('pre_tests')
          .select('id, score, total_questions, time_spent_sec, created_at')
          .eq('student_id', session.subjectId)
          .order('created_at', { ascending: true }),
        supabaseAdmin.from('learning_paths')
          .select('current_stage, current_rank')
          .eq('student_id', session.subjectId)
          .maybeSingle(),
        supabaseAdmin.from('analytics_summary')
          .select('total_time_on_task_sec')
          .eq('student_id', session.subjectId)
          .maybeSingle(),
      ]);
      if (insertRes.error) throw insertRes.error;
      if (fetchRes.error) throw fetchRes.error;

      const existing = fetchRes.data || [];
      const allPre = existing.some(r => r.id === submissionId)
        ? existing
        : [...existing, { id: submissionId, score, total_questions: totalQuestions, time_spent_sec: timeSpentSec, created_at: new Date().toISOString() }];
      const lp = lpRes.data;
      const analytics = analyticsRes.data;

      const count = allPre.length || 1;
      const completedAll = count >= requiredRounds;
      const recentTests = allPre.slice(-requiredRounds);
      const totalScore = recentTests.reduce((sum, p) => sum + (Number(p.score) / (p.total_questions || 25) * 25), 0);
      const preScore = recentTests.length > 0 ? Math.round((totalScore / recentTests.length) * 10) / 10 : score;
      const nowIso = new Date().toISOString();

      await Promise.all([
        supabaseAdmin.from('learning_paths').update({
          last_active_date: nowIso,
        }).eq('student_id', session.subjectId),
        completedAll
          ? supabaseAdmin.from('analytics_summary').upsert({
              student_id: session.subjectId,
              pretest_score: Math.round(preScore),
              total_time_on_task_sec: Number(analytics?.total_time_on_task_sec || 0) + timeSpentSec,
              last_updated_at: nowIso,
            }, { onConflict: 'student_id' })
          : Promise.resolve(),
      ]);

      return NextResponse.json({
        success: true,
        count,
        completedAll,
        preScore,
        postScore: null,
        newStage: lp?.current_stage || 1,
        newRank: lp?.current_rank || 1,
      });
    } else {
      // POST_TEST
      const [postRes, preRes, analyticsRes, lpRes] = await Promise.all([
        supabaseAdmin.from('post_tests').upsert([{
          id: submissionId,
          student_id: session.subjectId,
          score,
          total_questions: totalQuestions,
          time_spent_sec: timeSpentSec,
        }], { onConflict: 'id', ignoreDuplicates: true }),
        supabaseAdmin.from('pre_tests').select('score, total_questions').eq('student_id', session.subjectId),
        supabaseAdmin.from('analytics_summary').select('*').eq('student_id', session.subjectId).maybeSingle(),
        supabaseAdmin.from('learning_paths').select('current_stage, current_rank').eq('student_id', session.subjectId).maybeSingle(),
      ]);
      if (postRes.error) throw postRes.error;
      const preTests = preRes.data;
      const analytics = analyticsRes.data;
      const lp = lpRes.data;

      const recentPre = preTests ? preTests.slice(-requiredRounds) : [];
      const preScore = recentPre.length > 0
        ? Math.round((recentPre.reduce((s, p) => s + (Number(p.score) / (p.total_questions || 25) * 25), 0) / recentPre.length) * 10) / 10
        : Number(analytics?.pretest_score || 0);
      const postScore = Math.round(((score / totalQuestions) * 25) * 10) / 10;
      const gain = Math.round((postScore - preScore) * 100) / 100;
      const normalizedGain = preScore >= 25 ? null : Math.round(((postScore - preScore) / (25 - preScore)) * 10000) / 100;
      const nowIso = new Date().toISOString();

      await Promise.all([
        supabaseAdmin.from('analytics_summary').upsert({
          student_id: session.subjectId,
          posttest_score: Math.round(postScore),
          learning_gain: gain,
          normalized_gain: normalizedGain,
          total_time_on_task_sec: Number(analytics?.total_time_on_task_sec || 0) + timeSpentSec,
          last_updated_at: nowIso,
        }, { onConflict: 'student_id' }),
        supabaseAdmin.from('learning_paths').update({
          last_active_date: nowIso,
        }).eq('student_id', session.subjectId),
      ]);

      return NextResponse.json({
        success: true,
        count: 1,
        completedAll: true,
        preScore,
        postScore,
        normalizedGain,
        absoluteGain: gain,
        newStage: lp?.current_stage || 1,
        newRank: lp?.current_rank || 1,
      });
    }
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์บันทึกข้อสอบ กรุณาเข้าสู่ระบบใหม่' }, { status: error.status });
    }
    console.error('Assessment submission error:', error);
    return NextResponse.json({ error: 'บันทึกผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
