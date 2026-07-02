import { supabase } from '@/utils/supabase/client';
import { createTeamScoreEvent } from '@/utils/teamBattleEngine';
import { ADAPTIVE_RANK_CONFIG, RankConfig, getWorldForStage } from './adaptiveConfig';
import {
  filterDistractors,
  getVocabularyField,
  QUESTION_ANSWER_CONFIG,
  QuestionType,
  QuizChoice,
  shuffleArray,
  uniqueChoicesByText,
} from '@/lib/quizUtils';
import { validateQuestion, logQuestionValidationError } from '@/utils/questionValidator';

// 1. GET ADAPTIVE DIFFICULTY PARAMETERS
export async function getAdaptiveDifficulty(studentId: string, stageNumber: number): Promise<RankConfig & { rank: number }> {
  // Query student's current rank from learning_paths
  const { data: pathData } = await supabase
    .from('learning_paths')
    .select('current_rank')
    .eq('student_id', studentId)
    .maybeSingle();

  const rank = pathData?.current_rank || 1;
  const config = ADAPTIVE_RANK_CONFIG[rank] || ADAPTIVE_RANK_CONFIG[1];
  
  return {
    rank,
    ...config
  };
}

// 2. GENERATE STAGE QUESTIONS (ADAPTIVE QUESTION GENERATION ENGINE)
export async function generateStageQuestions(studentId: string, stageNumber: number): Promise<any[]> {
  try {
    // 1. Fetch current rank configuration
    const diffInfo = await getAdaptiveDifficulty(studentId, stageNumber);
    const { rank, difficultyMix, questionTypes, questionCount } = diffInfo;
    const isBoss = stageNumber % 10 === 0;
    const targetCount = isBoss ? Math.round(questionCount * 1.5) : questionCount;

    // 2. Resolve Word Pool based on stage (Normal vs. Boss Stage)
    let wordsQuery = supabase.from('vocabulary').select('*').eq('is_active', true);
    
    if (isBoss) {
      // Boss stage combines vocabulary from the current world range.
      // E.g. Stage 10 combines Stages 1-10; Stage 20 combines Stages 11-20.
      const world = getWorldForStage(stageNumber);
      wordsQuery = wordsQuery
        .gte('stage_number', world.stageRange[0])
        .lte('stage_number', world.stageRange[1]);
    } else {
      // Normal stage uses vocab assigned to this stage number
      wordsQuery = wordsQuery.eq('stage_number', stageNumber);
    }

    const { data: stageWords, error: wordsErr } = await wordsQuery;
    if (wordsErr || !stageWords || stageWords.length === 0) {
      console.warn("No words found for stage:", stageNumber, wordsErr);
      return [];
    }

    // 3. Spaced Repetition: Fetch wrong words due for review to insert them
    const { data: reviewWordsData } = await supabase
      .from('user_review_words')
      .select('word_id, wrong_count, mastery_level')
      .eq('user_id', studentId)
      .lt('mastery_level', 4) // Not fully mastered
      .lte('next_review_at', new Date().toISOString())
      .order('wrong_count', { ascending: false })
      .limit(3); // Fetch up to 3 wrong words

    let wrongVocab: any[] = [];
    if (reviewWordsData && reviewWordsData.length > 0) {
      const wrongWordIds = reviewWordsData.map(r => r.word_id);
      const { data: wrongWords } = await supabase
        .from('vocabulary')
        .select('*')
        .in('id', wrongWordIds);
      if (wrongWords) wrongVocab = wrongWords;
    }

    // 4. Categorize stage words by difficulty level
    const easyPool = stageWords.filter(w => w.difficulty_level === 'easy' || !w.difficulty_level);
    const normalPool = stageWords.filter(w => w.difficulty_level === 'normal');
    const hardPool = stageWords.filter(w => w.difficulty_level === 'hard');
    const expertPool = stageWords.filter(w => w.difficulty_level === 'expert');

    // Helper to sample randomly from a pool
    const sample = (pool: any[], num: number) => {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, num);
    };

    // Calculate how many words to pick for each difficulty category
    const easyCount = Math.round(targetCount * (difficultyMix.easy / 100));
    const normalCount = Math.round(targetCount * (difficultyMix.normal / 100));
    const hardCount = Math.round(targetCount * (difficultyMix.hard / 100));
    const expertCount = Math.round(targetCount * (difficultyMix.expert / 100));

    // Sample from categories
    let selectedWords: any[] = [];
    selectedWords.push(...sample(easyPool, easyCount));
    selectedWords.push(...sample(normalPool, normalCount));
    selectedWords.push(...sample(hardPool, hardCount));
    selectedWords.push(...sample(expertPool, expertCount));

    // Fill in from general pool if selected words count is less than target (due to rounding or empty pools)
    if (selectedWords.length < targetCount) {
      const remainingCount = targetCount - selectedWords.length;
      const unselected = stageWords.filter(sw => !selectedWords.some(w => w.id === sw.id));
      selectedWords.push(...sample(unselected, remainingCount));
    }

    // Mix in the Spaced Repetition wrong words (replacing general words, prioritizing them)
    if (wrongVocab.length > 0) {
      wrongVocab.forEach(wv => {
        // Insert wrong word if it is not already selected
        if (!selectedWords.some(w => w.id === wv.id)) {
          // Replace a random word that isn't a wrong word
          const replaceIndex = Math.floor(Math.random() * selectedWords.length);
          selectedWords[replaceIndex] = wv;
        }
      });
    }

    // Trim or pad to exact target count
    selectedWords = selectedWords.slice(0, targetCount);

    // 5. Generate multiple choices and questions structure
    // 5. Fetch vocabulary list for distractors
    const allVocabularyList = await supabase
      .from('vocabulary')
      .select('*')
      .eq('is_active', true)
      .limit(250)
      .then((response) => response.data?.length ? response.data : stageWords);
    
    // Auto-healing logic
    const questions: any[] = [];
    
    for (const targetWord of selectedWords) {
      let chosenType = questionTypes[Math.floor(Math.random() * questionTypes.length)] as QuestionType | 'mixed_challenge';
      if (chosenType === 'mixed_challenge') {
        const standardTypes: QuestionType[] = ['meaning_mc', 'word_mc', 'listening_mc', 'context_mc', 'spelling'];
        chosenType = standardTypes[Math.floor(Math.random() * standardTypes.length)];
      }

      const question = await generateValidQuestion({
        targetWord,
        questionType: chosenType as QuestionType,
        candidates: allVocabularyList
      });

      if (question) {
        questions.push(question);
      }
    }

    if (questions.length === 0) {
      console.warn("No valid questions could be generated");
      return [];
    }

    return questions;
  } catch (err) {
    console.error("Error generating stage questions:", err);
    return [];
  }
}

async function generateValidQuestion(params: { targetWord: any, questionType: QuestionType, candidates: any[] }) {
  const MAX_ATTEMPTS = 10;
  let lastQuestion: ReturnType<typeof buildRawQuestion> | null = null;
  let lastReason: string | null = null;
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Make sure we shuffle candidates each attempt to get different distractors
    const shuffledCandidates = shuffleArray(params.candidates);
    const rawQuestion = buildRawQuestion({ ...params, candidates: shuffledCandidates });
    lastQuestion = rawQuestion;
    const validation = validateQuestion(rawQuestion);
    
    if (validation.valid) {
      return rawQuestion;
    }
    lastReason = validation.reason;
  }

  if (lastQuestion) {
    await logQuestionValidationError(lastQuestion, lastReason);
  }
  
  return null;
}

function buildRawQuestion({ targetWord, questionType, candidates }: { targetWord: any, questionType: QuestionType, candidates: any[] }) {
  // Contextual Puzzle override
  if (targetWord.context_sentence && Math.random() > 0.5) {
    return createContextFillQuestion(targetWord);
  }

  switch (questionType) {
    case 'listening_mc':
      return createListeningQuestion(targetWord, candidates);
    case 'word_mc':
      return createWordMcQuestion(targetWord, candidates);
    case 'meaning_mc':
      return createMeaningMcQuestion(targetWord, candidates);
    case 'context_mc':
      return createContextMcQuestion(targetWord, candidates);
    case 'spelling':
      return createSpellingQuestion(targetWord);
    default:
      return createMeaningMcQuestion(targetWord, candidates);
  }
}

function createListeningQuestion(targetWord: any, candidates: any[]) {
  const config = QUESTION_ANSWER_CONFIG.listening_mc;
  const answerField = config.choiceField || config.answerField;
  const distractors = filterDistractors({
    targetWord,
    candidates,
    answerField,
    limit: 3
  });

  const correctChoice = {
    word_id: targetWord.id,
    text: getVocabularyField(targetWord, config.answerField),
    is_correct: true
  };

  const wrongChoices = distractors.map((word) => ({
    word_id: word.id,
    text: getVocabularyField(word, answerField),
    is_correct: false
  }));

  const choices = shuffleArray(uniqueChoicesByText([correctChoice, ...wrongChoices]));

  return {
    id: targetWord.id,
    qType: "LISTENING_MC",
    question_type: "listening_mc",
    word_id: targetWord.id,
    correct_word_id: targetWord.id,
    audio_url: targetWord.audio_url || null,
    prompt: "ฟังเสียงแล้วเลือกคำศัพท์ที่ได้ยิน",
    correct_answer: getVocabularyField(targetWord, config.answerField),
    answer_language: config.answerLanguage,
    word: targetWord.word,
    meaning: getVocabularyField(targetWord, "meaning_th"),
    choices
  };
}

function createContextFillQuestion(targetWord: any) {
  return {
    id: targetWord.id,
    qType: "FILL_BLANK",
    question_type: "spelling",
    word_id: targetWord.id,
    correct_word_id: targetWord.id,
    prompt: targetWord.context_sentence,
    correct_answer: targetWord.blank_answer || targetWord.word,
    answer_language: 'en',
    word: targetWord.word,
    meaning: getVocabularyField(targetWord, "meaning_th")
  };
}

function createChoiceQuestion(params: {
  targetWord: any;
  candidates: any[];
  questionType: Exclude<QuestionType, "listening_mc" | "spelling">;
  qType: "WORD_MC" | "MEANING_MC" | "CONTEXT_MC";
  prompt: string;
  example?: string;
}) {
  const { targetWord, candidates, questionType, qType, prompt, example } = params;
  const config = QUESTION_ANSWER_CONFIG[questionType];
  const answerField = config.choiceField;
  const correctAnswer = getVocabularyField(targetWord, config.answerField);
  const distractors = filterDistractors({
    targetWord,
    candidates,
    answerField,
    limit: 3
  });

  const correctChoice: QuizChoice = {
    word_id: targetWord.id,
    text: correctAnswer,
    is_correct: true
  };

  const wrongChoices: QuizChoice[] = distractors.map((word) => ({
    word_id: word.id,
    text: getVocabularyField(word, answerField),
    is_correct: false
  }));

  const choices = shuffleArray(uniqueChoicesByText([correctChoice, ...wrongChoices]));

  return {
    id: targetWord.id,
    qType,
    question_type: questionType,
    word_id: targetWord.id,
    correct_word_id: targetWord.id,
    prompt,
    correct_answer: correctAnswer,
    answer_language: config.answerLanguage,
    word: targetWord.word,
    meaning: getVocabularyField(targetWord, "meaning_th"),
    example,
    choices
  };
}

function createWordMcQuestion(targetWord: any, candidates: any[]) {
  return createChoiceQuestion({
    targetWord,
    candidates,
    questionType: "word_mc",
    qType: "WORD_MC",
    prompt: getVocabularyField(targetWord, "meaning_th"),
  });
}

function createMeaningMcQuestion(targetWord: any, candidates: any[]) {
  return createChoiceQuestion({
    targetWord,
    candidates,
    questionType: "meaning_mc",
    qType: "MEANING_MC",
    prompt: getVocabularyField(targetWord, "word"),
  });
}

function createContextMcQuestion(targetWord: any, candidates: any[]) {
  const sentence = String(targetWord.example_sentence || targetWord.example || "");
  const blankSentence = sentence.replace(
    new RegExp(`\\b${targetWord.word}\\b`, "i"),
    "_____"
  );

  return createChoiceQuestion({
    targetWord,
    candidates,
    questionType: "context_mc",
    qType: "CONTEXT_MC",
    prompt: blankSentence,
    example: sentence,
  });
}

function createSpellingQuestion(targetWord: any) {
  const config = QUESTION_ANSWER_CONFIG.spelling;
  return {
    id: targetWord.id,
    qType: "FILL_BLANK",
    question_type: "spelling",
    word_id: targetWord.id,
    correct_word_id: targetWord.id,
    prompt: getVocabularyField(targetWord, "meaning_th"),
    hint: targetWord.word?.[0] || "",
    correct_answer: getVocabularyField(targetWord, config.answerField),
    answer_language: config.answerLanguage,
    word: targetWord.word,
    meaning: getVocabularyField(targetWord, "meaning_th")
  };
}

// 3. COMPLETE STAGE LOGIC (POST-GAME ASSESSMENT & REWARDS)
export interface CompleteStageResult {
  score: number;
  accuracy: number;
  responseTimeAvg: number;
  wrongWords: string[];
  correctWords: string[];
  totalQuestions: number;
  usedHints: number;
  assistedWords?: string[];
}

function calculateStreak(lastActiveDate: string | null, currentStreak: number): number {
  if (!lastActiveDate) return 1;

  const now = new Date();
  const lastActive = new Date(lastActiveDate);
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const lastUtc = Date.UTC(
    lastActive.getUTCFullYear(),
    lastActive.getUTCMonth(),
    lastActive.getUTCDate()
  );
  const dayDifference = Math.floor((todayUtc - lastUtc) / 86_400_000);

  if (dayDifference <= 0) return Math.max(1, currentStreak);
  if (dayDifference === 1) return Math.max(1, currentStreak) + 1;
  return 1;
}

export async function completeStage(studentId: string, stageNumber: number, result: CompleteStageResult) {
  try {
    const {
      score,
      accuracy,
      responseTimeAvg,
      wrongWords,
      correctWords,
      totalQuestions,
      usedHints,
    } = result;
    const isBoss = stageNumber % 10 === 0;
    const uniqueWrongWords = [...new Set(wrongWords)];
    const uniqueCorrectWords = [...new Set(correctWords)].filter(
      (wordId) => !uniqueWrongWords.includes(wordId)
    );

    // 1. Get student current rank
    const diffInfo = await getAdaptiveDifficulty(studentId, stageNumber);
    const { rank, passScore } = diffInfo;
    const passed = accuracy >= passScore;

    // 2. Save result to stage_results
    await supabase.from('stage_results').insert([{
      user_id: studentId,
      stage_number: stageNumber,
      rank_at_play: rank,
      score,
      accuracy,
      response_time_avg: responseTimeAvg,
      passed,
      used_hints: usedHints
    }]);

    const { data: stageData } = await supabase
      .from('stages')
      .select('id')
      .eq('stage_number', stageNumber)
      .maybeSingle();

    if (stageData) {
      await supabase.from('attempts').insert([{
        student_id: studentId,
        stage_id: stageData.id,
        score,
        total_questions: totalQuestions,
        time_spent_sec: Math.round(responseTimeAvg * Math.max(1, totalQuestions)),
        items_used_count: usedHints,
        error_count: uniqueWrongWords.length,
        is_passed: passed,
      }]);
    }

    // 3. Spaced Repetition / Wrong Words logging (BULK UPSERT)
    const answeredWordIds = [...uniqueCorrectWords, ...uniqueWrongWords];
    if (answeredWordIds.length > 0) {
      const { data: existingWords } = await supabase
        .from('user_review_words')
        .select('word_id, wrong_count, mastery_level')
        .eq('user_id', studentId)
        .in('word_id', answeredWordIds);
        
      const existingMap = new Map((existingWords || []).map(w => [w.word_id, w]));
      const reviewIntervals = [0, 1, 3, 7, 30];
      
      const upsertReviewWords = answeredWordIds.map(wordId => {
        const isWrong = uniqueWrongWords.includes(wordId);
        const existing = existingMap.get(wordId);
        
        let newMastery = existing?.mastery_level || 0;
        let wrongCount = existing?.wrong_count || 0;
        let lastWrongAt = undefined;
        
        if (isWrong) {
          wrongCount += 1;
          newMastery = Math.max(0, newMastery - 1);
          lastWrongAt = new Date().toISOString();
        } else {
          newMastery = Math.min(4, newMastery + 1);
        }
        
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + reviewIntervals[Math.min(4, newMastery)]);
        
        return {
          user_id: studentId,
          word_id: wordId,
          wrong_count: wrongCount,
          mastery_level: newMastery,
          next_review_at: nextReviewDate.toISOString(),
          ...(lastWrongAt ? { last_wrong_at: lastWrongAt } : {})
        };
      });
      
      await supabase.from('user_review_words').upsert(upsertReviewWords, { onConflict: 'user_id,word_id' });
    }

    // 4. Calculate coins & EXP rewards (only if passed)
    if (passed) {
      // Rank Multipliers: Rank 1: x1, Rank 2: x1.2, Rank 3: x1.4, Rank 4: x1.7, Rank 5: x2
      const rankMultipliers = [1, 1, 1.2, 1.4, 1.7, 2];
      const baseCoins = 20;
      const baseExp = 15;
      const rankMult = rankMultipliers[rank] || 1;
      
      let earnedCoins = baseCoins * rankMult;
      let earnedExp = baseExp * rankMult;

      if (isBoss) { earnedCoins *= 2; earnedExp *= 2; }
      if (usedHints === 0) { earnedCoins *= 1.2; earnedExp *= 1.2; }
      if (accuracy === 100) { earnedCoins *= 1.3; earnedExp *= 1.3; }

      earnedCoins = Math.round(earnedCoins);
      earnedExp = Math.round(earnedExp);

      const { data: pathData } = await supabase.from('learning_paths').select('coins, exp, total_exp, current_stage, streak_days, last_active_date').eq('student_id', studentId).single();

      if (pathData) {
        const newCoins = (pathData.coins || 0) + earnedCoins;
        const newExp = (pathData.exp || 0) + earnedExp;
        const newTotalExp = (pathData.total_exp || 0) + earnedExp;
        const nextStageNum = Math.min(100, Math.max(pathData.current_stage || 1, stageNumber + 1));
        const nextStreak = calculateStreak(pathData.last_active_date, pathData.streak_days || 0);

        await supabase.from('learning_paths').update({
          coins: newCoins, exp: newExp, total_exp: newTotalExp, current_stage: nextStageNum,
          streak_days: nextStreak, last_active_date: new Date().toISOString()
        }).eq('student_id', studentId);

        await supabase.from('coins_transactions').insert([{ student_id: studentId, amount: earnedCoins, source: `STAGE_${stageNumber}_PASS` }]);
      }
    } else {
      const { data: failedPathData } = await supabase.from('learning_paths').select('streak_days, last_active_date').eq('student_id', studentId).maybeSingle();
      await supabase.from('learning_paths').update({
        streak_days: calculateStreak(failedPathData?.last_active_date || null, failedPathData?.streak_days || 0),
        last_active_date: new Date().toISOString()
      }).eq('student_id', studentId);
    }

    // 5. Fire-and-forget Background Analytics (Non-blocking)
    (async () => {
      try {
        // Bulk item analysis
        if (answeredWordIds.length > 0) {
          const { data: existingAnalysis } = await supabase.from('item_analysis').select('*').in('word_id', answeredWordIds);
          const analysisMap = new Map((existingAnalysis || []).map(a => [a.word_id, a]));
          
          const upsertAnalysis = answeredWordIds.map(wordId => {
             const existing = analysisMap.get(wordId);
             const wasCorrect = uniqueCorrectWords.includes(wordId) ? 1 : 0;
             const wasAssisted = result.assistedWords?.includes(wordId) || false;
             
             // Decoupled Analytics: Use academic correctness (not assisted) for raw analytics
             const academicWasCorrect = (wasCorrect === 1 && !wasAssisted) ? 1 : 0;
             
             const oldAttemptCount = existing?.attempt_count || 0;
             const oldSuccessRate = Number(existing?.success_rate || 0);
             const nextItemAttemptCount = oldAttemptCount + 1;
             const nextItemSuccessRate = ((oldSuccessRate * oldAttemptCount + academicWasCorrect * 100) / nextItemAttemptCount);
             const oldAverageTime = Number(existing?.avg_time_ms || 0);
             const nextAverageTime = ((oldAverageTime * oldAttemptCount + responseTimeAvg * 1000) / nextItemAttemptCount);
             
             return {
                word_id: wordId,
                p_value: Number((nextItemSuccessRate / 100).toFixed(2)),
                d_value: Number(existing?.d_value || 0),
                success_rate: Number(nextItemSuccessRate.toFixed(2)),
                attempt_count: nextItemAttemptCount,
                avg_time_ms: Math.round(nextAverageTime),
                choices_selected_counts: existing?.choices_selected_counts || {},
                updated_at: new Date().toISOString(),
             };
          });
          await supabase.from('item_analysis').upsert(upsertAnalysis, { onConflict: 'word_id' });
        }

        // Analytics summary
        const { data: analytics } = await supabase.from('analytics_summary').select('*').eq('student_id', studentId).maybeSingle();
        const previousAttemptCount = analytics?.attempt_count || 0;
        const nextAttemptCount = previousAttemptCount + 1;
        const previousSuccessRate = Number(analytics?.success_rate || 0);
        const nextSuccessRate = ((previousSuccessRate * previousAttemptCount + accuracy) / nextAttemptCount);
        const addedTime = Math.round(responseTimeAvg * Math.max(1, totalQuestions));

        await supabase.from('analytics_summary').upsert({
          student_id: studentId,
          pretest_score: analytics?.pretest_score || 0,
          posttest_score: analytics?.posttest_score || 0,
          learning_gain: analytics?.learning_gain || 0,
          normalized_gain: analytics?.normalized_gain || 0,
          success_rate: Number(nextSuccessRate.toFixed(2)),
          attempt_count: nextAttemptCount,
          total_time_on_task_sec: (analytics?.total_time_on_task_sec || 0) + addedTime,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });

        // Failed attempts check
        if (!passed) {
          const { data: recentStageFailures } = await supabase.from('stage_results').select('passed').eq('user_id', studentId).eq('stage_number', stageNumber).order('created_at', { ascending: false }).limit(3);
          if (recentStageFailures?.length === 3 && recentStageFailures.every((attempt) => !attempt.passed)) {
            const { data: studentData } = await supabase.from('students').select('classroom_id').eq('id', studentId).maybeSingle();
            const { data: existingAlert } = await supabase.from('intervention_alerts').select('id').eq('student_id', studentId).eq('alert_type', 'STAGE_FAIL_3X').eq('is_resolved', false).maybeSingle();
            if (!existingAlert && studentData?.classroom_id) {
              await supabase.from('intervention_alerts').insert([{
                student_id: studentId, classroom_id: studentData.classroom_id, alert_type: 'STAGE_FAIL_3X', alert_level: 'HIGH',
                description: `ไม่ผ่านด่าน ${stageNumber} ติดต่อกัน 3 ครั้ง`, teacher_recommendation: 'ทบทวนคำศัพท์ใน Study Camp และฝึกคำที่ตอบผิดก่อนลองใหม่',
              }]);
            }
          }
        }

        // Rank Update
        await updateAdaptiveRank(studentId);

        // Team Score Event Logging
        if (passed) {
          const isBoss = stageNumber % 10 === 0;
          await createTeamScoreEvent({ userId: studentId, eventType: isBoss ? 'boss_completed' : 'stage_completed', points: isBoss ? 30 : 10, metadata: { stageNumber, accuracy: result.accuracy } });
          if (result.accuracy >= 100) await createTeamScoreEvent({ userId: studentId, eventType: 'perfect_bonus', points: 25 });
          else if (result.accuracy >= 90) await createTeamScoreEvent({ userId: studentId, eventType: 'accuracy_bonus', points: 15 });
          else if (result.accuracy >= 80) await createTeamScoreEvent({ userId: studentId, eventType: 'accuracy_bonus', points: 10 });
          else if (result.accuracy >= 70) await createTeamScoreEvent({ userId: studentId, eventType: 'accuracy_bonus', points: 5 });
        }

      } catch (err) {
        console.error("Background analytics error:", err);
      }
    })();

    return {
      passed,
      targetPassScore: passScore
    };
  } catch (err) {
    console.error("Error completing stage:", err);
    return { passed: false, targetPassScore: 60 };
  }
}

// 4. ADAPTIVE RANK UPDATER (ANALYZE PROGRESS AND SCALE SKILL LEVEL)
export async function updateAdaptiveRank(studentId: string) {
  try {
    // 1. Fetch 3 most recent stage results
    const { data: recentResults, error } = await supabase
      .from('stage_results')
      .select('accuracy, passed, response_time_avg')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !recentResults || recentResults.length < 3) {
      // Need at least 3 records to auto-tune rank
      return;
    }

    // 2. Fetch current learning path rank
    const { data: pathData } = await supabase
      .from('learning_paths')
      .select('current_rank')
      .eq('student_id', studentId)
      .single();

    if (!pathData) return;
    const currentRank = pathData.current_rank || 1;

    // 3. Evaluate Rank changes
    const passedCount = recentResults.filter(r => r.passed).length;
    const avgAccuracy = recentResults.reduce((sum, r) => sum + r.accuracy, 0) / 3;

    let newRank = currentRank;
    let reason = '';

    // Up-rank Condition: Pass 3/3 latest, average accuracy >= 80%
    if (passedCount === 3 && avgAccuracy >= 80 && currentRank < 5) {
      newRank = currentRank + 1;
      reason = `ทำคะแนนดีต่อเนื่อง ความถูกต้องเฉลี่ย ${avgAccuracy.toFixed(1)}% (ผ่าน 3 ด่านติด)`;
    }
    // Down-rank Condition: Failed at least 2/3 times, or average accuracy < 50%
    else if ((passedCount <= 1 || avgAccuracy < 50) && currentRank > 1) {
      newRank = currentRank - 1;
      reason = `ความแม่นยำลดลงเหลือ ${avgAccuracy.toFixed(1)}% (ไม่ผ่าน 2 ใน 3 ด่านล่าสุด)`;
    }

    // 4. Save and audit rank history
    if (newRank !== currentRank) {
      await supabase.from('learning_paths').update({
        current_rank: newRank
      }).eq('student_id', studentId);

      await supabase.from('rank_history').insert([{
        user_id: studentId,
        old_rank: currentRank,
        new_rank: newRank,
        reason
      }]);

      console.log(`Rank Updated automatically for ${studentId}: Rank ${currentRank} -> Rank ${newRank}. Reason: ${reason}`);
    }
  } catch (err) {
    console.error("Error updating adaptive rank:", err);
  }
}
