import { supabase } from '@/utils/supabase/client';
import { createTeamScoreEvent } from '@/utils/teamBattleEngine';
import { ADAPTIVE_RANK_CONFIG, RankConfig, getWorldForStage } from './adaptiveConfig';
import { useDemoStore } from '@/store/useDemoStore';
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
  let rank = 1;
  if (useDemoStore.getState().isDemoMode) {
    rank = useDemoStore.getState().demoProgress?.current_rank || 1;
  } else {
    try {
      const profRes = await fetch(`/api/student/profile${studentId ? `?studentId=${studentId}` : ''}`);
      if (profRes.ok) {
        const profJson = await profRes.json();
        rank = profJson?.learningPath?.current_rank || 1;
      }
    } catch {}
  }
  const config = ADAPTIVE_RANK_CONFIG[rank] || ADAPTIVE_RANK_CONFIG[1];
  
  return {
    rank,
    ...config
  };
}

// 2. GENERATE STAGE QUESTIONS (ADAPTIVE QUESTION GENERATION ENGINE)
export async function generateStageQuestions(studentId: string, stageNumber: number, missionLevel: number = 1): Promise<any[]> {
  try {
    // 1. Fetch current rank configuration
    const diffInfo = await getAdaptiveDifficulty(studentId, stageNumber);
    const { difficultyMix, questionCount } = diffInfo;
    let { questionTypes } = diffInfo;
    
    // Override questionTypes based on missionLevel (Stars)
    if (missionLevel === 1) {
       questionTypes = ['meaning_mc', 'word_mc', 'context_mc'];
    } else if (missionLevel === 2) {
       questionTypes = ['listening_mc', 'meaning_mc', 'word_mc'];
    } else if (missionLevel === 3) {
       questionTypes = ['spelling', 'context_mc'];
    }

    // Skull Mode / External Student Override (100% Multiple Choice only)
    let isSkullOrExternal = false;
    try {
      const res = await fetch(`/api/student/profile${studentId ? `?studentId=${studentId}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        isSkullOrExternal = json?.student?.is_skull || json?.student?.user_type === 'EXTERNAL' || false;
      }
    } catch {}
    if (isSkullOrExternal) {
      questionTypes = ['meaning_mc', 'word_mc']; // Force multiple choice only
    }

    const isBoss = stageNumber % 10 === 0 || stageNumber % 10 === 5;
    const targetCount = 10;

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

    let selectedWords: any[] = [];

    if (isBoss) {
      // Boss Stage: Guarantee coverage across all stages in the world
      const world = getWorldForStage(stageNumber);
      const stagesInWorld = world.stageRange[1] - world.stageRange[0] + 1;
      
      // Calculate how many words we can safely take from each stage as a baseline
      const basePerStage = Math.max(1, Math.floor(targetCount / stagesInWorld));
      
      // Group words by stage_number
      const wordsByStage: Record<number, any[]> = {};
      stageWords.forEach(w => {
         if (!wordsByStage[w.stage_number]) wordsByStage[w.stage_number] = [];
         wordsByStage[w.stage_number].push(w);
      });
      
      // 1. Pick base coverage from each stage to test overall knowledge
      for (let s = world.stageRange[0]; s <= world.stageRange[1]; s++) {
         if (wordsByStage[s] && wordsByStage[s].length > 0) {
            selectedWords.push(...sample(wordsByStage[s], basePerStage));
         }
      }
      
      // 2. Fill the rest to meet targetCount using random sample from remaining words
      if (selectedWords.length < targetCount) {
         const remainingCount = targetCount - selectedWords.length;
         const unselected = stageWords.filter(sw => !selectedWords.some(w => w.id === sw.id));
         selectedWords.push(...sample(unselected, remainingCount));
      }
    } else {
      // Normal Stage: Sample from categories based on difficulty mix
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

    const minRequired = Math.min(5, Math.floor(targetCount * 0.6));
    if (questions.length < minRequired) {
      console.warn(`Only generated ${questions.length} questions out of ${targetCount}. Rejecting to prevent auto-pass exploit.`);
      return [];
    }

    return questions;
  } catch (err) {
    console.error("Error generating stage questions:", err);
    return [];
  }
}

export async function generateWeaknessBossQuestions(studentId: string, limit: number = 20) {
  try {
    // Fetch user's weakest words (mastery < 3, ordered by mastery ascending or next_review_at)
    const { data: weakWordsData, error } = await supabase
      .from('user_review_words')
      .select('*, vocabulary:word_id(*)')
      .eq('user_id', studentId)
      .lt('mastery_level', 4)
      .order('mastery_level', { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!weakWordsData || weakWordsData.length === 0) return [];

    const targetWords = weakWordsData.map(w => w.vocabulary).filter(Boolean);

    // Fetch all words for distractors
    const allVocabularyList = await supabase
      .from('vocabulary')
      .select('*')
      .eq('is_active', true)
      .limit(250)
      .then((response) => response.data?.length ? response.data : targetWords);

    const questions: any[] = [];
    
    for (const targetWord of targetWords) {
      // Prioritize contextual puzzle for boss mode if sentence exists
      const chosenType: QuestionType = (targetWord.example_sentence && Math.random() > 0.3) ? 'context_mc' : 'meaning_mc';

      const question = await generateValidQuestion({
        targetWord,
        questionType: chosenType,
        candidates: allVocabularyList
      });

      if (question) {
        questions.push(question);
      }
    }

    return questions;
  } catch (err) {
    console.error("Error generating boss questions:", err);
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

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createBlankedSentence(sentence: string | null | undefined, word: string): string | null {
  if (!sentence || typeof sentence !== 'string') return null;
  const trimmed = sentence.trim();
  if (!trimmed) return null;

  // If already explicitly blanked in DB
  if (trimmed.includes('________') || trimmed.includes('_____')) {
    return trimmed;
  }

  if (!word || typeof word !== 'string') return null;
  const cleanWord = word.trim();
  if (!cleanWord) return null;

  // Try matching whole word + optional morphological suffix (e.g. advocate/advocated/advocates/advocating)
  const escaped = escapeRegExp(cleanWord);
  const regexWithSuffix = new RegExp(`\\b${escaped}(?:s|es|d|ed|ing|ly)?\\b`, 'gi');
  let blanked = trimmed.replace(regexWithSuffix, '_____');

  if (blanked.includes('_____')) {
    return blanked;
  }

  // Fallback: simple case-insensitive substring replacement if word is >= 3 chars
  if (cleanWord.length >= 3) {
    const directRegex = new RegExp(escaped, 'gi');
    blanked = trimmed.replace(directRegex, '_____');
    if (blanked.includes('_____')) {
      return blanked;
    }
  }

  return null;
}

function buildRawQuestion({ targetWord, questionType, candidates }: { targetWord: any, questionType: QuestionType, candidates: any[] }) {
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
      if (targetWord.example_sentence || targetWord.example) {
        const blanked = createBlankedSentence(targetWord.example_sentence || targetWord.example, targetWord.word);
        if (blanked) {
          return createContextFillQuestion(targetWord);
        }
      }
      return createSpellingQuestion(targetWord);
    default:
      return createMeaningMcQuestion(targetWord, candidates);
  }
}

function createListeningQuestion(targetWord: any, candidates: any[]) {
  const config = QUESTION_ANSWER_CONFIG.listening_mc;
  const answerField = config.choiceField || config.answerField;
  const targetId = targetWord.id || targetWord.word_id;
  const distractors = filterDistractors({
    targetWord,
    candidates,
    answerField,
    limit: 3
  });

  const correctChoice = {
    word_id: targetId,
    text: getVocabularyField(targetWord, config.answerField),
    is_correct: true
  };

  const wrongChoices = (distractors as any[]).map((word: any) => ({
    word_id: word.id || word.word_id,
    text: getVocabularyField(word, answerField),
    is_correct: false
  }));

  const choices = shuffleArray(uniqueChoicesByText([correctChoice, ...wrongChoices]));

  return {
    id: targetId,
    qType: "LISTENING_MC",
    question_type: "listening_mc",
    word_id: targetId,
    correct_word_id: targetId,
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
  const blanked = createBlankedSentence(targetWord.example_sentence || targetWord.example, targetWord.word);
  const thaiMeaning = getVocabularyField(targetWord, "meaning_th");
  const targetId = targetWord.id || targetWord.word_id;

  return {
    id: targetId,
    qType: "FILL_BLANK",
    question_type: "spelling",
    word_id: targetId,
    correct_word_id: targetId,
    prompt: blanked || thaiMeaning,
    correct_answer: targetWord.blank_answer || targetWord.word,
    answer_language: 'en',
    word: targetWord.word,
    meaning: thaiMeaning
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
  const targetId = targetWord.id || targetWord.word_id;
  const distractors = filterDistractors({
    targetWord,
    candidates,
    answerField,
    limit: 3
  });

  const correctChoice: QuizChoice = {
    word_id: targetId,
    text: correctAnswer,
    is_correct: true
  };

  const wrongChoices: QuizChoice[] = (distractors as any[]).map((word: any) => ({
    word_id: word.id || word.word_id,
    text: getVocabularyField(word, answerField),
    is_correct: false
  }));

  const choices = shuffleArray(uniqueChoicesByText([correctChoice, ...wrongChoices]));

  return {
    id: targetId,
    qType,
    question_type: questionType,
    word_id: targetId,
    correct_word_id: targetId,
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
  const blanked = createBlankedSentence(targetWord.example_sentence || targetWord.example, targetWord.word);

  if (!blanked) {
    return createMeaningMcQuestion(targetWord, candidates);
  }

  return createChoiceQuestion({
    targetWord,
    candidates,
    questionType: "context_mc",
    qType: "CONTEXT_MC",
    prompt: blanked,
    example: String(targetWord.example_sentence || targetWord.example || ""),
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

