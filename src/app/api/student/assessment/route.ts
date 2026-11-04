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
    const epoch = parsed.data.epoch || '00000000-0000-0000-0000-000000000000';

    // 1. Attempt atomic RPC if present on database
    try {
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('submit_assessment_v2', {
        p_student_id: session.subjectId,
        p_epoch: epoch,
        p_submission_id: submissionId,
        p_type: type,
        p_score: score,
        p_total: totalQuestions,
        p_duration: timeSpentSec,
      });

      if (!rpcErr && rpcData) {
        return NextResponse.json(rpcData);
      }

      if (rpcErr && !rpcErr.message.includes('submit_assessment_v2') && rpcErr.code !== 'PGRST202') {
        if (/ASSESSMENT_SEASON_CHANGED/.test(rpcErr.message)) {
          return NextResponse.json({ error: 'เริ่มรอบการเรียนใหม่แล้ว กรุณาโหลดหน้าใหม่เพื่อทำข้อสอบรอบปัจจุบัน', reload: true }, { status: 409 });
        }
        if (/ASSESSMENT_ALREADY_COMPLETE/.test(rpcErr.message)) {
          return NextResponse.json({ error: 'บันทึก Pre-test ครบแล้ว กรุณาโหลดหน้าใหม่', reload: true }, { status: 409 });
        }
        if (/PRETEST_REQUIRED|ASSESSMENT_ID_CONFLICT|INVALID_ASSESSMENT/.test(rpcErr.message)) {
          return NextResponse.json({ error: 'สถานะข้อสอบไม่ถูกต้อง กรุณาโหลดหน้าใหม่', reload: true }, { status: 409 });
        }
      }
    } catch {
      // Fall through to direct table write
    }

    // 2. Direct table fallback for immediate low-latency processing
    const isExternal = session.user.userType === 'EXTERNAL';
    const requiredRounds = isExternal ? 1 : 5;

    if (type === 'PRE_TEST') {
      const { error: insertErr } = await supabaseAdmin.from('pre_tests').upsert([{
        id: submissionId,
        student_id: session.subjectId,
        score,
        total_questions: totalQuestions,
        time_spent_sec: timeSpentSec,
      }], { onConflict: 'id', ignoreDuplicates: true });
      if (insertErr) throw insertErr;

      const { data: allPre, error: fetchErr } = await supabaseAdmin.from('pre_tests')
        .select('score, total_questions, time_spent_sec, created_at')
        .eq('student_id', session.subjectId)
        .order('created_at', { ascending: true });
      if (fetchErr) throw fetchErr;

      const count = allPre?.length || 1;
      const completedAll = count >= requiredRounds;
      const recentTests = allPre ? allPre.slice(-requiredRounds) : [];
      const totalScore = recentTests.reduce((sum, p) => sum + (Number(p.score) / (p.total_questions || 25) * 25), 0);
      const preScore = recentTests.length > 0 ? Math.round((totalScore / recentTests.length) * 10) / 10 : score;

      const { data: lp } = await supabaseAdmin.from('learning_paths')
        .select('current_stage, current_rank')
        .eq('student_id', session.subjectId)
        .maybeSingle();

      if (completedAll) {
        await supabaseAdmin.from('learning_paths').update({
          last_active_date: new Date().toISOString(),
        }).eq('student_id', session.subjectId);

        await supabaseAdmin.from('analytics_summary').upsert({
          student_id: session.subjectId,
          pretest_score: preScore,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });
      }

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
      const { error: postErr } = await supabaseAdmin.from('post_tests').upsert([{
        id: submissionId,
        student_id: session.subjectId,
        score,
        total_questions: totalQuestions,
        time_spent_sec: timeSpentSec,
      }], { onConflict: 'id', ignoreDuplicates: true });
      if (postErr) throw postErr;

      const [{ data: preTests }, { data: analytics }, { data: lp }] = await Promise.all([
        supabaseAdmin.from('pre_tests').select('score, total_questions').eq('student_id', session.subjectId),
        supabaseAdmin.from('analytics_summary').select('*').eq('student_id', session.subjectId).maybeSingle(),
        supabaseAdmin.from('learning_paths').select('current_stage, current_rank').eq('student_id', session.subjectId).maybeSingle(),
      ]);

      const recentPre = preTests ? preTests.slice(-requiredRounds) : [];
      const preScore = recentPre.length > 0
        ? recentPre.reduce((s, p) => s + (Number(p.score) / (p.total_questions || 25) * 25), 0) / recentPre.length
        : 0;
      const postScore = (score / totalQuestions) * 25;
      const gain = postScore - preScore;
      const normalizedGain = preScore >= 25 ? null : Math.round(((postScore - preScore) / (25 - preScore)) * 10000) / 100;

      await supabaseAdmin.from('analytics_summary').upsert({
        student_id: session.subjectId,
        posttest_score: postScore,
        learning_gain: gain,
        normalized_gain: normalizedGain,
        total_time_on_task_sec: Number(analytics?.total_time_on_task_sec || 0) + timeSpentSec,
        last_updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });

      await supabaseAdmin.from('learning_paths').update({
        last_active_date: new Date().toISOString(),
      }).eq('student_id', session.subjectId);

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
