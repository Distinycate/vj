'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, XCircle, Trophy, Timer, Volume2, 
  Heart, Sparkles, AlertTriangle
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio } from '@/utils/audio';
import { generateStageQuestions, completeStage, getAdaptiveDifficulty } from '@/utils/adaptiveEngine';
import { normalizeAnswer, QuizChoice } from '@/lib/quizUtils';
import { useAntiCheat } from '@/hooks/useAntiCheat';

type GameStep = 'play' | 'reflection' | 'results';

export default function Game() {
  const { setScreen, progress, student, setProgress } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [gameState, setGameState] = useState<GameStep>('play');
  const isAnsweringRef = useRef(false); // Ref for strict debounce
  
  // Game Play States
  const [score, setScore] = useState(0);
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
  const [assistedWords, setAssistedWords] = useState<string[]>([]); // Track items used on specific words
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
      setGameState('results'); // Force end stage on cheat
    },
    (warnCount) => {
      setCheatWarning(warnCount);
      setTimeout(() => setCheatWarning(null), 3000);
    }
  );

  useEffect(() => {
    async function initStage() {
      const stageNum = progress?.current_stage || 1;

      // 1. Fetch stage ID
      const { data: stageData } = await supabase
        .from('stages')
        .select('id')
        .eq('stage_number', stageNum)
        .maybeSingle();
      
      if (stageData) {
        setCurrentStageId(stageData.id);
      }

      // 2. Fetch difficulty configuration from adaptive engine
      const diffConfig = await getAdaptiveDifficulty(student.id, stageNum);
      setDifficultyConfig(diffConfig);
      setTimeLeft(diffConfig.timeLimit || 15);

      // 3. Generate adaptive questions
      const generatedQuestions = await generateStageQuestions(student.id, stageNum);
      
      if (generatedQuestions && generatedQuestions.length > 0) {
        setWords(generatedQuestions);
      } else {
        setLoadError('ไม่พบชุดคำถามที่ผ่านการตรวจสอบสำหรับด่านนี้ กรุณาแจ้งคุณครูเพื่อตรวจคลังคำศัพท์');
      }

      // 4. Fetch student inventory
      const { data: userInventory } = await supabase
        .from('student_inventory')
        .select('*, items(*)')
        .eq('student_id', student.id);
      
      if (userInventory) {
        setInventory(
          userInventory.filter((item) => item.items && Number(item.quantity || 0) > 0)
        );
      }

      setLoading(false);
    }
    initStage();
  }, [progress, student.id]);

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

  // Timer loop
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
    
    // Strict 0.5s Debounce to prevent click spam
    isAnsweringRef.current = true;
    setTimeout(() => { isAnsweringRef.current = false; }, 500);

    setIsAnswered(true);
    setSelectedAnswer(answer);

    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    setResponseTimes(r => [...r, elapsed]);

    const wordObj = words[currentIndex];
    let isCorrect = false;

    if (qType === 'FILL_BLANK') {
      isCorrect = normalizeAnswer(answer) === normalizeAnswer(wordObj.correct_answer);
    } else if (typeof answer === 'object') {
      const selectedText = normalizeAnswer(answer.text);
      const correctText = normalizeAnswer(wordObj.correct_answer);
      isCorrect =
        answer.is_correct === true &&
        answer.word_id === wordObj.correct_word_id &&
        selectedText === correctText;
    }

    if (isCorrect) {
      setScore(s => s + 1);
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
    } else {
      setLives(l => l - 1);
      setComboCount(0); // break combo
      setWrongWords(w => [...w, wordObj.word_id || wordObj.id]);
    }

    setTimeout(() => {
      if (lives - (isCorrect ? 0 : 1) > 0 && currentIndex + 1 < words.length) {
        setCurrentIndex(c => c + 1);
      } else {
        setGameState('reflection'); // We'll repurpose this as a processing state
        handleProcessResults();
      }
    }, 2000);
  }

  const applyPowerup = async (itemCode: string) => {
    if (usedItemsThisStage.includes(itemCode)) return;

    // Find in inventory
    const inventoryItem = inventory.find(i => i.items.item_code === itemCode);
    if (!inventoryItem || inventoryItem.quantity <= 0) return;

    try {
      // 1. Consume item in Database
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

      // 2. Insert item usage log
      await supabase.from('item_usage_logs').insert([{
        student_id: student.id,
        item_id: inventoryItem.item_id,
        stage_id: currentStageId,
        question_word: words[currentIndex]?.word || null
      }]);

      // 3. Trigger item effect
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

  const handleProcessResults = async () => {
    // 1. Anti-Cheat: Validate Time
    if (!validateTime(words.length)) {
       return; // Block submission if speed hack is detected
    }

    const stageNum = progress?.current_stage || 1;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 10;

    const accuracyVal = Math.round((score / words.length) * 100);

    try {
      // 1. Call completeStage from adaptive engine
      const completeReport = await completeStage(student.id, stageNum, {
        score,
        accuracy: accuracyVal,
        responseTimeAvg: avgResponseTime,
        wrongWords: [...new Set(wrongWords)],
        correctWords: words
          .map((question) => question.word_id || question.id)
          .filter((wordId) => wordId && !wrongWords.includes(wordId)),
        totalQuestions: words.length,
        usedHints: usedHintsCount,
        assistedWords: [...new Set(assistedWords)]
      });

      setPassReport(completeReport);

      // 2. Fetch latest progress and attempts (Fire-and-forget to avoid blocking)
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
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังดาวน์โหลดชุดคำศัพท์ระบบ Adaptive...</p>
      </div>
    );
  }

  if (loadError || words.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-rose-500/20 p-8 rounded-3xl w-full max-w-md text-center"
        >
          <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">ยังเริ่มด่านไม่ได้</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{loadError}</p>
          <button
            onClick={() => setScreen('dashboard')}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold"
          >
            กลับหน้าแผนที่
          </button>
        </motion.div>
      </div>
    );
  }

  // PROCESSING SCREEN
  if (gameState === 'reflection') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-black text-white mb-2">กำลังประมวลผลด่านความยาก...</h2>
        <p className="text-slate-400 text-sm">Adaptive Engine กำลังคำนวณและปรับลด-เพิ่มความยากสำหรับคุณ</p>
      </div>
    );
  }

  // CHEAT DETECTED SCREEN
  if (cheatDetected) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">ยุติการทดสอบ (Invalid Run)</h2>
        <p className="text-slate-400 max-w-md mb-8">
          {cheatDetected === 'BLUR_MAX_WARNINGS' 
            ? 'ระบบตรวจพบการสลับหน้าจอ (พับแท็บ) เกิน 3 ครั้ง ซึ่งถือเป็นการผิดกฎการทดสอบในโหมดนี้'
            : 'ระบบตรวจพบการทำเวลาที่ผิดปกติ (Speed Hack) เวลาที่ใช้ในการทำข้อสอบน้อยเกินกว่าจะเป็นไปได้'}
        </p>
        <button onClick={() => setScreen('dashboard')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold">
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  // STEP 2: RESULTS SCREEN
  if (gameState === 'results') {
    const passed = passReport?.passed || false;
    const accuracyVal = Math.round((score / words.length) * 100);
    const isPerfect = accuracyVal === 100;
    const isNoHint = usedHintsCount === 0;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="text-center bg-slate-900 border border-slate-800 p-8 sm:p-12 rounded-3xl max-w-lg w-full shadow-2xl relative z-10"
        >
          {passed ? (
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
          ) : (
            <XCircle className="w-24 h-24 text-rose-500 mx-auto mb-6" />
          )}
          <h2 className="text-4xl font-black mb-2">{passed ? 'ภารกิจสำเร็จ! 🎉' : 'ไม่ผ่านเกณฑ์ 💔'}</h2>
          <p className="text-slate-400 mb-6">
            {passed 
              ? `คุณผ่านเกณฑ์ที่ระบบตั้งเป้าหมายไว้แล้ว! (${passReport?.targetPassScore}%)` 
              : `ด่านนี้ต้องทำคะแนนให้ได้มากกว่า ${passReport?.targetPassScore}% เพื่อก้าวข้ามไป`
            }
          </p>

          {/* Reward Bonus Badges */}
          {passed && (isPerfect || isNoHint) && (
            <div className="flex justify-center gap-2 mb-6">
              {isPerfect && (
                <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 font-extrabold px-3 py-1.5 rounded-full border border-amber-500/30">
                  🎉 PERFECT BONUS (+30%)
                </span>
              )}
              {isNoHint && (
                <span className="flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-400 font-extrabold px-3 py-1.5 rounded-full border border-indigo-500/30">
                  🧠 NO HINT BONUS (+20%)
                </span>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 block">คะแนนสะสม</span>
              <strong className="text-xl text-white">{score} / {words.length}</strong>
            </div>
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 block">คอมโบสูงสุด</span>
              <strong className="text-xl text-emerald-400">{maxCombo} Combo</strong>
            </div>
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 block">ความถูกต้อง</span>
              <strong className={`text-xl font-bold ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>{accuracyVal}%</strong>
            </div>
          </div>

          {/* Previous attempts for this stage */}
          {previousAttempts.length > 0 && (
            <div className="mt-2 mb-6 border-t border-slate-850 pt-4 text-left">
              <p className="text-slate-400 text-xs font-bold mb-2">📜 ประวัติความแม่นยำในการผจญภัยด่านนี้:</p>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                {previousAttempts.slice(-4).map((att, idx) => (
                  <div key={att.id || idx} className="bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-500">รอบที่ {idx + 1}:</span>
                    <span className={att.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {att.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleFinishGame} 
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black transition-all shadow-lg text-lg hover:scale-[1.02]"
          >
            กลับสู่แผนที่ผจญภัย 🧭
          </button>
        </motion.div>
      </div>
    );
  }

  // STEP 3: ACTIVE PLAYING GAMEPLAY SCREEN
  const currentWord = words[currentIndex];

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center relative overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      
      {/* Header Panel */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6 relative z-10">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
          {Array(3).fill(0).map((_, i) => (
            <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-slate-850'}`} />
          ))}
        </div>

        {/* Combo Multiplier indicator */}
        {comboCount > 0 && (
          <motion.div 
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-full font-black text-xs shadow-md animate-bounce"
          >
            ⚡ {comboCount} COMBO
          </motion.div>
        )}
        
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-full">
          <Timer className={timeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-emerald-400"} />
          <span className={`text-lg font-bold font-mono ${timeLeft <= 5 ? "text-rose-500" : "text-slate-100"}`}>{timeLeft}s</span>
        </div>

        <button 
          onClick={() => setScreen('dashboard')} 
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold"
        >
          <X className="w-4 h-4 text-rose-400" /> ยอมแพ้
        </button>
      </div>

      {/* Item powerups inventory dock */}
      <div className="w-full max-w-2xl flex flex-wrap justify-center gap-2 mb-6 relative z-10">
        {inventory.map((invItem) => {
          const itemCode = invItem.items.item_code;
          const isUsed = usedItemsThisStage.includes(itemCode);
          
          return (
            <button 
              key={invItem.id} 
              onClick={() => applyPowerup(itemCode)} 
              disabled={isUsed}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all ${
                isUsed 
                  ? 'opacity-40 bg-slate-950 border-slate-900 text-slate-600' 
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200 hover:scale-105'
              }`}
            >
              <span className="text-base">{invItem.items.image_url}</span>
              <span>{invItem.items.name} ({invItem.quantity})</span>
            </button>
          );
        })}
        {inventory.length === 0 && (
          <p className="text-slate-600 text-xs italic">ไม่มีไอเทมใช้งานในด่านนี้</p>
        )}
      </div>

      {/* Stage Progress line */}
      <div className="w-full max-w-2xl h-2 bg-slate-900 border border-slate-850 rounded-full mb-8 overflow-hidden relative z-10">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
          style={{ width: `${(currentIndex / words.length) * 100}%` }}
        />
      </div>

      {/* Main Game Interface Card */}
      <div className="flex-1 w-full max-w-2xl flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="text-center mb-8"
          >
            {qType === 'MEANING_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl w-full break-words">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-3">แปลศัพท์สเปกตรัม</span>
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 notranslate break-all" translate="no">{currentWord.word}</h2>
                <p className="text-slate-400 text-base sm:text-lg">แปลว่าอะไรในภาษาไทย?</p>
              </div>
            )}

            {qType === 'WORD_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl w-full break-words">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-3">ความหมายภาษาไทย</span>
                <h2 className="text-2xl sm:text-4xl font-black text-emerald-400 mb-2 break-words">{currentWord.prompt}</h2>
                <p className="text-slate-400 text-base sm:text-lg">ตรงกับคำศัพท์ภาษาอังกฤษคำใด?</p>
              </div>
            )}

            {qType === 'LISTENING_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl w-full">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-6">ฟังและเลือกสะกด</span>
                <button 
                  onClick={() => playWordAudio(currentWord.word)}
                  className="w-20 h-20 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all shadow-lg"
                >
                  <Volume2 className="w-10 h-10" />
                </button>
                <p className="text-slate-400 text-base">เสียงสะกดเป็นคำศัพท์ภาษาอังกฤษข้อใด?</p>
              </div>
            )}

            {qType === 'FILL_BLANK' && (
              <div className="bg-slate-900/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl w-full break-words">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-3">พิมพ์สะกดด่านความท้าทาย</span>
                <h2 className="text-2xl sm:text-4xl font-black text-emerald-400 mb-6 break-words">{currentWord.prompt}</h2>
                
                <form 
                  onSubmit={(e) => { e.preventDefault(); submitAnswer(fillAnswer); }}
                  className="w-full max-w-sm mx-auto"
                >
                  <input 
                    type="text" 
                    value={fillAnswer}
                    onChange={e => setFillAnswer(e.target.value)}
                    disabled={isAnswered}
                    autoFocus
                    placeholder="พิมพ์สะกดคำศัพท์..."
                    className="w-full text-center px-4 py-4 rounded-xl bg-slate-950 border border-slate-800 text-xl font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder-slate-650 mb-3"
                  />
                  {!isAnswered && (
                    <button type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-md">
                      ยืนยันคำตอบ ➡️
                    </button>
                  )}
                </form>
                {showHint && (
                  <p className="text-slate-400 text-xs mt-3 italic">
                    คำใบ้: ขึ้นต้นด้วยตัว <strong className="text-emerald-400 uppercase">{currentWord.word.charAt(0)}</strong> (คำนี้สะกดด้วย {currentWord.word.length} ตัวอักษร)
                  </p>
                )}
              </div>
            )}

            {qType === 'CONTEXT_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl w-full break-words">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-4">การเติมประโยคในบริบท</span>
                <div className="bg-slate-950 border border-slate-850 p-4 sm:p-6 rounded-2xl mb-4 italic text-slate-200 text-lg sm:text-xl font-medium leading-relaxed notranslate break-words" translate="no">
                  &ldquo;{currentWord.prompt}&rdquo;
                </div>
                <p className="text-slate-400 text-base sm:text-lg">เติมตัวเลือกข้อใดในช่องว่างจึงจะสมบูรณ์ที่สุด?</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Options grid for multiple choices quiz types */}
        {qType.includes('_MC') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {choices.map((choice, idx) => {
              if (!choice || choice.hidden) return <div key={`hidden-${idx}`} className="opacity-0 pointer-events-none"></div>;

              let btnClass = "bg-slate-900/50 hover:bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-350";
              let icon = null;

              if (isAnswered) {
                if (choice.is_correct === true) {
                  btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-lg shadow-emerald-500/10";
                  icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
                } else if (selectedAnswer !== null && typeof selectedAnswer === 'object' && selectedAnswer.word_id === choice.word_id && selectedAnswer.text === choice.text) {
                  btnClass = "bg-rose-500/20 border-rose-500 text-rose-300 font-extrabold shadow-lg";
                  icon = <XCircle className="w-5 h-5 text-rose-400" />;
                } else {
                  btnClass = "bg-slate-950 border-slate-950 text-slate-650 opacity-40";
                }
              }

              return (
                <button 
                  key={`${choice.word_id}-${idx}`}
                  onClick={() => submitAnswer(choice)}
                  disabled={isAnswered}
                  className={`p-4 sm:p-5 rounded-2xl border text-base sm:text-lg font-bold flex justify-between items-center transition-all ${btnClass} ${!isAnswered && 'hover:scale-[1.01]'} break-words`}
                >
                  <span className="flex-1 text-center notranslate break-words" translate="no">{choice.text}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback block for spelling input mode */}
        {isAnswered && qType === 'FILL_BLANK' && (
          <div className="text-center mt-6">
            {typeof selectedAnswer === 'string' && normalizeAnswer(selectedAnswer) === normalizeAnswer(currentWord.correct_answer) ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-lg">
                <CheckCircle className="w-5 h-5" /> ถูกต้องสมบูรณ์แบบ!
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 py-4 rounded-xl flex flex-col items-center gap-1.5 font-bold text-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> พิมพ์สะกดไม่ถูกต้อง
                </div>
                <span className="text-slate-400 text-sm">ตัวสะกดที่ถูกต้องคือ: <strong className="text-slate-200 font-extrabold text-base">{currentWord.word}</strong></span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
