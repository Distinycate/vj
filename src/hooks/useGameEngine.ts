import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio } from '@/utils/audio';
import { useDemoStore } from '@/store/useDemoStore';
import { generateStageQuestions, completeStage, getAdaptiveDifficulty, generateWeaknessBossQuestions } from '@/utils/adaptiveEngine';
import { normalizeAnswer, QuizChoice } from '@/lib/quizUtils';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { incrementMockQuestProgress } from '@/utils/questUtils';

export type GameStep = 'play' | 'reflection' | 'results';

export function useGameEngine() {
  const { setScreen, progress, student, setProgress, missionLevel, selectedStageNumber, setSelectedStageNumber, isBossMode, setBossMode } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [gameState, setGameState] = useState<GameStep>('play');
  const isAnsweringRef = useRef(false);
  
  // Game Play States
  const [score, setScore] = useState(0);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<QuizChoice | string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  
  // Combo and Streak mechanics
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [assistedWords, setAssistedWords] = useState<string[]>([]);
  const [usedHintsCount, setUsedHintsCount] = useState(0);

  // Difficulty settings from dynamic engine
  const [difficultyConfig, setDifficultyConfig] = useState<any>({
    timeLimit: 15,
    passScore: 75,
    hintMode: 'limited'
  });
  
  // Quiz Mode Details
  const [qType, setQType] = useState<string>('MEANING_MC');
  const [choices, setChoices] = useState<QuizChoice[]>([]);
  const [fillAnswer, setFillAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  
  // Inventory items
  const [inventory, setInventory] = useState<any[]>([]);
  const [usedItemsThisStage, setUsedItemsThisStage] = useState<string[]>([]);

  // Reflection State
  const [refWordsLearned, setRefWordsLearned] = useState('');
  const [refHardestWord, setRefHardestWord] = useState('');
  const [refFeeling, setRefFeeling] = useState('😊 สนุกปานกลาง');
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);

  // Stage Completion Report
  const [passReport, setPassReport] = useState<any>(null);

  // Anti Cheat States
  const [cheatWarning, setCheatWarning] = useState<number | null>(null);
  const [cheatDetected, setCheatDetected] = useState<string | null>(null);

  const { validateTime } = useAntiCheat(
    gameState === 'play',
    (reason) => {
      setCheatDetected(reason);
      setGameState('results');
    },
    (warnCount) => {
      setCheatWarning(warnCount);
      setTimeout(() => setCheatWarning(null), 3000);
    }
  );

  useEffect(() => {
    if (!student) return;

    async function initStage() {
      const stageNum = selectedStageNumber || progress?.current_stage || 1;
      const isDemoMode = useDemoStore.getState().isDemoMode;

      if (isDemoMode) {
        setCurrentStageId('demo-stage-id');
        setDifficultyConfig({ timeLimit: 15, passScore: 75, hintMode: 'limited' });
        setTimeLeft(15);

        const demoVocab = [
          { id: 'dv1', word: 'Advocate', meaning_th: 'สนับสนุน / ผู้สนับสนุน', part_of_speech: 'v./n.', stage_number: stageNum, difficulty_level: 'normal', example_sentence: null },
          { id: 'dv2', word: 'Elaborate', meaning_th: 'อธิบายอย่างละเอียด', part_of_speech: 'v.', stage_number: stageNum, difficulty_level: 'hard', example_sentence: null },
          { id: 'dv3', word: 'Persevere', meaning_th: 'อดทน / มุ่งมั่น', part_of_speech: 'v.', stage_number: stageNum, difficulty_level: 'normal', example_sentence: null },
          { id: 'dv4', word: 'Comprehend', meaning_th: 'เข้าใจ / รับรู้', part_of_speech: 'v.', stage_number: stageNum, difficulty_level: 'easy', example_sentence: null },
        ];

        const shuffleArr = (a: any[]) => [...a].sort(() => Math.random() - 0.5);
        const candidates = shuffleArr(demoVocab);
        const demoQuestions = demoVocab.map(word => {
          const distractors = candidates.filter(c => c.id !== word.id).slice(0, 3);
          const choices = shuffleArr([
            { word_id: word.id, text: word.meaning_th, is_correct: true },
            ...distractors.map(d => ({ word_id: d.id, text: d.meaning_th, is_correct: false }))
          ]);
          return {
            id: word.id,
            word: word.word,
            correct_answer: word.meaning_th,
            qType: 'MEANING_MC',
            choices,
            part_of_speech: word.part_of_speech,
          };
        });

        setWords(demoQuestions);
        setInventory([
          { id: 'mock-item-1', item_id: 'item-1', quantity: 3, items: { item_code: 'TIME_FREEZE', item_name: 'Time Freeze', item_type: 'powerup', description: 'เพิ่มเวลา 10 วินาที', icon_url: '⏳' } },
          { id: 'mock-item-2', item_id: 'item-2', quantity: 2, items: { item_code: 'FIFTY_FIFTY', item_name: '50/50', item_type: 'powerup', description: 'ตัดตัวเลือกผิด 2 ข้อ', icon_url: '✨' } },
          { id: 'mock-item-3', item_id: 'item-3', quantity: 5, items: { item_code: 'EXTRA_LIFE', item_name: 'Extra Life', item_type: 'powerup', description: 'เพิ่มพลังชีวิต 1 ดวง', icon_url: '❤️' } },
        ]);
        setLoading(false);
        return;
      }

      const { data: stageData } = await supabase
        .from('stages')
        .select('id')
        .eq('stage_number', stageNum)
        .maybeSingle();
      
      if (stageData) {
        setCurrentStageId(stageData.id);
      }

      const diffConfig = await getAdaptiveDifficulty(student.id, stageNum);
      setDifficultyConfig(diffConfig);
      setTimeLeft(diffConfig.timeLimit || 15);

      let generatedQuestions = [];
      if (isBossMode) {
        generatedQuestions = await generateWeaknessBossQuestions(student.id, 20);
      } else {
        generatedQuestions = await generateStageQuestions(student.id, stageNum, missionLevel);
      }
      
      if (generatedQuestions && generatedQuestions.length > 0) {
        setWords(generatedQuestions);
      } else {
        setLoadError('ไม่พบชุดคำถามที่ผ่านการตรวจสอบสำหรับด่านนี้ กรุณาแจ้งคุณครูเพื่อตรวจคลังคำศัพท์');
      }

      if (useDemoStore.getState().isDemoMode) {
        setInventory([
          { id: 'mock-item-1', student_id: student.id, item_id: 'item-1', quantity: 3, items: { item_code: 'TIME_FREEZE', item_name: 'Time Freeze', item_type: 'powerup', description: 'เพิ่มเวลา 10 วินาที', icon_url: '⏳' } },
          { id: 'mock-item-2', student_id: student.id, item_id: 'item-2', quantity: 2, items: { item_code: 'FIFTY_FIFTY', item_name: '50/50', item_type: 'powerup', description: 'ตัดตัวเลือกผิด 2 ข้อ', icon_url: '✨' } },
          { id: 'mock-item-3', student_id: student.id, item_id: 'item-3', quantity: 5, items: { item_code: 'EXTRA_LIFE', item_name: 'Extra Life', item_type: 'powerup', description: 'เพิ่มพลังชีวิต 1 ดวง', icon_url: '❤️' } },
          { id: 'mock-item-4', student_id: student.id, item_id: 'item-4', quantity: 10, items: { item_code: 'HINT', item_name: 'Hint', item_type: 'powerup', description: 'แสดงคำใบ้', icon_url: '💡' } }
        ]);
      } else {
        const { data: userInventory } = await supabase
          .from('student_inventory')
          .select('*, items(*)')
          .eq('student_id', student.id);
        
        if (userInventory) {
          setInventory(
            userInventory.filter((item) => item.items && Number(item.quantity || 0) > 0)
          );
        }
      }

      setLoading(false);
    }
    initStage();
  }, [progress, selectedStageNumber, student?.id, missionLevel]);

  useEffect(() => {
    if (gameState === 'play' && words.length > 0 && currentIndex < words.length) {
      setupQuestion(words[currentIndex]);
    }
  }, [gameState, currentIndex, words]);

  function setupQuestion(word: any) {
    setQType(word.qType || 'MEANING_MC');
    setChoices(word.choices || []);
    setShowHint(false);

    if (word.question_type === 'listening_mc' || word.qType === 'LISTENING_MC') {
      setTimeout(() => playWordAudio(word.word), 300);
    }

    setFillAnswer('');
    setTimeLeft(difficultyConfig.timeLimit || 15);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setQuestionStartTime(Date.now());
  }

  useEffect(() => {
    if (gameState !== 'play' || loading || isAnswered || currentIndex >= words.length || lives <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          submitAnswer('');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, loading, isAnswered, currentIndex, words, lives, difficultyConfig]);

  async function submitAnswer(answer: QuizChoice | string) {
    if (isAnswered || isAnsweringRef.current) return;
    
    isAnsweringRef.current = true;
    setTimeout(() => { isAnsweringRef.current = false; }, 500);

    setIsAnswered(true);
    setSelectedAnswer(answer);

    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    const finalResponseTimes = [...responseTimes, elapsed];
    setResponseTimes(finalResponseTimes);

    const wordObj = words[currentIndex];
    let isCorrect = false;

    if (qType === 'FILL_BLANK') {
      isCorrect = normalizeAnswer(answer as string) === normalizeAnswer(wordObj.correct_answer);
    } else if (typeof answer === 'object') {
      const selectedText = normalizeAnswer(answer.text);
      const correctText = normalizeAnswer(wordObj.correct_answer);
      isCorrect =
        answer.is_correct === true &&
        answer.word_id === wordObj.correct_word_id &&
        selectedText === correctText;
    }

    const finalScore = score + (isCorrect ? 1 : 0);
    const finalWrongWords = isCorrect ? wrongWords : [...wrongWords, wordObj.word_id || wordObj.id];

    if (isCorrect) {
      setScore(s => s + 1);
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
      
      setShowScorePopup(true);
      setTimeout(() => setShowScorePopup(false), 1000);
    } else {
      setLives(l => l - 1);
      setComboCount(0);
      setWrongWords(w => [...w, wordObj.word_id || wordObj.id]);
      
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 500);
    }

    setTimeout(() => {
      const nextLives = lives - (isCorrect ? 0 : 1);
      if (nextLives > 0 && currentIndex + 1 < words.length) {
        setCurrentIndex(c => c + 1);
      } else {
        setGameState('reflection');
        handleProcessResults(finalScore, finalWrongWords, finalResponseTimes);
      }
    }, 2000);
  }

  const applyPowerup = async (itemCode: string) => {
    if (!student || usedItemsThisStage.includes(itemCode)) return;

    const inventoryItem = inventory.find(i => i.items.item_code === itemCode);
    if (!inventoryItem || inventoryItem.quantity <= 0) return;

    try {
      if (!useDemoStore.getState().isDemoMode) {
        if (inventoryItem.quantity > 1) {
          await supabase
            .from('student_inventory')
            .update({ quantity: inventoryItem.quantity - 1 })
            .eq('id', inventoryItem.id);
        } else {
          await supabase
            .from('student_inventory')
            .delete()
            .eq('id', inventoryItem.id);
        }

        await supabase.from('item_usage_logs').insert([{
          student_id: student.id,
          item_id: inventoryItem.item_id,
          stage_id: currentStageId,
          question_word: words[currentIndex]?.word || null
        }]);
      }

      if (itemCode === 'TIME_FREEZE') {
        setTimeLeft(t => t + 10);
      } else if (itemCode === 'EXTRA_LIFE') {
        setLives(l => Math.min(3, l + 1));
      } else if (itemCode === 'FIFTY_FIFTY') {
        const wrongList = choices.filter((c: any) => c && c.is_correct === false);
        const toHide = wrongList.sort(() => 0.5 - Math.random()).slice(0, 2);
        setChoices(choices.map((c: any) => toHide.includes(c) ? { ...c, hidden: true } : c));
        setAssistedWords(prev => [...new Set([...prev, words[currentIndex]?.word_id || words[currentIndex]?.id])]);
      } else if (itemCode === 'HINT') {
        setShowHint(true);
        setUsedHintsCount(h => h + 1);
        setAssistedWords(prev => [...new Set([...prev, words[currentIndex]?.word_id || words[currentIndex]?.id])]);
      }

      setUsedItemsThisStage(u => [...u, itemCode]);
      setInventory(inv => inv.map(i => i.id === inventoryItem.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));

    } catch (err) {
      console.error('Error consuming item:', err);
    }
  };

  const handleProcessResults = async (finalScore = score, finalWrongWords = wrongWords, finalResponseTimes = responseTimes) => {
    if (!validateTime(words.length) || !student) {
       return;
    }

    const stageNum = selectedStageNumber || progress?.current_stage || 1;
    const avgResponseTime = finalResponseTimes.length > 0 
      ? finalResponseTimes.reduce((a, b) => a + b, 0) / finalResponseTimes.length 
      : 10;

    const accuracyVal = Math.round((finalScore / words.length) * 100);

    if (student?.id) {
      incrementMockQuestProgress(student.id, '1', 1);
      if (accuracyVal === 100) {
        incrementMockQuestProgress(student.id, '2', 1);
      }
      if (isBossMode) {
        const correctCount = words.length - finalWrongWords.length;
        if (correctCount > 0) {
          incrementMockQuestProgress(student.id, '3', correctCount);
        }
      }
    }

    try {
      const completeReport = await completeStage(student.id, stageNum, {
        score: finalScore,
        accuracy: accuracyVal,
        responseTimeAvg: avgResponseTime,
        wrongWords: [...new Set(finalWrongWords)],
        correctWords: words
          .map((question) => question.word_id || question.id)
          .filter((wordId) => wordId && !finalWrongWords.includes(wordId)),
        totalQuestions: words.length,
        usedHints: usedHintsCount,
        assistedWords: [...new Set(assistedWords)]
      }, missionLevel);

      setPassReport(completeReport);

      supabase.from('learning_paths').select('*').eq('student_id', student.id).single().then(({ data }) => {
        if (data) setProgress(data);
      }, e => console.error(e));
      
      if (currentStageId) {
        supabase.from('stage_results').select('*').eq('user_id', student.id).eq('stage_number', stageNum).order('created_at', { ascending: true }).then(({ data }) => {
          setPreviousAttempts(data || []);
        }, e => console.error(e));
      }

    } catch (err) {
      console.error('Error submitting stage result:', err);
    }

    setGameState('results');
  };

  const handleFinishGame = () => {
    setSelectedStageNumber(null);
    setBossMode(false);
    setScreen('dashboard');
  };

  return {
    student, progress, isBossMode,
    words, currentIndex, loading, loadError, gameState,
    score, showScorePopup, shakeScreen, lives, timeLeft, isAnswered, selectedAnswer,
    comboCount, maxCombo, wrongWords, assistedWords, usedHintsCount,
    difficultyConfig, qType, choices, fillAnswer, setFillAnswer, showHint,
    inventory, usedItemsThisStage,
    refWordsLearned, setRefWordsLearned, refHardestWord, setRefHardestWord, refFeeling, setRefFeeling,
    previousAttempts, passReport, cheatWarning, cheatDetected,
    submitAnswer, applyPowerup, handleFinishGame
  };
}
