'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Trophy, Timer, Volume2, Snowflake, Scissors, Heart, Sparkles, BookOpen, AlertCircle, HelpCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';

type GameStep = 'goal' | 'play' | 'reflection' | 'results';

export default function Game() {
  const { setScreen, progress, student, setProgress } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameStep>('goal');
  
  // Game Play States
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  
  // Quiz Mode Details
  const [qType, setQType] = useState<string>('MEANING_MC');
  const [choices, setChoices] = useState<string[]>([]);
  const [fillAnswer, setFillAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  
  // Inventory items
  const [inventory, setInventory] = useState<any[]>([]);
  const [usedItemsThisStage, setUsedItemsThisStage] = useState<string[]>([]);

  // Goal Setting State
  const [goalWords, setGoalWords] = useState(10);
  const [goalStages, setGoalStages] = useState(1);
  const [goalTime, setGoalTime] = useState(5);

  // Reflection State
  const [refWordsLearned, setRefWordsLearned] = useState('');
  const [refHardestWord, setRefHardestWord] = useState('');
  const [refFeeling, setRefFeeling] = useState('😊 สนุกปานกลาง');

  // Text-To-Speech
  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = 'en-US';
      window.speechSynthesis.speak(msg);
    }
  };

  useEffect(() => {
    async function initStage() {
      const stageNum = progress?.current_stage || 1;
      const rank = progress?.current_rank || 1;

      // 1. Resolve Stage ID
      const { data: stageData } = await supabase
        .from('stages')
        .select('id')
        .eq('stage_number', stageNum)
        .single();
      
      let stageId = null;
      if (stageData) {
        stageId = stageData.id;
        setCurrentStageId(stageId);
      }

      // 2. Fetch vocabulary for current stage
      const { data: stageVocab } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('stage', stageNum);

      let finalWordPool = stageVocab || [];

      // 3. Spaced Repetition / Wrong Words Integration
      // Fetch up to 3 wrong words to mix in
      const { data: wrongWordsData } = await supabase
        .from('wrong_words')
        .select('word_id, error_count')
        .eq('student_id', student.id)
        .order('error_count', { ascending: false })
        .limit(5);

      if (wrongWordsData && wrongWordsData.length > 0 && finalWordPool.length > 0) {
        const wrongWordIds = wrongWordsData.map(w => w.word_id);
        const { data: wrongVocab } = await supabase
          .from('vocabulary')
          .select('*')
          .in('id', wrongWordIds);

        if (wrongVocab && wrongVocab.length > 0) {
          // Replace last 2-3 words with wrong words if not already in pool
          let replacedCount = 0;
          wrongVocab.forEach(wv => {
            if (replacedCount < 3 && !finalWordPool.some(w => w.word === wv.word)) {
              const replaceIndex = finalWordPool.length - 1 - replacedCount;
              if (replaceIndex >= 0) {
                finalWordPool[replaceIndex] = wv;
                replacedCount++;
              }
            }
          });
        }
      }

      // If pool is empty, provide mockup fallbacks
      if (finalWordPool.length === 0) {
        finalWordPool = [
          { id: 'mock-1', word: 'elephant', meaning: 'ช้าง', example: 'The elephant is huge.', phonetic: '/ˈel.ɪ.fənt/' },
          { id: 'mock-2', word: 'butterfly', meaning: 'ผีเสื้อ', example: 'A butterfly has wings.', phonetic: '/ˈbʌt.ə.flaɪ/' },
          { id: 'mock-3', word: 'giraffe', meaning: 'ยีราฟ', example: 'Giraffes have long necks.', phonetic: '/dʒɪˈrɑːf/' },
          { id: 'mock-4', word: 'dolphin', meaning: 'โลมา', example: 'Dolphins are intelligent.', phonetic: '/ˈdɒl.fɪn/' },
          { id: 'mock-5', word: 'leopard', meaning: 'เสือดาว', example: 'Leopards can run fast.', phonetic: '/ˈlep.əd/' }
        ];
      }

      setWords(finalWordPool.sort(() => 0.5 - Math.random()));

      // 4. Fetch Student Inventory
      const { data: userInventory } = await supabase
        .from('student_inventory')
        .select('*, items(*)')
        .eq('student_id', student.id);
      
      if (userInventory) {
        setInventory(userInventory);
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

  const setupQuestion = (word: any) => {
    const rank = progress?.current_rank || 1;
    let pool: string[] = [];

    // Rank-based quiz formats selection
    if (rank === 1) {
      pool = ['MEANING_MC', 'WORD_MC'];
    } else if (rank === 2) {
      pool = ['MEANING_MC', 'WORD_MC', 'LISTENING_MC'];
    } else if (rank === 3) {
      pool = ['MEANING_MC', 'WORD_MC', 'LISTENING_MC', 'FILL_BLANK'];
    } else {
      pool = ['MEANING_MC', 'WORD_MC', 'LISTENING_MC', 'FILL_BLANK', 'CONTEXT_MC'];
    }

    const type = pool[Math.floor(Math.random() * pool.length)];
    setQType(type);
    setShowHint(false);

    if (type.includes('_MC')) {
      const isWordMatch = type === 'WORD_MC' || type === 'LISTENING_MC' || type === 'CONTEXT_MC';
      const correct = isWordMatch ? word.word : word.meaning;

      const wrongs = words
        .filter(w => w.word !== word.word)
        .map(w => isWordMatch ? w.word : w.meaning);

      while (wrongs.length < 3) {
        wrongs.push(isWordMatch ? `option-${Math.random()}` : `ความหมาย-${Math.random()}`);
      }

      const allChoices = [correct, ...wrongs.sort(() => 0.5 - Math.random()).slice(0, 3)];
      setChoices(allChoices.sort(() => 0.5 - Math.random()));
    }

    if (type === 'LISTENING_MC') {
      setTimeout(() => speakWord(word.word), 300);
    }

    setFillAnswer('');
    setTimeLeft(15);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setQuestionStartTime(Date.now());
  };

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
  }, [gameState, loading, isAnswered, currentIndex, words, lives]);

  const submitAnswer = async (answer: string) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);

    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    setResponseTimes(r => [...r, elapsed]);

    const wordObj = words[currentIndex];
    let isCorrect = false;

    if (qType === 'MEANING_MC') isCorrect = answer === wordObj.meaning;
    else if (qType === 'WORD_MC' || qType === 'LISTENING_MC' || qType === 'CONTEXT_MC') isCorrect = answer === wordObj.word;
    else if (qType === 'FILL_BLANK') isCorrect = answer.trim().toLowerCase() === wordObj.word.toLowerCase();

    // Spaced Repetition & Wrong Words Logging
    if (isCorrect) {
      setScore(s => s + 1);
      // If correct, update/upsert spaced repetition interval
      await supabase.from('spaced_repetition').upsert([{
        student_id: student.id,
        word_id: wordObj.id,
        interval_days: 2,
        next_review_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      }], { onConflict: 'student_id,word_id' });
    } else {
      setLives(l => l - 1);
      // Log wrong word count
      const { data: existingWrong } = await supabase
        .from('wrong_words')
        .select('error_count')
        .eq('student_id', student.id)
        .eq('word_id', wordObj.id)
        .single();

      if (existingWrong) {
        await supabase
          .from('wrong_words')
          .update({ error_count: (existingWrong.error_count || 0) + 1, last_attempt_at: new Date().toISOString() })
          .eq('student_id', student.id)
          .eq('word_id', wordObj.id);
      } else {
        await supabase.from('wrong_words').insert([{
          student_id: student.id,
          word_id: wordObj.id,
          error_count: 1,
          last_attempt_at: new Date().toISOString()
        }]);
      }
    }

    setTimeout(() => {
      if (lives - (isCorrect ? 0 : 1) > 0 && currentIndex + 1 < words.length) {
        setCurrentIndex(c => c + 1);
      } else {
        setGameState('reflection');
      }
    }, 2000);
  };

  const usePowerup = async (itemCode: string) => {
    if (usedItemsThisStage.includes(itemCode)) return;

    // Find in inventory
    const inventoryItem = inventory.find(i => i.items.item_code === itemCode);
    if (!inventoryItem || inventoryItem.quantity <= 0) return;

    try {
      // 1. Consume item in Database (Decrement quantity or delete if 1)
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

      // 2. Insert Item Usage Log
      await supabase.from('item_usage_logs').insert([{
        student_id: student.id,
        item_id: inventoryItem.item_id,
        stage_id: currentStageId,
        question_word: words[currentIndex]?.word || null
      }]);

      // 3. Trigger Powerup logic on frontend
      if (itemCode === 'TIME_FREEZE') {
        setTimeLeft(t => t + 10);
      } else if (itemCode === 'EXTRA_LIFE') {
        setLives(l => Math.min(3, l + 1));
      } else if (itemCode === 'FIFTY_FIFTY') {
        const correct = qType === 'MEANING_MC' ? words[currentIndex].meaning : words[currentIndex].word;
        const wrongList = choices.filter(c => c !== correct);
        const toHide = wrongList.sort(() => 0.5 - Math.random()).slice(0, 2);
        setChoices(choices.map(c => toHide.includes(c) ? '' : c));
      } else if (itemCode === 'HINT') {
        setShowHint(true);
      }

      setUsedItemsThisStage(u => [...u, itemCode]);
      setInventory(inv => inv.map(i => i.id === inventoryItem.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));

    } catch (err) {
      console.error('Error consuming item:', err);
    }
  };

  const handleSaveGoal = async () => {
    try {
      if (currentStageId) {
        await supabase.from('goals').upsert([{
          student_id: student.id,
          stage_id: currentStageId,
          words_target: goalWords,
          stages_target: goalStages,
          time_target_min: goalTime
        }], { onConflict: 'student_id,stage_id' });
      }
    } catch (err) {
      console.error(err);
    }
    setGameState('play');
  };

  const handleSaveReflection = async () => {
    try {
      if (currentStageId) {
        await supabase.from('reflections').upsert([{
          student_id: student.id,
          stage_id: currentStageId,
          words_learned: refWordsLearned || 'คำศัพท์หมวดทั่วไป',
          hardest_word: refHardestWord || null,
          feeling: refFeeling
        }], { onConflict: 'student_id,stage_id' });
      }
    } catch (err) {
      console.error(err);
    }
    setGameState('results');
  };

  const handleFinishGame = async () => {
    const isWin = score >= 8 && lives > 0;
    const currentRank = progress?.current_rank || 1;
    const currentStage = progress?.current_stage || 1;
    
    // Response time calculations
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 10;

    // Promotion & Demotion Conditions
    let newRank = currentRank;
    let newStage = currentStage;
    let streakCount = progress?.high_score_streak || 0;

    if (isWin) {
      newStage = currentStage + 1;
      // Streak calculation for promotion (3 consecutive stages >= 80% with additional parameters)
      if (avgResponseTime < 10 && usedItemsThisStage.length <= 1) {
        streakCount += 1;
      } else {
        streakCount = Math.max(0, streakCount - 1);
      }

      if (streakCount >= 3 && newRank < 5) {
        newRank += 1;
        streakCount = 0; // reset
      }
    } else {
      // Demote condition: fail 3 times or excessive latency
      streakCount = 0;
      if (avgResponseTime > 20 && newRank > 1) {
        newRank -= 1;
      }
    }

    const wonCoins = isWin ? 5 : 0;
    const earnedExp = score * 10;
    const newCoins = (progress?.coins || 0) + wonCoins;
    const newExp = (progress?.exp || 0) + earnedExp;

    try {
      // 1. Log Attempt
      if (currentStageId) {
        await supabase.from('attempts').insert([{
          student_id: student.id,
          stage_id: currentStageId,
          score,
          total_questions: words.length,
          time_spent_sec: responseTimes.reduce((a, b) => a + b, 0),
          items_used_count: usedItemsThisStage.length,
          error_count: words.length - score,
          is_passed: isWin
        }]);
      }

      // 2. Update Coins ledger if won
      if (wonCoins > 0) {
        await supabase.from('coins_transactions').insert([{
          student_id: student.id,
          amount: wonCoins,
          source: `STAGE_${currentStage}_PASS`
        }]);
      }

      // 3. Update Learning Path
      await supabase
        .from('learning_paths')
        .update({
          current_rank: newRank,
          current_stage: newStage,
          coins: newCoins,
          exp: newExp,
          last_active_date: new Date().toISOString()
        })
        .eq('student_id', student.id);

      // 4. Update Analytics Summary
      const { data: analytics } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('student_id', student.id)
        .single();
      
      const newAttempts = (analytics?.attempt_count || 0) + 1;
      const newTime = (analytics?.total_time_on_task_sec || 0) + responseTimes.reduce((a, b) => a + b, 0);
      const preScore = analytics?.pretest_score || 0;
      const successRate = ((score / words.length) * 100);

      await supabase
        .from('analytics_summary')
        .update({
          success_rate: Math.round(((analytics?.success_rate || 0) * (newAttempts - 1) + successRate) / newAttempts),
          attempt_count: newAttempts,
          total_time_on_task_sec: newTime,
          last_updated_at: new Date().toISOString()
        })
        .eq('student_id', student.id);

      // Check for intervention alerts (Fail 3 times in a row)
      if (!isWin) {
        const { data: recentAttempts } = await supabase
          .from('attempts')
          .select('is_passed')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(2);

        const consecutiveFails = recentAttempts && recentAttempts.length === 2 && recentAttempts.every(a => !a.is_passed);
        if (consecutiveFails) {
          await supabase.from('intervention_alerts').insert([{
            student_id: student.id,
            classroom_id: student.classroom_id,
            alert_type: 'STAGE_FAIL_3X',
            description: `${student.student_name} ทำด่านที่ ${currentStage} ไม่ผ่านติดต่อกัน 3 ครั้ง`
          }]);
        }
      }

      setProgress({
        ...progress,
        current_rank: newRank,
        current_stage: newStage,
        coins: newCoins,
        exp: newExp
      });

    } catch (err) {
      console.error('Error updating game completion state:', err);
    }

    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังดาวน์โหลดชุดคำศัพท์...</p>
      </div>
    );
  }

  // STEP 1: GOAL SETTING SCREEN
  if (gameState === 'goal') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full filter blur-[80px]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10"
        >
          <div className="text-center mb-6">
            <BookOpen className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-white">ตั้งเป้าหมายก่อนผจญภัย</h2>
            <p className="text-slate-400 text-sm mt-1">การตั้งเป้าหมายช่วยให้คุณมีสมาธิและจดจำคำศัพท์ได้ดีขึ้น</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">จำนวนคำที่จะเรียนรู้</label>
              <input type="number" value={goalWords} onChange={e => setGoalWords(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" />
            </div>
            
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">เป้าหมายจำนวนด่าน</label>
              <input type="number" value={goalStages} onChange={e => setGoalStages(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">เวลาที่ใช้วันนี้ (นาที)</label>
              <input type="number" value={goalTime} onChange={e => setGoalTime(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <button 
            onClick={handleSaveGoal}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 mt-8 hover:scale-[1.02] transition-all"
          >
            เริ่มบทเรียนภารกิจ 🚀
          </button>
        </motion.div>
      </div>
    );
  }

  // STEP 2: REFLECTION SCREEN (POST-GAME)
  if (gameState === 'reflection') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full filter blur-[80px]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10"
        >
          <div className="text-center mb-6">
            <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-white">บันทึกช่วยสะท้อนคิด</h2>
            <p className="text-slate-400 text-sm mt-1">วันนี้คุณได้เรียนรู้อะไรบ้าง? เขียนสรุปความเข้าใจของคุณ</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">คำศัพท์ใหม่ที่จำได้วันนี้</label>
              <input type="text" value={refWordsLearned} onChange={e => setRefWordsLearned(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" placeholder="เช่น elephant, giraffe" />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">คำศัพท์ที่คิดว่ายากที่สุด</label>
              <input type="text" value={refHardestWord} onChange={e => setRefHardestWord(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" placeholder="พิมพ์คำศัพท์ที่ตอบผิดหรือจำไม่ได้" />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">ความรู้สึกเกี่ยวกับการเล่นในด่านนี้</label>
              <select value={refFeeling} onChange={e => setRefFeeling(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500">
                <option value="😊 สนุกและเข้าใจง่าย">😊 สนุกและเข้าใจง่าย</option>
                <option value="😐 ปานกลาง ท้าทายดี">😐 ปานกลาง ท้าทายดี</option>
                <option value="😓 ยากเกินไป จำไม่ได้">😓 ยากเกินไป จำไม่ได้</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleSaveReflection}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 mt-8 hover:scale-[1.02] transition-all"
          >
            บันทึกและดูคะแนน 🎯
          </button>
        </motion.div>
      </div>
    );
  }

  // STEP 3: RESULTS SCREEN
  if (gameState === 'results') {
    const isGameOver = lives <= 0;
    const passed = score >= 8 && !isGameOver;
    const totalDuration = responseTimes.reduce((a, b) => a + b, 0);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="text-center bg-slate-900 border border-slate-800 p-12 rounded-3xl max-w-lg w-full shadow-2xl relative z-10"
        >
          {passed ? (
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
          ) : (
            <XCircle className="w-24 h-24 text-rose-500 mx-auto mb-6" />
          )}
          <h2 className="text-4xl font-black mb-2">{passed ? 'ภารกิจสำเร็จ! 🎉' : 'ไม่ผ่านเกณฑ์ 💔'}</h2>
          <p className="text-slate-400 mb-6">{passed ? 'คุณผ่านเกณฑ์ประเมิน 80% แล้ว ได้รับเหรียญเพิ่ม!' : 'ต้องตอบถูก 8 ใน 10 ข้อ เพื่อผ่านด่านนะ'}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-500 block">คะแนนของคุณ</span>
              <strong className="text-2xl text-white">{score} / {words.length}</strong>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-500 block">เวลาทั้งหมด</span>
              <strong className="text-2xl text-white">{totalDuration} วินาที</strong>
            </div>
          </div>

          <button 
            onClick={handleFinishGame} 
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition-all shadow-lg text-lg hover:scale-[1.02]"
          >
            กลับหน้าหลัก
          </button>
        </motion.div>
      </div>
    );
  }

  // STEP 4: ACTIVE PLAYING GAMEPLAY SCREEN
  const currentWord = words[currentIndex];
  const isWordMC = qType === 'WORD_MC' || qType === 'LISTENING_MC' || qType === 'CONTEXT_MC';
  const correctChoice = isWordMC ? currentWord.word : currentWord.meaning;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* Header Panel */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8 relative z-10">
        <div className="flex gap-1.5 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
          {Array(3).fill(0).map((_, i) => (
            <Heart key={i} className={`w-6 h-6 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-slate-800'}`} />
          ))}
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-full">
          <Timer className={timeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-emerald-400"} />
          <span className={`text-xl font-bold font-mono ${timeLeft <= 5 ? "text-rose-500" : "text-slate-100"}`}>{timeLeft}s</span>
        </div>

        <button onClick={() => setScreen('dashboard')} className="p-2.5 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Item powerups inventory dock */}
      <div className="w-full max-w-3xl flex justify-center gap-3 mb-6 relative z-10">
        {inventory.map((invItem) => {
          const itemCode = invItem.items.item_code;
          const isUsed = usedItemsThisStage.includes(itemCode);
          
          return (
            <button 
              key={invItem.id} 
              onClick={() => usePowerup(itemCode)} 
              disabled={isUsed}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                isUsed 
                  ? 'opacity-40 bg-slate-950 border-slate-900 text-slate-600' 
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200 hover:scale-105'
              }`}
            >
              <span className="text-lg">{invItem.items.image_url}</span>
              <span>{invItem.items.name} ({invItem.quantity})</span>
            </button>
          );
        })}
        {inventory.length === 0 && (
          <p className="text-slate-600 text-sm italic">ไม่มีไอเทมติดตัวในกระเป๋า</p>
        )}
      </div>

      {/* Stage Progress line */}
      <div className="w-full max-w-2xl h-2 bg-slate-900 border border-slate-800/80 rounded-full mb-10 overflow-hidden relative z-10">
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
            className="text-center mb-10"
          >
            {qType === 'MEANING_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl">
                <span className="text-xs text-slate-500 tracking-widest uppercase block mb-3">สะกดคำศัพท์</span>
                <h2 className="text-6xl font-black text-white mb-2">{currentWord.word}</h2>
                <p className="text-slate-400 text-lg">แปลว่าอะไรในภาษาไทย?</p>
              </div>
            )}

            {qType === 'WORD_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl">
                <span className="text-xs text-slate-500 tracking-widest uppercase block mb-3">คำแปลภาษาไทย</span>
                <h2 className="text-5xl font-black text-emerald-400 mb-2">{currentWord.meaning}</h2>
                <p className="text-slate-400 text-lg">ตรงกับคำศัพท์ภาษาอังกฤษคำใด?</p>
              </div>
            )}

            {qType === 'LISTENING_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl">
                <span className="text-xs text-slate-500 tracking-widest uppercase block mb-6">ฟังและแปลความหมาย</span>
                <button 
                  onClick={() => speakWord(currentWord.word)}
                  className="w-24 h-24 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all shadow-lg"
                >
                  <Volume2 className="w-12 h-12" />
                </button>
                <p className="text-slate-400 text-lg">เสียงสะกดเป็นคำศัพท์ภาษาอังกฤษข้อใด?</p>
              </div>
            )}

            {qType === 'FILL_BLANK' && (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl">
                <span className="text-xs text-slate-500 tracking-widest uppercase block mb-3">สะกดคำศัพท์ภาษาอังกฤษ</span>
                <h2 className="text-4xl font-black text-emerald-400 mb-6">{currentWord.meaning}</h2>
                
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
                    className="w-full text-center px-4 py-4 rounded-xl bg-slate-950 border border-slate-800 text-2xl font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder-slate-600 mb-3"
                  />
                  {!isAnswered && (
                    <button type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-md">
                      ยืนยันคำตอบ ➡️
                    </button>
                  )}
                </form>
                {showHint && (
                  <p className="text-slate-400 text-sm mt-3 italic">
                    คำใบ้: ขึ้นต้นด้วยตัว <strong className="text-emerald-400 uppercase">{currentWord.word.charAt(0)}</strong> (คำนี้สะกดด้วย {currentWord.word.length} ตัวอักษร)
                  </p>
                )}
              </div>
            )}

            {qType === 'CONTEXT_MC' && (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-xl">
                <span className="text-xs text-slate-500 tracking-widest uppercase block mb-4">การเติมประโยคในบริบท</span>
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl mb-4 italic text-slate-200 text-xl font-medium leading-relaxed">
                  "{currentWord.example.replace(new RegExp(currentWord.word, 'i'), '__________')}"
                </div>
                <p className="text-slate-400 text-lg">เติมตัวเลือกข้อใดในช่องว่างจึงจะสมบูรณ์ที่สุด?</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Options grid for multiple choices quiz types */}
        {qType.includes('_MC') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {choices.map((choice, idx) => {
              if (choice === '') return <div key={idx} className="opacity-0 pointer-events-none"></div>; // used 50/50

              let btnClass = "bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300";
              let icon = null;

              if (isAnswered) {
                if (choice === correctChoice) {
                  btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-lg shadow-emerald-500/10";
                  icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
                } else if (choice === selectedAnswer) {
                  btnClass = "bg-rose-500/20 border-rose-500 text-rose-300 font-extrabold shadow-lg";
                  icon = <XCircle className="w-5 h-5 text-rose-400" />;
                } else {
                  btnClass = "bg-slate-950 border-slate-950 text-slate-600 opacity-40";
                }
              }

              return (
                <button 
                  key={idx}
                  onClick={() => submitAnswer(choice)}
                  disabled={isAnswered}
                  className={`p-5 rounded-2xl border text-lg font-bold flex justify-between items-center transition-all ${btnClass} ${!isAnswered && 'hover:scale-[1.01]'}`}
                >
                  <span className="flex-1 text-center">{choice}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback block for spelling input mode */}
        {isAnswered && qType === 'FILL_BLANK' && (
          <div className="text-center mt-6">
            {selectedAnswer?.trim().toLowerCase() === currentWord.word.toLowerCase() ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-lg">
                <CheckCircle className="w-5 h-5" /> ถูกสะกดคำตอบถูกต้อง!
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 py-4 rounded-xl flex flex-col items-center gap-1.5 font-bold text-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> สะกดไม่ถูกต้อง
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
