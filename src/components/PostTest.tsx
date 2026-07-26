'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useDemoStore } from '@/store/useDemoStore';
import { Volume2, ArrowLeft } from 'lucide-react';
import { playWordAudio } from '@/utils/audio';
import {
  filterDistractors,
  getVocabularyField,
  QuizChoice,
  shuffleArray,
  uniqueChoicesByText,
} from '@/lib/quizUtils';

const POSTTEST_REQUIRED_ROUNDS = 3;
const POSTTEST_QUESTION_COUNT = 25;

export default function PostTest() {
  const { student, progress, setProgress, setScreen } = useAppStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [posttestCount, setPosttestCount] = useState(0);
  const [previousPosttests, setPreviousPosttests] = useState<any[]>([]);

  function generateQuestion(correctWord: any, allVocab: any[]) {
    const distractors = filterDistractors({
      targetWord: correctWord,
      candidates: shuffleArray(allVocab),
      answerField: 'meaning_th',
      limit: 3,
    });
    const correctChoice: QuizChoice = {
      word_id: correctWord.id,
      text: getVocabularyField(correctWord, 'meaning_th'),
      is_correct: true,
    };
    const wrongChoices: QuizChoice[] = distractors.map((word) => ({
      word_id: word.id,
      text: getVocabularyField(word, 'meaning_th'),
      is_correct: false,
    }));

    return {
      id: correctWord.id,
      word: correctWord.word,
      correct_word_id: correctWord.id,
      correct_answer: correctChoice.text,
      choices: shuffleArray(uniqueChoicesByText([correctChoice, ...wrongChoices])),
    };
  }

  const fetchPosttestData = async () => {
    setLoading(true);
    try {
      const isDemo = useDemoStore.getState().isDemoMode;

      if (isDemo) {
        // --- DEMO MODE: Use mock vocabulary ---
        setPosttestCount(0);
        setPreviousPosttests([]);

        const demoVocab = [
          { id: 'pt1', word: 'Accomplish', meaning_th: 'บรรลุ / สำเร็จ', part_of_speech: 'v.' },
          { id: 'pt2', word: 'Brilliant', meaning_th: 'เฉลียวฉลาด / ยอดเยี่ยม', part_of_speech: 'adj.' },
          { id: 'pt3', word: 'Confident', meaning_th: 'มั่นใจ / มีความเชื่อมั่น', part_of_speech: 'adj.' },
          { id: 'pt4', word: 'Demonstrate', meaning_th: 'สาธิต / แสดงให้เห็น', part_of_speech: 'v.' },
          { id: 'pt5', word: 'Efficient', meaning_th: 'มีประสิทธิภาพ', part_of_speech: 'adj.' },
          { id: 'pt6', word: 'Flexible', meaning_th: 'ยืดหยุ่น / ปรับตัวได้', part_of_speech: 'adj.' },
          { id: 'pt7', word: 'Generate', meaning_th: 'สร้าง / ก่อให้เกิด', part_of_speech: 'v.' },
          { id: 'pt8', word: 'Innovative', meaning_th: 'คิดสร้างสรรค์ / ริเริ่มใหม่', part_of_speech: 'adj.' },
          { id: 'pt9', word: 'Justify', meaning_th: 'พิสูจน์ / อ้างเหตุผล', part_of_speech: 'v.' },
          { id: 'pt10', word: 'Knowledge', meaning_th: 'ความรู้ / ความเข้าใจ', part_of_speech: 'n.' },
          { id: 'pt11', word: 'Leadership', meaning_th: 'ภาวะผู้นำ', part_of_speech: 'n.' },
          { id: 'pt12', word: 'Motivation', meaning_th: 'แรงจูงใจ / แรงบันดาลใจ', part_of_speech: 'n.' },
          { id: 'pt13', word: 'Navigate', meaning_th: 'นำทาง / ค้นหาเส้นทาง', part_of_speech: 'v.' },
          { id: 'pt14', word: 'Observe', meaning_th: 'สังเกต / ดู', part_of_speech: 'v.' },
          { id: 'pt15', word: 'Persevere', meaning_th: 'อดทน / มุ่งมั่น', part_of_speech: 'v.' },
          { id: 'pt16', word: 'Quality', meaning_th: 'คุณภาพ / ลักษณะ', part_of_speech: 'n.' },
          { id: 'pt17', word: 'Reliable', meaning_th: 'เชื่อถือได้ / น่าไว้วางใจ', part_of_speech: 'adj.' },
          { id: 'pt18', word: 'Strategy', meaning_th: 'กลยุทธ์ / แผนการ', part_of_speech: 'n.' },
          { id: 'pt19', word: 'Transform', meaning_th: 'เปลี่ยนแปลง / แปลงร่าง', part_of_speech: 'v.' },
          { id: 'pt20', word: 'Unique', meaning_th: 'เป็นเอกลักษณ์ / พิเศษ', part_of_speech: 'adj.' },
          { id: 'pt21', word: 'Valuable', meaning_th: 'มีคุณค่า / มีประโยชน์', part_of_speech: 'adj.' },
          { id: 'pt22', word: 'Wisdom', meaning_th: 'ความฉลาด / ปัญญา', part_of_speech: 'n.' },
          { id: 'pt23', word: 'Expand', meaning_th: 'ขยาย / แพร่กระจาย', part_of_speech: 'v.' },
          { id: 'pt24', word: 'Achieve', meaning_th: 'บรรลุ / ทำสำเร็จ', part_of_speech: 'v.' },
          { id: 'pt25', word: 'Evaluate', meaning_th: 'ประเมิน / ตัดสิน', part_of_speech: 'v.' },
        ];

        const shuffled = [...demoVocab].sort(() => Math.random() - 0.5);
        setQuestions(
          shuffled.map(v => generateQuestion(v, demoVocab)).filter(q => q.choices.length === 4)
        );
        return;
      }

      // --- REAL MODE: Use actual Supabase data ---

      // 1. Fetch completed post-test count
      const { data: posttestHistory, count } = await supabase
        .from('post_tests')
        .select('*', { count: 'exact' })
        .eq('student_id', student.id)
        .order('created_at', { ascending: true });
      
      setPosttestCount(count || 0);
      setPreviousPosttests(posttestHistory || []);

      // 2. Fetch vocabulary from stages the student has already played
      // This ensures post-test covers material they have studied
      const currentStage = progress?.current_stage || 1;
      const maxStageToTest = Math.max(1, currentStage - 1); // Test up to stages they've completed

      const { data: vocab } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('is_active', true)
        .lte('stage_number', maxStageToTest)
        .limit(200);
        
      if (vocab && vocab.length > 0) {
        const shuffled = vocab
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(POSTTEST_QUESTION_COUNT, vocab.length));
        setQuestions(
          shuffled
            .map(v => generateQuestion(v, vocab))
            .filter(question => question.choices.length === 4)
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosttestData();
  }, [student.id]);

  const handleAnswer = (choice: QuizChoice) => {
    const currentQuestion = questions[currentIndex];
    const isCorrect =
      choice.is_correct === true &&
      choice.word_id === currentQuestion.correct_word_id;
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

    const allScores = [
      ...previousPosttests.map((attempt) => Number(attempt.score || 0)),
      finalScore,
    ];
    const averageScore = Math.round(
      allScores.reduce((sum, attemptScore) => sum + attemptScore, 0) /
      allScores.length
    );

    if (useDemoStore.getState().isDemoMode) {
      // Demo mode: just update local state
      setProgress({
        ...progress,
        posttest_score: averageScore,
        posttest_date: new Date().toISOString(),
      });
      return;
    }

    try {
      // 1. Log to post_tests table
      await supabase.from('post_tests').insert([{
        student_id: student.id,
        score: finalScore,
        total_questions: questions.length,
        time_spent_sec: duration,
      }]);

      const newCount = posttestCount + 1;

      // 2. Update analytics_summary with post-test results when all rounds are completed
      if (newCount >= POSTTEST_REQUIRED_ROUNDS) {
        const { data: analytics } = await supabase
          .from('analytics_summary')
          .select('*')
          .eq('student_id', student.id)
          .maybeSingle();

        const pretestScore = analytics?.pretest_score || 0;
        const totalQuestions = questions.length || POSTTEST_QUESTION_COUNT;
        
        // Convert to percentage scale matching pretest (out of 25)
        const posttestScoreNormalized = averageScore;

        // Calculate Learning Gain (raw and normalized)
        const learningGain = posttestScoreNormalized - pretestScore;
        const maxPossible = totalQuestions - pretestScore;
        const normalizedGain = maxPossible > 0
          ? Number(((learningGain / maxPossible) * 100).toFixed(2))
          : 0;

        const previousDuration = previousPosttests.reduce(
          (sum, attempt) => sum + Number(attempt.time_spent_sec || 0),
          0
        );

        await supabase.from('analytics_summary').upsert({
          student_id: student.id,
          pretest_score: analytics?.pretest_score || 0,
          posttest_score: posttestScoreNormalized,
          learning_gain: Number(learningGain.toFixed(2)),
          normalized_gain: normalizedGain,
          success_rate: analytics?.success_rate || 0,
          attempt_count: analytics?.attempt_count || 0,
          total_time_on_task_sec:
            (analytics?.total_time_on_task_sec || 0) +
            previousDuration +
            duration,
          last_updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });

        setProgress({
          ...progress,
          posttest_score: posttestScoreNormalized,
          posttest_date: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error saving post-test results:', err);
    }
  };

  const handleNextAttempt = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setStartTime(Date.now());
    fetchPosttestData();
  };

  const handleBackToDashboard = () => {
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังเตรียมข้อสอบ Post-Test...</p>
      </div>
    );
  }

  if (isFinished) {
    const currentAttemptNum = posttestCount + 1;
    const isAllCompleted = currentAttemptNum >= POSTTEST_REQUIRED_ROUNDS;

    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl w-full max-w-md"
        >
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">{isAllCompleted ? '🎉' : '📝'}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">
            {isAllCompleted ? 'จบ Post-Test ครบแล้ว!' : `จบ Post-Test รอบที่ ${currentAttemptNum}`}
          </h2>
          
          <p className="text-slate-400 text-lg mb-6">
            คะแนนรอบนี้: <strong className="text-indigo-400 text-2xl font-black">{score} / {questions.length}</strong>
          </p>

          {!isAllCompleted ? (
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800/60 mb-8 text-left space-y-2">
              <p className="text-slate-300 text-sm font-bold">📢 ข้อมูลความก้าวหน้าการประเมิน:</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                นักเรียนจำเป็นต้องทำ Post-Test ให้ครบ <strong>{POSTTEST_REQUIRED_ROUNDS} ครั้ง</strong> เพื่อบันทึกผลคะแนนเฉลี่ยหลังเรียนอย่างแม่นยำ
              </p>
              <div className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-900 mt-2">
                <span className="text-slate-500 text-xs">ทำเสร็จแล้ว:</span>
                <span className="text-indigo-400 font-bold text-sm">{currentAttemptNum} / {POSTTEST_REQUIRED_ROUNDS} ครั้ง</span>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/20 mb-8 text-left">
              <p className="text-indigo-400 text-sm font-bold flex items-center gap-1.5 mb-1">
                ✅ ประเมิน Post-Test ครบ {POSTTEST_REQUIRED_ROUNDS} ครั้งเรียบร้อย!
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                ระบบได้คำนวณ Learning Gain เปรียบเทียบผล Pre-test กับ Post-test ให้เรียบร้อยแล้ว คุณครูสามารถดูผลในหน้า Dashboard ครูได้ทันที
              </p>
            </div>
          )}

          {/* History list of all posttest scores */}
          {previousPosttests.length > 0 && (
            <div className="mt-2 mb-6 border-t border-slate-800 pt-4 text-left">
              <p className="text-slate-300 text-xs font-bold mb-2">📜 คะแนน Post-Test แต่ละรอบ:</p>
              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                {previousPosttests.map((p, idx) => (
                  <div key={p.id || idx} className="bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-500">รอบที่ {idx + 1}:</span>
                    <span className="text-indigo-400 font-bold">{p.score} / {p.total_questions || POSTTEST_QUESTION_COUNT}</span>
                  </div>
                ))}
                {previousPosttests.length < currentAttemptNum && (
                  <div className="bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs border-indigo-500/20">
                    <span className="text-slate-400">รอบที่ {currentAttemptNum} (ล่าสุด):</span>
                    <span className="text-indigo-400 font-black">{score} / {questions.length}</span>
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
              ทำ Post-Test รอบถัดไป ({currentAttemptNum + 1}/{POSTTEST_REQUIRED_ROUNDS}) 📝
            </button>
          ) : (
            <button 
              onClick={handleBackToDashboard} 
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02]"
            >
              กลับสู่ Dashboard 🚀
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl w-full max-w-md">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">ยังไม่พร้อมทำ Post-Test</h2>
          <p className="text-slate-400 text-sm mb-6">กรุณาเล่นเกมผ่านด่านต่างๆ ก่อน เพื่อให้ระบบมีข้อมูลคำศัพท์ที่เรียนแล้วมาออกข้อสอบ</p>
          <button 
            onClick={handleBackToDashboard}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            กลับ Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div 
      className="min-h-screen bg-slate-950 p-6 flex flex-col justify-center items-center relative overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-xl flex justify-between items-center mb-4 relative z-10">
          <div className="text-slate-400 font-bold tracking-wider text-sm flex flex-col">
            <span>Vocab Journey Post-Test</span>
            <span className="text-indigo-400 text-xs mt-0.5">ประเมินรอบที่ {posttestCount + 1} / {POSTTEST_REQUIRED_ROUNDS}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-indigo-400 font-bold text-xs">
              ข้อ {currentIndex + 1} / {questions.length}
            </div>
            <button 
              onClick={handleBackToDashboard}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> กลับ
            </button>
          </div>
      </div>

      <div className="w-full max-w-xl text-center mb-8 relative z-10">
         <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-800">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-400 h-full transition-all duration-300" style={{ width: `${(currentIndex / questions.length) * 100}%` }}></div>
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
          <h2 
            className="text-3xl sm:text-5xl font-black text-white tracking-tight notranslate break-all pointer-events-none select-none" 
            translate="no"
            onContextMenu={(e) => e.preventDefault()}
          >
            {String(currentQ.word).split('').map((char: string, i: number) => (
              <span key={i}>{char}&#8203;</span>
            ))}
          </h2>
          <button 
            onClick={() => playWordAudio(currentQ.word)}
            className="mt-3 text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <Volume2 className="w-5 h-5" /> ฟังออกเสียง (TTS)
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQ.choices.map((choice: QuizChoice) => (
            <button 
              key={choice.word_id}
              onClick={() => handleAnswer(choice)}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 hover:text-indigo-400 text-slate-300 p-4 sm:p-5 rounded-2xl text-base sm:text-lg font-bold transition-all text-center break-words"
            >
              {choice.text}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
