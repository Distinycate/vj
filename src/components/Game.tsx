'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Trophy, Timer, Volume2, Snowflake, Scissors, Heart } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';

export default function Game() {
  const { setScreen, progress, student, setProgress } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  
  // Current Question
  const [qType, setQType] = useState<string>('MEANING_MC');
  const [choices, setChoices] = useState<string[]>([]);
  const [fillAnswer, setFillAnswer] = useState('');
  
  // Inventory
  const [inventory, setInventory] = useState<string[]>([]);
  const [usedItems, setUsedItems] = useState<string[]>([]);

  // Speech Synth
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = 'en-US';
      window.speechSynthesis.speak(msg);
    }
  };

  useEffect(() => {
    async function initGame() {
      const stage = progress?.current_stage || 1;
      const rank = progress?.current_rank || 1;
      const isBoss = stage % 20 === 0;

      let query = supabase.from('vocabulary').select('*');
      if (isBoss) {
        // Boss stage: fetch from all stages in this rank
        const maxStage = stage;
        const minStage = stage - 19;
        query = query.gte('stage', minStage).lte('stage', maxStage);
      } else {
        query = query.eq('stage', stage);
      }

      const { data: vData } = await query;
      let fetched = vData || [];
      
      // Shuffle and pick 10 words
      fetched = fetched.sort(() => 0.5 - Math.random()).slice(0, 10);
      setWords(fetched);

      // Fetch Inventory
      const { data: iData } = await supabase.from('student_inventory').select('item_id').eq('student_id', student.id).eq('is_equipped', false);
      if (iData) {
        setInventory(iData.map(i => i.item_id));
      }

      setLoading(false);
    }
    initGame();
  }, [progress, student.id]);

  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      prepareQuestion(words[currentIndex]);
    }
  }, [currentIndex, words]);

  const prepareQuestion = (word: any) => {
    const rank = progress?.current_rank || 1;
    let availableTypes = ['MEANING_MC', 'WORD_MC'];
    
    if (rank >= 2) availableTypes.push('LISTENING_MC');
    if (rank >= 3) availableTypes.push('FILL_BLANK');
    if (rank >= 4) availableTypes = ['FILL_BLANK', 'CONTEXT_MC'];
    if (rank === 5) availableTypes = ['FILL_BLANK', 'CONTEXT_MC'];

    // Randomize Type
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    setQType(type);

    if (type.includes('MC')) {
      const isWordMC = type === 'WORD_MC' || type === 'LISTENING_MC';
      const correctChoice = isWordMC ? word.word : word.meaning;
      
      const wrongs = words
        .filter(w => w.word !== word.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => isWordMC ? w.word : w.meaning);
        
      while (wrongs.length < 3) {
         wrongs.push(isWordMC ? `Mock ${Math.random()}` : `ความหมาย ${Math.random()}`);
      }
      
      setChoices([correctChoice, ...wrongs].sort(() => 0.5 - Math.random()));
    }

    if (type === 'LISTENING_MC') {
       setTimeout(() => speak(word.word), 500);
    }

    setFillAnswer('');
    setTimeLeft(15);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  // Timer
  useEffect(() => {
    if (loading || isAnswered || currentIndex >= words.length || lives <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswer(''); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isAnswered, currentIndex, words, lives]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
    
    const currentWord = words[currentIndex];
    
    let isCorrect = false;
    if (qType === 'MEANING_MC') isCorrect = answer === currentWord.meaning;
    if (qType === 'WORD_MC' || qType === 'LISTENING_MC') isCorrect = answer === currentWord.word;
    if (qType === 'FILL_BLANK') isCorrect = answer.trim().toLowerCase() === currentWord.word.toLowerCase();
    if (qType === 'CONTEXT_MC') isCorrect = answer === currentWord.word;

    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setLives(l => l - 1);
    }

    setTimeout(() => {
      if (lives - (isCorrect ? 0 : 1) > 0) {
         setCurrentIndex(c => c + 1);
      }
    }, 2000);
  };

  const useItem = async (itemId: string) => {
    if (usedItems.includes(itemId) || !inventory.includes(itemId)) return;
    setUsedItems([...usedItems, itemId]);
    
    // Remove from DB
    await supabase.from('student_inventory').delete().eq('student_id', student.id).eq('item_id', itemId);

    if (itemId === 'ITEM_FREEZE') setTimeLeft(t => t + 10);
    if (itemId === 'ITEM_LIFE') setLives(l => Math.min(3, l + 1));
    if (itemId === 'ITEM_5050' && qType.includes('MC')) {
      const currentWord = words[currentIndex];
      const isWordMC = qType === 'WORD_MC' || qType === 'LISTENING_MC';
      const correctChoice = isWordMC ? currentWord.word : currentWord.meaning;
      
      const wrongChoices = choices.filter(c => c !== correctChoice);
      const toRemove = wrongChoices.slice(0, 2);
      
      // We keep the correct one and one wrong one, but maintain original positions by mapping the removed to empty strings or hiding them.
      // For simplicity, we just filter them out.
      setChoices(choices.map(c => toRemove.includes(c) ? '' : c));
    }
  };

  const handleFinish = async () => {
    const isWin = score >= 8; // Pass if 80%
    const currentRank = progress?.current_rank || 1;
    const currentStage = progress?.current_stage || 1;
    const streak = progress?.high_score_streak || 0;
    
    let newRank = currentRank;
    let newStage = currentStage;
    let newStreak = streak;

    if (isWin) {
       newStage = currentStage + 1;
       newStreak = streak + 1;
       if (newStreak >= 3 && newRank < 5) {
          newRank += 1;
          newStreak = 0;
       }
    } else {
       // Demotion logic: reset streak. If fail 3 times on same stage, demote. 
       // For prototype, we just reset streak on fail.
       newStreak = 0;
    }

    const newCoins = (progress?.coins || 0) + (isWin ? 5 : 0);

    const newProgress = {
      ...progress,
      current_rank: newRank,
      current_stage: newStage,
      high_score_streak: newStreak,
      coins: newCoins
    };

    await supabase.from('progress_summary').update({
       current_rank: newRank,
       current_stage: newStage,
       high_score_streak: newStreak,
       coins: newCoins
    }).eq('student_id', student.id);

    setProgress(newProgress);
    setScreen('dashboard');
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">กำลังโหลดข้อมูลเกม...</div>;

  const isGameOver = lives <= 0;
  const isFinished = currentIndex >= words.length || isGameOver;

  if (isFinished) {
    const percent = Math.round((score / words.length) * 100);
    const passed = percent >= 80 && !isGameOver;
    
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center bg-slate-800 p-12 rounded-3xl border border-slate-700 max-w-lg w-full">
          {passed ? <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6" /> : <XCircle className="w-24 h-24 text-rose-400 mx-auto mb-6" />}
          <h2 className="text-4xl font-bold mb-2">{passed ? 'ผ่านด่านสำเร็จ! 🎉' : 'สอบตก 💔'}</h2>
          <p className="text-slate-400 mb-6">{passed ? 'ได้รับ 5 เหรียญ' : 'ต้องได้คะแนน 80% ขึ้นไปถึงจะผ่านนะ'}</p>
          <button onClick={handleFinish} className="w-full py-4 bg-emerald-500 rounded-xl font-bold hover:bg-emerald-400 shadow-lg">กลับหน้าหลัก</button>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  let correctChoice = '';
  if (qType === 'MEANING_MC') correctChoice = currentWord.meaning;
  if (qType === 'WORD_MC' || qType === 'LISTENING_MC' || qType === 'CONTEXT_MC') correctChoice = currentWord.word;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* Header Info */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8 relative z-10">
        <div className="flex gap-2">
          {Array(3).fill(0).map((_, i) => (
            <Heart key={i} className={`w-8 h-8 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} />
          ))}
        </div>
        <div className="flex items-center gap-4 bg-slate-800 px-6 py-3 rounded-full border border-slate-700">
          <Timer className={timeLeft <= 5 ? "text-rose-400 animate-pulse" : "text-emerald-400"} />
          <span className={`text-2xl font-bold font-mono ${timeLeft <= 5 ? "text-rose-400" : ""}`}>{timeLeft}s</span>
        </div>
        <button onClick={() => setScreen('dashboard')} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Item Bar */}
      <div className="w-full max-w-3xl flex justify-center gap-4 mb-8">
         {inventory.includes('ITEM_FREEZE') && (
           <button onClick={() => useItem('ITEM_FREEZE')} disabled={usedItems.includes('ITEM_FREEZE')} className={`p-4 rounded-xl border ${usedItems.includes('ITEM_FREEZE') ? 'opacity-50 bg-slate-800 border-slate-700' : 'bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/40 text-blue-300'}`}>
             <Snowflake />
           </button>
         )}
         {inventory.includes('ITEM_5050') && qType.includes('MC') && (
           <button onClick={() => useItem('ITEM_5050')} disabled={usedItems.includes('ITEM_5050')} className={`p-4 rounded-xl border ${usedItems.includes('ITEM_5050') ? 'opacity-50 bg-slate-800 border-slate-700' : 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/40 text-amber-300'}`}>
             <Scissors />
           </button>
         )}
         {inventory.includes('ITEM_LIFE') && lives < 3 && (
           <button onClick={() => useItem('ITEM_LIFE')} disabled={usedItems.includes('ITEM_LIFE')} className={`p-4 rounded-xl border ${usedItems.includes('ITEM_LIFE') ? 'opacity-50 bg-slate-800 border-slate-700' : 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/40 text-rose-300'}`}>
             <Heart />
           </button>
         )}
      </div>

      {/* Progress */}
      <div className="w-full max-w-2xl h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300" style={{ width: `${(currentIndex / words.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 w-full max-w-2xl flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center mb-12">
            
            {qType === 'MEANING_MC' && (
               <>
                 <h2 className="text-6xl font-black mb-4">{currentWord.word}</h2>
                 <p className="text-slate-400 text-xl">แปลว่าอะไร?</p>
               </>
            )}

            {qType === 'WORD_MC' && (
               <>
                 <h2 className="text-5xl font-black mb-4 text-amber-400">{currentWord.meaning}</h2>
                 <p className="text-slate-400 text-xl">ตรงกับคำศัพท์ใด?</p>
               </>
            )}

            {qType === 'LISTENING_MC' && (
               <>
                 <button onClick={() => speak(currentWord.word)} className="w-24 h-24 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-full flex justify-center items-center mx-auto mb-4 border border-emerald-500/50">
                    <Volume2 className="w-12 h-12 text-emerald-400" />
                 </button>
                 <p className="text-slate-400 text-xl">เสียงที่ได้ยินคือคำศัพท์ใด?</p>
               </>
            )}

            {qType === 'FILL_BLANK' && (
               <>
                 <h2 className="text-5xl font-black mb-4 text-amber-400">{currentWord.meaning}</h2>
                 <p className="text-slate-400 text-xl mb-6">พิมพ์คำศัพท์ภาษาอังกฤษให้ถูกต้อง</p>
                 <form onSubmit={(e) => { e.preventDefault(); handleAnswer(fillAnswer); }} className="flex gap-2 justify-center">
                    <input autoFocus type="text" value={fillAnswer} onChange={e => setFillAnswer(e.target.value)} disabled={isAnswered} className="px-6 py-4 rounded-xl bg-slate-800 border border-slate-700 text-2xl text-center focus:outline-none focus:border-emerald-500 w-full max-w-sm" placeholder="พิมพ์ที่นี่..." />
                 </form>
               </>
            )}

            {qType === 'CONTEXT_MC' && (
               <>
                 <h2 className="text-3xl font-bold mb-4 leading-relaxed bg-slate-800 p-6 rounded-2xl border border-slate-700">
                   {currentWord.example.replace(new RegExp(currentWord.word, 'gi'), '__________')}
                 </h2>
                 <p className="text-slate-400 text-xl">เติมคำในช่องว่าง</p>
               </>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Choices for MC */}
        {qType.includes('MC') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {choices.map((choice, idx) => {
              if (choice === '') return <div key={idx}></div>; // Hidden by 50/50

              let btnClass = "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200";
              let icon = null;
              
              if (isAnswered) {
                if (choice === correctChoice) {
                  btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30";
                  icon = <CheckCircle className="w-6 h-6" />;
                } else if (choice === selectedAnswer) {
                  btnClass = "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30";
                  icon = <XCircle className="w-6 h-6" />;
                } else {
                  btnClass = "bg-slate-900 border-slate-800 text-slate-600 opacity-50";
                }
              }

              return (
                <button 
                  key={idx} 
                  onClick={() => handleAnswer(choice)}
                  disabled={isAnswered}
                  className={`relative p-6 rounded-2xl border text-xl font-medium transition-all duration-300 flex justify-between items-center ${btnClass} ${!isAnswered && 'hover:scale-[1.02]'}`}
                >
                  <span className="flex-1 text-center">{choice}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Fill in Blank Status */}
        {isAnswered && qType === 'FILL_BLANK' && (
          <div className="text-center mt-6">
            {selectedAnswer?.trim().toLowerCase() === currentWord.word.toLowerCase() ? (
               <div className="text-emerald-400 text-2xl font-bold flex items-center justify-center gap-2"><CheckCircle/> ถูกต้อง!</div>
            ) : (
               <div className="text-rose-400 text-2xl font-bold flex flex-col items-center gap-2">
                 <div className="flex items-center gap-2"><XCircle/> ผิด!</div>
                 <span className="text-slate-400 text-lg">คำที่ถูกคือ: <strong className="text-white">{currentWord.word}</strong></span>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
