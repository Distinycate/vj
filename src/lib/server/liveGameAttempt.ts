import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

export async function getLiveGameQuestion(attemptId: string, studentId: string, questionId: string) {
  const { data: attempt, error } = await supabaseAdmin.from('stage_attempts')
    .select('question_ids,status,expires_at').eq('id',attemptId).eq('student_id',studentId).maybeSingle();
  if (error) throw error;
  if (!attempt || attempt.status !== 'ACTIVE' || (attempt.expires_at && Date.parse(attempt.expires_at) <= Date.now())) return null;
  const questions = Array.isArray(attempt.question_ids) ? attempt.question_ids : [];
  return questions.find(q => q.public_id === questionId) ?? null;
}
