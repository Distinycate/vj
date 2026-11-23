import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { getLiveGameQuestion } from '@/lib/server/liveGameAttempt';
import { gradeLiveGameAnswer } from '@/lib/liveGameQuestions';

const identity = { attemptId: z.uuid(), questionId: z.uuid() };
const schema = z.discriminatedUnion('action', [
  z.object({ ...identity, action: z.literal('answer'), answer: z.string().max(250), responseTimeMs: z.number().int().min(0).max(60000) }),
  z.object({ ...identity, action: z.literal('powerup'), itemCode: z.enum(['TIME_FREEZE','EXTRA_LIFE','FIFTY_FIFTY','HINT']) }),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'คำตอบหรือรายการไม่ถูกต้อง' }, { status: 400 });
    const { attemptId, questionId } = input.data;
    const question = await getLiveGameQuestion(attemptId, session.subjectId, questionId);
    if (!question) return NextResponse.json({ error: 'ไม่พบคำถามในด่านที่ยังเปิดอยู่' }, { status: 404 });
    const args = { p_attempt: attemptId, p_student: session.subjectId, p_question: questionId };
    if (input.data.action === 'answer') {
      const { answer, responseTimeMs } = input.data;
      const { data, error } = await supabaseAdmin.rpc('submit_private_game_answer', {
        ...args, p_answer: answer, p_correct: gradeLiveGameAnswer(question, answer), p_time: responseTimeMs,
      });
      if (error) throw error;
      const correct = question.choices.find((choice: any) => choice.word_id === question.correct_word_id);
      return NextResponse.json({ success: true, correct: data.correct, correctChoiceId: correct?.public_id ?? null,
        correctText: question.question_type === 'spelling' ? question.correct_answer : null }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (session.user.userType === 'EXTERNAL') return NextResponse.json({ error: 'บัญชีนี้ไม่มีไอเทม' }, { status: 403 });
    const { itemCode } = input.data;
    const { data, error } = await supabaseAdmin.rpc('use_private_game_powerup', { ...args, p_code: itemCode });
    if (error) throw error;
    const hiddenChoiceIds = itemCode === 'FIFTY_FIFTY' ? question.choices
      .filter((choice: any) => choice.word_id !== question.correct_word_id).slice(0,2)
      .map((choice: any) => choice.public_id) : [];
    const hint = itemCode === 'HINT' ? { initial: question.word.charAt(0), length: question.word.length } : null;
    return NextResponse.json({ success: true, remaining: data.remaining, hiddenChoiceIds, hint }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: error.status });
    if (error?.message?.includes('LIVE_POWERUP_NO_STOCK')) return NextResponse.json({ error: 'ไอเทมนี้หมดแล้ว' }, { status: 409 });
    if (error?.message?.includes('LIVE_POWERUP_NOT_APPLICABLE')) return NextResponse.json({ error: 'ไอเทมนี้ใช้กับคำถามนี้ไม่ได้' }, { status: 409 });
    if (error?.message?.startsWith('LIVE_')) return NextResponse.json({ error: 'คำถามนี้ถูกล็อกหรือด่านไม่เปิดแล้ว' }, { status: 409 });
    console.error('Live game action failed:', error?.code);
    return NextResponse.json({ error: 'เซิร์ฟเวอร์ยังตอบไม่ได้ กรุณาลองใหม่' }, { status: 503 });
  }
}
