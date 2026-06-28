'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';

export default function PreTest() {
  const { student, progress, setProgress, setScreen } = useAppStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch 25 random vocabulary words across different ranks to form a Pre-test
    const fetchPretest = async () => {
      // Fetch 100 random words then slice to 25
      const { data: vocab } = await supabase.from('vocabulary').select('*').limit(100);
      if (vocab) {
         // Shuffle and pick 25
         const shuffled = vocab.sort(() => 0.5 - Math.random()).slice(0, 25);
         setQuestions(shuffled.map(v => generateQuestion(v, vocab)));
      }
      setLoading(false);
    };

    fetchPretest();
  }, []);

  const generateQuestion = (correctWord: any, allVocab: any[]) => {
    // Generate a simple MEANING_MC question
    const choices = [correctWord.meaning];
    while(choices.length < 4) {
      const randomWord = allVocab[Math.floor(Math.random() * allVocab.length)];
      if (!choices.includes(randomWord.meaning)) {
        choices.push(randomWord.meaning);
      }
    }
    return {
      word: correctWord.word,
      correctChoice: correctWord.meaning,
      choices: choices.sort(() => 0.5 - Math.random())
    };
  };

  const handleAnswer = (choice: string) => {
    const isCorrect = choice === questions[currentIndex].correctChoice;
    if (isCorrect) setScore(score + 1);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishTest(score + (isCorrect ? 1 : 0));
    }
  };

  const finishTest = async (finalScore: number) => {
    setIsFinished(true);
    // Calculate Rank based on 25 questions
    // 0-5: Rank 1, 6-10: Rank 2, 11-15: Rank 3, 16-20: Rank 4, 21-25: Rank 5
    let newRank = 1;
    if (finalScore >= 6) newRank = 2;
    if (finalScore >= 11) newRank = 3;
    if (finalScore >= 16) newRank = 4;
    if (finalScore >= 21) newRank = 5;

    // Based on Rank, set the starting stage
    // Rank 1: Stage 1, Rank 2: Stage 21, Rank 3: Stage 41, Rank 4: Stage 61, Rank 5: Stage 81
    const newStage = ((newRank - 1) * 20) + 1;

    try {
      const newProgress = { 
        ...progress, 
        pretest_score: finalScore, 
        pretest_date: new Date().toISOString(), 
        current_rank: newRank, 
        current_stage: newStage 
      };
      
      await supabase
        .from('progress_summary')
        .update({
          pretest_score: finalScore,
          pretest_date: new Date().toISOString(),
          current_rank: newRank,
          current_stage: newStage
        })
        .eq('student_id', student.id);

      // Make sure the stage is unlocked in stage_progress
      const { data: existingStage } = await supabase
        .from('stage_progress')
        .select('*')
        .eq('student_id', student.id)
        .eq('stage', newStage)
        .single();
        
      if (!existingStage) {
          await supabase.from('stage_progress').insert([{
              student_id: student.id,
              stage: newStage,
              is_unlocked: true
          }]);
      }

      setProgress(newProgress);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex justify-center items-center">กำลังเตรียมแบบทดสอบ...</div>;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-slate-800 p-8 rounded-3xl text-center shadow-2xl border border-slate-700 w-full max-w-md">
          <h2 className="text-3xl font-bold text-emerald-400 mb-4">จบการประเมิน</h2>
          <p className="text-slate-300 text-lg mb-2">คุณทำคะแนนได้: <strong className="text-white text-2xl">{score} / {questions.length}</strong></p>
          <p className="text-slate-400 mb-6">ระบบได้ประเมินระดับของคุณไว้ที่ <br/><strong className="text-emerald-400 text-xl">Rank {progress?.current_rank || Math.ceil(score/5) || 1}</strong></p>
          <button 
            onClick={() => setScreen('dashboard')} 
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all"
          >
            เข้าสู่ Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col justify-center items-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10">
          <div className="text-slate-400 font-bold">Vocab Journey Pre-Test</div>
          <div className="bg-slate-800 px-4 py-2 rounded-full text-emerald-400 font-bold">
            ข้อ {currentIndex + 1} / {questions.length}
          </div>
      </div>

      <div className="w-full max-w-xl text-center mb-8 relative z-10">
         <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300" style={{ width: `${(currentIndex / questions.length) * 100}%` }}></div>
         </div>
      </div>
      
      <motion.div 
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 w-full max-w-xl rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <h2 className="text-4xl font-extrabold text-center text-white mb-8">{currentQ.word}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQ.choices.map((choice: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(choice)}
              className="bg-slate-700/50 hover:bg-emerald-500/20 hover:border-emerald-500/50 border border-slate-600 text-slate-200 p-4 rounded-xl text-lg font-medium transition-all hover:scale-[1.02]"
            >
              {choice}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
