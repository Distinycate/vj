'use server';

import { 
  startAttempt, 
  getNextQuestion, 
  submitAnswer, 
  finishAttempt 
} from '../../../services/verbEventService';
import { supabase } from '../../../utils/supabase/client'; // Server actions can run server-side logic



async function getRealEventId() {
  const { data } = await supabase.from('events').select('id').eq('slug', 'verb-master').single();
  return data?.id;
}

async function requireStudent(studentId: string) {
  if (!studentId) throw new Error('กรุณาเข้าสู่ระบบนักเรียนอีกครั้ง');
  const { data } = await supabase.from('students').select('id').eq('id', studentId).maybeSingle();
  if (!data) throw new Error('ไม่พบข้อมูลนักเรียน');
  return data.id;
}

export async function actionStartAttempt(studentId: string) {
  try {
    const eventId = await getRealEventId();
    const userId = await requireStudent(studentId);
    if (!eventId) throw new Error('Event not found');
    const attemptId = await startAttempt(eventId, userId);
    return { success: true, attemptId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function actionGetNextQuestion(studentId: string) {
  try {
    const eventId = await getRealEventId();
    const userId = await requireStudent(studentId);
    if (!eventId) throw new Error('Event not found');
    const q = await getNextQuestion(eventId, userId);
    return { success: true, question: q };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function actionSubmitAnswer(
  attemptId: string, 
  verbId: string, 
  questionType: string, 
  studentAnswer: string, 
  attemptNo: number, 
  currentHearts: number,
  studentId: string,
) {
  try {
    const eventId = await getRealEventId();
    const userId = await requireStudent(studentId);
    if (!eventId) throw new Error('Event not found');
    const res = await submitAnswer(attemptId, eventId, userId, verbId, questionType, studentAnswer, attemptNo, currentHearts);
    return { success: true, result: res };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function actionFinishAttempt(attemptId: string, studentId: string) {
  try {
    const userId = await requireStudent(studentId);
    const eventId = await getRealEventId();
    if (!eventId) throw new Error('Event not found');
    const res = await finishAttempt(attemptId, eventId, userId);
    return { success: true, result: res };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

import verbData from '../../../data/verb-master-words.json';

export async function actionSetupVerbMasterEvent() {
  try {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .upsert({
        slug: 'verb-master',
        title: 'Verb Master Challenge',
        description: 'ท้าทายความจำ พิมพ์กริยา 3 ช่องให้ถูกต้องเพื่อปลดล็อกเข็มกลัดแห่งกาลเวลา!',
        event_type: 'verb',
        theme: 'Castle of Time',
        status: 'upcoming'
      }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (eventError) throw eventError;

    const formattedVerbs = verbData.map((v: any) => ({
      event_id: event.id,
      order_no: v.order_no,
      base_form: v.base_form,
      past_simple: v.past_simple,
      past_participle: v.past_participle,
      meaning_th: v.meaning_th,
      category: v.category || 'irregular_verbs',
      is_active: true
    }));

    const { error: verbsError } = await supabase
      .from('event_verbs')
      .upsert(formattedVerbs, { onConflict: 'event_id,base_form' });

    if (verbsError) throw verbsError;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
