'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDemoStore } from '@/store/useDemoStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio, speakWithWebSpeech } from '@/utils/audio';
import { getWorldForStage } from '@/utils/adaptiveConfig';

interface StudyCampProps {
  onStartGame?: () => void;
  onExit?: () => void;
}

function getThaiMeaningLabel(w: any): string {
  if (!w) return '';
  return w.meaning_th && /[ก-๙]/.test(w.meaning_th)
    ? w.meaning_th
    : w.meaning || w.meaning_th || '';
}

export default function StudyCamp({ onStartGame, onExit }: StudyCampProps = {}) {
  const { setScreen, progress, setStudiedCurrentStage, selectedStageNumber } = useAppStore();
  const isDemoMode = useDemoStore((state) => state.isDemoMode);
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buffGranted, setBuffGranted] = useState(false);

  // Mini-Quiz verification state at the end of Study Camp
  const [miniQuizPassed, setMiniQuizPassed] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  const handleStartGame = () => {
    setStudiedCurrentStage(true);
    setScreen('game');
    if (onStartGame) {
      onStartGame();
    }
  };

  const handleExitCamp = () => {
    setScreen('dashboard');
    if (onExit) {
      onExit();
    }
  };

  useEffect(() => {
    if (words.length > 0 && currentIndex === words.length && miniQuizPassed) {
      setStudiedCurrentStage(true);
    }
  }, [currentIndex, words.length, miniQuizPassed, setStudiedCurrentStage]);

  const stage = selectedStageNumber ?? progress?.current_stage ?? 1;
  const isBoss = stage % 10 === 0;

  useEffect(() => {
    async function fetchWords() {
      let wordsQuery = supabase.from('vocabulary').select('*').eq('is_active', true);

      if (isBoss) {
        // Boss stages combine words from stages in the current world range
        const world = getWorldForStage(stage);
        wordsQuery = wordsQuery
          .gte('stage_number', world.stageRange[0])
          .lte('stage_number', world.stageRange[1]);
      } else {
        wordsQuery = wordsQuery.eq('stage_number', stage);
      }

      const { data } = await wordsQuery;

      if (data && data.length > 0) {
        setWords(data);
      }
      setLoading(false);
    }
    fetchWords();
  }, [progress, selectedStageNumber, stage, isBoss]);

  // Deterministic Mini-Quiz Question derived from stage words
  const miniQuiz = useMemo(() => {
    if (!words || words.length === 0) return null;
    const target = words[0];
    const correctMeaning = getThaiMeaningLabel(target);
    const otherMeanings = words
      .slice(1)
      .map((w) => getThaiMeaningLabel(w))
      .filter((m) => Boolean(m) && m !== correctMeaning);

    const fallbackPool = ['กระตือรือร้น', 'สิ่งแวดล้อม', 'ความรับผิดชอบ', 'การสื่อสาร'];
    for (const fb of fallbackPool) {
      if (otherMeanings.length >= 3) break;
      if (fb !== correctMeaning && !otherMeanings.includes(fb)) {
        otherMeanings.push(fb);
      }
    }

    const options = [correctMeaning, ...otherMeanings.slice(0, 3)].sort((a, b) =>
      a.localeCompare(b, 'th')
    );

    return {
      word: target.word,
      phonetic: target.phonetic,
      correctMeaning,
      options,
    };
  }, [words]);

  const grantLoreBuff = async () => {
    if (buffGranted) return;
    const studentData = useAppStore.getState().student;
    if (!studentData?.id) {
      setBuffGranted(true);
      return;
    }
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await supabase.from('student_buffs').insert([
        {
          student_id: studentData.id,
          buff_type: 'PASSIVE_EXP_BOOST',
          multiplier: 1.05,
          expires_at: expiresAt.toISOString(),
        },
      ]);
      setBuffGranted(true);
    } catch (e) {
      console.error('Error granting buff:', e);
    }
  };

  // Lore Book Buff Logic (5 seconds rule on flashcards)
  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      const timer = setTimeout(() => {
        grantLoreBuff();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, words.length]);

  const handleMiniQuizAnswer = (option: string) => {
    if (!miniQuiz) return;
    setSelectedQuizOption(option);
    if (option === miniQuiz.correctMeaning) {
      setQuizFeedback('correct');
      setMiniQuizPassed(true);
      setStudiedCurrentStage(true);
      grantLoreBuff();
    } else {
      setQuizFeedback('wrong');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-var(--demo-bottom-nav-space,0px))] bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <div className="text-slate-400">กำลังเตรียมคำศัพท์ค่าย...</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-[calc(100vh-var(--demo-bottom-nav-space,0px))] bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="glass-card border-amber-500/20 p-8 max-w-md text-center">
          <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">ยังไม่มีคำศัพท์ในด่านนี้</h2>
          <p className="text-slate-400 text-sm mb-6">กรุณาแจ้งคุณครูให้เพิ่มคำศัพท์ก่อนเริ่มเรียน</p>
          <button
            onClick={handleExitCamp}
            className="w-full py-3.5 premium-btn bg-slate-800 hover:bg-slate-700 font-bold"
          >
            กลับหน้าแผนที่
          </button>
        </div>
      </div>
    );
  }

  const word = words[currentIndex];
  const isFinished = currentIndex >= words.length;

  if (isFinished) {
    return (
      <div className="min-h-[calc(100vh-var(--demo-bottom-nav-space,0px))] bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center glass-card p-6 sm:p-10 max-w-lg w-full shadow-2xl space-y-5"
        >
          {!miniQuizPassed && miniQuiz ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                MINI-QUIZ เช็กความจำก่อนรับ Buff +5% EXP
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                คำว่า{' '}
                <span className="text-emerald-400 font-mono underline">{miniQuiz.word}</span>{' '}
                มีความหมายว่าอย่างไร?
              </h2>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => playWordAudio(miniQuiz.word)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>ฟังเสียงคำศัพท์</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-left">
                {miniQuiz.options.map((opt) => {
                  const isPicked = selectedQuizOption === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleMiniQuizAnswer(opt)}
                      className={`p-3.5 rounded-2xl border font-bold text-sm transition-all cursor-pointer ${
                        isPicked && quizFeedback === 'wrong'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {quizFeedback === 'wrong' && (
                <p className="text-xs font-bold text-rose-400">
                  ยังไม่ถูกนะครับ ลองเลือกความหมายที่ถูกต้องอีกครั้ง หรือกดกลับไปทบทวน!
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setSelectedQuizOption(null);
                  setQuizFeedback(null);
                }}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                ← กลับไปทบทวนการ์ดคำศัพท์อีกครั้ง
              </button>
            </>
          ) : (
            <>
              <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" />
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                ✨ ปลดล็อก +5% EXP BUFF เรียบร้อย!
              </div>
              <h2 className="text-3xl sm:text-4xl font-black">เรียนรู้เสร็จสิ้น!</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                คุณทบทวนคำศัพท์และผ่าน Mini-Quiz ประจำด่านนี้เรียบร้อยแล้ว พร้อมเข้าสู่สนามประลองหรือยัง?
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleExitCamp}
                  className="px-6 py-3.5 premium-btn bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  กลับหน้าหลัก
                </button>
                <button
                  onClick={handleStartGame}
                  className="px-8 py-3.5 premium-btn bg-primary hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                >
                  ลุยด่าน Challenge ➡️
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  const exampleSentence = word.example_sentence || word.example || '';

  return (
    <div
      data-demo-guide="study-camp"
      className="min-h-[calc(100vh-var(--demo-bottom-nav-space,0px))] bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center select-none relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] glow-orb bg-primary/10 pointer-events-none"></div>

      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">Study Camp (ค่ายฝึกฝน)</h1>
            {buffGranted && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              >
                ✨ +5% EXP BUFF
              </motion.span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            คำศัพท์ลำดับที่ {currentIndex + 1} / {words.length}
          </p>
        </div>
        <div className="flex gap-2">
          {isBoss && (
            <button
              onClick={handleStartGame}
              className="px-4 py-2 premium-btn bg-primary hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 text-xs font-bold"
            >
              ข้ามไปลุยบอส ➡️
            </button>
          )}
          <button
            onClick={handleExitCamp}
            className="px-4 py-2 premium-btn bg-slate-900 hover:bg-slate-850 text-white flex items-center gap-1.5 text-xs font-bold"
          >
            <X className="w-4 h-4 text-rose-400" /> ปิดค่าย
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl h-1.5 bg-slate-900 border border-slate-850 rounded-full mb-8 overflow-hidden relative z-10">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="w-full max-w-2xl relative flex-1 min-h-0 flex flex-col z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-6 sm:p-8 flex-1 min-h-0 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group hover-lift"
          >
            {/* Visual word placeholder */}
            <div className="w-36 h-36 bg-slate-950 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-slate-850 shadow-inner relative">
              {word.image_url ? (
                <img src={word.image_url} alt={word.word} className="w-full h-full object-cover" />
              ) : (
                <span
                  className="text-7xl font-black text-slate-850 select-none uppercase notranslate"
                  translate="no"
                >
                  {word.word.charAt(0)}
                </span>
              )}
            </div>

            <div className="text-center w-full break-words">
              <h2
                className="text-4xl sm:text-6xl font-extrabold text-emerald-400 mb-2 break-all notranslate"
                translate="no"
              >
                {word.word}
              </h2>
              <p
                className="text-base sm:text-xl text-slate-400 font-mono mb-4 notranslate"
                translate="no"
              >
                {word.phonetic}
              </p>

              <div className="inline-block px-4 py-1 bg-slate-950 border border-slate-850 rounded-full text-xs sm:text-sm text-slate-300 mb-4 uppercase tracking-widest">
                {word.part_of_speech || 'noun'}
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold mb-4 break-words">
                {getThaiMeaningLabel(word)}
              </h3>

              {exampleSentence && (
                <div className="mb-6 space-y-2">
                  <p
                    className="text-base sm:text-lg text-slate-300 italic break-words notranslate"
                    translate="no"
                  >
                    &ldquo;{exampleSentence}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => speakWithWebSpeech(exampleSentence)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>ฟังประโยคตัวอย่าง</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => playWordAudio(word.word)}
              title="ฟังเสียงอ่านคำศัพท์"
              className={`${
                isDemoMode ? 'absolute top-4 right-4 w-12 h-12' : 'w-16 h-16'
              } premium-btn bg-slate-950 border-slate-850 text-primary hover:text-emerald-300 rounded-full flex items-center justify-center shadow-lg`}
            >
              <Volume2 className={isDemoMode ? 'w-5 h-5' : 'w-7 h-7'} />
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div
          className={`${
            isDemoMode
              ? 'fixed left-1/2 bottom-[calc(0.75rem+var(--demo-bottom-nav-space,0px))] z-[10000] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2'
              : 'relative mt-6 w-full'
          } flex justify-between items-center gap-4 glass-card p-2 shadow-2xl border-none`}
        >
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 py-4 premium-btn bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 flex items-center justify-center gap-2 font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> ก่อนหน้า
          </button>
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex-1 py-4 premium-btn bg-primary hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 font-black text-sm shadow-lg shadow-emerald-500/10"
          >
            {currentIndex === words.length - 1 ? 'ทำ Mini-Quiz รับ Buff' : 'ถัดไป'}{' '}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
