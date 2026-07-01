import { supabase } from '@/utils/supabase/client';
import { ADAPTIVE_RANK_CONFIG, RankConfig, STORY_WORLDS, getWorldForStage } from './adaptiveConfig';

// 1. GET ADAPTIVE DIFFICULTY PARAMETERS
export async function getAdaptiveDifficulty(studentId: string, stageNumber: number): Promise<RankConfig & { rank: number }> {
  // Query student's current rank from learning_paths
  const { data: pathData, error } = await supabase
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
    let wordsQuery = supabase.from('vocabulary').select('*');
    
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
    const allVocabularyList = stageWords.length >= 10 ? stageWords : await supabase.from('vocabulary').select('*').limit(20).then(r => r.data || []);
    
    const formattedQuestions = selectedWords.map((wordItem, idx) => {
      // Pick random question type from rank choices
      let chosenType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      if (chosenType === 'mixed_challenge') {
        const standardTypes = ['meaning_mc', 'word_mc', 'listening_mc', 'context_mc', 'spelling'];
        chosenType = standardTypes[Math.floor(Math.random() * standardTypes.length)];
      }

      // Generate wrong choices from vocabulary list
      const wrongCandidates = allVocabularyList.filter(v => v.id !== wordItem.id);
      const shuffledWrong = wrongCandidates.sort(() => 0.5 - Math.random());
      
      let choices: string[] = [];
      let correctChoice = '';

      if (chosenType === 'meaning_mc' || chosenType === 'listening_mc') {
        correctChoice = wordItem.meaning;
        choices = [
          correctChoice,
          shuffledWrong[0]?.meaning || 'ตัวเลือกหลอก A',
          shuffledWrong[1]?.meaning || 'ตัวเลือกหลอก B',
          shuffledWrong[2]?.meaning || 'ตัวเลือกหลอก C',
        ];
      } else if (chosenType === 'word_mc' || chosenType === 'context_mc') {
        correctChoice = wordItem.word;
        choices = [
          correctChoice,
          shuffledWrong[0]?.word || 'distractor1',
          shuffledWrong[1]?.word || 'distractor2',
          shuffledWrong[2]?.word || 'distractor3',
        ];
      } else {
        // spelling / fill_blank
        correctChoice = wordItem.word;
        choices = [];
      }

      // Shuffle choices
      choices = choices.sort(() => 0.5 - Math.random());

      return {
        id: wordItem.id,
        word: wordItem.word,
        meaning: wordItem.meaning,
        phonetic: wordItem.phonetic,
        example: wordItem.example_sentence || wordItem.example || '',
        audio_url: wordItem.audio_url || '',
        qType: chosenType === 'spelling' ? 'FILL_BLANK' : 
               chosenType === 'meaning_mc' ? 'MEANING_MC' :
               chosenType === 'word_mc' ? 'WORD_MC' :
               chosenType === 'listening_mc' ? 'LISTENING_MC' : 'CONTEXT_MC',
        choices,
        correctChoice
      };
    });

    return formattedQuestions;
  } catch (err) {
    console.error("Error generating stage questions:", err);
    return [];
  }
}

// 3. COMPLETE STAGE LOGIC (POST-GAME ASSESSMENT & REWARDS)
export interface CompleteStageResult {
  score: number;
  accuracy: number;
  responseTimeAvg: number;
  wrongWords: string[]; // List of vocabulary IDs wrong
  usedHints: number;
}

export async function completeStage(studentId: string, stageNumber: number, result: CompleteStageResult) {
  try {
    const { score, accuracy, responseTimeAvg, wrongWords, usedHints } = result;
    const isBoss = stageNumber % 10 === 0;

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

    // 3. Spaced Repetition / Wrong Words logging
    if (wrongWords.length > 0) {
      for (const wordId of wrongWords) {
        // Get existing review info
        const { data: existingWord } = await supabase
          .from('user_review_words')
          .select('wrong_count, mastery_level')
          .eq('user_id', studentId)
          .eq('word_id', wordId)
          .maybeSingle();

        const wrongCount = (existingWord?.wrong_count || 0) + 1;
        // Decrease mastery level by 1 on mistake (min 0)
        const oldMastery = existingWord?.mastery_level || 0;
        const newMastery = Math.max(0, oldMastery - 1);
        
        // Calculate next_review_at based on mastery_level
        // level 0: immediately, level 1: 1 day, level 2: 3 days, level 3: 7 days
        const reviewIntervals = [0, 1, 3, 7];
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + reviewIntervals[newMastery]);

        await supabase.from('user_review_words').upsert({
          user_id: studentId,
          word_id: wordId,
          wrong_count: wrongCount,
          mastery_level: newMastery,
          last_wrong_at: new Date().toISOString(),
          next_review_at: nextReviewDate.toISOString()
        }, { onConflict: 'user_id,word_id' });
      }
    }

    // 4. Update Mastery level for words answered correctly (Spaced Repetition promotion)
    // First retrieve correct words (words in stage pool not in wrong list)
    const { data: stageVocab } = await supabase.from('vocabulary').select('id').eq('stage_number', stageNumber);
    if (stageVocab) {
      const correctWordIds = stageVocab.map(v => v.id).filter(id => !wrongWords.includes(id));
      for (const wordId of correctWordIds) {
        const { data: existingWord } = await supabase
          .from('user_review_words')
          .select('wrong_count, mastery_level')
          .eq('user_id', studentId)
          .eq('word_id', wordId)
          .maybeSingle();

        if (existingWord) {
          // Increment mastery level on correct answer (max 4)
          const newMastery = Math.min(4, (existingWord.mastery_level || 0) + 1);
          const reviewIntervals = [0, 1, 3, 7, 30]; // level 4: 30 days
          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + reviewIntervals[newMastery]);

          await supabase.from('user_review_words').update({
            mastery_level: newMastery,
            next_review_at: nextReviewDate.toISOString()
          })
          .eq('user_id', studentId)
          .eq('word_id', wordId);
        }
      }
    }

    // 5. Calculate coins & EXP rewards (only if passed)
    if (passed) {
      // Rank Multipliers: Rank 1: x1, Rank 2: x1.2, Rank 3: x1.4, Rank 4: x1.7, Rank 5: x2
      const rankMultipliers = [1, 1, 1.2, 1.4, 1.7, 2];
      const baseCoins = 20;
      const baseExp = 15;
      const rankMult = rankMultipliers[rank] || 1;
      
      let earnedCoins = baseCoins * rankMult;
      let earnedExp = baseExp * rankMult;

      // Boss stage x2 rewards
      if (isBoss) {
        earnedCoins *= 2;
        earnedExp *= 2;
      }

      // No-hint bonus +20%
      if (usedHints === 0) {
        earnedCoins *= 1.2;
        earnedExp *= 1.2;
      }

      // Perfect 100% accuracy bonus +30%
      if (accuracy === 100) {
        earnedCoins *= 1.3;
        earnedExp *= 1.3;
      }

      earnedCoins = Math.round(earnedCoins);
      earnedExp = Math.round(earnedExp);

      // Fetch current learning path stats
      const { data: pathData } = await supabase
        .from('learning_paths')
        .select('coins, exp, total_exp, current_stage')
        .eq('student_id', studentId)
        .single();

      if (pathData) {
        const newCoins = (pathData.coins || 0) + earnedCoins;
        const newExp = (pathData.exp || 0) + earnedExp;
        const newTotalExp = (pathData.total_exp || 0) + earnedExp;
        const nextStageNum = Math.min(100, Math.max(pathData.current_stage || 1, stageNumber + 1));

        // Update learning path record
        await supabase
          .from('learning_paths')
          .update({
            coins: newCoins,
            exp: newExp,
            total_exp: newTotalExp,
            current_stage: nextStageNum,
            last_active_date: new Date().toISOString()
          })
          .eq('student_id', studentId);

        // Record coin transactions
        await supabase.from('coins_transactions').insert([{
          student_id: studentId,
          amount: earnedCoins,
          source: `STAGE_${stageNumber}_PASS`
        }]);
      }
    }

    // 6. Update dynamic Adaptive Rank
    await updateAdaptiveRank(studentId);

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
    // 1. Fetch 5 most recent stage results
    const { data: recentResults, error } = await supabase
      .from('stage_results')
      .select('accuracy, passed, response_time_avg')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !recentResults || recentResults.length < 5) {
      // Need at least 5 records to auto-tune rank
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
    const avgAccuracy = recentResults.reduce((sum, r) => sum + r.accuracy, 0) / 5;
    const avgResponseTime = recentResults.reduce((sum, r) => sum + r.response_time_avg, 0) / 5;

    let newRank = currentRank;
    let reason = '';

    // Up-rank Condition: Pass 5/5 latest, average accuracy > 90%, and average response time < 8s
    if (passedCount === 5 && avgAccuracy >= 90 && avgResponseTime < 8.0 && currentRank < 5) {
      newRank = currentRank + 1;
      reason = `ผ่านด่าน 5 ครั้งรวดความถูกต้องเฉลี่ย ${avgAccuracy.toFixed(1)}% (ตอบสนองเร็วเฉลี่ย ${avgResponseTime.toFixed(1)}s)`;
    }
    // Down-rank Condition: Failed at least 3/5 times, or average accuracy < 50%
    else if ((passedCount <= 2 || avgAccuracy < 50) && currentRank > 1) {
      newRank = currentRank - 1;
      reason = `ทำผลคะแนนเฉลี่ยหล่นมาที่ ${avgAccuracy.toFixed(1)}% (ผ่านน้อยกว่า 3 ด่านจาก 5 ด่านล่าสุด)`;
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
