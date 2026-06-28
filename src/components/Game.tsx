'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Trophy, Timer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';

export default function Game() {
  const { setScreen, progress, student } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  
  // Fetch Words
  useEffect(() => {
    async function fetchWords() {
      const stage = progress?.current_stage || 1;
      const { data } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('stage', stage);

      let fetched = [];
      if (data && data.length > 0) {
        fetched = data;
      } else {
        fetched = [
          { id: '1', word: 'apple', meaning: 'แอปเปิ้ล' },
          { id: '2', word: 'banana', meaning: 'กล้วย' },
          { id: '3', word: 'cat', meaning: 'แมว' },
          { id: '4', word: 'dog', meaning: 'หมา' },
          { id: '5', word: 'elephant', meaning: 'ช้าง' },
        ];
      }
      // Shuffle words for random game order
      setWords(fetched.sort(() => 0.5 - Math.random()));
      setLoading(false);
    }
    fetchWords();
  }, [progress]);

  // Generate Choices
  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      const correct = words[currentIndex].meaning;
      // Get 3 random wrong meanings
      const wrongs = words
        .filter(w => w.meaning !== correct)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.meaning);
        
      // Ensure we have 4 choices total even if pool is small
      while (wrongs.length < 3) {
         wrongs.push(`Mock Meaning ${Math.random()}`);
      }
      
      const allChoices = [correct, ...wrongs].sort(() => 0.5 - Math.random());
      setChoices(allChoices);
      setTimeLeft(15);
      setIsAnswered(false);
      setSelectedAnswer(null);
    }
  }, [currentIndex, words]);

  // Timer Logic
  useEffect(() => {
    if (loading || isAnswered || currentIndex >= words.length) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswer(''); // Time's up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isAnswered, currentIndex, words]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
    
    const correct = words[currentIndex].meaning;
    if (answer === correct) {
      setScore(s => s + 1);
    }

    // Auto next after 2s
    setTimeout(() => {
      setCurrentIndex(c => c + 1);
    }, 2000);
  };

  const handleFinish = async () => {
    // Save to Supabase (Mock save for now)
    const passed = (score / words.length) >= 0.8;
    
    if (passed) {
       await supabase.from('progress_summary').update({
          current_stage: (progress?.current_stage || 1) + 1,
          coins: (progress?.coins || 0) + 10,
          streak_days: (progress?.streak_days || 0) + 1
       }).eq('student_id', student.id);
    }
    
    // Force refresh state could be added here
    setScreen('dashboard');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><div className="animate-pulse">กำลังโหลดข้อมูลเกม...</div></div>;
  }

  const isFinished = currentIndex >= words.length;

  if (isFinished) {
    const percent = Math.round((score / words.length) * 100);
    const passed = percent >= 80;
    
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-md max-w-lg w-full">
          {passed ? (
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6" />
          ) : (
            <XCircle className="w-24 h-24 text-rose-400 mx-auto mb-6" />
          )}
          <h2 className="text-4xl font-bold mb-2">{passed ? 'ผ่านด่านสำเร็จ! 🎉' : 'สู้ต่อไปนะ! 💪'}</h2>
          <p className="text-xl text-slate-400 mb-8">คุณทำคะแนนได้ {percent}% ({score}/{words.length})</p>
          <button onClick={handleFinish} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 text-lg">
            กลับหน้าหลัก
          </button>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const correctMeaning = currentWord.meaning;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Timer className={timeLeft <= 5 ? "text-rose-400" : "text-emerald-400"} />
          <span className={`text-xl font-bold font-mono ${timeLeft <= 5 ? "text-rose-400" : ""}`}>{timeLeft}s</span>
        </div>
        <div className="text-xl font-bold text-amber-400">
          คะแนน: {score}
        </div>
        <button onClick={() => setScreen('dashboard')} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-3xl h-2 bg-white/5 rounded-full mb-12 overflow-hidden">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIndex) / words.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full text-center mb-12"
          >
            <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-4 tracking-tight">
              {currentWord.word}
            </h2>
            <p className="text-slate-400 text-lg">แปลว่าอะไร?</p>
          </motion.div>
        </AnimatePresence>

        {/* Choices Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {choices.map((choice, idx) => {
            let btnClass = "bg-white/5 hover:bg-white/10 border-white/10";
            let icon = null;
            
            if (isAnswered) {
              if (choice === correctMeaning) {
                btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                icon = <CheckCircle className="w-5 h-5" />;
              } else if (choice === selectedAnswer) {
                btnClass = "bg-rose-500/20 border-rose-500 text-rose-400";
                icon = <XCircle className="w-5 h-5" />;
              } else {
                btnClass = "bg-white/5 border-white/5 opacity-50";
              }
            }

            return (
              <motion.button
                key={idx}
                disabled={isAnswered}
                whileHover={!isAnswered ? { scale: 1.02 } : {}}
                whileTap={!isAnswered ? { scale: 0.98 } : {}}
                onClick={() => handleAnswer(choice)}
                className={`flex items-center justify-between p-6 rounded-2xl border backdrop-blur-md font-bold text-xl transition-all ${btnClass}`}
              >
                {choice}
                {icon}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
