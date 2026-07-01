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
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [pretestCount, setPretestCount] = useState(0);
  const [previousPretests, setPreviousPretests] = useState<any[]>([]);

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

  const fetchPretestData = async () => {
    setLoading(true);
    try {
      // 1. Fetch completed pretest count
      const { data: pretestHistory, count } = await supabase
        .from('pre_tests')
        .select('*', { count: 'exact' })
        .eq('student_id', student.id)
        .order('created_at', { ascending: true });
      
      setPretestCount(count || 0);
      setPreviousPretests(pretestHistory || []);

      // Fetch 25 random vocabulary words
      const { data: vocab } = await supabase
        .from('vocabulary')
        .select('*')
        .limit(150);
        
      if (vocab && vocab.length > 0) {
         const shuffled = vocab.sort(() => 0.5 - Math.random()).slice(0, vocab.length > 25 ? 25 : vocab.length);
         setQuestions(shuffled.map(v => generateQuestion(v, vocab)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPretestData();
  }, [student.id]);

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
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Calculate Rank based on 25 questions
    let newRank = 1;
    if (finalScore >= 6) newRank = 2;
    if (finalScore >= 11) newRank = 3;
    if (finalScore >= 16) newRank = 4;
    if (finalScore >= 21) newRank = 5;

    const newStage = ((newRank - 1) * 20) + 1;

    try {
      // 1. Log to pre_tests table
      await supabase.from('pre_tests').insert([{
        student_id: student.id,
        score: finalScore,
        total_questions: questions.length,
        time_spent_sec: duration
      }]);

      const newCount = pretestCount + 1;

      // 2. Only update learning_paths and dashboard unlocking if they complete all 5 pretests
      if (newCount >= 5) {
        // Update learning paths
        await supabase
          .from('learning_paths')
          .update({
            current_rank: newRank,
            current_stage: newStage,
            last_active_date: new Date().toISOString()
          })
          .eq('student_id', student.id);

        // Update analytics summary
        await supabase
          .from('analytics_summary')
          .update({
            pretest_score: finalScore,
            total_time_on_task_sec: duration,
            attempt_count: 5,
            last_updated_at: new Date().toISOString()
          })
          .eq('student_id', student.id);

        // Ensure stage is unlocked
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
      }
    } catch (err) {
      console.error('Error saving pre-test results:', err);
    }
  };

  const handleNextAttempt = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setStartTime(Date.now());
    fetchPretestData();
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
    const currentAttemptNum = pretestCount + 1;
    const isAllCompleted = currentAttemptNum >= 5;

    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl w-full max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">{isAllCompleted ? '🎉' : '🏆'}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">
            {isAllCompleted ? 'จบการประเมินครบ 5 ครั้ง!' : `จบการประเมินรอบที่ ${currentAttemptNum}`}
          </h2>
          
          <p className="text-slate-400 text-lg mb-6">
            คะแนนรอบนี้: <strong className="text-emerald-400 text-2xl font-black">{score} / {questions.length}</strong>
          </p>

          {!isAllCompleted ? (
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800/60 mb-8 text-left space-y-2">
              <p className="text-slate-300 text-sm font-bold">📢 ข้อมูลความก้าวหน้าการประเมิน:</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                นักเรียนจำเป็นต้องทดสอบ Pre-Test ให้ครบ **5 ครั้ง** เพื่อสร้างฐานคะแนนเฉลี่ยที่แม่นยำก่อนปลดล็อกด่านจริง
              </p>
              <div className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-900 mt-2">
                <span className="text-slate-500 text-xs">ทำเสร็จแล้ว:</span>
                <span className="text-emerald-400 font-bold text-sm">{currentAttemptNum} / 5 ครั้ง</span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 mb-8 text-left">
              <p className="text-emerald-400 text-sm font-bold flex items-center gap-1.5 mb-1">
                ✅ ประเมินครบ 5 ครั้งเรียบร้อย!
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                ระบบได้วิเคราะห์ผลประเมินเฉลี่ยและทำการปลดล็อกเส้นทางการเรียนรู้ตาม Rank ของนักเรียนเป็นที่เรียบร้อยแล้ว กดเข้าสู่ Dashboard ด้านล่างเพื่อไปเล่น Camp ได้เลย!
              </p>
            </div>
          )}

          {/* History list of all pretest scores */}
          {previousPretests.length > 0 && (
            <div className="mt-2 mb-6 border-t border-slate-800 pt-4 text-left">
              <p className="text-slate-300 text-xs font-bold mb-2">📜 คะแนนการประเมินแต่ละรอบ:</p>
              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                {previousPretests.map((p, idx) => (
                  <div key={p.id || idx} className="bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-500">รอบที่ {idx + 1}:</span>
                    <span className="text-emerald-400 font-bold">{p.score} / {p.total_questions || 25}</span>
                  </div>
                ))}
                {previousPretests.length < currentAttemptNum && (
                  <div className="bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs border-emerald-500/20">
                    <span className="text-slate-400">รอบที่ {currentAttemptNum} (ล่าสุด):</span>
                    <span className="text-emerald-400 font-black">{score} / {questions.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isAllCompleted ? (
            <button 
              onClick={handleNextAttempt} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02]"
            >
              ทำแบบประเมินรอบถัดไป ({currentAttemptNum + 1}/5) 🚀
            </button>
          ) : (
            <button 
              onClick={() => setScreen('dashboard')} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
            >
              เข้าสู่ Dashboard 🚀
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col justify-center items-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-xl flex justify-between items-center mb-4 relative z-10">
          <div className="text-slate-400 font-bold tracking-wider text-sm flex flex-col">
            <span>Vocab Journey Pre-Test</span>
            <span className="text-indigo-400 text-xs mt-0.5">ประเมินรอบที่ {pretestCount + 1} / 5</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-emerald-400 font-bold text-xs">
              ข้อ {currentIndex + 1} / {questions.length}
            </div>
            <button 
              onClick={() => useAppStore.getState().logout()}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1"
            >
              🚪 ออก
            </button>
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
          <h2 className="text-5xl font-black text-white tracking-tight notranslate" translate="no">{currentQ.word}</h2>
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
