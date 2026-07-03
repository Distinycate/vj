import { supabase } from '../utils/supabase/client';
import { generateVerbQuestion, QuestionType, VerbData } from '../utils/verbQuestionGenerator';
import { checkCompoundTypingAnswer, checkTypingAnswer } from '../utils/answerCheck';
import { calculateAttemptScore } from '../utils/eventScoring';

const QUESTION_TYPES = new Set<QuestionType>([
  'v1_to_v2', 'v1_to_v3', 'fill_v2', 'fill_v3', 'full_table',
  'reverse_v3_to_v1_v2', 'sentence_past', 'sentence_perfect',
  'dictation_v2', 'dictation_v3',
]);

function expectedAnswers(verb: VerbData, type: QuestionType): string[] {
  switch (type) {
    case 'v1_to_v3':
    case 'fill_v3':
    case 'sentence_perfect':
    case 'dictation_v3':
      return [verb.past_participle];
    case 'full_table':
      return [verb.past_simple, verb.past_participle];
    case 'reverse_v3_to_v1_v2':
      return [verb.base_form, verb.past_simple];
    default:
      return [verb.past_simple];
  }
}

export async function getEventBySlug(slug: string) {
  const { data, error } = await supabase.from('events').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStudentEventProgress(eventId: string, studentId: string) {
  const [{ data: attempts, error }, { data: mastery, error: masteryError }] = await Promise.all([
    supabase.from('event_attempts').select('accuracy, score, status').eq('event_id', eventId).eq('user_id', studentId),
    supabase.from('event_verb_mastery').select('mastery_level').eq('event_id', eventId).eq('user_id', studentId),
  ]);
  if (error) throw error;
  if (masteryError) throw masteryError;
  const completed = (attempts || []).filter((attempt) => attempt.status === 'completed');
  return {
    practicedVerbs: mastery?.length || 0,
    masteredVerbs: mastery?.filter((row) => row.mastery_level >= 5).length || 0,
    accuracy: completed.length
      ? Math.round(completed.reduce((sum, row) => sum + Number(row.accuracy || 0), 0) / completed.length)
      : 0,
    bestScore: completed.reduce((best, row) => Math.max(best, Number(row.score || 0)), 0),
  };
}

export async function startAttempt(eventId: string, studentId: string) {
  const { data: event, error: eventError } = await supabase
    .from('events').select('status').eq('id', eventId).maybeSingle();
  if (eventError) throw eventError;
  if (!event || event.status !== 'active') throw new Error('กิจกรรมยังไม่เปิดให้เล่น');

  const { data: existing } = await supabase.from('event_attempts').select('id')
    .eq('event_id', eventId).eq('user_id', studentId).eq('status', 'in_progress')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing) return existing.id;

  const { data: student } = await supabase.from('students').select('classroom_id').eq('id', studentId).maybeSingle();
  if (!student) throw new Error('ไม่พบข้อมูลนักเรียน');
  const { data, error } = await supabase.from('event_attempts').insert({
    event_id: eventId,
    user_id: studentId,
    classroom_id: student.classroom_id,
    status: 'in_progress',
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getNextQuestion(eventId: string, studentId: string) {
  const [{ data: verbs, error }, { data: mastery }] = await Promise.all([
    supabase.from('event_verbs').select('*').eq('event_id', eventId).eq('is_active', true).order('order_no'),
    supabase.from('event_verb_mastery').select('verb_id, mastery_level').eq('event_id', eventId).eq('user_id', studentId),
  ]);
  if (error) throw error;
  if (!verbs?.length) throw new Error('กิจกรรมยังไม่มีชุดคำกริยา');

  const practiced = mastery?.length || 0;
  const phase = practiced < 20 ? 1 : practiced < 50 ? 2 : 3;
  const phaseLimit = phase === 1 ? Math.min(20, verbs.length) : phase === 2 ? Math.min(50, verbs.length) : verbs.length;
  const pool = verbs.slice(0, phaseLimit);
  const levels = new Map((mastery || []).map((row) => [row.verb_id, row.mastery_level]));
  const weakestLevel = Math.min(...pool.map((verb) => levels.get(verb.id) ?? 0));
  const weakPool = pool.filter((verb) => (levels.get(verb.id) ?? 0) === weakestLevel);
  const verb = weakPool[Math.floor(Math.random() * weakPool.length)];
  const generated = generateVerbQuestion(verb, phase, levels.get(verb.id) ?? 0);
  return {
    verbId: generated.verbId,
    questionType: generated.questionType,
    prompt: generated.prompt,
    speechText: generated.speechText,
    answerCount: generated.secondaryExpectedAnswer ? 2 : 1,
    phase,
  };
}

export async function submitAnswer(
  attemptId: string,
  eventId: string,
  studentId: string,
  verbId: string,
  questionType: string,
  studentAnswer: string,
  attemptNo: number,
  currentHearts: number,
) {
  if (!QUESTION_TYPES.has(questionType as QuestionType)) throw new Error('ชนิดคำถามไม่ถูกต้อง');
  const type = questionType as QuestionType;
  const [{ data: attempt }, { data: verb }] = await Promise.all([
    supabase.from('event_attempts').select('id, score, correct_count, wrong_count, total_questions, status')
      .eq('id', attemptId).eq('event_id', eventId).eq('user_id', studentId).maybeSingle(),
    supabase.from('event_verbs').select('*').eq('id', verbId).eq('event_id', eventId).maybeSingle(),
  ]);
  if (!attempt || attempt.status !== 'in_progress') throw new Error('รอบการเล่นนี้ไม่ถูกต้องหรือจบแล้ว');
  if (!verb) throw new Error('ไม่พบคำกริยาในกิจกรรมนี้');

  const answers = expectedAnswers(verb, type);
  const checkResult = answers.length === 1
    ? checkTypingAnswer(studentAnswer, answers[0])
    : checkCompoundTypingAnswer(studentAnswer, answers);
  const safeAttemptNo = Math.max(1, Math.min(3, Math.trunc(attemptNo)));
  const safeHearts = Math.max(0, Math.min(3, Math.trunc(currentHearts)));
  const scoreResult = calculateAttemptScore(safeAttemptNo, checkResult.isCorrect, checkResult.isNearMiss, safeHearts, false);
  const isFinalForQuestion = checkResult.isCorrect || (!checkResult.isNearMiss && scoreResult.heartsRemaining === 0);

  const { error: itemError } = await supabase.from('event_attempt_items').insert({
    attempt_id: attemptId,
    event_id: eventId,
    user_id: studentId,
    verb_id: verbId,
    question_type: type,
    prompt: type.startsWith('dictation_') ? 'Dictation' : `${type}:${verb.base_form}`,
    expected_answer: answers.join(', '),
    student_answer: studentAnswer,
    is_correct: checkResult.isCorrect,
    error_type: checkResult.errorType,
    attempt_no: safeAttemptNo,
  });
  if (itemError) throw itemError;

  const attemptPatch: Record<string, number> = {
    score: Number(attempt.score || 0) + scoreResult.scoreEarned,
  };
  if (checkResult.isCorrect) {
    attemptPatch.correct_count = Number(attempt.correct_count || 0) + 1;
    attemptPatch.total_questions = Number(attempt.total_questions || 0) + 1;
  } else if (isFinalForQuestion) {
    attemptPatch.wrong_count = Number(attempt.wrong_count || 0) + 1;
    attemptPatch.total_questions = Number(attempt.total_questions || 0) + 1;
  }
  const { error: attemptError } = await supabase.from('event_attempts').update(attemptPatch).eq('id', attemptId);
  if (attemptError) throw attemptError;

  const { data: current } = await supabase.from('event_verb_mastery').select('*')
    .eq('event_id', eventId).eq('user_id', studentId).eq('verb_id', verbId).maybeSingle();
  const masteryPatch = {
    v2_correct_count: Number(current?.v2_correct_count || 0) + (checkResult.isCorrect && answers[0] === verb.past_simple ? 1 : 0),
    v3_correct_count: Number(current?.v3_correct_count || 0) + (checkResult.isCorrect && answers.includes(verb.past_participle) ? 1 : 0),
    sentence_correct_count: Number(current?.sentence_correct_count || 0) + (checkResult.isCorrect && type.startsWith('sentence_') ? 1 : 0),
    wrong_count: Number(current?.wrong_count || 0) + (isFinalForQuestion && !checkResult.isCorrect ? 1 : 0),
    mastery_level: Math.max(0, Math.min(5, Number(current?.mastery_level || 0) + (checkResult.isCorrect && safeAttemptNo === 1 ? 1 : 0))),
    last_practiced_at: new Date().toISOString(),
  };
  const masteryQuery = current
    ? supabase.from('event_verb_mastery').update(masteryPatch).eq('id', current.id)
    : supabase.from('event_verb_mastery').insert({ event_id: eventId, user_id: studentId, verb_id: verbId, ...masteryPatch });
  const { error: masteryError } = await masteryQuery;
  if (masteryError) throw masteryError;

  return { ...checkResult, scoreEarned: scoreResult.scoreEarned, heartsRemaining: scoreResult.heartsRemaining };
}

export async function finishAttempt(attemptId: string, eventId: string, studentId: string) {
  const { data: attempt } = await supabase.from('event_attempts')
    .select('correct_count, total_questions, score, status')
    .eq('id', attemptId).eq('event_id', eventId).eq('user_id', studentId).maybeSingle();
  if (!attempt) throw new Error('ไม่พบรอบการเล่นของนักเรียน');
  if (attempt.status !== 'in_progress') throw new Error('รอบการเล่นนี้จบไปแล้ว');

  const accuracy = attempt.total_questions > 0 ? Math.round((attempt.correct_count / attempt.total_questions) * 100) : 0;
  const coinsEarned = Math.min(50, Math.floor(Number(attempt.score || 0) / 100) * 5);
  const expEarned = Number(attempt.score || 0);
  const { error } = await supabase.from('event_attempts').update({
    status: 'completed', finished_at: new Date().toISOString(), accuracy,
    coins_earned: coinsEarned, exp_earned: expEarned,
  }).eq('id', attemptId).eq('user_id', studentId);
  if (error) throw error;

  if (coinsEarned > 0) {
    const { data: path } = await supabase.from('learning_paths').select('coins, exp').eq('student_id', studentId).maybeSingle();
    if (path) {
      await supabase.from('learning_paths').update({
        coins: Number(path.coins || 0) + coinsEarned,
        exp: Number(path.exp || 0) + expEarned,
      }).eq('student_id', studentId);
    }
  }
  return { accuracy, coinsEarned, expEarned, score: Number(attempt.score || 0) };
}
