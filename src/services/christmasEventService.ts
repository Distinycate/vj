import { supabase } from '../utils/supabase/client';
import { checkChristmasAnswer } from '../utils/christmasAnswerCheck';
import { calculateAttemptScore, calculateGrade } from '../utils/eventScoring';

export type ChristmasQuestionType = 'meaning_match' | 'word_match' | 'listening_typing' | 'spelling_typing' | 'context_typing' | 'image_word_typing';

function getExpectedChristmasAnswer(wordObj: any, qType: string) {
  switch(qType) {
    case 'meaning_match':
      return wordObj.meaning_th;
    case 'word_match':
    case 'listening_typing':
    case 'spelling_typing':
    case 'context_typing':
    case 'image_word_typing':
      return wordObj.word;
    default:
      throw new Error('ชนิดคำถามไม่ถูกต้อง');
  }
}

export async function getChristmasProgress(studentId: string) {
  const { data: mastery } = await supabase.from('event_vocab_mastery')
    .select('vocabulary_id, mastery_level')
    .eq('user_id', studentId);
  return mastery || [];
}

export async function startChristmasAttempt(studentId: string, classroomId?: string) {
  const { data: event } = await supabase.from('events').select('id, status').eq('slug', 'christmas-word-hunt').single();
  if (!event || event.status !== 'active') throw new Error('Christmas Event is not active');

  const { data: attempt, error } = await supabase.from('event_vocab_attempts').insert({
    event_id: event.id,
    user_id: studentId,
    classroom_id: classroomId || null,
    status: 'in_progress'
  }).select('id').single();

  if (error) throw error;
  return attempt.id;
}

export async function getNextChristmasQuestion(studentId: string) {
  // 1. Get Event ID
  const { data: event } = await supabase.from('events').select('id, status').eq('slug', 'christmas-word-hunt').single();
  if (!event || event.status !== 'active') return null;

  // 2. Get active attempt
  const { data: attempt } = await supabase.from('event_vocab_attempts')
    .select('id, total_questions')
    .eq('user_id', studentId)
    .eq('event_id', event.id)
    .eq('status', 'in_progress')
    .maybeSingle();
    
  if (!attempt || attempt.total_questions >= 20) return null; // 20 Qs per round

  // 3. Get student progress to determine phase
  const progress = await getChristmasProgress(studentId);
  const masteredCount = progress.filter(p => p.mastery_level === 5).length;
  
  let phaseLimit = 20; // Snow Beginner
  if (masteredCount >= 15) phaseLimit = 40; // Gift Hunter unlocks early if doing well
  if (masteredCount >= 35) phaseLimit = 60; // Christmas Master

  // 4. Get a random word within Phase limit that hasn't been asked in this attempt
  const { data: asked } = await supabase.from('event_vocab_attempt_items')
    .select('vocabulary_id')
    .eq('attempt_id', attempt.id);
  const askedIds = asked ? asked.map(a => a.vocabulary_id) : [];

  let query = supabase.from('event_vocabulary')
    .select('*')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .lte('order_no', phaseLimit);
    
  if (askedIds.length > 0) {
    query = query.not('id', 'in', `(${askedIds.join(',')})`);
  }
  
  const { data: availableWords } = await query;
  if (!availableWords || availableWords.length === 0) return null;

  // Pick random word
  const wordObj = availableWords[Math.floor(Math.random() * availableWords.length)];

  // Determine question type based on Phase limit
  const types: ChristmasQuestionType[] = ['meaning_match', 'word_match'];
  if (phaseLimit >= 40) {
    types.push('listening_typing', 'context_typing');
  }
  if (phaseLimit >= 60) {
    types.push('spelling_typing'); // Mix it up
  }
  
  const qType = types[Math.floor(Math.random() * types.length)];

  let prompt = '';
  switch(qType) {
    case 'meaning_match':
      prompt = `${wordObj.word} แปลว่าอะไร?`;
      break;
    case 'word_match':
      prompt = `"${wordObj.meaning_th}" ภาษาอังกฤษคือ?`;
      break;
    case 'listening_typing':
      prompt = `พิมพ์คำศัพท์ที่ได้ยิน`;
      break;
    case 'spelling_typing':
      // Blank out 1-2 letters
      const word = wordObj.word;
      if (word.length > 3) {
        const idx = Math.floor(Math.random() * (word.length - 1)) + 1;
        prompt = word.substring(0, idx) + '_' + word.substring(idx + 1);
      } else {
        prompt = word;
      }
      break;
    case 'context_typing':
      prompt = wordObj.example_sentence.replace(new RegExp(wordObj.word, 'i'), '_____');
      break;
  }

  return {
    vocabId: wordObj.id,
    questionType: qType,
    prompt,
    speechText: qType === 'listening_typing' ? wordObj.word : null
  };
}

export async function submitChristmasAnswer(
  attemptId: string, vocabId: string, qType: string, studentAnswer: string, attemptNo: number, hearts: number, studentId: string
) {
  const [{ data: attemptOwner }, { data: wordObj, error: wordError }] = await Promise.all([
    supabase
      .from('event_vocab_attempts')
      .select('id, event_id, user_id')
      .eq('id', attemptId)
      .eq('user_id', studentId)
      .maybeSingle(),
    supabase
      .from('event_vocabulary')
      .select('id, word, meaning_th')
      .eq('id', vocabId)
      .maybeSingle(),
  ]);

  if (!attemptOwner) throw new Error('Attempt not found');
  if (wordError) throw wordError;
  if (!wordObj) throw new Error('Vocabulary not found');
  
  const expectedAnswer = getExpectedChristmasAnswer(wordObj, qType);
  const checkResult = checkChristmasAnswer(studentAnswer, expectedAnswer);
  
  const { scoreEarned, heartsRemaining } = calculateAttemptScore(attemptNo, checkResult.isCorrect, checkResult.isNearMiss, hearts, false);
  const finalScore = checkResult.isCorrect ? scoreEarned : 0;
  
  const isFinalForQuestion = checkResult.isCorrect || heartsRemaining <= 0 || (!checkResult.isNearMiss && attemptNo >= 3);

  // Insert item
  await supabase.from('event_vocab_attempt_items').insert({
    attempt_id: attemptId,
    user_id: studentId,
    event_id: attemptOwner.event_id,
    vocabulary_id: vocabId,
    question_type: qType,
    prompt: qType, // Just store qtype as prompt for brevity here
    expected_answer: expectedAnswer,
    student_answer: studentAnswer,
    is_correct: checkResult.isCorrect,
    error_type: checkResult.errorType,
    attempt_no: attemptNo
  });

  // Update Attempt aggregates
  const { data: attempt } = await supabase.from('event_vocab_attempts').select('score, correct_count, wrong_count, total_questions').eq('id', attemptId).single();
  if (attempt) {
    const patch: any = { score: Number(attempt.score || 0) + finalScore };
    if (checkResult.isCorrect) {
      patch.correct_count = Number(attempt.correct_count || 0) + 1;
      patch.total_questions = Number(attempt.total_questions || 0) + 1;
    } else if (isFinalForQuestion) {
      patch.wrong_count = Number(attempt.wrong_count || 0) + 1;
      patch.total_questions = Number(attempt.total_questions || 0) + 1;
    }
    await supabase.from('event_vocab_attempts').update(patch).eq('id', attemptId);
  }

  // Update Mastery if correct on first try or if failed
  if (isFinalForQuestion) {
     const { data: event } = await supabase.from('events').select('id').eq('slug', 'christmas-word-hunt').single();
     if (event) {
       const { data: mastery } = await supabase.from('event_vocab_mastery').select('*').eq('vocabulary_id', vocabId).eq('user_id', studentId).maybeSingle();
       const mPatch: any = { 
         event_id: event.id, user_id: studentId, vocabulary_id: vocabId, 
         last_practiced_at: new Date().toISOString() 
       };
       if (checkResult.isCorrect && attemptNo === 1) {
         mPatch.mastery_level = Math.min(5, Number(mastery?.mastery_level || 0) + 1);
       } else if (!checkResult.isCorrect) {
         mPatch.wrong_count = Number(mastery?.wrong_count || 0) + 1;
       }
       await supabase.from('event_vocab_mastery').upsert(mPatch, { onConflict: 'event_id,user_id,vocabulary_id' });
     }
  }

  return { ...checkResult, scoreEarned: finalScore, heartsRemaining };
}

export async function finishChristmasAttempt(attemptId: string, studentId: string) {
  const { data: attempt } = await supabase.from('event_vocab_attempts').select('*').eq('id', attemptId).eq('user_id', studentId).single();
  if (!attempt) throw new Error('Attempt not found');

  const accuracy = attempt.total_questions > 0 ? Math.round((attempt.correct_count / attempt.total_questions) * 100) : 0;
  const grade = calculateGrade(Number(attempt.score || 0), attempt.correct_count, attempt.total_questions);
  
  // Economy logic
  let baseCoins = Math.min(15, Math.floor(Number(attempt.score || 0) / 200) * 2);
  if (grade === 'SSS') baseCoins += 10;
  else if (grade === 'S') baseCoins += 5;
  const coinsEarned = Math.min(25, baseCoins);
  const expEarned = Number(attempt.score || 0);
  
  let droppedTickets = 0;
  if (grade === 'SSS' && Math.random() < 0.10) droppedTickets = 1;
  else if (grade === 'S' && Math.random() < 0.02) droppedTickets = 1;

  await supabase.from('event_vocab_attempts').update({
    status: 'completed', finished_at: new Date().toISOString(), accuracy,
    coins_earned: coinsEarned, exp_earned: expEarned,
  }).eq('id', attemptId);

  if (coinsEarned > 0 || droppedTickets > 0 || expEarned > 0) {
    const { data: path } = await supabase.from('learning_paths').select('coins, exp, free_pull_tickets').eq('student_id', studentId).maybeSingle();
    if (path) {
      await supabase.from('learning_paths').update({
        coins: Number(path.coins || 0) + coinsEarned,
        exp: Number(path.exp || 0) + expEarned,
        free_pull_tickets: Number(path.free_pull_tickets || 0) + droppedTickets,
      }).eq('student_id', studentId);
    }
  }

  // Badges check (Snow Beginner, Gift Hunter, Christmas Master)
  // Check total mastered
  const progress = await getChristmasProgress(studentId);
  const masteredCount = progress.filter(p => p.mastery_level === 5).length;
  const { data: rewards } = await supabase.from('event_rewards').select('reward_name').eq('user_id', studentId).eq('event_id', attempt.event_id);
  const existingBadges = rewards ? rewards.map(r => r.reward_name) : [];
  const newBadges: string[] = [];
  
  const grantBadge = async (name: string) => {
    if (!existingBadges.includes(name)) {
      await supabase.from('event_rewards').insert({ event_id: attempt.event_id, user_id: studentId, reward_type: 'badge', reward_name: name });
      newBadges.push(name);
    }
  };

  if (masteredCount >= 20) await grantBadge('Snow Beginner');
  if (masteredCount >= 40) await grantBadge('Gift Hunter');
  if (masteredCount >= 60) await grantBadge('Christmas Master');

  return { accuracy, coinsEarned, expEarned, score: Number(attempt.score || 0), grade, droppedTickets, newBadges };
}
