'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Volume2 } from 'lucide-react';
import { playWordAudio } from '@/utils/audio';

export default function PreTest() {
  const { student, progress, setProgress, setScreen } = useAppStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState<number>(Date.now());

  function generateQuestion(correctWord: any, allVocab: any[]) {
    const choices = [correctWord.meaning];
    while(choices.length < 4) {
      const randomWord = allVocab[Math.floor(Math.random() * allVocab.length)];
      if (!choices.includes(randomWord.meaning)) {
        choices.push(randomWord.meaning);
      }
    }
    return {
      id: correctWord.id,
      word: correctWord.word,
      correctChoice: correctWord.meaning,
      choices: choices.sort(() => 0.5 - Math.random())
    };
  }

  useEffect(() => {
    const fetchPretest = async () => {
      // Fetch 25 random vocabulary words across different ranks to form a Pre-test
      const { data: vocab } = await supabase
        .from('vocabulary')
        .select('*')
        .limit(150);
        
      if (vocab && vocab.length > 0) {
         // Shuffle and pick 25
         const shuffled = vocab.sort(() => 0.5 - Math.random()).slice(0, vocab.length > 25 ? 25 : vocab.length);
         setQuestions(shuffled.map(v => generateQuestion(v, vocab)));
      }
      setLoading(false);
    };

    fetchPretest();
  }, []);

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
    /* eslint-disable-next-line react-hooks/purity */
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Calculate Rank based on 25 questions
    // Score 0-5: Rank 1, 6-10: Rank 2, 11-15: Rank 3, 16-20: Rank 4, 21-25: Rank 5
    let newRank = 1;
    if (finalScore >= 6) newRank = 2;
    if (finalScore >= 11) newRank = 3;
    if (finalScore >= 16) newRank = 4;
    if (finalScore >= 21) newRank = 5;

    // Based on Rank, set the starting stage
    const newStage = ((newRank - 1) * 20) + 1;

    try {
      // 1. Log to pre_tests table
      await supabase.from('pre_tests').insert([{
        student_id: student.id,
        score: finalScore,
        total_questions: questions.length,
        time_spent_sec: duration
      }]);

      // 2. Update learning_paths
      const { error: pathError } = await supabase
        .from('learning_paths')
        .update({
          current_rank: newRank,
          current_stage: newStage,
          last_active_date: new Date().toISOString()
        })
        .eq('student_id', student.id);

      if (pathError) {
        // Fallback insert if row doesn't exist
        await supabase.from('learning_paths').insert([{
          student_id: student.id,
          current_rank: newRank,
          current_stage: newStage,
          last_active_date: new Date().toISOString()
        }]);
      }

      // 3. Update or Insert analytics_summary
      const { error: analyticsError } = await supabase
        .from('analytics_summary')
        .update({
          pretest_score: finalScore,
          total_time_on_task_sec: duration,
          attempt_count: 1,
          last_updated_at: new Date().toISOString()
        })
        .eq('student_id', student.id);

      if (analyticsError) {
        await supabase.from('analytics_summary').insert([{
          student_id: student.id,
          pretest_score: finalScore,
          total_time_on_task_sec: duration,
          attempt_count: 1,
          last_updated_at: new Date().toISOString()
        }]);
      }

      // 4. Ensure stage is unlocked
      const { data: stageRecord } = await supabase
        .from('stages')
        .select('id')
        .eq('stage_number', newStage)
        .limit(1);

      if (stageRecord && stageRecord.length > 0) {
        const stageId = stageRecord[0].id;
        await supabase.from('attempts').insert([{
          student_id: student.id,
          stage_id: stageId,
          score: 0,
          total_questions: 10,
          time_spent_sec: 0,
          is_passed: false
        }]);
      }

      setProgress({
        ...progress,
        current_rank: newRank,
        current_stage: newStage,
        pretest_score: finalScore,
        pretest_date: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error saving pre-test results:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังเตรียมข้อสอบ Pre-Test...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl w-full max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏆</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">จบการประเมิน</h2>
          <p className="text-slate-400 text-lg mb-6">คุณทำคะแนนได้: <strong className="text-emerald-400 text-2xl font-black">{score} / {questions.length}</strong></p>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-800 mb-8">
            <p className="text-slate-400 text-sm mb-1">ระดับพลังเริ่มต้นของคุณ</p>
            <p className="text-2xl font-extrabold text-white">Rank {progress?.current_rank || Math.ceil(score/5) || 1}</p>
          </div>
          <button 
            onClick={() => setScreen('dashboard')} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
          >
            เข้าสู่ Dashboard 🚀
          </button>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col justify-center items-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-xl flex justify-between items-center mb-8 relative z-10">
          <div className="text-slate-400 font-bold tracking-wider">Vocab Journey Pre-Test</div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-emerald-400 font-bold">
            ข้อ {currentIndex + 1} / {questions.length}
          </div>
      </div>

      <div className="w-full max-w-xl text-center mb-8 relative z-10">
         <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-800">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300" style={{ width: `${(currentIndex / questions.length) * 100}%` }}></div>
         </div>
      </div>
      
      <motion.div 
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 w-full max-w-xl rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-12">
          <span className="text-slate-500 text-sm tracking-widest uppercase block mb-2">คำศัพท์</span>
          <h2 className="text-5xl font-black text-white tracking-tight">{currentQ.word}</h2>
          <button 
            onClick={() => playWordAudio(currentQ.word)}
            className="mt-3 text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <Volume2 className="w-5 h-5" /> ฟังออกเสียง (TTS)
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQ.choices.map((choice: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(choice)}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 hover:text-emerald-400 text-slate-300 p-5 rounded-2xl text-lg font-bold transition-all text-center"
            >
              {choice}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
