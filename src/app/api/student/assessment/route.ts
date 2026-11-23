import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { loadAssessmentProgress } from '@/lib/server/assessmentProgress';

const assessmentSchema = z.object({
  type: z.enum(['PRE_TEST', 'POST_TEST']),
  submissionId: z.uuid(),
  epoch: z.uuid(),
  stageCheckpoint: z.number().int().min(10).max(100).refine(n => n % 10 === 0).optional(),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1).max(500),
  timeSpentSec: z.number().int().min(0).max(86400),
}).refine(body => body.score <= body.totalQuestions);

export async function GET() {
  try {
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const state = await loadAssessmentProgress(session.subjectId, session.user.userType === 'EXTERNAL');
    if (!state.epoch) {
      return NextResponse.json({ error: 'ระบบข้อสอบยังไม่พร้อม กรุณาแจ้งผู้ดูแล' }, { status: 503 });
    }
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
    if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลข้อสอบไม่ครบ กรุณาโหลดหน้าใหม่ก่อนสอบ', reload: true }, { status: 400 });
    const { type, score, totalQuestions, timeSpentSec, epoch, submissionId, stageCheckpoint } = parsed.data;
    const args = {
      p_student_id: session.subjectId,
      p_epoch: epoch,
      p_submission_id: submissionId,
      p_score: score,
      p_total: totalQuestions,
      p_duration: timeSpentSec,
    };
    const { data, error } = type === 'POST_TEST' && stageCheckpoint
      ? await supabaseAdmin.rpc('submit_checkpoint_posttest', { ...args, p_checkpoint: stageCheckpoint })
      : await supabaseAdmin.rpc('submit_assessment_v2', { ...args, p_type: type });
    if (error?.message.includes('ASSESSMENT_SEASON_CHANGED')) {
      return NextResponse.json({ error: 'เริ่มรอบการเรียนใหม่แล้ว กรุณาโหลดหน้าใหม่เพื่อรับข้อสอบรอบปัจจุบัน', reload: true }, { status: 409 });
    }
    if (error && /ASSESSMENT_ALREADY_COMPLETE|ASSESSMENT_ID_CONFLICT|PRETEST_REQUIRED|ASSESSMENT_CHECKPOINT_LOCKED/.test(error.message)) {
      return NextResponse.json({ error: 'สถานะข้อสอบเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่', reload: true }, { status: 409 });
    }
    if (error?.code === 'PGRST202') {
      return NextResponse.json({ error: 'ระบบบันทึกผลยังไม่พร้อม กรุณาแจ้งผู้ดูแล' }, { status: 503 });
    }
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์บันทึกข้อสอบ กรุณาเข้าสู่ระบบใหม่' }, { status: error.status });
    }
    console.error('Assessment submission error:', error);
    return NextResponse.json({ error: 'บันทึกผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
